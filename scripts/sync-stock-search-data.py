#!/usr/bin/env python3
"""Generate a local A-share stock snapshot for autocomplete search.

This script is intentionally optional at runtime: the app reads the generated
JSON snapshot and does not require akshare to be installed. To refresh the
snapshot locally:

  1. Create a Python environment with akshare installed
  2. Run: python3 scripts/sync-stock-search-data.py
"""

from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "stocks.generated.json"
ST_PREFIXES = ("ST", "*ST", "SST", "S*ST")


def clean_text(value: object) -> str:
    normalized = unicodedata.normalize("NFKC", str(value or ""))
    return normalized.replace(" ", "").replace("\u3000", "").strip()


def main() -> int:
    try:
        import akshare as ak  # type: ignore
    except Exception:
        print(
            "akshare is required to refresh the stock snapshot. "
            "Install it in a Python environment first.",
            file=sys.stderr,
        )
        return 1

    sh_df = ak.stock_info_sh_name_code(symbol="主板A股")
    sz_df = ak.stock_info_sz_name_code(symbol="A股列表")

    records_by_code: dict[str, dict[str, str]] = {}

    for _, row in sh_df.iterrows():
        code = clean_text(row["证券代码"]).zfill(6)
        name = clean_text(row["证券简称"])

        if not code.isdigit() or len(code) != 6 or name.startswith(ST_PREFIXES):
          continue

        records_by_code[code] = {
            "code": code,
            "name": name,
            "market": "SH",
            "exchange": "SSE",
        }

    for _, row in sz_df.iterrows():
        code = clean_text(row["A股代码"]).zfill(6)
        name = clean_text(row["A股简称"])
        board = clean_text(row["板块"])

        if not code.isdigit() or len(code) != 6 or name.startswith(ST_PREFIXES):
            continue

        records_by_code[code] = {
            "code": code,
            "name": name,
            "market": "CYB" if board == "创业板" else "SZ",
            "exchange": "SZSE",
        }

    output = [
        records_by_code[code]
        for code in sorted(records_by_code.keys())
    ]

    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {len(output)} stocks to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
