import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'ProposalHistory'>;

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

type Status = "proposed" | "rejected";

type Proposal = {
  id: string;
  date: string;
  detail: string;
  status: Status;
};

const MOCK: Proposal[] = [
  { id: "1", date: "2023年10月1日", detail: "詳細情報A", status: "proposed" },
  { id: "2", date: "2023年10月2日", detail: "詳細情報B", status: "proposed" },
  { id: "3", date: "2023年10月3日", detail: "詳細情報C", status: "rejected" },
];

const PERIODS = ["全て", "今月", "先月", "特定の日付"] as const;
type Period = typeof PERIODS[number];

const ProposalHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<Period>("全て");
  const [showProposed, setShowProposed] = useState(true);
  const [showRejected, setShowRejected] = useState(true);

  const filtered = useMemo(() => {
    return MOCK.filter((p) => {
      if (p.status === "proposed" && !showProposed) return false;
      if (p.status === "rejected" && !showRejected) return false;
      if (query.trim() && !p.detail.includes(query) && !p.date.includes(query))
        return false;
      return true;
    });
  }, [query, showProposed, showRejected]);

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
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0B1220" />
          </TouchableOpacity>
        </View>
        <Text style={styles.topBarTitle}>提案履歴</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={18} color="#0B1220" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons name="sort" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 日付フィルター */}
        <SectionTitle title="日付フィルター" accent={PALETTE.grape} />
        <Card style={styles.filterCard}>
          <View style={styles.chipRow}>
            {PERIODS.map((p, idx) => (
              <Chip
                key={p}
                label={p}
                active={period === p}
                onPress={() => setPeriod(p)}
                color={[PALETTE.grape, PALETTE.blue, PALETTE.teal, PALETTE.coral][idx % 4]}
              />
            ))}
          </View>
        </Card>

        {/* 検索 */}
        <SectionTitle title="検索" accent={PALETTE.blue} />
        <Card style={styles.searchCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={PALETTE.subtle} />
            <TextInput
              style={styles.searchInput}
              placeholder="提案内容を検索..."
              placeholderTextColor={PALETTE.subtle}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </Card>

        {/* 提案内容一覧 */}
        <SectionTitle title="提案内容一覧" accent={PALETTE.teal} />
        <Card style={styles.listCard}>
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <View key={item.id}>
                <ProposalItem item={item} />
                {idx !== filtered.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={PALETTE.subtle} />
              <Text style={styles.emptyText}>該当する提案がありません</Text>
            </View>
          )}
        </Card>

        {/* アクションボタン */}
        <SectionTitle title="アクション" accent={PALETTE.coral} />
        <View style={styles.buttonRow}>
          <ActionButton label="追加" icon="add" color={PALETTE.good} variant="solid" />
          <ActionButton label="編集" icon="create" color={PALETTE.blue} variant="outline" />
          <ActionButton label="削除" icon="trash" color={PALETTE.bad} variant="outline" />
        </View>

        {/* 絞り込み */}
        <SectionTitle title="ステータスフィルター" accent={PALETTE.yellow} />
        <Card style={styles.filterCard}>
          <View style={styles.filterRow}>
            <ToggleChip
              active={showProposed}
              label="提案された"
              onPress={() => setShowProposed(!showProposed)}
              icon={<Ionicons name="checkmark-circle" size={16} color={showProposed ? "#fff" : PALETTE.good} />}
              color={PALETTE.good}
            />
            <ToggleChip
              active={showRejected}
              label="却下された"
              onPress={() => setShowRejected(!showRejected)}
              icon={<Ionicons name="close-circle" size={16} color={showRejected ? "#fff" : PALETTE.bad} />}
              color={PALETTE.bad}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- コンポーネント群 --- */

