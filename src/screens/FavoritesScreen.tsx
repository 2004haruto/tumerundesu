// src/screens/FavoritesScreen.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';
import type { Favorite } from "./BentoMenuScreen";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

/** ===== Palette ===== */

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




const FavoritesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, token } = useAuth();
  // BentoMenuScreenから渡されたお気に入りリストを取得
  // 初期値はpropsから受け取る
  const [favorites, setFavorites] = useState<Favorite[]>(route.params?.favorites || []);
  // チェック状態を管理
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // チェックボックスの切り替え
  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 削除ボタン押下時
  const handleDelete = async () => {
    if (checkedIds.size === 0) return;
    // 画面上から先に削除
    setFavorites(prev => prev.filter(f => !checkedIds.has(f.id)));
    // DBからも削除
    if (user && token) {
      const deletePromises = Array.from(checkedIds).map(async (menuId) => {
        try {
          await fetch(`${API_BASE_URL}/favorites`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ user_id: user.id, menu_id: menuId }),
          });
        } catch (e) {
          // エラーは無視（画面上は即時反映）
        }
      });
      await Promise.all(deletePromises);
    }
    setCheckedIds(new Set());
    // TODO: 必要ならAPIにも削除リクエストを送る
  };
  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Blob color={PALETTE.teal} size={200} top={-50} left={-50} rotate={15} />
        <Blob color={PALETTE.coral} size={150} top={120} left={width * 0.65} rotate={-10} />
        <Blob color={PALETTE.yellow} size={180} top={350} left={-60} rotate={8} />
        <Blob color={PALETTE.grape} size={140} top={580} left={width * 0.7} rotate={-20} />
      </View>

      {/* Top Bar（グラデ）- 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.teal, PALETTE.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>お気に入り</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >


        {/* お気に入りコレクション（全件リスト表示） */}
        <SectionTitle title="お気に入りコレクション" accent={PALETTE.coral} />
        <Card style={styles.listCard}>
          {favorites.length === 0 ? (
            <Text style={{ color: PALETTE.subtle, textAlign: 'center', padding: 16 }}>お気に入りメニューがありません</Text>
          ) : (
            favorites.map((f, i) => (
              <View key={`favorite-${i}-${f.id}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={[styles.listItem, { flex: 1 }]} 
                  onPress={() => {
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
                    {f.recipe && <Text style={styles.apiIndicator}>🌟</Text>}
                    {f.bentoId && <Text style={styles.bentoIndicator}>🍱</Text>}
                  </View>
                </TouchableOpacity>
                {/* チェックボックス */}
                <TouchableOpacity
                  onPress={() => toggleCheck(f.id)}
                  style={{ marginLeft: 8, padding: 8 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name={checkedIds.has(f.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={PALETTE.teal}
                  />
                </TouchableOpacity>
                {i !== favorites.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </Card>

        {/* アクション */}
        <SectionTitle title="管理" accent={PALETTE.grape} />
        <Card style={styles.actionsCard}>
          <Button variant="outline" label="お弁当の削除" onPress={handleDelete} accent={PALETTE.bad} />
          <Button variant="outline" label="リストをクリア" onPress={() => setFavorites([])} accent={PALETTE.subtle} />
        </Card>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" color={PALETTE.coral} onPress={() => navigation.navigate('Home')} />
        <NavItem name="star" label="お気に入り" active color={PALETTE.teal} />
        <NavItem name="poll" label="統計" color={PALETTE.blue} onPress={() => navigation.navigate('NutritionDashboard')} />
        <NavItem name="cog" label="設定" color={PALETTE.grape} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
};

export default FavoritesScreen;

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

const Card: React.FC<{ style?: any; children: React.ReactNode; accent?: string }> = ({ style, children, accent }) => (
  <View style={[styles.card, style, accent && { backgroundColor: `${accent}12` }]}>
    {children}
  </View>
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


type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  accent?: string;
};
const Button = ({
  label,
  onPress,
  variant = "solid",
  accent = PALETTE.coral,
}: ButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.button,
      variant === "solid"
        ? { backgroundColor: accent }
        : { backgroundColor: "#fff", borderWidth: 1, borderColor: accent }
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
  listRight: { alignItems: "flex-end" },
  listKcal: { fontSize: 13, color: PALETTE.ink, fontWeight: "700" },
  listKcalUnit: { fontSize: 11, color: PALETTE.subtle, fontWeight: "600" },
  apiIndicator: { fontSize: 10, color: PALETTE.yellow, textAlign: "center", marginTop: 2 },
  bentoIndicator: { fontSize: 10, color: PALETTE.coral, textAlign: "center", marginTop: 2 },

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
  noteContainer: { marginRight: 8 },
  listNote: { fontSize: 10, color: PALETTE.subtle, textAlign: "right", width: 80 },
  divider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 4 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    width: "48%",
    minHeight: 100,
  },
  cardTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  cardTagText: { fontSize: 11, fontWeight: "600" },
  cardText: { fontSize: 12, color: PALETTE.ink, fontWeight: "500" },

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
});
