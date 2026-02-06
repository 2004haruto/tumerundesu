# 🐳 Docker起動ガイド

## 📋 概要

このプロジェクトは以下のサービスをDockerで起動します：

- **MySQL** (ポート3309) - データベース
- **Node.js Backend** (ポート3001) - メインAPI
- **Python AI Detection** (ポート8001) - AI弁当箱検出API
- **phpMyAdmin** (ポート8080) - データベース管理

---

## 🚀 クイックスタート

### 1. Dockerサービスを起動

```powershell
# すべてのサービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f ai_detection
```

### 2. 起動確認

各サービスが起動したことを確認：

```powershell
# コンテナ一覧
docker-compose ps

# AI検出APIのヘルスチェック
curl http://localhost:8001/health

# または、ブラウザで確認
# http://localhost:8001 - AI検出API
# http://localhost:8001/docs - API ドキュメント（Swagger UI）
# http://localhost:3001 - Node.js Backend
# http://localhost:8080 - phpMyAdmin
```

### 3. Expoアプリを起動

```powershell
# プロジェクトルートで
npm start
```

---

## 🔧 実機（スマホ）で開発する場合

### IPアドレスの確認

**Windows:**
```powershell
ipconfig
# IPv4 Address を確認（例: 192.168.1.100）
```

**Mac/Linux:**
```bash
ifconfig
# inet アドレスを確認
```

### .env ファイルを更新

`.env`ファイルを開いて、PCのIPアドレスに変更：

```env
# 例: PCのIPが 192.168.1.100 の場合
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001/api
EXPO_PUBLIC_AI_DETECTION_URL=http://192.168.1.100:8001
```

### ファイアウォール設定

Windows Defenderファイアウォールで以下のポートを開放：
- 3001 (Node.js Backend)
- 8001 (AI Detection)
- 8081 (Expo Metro Bundler)

---

## 📱 エミュレーター/シミュレーターの場合

### Android エミュレーター

```env
# Android エミュレーターから localhost にアクセスする場合
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
EXPO_PUBLIC_AI_DETECTION_URL=http://10.0.2.2:8001
```

### iOS シミュレーター

```env
# iOS シミュレーターは localhost でOK
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_AI_DETECTION_URL=http://localhost:8001
```

---

## 🛠️ Docker コマンド

### サービス管理

```powershell
# すべてのサービスを起動（バックグラウンド）
docker-compose up -d

# すべてのサービスを停止
docker-compose down

# すべてのサービスを停止（ボリュームも削除）
docker-compose down -v

# サービスを再起動
docker-compose restart

# 特定のサービスのみ再起動
docker-compose restart ai_detection
```

### ログ確認

```powershell
# すべてのログを表示
docker-compose logs -f

# AI検出サービスのログのみ
docker-compose logs -f ai_detection

# 最新100行のログ
docker-compose logs --tail=100 ai_detection
```

### コンテナに入る

```powershell
# AI検出コンテナに入る
docker-compose exec ai_detection bash

# Node.jsコンテナに入る
docker-compose exec backend sh
```

### イメージ再ビルド

```powershell
# すべてのイメージを再ビルド
docker-compose build

# AI検出サービスのみ再ビルド
docker-compose build ai_detection

# キャッシュを使わずに再ビルド
docker-compose build --no-cache ai_detection
```

---

## 🧪 AI検出のテスト

### 1. ヘルスチェック

```powershell
curl http://localhost:8001/health
```

### 2. テスト画像で検出

**PowerShell:**
```powershell
# コンテナ内でテストスクリプト実行
docker-compose exec ai_detection python test_detection.py
```

### 3. APIドキュメント確認

ブラウザで開く：
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

---

## 📊 各モードの使い方

### ハイブリッドモード（フロントエンド推奨）
アプリから自動的に使用されます。

### OpenCV単体モード（ターミナル）
```powershell
# コンテナ内で実行
docker-compose exec ai_detection python -c "
from detector import BentoBoxDetector
detector = BentoBoxDetector()
result = detector.detect('test.jpg', mode='opencv')
print(f'信頼度: {result.confidence}')
"
```

### YOLO単体モード（YOLOモデルが必要）
```powershell
# YOLOモデルを配置後
docker-compose exec ai_detection python -c "
from detector import BentoBoxDetector
detector = BentoBoxDetector(
    yolo_weights_path='./models/yolov3.weights',
    yolo_config_path='./models/yolov3.cfg'
)
result = detector.detect('test.jpg', mode='yolo')
print(f'信頼度: {result.confidence}')
"
```

---

## 🗂️ YOLOモデルの配置（オプション）

YOLOを使用する場合：

1. YOLOモデルをダウンロード
   - [YOLOv3 Weights](https://pjreddie.com/media/files/yolov3.weights)
   - [YOLOv3 Config](https://github.com/pjreddie/darknet/blob/master/cfg/yolov3.cfg)

2. `backend/ai_research/models/` に配置
   ```
   backend/ai_research/models/
   ├── yolov3.weights
   └── yolov3.cfg
   ```

3. docker-compose.ymlの環境変数を更新
   ```yaml
   environment:
     YOLO_WEIGHTS_PATH: /app/models/yolov3.weights
     YOLO_CONFIG_PATH: /app/models/yolov3.cfg
   ```

4. サービスを再起動
   ```powershell
   docker-compose restart ai_detection
   ```

---

## 🐛 トラブルシューティング

### ポートが既に使用されている

```powershell
# ポートを使用しているプロセスを確認
netstat -ano | findstr :8001

# プロセスを終了
taskkill /PID <プロセスID> /F
```

### コンテナが起動しない

```powershell
# ログを確認
docker-compose logs ai_detection

# コンテナを削除して再作成
docker-compose down
docker-compose up -d --force-recreate
```

### OpenCVのエラー

```powershell
# コンテナを再ビルド（システムライブラリを再インストール）
docker-compose build --no-cache ai_detection
docker-compose up -d ai_detection
```

### 実機からアクセスできない

1. PCとスマホが同じWiFiに接続されているか確認
2. ファイアウォールでポート8001が開いているか確認
3. `.env`のIPアドレスが正しいか確認

---

## 📝 開発時のTips

### ホットリロード

`docker-compose.yml`でボリュームマウントしているため、コードを変更すると自動的に反映されます。

### ログの監視

```powershell
# AI検出サービスのログを常時監視
docker-compose logs -f ai_detection
```

### データベースのリセット

```powershell
# データベースを完全にリセット
docker-compose down -v
docker-compose up -d
```

---

## 🎯 まとめ

```powershell
# 1. Docker起動
docker-compose up -d

# 2. 起動確認
docker-compose ps
curl http://localhost:8001/health

# 3. Expoアプリ起動
npm start

# 4. アプリからAI検出機能を使用 ✨
```

詳細なAPI仕様は http://localhost:8001/docs を参照してください。
