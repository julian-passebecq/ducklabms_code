-- Open Lakehouse case: DuckDB / Iceberg / DuckLake interoperability.
INSTALL iceberg;
LOAD iceberg;
INSTALL ducklake;
LOAD ducklake;

-- Direct table-path scanning is useful for read-only inspection.
SELECT *
FROM iceberg_snapshots('s3://YOUR_BUCKET/orders_iceberg');

SELECT count(*)
FROM iceberg_scan('s3://YOUR_BUCKET/orders_iceberg');

-- For writes, attach an Iceberg REST catalog instead of using iceberg_scan.
-- Example shape only: endpoint/auth varies by catalog provider.
-- ATTACH 'warehouse' AS ice (
--   TYPE iceberg,
--   ENDPOINT 'https://catalog.example.com'
-- );
-- MERGE INTO ice.analytics.orders ...;

-- After an Iceberg catalog is attached, DuckDB can copy the catalog metadata
-- into DuckLake without rewriting the underlying Parquet data files.
-- ATTACH 'ducklake:./data/open.ducklake' AS dl;
-- CALL iceberg_to_ducklake('ice', 'dl');
