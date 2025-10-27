import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { debugExploreCategories } from '../services/rakutenRecipeApi';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/** ===== Palette ===== */
const PALETTE = {
  bg: "#FFFFFF",
  ink: "#171717",
  subtle: "#6B7280",
  stroke: "#ECECEC",
  // accents inspired by your reference image
  coral: "#FF7A6E",
  yellow: "#FFD54A",
  teal: "#44D1C9",
  blue: "#6FB7FF",
  grape: "#B89CFF",
  good: "#22A06B",
  bad: "#E25555",
};

type Schedule = {
  id: string;
  title: string;
  time: string;
  side?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const schedules: Schedule[] = [
  { id: "1", title: "ミーティング", time: "10:00 AM - 11:00 AM", side: "チーム会議", icon: "account-group-outline" },
  { id: "2", title: "課題の時間", time: "12:00 PM - 1:00 PM", side: "新しい技術書を読む", icon: "book-outline" },
  { id: "3", title: "ランチ", time: "1:00 PM - 2:00 PM", side: "お弁当持参", icon: "food-outline" },
];

const chips = ["リュック", "フルーツ", "傘"];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [isExploring, setIsExploring] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const handleDebugExplore = async () => {
    Alert.alert(
      '🔍 カテゴリ探索',
      'カテゴリ1-50を調査して「きゅうり」を含むカテゴリを特定します。\n\n⚠️ 約3-5分かかります（レート制限対策のため）',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行',
          onPress: async () => {
            setIsExploring(true);
            try {
              await debugExploreCategories('きゅうり');
              Alert.alert('完了', 'カテゴリ探索が完了しました。ログを確認してください。');
            } catch (error) {
              Alert.alert('エラー', `探索中にエラーが発生しました: ${error}`);
            } finally {
              setIsExploring(false);
            }
          }
        }
      ]
    );
  };
  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Blob color={PALETTE.yellow} size={220} top={-60} left={-60} rotate={10} />
        <Blob color={PALETTE.teal} size={160} top={10} left={width * 0.56} rotate={-8} />
        <Blob color={PALETTE.blue} size={180} top={340} left={-40} rotate={6} />
        <Blob color={PALETTE.coral} size={140} top={560} left={width * 0.62} rotate={-18} />
      </View>

      {/* Top Bar（グラデ）- 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.blue, PALETTE.grape]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <Text style={styles.topBarTitle}>ホーム</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={styles.timeText}>12:30</Text>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 114 }} // フッターの位置（34）+ フッターの高さ（80）分だけ余白を追加
        showsVerticalScrollIndicator={false}
      >

        {/* Greeting */}
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <LinearGradient
              colors={[PALETTE.yellow, PALETTE.coral]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="person" size={20} color="#1F2937" />
          </View>
          <View>
            <Text style={styles.userName}>{user?.name || 'ユーザー名'}</Text>
            <Text style={styles.subtle}>おはようございます！</Text>
          </View>
        </View>

        {/* Weather + Suggestions */}
        <SectionTitle title="今日の天気" subtitle="気温: 30℃" accent={PALETTE.coral} />
        <View style={styles.cardRow}>
          <Card style={{ flex: 1 }} accent={PALETTE.yellow}>
            <Text style={styles.cardLabel}>服装</Text>
            <View style={styles.cardImageBox}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
                }}
                style={styles.cardImage}
              />
            </View>
            <Text style={styles.caption}>サンダル</Text>
            <Text numberOfLines={2} style={styles.small}>
              夏の天気なので軽めの服装がおすすめ
            </Text>
          </Card>

          <View style={{ width: 12 }} />

          <Card style={{ flex: 1 }} accent={PALETTE.teal}>
            <Text style={styles.cardLabel}>持ち物</Text>
            <View style={styles.cardImageBox}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1621293954906-c4a19a2eb2b3?q=80&w=800&auto=format&fit=crop",
                }}
                style={styles.cardImage}
              />
            </View>
            <Text style={styles.caption}>保冷剤</Text>
            <Text numberOfLines={2} style={styles.small}>
              真夏には保冷剤を。飲み物は冷たいものを。
            </Text>
          </Card>
        </View>

        {/* Schedule */}
        <SectionTitle title="今日の予定" accent={PALETTE.blue} />
        <View style={styles.scheduleWrap}>
          {schedules.map((s, idx) => (
            <View key={s.id}>
              <View style={styles.scheduleRow}>
                <View style={[styles.dot, { backgroundColor: [PALETTE.coral, PALETTE.teal, PALETTE.yellow][idx % 3] }]} />
                <View style={styles.scheduleIcon}>
                  <MaterialCommunityIcons name={s.icon} size={18} color="#3F3F46" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleTitle}>{s.title}</Text>
                  <Text style={styles.scheduleTime}>{s.time}</Text>
                </View>
                {s.side ? <Text style={styles.scheduleSide}>{s.side}</Text> : null}
              </View>
              {idx !== schedules.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Carry Items */}
        <SectionTitle title="持ち物提案" accent={PALETTE.grape} />
        <View style={styles.chipsRow}>
          {chips.map((c, i) => (
            <Chip key={c} label={c} color={[PALETTE.teal, PALETTE.yellow, PALETTE.coral][i % 3]} />
          ))}
        </View>

        {/* Activity */}
        <SectionTitle title="今日の活動量" accent={PALETTE.coral} />
        <View style={styles.cardRow}>
          <StatCard
            title="歩数"
            value="5000 steps"
            delta="+20%"
            deltaColor={PALETTE.good}
            icon={<MaterialCommunityIcons name="walk" size={18} color={PALETTE.ink} />}
            gradient={[PALETTE.yellow, "#FFEAA0"]}
          />
          <View style={{ width: 12 }} />
          <StatCard
            title="消費カロリー"
            value="450 kcal"
            delta="-10%"
            deltaColor={PALETTE.bad}
            icon={<MaterialCommunityIcons name="fire" size={18} color={PALETTE.ink} />}
            gradient={[PALETTE.coral, "#FFC0BA"]}
          />
        </View>

        {/* 🔍 DEBUG: カテゴリ探索 - 必要に応じてコメント解除
        <SectionTitle title="🔍 デバッグツール" accent="#9333EA" />
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={handleDebugExplore}
          disabled={isExploring}
          activeOpacity={0.7}
        >
          {isExploring ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="magnify" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.debugButtonText}>
            {isExploring ? 'カテゴリ探索中... (3-5分)' : 'きゅうりカテゴリを探索'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.debugNote}>
          ※ 楽天レシピAPIのカテゴリ1-50を調査して、きゅうりを含むカテゴリを特定します
        </Text>
        */}

      </ScrollView>

      {/* Bottom Nav Mock - 固定フッター */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" active color={PALETTE.coral} />
        <NavItem name="food-fork-drink" label="お弁当" color={PALETTE.teal} onPress={() => navigation.navigate('BentoMenu')} />
        <NavItem name="poll" label="統計" color={PALETTE.blue} onPress={() => navigation.navigate('NutritionDashboard')} />
        <NavItem name="cog" label="設定" color={PALETTE.grape} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
};

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
  <View style={[styles.card, style, { backgroundColor: `${accent ?? PALETTE.yellow}12` }]}>
    {children}
  </View>
);

const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <TouchableOpacity 
    activeOpacity={0.85} 
    style={[
      styles.chip, 
      { 
        borderColor: `${color}55`,
        backgroundColor: `${color}15`
      }
    ]}
  >
    <Text style={styles.chipText}>{label}</Text>
  </TouchableOpacity>
);

