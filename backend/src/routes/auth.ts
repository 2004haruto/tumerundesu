// src/routes/auth.ts
import bcrypt from 'bcryptjs';
import express, { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../config/database';
import {
  AuthResponse,
  JWTPayload,
  LoginRequest,
  RegisterRequest,
  User
} from '../types';

const router: Router = express.Router();

// バリデーションスキーマ
const registerSchema = Joi.object<RegisterRequest>({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  bento_box_size: Joi.string().optional(),
  allergies: Joi.string().optional(),
  preferences: Joi.string().optional(),
  goal_calories: Joi.number().optional(),
  weight: Joi.number().optional(),
  activity_level: Joi.string().valid('low', 'mid', 'high').optional(),
  region: Joi.string().optional()
});

const loginSchema = Joi.object<LoginRequest>({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// ユーザー登録
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw error;

    const { 
      name, 
      email, 
      password, 
      bento_box_size, 
      allergies, 
      preferences, 
      goal_calories, 
      weight, 
      activity_level, 
      region 
    }: RegisterRequest = value;

    // 既存ユーザーチェック
    const [existing] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );
    
    if (existing.length > 0) {
      res.status(409).json({ 
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'このメールアドレスは既に登録されています。ログインしてください。'
      });
      return;
    }

    // パスワードハッシュ化
    const passwordHash: string = await bcrypt.hash(password, 12);

    // ユーザー作成
    const [result] = await DatabaseService.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password, bento_box_size, allergies, preferences, goal_calories, weight, activity_level, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, bento_box_size, allergies, preferences, goal_calories, weight, activity_level, region]
    );

    // JWTトークン生成
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token: string = jwt.sign(
      { userId: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    const response: AuthResponse = {
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId!,
        name,
        email
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// ログイン
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw error;

    const { email, password }: LoginRequest = value;

    // ユーザー検索
    const [users] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id, name, email, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({ 
        error: 'USER_NOT_FOUND',
        message: 'このメールアドレスで登録されたアカウントが見つかりません。'
      });
      return;
    }

    const user = users[0] as User;

    // パスワード検証
    const isValidPassword: boolean = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ 
        error: 'INVALID_PASSWORD',
        message: 'パスワードが正しくありません。'
      });
      return;
    }

    // JWTトークン生成
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    const response: AuthResponse = {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// トークン検証
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const token: string | undefined = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    const [users] = await DatabaseService.query<RowDataPacket[]>(
      'SELECT id, email, username FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.json({
      valid: true,
      user: users[0]
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;