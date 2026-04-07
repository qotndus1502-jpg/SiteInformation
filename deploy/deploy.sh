#!/bin/bash
# ============================================================
# 업데이트 배포 스크립트 (코드 변경 후 실행)
# ============================================================
set -e

cd /home/ubuntu/app

echo "=== 1. 최신 코드 pull ==="
git pull origin main

echo "=== 2. Backend 의존성 업데이트 ==="
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

echo "=== 3. Frontend 빌드 ==="
cd web
npm ci
npm run build
cd ..

echo "=== 4. PM2 재시작 ==="
pm2 restart all

echo "✅ 배포 완료!"
