#!/usr/bin/env python3
"""Generate a local full-market A-share snapshot for autocomplete search.

The app reads the generated JSON snapshot at runtime, so refreshing the stock
universe is an offline maintenance task:

  python3 scripts/sync-stock-search-data.py
"""

from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "stocks.generated.json"
EASTMONEY_ENDPOINT = "https://push2delay.eastmoney.com/api/qt/clist/get"
PAGE_SIZE = 100
MARKET_FS = "m:1+t:2,m:1+t:23,m:0+t:6,m:0+t:80,m:0+t:81"


def clean_text(value: object) -> str:
    normalized = unicodedata.normalize("NFKC", str(value or ""))
    return normalized.replace(" ", "").replace("\u3000", "").strip()


def resolve_market(code: str) -> tuple[str, str] | None:
    if code.startswith("688"):
        return ("STAR", "SSE")

    if code.startswith("920"):
        return ("BJ", "BSE")

    if code.startswith("3"):
        return ("CYB", "SZSE")

    if code.startswith(("0", "2")):
        return ("SZ", "SZSE")

    if code.startswith(("6", "9")):
        return ("SH", "SSE")

    return None


def fetch_page(page: int) -> dict[str, object]:
    params = urlencode(
        {
            "pn": str(page),
            "pz": str(PAGE_SIZE),
            "po": "1",
            "np": "1",
            "fltt": "2",
            "invt": "2",
            "fid": "f12",
            "fs": MARKET_FS,
            "fields": "f12,f14",
        }
    )
    request = Request(
        f"{EASTMONEY_ENDPOINT}?{params}",
        headers={
            "accept": "application/json,text/plain,*/*",
            "referer": "https://quote.eastmoney.com/",
            "user-agent": "Mozilla/5.0",
        },
    )

    with urlopen(request, timeout=20) as response:
        return json.load(response)


def main() -> int:
    records_by_code: dict[str, dict[str, str]] = {}
    total = 0

    try:
        first_page = fetch_page(1)
    except Exception as exc:
        print(f"Failed to fetch stock universe: {exc}", file=sys.stderr)
        return 1

    first_page_data = first_page.get("data") or {}
    total = int(first_page_data.get("total") or 0)
    total_pages = max(1, (max(total, PAGE_SIZE) + PAGE_SIZE - 1) // PAGE_SIZE)

    for page in range(1, total_pages + 1):
        payload = first_page if page == 1 else fetch_page(page)
        items = ((payload.get("data") or {}).get("diff") or [])

        for item in items:
            if not isinstance(item, dict):
                continue

            code = clean_text(item.get("f12")).zfill(6)
            name = clean_text(item.get("f14"))
            market = resolve_market(code)

            if not code.isdigit() or len(code) != 6 or not name or not market:
                continue

            records_by_code[code] = {
                "code": code,
                "name": name,
                "market": market[0],
                "exchange": market[1],
            }

    output = [
        records_by_code[code]
        for code in sorted(records_by_code.keys())
    ]

    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    print(
        f"Wrote {len(output)} stocks to {OUTPUT_PATH} "
        f"(upstream total={total}, retained={len(output)})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
