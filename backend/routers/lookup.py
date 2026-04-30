"""Lookup endpoints — dropdown/auto-complete sources for the admin UI.

These return small reference lists (corporations, regions, facility types,
clients, partners). All public reads, no auth.
"""
from fastapi import APIRouter

from supabase_client import supabase
from constants import ORDER_TYPES

router = APIRouter()


@router.get("/api/lookup/corporations")
def lookup_corporations():
    r = supabase.schema("pmis").from_("corporation").select("id,name,code").order("id").execute()
    return r.data or []


@router.get("/api/lookup/regions")
def lookup_regions():
    r = supabase.schema("pmis").from_("region_code").select("code,name,region_group").order("code").execute()
    return r.data or []


@router.get("/api/lookup/facility-types")
def lookup_facility_types():
    r = supabase.schema("pmis").from_("facility_type").select("code,name,division").order("name").execute()
    rows = r.data or []
    # facility_type 테이블에 발주유형(BTL/CMR/민간 등)이 섞여 들어와 있어 제거
    return [row for row in rows if (row.get("name") or "") not in ORDER_TYPES]


@router.get("/api/lookup/order-types")
def lookup_order_types():
    """발주유형은 lookup 테이블이 없고 ORDER_TYPES 상수로 관리되므로 그대로 노출."""
    return sorted(ORDER_TYPES)


@router.get("/api/lookup/clients")
def lookup_clients():
    r = supabase.schema("pmis").from_("client_org").select("id,name,org_type").order("name").execute()
    return r.data or []


@router.get("/api/lookup/partners")
def lookup_partners():
    """JV 파트너(하부업체) 목록 — 자동완성용."""
    r = supabase.schema("pmis").from_("partner_company").select("id,name,is_group_member").order("name").execute()
    return r.data or []
