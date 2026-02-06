// NutritionDashboardScreen.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BarChart,
  PieChart,
} from "react-native-chart-kit";
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { DashboardData, NutritionService } from '../services/nutritionService';

const { width } = Dimensions.get("window");

// チャート設定
const chartConfiguration = {
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(107, 183, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: "#6FB7FF"
  },
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: "#ECECEC",
    strokeDasharray: "0",
  },
  propsForVerticalLabels: {
    fontSize: 10,
  },
  propsForHorizontalLabels: {
    fontSize: 10,
  },
};

type Props = NativeStackScreenProps<RootStackParamList, 'NutritionDashboard'>;

type Tab = "weekly" | "monthly";

type Macro = {
  label: string;
  value: number;
  unit: "kcal" | "g" | "mg";
  key: "calorie" | "protein" | "carb" | "fat" | "vitamins" | "minerals";
};

const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

const NutritionDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("weekly");
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [hasNoData, setHasNoData] = useState(false);
  
  // カスタム日付フィルター
  const [customDateEnabled, setCustomDateEnabled] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // 実データ取得
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        console.warn('⚠️ User not found, using fallback data');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasNoData(false);
        
        // カスタム日付が有効で、両方の日付が設定されている場合
        if (customDateEnabled && startDate && endDate) {
          const startStr = startDate.toISOString().split('T')[0];
          const endStr = endDate.toISOString().split('T')[0];
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          console.log(`📊 Fetching custom period: ${startStr} ~ ${endStr} (${daysDiff} days)`);
          // カスタム期間の場合は'custom'を渡す
          const data = await NutritionService.getDashboardData(user.id, 'custom', startStr, endStr);
          setDashboardData(data);
          
          // データがない場合のチェック
          const totalCalories = data.caloriesData.reduce((sum, val) => sum + val, 0);
          if (totalCalories === 0 && data.dailyAverages.calories === 0) {
            setHasNoData(true);
          }
          
          console.log('📊 Dashboard data loaded (custom period):', {
            caloriesDataLength: data.caloriesData.length,
            caloriesData: data.caloriesData,
            nutritionBalance: data.nutritionBalance,
            dailyAverages: data.dailyAverages,
            hasNoData: totalCalories === 0 && data.dailyAverages.calories === 0
          });
        } else {
          const data = await NutritionService.getDashboardData(user.id, tab);
          setDashboardData(data);
          
          // データがない場合のチェック
          const totalCalories = data.caloriesData.reduce((sum, val) => sum + val, 0);
          if (totalCalories === 0 && data.dailyAverages.calories === 0) {
            setHasNoData(true);
          }
          
          console.log('📊 Dashboard data loaded:', data);
        }
      } catch (error) {
        console.error('❌ Failed to load dashboard data:', error);
        Alert.alert('データ取得エラー', 'データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, tab, customDateEnabled, startDate, endDate]);

  // プリセット期間選択
  const selectPresetPeriod = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setStartDate(start);
    setEndDate(end);
    setCustomDateEnabled(true);
  };

  // フィルターをリセット
  const resetFilter = () => {
    setCustomDateEnabled(false);
    setStartDate(null);
    setEndDate(null);
  };

  // バーチャート用データ（実データまたはフォールバック）
  const getChartLabels = () => {
    const data = dashboardData?.caloriesData || [];
    const dataLength = data.length;
    
    // カスタム期間の場合
    if (customDateEnabled && startDate && endDate) {
      // データがない場合も期間に基づいてラベルを生成
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const actualLength = dataLength > 0 ? dataLength : daysDiff;
      
      if (actualLength <= 7) {
        // 7日以内なら各日表示
        return Array.from({ length: actualLength }, (_, i) => {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
      } else if (actualLength <= 14) {
        // 14日以内なら2日ごと
        return Array.from({ length: Math.ceil(actualLength / 2) }, (_, i) => {
          const start = i * 2 + 1;
          const end = Math.min(start + 1, actualLength);
          return `${start}-${end}日`;
        });
      } else {
        // それ以上なら週ごと
        const numWeeks = Math.ceil(actualLength / 7);
        return Array.from({ length: numWeeks }, (_, i) => `第${i + 1}週`);
      }
    }
    
    // 標準期間
    if (tab === 'monthly') {
      if (dataLength >= 28) {
        const lastWeekEnd = dataLength;
        return ['1-7', '8-14', '15-21', `22-${lastWeekEnd}`];
      }
    }
    return WEEK_DAYS;
  };

  const getChartData = () => {
    const data = dashboardData?.caloriesData || [1800, 1200, 1500, 1700, 1400, 1900, 1600];
    const dataLength = data.length;
    
    // カスタム期間の場合
    if (customDateEnabled && startDate && endDate) {
      // データがない場合は0で埋める
      if (dataLength === 0) {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Array(Math.min(daysDiff, 7)).fill(0);
      }
      
      if (dataLength <= 7) {
        return data; // そのまま表示
      } else if (dataLength <= 14) {
        // 2日ごとの平均
        return Array.from({ length: Math.ceil(dataLength / 2) }, (_, i) => {
          const slice = data.slice(i * 2, (i + 1) * 2);
          return Math.round(slice.reduce((sum, val) => sum + val, 0) / slice.length);
        });
      } else {
        // 週ごとの平均
        const numWeeks = Math.ceil(dataLength / 7);
        return Array.from({ length: numWeeks }, (_, i) => {
          const slice = data.slice(i * 7, (i + 1) * 7);
          return Math.round(slice.reduce((sum, val) => sum + val, 0) / slice.length);
        });
      }
    }
    
    // 標準期間
    if (tab === 'monthly' && data.length >= 28) {
      const week1 = data.slice(0, 7);
      const week2 = data.slice(7, 14);
      const week3 = data.slice(14, 21);
      const week4 = data.slice(21);
      
      return [
        Math.round(week1.reduce((sum, val) => sum + val, 0) / week1.length),
        Math.round(week2.reduce((sum, val) => sum + val, 0) / week2.length),
        Math.round(week3.reduce((sum, val) => sum + val, 0) / week3.length),
        Math.round(week4.reduce((sum, val) => sum + val, 0) / week4.length),
      ];
    }
    return data;
  };

  const caloriesChartData = {
    labels: (() => {
      const labels = getChartLabels();
      // react-native-chart-kitは最低2つのデータポイントが必要
      if (labels.length === 1) {
        return [...labels, ''];
      }
      return labels;
    })(),
    datasets: [{
      data: (() => {
        const chartData = getChartData();
        // データが少ない場合は最小値を追加してグラフが正しく表示されるようにする
        // react-native-chart-kitは最低2つのデータポイントが必要
        if (chartData.length === 1) {
          return [...chartData, 0];
        }
        return chartData;
      })(),
    }],
  };

  // 円グラフ用データ（react-native-chart-kit用） - 五大栄養素
  const nutritionPieData = [
    {
      name: "タンパク質",
      population: dashboardData ? dashboardData.nutritionBalance.protein : 20,
      color: "#6FB7FF",
      legendFontColor: "#374151",
      legendFontSize: 11,
    },
    {
      name: "脂質",
      population: dashboardData ? dashboardData.nutritionBalance.fat : 20,
      color: "#B89CFF",
      legendFontColor: "#374151",
      legendFontSize: 11,
    },
    {
      name: "炭水化物",
      population: dashboardData ? dashboardData.nutritionBalance.carbs : 50,
      color: "#44D1C9",
      legendFontColor: "#374151",
      legendFontSize: 11,
    },
    {
      name: "ビタミン",
      population: dashboardData ? dashboardData.nutritionBalance.vitamins : 5,
      color: "#FFD54A",
      legendFontColor: "#374151",
      legendFontSize: 11,
    },
    {
      name: "ミネラル",
      population: dashboardData ? dashboardData.nutritionBalance.minerals : 5,
      color: "#FF7A6E",
      legendFontColor: "#374151",
      legendFontSize: 11,
    },
  ];

  // 日々の平均（実データまたはフォールバック） - 五大栄養素
  const dailyAverages: Macro[] = [
    { 
      label: "カロリー", 
      value: dashboardData ? dashboardData.dailyAverages.calories : 2000, 
      unit: "kcal", 
      key: "calorie" 
    },
    { 
      label: "タンパク質", 
      value: dashboardData ? dashboardData.dailyAverages.protein : 150, 
      unit: "g", 
      key: "protein" 
    },
    { 
      label: "炭水化物", 
      value: dashboardData ? dashboardData.dailyAverages.carbs : 300, 
      unit: "g", 
      key: "carb" 
    },
    { 
      label: "脂質", 
      value: dashboardData ? dashboardData.dailyAverages.fat : 70, 
      unit: "g", 
      key: "fat" 
    },
    { 
      label: "ビタミン", 
      value: dashboardData ? dashboardData.dailyAverages.vitamins : 20, 
      unit: "mg", 
      key: "vitamins" 
    },
    { 
      label: "ミネラル", 
      value: dashboardData ? dashboardData.dailyAverages.minerals : 250, 
      unit: "mg", 
      key: "minerals" 
    },
  ];

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
        {isLoading ? (
          // ローディング状態
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PALETTE.blue} />
            <Text style={styles.loadingText}>栄養データを読み込み中...</Text>
          </View>
        ) : (
          <>
            {/* タブ（週報 / 月報） */}
            <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setTab("weekly");
              if (!customDateEnabled) {
                // カスタム期間が無効な場合のみタブが有効
              }
            }}
            style={[styles.tab, tab === "weekly" && !customDateEnabled && styles.tabActive, customDateEnabled && styles.tabDisabled]}
          >
            <MaterialCommunityIcons name="chart-bar" size={22} color={tab === "weekly" && !customDateEnabled ? "#2563eb" : "#6b7280"} />
            <Text style={[styles.tabText, tab === "weekly" && !customDateEnabled && styles.tabTextActive]}>週報</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setTab("monthly");
              if (!customDateEnabled) {
                // カスタム期間が無効な場合のみタブが有効
              }
            }}
            style={[styles.tab, tab === "monthly" && !customDateEnabled && styles.tabActive, customDateEnabled && styles.tabDisabled]}
          >
            <MaterialCommunityIcons name="calendar-month" size={22} color={tab === "monthly" && !customDateEnabled ? "#2563eb" : "#6b7280"} />
            <Text style={[styles.tabText, tab === "monthly" && !customDateEnabled && styles.tabTextActive]}>月報</Text>
          </TouchableOpacity>
        </View>

        {/* 日付でフィルター */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>日付でフィルター</Text>
          
          {/* プリセット期間ボタン */}
          <View style={styles.presetRow}>
            <TouchableOpacity 
              style={styles.presetBtn}
              onPress={() => selectPresetPeriod(7)}
            >
              <Text style={styles.presetBtnText}>過去7日</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetBtn}
              onPress={() => selectPresetPeriod(14)}
            >
              <Text style={styles.presetBtnText}>過去14日</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetBtn}
              onPress={() => selectPresetPeriod(30)}
            >
              <Text style={styles.presetBtnText}>過去30日</Text>
            </TouchableOpacity>
          </View>

          {/* カスタム日付選択 */}
          <View style={styles.datePickerSection}>
            <Text style={styles.dateLabel}>カスタム期間:</Text>
            
            <View style={styles.dateRow}>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={16} color={PALETTE.blue} />
                <Text style={[styles.dateButtonText, !startDate && styles.dateButtonPlaceholder]}>
                  {startDate ? startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : '開始日を選択'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.dateSeparator}>〜</Text>
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={16} color={PALETTE.blue} />
                <Text style={[styles.dateButtonText, !endDate && styles.dateButtonPlaceholder]}>
                  {endDate ? endDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : '終了日を選択'}
                </Text>
              </TouchableOpacity>
            </View>

            {(customDateEnabled || startDate || endDate) && (
              <TouchableOpacity 
                style={styles.resetBtn}
                onPress={resetFilter}
              >
                <Text style={styles.resetBtnText}>フィルターをリセット</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* DateTimePicker (iOS/Android) */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="ja-JP"
              onChange={(event, date) => {
                setShowStartPicker(false);
                if (date) {
                  setStartDate(date);
                  setCustomDateEnabled(true);
                }
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="ja-JP"
              onChange={(event, date) => {
                setShowEndPicker(false);
                if (date) {
                  setEndDate(date);
                  setCustomDateEnabled(true);
                }
              }}
            />
          )}
          
          <Text style={styles.helperText}>プリセットを選ぶか、カスタム期間を設定できます。</Text>
        </View>

        {/* データなしメッセージ */}
        {hasNoData && (
          <View style={styles.noDataCard}>
            <MaterialCommunityIcons name="food-off" size={48} color={PALETTE.subtle} />
            <Text style={styles.noDataTitle}>データが見つかりません</Text>
            <Text style={styles.noDataText}>
              選択した期間の栄養データが記録されていません。
            </Text>
            <Text style={styles.noDataHint}>
              お弁当を記録すると、ここに栄養データが表示されます。
            </Text>
          </View>
        )}

        {/* カロリー摂取量 */}
        {!hasNoData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {customDateEnabled && startDate && endDate 
                ? 'カスタム期間のカロリー摂取量'
                : tab === 'weekly' ? '週間カロリー摂取量' : '月間カロリー摂取量'}
            </Text>
            <Text style={styles.cardSubTitle}>カロリー</Text>

            {/* 美しいバーチャート */}
            <View style={styles.chartArea}>
              <BarChart
                data={caloriesChartData}
                width={width - 64}
                height={180}
                yAxisLabel=""
                yAxisSuffix=" kcal"
                chartConfig={chartConfiguration}
                verticalLabelRotation={0}
                showValuesOnTopOfBars={true}
                withInnerLines={true}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            </View>
          </View>
        )}

        {/* 栄養のバランス（美しい円グラフ） */}
        {!hasNoData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>栄養のバランス</Text>
            <Text style={styles.cardSubTitle}>割合</Text>

            <View style={styles.pieChartContainer}>
              <PieChart
                data={nutritionPieData}
                width={width - 64}
                height={200}
                chartConfig={chartConfiguration}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute={false} // 割合で表示
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            </View>
          </View>
        )}

        {/* 日々の平均 */}
        {!hasNoData && (
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
        )}
          </>
        )}
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
  tabDisabled: {
    opacity: 0.4,
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
    alignItems: "center",
  },
  pieChartContainer: {
    marginTop: 8,
    alignItems: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: PALETTE.subtle,
    textAlign: "center",
  },

  noDataCard: {
    backgroundColor: PALETTE.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    padding: 32,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: PALETTE.subtle,
    textAlign: "center",
    lineHeight: 20,
  },
  noDataHint: {
    fontSize: 12,
    color: PALETTE.blue,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },

  helperText: { marginTop: 12, fontSize: 11, color: PALETTE.subtle },

  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: PALETTE.blue + "15",
    borderWidth: 1,
    borderColor: PALETTE.blue,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.blue,
  },

  datePickerSection: {
    marginTop: 16,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: PALETTE.ink,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 13,
    color: PALETTE.ink,
    fontWeight: "500",
  },
  dateButtonPlaceholder: {
    color: PALETTE.subtle,
    fontWeight: "400",
  },
  dateSeparator: {
    fontSize: 14,
    color: PALETTE.subtle,
    fontWeight: "600",
  },
  resetBtn: {
    marginTop: 10,
    backgroundColor: PALETTE.coral + "15",
    borderWidth: 1,
    borderColor: PALETTE.coral,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.coral,
  },

  metricsGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "31%",
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricLabel: { fontSize: 12, color: PALETTE.subtle, marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: "800", color: PALETTE.ink },
  metricUnit: { fontSize: 12, fontWeight: "600", color: PALETTE.subtle },
});
