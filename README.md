# 🍱 Tumerundesu - お弁当管理アプリ

AI弁当箱検出機能を搭載したスマートなお弁当管理アプリケーション

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb)
![Expo](https://img.shields.io/badge/Expo-~54.0-000020)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933)
![Python](https://img.shields.io/badge/Python-3.10-3776ab)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)

---

## 📱 概要

Tumerundesuは、AI技術を活用して弁当箱を自動検出・計測し、栄養管理をサポートするモバイルアプリケーションです。

### ✨ 主な機能

- 🤖 **AI弁当箱検出**: YOLOv8とOpenCVによる高精度な弁当箱検出
- 📊 **栄養管理**: 食事の栄養情報を自動計算・記録
- 📷 **カメラ連携**: スマホカメラで簡単に弁当箱を撮影・分析
- 🌤️ **天気連携**: 天気に合わせたメニュー提案
- 📅 **カレンダー統合**: 予定に合わせた食事プラン
- 🔍 **レシピ検索**: 楽天レシピAPIを活用したレシピ提案
- ⭐ **お気に入り管理**: よく使うメニューを保存

---

## 🏗️ 技術スタック

### フロントエンド
- **React Native** (0.81.4) + **Expo** (~54.0)
- **TypeScript** (5.9)
- **React Navigation** (6.1)
- **Async Storage** (ローカルストレージ)

### バックエンド
- **Node.js** (18+) + **Express** (4.18)
- **TypeScript** (5.9)
- **MySQL** (8.0)
- **JWT認証**

### AI検出API
- **Python** (3.10) + **FastAPI**
- **YOLOv8** (Ultralytics)
- **OpenCV** (4.8)
- **PyTorch** (2.0)

### インフラ
- **Docker** + **Docker Compose**
- **phpMyAdmin**（DB管理）

---

## 🚀 クイックスタート

### 前提条件
- Node.js 18以上
- Docker Desktop
- npm 9以上

### 環境構築（3ステップ）

```powershell
# 1. リポジトリをクローン
git clone <repository-url>
cd tumerundesu

# 2. 依存関係をインストール
npm install

# 3. Dockerサービスを起動
.\start-all.bat  # Windows
# または
./start-all.sh   # Mac/Linux

# 4. Expoアプリを起動
npm start
```

**詳細な手順**: [SETUP_GUIDE.md](SETUP_GUIDE.md) を参照

---

## 📂 プロジェクト構造

```
tumerundesu/
├── src/                    # フロントエンドソースコード
│   ├── screens/            # 画面コンポーネント
│   ├── services/           # APIクライアント
│   ├── contexts/           # Reactコンテキスト
│   ├── types/              # TypeScript型定義
│   └── utils/              # ユーティリティ関数
│
├── backend/                # バックエンドAPI
│   ├── src/                # Node.js/Express ソースコード
│   ├── sql/                # データベース初期化SQL
│   └── ai_research/        # AI検出API (Python)
│       ├── detector.py     # 検出モジュール
│       ├── evaluator.py    # 評価モジュール
│       └── api_server.py   # FastAPIサーバー
│
├── ai_research_results/    # AI実験結果
│   ├── experiment_*/       # 各実験データ
│   ├── logs/               # 検出ログ
│   └── visualizations/     # グラフ・可視化
│
├── docker-compose.yml      # Docker設定
├── .env                    # 環境変数
└── docs/                   # ドキュメント
```

---

## 🐳 Docker サービス

プロジェクトは以下のサービスで構成されています：

| サービス | ポート | 説明 |
|----------|--------|------|
| **MySQL** | 3309 | データベース |
| **Backend API** | 3001 | Node.js RESTful API |
| **AI Detection API** | 8001 | Python FastAPI (YOLOv8) |
| **phpMyAdmin** | 8080 | DB管理ツール |

### サービス確認

```powershell
# すべてのコンテナ確認
docker-compose ps

# ヘルスチェック
curl http://localhost:3001/health
curl http://localhost:8001/health
```

---

## 🔧 開発コマンド

### 基本操作

```powershell
# 開発サーバー起動
npm start

# Dockerサービス起動
docker-compose up -d

# Dockerサービス停止
docker-compose down

# ログ確認
docker-compose logs -f
```

### テスト・デバッグ

```powershell
# AI検出テスト
docker-compose exec ai_detection python test_detection.py

# バックエンドテスト
docker-compose exec backend npm test

# データベース接続
docker-compose exec mysql mysql -u root -p tumerundesu_db
```

**詳細なコマンド**: [COMMANDS_LOG.md](COMMANDS_LOG.md) を参照

---

## 📊 AI検出機能

### 3つの検出モード

1. **OpenCV単体**: エッジ検出ベース（超高速）
2. **YOLO単体**: 深層学習ベース（高精度）
3. **Hybrid**: YOLO + OpenCV併用（推奨・最高精度）

### API使用例

```bash
# 画像をアップロードして検出
curl -X POST "http://localhost:8001/detect/upload" \
  -F "file=@bento.jpg" \
  -F "detection_mode=hybrid"

# Base64エンコードで検出
curl -X POST "http://localhost:8001/detect/base64" \
  -H "Content-Type: application/json" \
  -d '{"image_base64":"...","detection_mode":"hybrid"}'
```

### API ドキュメント

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

---

## 🧪 研究機能

このプロジェクトには、AI検出精度の研究・評価機能が統合されています。

### 実験の実行

```powershell
# 評価実行
docker-compose exec ai_detection python evaluator.py

# グラフ生成
docker-compose exec ai_detection python plot_results.py
```

### 実験結果

22回分の実験データが記録されており、各実験フォルダには以下が含まれます：

- 検出ログ（JSON）
- 評価メトリクス（CSV）
- 可視化グラフ（PNG）
- 実験メタデータ（YAML）

```
ai_research_results/
├── experiment_001_ゼミ実験2回目/
├── experiment_002_ゼミ実験3回目/
├── ...
└── experiment_022_ゼミ実験22回目/
```

---

## 🌐 外部API連携

### 必要なAPIキー

1. **楽天レシピAPI**
   - https://webservice.rakuten.co.jp/
   - レシピ検索機能で使用

2. **OpenWeatherMap API**
   - https://openweathermap.org/api
   - 天気情報取得で使用

### 設定方法

`.env` ファイルに追加：

```env
EXPO_PUBLIC_RAKUTEN_APP_ID=your_app_id_here
OPENWEATHER_API_KEY=your_api_key_here
```

詳細: [docs/environment-variables-guide.md](docs/environment-variables-guide.md)

---

## 📱 実機テスト

### Android / iOS 実機での開発

1. PCのIPアドレスを確認
   ```powershell
   ipconfig  # Windows
   ```

2. `.env` ファイルを更新
   ```env
   EXPO_PUBLIC_API_URL=http://<your-pc-ip>:3001/api
   EXPO_PUBLIC_AI_DETECTION_URL=http://<your-pc-ip>:8001
   ```

3. Expo Go アプリでQRコードをスキャン
   ```powershell
   npm start
   ```

詳細: [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### ポート競合エラー

```powershell
# ポート使用状況確認
netstat -ano | findstr :3001

# プロセス終了（管理者権限）
taskkill /PID <PID> /F
```

#### Dockerコンテナが起動しない

```powershell
# クリーンアップと再ビルド
docker-compose down -v
docker-compose up -d --build
```

#### Expoキャッシュエラー

```powershell
# キャッシュクリア
npx expo start -c
```

**詳細**: [SETUP_GUIDE.md#トラブルシューティング](SETUP_GUIDE.md#-トラブルシューティング)

---

## 📚 ドキュメント

| ファイル | 説明 |
|----------|------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | 環境構築の詳細ガイド |
| [COMMANDS_LOG.md](COMMANDS_LOG.md) | 実行コマンド履歴・開発メモ |
| [DOCKER_SETUP.md](DOCKER_SETUP.md) | Docker起動ガイド |
| [docs/environment-variables-guide.md](docs/environment-variables-guide.md) | 環境変数設定ガイド |
| [backend/README.md](backend/README.md) | バックエンドAPI仕様 |
| [backend/ai_research/README.md](backend/ai_research/README.md) | AI検出API詳細 |

---

## 🤝 開発への参加

### ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 新機能開発
- `hotfix/*`: 緊急修正

### コミットメッセージ規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・補助ツール関連
```

---

## 📄 ライセンス

MIT License

---

## 👤 作成者

- **プロジェクト**: Tumerundesu
- **バージョン**: 1.0.0
- **作成日**: 2026年2月9日

---

## 🙏 謝辞

- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- [YOLOv8](https://github.com/ultralytics/ultralytics)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Docker](https://www.docker.com/)

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. [トラブルシューティング](SETUP_GUIDE.md#-トラブルシューティング)
2. [よくある質問](docs/)
3. GitHub Issues でバグ報告

---

**Happy Coding! 🚀**
