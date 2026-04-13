# 🚀 Tumerundesu プロジェクト環境構築ガイド

## 📋 プロジェクト概要

お弁当管理アプリ「Tumerundesu」は以下の技術スタックで構築されています：

- **フロントエンド**: React Native (Expo)
- **バックエンドAPI**: Node.js + Express + TypeScript
- **データベース**: MySQL 8.0
- **AI検出API**: Python + FastAPI + YOLOv8 + OpenCV
- **コンテナ化**: Docker + Docker Compose

---

## 📌 前提条件

以下のソフトウェアがインストールされていることを確認してください：

### 必須
- **Node.js**: v18以上（推奨: v18.x LTS）
- **npm**: v9以上
- **Docker Desktop**: 最新版
- **Docker Compose**: v2.x以上
- **Git**: 最新版

### オプション（モバイル開発時）
- **Android Studio**（Androidエミュレーター用）
- **Xcode**（iOS シミュレーター用 / macOSのみ）
- **Expo Go アプリ**（実機テスト用）

---

## 🛠️ 初期セットアップ手順

### 1. プロジェクトのクローン

```powershell
# リポジトリをクローン
git clone <repository-url>
cd tumerundesu
```

---

### 2. 環境変数ファイルの作成

#### 2-1. フロントエンド環境変数（`.env`）

プロジェクトルートに `.env` ファイルを作成：

```powershell
cd c:\ExpoProjects\tumerundesu
```

`.env` ファイルの内容：

```env
# 楽天レシピAPI設定
EXPO_PUBLIC_RAKUTEN_APP_ID=1089215530857693286

# バックエンドAPI設定（開発環境用）- モバイルデバイス対応
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# AI検出API設定（Python FastAPI）
EXPO_PUBLIC_AI_DETECTION_URL=http://localhost:8001

# OpenWeatherMap API設定
# https://openweathermap.org/api でAPIキーを取得してください
OPENWEATHER_API_KEY=your_api_key_here
```

**実機デバイスでテストする場合:**

1. PCのIPアドレスを確認：
   ```powershell
   ipconfig
   # IPv4アドレスをメモ（例: 192.168.1.100）
   ```

2. `.env` ファイルを更新：
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3001/api
   EXPO_PUBLIC_AI_DETECTION_URL=http://192.168.1.100:8001
   ```

**Androidエミュレーターの場合:**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
EXPO_PUBLIC_AI_DETECTION_URL=http://10.0.2.2:8001
```

#### 2-2. バックエンド環境変数（`backend/.env`）

`backend` フォルダに `.env` ファイルを作成：

```env
# データベース設定
DB_HOST=mysql
DB_PORT=3306
DB_NAME=tumerundesu_db
DB_USER=root
DB_PASSWORD=root

# サーバー設定
PORT=3001
NODE_ENV=development

# JWT設定
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# フロントエンド設定
FRONTEND_URL=http://localhost:8081

# 楽天レシピAPI設定
EXPO_PUBLIC_RAKUTEN_APP_ID=1089215530857693286
```

#### 2-3. AI検出API環境変数（`backend/ai_research/.env`）

`backend/ai_research` フォルダに `.env` ファイルを作成：

```env
# AI検出API設定
HOST=0.0.0.0
PORT=8001

# YOLOv8設定
CONFIDENCE_THRESHOLD=0.5
NMS_THRESHOLD=0.4

# ディレクトリ設定
OUTPUT_DIR=/app/outputs
UPLOAD_DIR=/app/uploads
MODELS_DIR=/app/models

# ピクセル変換係数
PX_TO_MM_RATIO=1.0

# ログ設定
LOG_LEVEL=INFO
DEBUG=true

# CORS設定
ALLOWED_ORIGINS=*
```

---

### 3. 依存パッケージのインストール

#### 3-1. フロントエンド依存関係

```powershell
# プロジェクトルートで実行
npm install
```

#### 3-2. バックエンド依存関係（Dockerを使う場合は不要）

```powershell
cd backend
npm install
cd ..
```

---

### 4. Dockerサービスの起動

#### 4-1. 全サービスを一括起動

**Windows:**
```powershell
.\start-all.bat
```

**Mac/Linux:**
```bash
chmod +x start-all.sh
./start-all.sh
```

**または、直接Docker Composeコマンドで:**
```powershell
docker-compose up -d
```

#### 4-2. 起動確認

```powershell
# コンテナの状態を確認
docker-compose ps

# ログを確認
docker-compose logs -f
```

起動したサービス:
- **MySQL**: `localhost:3309`
- **Node.js Backend API**: http://localhost:3001
- **AI検出API**: http://localhost:8001
- **AI API ドキュメント**: http://localhost:8001/docs
- **phpMyAdmin**: http://localhost:8080

#### 4-3. ヘルスチェック

```powershell
# Backend APIのヘルスチェック
curl http://localhost:3001/health

# AI検出APIのヘルスチェック
curl http://localhost:8001/health
```

---

### 5. Expoアプリの起動

```powershell
# プロジェクトルートで実行
npm start
```

