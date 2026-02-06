
// 環境変数の読み込みは最優先で行う
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// ルートのインポート
import authRoutes from './routes/auth'; // MySQL使用
import favoritesRoutes from './routes/favorites';
import menusRoutes from './routes/menus';
import nutritionRoutes from './routes/nutrition'; // 栄養API有効化
import rakutenRecipesRoutes from './routes/rakutenRecipes';
import reviewsRoutes from './routes/reviews';
import shoppingListsRoutes from './routes/shoppingLists';
// import usersRoutes from './routes/users-mock'; // モック使用（開発用）
import usersRoutes from './routes/users'; // MySQL使用（本格運用時）

// 環境変数の読み込み
dotenv.config();

// 型定義
interface CustomError extends Error {
  status?: number;
  isJoi?: boolean;
  details?: any[];
  code?: string;
}

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3001');

// セキュリティミドルウェア
app.use(helmet());
// 開発環境ではCORSを完全にオープンに
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: [
      'http://localhost:8081', // Expo開発サーバー（デフォルト）
      'http://localhost:8082', // Expo開発サーバー（代替ポート）
      'http://10.108.0.146:8081', // Expo開発サーバー（IPアドレス）
      'http://10.108.0.146:8082'  // Expo開発サーバー（IPアドレス + 代替ポート）
    ],
    credentials: true
  }));
} else {
  // 開発環境では全てのオリジンを許可
  app.use(cors({
    origin: true,
    credentials: true
  }));
}

// レート制限（開発環境では緩和）
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 開発：1000リクエスト/分、本番：100リクエスト/15分
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 本番環境のみレート制限を適用
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
} else {
  console.log('⚠️  Rate limiting disabled for development');
}

// 簡潔なリクエストログ（開発環境のみ）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📡 ${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
    console.log('🔍 Raw request body (before JSON parsing):', req.body);
    console.log('📦 Content-Type:', req.headers['content-type']);
    next();
  });
}

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JSONパース後のデバッグログ
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'PUT' || req.method === 'POST') {
      console.log('📋 Parsed request body (after JSON parsing):', req.body);
    }
    next();
  });
}

// ヘルスチェック
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Tumerundesu Backend API (TypeScript)',
    version: '1.0.0'
  });
});

// APIルート
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/menus', menusRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/shopping-lists', shoppingListsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/nutrition', nutritionRoutes); // 栄養API有効化
app.use('/api/rakuten-recipes', rakutenRecipesRoutes);

// 404エラーハンドラ
app.use('*', (req: Request, res: Response): void => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found` 
  });
});

// グローバルエラーハンドラ
app.use((err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err);
  
  // バリデーションエラー
  if (err.isJoi) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.details?.map((detail: any) => detail.message) || []
    });
    return;
  }
  
  // MySQLエラー
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        res.status(409).json({ error: 'Duplicate entry' });
        return;
      case 'ER_NO_SUCH_TABLE':
        res.status(500).json({ error: 'Database table not found' });
        return;
      default:
        console.error('MySQL Error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
    }
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// データベース接続をテスト
import db from './config/database';

async function startServer(): Promise<void> {
  try {
    // データベース接続をテスト
    await db.query('SELECT 1');
    console.log('✅ Database connection successful!');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`💻 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔧 TypeScript Backend Ready!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  db.end();
  console.log('💾 Database connection closed');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  db.end();
  console.log('💾 Database connection closed');
  process.exit(0);
});