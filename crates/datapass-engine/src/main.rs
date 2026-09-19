use std::{
    env,
    io::{self, Read},
    path::PathBuf,
};

use datapass_engine::{PROTOCOL_VERSION, QueryRequest, execute_query, probe};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum EngineRequest {
    Probe,
    Query {
        sql: String,
        #[serde(default)]
        sources: Vec<datapass_engine::ParquetSource>,
        #[serde(default = "default_max_rows")]
        max_rows: usize,
        #[serde(default = "default_target_partitions")]
        target_partitions: usize,
    },
    DucklakeSmoke {
        root: String,
    },
}

#[derive(Debug, Serialize)]
struct Envelope {
    protocol_version: u32,
    ok: bool,
    payload: Option<Value>,
    error: Option<String>,
}

#[tokio::main]
async fn main() {
    let envelope = match run().await {
        Ok(payload) => Envelope {
            protocol_version: PROTOCOL_VERSION,
            ok: true,
            payload: Some(payload),
            error: None,
        },
        Err(error) => Envelope {
            protocol_version: PROTOCOL_VERSION,
            ok: false,
            payload: None,
            error: Some(error.to_string()),
        },
    };
    println!(
        "{}",
        serde_json::to_string(&envelope).expect("serialize engine response")
    );
    if !envelope.ok {
        std::process::exit(2);
    }
}

async fn run() -> anyhow::Result<Value> {
    let input = if let Some(raw) = env::args().nth(1) {
        raw
    } else {
        let mut raw = String::new();
        io::stdin().read_to_string(&mut raw)?;
        raw
    };
    let request: EngineRequest = serde_json::from_str(input.trim())?;
    match request {
        EngineRequest::Probe => Ok(probe()),
        EngineRequest::Query {
            sql,
            sources,
            max_rows,
            target_partitions,
        } => Ok(serde_json::to_value(
            execute_query(QueryRequest {
                sql,
                sources,
                max_rows,
                target_partitions,
            })
            .await?,
        )?),
        EngineRequest::DucklakeSmoke { root } => {
            let root = PathBuf::from(root);
            Ok(serde_json::to_value(
                datapass_lakehouse::smoke(root).await?,
            )?)
        }
    }
}

fn default_max_rows() -> usize {
    200
}
fn default_target_partitions() -> usize {
    4
}