または個別に:
```powershell
# Android
npm run android

# iOS (macOSのみ)
npm run ios

# Web
npm run web
```

---

## 📱 実行環境別の設定

### エミュレーター/シミュレーター

**Android エミュレーター:**
- `.env`ファイルで `http://10.0.2.2:3001` を使用
- ファイアウォール設定は不要

**iOS シミュレーター:**
- `.env`ファイルで `http://localhost:3001` を使用

### 実機デバイス

1. **PCとスマホが同じWi-Fiネットワークに接続されていることを確認**

2. **PCのIPアドレスを確認:**
   ```powershell
   ipconfig
   # 「ワイヤレス LAN アダプター Wi-Fi」の「IPv4 アドレス」をメモ
   ```

3. **`.env`ファイルを更新:**
   ```env
   EXPO_PUBLIC_API_URL=http://<your-pc-ip>:3001/api
   EXPO_PUBLIC_AI_DETECTION_URL=http://<your-pc-ip>:8001
   ```

4. **Windowsファイアウォールでポートを開放:**
   - ポート 3001 (Backend)
   - ポート 8001 (AI API)
   - ポート 8081 (Expo Metro)

5. **Expo Goアプリでスキャン:**
   ```powershell
   npm start
   # 表示されるQRコードをスマホのExpo Goアプリでスキャン
   ```

---

## 🧪 テスト・検証

### バックエンドAPIテスト

```powershell
# コンテナ内でテスト実行
docker-compose exec backend npm test
```

### AI検出APIテスト

```powershell
# コンテナ内でテスト実行
docker-compose exec ai_detection python test_detection.py
```

### データベース接続テスト

```powershell
# MySQLコンテナに接続
docker-compose exec mysql mysql -u root -p tumerundesu_db
# パスワード: root
```

または、phpMyAdminで確認:
- URL: http://localhost:8080
- サーバー: `mysql`
- ユーザー名: `root`
- パスワード: `root`

---

## 🐛 トラブルシューティング

### Dockerコンテナが起動しない

```powershell
# すべてのコンテナを停止
docker-compose down

# ボリュームも削除して再起動
docker-compose down -v
docker-compose up -d --build
```

### AI検出APIのビルドが遅い

```powershell
# AI検出サービスのみ再ビルド（高速化）
.\rebuild-ai.bat
```

### ポートが既に使用されている

```powershell
# 使用中のポートを確認
netstat -ano | findstr :3001
netstat -ano | findstr :8001
netstat -ano | findstr :3309

# プロセスを終了（管理者権限で実行）
taskkill /PID <PID> /F
```

### Expo Metro Bundlerのキャッシュクリア

```powershell
# キャッシュをクリアして再起動
npx expo start -c
```

### データベース接続エラー

```powershell
# MySQLコンテナのログを確認
docker-compose logs mysql

# コンテナが起動しているか確認
docker-compose ps

# データベース初期化スクリプトを再実行
docker-compose down -v
docker-compose up -d
```

---

## 📂 プロジェクト構造

```
tumerundesu/
├── .env                           # フロントエンド環境変数
├── App.tsx                        # Expoアプリエントリーポイント
├── app.json                       # Expo設定
├── package.json                   # フロントエンド依存関係
├── docker-compose.yml             # Docker設定
├── start-all.bat                  # 全サービス起動スクリプト（Windows）
├── start-all.sh                   # 全サービス起動スクリプト（Mac/Linux）
├── rebuild-ai.bat                 # AI APIリビルドスクリプト
│
├── src/                           # フロントエンドソースコード
│   ├── screens/                   # 画面コンポーネント
│   ├── services/                  # APIクライアント
│   ├── contexts/                  # Reactコンテキスト
│   ├── types/                     # TypeScript型定義
│   └── utils/                     # ユーティリティ関数
│
├── backend/                       # バックエンドAPI
│   ├── .env                       # バックエンド環境変数
│   ├── package.json               # バックエンド依存関係
│   ├── Dockerfile                 # バックエンドDockerイメージ
│   ├── src/                       # バックエンドソースコード
│   │   ├── index.ts               # サーバーエントリーポイント
│   │   ├── config/                # 設定ファイル
│   │   └── routes/                # APIルート
│   ├── sql/                       # データベース初期化SQL
│   │   └── init.sql
│   └── ai_research/               # AI検出API
│       ├── .env                   # AI API環境変数
│       ├── requirements.txt       # Python依存パッケージ
│       ├── Dockerfile             # AI APIDockerイメージ
│       ├── api_server.py          # FastAPIサーバー
│       ├── detector.py            # 検出モジュール
│       ├── evaluator.py           # 評価モジュール
│       └── test_images/           # テスト画像
│
├── ai_research_results/           # AI実験結果
│   ├── experiment_001_*/          # 実験フォルダ
│   ├── logs/                      # 検出ログ
│   └── visualizations/            # 結果グラフ
│
└── docs/                          # ドキュメント
    ├── DOCKER_SETUP.md
    ├── environment-variables-guide.md
    └── WEATHER_API_SETUP.md
```

---

