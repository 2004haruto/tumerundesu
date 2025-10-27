// src/services/bentoGenerator.ts - お弁当自動生成システム
import { ProcessedJapaneseRecipe } from './rakutenRecipeApi';

export interface BentoItem {
  recipe: ProcessedJapaneseRecipe;
  portion: number; // 0.3 = 30%, 0.7 = 70% など
  role: 'main' | 'side' | 'rice' | 'vegetable';
  adjustedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface GeneratedBento {
  id: string;
  name: string;
  description: string;
  items: BentoItem[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  bentoStyle: 'japanese' | 'western' | 'healthy' | 'balanced';
}

export class BentoGenerator {
  
  /**
   * 複数の料理からバランスの良いお弁当を自動生成
   */
  static generateBento(recipes: ProcessedJapaneseRecipe[], targetCalories: number = 600, preferredStyle?: 'japanese' | 'western' | 'healthy' | 'balanced'): GeneratedBento | null {
    if (recipes.length < 2) {
      console.log('🍱 お弁当生成には最低2つの料理が必要です');
      return null;
    }

    // 入力レシピの検証
    const validRecipes = recipes.filter(recipe => {
      const isValid = recipe && recipe.id && recipe.title && typeof recipe.id === 'string';
      if (!isValid) {
        console.warn('⚠️ 無効なレシピを除外:', recipe);
      }
      return isValid;
    });

    if (validRecipes.length < 2) {
      console.log('🍱 有効なレシピが不足しています');
      return null;
    }

    console.log(`🍱 有効なレシピ数: ${validRecipes.length}/${recipes.length}`);

    // 料理を役割別に分類
    const riceDishes = validRecipes.filter(r => this.isRiceDish(r));
    const mainDishes = validRecipes.filter(r => this.isMainDish(r) && !this.isRiceDish(r));
    const sideDishes = validRecipes.filter(r => this.isSideDish(r) && !this.isRiceDish(r));
    const vegetableDishes = validRecipes.filter(r => this.isVegetableDish(r) && !this.isRiceDish(r));
    const allOtherDishes = validRecipes.filter(r => !this.isMainDish(r) && !this.isSideDish(r) && !this.isVegetableDish(r) && !this.isRiceDish(r));

    // お弁当組み合わせの生成
    const bentoItems: BentoItem[] = [];
    let currentCalories = 0;
    
    // 1. メイン料理を選択（60-70%サイズ）
    if (mainDishes.length > 0) {
      const mainRecipe = mainDishes[Math.floor(Math.random() * mainDishes.length)];
      const portion = 0.6 + Math.random() * 0.1; // 60-70%のランダムサイズ
      const nutrition = this.adjustNutrition(this.estimateNutrition(mainRecipe), portion);
      bentoItems.push({
        recipe: mainRecipe,
        portion,
        role: 'main',
        adjustedNutrition: nutrition
      });
      currentCalories += nutrition.calories;
    } else if (riceDishes.length > 0) {
      // メイン料理がないが米料理がある場合（例：チャーハン、丼物など）
      const mainRecipe = riceDishes[Math.floor(Math.random() * riceDishes.length)];
      const portion = 0.8;
      const nutrition = this.adjustNutrition(this.estimateNutrition(mainRecipe), portion);
      bentoItems.push({
        recipe: mainRecipe,
        portion,
        role: 'main',
        adjustedNutrition: nutrition
      });
      currentCalories += nutrition.calories;
      // 米料理をメインにした場合は、後でご飯を追加しない
      riceDishes.splice(riceDishes.indexOf(mainRecipe), 1);
    } else if (allOtherDishes.length > 0) {
      // メイン料理がない場合は、他の料理をメインとして使用
      const mainRecipe = allOtherDishes[Math.floor(Math.random() * allOtherDishes.length)];
      const portion = 0.8;
      const nutrition = this.adjustNutrition(this.estimateNutrition(mainRecipe), portion);
      bentoItems.push({
        recipe: mainRecipe,
        portion,
        role: 'main',
        adjustedNutrition: nutrition
      });
      currentCalories += nutrition.calories;
    }

    // 2. サイド料理を1-2品選択（30-50%サイズ）
    const availableSides = [...sideDishes, ...allOtherDishes].filter(r => 
      r && r.id && !bentoItems.some(item => item.recipe && item.recipe.id === r.id)
    );
    
    const sideCount = Math.min(2, Math.max(1, availableSides.length));
    for (let i = 0; i < sideCount && availableSides.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableSides.length);
      const sideRecipe = availableSides.splice(randomIndex, 1)[0];
      const portion = 0.3 + Math.random() * 0.2; // 30-50%のランダムサイズ
      const nutrition = this.adjustNutrition(this.estimateNutrition(sideRecipe), portion);
      
      bentoItems.push({
        recipe: sideRecipe,
        portion,
        role: 'side',
        adjustedNutrition: nutrition
      });
      currentCalories += nutrition.calories;
    }

    // 3. 野菜料理を追加（20-40%サイズ）
    const availableVeggies = vegetableDishes.filter(r => 
      r && r.id && !bentoItems.some(item => item.recipe && item.recipe.id === r.id)
    );
    
    if (availableVeggies.length > 0) {
      const vegRecipe = availableVeggies[Math.floor(Math.random() * availableVeggies.length)];
      const portion = 0.2 + Math.random() * 0.2; // 20-40%のランダムサイズ
      const nutrition = this.adjustNutrition(this.estimateNutrition(vegRecipe), portion);
      
      bentoItems.push({
        recipe: vegRecipe,
        portion,
        role: 'vegetable',
        adjustedNutrition: nutrition
      });
      currentCalories += nutrition.calories;
    }

    // 4. 米料理の処理（レシピがある場合は優先、ない場合は基本のご飯を追加）
    const remainingCalories = Math.max(100, targetCalories - currentCalories);
    let riceCalories = Math.min(200, remainingCalories * 0.4); // 残りカロリーの40%程度を米料理に
    
    // 利用可能な米料理があるかチェック（既にメインで使われていないもの）
    const availableRiceDishes = riceDishes.filter(r => 
      r && r.id && !bentoItems.some(item => item.recipe && item.recipe.id === r.id)
    );
    
    // 既に米料理がメインで使われている場合はご飯を追加しない
    const hasRiceMainDish = bentoItems.some(item => 
      item.role === 'main' && this.isRiceDish(item.recipe)
    );
    
    if (hasRiceMainDish) {
      // 米料理がメインの場合は追加のご飯は不要
      console.log('🍚 メイン料理が米料理のため、追加のご飯はスキップします');
    } else if (availableRiceDishes.length > 0) {
      // 米料理レシピがある場合はそれを使用
      const riceRecipe = availableRiceDishes[Math.floor(Math.random() * availableRiceDishes.length)];
      const portion = Math.min(1.0, riceCalories / this.estimateNutrition(riceRecipe).calories);
      const nutrition = this.adjustNutrition(this.estimateNutrition(riceRecipe), portion);
      
      bentoItems.push({
        recipe: riceRecipe,
        portion,
        role: 'rice',
        adjustedNutrition: nutrition
      });
    } else {
      // 米料理レシピがない場合は基本のご飯を追加
      const riceNutrition = {
        calories: Math.round(riceCalories),
        protein: Math.round(riceCalories * 0.02), // ご飯は約2%がタンパク質
        carbs: Math.round(riceCalories * 0.23), // ご飯は約23%が炭水化物
        fat: 0.5
      };
      
      // 仮想的な「ご飯」レシピを作成
      const riceRecipe: ProcessedJapaneseRecipe = {
        id: `rice-${Date.now()}`,
        title: 'ご飯',
        description: '炊きたての白いご飯',
        imageUrl: '',
        sourceUrl: '',
        cookingTime: '30分',
        servings: '1人分',
        difficulty: '簡単',
        cost: '〜100円',
        ingredients: [{ name: '白米', amount: `${Math.round(riceCalories / 150)}合` }],
        instructions: [{ stepNumber: 1, text: '米を洗い、炊飯器で炊く', image: undefined }],
        source: 'rakuten' as const,
        createdAt: Date.now()
      };

      bentoItems.push({
        recipe: riceRecipe,
        portion: 1.0,
        role: 'rice',
        adjustedNutrition: riceNutrition
      });
    }

    // 5. 合計栄養計算
    const totalNutrition = bentoItems.reduce((total, item) => ({
      calories: total.calories + item.adjustedNutrition.calories,
      protein: total.protein + item.adjustedNutrition.protein,
      carbs: total.carbs + item.adjustedNutrition.carbs,
      fat: total.fat + item.adjustedNutrition.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // 6. お弁当スタイル判定
    const finalBentoStyle = preferredStyle || this.determineBentoStyle(bentoItems);

    return {
      id: `bento-${Date.now()}`,
      name: this.generateBentoName(bentoItems, finalBentoStyle),
      description: this.generateBentoDescription(bentoItems, totalNutrition),
      items: bentoItems,
      totalNutrition,
      bentoStyle: finalBentoStyle
    };
  }

  /**
   * 複数のお弁当バリエーションを生成（重複防止強化版）
   */
  static generateMultipleBentos(recipes: ProcessedJapaneseRecipe[], count: number = 3): GeneratedBento[] {
    const bentos: GeneratedBento[] = [];
    const usedRecipeIds = new Set<string>(); // 使用されたレシピIDを追跡
    const styles: ('japanese' | 'western' | 'healthy' | 'balanced')[] = ['japanese', 'healthy', 'balanced'];
    const targetCalories = [500, 600, 700]; // 異なるカロリー目標
    
    for (let i = 0; i < count && recipes.length > 0; i++) {
      // 未使用のレシピのみを使用してお弁当を生成
      const availableRecipes = recipes.filter(recipe => recipe && recipe.id && !usedRecipeIds.has(recipe.id));
      
      if (availableRecipes.length < 2) {
        // 使用可能なレシピが不足した場合は、使用済みレシピをリセット
        usedRecipeIds.clear();
        availableRecipes.push(...recipes);
      }
      
      // レシピをシャッフルして異なる組み合わせを作成
      const shuffledRecipes = [...availableRecipes].sort(() => Math.random() - 0.5);
      const style = styles[i % styles.length];
      const calories = targetCalories[i % targetCalories.length];
      
      const bento = this.generateBento(shuffledRecipes, calories, style);
      if (bento && bento.items && Array.isArray(bento.items)) {
        // 使用されたレシピIDを記録（仮想ご飯レシピは除外）
        bento.items.forEach((item, index) => {
          try {
            // より厳密な型チェック
            if (!item || typeof item !== 'object') {
              console.warn(`⚠️ 無効なアイテム ${index}:`, item);
              return;
            }

            if (!item.recipe || typeof item.recipe !== 'object') {
              console.warn(`⚠️ 無効なレシピ ${index}:`, item.recipe);
              return;
            }

            const recipeId = item.recipe.id;
            if (!recipeId || typeof recipeId !== 'string') {
              console.warn(`⚠️ 無効なレシピID ${index}:`, {
                id: recipeId,
                type: typeof recipeId,
                title: item.recipe.title
              });
              return;
            }

            // 仮想ご飯レシピ以外をUsedRecipeに追加
            if (!recipeId.startsWith('rice-')) {
              usedRecipeIds.add(recipeId);
            }
          } catch (error) {
            console.error(`❌ アイテム処理エラー ${index}:`, error, item);
          }
        });
        
        bentos.push(bento);
      } else {
        console.warn('⚠️ 無効な弁当オブジェクト:', bento);
      }
    }
    
    return bentos;
  }

  /**
   * レシピの栄養情報を推定
   */
  private static estimateNutrition(recipe: ProcessedJapaneseRecipe): any {
    // 料理名から簡易的な栄養推定
    const title = (recipe.title || '').toLowerCase();
    
    if (title.includes('肉') || title.includes('鶏') || title.includes('豚') || title.includes('牛')) {
      return { calories: 300, protein: 25, carbs: 10, fat: 15 };
    } else if (title.includes('魚') || title.includes('サーモン') || title.includes('サバ')) {
      return { calories: 200, protein: 20, carbs: 5, fat: 8 };
    } else if (title.includes('野菜') || title.includes('サラダ')) {
      return { calories: 80, protein: 3, carbs: 15, fat: 1 };
    } else if (title.includes('卵')) {
      return { calories: 150, protein: 12, carbs: 2, fat: 10 };
    }
    
    // デフォルト値
    return { calories: 150, protein: 8, carbs: 20, fat: 5 };
  }

  /**
   * メイン料理かどうかの判定
   */
  private static isMainDish(recipe: ProcessedJapaneseRecipe): boolean {
    const title = recipe.title || '';
    const nutrition = this.estimateNutrition(recipe);
    
    return (title.includes('肉') || title.includes('魚') || title.includes('鶏')) && 
           nutrition.calories > 200;
  }

  /**
   * サイド料理かどうかの判定
   */
  private static isSideDish(recipe: ProcessedJapaneseRecipe): boolean {
    const title = recipe.title || '';
    const nutrition = this.estimateNutrition(recipe);
    
    return (title.includes('卵') || title.includes('豆腐') || title.includes('麺')) || 
           nutrition.calories < 200;
  }

  /**
   * 野菜料理かどうかの判定
   */
  private static isVegetableDish(recipe: ProcessedJapaneseRecipe): boolean {
    const title = recipe.title || '';
    
    return title.includes('野菜') ||
           title.includes('サラダ') ||
           title.includes('きのこ') ||
           title.includes('キャベツ') ||
           title.includes('にんじん');
  }

  /**
   * 米・ご飯料理かどうかの判定
   */
  private static isRiceDish(recipe: ProcessedJapaneseRecipe): boolean {
    const title = recipe.title || '';
    
    return title.includes('ご飯') ||
           title.includes('御飯') ||
           title.includes('ライス') ||
           title.includes('チャーハン') ||
           title.includes('炒飯') ||
           title.includes('おにぎり') ||
           title.includes('おむすび') ||
           title.includes('丼') ||
           title.includes('栗ご飯') ||
           title.includes('赤飯') ||
           title.includes('炊き込みご飯') ||
           title.includes('混ぜご飯') ||
           title.includes('散らし寿司') ||
           title.includes('ちらし寿司') ||
           title.includes('海苔巻き') ||
           title.includes('巻き寿司') ||
           title.includes('寿司') ||
           title.includes('ピラフ') ||
           title.includes('リゾット') ||
           title.includes('雑炊') ||
           title.includes('お粥') ||
           title.includes('おかゆ') ||
           // 米を主材料とする料理の追加パターン
           (title.includes('米') && (title.includes('炊') || title.includes('煮'))) ||
           // 丼物の追加パターン
           title.includes('親子丼') ||
           title.includes('牛丼') ||
           title.includes('カツ丼') ||
           title.includes('天丼') ||
           title.includes('海鮮丼');
  }

  /**
   * 栄養素をサイズに応じて調整
   */
  private static adjustNutrition(nutrition: any, portion: number) {
    return {
      calories: Math.round(nutrition.calories * portion),
      protein: Math.round(nutrition.protein * portion * 10) / 10,
      carbs: Math.round(nutrition.carbs * portion * 10) / 10,
      fat: Math.round(nutrition.fat * portion * 10) / 10
    };
  }

  /**
   * お弁当スタイル判定
   */
  private static determineBentoStyle(items: BentoItem[]): 'japanese' | 'western' | 'healthy' | 'balanced' {
    // 楽天レシピは基本的に日本料理なので、ほぼjapaneseスタイル
    const totalCalories = items.reduce((sum, item) => sum + item.adjustedNutrition.calories, 0);
    
    if (totalCalories < 500) return 'healthy';
    return 'japanese';
  }

  /**
   * お弁当名を生成
   */
  private static generateBentoName(items: BentoItem[], style: string): string {
    const mainItem = items.find(item => item.role === 'main');
    const mainName = mainItem ? mainItem.recipe.title : '料理';
    
    const styleNames = {
      japanese: '和風弁当',
      western: '洋風弁当', 
      healthy: 'ヘルシー弁当',
      balanced: 'バランス弁当'
    };
    
    return `${mainName}の${styleNames[style as keyof typeof styleNames]}`;
  }

  /**
   * お弁当の説明を生成
   */
  private static generateBentoDescription(items: BentoItem[], nutrition: any): string {
    const itemCount = items.filter(item => item.role !== 'rice').length;
    return `${itemCount}品のおかずで栄養バランスを考えたお弁当。` +
           `カロリー${nutrition.calories}kcal、タンパク質${nutrition.protein.toFixed(1)}g含有。`;
  }
}