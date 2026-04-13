# 💻 実行コマンド履歴・開発メモ

このドキュメントには、プロジェクト開発時に実際に実行したコマンドや設定手順を記録します。

---

## 📅 初回環境構築時

### 1. プロジェクトの初期化

```powershell
# Expoプロジェクトの作成
npx create-expo-app tumerundesu
cd tumerundesu

# 必要なパッケージのインストール
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install expo-camera expo-image-picker expo-file-system
npm install expo-image-manipulator expo-location expo-calendar
npm install @react-native-async-storage/async-storage
npm install @react-native-community/datetimepicker
npm install react-native-chart-kit react-native-svg
npm install @expo/vector-icons
npm install expo-linear-gradient
npm install react-native-dotenv

# TypeScript関連
npm install --save-dev typescript @types/react @types/react-navigation
npm install --save-dev @types/node
```

### 2. バックエンドプロジェクトのセットアップ

```powershell
# バックエンドディレクトリ作成
mkdir backend
cd backend

# package.json初期化
npm init -y

# Express と TypeScript のインストール
npm install express cors dotenv mysql2 bcryptjs jsonwebtoken
npm install multer uuid axios joi helmet express-rate-limit
npm install --save-dev typescript ts-node nodemon
npm install --save-dev @types/express @types/cors @types/node
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
npm install --save-dev @types/multer @types/uuid

# TypeScript設定ファイル作成
npx tsc --init
```

### 3. AI検出APIプロジェクトのセットアップ

```powershell
# AI研究ディレクトリ作成
cd backend
mkdir ai_research
cd ai_research

# Python仮想環境作成
python -m venv venv
.\venv\Scripts\Activate.ps1

# 必要なPythonパッケージのインストール
pip install numpy opencv-python PyYAML
pip install ultralytics torch torchvision
pip install fastapi uvicorn python-multipart
pip install matplotlib seaborn pandas
pip install python-dotenv Pillow

# requirements.txt作成
pip freeze > requirements.txt
```

---

## 🐳 Docker環境構築

### Docker Compose設定

```powershell
# プロジェクトルートで
cd C:\ExpoProjects\tumerundesu

# docker-compose.ymlファイルを作成（エディタで編集）
# - MySQL サービス
# - Node.js Backend サービス
# - Python AI Detection サービス
# - phpMyAdmin サービス

# Dockerfileの作成
# backend/Dockerfile
# backend/ai_research/Dockerfile
```

### Docker起動コマンド

```powershell
# 全サービスを起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# コンテナ一覧表示
docker-compose ps

# 特定のサービスのログ
docker-compose logs -f ai_detection
docker-compose logs -f backend
docker-compose logs -f mysql

# コンテナに入る
docker-compose exec backend sh
docker-compose exec ai_detection bash
docker-compose exec mysql mysql -u root -p

# サービスを停止
docker-compose down

# イメージを再ビルドして起動
docker-compose up -d --build

# ボリュームも含めて完全削除
docker-compose down -v
```

---

## 🛠️ 開発中によく使ったコマンド

### Expo開発サーバー

```powershell
# 開発サーバー起動
npm start

# キャッシュクリア
npx expo start -c

# Androidエミュレーター起動
npm run android

# Web版起動
npm run web

# Metro Bundlerのリセット
npx expo start --clear

# 依存関係の再インストール
rm -rf node_modules
npm install
```

### IPアドレス確認（実機テスト時）

```powershell
# Windows
ipconfig
# 「ワイヤレス LAN アダプター Wi-Fi」のIPv4アドレスを確認

# 例: 10.108.0.253

# .envファイルを更新
# EXPO_PUBLIC_API_URL=http://10.108.0.253:3001/api
# EXPO_PUBLIC_AI_DETECTION_URL=http://10.108.0.253:8001
```

### バックエンドAPI開発

```powershell
# バックエンドディレクトリに移動
cd backend

# 開発モードで起動（nodemon + ts-node）
npm run dev

# TypeScriptビルド
npm run build

# ビルドしたファイルを実行
npm start

# 型チェックのみ
npm run type-check

# パッケージ追加後、コンテナに反映
docker-compose up -d --build backend
```

