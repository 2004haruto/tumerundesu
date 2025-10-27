# Tumerundesu Backend API

Node.js + Express + MySQL で構築されたお弁当アプリのバックエンドAPI

## 🚀 クイックスタート

### 前提条件
- Docker & Docker Compose がインストールされていること
- ポート 3001, 3306, 8080 が利用可能であること

### 開発環境起動

1. **Docker環境の起動**
```bash
# プロジェクトルートで実行
docker-compose up -d

# ログを確認
docker-compose logs -f backend
```

2. **サービス確認**
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health
- phpMyAdmin: http://localhost:8080 (ユーザー: app_user, パスワード: app_password)

### 🛠️ 開発

**依存関係の追加**
```bash
# backendコンテナ内で実行
docker-compose exec backend npm install <package-name>

# または、ローカルで追加後に再ビルド
docker-compose up -d --build backend
```

**ログの確認**
```bash
# 全サービス
docker-compose logs -f

# バックエンドのみ
docker-compose logs -f backend

# MySQLのみ
docker-compose logs -f mysql
```

**データベース接続**
```bash
# MySQLコンテナに接続
docker-compose exec mysql mysql -u app_user -p tumerundesu_db
# パスワード: app_password
```

### 📁 プロジェクト構造

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # データベース接続設定
│   ├── routes/
│   │   ├── auth.js           # 認証関連API
│   │   ├── menus.js          # メニュー関連API
│   │   ├── favorites.js      # お気に入りAPI
│   │   ├── shoppingLists.js  # ショッピングリストAPI
│   │   ├── reviews.js        # レビューAPI
│   │   └── nutrition.js      # 栄養情報API
│   └── index.js              # メインサーバーファイル
├── sql/
│   └── init.sql              # データベース初期化スクリプト
├── .env                      # 環境変数
├── .dockerignore
├── Dockerfile
└── package.json
```

### 🔌 API エンドポイント

**認証**
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/verify` - トークン検証

**メニュー**
- `GET /api/menus` - メニュー一覧
- `GET /api/menus/:id` - メニュー詳細
- `GET /api/menus/popular/ranking` - 人気メニュー
- `GET /api/menus/recommendations/by-calories` - カロリー別おすすめ

**その他**
- `GET /health` - ヘルスチェック
- 他のエンドポイントは開発中...

### 🗄️ データベース

**テーブル一覧**
- `users` - ユーザー情報
- `menus` - お弁当メニュー
- `ingredients` - 材料マスタ
- `menu_ingredients` - メニューと材料の関連
- `cooking_steps` - 調理手順
- `favorites` - お気に入り
- `shopping_lists` - ショッピングリスト
- `shopping_list_items` - ショッピングリストアイテム
- `menu_reviews` - メニュー評価
- `nutrition_logs` - 栄養ログ
- `proposal_history` - 提案履歴

### 🔧 環境変数

以下の環境変数が `.env` で設定可能です：

```env
# データベース
DB_HOST=mysql
DB_PORT=3306
DB_NAME=tumerundesu_db
DB_USER=app_user
DB_PASSWORD=app_password

# サーバー
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# その他
FRONTEND_URL=http://localhost:8081
```

### 🛑 開発環境停止

```bash
# コンテナ停止
docker-compose down

# データベースも削除する場合
docker-compose down -v
```

### 📝 開発メモ

1. **Hot Reload**: nodemon により、コード変更時に自動的にサーバーが再起動されます
2. **データベース永続化**: MySQL データは Docker volume で永続化されています
3. **セキュリティ**: JWT認証、bcryptによるパスワードハッシュ化、Rate Limiting を実装
4. **バリデーション**: Joi によるリクエストバリデーション
5. **エラーハンドリング**: 統一されたエラーレスポンス形式