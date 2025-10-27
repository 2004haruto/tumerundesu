// src/routes/users.ts
import bcrypt from 'bcryptjs';
import express, { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../config/database';

const router: Router = express.Router();

// JWT認証ミドルウェア
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔐 Authentication middleware called');
  console.log('📋 Request headers:', req.headers);
  console.log('📦 Request body before auth:', req.body);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('🎫 Token extracted:', token ? 'Present' : 'Missing');

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    console.log('✅ Token verified, user:', user);
    (req as any).user = user;
    next();
  });
};

// バリデーションスキーマ
const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  email: Joi.string().email().optional(),
  weight: Joi.number().min(1).max(500).optional(),
  goal_calories: Joi.number().min(500).max(10000).optional(),
  allergies: Joi.string().allow('').optional(),
  preferences: Joi.string().allow('').optional(),
  bento_box_size: Joi.string().allow('').optional(),
  activity_level: Joi.string().valid('low', 'mid', 'high').optional(),
  // お弁当サイズ設定
  bento_capacity: Joi.string().allow('').optional(),
  bento_width: Joi.string().allow('').optional(),
  bento_length: Joi.string().allow('').optional(),
  bento_height: Joi.string().allow('').optional(),
});

const passwordUpdateSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required(),
});

// プロフィール取得
router.get('/profile', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const [users] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id, name, email, weight, goal_calories, allergies, preferences, bento_box_size, activity_level, bento_capacity, bento_width, bento_length, bento_height FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = users[0];
    res.json({
      message: 'Profile retrieved successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        weight: user.weight,
        goal_calories: user.goal_calories,
        allergies: user.allergies,
        preferences: user.preferences,
        bento_box_size: user.bento_box_size,
        activity_level: user.activity_level,
        bento_capacity: user.bento_capacity,
        bento_width: user.bento_width,
        bento_length: user.bento_length,
        bento_height: user.bento_height,
      }
    });
  } catch (error) {
    next(error);
  }
});

// プロフィール更新
router.put('/profile', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('📝 Profile update request body:', req.body);
    
    const { error, value } = profileUpdateSchema.validate(req.body);
    console.log('✅ Validation result - value:', value);
    console.log('❌ Validation error:', error);
    
    if (error) {
      res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります。',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const userId = (req as any).user.userId;
    const updateData = value;
    
    console.log('👤 User ID:', userId);
    
    // 現在のユーザー情報を取得
    const [currentUsers] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    const currentUser = currentUsers[0];
    console.log('📋 Current user data:', currentUser);

    // メールアドレスが変更される場合、重複チェック
    if (updateData.email) {
      const [existing] = await DatabaseService.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updateData.email, userId]
      );
      
      if (existing.length > 0) {
        res.status(409).json({ 
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'このメールアドレスは既に使用されています。'
        });
        return;
      }
    }

    // 更新するフィールドを動的に構築
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    console.log('🔍 Processing updateData entries:');
    Object.entries(updateData).forEach(([key, value]) => {
      console.log(`  - ${key}: ${JSON.stringify(value)} (type: ${typeof value})`);
      const currentValue = currentUser[key];
      console.log(`    Current DB value: ${JSON.stringify(currentValue)}`);
      console.log(`    Values equal? ${value === currentValue}`);
      
      // undefined と null 以外は全て更新対象とする（空文字列も含む）
      // また、現在の値と違う場合のみ更新
      if (value !== undefined && value !== null && value !== currentValue) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });

    console.log('📊 Final updateFields:', updateFields);
    console.log('📊 Final updateValues:', updateValues);

    // 更新するフィールドがある場合のみUPDATEクエリを実行
    if (updateFields.length > 0) {
      updateValues.push(userId);

      await DatabaseService.query<ResultSetHeader>(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );
    } else {
      console.log('💡 No fields to update - profile already up to date');
    }

    // 更新後のユーザー情報を取得
    const [users] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id, name, email, weight, goal_calories, allergies, preferences, bento_box_size, activity_level, bento_capacity, bento_width, bento_length, bento_height FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        weight: user.weight,
        goal_calories: user.goal_calories,
        allergies: user.allergies,
        preferences: user.preferences,
        bento_box_size: user.bento_box_size,
        activity_level: user.activity_level,
        bento_capacity: user.bento_capacity,
        bento_width: user.bento_width,
        bento_length: user.bento_length,
        bento_height: user.bento_height,
      }
    });
  } catch (error) {
    next(error);
  }
});

// パスワード更新
router.put('/password', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = passwordUpdateSchema.validate(req.body);
    if (error) {
      res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります。',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const userId = (req as any).user.userId;
    const { current_password, new_password } = value;

    // 現在のパスワードを確認
    const [users] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = users[0];
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);

    if (!isCurrentPasswordValid) {
      res.status(401).json({ 
        error: 'INVALID_PASSWORD',
        message: '現在のパスワードが正しくありません。'
      });
      return;
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = await bcrypt.hash(new_password, 12);

    // パスワードを更新
    await DatabaseService.query<ResultSetHeader>(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// お弁当サイズ一覧取得
router.get('/bento-sizes', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    
    const [bentoSizes] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id, name, capacity, width, length, height, is_primary FROM user_bento_sizes WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC',
      [userId]
    );

    res.json({
      message: 'Bento sizes retrieved successfully',
      bentoSizes
    });
  } catch (error) {
    next(error);
  }
});

// お弁当サイズ保存/更新
router.post('/bento-sizes', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { bentoSizes } = req.body;

    if (!Array.isArray(bentoSizes) || bentoSizes.length === 0) {
      res.status(400).json({ error: 'お弁当サイズが指定されていません' });
      return;
    }

    // バリデーション
    const bentoSizeSchema = Joi.object({
      id: Joi.string().optional(),
      name: Joi.string().min(1).max(50).required(),
      capacity: Joi.string().allow('').optional(),
      width: Joi.string().allow('').optional(),
      length: Joi.string().allow('').optional(),
      height: Joi.string().allow('').optional(),
    });

    for (const bento of bentoSizes) {
      const { error } = bentoSizeSchema.validate(bento);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }
    }

    // 既存のお弁当サイズを削除
    await DatabaseService.query(
      'DELETE FROM user_bento_sizes WHERE user_id = ?',
      [userId]
    );

    // 新しいお弁当サイズを挿入
    for (let i = 0; i < bentoSizes.length; i++) {
      const bento = bentoSizes[i];
      const isPrimary = i === 0; // 最初のお弁当をメインとする

      await DatabaseService.query(
        'INSERT INTO user_bento_sizes (user_id, name, capacity, width, length, height, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, bento.name, bento.capacity || '', bento.width || '', bento.length || '', bento.height || '', isPrimary]
      );
    }

    // 更新後のお弁当サイズを取得
    const [updatedBentoSizes] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id, name, capacity, width, length, height, is_primary FROM user_bento_sizes WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC',
      [userId]
    );

    res.json({
      message: 'お弁当サイズを保存しました',
      bentoSizes: updatedBentoSizes
    });
  } catch (error) {
    next(error);
  }
});

export default router;