use datapass_lakehouse::smoke;

#[tokio::test(flavor = "multi_thread")]
async fn writes_parquet_and_reads_real_ducklake_rows() {
    let temp = tempfile::tempdir().unwrap();
    let evidence = smoke(temp.path()).await.unwrap();
    assert_eq!(evidence.truth, "real_local");
    assert_eq!(evidence.metadata_backend, "sqlite");
    assert_eq!(evidence.row_count, 2);
    assert!(evidence.parquet_files >= 1);
    assert_eq!(evidence.rows[0]["category"], "alpha");
    assert_eq!(evidence.rows[0]["events"], 2);
    assert_eq!(evidence.rows[0]["total_amount"], 40);
}
