import { useAuth } from '../contexts/AuthContext';
import { NutritionService } from '../services/nutritionService';
// APIベースURL（.envのEXPO_PUBLIC_API_URLを参照）
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
// BentoMenuScreen.tsx - Original Design with Enhanced API
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { RootStackParamList } from '../../App';
import { BentoGenerator, GeneratedBento } from '../services/bentoGenerator';
import { ProcessedJapaneseRecipe, rakutenRecipeApi } from '../services/rakutenRecipeApi';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'BentoMenu'>;

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

// Enhanced types with Japanese recipe data
type Recommend = {
  id: string;
  tag: string;
  title: string;
  sub?: string;
  kcal: number;
  recipe?: ProcessedJapaneseRecipe;
  bentoId?: string; // お弁当の場合に使用
};

export type Favorite = {
  id: string;
  title: string;
  sub?: string;
  kcal: number;
  icon?: string;
  recipe?: ProcessedJapaneseRecipe;
  bentoId?: string;
  image_url?: string; // DBレスポンスに合わせて追加
  description?: string;
};

// お弁当スタイルに応じたタグを生成
const getBentoTag = (style: string, index: number): string => {
  const tagMap = {
    japanese: ['和風弁当', '伝統の味', '家庭の味'],
    western: ['洋風弁当', 'モダン', 'スタイリッシュ'],
    healthy: ['ヘルシー', '低カロリー', '栄養バランス'],
    balanced: ['バランス良し', '完全栄養', '理想の組合せ']
  };
  
  const tags = tagMap[style as keyof typeof tagMap] || ['おすすめ', '特選', '人気'];
  return tags[index % tags.length];
};

// お弁当のサブタイトルを生成
const getBentoSubtitle = (bento: GeneratedBento): string => {
  const dishCount = bento.items.filter(item => item.role !== 'rice').length;
  const calories = Math.round(bento.totalNutrition.calories);
  return `${dishCount}品のおかず • ${calories}kcal • 栄養計算済み`;
};

// レシピから一人前のカロリーを推定
const estimateCaloriesPerServing = (recipe: ProcessedJapaneseRecipe): number => {
  // 栄養情報がある場合はそれを使用
  if (recipe.nutrition?.calories) {
    const caloriesStr = recipe.nutrition.calories.toString().replace(/[^\d]/g, '');
    const calories = parseInt(caloriesStr);
    if (!isNaN(calories) && calories > 0) {
      return calories;
    }
  }
  
  // recipeYieldから人数を取得
  let servings = 1;
  if (recipe.servings) {
    const servingsMatch = recipe.servings.match(/(\d+)/);
    if (servingsMatch) {
      servings = parseInt(servingsMatch[1]);
    }
  }
  
  // 材料数と料理の種類から推定
  const ingredientCount = recipe.ingredients?.length || 5;
  const cookingTime = recipe.cookingTime || '';
  
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
  const title = recipe.title?.toLowerCase() || '';
  if (/揚げ|フライ|天ぷら|とんかつ|カツ|唐揚げ/.test(title)) {
    baseCalories += 100; // 揚げ物は高カロリー
  } else if (/サラダ|野菜|きのこ|こんにゃく/.test(title)) {
    baseCalories -= 50; // 野菜中心は低カロリー
  } else if (/肉|豚|牛|鶏/.test(title)) {
    baseCalories += 50; // 肉料理は高め
  }
  
  // コストから推定（高コストは材料豊富）
  if (recipe.cost) {
    if (/300円以上|500円/.test(recipe.cost)) {
      baseCalories += 50;
    } else if (/100円以下/.test(recipe.cost)) {
      baseCalories -= 30;
    }
  }
  
  return Math.round(baseCalories);
};

