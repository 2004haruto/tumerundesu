// NutritionDashboardScreen.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionDashboard'>;

type Tab = "weekly" | "monthly";

type Macro = {
  label: string;
  value: number; // g
  unit: "kcal" | "g";
  key: "calorie" | "protein" | "carb" | "fat";
};

const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

const NutritionDashboardScreen: React.FC<Props> = ({ navigation }) => {
  // タブ
  const [tab, setTab] = useState<Tab>("weekly");

  // ダミーデータ（グラフに使用）
  const weeklyCalories = [1800, 1200, 1500, 1700, 1400, 1900, 1600];

  // 円グラフ用（比率） ※合計100を想定
  const pieData = [
    { label: "タンパク質", percent: 25 },
    { label: "脂質", percent: 20 },
    { label: "炭水化物", percent: 55 },
  ];

  // 日々の平均（カード）
  const dailyAverages: Macro[] = [
    { label: "カロリー", value: 2000, unit: "kcal", key: "calorie" },
    { label: "タンパク質", value: 150, unit: "g", key: "protein" },
    { label: "炭水化物", value: 300, unit: "g", key: "carb" },
    { label: "脂質", value: 70, unit: "g", key: "fat" },
  ];

  // バーチャートの最大値
  const maxCal = useMemo(() => Math.max(...weeklyCalories, 1), [weeklyCalories]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Blob color={PALETTE.blue} size={180} top={-40} left={-40} />
        <Blob color={PALETTE.grape} size={140} top={200} left={width * 0.7} />
        <Blob color={PALETTE.teal} size={120} top={450} left={-30} />
      </View>

      {/* 固定ヘッダー */}
      <LinearGradient
        colors={[PALETTE.blue, PALETTE.grape]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>栄養ダッシュボード</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* タブ（週報 / 月報） */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTab("weekly")}
            style={[styles.tab, tab === "weekly" && styles.tabActive]}
          >
            <MaterialCommunityIcons name="chart-bar" size={22} color={tab === "weekly" ? "#2563eb" : "#6b7280"} />
            <Text style={[styles.tabText, tab === "weekly" && styles.tabTextActive]}>週報</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTab("monthly")}
            style={[styles.tab, tab === "monthly" && styles.tabActive]}
          >
            <MaterialCommunityIcons name="calendar-month" size={22} color={tab === "monthly" ? "#2563eb" : "#6b7280"} />
            <Text style={[styles.tabText, tab === "monthly" && styles.tabTextActive]}>月報</Text>
          </TouchableOpacity>
        </View>

        {/* 週間カロリー摂取量 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>週間カロリー摂取量</Text>
          <Text style={styles.cardSubTitle}>カロリー</Text>

          {/* シンプルなバーチャート */}
          <View style={styles.chartArea}>
            <View style={styles.yAxis}>
              {[1, 0.75, 0.5, 0.25, 0].map((p) => (
                <Text key={p} style={styles.yTick}>
                  {Math.round(maxCal * p)}
                </Text>
              ))}
            </View>

            <View style={styles.barsArea}>
              {/* ガイド線 */}
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.gridLine, { top: `${i * 25}%` }]} />
              ))}

              <View style={styles.barsWrap}>
                {weeklyCalories.map((v, i) => {
                  const hPct = (v / maxCal) * 100;
                  return (
                    <View key={i} style={styles.barItem}>
                      <View style={[styles.bar, { height: `${hPct}%` }]} />
                      <Text style={styles.barLabel}>{WEEK_DAYS[i]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* 栄養のバランス（簡易ドーナツ + 凡例） */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>栄養のバランス</Text>
          <Text style={styles.cardSubTitle}>割合</Text>

          <View style={styles.pieRow}>
            {/* 簡易ドーナツ（擬似） */}
            <View style={styles.donutOuter}>
              <View style={styles.donutInner} />
              {/* セグメントの重ね合わせ（擬似表現） */}
              {/* 実運用では react-native-svg の Pie を推奨 */}
              <View style={[styles.slice, { transform: [{ rotate: "0deg" }], backgroundColor: "#d1d5db" }]} />
              <View style={[styles.slice, { transform: [{ rotate: "120deg" }], backgroundColor: "#9ca3af" }]} />
              <View style={[styles.slice, { transform: [{ rotate: "220deg" }], backgroundColor: "#6b7280" }]} />
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#6b7280" }]} />
                <Text style={styles.legendText}>タンパク質 {pieData[0].percent}%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#9ca3af" }]} />
                <Text style={styles.legendText}>脂質 {pieData[1].percent}%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#d1d5db" }]} />
                <Text style={styles.legendText}>炭水化物 {pieData[2].percent}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 日付でフィルター */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>日付でフィルター</Text>
          <TextInput
            placeholder="日付範囲を選択…（実装例：YYYY-MM-DD〜YYYY-MM-DD）"
            style={styles.input}
          />
          <Text style={styles.helperText}>グラフのスタート日と終了日を選んでください。</Text>
        </View>

        {/* 日々の平均 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>日々の平均</Text>
          <View style={styles.metricsGrid}>
            {dailyAverages.map((m) => (
              <View key={m.key} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue}>
                  {m.value.toLocaleString()}
                  <Text style={styles.metricUnit}>{m.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------- UI Parts ---------- */
const Blob: React.FC<{ color: string; size: number; top: number; left: number }> = ({ color, size, top, left }) => (
  <View
    style={{
      position: "absolute",
      top,
      left,
      width: size,
      height: size * 0.8,
      backgroundColor: color,
      opacity: 0.08,
      borderRadius: size * 0.6,
    }}
  />
);

export default NutritionDashboardScreen;

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
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
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 80, zIndex: 1 },

  tabsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: PALETTE.bg,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  tabActive: {
    backgroundColor: PALETTE.blue + "15",
    borderColor: PALETTE.blue,
  },
  tabText: { fontSize: 12, color: PALETTE.subtle },
  tabTextActive: { color: PALETTE.blue, fontWeight: "700" },

  card: {
    backgroundColor: PALETTE.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: PALETTE.ink },
  cardSubTitle: { fontSize: 12, color: PALETTE.subtle, marginTop: 2 },

  chartArea: {
    marginTop: 8,
    flexDirection: "row",
    height: 160,
  },
  yAxis: {
    width: 48,
    alignItems: "flex-end",
    paddingRight: 6,
    paddingTop: 2,
  },
  yTick: { fontSize: 10, color: PALETTE.subtle, height: "25%" },

  barsArea: { flex: 1, position: "relative" },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: PALETTE.stroke,
  },
  barsWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 8,
  },
  barItem: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    width: 20,
  },
  bar: {
    width: 20,
    backgroundColor: "#9ca3af",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barLabel: { marginTop: 6, fontSize: 10, color: PALETTE.subtle },

  // 円グラフ（擬似ドーナツ）
  pieRow: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 8 },
  donutOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: PALETTE.stroke,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  donutInner: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PALETTE.bg,
    zIndex: 2,
  },
  slice: {
    position: "absolute",
    width: 120,
    height: 60,
    top: 0,
  },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#9ca3af" },
  legendText: { fontSize: 12, color: PALETTE.ink },

  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 13,
    color: PALETTE.ink,
  },
  helperText: { marginTop: 6, fontSize: 11, color: PALETTE.subtle },

  metricsGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  metricLabel: { fontSize: 12, color: PALETTE.subtle, marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: "800", color: PALETTE.ink },
  metricUnit: { fontSize: 12, fontWeight: "600", color: PALETTE.subtle },
});
