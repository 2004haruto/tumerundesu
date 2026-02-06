// backend/src/services/rakutenRecipeApi.ts
import fetch = require('node-fetch');

const RAKUTEN_APP_ID = process.env.EXPO_PUBLIC_RAKUTEN_APP_ID || 'YOUR_RAKUTEN_APP_ID';
const RAKUTEN_BASE_URL = 'https://app.rakuten.co.jp/services/api/Recipe/RecipeGet/20170426';

export interface RakutenRecipeApiResult {
  title: string;
  calories: number;
  description: string;
  image_url: string;
}

export async function fetchRakutenRecipe(recipeId: string | number): Promise<RakutenRecipeApiResult> {
  const url = `${RAKUTEN_BASE_URL}?applicationId=${RAKUTEN_APP_ID}&recipeId=${recipeId}`;
  console.log('[楽天API] APP_ID:', RAKUTEN_APP_ID, 'URL:', url);
  const res = await fetch(url);
  if (!res.ok) {
    let errText = '';
    try {
      errText = await res.text();
    } catch {}
    console.error('[楽天API] レスポンスエラー:', res.status, errText);
    throw new Error('楽天レシピAPI取得失敗');
  }
  const data = await res.json();
  if (!data.result || !data.result[0]) {
    console.error('[楽天API] データなし:', JSON.stringify(data));
    throw new Error('レシピデータなし');
  }
  const recipe = data.result[0];
  let calories = 0;
  if (recipe.recipeIndication) {
    const match = recipe.recipeIndication.match(/([0-9]+)kcal/);
    if (match) calories = parseInt(match[1]);
  }
  return {
    title: recipe.recipeTitle,
    calories,
    description: recipe.recipeDescription || '',
    image_url: recipe.foodImageUrl || '',
  };
}
