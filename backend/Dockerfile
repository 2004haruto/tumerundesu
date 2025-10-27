# Node.js 18 Alpine イメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# TypeScript設定ファイルをコピー
COPY tsconfig.json ./

# ソースコードをコピー
COPY src ./src

# TypeScriptビルド（本番環境用）
# RUN npm run build

# ポート3001を公開
EXPOSE 3001

# 開発モードで起動（TypeScript）
CMD ["npm", "run", "dev"]