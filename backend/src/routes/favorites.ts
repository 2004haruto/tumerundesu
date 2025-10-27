// src/routes/favorites.ts
import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// お気に入り一覧
router.get('/', (req: Request, res: Response): void => {
  res.json({ 
    message: 'Favorites endpoint - coming soon',
    version: 'TypeScript 1.0.0'
  });
});

export default router;