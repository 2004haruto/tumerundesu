// src/screens/MenuReviewScreen.tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'MenuReview'>;
type Satisfaction = "満足" | "不満" | "普通" | null;

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

const MenuReviewScreen: React.FC<Props> = ({ navigation }) => {
  const [satisfaction, setSatisfaction] = useState<Satisfaction>(null);
  const [comment, setComment] = useState("");
  const maxLen = 250;

  const canSubmit = useMemo(
    () => !!satisfaction && comment.length <= maxLen,
    [satisfaction, comment]
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    // ★ここで実際の送信処理（API など）を実装
    Alert.alert("送信しました", `評価: ${satisfaction}\nコメント: ${comment}`);
    setSatisfaction(null);
    setComment("");
  };

  const handleCancel = () => {
    setSatisfaction(null);
    setComment("");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <BlobBackground color={PALETTE.coral} size={200} top={-50} left={-50} rotate={15} />
        <BlobBackground color={PALETTE.teal} size={150} top={120} left={width * 0.65} rotate={-10} />
        <BlobBackground color={PALETTE.yellow} size={180} top={350} left={-60} rotate={8} />
        <BlobBackground color={PALETTE.grape} size={140} top={580} left={width * 0.7} rotate={-20} />
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
        <Text style={styles.topBarTitle}>メニュー評価</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="star-outline" size={18} color="#0B1220" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons name="emoticon-happy-outline" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* セクション：満足度 */}
          <SectionTitle title="満足度評価" accent={PALETTE.coral} />
          <Card style={styles.reviewCard}>
            <Text style={styles.cardLabel}>満足度を選択してください</Text>

            <View style={styles.segmentRow}>
              {(["満足", "不満", "普通"] as const).map((v) => {
                const active = satisfaction === v;
                const colors = {
                  満足: PALETTE.good,
                  不満: PALETTE.bad,
                  普通: PALETTE.yellow,
                };
                return (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setSatisfaction(v)}
                    style={[
                      styles.segment,
                      active && { backgroundColor: colors[v], borderColor: colors[v] }
                    ]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.helper}>ボタンを選択してください</Text>
          </Card>

          {/* セクション：コメント */}
          <SectionTitle title="コメント入力" accent={PALETTE.teal} />
          <Card style={styles.commentCard}>
            <Text style={styles.cardLabel}>ご意見をお聞かせください</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="料理の味、見た目、分量などについてお聞かせください…"
              multiline
              maxLength={maxLen}
              style={styles.input}
              placeholderTextColor={PALETTE.subtle}
            />
            <Text style={styles.counter}>最大{maxLen}文字（{comment.length}/{maxLen}）</Text>
          </Card>

          {/* アクションボタン */}
          <SectionTitle title="アクション" accent={PALETTE.grape} />
          <Card style={styles.actionsCard}>
            <Button variant="outline" label="キャンセル" onPress={handleCancel} accent={PALETTE.subtle} />
            <Button
              variant="solid"
              label="評価を送信"
              onPress={handleSubmit}
              accent={PALETTE.grape}
              disabled={!canSubmit}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavItem name="home-variant" label="ホーム" color={PALETTE.coral} onPress={() => navigation.navigate('Home')} />
        <NavItem name="food-fork-drink" label="お弁当" color={PALETTE.teal} onPress={() => navigation.navigate('BentoMenu')} />
        <NavItem name="star" label="レビュー" active color={PALETTE.yellow} onPress={() => {}} />
        <NavItem name="cog" label="設定" color={PALETTE.grape} onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
};

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

  reviewCard: { padding: 16 },
  commentCard: { padding: 16 },
  actionsCard: { padding: 16 },
  
  cardLabel: { fontSize: 14, fontWeight: "700", marginBottom: 12, color: PALETTE.ink },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 14, color: PALETTE.ink, fontWeight: "600" },
  segmentTextActive: { color: "#fff", fontWeight: "700" },
  helper: { fontSize: 12, color: PALETTE.subtle },

  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: "top",
    color: PALETTE.ink,
    lineHeight: 20,
  },
  counter: { 
    marginTop: 8, 
    fontSize: 12, 
    color: PALETTE.subtle,
    textAlign: "right"
  },

  button: {
    height: 48,
    borderRadius: 12,
    marginVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "700" },

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

export default MenuReviewScreen;