const BentoMenuScreen: React.FC<Props> = ({ navigation }) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProcessedJapaneseRecipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [generatedBentos, setGeneratedBentos] = useState<GeneratedBento[]>([]);
  const [recommends, setRecommends] = useState<Recommend[]>([
    { id: `default-r1-${Date.now()}`, tag: "バランス良し", title: "ヘルシーサラダ", sub: "サラダ弁当", kcal: 300 },
    { id: `default-r2-${Date.now()}`, tag: "オメガ3豊富", title: "焼き魚", sub: "魚弁当", kcal: 450 },
    { id: `default-r3-${Date.now()}`, tag: "タンパク質", title: "鶏むねの塩焼き", sub: "鶏肉弁当", kcal: 500 },
  ]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    loadEnhancedRecipes();
    fetchFavorites();
  }, []);

  // お気に入りをDB→menu_idリスト→API経由で楽天レシピ詳細取得
  const { user } = useAuth();
  const fetchFavorites = async () => {
    if (!user?.id) return;
    try {
      const userId = user.id;
      const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
      // /favoritesエンドポイントで詳細情報ごと取得
      const favRes = await fetch(`${baseUrl}/favorites/${userId}`);
      if (!favRes.ok) {
        setFavorites([]);
        return;
      }
      const favData = await favRes.json();
      if (!Array.isArray(favData) || favData.length === 0) {
        setFavorites([]);
        return;
      }
      // 取得したデータをそのままセット（title, calories, image_url, description等を含む）
      const favoriteItems = favData.map((item, idx) => {
        // ingredients, stepsを配列化
        let ingredients = item.ingredients;
        let steps = item.steps;
        if (typeof ingredients === 'string') {
          try { ingredients = JSON.parse(ingredients); } catch { ingredients = []; }
        }
        if (typeof steps === 'string') {
          try { steps = JSON.parse(steps); } catch { steps = []; }
        }
        return {
          id: String(item.menu_id),
          title: item.title || 'レシピ名不明',
          sub: item.calories ? `${item.calories}kcal/人前` : '',
          kcal: item.calories || 0,
          icon: ["food-steak", "leaf", "food-variant"][idx % 3] || "silverware-fork-knife",
          recipe: {
            ...item,
            ingredients,
            instructions: steps // stepsをinstructionsとして渡す
          },
          bentoId: undefined,
          image_url: item.image_url,
          description: item.description
        };
      });
      setFavorites(favoriteItems);
    } catch (e) {
      setFavorites([]);
    }
  };

  const loadEnhancedRecipes = async () => {
    setLoading(true);
    try {
      console.log('🍱 楽天レシピAPIから日本語レシピを取得中...');
      
      // 楽天レシピAPIから日本語レシピを取得
      const bentoRecipes = await rakutenRecipeApi.getProcessedRecipes('30', 3); // お弁当カテゴリ
      const mainDishRecipes = await rakutenRecipeApi.getProcessedRecipes('14', 3); // 肉のおかず
      
      const allRecipes = [...bentoRecipes, ...mainDishRecipes].slice(0, 6);
      
      if (bentoRecipes.length > 0) {
        // 🍱 お弁当自動生成 - 複数のバリエーション
        console.log('🍱 複数のお弁当バリエーションを自動生成中...');
        
        // 全ての利用可能なレシピをまとめる（データ検証付き）
        const allAvailableRecipes = [...bentoRecipes, ...mainDishRecipes]
          .filter(recipe => recipe && recipe.id && recipe.title); // 必須フィールドをチェック
        
        console.log(`📋 有効なレシピ数: ${allAvailableRecipes.length}`);
        
        if (allAvailableRecipes.length === 0) {
          console.warn('⚠️ 有効なレシピが見つかりません');
          setLoading(false);
          return;
        }
        
        // 複数のお弁当バリエーションを生成（より多く生成）
        let generatedBentos: GeneratedBento[] = [];
        try {
          generatedBentos = BentoGenerator.generateMultipleBentos(allAvailableRecipes, 6);
          console.log(`🍱 生成された弁当数: ${generatedBentos.length}`);
        } catch (error) {
          console.error('❌ 弁当生成エラー:', error);
          console.error('使用可能レシピ:', allAvailableRecipes.map(r => ({ id: r.id, title: r.title })));
          generatedBentos = []; // 空の配列で安全に処理を続行
        }
        
        setGeneratedBentos(generatedBentos);
        
        // 「今日のおすすめ」を全てお弁当にする（重複チェック強化）
        const usedBentoNames = new Set<string>();
        const updatedRecommends: Recommend[] = [];
        
        if (generatedBentos.length > 0) {
          for (const bento of generatedBentos.slice(0, 5)) { // 5個から3個選択
            if (bento && bento.name && !usedBentoNames.has(bento.name) && updatedRecommends.length < 3) {
              usedBentoNames.add(bento.name);
              updatedRecommends.push({
                id: `bento-recommend-${Date.now()}-${bento.id}-${updatedRecommends.length}`,
                tag: getBentoTag(bento.bentoStyle, updatedRecommends.length),
                title: bento.name,
                sub: getBentoSubtitle(bento),
                kcal: Math.round(bento.totalNutrition.calories),
                recipe: undefined,
                bentoId: bento.id,
              });
            }
          }
        }
        
        // お気に入りには残りのお弁当と個別レシピを混在表示
        const favoriteItems: Favorite[] = [];
        
        // 残りのお弁当をお気に入りに追加
        if (generatedBentos.length > 3) {
          generatedBentos.slice(3).forEach((bento, idx) => {
            if (bento && bento.name && bento.id && bento.totalNutrition) {
              favoriteItems.push({
                id: `favorite-bento-${Date.now()}-${bento.id}-${idx}`,
                title: bento.name,
                sub: getBentoSubtitle(bento),
                kcal: Math.round(bento.totalNutrition.calories),
                icon: ["food-steak", "leaf", "food-variant"][idx] || "silverware-fork-knife",
                recipe: undefined,
                bentoId: bento.id
              });
            }
          });
        }
        
        // 個別レシピもいくつか追加
        bentoRecipes.slice(0, Math.max(0, 3 - favoriteItems.length)).forEach((recipe, idx) => {
          const estimatedCalories = estimateCaloriesPerServing(recipe);
          favoriteItems.push({
            id: `favorite-recipe-${Date.now()}-${recipe.id}-${idx}`,
            title: recipe.title,
            sub: `${recipe.cookingTime || '調理時間不明'} • ${estimatedCalories}kcal/人前`,
            kcal: estimatedCalories,
            icon: ["food-steak", "leaf", "food-variant"][(favoriteItems.length + idx) % 3] || "silverware-fork-knife",
            recipe: recipe,
          });
        });
        
        const updatedFavorites = favoriteItems;
        setRecommends(updatedRecommends);
        // setFavorites(updatedFavorites); // ← ここでお気に入りを上書きしない
      }
    } catch (error) {
      console.error('Error loading enhanced recipes:', error);
      
      // エラーの詳細をログに出力
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // デフォルトデータを保持してアプリが動作し続けるようにする
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe?: ProcessedJapaneseRecipe) => {
    if (recipe) {
      const estimatedCalories = estimateCaloriesPerServing(recipe);
      const estimatedProtein = Math.round(estimatedCalories * 0.15 / 4); // タンパク質15%想定
      const estimatedCarbs = Math.round(estimatedCalories * 0.50 / 4); // 炭水化物50%想定
      const estimatedFat = Math.round(estimatedCalories * 0.35 / 9); // 脂質35%想定

      // 材料・作り方を必ず配列で渡す
      let ingredients = recipe.ingredients;
      if (typeof ingredients === 'string') {
        try { ingredients = JSON.parse(ingredients); } catch { ingredients = []; }
      }
      if (!Array.isArray(ingredients)) ingredients = [];
      let instructions = recipe.instructions;
      // stepsプロパティが存在する場合はそちらも考慮
      // @ts-ignore
      if ((!instructions || instructions.length === 0) && recipe.steps) {
        // @ts-ignore
        instructions = recipe.steps;
      }
      if (typeof instructions === 'string') {
        try { instructions = JSON.parse(instructions); } catch { instructions = []; }
      }
      if (!Array.isArray(instructions)) instructions = [];

      // Show detailed nutrition info
      Alert.alert(
        `🍱 ${recipe.title}`,
        `📊 栄養情報（一人前）:\n` +
        `🔥 カロリー: ${estimatedCalories}kcal\n` +
        `🥩 タンパク質: 約${estimatedProtein}g\n` +
        `🍞 炭水化物: 約${estimatedCarbs}g\n` +
        `🥑 脂質: 約${estimatedFat}g\n\n` +
        `⏱️ 調理時間: ${recipe.cookingTime || '不明'}\n` +
        `💰 費用: ${recipe.cost || '不明'}\n` +
        `📝 材料数: ${ingredients.length}種類\n` +
        `🌍 楽天レシピより\n` +
        `✨ 弁当にぴったりの一品です！`,
        [
          { text: 'レシピ詳細', onPress: () => navigation.navigate('MenuDetail', { recipe: { ...recipe, ingredients, instructions } }) },
          { text: 'OK' }
        ]
      );
    } else {
      navigation.navigate('MenuDetail', {});
    }
  };

  const handleBentoPress = (bentoId: string) => {
    const bento = generatedBentos.find(b => b.id === bentoId);
    if (bento) {
      const itemsList = bento.items.map(item => {
        const roleEmoji = {
          main: '🍖',
          side: '🥘', 
          vegetable: '🥬',
          rice: '🍚'
        };
        const emoji = roleEmoji[item.role] || '🍽️';
        const portion = item.role === 'rice' ? '' : ` (${Math.round(item.portion * 100)}%)`;
        return `${emoji} ${item.recipe.title}${portion} - ${Math.round(item.adjustedNutrition.calories)}kcal`;
      }).join('\n');

      const proteinPercent = Math.round((bento.totalNutrition.protein * 4 / bento.totalNutrition.calories) * 100);
      const carbsPercent = Math.round((bento.totalNutrition.carbs * 4 / bento.totalNutrition.calories) * 100);
      const fatPercent = Math.round((bento.totalNutrition.fat * 9 / bento.totalNutrition.calories) * 100);

      // お弁当の栄養データをDBに保存
      const saveBentoNutrition = async () => {
        try {
          const success = await NutritionService.logBentoNutrition({
            bentoId: bento.id,
            bentoName: bento.name,
            calories: Math.round(bento.totalNutrition.calories),
            protein: Math.round(bento.totalNutrition.protein * 10) / 10,
            carbs: Math.round(bento.totalNutrition.carbs * 10) / 10,
            fat: Math.round(bento.totalNutrition.fat * 10) / 10,
            items: bento.items.map(item => ({
              role: item.role,
              title: item.recipe.title,
              portion: item.portion,
              calories: item.adjustedNutrition.calories,
              protein: item.adjustedNutrition.protein,
              carbs: item.adjustedNutrition.carbs,
              fat: item.adjustedNutrition.fat
            })),
            mealType: 'lunch',
            notes: `${bento.items.length}品目で構成されたバランス弁当`
          });

          if (success) {
            Alert.alert(
              '✅ 記録完了', 
              'お弁当の栄養データを記録しました！\n栄養ダッシュボードで確認できます。'
            );
          } else {
            Alert.alert('⚠️ 記録失敗', '栄養データの記録に失敗しました');
          }
        } catch (error) {
          console.error('栄養データ保存エラー:', error);
          Alert.alert('❌ エラー', '栄養データの保存中にエラーが発生しました');
        }
      };

      // お気に入り追加処理
      const addToFavorites = () => {
        // すでに同じbentoIdがあれば追加しない
        if (favorites.some(f => f.bentoId === bento.id)) {
          Alert.alert('既にお気に入りに追加されています');
          return;
        }
        // 材料・手順を集約
  const ingredients = bento.items.flatMap(item => item.recipe?.ingredients || []);
  const steps = bento.items.flatMap(item => item.recipe?.instructions || []);
        // APIへPOST
        const postData = {
          user_id: user.id,
          menu_id: bento.id,
          title: bento.name,
          image_url: '',
          calories: Math.round(bento.totalNutrition.calories),
          description: bento.description || '',
          ingredients,
          steps
        };
        const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
        fetch(`${baseUrl}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        })
          .then(res => {
            if (res.ok) {
              Alert.alert('お気に入りに追加しました！');
              setFavorites(prev => [
                {
                  id: `favorite-bento-${Date.now()}-${bento.id}`,
                  title: bento.name,
                  sub: getBentoSubtitle(bento),
                  kcal: Math.round(bento.totalNutrition.calories),
                  icon: 'food-steak',
                  recipe: undefined,
                  bentoId: bento.id
                },
                ...prev
              ]);
            } else if (res.status === 409) {
              Alert.alert('すでにお気に入りに登録されています');
            } else {
              res.json().then(err => {
                Alert.alert('お気に入り追加に失敗', err.error || err.message || '不明なエラー');
              }).catch(() => {
                Alert.alert('お気に入り追加に失敗', '不明なエラー');
              });
            }
          })
          .catch(() => {
            Alert.alert('通信エラー', 'お気に入り追加に失敗しました');
          });
      };

      Alert.alert(
        `🍱 ${bento.name}`,
        `${bento.description}\n\n` +
        `📊 栄養バランス:\n` +
        `🔥 合計: ${Math.round(bento.totalNutrition.calories)}kcal\n` +
        `🥩 タンパク質: ${bento.totalNutrition.protein.toFixed(1)}g (${proteinPercent}%)\n` +
        `🍞 炭水化物: ${bento.totalNutrition.carbs.toFixed(1)}g (${carbsPercent}%)\n` +
        `🥑 脂質: ${bento.totalNutrition.fat.toFixed(1)}g (${fatPercent}%)\n\n` +
        `📝 お弁当の構成:\n${itemsList}\n\n` +
        `✨ ${bento.items.length}品目で構成されたバランス弁当です！`,
        [
          { text: '栄養記録', onPress: saveBentoNutrition },
          { text: 'お気に入りに追加', onPress: addToFavorites },
          { text: 'レシピ詳細', onPress: () => navigation.navigate('MenuDetail', { bento }) },
          { text: 'OK' }
        ]
      );
    }
  };

  // 検索機能
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      console.log(`🔍 "${query}" でレシピを検索中...`);
      // 楽天レシピAPIでキーワード検索
      const results = await rakutenRecipeApi.searchRecipes(query, 10);
      // デバッグ: APIの生レスポンス全体を出力
      console.log('🔵 API生レスポンス:', results);
      // 材料名にもキーワードが含まれるかでフィルタ
      const normalizedWords = [query.trim()];
      // ひらがな・カタカナ・ローマ字変換も追加
      if (/^[ぁ-ん]+$/.test(query)) normalizedWords.push(query.replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))); // ひらがな→カタカナ
      if (/^[ァ-ン]+$/.test(query)) normalizedWords.push(query.replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60))); // カタカナ→ひらがな
      if (/^[ぁ-んァ-ン]+$/.test(query)) normalizedWords.push(query.normalize('NFKC'));
      normalizedWords.push(query.toLowerCase());
      // 材料名・タイトル・説明文いずれかに含まれるものだけ
      const filteredResults = results.filter(recipe => {
        // 材料名
        const ingredientHit = Array.isArray(recipe.ingredients) && recipe.ingredients.some(ing =>
          typeof ing.name === 'string' && normalizedWords.some(word => ing.name.includes(word))
        );
        // タイトル・説明文
        const titleHit = typeof recipe.title === 'string' && normalizedWords.some(word => recipe.title.includes(word));
        const descHit = typeof recipe.description === 'string' && normalizedWords.some(word => recipe.description.includes(word));
        return ingredientHit || titleHit || descHit;
      });
      setSearchResults(filteredResults);
      console.log(`🍽️ ${filteredResults.length}件のレシピが見つかりました`);
    } catch (error) {
      console.error('検索エラー:', error);
      Alert.alert('検索エラー', 'レシピの検索中にエラーが発生しました。');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 検索結果をクリア
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Blob color={PALETTE.coral} size={200} top={-50} left={-50} rotate={15} />
        <Blob color={PALETTE.yellow} size={150} top={120} left={width * 0.65} rotate={-10} />
        <Blob color={PALETTE.teal} size={180} top={350} left={-60} rotate={8} />
        <Blob color={PALETTE.blue} size={140} top={580} left={width * 0.7} rotate={-20} />
      </View>

      {/* Top Bar（グラデ）- 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.coral, PALETTE.yellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>お弁当メニュー</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ShoppingList')} 
            style={styles.cartBtn}
          >
            <MaterialCommunityIcons name="cart-outline" size={18} color="#0B1220" />
          </TouchableOpacity>
          <TouchableOpacity onPress={loadEnhancedRecipes} style={styles.refreshBtn}>
            {loading ? (
              <ActivityIndicator size="small" color="#0B1220" />
            ) : (
              <Ionicons name="refresh" size={16} color="#0B1220" />
            )}
          </TouchableOpacity>
          <Text style={styles.timeText}>12:30</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 今日のおすすめ */}
        <SectionTitle title="今日のおすすめ" subtitle="栄養情報付き" accent={PALETTE.coral} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recoRow}
        >
          {recommends.map((r, idx) => (
            <TouchableOpacity 
              key={`recommend-${idx}-${r.id}`} 
              onPress={() => r.recipe ? handleRecipePress(r.recipe) : handleBentoPress(r.bentoId || r.id)} 
              activeOpacity={0.8}
            >
              <Card style={styles.recoCard} accent={[PALETTE.coral, PALETTE.yellow, PALETTE.teal][idx % 3]}>
                <View style={[styles.recoTag, { backgroundColor: `${[PALETTE.coral, PALETTE.yellow, PALETTE.teal][idx % 3]}22`, borderColor: `${[PALETTE.coral, PALETTE.yellow, PALETTE.teal][idx % 3]}66` }]}>
                  <Text style={[styles.recoTagText, { color: [PALETTE.coral, PALETTE.yellow, PALETTE.teal][idx % 3] }]}>{r.tag}</Text>
                </View>
                <Text style={styles.recoTitle} numberOfLines={2}>
                  {r.title}
                </Text>
                {!!r.sub && <Text style={styles.recoSub} numberOfLines={1}>{r.sub}</Text>}
                <Text style={styles.recoKcal}>
                  <Text style={styles.recoKcalValue}>{r.kcal}</Text> kcal
                  {r.recipe ? <Text style={styles.recoApiTag}> 🌟</Text> : <Text style={styles.recoApiTag}> 🍱</Text>}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 検索セクション */}
        <SectionTitle title="レシピ検索" subtitle="お弁当の材料を探そう" accent={PALETTE.grape} />
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={PALETTE.subtle} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="料理名や食材を入力してください"
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor={PALETTE.subtle}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={PALETTE.subtle} />
              </TouchableOpacity>
            )}
          </View>
          
          {isSearching && (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={PALETTE.grape} />
              <Text style={styles.searchLoadingText}>検索中...</Text>
            </View>
          )}
          
          {searchResults.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.searchResults}
            >
              {searchResults.map((recipe, idx) => {
                const estimatedCalories = estimateCaloriesPerServing(recipe);
                return (
                  <TouchableOpacity 
                    key={`search-${idx}-${recipe.id}`}
                    onPress={() => handleRecipePress(recipe)}
                    activeOpacity={0.8}
                    style={styles.searchResultCard}
                  >
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                      <Text style={styles.searchResultInfo}>
                        {recipe.cookingTime || '調理時間不明'} • {estimatedCalories}kcal/人前
                      </Text>
                      <Text style={styles.searchResultCost}>
                        {recipe.cost || '費用不明'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          
          {searchQuery.length > 0 && !isSearching && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search" size={40} color={PALETTE.subtle} />
              <Text style={styles.noResultsText}>
                "{searchQuery}" に関連するレシピが見つかりませんでした
              </Text>
            </View>
          )}
        </View>

        {/* お気に入りメニュー */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: PALETTE.blue }]} />
            <Text style={styles.sectionTitle}>お気に入りメニュー</Text>
            <Text style={styles.sectionSubtitle}>栄養計算済み</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.listBtn} 
              onPress={() => navigation.navigate('Favorites', { favorites })}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={16} color={PALETTE.teal} />
              <Text style={styles.listBtnText}>一覧</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Card style={styles.listCard}>
          {favorites.slice(0, 3).map((f, i) => (
            <View key={`favorite-${i}-${f.id}`}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.listItem} 
                onPress={() => {
                  // お気に入りレシピ詳細をMenuDetailScreenに渡して遷移
                  let ingredients = f.recipe?.ingredients;
                  if (typeof ingredients === 'string') {
                    try { ingredients = JSON.parse(ingredients); } catch { ingredients = []; }
                  }
                  if (!Array.isArray(ingredients)) ingredients = [];
                  let instructions = f.recipe?.instructions;
                  // stepsプロパティが存在する場合はそちらも考慮
                  // @ts-ignore
                  if ((!instructions || instructions.length === 0) && f.recipe?.steps) {
                    // @ts-ignore
                    instructions = f.recipe.steps;
                  }
                  if (typeof instructions === 'string') {
                    try { instructions = JSON.parse(instructions); } catch { instructions = []; }
                  }
                  if (!Array.isArray(instructions)) instructions = [];
                  navigation.navigate('MenuDetail', {
                    recipe: {
                      id: f.id,
                      title: f.title,
                      imageUrl: f.image_url,
                      calories: f.kcal,
                      description: f.description,
                      ingredients,
                      instructions,
                      // 必要に応じて他のフィールドも追加
                    }
                  });
                }}
              >
                <View style={styles.listLeft}>
                  <View style={[styles.thumb, { backgroundColor: `${[PALETTE.teal, PALETTE.grape, PALETTE.yellow][i % 3]}22` }]}> 
                    <MaterialCommunityIcons
                      name={(f.icon as any) ?? "silverware-fork-knife"}
                      size={18}
                      color={[PALETTE.teal, PALETTE.grape, PALETTE.yellow][i % 3]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {f.title}
                    </Text>
                    {!!f.sub && <Text style={styles.listSub} numberOfLines={1}>{f.sub}</Text>}
                  </View>
                </View>
                <View style={styles.listRight}>
                  <Text style={styles.listKcal}>
                    {f.kcal} <Text style={styles.listKcalUnit}>kcal</Text>
                  </Text>
                  {/* アイコン表示はそのまま */}
                  {f.recipe && <Text style={styles.apiIndicator}>🌟</Text>}
                  {f.bentoId && <Text style={styles.bentoIndicator}>🍱</Text>}
                </View>
              </TouchableOpacity>
              {i !== Math.min(favorites.length, 3) - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" color={PALETTE.coral} onPress={() => navigation.navigate('Home')} />
        <NavItem name="food-fork-drink" label="お弁当" active color={PALETTE.teal} />
        <NavItem name="poll" label="統計" color={PALETTE.blue} onPress={() => navigation.navigate('NutritionDashboard')} />
        <NavItem name="cog" label="設定" color={PALETTE.grape} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- UI Parts ---------- */
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
  timeText: { fontSize: 12, color: "#0B1220" },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFDD",
  },
  cartBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFDD",
  },
  refreshBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFAA",
  },

  sectionTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 16, marginBottom: 8, zIndex: 1 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: PALETTE.ink },
  sectionSubtitle: { fontSize: 12, color: PALETTE.subtle },
  
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    zIndex: 1,
    paddingHorizontal: 8,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  listBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${PALETTE.teal}15`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${PALETTE.teal}44`,
  },
  listBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.teal,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${PALETTE.blue}15`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${PALETTE.blue}44`,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.blue,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
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

  // おすすめ（横カード）
  recoRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  recoCard: {
    width: 180,
    height: 140,
    marginRight: 0,
  },
  recoTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  recoTagText: { fontSize: 11, fontWeight: "700" },
  recoTitle: { fontSize: 16, fontWeight: "700", color: PALETTE.ink },
  recoSub: { fontSize: 12, color: PALETTE.subtle, marginTop: 4 },
  recoKcal: { position: "absolute", bottom: 12, left: 12, fontSize: 12, color: PALETTE.subtle },
  recoKcalValue: { fontSize: 14, fontWeight: "800", color: PALETTE.ink },
  recoApiTag: { fontSize: 10, color: PALETTE.yellow },

  // 写真カード
  photoCard: { padding: 16 },
  photoBox: {
    height: 180,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoText: { color: PALETTE.subtle, fontSize: 14, fontWeight: "600" },
  photoSubText: { color: PALETTE.subtle, fontSize: 12, textAlign: "center" },

  // お気に入りリスト
  listCard: { padding: 16 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  listLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  listRight: { alignItems: "flex-end" },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: 14, color: PALETTE.ink, fontWeight: "700" },
  listSub: { fontSize: 12, color: PALETTE.subtle, marginTop: 2 },
  listKcal: { fontSize: 13, color: PALETTE.ink, fontWeight: "700" },
  listKcalUnit: { fontSize: 11, color: PALETTE.subtle, fontWeight: "600" },
  apiIndicator: { fontSize: 10, color: PALETTE.yellow, textAlign: "center", marginTop: 2 },
  bentoIndicator: { fontSize: 10, color: PALETTE.coral, textAlign: "center", marginTop: 2 },
  divider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 4 },

  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE.stroke },
  dotActive: { backgroundColor: PALETTE.coral },

  // Bottom Nav
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

  // 検索関連のスタイル
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: PALETTE.ink,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  searchLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: PALETTE.subtle,
  },
  searchResults: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  searchResultCard: {
    backgroundColor: PALETTE.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    marginRight: 12,
    width: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultContent: {
    padding: 12,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.ink,
    marginBottom: 4,
  },
  searchResultInfo: {
    fontSize: 12,
    color: PALETTE.subtle,
    marginBottom: 2,
  },
  searchResultCost: {
    fontSize: 12,
    color: PALETTE.grape,
    fontWeight: "600",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: PALETTE.subtle,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default BentoMenuScreen;