const ProposalItem = ({ item }: { item: Proposal }) => (
  <TouchableOpacity style={styles.proposalItem} activeOpacity={0.7}>
    <View style={[styles.iconBox, { backgroundColor: `${item.status === 'proposed' ? PALETTE.good : PALETTE.bad}15` }]}>
      <MaterialCommunityIcons
        name={item.status === 'proposed' ? "lightbulb-on" : "lightbulb-off"}
        size={20}
        color={item.status === 'proposed' ? PALETTE.good : PALETTE.bad}
      />
    </View>
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle}>{item.detail}</Text>
      <Text style={styles.itemDate}>{item.date}</Text>
      <StatusBadge status={item.status} />
    </View>
    <Ionicons name="chevron-forward" size={16} color={PALETTE.subtle} />
  </TouchableOpacity>
);

const StatusBadge = ({ status }: { status: Status }) => (
  <View
    style={[
      styles.statusBadge,
      { 
        backgroundColor: `${status === "proposed" ? PALETTE.good : PALETTE.bad}15`,
        borderColor: `${status === "proposed" ? PALETTE.good : PALETTE.bad}44`
      }
    ]}
  >
    <Ionicons
      name={status === "proposed" ? "checkmark-circle" : "close-circle"}
      size={12}
      color={status === "proposed" ? PALETTE.good : PALETTE.bad}
    />
    <Text style={[styles.statusText, { color: status === "proposed" ? PALETTE.good : PALETTE.bad }]}>
      {status === "proposed" ? "提案済" : "却下済"}
    </Text>
  </View>
);

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

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void; color: string }> = ({ label, active, onPress, color }) => (
  <TouchableOpacity 
    activeOpacity={0.8} 
    onPress={onPress}
    style={[
      styles.chip, 
      active ? {
        backgroundColor: `${color}22`,
        borderColor: `${color}66`
      } : {
        backgroundColor: "#fff",
        borderColor: PALETTE.stroke
      }
    ]}
  >
    <Text style={[styles.chipText, active && { color, fontWeight: "700" }]}>{label}</Text>
  </TouchableOpacity>
);

const ActionButton: React.FC<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  variant: "solid" | "outline";
}> = ({ label, icon, color, variant }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      variant === "solid" ? { backgroundColor: color } : { backgroundColor: "#fff", borderColor: color }
    ]}
    activeOpacity={0.8}
  >
    <Ionicons name={icon} size={16} color={variant === "solid" ? "#fff" : color} />
    <Text style={[styles.actionBtnText, { color: variant === "solid" ? "#fff" : color }]}>{label}</Text>
  </TouchableOpacity>
);

const ToggleChip = ({
  active,
  label,
  onPress,
  icon,
  color,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  color: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.toggleChip, 
      active ? {
        backgroundColor: color,
        borderColor: color
      } : {
        backgroundColor: "#fff",
        borderColor: PALETTE.stroke
      }
    ]}
    activeOpacity={0.8}
  >
    {icon}
    <Text style={[styles.toggleText, active && { color: "#fff", fontWeight: "700" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* --- スタイル --- */
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
  topBarLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  topBarTitle: { 
    fontSize: 18, 
    fontWeight: "800", 
    color: "#0B1220",
    textAlign: "center",
    flex: 1,
  },
  topBarRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFDD",
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

  filterCard: { padding: 12 },
  searchCard: { padding: 16 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 16, 
    borderWidth: 1,
  },
  chipText: { fontSize: 12, color: PALETTE.ink },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: PALETTE.ink },

  listCard: { padding: 0, overflow: "hidden" },
  proposalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: PALETTE.ink, marginBottom: 4 },
  itemDate: { fontSize: 12, color: PALETTE.subtle, marginBottom: 6 },
  divider: { height: 1, backgroundColor: PALETTE.stroke, marginHorizontal: 16 },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: PALETTE.subtle, fontWeight: "600" },

  statusBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start"
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  buttonRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: "700" },

  filterRow: { flexDirection: "row", gap: 8 },
  toggleChip: { 
    flex: 1,
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    gap: 6, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderWidth: 1, 
    borderRadius: 12 
  },
  toggleText: { fontSize: 12, color: PALETTE.ink },
});

export default ProposalHistoryScreen;
