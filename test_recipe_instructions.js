// 楽天レシピAPIの手順データ構造を確認するテストスクリプト
const fetch = require('node-fetch');

const RAKUTEN_APP_ID = '1089215530857693286';
const RECIPE_ID = '1110045742'; // テスト用のレシピID

async function testRecipeInstructions() {
  try {
    console.log('🔍 レシピ詳細を取得中...');
    
    // レシピ詳細APIエンドポイント
    const url = `https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426?applicationId=${RAKUTEN_APP_ID}&categoryId=30`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.result && data.result.length > 0) {
      const firstRecipe = data.result[0];
      
      console.log('\n📋 レシピ情報:');
      console.log('タイトル:', firstRecipe.recipeTitle);
      console.log('レシピID:', firstRecipe.recipeId);
      console.log('レシピURL:', firstRecipe.recipeUrl);
      
      // 手順データの構造を確認
      if (firstRecipe.recipeInstructions) {
        console.log('\n📸 手順データの構造:');
        console.log('手順の型:', typeof firstRecipe.recipeInstructions);
        console.log('手順は配列?:', Array.isArray(firstRecipe.recipeInstructions));
        console.log('手順の数:', Array.isArray(firstRecipe.recipeInstructions) ? firstRecipe.recipeInstructions.length : 'N/A');
        
        if (Array.isArray(firstRecipe.recipeInstructions)) {
          console.log('\n最初の3つの手順:');
          firstRecipe.recipeInstructions.slice(0, 3).forEach((inst, index) => {
            console.log(`\n--- 手順 ${index + 1} ---`);
            console.log('テキスト:', inst.text || inst);
            console.log('image フィールド:', inst.image);
            console.log('images フィールド:', inst.images);
            console.log('url フィールド:', inst.url);
            console.log('name フィールド:', inst.name);
            console.log('全フィールド:', Object.keys(inst));
          });
        } else {
          console.log('手順データ:', firstRecipe.recipeInstructions);
        }
      } else {
        console.log('⚠️ 手順データがありません');
      }
      
      // 画像関連のフィールドも確認
      console.log('\n🖼️ レシピ全体の画像フィールド:');
      console.log('foodImageUrl:', firstRecipe.foodImageUrl);
      console.log('mediumImageUrl:', firstRecipe.mediumImageUrl);
      console.log('smallImageUrl:', firstRecipe.smallImageUrl);
      
    } else {
      console.log('❌ レシピが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

testRecipeInstructions();
