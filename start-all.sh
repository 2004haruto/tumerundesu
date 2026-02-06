#!/bin/bash
# すべてのサービスをDockerで起動

echo "🚀 すべてのサービスを起動します..."
docker-compose up -d

echo ""
echo "✅ 起動完了！"
echo ""
echo "📋 サービス一覧:"
echo "  - MySQL:          http://localhost:3309"
echo "  - Node.js API:    http://localhost:3001"
echo "  - AI検出API:      http://localhost:8001"
echo "  - AI API Docs:    http://localhost:8001/docs"
echo "  - phpMyAdmin:     http://localhost:8080"
echo ""
echo "📊 コンテナ状態:"
docker-compose ps
