from fastapi import FastAPI, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(title="SiteInformation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.0.6:3000", "https://site-info-umber.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    our_amount = round(contract * our_ratio, 1)

    # 그룹 3사 합산 지분 (JV 없으면 소유 법인이 100%)
    if shares:
        group_ratio = sum(r for c, r in shares.items() if c in GROUP_COMPANIES)
    else:
        group_ratio = 1.0 if corp in GROUP_COMPANIES else 0.0
    group_amount = round(contract * group_ratio, 1)

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
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )


@app.post("/api/geocode")
async def geocode_all_sites():
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
async def upload_site_image(file: UploadFile = File(...), site_id: str = Form(...)):
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
async def upload_org_photo(file: UploadFile = File(...), member_id: str = Form(...)):
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


@app.get("/api/sites/{site_id}/departments")
async def get_site_departments(site_id: int):
    """Get departments for a site."""
    response = supabase.schema("pmis").from_("site_department") \
        .select("*") \
        .eq("site_id", site_id) \
        .order("sort_order") \
        .execute()
    return response.data or []


@app.post("/api/sites/{site_id}/org-members")
async def create_org_member(site_id: int, member: dict):
    """Add a new org member."""
    member["site_id"] = site_id
    response = supabase.schema("pmis").from_("site_org_member") \
        .insert(member) \
        .execute()
    return response.data


@app.put("/api/org-members/{member_id}")
async def update_org_member(member_id: int, updates: dict):
    """Update an org member."""
    updates.pop("id", None)
    response = supabase.schema("pmis").from_("site_org_member") \
        .update(updates) \
        .eq("id", member_id) \
        .execute()
    return response.data


@app.delete("/api/org-members/{member_id}")
async def delete_org_member(member_id: int):
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
async def update_org_member_profile(member_id: int, body: dict):
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
            "total_contract": round(total_contract, 1),
            "total_our_share": round(total_our_share, 1),
            "total_group_share": round(total_group_share, 1),
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
            "total_contract": round(v["contract"], 1),
            "total_headcount": v["headcount"],
        }
        for k, v in groups.items()
    ]


def _group_by_corporation(sites: list[dict]) -> list[dict]:
    groups = defaultdict(lambda: {"count": 0, "progress_sum": 0.0, "contract": 0.0, "headcount": 0})
    for s in sites:
        owner_corp = s.get("corporation_name") or "기타"
        contract = s.get("contract_amount") or 0
        shares = _parse_jv_shares(s.get("jv_summary"))

        g = groups[owner_corp]
        g["count"] += 1
        g["progress_sum"] += s.get("progress_rate") or 0
        g["headcount"] += s.get("headcount") or 0

        if shares:
            for comp, ratio in shares.items():
                if comp in GROUP_COMPANIES:
                    groups[comp]["contract"] += round(contract * ratio, 1)
        else:
            g["contract"] += contract

    return [
        {
            "corporation": k,
            "count": v["count"],
            "avg_progress": round(v["progress_sum"] / v["count"], 4) if v["count"] else 0,
            "total_contract": round(v["contract"], 1),
            "total_headcount": v["headcount"],
        }
        for k, v in groups.items()
    ]


def _group_by_corporation_division(sites: list[dict]) -> list[dict]:
    """Cross-tab: corporation x division -> count, contract, headcount.
    JV 현장의 경우 그룹사 지분을 각 법인 행에 분배한다.
    예: 극동건설 현장에 남광토건이 JV 참여 → 남광 지분액은 남광 행에 포함.
    """
    groups: dict[str, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {"count": 0, "contract": 0.0, "headcount": 0}))
    for s in sites:
        owner_corp = s.get("corporation_name") or "기타"
        div = s.get("division") or "기타"
        contract = s.get("contract_amount") or 0
        shares = _parse_jv_shares(s.get("jv_summary"))

        # 현장 수와 인원은 소유 법인에만 카운트
        groups[owner_corp][div]["count"] += 1
        groups[owner_corp][div]["headcount"] += s.get("headcount") or 0

        if shares:
            # JV: 그룹사별 지분액을 각 법인 행에 분배
            for comp, ratio in shares.items():
                if comp in GROUP_COMPANIES:
                    groups[comp][div]["contract"] += round(contract * ratio, 1)
        else:
            # 단독: 100% 소유 법인에 귀속
            groups[owner_corp][div]["contract"] += contract

    result = []
    for corp, divs in groups.items():
        for div, vals in divs.items():
            result.append({
                "corporation": corp,
                "division": div,
                "count": vals["count"],
                "total_contract": round(vals["contract"], 1),
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
            "total_contract": round(v["contract"], 1),
            "total_headcount": v["headcount"],
            "avg_progress": round(v["progress_sum"] / v["count"], 4) if v["count"] else 0,
        }
        for k, v in groups.items()
    ]


def _pre_start_by_completion_year(sites: list[dict]) -> list[dict]:
    """Group PRE_START sites by start_date year (착공 시작년도)."""
    pre = [s for s in sites if s.get("status") == "PRE_START"]
    years: dict[str, int] = defaultdict(int)
    no_date = 0
    for s in pre:
        sd = s.get("start_date")
        if sd:
            years[sd[:4]] += 1
        else:
            no_date += 1
    result = [{"year": k, "count": v} for k, v in sorted(years.items())]
    if no_date > 0:
        result.append({"year": "미정", "count": no_date})
    return result


def _active_by_completion_year(sites: list[dict]) -> list[dict]:
    """Group ACTIVE sites by end_date year."""
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
            "total_contract": round(v["contract"], 1),
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
            "total_contract": round(v["contract"], 1),
            "total_headcount": v["headcount"],
        }
        for k, v in groups.items()
    ]


def _amount_range_distribution(sites: list[dict]) -> list[dict]:
    bins = [
        {"label": "≤ 100억",   "min": 0,    "max": 100,         "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "≤ 500억",   "min": 100,  "max": 500,         "count": 0, "contract": 0.0, "headcount": 0},
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
    return [{"label": b["label"], "count": b["count"], "total_contract": round(b["contract"], 1), "total_headcount": b["headcount"]} for b in bins]


AMOUNT_BINS = [
    {"label": "≤ 100억",   "min": 0,    "max": 100},
    {"label": "≤ 500억",   "min": 100,  "max": 500},
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

    return {
        "by_contract": build_grid("contract_amount"),
        "by_our_share": build_grid("group_share_amount"),
        "by_contract_division": build_division_grid("contract_amount"),
        "by_our_share_division": build_division_grid("group_share_amount"),
        "labels": [b["label"] for b in AMOUNT_BINS],
    }