## 🔧 よく使うコマンド集

### Docker関連

```powershell
# すべてのサービスを起動
docker-compose up -d

# すべてのサービスを停止
docker-compose down

# ログを表示（リアルタイム）
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f backend
docker-compose logs -f ai_detection
docker-compose logs -f mysql

# コンテナの状態を確認
docker-compose ps

# コンテナを再起動
docker-compose restart

# イメージを再ビルド
docker-compose up -d --build

# ボリュームも含めて完全削除
docker-compose down -v

# AI検出サービスのみ再ビルド
docker-compose build ai_detection
docker-compose up -d
```

### Expo関連

```powershell
# 開発サーバー起動
npm start

# キャッシュクリアして起動
npx expo start -c

# Androidエミュレーターで起動
npm run android

# iOSシミュレーターで起動
npm run ios

# Webブラウザで起動
npm run web
```

### バックエンド関連

```powershell
# コンテナ内でコマンド実行
docker-compose exec backend npm install <package-name>

# TypeScriptの型チェック
docker-compose exec backend npm run type-check

# ビルド（本番用）
docker-compose exec backend npm run build
```

### データベース関連

```powershell
# MySQLコンテナに接続
docker-compose exec mysql mysql -u root -p tumerundesu_db

# データベースのバックアップ
docker-compose exec mysql mysqldump -u root -p tumerundesu_db > backup.sql

# データベースの復元
docker-compose exec -T mysql mysql -u root -p tumerundesu_db < backup.sql
```

### AI検出API関連

```powershell
# コンテナ内でPythonスクリプト実行
docker-compose exec ai_detection python test_detection.py

# 実験評価の実行
docker-compose exec ai_detection python evaluator.py

# グラフ生成
docker-compose exec ai_detection python plot_results.py
```

---

## 🌐 外部APIキーの取得

### OpenWeatherMap API

1. https://openweathermap.org/ にアクセス
2. アカウント作成（無料プラン）
3. API Keys セクションで新しいキーを生成
4. `.env`ファイルに追加:
   ```env
   OPENWEATHER_API_KEY=your_api_key_here
   ```

### 楽天レシピAPI

1. https://webservice.rakuten.co.jp/ にアクセス
2. アプリ登録
3. アプリIDを取得
4. `.env`ファイルに追加:
   ```env
   EXPO_PUBLIC_RAKUTEN_APP_ID=your_app_id_here
   ```

---

## 📊 AI研究機能について

このプロジェクトにはAI検出精度の研究機能が含まれています：

### 検出モード
- **OpenCV単体**: エッジ検出ベース（高速）
- **YOLO単体**: 深層学習ベース（高精度）
- **Hybrid**: YOLO + OpenCV併用（推奨）

### 実験結果の保存先
```
ai_research_results/
├── experiment_001_ゼミ実験2回目/
├── experiment_002_ゼミ実験3回目/
├── ...
├── experiment_022_ゼミ実験22回目/
└── logs/
```

### 実験の実行
```powershell
# AI検出APIコンテナにアクセス
docker-compose exec ai_detection bash

# 評価実行
python evaluator.py

# グラフ生成
python plot_results.py
```

---

## 🚀 デプロイ（本番環境）

### 環境変数の本番設定

本番環境では、以下の設定を変更してください：

#### `.env`（フロントエンド）
```env
EXPO_PUBLIC_API_URL=https://your-production-api.com/api
EXPO_PUBLIC_AI_DETECTION_URL=https://your-ai-api.com
```

#### `backend/.env`（バックエンド）
```env
NODE_ENV=production
DB_HOST=<production-db-host>
DB_PASSWORD=<strong-password>
JWT_SECRET=<strong-random-secret>
```

### Dockerイメージのビルド（本番用）

```powershell
# 本番用イメージをビルド
docker-compose -f docker-compose.prod.yml build

# 本番用コンテナを起動
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📝 開発を開始する際のチェックリスト

- [ ] Node.js、npm、Docker、Docker Composeがインストールされている
- [ ] プロジェクトをクローンした
- [ ] `.env` ファイルを作成（フロントエンド、バックエンド、AI API）
- [ ] `npm install` を実行（プロジェクトルート）
- [ ] `docker-compose up -d` でDockerサービスを起動
- [ ] http://localhost:3001/health で Backend API が起動していることを確認
- [ ] http://localhost:8001/health で AI API が起動していることを確認
- [ ] `npm start` で Expo 開発サーバーを起動
- [ ] エミュレーター/シミュレーター/実機でアプリを確認

---

## 🆘 サポート

問題が発生した場合：

1. **ログを確認**: `docker-compose logs -f`
2. **ポート競合を確認**: `netstat -ano | findstr :<port>`
3. **Dockerをクリーンアップ**: `docker-compose down -v && docker-compose up -d --build`
4. **キャッシュをクリア**: `npx expo start -c`

---

## 📚 参考ドキュメント

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)

---

**作成日**: 2026年2月9日  
**プロジェクト**: Tumerundesu（お弁当管理アプリ）  
**バージョン**: 1.0.0
