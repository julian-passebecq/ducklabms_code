"""Polars side of the Iceberg interoperability mission."""
import polars as pl

TABLE_METADATA = "s3://YOUR_BUCKET/orders_iceberg/metadata/v1.metadata.json"

orders = (
    pl.scan_iceberg(TABLE_METADATA)
      .filter(pl.col("order_status") == "COMPLETE")
      .select("order_id", "customer_id", "order_total", "order_ts")
)

print(orders.explain())
print(orders.head(20).collect())
