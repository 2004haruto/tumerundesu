// src/routes/favorites.ts
import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();


import { DatabaseService } from '../config/database';
import { Favorite } from '../types';

import { fetchRakutenRecipe } from '../services/rakutenRecipeApi';

// お気に入り一覧取得（ユーザーごと）
router.get('/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: 'Invalid userId' });
    return;
  }
  try {
    const [rows] = await DatabaseService.query<Favorite[]>(
        `SELECT f.id, f.menu_id, f.title, f.image_url, f.calories, f.description, f.ingredients, f.steps, f.created_at,
                m.id AS menu_exists
         FROM favorites f
         LEFT JOIN menus m ON f.menu_id = m.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(rows);
    return;
  } catch (err) {
    res.status(500).json({ error: 'DB error', details: err });
    return;
  }
});

// お気に入り追加
router.post('/', async (req: Request, res: Response) => {
  const { user_id, menu_id, title, image_url, calories, description } = req.body;
  let { ingredients, steps } = req.body;
  // ingredients, stepsが配列やオブジェクトなら必ずJSON文字列で保存。空やnullは[]
  if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
    ingredients = JSON.stringify([]);
  } else if (typeof ingredients !== 'string') {
    ingredients = JSON.stringify(ingredients);
  }
  if (!steps || (Array.isArray(steps) && steps.length === 0)) {
    steps = JSON.stringify([]);
  } else if (typeof steps !== 'string') {
    steps = JSON.stringify(steps);
  }
  if (!user_id || !menu_id) {
    res.status(400).json({ error: 'user_id and menu_id required' });
    return;
  }
  try {
    // menu_idがmenusテーブルに存在しなければ仮登録
    const [menuRows] = await DatabaseService.query<any[]>(
      'SELECT id FROM menus WHERE id = ?',
      [menu_id]
    );
    if (menuRows.length === 0) {
      // 仮登録: 楽天レシピIDなどもmenusに保存
      await DatabaseService.query(
        `INSERT INTO menus (id, title, image_url, calories, description, created_by_ai)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [menu_id, title || '', image_url || '', calories || null, description || null]
      );
    }

    // 重複チェック
    const [exists] = await DatabaseService.query<any[]>(
      'SELECT id FROM favorites WHERE user_id = ? AND menu_id = ?',
      [user_id, menu_id]
    );
    if (exists.length > 0) {
      res.status(409).json({ error: 'Already favorited' });
      return;
    }
    await DatabaseService.query(
      `INSERT INTO favorites (user_id, menu_id, title, image_url, calories, description, ingredients, steps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, menu_id, title || null, image_url || null, calories || null, description || null, ingredients, steps]
    );
    res.json({ success: true });
    return;
  } catch (err) {
    res.status(500).json({ error: 'DB error', details: err });
    return;
  }
});

// お気に入り削除
router.delete('/', async (req: Request, res: Response) => {
  const { user_id, menu_id } = req.body;
  if (!user_id || !menu_id) {
    res.status(400).json({ error: 'user_id and menu_id required' });
    return;
  }
  try {
    await DatabaseService.query(
      'DELETE FROM favorites WHERE user_id = ? AND menu_id = ?',
      [user_id, menu_id]
    );
    res.json({ success: true });
    return;
  } catch (err) {
    res.status(500).json({ error: 'DB error', details: err });
    return;
  }
});

export default router;

// menu_idリストから楽天レシピ詳細をまとめて取得
router.post('/details', async (req: Request, res: Response) => {
  const { menu_ids } = req.body;
  if (!Array.isArray(menu_ids) || menu_ids.length === 0) {
    res.status(400).json({ error: 'menu_ids(array) required' });
    return;
  }
  try {
    // 並列で楽天レシピAPIを叩く
    const results = await Promise.all(menu_ids.map(async (id) => {
      try {
        const detail = await fetchRakutenRecipe(id);
        return { menu_id: id, ...detail };
      } catch (e) {
        return { menu_id: id, error: String(e) };
      }
    }));
    console.log('楽天レシピAPI取得結果:', results);
    res.json(results);
  } catch (err) {
    console.error('楽天レシピAPIエラー:', err);
    res.status(500).json({ error: 'API error', details: err });
  }
});