const StatCard: React.FC<{
  title: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
  gradient: [string, string];
  deltaColor: string;
}> = ({ title, value, delta, icon, gradient, deltaColor }) => (
  <View style={[styles.card, { overflow: "hidden", flex: 1 }]}>
    <LinearGradient
      colors={[gradient[0] + "22", gradient[1] + "15"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.statHeader}>
      <Text style={styles.caption}>{title}</Text>
      {icon}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={[styles.delta, { color: deltaColor }]}>{delta}</Text>
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

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 30 }, // ヘッダーの高さ分だけ上部に余白を調整

  topBar: {
    position: "absolute",
    top: 44, // ダイナミックアイランドを避けるため
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
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFDD",
  },

  userRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, marginTop: 12, zIndex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  userName: { fontSize: 14, fontWeight: "700", color: PALETTE.ink },
  subtle: { fontSize: 12, color: PALETTE.subtle, marginTop: 2 },

  sectionTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 16, marginBottom: 8, zIndex: 1 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: PALETTE.ink },
  sectionSubtitle: { fontSize: 12, color: PALETTE.subtle },

  cardRow: { flexDirection: "row" },
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
  },
  cardLabel: { fontSize: 12, color: PALETTE.subtle, marginBottom: 8 },
  cardImageBox: {
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f6f6f6",
    marginBottom: 8,
  },
  cardImage: { width: "100%", height: "100%" },
  caption: { fontSize: 13, fontWeight: "700", marginBottom: 4, color: PALETTE.ink },
  small: { fontSize: 12, color: PALETTE.subtle, lineHeight: 18 },

  scheduleWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDEDED",
    backgroundColor: "#FFFFFFF2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 1,
  },
  scheduleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  scheduleIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  scheduleTitle: { fontSize: 13, fontWeight: "700", color: PALETTE.ink },
  scheduleTime: { fontSize: 11, color: PALETTE.subtle },
  scheduleSide: { fontSize: 11, color: PALETTE.subtle, textAlign: "right" },
  divider: { height: 1, backgroundColor: "#F0F0F0" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#fff",
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    zIndex: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: PALETTE.ink },

  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 6, color: PALETTE.ink },
  delta: { marginTop: 6, fontSize: 12 },

  // デバッグボタン用のスタイル
  debugButton: {
    backgroundColor: "#9333EA",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#9333EA",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  debugButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  debugNote: {
    fontSize: 11,
    color: PALETTE.subtle,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 16,
  },

  bottomNav: {
    position: "absolute",
    bottom: 34, // ホームバーを避けるため
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

export default HomeScreen;
