# 環境変数設定ガイド

## 概要
このプロジェクトは複数の環境変数ファイルを使用して設定を管理します。

## 環境変数ファイル一覧

### 1. フロントエンド（React Native / Expo）
**場所**: `/tumerundesu/.env`

```bash
# 楽天レシピAPI設定
EXPO_PUBLIC_RAKUTEN_APP_ID=1089215530857693286

# バックエンドAPI設定（Node.js）
EXPO_PUBLIC_API_URL=http://10.108.0.146:3001/api

# AI検出API設定（Python FastAPI）
EXPO_PUBLIC_AI_DETECTION_URL=http://10.200.5.164:8001

# OpenWeatherMap API設定
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
```

**設定方法**:
1. `.env.example`をコピーして`.env`を作成
2. ネットワークIPアドレスを確認: `ipconfig` (Windows) / `ifconfig` (Mac/Linux)
3. 該当のIPアドレスに変更
4. Expoサーバーを再起動: `npm start`

---

### 2. バックエンド（Node.js / Express）
**場所**: `/backend/.env`

```bash
# データベース設定
DB_HOST=localhost
DB_PORT=3309
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

**起動方法**:
```bash
cd backend
npm install
npm run dev
```

---

### 3. AI検出API（Python / FastAPI）
**場所**: `/backend/ai_research/.env`

```bash
# AI検出API設定
HOST=0.0.0.0
PORT=8001

# YOLOモデルパス（オプション）
# YOLO_WEIGHTS_PATH=./models/yolov3.weights
# YOLO_CONFIG_PATH=./models/yolov3.cfg

# 信頼度閾値
CONFIDENCE_THRESHOLD=0.5

# 出力ディレクトリ
OUTPUT_DIR=./outputs
```

**起動方法**:
```bash
cd backend/ai_research
pip install -r requirements.txt
python api_server_hybrid.py
```

---

## IPアドレス設定の流れ

### 開発環境（モバイルデバイステスト時）

1. **ホストPCのIPアドレスを確認**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
   
   例: `10.200.5.164`

2. **各.envファイルを更新**
   
   **フロントエンド** (`.env`):
   ```bash
   EXPO_PUBLIC_API_URL=http://10.200.5.164:3001/api
   EXPO_PUBLIC_AI_DETECTION_URL=http://10.200.5.164:8001
   ```
   
   **AI検出API** (`backend/ai_research/.env`):
   ```bash
   HOST=0.0.0.0  # すべてのネットワークインターフェースで待ち受け
   PORT=8001
   ```

3. **すべてのサーバーを再起動**

---

## ポート一覧

| サービス | デフォルトポート | 説明 |
|---------|----------------|------|
| Expo開発サーバー | 8081 | React Nativeフロントエンド |
| Node.jsバックエンド | 3001 | レシピ・ユーザー管理API |
| Python AI API | 8001 | 弁当箱検出AI（ハイブリッドモード） |
| PostgreSQL | 3309 | データベース |

---

## トラブルシューティング

### エラー: `Cannot connect to API`

**原因**: IPアドレスまたはポートが正しくない

**解決策**:
1. ホストPCのファイアウォール設定を確認
2. すべてのサーバーが起動しているか確認
3. `.env`ファイルのIPアドレスが正しいか確認
4. Expoサーバーを再起動（環境変数変更後）

### エラー: `Address already in use`

**原因**: ポートが既に使用されている

**解決策**:
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8001 | xargs kill -9
```

### 環境変数が反映されない

**React Native / Expo**:
- Expoサーバーを完全に再起動（Ctrl+C → `npm start`）
- キャッシュクリア: `npm start -- --clear`

**Python FastAPI**:
- サーバーを再起動
- `.env`ファイルが正しい場所にあるか確認

**Node.js**:
- `npm run dev`を再実行
- `.env`ファイルのシンタックスエラーを確認

---

## セキュリティ注意事項

⚠️ **本番環境では以下を必ず変更してください**:

1. `JWT_SECRET`: ランダムな強力な文字列に変更
2. `DB_PASSWORD`: 強力なパスワードに変更
3. `EXPO_PUBLIC_RAKUTEN_APP_ID`: 自分のAPIキーを使用
4. `.env`ファイルは絶対にGitにコミットしない（`.gitignore`で除外済み）

---

## 開発環境の起動手順（完全版）

```bash
# 1. PostgreSQLを起動（Docker使用時）
docker-compose up -d

# 2. Node.jsバックエンドを起動
cd backend
npm install
npm run dev
# → http://localhost:3001 で起動

# 3. Python AI APIを起動（別ターミナル）
cd backend/ai_research
pip install -r requirements.txt
python api_server_hybrid.py
# → http://0.0.0.0:8001 で起動

# 4. Expoフロントエンドを起動（別ターミナル）
cd /path/to/tumerundesu
npm install
npm start
# → http://localhost:8081 で起動
# Expo Goアプリでスキャンして実機テスト
```

---

## 各APIキーの取得方法

### 楽天レシピAPI
1. [楽天RapidAPI](https://rapidapi.com/auth/sign-up)でアカウント作成
2. 楽天レシピAPIを検索してサブスクライブ
3. アプリIDをコピーして`EXPO_PUBLIC_RAKUTEN_APP_ID`に設定

### OpenWeatherMap API
1. [OpenWeatherMap](https://openweathermap.org/api)にアクセス
2. アカウントを作成してサインイン
3. API keysページで新しいキーを生成
4. キーをコピーして`OPENWEATHER_API_KEY`に設定
5. 無料プランでは1000回/日まで、1分60回までのリクエストが可能

**注意**: APIキーは発行後、有効になるまで数分～最大2時間かかる場合があります。

---

## 本番環境への移行

本番環境では、環境変数を以下のように設定してください：

```bash
# フロントエンド
EXPO_PUBLIC_API_URL=https://api.your-domain.com/api
EXPO_PUBLIC_AI_DETECTION_URL=https://ai.your-domain.com
OPENWEATHER_API_KEY=your_openweathermap_api_key

# バックエンド
NODE_ENV=production
DB_HOST=production-db-host
JWT_SECRET=<strong-random-secret>

# AI API
HOST=0.0.0.0
PORT=8001
```

HTTPS化、ドメイン設定、SSL証明書の設定も忘れずに行ってください。
