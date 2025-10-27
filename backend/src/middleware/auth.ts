// src/middleware/auth.ts
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: '認証トークンが必要です' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: '認証トークンが必要です' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    (req as AuthRequest).user = decoded;
    
    next();
  } catch (error) {
    console.error('認証エラー:', error);
    res.status(401).json({ error: '無効な認証トークンです' });
  }
};
