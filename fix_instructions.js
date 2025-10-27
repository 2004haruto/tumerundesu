// rakutenRecipeApi.tsのprocessInstructions関数を修正するスクリプト
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'rakutenRecipeApi.ts');

let content = fs.readFileSync(filePath, 'utf8');

// 修正前のコード(文字化け部分を含む可能性があるため、より広い範囲で検索)
const oldCode = `  private processInstructions(instructions: any, html?: string): RecipeInstruction[] {
    if (!instructions) return [];
    
    if (Array.isArray(instructions)) {
      return instructions.map((inst, index) => {
        let stepSpecificImages: string[] = [];
        
        //
        if (html && inst.text) {
          const stepNumber = index + 1;
          const stepKeywords = inst.text.split(/[邵ｲ繧・窶不]+/).filter(word => word.length > 1).slice(0, 2);
          stepSpecificImages = this.extractStepSpecificImages(html, stepNumber, stepKeywords);
        }
        
        //
        const instructionImage = inst.image ? this.extractBestImage(inst.image) : undefined;
        const instructionImages = stepSpecificImages.length > 0 
          ? stepSpecificImages 
          : (instructionImage ? [instructionImage] : []);
        
        return {
          text: typeof inst === 'string' ? inst : inst.text || inst.name || '',
          name: inst.name,
          url: inst.url,
          image: instructionImages[0], //
          video: this.extractVideoUrl(inst.video),
          images: instructionImages.slice(1) //
        };
      });
    }`;

// 修正後のコード
const newCode = `  private processInstructions(instructions: any, html?: string): RecipeInstruction[] {
    if (!instructions) return [];
    
    if (Array.isArray(instructions)) {
      return instructions.map((inst, index) => {
        // HTMLエンティティをデコード
        const decodeHtmlEntities = (text: string): string => {
          if (!text) return text;
          return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
        };
        
        // Schema.org JSONデータからの画像を優先(各手順専用の画像)
        let stepImage: string | undefined = undefined;
        if (inst.image) {
          const rawImage = this.extractBestImage(inst.image);
          stepImage = rawImage ? decodeHtmlEntities(rawImage) : undefined;
        }
        
        // 追加画像も処理(ほとんどのレシピでは空配列)
        const additionalImages: string[] = [];
        if (inst.images && Array.isArray(inst.images)) {
          inst.images.forEach((img: any) => {
            const extracted = this.extractBestImage(img);
            if (extracted) {
              additionalImages.push(decodeHtmlEntities(extracted));
            }
          });
        }
        
        return {
          text: typeof inst === 'string' ? inst : inst.text || inst.name || '',
          name: inst.name,
          url: inst.url,
          image: stepImage,
          video: this.extractVideoUrl(inst.video),
          images: additionalImages
        };
      });
    }`;

// 置換実行
if (content.includes('stepSpecificImages = this.extractStepSpecificImages')) {
  // より確実な置換のため、特徴的な文字列で分割して置換
  const parts = content.split('private processInstructions(instructions: any, html?: string): RecipeInstruction[] {');
  if (parts.length === 2) {
    const afterFunc = parts[1];
    const endOfArrayMap = afterFunc.indexOf('    if (typeof instructions === \'string\') {');
    
    if (endOfArrayMap > 0) {
      const beforeFunc = parts[0];
      const restOfFile = afterFunc.substring(endOfArrayMap);
      
      const newFunctionBody = `
    if (!instructions) return [];
    
    if (Array.isArray(instructions)) {
      return instructions.map((inst, index) => {
        // HTMLエンティティをデコード
        const decodeHtmlEntities = (text: string): string => {
          if (!text) return text;
          return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
        };
        
        // Schema.org JSONデータからの画像を優先(各手順専用の画像)
        let stepImage: string | undefined = undefined;
        if (inst.image) {
          const rawImage = this.extractBestImage(inst.image);
          stepImage = rawImage ? decodeHtmlEntities(rawImage) : undefined;
        }
        
        // 追加画像も処理(ほとんどのレシピでは空配列)
        const additionalImages: string[] = [];
        if (inst.images && Array.isArray(inst.images)) {
          inst.images.forEach((img: any) => {
            const extracted = this.extractBestImage(img);
            if (extracted) {
              additionalImages.push(decodeHtmlEntities(extracted));
            }
          });
        }
        
        return {
          text: typeof inst === 'string' ? inst : inst.text || inst.name || '',
          name: inst.name,
          url: inst.url,
          image: stepImage,
          video: this.extractVideoUrl(inst.video),
          images: additionalImages
        };
      });
    }
    `;
      
      content = beforeFunc + 'private processInstructions(instructions: any, html?: string): RecipeInstruction[] {' + newFunctionBody + restOfFile;
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ processInstructions関数を修正しました!');
      console.log('変更内容:');
      console.log('  1. HTMLからの画像抽出を削除(各手順で同じ画像が返されていたため)');
      console.log('  2. Schema.org JSONの instruction.image を直接使用');
      console.log('  3. HTMLエンティティ(&amp; → &)をデコード');
    } else {
      console.log('❌ 関数の終了位置が見つかりませんでした');
    }
  } else {
    console.log('❌ 関数が見つかりませんでした');
  }
} else {
  console.log('⚠️ すでに修正済みか、コードが変更されています');
}
