from decimal import Decimal

from apps.api.datapass.catalog import Catalog, json_value


def test_decimal_json_preserves_precision_and_normalizes_nonfinite():
    assert json_value(Decimal('12.34')) == 12.34
    assert json_value(Decimal('12345678901234567890.123456789')) == '12345678901234567890.123456789'
    assert json_value(Decimal('NaN')) is None
    assert json_value(Decimal('Infinity')) is None


def test_duckdb_revenue_reaches_chart_as_numeric_rows(tmp_path):
    catalog = Catalog(tmp_path, mode='duckdb')
    try:
        assert catalog.query("SELECT CAST(12.34 AS DECIMAL(10,2)) AS revenue")['rows'] == [{'revenue': 12.34}]
    finally:
        catalog.close()
