@echo off
REM すべてのサービスをDockerで起動（Windows用）

REM Docker BuildKit を有効化（ビルド高速化）
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo 🚀 すべてのサービスを起動します...
docker-compose up -d

echo.
echo ✅ 起動完了！
echo.
echo 📋 サービス一覧:
echo   - MySQL:          http://localhost:3309
echo   - Node.js API:    http://localhost:3001
echo   - AI検出API:      http://localhost:8001
echo   - AI API Docs:    http://localhost:8001/docs
echo   - phpMyAdmin:     http://localhost:8080
echo.
echo 📊 コンテナ状態:
docker-compose ps

pause
