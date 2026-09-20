"""Explicit opt-in real DuckLake smoke test; failure is not a successful fallback.

New workspaces must prove the canonical local profile:
DuckDB compute + SQLite DuckLake metadata + Parquet data + inlining disabled.

Install requirements-engines.txt first. Set DATAPASS_INSTALL_DUCKLAKE=1 only
when extension download is authorized.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apps.api.datapass.execution import Engine


with TemporaryDirectory() as directory:
    p = Path(directory)
    e = Engine(p, 'ducklake')
    try:
        capabilities = e.capabilities()
        lakehouse = capabilities['lakehouse']
        assert capabilities['ducklake_active'] is True
        assert lakehouse['active'] is True
        assert lakehouse['compute_engine'] == 'duckdb'
        assert lakehouse['metadata_backend'] == 'sqlite'
        assert lakehouse['metadata_file'] == 'lake-metadata.sqlite'
        assert lakehouse['data_format'] == 'parquet'
        assert lakehouse['data_directory'] == 'lake-files'
        assert lakehouse['data_inlining_row_limit'] == 0
        assert lakehouse['legacy_metadata'] is False

        result = e.workflow({'case_id': 'retail-medallion', 'notebook_id': 'n'})
        assert result['status'] == 'success', result
    finally:
        e.catalog.close()

    assert (p / 'lake-metadata.sqlite').exists(), 'No SQLite DuckLake metadata file was created.'
    files = list((p / 'lake-files').rglob('*.parquet'))
    assert files, 'No actual Parquet file evidence found in the DuckLake data path.'

    reopened = Engine(p, 'ducklake')
    try:
        rows = reopened.catalog.query('SELECT SUM(revenue) AS revenue FROM gold.customer_revenue')['rows']
        assert rows == [{'revenue': 4985.0}], rows
        reopened_contract = reopened.capabilities()['lakehouse']
        assert reopened_contract['metadata_backend'] == 'sqlite'
        assert reopened_contract['data_inlining_row_limit'] == 0
    finally:
        reopened.catalog.close()

    print(
        'Real DuckLake SQLite-metadata/Parquet/reopen passed.',
        'Files:', len(files),
        'Metadata:', (p / 'lake-metadata.sqlite').name,
    )
