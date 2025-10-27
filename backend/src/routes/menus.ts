// src/routes/menus.ts
import express, { NextFunction, Request, Response, Router } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../config/database';
import {
  Menu,
  MenuItem,
  MenuWithItems,
  PaginatedResponse,
  PaginationQuery
} from '../types';

const router: Router = express.Router();

// メニュー一覧取得
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '10', difficulty }: PaginationQuery & { difficulty?: string } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT 
        m.id, m.title, m.description, m.image_url, m.calories,
        m.created_by_ai, m.created_at, m.updated_at,
        COUNT(f.id) as favorite_count
      FROM menus m
      LEFT JOIN favorites f ON m.id = f.menu_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const params = [limitNum, offset];
    const [menus] = await DatabaseService.query<RowDataPacket[]>(query, params);
    
    // 総数を取得
    const countQuery = 'SELECT COUNT(*) as total FROM menus';
    const [countResult] = await DatabaseService.query<RowDataPacket[]>(countQuery);
    const total = countResult[0].total;
    
    const response: PaginatedResponse<any> = {
      data: menus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// 特定メニュー詳細取得
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // メニュー基本情報
    const [menus] = await DatabaseService.query<RowDataPacket[]>(`
      SELECT * FROM menus WHERE id = ?
    `, [id]);
    
    if (menus.length === 0) {
      res.status(404).json({ error: 'Menu not found' });
      return;
    }
    
    const menu = menus[0];
    
    // メニュー項目情報
    const [items] = await DatabaseService.query<RowDataPacket[]>(`
      SELECT 
        id, menu_id, name, category, ingredients, nutrition_json, notes, created_at
      FROM menu_items
      WHERE menu_id = ?
      ORDER BY category, name
    `, [id]);
    
    const menuWithItems: MenuWithItems = {
      ...(menu as Menu),
      items: items as MenuItem[]
    };

    res.json(menuWithItems);
  } catch (error) {
    next(error);
  }
});

// 人気メニュー取得
router.get('/popular/ranking', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = '5' } = req.query;
    const limitNum = parseInt(limit as string);
    
    const [menus] = await DatabaseService.query<RowDataPacket[]>(`
      SELECT 
        m.id, m.name, m.description, m.image_url, m.total_calories,
        m.prep_time_minutes, m.difficulty_level,
        COUNT(f.id) as favorite_count,
        AVG(CASE 
          WHEN r.rating = 'satisfied' THEN 5 
          WHEN r.rating = 'normal' THEN 3 
          WHEN r.rating = 'dissatisfied' THEN 1 
          ELSE 3 END) as avg_rating
      FROM menus m
      LEFT JOIN favorites f ON m.id = f.menu_id
      LEFT JOIN menu_reviews r ON m.id = r.menu_id
      WHERE m.is_active = TRUE
      GROUP BY m.id
      ORDER BY favorite_count DESC, avg_rating DESC
      LIMIT ?
    `, [limitNum]);
    
    res.json(menus);
  } catch (error) {
    next(error);
  }
});

// おすすめメニュー（カロリー別）
router.get('/recommendations/by-calories', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { maxCalories = '600', limit = '3' } = req.query;
    const maxCaloriesNum = parseInt(maxCalories as string);
    const limitNum = parseInt(limit as string);
    
    const [menus] = await DatabaseService.query<RowDataPacket[]>(`
      SELECT 
        m.id, m.name, m.description, m.image_url, m.total_calories,
        m.prep_time_minutes, m.difficulty_level
      FROM menus m
      WHERE m.is_active = TRUE AND m.total_calories <= ?
      ORDER BY RAND()
      LIMIT ?
    `, [maxCaloriesNum, limitNum]);
    
    res.json(menus);
  } catch (error) {
    next(error);
  }
});

export default router;