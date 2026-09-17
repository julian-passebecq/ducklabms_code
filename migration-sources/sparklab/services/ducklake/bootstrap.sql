-- DuckLake Engineering Studio: local development bootstrap.
-- DuckLake 1.0 syntax verified against current DuckDB documentation.
INSTALL ducklake;
LOAD ducklake;

ATTACH 'ducklake:./data/metadata.ducklake' AS studio
  (DATA_PATH './data/lake/');
USE studio;

CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

CREATE TABLE IF NOT EXISTS bronze.trips (
  vendor_id INTEGER,
  pickup_datetime TIMESTAMP,
  dropoff_datetime TIMESTAMP,
  passenger_count INTEGER,
  trip_distance DOUBLE,
  pickup_zone_id INTEGER,
  dropoff_zone_id INTEGER,
  payment_type INTEGER,
  fare_amount DECIMAL(18,2),
  total_amount DECIMAL(18,2),
  trip_sequence BIGINT,
  _source_file VARCHAR,
  _batch_id VARCHAR,
  _ingested_at TIMESTAMP,
  service_date DATE
);

CREATE TABLE IF NOT EXISTS silver.trips AS
SELECT * FROM bronze.trips WHERE 1 = 0;

CREATE TABLE IF NOT EXISTS gold.daily_metrics (
  metric_date DATE,
  trips BIGINT,
  revenue DECIMAL(20,2),
  avg_fare DECIMAL(18,2),
  avg_duration_minutes DOUBLE,
  refreshed_at TIMESTAMP
);
