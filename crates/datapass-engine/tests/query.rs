use datapass_engine::{QueryRequest, execute_query, probe};

#[tokio::test]
async fn returns_real_plans_rows_and_metrics() {
    let evidence = execute_query(QueryRequest {
        sql:
            "SELECT x, x * 2 AS doubled FROM (VALUES (1), (2), (3)) AS t(x) WHERE x >= 2 ORDER BY x"
                .into(),
        sources: vec![],
        max_rows: 50,
        target_partitions: 2,
    })
    .await
    .unwrap();
    assert_eq!(evidence.truth, "real_local");
    assert_eq!(evidence.row_count, 2);
    assert_eq!(evidence.rows[0]["x"], 2);
    assert_eq!(evidence.rows[1]["doubled"], 6);
    assert!(evidence.logical_plan.contains("Projection"));
    assert!(!evidence.physical_plan.trim().is_empty());
    assert!(!evidence.physical_plan_with_metrics.trim().is_empty());
}

#[tokio::test]
async fn bounds_preview_without_lying_about_total_rows() {
    let evidence = execute_query(QueryRequest {
        sql: "SELECT * FROM (VALUES (1), (2), (3)) AS t(x)".into(),
        sources: vec![],
        max_rows: 2,
        target_partitions: 1,
    })
    .await
    .unwrap();
    assert_eq!(evidence.row_count, 3);
    assert_eq!(evidence.preview_row_count, 2);
    assert!(evidence.truncated);
    assert_eq!(evidence.rows.len(), 2);
}

#[tokio::test]
async fn rejects_empty_sql() {
    let error = execute_query(QueryRequest {
        sql: "  ".into(),
        sources: vec![],
        max_rows: 2,
        target_partitions: 1,
    })
    .await
    .unwrap_err();
    assert!(error.to_string().contains("cannot be empty"));
}

#[test]
fn probe_is_explicitly_experimental_and_non_default() {
    let value = probe();
    assert_eq!(value["engine"], "datafusion");
    assert_eq!(value["activation"], "experimental_opt_in");
    assert_eq!(value["default_runtime_changed"], false);
}
