#!/bin/bash
# ============================================================
# 업데이트 배포 (Docker 기반)
# main 에 push 되면 GitHub Actions 가 이미지 빌드 + GHCR push.
# 이 스크립트는 그 이미지를 받아서 갈아끼우기만 한다.
# ============================================================
set -e

cd /home/ubuntu/app

echo "=== 1. 최신 코드 pull (compose 파일 변경 반영) ==="
git pull origin main

echo "=== 2. 새 이미지 pull ==="
sudo docker compose pull

echo "=== 3. 컨테이너 갈아끼우기 ==="
sudo docker compose up -d

echo "=== 4. 안 쓰는 옛 이미지 정리 ==="
sudo docker image prune -f

echo ""
echo "✅ 배포 완료"
sudo docker compose ps
