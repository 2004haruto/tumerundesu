import express, { Request, Response } from 'express';
import { RakutenRecipe } from '../types';

const router = express.Router();

// データベースクライアント（実際のプロジェクトではPrismaまたはmysql2を使用）
// 仮のデータベース操作関数
async function getRecipeFromCache(recipeId: string): Promise<RakutenRecipe | null> {
  // TODO: 実際のデータベースクエリを実装
  return null;
}

async function saveRecipeToCache(recipe: RakutenRecipe): Promise<void> {
  // TODO: 実際のデータベース保存を実装
}

async function getFavoriteRecipes(userId: number): Promise<RakutenRecipe[]> {
  // DBからお気に入りメニューを取得（menusとJOIN）
  const db = require('../config/database').default || require('../config/database');
  const [rows] = await db.query(
    `SELECT m.id, m.title, m.description, m.calories, m.image_url, m.created_by_ai, m.created_at, m.updated_at
     FROM favorites f
     JOIN menus m ON f.menu_id = m.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

async function addToFavorites(userId: number, recipeId: string): Promise<void> {
  // DBへお気に入りを追加（menusに存在しなければ楽天レシピAPIから本物の情報で自動登録）
  const db = require('../config/database').default || require('../config/database');
  // TypeScript版rakutenRecipeApiをimport
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fetchRakutenRecipe } = require('../services/rakutenRecipeApi');
  // 1. menusテーブルに該当IDがあるか確認
  const [menus] = await db.query('SELECT id FROM menus WHERE id = ?', [recipeId]);
  if (!menus || menus.length === 0) {
    // 2. なければ楽天レシピAPIから情報取得
    let recipeInfo = { title: '楽天レシピ', calories: 0, description: '', image_url: '' };
    try {
      recipeInfo = await fetchRakutenRecipe(recipeId);
    } catch (e) {
      // 失敗時はダミー値
    }
    await db.query(
      'INSERT INTO menus (id, title, description, calories, image_url, created_by_ai, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [recipeId, recipeInfo.title, recipeInfo.description, recipeInfo.calories, recipeInfo.image_url, 0]
    );
  }
  // 3. favoritesにINSERT
  await db.query(
    'INSERT INTO favorites (user_id, menu_id) VALUES (?, ?)',
    [userId, recipeId]
  );
}

async function removeFromFavorites(userId: number, recipeId: string): Promise<void> {
  // TODO: お気に入り削除を実装
}

// 楽天レシピ検索
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword, category, sort } = req.query;
    
    if (!keyword && !category) {
      return res.status(400).json({ error: 'キーワードまたはカテゴリが必要です' });
    }

    // 楽天レシピAPIを呼び出し（フロントエンドから直接呼び出す場合はスキップ）
    // 実際の実装では、サーバー側でAPIキーを管理し、レート制限を実装することを推奨
    
    return res.json({
      success: true,
      message: '楽天レシピAPIはフロントエンドから直接呼び出してください'
    });
  } catch (error) {
    console.error('楽天レシピ検索エラー:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
});

// レシピ詳細取得（キャッシュから）
router.get('/recipe/:recipeId', async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;
    
    // キャッシュからレシピを取得
    const cachedRecipe = await getRecipeFromCache(recipeId);
    
    if (cachedRecipe) {
      return res.json({
        success: true,
        recipe: cachedRecipe
      });
    }
    
    return res.status(404).json({ error: 'レシピが見つかりません' });
  } catch (error) {
    console.error('レシピ取得エラー:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
});

// レシピキャッシュ保存
router.post('/cache', async (req: Request, res: Response) => {
  try {
    const recipe: RakutenRecipe = req.body;
    
    // バリデーション
    if (!recipe.recipe_id || !recipe.title || !recipe.source_url) {
      return res.status(400).json({ error: '必須フィールドが不足しています' });
    }
    
    await saveRecipeToCache(recipe);
    
    return res.json({
      success: true,
      message: 'レシピをキャッシュに保存しました'
    });
  } catch (error) {
    console.error('レシピキャッシュ保存エラー:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
});

// お気に入りレシピ取得
router.get('/favorites/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: '無効なユーザーIDです' });
    }
    
    const favorites = await getFavoriteRecipes(userId);
    
    return res.json({
      success: true,
      favorites
    });
  } catch (error) {
    console.error('お気に入り取得エラー:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
});

// お気に入りに追加
router.post('/favorites', async (req: Request, res: Response) => {
  try {
    const { userId, recipeId } = req.body;
    
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'ユーザーIDとレシピIDが必要です' });
    }
    
    await addToFavorites(userId, recipeId);
    
    return res.json({
      success: true,
      message: 'お気に入りに追加しました'
    });
  } catch (error) {
    console.error('お気に入り追加エラー:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
});

// お気に入りから削除
router.delete('/favorites', async (req: Request, res: Response) => {
  try {
    const { userId, recipeId } = req.body;
    
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'ユーザーIDとレシピIDが必要です' });
    }
    
    await removeFromFavorites(userId, recipeId);
    
    return res.json({
      success: true,
      message: 'お気に入りから削除しました'
    });
  } catch (error) {
    console.error('お気に入り削除エラー:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
});

export default router;