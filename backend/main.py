from fastapi import FastAPI, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
import os
import json
import math
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

    # 그룹 3사 합산 지분
    group_ratio = sum(r for c, r in shares.items() if c in GROUP_COMPANIES)
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
):
    try:
        query = supabase.schema("pmis").from_("v_site_dashboard").select("*")

        if corporation and corporation != "all":
            query = query.eq("corporation_name", corporation)
        if region and region != "all":
            query = query.eq("region_name", region)
        if facilityType and facilityType != "all":
            query = query.eq("facility_type_name", facilityType)
        if orderType and orderType != "all":
            query = query.eq("order_type", orderType)
        if division and division != "all":
            query = query.eq("division", division)
        if status and status != "all":
            query = query.eq("status", status)
        if search:
            query = query.ilike("site_name", f"%{search}%")

        response = query.order("progress_rate", desc=False).execute()
        results = response.data or []

        # Deduplicate by site_name + corporation_code
        seen = set()
        deduped = []
        for site in results:
            key = f"{site.get('site_name')}::{site.get('corporation_code')}"
            if key not in seen:
                seen.add(key)
                deduped.append(site)
        results = deduped

        # Amount range filter
        if amountRanges:
            ranges = parse_ranges(amountRanges)
            results = [
                s for s in results
                if any(r["min"] <= (s.get("contract_amount") or 0) < r["max"] for r in ranges)
            ]

        # Progress range filter
        if progressRanges:
            ranges = parse_ranges(progressRanges)
            results = [
                s for s in results
                if any(r["min"] <= (s.get("progress_rate") or 0) * 100 < r["max"] for r in ranges)
            ]

        # Attach coordinates & share amounts
        results = clean_facility_type(results)
        results = attach_coords(results)
        results = attach_share_amounts(results)

        return results
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


@app.get("/api/filter-options")
async def get_filter_options():
    corps = supabase.schema("pmis").from_("corporation").select("name").order("name").execute()
    regions = supabase.schema("pmis").from_("region_code").select("name").order("name").execute()
    types = supabase.schema("pmis").from_("facility_type").select("name").order("name").execute()

    # order_type은 별도 테이블 없이 뷰에서 distinct 추출
    all_sites = supabase.schema("pmis").from_("v_site_dashboard").select("order_type").execute()
    order_type_set = sorted(set(
        r["order_type"] for r in (all_sites.data or []) if r.get("order_type")
    ))

    # 발주유형(BTL, CMR, 민간, 민참, 종심제)을 시설유형에서 제외
    facility_types = [r["name"] for r in (types.data or []) if r["name"] not in order_type_set]

    return {
        "corporations": [r["name"] for r in (corps.data or [])],
        "regions": [r["name"] for r in (regions.data or [])],
        "facilityTypes": facility_types,
        "orderTypes": order_type_set,
        "divisions": ["토목", "건축"],
        "statuses": ["ACTIVE", "COMPLETED", "SUSPENDED", "PRE_START"],
    }


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
):
    """Aggregate KPI summary from all sites, with optional filters."""
    query = supabase.schema("pmis").from_("v_site_dashboard").select("*")
    if corporation and corporation != "all":
        query = query.eq("corporation_name", corporation)
    if region and region != "all":
        query = query.eq("region_name", region)
    if facilityType and facilityType != "all":
        query = query.eq("facility_type_name", facilityType)
    if orderType and orderType != "all":
        query = query.eq("order_type", orderType)
    if division and division != "all":
        query = query.eq("division", division)
    if status and status != "all":
        query = query.eq("status", status)
    if search:
        query = query.ilike("site_name", f"%{search}%")

    response = query.execute()
    sites = attach_share_amounts(response.data or [])

    # Amount range filter
    if amountRanges:
        ranges = parse_ranges(amountRanges)
        sites = [s for s in sites if any(r["min"] <= (s.get("contract_amount") or 0) < r["max"] for r in ranges)]

    # Progress range filter
    if progressRanges:
        ranges = parse_ranges(progressRanges)
        sites = [s for s in sites if any(r["min"] <= (s.get("progress_rate") or 0) * 100 < r["max"] for r in ranges)]

    active = [s for s in sites if s.get("status") == "ACTIVE"]
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
    total_headcount = sum(s.get("headcount") or 0 for s in active)
    hc_by_division = defaultdict(int)
    for s in active:
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
        corp = s.get("corporation_name") or "기타"
        g = groups[corp]
        g["count"] += 1
        g["progress_sum"] += s.get("progress_rate") or 0
        g["contract"] += s.get("contract_amount") or 0
        g["headcount"] += s.get("headcount") or 0
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
    """Cross-tab: corporation x division -> count, contract, headcount."""
    groups: dict[str, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {"count": 0, "contract": 0.0, "headcount": 0}))
    for s in sites:
        corp = s.get("corporation_name") or "기타"
        div = s.get("division") or "기타"
        g = groups[corp][div]
        g["count"] += 1
        g["contract"] += s.get("our_share_amount") or 0
        g["headcount"] += s.get("headcount") or 0
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
    """Group PRE_START sites by end_date year."""
    pre = [s for s in sites if s.get("status") == "PRE_START"]
    years: dict[str, int] = defaultdict(int)
    no_date = 0
    for s in pre:
        ed = s.get("end_date")
        if ed:
            years[ed[:4]] += 1
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
        {"label": "100억 미만", "min": 0, "max": 100, "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "100-500억", "min": 100, "max": 500, "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "500-1,000억", "min": 500, "max": 1000, "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "1,000-2,000억", "min": 1000, "max": 2000, "count": 0, "contract": 0.0, "headcount": 0},
        {"label": "2,000억 이상", "min": 2000, "max": float("inf"), "count": 0, "contract": 0.0, "headcount": 0},
    ]
    for s in sites:
        amt = s.get("contract_amount") or 0
        for b in bins:
            if b["min"] <= amt < b["max"]:
                b["count"] += 1
                b["contract"] += amt
                b["headcount"] += s.get("headcount") or 0
                break
    return [{"label": b["label"], "count": b["count"], "total_contract": round(b["contract"], 1), "total_headcount": b["headcount"]} for b in bins]


AMOUNT_BINS = [
    {"label": "100억 미만", "min": 0, "max": 100},
    {"label": "100~500억", "min": 100, "max": 500},
    {"label": "500~1,000억", "min": 500, "max": 1000},
    {"label": "1,000~2,000억", "min": 1000, "max": 2000},
    {"label": "2,000억 이상", "min": 2000, "max": float("inf")},
]


def _amount_heatmap(sites: list[dict]) -> dict:
    """Heatmap: corporation × amount range → count, for both contract_amount and our_share_amount."""

    def build_grid(amount_key: str) -> list[dict]:
        grid: dict[str, dict[str, int]] = defaultdict(lambda: {b["label"]: 0 for b in AMOUNT_BINS})
        for s in sites:
            corp = s.get("corporation_name") or "기타"
            amt = s.get(amount_key) or 0
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
            amt = s.get(amount_key) or 0
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
        "by_our_share": build_grid("our_share_amount"),
        "by_contract_division": build_division_grid("contract_amount"),
        "by_our_share_division": build_division_grid("our_share_amount"),
        "labels": [b["label"] for b in AMOUNT_BINS],
    }


