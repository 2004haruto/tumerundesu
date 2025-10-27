import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

// 基本的な食材の栄養情報
interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const basicNutritionData: { [key: string]: NutritionInfo } = {
  '白米': { calories: 168, protein: 2.5, carbs: 37.1, fat: 0.3 },
  '鶏胸肉': { calories: 108, protein: 22.3, carbs: 0, fat: 1.5 },
  '卵': { calories: 151, protein: 12.3, carbs: 0.3, fat: 10.3 }
};

// 栄養計算エンドポイント
router.post('/calculate', (req: Request, res: Response) => {
  try {
    const { ingredients } = req.body;
    let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    for (const ingredient of ingredients || []) {
      const nutrition = basicNutritionData[ingredient.name];
      if (nutrition) {
        const multiplier = parseFloat(ingredient.amount) / 100 || 1;
        totalNutrition.calories += nutrition.calories * multiplier;
        totalNutrition.protein += nutrition.protein * multiplier;
        totalNutrition.carbs += nutrition.carbs * multiplier;
        totalNutrition.fat += nutrition.fat * multiplier;
      }
    }
    
    res.json({ success: true, nutrition: totalNutrition });
  } catch (error) {
    res.status(500).json({ error: 'エラーが発生しました' });
  }
});

// 食材データ取得
router.get('/ingredients', (req: Request, res: Response) => {
  res.json({ success: true, ingredients: basicNutritionData });
});

// 基本情報
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Nutrition API', version: '2.0.0' });
});

export default router;
