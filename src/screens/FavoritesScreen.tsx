// src/screens/FavoritesScreen.tsx
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

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

type BentoType = {
  id: string;
  title: string;
  desc: string;
  noteRight?: string; // 右側の短い補足文
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

type BentoCard = {
  id: string;
  title: string; // 2〜3行の説明テキスト想定
  tag?: string;  // 「詳細を見る」などの小さなCTA
};

const TYPES: BentoType[] = [
  {
    id: "1",
    title: "鶏肉の照り焼き弁当",
    desc: "甘辛の王道。",
    noteRight: "ご飯と鶏肉が相性バツグン",
    icon: "food-drumstick",
  },
  {
    id: "2",
    title: "鮭の塩焼き弁当",
    desc: "ふっくら塩分でご飯が進む。",
    noteRight: "シンプルで栄養高め。",
    icon: "fish",
  },
  {
    id: "3",
    title: "牛丼弁当",
    desc: "甘辛だれ、紅生姜をトッピング。",
    noteRight: "寒い日の温かい一品。",
    icon: "cow",
  },
  {
    id: "4",
    title: "野菜炒め弁当",
    desc: "たっぷりの野菜でヘルシー。",
    noteRight: "栄養価が高く、節約的な選択。",
    icon: "leaf",
  },
];

const CARDS: BentoCard[] = [
  { id: "c1", tag: "詳細を見る", title: "鶏肉の照り焼き弁当\n自家製タレが自慢。" },
  { id: "c2", tag: "詳細を見る", title: "鮭の塩焼き弁当\nふっくら鮭がクセになる。" },
  { id: "c3", tag: "詳細を見る", title: "卵焼きの厚みが自慢\n甘辛のしょうゆ味品。" },
  { id: "c4", tag: "詳細を見る", title: "ふっくら鮭ワンポイント\n栄養バランス◎。" },
  { id: "c5", tag: "詳細を見る", title: "牛丼弁当\n柔らかい牛肉に玉ねぎの甘み。" },
  { id: "c6", tag: "詳細を見る", title: "野菜炒め弁当\nたっぷりの野菜で栄養満点。" },
];

const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
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
        {/* お弁当の種類 */}
        <SectionTitle title="お弁当の種類" accent={PALETTE.teal} />
        <Card style={styles.listCard}>
          {TYPES.map((item, i) => (
            <View key={item.id}>
              <TypeRow item={item} />
              {i !== TYPES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        {/* お気に入りコレクション */}
        <SectionTitle title="お気に入りコレクション" accent={PALETTE.coral} />
        <View style={styles.grid}>
          {CARDS.map((c, idx) => (
            <Card key={c.id} style={[styles.gridCard, { backgroundColor: `${[PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.grape, PALETTE.blue][idx % 5]}12` }]}>
              {!!c.tag && (
                <TouchableOpacity style={[styles.cardTag, { backgroundColor: `${[PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.grape, PALETTE.blue][idx % 5]}22` }]}>
                  <Text style={[styles.cardTagText, { color: [PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.grape, PALETTE.blue][idx % 5] }]}>{c.tag}</Text>
                </TouchableOpacity>
              )}
              <Text numberOfLines={3} style={styles.cardText}>
                {c.title}
              </Text>
            </Card>
          ))}
        </View>

        {/* アクション */}
        <SectionTitle title="管理" accent={PALETTE.grape} />
        <Card style={styles.actionsCard}>
          <Button variant="outline" label="お弁当の削除" onPress={() => {}} accent={PALETTE.bad} />
          <Button variant="outline" label="リストをクリア" onPress={() => {}} accent={PALETTE.subtle} />
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

const TypeRow = ({ item }: { item: BentoType }) => {
  const colors = [PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.grape];
  const color = colors[parseInt(item.id) % colors.length];
  
  return (
    <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
      <View style={styles.listLeft}>
        <View style={[styles.thumb, { backgroundColor: `${color}22` }]}>
          {item.icon ? (
            <MaterialCommunityIcons name={item.icon} size={18} color={color} />
          ) : (
            <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={color} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <Text style={styles.listSub}>{item.desc}</Text>
        </View>
      </View>
      {!!item.noteRight && (
        <View style={styles.noteContainer}>
          <Text numberOfLines={2} style={styles.listNote}>
            {item.noteRight}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={PALETTE.subtle} />
    </TouchableOpacity>
  );
};

const Button = ({
  label,
  onPress,
  variant = "solid",
  accent = PALETTE.coral,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  accent?: string;
}) => (
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
