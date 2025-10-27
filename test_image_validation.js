// 画像URLのバリデーションテスト

const testUrls = [
  'https://recipe.r10s.jp/recipe-space/d/strg/ctrl/3/8033cbbb233c17e2e64b3df2d68696cc8777b454.50.2.3.2.jpg?interpolation=lanczos-none&fit=around|276:276&crop=276:276;*,*',
  'https://recipe.r10s.jp/recipe-space/d/strg/ctrl/3/ba63d481b512eb1ff827a5ac167fb8fbf2e2f660.50.2.3.2.jpg?interpolation=lanczos-none&fit=around|276:276&crop=276:276;*,*',
  'https://recipe.r10s.jp/recipe-space/d/strg/ctrl/3/3fee3415228c4972c942b499e2feedf7c00356ac.50.2.3.2.jpg?interpolation=lanczos-none&fit=around|276:276&crop=276:276;*,*'
];

const validateImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  if (!url.startsWith('http')) return false;
  
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  if (!imageExtensions.test(url)) return false;
  
  const excludePatterns = [
    /logo/i,
    /banner/i,
    /ad[s]?/i,
    /avatar/i,
    /profile/i,
    /icon/i,
    /thumbnail/i,
    /thumb/i,
    /button/i,
    /decoration/i,
    /background/i,
    /\d{1,2}x\d{1,2}/i,
    /blank/i,
    /empty/i,
    /spacer/i,
    /transparent/i,
    /clear/i,
    /1x1/i,
    /pixel/i,
    /tracking/i,
    /analytics/i,
    /beacon/i,
    /\.(gif|svg)$/i
  ];
  
  const suspiciousPatterns = [
    /^[a-f0-9]{8,}$/i,
    /^pixel/i,
    /^spacer/i,
    /^blank/i
  ];
  
  const fileName = url.split('/').pop()?.split('?')[0] || '';
  const hasSuspiciousName = suspiciousPatterns.some(pattern => pattern.test(fileName));
  
  return !excludePatterns.some(pattern => pattern.test(url)) && !hasSuspiciousName;
};

console.log('📸 画像URLバリデーションテスト:\n');

testUrls.forEach((url, index) => {
  const isValid = validateImageUrl(url);
  console.log(`手順 ${index + 1}:`);
  console.log('  URL:', url.substring(0, 100) + '...');
  console.log('  結果:', isValid ? '✅ 有効' : '❌ 無効');
  
  // 詳細チェック
  const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
  console.log('  拡張子チェック:', hasExtension ? '✅' : '❌');
  
  const fileName = url.split('/').pop()?.split('?')[0] || '';
  console.log('  ファイル名:', fileName);
  console.log('');
});
