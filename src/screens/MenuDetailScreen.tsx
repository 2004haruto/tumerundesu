// src/screens/MenuDetailScreen.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, apiClient } from '../services/api';
import { rakutenRecipeApi } from '../services/rakutenRecipeApi';


const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'MenuDetail'>;

/** ===== Palette ===== */
const PALETTE = {
  bg: "#FFFFFF",
  ink: "#171717",
  subtle: "#6B7280",
  stroke: "#ECECEC",
  coral: "#FF7A6E",
  yellow: "#FFD54A",
  teal: "#44D1C9",
  blue: "#6FB7FF",
  grape: "#B89CFF",
  good: "#22A06B",
  bad: "#E25555",
};

type Ingredient = { id: string; name: string; note?: string };
type Step = { id: string; text: string };
type Calorie = { id: string; label: string; kcal: number };

// タブ定義
const TABS = ["メニュー", "材料", "作り方", "カロリー"] as const;
type Tab = typeof TABS[number];

// デフォルトのカロリーデータ
const CALS: Calorie[] = [
  { id: "rice", label: "ご飯", kcal: 250 },
  { id: "chicken", label: "鶏肉の照り焼き", kcal: 200 },
  { id: "egg", label: "卵焼き", kcal: 150 },
  { id: "veg", label: "野菜炒め", kcal: 100 },
];

// お弁当サイズ関連の型
interface BentoSize {
  id: string;
  name: string;
  capacity: string;
  width: string;
  length: string;
  height: string;
  is_primary?: boolean;
}

const MenuDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bento, recipe } = route.params || {};
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>("メニュー");
  
  // ScrollViewとセクションのRef
  const scrollViewRef = React.useRef<ScrollView>(null);
  const sectionRefs = React.useRef<{ [key: string]: number }>({});
  
  // お弁当設定関連のstate
  const [availableBentoSizes, setAvailableBentoSizes] = useState<BentoSize[]>([]);
  const [selectedBentoIds, setSelectedBentoIds] = useState<string[]>([]);
  const [includeBreakfast, setIncludeBreakfast] = useState(false);
  const [breakfastPortions, setBreakfastPortions] = useState('1');
  
  // 詳細手順モーダル関連のstate
  const [stepDetailModal, setStepDetailModal] = useState({
    visible: false,
    stepData: null as any,
    dishName: '',
    stepNumber: 0
  });
  
  // 補完メニュー提案のstate
  const [complementaryRecipes, setComplementaryRecipes] = useState<any[]>([]);
  const [loadingComplementary, setLoadingComplementary] = useState(false);
  
  // 選択されたレシピのリスト（お弁当メニュー構成用）
  const [selectedRecipes, setSelectedRecipes] = useState<any[]>([]);
  
  // お弁当の比率設定（PackingGuideScreen連携用）
  const [bentoRiceRatio, setBentoRiceRatio] = useState<number>(3); // 主食比率 1-5
  const [bentoLayoutType, setBentoLayoutType] = useState<'2split' | '3split' | '4split'>('3split'); // レイアウト
  
  // 買い物リスト追加済みフラグ
  const [isAddedToShoppingList, setIsAddedToShoppingList] = useState(false);
  // お気に入り登録済みフラグ
  const [isFavorited, setIsFavorited] = useState(false);
  // お気に入り登録済みかどうかを初回取得
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      const menuId = bento?.id || recipe?.id;
      if (!menuId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/favorites/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.some((fav: any) => fav.menu_id == menuId)) {
            setIsFavorited(true);
          } else {
            setIsFavorited(false);
          }
        }
      } catch (e) {
        // 通信エラー時は何もしない
      }
    };
    checkFavorite();
  }, [user, bento, recipe]);
  
  // レシピから一人前のカロリーを推定する関数（BentoMenuScreenと同じロジック）
  const estimateCaloriesPerServing = (recipe: any): number => {
    // 栄養情報がある場合はそれを使用
    if (recipe?.nutrition?.calories) {
      const caloriesStr = recipe.nutrition.calories.toString().replace(/[^\d]/g, '');
      const calories = parseInt(caloriesStr);
      if (!isNaN(calories) && calories > 0) {
        return calories;
      }
    }
    
    // recipeYieldまたはservingsから人数を取得
    let servings = 1;
    if (recipe?.servings) {
      const servingsMatch = recipe.servings.match(/(\d+)/);
      if (servingsMatch) {
        servings = parseInt(servingsMatch[1]);
      }
    }
    
    // 材料数と料理の種類から推定
    const ingredients = recipe?.ingredients || [];
    const ingredientCount = ingredients.length || 5;
    const cookingTime = recipe?.cookingTime || '';
    
    // 基本カロリー（一人前の想定）
    let baseCalories = 250;
    
    // 材料数で調整
    if (ingredientCount <= 3) {
      baseCalories = 150; // シンプルな料理
    } else if (ingredientCount <= 5) {
      baseCalories = 250; // 普通の料理
    } else if (ingredientCount <= 8) {
      baseCalories = 350; // やや複雑な料理
    } else {
      baseCalories = 450; // 豪華な料理
    }
    
    // タイトルからカロリー推定の補正
    const title = (recipe?.title || recipe?.name || '').toLowerCase();
    if (/揚げ|フライ|天ぷら|とんかつ|カツ|唐揚げ/.test(title)) {
      baseCalories += 100; // 揚げ物は高カロリー
    } else if (/サラダ|野菜|きのこ|こんにゃく/.test(title)) {
      baseCalories -= 50; // 野菜中心は低カロリー
    } else if (/肉|豚|牛|鶏/.test(title)) {
      baseCalories += 50; // 肉料理は高め
    }
    
    // コストから推定（高コストは材料豊富）
    if (recipe?.cost) {
      if (/300円以上|500円/.test(recipe.cost)) {
        baseCalories += 50;
      } else if (/100円以下/.test(recipe.cost)) {
        baseCalories -= 30;
      }
    }
    
    return Math.round(baseCalories);
  };
  
  // 後方互換性のため、古い関数名も残す
  const estimateCaloriesFromIngredients = estimateCaloriesPerServing;
  
  // 初期レシピを選択リストに追加
  useEffect(() => {
    if (recipe && selectedRecipes.length === 0) {
      // ingredients, instructions(steps)が文字列ならパース
      const parsedRecipe = { ...recipe };
      // 材料
      if (typeof parsedRecipe.ingredients === 'string') {
        try { parsedRecipe.ingredients = JSON.parse(parsedRecipe.ingredients); } catch { parsedRecipe.ingredients = []; }
      }
      if (!Array.isArray(parsedRecipe.ingredients)) {
        parsedRecipe.ingredients = [];
      }
      // 作り方（steps/instructions）
      let steps = parsedRecipe.steps || parsedRecipe.instructions;
      if (typeof steps === 'string') {
        try { steps = JSON.parse(steps); } catch { steps = []; }
      }
      if (!Array.isArray(steps)) {
        steps = [];
      }
      parsedRecipe.instructions = steps;
      parsedRecipe.steps = steps;
      setSelectedRecipes([parsedRecipe]);
      // 初期レシピに基づいて補完メニューを読み込み
      loadComplementaryRecipesForMultiple([parsedRecipe]);
    }
  }, [recipe]);
  
  // レシピをお弁当に追加
  const addRecipeToBento = (newRecipe: any) => {
    console.log('🍱 レシピを追加:', newRecipe.title);
    setSelectedRecipes(prev => {
      // 既に追加されているかチェック
      const exists = prev.some(r => r.id === newRecipe.id || r.title === newRecipe.title);
      if (exists) {
        console.log('⚠️ 既に追加されています');
        return prev;
      }
      const updated = [...prev, newRecipe];
      console.log(`✅ レシピ追加完了: 合計${updated.length}品`);
      return updated;
    });
    
    // 追加したレシピに基づいて補完メニューを再計算
    setTimeout(() => {
      loadComplementaryRecipesForMultiple([...selectedRecipes, newRecipe]);
    }, 100);
  };
  
  // レシピの役割を判定する関数
  const determineRecipeRole = (recipe: any): 'main' | 'side' | 'rice' | 'unknown' => {
    const title = (recipe.title || '').toLowerCase();
    const description = (recipe.description || '').toLowerCase();
    const searchText = `${title} ${description}`;
    
    // ご飯系
    if (/ご飯|ごはん|rice|チャーハン|炒飯|おにぎり|丼|寿司/.test(searchText)) {
      return 'rice';
    }
    
    // メイン料理（肉・魚）
    if (/照り焼き|唐揚げ|とんかつ|ハンバーグ|ステーキ|焼き魚|煮魚|メイン|主菜/.test(searchText)) {
      return 'main';
    }
    if (/鶏肉|豚肉|牛肉|鮭|サーモン|さば|あじ|エビ/.test(searchText) && !/サラダ|和え|ナムル/.test(searchText)) {
      return 'main';
    }
    
    // 副菜
    if (/サラダ|和え|ナムル|おひたし|煮物|炒め物|副菜|付け合わせ|漬物|きんぴら/.test(searchText)) {
      return 'side';
    }
    
    // デフォルト（材料から推測）
    const ingredients = recipe.ingredients?.map((i: any) => i.name.toLowerCase()).join(' ') || '';
    if (/鶏|豚|牛|魚|肉/.test(ingredients)) {
      return 'main';
    }
    if (/米|ご飯/.test(ingredients)) {
      return 'rice';
    }
    
    return 'side'; // デフォルトは副菜として扱う
  };

  // 複数レシピに対する補完メニューを取得
  const loadComplementaryRecipesForMultiple = async (recipes: any[]) => {
    if (!recipes || recipes.length === 0) return;
    
    setLoadingComplementary(true);
    try {
      // 全レシピの役割を判定
      const roles = recipes.map(r => {
        const role = determineRecipeRole(r);
        console.log(`  - ${r.title}: ${role}`);
        return role;
      });
      const hasMain = roles.includes('main');
      const hasSide = roles.includes('side');
      const hasRice = roles.includes('rice');
      
      console.log('🍱 現在のお弁当構成:', {
        合計: recipes.length,
        メイン: hasMain ? '✅' : '❌',
        副菜: hasSide ? '✅' : '❌',
        ご飯: hasRice ? '✅' : '❌',
        判定された役割: roles
      });
      
      const missingRoles: Array<'main' | 'side' | 'rice'> = [];
      if (!hasMain) missingRoles.push('main');
      if (!hasSide) missingRoles.push('side');
      if (!hasRice) missingRoles.push('rice');
      
      if (missingRoles.length === 0) {
        console.log('🎉 お弁当が完成しました！');
        setComplementaryRecipes([]);
        setLoadingComplementary(false);
        return;
      }
      
      console.log('📋 まだ不足している役割:', missingRoles);
      
      // 各役割のレシピを検索
      const complementary: any[] = [];
      
      // ランダムなキーワードを選択する関数
      const getRandomKeywords = (role: 'main' | 'side' | 'rice', count: number = 2): string[] => {
        const keywords = {
          main: ['鶏肉', '豚肉', '牛肉', 'ハンバーグ', '唐揚げ', '照り焼き', '生姜焼き', 'とんかつ'],
          side: ['サラダ', 'ナムル', 'おひたし', '煮物', 'きんぴら', '和え物', '漬物'],
          rice: ['ご飯', 'おにぎり', 'チャーハン', '炊き込みご飯', '混ぜご飯']
        };
        
        const availableKeywords = keywords[role];
        const shuffled = [...availableKeywords].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
      };
      
      for (const missingRole of missingRoles) {
        try {
          // ランダムに2つのキーワードを選択
          const randomKeywords = getRandomKeywords(missingRole, 2);
          console.log(`🎲 ${missingRole}用ランダムキーワード:`, randomKeywords);
          
          for (const keyword of randomKeywords) {
            try {
              const recipes = await rakutenRecipeApi.searchRecipes(keyword, 5); // より多く取得
              
              if (recipes.length > 0) {
                // ランダムに1つ選択
                const randomIndex = Math.floor(Math.random() * recipes.length);
                const selectedRecipe = recipes[randomIndex];
                
                const recipeWithRole = {
                  ...selectedRecipe,
                  suggestedRole: missingRole,
                  suggestedRoleLabel: missingRole === 'main' ? 'メイン料理' : 
                                     missingRole === 'side' ? '副菜' : 'ご飯もの'
                };
                
                complementary.push(recipeWithRole);
                console.log(`  ✅ 追加: ${selectedRecipe.title} (${keyword})`);
                break; // 1つ見つかったら次の役割へ
              }
            } catch (keywordError) {
              console.error(`  ⚠️ キーワード "${keyword}" でエラー:`, keywordError);
              // 次のキーワードを試す
            }
          }
        } catch (error) {
          console.error(`❌ ${missingRole}用レシピ取得エラー:`, error);
        }
      }
      
      console.log(`🎉 補完メニュー取得完了: ${complementary.length}件`);
      setComplementaryRecipes(complementary);
      
    } catch (error) {
      console.error('❌ 補完メニュー取得エラー:', error);
    } finally {
      setLoadingComplementary(false);
    }
  };

  // 材料を買い物リストに追加
  const addIngredientsToShoppingList = async () => {
    if (!token) {
      alert('ログインが必要です');
      return;
    }

    // 既に追加済みの場合は警告
    if (isAddedToShoppingList) {
      alert('この画面では既に材料を買い物リストに追加済みです');
      return;
    }

    try {
      // 選択されたレシピの材料を収集
      const allIngredients: Array<{ name: string; quantity: string; category?: string; recipeName?: string }> = [];
      
      selectedRecipes.forEach((selectedRecipe) => {
        if (selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0) {
          selectedRecipe.ingredients.forEach((ingredient: any) => {
            // quantity優先、なければnote、どちらもなければ空
                  // ingredientの中身をデバッグ出力
                  console.log('【ingredientデバッグ】', ingredient);
                  // 分量はamountプロパティを使う
                  const rawQuantity = ingredient.amount || '';
                  allIngredients.push({
                    name: ingredient.name,
                    quantity: rawQuantity,
                    category: ingredient.category || '未分類',
                    recipeName: selectedRecipe.title || selectedRecipe.name || '料理名不明'
                  });
          });
        }
      });
      // デバッグ: 追加する材料の内容を出力
      console.log('【買い物リスト追加】allIngredients:', allIngredients);

      if (allIngredients.length === 0) {
        alert('追加する材料がありません');
        return;
      }

      // APIで買い物リストに追加
      await apiClient.addToShoppingList(token, allIngredients);
      
      // 追加成功後、フラグを立てる
      setIsAddedToShoppingList(true);
      
      alert(`${allIngredients.length}個の材料を買い物リストに追加しました！`);
    } catch (error: any) {
      console.error('買い物リスト追加エラー:', error);
      alert(error.message || '買い物リストへの追加に失敗しました');
    }
  };

  // デバッグ: recipeの内容を確認 & 補完メニューを読み込み
  useEffect(() => {
    if (recipe) {
      console.log('📋 単一レシピが渡されました:', {
        title: recipe.title,
        hasIngredients: !!(recipe.ingredients && recipe.ingredients.length > 0),
        ingredientsCount: recipe.ingredients?.length || 0,
        hasInstructions: !!(recipe.instructions && recipe.instructions.length > 0),
        instructionsCount: recipe.instructions?.length || 0,
        recipeKeys: Object.keys(recipe)
      });
      
      // 補完メニューは selectedRecipes の useEffect で読み込まれます
    } else if (bento) {
      console.log('🍱 お弁当メニューが渡されました:', {
        itemsCount: bento.items?.length || 0
      });
    }
  }, [recipe, bento]);


  // お弁当サイズを読み込み
  useEffect(() => {
    const loadBentoSizes = async () => {
      if (!token) return;
      
      try {
        const response = await apiClient.getBentoSizes(token);
        setAvailableBentoSizes(response.bentoSizes || []);
        
        // デフォルト選択は行わない（ユーザーの明示的な選択を待つ）
      } catch (error) {
        console.error('お弁当サイズ読み込みエラー:', error);
      }
    };

    loadBentoSizes();
  }, [token]);



  // お弁当選択のトグル
  const toggleBentoSelection = (bentoId: string) => {
    setSelectedBentoIds(prev => 
      prev.includes(bentoId) 
        ? prev.filter(id => id !== bentoId)
        : [...prev, bentoId]
    );
  };

  // 材料量を計算する関数
  const calculateIngredientAmount = (originalNote: string, ingredient: Ingredient) => {
    const selectedBentos = availableBentoSizes.filter(bento => 
      selectedBentoIds.includes(bento.id)
    );
    
    // %表記や曖昧な表記を具体的な分量に変換
    let processedNote = originalNote;
    
    // %表記や曖昧な表記を具体的な分量に変換
    if (originalNote.includes('%分') || originalNote.includes('%相当量')) {
      const percentMatch = originalNote.match(/(\d+)%/);
      if (percentMatch) {
        const percent = parseInt(percentMatch[1]);
        const ingredientName = (ingredient.name || '').toLowerCase();
        
        // 肉類
        if (ingredientName.includes('牛肉') || ingredientName.includes('豚肉') || ingredientName.includes('鶏肉') || 
            ingredientName.includes('肉') || ingredientName.includes('ビーフ') || ingredientName.includes('ポーク')) {
          processedNote = `${Math.round(200 * percent / 100)}g`;
        }
        // 魚類・シーフード
        else if (ingredientName.includes('サーモン') || ingredientName.includes('鮭') || ingredientName.includes('魚') || 
                 ingredientName.includes('エビ') || ingredientName.includes('タコ') || ingredientName.includes('イカ')) {
          processedNote = `${Math.round(150 * percent / 100)}g`;
        }
        // 米・穀物
        else if (ingredientName.includes('米') || ingredientName.includes('ご飯') || ingredientName.includes('パン') || 
                 ingredientName.includes('麺') || ingredientName.includes('うどん') || ingredientName.includes('そば')) {
          processedNote = `${Math.round(150 * percent / 100)}g`;
        }
        // 調味料（液体）
        else if (ingredientName.includes('醤油') || ingredientName.includes('みりん') || ingredientName.includes('酒') || 
                 ingredientName.includes('酢') || ingredientName.includes('ソース')) {
          const amount = Math.round(2 * percent / 100 * 2) / 2; // 0.5大さじ単位
          processedNote = amount >= 1 ? `${amount}大さじ` : `${amount * 3}小さじ`;
        }
        // 油類
        else if (ingredientName.includes('油') || ingredientName.includes('オイル') || ingredientName.includes('オリーブ')) {
          const amount = Math.round(1.5 * percent / 100 * 2) / 2;
          processedNote = amount >= 1 ? `${amount}大さじ` : `${amount * 3}小さじ`;
        }
        // バター・マーガリン
        else if (ingredientName.includes('バター') || ingredientName.includes('マーガリン')) {
          processedNote = `${Math.round(20 * percent / 100)}g`;
        }
        // 野菜類
        else if (ingredientName.includes('玉ねぎ') || ingredientName.includes('たまねぎ')) {
          const size = percent >= 70 ? '大' : percent >= 40 ? '中' : '小';
          const count = Math.ceil(percent / 50);
          processedNote = `${size}サイズ${count}個`;
        }
        else if (ingredientName.includes('にんじん') || ingredientName.includes('人参')) {
          processedNote = `${Math.round(100 * percent / 100)}g`;
        }
        else if (ingredientName.includes('じゃがいも') || ingredientName.includes('ジャガイモ')) {
          const count = Math.ceil(percent / 30);
          processedNote = `中サイズ${count}個`;
        }
        // フルーツ・その他
        else if (ingredientName.includes('アボカド')) {
          const count = Math.ceil(percent / 50);
          processedNote = `${count}個`;
        }
        else if (ingredientName.includes('きゅうり')) {
          const count = Math.ceil(percent / 50);
          processedNote = `${count}本`;
        }
        // 調味料（粉物）
        else if (ingredientName.includes('塩') || ingredientName.includes('胡椒') || ingredientName.includes('こしょう')) {
          processedNote = percent >= 50 ? '小さじ1' : '少々';
        }
        else if (ingredientName.includes('砂糖') || ingredientName.includes('小麦粉') || ingredientName.includes('片栗粉')) {
          const amount = Math.round(1 * percent / 100 * 2) / 2;
          processedNote = `${amount}大さじ`;
        }
        // その他・デフォルト
        else {
          processedNote = `${Math.round(100 * percent / 100)}g`;
        }
      }
    }
    
    // デバッグ情報をコンソールに出力
    console.log('🍱 材料調整計算開始');
    console.log('選択されたお弁当:', selectedBentos.map(b => `${b.name}(${b.capacity}ml)`));
    console.log('朝ごはん設定:', includeBreakfast ? `${breakfastPortions}人分` : 'なし');
    
    // お弁当の総容量を計算
    const totalBentoVolume = selectedBentos.reduce((total, bento) => {
      return total + (parseInt(bento.capacity) || 0);
    }, 0);
    
    // 基準: デフォルト（未選択）= 800ml相当の食卓1人前の量
    // お弁当選択時: お弁当容量に応じて調整（お弁当は通常800mlより小さいので材料は減る）
    // 例: 500mlお弁当 → 0.625倍、800mlお弁当 → 1.0倍
    let totalMultiplier = 1.0; // デフォルトは食卓1人前
    
    if (selectedBentos.length > 0) {
      // お弁当が選択されている場合は、容量に応じて倍率を計算
      const bentoMultiplier = totalBentoVolume / 800;
      totalMultiplier = bentoMultiplier;
    }
    
    // 朝ごはん分を加算（朝食は800ml/人として追加）
    if (includeBreakfast) {
      const breakfastMultiplier = parseInt(breakfastPortions?.toString() || '0') || 0;
      totalMultiplier += breakfastMultiplier;
    }
    
    console.log(`📊 計算結果: お弁当容量=${totalBentoVolume}ml, 総倍率=${totalMultiplier.toFixed(2)}倍 (基準: 800ml=食卓1人前)`);
    console.log(`📝 元の分量表記: "${originalNote}" → 処理後: "${processedNote}"`);
    
    // 全角数字を半角に変換
    let normalizedNote = processedNote.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    
    // 日本語の「単位+数字」パターン（小さじ1、大さじ2など）を「数字+単位」に正規化
    normalizedNote = normalizedNote.replace(/(大さじ|小さじ|おおさじ|こさじ|大匙|小匙)\s*(\d+(?:\.\d+)?)/gi, (match, unit, number) => {
      return `${number}${unit}`;
    });
    
    console.log(`🔄 単位順序正規化: "${processedNote}" → "${normalizedNote}"`);
    
    // より精密な材料調整ロジック
    // 日本語の単位表記にも対応した正規表現（スペースの有無に対応、より広範な単位に対応）
    let adjustedNote = normalizedNote.replace(/(\d+(?:\.\d+)?)\s*(個|本|枚|切れ|片|玉|房|束|袋|缶|パック|g|kg|グラム|キログラム|ml|cc|リットル|l|L|大さじ|小さじ|おおさじ|こさじ|大匙|小匙|カップ|cup|C)/gi, (match, number, unit) => {
      const baseNumber = parseFloat(number);
      if (isNaN(baseNumber)) return match;
      
      let adjustedAmount;
      let multiplier = totalMultiplier;
      
      // 日本の料理に適した単位別調整
      if (unit.match(/(ml|cc|リットル|l|L)/)) {
        // 液体類：そのまま倍率適用
        multiplier = totalMultiplier;
      } else if (unit.match(/(g|kg|グラム|キログラム)/)) {
        // 重量類：そのまま倍率適用
        multiplier = totalMultiplier;
      } else if (unit.match(/(個|本|枚|切れ|片|玉|房|束)/)) {
        // 個数類：端数切り上げでしっかり確保
        multiplier = Math.ceil(totalMultiplier);
      } else if (unit.match(/(大さじ|おおさじ|大匙)/)) {
        // 大さじ：調味料も倍率適用（控えめ補正0.85倍）
        multiplier = totalMultiplier * 0.85;
      } else if (unit.match(/(小さじ|こさじ|小匙)/)) {
        // 小さじ：調味料も倍率適用（控えめ補正0.8倍）
        multiplier = totalMultiplier * 0.8;
      } else if (unit.match(/(カップ|cup|C)/)) {
        // カップ：そのまま倍率適用
        multiplier = totalMultiplier;
      } else {
        // その他：標準的な調整
        multiplier = totalMultiplier;
      }
      
      // 調整後の量を計算
      adjustedAmount = baseNumber * multiplier;
      
      // 単位に応じた丸め処理
      if (unit.match(/(個|本|枚|切れ|片|玉|房|束)/)) {
        // 個数は整数に切り上げ
        adjustedAmount = Math.ceil(adjustedAmount);
      } else if (unit.match(/(大さじ|小さじ|おおさじ|こさじ|大匙|小匙)/)) {
        // 調味料は0.5単位で調整
        adjustedAmount = Math.round(adjustedAmount * 2) / 2;
        // 最低量の保証（小さじは最低0.5、大さじは最低0.5）
        if (adjustedAmount < 0.5) adjustedAmount = 0.5;
      } else if (unit.match(/(g|kg)/)) {
        // グラムは整数に
        adjustedAmount = Math.round(adjustedAmount);
      } else {
        // その他は小数点1桁
        adjustedAmount = Math.round(adjustedAmount * 10) / 10;
      }
      
      // 整数表示可能な場合は整数に
      if (adjustedAmount === Math.floor(adjustedAmount)) {
        adjustedAmount = Math.floor(adjustedAmount);
      }
      
      console.log(`🥄 ${ingredient.name}: ${baseNumber}${unit} → ${adjustedAmount}${unit} (倍率: ${multiplier.toFixed(2)})`);
      
      return `${adjustedAmount}${unit}`;
    });
    
    // 調味料の単位を日本語の順序（単位+数字）に戻す
    adjustedNote = adjustedNote.replace(/(\d+(?:\.\d+)?)\s*(大さじ|小さじ|おおさじ|こさじ|大匙|小匙)/gi, (match, number, unit) => {
      return `${unit}${number}`;
    });
    
    // 🔄 小さじを大さじに自動変換（小さじ3 = 大さじ1）
    adjustedNote = adjustedNote.replace(/(小さじ|こさじ|小匙)\s*(\d+(?:\.\d+)?)/gi, (match, unit, number) => {
      const amount = parseFloat(number);
      
      // 小さじ3以上の場合は大さじに変換
      if (amount >= 3) {
        const tablespoons = amount / 3;
        // 0.5単位で丸める
        const roundedTablespoons = Math.round(tablespoons * 2) / 2;
        
        // 余りがある場合は「大さじ○○と小さじ○○」形式
        const wholeTablespoons = Math.floor(tablespoons);
        const remainingTeaspoons = Math.round((tablespoons - wholeTablespoons) * 3 * 2) / 2;
        
        if (remainingTeaspoons > 0 && remainingTeaspoons < 3) {
          console.log(`🔄 単位変換: 小さじ${amount} → 大さじ${wholeTablespoons}と小さじ${remainingTeaspoons}`);
          return `大さじ${wholeTablespoons}と小さじ${remainingTeaspoons}`;
        } else {
          console.log(`🔄 単位変換: 小さじ${amount} → 大さじ${roundedTablespoons}`);
          return `大さじ${roundedTablespoons}`;
        }
      }
      
      return match; // 小さじ3未満はそのまま
    });
    
    // 単位がない数値のみの場合（例: "1"、"200"など）を材料名から推測して処理
    if (normalizedNote === adjustedNote && normalizedNote.match(/^\d+(?:\.\d+)?$/)) {
      const baseNumber = parseFloat(normalizedNote);
      const ingredientName = (ingredient.name || '').toLowerCase();
      
      console.log(`🔍 単位なし数値を検出: ${processedNote} (材料: ${ingredient.name})`);
      
      // 材料名から単位を推測
      let estimatedUnit = '';
      let multiplier = totalMultiplier;
      
      if (ingredientName.match(/(きゅうり|にんじん|人参|大根|ごぼう|なす|ピーマン|トマト)/)) {
        estimatedUnit = '本';
        multiplier = Math.ceil(totalMultiplier);
      } else if (ingredientName.match(/(玉ねぎ|たまねぎ|じゃがいも|キャベツ|レタス)/)) {
        estimatedUnit = '個';
        multiplier = Math.ceil(totalMultiplier);
      } else if (ingredientName.match(/(もやし|ひき肉|挽肉|肉|魚|豆腐|チーズ)/)) {
        estimatedUnit = 'g';
        multiplier = totalMultiplier;
      } else if (ingredientName.match(/(水|だし|汁|スープ|牛乳|酒|みりん|醤油|酢|油)/)) {
        estimatedUnit = 'ml';
        multiplier = totalMultiplier * 0.85; // 液体調味料は控えめ
      } else {
        // デフォルトはg
        estimatedUnit = 'g';
        multiplier = totalMultiplier;
      }
      
      const adjustedAmount = Math.round(baseNumber * multiplier);
      adjustedNote = `${adjustedAmount}${estimatedUnit}`;
      console.log(`✅ 単位推測: ${baseNumber} → ${adjustedNote} (推測単位: ${estimatedUnit})`);
    }
    
    // 「適量」「少々」「ひとつまみ」などの定性的な表現の処理
    if (adjustedNote.match(/(適量|少々|ひとつまみ|お好み)/)) {
      const ingredientName = (ingredient.name || '').toLowerCase();
      const originalExpression = adjustedNote.match(/(適量|少々|ひとつまみ|お好み)/)?.[0] || '';
      
      console.log(`📏 定性的表現を処理: "${originalExpression}" (材料: ${ingredient.name}, 倍率: ${totalMultiplier.toFixed(2)})`);
      
      // 倍率に応じた処理
      if (totalMultiplier >= 3) {
        // 3倍以上: 具体的な量に変換
        if (ingredientName.includes('塩') || ingredientName.includes('こしょう') || ingredientName.includes('胡椒')) {
          const amount = Math.round(totalMultiplier * 0.4 * 2) / 2; // 0.5単位
          adjustedNote = adjustedNote.replace(/(適量|少々|ひとつまみ)/, `小さじ${amount}`);
          console.log(`  → 塩・胡椒: 小さじ${amount}`);
        } else if (ingredientName.includes('油') || ingredientName.includes('オイル')) {
          const amount = Math.round(totalMultiplier * 0.85 * 2) / 2;
          adjustedNote = adjustedNote.replace(/(適量|お好み)/, `大さじ${amount}`);
          console.log(`  → 油: 大さじ${amount}`);
        } else if (ingredientName.match(/(水|だし|汁|スープ|牛乳|酒|みりん|醤油|酢)/)) {
          // 液体調味料: ml換算
          const amountMl = Math.round(totalMultiplier * 15); // 1人前=15ml想定
          if (amountMl >= 200) {
            adjustedNote = adjustedNote.replace(/(適量|お好み)/, `${amountMl}ml（約${Math.round(amountMl / 200)}カップ）`);
          } else {
            const amountTbsp = Math.round(amountMl / 15 * 2) / 2;
            adjustedNote = adjustedNote.replace(/(適量|お好み)/, `大さじ${amountTbsp}程度`);
          }
          console.log(`  → 液体: ${adjustedNote}`);
        } else {
          // その他: 目安を追記
          adjustedNote = adjustedNote.replace(/(適量|少々|ひとつまみ|お好み)/, `$1（${totalMultiplier.toFixed(1)}倍量）`);
          console.log(`  → その他: ${adjustedNote}`);
        }
      } else if (totalMultiplier >= 2) {
        // 2～3倍: 目安を追記
        if (ingredientName.includes('塩') || ingredientName.includes('こしょう') || ingredientName.includes('胡椒')) {
          adjustedNote = adjustedNote.replace(/(適量|少々|ひとつまみ)/, `$1（小さじ1/4～1/2程度）`);
        } else if (ingredientName.includes('油') || ingredientName.includes('オイル')) {
          adjustedNote = adjustedNote.replace(/(適量|お好み)/, `$1（大さじ1～2程度）`);
        } else {
          adjustedNote = adjustedNote.replace(/(適量|少々|ひとつまみ|お好み)/, `$1（やや多めに）`);
        }
        console.log(`  → 目安追記: ${adjustedNote}`);
      } else if (totalMultiplier < 1) {
        // 1倍未満（お弁当サイズなど）: 控えめの目安
        if (ingredientName.includes('塩') || ingredientName.includes('こしょう') || ingredientName.includes('胡椒')) {
          adjustedNote = adjustedNote.replace(/(適量|少々|ひとつまみ)/, `$1（控えめに）`);
        } else {
          adjustedNote = adjustedNote.replace(/(適量|お好み)/, `$1（少なめに）`);
        }
        console.log(`  → 控えめ表示: ${adjustedNote}`);
      } else {
        // 1倍前後: そのまま
        console.log(`  → 変更なし（1倍程度のため）`);
      }
    }
    
    console.log(`✅ 最終調整結果: "${originalNote}" → "${adjustedNote}" (倍率: ${totalMultiplier.toFixed(2)})`);
    return adjustedNote;
  };

  // 動的なデータか静的なデータかを判定
  const isBento = !!bento;
  const isRecipe = !!recipe;
  
  // 材料データを準備（お弁当メニュー用）
  const ingredients = useMemo(() => {
    // 単一レシピの場合
    if (isRecipe && recipe && recipe.ingredients) {
      console.log('📦 単一レシピの材料を使用:', recipe.ingredients.length, '個');
      return recipe.ingredients.map((ing: any, idx: number) => ({
        id: `recipe-ing-${idx}`,
        name: ing.name || '材料',
        note: ing.amount || '適量'
      }));
    }
    
    // お弁当の場合
    if (isBento && bento) {
      console.log('🍱 お弁当の材料を使用');
      return bento.items.flatMap((item: any, idx: number) => 
        item.recipe.ingredients.slice(0, 3).map((ing: any, subIdx: number) => ({
          id: `bento-ing-${idx}-${subIdx}`,
          name: ing.name || '材料',
          note: `${Math.round(item.portion * 100)}%分 (${item.recipe.nameJa || item.recipe.name}用)`
        }))
      );
    }
    
    // その他の場合は空配列
    return [];
  }, [bento, recipe, isRecipe, isBento]);

  // 調整された材料リストを生成
  const adjustedIngredients = useMemo(() => {
    if (!ingredients) return ingredients;
    
    // 何も選択されていない場合は元の材料を返す
    if (selectedBentoIds.length === 0 && !includeBreakfast) {
      return ingredients;
    }
    
    return ingredients.map(ingredient => ({
      ...ingredient,
      note: ingredient.note ? calculateIngredientAmount(ingredient.note, ingredient) : ingredient.note
    }));
  }, [ingredients, selectedBentoIds, includeBreakfast, breakfastPortions, availableBentoSizes]);

  // カロリーデータを準備
  const calories = useMemo(() => {
    // 単一/複数レシピの場合
    if (isRecipe && selectedRecipes.length > 0) {
      const allCalories: Calorie[] = [];
      
      selectedRecipes.forEach((selectedRecipe, index) => {
        // 一人前のカロリーを推定
        let baseKcal = estimateCaloriesPerServing(selectedRecipe);
        
        // 既存の栄養情報がある場合は優先
        if (selectedRecipe.calories) {
          baseKcal = typeof selectedRecipe.calories === 'number' 
            ? selectedRecipe.calories 
            : parseFloat(selectedRecipe.calories) || baseKcal;
        } else if (selectedRecipe.nutrition?.calories) {
          const calStr = selectedRecipe.nutrition.calories;
          const match = calStr.match(/(\d+)/);
          if (match) {
            baseKcal = parseFloat(match[1]);
          }
        }
        
        // お弁当サイズや朝食の倍率を考慮してカロリーを調整
        const selectedBentos = availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id));
        const totalBentoVolume = selectedBentos.reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0);
        
        let calorieMultiplier = 1.0; // デフォルトは一人前
        if (selectedBentos.length > 0) {
          // お弁当サイズに応じて調整（800ml = 標準一人前）
          calorieMultiplier = totalBentoVolume / 800;
        }
        if (includeBreakfast) {
          calorieMultiplier += (parseInt(breakfastPortions?.toString() || '0') || 0);
        }
        
        const adjustedKcal = Math.round(baseKcal * calorieMultiplier);
        
        allCalories.push({
          id: `recipe-${index}`,
          label: `${index + 1}品目: ${selectedRecipe.title || 'レシピ'} (一人前)`,
          kcal: adjustedKcal
        });
      });
      
      return allCalories.length > 0 ? allCalories : [];
    }
    
    // お弁当の場合
    if (isBento && bento) {
      return bento.items.map((item: any, idx: number) => ({
        id: `bento-${idx}`,
        label: `${item.recipe.nameJa || item.recipe.name} (${Math.round(item.portion * 100)}%)`,
        kcal: Math.round(item.adjustedNutrition.calories)
      }));
    }
    
    // デフォルト
    return CALS;
  }, [bento, recipe, isRecipe, selectedRecipes, selectedBentoIds, includeBreakfast, breakfastPortions, availableBentoSizes]);

  const total = useMemo(
    () => calories.reduce((s, c) => s + c.kcal, 0),
    [calories]
  );
  
  // 表示用のタイトルを決定
  const displayTitle = useMemo(() => {
    if (isRecipe && recipe) {
      return recipe.title || 'レシピ詳細';
    }
    if (isBento) {
      return 'お弁当詳細';
    }
    return 'メニュー詳細';
  }, [isRecipe, isBento, recipe]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Blob color={PALETTE.grape} size={200} top={-50} left={-50} rotate={15} />
        <Blob color={PALETTE.blue} size={150} top={120} left={width * 0.65} rotate={-10} />
        <Blob color={PALETTE.coral} size={180} top={350} left={-60} rotate={8} />
        <Blob color={PALETTE.teal} size={140} top={580} left={width * 0.7} rotate={-20} />
      </View>

      {/* Top Bar（グラデ）- 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.grape, PALETTE.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {displayTitle}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={18} color="#0B1220" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="star-outline" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs */}
        <Card style={styles.tabsCard}>
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setTab(t);
                  // セクションにスクロール
                  const sectionY = sectionRefs.current[t];
                  if (sectionY !== undefined && scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ y: sectionY, animated: true });
                  }
                }}
                style={[styles.tab, tab === t && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* お弁当作成設定 */}
        <View onLayout={(event) => {
          sectionRefs.current["メニュー"] = event.nativeEvent.layout.y;
        }}>
          <SectionTitle title="お弁当作成設定" accent={PALETTE.grape} />
        </View>
        <Card style={styles.bentoSettingsCard}>
          {/* 対象のお弁当選択 */}
          <View style={styles.settingSection}>
            <Text style={styles.settingTitle}>作成するお弁当を選択</Text>
            <Text style={styles.settingSubtitle}>複数選択可能です</Text>
            {availableBentoSizes.map((bento) => (
              <TouchableOpacity 
                key={bento.id} 
                style={styles.bentoOption}
                onPress={() => toggleBentoSelection(bento.id)}
              >
                <View style={styles.bentoOptionLeft}>
                  <View style={[
                    styles.checkbox,
                    selectedBentoIds.includes(bento.id) && styles.checkboxSelected
                  ]}>
                    {selectedBentoIds.includes(bento.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.bentoName}>{bento.name}</Text>
                    <Text style={styles.bentoDetails}>
                      {bento.capacity}ml ({bento.width}×{bento.length}×{bento.height}cm)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 朝ごはん設定 */}
          <View style={styles.settingDivider} />
          <View style={styles.settingSection}>
            <View style={styles.breakfastHeader}>
              <View>
                <Text style={styles.settingTitle}>朝ごはん分も調理する</Text>
                <Text style={styles.settingSubtitle}>余ったおかずを朝ごはんに活用</Text>
              </View>
              <Switch
                value={includeBreakfast}
                onValueChange={setIncludeBreakfast}
                trackColor={{ false: PALETTE.stroke, true: PALETTE.grape }}
                thumbColor={includeBreakfast ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            {includeBreakfast && (
              <View style={styles.breakfastPortions}>
                <Text style={styles.portionLabel}>朝ごはんの人数分</Text>
                <TextInput
                  style={styles.portionInput}
                  value={breakfastPortions}
                  onChangeText={setBreakfastPortions}
                  keyboardType="numeric"
                  placeholder="1"
                />
                <Text style={styles.portionUnit}>人分</Text>
              </View>
            )}
          </View>
        </Card>

        {/* お弁当の比率設定（レシピが2品以上選択されている場合のみ表示） */}
        {isRecipe && selectedRecipes.length >= 2 && (
          <>
            <SectionTitle 
              title="🍱 お弁当の比率設定" 
              subtitle="詰め方ガイドで使用されます"
              accent={PALETTE.coral} 
            />
            <Card style={styles.bentoRatioCard}>
              {/* ご飯の量設定 */}
              <View style={styles.bentoRatioSection}>
                <View style={styles.bentoRatioHeader}>
                  <MaterialCommunityIcons name="rice" size={20} color={PALETTE.coral} />
                  <Text style={styles.bentoRatioTitle}>🍚 ご飯の量</Text>
                  <View style={styles.bentoRatioBadge}>
                    <Text style={styles.bentoRatioBadgeText}>{bentoRiceRatio}</Text>
                  </View>
                </View>
                <View style={styles.bentoRatioButtons}>
                  {[1, 2, 3, 4, 5].map((ratio) => (
                    <TouchableOpacity
                      key={ratio}
                      style={[
                        styles.bentoRatioButton,
                        bentoRiceRatio === ratio && styles.bentoRatioButtonActive
                      ]}
                      onPress={() => setBentoRiceRatio(ratio)}
                    >
                      <Text style={[
                        styles.bentoRatioButtonText,
                        bentoRiceRatio === ratio && styles.bentoRatioButtonTextActive
                      ]}>{ratio}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.bentoRatioLabels}>
                  <Text style={styles.bentoRatioLabelText}>少なめ</Text>
                  <Text style={styles.bentoRatioLabelText}>標準</Text>
                  <Text style={styles.bentoRatioLabelText}>多め</Text>
                </View>
              </View>

              {/* レイアウト設定 */}
              <View style={[styles.bentoRatioSection, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: PALETTE.stroke }]}>
                <View style={styles.bentoRatioHeader}>
                  <MaterialCommunityIcons name="grid" size={20} color={PALETTE.blue} />
                  <Text style={styles.bentoRatioTitle}>📐 レイアウト</Text>
                </View>
                <View style={styles.bentoLayoutButtons}>
                  <TouchableOpacity
                    style={[
                      styles.bentoLayoutButton,
                      bentoLayoutType === '2split' && styles.bentoLayoutButtonActive
                    ]}
                    onPress={() => setBentoLayoutType('2split')}
                  >
                    <Text style={[
                      styles.bentoLayoutButtonText,
                      bentoLayoutType === '2split' && styles.bentoLayoutButtonTextActive
                    ]}>2分割</Text>
                    <Text style={[
                      styles.bentoLayoutButtonDesc,
                      bentoLayoutType === '2split' && styles.bentoLayoutButtonDescActive
                    ]}>ご飯|おかず</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bentoLayoutButton,
                      bentoLayoutType === '3split' && styles.bentoLayoutButtonActive
                    ]}
                    onPress={() => setBentoLayoutType('3split')}
                  >
                    <Text style={[
                      styles.bentoLayoutButtonText,
                      bentoLayoutType === '3split' && styles.bentoLayoutButtonTextActive
                    ]}>3分割</Text>
                    <Text style={[
                      styles.bentoLayoutButtonDesc,
                      bentoLayoutType === '3split' && styles.bentoLayoutButtonDescActive
                    ]}>ご飯|主菜|副菜</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bentoLayoutButton,
                      bentoLayoutType === '4split' && styles.bentoLayoutButtonActive
                    ]}
                    onPress={() => setBentoLayoutType('4split')}
                  >
                    <Text style={[
                      styles.bentoLayoutButtonText,
                      bentoLayoutType === '4split' && styles.bentoLayoutButtonTextActive
                    ]}>4分割</Text>
                    <Text style={[
                      styles.bentoLayoutButtonDesc,
                      bentoLayoutType === '4split' && styles.bentoLayoutButtonDescActive
                    ]}>ご飯|主菜|副菜2</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* プレビュー表示 */}
              <View style={[styles.bentoRatioSection, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: PALETTE.stroke }]}>
                <Text style={styles.bentoPreviewTitle}>📊 プレビュー</Text>
                <View style={styles.bentoPreviewContainer}>
                  <View style={styles.bentoPreviewBox}>
                    {/* 簡易プレビュー表示 */}
                    <View style={{ flexDirection: 'row', height: 80 }}>
                      {/* ご飯エリア */}
                      <View style={[
                        styles.bentoPreviewArea,
                        { 
                          width: `${(bentoRiceRatio / 6) * 100}%`,
                          backgroundColor: 'rgba(255, 212, 128, 0.3)',
                          borderRightWidth: 1,
                          borderColor: '#ddd'
                        }
                      ]}>
                        <Text style={styles.bentoPreviewLabel}>ご飯</Text>
                        <Text style={styles.bentoPreviewPercent}>{Math.round((bentoRiceRatio / 6) * 100)}%</Text>
                      </View>
                      {/* おかずエリア */}
                      <View style={{ flex: 1, flexDirection: 'column' }}>
                        {bentoLayoutType === '2split' && (
                          <View style={[styles.bentoPreviewArea, { backgroundColor: 'rgba(255, 138, 128, 0.3)', flex: 1 }]}>
                            <Text style={styles.bentoPreviewLabel}>おかず</Text>
                            <Text style={styles.bentoPreviewPercent}>{Math.round((1 - bentoRiceRatio / 6) * 100)}%</Text>
                          </View>
                        )}
                        {bentoLayoutType === '3split' && (
                          <>
                            <View style={[styles.bentoPreviewArea, { backgroundColor: 'rgba(255, 138, 128, 0.3)', flex: 1, borderBottomWidth: 1, borderColor: '#ddd' }]}>
                              <Text style={styles.bentoPreviewLabel}>主菜</Text>
                            </View>
                            <View style={[styles.bentoPreviewArea, { backgroundColor: 'rgba(165, 214, 167, 0.3)', flex: 1 }]}>
                              <Text style={styles.bentoPreviewLabel}>副菜</Text>
                            </View>
                          </>
                        )}
                        {bentoLayoutType === '4split' && (
                          <>
                            <View style={[styles.bentoPreviewArea, { backgroundColor: 'rgba(255, 138, 128, 0.3)', flex: 1, borderBottomWidth: 1, borderColor: '#ddd' }]}>
                              <Text style={styles.bentoPreviewLabel}>主菜</Text>
                            </View>
                            <View style={[styles.bentoPreviewArea, { backgroundColor: 'rgba(165, 214, 167, 0.3)', flex: 1, borderBottomWidth: 1, borderColor: '#ddd' }]}>
                              <Text style={styles.bentoPreviewLabel}>副菜1</Text>
                            </View>
                            <View style={[styles.bentoPreviewArea, { backgroundColor: 'rgba(144, 202, 249, 0.3)', flex: 1 }]}>
                              <Text style={styles.bentoPreviewLabel}>副菜2</Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.bentoPreviewNote}>
                    💡 この設定は詰め方ガイドで表示されるオーバーレイに反映されます
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* 材料 */}
        <View onLayout={(event) => {
          sectionRefs.current["材料"] = event.nativeEvent.layout.y;
        }}>
          <SectionTitle title="材料" accent={PALETTE.coral} />
        </View>
        
        {/* 複数レシピ対応：選択されたレシピごとに材料を表示 */}
        {isRecipe && selectedRecipes.length > 0 && selectedRecipes.map((selectedRecipe, recipeIndex) => (
          <View key={`recipe-ingredients-${recipeIndex}`} style={{ marginBottom: 16 }}>
            {selectedRecipes.length > 1 && (
              <View style={styles.recipeNumberBadge}>
                <Text style={styles.recipeNumberText}>{recipeIndex + 1}品目</Text>
                <Text style={styles.recipeNameText}>{selectedRecipe.title}</Text>
              </View>
            )}
            
            {(selectedBentoIds.length > 0 || includeBreakfast) && (() => {
              const currentSelectedBentos = availableBentoSizes.filter(bento => 
                selectedBentoIds.includes(bento.id)
              );
              return (
                <Card style={styles.adjustmentInfoCard}>
                  <View style={styles.adjustmentInfo}>
                    <Ionicons name="information-circle" size={16} color={PALETTE.blue} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.adjustmentText, { fontWeight: 'bold', marginBottom: 4 }]}>
                        📦 材料調整情報
                      </Text>
                      {selectedBentoIds.length > 0 && (
                        <View>
                          <Text style={styles.adjustmentText}>
                            • 選択されたお弁当: {availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id)).length}個
                          </Text>
                          {availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id)).map((bento, index) => (
                            <Text key={index} style={[styles.adjustmentText, { fontSize: 12, marginLeft: 10, color: PALETTE.subtle }]}>
                              {bento.name} ({bento.capacity}ml)
                            </Text>
                          ))}
                          <Text style={[styles.adjustmentText, { fontSize: 12, color: PALETTE.subtle }]}>
                            合計容量: {availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id)).reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0)}ml
                          </Text>
                        </View>
                      )}
                      {includeBreakfast && (
                        <Text style={styles.adjustmentText}>
                          • 朝食追加: {breakfastPortions || 0}人分
                        </Text>
                      )}
                      <Text style={[styles.adjustmentText, { fontSize: 12, fontWeight: 'bold', color: PALETTE.blue, marginTop: 4 }]}>
                        調整倍率: {(() => {
                          const selectedBentos = availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id));
                          const totalCapacity = selectedBentos.reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0);
                          let totalMultiplier = 1.0; // デフォルトは食卓1人前
                          if (selectedBentos.length > 0) {
                            totalMultiplier = totalCapacity / 800;
                          }
                          if (includeBreakfast) {
                            totalMultiplier += (parseInt(breakfastPortions?.toString() || '0') || 0);
                          }
                          return totalMultiplier.toFixed(2);
                        })()}倍 (基準: 800ml=食卓1人前)
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })()}
            {selectedBentoIds.length === 0 && !includeBreakfast && (
              <Card style={styles.adjustmentInfoCard}>
                <View style={styles.adjustmentInfo}>
                  <Ionicons name="restaurant" size={16} color={PALETTE.subtle} />
                  <Text style={[styles.adjustmentText, { color: PALETTE.subtle }]}>
                    食卓1人前の分量です。お弁当を選択すると容量に応じて自動調整されます
                  </Text>
                </View>
              </Card>
            )}
            <Card style={styles.listCard}>
              {(() => {
                console.log('[材料デバッグ] selectedRecipe:', selectedRecipe);
                console.log('[材料デバッグ] ingredients:', selectedRecipe.ingredients);
                return (selectedRecipe.ingredients || []).map((ing: any, i: number) => {
                  const adjustedAmount = calculateIngredientAmount(ing.note || ing.amount || '', ing);
                  return (
                    <View key={`ing-${recipeIndex}-${i}`}>
                      <RowCard 
                        title={ing.name} 
                        subtitle={adjustedAmount || '適量'} 
                        accent={PALETTE.coral} 
                      />
                      {i !== (selectedRecipe.ingredients || []).length - 1 && <View style={styles.divider} />}
                    </View>
                  );
                });
              })()}
            </Card>
          </View>
        ))}
        
        {/* お弁当メニューの場合の材料表示（既存ロジック） */}
        {!isRecipe && (
          <>
            {(selectedBentoIds.length > 0 || includeBreakfast) && (() => {
              const currentSelectedBentos = availableBentoSizes.filter(bento => 
                selectedBentoIds.includes(bento.id)
              );
              return (
                <Card style={styles.adjustmentInfoCard}>
                  <View style={styles.adjustmentInfo}>
                    <Ionicons name="information-circle" size={16} color={PALETTE.blue} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.adjustmentText, { fontWeight: 'bold', marginBottom: 4 }]}>
                        📦 材料調整情報
                      </Text>
                      {selectedBentoIds.length > 0 && (
                        <View>
                          <Text style={styles.adjustmentText}>
                            • 選択されたお弁当: {availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id)).length}個
                          </Text>
                          {availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id)).map((bento, index) => (
                            <Text key={index} style={[styles.adjustmentText, { fontSize: 12, marginLeft: 10, color: PALETTE.subtle }]}>
                              {bento.name} ({bento.capacity}ml)
                            </Text>
                          ))}
                          <Text style={[styles.adjustmentText, { fontSize: 12, color: PALETTE.subtle }]}>
                            合計容量: {availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id)).reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0)}ml
                          </Text>
                        </View>
                      )}
                      {includeBreakfast && (
                        <Text style={styles.adjustmentText}>
                          • 朝食追加: {breakfastPortions || 0}人分
                        </Text>
                      )}
                      <Text style={[styles.adjustmentText, { fontSize: 12, fontWeight: 'bold', color: PALETTE.blue, marginTop: 4 }]}>
                        調整倍率: {(() => {
                          const selectedBentos = availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id));
                          const totalCapacity = selectedBentos.reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0);
                          let totalMultiplier = 1.0; // デフォルトは食卓1人前
                          if (selectedBentos.length > 0) {
                            totalMultiplier = totalCapacity / 800;
                          }
                          if (includeBreakfast) {
                            totalMultiplier += (parseInt(breakfastPortions?.toString() || '0') || 0);
                          }
                          return totalMultiplier.toFixed(2);
                        })()}倍 (基準: 800ml=食卓1人前)
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })()}
            {selectedBentoIds.length === 0 && !includeBreakfast && (
              <Card style={styles.adjustmentInfoCard}>
                <View style={styles.adjustmentInfo}>
                  <Ionicons name="restaurant" size={16} color={PALETTE.subtle} />
                  <Text style={[styles.adjustmentText, { color: PALETTE.subtle }]}>
                    食卓1人前の分量です。お弁当を選択すると容量に応じて自動調整されます
                  </Text>
                </View>
              </Card>
            )}
            <Card style={styles.listCard}>
              {adjustedIngredients.map((ing, i) => {
                const adjustedAmount = calculateIngredientAmount(ing.note, ing);
                // 材料名が空文字・null・○のみの場合はtitleを非表示
                const isNameEmpty = !ing.name || ing.name.trim() === '' || ing.name.trim() === '○';
                return (
                  <View key={ing.id}>
                    <RowCard 
                      title={isNameEmpty ? '' : ing.name} 
                      subtitle={adjustedAmount || '適量'} 
                      accent={PALETTE.coral} 
                    />
                    {i !== adjustedIngredients.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* 作り方 */}
        <View onLayout={(event) => {
          sectionRefs.current["作り方"] = event.nativeEvent.layout.y;
        }}>
          <SectionTitle title="作り方" accent={PALETTE.teal} />
        </View>
        
        {/* 複数レシピ対応：選択されたレシピごとに作り方を表示 */}
        {isRecipe && selectedRecipes.length > 0 && selectedRecipes.map((selectedRecipe, recipeIndex) => (
          <View key={`recipe-instructions-${recipeIndex}`} style={{ marginBottom: 16 }}>
            {selectedRecipes.length > 1 && (
              <View style={styles.recipeNumberBadge}>
                <Text style={styles.recipeNumberText}>{recipeIndex + 1}品目</Text>
                <Text style={styles.recipeNameText}>{selectedRecipe.title}</Text>
              </View>
            )}
            
            <Card style={styles.listCard}>
              {(() => {
                console.log('[作り方デバッグ] selectedRecipe:', selectedRecipe);
                console.log('[作り方デバッグ] instructions:', selectedRecipe.instructions);
                if (selectedRecipe.instructions && selectedRecipe.instructions.length > 0) {
                  return selectedRecipe.instructions.map((instruction: any, index: number) => {
                    const stepNumber = index + 1;
                    const stepText = instruction.text || instruction;
                    const stepImage = instruction.image;
                    const stepImages = instruction.images || [];
                    const allImages = stepImage ? [stepImage, ...stepImages] : stepImages;
                    // デバッグログ
                    if (index < 3) {
                      console.log(`🔍 手順${stepNumber}の画像データ:`, {
                        stepImage,
                        stepImagesLength: stepImages.length,
                        allImagesLength: allImages.length,
                        allImages: allImages
                      });
                    }
                    return (
                      <View key={`recipe-${recipeIndex}-step-${index}`}>
                        <TouchableOpacity
                          onPress={() => {
                            setStepDetailModal({
                              visible: true,
                              stepData: instruction,
                              dishName: selectedRecipe.title || 'レシピ',
                              stepNumber
                            });
                          }}
                          style={styles.stepRow}
                          activeOpacity={0.7}
                        >
                          <View style={styles.stepIconWrapper}>
                            <MaterialCommunityIcons 
                              name="clipboard-text-outline" 
                              size={20} 
                              color={PALETTE.teal} 
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>手順 {stepNumber}</Text>
                            <Text style={styles.stepText} numberOfLines={3}>
                              {stepText}
                            </Text>
                            {/* 手順の画像をサムネイル表示 */}
                            {allImages.length > 0 && (
                              <View style={{ marginTop: 8 }}>
                                <ScrollView 
                                  horizontal 
                                  showsHorizontalScrollIndicator={false}
                                  style={{ marginTop: 4 }}
                                >
                                  {allImages.slice(0, 3).map((img: string, imgIdx: number) => (
                                    <Image
                                      key={`step-${index}-img-${imgIdx}`}
                                      source={{ uri: img }}
                                      style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 8,
                                        marginRight: 8,
                                        backgroundColor: PALETTE.stroke
                                      }}
                                      resizeMode="cover"
                                    />
                                  ))}
                                </ScrollView>
                                <Text style={styles.hasImageBadge}>
                                  📸 {allImages.length}枚の画像
                                </Text>
                              </View>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={PALETTE.subtle} />
                        </TouchableOpacity>
                        {index !== selectedRecipe.instructions.length - 1 && <View style={styles.divider} />}
                      </View>
                    );
                  });
                } else {
                  return (
                    <View style={{ opacity: 0.7 }}>
                      <RowCard
                        title="調理手順はレシピ提供元でご確認ください"
                        subtitle={`「${selectedRecipe.title}」の詳細な手順はレシピURLからご覧いただけます`}
                        icon="open-in-new"
                        accent={PALETTE.teal}
                      />
                    </View>
                  );
                }
              })()}
            </Card>
          </View>
        ))}
        
        {/* お弁当メニューの場合の作り方表示（既存ロジック） */}
        {!isRecipe && (
          <Card style={styles.listCard}>
          {isBento ? (
            bento.items.map((item, i) => {
              // 料理名から詳細な日本語調理手順を生成
              const dishName = item.recipe.title || item.recipe.nameJa || item.recipe.name || `料理${i + 1}`;
              const portionText = Math.round(item.portion * 100);
              
              console.log(`🍱 料理${i + 1}詳細:`, {
                dishName,
                role: item.role,
                portion: portionText,
                hasInstructions: !!(item.recipe.instructions && item.recipe.instructions.length > 0),
                instructionsCount: item.recipe.instructions?.length || 0,
                recipeKeys: Object.keys(item.recipe || {}),
                firstInstruction: item.recipe.instructions?.[0]
              });
              
              // お弁当向けの最適化処理関数（倍率パラメータを追加）
              const optimizeForBento = (stepText: string, role: string, portion: number, multiplier: number, recipeName?: string): string => {
                let optimized = stepText;
                
                console.log(`🔧 手順最適化: "${stepText.substring(0, 50)}..." (倍率: ${multiplier.toFixed(2)})`);
                
                // 分量調整のパターンマッチング（倍率を考慮）- より詳細な調整
                
                // 重量の調整 (g, kg)
                optimized = optimized.replace(/(\d+(?:\.\d+)?)\s*(g|グラム|kg|キログラム)/g, (match, amount, unit) => {
                  const baseAmount = parseFloat(amount);
                  const adjustedAmount = unit.includes('kg') || unit.includes('キログラム') 
                    ? Math.round(baseAmount * multiplier * 100) / 100  // kg は小数点2桁
                    : Math.round(baseAmount * multiplier);  // g は整数
                  console.log(`  重量調整: ${amount}${unit} → ${adjustedAmount}${unit}`);
                  return `${adjustedAmount}${unit}`;
                });
                
                // 体積の調整 (ml, cc, l)
                optimized = optimized.replace(/(\d+(?:\.\d+)?)\s*(ml|cc|リットル|l|L)/g, (match, amount, unit) => {
                  const baseAmount = parseFloat(amount);
                  const adjustedAmount = unit.includes('リットル') || unit.includes('l') || unit.includes('L')
                    ? Math.round(baseAmount * multiplier * 100) / 100  // リットルは小数点2桁
                    : Math.round(baseAmount * multiplier);  // ml は整数
                  console.log(`  体積調整: ${amount}${unit} → ${adjustedAmount}${unit}`);
                  return `${adjustedAmount}${unit}`;
                });
                
                // 個数の調整（切り上げ）
                optimized = optimized.replace(/(\d+(?:\.\d+)?)\s*(個|本|枚|切れ|片|玉|房|束|人分)/g, (match, amount, unit) => {
                  const baseAmount = parseFloat(amount);
                  const adjustedAmount = Math.ceil(baseAmount * multiplier);  // 個数は必ず切り上げ
                  console.log(`  個数調整: ${amount}${unit} → ${adjustedAmount}${unit}`);
                  return `${adjustedAmount}${unit}`;
                });
                
                // 調味料の調整（控えめ）
                optimized = optimized.replace(/(\d+(?:\.\d+)?)\s*(大さじ|おおさじ|大匙)/g, (match, amount, unit) => {
                  const baseAmount = parseFloat(amount);
                  const adjustedAmount = Math.round(baseAmount * multiplier * 0.85 * 10) / 10; // 調味料は15%控えめ
                  console.log(`  大さじ調整: ${amount}${unit} → ${adjustedAmount}${unit} (85%)`);
                  return `${adjustedAmount}${unit}`;
                });
                
                optimized = optimized.replace(/(\d+(?:\.\d+)?)\s*(小さじ|こさじ|小匙)/g, (match, amount, unit) => {
                  const baseAmount = parseFloat(amount);
                  const adjustedAmount = Math.round(baseAmount * multiplier * 0.8 * 10) / 10; // 調味料は20%控えめ
                  console.log(`  小さじ調整: ${amount}${unit} → ${adjustedAmount}${unit} (80%)`);
                  return `${adjustedAmount}${unit}`;
                });
                
                // 米・穀物の調整
                optimized = optimized.replace(/(\d+(?:\.\d+)?)\s*(合|カップ|cup)/g, (match, amount, unit) => {
                  const baseAmount = parseFloat(amount);
                  const adjustedAmount = Math.round(baseAmount * multiplier * 10) / 10;
                  console.log(`  穀物調整: ${amount}${unit} → ${adjustedAmount}${unit}`);
                  return `${adjustedAmount}${unit}`;
                });
                
                // 温度や時間は調整しない（そのまま保持）
                // 例: 170℃、5分間 など
                
                // お弁当向けの追加アドバイス
                if (role === 'main') {
                  if (!optimized.includes('お弁当') && !optimized.includes('盛り付け')) {
                    optimized += '（お弁当のメイン区画に盛り付ける）';
                  }
                } else if (role === 'side') {
                  if (!optimized.includes('お弁当') && !optimized.includes('区画')) {
                    optimized += '（お弁当のサブ区画に入れる）';
                  }
                } else if (role === 'vegetable') {
                  if (!optimized.includes('彩り') && !optimized.includes('お弁当')) {
                    optimized += '（彩りのため端に配置）';
                  }
                }
                
                // 冷めても美味しくなるアドバイスを追加
                if ((stepText.includes('仕上げ') || stepText.includes('盛り付け') || stepText.includes('完成')) 
                    && !optimized.includes('冷まし')) {
                  optimized += '。お弁当用なので、しっかり冷ましてから詰める';
                }
                
                return optimized;
              };
              
              // APIから取得した調理手順をお弁当向けに最適化して提供
              const getOptimizedSteps = (recipe: any, role: string, portion: number, multiplier: number) => {
                console.log(`🍽️ レシピ手順処理: ${recipe.title || recipe.name}`, { 
                  hasInstructions: !!(recipe.instructions && recipe.instructions.length > 0),
                  instructionsCount: recipe.instructions?.length || 0,
                  role, 
                  multiplier: multiplier.toFixed(2)
                });
                
                // 最優先: 楽天レシピAPIから取得した手順がある場合
                if (recipe.instructions && recipe.instructions.length > 0) {
                  console.log(`✅ API手順を使用: ${recipe.instructions.length}ステップ`);
                  return recipe.instructions.map((instruction: any, index: number) => {
                    let stepText = instruction.text || instruction;
                    
                    // お弁当向けの最適化処理（倍率を適用）
                    stepText = optimizeForBento(stepText, role, portion, multiplier, recipe.title);
                    
                    console.log(`📝 ステップ${index + 1}: ${stepText}`);
                    return stepText;
                  });
                }
                
                // 次優先: ご飯の場合は専用手順
                if (role === 'rice' || (recipe.title && recipe.title.includes('ご飯'))) {
                  console.log(`🍚 ご飯専用手順を使用`);
                  const riceAmount = Math.round(portion * 1.5 / 100 * multiplier * 10) / 10;
                  const waterAmount = Math.round(riceAmount * 1.2 * 10) / 10;
                  return [
                    `米${riceAmount}合をボウルに入れ、水を注いで軽くかき混ぜる`,
                    '水を捨てて、手のひらでお米を押すように3-4回研ぐ',
                    'きれいな水で2-3回すすぎ、30分以上浸水させる',
                    `炊飯器に米と水${waterAmount}合を入れて炊飯ボタンを押す`,
                    '炊き上がったら10分蒸らし、しゃもじで十字に切るように混ぜる',
                    'お弁当箱の半分程度に盛り付ける'
                  ];
                }
                
                // 最後の手段: APIから手順が取得できない場合のフォールバック手順
                const recipeName = recipe.title || recipe.name || '';
                const lowerName = recipeName.toLowerCase();
                
                console.warn(`⚠️ API手順なし、フォールバック手順を使用: ${recipeName}`);
                console.log('📋 レシピオブジェクト構造:', JSON.stringify(recipe, null, 2));
                
                // フォールバック手順の生成（料理名に基づく推測）
                
                // サーモン系料理
                if (lowerName.includes('サーモン') || lowerName.includes('鮭') || lowerName.includes('salmon')) {
                  if (lowerName.includes('照り焼き') || lowerName.includes('ハニー')) {
                    const oilAmount = Math.round(1 * multiplier * 10) / 10;
                    const honeyAmount = Math.round(1 * multiplier * 10) / 10;
                    const soyAmount = Math.round(1 * multiplier * 10) / 10;
                    const steps = [
                      'サーモンを一口大（3-4cm角）にカットし、塩胡椒を軽くふる',
                      `フライパンにオリーブ油大さじ${oilAmount}を熱し、中火で温める`,
                      'サーモンを皮目から入れ、3分間動かさずに焼く',
                      'ひっくり返して反対面も2-3分焼き、火を通す',
                      `ハニー大さじ${honeyAmount}、醤油大さじ${soyAmount}を混ぜたタレを加える`,
                      'タレが絡むまで1-2分炒め、ツヤが出たら完成'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  } else if (lowerName.includes('フェンネル') || lowerName.includes('トマト')) {
                    const steps = [
                      'フェンネルを薄切り（2-3mm）にし、トマトを1cm角にカット',
                      'サーモンを一口大にカットし、塩胡椒で下味をつける',
                      'オリーブ油でフェンネルを中火で5分炒め、しんなりさせる',
                      'トマトを加えて2分炒め、水分を少し飛ばす',
                      'サーモンを加えて3-4分、中まで火を通す',
                      'レモン汁とハーブ（あれば）で風味をつけて完成'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  }
                }
                
                // 鶏肉系料理（照り焼き、唐揚げなど）
                else if (lowerName.includes('鶏') || lowerName.includes('チキン') || lowerName.includes('chicken')) {
                  if (lowerName.includes('照り焼き') || lowerName.includes('テリヤキ')) {
                    const meatAmount = Math.round(portionText * 2 * multiplier);
                    const saltAmount = Math.round(0.5 * multiplier * 10) / 10;
                    const oilAmount = Math.round(1 * multiplier * 10) / 10;
                    const soyAmount = Math.round(2 * multiplier * 10) / 10;
                    const mirinAmount = Math.round(2 * multiplier * 10) / 10;
                    const sugarAmount = Math.round(1 * multiplier * 10) / 10;
                    return [
                      `鶏もも肉${meatAmount}gを一口大（3cm角）にカット`,
                      `塩小さじ${saltAmount}、胡椒少々をまぶし、10分下味をつける`,
                      `フライパンにサラダ油大さじ${oilAmount}を熱し、中火で温める`,
                      '鶏肉を皮目から入れ、4-5分動かさずに焼く',
                      'ひっくり返して3-4分焼き、中まで火を通す',
                      `醤油大さじ${soyAmount}、みりん大さじ${mirinAmount}、砂糖小さじ${sugarAmount}を混ぜたタレを加える`,
                      'タレが絡むまで1-2分炒め、ツヤが出たら完成'
                    ];
                  } else {
                    const meatAmount = Math.round(portionText * 2 * multiplier);
                    return [
                      `鶏肉${meatAmount}gを適切なサイズにカット`,
                      '塩胡椒で下味をつけ、15分馴染ませる',
                      'フライパンを中火で熱し、油を入れる',
                      '鶏肉を入れて焼き色がつくまで焼く',
                      '中まで火が通るまでしっかり加熱する',
                      '器に盛り付けて完成'
                    ];
                  }
                }
                
                // とんかつ・豚肉系
                else if (lowerName.includes('とんかつ') || lowerName.includes('豚') || lowerName.includes('ポーク')) {
                  if (lowerName.includes('とんかつ')) {
                    const meatAmount = Math.round(portionText * 2 * multiplier);
                    const steps = [
                      `豚ロース肉${meatAmount}gの筋を包丁で数カ所切る`,
                      '肉叩きで1cm厚に叩き、塩胡椒をまぶして10分馴染ませる',
                      '小麦粉→溶き卵→パン粉の順で丁寧に衣をつける',
                      '170℃の油で片面3分ずつ、きつね色になるまで揚げる',
                      'キッチンペーパーで余分な油を取り、2cm幅にカット',
                      'お弁当箱に盛り付け、キャベツの千切りを添える'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  } else {
                    const meatAmount = Math.round(portionText * 2 * multiplier);
                    const steps = [
                      `豚肉${meatAmount}gを一口大にカット`,
                      '塩胡椒で下味をつける',
                      'フライパンで中火で炒める',
                      'お好みの調味料で味付けする',
                      '火が通ったら完成'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  }
                }
                
                // うどん系
                else if (lowerName.includes('うどん')) {
                  const dashiAmount = Math.round(400 * multiplier);
                  const onionAmount = Math.round(0.5 * multiplier * 10) / 10;
                  const udonAmount = Math.round(1 * multiplier);
                  const soyAmount = Math.round(1 * multiplier * 10) / 10;
                  const steps = [
                    `だし汁${dashiAmount}mlを鍋で中火にかけ、温める`,
                    `玉ねぎ${onionAmount}個を薄切り（2-3mm）にして油で炒める`,
                    `うどん${udonAmount}玉を沸騰したお湯で表示時間通り茹でる`,
                    '茹で上がったうどんをザルに上げ、しっかり湯切りする',
                    'だし汁にうどんと炒めた玉ねぎを入れて1-2分煮る',
                    `醤油大さじ${soyAmount}で味を調整し、ネギを散らして完成`
                  ];
                  return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                }
                
                // ご飯系
                else if (lowerName.includes('ご飯') || lowerName.includes('rice')) {
                  const riceAmount = Math.round(1 * multiplier * 10) / 10;
                  const waterAmount = Math.round(1.2 * multiplier * 10) / 10;
                  const steps = [
                    `米${riceAmount}カップをボウルに入れ、水を注いで軽くかき混ぜる`,
                    '水を捨てて、手のひらでお米を押すように3-4回研ぐ',
                    'きれいな水で2-3回すすぎ、30分以上浸水させる',
                    `炊飯器に米と水${waterAmount}カップを入れて炊飯ボタンを押す`,
                    '炊き上がったら10分蒸らし、しゃもじで十字に切るように混ぜる'
                  ];
                  return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                }
                
                // 卵料理（卵焼き、だし巻きなど）
                else if (role === 'side' && (lowerName.includes('卵') || lowerName.includes('たまご') || lowerName.includes('egg'))) {
                  if (lowerName.includes('だし巻き')) {
                    const eggCount = Math.round(3 * multiplier);
                    const dashiAmount = Math.round(3 * multiplier * 10) / 10;
                    const sugarAmount = Math.round(1 * multiplier * 10) / 10;
                    const steps = [
                      `卵${eggCount}個をボウルに溶きほぐし、だし汁大さじ${dashiAmount}、砂糖小さじ${sugarAmount}を加える`,
                      'よく混ぜて濾し器で漉し、なめらかにする',
                      '卵焼き器を中火で熱し、薄く油を敷く',
                      '卵液の1/3を流し入れ、手前から奥に向かって巻く',
                      '残りの卵液を2回に分けて同様に巻いていく',
                      '形を整えながら焼き、冷めてから食べやすい厚さに切る'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  } else {
                    const eggCount = Math.ceil(2.5 * multiplier); // 2-3個を倍率で調整
                    const sugarAmount = Math.round(0.5 * multiplier * 10) / 10;
                    const steps = [
                      `卵${eggCount}個をボウルに溶きほぐし、塩少々、砂糖小さじ${sugarAmount}を加える`,
                      'よく混ぜ合わせて調味する',
                      '卵焼き器またはフライパンを中火で熱し、薄く油を敷く',
                      '卵液の半分を流し入れ、半熟状態で手前から巻く',
                      '残りの卵液を加えて同様に巻き、形を整える',
                      '冷めてから適当な厚さに切り分ける'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  }
                }
                
                // 野菜料理・副菜
                else if (role === 'vegetable' || lowerName.includes('野菜') || lowerName.includes('サラダ') || 
                         lowerName.includes('ほうれん草') || lowerName.includes('きんぴら') || lowerName.includes('胡麻和え')) {
                  if (lowerName.includes('ほうれん草') || lowerName.includes('胡麻和え')) {
                    const spinachAmount = Math.round(portionText * 1.5 * multiplier);
                    const sesameAmount = Math.round(1 * multiplier * 10) / 10;
                    const soyAmount = Math.round(2 * multiplier * 10) / 10;
                    const sugarAmount = Math.round(1 * multiplier * 10) / 10;
                    const steps = [
                      `ほうれん草${spinachAmount}gをよく洗い、根元を切り落とす`,
                      '沸騰したお湯に塩を加え、ほうれん草を1-2分茹でる',
                      '冷水にとって色止めし、水気をしっかり絞る',
                      '3-4cm長さに切り揃える',
                      `白ごま大さじ${sesameAmount}をすり鉢で擦り、醤油小さじ${soyAmount}、砂糖小さじ${sugarAmount}を混ぜる`,
                      'ほうれん草に胡麻だれを和えて完成'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  } else if (lowerName.includes('きんぴら')) {
                    const gobouAmount = Math.round(1 * multiplier * 10) / 10;
                    const carrotAmount = Math.round(0.5 * multiplier * 10) / 10;
                    const steps = [
                      `ごぼう${gobouAmount}本を斜め薄切りにし、水にさらしてアク抜きする`,
                      `にんじん${carrotAmount}本を細切りにする`,
                      'フライパンにごま油を熱し、水気を切ったごぼうを炒める',
                      'にんじんを加えてさらに炒める',
                      '醤油、砂糖、みりんで味付けし、汁気がなくなるまで炒める',
                      '最後に一味唐辛子を振って完成'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  } else {
                    const steps = [
                      '野菜をよく洗い、適切なサイズにカット',
                      'フライパンで炒めるか、茹でて調理',
                      'お好みの調味料で味付け',
                      '彩りよく盛り付けて完成'
                    ];
                    return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                  }
                }
                
                // 肉料理全般
                else if (lowerName.includes('肉') || lowerName.includes('チキン') || lowerName.includes('ビーフ')) {
                  const oilAmount = Math.round(1 * multiplier * 10) / 10;
                  const steps = [
                    '肉を常温に30分置き、キッチンペーパーで水分を拭き取る',
                    '塩胡椒で下味をつけ、15分馴染ませる',
                    `フライパンを中火で熱し、油大さじ${oilAmount}を入れる`,
                    '肉を入れて最初の2-3分は動かさず、しっかり焼き色をつける',
                    'ひっくり返して反対面も同様に焼き、中まで火を通す',
                    '火を止めて2-3分休ませ、肉汁を安定させてから切り分ける'
                  ];
                  return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                }
                
                // 魚料理全般
                else if (lowerName.includes('魚') || lowerName.includes('フィッシュ')) {
                  const steps = [
                    '魚の切り身をキッチンペーパーで水気を拭き取る',
                    '塩を軽くふり、10分置いて臭みを抜く',
                    'もう一度キッチンペーパーで水分を拭き取る',
                    'フライパンに油を熱し、皮目から中火で焼く',
                    '皮がパリッとしたらひっくり返し、反対面も焼く',
                    'レモンやハーブで風味をつけ、盛り付ける'
                  ];
                  return steps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                }
                
                // デフォルト（より具体的な基本手順）
                else {
                  const oilAmount = Math.round(1 * multiplier * 10) / 10;
                  const defaultSteps = [
                    '全ての材料を作業台に並べ、使う道具（フライパン、包丁など）を準備する',
                    '野菜は洗って適切なサイズ（一口大）にカット、肉や魚は常温に戻す',
                    '調味料をボウルで混ぜ合わせ、すぐ使える状態にしておく',
                    `フライパンや鍋を適切な火力（中火）で予熱し、油大さじ${oilAmount}を入れる`,
                    '火の通りにくい材料から順番に入れ、焦がさないよう注意して調理する',
                    '味見をして調味料で調整し、火を止めて器に盛り付ける'
                  ];
                  
                  // デフォルト手順にもお弁当最適化を適用
                  return defaultSteps.map(step => optimizeForBento(step, role, portion, multiplier, recipeName));
                }
              };
              
              // お弁当倍率の再計算
              const selectedBentos = availableBentoSizes.filter(bento => 
                selectedBentoIds.includes(bento.id)
              );
              const totalCapacity = selectedBentos.reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0);
              const bentoMultiplier = selectedBentoIds.length > 0 ? totalCapacity / 800 : 1;
              const breakfast = includeBreakfast ? (parseInt(breakfastPortions?.toString() || '0') || 0) : 0;
              const currentTotalMultiplier = Math.max(1, bentoMultiplier + breakfast);
              
              const steps = getOptimizedSteps(item.recipe, item.role, portionText, currentTotalMultiplier);
              
              return (
                <View key={`dish-${i}`}>
                  <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: PALETTE.ink, marginBottom: 8 }}>
                      🍽️ {dishName || `料理${i + 1}`} ({portionText}%分)
                    </Text>
                    {steps.map((step, stepIndex) => {
                      // APIから取得した詳細情報があるかチェック
                      const hasDetailedInstruction = item.recipe.instructions && 
                                                   item.recipe.instructions[stepIndex];
                      const originalInstruction = hasDetailedInstruction ? item.recipe.instructions[stepIndex] : null;
                      
                      // メディアコンテンツの有無をチェック（厳格）
                      const hasValidImage = originalInstruction?.image && 
                        originalInstruction.image.startsWith('http') &&
                        /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(originalInstruction.image);
                      
                      const hasValidVideo = originalInstruction?.video &&
                        originalInstruction.video.startsWith('http') &&
                        (/youtube\.com|youtu\.be|vimeo\.com/i.test(originalInstruction.video) ||
                         /\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i.test(originalInstruction.video));
                      
                      const hasValidImages = originalInstruction?.images && 
                        originalInstruction.images.length > 0 &&
                        originalInstruction.images.some(img => 
                          img.startsWith('http') && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(img)
                        );
                      
                      const hasMedia = hasValidImage || hasValidVideo || hasValidImages;
                      
                      return (
                        <View key={`step-${i}-${stepIndex}`} style={{ marginBottom: 4 }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (hasDetailedInstruction) {
                                setStepDetailModal({
                                  visible: true,
                                  stepData: originalInstruction,
                                  dishName: dishName,
                                  stepNumber: stepIndex + 1
                                });
                              }
                            }}
                            disabled={!hasDetailedInstruction}
                            style={{ opacity: hasDetailedInstruction ? 1 : 0.7 }}
                          >
                            <RowCard
                              title={`手順${stepIndex + 1}${hasDetailedInstruction ? (hasMedia ? ' 🎬�' : ' �📖') : ''}`}
                              subtitle={step}
                              icon={hasDetailedInstruction ? (hasMedia ? "play-circle" : "information") : "format-list-numbered"}
                              accent={hasDetailedInstruction ? (hasMedia ? PALETTE.grape : PALETTE.blue) : PALETTE.teal}
                            />
                          </TouchableOpacity>
                          {stepIndex !== steps.length - 1 && <View style={styles.divider} />}
                        </View>
                      );
                    })}
                  </View>
                  {i !== bento.items.length - 1 && (
                    <View style={{ height: 1, backgroundColor: PALETTE.stroke, marginVertical: 8 }} />
                  )}
                </View>
              );
            })
          ) : (
            (() => {
              // デフォルトの場合、より実践的で詳細な調理手順を提供
              const detailedDefaultSteps = [
                {
                  title: '材料の準備と下処理',
                  detail: '全ての材料を冷蔵庫から出し、常温に戻す。野菜は洗って皮をむき、一口大（2-3cm角）にカット。肉や魚はキッチンペーパーで水分を拭き取り、塩胡椒で下味をつける。'
                },
                {
                  title: '調理器具の準備',
                  detail: 'フライパンや鍋を中火で1-2分予熱する。包丁、まな板、調理用スプーンなどを手の届く場所に準備。調味料をボウルで混ぜ合わせ、すぐ使える状態にする。'
                },
                {
                  title: '基本の調理工程',
                  detail: '油大さじ1をフライパンに入れて熱し、火の通りにくい材料（根菜、肉など）から順番に入れる。中火を保ち、焦がさないよう時々かき混ぜながら5-8分調理する。'
                },
                {
                  title: '味付けと仕上げ',
                  detail: '材料に火が通ったら調味料を加え、全体に味が馴染むまで2-3分炒める。味見をして塩胡椒で調整し、必要に応じて醤油やソースを追加する。'
                },
                {
                  title: '盛り付けと完成',
                  detail: '火を止めて器に盛り付ける。彩りを考えて野菜を散らし、温かい料理は温かいうちに、冷たい料理は冷やしてから提供する。お弁当の場合は十分に冷ましてから詰める。'
                }
              ];
              
              return detailedDefaultSteps.map((step, i) => (
                <View key={`default-step-${i}`}>
                  <TouchableOpacity style={{ opacity: 0.7 }} disabled>
                    <RowCard
                      title={`手順${i + 1}：${step.title}`}
                      subtitle={step.detail}
                      icon="format-list-numbered"
                      accent={PALETTE.teal}
                    />
                  </TouchableOpacity>
                  {i !== detailedDefaultSteps.length - 1 && <View style={styles.divider} />}
                </View>
              ));
            })()
          )}
          </Card>
        )}

        {/* カロリー情報 */}
        <View onLayout={(event) => {
          sectionRefs.current["カロリー"] = event.nativeEvent.layout.y;
        }}>
          <SectionTitle title="カロリー情報（一人前あたり）" accent={PALETTE.yellow} />
        </View>
        
        {/* カロリー調整情報（お弁当や朝食選択時） */}
        {(selectedBentoIds.length > 0 || includeBreakfast) && (
          <Card style={styles.adjustmentInfoCard}>
            <View style={styles.adjustmentInfo}>
              <Ionicons name="fitness" size={16} color={PALETTE.yellow} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.adjustmentText, { fontWeight: 'bold', marginBottom: 4 }]}>
                  🔥 カロリー調整情報
                </Text>
                <Text style={[styles.adjustmentText, { fontSize: 12, color: PALETTE.subtle, marginBottom: 4 }]}>
                  ※ 基本は一人前のカロリーです
                </Text>
                {selectedBentoIds.length > 0 && (
                  <Text style={styles.adjustmentText}>
                    • お弁当サイズにより調整されています
                  </Text>
                )}
                {includeBreakfast && (
                  <Text style={styles.adjustmentText}>
                    • 朝食 {breakfastPortions}人分が含まれています
                  </Text>
                )}
                <Text style={[styles.adjustmentText, { fontSize: 12, color: PALETTE.subtle }]}>
                  倍率: {(() => {
                    const selectedBentos = availableBentoSizes.filter(bento => selectedBentoIds.includes(bento.id));
                    const totalBentoVolume = selectedBentos.reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0);
                    let multiplier = 1.0;
                    if (selectedBentos.length > 0) {
                      multiplier = totalBentoVolume / 800;
                    }
                    if (includeBreakfast) {
                      multiplier += (parseInt(breakfastPortions?.toString() || '0') || 0);
                    }
                    return multiplier.toFixed(2);
                  })()}倍
                </Text>
              </View>
            </View>
          </Card>
        )}
        
        <Card style={styles.calGridCard}>
          {calories.length > 0 ? (
            <>
              <View style={styles.calGrid}>
                {calories.map((c, i) => {
                  const isEstimated = c.id.includes('-estimated');
                  return (
                    <View key={c.id} style={[styles.calCard, { backgroundColor: `${[PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.blue][i % 4]}15` }]}>
                      <Text style={styles.calLabel}>{c.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.calValue}>{c.kcal} kcal</Text>
                        {isEstimated && (
                          <Text style={[styles.calValue, { fontSize: 11, color: PALETTE.subtle, marginLeft: 4 }]}>
                            (推定)
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              
              {/* 合計カロリー表示（複数品目がある場合） */}
              {calories.length > 1 && (
                <View style={styles.totalCalorieSection}>
                  <View style={styles.totalCalorieDivider} />
                  <View style={styles.totalCalorieRow}>
                    <Text style={styles.totalCalorieLabel}>合計カロリー (一人前)</Text>
                    <Text style={styles.totalCalorieValue}>{total} kcal</Text>
                  </View>
                  {selectedRecipes.length > 1 && (
                    <Text style={styles.totalCalorieNote}>
                      {selectedRecipes.length}品目の合計（一人前あたり）
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: PALETTE.subtle, fontSize: 14 }}>
                カロリー情報がありません
              </Text>
            </View>
          )}
        </Card>

        {/* 補完メニュー提案（単一レシピの場合のみ、かつ2品未満の場合） */}
        {isRecipe && selectedRecipes.length < 2 && (loadingComplementary || complementaryRecipes.length > 0) && (
          <>
            <SectionTitle 
              title="🍱 お弁当を完成させましょう" 
              subtitle="このレシピに合うメニューを提案します"
              accent={PALETTE.coral} 
            />
            <Card style={styles.complementaryCard}>
              <View style={styles.complementaryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="restaurant" size={20} color={PALETTE.coral} />
                  <Text style={[styles.complementaryTitle, { flex: 1 }]}>
                    バランスの取れたお弁当にするために、以下のメニューを追加してみませんか?
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    console.log('🔄 補完メニューを再取得中...');
                    loadComplementaryRecipesForMultiple(selectedRecipes);
                  }}
                  style={styles.reloadButton}
                  activeOpacity={0.7}
                  disabled={loadingComplementary}
                >
                  <Ionicons 
                    name="refresh" 
                    size={22} 
                    color={loadingComplementary ? PALETTE.subtle : PALETTE.coral} 
                  />
                </TouchableOpacity>
              </View>
              
              {loadingComplementary ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>おすすめメニューを検索中...</Text>
                </View>
              ) : (
                <View style={styles.complementaryList}>
                  {complementaryRecipes.map((complementaryRecipe, index) => (
                    <TouchableOpacity
                      key={`complementary-${index}`}
                      style={styles.complementaryItem}
                      onPress={() => {
                        // レシピをお弁当に追加（画面遷移せずに表示）
                        addRecipeToBento(complementaryRecipe);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.complementaryImageWrapper}>
                        {complementaryRecipe.imageUrl ? (
                          <Image 
                            source={{ uri: complementaryRecipe.imageUrl }} 
                            style={styles.complementaryImage}
                          />
                        ) : (
                          <View style={[styles.complementaryImage, styles.complementaryImagePlaceholder]}>
                            <MaterialCommunityIcons name="food" size={32} color={PALETTE.subtle} />
                          </View>
                        )}
                        <View style={[
                          styles.complementaryRoleBadge,
                          { 
                            backgroundColor: 
                              complementaryRecipe.suggestedRole === 'main' ? PALETTE.coral :
                              complementaryRecipe.suggestedRole === 'side' ? PALETTE.teal :
                              PALETTE.yellow
                          }
                        ]}>
                          <Text style={styles.complementaryRoleText}>
                            {complementaryRecipe.suggestedRoleLabel}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.complementaryInfo}>
                        <Text style={styles.complementaryRecipeTitle} numberOfLines={2}>
                          {complementaryRecipe.title}
                        </Text>
                        <Text style={styles.complementaryRecipeDescription} numberOfLines={2}>
                          {complementaryRecipe.description || '美味しいレシピです'}
                        </Text>
                        <View style={styles.complementaryMeta}>
                          <Ionicons name="time-outline" size={14} color={PALETTE.subtle} />
                          <Text style={styles.complementaryMetaText}>
                            {complementaryRecipe.cookingTime || '30分'}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={PALETTE.subtle} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          </>
        )}

        {/* Actions */}
        <SectionTitle title="アクション" accent={PALETTE.grape} />
        <Card style={styles.actionsCard}>
          <Button 
            variant="solid" 
            label={isAddedToShoppingList ? "✓ 買い物リストに追加済み" : "材料を買い物リストに追加"}
            onPress={addIngredientsToShoppingList} 
            accent={isAddedToShoppingList ? PALETTE.good : PALETTE.blue}
            disabled={isAddedToShoppingList}
          />
          <Button variant="outline" label="買い物リスト" onPress={() => navigation.navigate('ShoppingList')} accent={PALETTE.blue} />
          <Button variant="outline" label="詰め方ガイド" onPress={() => navigation.navigate('PackingGuide', {
            riceRatio: bentoRiceRatio,
            layoutType: bentoLayoutType
          })} accent={PALETTE.teal} />
          <Button
            variant={isFavorited ? "solid" : "outline"}
            label={isFavorited ? "✓ お気に入り登録済み" : "お気に入り登録"}
            disabled={isFavorited}
            onPress={async () => {
              if (!user || !token) {
                alert('ログインが必要です');
                return;
              }
              try {
                const menuId = bento?.id || recipe?.id;
                if (!menuId) {
                  alert('メニューIDが取得できません');
                  return;
                }
                // レシピ詳細情報を取得
                const title = bento?.name || recipe?.title || '';
                const image_url = bento?.imageUrl || recipe?.imageUrl || '';
                const calories = bento?.totalNutrition?.calories
                  ? Math.round(bento.totalNutrition.calories)
                  : (recipe ? estimateCaloriesPerServing(recipe) : 0);
                const description = bento?.description || recipe?.description || '';
                // POSTデータ
                // ingredients, steps（instructions）を必ず配列で送信
                let ingredients = recipe?.ingredients || bento?.items?.flatMap(item => item.recipe?.ingredients || []) || [];
                let steps = recipe?.instructions || recipe?.steps || bento?.items?.flatMap(item => item.recipe?.instructions || item.recipe?.steps || []) || [];
                // 文字列ならパース
                if (typeof ingredients === 'string') {
                  try { ingredients = JSON.parse(ingredients); } catch { ingredients = []; }
                }
                if (typeof steps === 'string') {
                  try { steps = JSON.parse(steps); } catch { steps = []; }
                }
                // デバッグ用ログ
                console.log('[お気に入り追加] recipe:', recipe);
                console.log('[お気に入り追加] ingredients:', ingredients);
                console.log('[お気に入り追加] steps:', steps);
                const postData = {
                  user_id: user.id,
                  menu_id: menuId,
                  title,
                  image_url,
                  calories,
                  description,
                  ingredients,
                  steps
                };
                console.log('[お気に入り追加] postData:', postData);
                const res = await fetch(`${API_BASE_URL}/favorites`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(postData),
                });
                if (res.ok) {
                  setIsFavorited(true);
                  alert('お気に入りに追加しました！');
                } else if (res.status === 409) {
                  setIsFavorited(true);
                  alert('すでにお気に入りに登録されています');
                } else {
                  const err = await res.json().catch(() => ({}));
                  alert(`お気に入り追加に失敗しました: ${err.error || err.message || (err.details ? JSON.stringify(err.details) : '不明なエラー')}`);
                }
              } catch (e: any) {
                alert('通信エラー: ' + (e?.message || ''));
              }
            }}
            accent={PALETTE.coral}
          />
          <Button
            variant="solid"
            label={`調理完了・メニュー評価（合計 ${total} kcal）`}
            onPress={() => navigation.navigate('MenuReview')}
            accent={PALETTE.grape}
          />
        </Card>
      </ScrollView>

      {/* 手順詳細モーダル */}
      <Modal
        visible={stepDetailModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStepDetailModal(prev => ({ ...prev, visible: false }))}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* モーダルヘッダー */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setStepDetailModal(prev => ({ ...prev, visible: false }))}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={PALETTE.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {stepDetailModal.dishName} - 手順{stepDetailModal.stepNumber}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {stepDetailModal.stepData && (
              <>
                {/* メイン手順画像・動画（検証済みのみ表示） */}
                {(() => {
                  const validVideo = stepDetailModal.stepData?.video && 
                    stepDetailModal.stepData.video.startsWith('http') &&
                    (/youtube\.com|youtu\.be|vimeo\.com/i.test(stepDetailModal.stepData.video) ||
                     /\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i.test(stepDetailModal.stepData.video));
                     
                  const validImage = stepDetailModal.stepData?.image && 
                    stepDetailModal.stepData.image.startsWith('http') &&
                    /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(stepDetailModal.stepData.image);
                    
                  if (!validVideo && !validImage) return null;
                  
                  return (
                    <View style={styles.stepMediaContainer}>
                      {validVideo ? (
                        <View style={styles.videoContainer}>
                          <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={60} color={PALETTE.grape} />
                            <Text style={styles.videoText}>調理動画</Text>
                            <Text style={styles.videoUrl} numberOfLines={1}>
                              {stepDetailModal.stepData.video}
                            </Text>
                            <TouchableOpacity
                              style={styles.videoPlayButton}
                              onPress={() => {
                                // 外部ブラウザまたは動画アプリで開く
                                console.log('動画を開く:', stepDetailModal.stepData.video);
                              }}
                            >
                              <Text style={styles.videoPlayButtonText}>動画を再生</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : validImage && (
                        <View style={styles.stepImageContainer}>
                          <Image
                            source={{ uri: stepDetailModal.stepData.image }}
                            style={styles.stepImage}
                            resizeMode="cover"
                            onError={(error) => {
                              console.warn('画像読み込みエラー:', stepDetailModal.stepData.image, error);
                            }}
                          />
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* 複数の手順画像（検証済みのみ表示） */}
                {(() => {
                  const validImages = stepDetailModal.stepData?.images?.filter(img => 
                    img && 
                    img.startsWith('http') && 
                    /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(img) &&
                    !img.includes('blank') &&
                    !img.includes('spacer') &&
                    !img.includes('transparent')
                  ) || [];
                  
                  if (validImages.length === 0) return null;
                  
                  return (
                    <Card style={styles.multipleImagesCard}>
                      <View style={styles.multipleImagesHeader}>
                        <Ionicons name="images" size={20} color={PALETTE.coral} />
                        <Text style={styles.multipleImagesTitle}>詳細画像 ({validImages.length}枚)</Text>
                      </View>
                      <FlatList
                        data={validImages}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => `image-${index}`}
                        renderItem={({ item, index }) => (
                          <TouchableOpacity
                            style={[
                              styles.thumbnailContainer,
                              { marginRight: index === validImages.length - 1 ? 0 : 12 }
                            ]}
                            onPress={() => {
                              console.log('画像を拡大表示:', item);
                            }}
                          >
                            <Image
                              source={{ uri: item }}
                              style={styles.thumbnailImage}
                              resizeMode="cover"
                              onError={(error) => {
                                console.warn('サムネイル画像読み込みエラー:', item, error);
                              }}
                              onLoad={() => {
                                console.log('画像読み込み成功:', item);
                              }}
                            />
                            <View style={styles.thumbnailOverlay}>
                              <Ionicons name="expand" size={16} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.thumbnailList}
                      />
                    </Card>
                  );
                })()}

                {/* 画像がない場合のメッセージ */}
                {!stepDetailModal.stepData?.image && 
                 (!stepDetailModal.stepData?.images || stepDetailModal.stepData.images.length === 0) && (
                  <Card style={[styles.multipleImagesCard, { backgroundColor: `${PALETTE.subtle}08` }]}>
                    <View style={styles.multipleImagesHeader}>
                      <Ionicons name="camera-outline" size={20} color={PALETTE.subtle} />
                      <Text style={[styles.multipleImagesTitle, { color: PALETTE.subtle }]}>手順画像</Text>
                    </View>
                    <Text style={[styles.stepDetailText, { color: PALETTE.subtle, fontStyle: 'italic' }]}>
                      この手順には画像が用意されていません。詳細な手順テキストを参考にしてください。
                    </Text>
                  </Card>
                )}

                {/* 手順名 */}
                {stepDetailModal.stepData.name && (
                  <Card style={styles.stepNameCard}>
                    <View style={styles.stepNameHeader}>
                      <Ionicons name="bookmark" size={20} color={PALETTE.teal} />
                      <Text style={styles.stepNameTitle}>工程名</Text>
                    </View>
                    <Text style={styles.stepNameText}>
                      {stepDetailModal.stepData.name}
                    </Text>
                  </Card>
                )}

                {/* 詳細手順 */}
                <Card style={styles.stepDetailCard}>
                  <View style={styles.stepDetailHeader}>
                    <Ionicons name="list" size={20} color={PALETTE.blue} />
                    <Text style={styles.stepDetailTitle}>詳細な手順</Text>
                  </View>
                  <Text style={styles.stepDetailText}>
                    {stepDetailModal.stepData.text}
                  </Text>
                </Card>

                {/* 関連URL */}
                {stepDetailModal.stepData.url && (
                  <Card style={styles.stepUrlCard}>
                    <View style={styles.stepUrlHeader}>
                      <Ionicons name="link" size={20} color={PALETTE.grape} />
                      <Text style={styles.stepUrlTitle}>参考リンク</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        // ブラウザでURLを開く処理（実装は環境に応じて）
                        console.log('参考URL:', stepDetailModal.stepData.url);
                      }}
                      style={styles.urlButton}
                    >
                      <Text style={styles.urlButtonText}>
                        詳しい情報を見る
                      </Text>
                      <Ionicons name="open-outline" size={16} color={PALETTE.grape} />
                    </TouchableOpacity>
                  </Card>
                )}

                {/* 調理のコツ */}
                <Card style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <Ionicons name="bulb" size={20} color={PALETTE.yellow} />
                    <Text style={styles.tipTitle}>調理のコツ</Text>
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipText}>
                      • 手順を急がず、丁寧に行いましょう
                    </Text>
                    <Text style={styles.tipText}>
                      • 材料の状態をよく観察しながら調理してください
                    </Text>
                    <Text style={styles.tipText}>
                      • お弁当用なので、しっかりと火を通し、冷めても美味しくなるよう心がけましょう
                    </Text>
                  </View>
                </Card>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" color={PALETTE.coral} onPress={() => navigation.navigate('Home')} />
        <NavItem name="food-fork-drink" label="お弁当" active color={PALETTE.teal} onPress={() => navigation.navigate('BentoMenu')} />
        <NavItem name="poll" label="統計" color={PALETTE.blue} onPress={() => navigation.navigate('NutritionDashboard')} />
        <NavItem name="cog" label="設定" color={PALETTE.grape} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- UI パーツ ---------- */

const SectionTitle: React.FC<{ title: string; subtitle?: string; accent?: string }> = ({
  title,
  subtitle,
  accent = PALETTE.coral,
}) => (
  <View style={styles.sectionTitleRow}>
    <View style={[styles.sectionDot, { backgroundColor: accent }]} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

const RowCard = ({
  title,
  subtitle,
  icon,
  accent = PALETTE.coral,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  accent?: string;
}) => (
  <View style={styles.listItem}>
    <View style={styles.listLeft}>
      <View style={[styles.thumb, { backgroundColor: `${accent}22` }]}>
        {icon ? (
          <MaterialCommunityIcons name={icon} size={18} color={accent} />
        ) : (
          <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={accent} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.listSub}>{subtitle}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={PALETTE.subtle} />
  </View>
);

const Button = ({
  label,
  onPress,
  variant = "solid",
  accent = PALETTE.coral,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  accent?: string;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.button,
      variant === "solid" 
        ? { backgroundColor: accent, opacity: disabled ? 0.6 : 1 }
        : { backgroundColor: "#fff", borderWidth: 1, borderColor: accent, opacity: disabled ? 0.6 : 1 }
    ]}
  >
    <Text
      style={[
        styles.btnText,
        variant === "solid" ? { color: "#fff" } : { color: accent },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const Blob: React.FC<{ color: string; size: number; top: number; left: number; rotate?: number }> = ({
  color,
  size,
  top,
  left,
  rotate = 0,
}) => (
  <View
    style={{
      position: "absolute",
      top,
      left,
      width: size,
      height: size * 0.78,
      backgroundColor: color,
      opacity: 0.16,
      borderTopLeftRadius: size * 0.7,
      borderTopRightRadius: size * 0.48,
      borderBottomLeftRadius: size * 0.52,
      borderBottomRightRadius: size * 0.7,
      transform: [{ rotate: `${rotate}deg` }],
    }}
  />
);

const Card: React.FC<{ style?: any; children: React.ReactNode; accent?: string }> = ({ style, children, accent }) => (
  <View style={[styles.card, style, accent && { backgroundColor: `${accent}12` }]}>
    {children}
  </View>
);

const NavItem: React.FC<{
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  color: string;
  onPress?: () => void;
}> = ({ name, label, active, color, onPress }) => {
  return (
    <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={onPress}>
      <View
        style={[
          styles.navPill,
          active
            ? { backgroundColor: `${color}22`, borderColor: `${color}66` }
            : { backgroundColor: "#FFFFFF", borderColor: "#EAEAEA" },
        ]}
      >
        <MaterialCommunityIcons name={name} size={18} color={active ? color : "#8A8A8A"} />
        <Text style={[styles.navLabel, active && { color }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 30 },

  topBar: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: { fontSize: 18, fontWeight: "800", color: "#0B1220" },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFDD",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFFDD",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 16, marginBottom: 8, zIndex: 1 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: PALETTE.ink },
  sectionSubtitle: { fontSize: 12, color: PALETTE.subtle },
  
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 1,
    marginBottom: 12,
  },
  
  tabsCard: { 
    padding: 12,
    marginTop: 40, // 上部の料理タイトルと重ならないように調整
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#f3f3f3",
  },
  tabActive: { backgroundColor: PALETTE.ink },
  tabText: { fontSize: 12, color: "#333" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  listCard: { padding: 16 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  listLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: 14, color: PALETTE.ink, fontWeight: "700" },
  listSub: { fontSize: 12, color: PALETTE.subtle, marginTop: 2 },
  divider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 4 },

  calGridCard: { padding: 16 },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
  },
  calLabel: { fontSize: 13, color: PALETTE.subtle },
  calValue: { marginTop: 6, fontSize: 16, fontWeight: "700", color: PALETTE.ink },

  totalCalorieSection: {
    marginTop: 12,
    paddingTop: 12,
  },
  totalCalorieDivider: {
    height: 2,
    backgroundColor: PALETTE.yellow,
    marginBottom: 12,
    opacity: 0.3,
  },
  totalCalorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  totalCalorieLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  totalCalorieValue: {
    fontSize: 20,
    fontWeight: '800',
    color: PALETTE.yellow,
  },
  totalCalorieNote: {
    fontSize: 12,
    color: PALETTE.subtle,
    textAlign: 'right',
    marginTop: 4,
    paddingRight: 8,
  },

  actionsCard: { padding: 16 },
  button: {
    height: 44,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 14, fontWeight: "700" },

  bottomNav: {
    position: "absolute",
    bottom: 34,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: PALETTE.bg,
    borderTopWidth: 1,
    borderTopColor: PALETTE.stroke,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    zIndex: 10,
  },
  navItem: { flex: 1 },
  navPill: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navLabel: { fontSize: 12, color: "#8A8A8A", fontWeight: "700" },

  // お弁当設定関連のスタイル
  bentoSettingsCard: { padding: 16 },
  settingSection: { marginBottom: 4 },
  settingTitle: { fontSize: 16, fontWeight: "600", color: PALETTE.ink, marginBottom: 4 },
  settingSubtitle: { fontSize: 12, color: PALETTE.subtle, marginBottom: 12 },
  settingDivider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 16 },
  
  bentoOption: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  bentoOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PALETTE.stroke,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: PALETTE.bg,
  },
  checkboxSelected: {
    backgroundColor: PALETTE.grape,
    borderColor: PALETTE.grape,
  },
  bentoName: { fontSize: 14, fontWeight: "600", color: PALETTE.ink },
  bentoDetails: { fontSize: 12, color: PALETTE.subtle, marginTop: 2 },
  
  breakfastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  breakfastPortions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portionLabel: { fontSize: 14, color: PALETTE.ink },
  portionInput: {
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: PALETTE.bg,
  },
  portionUnit: { fontSize: 14, color: PALETTE.ink },

  // 材料調整情報のスタイル
  adjustmentInfoCard: { padding: 12, marginBottom: 8 },
  adjustmentInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  adjustmentText: { 
    fontSize: 12, 
    color: PALETTE.blue, 
    fontWeight: '600' 
  },

  // 手順詳細モーダルのスタイル
  modalContainer: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.stroke,
    backgroundColor: '#fff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  
  // 手順画像
  stepImageContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    aspectRatio: 16 / 9, // アスペクト比を固定
    maxHeight: 200,
  },
  stepImage: {
    width: '100%',
    height: '100%',
    backgroundColor: PALETTE.stroke,
  },

  // 工程名セクション
  stepNameCard: {
    marginBottom: 16,
    backgroundColor: `${PALETTE.teal}08`,
    borderWidth: 1,
    borderColor: `${PALETTE.teal}20`,
  },
  stepNameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepNameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.teal,
  },
  stepNameText: {
    fontSize: 15,
    color: PALETTE.ink,
    fontWeight: '500',
    lineHeight: 22,
  },

  // 詳細手順セクション
  stepDetailCard: {
    marginBottom: 16,
    backgroundColor: `${PALETTE.blue}08`,
    borderWidth: 1,
    borderColor: `${PALETTE.blue}20`,
  },
  stepDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.blue,
  },
  stepDetailText: {
    fontSize: 14,
    color: PALETTE.ink,
    lineHeight: 22,
  },

  // 参考URLセクション
  stepUrlCard: {
    marginBottom: 16,
    backgroundColor: `${PALETTE.grape}08`,
    borderWidth: 1,
    borderColor: `${PALETTE.grape}20`,
  },
  stepUrlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepUrlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.grape,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.grape,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  urlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // 調理のコツセクション
  tipCard: {
    marginBottom: 20,
    backgroundColor: `${PALETTE.yellow}08`,
    borderWidth: 1,
    borderColor: `${PALETTE.yellow}30`,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.yellow,
  },
  tipContent: {
    gap: 6,
  },
  tipText: {
    fontSize: 13,
    color: PALETTE.ink,
    lineHeight: 20,
  },

  // メディアコンテンツ表示
  stepMediaContainer: {
    marginBottom: 20,
  },
  
  // 動画表示
  videoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PALETTE.grape}15`,
    padding: 20,
  },
  videoText: {
    fontSize: 18,
    fontWeight: '600',
    color: PALETTE.grape,
    marginTop: 12,
    marginBottom: 8,
  },
  videoUrl: {
    fontSize: 12,
    color: PALETTE.subtle,
    marginBottom: 16,
  },
  videoPlayButton: {
    backgroundColor: PALETTE.grape,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  videoPlayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // 複数画像表示
  multipleImagesCard: {
    marginBottom: 16,
    backgroundColor: `${PALETTE.coral}08`,
    borderWidth: 1,
    borderColor: `${PALETTE.coral}20`,
  },
  multipleImagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  multipleImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.coral,
  },
  thumbnailList: {
    paddingHorizontal: 4,
  },
  thumbnailContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbnailImage: {
    width: 100,
    height: 70,
    backgroundColor: PALETTE.stroke,
    borderRadius: 8,
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 単一レシピの手順表示用
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 12,
  },
  stepIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PALETTE.teal}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.ink,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: PALETTE.subtle,
    lineHeight: 20,
  },
  hasImageBadge: {
    fontSize: 11,
    color: PALETTE.teal,
    marginTop: 6,
    fontWeight: '600',
  },

  // 補完メニュー提案用
  complementaryCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  complementaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  complementaryTitle: {
    flex: 1,
    fontSize: 14,
    color: PALETTE.ink,
    lineHeight: 20,
  },
  reloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${PALETTE.coral}10`,
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: PALETTE.subtle,
  },
  complementaryList: {
    gap: 12,
  },
  complementaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: `${PALETTE.coral}05`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${PALETTE.coral}15`,
    gap: 12,
  },
  complementaryImageWrapper: {
    position: 'relative',
  },
  complementaryImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: PALETTE.stroke,
  },
  complementaryImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  complementaryRoleBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  complementaryRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  complementaryInfo: {
    flex: 1,
    gap: 4,
  },
  complementaryRecipeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.ink,
    lineHeight: 18,
  },
  complementaryRecipeDescription: {
    fontSize: 12,
    color: PALETTE.subtle,
    lineHeight: 16,
  },
  complementaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  complementaryMetaText: {
    fontSize: 12,
    color: PALETTE.subtle,
  },
  recipeNumberBadge: {
    backgroundColor: PALETTE.blue + '15',
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.blue,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  recipeNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.blue,
    marginBottom: 2,
  },
  recipeNameText: {
    fontSize: 13,
    color: PALETTE.ink,
    fontWeight: '600',
  },

  // お弁当比率設定
  bentoRatioCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  bentoRatioSection: {
    gap: 12,
  },
  bentoRatioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bentoRatioTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.ink,
    flex: 1,
  },
  bentoRatioBadge: {
    backgroundColor: PALETTE.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  bentoRatioBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bentoRatioButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoRatioButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  bentoRatioButtonActive: {
    backgroundColor: PALETTE.coral,
    borderColor: PALETTE.coral,
  },
  bentoRatioButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.subtle,
  },
  bentoRatioButtonTextActive: {
    color: '#FFFFFF',
  },
  bentoRatioLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bentoRatioLabelText: {
    fontSize: 11,
    color: PALETTE.subtle,
  },
  bentoLayoutButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoLayoutButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  bentoLayoutButtonActive: {
    backgroundColor: PALETTE.blue,
    borderColor: PALETTE.blue,
  },
  bentoLayoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.subtle,
    marginBottom: 2,
  },
  bentoLayoutButtonTextActive: {
    color: '#FFFFFF',
  },
  bentoLayoutButtonDesc: {
    fontSize: 10,
    color: PALETTE.subtle,
  },
  bentoLayoutButtonDescActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  bentoPreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.ink,
    marginBottom: 8,
  },
  bentoPreviewContainer: {
    gap: 8,
  },
  bentoPreviewBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  bentoPreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  bentoPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  bentoPreviewPercent: {
    fontSize: 10,
    color: PALETTE.subtle,
    marginTop: 2,
  },
  bentoPreviewNote: {
    fontSize: 11,
    color: PALETTE.subtle,
    lineHeight: 16,
    textAlign: 'center',
  },

});

export default MenuDetailScreen;
