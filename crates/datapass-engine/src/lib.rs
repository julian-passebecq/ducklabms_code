use std::{path::Path, time::Instant};

use anyhow::{Context, Result, bail};
use arrow::{datatypes::SchemaRef, record_batch::RecordBatch};
use arrow_json::ArrayWriter;
use datafusion::{
    physical_plan::{collect, display::DisplayableExecutionPlan, displayable},
    prelude::{ParquetReadOptions, SessionConfig, SessionContext},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const PROTOCOL_VERSION: u32 = 1;
pub const DATAFUSION_VERSION: &str = "55.1.0";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ParquetSource {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRequest {
    pub sql: String,
    #[serde(default)]
    pub sources: Vec<ParquetSource>,
    #[serde(default = "default_max_rows")]
    pub max_rows: usize,
    #[serde(default = "default_target_partitions")]
    pub target_partitions: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct FieldEvidence {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct QueryEvidence {
    pub protocol_version: u32,
    pub engine: &'static str,
    pub engine_version: &'static str,
    pub truth: &'static str,
    pub elapsed_ms: u128,
    pub row_count: usize,
    pub preview_row_count: usize,
    pub truncated: bool,
    pub schema: Vec<FieldEvidence>,
    pub rows: Vec<Value>,
    pub logical_plan: String,
    pub physical_plan: String,
    pub physical_plan_with_metrics: String,
}

pub fn probe() -> Value {
    serde_json::json!({
        "protocol_version": PROTOCOL_VERSION,
        "engine": "datafusion",
        "engine_version": DATAFUSION_VERSION,
        "truth": "real_local",
        "arrow_major": 59,
        "features": [
            "sql",
            "parquet",
            "logical_plan",
            "physical_plan",
            "operator_metrics",
            "ducklake_sqlite_adapter"
        ],
        "activation": "experimental_opt_in",
        "default_runtime_changed": false
    })
}

pub async fn execute_query(request: QueryRequest) -> Result<QueryEvidence> {
    validate_request(&request)?;
    let config = SessionConfig::new().with_target_partitions(request.target_partitions);
    let ctx = SessionContext::new_with_config(config);

    for source in &request.sources {
        validate_source(source)?;
        ctx.register_parquet(&source.name, &source.path, ParquetReadOptions::default())
            .await
            .with_context(|| {
                format!(
                    "register Parquet source {} from {}",
                    source.name, source.path
                )
            })?;
    }

    let frame = ctx.sql(&request.sql).await.context("plan DataFusion SQL")?;
    let schema = frame.schema().inner().clone();
    let logical_plan = frame.logical_plan().display_indent().to_string();
    let physical = frame
        .create_physical_plan()
        .await
        .context("create physical plan")?;
    let physical_plan = displayable(physical.as_ref()).indent(true).to_string();

    let started = Instant::now();
    let batches = collect(physical.clone(), ctx.task_ctx())
        .await
        .context("execute physical plan")?;
    let elapsed_ms = started.elapsed().as_millis();
    let physical_plan_with_metrics = DisplayableExecutionPlan::with_metrics(physical.as_ref())
        .indent(true)
        .to_string();
    let row_count = batches.iter().map(RecordBatch::num_rows).sum::<usize>();
    let preview = preview_batches(&batches, request.max_rows);
    let preview_row_count = preview.iter().map(RecordBatch::num_rows).sum::<usize>();
    let rows = batches_to_json(&preview)?;

    Ok(QueryEvidence {
        protocol_version: PROTOCOL_VERSION,
        engine: "datafusion",
        engine_version: DATAFUSION_VERSION,
        truth: "real_local",
        elapsed_ms,
        row_count,
        preview_row_count,
        truncated: preview_row_count < row_count,
        schema: schema_fields(&schema),
        rows,
        logical_plan,
        physical_plan,
        physical_plan_with_metrics,
    })
}

fn validate_request(request: &QueryRequest) -> Result<()> {
    if request.sql.trim().is_empty() {
        bail!("SQL cannot be empty");
    }
    if request.sql.len() > 40_000 {
        bail!("SQL exceeds 40,000 characters");
    }
    if !(1..=10_000).contains(&request.max_rows) {
        bail!("max_rows must be between 1 and 10,000");
    }
    if !(1..=64).contains(&request.target_partitions) {
        bail!("target_partitions must be between 1 and 64");
    }
    if request.sources.len() > 32 {
        bail!("at most 32 Parquet sources may be registered per request");
    }
    Ok(())
}

fn validate_source(source: &ParquetSource) -> Result<()> {
    let valid_name = !source.name.is_empty()
        && source.name.len() <= 100
        && source
            .name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_');
    if !valid_name {
        bail!("Parquet source names must be 1-100 ASCII letters, digits or underscores");
    }
    let path = Path::new(&source.path);
    if !path.exists() {
        bail!("Parquet source path does not exist: {}", source.path);
    }
    Ok(())
}

fn default_max_rows() -> usize {
    200
}
fn default_target_partitions() -> usize {
    4
}

fn preview_batches(batches: &[RecordBatch], max_rows: usize) -> Vec<RecordBatch> {
    let mut remaining = max_rows;
    let mut preview = Vec::new();
    for batch in batches {
        if remaining == 0 {
            break;
        }
        let take = remaining.min(batch.num_rows());
        if take > 0 {
            preview.push(batch.slice(0, take));
            remaining -= take;
        }
    }
    preview
}

fn batches_to_json(batches: &[RecordBatch]) -> Result<Vec<Value>> {
    if batches.is_empty() {
        return Ok(Vec::new());
    }
    let mut writer = ArrayWriter::new(Vec::new());
    let refs = batches.iter().collect::<Vec<_>>();
    writer.write_batches(&refs)?;
    writer.finish()?;
    Ok(serde_json::from_slice(&writer.into_inner())?)
}

fn schema_fields(schema: &SchemaRef) -> Vec<FieldEvidence> {
    schema
        .fields()
        .iter()
        .map(|field| FieldEvidence {
            name: field.name().clone(),
            data_type: field.data_type().to_string(),
            nullable: field.is_nullable(),
        })
        .collect()
}
