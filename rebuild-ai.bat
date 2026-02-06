@echo off
REM AI検出サービスのみを高速ビルド＆起動

REM Docker BuildKit を有効化（ビルド高速化）
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo 🔧 AI検出サービスを再ビルドします...
echo ℹ️  BuildKitのキャッシュマウントにより、pip installが高速化されます
echo.

docker-compose build ai_detection

echo.
echo ✅ ビルド完了！
echo 🚀 サービスを起動します...
docker-compose up -d

echo.
echo 📋 サービス状態:
docker-compose ps

pause
