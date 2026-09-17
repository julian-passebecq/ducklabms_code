"""Energy telemetry: Polars lazy transformation -> DuckDB SQL via Arrow."""
import duckdb
import polars as pl

telemetry = (
    pl.scan_ndjson("landing/telemetry/*.ndjson")
      .filter(pl.col("quality") == "GOOD")
      .with_columns(pl.col("ts").str.to_datetime(strict=False))
      .select("device_id", "ts", "power_kw", "temperature_c")
)

# Materialize only at the Python/SQL boundary for this exercise.
df = telemetry.collect()

result = duckdb.sql("""
    SELECT
        device_id,
        avg(power_kw) AS avg_power_kw,
        max(temperature_c) AS max_temperature_c
    FROM df
    GROUP BY 1
    ORDER BY avg_power_kw DESC
""").pl()

print(result)
