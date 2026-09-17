-- Mission 03: retry-safe Silver rebuild for one affected partition.
-- Bronze is intentionally immutable/append-only.
BEGIN TRANSACTION;

CREATE OR REPLACE TEMP TABLE repaired_partition AS
WITH ranked AS (
  SELECT
    *,
    row_number() OVER (
      PARTITION BY pickup_datetime, vendor_id, trip_sequence
      ORDER BY _ingested_at DESC
    ) AS _rn
  FROM bronze.trips
  WHERE service_date = DATE '2026-09-17'
)
SELECT * EXCLUDE (_rn)
FROM ranked
WHERE _rn = 1;

DELETE FROM silver.trips
WHERE service_date = DATE '2026-09-17';

INSERT INTO silver.trips
SELECT * FROM repaired_partition;

COMMIT;

-- Verification contract.
SELECT
  count(*) AS silver_rows,
  count(*) - count(DISTINCT (pickup_datetime, vendor_id, trip_sequence)) AS duplicate_business_keys
FROM silver.trips
WHERE service_date = DATE '2026-09-17';
