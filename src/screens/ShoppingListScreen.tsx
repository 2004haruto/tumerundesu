// src/screens/ShoppingListScreen.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native";
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

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

// スタイル定義
/** スタイル定義 */
type Styles = {
  safe: ViewStyle;
  container: ViewStyle;
  loadingContainer: ViewStyle;
  listItem: ViewStyle;
  listLeft: ViewStyle;
  listRight: ViewStyle;
  thumb: ViewStyle;
  checkbox: ViewStyle;
  deleteBtn: ViewStyle;
  listTitle: TextStyle;
  listSub: TextStyle;
  loadingText: TextStyle;
  emptyText: TextStyle;
  emptySubtext: TextStyle;
  topBar: ViewStyle;
  topBarTitle: TextStyle;
  backBtn: ViewStyle;
  iconBtn: ViewStyle;
  sectionTitleRow: ViewStyle;
  sectionDot: ViewStyle;
  sectionTitle: TextStyle;
  sectionSubtitle: TextStyle;
  recipeHeader: ViewStyle;
  recipeName: TextStyle;
  recipeDate: TextStyle;
  card: ViewStyle;
  listCard: ViewStyle;
  emptyState: ViewStyle;
  divider: ViewStyle;
  statsCard: ViewStyle;
  statsGrid: ViewStyle;
  statItem: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  actionsCard: ViewStyle;
  button: ViewStyle;
  btnText: TextStyle;
  bottomNav: ViewStyle;
  navItem: ViewStyle;
  navPill: ViewStyle;
  navLabel: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  // ベースコンテナ
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 30 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  
  // リストアイテム関連
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: PALETTE.stroke, backgroundColor: PALETTE.bg, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: `${PALETTE.bad}11` },
  
  // テキストスタイル
  listTitle: { fontSize: 14, color: PALETTE.ink, fontWeight: '700' },
  listSub: { fontSize: 12, color: PALETTE.subtle, marginTop: 2 },
  loadingText: { fontSize: 14, color: PALETTE.subtle, marginTop: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: PALETTE.subtle, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: PALETTE.subtle, marginTop: 4 },
  
  // ヘッダー関連
  topBar: { position: 'absolute', top: 44, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: PALETTE.ink },
  backBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: `${PALETTE.bg}DD` },
  iconBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: `${PALETTE.bg}DD`, alignItems: 'center', justifyContent: 'center' },
  
  // セクション関連
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16, marginBottom: 8, zIndex: 1 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.ink },
  sectionSubtitle: { fontSize: 12, color: PALETTE.subtle },
  
  // レシピ関連
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 8, marginBottom: 8 },
  recipeName: { fontSize: 16, fontWeight: '700', color: PALETTE.ink, flex: 1 },
  recipeDate: { fontSize: 11, color: PALETTE.subtle, fontStyle: 'italic' },
  
  // カード関連
  card: { backgroundColor: PALETTE.bg, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: PALETTE.stroke, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, zIndex: 1, marginBottom: 12 },
  listCard: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  divider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 4 },
  
  // 統計情報関連
  statsCard: { padding: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: PALETTE.ink },
  statLabel: { fontSize: 12, color: PALETTE.subtle, marginTop: 4 },
  
  // アクション関連
  actionsCard: { padding: 16 },
  bottomNav: { position: 'absolute', bottom: 34, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: PALETTE.bg, borderTopWidth: 1, borderTopColor: PALETTE.stroke, flexDirection: 'row', justifyContent: 'space-between', gap: 10, zIndex: 10 },
  
  // ボタン関連
  button: { height: 48, borderRadius: 12, marginVertical: 6, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  
  // ナビゲーション関連
  navItem: { flex: 1 },
  navPill: { height: 44, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navLabel: { fontSize: 12, color: PALETTE.subtle, fontWeight: '700' }

});

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'ShoppingList'>;

/** ===== Palette ===== */
type Item = {
  id: number;
  name: string;
  quantity: string;
  category: string;
  recipeName?: string;
  checked: boolean;
  createdAt?: string;
};

// デバッグヘルパー関数
const debugTextContent = (content: any) => {
  if (typeof content === 'string') {
    return content;
  }
  console.warn('テキストコンテンツが文字列ではありません:', content);
  return String(content);
};

