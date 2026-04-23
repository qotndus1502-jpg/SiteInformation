from fastapi import FastAPI, Query, UploadFile, File, Form, Body, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from dotenv import load_dotenv
import os
import json
import math
import time
import traceback
import httpx
from typing import Optional
from pathlib import Path
from datetime import date, datetime
from collections import defaultdict

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
KAKAO_REST_KEY = os.environ.get("KAKAO_REST_KEY", "")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

COORDS_FILE = Path(__file__).parent / "site_coordinates.json"

DEFAULT_DEPARTMENTS: list[tuple[str, int]] = [
    ("공무", 10),
    ("공사", 20),
    ("안전", 30),
]

app = FastAPI(title="SiteInformation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://192.168.0.6:3000", "http://54.116.15.150", "https://site-info-umber.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Auth dependencies
# ─────────────────────────────────────────────────────────────
# Users authenticate via Supabase Auth (client-side), then send the JWT as
# `Authorization: Bearer <token>`. We verify with supabase.auth.get_user()
# (one extra API call per request — fine for an internal dashboard) and
# cross-check the profile row for status/role.
#
# Three layers:
#   get_current_user_raw  — JWT valid, profile loaded (may be pending/null)
#   get_current_user      — above + status == approved
#   require_admin         — above + role == admin

_bearer = HTTPBearer(auto_error=False)


def _load_profile(user_id: str) -> Optional[dict]:
    try:
        r = supabase.schema("pmis").from_("user_profile").select("*").eq("id", user_id).limit(1).execute()
    except Exception:
        return None
    rows = r.data or []
    return rows[0] if rows else None


def get_current_user_raw(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """Verify JWT and attach profile. Profile may be None or pending — the
    caller decides what to do. Used by /api/me so pending users can learn
    their own state."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")
    token = credentials.credentials
    try:
        auth_res = supabase.auth.get_user(token)
        auth_user = getattr(auth_res, "user", None)
    except Exception:
        raise HTTPException(status_code=401, detail="인증 토큰이 유효하지 않습니다")
    if auth_user is None:
        raise HTTPException(status_code=401, detail="인증 토큰이 유효하지 않습니다")
    profile = _load_profile(auth_user.id)
    return {
        "id": auth_user.id,
        "email": auth_user.email,
        "profile": profile,
        "role": (profile or {}).get("role", "user"),
        "status": (profile or {}).get("status"),
    }


def get_current_user(user: dict = Depends(get_current_user_raw)) -> dict:
    """Approved users only. Use on endpoints that should be hidden from
    pending/rejected accounts."""
    profile = user.get("profile")
    if profile is None:
        raise HTTPException(status_code=403, detail="프로필이 존재하지 않습니다. 관리자에게 문의하세요")
    status_ = profile.get("status")
    if status_ == "pending":
        raise HTTPException(status_code=403, detail="가입 승인 대기 중입니다. 관리자 승인 후 이용하실 수 있습니다")
    if status_ == "rejected":
        raise HTTPException(status_code=403, detail="가입이 거부된 계정입니다")
    if status_ != "approved":
        raise HTTPException(status_code=403, detail="계정 상태가 유효하지 않습니다")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Admin only."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return user


# ─────────────────────────────────────────────────────────────
# Auth-related endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/api/me")
def api_me(user: dict = Depends(get_current_user_raw)):
    """Current user + profile. Works for any authenticated token regardless of
    approval status, so the frontend can redirect pending/rejected users to
    the appropriate page."""
    p = user.get("profile") or {}
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user.get("role") or "user",
        "status": p.get("status"),  # None if profile missing
        "full_name": p.get("full_name"),
        "employee_number": p.get("employee_number"),
        "corporation_id": p.get("corporation_id"),
        "phone": p.get("phone"),
    }


# ── Admin: user management ──────────────────────────────────

@app.get("/api/users")
def list_users(
    status: Optional[str] = Query(None, description="pending | approved | rejected"),
    _admin: dict = Depends(require_admin),
):
    q = supabase.schema("pmis").from_("user_profile").select("*").order("requested_at", desc=True)
    if status:
        q = q.eq("status", status)
    r = q.execute()
    return r.data or []


@app.post("/api/users/{user_id}/approve")
def approve_user(
    user_id: str,
    payload: dict = Body(default={}),
    admin: dict = Depends(require_admin),
):
    """Approve a pending user. Optional body: {"role": "user" | "admin"}."""
    role = (payload or {}).get("role", "user")
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role은 'user' 또는 'admin'이어야 합니다")
    try:
        r = supabase.schema("pmis").from_("user_profile").update({
            "status": "approved",
            "role": role,
            "approved_at": datetime.utcnow().isoformat(),
            "approved_by": admin["id"],
            "reject_reason": None,
        }).eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DB 오류: {e}")
    row = (r.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return {"ok": True, "user": row}


@app.post("/api/users/{user_id}/reject")
def reject_user(
    user_id: str,
    payload: dict = Body(default={}),
    admin: dict = Depends(require_admin),
):
    """Reject a pending user with optional reason."""
    reason = (payload or {}).get("reason") or None
    try:
        r = supabase.schema("pmis").from_("user_profile").update({
            "status": "rejected",
            "reject_reason": reason,
            "approved_by": admin["id"],
        }).eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DB 오류: {e}")
    row = (r.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return {"ok": True, "user": row}


@app.post("/api/users/{user_id}/role")
def change_user_role(
    user_id: str,
    payload: dict = Body(...),
    _admin: dict = Depends(require_admin),
):
    """Change an approved user's role."""
    role = (payload or {}).get("role")
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role은 'user' 또는 'admin'이어야 합니다")
    try:
        r = supabase.schema("pmis").from_("user_profile").update({"role": role}).eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DB 오류: {e}")
    row = (r.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return {"ok": True, "user": row}


@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Remove the user completely (auth.users row). The user_profile row
    cascades via FK. Admin cannot delete themselves."""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="본인 계정은 삭제할 수 없습니다")
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"삭제 실패: {e}")
    return {"ok": True}


def load_coords() -> dict[str, dict]:
    """Load cached coordinates from JSON file."""
    if COORDS_FILE.exists():
        return json.loads(COORDS_FILE.read_text(encoding="utf-8"))
    return {}


def save_coords(coords: dict[str, dict]):
    """Save coordinates to JSON file."""
    COORDS_FILE.write_text(json.dumps(coords, ensure_ascii=False, indent=2), encoding="utf-8")


async def geocode_address(client: httpx.AsyncClient, address: str) -> tuple[float, float] | None:
    """Kakao Local API: address -> (latitude, longitude)"""
    try:
        res = await client.get(
            "https://dapi.kakao.com/v2/local/search/address.json",
            params={"query": address},
            headers={"Authorization": f"KakaoAK {KAKAO_REST_KEY}"},
            timeout=10,
        )
        data = res.json()
        docs = data.get("documents", [])
        if docs:
            return (float(docs[0]["y"]), float(docs[0]["x"]))
    except Exception:
        pass
    return None


def parse_ranges(raw: str) -> list[dict]:
    """'100-500,1000-2000' -> [{'min': 100, 'max': 500}, ...]"""
    result = []
    for r in raw.split(","):
        r = r.strip()
        if not r:
            continue
        parts = r.split("-")
        lo = float(parts[0])
        hi = float("inf") if parts[1] == "" else float(parts[1])
        result.append({"min": lo, "max": hi})
    return result


ORDER_TYPES = {"BTL", "CMR", "민간", "민참", "종심제"}

# 그룹 3사
GROUP_COMPANIES = {"남광토건", "극동건설", "금광기업"}

import re

def _parse_jv_shares(jv_summary: str | None) -> dict[str, float]:
    """Parse JV summary string into {company: ratio}.
    Example: '극동건설 65.00%, 오렌지 20.00%' -> {'극동건설': 0.65, '오렌지': 0.20}
    """
    if not jv_summary:
        return {}
    result = {}
    for part in jv_summary.split(","):
        part = part.strip()
        m = re.match(r"(.+?)\s+([\d.]+)%", part)
        if m:
            result[m.group(1).strip()] = float(m.group(2)) / 100
    return result


def calc_group_share(site: dict) -> dict:
    """Calculate our_share_amount and group_share_amount for a site.
    - our_share_amount: 해당 현장 법인의 지분 도급액
    - group_share_amount: 그룹 3사 합산 지분 도급액
    """
    contract = site.get("contract_amount") or 0
    corp = site.get("corporation_name") or ""
    shares = _parse_jv_shares(site.get("jv_summary"))

    # 자사(현장 법인) 지분
    our_ratio = shares.get(corp, 1.0)  # JV 없으면 100%
    our_amount = round(contract * our_ratio)

    # 그룹 3사 합산 지분 (JV 없으면 소유 법인이 100%)
    if shares:
        group_ratio = sum(r for c, r in shares.items() if c in GROUP_COMPANIES)
    else:
        group_ratio = 1.0 if corp in GROUP_COMPANIES else 0.0
    group_amount = round(contract * group_ratio)

    site["our_share_amount"] = our_amount
    site["group_share_amount"] = group_amount
    site["our_share_ratio"] = round(our_ratio, 4)
    site["group_share_ratio"] = round(group_ratio, 4)
    return site


def attach_share_amounts(sites: list[dict]) -> list[dict]:
    """Attach calculated share amounts to all sites."""
    for site in sites:
        calc_group_share(site)
    return sites


def auto_status(sites: list[dict]) -> list[dict]:
    """start_date/end_date 기준으로 status 자동 판정.
    - start_date > 오늘 → PRE_START
    - start_date <= 오늘 && (end_date 없음 || end_date >= 오늘) → ACTIVE
    - end_date < 오늘 → COMPLETED
    SUSPENDED와 status_manual=true는 관리자 편집이 우선이라 건드리지 않는다.
    """
    today = date.today().isoformat()
    for s in sites:
        if s.get("status") == "SUSPENDED":
            continue
        if s.get("status_manual"):
            continue
        sd = s.get("start_date")
        ed = s.get("end_date")
        if sd and sd > today:
            s["status"] = "PRE_START"
        elif ed and ed < today:
            s["status"] = "COMPLETED"
        elif sd and sd <= today:
            s["status"] = "ACTIVE"
    return sites


def clean_facility_type(sites: list[dict]) -> list[dict]:
    """facility_type_name이 발주유형과 동일하면 비워서 중복 표시 방지."""
    for site in sites:
        ft = site.get("facility_type_name") or ""
        if ft in ORDER_TYPES:
            site["facility_type_name"] = None
    return sites


def attach_coords(sites: list[dict]) -> list[dict]:
    """Attach latitude/longitude from cached coordinates."""
    coords = load_coords()
    for site in sites:
        site_id = str(site["id"])
        if site_id in coords:
            site["latitude"] = coords[site_id]["latitude"]
            site["longitude"] = coords[site_id]["longitude"]
        else:
            site["latitude"] = None
            site["longitude"] = None
    return sites


# ── In-memory cache for the dashboard sites view ─────────────────────────
# Supabase round-trips are the dominant latency for /api/sites and
# /api/statistics/summary (~400ms each). Filters change rapidly under
# Power BI-style cross-filtering, so we fetch the full dashboard view once,
# cache it, and apply all filters in-memory afterwards. TTL is short enough
# that DB updates surface within a minute without manual invalidation.

_SITES_CACHE: dict = {"data": None, "ts": 0.0}
SITES_CACHE_TTL = 60.0  # seconds


def get_all_sites_cached() -> list[dict]:
    """Return the full dashboard site list, fetching from Supabase only when
    the in-memory cache is empty or stale. Result is already deduped and
    enriched (clean_facility_type + attach_share_amounts + attach_coords)."""
    now = time.time()
    cached = _SITES_CACHE["data"]
    if cached is not None and (now - _SITES_CACHE["ts"]) < SITES_CACHE_TTL:
        return cached

    response = supabase.schema("pmis").from_("v_site_dashboard").select("*").order(
        "progress_rate", desc=False
    ).execute()
    raw = response.data or []

    # Deduplicate by site_name + corporation_code
    seen = set()
    deduped: list[dict] = []
    for s in raw:
        key = f"{s.get('site_name')}::{s.get('corporation_code')}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(s)

    deduped = clean_facility_type(deduped)

    # status_manual flag lives on project_site, not the dashboard view.
    # Merge it in so auto_status() can skip admin-pinned rows.
    try:
        manual_resp = supabase.schema("pmis").from_("project_site").select("id,status_manual").execute()
        manual_map = {r["id"]: bool(r.get("status_manual")) for r in (manual_resp.data or [])}
    except Exception:
        manual_map = {}
    for s in deduped:
        s["status_manual"] = manual_map.get(s.get("id"), False)

    deduped = auto_status(deduped)
    deduped = attach_share_amounts(deduped)
    deduped = attach_coords(deduped)

    _SITES_CACHE["data"] = deduped
    _SITES_CACHE["ts"] = now
    return deduped


def invalidate_sites_cache() -> None:
    _SITES_CACHE["data"] = None
    _SITES_CACHE["ts"] = 0.0


def _split_csv(v: Optional[str]) -> Optional[list[str]]:
    if not v or v == "all":
        return None
    parts = [p.strip() for p in v.split(",") if p.strip() and p.strip() != "all"]
    return parts or None


def filter_sites_in_memory(
    sites: list[dict],
    corporation: Optional[str] = None,
    region: Optional[str] = None,
    facilityType: Optional[str] = None,
    orderType: Optional[str] = None,
    division: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    amountRanges: Optional[str] = None,
    progressRanges: Optional[str] = None,
    groupShareRanges: Optional[str] = None,
    startYear: Optional[str] = None,
    endYear: Optional[str] = None,
) -> list[dict]:
    """Apply the same filter logic as the previous Supabase queries, but
    against an in-memory list. Used by both /api/sites and the summary
    endpoint so they share a single cached source of truth."""
    corp_list = _split_csv(corporation)
    region_list = _split_csv(region)
    facility_list = _split_csv(facilityType)
    order_list = _split_csv(orderType)
    division_list = _split_csv(division)
    status_list = _split_csv(status)
    search_lc = (search or "").strip().lower() or None

    out = sites
    if corp_list:
        cs = set(corp_list)
        out = [s for s in out if s.get("corporation_name") in cs]
    if region_list:
        rs = set(region_list)
        out = [s for s in out if s.get("region_name") in rs]
    if facility_list:
        fs = set(facility_list)
        out = [s for s in out if s.get("facility_type_name") in fs]
    if order_list:
        os_ = set(order_list)
        out = [s for s in out if s.get("order_type") in os_]
    if division_list:
        ds = set(division_list)
        out = [s for s in out if s.get("division") in ds]
    if status_list:
        ss = set(status_list)
        out = [s for s in out if s.get("status") in ss]
    if search_lc:
        out = [s for s in out if search_lc in (s.get("site_name") or "").lower()]
    if amountRanges:
        ranges = parse_ranges(amountRanges)
        out = [
            s for s in out
            if any(r["min"] <= (s.get("contract_amount") or 0) < r["max"] for r in ranges)
        ]
    if progressRanges:
        ranges = parse_ranges(progressRanges)
        out = [
            s for s in out
            if any(r["min"] <= (s.get("progress_rate") or 0) * 100 < r["max"] for r in ranges)
        ]
    if groupShareRanges:
        ranges = parse_ranges(groupShareRanges)
        out = [
            s for s in out
            if any(r["min"] <= (s.get("group_share_amount") or 0) < r["max"] for r in ranges)
        ]
    if startYear:
        out = [s for s in out if s.get("start_date") and _date_to_ym(s["start_date"]) == startYear]
    if endYear:
        out = [s for s in out if s.get("end_date") and s["end_date"][:4] == endYear]
    return out


@app.get("/api/sites")
async def get_sites(
    corporation: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    facilityType: Optional[str] = Query(None),
    orderType: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    amountRanges: Optional[str] = Query(None),
    progressRanges: Optional[str] = Query(None),
    groupShareRanges: Optional[str] = Query(None),
    startYear: Optional[str] = Query(None),
    endYear: Optional[str] = Query(None),
):
    try:
        # Cached source of truth → in-memory filter (no Supabase round-trip on hot path)
        return filter_sites_in_memory(
            get_all_sites_cached(),
            corporation=corporation,
            region=region,
            facilityType=facilityType,
            orderType=orderType,
            division=division,
            status=status,
            search=search,
            amountRanges=amountRanges,
            progressRanges=progressRanges,
            groupShareRanges=groupShareRanges,
            startYear=startYear,
            endYear=endYear,
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )


@app.post("/api/geocode")
async def geocode_all_sites(_admin: dict = Depends(require_admin)):
    """Batch geocode all sites with office_address and cache results."""
    if not KAKAO_REST_KEY:
        return JSONResponse(status_code=400, content={"error": "KAKAO_REST_KEY not configured"})

    response = supabase.schema("pmis").from_("v_site_dashboard").select("id, site_name, office_address").execute()
    sites = response.data or []

    coords = load_coords()
    results = {"total": len(sites), "geocoded": 0, "skipped": 0, "failed": 0, "failed_sites": []}

    async with httpx.AsyncClient() as client:
        for site in sites:
            site_id = str(site["id"])
            address = site.get("office_address")

            if not address:
                results["skipped"] += 1
                continue

            # Skip already geocoded
            if site_id in coords:
                results["skipped"] += 1
                continue

            result = await geocode_address(client, address)
            if result:
                coords[site_id] = {"latitude": result[0], "longitude": result[1]}
                results["geocoded"] += 1
            else:
                results["failed"] += 1
                results["failed_sites"].append({"id": site["id"], "name": site["site_name"], "address": address})

    save_coords(coords)
    return results


@app.post("/api/upload-site-image")
async def upload_site_image(file: UploadFile = File(...), site_id: str = Form(...), _admin: dict = Depends(require_admin)):
    """Upload or replace a site image to Supabase Storage."""
    content = await file.read()
    file_name = f"site_{site_id}.jpg"
    supabase.storage.from_("site-images").upload(
        file_name, content,
        file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
    )
    url = supabase.storage.from_("site-images").get_public_url(file_name)
    return {"ok": True, "url": url}


@app.post("/api/upload-org-photo")
async def upload_org_photo(file: UploadFile = File(...), member_id: str = Form(...), _admin: dict = Depends(require_admin)):
    """Upload or replace an org member photo to Supabase Storage."""
    content = await file.read()
    file_name = f"member_{member_id}.jpg"
    supabase.storage.from_("org-photos").upload(
        file_name, content,
        file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
    )
    url = supabase.storage.from_("org-photos").get_public_url(file_name)
    return {"ok": True, "url": url}


_FILTER_OPTIONS_CACHE: dict = {"data": None, "ts": 0.0}


@app.get("/api/filter-options")
async def get_filter_options():
    """Derive filter options from the cached dashboard view. No extra DB round-trip."""
    now = time.time()
    cached = _FILTER_OPTIONS_CACHE["data"]
    if cached is not None and (now - _FILTER_OPTIONS_CACHE["ts"]) < SITES_CACHE_TTL:
        return cached

    sites = get_all_sites_cached()
    corporations = sorted({s.get("corporation_name") for s in sites if s.get("corporation_name")})
    regions = sorted({s.get("region_name") for s in sites if s.get("region_name")})
    order_types = sorted({s.get("order_type") for s in sites if s.get("order_type")})
    # facility_type_name is already cleaned in get_all_sites_cached (ORDER_TYPES stripped to None)
    facility_types = sorted({s.get("facility_type_name") for s in sites if s.get("facility_type_name")})

    result = {
        "corporations": corporations,
        "regions": regions,
        "facilityTypes": facility_types,
        "orderTypes": order_types,
        "divisions": ["토목", "건축"],
        "statuses": ["ACTIVE", "COMPLETED", "SUSPENDED", "PRE_START"],
    }
    _FILTER_OPTIONS_CACHE["data"] = result
    _FILTER_OPTIONS_CACHE["ts"] = now
    return result


# ── Org Chart ──────────────────────────────────────────────

@app.get("/api/sites/{site_id}/org-chart")
async def get_site_org_chart(site_id: int):
    """Get all active org members for a site."""
    response = supabase.schema("pmis").from_("v_site_org_chart") \
        .select("*") \
        .eq("site_id", site_id) \
        .order("sort_order") \
        .execute()
    return response.data or []


@app.get("/api/org-roles")
async def get_org_roles():
    """Get all available org roles."""
    response = supabase.schema("pmis").from_("org_role") \
        .select("*") \
        .eq("is_active", True) \
        .order("sort_order") \
        .execute()
    return response.data or []


@app.get("/api/sites/{site_id}/headcount-summary")
async def get_headcount_summary(site_id: int):
    """Get headcount summary for a site."""
    response = supabase.schema("pmis").from_("site_headcount_summary") \
        .select("*") \
        .eq("site_id", site_id) \
        .order("sort_order") \
        .execute()
    return response.data or []


@app.get("/api/sites/{site_id}/required-headcount")
async def get_required_headcount(site_id: int):
    """사원 유형별 소요 인원 조회. 값 없으면 0으로 채워 반환."""
    response = supabase.schema("pmis").from_("site") \
        .select("required_headcount") \
        .eq("id", site_id) \
        .limit(1) \
        .execute()
    row = (response.data or [{}])[0]
    data = row.get("required_headcount") or {}
    return {
        "general": int(data.get("general") or 0),
        "specialist": int(data.get("specialist") or 0),
        "contract": int(data.get("contract") or 0),
        "jv": int(data.get("jv") or 0),
    }


@app.put("/api/sites/{site_id}/required-headcount")
async def update_required_headcount(site_id: int, payload: dict = Body(...), _admin: dict = Depends(require_admin)):
    """사원 유형별 소요 인원 저장."""
    data = {
        "general": max(0, int(payload.get("general") or 0)),
        "specialist": max(0, int(payload.get("specialist") or 0)),
        "contract": max(0, int(payload.get("contract") or 0)),
        "jv": max(0, int(payload.get("jv") or 0)),
    }
    supabase.schema("pmis").from_("site") \
        .update({"required_headcount": data}) \
        .eq("id", site_id) \
        .execute()
    return data


@app.get("/api/sites/{site_id}/departments")
async def get_site_departments(site_id: int):
    """Get departments for a site. Auto-seeds defaults on first access if empty."""
    response = supabase.schema("pmis").from_("site_department") \
        .select("*") \
        .eq("site_id", site_id) \
        .order("sort_order") \
        .execute()
    rows = response.data or []
    if not rows:
        try:
            _seed_default_departments(site_id)
            response = supabase.schema("pmis").from_("site_department") \
                .select("*") \
                .eq("site_id", site_id) \
                .order("sort_order") \
                .execute()
            rows = response.data or []
        except Exception as e:
            print(f"[WARN] default department auto-seed failed for site {site_id}: {e}")
    return rows


@app.post("/api/sites/{site_id}/departments")
async def create_site_department(site_id: int, payload: dict = Body(...), _admin: dict = Depends(require_admin)):
    """Create a new department for a site."""
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="팀 이름을 입력해주세요")
    # sort_order: 마지막 순서 + 10
    existing = supabase.schema("pmis").from_("site_department") \
        .select("sort_order").eq("site_id", site_id).order("sort_order", desc=True).limit(1).execute()
    next_order = payload.get("sort_order")
    if next_order is None:
        next_order = (existing.data[0]["sort_order"] + 10) if existing.data else 10
    res = supabase.schema("pmis").from_("site_department").insert({
        "site_id": site_id, "name": name, "sort_order": next_order,
    }).execute()
    return res.data[0] if res.data else None


@app.put("/api/departments/{dept_id}")
async def update_site_department(dept_id: int, payload: dict = Body(...), _admin: dict = Depends(require_admin)):
    """Rename / reorder department / update required_count."""
    patch: dict = {}
    if "name" in payload:
        n = (payload.get("name") or "").strip()
        if not n:
            raise HTTPException(status_code=400, detail="팀 이름을 입력해주세요")
        patch["name"] = n
    if "sort_order" in payload:
        patch["sort_order"] = int(payload["sort_order"])
    if "required_count" in payload:
        patch["required_count"] = max(0, int(payload["required_count"] or 0))
    if not patch:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다")
    res = supabase.schema("pmis").from_("site_department").update(patch).eq("id", dept_id).execute()
    return res.data[0] if res.data else None


@app.delete("/api/departments/{dept_id}")
async def delete_site_department(dept_id: int, _admin: dict = Depends(require_admin)):
    """Delete department. Blocks if active members still reference it."""
    members = supabase.schema("pmis").from_("site_org_member") \
        .select("id", count="exact") \
        .eq("department_id", dept_id) \
        .eq("is_active", True) \
        .execute()
    count = members.count or 0
    if count > 0:
        raise HTTPException(status_code=400, detail=f"팀에 소속된 조직원 {count}명이 있습니다")
    supabase.schema("pmis").from_("site_department").delete().eq("id", dept_id).execute()
    return {"ok": True}


def _seed_default_departments(site_id: int) -> None:
    """Insert DEFAULT_DEPARTMENTS for a site if it has none yet. Idempotent."""
    existing = supabase.schema("pmis").from_("site_department") \
        .select("id").eq("site_id", site_id).limit(1).execute()
    if existing.data:
        return
    rows = [{"site_id": site_id, "name": n, "sort_order": o} for n, o in DEFAULT_DEPARTMENTS]
    supabase.schema("pmis").from_("site_department").insert(rows).execute()


@app.post("/api/sites/{site_id}/org-members")
async def create_org_member(site_id: int, member: dict, _admin: dict = Depends(require_admin)):
    """Add a new org member."""
    member["site_id"] = site_id
    response = supabase.schema("pmis").from_("site_org_member") \
        .insert(member) \
        .execute()
    return response.data


@app.put("/api/org-members/{member_id}")
async def update_org_member(member_id: int, updates: dict, _admin: dict = Depends(require_admin)):
    """Update an org member."""
    updates.pop("id", None)
    response = supabase.schema("pmis").from_("site_org_member") \
        .update(updates) \
        .eq("id", member_id) \
        .execute()
    return response.data


@app.delete("/api/org-members/{member_id}")
async def delete_org_member(member_id: int, _admin: dict = Depends(require_admin)):
    """Soft-delete: set is_active=false."""
    supabase.schema("pmis").from_("site_org_member") \
        .update({"is_active": False}) \
        .eq("id", member_id) \
        .execute()
    return {"ok": True}


@app.get("/api/org-members/{member_id}/profile")
async def get_org_member_profile(member_id: int):
    """Get org member profile. Returns member data + parsed resume_data."""
    try:
        response = supabase.schema("pmis").from_("v_site_org_chart") \
            .select("*") \
            .eq("id", member_id) \
            .execute()
        if not response.data:
            return JSONResponse(status_code=404, content={"error": "Member not found"})

        member = response.data[0]

        # Parse resume_data JSON
        resume = {}
        rd = member.get("resume_data")
        if rd:
            if isinstance(rd, str):
                try:
                    resume = json.loads(rd)
                except Exception:
                    pass
            elif isinstance(rd, dict):
                resume = rd

        # Get team members (same department or top-level)
        site_id = member.get("site_id")
        dept_id = member.get("department_id")
        peer_cols = "id,name,rank,role_name,phone,email,department_name"
        if dept_id:
            peers = supabase.schema("pmis").from_("v_site_org_chart") \
                .select(peer_cols) \
                .eq("site_id", site_id).eq("department_id", dept_id) \
                .order("sort_order").execute()
        else:
            peers = supabase.schema("pmis").from_("v_site_org_chart") \
                .select(peer_cols) \
                .eq("site_id", site_id).is_("parent_id", "null") \
                .order("sort_order").execute()

        return {
            "member": member,
            "resume": resume,
            "peers": peers.data or [],
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )


@app.put("/api/org-members/{member_id}/profile")
async def update_org_member_profile(member_id: int, body: dict, _admin: dict = Depends(require_admin)):
    """Update org member profile fields."""
    allowed = {
        "birth_date", "address", "phone_work", "photo_url",
        "job_category", "skills", "hobby", "entry_type",
        "task_detail", "resume_data",
        "name", "rank", "phone", "email", "specialty",
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return {"ok": True}
    updates["updated_at"] = datetime.utcnow().isoformat()
    response = supabase.schema("pmis").from_("site_org_member") \
        .update(updates).eq("id", member_id).execute()
    return response.data


# ── Employee Profile (public schema) ─────────────────────────

@app.get("/api/employees")
async def get_employees(teamId: Optional[int] = Query(None)):
    """Get employees, optionally filtered by team."""
    query = supabase.from_("Employee").select("*")
    if teamId:
        query = query.eq("teamId", teamId)
    response = query.eq("status", "ACTIVE").execute()
    return response.data or []


@app.get("/api/employees/{employee_id}")
async def get_employee(employee_id: int):
    """Get single employee with team & location info."""
    emp = supabase.from_("Employee").select("*").eq("id", employee_id).single().execute()
    if not emp.data:
        return JSONResponse(status_code=404, content={"error": "Employee not found"})

    employee = emp.data
    # Get team info
    team = None
    if employee.get("teamId"):
        t = supabase.from_("Team").select("*").eq("id", employee["teamId"]).single().execute()
        team = t.data
    # Get location info
    location = None
    if team and team.get("locationId"):
        loc = supabase.from_("Location").select("*").eq("id", team["locationId"]).single().execute()
        location = loc.data

    # Parse resumeData JSON
    resume = {}
    if employee.get("resumeData"):
        try:
            resume = json.loads(employee["resumeData"])
        except Exception:
            pass

    return {
        "employee": employee,
        "team": team,
        "location": location,
        "resume": resume,
    }


@app.get("/api/teams")
async def get_teams():
    """Get all teams."""
    response = supabase.from_("Team").select("*").execute()
    return response.data or []


@app.get("/api/teams/{team_id}/members")
async def get_team_members(team_id: int):
    """Get all members of a team."""
    response = supabase.from_("Employee").select(
        "id,name,position,role,photoUrl,phone,email,status,jobCategory"
    ).eq("teamId", team_id).eq("status", "ACTIVE").execute()
    return response.data or []


# ── Statistics ────────────────────────────────────────────────

@app.get("/api/statistics/summary")
async def get_statistics_summary(
    corporation: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    facilityType: Optional[str] = Query(None),
    orderType: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    amountRanges: Optional[str] = Query(None),
    progressRanges: Optional[str] = Query(None),
    groupShareRanges: Optional[str] = Query(None),
    startYear: Optional[str] = Query(None),
    endYear: Optional[str] = Query(None),
):
    """Aggregate KPI summary from all sites, with optional filters.
    Sources sites from the in-memory cache (no Supabase round-trip on hot path)."""
    sites = filter_sites_in_memory(
        get_all_sites_cached(),
        corporation=corporation,
        region=region,
        facilityType=facilityType,
        orderType=orderType,
        division=division,
        status=status,
        search=search,
        amountRanges=amountRanges,
        progressRanges=progressRanges,
        groupShareRanges=groupShareRanges,
        startYear=startYear,
        endYear=endYear,
    )

    # NOTE: previously this hard-filtered to status == "ACTIVE", which made all the
    # downstream chart aggregations empty when the user filtered to a non-ACTIVE
    # status (e.g. 착공전). Trust the user-supplied status filter instead.
    active = sites
    total = len(sites)

    # 공정률
    progress_rates = [s["progress_rate"] for s in active if s.get("progress_rate") is not None]
    avg_progress = sum(progress_rates) / len(progress_rates) if progress_rates else 0
    delayed = sum(1 for s in active if (s.get("delay_days") or 0) > 0)
    on_track = len(active) - delayed

    # 안전 (risk_grade)
    grade_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
    for s in active:
        g = s.get("risk_grade")
        if g in grade_counts:
            grade_counts[g] += 1

    # 인원
    total_headcount = sum(s.get("headcount") or 0 for s in sites)
    hc_by_division = defaultdict(int)
    for s in sites:
        div = s.get("division") or "기타"
        hc_by_division[div] += s.get("headcount") or 0

    # 예산
    total_contract = sum(s.get("contract_amount") or 0 for s in sites)
    total_our_share = sum(s.get("our_share_amount") or 0 for s in sites)
    total_group_share = sum(s.get("group_share_amount") or 0 for s in sites)
    exec_rates = [s["execution_rate"] for s in sites if s.get("execution_rate") is not None]
    avg_execution = sum(exec_rates) / len(exec_rates) if exec_rates else 0

    # 상태별
    status_counts = defaultdict(int)
    for s in sites:
        status_counts[s.get("status") or "UNKNOWN"] += 1

    # 분류별
    division_counts = defaultdict(int)
    for s in sites:
        division_counts[s.get("division") or "기타"] += 1

    return {
        "progress": {
            "average": round(avg_progress, 4),
            "on_track": on_track,
            "delayed": delayed,
            "total": len(active),
        },
        "safety": {
            "grade_a": grade_counts["A"],
            "grade_b": grade_counts["B"],
            "grade_c": grade_counts["C"],
            "grade_d": grade_counts["D"],
        },
        "headcount": {
            "total": total_headcount,
            "by_division": dict(hc_by_division),
        },
        "budget": {
            "total_contract": round(total_contract),
            "total_our_share": round(total_our_share),
            "total_group_share": round(total_group_share),
            "average_execution_rate": round(avg_execution, 4),
        },
        "by_status": _group_by_status(sites),
        "by_division": [{"division": k, "count": v} for k, v in division_counts.items()],
        "total_sites": total,

        # ── 법인별 성과 ──
        "by_corporation": _group_by_corporation(active),

        # ── 지역권별 분포 ──
        "by_region_group": _group_by_region(active),

        # ── 공정률 분포 ──
        "progress_distribution": _progress_distribution(active),

        # ── 주의 현장 ──
        "alert_sites": _alert_sites(active),

        # ── 부문별 상세 ──
        "by_division_detail": _group_by_division_detail(active),

        # ── 도급액 규모별 ──
        "by_amount_range": _amount_range_distribution(active),

        # ── 법인×부문 교차 ──
        "by_corporation_division": _group_by_corporation_division(active),

        # ── 시/도별 상세 ──
        "by_region": _group_by_region_name(sites),

        # ── 착공전 준공예정 년도별 ──
        "pre_start_by_completion_year": _pre_start_by_completion_year(sites),

        # ── 진행중 완공예정 년도별 ──
        "active_by_completion_year": _active_by_completion_year(sites),

        # ── 규모별 히트맵 (법인×규모) ──
        "amount_heatmap": _amount_heatmap(active),
    }


def _group_by_status(sites: list[dict]) -> list[dict]:
    groups = defaultdict(lambda: {"count": 0, "contract": 0.0, "headcount": 0})
    for s in sites:
        st = s.get("status") or "UNKNOWN"
        groups[st]["count"] += 1
        groups[st]["contract"] += s.get("contract_amount") or 0
        groups[st]["headcount"] += s.get("headcount") or 0
    return [
        {
            "status": k,
            "count": v["count"],
            "total_contract": round(v["contract"]),
            "total_headcount": v["headcount"],
        }
        for k, v in groups.items()
    ]


def _group_by_corporation(sites: list[dict]) -> list[dict]:
    groups = defaultdict(lambda: {"count": 0, "progress_sum": 0.0, "contract": 0.0, "headcount": 0})
    for s in sites:
        corp = s.get("corporation_name") or "기타"
        g = groups[corp]
        g["count"] += 1
        g["progress_sum"] += s.get("progress_rate") or 0
        g["contract"] += s.get("our_share_amount") or 0
        g["headcount"] += s.get("headcount") or 0

    return [
        {
            "corporation": k,
            "count": v["count"],
            "avg_progress": round(v["progress_sum"] / v["count"], 4) if v["count"] else 0,
            "total_contract": round(v["contract"]),
            "total_headcount": v["headcount"],
        }
        for k, v in groups.items()
    ]


def _group_by_corporation_division(sites: list[dict]) -> list[dict]:
    """Cross-tab: corporation x division -> count, contract, headcount.
    총공사비(contract_amount) 사용.
    """
    groups: dict[str, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {"count": 0, "contract": 0.0, "headcount": 0}))
    for s in sites:
        corp = s.get("corporation_name") or "기타"
        div = s.get("division") or "기타"
        g = groups[corp][div]
        g["count"] += 1
        g["contract"] += s.get("contract_amount") or 0
        g["headcount"] += s.get("headcount") or 0

    result = []
    for corp, divs in groups.items():
        for div, vals in divs.items():
            result.append({
                "corporation": corp,
                "division": div,
                "count": vals["count"],
                "total_contract": round(vals["contract"]),
                "total_headcount": vals["headcount"],
            })
    return result


def _group_by_region_name(sites: list[dict]) -> list[dict]:
    """Group by individual region_name (시/도)."""
    groups = defaultdict(lambda: {"count": 0, "contract": 0.0, "headcount": 0, "progress_sum": 0.0})
    for s in sites:
        rn = s.get("region_name") or "기타"
        groups[rn]["count"] += 1
        groups[rn]["contract"] += s.get("contract_amount") or 0
        groups[rn]["headcount"] += s.get("headcount") or 0
        groups[rn]["progress_sum"] += s.get("progress_rate") or 0
    return [
        {
            "region": k,
            "count": v["count"],
            "total_contract": round(v["contract"]),
            "total_headcount": v["headcount"],
            "avg_progress": round(v["progress_sum"] / v["count"], 4) if v["count"] else 0,
        }
        for k, v in groups.items()
    ]


def _date_to_ym(d: str) -> str:
    """'2026-03-01' -> '26.03'"""
    return f"{d[2:4]}.{d[5:7]}"


def _pre_start_by_completion_year(sites: list[dict]) -> list[dict]:
    """Group PRE_START sites by start_date month (착공 시작월)."""
    pre = [s for s in sites if s.get("status") == "PRE_START"]
    months: dict[str, int] = defaultdict(int)
    no_date = 0
    for s in pre:
        sd = s.get("start_date")
        if sd:
            months[_date_to_ym(sd)] += 1
        else:
            no_date += 1
    result = [{"year": k, "count": v} for k, v in sorted(months.items())]
    if no_date > 0:
        result.append({"year": "미정", "count": no_date})
    return result


def _active_by_completion_year(sites: list[dict]) -> list[dict]:
    """Group ACTIVE sites by end_date year (준공 예정년도)."""
    active = [s for s in sites if s.get("status") == "ACTIVE"]
    years: dict[str, int] = defaultdict(int)
    no_date = 0
    for s in active:
        ed = s.get("end_date")
        if ed:
            years[ed[:4]] += 1
        else:
            no_date += 1
    result = [{"year": k, "count": v} for k, v in sorted(years.items())]
    if no_date > 0:
        result.append({"year": "미정", "count": no_date})
    return result


def _group_by_region(sites: list[dict]) -> list[dict]:
    groups = defaultdict(lambda: {"count": 0, "contract": 0.0, "headcount": 0, "progress_sum": 0.0})
    for s in sites:
        rg = s.get("region_group") or "기타"
        groups[rg]["count"] += 1
        groups[rg]["contract"] += s.get("contract_amount") or 0
        groups[rg]["headcount"] += s.get("headcount") or 0
        groups[rg]["progress_sum"] += s.get("progress_rate") or 0
    return [
        {
            "region_group": k,
            "count": v["count"],
            "total_contract": round(v["contract"]),
            "total_headcount": v["headcount"],
            "avg_progress": round(v["progress_sum"] / v["count"], 4) if v["count"] else 0,
        }
        for k, v in groups.items()
    ]


def _progress_distribution(sites: list[dict]) -> list[dict]:
    bins = [
        {"label": "0-20%", "min": 0, "max": 0.2, "count": 0},
        {"label": "20-40%", "min": 0.2, "max": 0.4, "count": 0},
        {"label": "40-60%", "min": 0.4, "max": 0.6, "count": 0},
        {"label": "60-80%", "min": 0.6, "max": 0.8, "count": 0},
        {"label": "80-100%", "min": 0.8, "max": 1.01, "count": 0},
    ]
    for s in sites:
        pr = s.get("progress_rate") or 0
        for b in bins:
            if b["min"] <= pr < b["max"]:
                b["count"] += 1
                break
    return [{"label": b["label"], "count": b["count"]} for b in bins]


def _alert_sites(sites: list[dict]) -> list[dict]:
    alerts = []
    for s in sites:
        delay = s.get("delay_days") or 0
        grade = s.get("risk_grade")
        if delay > 0 or grade in ("C", "D"):
            alerts.append({
                "id": s["id"],
                "site_name": s.get("site_name"),
                "corporation_name": s.get("corporation_name"),
                "progress_rate": s.get("progress_rate"),
                "delay_days": delay,
                "risk_grade": grade,
                "contract_amount": s.get("contract_amount"),
            })
    alerts.sort(key=lambda x: -(x.get("delay_days") or 0))
    return alerts[:10]


def _group_by_division_detail(sites: list[dict]) -> list[dict]:
    groups = defaultdict(lambda: {"count": 0, "progress_sum": 0.0, "contract": 0.0, "headcount": 0})
    for s in sites:
        div = s.get("division") or "기타"
        g = groups[div]
        g["count"] += 1
        g["progress_sum"] += s.get("progress_rate") or 0
        g["contract"] += s.get("contract_amount") or 0
        g["headcount"] += s.get("headcount") or 0
    return [
        {
            "division": k,
            "count": v["count"],
            "avg_progress": round(v["progress_sum"] / v["count"], 4) if v["count"] else 0,
            "total_contract": round(v["contract"]),
            "total_headcount": v["headcount"],
        }
        for k, v in groups.items()
    ]


def _amount_range_distribution(sites: list[dict]) -> list[dict]:
    bins = [
        {"label": "≤ 500억",   "min": 0,    "max": 500,         "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "≤ 1,000억", "min": 500,  "max": 1000,        "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "≤ 2,000억", "min": 1000, "max": 2000,        "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "≤ 3,000억", "min": 2000, "max": 3000,        "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "> 3,000억", "min": 3000, "max": float("inf"), "count": 0, "contract": 0.0, "headcount": 0},
    ]
    for s in sites:
        amt = s.get("contract_amount")
        if not amt:
            continue
        for b in bins:
            if b["min"] <= amt < b["max"]:
                b["count"] += 1
                b["contract"] += amt
                b["headcount"] += s.get("headcount") or 0
                break
    return [{"label": b["label"], "count": b["count"], "total_contract": round(b["contract"]), "total_headcount": b["headcount"]} for b in bins]


AMOUNT_BINS = [
    {"label": "≤ 500억",   "min": 0,    "max": 500},
    {"label": "≤ 1,000억", "min": 500,  "max": 1000},
    {"label": "≤ 2,000억", "min": 1000, "max": 2000},
    {"label": "≤ 3,000억", "min": 2000, "max": 3000},
    {"label": "> 3,000억", "min": 3000, "max": float("inf")},
]


def _amount_heatmap(sites: list[dict]) -> dict:
    """Heatmap: corporation × amount range → count, for both contract_amount and our_share_amount."""

    def build_grid(amount_key: str) -> list[dict]:
        grid: dict[str, dict[str, int]] = defaultdict(lambda: {b["label"]: 0 for b in AMOUNT_BINS})
        for s in sites:
            corp = s.get("corporation_name") or "기타"
            amt = s.get(amount_key)
            if not amt:
                continue
            for b in AMOUNT_BINS:
                if b["min"] <= amt < b["max"]:
                    grid[corp][b["label"]] += 1
                    break
        rows = []
        for corp in ["남광토건", "극동건설", "금광기업"]:
            if corp in grid:
                rows.append({"corporation": corp, **grid[corp]})
        # append any others
        for corp, bins in grid.items():
            if corp not in {"남광토건", "극동건설", "금광기업"}:
                rows.append({"corporation": corp, **bins})
        return rows

    def build_division_grid(amount_key: str) -> list[dict]:
        grid: dict[str, dict[str, int]] = defaultdict(lambda: {b["label"]: 0 for b in AMOUNT_BINS})
        for s in sites:
            div = s.get("division") or "기타"
            amt = s.get(amount_key)
            if not amt:
                continue
            for b in AMOUNT_BINS:
                if b["min"] <= amt < b["max"]:
                    grid[div][b["label"]] += 1
                    break
        rows = []
        for div in ["건축", "토목"]:
            if div in grid:
                rows.append({"division": div, **grid[div]})
        return rows

    no_contract = sum(1 for s in sites if not s.get("contract_amount"))
    no_share = sum(1 for s in sites if not s.get("group_share_amount"))

    return {
        "by_contract": build_grid("contract_amount"),
        "by_our_share": build_grid("group_share_amount"),
        "by_contract_division": build_division_grid("contract_amount"),
        "by_our_share_division": build_division_grid("group_share_amount"),
        "labels": [b["label"] for b in AMOUNT_BINS],
        "no_contract_count": no_contract,
        "no_share_count": no_share,
    }


# ─────────────────────────────────────────────────────────────
#  Site CRUD + Lookup endpoints (관리자 편집/추가 기능)
# ─────────────────────────────────────────────────────────────

EDITABLE_SITE_COLUMNS = {
    "name", "corporation_id", "division", "category",
    "region_code", "facility_type_code", "order_type", "client_org_id",
    "contract_amount", "start_date", "end_date",
    "office_address", "site_address", "latitude", "longitude",
    "status",
}

REQUIRED_SITE_COLUMNS = {"name", "corporation_id", "division", "category"}


def _sync_geocode(address: str) -> tuple[float, float, str, str | None] | None:
    """동기 Kakao 지오코딩. 관대한 매칭을 위해 여러 단계로 fallback.
    반환: (위도, 경도, 매칭된 정식 주소/장소명, region_1depth_name) — 마지막 값은
    Kakao가 알려준 시/도(예: '강원', '경기'). 호출자가 region_code 자동 매핑에 사용.
       1) 주소 검색 API — 도로명/지번 정형 주소
       2) 키워드 검색 API — 장소명/랜드마크/일반 키워드
       3) 주소 단어 수를 줄여가며 재시도
    """
    if not KAKAO_REST_KEY or not address:
        return None
    address = address.strip()
    if not address:
        return None
    import requests
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_KEY}"}

    def _try_address(q: str) -> tuple[float, float, str, str | None] | None:
        try:
            res = requests.get(
                "https://dapi.kakao.com/v2/local/search/address.json",
                params={"query": q}, headers=headers, timeout=10,
            )
            docs = res.json().get("documents", [])
            if docs:
                d = docs[0]
                ra = d.get("road_address") or {}
                ad = d.get("address") or {}
                name = ra.get("address_name") or ad.get("address_name") or d.get("address_name") or q
                region = ra.get("region_1depth_name") or ad.get("region_1depth_name")
                return (float(d["y"]), float(d["x"]), name, region)
        except Exception:
            pass
        return None

    def _try_keyword(q: str) -> tuple[float, float, str, str | None] | None:
        try:
            res = requests.get(
                "https://dapi.kakao.com/v2/local/search/keyword.json",
                params={"query": q, "size": 1}, headers=headers, timeout=10,
            )
            docs = res.json().get("documents", [])
            if docs:
                d = docs[0]
                name = d.get("place_name") or d.get("road_address_name") or d.get("address_name") or q
                # 키워드 응답에는 region_1depth_name가 없으므로 address_name 첫 단어로 추론
                addr = d.get("address_name") or d.get("road_address_name") or ""
                region = addr.split()[0] if addr else None
                return (float(d["y"]), float(d["x"]), name, region)
        except Exception:
            pass
        return None

    r = _try_address(address)
    if r:
        return r
    r = _try_keyword(address)
    if r:
        return r
    parts = address.split()
    while len(parts) > 1:
        parts.pop()
        q = " ".join(parts)
        r = _try_address(q) or _try_keyword(q)
        if r:
            return r
    return None


def _resolve_region_code(region_name: str | None) -> str | None:
    """Kakao region_1depth_name(예: '강원', '경기') → region_code 테이블의 code.
    이름 매칭 (앞 2글자 부분 일치 허용 — '강원' vs '강원도', '서울' vs '서울특별시')."""
    if not region_name:
        return None
    n = region_name.strip()
    if not n:
        return None
    try:
        r = supabase.schema("pmis").from_("region_code").select("code,name").execute()
    except Exception:
        return None
    rows = r.data or []
    # 정확 일치 우선
    for row in rows:
        if (row.get("name") or "").strip() == n:
            return row.get("code")
    # 부분 일치 (양방향)
    for row in rows:
        rn = (row.get("name") or "").strip()
        if rn.startswith(n) or n.startswith(rn):
            return row.get("code")
    return None


@app.get("/api/lookup/corporations")
def lookup_corporations():
    r = supabase.schema("pmis").from_("corporation").select("id,name,code").order("id").execute()
    return r.data or []


@app.get("/api/lookup/regions")
def lookup_regions():
    r = supabase.schema("pmis").from_("region_code").select("code,name,region_group").order("code").execute()
    return r.data or []


@app.get("/api/lookup/facility-types")
def lookup_facility_types():
    r = supabase.schema("pmis").from_("facility_type").select("code,name,division").order("name").execute()
    rows = r.data or []
    # facility_type 테이블에 발주유형(BTL/CMR/민간 등)이 섞여 들어와 있어 제거
    return [row for row in rows if (row.get("name") or "") not in ORDER_TYPES]


@app.get("/api/lookup/order-types")
def lookup_order_types():
    """발주유형은 lookup 테이블이 없고 ORDER_TYPES 상수로 관리되므로 그대로 노출."""
    return sorted(ORDER_TYPES)


@app.get("/api/lookup/clients")
def lookup_clients():
    r = supabase.schema("pmis").from_("client_org").select("id,name,org_type").order("name").execute()
    return r.data or []


@app.get("/api/lookup/partners")
def lookup_partners():
    """JV 파트너(하부업체) 목록 — 자동완성용."""
    r = supabase.schema("pmis").from_("partner_company").select("id,name,is_group_member").order("name").execute()
    return r.data or []


def _resolve_partner_name(name: str) -> int | None:
    name = (name or "").strip()
    if not name:
        return None
    existing = supabase.schema("pmis").from_("partner_company").select("id,name").execute()
    for row in existing.data or []:
        if (row.get("name") or "").strip().lower() == name.lower():
            return row.get("id")
    ins = supabase.schema("pmis").from_("partner_company").insert({"name": name}).execute()
    row = (ins.data or [None])[0]
    return row.get("id") if row else None


def _sync_jv_participation(site_id: int, corporation_id: int | None,
                            our_share_ratio: float | None,
                            jv_partners: list[dict] | None) -> None:
    """site_id의 jv_participation 행을 자사 + 하부업체로 재구성한다.
    - our_share_ratio: 자사 지분 % (0~100)
    - jv_partners: [{name, share_pct}] — 자사 외 파트너
    """
    if our_share_ratio is None and not jv_partners:
        return  # 변경 없음

    # 기존 행 모두 삭제 후 재삽입
    supabase.schema("pmis").from_("jv_participation").delete().eq("site_id", site_id).execute()

    rows: list[dict] = []
    order = 0

    # 자사 행: corporation_id → corporation.name → partner_company 매칭/생성
    if corporation_id and our_share_ratio is not None:
        corp = supabase.schema("pmis").from_("corporation").select("name").eq("id", corporation_id).limit(1).execute()
        corp_name = (corp.data or [{}])[0].get("name") if corp.data else None
        if corp_name:
            pid = _resolve_partner_name(corp_name)
            if pid:
                rows.append({
                    "site_id": site_id,
                    "partner_id": pid,
                    "share_pct": float(our_share_ratio),
                    "is_lead": True,
                    "contract_type": "MAIN",
                    "display_order": order,
                })
                order += 1

    for p in jv_partners or []:
        name = (p.get("name") or "").strip()
        share = p.get("share_pct")
        if not name or share in (None, ""):
            continue
        pid = _resolve_partner_name(name)
        if not pid:
            continue
        rows.append({
            "site_id": site_id,
            "partner_id": pid,
            "share_pct": float(share),
            "is_lead": False,
            "contract_type": "MAIN",
            "display_order": order,
        })
        order += 1

    if rows:
        supabase.schema("pmis").from_("jv_participation").insert(rows).execute()


def _resolve_client_name(name: str) -> int | None:
    """발주처 이름 → client_org.id. 없으면 새로 INSERT 후 id 반환."""
    name = (name or "").strip()
    if not name:
        return None
    existing = supabase.schema("pmis").from_("client_org").select("id,name").execute()
    for row in existing.data or []:
        if (row.get("name") or "").strip().lower() == name.lower():
            return row.get("id")
    ins = supabase.schema("pmis").from_("client_org").insert({"name": name}).execute()
    row = (ins.data or [None])[0]
    return row.get("id") if row else None


def _clean_site_payload(payload: dict) -> dict:
    """클라이언트 payload를 DB 컬럼에 맞게 정리.
    - 허용 컬럼만 남김
    - 빈 문자열 → None
    - 주소 있는데 좌표 없으면 지오코딩
    - client_name이 오면 client_org를 lookup/insert 후 client_org_id로 변환"""
    clean = {}
    if "client_name" in payload and "client_org_id" not in payload:
        cid = _resolve_client_name(payload.get("client_name") or "")
        clean["client_org_id"] = cid
    for k, v in payload.items():
        if k == "client_name":
            continue
        if k not in EDITABLE_SITE_COLUMNS:
            continue
        if v == "":
            v = None
        clean[k] = v

    # 지오코딩: site_address(지도 매칭용) 우선 → 없으면 office_address(표시용) 시도
    # 매칭 성공 시 site_address를 폴백에서 실제 매칭된 쿼리로 갱신해 box 2를 자동 채움
    candidates: list[str] = []
    if clean.get("site_address"):
        candidates.append(clean["site_address"])
    if clean.get("office_address") and clean.get("office_address") not in candidates:
        candidates.append(clean["office_address"])
    if candidates and (clean.get("latitude") is None or clean.get("longitude") is None):
        for addr in candidates:
            result = _sync_geocode(addr)
            if result:
                clean["latitude"] = result[0]
                clean["longitude"] = result[1]
                clean["site_address"] = result[2]
                # region_code가 비어 있으면 지오코딩 결과로 자동 채움
                if not clean.get("region_code"):
                    rc = _resolve_region_code(result[3])
                    if rc:
                        clean["region_code"] = rc
                break
    return clean


@app.post("/api/geocode/preview")
def geocode_preview(payload: dict = Body(...), _admin: dict = Depends(require_admin)):
    """저장 없이 주소 → 좌표 미리보기. 폼의 '좌표 매칭하기' 버튼용."""
    address = (payload.get("address") or "").strip()
    if not address:
        return {"ok": False, "reason": "주소가 비어 있습니다"}
    result = _sync_geocode(address)
    if not result:
        return {"ok": False, "reason": "Kakao 주소 검색에서 매칭 결과가 없습니다"}
    region_code = _resolve_region_code(result[3])
    return {
        "ok": True,
        "latitude": result[0],
        "longitude": result[1],
        "matched_address": result[2],
        "region_name": result[3],
        "region_code": region_code,
    }


@app.get("/api/sites/{site_id}/raw")
def get_site_raw(site_id: int):
    """편집 폼용 — project_site의 raw 컬럼 (특히 site_address) 반환."""
    r = supabase.schema("pmis").from_("project_site").select(
        "id,office_address,site_address,latitude,longitude"
    ).eq("id", site_id).limit(1).execute()
    row = (r.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail=f"site id {site_id} 없음")
    return row


def _invalidate_sites_cache() -> None:
    _SITES_CACHE["data"] = None
    _SITES_CACHE["ts"] = 0.0


def _persist_site_coords(site_id: int, lat: float | None, lon: float | None) -> None:
    """site_coordinates.json에 좌표 즉시 반영. attach_coords()가 이 파일을 우선
    사용하므로 DB만 갱신해서는 대시보드에 좌표가 안 보임."""
    if site_id is None:
        return
    coords = load_coords()
    key = str(site_id)
    if lat is not None and lon is not None:
        coords[key] = {"latitude": float(lat), "longitude": float(lon)}
    else:
        coords.pop(key, None)
    save_coords(coords)


@app.post("/api/sites")
def create_site(payload: dict = Body(...), _admin: dict = Depends(require_admin)):
    clean = _clean_site_payload(payload)

    # If admin provides a status on create, pin it — otherwise auto_status
    # decides based on dates.
    if clean.get("status"):
        clean["status_manual"] = True

    missing = [k for k in REQUIRED_SITE_COLUMNS if clean.get(k) in (None, "")]
    if missing:
        raise HTTPException(status_code=400, detail=f"필수 필드 누락: {', '.join(missing)}")

    try:
        res = supabase.schema("pmis").from_("project_site").insert(clean).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DB 오류: {e}")

    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(status_code=500, detail="INSERT 결과가 비어 있음")

    _sync_jv_participation(
        site_id=row.get("id"),
        corporation_id=clean.get("corporation_id"),
        our_share_ratio=payload.get("our_share_ratio"),
        jv_partners=payload.get("jv_partners"),
    )
    _persist_site_coords(row.get("id"), clean.get("latitude"), clean.get("longitude"))
    try:
        _seed_default_departments(row.get("id"))
    except Exception as e:
        print(f"[WARN] default department seed failed for site {row.get('id')}: {e}")
    _invalidate_sites_cache()
    return {"ok": True, "id": row.get("id"), "site": row}


@app.put("/api/sites/{site_id}")
def update_site(site_id: int, payload: dict = Body(...), _admin: dict = Depends(require_admin)):
    clean = _clean_site_payload(payload)

    # Admin changing status pins it — subsequent date-based auto_status
    # passes will skip this row.
    if "status" in clean:
        clean["status_manual"] = True

    has_jv_change = "our_share_ratio" in payload or "jv_partners" in payload
    if not clean and not has_jv_change:
        raise HTTPException(status_code=400, detail="수정할 필드가 없음")

    # 필수 컬럼이 payload에 포함되어 있으면 빈 값 방지
    for k in REQUIRED_SITE_COLUMNS:
        if k in clean and clean[k] in (None, ""):
            raise HTTPException(status_code=400, detail=f"{k}는 비울 수 없음")

    row = None
    if clean:
        try:
            res = supabase.schema("pmis").from_("project_site").update(clean).eq("id", site_id).execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"DB 오류: {e}")
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail=f"site id {site_id} 없음")

    if has_jv_change:
        # corporation_id가 payload에 없으면 DB에서 조회
        corp_id = clean.get("corporation_id")
        if corp_id is None:
            r = supabase.schema("pmis").from_("project_site").select("corporation_id").eq("id", site_id).limit(1).execute()
            corp_id = (r.data or [{}])[0].get("corporation_id") if r.data else None
        _sync_jv_participation(
            site_id=site_id,
            corporation_id=corp_id,
            our_share_ratio=payload.get("our_share_ratio"),
            jv_partners=payload.get("jv_partners"),
        )

    if "latitude" in clean or "longitude" in clean:
        _persist_site_coords(site_id, clean.get("latitude"), clean.get("longitude"))

    _invalidate_sites_cache()
    return {"ok": True, "id": site_id, "site": row}


@app.delete("/api/sites/{site_id}")
def delete_site(site_id: int, _admin: dict = Depends(require_admin)):
    try:
        res = supabase.schema("pmis").from_("project_site").delete().eq("id", site_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DB 오류: {e}")
    return {"ok": True, "id": site_id, "deleted": len(res.data or [])}

