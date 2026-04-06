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

        # Attach coordinates
        results = clean_facility_type(results)
        results = attach_coords(results)

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


# ── Statistics ────────────────────────────────────────────────

@app.get("/api/statistics/summary")
async def get_statistics_summary():
    """Aggregate KPI summary from all sites."""
    response = supabase.schema("pmis").from_("v_site_dashboard").select("*").execute()
    sites = response.data or []

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
            "average_execution_rate": round(avg_execution, 4),
        },
        "by_status": [{"status": k, "count": v} for k, v in status_counts.items()],
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
    }


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


def _group_by_region(sites: list[dict]) -> list[dict]:
    groups = defaultdict(lambda: {"count": 0, "contract": 0.0})
    for s in sites:
        rg = s.get("region_group") or "기타"
        groups[rg]["count"] += 1
        groups[rg]["contract"] += s.get("contract_amount") or 0
    return [
        {"region_group": k, "count": v["count"], "total_contract": round(v["contract"], 1)}
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
        {"label": "100억 미만", "min": 0, "max": 100, "count": 0},
        {"label": "100-500억", "min": 100, "max": 500, "count": 0},
        {"label": "500-1,000억", "min": 500, "max": 1000, "count": 0},
        {"label": "1,000-2,000억", "min": 1000, "max": 2000, "count": 0},
        {"label": "2,000억 이상", "min": 2000, "max": float("inf"), "count": 0},
    ]
    for s in sites:
        amt = s.get("contract_amount") or 0
        for b in bins:
            if b["min"] <= amt < b["max"]:
                b["count"] += 1
                break
    return [{"label": b["label"], "count": b["count"]} for b in bins]


def _sigmoid(t: float, k: float = 8.0) -> float:
    """Sigmoid curve from 0 to 1 over t in [0, 1]."""
    return 1.0 / (1.0 + math.exp(-k * (t - 0.5)))


def _normalize_sigmoid(t: float, k: float = 8.0) -> float:
    """Normalized sigmoid so f(0)=0, f(1)=1."""
    s0 = _sigmoid(0, k)
    s1 = _sigmoid(1, k)
    return (_sigmoid(t, k) - s0) / (s1 - s0)


@app.get("/api/statistics/s-curve")
async def get_statistics_s_curve():
    """Compute synthetic S-Curve from site start/end dates and progress."""
    response = supabase.schema("pmis").from_("v_site_dashboard") \
        .select("start_date, end_date, progress_rate, contract_amount, status") \
        .eq("status", "ACTIVE") \
        .execute()
    sites = response.data or []

    today = date.today()
    plan_monthly = defaultdict(float)
    actual_monthly = defaultdict(float)
    weight_monthly = defaultdict(float)

    for s in sites:
        if not s.get("start_date") or not s.get("end_date"):
            continue
        start = date.fromisoformat(s["start_date"])
        end = date.fromisoformat(s["end_date"])
        progress = s.get("progress_rate") or 0
        weight = s.get("contract_amount") or 1
        total_days = (end - start).days
        if total_days <= 0:
            continue

        # Generate monthly points from start to end
        current = date(start.year, start.month, 1)
        end_month = date(end.year, end.month, 1)
        while current <= end_month:
            month_key = current.strftime("%Y-%m")
            days_elapsed = (current - start).days
            t = max(0, min(1, days_elapsed / total_days))

            # Plan: sigmoid interpolation
            plan_monthly[month_key] += _normalize_sigmoid(t) * weight
            weight_monthly[month_key] += weight

            # Actual: only up to today
            if current <= today:
                days_to_today = (today - start).days
                t_today = max(0, min(1, days_to_today / total_days))
                t_actual = max(0, min(1, days_elapsed / max(1, days_to_today)))
                actual_monthly[month_key] += _normalize_sigmoid(t_actual) * progress * weight

            current = date(current.year + (current.month // 12), (current.month % 12) + 1, 1)

    # Aggregate
    all_months = sorted(set(list(plan_monthly.keys()) + list(actual_monthly.keys())))
    months = []
    plan_values = []
    actual_values = []

    for m in all_months:
        w = weight_monthly.get(m, 1)
        months.append(m)
        plan_values.append(round((plan_monthly.get(m, 0) / w) * 100, 2) if w else 0)
        actual_values.append(round((actual_monthly.get(m, 0) / w) * 100, 2) if w else 0)

    return {
        "months": months,
        "plan": plan_values,
        "actual": actual_values,
    }
