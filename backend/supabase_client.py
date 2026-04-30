"""Single Supabase client + env constants used across routers and services.

Importing this module loads the .env file (idempotent) and creates one
shared `supabase` instance with the service-role key. Every router/service
that touches the DB or storage should import `supabase` from here rather
than calling `create_client(...)` again.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
KAKAO_REST_KEY = os.environ.get("KAKAO_REST_KEY", "")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Backend-local cache for per-site coordinates. The dashboard view
# (`v_site_dashboard`) does not return lat/lon — we read it from this JSON
# file instead so the geocoding cache survives restarts.
COORDS_FILE = Path(__file__).parent / "site_coordinates.json"
