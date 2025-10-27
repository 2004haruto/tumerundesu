// src/screens/PackingGuideScreen.tsx
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'PackingGuide'>;

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

/* ---------- モックデータ ---------- */
type Tip = {
  id: string;
  title: string;
  tags: string[];       // 「見た目」「彩り」など
  desc: string;         // 説明文
};

const TIPS: Tip[] = [
  {
    id: "1",
    title: "色のバランス",
    tags: ["見た目", "彩り"],
    desc:
      "お弁当は色どりに配慮すると美味しく見えます。例えば、緑の野菜、赤い具、白いご飯。",
  },
  {
    id: "2",
    title: "量の配分",
    tags: ["満足感", "バランス"],
    desc:
      "それぞれの食材を適量にし、バランス良く詰めることで満足感を得ることができます。",
  },
  {
    id: "3",
    title: "盛り付けの工夫",
    tags: ["食べやすさ", "デコレーション"],
    desc:
      "盛り付け方に工夫を添えると、くずれを防いだり、立体感を出すことで満足度が増します。",
  },
];

/* ---------- 画面 ---------- */
const PackingGuideScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Blob color={PALETTE.yellow} size={200} top={-50} left={-50} rotate={15} />
        <Blob color={PALETTE.teal} size={150} top={120} left={width * 0.65} rotate={-10} />
        <Blob color={PALETTE.grape} size={180} top={350} left={-60} rotate={8} />
        <Blob color={PALETTE.coral} size={140} top={580} left={width * 0.7} rotate={-20} />
      </View>

      {/* Top Bar（グラデ）- 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.yellow, PALETTE.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>詰め方ガイド</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="bookmark-outline" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ヒーロー */}
        <SectionTitle title="詰め方の例" accent={PALETTE.yellow} />
        <Card style={styles.heroCard}>
          <View style={styles.hero}>
            <MaterialCommunityIcons name="chef-hat" size={48} color={PALETTE.subtle} />
            <Text style={styles.heroText}>実際のお弁当の詰め方の例</Text>
          </View>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </Card>

        {/* 詰め方のヒント */}
        <SectionTitle title="詰め方のヒント" accent={PALETTE.teal} />
        <Card style={styles.listCard}>
          {TIPS.map((tip, i) => (
            <View key={tip.id}>
              <TipCard tip={tip} />
              {i !== TIPS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" color={PALETTE.coral} onPress={() => navigation.navigate('Home')} />
        <NavItem name="chef-hat" label="ガイド" active color={PALETTE.teal} />
        <NavItem name="star" label="お気に入り" color={PALETTE.grape} onPress={() => navigation.navigate('Favorites')} />
        <NavItem name="cog" label="設定" color={PALETTE.blue} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
};

export default PackingGuideScreen;

/* ---------- パーツ ---------- */

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

const TipCard = ({ tip }: { tip: Tip }) => {
  const colors = [PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.grape];
  const color = colors[parseInt(tip.id) - 1];
  
  return (
    <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
      <View style={styles.listLeft}>
        <View style={[styles.thumb, { backgroundColor: `${color}22` }]}>
          <MaterialCommunityIcons
            name={tip.id === "1" ? "palette" : tip.id === "2" ? "scale-balance" : "layers"}
            size={18}
            color={color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>{tip.title}</Text>
          <View style={styles.tagRow}>
            {tip.tags.map((t) => (
              <View key={t} style={[styles.tagChip, { backgroundColor: `${color}15` }]}>
                <Text style={[styles.tagText, { color }]}>{t}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.listSub}>{tip.desc}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: `${color}44` }]}>
          <Ionicons name="add" size={16} color={color} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: `${color}44` }]}>
          <Ionicons name="checkmark" size={16} color={color} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

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

/* ---------- スタイル ---------- */

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

  heroCard: { padding: 16 },
  hero: {
    height: 160,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroText: { color: PALETTE.subtle, fontSize: 14, fontWeight: "600" },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.stroke,
  },
  dotActive: { backgroundColor: PALETTE.teal },

  listCard: { padding: 16 },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  listLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: 14, color: PALETTE.ink, fontWeight: "700", marginBottom: 4 },
  listSub: { fontSize: 12, color: PALETTE.subtle, marginTop: 6, lineHeight: 16 },
  divider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 4 },

  tagRow: { flexDirection: "row", gap: 4, marginTop: 2, flexWrap: "wrap" },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { fontSize: 10, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

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
