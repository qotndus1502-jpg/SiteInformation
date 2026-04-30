"""Admin user management — list / approve / reject / change role / delete."""
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from typing import Optional

from supabase_client import supabase
from deps import require_admin

router = APIRouter()


@router.get("/api/users")
def list_users(
    status: Optional[str] = Query(None, description="pending | approved | rejected"),
    _admin: dict = Depends(require_admin),
):
    q = supabase.schema("pmis").from_("user_profile").select("*").order("requested_at", desc=True)
    if status:
        q = q.eq("status", status)
    r = q.execute()
    return r.data or []


@router.post("/api/users/{user_id}/approve")
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


@router.post("/api/users/{user_id}/reject")
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


@router.post("/api/users/{user_id}/role")
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


@router.delete("/api/users/{user_id}")
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
