// 実際のレシピページからSchema.orgデータを抽出してテスト
const fetch = require('node-fetch');

const TEST_RECIPE_URL = 'https://recipe.rakuten.co.jp/recipe/1290001623/';

async function testSchemaExtraction() {
  try {
    console.log('🔍 レシピページを取得中...');
    console.log('URL:', TEST_RECIPE_URL);
    
    const response = await fetch(TEST_RECIPE_URL);
    const html = await response.text();
    
    // Schema.org JSON-LDを探す
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    if (jsonLdMatch) {
      console.log('\n✅ JSON-LDスキーマが見つかりました!');
      console.log('見つかったスキーマの数:', jsonLdMatch.length);
      
      for (let i = 0; i < jsonLdMatch.length; i++) {
        const match = jsonLdMatch[i];
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const schema = JSON.parse(jsonContent);
          
          // Recipeスキーマを探す
          const recipe = Array.isArray(schema) 
            ? schema.find(item => item['@type'] === 'Recipe')
            : schema['@type'] === 'Recipe' ? schema : null;
          
          if (recipe) {
            console.log('\n📋 レシピスキーマが見つかりました!');
            console.log('レシピ名:', recipe.name);
            
            // 手順データを詳しく確認
            if (recipe.recipeInstructions) {
              console.log('\n手順データの型:', typeof recipe.recipeInstructions);
              console.log('手順は配列?:', Array.isArray(recipe.recipeInstructions));
              
              if (Array.isArray(recipe.recipeInstructions)) {
                console.log('手順の数:', recipe.recipeInstructions.length);
                console.log('\n最初の3つの手順の詳細:');
                
                recipe.recipeInstructions.slice(0, 3).forEach((inst, index) => {
                  console.log(`\n--- 手順 ${index + 1} ---`);
                  console.log('型:', typeof inst);
                  console.log('内容:', JSON.stringify(inst, null, 2));
                });
              } else {
                console.log('手順データ:', recipe.recipeInstructions);
              }
            } else {
              console.log('⚠️ recipeInstructionsフィールドがありません');
            }
            
            // 画像データも確認
            console.log('\n🖼️ 画像データ:');
            console.log('image:', recipe.image);
            
            break;
          }
        } catch (parseError) {
          console.log(`スキーマ ${i + 1} のパースに失敗:`, parseError.message);
        }
      }
    } else {
      console.log('❌ JSON-LDスキーマが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

testSchemaExtraction();