### AI検出API開発

```powershell
# AI研究ディレクトリに移動
cd backend/ai_research

# 仮想環境有効化
.\venv\Scripts\Activate.ps1

# FastAPIサーバー起動（直接実行）
python api_server.py

# Uvicornで起動
uvicorn api_server:app --host 0.0.0.0 --port 8001 --reload

# テスト実行
python test_detection.py

# 評価実行
python evaluator.py

# グラフ生成
python plot_results.py

# YOLOモデルのダウンロード確認
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

### データベース操作

```powershell
# MySQLコンテナに接続
docker-compose exec mysql mysql -u root -p tumerundesu_db
# パスワード: root

# MySQL内で実行するコマンド例
USE tumerundesu_db;
SHOW TABLES;
DESCRIBE users;
SELECT * FROM users;

# SQL初期化スクリプトの再実行
docker-compose down -v
docker-compose up -d
# backend/sql/init.sql が自動実行される

# データベースバックアップ
docker-compose exec mysql mysqldump -u root -proot tumerundesu_db > backup.sql

# データベース復元
docker-compose exec -T mysql mysql -u root -proot tumerundesu_db < backup.sql
```

---

## 🧪 テストとデバッグ

### APIエンドポイントのテスト

```powershell
# Backend APIのヘルスチェック
curl http://localhost:3001/health

# AI Detection APIのヘルスチェック
curl http://localhost:8001/health

# API ドキュメント（ブラウザで確認）
# http://localhost:8001/docs
# http://localhost:8001/redoc

