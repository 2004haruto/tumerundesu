// src/services/nutritionService.ts
import { API_BASE_URL } from './api';

export interface DashboardData {
  caloriesData: number[];
  period: 'weekly' | 'monthly' | 'custom';
  dailyAverages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    vitamins: number;
    minerals: number;
  };
  nutritionBalance: {
    protein: number;
    carbs: number;
    fat: number;
    vitamins: number;
    minerals: number;
  };
}

export interface NutritionResponse {
  success: boolean;
  noData?: boolean;
  message?: string;
  data: DashboardData;
}

export class NutritionService {
  private static baseUrl = API_BASE_URL;

  /**
   * ユーザーのダッシュボード用栄養データを取得
   */
  static async getDashboardData(
    userId: string | number, 
    period: 'weekly' | 'monthly' | 'custom' = 'weekly',
    customStartDate?: string,
    customEndDate?: string
  ): Promise<DashboardData> {
    try {
      let url = `${this.baseUrl}/nutrition/dashboard/${userId}?period=${period}`;
      
      // カスタム日付が指定されている場合
      if (customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
        console.log('🔍 Fetching nutrition dashboard data for user:', userId, 'custom period:', customStartDate, '~', customEndDate);
      } else {
        console.log('🔍 Fetching nutrition dashboard data for user:', userId, 'period:', period);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: NutritionResponse = await response.json();
      
      if (!result.success) {
        throw new Error('API returned success: false');
      }

      if (result.noData) {
        console.log('⚠️ No data found for the specified period');
      } else {
        console.log('✅ Nutrition dashboard data fetched successfully:', result.data);
      }
      
      return result.data;

    } catch (error) {
      console.error('❌ Failed to fetch nutrition dashboard data:', error);
      // フォールバック（ダミーデータ）
      return this.getFallbackData();
    }
  }

  /**
   * フォールバックデータ（オフライン時やエラー時）
   */
  private static getFallbackData(): DashboardData {
    return {
      caloriesData: [1800, 1200, 1500, 1700, 1400, 1900, 1600],
      period: 'weekly',
      dailyAverages: {
        calories: 2000,
        protein: 150,
        carbs: 300,
        fat: 70,
        vitamins: 20,
        minerals: 250,
      },
      nutritionBalance: {
        protein: 20,
        carbs: 50,
        fat: 20,
        vitamins: 5,
        minerals: 5,
      },
    };
  }

  /**
   * 栄養計算（材料から）
   */
  static async calculateNutrition(ingredients: Array<{ name: string; amount: string }>): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/nutrition/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      return result.nutrition;

    } catch (error) {
      console.error('❌ Failed to calculate nutrition:', error);
      throw error;
    }
  }

  /**
   * お弁当作成時の栄養データをDBに保存
   */
  static async logBentoNutrition(bentoData: {
    bentoId: string;
    bentoName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    items: any[];
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    intakeDate?: string;
    notes?: string;
  }): Promise<boolean> {
    try {
      console.log('🍱 お弁当栄養データを保存中:', bentoData);
      
      const response = await fetch(`${this.baseUrl}/nutrition/log-bento`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 認証が必要な場合はトークンを追加
        },
        body: JSON.stringify({
          bentoId: bentoData.bentoId,
          bentoName: bentoData.bentoName,
          calories: bentoData.calories,
          protein: bentoData.protein,
          carbs: bentoData.carbs,
          fat: bentoData.fat,
          items: bentoData.items,
          mealType: bentoData.mealType || 'lunch',
          intakeDate: bentoData.intakeDate || new Date().toISOString().split('T')[0],
          notes: bentoData.notes
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'データ保存に失敗しました');
      }

      console.log('✅ お弁当栄養データ保存成功:', result);
      return true;

    } catch (error) {
      console.error('❌ お弁当栄養データ保存エラー:', error);
      return false;
    }
  }
}