const ShoppingListScreen: React.FC<Props> = ({ navigation }) => {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const allChecked = useMemo(() => items.length > 0 && items.every((i) => i.checked), [items]);
  const hasAny = items.length > 0;

  // 料理ごとにグループ化
  const itemsByRecipe = useMemo(() => {
    const grouped: { [recipeName: string]: Item[] } = {};
    items.forEach(item => {
      const recipeName = item.recipeName || '未設定';
      if (!grouped[recipeName]) {
        grouped[recipeName] = [];
      }
      grouped[recipeName].push(item);
    });
    return grouped;
  }, [items]);

  useEffect(() => {
    // デバッグ用：テキストレンダリングのチェック
    const debugTextRendering = () => {
      console.log('=== テキストレンダリングデバッグ ===');
      
      // アイテムのレンダリングチェック
      items.forEach(item => {
        console.log(`アイテム名のレンダリング: ${item.name}`);
        console.log(`レシピ名のレンダリング: ${item.recipeName || '未設定'}`);
        console.log(`カテゴリのレンダリング: ${item.category || '未分類'}`);
        console.log('---');
      });

      // レシピグループのレンダリングチェック
      Object.keys(itemsByRecipe).forEach(recipeName => {
        console.log(`レシピグループヘッダーのレンダリング: ${recipeName}`);
        console.log('===');
      });
    };

    debugTextRendering();
  }, [items, itemsByRecipe]);

  // データ取得
  const loadShoppingList = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await apiClient.getShoppingList(token);
      setItems(data.items || []);
    } catch (error) {
      console.error('買い物リスト取得エラー:', error);
      Alert.alert('エラー', '買い物リストの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShoppingList();
  }, [token]);

  const toggleCheck = async (id: number, currentChecked: boolean) => {
    if (!token) return;
    
    try {
      // 楽観的更新
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, checked: !currentChecked } : i))
      );
      
      await apiClient.toggleShoppingListItem(token, id, !currentChecked);
    } catch (error) {
      console.error('チェック切り替えエラー:', error);
      // エラー時は元に戻す
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, checked: currentChecked } : i))
      );
      Alert.alert('エラー', 'チェック状態の更新に失敗しました');
    }
  };

  const checkAll = async () => {
    if (!token) return;
    
    try {
      const uncheckedItems = items.filter(i => !i.checked);
      
      // 楽観的更新
      setItems((prev) => prev.map((i) => ({ ...i, checked: true })));
      
      // すべての未チェックアイテムを更新
      await Promise.all(
        uncheckedItems.map(item => apiClient.toggleShoppingListItem(token, item.id, true))
      );
    } catch (error) {
      console.error('一括チェックエラー:', error);
      Alert.alert('エラー', '一括チェックに失敗しました');
      loadShoppingList(); // リロードして正しい状態を取得
    }
  };

  const deleteItem = async (id: number) => {
    if (!token) return;
    
    try {
      await apiClient.removeFromShoppingList(token, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', 'アイテムの削除に失敗しました');
    }
  };

    const clearList = () => {
    if (!token) return;
    
    const title = "確認";
    const message = "リストをすべて削除しますか？";
    Alert.alert(title, message, [
      { text: "キャンセル", style: "cancel" },
      { 
        text: "削除する", 
        style: "destructive", 
        onPress: async () => {
          try {
            await Promise.all(items.map(item => apiClient.removeFromShoppingList(token, item.id)));
            setItems([]);
          } catch (error) {
            console.error('一括削除エラー:', error);
            Alert.alert('エラー', 'リストのクリアに失敗しました');
            loadShoppingList();
          }
        }
      },
    ]);
  };

  const clearCompleted = () => {
    if (!token) return;
    
    const completedItems = items.filter(i => i.checked);
    if (completedItems.length === 0) {
      Alert.alert('情報', '完了したアイテムがありません');
      return;
    }

    const title = "確認";
    const message = `完了した${completedItems.length}個のアイテムを削除しますか？`;
    Alert.alert(
      title,
      message,
      [
        { text: "キャンセル", style: "cancel" },
        { 
          text: "削除する", 
          style: "destructive", 
          onPress: async () => {
          try {
            await Promise.all(completedItems.map(item => apiClient.removeFromShoppingList(token, item.id)));
            setItems(prev => prev.filter(i => !i.checked));
          } catch (error) {
            console.error('完了アイテム削除エラー:', error);
            Alert.alert('エラー', '削除に失敗しました');
            loadShoppingList();
          }
        }
      },
    ]);
  };

  const shareList = async () => {
    const lines = items.map(
      (i) => `${i.checked ? "☑" : "☐"} ${i.name}${i.quantity ? `（${i.quantity}）` : ""}`
    );
    const shareMessage = `買い物リスト\n\n${lines.join("\n")}`;
    try {
      await Share.share({
        title: "ショッピングリスト",
        message: shareMessage,
      });
    } catch (e) {
      Alert.alert("エラー", "共有に失敗しました");
    }
  };

  const getCategoryIcon = (category: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    const icons: { [key: string]: keyof typeof MaterialCommunityIcons.glyphMap } = {
      '野菜': 'carrot',
      '肉・魚': 'food-steak',
      '調味料': 'bottle-tonic',
      '乳製品': 'cheese',
      '穀物': 'grain',
      '果物': 'fruit-cherries',
      'その他': 'food-variant',
      '未分類': 'food-variant',
    };
    return icons[category] || 'food-variant';
  };

  const renderItem = ({ item }: { item: Item }) => {
    // 各レンダリング要素のデバッグ
    const debugElement = (component: string, content: any) => {
      console.log(`デバッグ [${component}]:`, content);
    };
    return (
      <TouchableOpacity onPress={() => toggleCheck(item.id, item.checked)} style={styles.listItem}>
        <View style={styles.listLeft}>
          <View style={[styles.thumb, { backgroundColor: item.checked ? `${PALETTE.good}22` : `${PALETTE.blue}22` }]}>
            <MaterialCommunityIcons 
              name={getCategoryIcon(item.category)} 
              size={18} 
              color={item.checked ? PALETTE.good : PALETTE.blue} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.listTitle,
                item.checked ? { color: PALETTE.subtle, textDecorationLine: "line-through" } : null,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {(item.category || item.quantity) && (
              <Text
                style={[
                  styles.listSub,
                  item.checked ? { color: PALETTE.subtle } : null,
                ]}
                numberOfLines={1}
              >
                <Text>{item.category || '未分類'}</Text>
                {item.quantity ? <Text> • {item.quantity}</Text> : null}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.listRight}>
          <TouchableOpacity 
            onPress={() => deleteItem(item.id)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={14} color={PALETTE.bad} />
          </TouchableOpacity>
          <View style={[styles.checkbox, item.checked && { backgroundColor: PALETTE.good, borderColor: PALETTE.good }]}>
            {item.checked && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  console.log('=== デバッグ: レンダリング開始 ===');

  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <BlobBackground color={PALETTE.blue} size={200} top={-50} left={-50} rotate={15} />
        <BlobBackground color={PALETTE.yellow} size={150} top={120} left={width * 0.65} rotate={-10} />
        <BlobBackground color={PALETTE.teal} size={180} top={350} left={-60} rotate={8} />
        <BlobBackground color={PALETTE.coral} size={140} top={580} left={width * 0.7} rotate={-20} />
      </View>

      {/* Top Bar（グラデ）- 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.blue, PALETTE.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>ショッピングリスト</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons name="cart" size={18} color="#0B1220" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="share-outline" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PALETTE.blue} />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
          <>
            {/* メインリスト - 料理ごとにグループ化 */}
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: PALETTE.blue }]} />
              <Text style={styles.sectionTitle}>買い物リスト</Text>
              <Text style={styles.sectionSubtitle}>{items.length}個のアイテム</Text>
            </View>
            
            {items.length > 0 ? (
              Object.keys(itemsByRecipe).map((recipeName, recipeIndex) => {
                const recipeItems = itemsByRecipe[recipeName];
                const firstItem = recipeItems[0];
                const formattedDate = firstItem.createdAt 
                  ? new Date(firstItem.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : null;
                
                return (
                    <View key={`recipe-${recipeIndex}-${recipeName}`} style={{ marginBottom: 12 }}>
                    <View style={styles.recipeHeader}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={PALETTE.coral} />
                      <Text style={styles.recipeName}>{recipeName || "未設定"}</Text>
                      {formattedDate && (
                        <Text style={styles.recipeDate}>{formattedDate}</Text>
                      )}
                    </View>
                    {/* この料理の材料リスト */}
                    <Card style={styles.listCard}>
                      {recipeItems.map((item, i) => (
                        <View key={item.id}>
                          {renderItem({ item })}
                          {i !== recipeItems.length - 1 ? <View style={styles.divider} /> : null}
                        </View>
                      ))}
                    </Card>
                  </View>
                );
              })
            ) : (
                <Card style={styles.listCard}>
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="cart-outline" size={48} color={PALETTE.subtle} />
                  <Text style={styles.emptyText}>アイテムがありません</Text>
                  <Text style={styles.emptySubtext}>メニューから材料を追加してください</Text>
                </View>
              </Card>
            )}

            {/* 統計情報 */}
            {items.length > 0 && (
              <>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionDot, { backgroundColor: PALETTE.good }]} />
                  <Text style={styles.sectionTitle}>{`進捗状況`}</Text>
                </View>
                <Card style={styles.statsCard}>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{items.filter(i => i.checked).length}</Text>
                      <Text style={styles.statLabel}>完了</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{items.filter(i => !i.checked).length}</Text>
                      <Text style={styles.statLabel}>残り</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {Math.round((items.filter(i => i.checked).length / items.length) * 100)}%
                      </Text>
                      <Text style={styles.statLabel}>進捗</Text>
                    </View>
                  </View>
                </Card>
              </>
            )}

            {/* アクションボタン */}
            <SectionTitle title={`アクション`} accent={PALETTE.grape} />
            <Card style={styles.actionsCard}>
              <Button 
                variant="outline" 
                label={`完了アイテムを削除`}
                onPress={clearCompleted} 
                accent={PALETTE.yellow}
                disabled={!items.some(i => i.checked)}
              />
              <Button 
                variant="outline" 
                label={`リストをクリア`}
                onPress={clearList} 
                accent={PALETTE.bad}
                disabled={!hasAny}
              />
              <Button 
                variant="outline" 
                label={`リストを共有`}
                onPress={shareList} 
                accent={PALETTE.blue}
                disabled={!hasAny}
              />
              <Button
                variant="solid"
                label={`すべてチェック`}
                onPress={checkAll}
                accent={PALETTE.good}
                disabled={allChecked || !hasAny}
              />
            </Card>
          </>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" color={PALETTE.coral} onPress={() => navigation.navigate('Home')} />
        <NavItem name="food-fork-drink" label="お弁当" color={PALETTE.teal} onPress={() => navigation.navigate('BentoMenu')} />
        <NavItem name="cart" label="買い物" active color={PALETTE.blue} onPress={() => {}} />
        <NavItem name="cog" label="設定" color={PALETTE.grape} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
};

/* ---------- UI パーツ ---------- */

const SectionTitle: React.FC<{ title: string; subtitle?: string | number; accent?: string }> = ({
  title,
  subtitle,
  accent = PALETTE.coral,
}) => (
  <View style={styles.sectionTitleRow}>
    <View style={[styles.sectionDot, { backgroundColor: accent }]} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle !== undefined && subtitle !== null ? (
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    ) : null}
  </View>
);