# POSTリクエストのテスト（PowerShell）
$body = @{
    detection_mode = "hybrid"
    image_base64 = "..."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8001/detect/base64" -Method Post -Body $body -ContentType "application/json"
```

### ログとデバッグ

```powershell
# リアルタイムログ表示
docker-compose logs -f

# 過去のログを表示
docker-compose logs --tail=100

# 特定のサービスだけ
docker-compose logs -f ai_detection

# エラーログのフィルタ
docker-compose logs backend | Select-String "error"

# コンテナ内でシェルを起動してデバッグ
docker-compose exec backend sh
docker-compose exec ai_detection bash
```

---

## 🔧 トラブルシューティング時のコマンド

### ポート競合の解決

```powershell
# ポート使用状況の確認
netstat -ano | findstr :3001
netstat -ano | findstr :8001
netstat -ano | findstr :3309
netstat -ano | findstr :8080

# プロセスIDを特定して終了（管理者権限で実行）
taskkill /PID <PID> /F

# または、Docker Composeのポート番号を変更
# docker-compose.yml でポートを変更
```

### Docker関連の問題

```powershell
# Dockerのクリーンアップ
docker system prune -a
docker volume prune

# 特定のコンテナを削除
docker rm -f tumerundesu_backend
docker rm -f tumerundesu_ai_detection
docker rm -f tumerundesu_mysql

# 特定のイメージを削除
docker rmi tumerundesu_backend
docker rmi tumerundesu_ai_detection

# すべてのvolumesを削除（注意：データ消失）
docker-compose down -v

# Dockerのディスク使用量確認
docker system df
```

### npm/Node.js関連の問題

```powershell
# node_modulesとpackage-lock.jsonを削除して再インストール
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Expoのキャッシュクリア
npx expo start -c

# Watchmanのキャッシュクリア（macOS/Linux）
watchman watch-del-all

# Metro Bundlerのキャッシュクリア
npx react-native start --reset-cache
```

### Python/pip関連の問題

```powershell
# pip キャッシュクリア
pip cache purge

# requirements.txtから再インストール
pip uninstall -r requirements.txt -y
pip install -r requirements.txt

# 仮想環境の作り直し
deactivate
rm -rf venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 📊 AI研究実験の実行

### 実験フォルダの作成

```powershell
# 実験結果ディレクトリに移動
cd ai_research_results

# 新しい実験フォルダを手動作成
mkdir experiment_023_テスト実験
cd experiment_023_テスト実験
mkdir logs
mkdir visualizations
```

### 実験の実行

```powershell
# AI検出APIコンテナに入る
docker-compose exec ai_detection bash

# テスト画像で検出実行
python detector.py --mode hybrid --input test_images/sample.jpg

# フォルダ内の全画像を評価
python evaluator.py --input test_images/ --output outputs/

# 結果をグラフ化
python plot_results.py --input outputs/metrics.csv

# 実験メタデータを記録
python experiment_metadata.py --name "テスト実験" --description "新しい閾値でのテスト"
```

---

## 🌐 外部API設定

### OpenWeatherMap API設定

```powershell
# 1. https://openweathermap.org/ でアカウント作成
# 2. API Keys セクションでキーを生成
# 3. .envファイルに追加
# OPENWEATHER_API_KEY=<your_api_key>

# APIテスト
curl "http://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=<your_api_key>"
```

### 楽天レシピAPI設定

```powershell
# 1. https://webservice.rakuten.co.jp/ でアプリ登録
# 2. アプリIDを取得
# 3. .envファイルに追加
# EXPO_PUBLIC_RAKUTEN_APP_ID=<your_app_id>

# APIテスト
curl "https://app.rakuten.co.jp/services/api/Recipe/CategoryList/20170426?applicationId=<your_app_id>"
```

---

## 🔄 定期的なメンテナンスコマンド

### 依存関係の更新

```powershell
# npm パッケージの更新確認
npm outdated

# パッケージを最新版に更新
npm update

# または個別に更新
npm install <package-name>@latest

# pip パッケージの更新確認
pip list --outdated

# すべてのpipパッケージを最新に
pip install --upgrade pip
pip install --upgrade -r requirements.txt
```

### Dockerイメージの更新

```powershell
# ベースイメージを最新に
docker-compose pull

# ローカルイメージを再ビルド
docker-compose build --no-cache

# 起動
docker-compose up -d
```

---

## 📝 Git操作ログ

### 初期コミット

```powershell
# Gitリポジトリ初期化
git init

# .gitignoreファイル作成
# node_modules, .env, dist, build, __pycache__, *.pyc などを追加

# 初回コミット
git add .
git commit -m "Initial commit: Setup Expo + Backend + AI Detection"

# リモートリポジトリ追加
git remote add origin <repository-url>
git branch -M main
git push -u origin main
```

### 開発中のコミット例

```powershell
# コミット前の確認
git status
git diff

# ステージング
git add .

# コミット
git commit -m "feat: Add bento box detection feature"

# プッシュ
git push origin main

# ブランチ作成して作業
git checkout -b feature/ai-improvement
git commit -m "improve: Enhance YOLOv8 detection accuracy"
git push origin feature/ai-improvement
```

---

## 🚀 デプロイ準備コマンド

### 本番ビルド

```powershell
# Expoプロジェクトのビルド
eas build --platform android
eas build --platform ios

# バックエンドのビルド
cd backend
npm run build

# Dockerイメージのビルド（本番用）
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 参考にしたコマンドやリソース

### よく参照したドキュメント
- Expo CLI: https://docs.expo.dev/workflow/expo-cli/
- Docker Compose: https://docs.docker.com/compose/
- FastAPI: https://fastapi.tiangolo.com/
- YOLOv8: https://docs.ultralytics.com/

### 便利なエイリアス（PowerShell Profile）

```powershell
# PowerShellプロファイルを編集
notepad $PROFILE

# 以下を追加
function dcu { docker-compose up -d }
function dcd { docker-compose down }
function dcl { docker-compose logs -f }
function dcps { docker-compose ps }
function dcr { docker-compose restart }
function expo-clean { npx expo start -c }

# プロファイルを再読み込み
. $PROFILE
```

---

## ⚡ クイックリファレンス

### 1行で全環境起動

```powershell
# Windows
.\start-all.bat && npm start

# Mac/Linux
./start-all.sh && npm start
```

### 1行でクリーンアップと再起動

```powershell
docker-compose down -v && docker-compose up -d --build && npm start
```

### 1行でAI APIをテスト

```powershell
docker-compose exec ai_detection python test_detection.py
```

---

**最終更新日**: 2026年2月9日  
**作成者**: プロジェクト開発チーム  
**プロジェクト**: Tumerundesu v1.0.0
