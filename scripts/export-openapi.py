"""Regenerate the committed FastAPI OpenAPI contract deterministically."""
from __future__ import annotations

import json
from pathlib import Path

from apps.api.datapass.api import create_app


def main() -> None:
    app = create_app()
    try:
        target = Path("packages/contracts/openapi.json")
        target.write_text(
            json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    finally:
        app.state.manager.close()


if __name__ == "__main__":
    main()
