"""Auth-only endpoints. Currently just /api/me — returns the current user's
profile so the frontend can route pending/rejected accounts to their
respective pages without depending on the full data set.
"""
from fastapi import APIRouter, Depends

from deps import get_current_user_raw

router = APIRouter()


@router.get("/api/me")
def api_me(user: dict = Depends(get_current_user_raw)):
    """Current user + profile. Works for any authenticated token regardless of
    approval status, so the frontend can redirect pending/rejected users to
    the appropriate page."""
    p = user.get("profile") or {}
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user.get("role") or "user",
        "status": p.get("status"),
        "full_name": p.get("full_name"),
        "employee_number": p.get("employee_number"),
        "corporation_id": p.get("corporation_id"),
    }
