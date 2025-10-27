// SettingsScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
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
import { AuthError, AuthErrorType } from '../services/api';
import { InputValidator } from '../utils/validation';

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type DietTag = "ベジタリアン" | "グルテンフリー" | "低糖質" | "高たんぱく";

const DIET_TAGS: DietTag[] = ["ベジタリアン", "グルテンフリー", "低糖質", "高たんぱく"];

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { user, updateProfile, updatePassword, refreshProfile } = useAuth();
  
  // 基本情報
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);

  // 食の設定
  const [allergies, setAllergies] = useState<string>("");
  const [dietTags, setDietTags] = useState<DietTag[]>([]);

  // お弁当サイズ設定（4つの手入力フィールド）
  const [bentoCapacity, setBentoCapacity] = useState<string>("");
  const [bentoWidth, setBentoWidth] = useState<string>("");
  const [bentoLength, setBentoLength] = useState<string>("");
  const [bentoHeight, setBentoHeight] = useState<string>("");

  // 通知設定
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [todayScheduleEnabled, setTodayScheduleEnabled] = useState<boolean>(true);
  const [appPushEnabled, setAppPushEnabled] = useState<boolean>(true);

  // UI状態
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  // プロフィール更新時にフォームを更新（無限ループを避けるため、userが変更された時のみ）
  useEffect(() => {
    if (user) {
      setUserName(user.name || "");
      setEmail(user.email || "");
      setAllergies(user.allergies || "");

      // お弁当サイズの読み込み
      setBentoCapacity(user.bento_capacity || "");
      setBentoWidth(user.bento_width || "");
      setBentoLength(user.bento_length || "");
      setBentoHeight(user.bento_height || "");

      // 食事ポリシーの解析（preferencesから）
      if (user.preferences) {
        const tags = user.preferences.split(',').map(tag => tag.trim()) as DietTag[];
        const validTags = tags.filter(tag => DIET_TAGS.includes(tag));
        setDietTags(validTags);
      }
    }
  }, [user]); // userが変更された時のみフォームを更新（APIコールなし）

  // 食事ポリシーのトグル（複数選択可能）
  const toggleDietTag = (tag: DietTag) => {
    setDietTags(prev => {
      const exists = prev.includes(tag);
      if (exists) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  // バリデーションメッセージ
  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    
    if (userName.trim().length === 0) {
      messages.push("ユーザー名を入力してください");
    }
    
    if (email.trim().length === 0) {
      messages.push("メールアドレスを入力してください");
    } else if (!InputValidator.isValidEmail(email)) {
      messages.push("有効なメールアドレスを入力してください");
    }

    // パスワード変更のバリデーション
    if (showPasswordSection) {
      if (currentPassword.length === 0) {
        messages.push("現在のパスワードを入力してください");
      }
      
      if (newPassword.length === 0) {
        messages.push("新しいパスワードを入力してください");
      } else if (newPassword.length < 6) {
        messages.push("新しいパスワードは6文字以上で入力してください");
      }
      
      if (confirmNewPassword.length === 0) {
        messages.push("パスワード確認を入力してください");
      } else if (newPassword !== confirmNewPassword) {
        messages.push("新しいパスワードと確認用パスワードが一致しません");
      }
    }

    return messages;
  }, [userName, email, showPasswordSection, currentPassword, newPassword, confirmNewPassword]);

  const canSave = validationMessages.length === 0;

  // キャンセル処理
  const onCancel = async () => {
    setIsLoadingProfile(true);
    try {
      await refreshProfile();
    } catch (error) {
      console.error('プロフィール再読み込み失敗:', error);
      Alert.alert("エラー", "プロフィールの再読み込みに失敗しました");
    } finally {
      setIsLoadingProfile(false);
    }
    setShowPasswordSection(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  // 保存処理
  const onSave = async () => {
    if (!canSave || isLoading) return;

    setIsLoading(true);

    try {
      // プロフィール更新
      const profileData = {
        name: userName,
        email,
        allergies,
        preferences: dietTags.join(','),
        bento_capacity: bentoCapacity,
        bento_width: bentoWidth,
        bento_length: bentoLength,
        bento_height: bentoHeight,
      };
      await updateProfile(profileData);

      // パスワード変更（必要な場合）
      if (showPasswordSection && currentPassword && newPassword) {
        await updatePassword({
          current_password: currentPassword,
          new_password: newPassword,
        });
      }

      Alert.alert("成功", "設定が保存されました");
      setShowPasswordSection(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error('設定保存失敗:', error);
      
      if (error instanceof AuthError) {
        let errorMessage = "設定の保存に失敗しました";
        
        switch (error.type) {
          case AuthErrorType.VALIDATION_ERROR:
            errorMessage = "入力内容に問題があります";
            break;
          case AuthErrorType.EMAIL_ALREADY_EXISTS:
            errorMessage = "このメールアドレスは既に使用されています";
            break;
          case AuthErrorType.INVALID_PASSWORD:
            errorMessage = "現在のパスワードが間違っています";
            break;
          case AuthErrorType.NETWORK_ERROR:
            errorMessage = "ネットワークエラーが発生しました";
            break;
          case AuthErrorType.UNKNOWN_ERROR:
          default:
            errorMessage = "不明なエラーが発生しました";
            break;
        }
        Alert.alert("エラー", errorMessage);
      } else {
        Alert.alert("エラー", "設定の保存に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 背景ブロブ */}
      <View style={StyleSheet.absoluteFill}>
        <Blob color={PALETTE.coral} size={180} top={-40} left={-40} />
        <Blob color={PALETTE.teal} size={140} top={200} left={width * 0.7} />
        <Blob color={PALETTE.blue} size={120} top={400} left={-30} />
      </View>

      {/* ヘッダー */}
      <LinearGradient
        colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.8)"]}
        style={styles.topBar}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>設定</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* セクション: 基本設定の編集 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>基本設定の編集</Text>

            {/* ユーザー名 & アバター */}
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName ? userName.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>ユーザー名</Text>
                <TextInput
                  style={styles.input}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="お名前を入力"
                />
              </View>
            </View>

            {/* メールアドレス */}
            <View style={styles.field}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="メールアドレスを入力"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* パスワード変更 */}
            <View style={styles.field}>
              {!showPasswordSection ? (
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPasswordSection(true)}
                >
                  <Text style={styles.label}>パスワード変更</Text>
                  <Ionicons name="chevron-forward" size={16} color={PALETTE.subtle} />
                </TouchableOpacity>
              ) : (
                <View style={styles.passwordSection}>
                  <View style={styles.passwordToggle}>
                    <Text style={styles.label}>パスワード変更</Text>
                    <TouchableOpacity onPress={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}>
                      <Ionicons name="close" size={20} color={PALETTE.subtle} />
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="現在のパスワード"
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="新しいパスワード（6文字以上）"
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="新しいパスワード（確認）"
                    secureTextEntry
                  />
                </View>
              )}
            </View>

            {/* アレルギー情報 */}
            <View style={styles.field}>
              <Text style={styles.label}>アレルギー情報</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="アレルギー情報を入力（例: 卵、牛乳、小麦）"
                multiline
              />
            </View>

            {/* 食事ポリシー */}
            <View style={styles.field}>
              <Text style={styles.label}>食事のこだわり</Text>
              <View style={styles.chipsWrap}>
                {DIET_TAGS.map((tag) => {
                  const isSelected = dietTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleDietTag(tag)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* お弁当サイズ設定 */}
            <View style={styles.field}>
              <Text style={styles.label}>お弁当サイズ</Text>
              <Text style={styles.helperText}>お弁当の寸法を入力してください</Text>
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionField}>
                  <Text style={styles.dimensionLabel}>横幅</Text>
                  <TextInput
                    style={styles.dimensionInput}
                    value={bentoWidth}
                    onChangeText={setBentoWidth}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>cm</Text>
                </View>
                <View style={styles.dimensionField}>
                  <Text style={styles.dimensionLabel}>縦</Text>
                  <TextInput
                    style={styles.dimensionInput}
                    value={bentoLength}
                    onChangeText={setBentoLength}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>cm</Text>
                </View>
                <View style={styles.dimensionField}>
                  <Text style={styles.dimensionLabel}>高さ</Text>
                  <TextInput
                    style={styles.dimensionInput}
                    value={bentoHeight}
                    onChangeText={setBentoHeight}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>cm</Text>
                </View>
              </View>
              
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionField}>
                  <Text style={styles.dimensionLabel}>容積</Text>
                  <TextInput
                    style={styles.dimensionInput}
                    value={bentoCapacity}
                    onChangeText={setBentoCapacity}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>ml</Text>
                </View>
                <View style={styles.dimensionField} />
                <View style={styles.dimensionField} />
              </View>
            </View>

            {/* 通知設定 */}
            <Text style={styles.sectionSubTitle}>通知設定</Text>
            
            {/* お弁当リマインダーのサブ設定 */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>朝の準備</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>今日の予定</Text>
              <Switch
                value={todayScheduleEnabled}
                onValueChange={setTodayScheduleEnabled}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>アプリの通知</Text>
              <Switch value={appPushEnabled} onValueChange={setAppPushEnabled} />
            </View>

            {/* バリデーションエラー表示 */}
            {validationMessages.length > 0 && (
              <View style={{ marginTop: 16 }}>
                {validationMessages.map((message, index) => (
                  <Text key={index} style={{ color: PALETTE.bad, fontSize: 12, marginBottom: 4 }}>
                    • {message}
                  </Text>
                ))}
              </View>
            )}

            {/* アクションボタン */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.btnGhost} 
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.btnGhostText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!canSave || isLoading) && styles.btnDisabled]}
                onPress={onSave}
                disabled={!canSave || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ローディング画面 */}
      {isLoadingProfile && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={PALETTE.grape} />
          <Text style={styles.loadingText}>プロフィール読み込み中...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

/* ---------- UI Parts ---------- */
const Blob: React.FC<{ color: string; size: number; top: number; left: number }> = ({ color, size, top, left }) => (
  <View
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      top,
      left,
      opacity: 0.1,
    }}
  />
);

/* ---------- Styles ---------- */
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
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 80 },
  card: {
    backgroundColor: PALETTE.bg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16, color: PALETTE.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PALETTE.blue + "20",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    color: PALETTE.blue,
    fontSize: 20,
    fontWeight: "700",
  },
  field: { marginBottom: 12 },
  label: { fontSize: 12, color: PALETTE.subtle, marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: PALETTE.ink,
    backgroundColor: "#fff",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chipSelected: {
    borderColor: PALETTE.grape,
    backgroundColor: PALETTE.grape + "15",
  },
  chipText: { fontSize: 13, color: PALETTE.ink, fontWeight: "600" },
  chipTextSelected: { color: PALETTE.grape, fontWeight: "700" },
  helperText: { marginTop: 6, fontSize: 12, color: PALETTE.subtle },
  sectionSubTitle: { fontSize: 14, fontWeight: "700", color: PALETTE.ink, marginBottom: 8 },
  switchRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.stroke,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: 14, color: PALETTE.ink, fontWeight: "600" },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  btnGhostText: { color: PALETTE.ink, fontWeight: "700" },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: PALETTE.grape,
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  passwordToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  passwordSection: {
    marginTop: 12,
    gap: 12,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: PALETTE.subtle,
    fontWeight: "600",
  },
  // 詳細サイズ設定用スタイル
  dimensionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  dimensionField: {
    flex: 1,
  },
  dimensionLabel: {
    fontSize: 12,
    color: PALETTE.subtle,
    fontWeight: "600",
    marginBottom: 4,
  },
  dimensionInput: {
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: PALETTE.ink,
    backgroundColor: "#fff",
    textAlign: "center",
  },
});

export default SettingsScreen;