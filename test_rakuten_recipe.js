// 楽天レシピAPI テスト実行スクリプト
const { rakutenRecipeApi } = require('./src/services/rakutenRecipeApi');

async function testRakutenRecipeAPI() {
  console.log('🔍 楽天レシピAPI 詳細手順取得テスト開始');

  try {
    // 1. 基本的なレシピ検索
    console.log('\n1. 基本レシピ検索...');
    const basicRecipes = await rakutenRecipeApi.getRecipesByCategory('30', 2); // お弁当カテゴリ、2件
    console.log(`   取得件数: ${basicRecipes.length}`);
    
    if (basicRecipes.length > 0) {
      const sampleRecipe = basicRecipes[0];
      console.log('   サンプルレシピ:', {
        id: sampleRecipe.recipeId,
        title: sampleRecipe.recipeTitle,
        url: sampleRecipe.recipeUrl,
        materials: sampleRecipe.recipeMaterial?.slice(0, 3)
      });

      // 2. schema.org詳細情報取得
      console.log('\n2. 詳細情報取得...');
      const schemaData = await rakutenRecipeApi.extractSchemaFromRecipeUrl(sampleRecipe.recipeUrl);
      
      if (schemaData) {
        console.log('   詳細情報取得成功:', {
          name: schemaData.name,
          hasInstructions: !!(schemaData.recipeInstructions && schemaData.recipeInstructions.length > 0),
          instructionCount: schemaData.recipeInstructions?.length || 0,
          firstInstruction: schemaData.recipeInstructions?.[0]?.text?.substring(0, 100)
        });

        // 3. 処理済みレシピ形式で確認
        console.log('\n3. 処理済みレシピ変換...');
        const processedRecipes = await rakutenRecipeApi.getProcessedRecipes('30', 1);
        
        if (processedRecipes.length > 0) {
          const processed = processedRecipes[0];
          console.log('   処理済みレシピ:', {
            id: processed.id,
            title: processed.title,
            instructionCount: processed.instructions?.length || 0,
            sampleInstructions: processed.instructions?.slice(0, 2).map(inst => ({
              stepNumber: inst.stepNumber,
              text: inst.text?.substring(0, 80) + '...',
              hasImage: !!inst.image
            }))
          });
        } else {
          console.log('   ❌ 処理済みレシピが取得できませんでした');
        }
      } else {
        console.log('   ❌ 詳細情報が取得できませんでした');
      }
    } else {
      console.log('   ❌ レシピが取得できませんでした');
    }

  } catch (error) {
    console.error('❌ テストエラー:', error);
  }

  console.log('\n🎉 テスト完了');
}

// テスト実行
testRakutenRecipeAPI();