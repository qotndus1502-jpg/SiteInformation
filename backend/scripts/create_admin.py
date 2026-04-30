"""Create the first admin account (or promote an existing user).

Idempotent: running twice is safe. If the email already exists in auth.users,
we only update the profile to role=admin / status=approved.

Usage:
    python create_admin.py <email> <password> [<full_name>]

Example:
    python create_admin.py 21226064@namkwang.co.kr "kan991224" "관리자"

The backend .env must have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.
"""
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime
import os
import sys


def main() -> None:
    if len(sys.argv) < 3:
        print("사용법: python create_admin.py <email> <password> [<full_name>]")
        sys.exit(2)

    email = sys.argv[1].strip()
    password = sys.argv[2]
    full_name = sys.argv[3].strip() if len(sys.argv) > 3 else "관리자"

    load_dotenv()
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(url, key)

    # 1) Look up or create the auth.users row
    existing = sb.auth.admin.list_users()
    user = None
    for u in existing:
        if (getattr(u, "email", None) or "").lower() == email.lower():
            user = u
            break

    if user is None:
        print(f"[1/2] auth.users 에 {email} 생성 중...")
        res = sb.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        })
        user = res.user
        print(f"    → user_id={user.id}")
    else:
        print(f"[1/2] {email} 이미 존재 — 프로필만 admin 으로 승격")
        print(f"    → user_id={user.id}")

    # 2) Upsert the profile with role=admin, status=approved
    #    Trigger pmis.handle_new_auth_user already inserted a row; we just
    #    flip the role/status. Use upsert in case the trigger missed it.
    print("[2/2] user_profile upsert (role=admin, status=approved)")
    sb.schema("pmis").from_("user_profile").upsert({
        "id": user.id,
        "email": email,
        "full_name": full_name,
        "role": "admin",
        "status": "approved",
        "approved_at": datetime.utcnow().isoformat(),
    }).execute()

    print()
    print("✅ 완료. 로그인 후 사용하세요.")
    print(f"   이메일: {email}")
    print(f"   비밀번호: (입력한 값)")


if __name__ == "__main__":
    main()
