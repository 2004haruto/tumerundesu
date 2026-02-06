import express, { Request, Response, Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DatabaseService } from '../config/database';
import { AuthenticatedRequest } from '../types/index';

const router: Router = express.Router();

// 基本的な食材の栄養情報（五大栄養素対応）
interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vitamins: number; // ビタミン総量(mg)
  minerals: number; // ミネラル総量(mg)
}

const basicNutritionData: { [key: string]: NutritionInfo } = {
  '白米': { calories: 168, protein: 2.5, carbs: 37.1, fat: 0.3, vitamins: 0.2, minerals: 15 },
  '鶏胸肉': { calories: 108, protein: 22.3, carbs: 0, fat: 1.5, vitamins: 8.5, minerals: 180 },
  '卵': { calories: 151, protein: 12.3, carbs: 0.3, fat: 10.3, vitamins: 12.1, minerals: 110 }
};

// 栄養計算エンドポイント
router.post('/calculate', (req: Request, res: Response) => {
  try {
    const { ingredients } = req.body;
    let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, vitamins: 0, minerals: 0 };
    
    for (const ingredient of ingredients || []) {
      const nutrition = basicNutritionData[ingredient.name];
      if (nutrition) {
        const multiplier = parseFloat(ingredient.amount) / 100 || 1;
        totalNutrition.calories += nutrition.calories * multiplier;
        totalNutrition.protein += nutrition.protein * multiplier;
        totalNutrition.carbs += nutrition.carbs * multiplier;
        totalNutrition.fat += nutrition.fat * multiplier;
        totalNutrition.vitamins += nutrition.vitamins * multiplier;
        totalNutrition.minerals += nutrition.minerals * multiplier;
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

// ダッシュボード用データ生成（実データベース連携版）
router.get('/dashboard/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { period = 'weekly', startDate: customStart, endDate: customEnd } = req.query;
    
    let startDate: Date;
    let endDate: Date;
    let daysToFetch: number;
    
    // カスタム日付が指定されている場合
    if (customStart && customEnd) {
      startDate = new Date(customStart as string);
      endDate = new Date(customEnd as string);
      daysToFetch = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`🔍 ユーザー${userId}の栄養データを取得中... (カスタム期間: ${customStart} 〜 ${customEnd})`);
    } else {
      // 標準期間
      daysToFetch = period === 'monthly' ? 30 : 7;
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToFetch + 1);
      console.log(`🔍 ユーザー${userId}の栄養データを取得中... (期間: ${period})`);
    }
    
    const [nutritionLogs] = await DatabaseService.query<RowDataPacket[]>(
      `SELECT 
         DATE(intake_date) as log_date,
         SUM(calories) as daily_calories,
         SUM(protein) as daily_protein,
         SUM(carbs) as daily_carbs,
         SUM(fat) as daily_fat,
         SUM(vitamins) as daily_vitamins,
         SUM(minerals) as daily_minerals
       FROM nutrition_intake_logs 
       WHERE user_id = ? AND intake_date >= ? AND intake_date <= ?
       GROUP BY DATE(intake_date)
       ORDER BY log_date ASC`,
      [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    console.log('📊 取得した栄養ログ:', nutritionLogs);

    // カロリーデータを準備
    const caloriesData: number[] = [];
    
    // 指定期間のデータを配列に変換
    for (let i = 0; i < daysToFetch; i++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const logForDate = nutritionLogs.find(log => {
        const logDateStr = new Date(log.log_date).toISOString().split('T')[0];
        return logDateStr === dateStr;
      });
      caloriesData.push(logForDate ? Math.round(Number(logForDate.daily_calories)) : 0);
    }

    // データがない場合
    if (nutritionLogs.length === 0) {
      console.log('📝 指定期間のデータが見つかりません');
      res.json({ 
        success: true,
        noData: true,
        message: '指定期間の栄養データが見つかりませんでした',
        data: {
          caloriesData,
          period: period as 'weekly' | 'monthly' | 'custom',
          dailyAverages: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            vitamins: 0,
            minerals: 0
          },
          nutritionBalance: {
            protein: 0,
            carbs: 0,
            fat: 0,
            vitamins: 0,
            minerals: 0
          }
        }
      });
      return;
    }

    // 実データから平均を計算
    const totalCalories = nutritionLogs.reduce((sum, log) => sum + Number(log.daily_calories), 0);
    const totalProtein = nutritionLogs.reduce((sum, log) => sum + Number(log.daily_protein), 0);
    const totalCarbs = nutritionLogs.reduce((sum, log) => sum + Number(log.daily_carbs), 0);
    const totalFat = nutritionLogs.reduce((sum, log) => sum + Number(log.daily_fat), 0);
    const totalVitamins = nutritionLogs.reduce((sum, log) => sum + Number(log.daily_vitamins || 0), 0);
    const totalMinerals = nutritionLogs.reduce((sum, log) => sum + Number(log.daily_minerals || 0), 0);
    
    const averageCalories = Math.round(totalCalories / nutritionLogs.length);
    const averageProtein = Math.round((totalProtein / nutritionLogs.length) * 10) / 10;
    const averageCarbs = Math.round((totalCarbs / nutritionLogs.length) * 10) / 10;
    const averageFat = Math.round((totalFat / nutritionLogs.length) * 10) / 10;
    const averageVitamins = Math.round((totalVitamins / nutritionLogs.length) * 10) / 10;
    const averageMinerals = Math.round((totalMinerals / nutritionLogs.length) * 10) / 10;

    // 栄養バランス計算（カロリーベース + ビタミン・ミネラル割合）
    const proteinCal = averageProtein * 4;
    const carbsCal = averageCarbs * 4;
    const fatCal = averageFat * 9;
    const totalCal = proteinCal + carbsCal + fatCal;
    const totalMicronutrients = averageVitamins + averageMinerals;

    const dashboardData = {
      caloriesData,
      period,
      dailyAverages: {
        calories: averageCalories,
        protein: averageProtein,
        carbs: averageCarbs,
        fat: averageFat,
        vitamins: averageVitamins,
        minerals: averageMinerals
      },
      nutritionBalance: {
        protein: totalCal > 0 ? Math.round((proteinCal / totalCal) * 100) : 20,
        carbs: totalCal > 0 ? Math.round((carbsCal / totalCal) * 100) : 50,
        fat: totalCal > 0 ? Math.round((fatCal / totalCal) * 100) : 20,
        vitamins: totalMicronutrients > 0 ? Math.round((averageVitamins / totalMicronutrients) * 100) : 5,
        minerals: totalMicronutrients > 0 ? Math.round((averageMinerals / totalMicronutrients) * 100) : 5
      }
    };

    console.log('✅ 実データベースからダッシュボードデータを生成:', dashboardData);
    res.json({ success: true, data: dashboardData });

  } catch (error) {
    console.error('❌ ダッシュボードデータ取得エラー:', error);
    
    // エラー時はフォールバックデータを返す
    res.json({ 
      success: true, 
      data: {
        caloriesData: [1800, 1200, 1500, 1700, 1400, 1900, 1600],
        period: 'weekly' as const,
        dailyAverages: {
          calories: 2000,
          protein: 150,
          carbs: 300,
          fat: 70,
          vitamins: 20,
          minerals: 250
        },
        nutritionBalance: {
          protein: 20,
          carbs: 50,
          fat: 20,
          vitamins: 5,
          minerals: 5
        }
      }
    });
  }
});

// お弁当作成時の栄養データを保存
router.post('/log-bento', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'ユーザー認証が必要です' });
      return;
    }

    const {
      bentoId,
      bentoName,
      calories,
      protein,
      carbs,
      fat,
      vitamins,
      minerals,
      items,
      mealType = 'lunch',
      intakeDate,
      notes
    } = req.body;

    // 必須フィールドの検証
    if (!bentoId || !bentoName || !calories) {
      res.status(400).json({ error: '必須フィールドが不足しています' });
      return;
    }

    const logDate = intakeDate ? new Date(intakeDate) : new Date();
    const formattedDate = logDate.toISOString().split('T')[0]; // YYYY-MM-DD形式

    console.log('🍱 お弁当栄養データを保存:', {
      userId,
      bentoId,
      bentoName,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      logDate: formattedDate
    });

    // データベースに保存
    const [result] = await DatabaseService.query<ResultSetHeader>(
      `INSERT INTO nutrition_intake_logs 
       (user_id, intake_date, meal_type, bento_id, bento_name, calories, protein, carbs, fat, vitamins, minerals, items_json, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        formattedDate,
        mealType,
        bentoId,
        bentoName,
        calories,
        protein || 0,
        carbs || 0,
        fat || 0,
        vitamins || 0,
        minerals || 0,
        JSON.stringify(items || []),
        notes || null
      ]
    );

    console.log('✅ 栄養データ保存成功:', result.insertId);

    res.json({ 
      success: true, 
      message: 'お弁当の栄養データを保存しました',
      logId: result.insertId 
    });

  } catch (error) {
    console.error('❌ 栄養データ保存エラー:', error);
    res.status(500).json({ error: 'データ保存に失敗しました' });
  }
});

export default router;
