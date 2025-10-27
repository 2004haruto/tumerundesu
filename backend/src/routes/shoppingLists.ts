// src/routes/shoppingLists.ts
import express, { Request, Response, Router } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router: Router = express.Router();

// 買い物リスト取得
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    
    const [items] = await pool.query(
      `SELECT id, item_name as name, quantity, category, recipe_name as recipeName, checked, created_at as createdAt
       FROM shopping_list_items 
       WHERE user_id = ? 
       ORDER BY checked ASC, created_at DESC`,
      [userId]
    );
    
    res.json({ items });
  } catch (error) {
    console.error('買い物リスト取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 買い物リストに材料追加
router.post('/items', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { items } = req.body;
    
    console.log('🛒 買い物リスト追加リクエスト - User ID:', userId);
    console.log('📦 追加する材料:', items);
    
    if (!items || !Array.isArray(items)) {
      console.error('❌ 材料データが不正:', items);
      res.status(400).json({ error: '材料データが不正です' });
      return;
    }
    
    // 複数の材料を一括追加
    const values = items.map((item: any) => [
      userId,
      item.name,
      item.quantity,
      item.category || '未分類',
      item.recipeName || '未設定',
      false
    ]);
    
    console.log('💾 データベースに挿入する値:', values);
    
    const [result] = await pool.query(
      `INSERT INTO shopping_list_items (user_id, item_name, quantity, category, recipe_name, checked) 
       VALUES ?`,
      [values]
    );
    
    console.log('✅ データベース挿入成功:', result);
    
    // 追加後のリストを返す
    const [updatedItems] = await pool.query(
      `SELECT id, item_name as name, quantity, category, recipe_name as recipeName, checked, created_at as createdAt
       FROM shopping_list_items 
       WHERE user_id = ? 
       ORDER BY checked ASC, created_at DESC`,
      [userId]
    );
    
    console.log(`✨ ${items.length}個の材料を追加しました。現在のリスト件数:`, (updatedItems as any[]).length);
    
    res.json({ 
      message: `${items.length}個の材料を追加しました`,
      items: updatedItems 
    });
  } catch (error) {
    console.error('❌ 買い物リスト追加エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 買い物リストアイテム削除
router.delete('/items/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const itemId = parseInt(req.params.id);
    
    await pool.query(
      'DELETE FROM shopping_list_items WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );
    
    res.json({ message: 'アイテムを削除しました' });
  } catch (error) {
    console.error('買い物リスト削除エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 買い物リストアイテムの完了状態を切り替え
router.put('/items/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const itemId = parseInt(req.params.id);
    const { checked } = req.body;
    
    await pool.query(
      'UPDATE shopping_list_items SET checked = ? WHERE id = ? AND user_id = ?',
      [checked, itemId, userId]
    );
    
    res.json({ message: 'アイテムを更新しました' });
  } catch (error) {
    console.error('買い物リスト更新エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

export default router;