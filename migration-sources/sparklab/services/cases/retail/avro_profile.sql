-- Contoso Retail CDC: Avro is an ingestion/source format.
-- DuckLake itself remains Parquet-backed.
INSTALL avro;
LOAD avro;

SELECT
    op,
    source_seq,
    customer_id,
    payload,
    filename
FROM read_avro('landing/customers_*.avro', filename = true)
ORDER BY source_seq
LIMIT 100;

-- Next step in the case: append raw source fields + ingestion metadata into
-- bronze.customer_cdc, then build current-state and SCD2 tables transactionally.