const Button: React.FC<{
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  accent?: string;
  disabled?: boolean;
}> = ({
  label,
  onPress,
  variant = "solid",
  accent = PALETTE.coral,
  disabled = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.button,
      variant === "solid" 
        ? { backgroundColor: accent, opacity: disabled ? 0.4 : 1 }
        : { backgroundColor: "#fff", borderWidth: 1, borderColor: accent, opacity: disabled ? 0.4 : 1 }
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

const BlobBackground: React.FC<{ color: string; size: number; top: number; left: number; rotate?: number }> = ({
  color,
  size,
  top,
  left,
  rotate = 0,
}) => {
  const rotateStyle = { transform: [{ rotate: `${rotate}deg` }] };
  
  return (
    <View
      style={[{
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
      }, rotateStyle]}
    />
  );
};

export default ShoppingListScreen;

// デバッグ用のマーカーコンポーネント
const DebugMarker: React.FC<{ id: string }> = ({ id }) => {
  useEffect(() => {
    console.log(`デバッグマーカー: ${id} がレンダリングされました`);
    return () => console.log(`デバッグマーカー: ${id} がアンマウントされました`);
  }, [id]);
  return null;
};

const Card: React.FC<{ style?: any; children: React.ReactNode; accent?: string }> = ({ style, children, accent }) => {
  const cardStyle = [
    styles.card,
    style,
    accent ? { backgroundColor: `${accent}12` } : null
  ].filter(Boolean);

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const NavItem: React.FC<{
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  color: string;
  onPress?: () => void;
}> = ({ name, label, active, color, onPress }) => {
  const pillStyle = active
    ? [styles.navPill, { backgroundColor: `${color}22`, borderColor: `${color}66` }]
    : [styles.navPill, { backgroundColor: "#FFFFFF", borderColor: "#EAEAEA" }];
  
  const labelStyle = active ? [styles.navLabel, { color }] : styles.navLabel;
  
  return (
    <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={onPress}>
      <View style={pillStyle}>
        <MaterialCommunityIcons name={name} size={18} color={active ? color : "#8A8A8A"} />
        <Text style={labelStyle}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};
