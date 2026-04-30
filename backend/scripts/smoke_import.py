"""CI smoke test — verify the FastAPI app imports cleanly and registers
every expected route.

Used by `.github/workflows/ci.yml`. Failing here means a circular import,
missing dependency, or a router didn't get wired up in main.py.

Run from the backend/ directory:
    python scripts/smoke_import.py
"""
import sys
from pathlib import Path

# This script lives in backend/scripts/; main.py lives one level up. Make
# the parent directory importable regardless of CWD.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main

api_routes = [r for r in main.app.routes if r.path.startswith("/api")]
print(f"OK: {len(api_routes)} api routes registered")

if len(api_routes) == 0:
    raise SystemExit("FAIL: no /api routes registered — main.py may be missing app.include_router calls")
