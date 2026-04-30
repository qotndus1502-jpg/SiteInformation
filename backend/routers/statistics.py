"""KPI dashboard / statistics endpoint.

Single fat endpoint — `/api/statistics/summary` — that returns every chart's
aggregated rows in one shot. The frontend reads sites from the same in-memory
cache (via /api/sites) and lays out the charts; here we just compute the
totals.

All of the `_group_by_*` helpers are private to this module — they're not
useful elsewhere and keeping them here makes the route's contract obvious.
"""
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Query

from services.sites_cache import (
    _date_to_ym,
    filter_sites_in_memory,
    get_all_sites_cached,
)

router = APIRouter()


@router.get("/api/statistics/summary")
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
    managingEntity: Optional[str] = Query(None),
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
        managingEntity=managingEntity,
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
        "by_corporation": _group_by_corporation(active),
        "by_region_group": _group_by_region(active),
        "progress_distribution": _progress_distribution(active),
        "alert_sites": _alert_sites(active),
        "by_division_detail": _group_by_division_detail(active),
        "by_amount_range": _amount_range_distribution(active),
        "by_corporation_division": _group_by_corporation_division(active),
        "by_region": _group_by_region_name(sites),
        "pre_start_by_completion_year": _pre_start_by_completion_year(sites),
        "active_by_completion_year": _active_by_completion_year(sites),
        "amount_heatmap": _amount_heatmap(active),
    }


# ── Aggregation helpers (route-private) ─────────────────────

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


_AMOUNT_BINS = [
    {"label": "≤ 500억",   "min": 0,    "max": 500},
    {"label": "≤ 1,000억", "min": 500,  "max": 1000},
    {"label": "≤ 2,000억", "min": 1000, "max": 2000},
    {"label": "≤ 3,000억", "min": 2000, "max": 3000},
    {"label": "> 3,000억", "min": 3000, "max": float("inf")},
]


def _amount_heatmap(sites: list[dict]) -> dict:
    """Heatmap: corporation × amount range → count, for both contract_amount and our_share_amount."""

    def build_grid(amount_key: str) -> list[dict]:
        grid: dict[str, dict[str, int]] = defaultdict(lambda: {b["label"]: 0 for b in _AMOUNT_BINS})
        for s in sites:
            corp = s.get("corporation_name") or "기타"
            amt = s.get(amount_key)
            if not amt:
                continue
            for b in _AMOUNT_BINS:
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
        grid: dict[str, dict[str, int]] = defaultdict(lambda: {b["label"]: 0 for b in _AMOUNT_BINS})
        for s in sites:
            div = s.get("division") or "기타"
            amt = s.get(amount_key)
            if not amt:
                continue
            for b in _AMOUNT_BINS:
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
        "labels": [b["label"] for b in _AMOUNT_BINS],
        "no_contract_count": no_contract,
        "no_share_count": no_share,
    }
