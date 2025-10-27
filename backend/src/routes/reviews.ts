// src/routes/reviews.ts
import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// レビュー
router.get('/', (req: Request, res: Response): void => {
  res.json({ 
    message: 'Reviews endpoint - coming soon',
    version: 'TypeScript 1.0.0'
  });
});

export default router;