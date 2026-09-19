use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
    time::Instant,
};

use anyhow::{Context, Result};
use arrow::{
    array::{Int64Array, StringArray},
    datatypes::{DataType, Field, Schema},
    record_batch::RecordBatch,
};
use arrow_json::ArrayWriter;
use datafusion::prelude::SessionContext;
use datafusion_ducklake::{
    DuckLakeCatalog, DuckLakeTableWriter, MetadataWriter, SqliteMetadataProvider,
    SqliteMetadataWriter,
};
use object_store::local::LocalFileSystem;
use serde::Serialize;
use serde_json::Value;

pub const DUCKLAKE_ADAPTER_VERSION: &str = "datafusion-ducklake-0.8";

#[derive(Debug, Clone, Serialize)]
pub struct DuckLakeSmokeEvidence {
    pub adapter: &'static str,
    pub truth: &'static str,
    pub metadata_backend: &'static str,
    pub metadata_path: String,
    pub data_path: String,
    pub row_count: usize,
    pub rows: Vec<Value>,
    pub elapsed_ms: u128,
    pub parquet_files: usize,
}

pub async fn smoke(root: impl AsRef<Path>) -> Result<DuckLakeSmokeEvidence> {
    let root = root.as_ref();
    fs::create_dir_all(root)
        .with_context(|| format!("create DuckLake smoke root {}", root.display()))?;
    let metadata_path = root.join("metadata.sqlite");
    let data_path = root.join("data");
    fs::create_dir_all(&data_path)?;
    let connection = format!("sqlite:{}?mode=rwc", metadata_path.display());

    let writer = Arc::new(SqliteMetadataWriter::new_with_init(&connection).await?);
    writer.set_data_path(path_text(&data_path)?)?;

    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int64, false),
        Field::new("category", DataType::Utf8, false),
        Field::new("amount", DataType::Int64, false),
    ]));
    let batch = RecordBatch::try_new(
        schema,
        vec![
            Arc::new(Int64Array::from(vec![1, 2, 3])),
            Arc::new(StringArray::from(vec!["alpha", "beta", "alpha"])),
            Arc::new(Int64Array::from(vec![10, 20, 30])),
        ],
    )?;

    let object_store = Arc::new(LocalFileSystem::new());
    let table_writer = DuckLakeTableWriter::new(writer, object_store)?;
    table_writer.write_table("main", "events", &[batch]).await?;

    // Bind the read catalog only after the committed write so its snapshot is current.
    let provider = SqliteMetadataProvider::new(&connection).await?;
    let catalog = DuckLakeCatalog::new(provider)?;
    let ctx = SessionContext::new();
    ctx.register_catalog("ducklake", Arc::new(catalog));

    let started = Instant::now();
    let batches = ctx
        .sql("SELECT category, COUNT(*) AS events, SUM(amount) AS total_amount FROM ducklake.main.events GROUP BY category ORDER BY category")
        .await?
        .collect()
        .await?;
    let elapsed_ms = started.elapsed().as_millis();
    let rows = batches_to_json(&batches)?;
    let row_count = batches.iter().map(RecordBatch::num_rows).sum();

    Ok(DuckLakeSmokeEvidence {
        adapter: DUCKLAKE_ADAPTER_VERSION,
        truth: "real_local",
        metadata_backend: "sqlite",
        metadata_path: metadata_path.display().to_string(),
        data_path: data_path.display().to_string(),
        row_count,
        rows,
        elapsed_ms,
        parquet_files: count_extension(&data_path, "parquet")?,
    })
}

fn batches_to_json(batches: &[RecordBatch]) -> Result<Vec<Value>> {
    let mut writer = ArrayWriter::new(Vec::new());
    let refs = batches.iter().collect::<Vec<_>>();
    writer.write_batches(&refs)?;
    writer.finish()?;
    let bytes = writer.into_inner();
    Ok(serde_json::from_slice(&bytes)?)
}

fn path_text(path: &Path) -> Result<&str> {
    path.to_str()
        .context("DuckLake data path is not valid UTF-8")
}

fn count_extension(root: &Path, extension: &str) -> Result<usize> {
    let mut pending = vec![PathBuf::from(root)];
    let mut count = 0;
    while let Some(path) = pending.pop() {
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                pending.push(path);
            } else if path.extension().and_then(|value| value.to_str()) == Some(extension) {
                count += 1;
            }
        }
    }
    Ok(count)
}
