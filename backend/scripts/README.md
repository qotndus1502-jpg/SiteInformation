# backend/scripts

운영 코드(`backend/main.py`)와 분리된 **일회성/관리용 스크립트** 모음.

모두 `backend/.env`의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 사용하므로, 실행 시 backend 디렉토리에서 실행하거나 `dotenv` 경로가 잡히는 환경에서 실행해야 한다.

```bash
cd backend
python scripts/<script>.py [args...]
```

## 파일별 목적

### `create_admin.py` — 관리자 계정 부트스트랩 (재사용 가능)
첫 admin 계정을 생성하거나, 이미 존재하는 사용자를 admin으로 승격한다. **멱등**.

```bash
python scripts/create_admin.py <email> <password> [<full_name>]
```

신규 환경 셋업 시 매번 사용. 보존.

### `seed_default_departments.py` — 부서 백필 (실행 완료, 보존)
부서가 하나도 없는 기존 현장에 기본 5팀(공무/공사/기계·토목/품질/안전) 추가. **멱등**.

```bash
python scripts/seed_default_departments.py
```

신규 현장 추가 시 backfill이 필요해질 수 있어 보존. 신규 현장은 `main.py`의 site 생성 시 동일 기본값을 사용하는지 확인 필요.

### `update_sites.py` — 1차 데이터 마이그레이션 (2026-03 현황표)
`contract_amount`, `site_manager`, `manager_position`, `start_date` 일괄 업데이트. 하드코딩된 매핑 사용.

**일회성** — 이미 적용 완료된 마이그레이션. 향후 같은 형태의 데이터 갱신이 발생하면 새 스크립트를 작성하거나 본 파일을 복제해 사용. 참조용 보존.

### `update_sites2.py` — 2차 데이터 마이그레이션 (공릉대명/수원연무 + 신규 현장)
`update_sites.py`의 후속. **일회성**, 이미 적용 완료. 참조용 보존.

## 운영 정책

- 새 일회성 스크립트는 이 디렉토리에 추가.
- 운영 API에서 호출되는 코드는 절대 이 디렉토리에 두지 않는다 (`backend/main.py`나 향후의 `backend/routers/`로).
- 스크립트가 의존하는 외부 데이터 파일(예: 입력 JSON)은 같은 위치에 두고 `.gitignore` 여부를 README에 명시.
