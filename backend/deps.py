"""FastAPI dependencies — three auth layers built on Supabase Auth.

Users authenticate via Supabase Auth (client-side), then send the JWT as
`Authorization: Bearer <token>`. We verify with `supabase.auth.get_user()`
(one extra API call per request — fine for an internal dashboard) and
cross-check the profile row for status/role.

  get_current_user_raw — JWT valid, profile loaded (may be pending/null)
  get_current_user      — above + status == approved
  require_admin         — above + role == admin
"""
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase_client import supabase

_bearer = HTTPBearer(auto_error=False)


def _load_profile(user_id: str) -> Optional[dict]:
    try:
        r = (
            supabase.schema("pmis")
            .from_("user_profile")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
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
