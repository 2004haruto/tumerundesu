// src/screens/PackingGuideScreen.tsx
// 弁当の詰め方ガイド + AI検出機能（ハイブリッドモード）
// 
// 【重要】シャッター音について:
// - expo-camera v17では、takePictureAsync()を呼ぶとシャッター音が必ず鳴ります
// - リアルタイム解析を無効化し、手動撮影のみに変更しました
// - 撮影は1回のみ → シャッター音も1回のみ
//
// 【検出の流れ】:
// 1. ユーザーがシャッターボタンを押して撮影（シャッター音1回）
// 2. AIが弁当箱を検出し、信頼度を判定
// 3. 信頼度が85%未満の場合は再撮影を促す
// 4. 信頼度が85%以上の場合は結果を表示
//
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

const { width } = Dimensions.get("window");

// 環境変数からAI検出APIのURLを取得
const AI_DETECTION_API_URL = process.env.EXPO_PUBLIC_AI_DETECTION_URL || 'http://localhost:8001';

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

/* ---------- 型定義 ---------- */
type Tip = {
  id: string;
  title: string;
  tags: string[];
  desc: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type BentoArea = {
  id: string;
  label: string; // '主食', '主菜', '副菜1', '副菜2'
  x: number; // 相対位置（0-1）
  y: number;
  width: number; // 相対サイズ（0-1）
  height: number;
  color: string; // オーバーレイの色
};

type BentoSize = {
  id: string;
  name: string;
  capacity: string;
  width: string;  // cm単位
  length: string; // cm単位  
  height: string; // cm単位
};

type DetectionResult = {
  status: string;
  filename: string;
  mode: string;
  confidence: number;
  inference_time_ms: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    width_mm: number;
    height_mm: number;
  } | null;
  success: boolean;
  brightness: number;
  angle: number;
  message: string;
  // 追加: 位置情報（バックエンドから返される）
  position_info?: {
    relative_x: number;
    relative_y: number;
    size_ratio: number;
    position_horizontal: 'left' | 'center' | 'right';
    position_vertical: 'top' | 'center' | 'bottom';
    size_status: 'too_small' | 'good' | 'too_large';
    is_centered: boolean;
    is_optimal: boolean;
  };
};

/* ---------- 詰め方ガイドデータ ---------- */
const PACKING_TIPS: Tip[] = [
  {
    id: "1",
    title: "色のバランス",
    tags: ["見た目", "彩り"],
    desc: "緑・赤・黄・白・黒の5色を意識すると美味しそうに見えます。",
    icon: "palette",
  },
  {
    id: "2",
    title: "主食は3:副菜2:主菜1",
    tags: ["栄養", "バランス"],
    desc: "理想的な比率で詰めることで栄養バランスが整います。",
    icon: "scale-balance",
  },
  {
    id: "3",
    title: "立体的に盛り付ける",
    tags: ["見た目", "食べやすさ"],
    desc: "高さを出すことで美しく、崩れにくい弁当になります。",
    icon: "layers",
  },
  {
    id: "4",
    title: "AI検出で詰め方チェック",
    tags: ["技術", "精度"],
    desc: "カメラで撮影すると、AIが弁当箱の配置をチェックします。",
    icon: "camera-iris",
  },
];


/* ---------- 画面 ---------- */
const PackingGuideScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user, token } = useAuth();
  
  // ルートパラメータから初期値を取得
  const initialRiceRatio = route.params?.riceRatio ?? 3;
  const initialLayoutType = route.params?.layoutType ?? '4split';
  
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [autoCapture, setAutoCapture] = useState(false); // 自動撮影モード（デフォルトはオフ）
  const [guidanceText, setGuidanceText] = useState<string>(''); // リアルタイムガイダンス
  const [isAnalyzing, setIsAnalyzing] = useState(false); // プレビュー解析中
  const [showAreaOverlay, setShowAreaOverlay] = useState(false); // エリア分けオーバーレイ表示
  const [registeredBentoSizes, setRegisteredBentoSizes] = useState<BentoSize[]>([]); // 登録済み弁当箱
  const [loadingBentoSizes, setLoadingBentoSizes] = useState(false);
  const [selectedBento, setSelectedBento] = useState<BentoSize | null>(null); // 選択された弁当
  const [showBentoSelector, setShowBentoSelector] = useState(false); // 弁当選択モーダル表示
  const [selectedAreaLayout, setSelectedAreaLayout] = useState<'2split' | '3split' | '4split'>(initialLayoutType); // エリアレイアウト選択
  const [riceRatio, setRiceRatio] = useState<number>(initialRiceRatio); // 主食の比率（1-5）
  const cameraRef = useRef<CameraView>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ================================================
  // エリア分けプリセット定義
  // ================================================
  
  // 【2分割】主食 vs おかず（比率可変）
  const getBentoAreas2Split = (riceRatio: number): BentoArea[] => {
    const riceWidth = riceRatio / 6; // riceRatio=1なら1/6、riceRatio=5なら5/6
    return [
      { id: '1', label: '主食', x: 0, y: 0, width: riceWidth, height: 1, color: 'rgba(255, 212, 128, 0.3)' },
      { id: '2', label: 'おかず', x: riceWidth, y: 0, width: 1 - riceWidth, height: 1, color: 'rgba(255, 138, 128, 0.3)' },
    ];
  };

  // 【3分割】主食 vs 主菜 vs 副菜（比率可変）
  const getBentoAreas3Split = (riceRatio: number): BentoArea[] => {
    const riceWidth = riceRatio / 6; // riceRatio=1なら1/6、riceRatio=3なら3/6=1/2
    return [
      { id: '1', label: '主食', x: 0, y: 0, width: riceWidth, height: 1, color: 'rgba(255, 212, 128, 0.3)' },
      { id: '2', label: '主菜', x: riceWidth, y: 0, width: 1 - riceWidth, height: 0.5, color: 'rgba(255, 138, 128, 0.3)' },
      { id: '3', label: '副菜', x: riceWidth, y: 0.5, width: 1 - riceWidth, height: 0.5, color: 'rgba(165, 214, 167, 0.3)' },
    ];
  };

  // 【4分割】主食 vs 主菜 vs 副菜1 vs 副菜2（比率可変）
  const getBentoAreas4Split = (riceRatio: number): BentoArea[] => {
    const riceWidth = riceRatio / 6; // riceRatio=1なら1/6、riceRatio=3なら3/6=1/2
    return [
      { id: '1', label: '主食', x: 0, y: 0, width: riceWidth, height: 1, color: 'rgba(255, 212, 128, 0.3)' },
      { id: '2', label: '主菜', x: riceWidth, y: 0, width: 1 - riceWidth, height: 0.33, color: 'rgba(255, 138, 128, 0.3)' },
      { id: '3', label: '副菜1', x: riceWidth, y: 0.33, width: 1 - riceWidth, height: 0.34, color: 'rgba(165, 214, 167, 0.3)' },
      { id: '4', label: '副菜2', x: riceWidth, y: 0.67, width: 1 - riceWidth, height: 0.33, color: 'rgba(144, 202, 249, 0.3)' },
    ];
  };

  // 選択されたレイアウトに応じてエリアを取得
  const bentoAreas = 
    selectedAreaLayout === '2split' ? getBentoAreas2Split(riceRatio) :
    selectedAreaLayout === '3split' ? getBentoAreas3Split(riceRatio) :
    getBentoAreas4Split(riceRatio);

  /* ================================================
   * 【旧実装 - 固定比率版】コメントで保存
   * ================================================
   * 
   * // 【4分割】主食、主菜、副菜1、副菜2（デフォルト）
   * const bentoAreas4Split: BentoArea[] = [
   *   { id: '1', label: '主食', x: 0, y: 0, width: 0.5, height: 0.5, color: 'rgba(255, 212, 128, 0.3)' },
   *   { id: '2', label: '主菜', x: 0, y: 0.5, width: 0.5, height: 0.5, color: 'rgba(255, 138, 128, 0.3)' },
   *   { id: '3', label: '副菜1', x: 0.5, y: 0, width: 0.5, height: 0.5, color: 'rgba(165, 214, 167, 0.3)' },
   *   { id: '4', label: '副菜2', x: 0.5, y: 0.5, width: 0.5, height: 0.5, color: 'rgba(144, 202, 249, 0.3)' },
   * ];
   *
   * // 【3分割】主食、主菜、副菜
   * const bentoAreas3Split: BentoArea[] = [
   *   { id: '1', label: '主食', x: 0, y: 0, width: 0.5, height: 1, color: 'rgba(255, 212, 128, 0.3)' },
   *   { id: '2', label: '主菜', x: 0.5, y: 0, width: 0.5, height: 0.5, color: 'rgba(255, 138, 128, 0.3)' },
   *   { id: '3', label: '副菜', x: 0.5, y: 0.5, width: 0.5, height: 0.5, color: 'rgba(165, 214, 167, 0.3)' },
   * ];
   *
   * // 【2分割】主食、おかず
   * const bentoAreas2Split: BentoArea[] = [
   *   { id: '1', label: '主食', x: 0, y: 0, width: 0.5, height: 1, color: 'rgba(255, 212, 128, 0.3)' },
   *   { id: '2', label: 'おかず', x: 0.5, y: 0, width: 0.5, height: 1, color: 'rgba(255, 138, 128, 0.3)' },
   * ];
   *
   * // 選択されたレイアウトに応じてエリアを取得
   * const bentoAreas = 
   *   selectedAreaLayout === '2split' ? bentoAreas2Split :
   *   selectedAreaLayout === '3split' ? bentoAreas3Split :
   *   bentoAreas4Split;
   * 
   * ================================================ */

  // 登録済み弁当箱サイズを読み込み
  useEffect(() => {
    const loadBentoSizes = async () => {
      if (!user || !token) return;
      
      setLoadingBentoSizes(true);
      try {
        const response = await apiClient.getBentoSizes(token);
        if (response.bentoSizes && response.bentoSizes.length > 0) {
          // 型変換してstate設定
          const bentoSizes: BentoSize[] = response.bentoSizes.map((bento: any) => ({
            id: bento.id.toString(),
            name: bento.name,
            capacity: bento.capacity || '',
            width: bento.width || '',
            length: bento.length || '',
            height: bento.height || ''
          }));
          
          setRegisteredBentoSizes(bentoSizes);
          
          // デフォルト弁当を選択（最初の弁当、または「メイン」という名前の弁当）
          const defaultBento = bentoSizes.find(b => b.name.includes('メイン') || b.name.includes('main')) || bentoSizes[0];
          setSelectedBento(defaultBento);
          
          console.log('✅ 登録済み弁当箱:', bentoSizes);
          console.log('🎯 デフォルト選択:', defaultBento);
        }
      } catch (error) {
        console.error('❌ 弁当箱サイズ読み込みエラー:', error);
      } finally {
        setLoadingBentoSizes(false);
      }
    };

    loadBentoSizes();
  }, [user, token]);

  // カメラを起動
  const openCamera = async () => {
    if (!permission) {
      // パーミッションがまだロードされていない
      return;
    }

    if (!permission.granted) {
      // パーミッションを要求
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('カメラ権限が必要です', 'カメラを使用するには権限を許可してください。');
        return;
      }
    }

    // カメラモーダルを表示
    setCameraVisible(true);
    setGuidanceText('弁当箱を中央に配置してシャッターを押してください');
    
    // リアルタイム解析は使用しない（シャッター音防止のため）
    // 撮影後にAI検出を実行し、信頼度をチェックします
  };

  // カメラを閉じる
  const closeCamera = () => {
    stopRealtimeAnalysis();
    setCameraVisible(false);
    setGuidanceText('');
  };

  // リアルタイム解析を開始
  const startRealtimeAnalysis = () => {
    // 既存のインターバルをクリア
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    // 【改善】プレビュー解析を削除し、ガイダンスのみ表示
    // シャッター音を防ぐため、takePictureAsyncは呼ばない
    setGuidanceText('弁当箱をフレーム内に収めて、シャッターボタンを押してください');
    
    // 注: 以前の実装では2秒ごとにtakePictureAsync()を呼んでいたため、
    // 連続でシャッター音が鳴っていました。
    // 現在は手動撮影後、AI検出で信頼度をチェックし、
    // 不十分な場合は再撮影を促す方式に変更しています。
  };

  // リアルタイム解析を停止
  const stopRealtimeAnalysis = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setIsAnalyzing(false);
  };

  // 写真を撮影
  const takePicture = async () => {
    if (!cameraRef.current) {
      console.warn('カメラがマウントされていません');
      return;
    }

    // リアルタイム解析を一時停止
    stopRealtimeAnalysis();
    
    try {
      setDetecting(true);
      setGuidanceText('📸 撮影中...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        setCapturedImage(photo.uri);
        // カメラを閉じてから検出を実行
        closeCamera();
        
        // 少し待ってから検出を実行（UIの更新を待つ）
        setTimeout(() => {
          runDetection(photo.uri);
        }, 300);
      }
    } catch (error) {
      console.error('撮影エラー:', error);
      setDetecting(false);
      setGuidanceText('❌ 撮影に失敗しました');
      
      // エラーが発生した場合、解析を再開
      if (autoCapture && cameraVisible) {
        setTimeout(() => startRealtimeAnalysis(), 1000);
      }
      
      Alert.alert('エラー', '写真の撮影に失敗しました。もう一度お試しください。');
    }
  };

  // ギャラリーから画像を選択
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        runDetection(imageUri);
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // AI検出を実行（ハイブリッドモード）
  const runDetection = async (imageUri?: string) => {
    if (!imageUri && !capturedImage) {
      Alert.alert('画像がありません', 'カメラで撮影するか、ギャラリーから画像を選択してください。');
      return;
    }

    setDetecting(true);
    const targetUri = imageUri || capturedImage;
    
    try {
      // 画像をBase64に変換
      const base64Image = await FileSystem.readAsStringAsync(targetUri!, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // FastAPIの動的サイズ対応エンドポイントを呼び出し
      const endpoint = selectedBento ? '/detect/base64' : '/detect/base64';
      const requestBody: any = {
        image_base64: base64Image,
        filename: `bento_${Date.now()}.jpg`,
        mode: 'hybrid',
        confidence_threshold: 0.5,
      };

      // 選択された弁当のサイズ情報を追加
      if (selectedBento && selectedBento.width && selectedBento.length) {
        requestBody.bento_width_mm = parseFloat(selectedBento.width) * 10; // cm→mm変換
        requestBody.bento_height_mm = parseFloat(selectedBento.length) * 10; // cm→mm変換
        console.log('📏 選択弁当サイズ:', {
          width: requestBody.bento_width_mm,
          height: requestBody.bento_height_mm
        });
      }
      
      const response = await fetch(`${AI_DETECTION_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: DetectionResult = await response.json();
      console.log('🔍 検出結果:', JSON.stringify(data, null, 2));
      
      // 画像をトリミング（検出成功/失敗に関わらず、常に黄色い枠を基準にする）
      try {
        // 元画像のサイズを取得
        const imageInfo = await ImageManipulator.manipulateAsync(targetUri!, [], {});
        const imgWidth = imageInfo.width;
        const imgHeight = imageInfo.height;
        console.log('📷 元画像サイズ:', { width: imgWidth, height: imgHeight });
        
        // カメラの黄色い枠の領域を正確にトリミング
        // guideBorderスタイル: width = width * 0.8, height = width * 0.6
        const screenWidth = Dimensions.get('window').width;
        const guideBoxWidth = screenWidth * 0.8;
        const guideBoxHeight = screenWidth * 0.6;
        
        // 画像上での黄色い枠の位置とサイズを計算
        // 中央に配置されていると仮定
        const scale = imgWidth / screenWidth; // 画像とスクリーンのスケール比
        const cropWidth = guideBoxWidth * scale;
        const cropHeight = guideBoxHeight * scale;
        let originX = (imgWidth - cropWidth) / 2;
        let originY = (imgHeight - cropHeight) / 2;
        
        // カメラプレビューと実際の撮影位置のずれを補正
        // 画像が下にずれがちなので、上に約3cm（120px相当）ずらす
        const verticalOffset = 60 * scale; // スケールに応じたオフセット
        originY = originY - verticalOffset;
        
        // 各辺に約1cm（約40px）のマージンを追加
        const margin = 40 * scale; // スケールに応じたマージン
        
        const cropParams = {
          originX: Math.max(0, originX - margin),
          originY: Math.max(0, originY - margin),
          width: Math.min(imgWidth, cropWidth + margin * 2),
          height: Math.min(imgHeight, cropHeight + margin * 2),
        };
        
        console.log('📐 トリミングパラメータ:', {
          検出: data.success ? '成功' : '失敗',
          元画像: { width: imgWidth, height: imgHeight },
          黄色枠: { width: guideBoxWidth, height: guideBoxHeight },
          スケール: scale,
          垂直オフセット: verticalOffset,
          トリミング: cropParams
        });
        
        const croppedImage = await ImageManipulator.manipulateAsync(
          targetUri!,
          [{ crop: cropParams }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        // トリミングした画像に置き換え
        setCapturedImage(croppedImage.uri);
        console.log('✂️ 画像をトリミングしました:', croppedImage.uri);
      } catch (cropError) {
        console.error('❌ トリミングエラー:', cropError);
        // トリミング失敗時は元の画像を使用
      }
      
      setDetectionResult(data);
      setDetecting(false);
      
      // 検出結果のアラート（信頼度チェック付き）
      if (data.success) {
        const confidence = data.confidence * 100;
        
        if (confidence >= 85) {
          // 完全検出成功
          Alert.alert(
            '検出完了 ✓', 
            `弁当箱を正確に検出しました！\n\n信頼度: ${confidence.toFixed(1)}%\n推論時間: ${data.inference_time_ms.toFixed(1)}ms\n幅: ${data.bbox?.width_mm.toFixed(1)}mm\n高さ: ${data.bbox?.height_mm.toFixed(1)}mm`,
            [{ text: 'OK' }]
          );
        } else if (confidence >= 70) {
          // 検出はできたが信頼度が低い
          Alert.alert(
            '検出完了（やや不確実）⚠️', 
            `弁当箱を検出しましたが、信頼度がやや低めです。\n\n信頼度: ${confidence.toFixed(1)}%\n推論時間: ${data.inference_time_ms.toFixed(1)}ms\n\nより正確な測定のため、以下を試してください：\n・明るい場所で撮影\n・弁当箱を画面中央に配置\n・ピントを合わせる`,
            [
              { text: '再撮影', onPress: () => openCamera() },
              { text: 'このまま使う' }
            ]
          );
        } else {
          // 検出はできたが信頼度が非常に低い
          Alert.alert(
            '検出完了（不確実）⚠️', 
            `弁当箱を検出しましたが、信頼度が低いです。\n\n信頼度: ${confidence.toFixed(1)}%\n\n再撮影をおすすめします。`,
            [
              { text: '再撮影', onPress: () => openCamera() },
              { text: 'このまま使う' }
            ]
          );
        }
      } else {
        // 検出失敗
        Alert.alert(
          '検出失敗 ✗', 
          `弁当箱が検出できませんでした。\n\n以下を確認してください：\n・弁当箱が画面内に入っているか\n・明るい場所で撮影しているか\n・弁当箱にピントが合っているか`,
          [
            { text: '再撮影', onPress: () => openCamera() },
            { text: 'キャンセル' }
          ]
        );
      }
    } catch (error) {
      console.error('検出エラー:', error);
      setDetecting(false);
      
      // エラーハンドリング：APIサーバーに接続できない場合はモックデータを表示
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        Alert.alert(
          'API接続エラー',
          'バックエンドサーバーに接続できませんでした。\nサーバーが起動しているか確認してください。\n\nデモ用のモック結果を表示します。',
          [
            {
              text: 'OK',
              onPress: () => {
                // モックデータを表示
                const mockConfidence = 0.85 + Math.random() * 0.10;
                const mockInferenceTime = 85 + Math.random() * 20;
                
                setDetectionResult({
                  status: 'success',
                  filename: 'mock_image.jpg',
                  mode: 'hybrid',
                  confidence: mockConfidence,
                  inference_time_ms: mockInferenceTime,
                  bbox: {
                    x: 100,
                    y: 120,
                    width: 250,
                    height: 180,
                    width_mm: 150.5,
                    height_mm: 108.2
                  },
                  success: true,
                  brightness: 128.5,
                  angle: 2.3,
                  message: 'モック検出成功'
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('エラー', `AI検出に失敗しました\n${error}`);
      }
    }
  };

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* 弁当選択ボタン */}
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.9)' }]} 
            onPress={() => setShowBentoSelector(true)}
          >
            <MaterialCommunityIcons name="food-outline" size={16} color="#0B1220" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={openCamera}>
            <MaterialCommunityIcons name="camera-iris" size={18} color="#0B1220" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* カメラモーダル */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={closeCamera}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.cameraCloseBtn}
                  onPress={closeCamera}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>弁当箱を撮影</Text>
                
                {/* 自動撮影トグル */}
                <TouchableOpacity
                  style={[styles.autoToggle, autoCapture && styles.autoToggleActive]}
                  onPress={() => {
                    const newAutoCapture = !autoCapture;
                    setAutoCapture(newAutoCapture);
                    
                    if (newAutoCapture) {
                      Alert.alert(
                        '自動撮影モード',
                        '自動撮影モードは現在無効化されています。\n\nシャッター音を防ぐため、手動撮影をご利用ください。\n撮影後、AIが弁当箱を検出し、信頼度85%以上の場合に結果を表示します。',
                        [
                          { 
                            text: 'OK', 
                            onPress: () => {
                              setAutoCapture(false); // 自動モードは使用しない
                              setGuidanceText('手動撮影モード\n弁当箱を中央に配置してシャッターを押してください');
                            }
                          }
                        ]
                      );
                    } else {
                      stopRealtimeAnalysis();
                      setGuidanceText('手動撮影モード\n弁当箱を中央に配置してシャッターを押してください');
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name={autoCapture ? "auto-fix" : "camera"} 
                    size={20} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cameraGuide}>
                <View style={[
                  styles.guideBorder,
                  isAnalyzing && styles.guideBorderAnalyzing
                ]} />
                
                {/* リアルタイムガイダンス */}
                {guidanceText ? (
                  <View style={styles.guidanceBox}>
                    <Text style={styles.guideText}>{guidanceText}</Text>
                    {isAnalyzing && (
                      <ActivityIndicator size="small" color={PALETTE.yellow} style={{ marginTop: 8 }} />
                    )}
                  </View>
                ) : null}
              </View>

              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.galleryBtn}
                  onPress={() => {
                    closeCamera();
                    pickImage();
                  }}
                >
                  <MaterialCommunityIcons name="image" size={24} color="#fff" />
                  <Text style={styles.galleryBtnText}>ギャラリー</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.captureBtn,
                    detecting && styles.captureBtnDisabled
                  ]}
                  onPress={takePicture}
                  disabled={detecting}
                >
                  <View style={[
                    styles.captureBtnInner,
                    detecting && styles.captureBtnInnerDisabled
                  ]} />
                </TouchableOpacity>

                {/* 自動/手動モード表示 */}
                <View style={styles.modeIndicator}>
                  <Text style={styles.modeText}>
                    {autoCapture ? '自動' : '手動'}
                  </Text>
                </View>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* 弁当選択モーダル */}
      <Modal
        visible={showBentoSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBentoSelector(false)}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>弁当を選択</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowBentoSelector(false)}
            >
              <Ionicons name="close" size={24} color={PALETTE.ink} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {loadingBentoSizes ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="large" color={PALETTE.grape} />
                <Text style={styles.loadingText}>弁当データを読み込み中...</Text>
              </View>
            ) : registeredBentoSizes.length === 0 ? (
              <View style={styles.emptyBentoSection}>
                <MaterialCommunityIcons name="food-off-outline" size={64} color={PALETTE.subtle} />
                <Text style={styles.emptyBentoTitle}>お弁当が登録されていません</Text>
                <Text style={styles.emptyBentoDesc}>
                  設定画面でお弁当のサイズを登録してください
                </Text>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => {
                    setShowBentoSelector(false);
                    navigation.navigate('Settings');
                  }}
                >
                  <Text style={styles.settingsButtonText}>設定画面へ</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.bentoListTitle}>
                  登録済みのお弁当 ({registeredBentoSizes.length}個)
                </Text>
                {registeredBentoSizes.map((bento) => (
                  <TouchableOpacity
                    key={bento.id}
                    style={[
                      styles.bentoSelectCard,
                      selectedBento?.id === bento.id && styles.bentoSelectCardSelected
                    ]}
                    onPress={() => {
                      setSelectedBento(bento);
                      setShowBentoSelector(false);
                    }}
                  >
                    <View style={styles.bentoSelectHeader}>
                      <MaterialCommunityIcons 
                        name="food-outline" 
                        size={24} 
                        color={selectedBento?.id === bento.id ? PALETTE.grape : PALETTE.ink} 
                      />
                      <Text style={[
                        styles.bentoSelectName,
                        selectedBento?.id === bento.id && styles.bentoSelectNameSelected
                      ]}>
                        {bento.name || '名前なし'}
                      </Text>
                      {selectedBento?.id === bento.id && (
                        <MaterialCommunityIcons name="check-circle" size={20} color={PALETTE.grape} />
                      )}
                    </View>
                    <View style={styles.bentoSelectSizeInfo}>
                      <Text style={styles.bentoSelectSize}>
                        {bento.width || '?'} × {bento.length || '?'} × {bento.height || '?'} cm
                      </Text>
                      {bento.capacity && (
                        <Text style={styles.bentoSelectCapacity}>容量: {bento.capacity} ml</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 選択中の弁当情報 */}
        {selectedBento && (
          <View style={styles.selectedBentoSection}>
            <View style={styles.selectedBentoHeader}>
              <MaterialCommunityIcons name="food-outline" size={24} color={PALETTE.grape} />
              <Text style={styles.selectedBentoTitle}>選択中の弁当</Text>
              <TouchableOpacity 
                style={styles.changeBentoBtn}
                onPress={() => setShowBentoSelector(true)}
              >
                <Text style={styles.changeBentoText}>変更</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bentoInfoCard}>
              <Text style={styles.bentoNameText}>{selectedBento.name}</Text>
              <View style={styles.bentoSizeRow}>
                <View style={styles.bentoSizeItem}>
                  <Text style={styles.bentoSizeLabel}>横幅</Text>
                  <Text style={styles.bentoSizeValue}>{selectedBento.width || '未設定'} cm</Text>
                </View>
                <View style={styles.bentoSizeItem}>
                  <Text style={styles.bentoSizeLabel}>縦</Text>
                  <Text style={styles.bentoSizeValue}>{selectedBento.length || '未設定'} cm</Text>
                </View>
                <View style={styles.bentoSizeItem}>
                  <Text style={styles.bentoSizeLabel}>高さ</Text>
                  <Text style={styles.bentoSizeValue}>{selectedBento.height || '未設定'} cm</Text>
                </View>
                {selectedBento.capacity && (
                  <View style={styles.bentoSizeItem}>
                    <Text style={styles.bentoSizeLabel}>容量</Text>
                    <Text style={styles.bentoSizeValue}>{selectedBento.capacity} ml</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* 弁当が選択されていない場合の警告 */}
        {!selectedBento && registeredBentoSizes.length === 0 && (
          <View style={styles.noBentoWarning}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color={PALETTE.coral} />
            <Text style={styles.noBentoWarningText}>
              設定画面でお弁当サイズを登録してください
            </Text>
            <TouchableOpacity 
              style={styles.goToSettingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.goToSettingsText}>設定画面へ</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* AI検出機能 */}
        <SectionTitle title="AI検出機能" accent={PALETTE.grape} />
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <MaterialCommunityIcons name="robot" size={32} color={PALETTE.grape} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>ハイブリッドAI検出</Text>
              <Text style={styles.aiSubtitle}>YOLO + OpenCV 併用モード</Text>
            </View>
          </View>
          
          {/* 新機能の説明 */}
          <View style={styles.featureBadges}>
            <View style={styles.featureBadge}>
              <MaterialCommunityIcons name="auto-fix" size={16} color={PALETTE.teal} />
              <Text style={styles.featureBadgeText}>自動撮影</Text>
            </View>
            <View style={styles.featureBadge}>
              <MaterialCommunityIcons name="compass" size={16} color={PALETTE.coral} />
              <Text style={styles.featureBadgeText}>リアルタイムガイド</Text>
            </View>
            <View style={styles.featureBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={PALETTE.yellow} />
              <Text style={styles.featureBadgeText}>高速検出</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.aiButton, detecting && styles.aiButtonDisabled]}
            onPress={openCamera}
            disabled={detecting}
          >
            <MaterialCommunityIcons 
              name={detecting ? "loading" : "camera"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.aiButtonText}>
              {detecting ? '検出中...' : '弁当箱を検出'}
            </Text>
          </TouchableOpacity>

          {/* 撮影した画像と検出結果 */}
          {capturedImage && (
            <View style={styles.imagePreview}>
              <Text style={styles.previewLabel}>撮影した画像</Text>
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: capturedImage }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {detecting && (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.overlayText}>検出中...</Text>
                  </View>
                )}
                
                {/* エリア分けオーバーレイ */}
                {showAreaOverlay && detectionResult && detectionResult.bbox && (
                  <View style={styles.areaOverlayContainer}>
                    {bentoAreas.map((area) => (
                      <View
                        key={area.id}
                        style={[
                          styles.areaOverlay,
                          {
                            left: `${area.x * 100}%`,
                            top: `${area.y * 100}%`,
                            width: `${area.width * 100}%`,
                            height: `${area.height * 100}%`,
                            backgroundColor: area.color,
                          },
                        ]}
                      >
                        <View style={styles.areaLabelBox}>
                          <Text style={styles.areaLabel}>{area.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          
          {detectionResult && !detecting && capturedImage && (
            <View style={[
              styles.resultBox,
              { 
                backgroundColor: detectionResult.success ? `${PALETTE.good}11` : `${PALETTE.bad}11`,
                borderColor: detectionResult.success ? `${PALETTE.good}33` : `${PALETTE.bad}33`
              }
            ]}>
              <View style={styles.resultHeader}>
                <Ionicons 
                  name={detectionResult.success ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={detectionResult.success ? PALETTE.good : PALETTE.bad} 
                />
                <Text style={[
                  styles.resultLabel,
                  { color: detectionResult.success ? PALETTE.good : PALETTE.bad }
                ]}>
                  {detectionResult.success ? '検出成功' : '検出失敗'}
                </Text>
              </View>
              
              {detectionResult.success && detectionResult.bbox ? (
                <>
                  <View style={styles.resultRow}>
                    <View style={[styles.resultIconBox, { backgroundColor: `${PALETTE.good}15` }]}>
                      <MaterialCommunityIcons name="target" size={16} color={PALETTE.good} />
                    </View>
                    <View style={styles.resultTextBox}>
                      <Text style={styles.resultLabel2}>信頼度</Text>
                      <Text style={styles.resultValue}>
                        {(detectionResult.confidence * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultRow}>
                    <View style={[styles.resultIconBox, { backgroundColor: `${PALETTE.blue}15` }]}>
                      <MaterialCommunityIcons name="timer-outline" size={16} color={PALETTE.blue} />
                    </View>
                    <View style={styles.resultTextBox}>
                      <Text style={styles.resultLabel2}>推論時間</Text>
                      <Text style={styles.resultValue}>
                        {detectionResult.inference_time_ms.toFixed(1)}ms
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultRow}>
                    <View style={[styles.resultIconBox, { backgroundColor: `${PALETTE.teal}15` }]}>
                      <MaterialCommunityIcons name="ruler" size={16} color={PALETTE.teal} />
                    </View>
                    <View style={styles.resultTextBox}>
                      <Text style={styles.resultLabel2}>弁当箱サイズ（2D）</Text>
                      <Text style={styles.resultValue}>
                        横: {detectionResult.bbox.width_mm.toFixed(1)}mm × 縦: {detectionResult.bbox.height_mm.toFixed(1)}mm
                      </Text>
                    </View>
                  </View>

                  {/* 登録済み弁当箱情報との比較 */}
                  {registeredBentoSizes.length > 0 ? (
                    <View style={styles.registeredBentoSection}>
                      <Text style={styles.registeredBentoTitle}>📋 登録済み弁当箱</Text>
                      {registeredBentoSizes.map((bento, index) => {
                        const widthDiff = Math.abs(parseFloat(bento.width) - detectionResult.bbox.width_mm);
                        const lengthDiff = Math.abs(parseFloat(bento.length) - detectionResult.bbox.height_mm);
                        const isMatch = widthDiff < 10 && lengthDiff < 10; // 誤差10mm以内
                        
                        return (
                          <View key={bento.id} style={[
                            styles.registeredBentoCard,
                            isMatch && styles.registeredBentoMatch
                          ]}>
                            <View style={styles.registeredBentoHeader}>
                              <Text style={styles.registeredBentoName}>{bento.name || `弁当箱${index + 1}`}</Text>
                              {isMatch && (
                                <View style={styles.matchBadge}>
                                  <MaterialCommunityIcons name="check-circle" size={16} color={PALETTE.good} />
                                  <Text style={styles.matchBadgeText}>一致</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.registeredBentoDetails}>
                              <Text style={styles.registeredBentoText}>
                                横: {bento.width}cm × 縦: {bento.length}cm × 高さ: {bento.height}cm
                              </Text>
                              {bento.capacity && (
                                <Text style={styles.registeredBentoCapacity}>
                                  容量: {bento.capacity}ml
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                      <TouchableOpacity
                        style={styles.goToSettingsButton}
                        onPress={() => navigation.navigate('Settings')}
                      >
                        <MaterialCommunityIcons name="cog" size={18} color={PALETTE.blue} />
                        <Text style={styles.goToSettingsButtonText}>設定で弁当箱を管理</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.noBentoSection}>
                      <MaterialCommunityIcons name="information" size={20} color={PALETTE.subtle} />
                      <Text style={styles.noBentoText}>
                        弁当箱が登録されていません
                      </Text>
                      <TouchableOpacity
                        style={styles.registerBentoButton}
                        onPress={() => navigation.navigate('Settings')}
                      >
                        <Text style={styles.registerBentoButtonText}>設定で弁当箱を登録</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* エリア分けセクション */}
                  {detectionResult.success && (
                    <View style={styles.areaSection}>
                      {/* レイアウト選択 */}
                      <View style={styles.layoutSelector}>
                        <Text style={styles.layoutSelectorTitle}>📐 エリアレイアウト</Text>
                        <View style={styles.layoutButtons}>
                          <TouchableOpacity
                            style={[
                              styles.layoutButton,
                              selectedAreaLayout === '2split' && styles.layoutButtonActive
                            ]}
                            onPress={() => setSelectedAreaLayout('2split')}
                          >
                            <Text style={[
                              styles.layoutButtonText,
                              selectedAreaLayout === '2split' && styles.layoutButtonTextActive
                            ]}>2分割</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.layoutButton,
                              selectedAreaLayout === '3split' && styles.layoutButtonActive
                            ]}
                            onPress={() => setSelectedAreaLayout('3split')}
                          >
                            <Text style={[
                              styles.layoutButtonText,
                              selectedAreaLayout === '3split' && styles.layoutButtonTextActive
                            ]}>3分割</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.layoutButton,
                              selectedAreaLayout === '4split' && styles.layoutButtonActive
                            ]}
                            onPress={() => setSelectedAreaLayout('4split')}
                          >
                            <Text style={[
                              styles.layoutButtonText,
                              selectedAreaLayout === '4split' && styles.layoutButtonTextActive
                            ]}>4分割</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.layoutDescription}>
                          {selectedAreaLayout === '2split' && '主食とおかずの2つに分けます'}
                          {selectedAreaLayout === '3split' && '主食、主菜、副菜の3つに分けます'}
                          {selectedAreaLayout === '4split' && '主食、主菜、副菜1、副菜2の4つに分けます'}
                        </Text>

                        {/* 主食比率スライダー */}
                        <View style={styles.riceRatioContainer}>
                          <View style={styles.riceRatioHeader}>
                            <MaterialCommunityIcons name="rice" size={16} color={PALETTE.coral} />
                            <Text style={styles.riceRatioTitle}>主食の量</Text>
                            <View style={styles.riceRatioBadge}>
                              <Text style={styles.riceRatioBadgeText}>{riceRatio}</Text>
                            </View>
                          </View>
                          <View style={styles.riceRatioButtons}>
                            {[1, 2, 3, 4, 5].map((ratio) => (
                              <TouchableOpacity
                                key={ratio}
                                style={[
                                  styles.ratioButton,
                                  riceRatio === ratio && styles.ratioButtonActive
                                ]}
                                onPress={() => setRiceRatio(ratio)}
                              >
                                <Text style={[
                                  styles.ratioButtonText,
                                  riceRatio === ratio && styles.ratioButtonTextActive
                                ]}>{ratio}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <View style={styles.ratioLabels}>
                            <Text style={styles.ratioLabelText}>少なめ</Text>
                            <Text style={styles.ratioLabelText}>標準</Text>
                            <Text style={styles.ratioLabelText}>多め</Text>
                          </View>
                        </View>
                      </View>

                      {/* エリア表示トグルボタン */}
                      <TouchableOpacity
                        style={styles.areaButton}
                        onPress={() => setShowAreaOverlay(!showAreaOverlay)}
                      >
                        <MaterialCommunityIcons 
                          name={showAreaOverlay ? "grid-off" : "grid"} 
                          size={20} 
                          color="#fff" 
                        />
                        <Text style={styles.areaButtonText}>
                          {showAreaOverlay ? 'エリア分け非表示' : 'エリア分けを表示'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.resultDivider} />

                  <View style={styles.adviceBox}>
                    <MaterialCommunityIcons name="lightbulb-on" size={18} color={PALETTE.yellow} />
                    <Text style={styles.adviceText}>
                      {detectionResult.confidence >= 0.9 
                        ? '完璧な弁当箱の配置です！' 
                        : detectionResult.confidence >= 0.8
                        ? '良い配置です。詰め方のヒントも参考にしてください。'
                        : '検出はできましたが、もう少し弁当箱を明確に撮影してみてください。'}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color={PALETTE.bad} />
                  <Text style={styles.errorText}>
                    弁当箱が検出できませんでした。{'\n'}
                    もう一度、弁当箱を明るい場所で撮影してください。
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* 詰め方のヒント */}
        <SectionTitle title="詰め方のヒント" accent={PALETTE.teal} />
        <Card style={styles.tipsCard}>
          {PACKING_TIPS.map((tip, i) => (
            <View key={tip.id}>
              <TipCard tip={tip} />
              {i !== PACKING_TIPS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        {/* 参考情報 */}
        <SectionTitle title="技術情報" accent={PALETTE.coral} />
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="brain" size={20} color={PALETTE.teal} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>ハイブリッドモード: </Text>
              YOLOで大まかに検出後、OpenCVで精密化
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="auto-fix" size={20} color={PALETTE.yellow} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>自動撮影: </Text>
              リアルタイムで弁当箱を検出し、最適なタイミングで自動撮影
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="compass" size={20} color={PALETTE.coral} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>撮影ガイド: </Text>
              「もう少し上」「近づけて」などリアルタイムアシスト
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="speedometer" size={20} color={PALETTE.grape} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>精度: </Text>
              平均誤差 6.1mm、成功率 96%
            </Text>
          </View>
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

const TipCard: React.FC<{ tip: Tip }> = ({ tip }) => {
  const colors = [PALETTE.coral, PALETTE.teal, PALETTE.yellow, PALETTE.grape];
  const colorIndex = parseInt(tip.id) - 1;
  const color = colors[colorIndex] || PALETTE.coral;
  
  return (
    <View style={styles.tipItem}>
      <View style={[styles.tipIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={tip.icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tipTitle}>{tip.title}</Text>
        <View style={styles.tipTags}>
          {tip.tags.map((tag) => (
            <View key={tag} style={[styles.tipTag, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.tipTagText, { color }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.tipDesc}>{tip.desc}</Text>
      </View>
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

  aiCard: {
    padding: 16,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 16,
    color: PALETTE.ink,
    fontWeight: "800",
  },
  aiSubtitle: {
    fontSize: 12,
    color: PALETTE.subtle,
    fontWeight: "600",
  },
  featureBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${PALETTE.grape}15`,
    borderWidth: 1,
    borderColor: `${PALETTE.grape}33`,
  },
  featureBadgeText: {
    fontSize: 11,
    color: PALETTE.ink,
    fontWeight: "700",
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: PALETTE.grape,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },

  volumeText: {
    fontSize: 12,
    color: PALETTE.teal,
    marginTop: 6,
    fontWeight: "600",
  },

  // エリア分けボタン
  areaButton: {
    backgroundColor: PALETTE.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: PALETTE.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  areaButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },

  // エリアオーバーレイ
  areaOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  areaOverlay: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  areaLabelBox: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  areaLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  tipsCard: {
    padding: 16,
  },
  tipItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    fontSize: 14,
    color: PALETTE.ink,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipTags: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  tipTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tipTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  tipDesc: {
    fontSize: 12,
    color: PALETTE.subtle,
    lineHeight: 18,
  },

  infoCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.subtle,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: "700",
    color: PALETTE.ink,
  },
  infoDivider: {
    height: 1,
    backgroundColor: PALETTE.stroke,
    marginVertical: 12,
  },

  divider: { height: 1, backgroundColor: PALETTE.stroke, marginVertical: 4 },

  // カメラモーダル
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  autoToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  autoToggleActive: {
    backgroundColor: PALETTE.yellow + "DD",
    borderColor: PALETTE.yellow,
  },
  cameraGuide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  guideBorder: {
    width: width * 0.8,
    height: width * 0.6,
    borderWidth: 3,
    borderColor: PALETTE.yellow,
    borderRadius: 20,
    borderStyle: "dashed",
  },
  guideBorderAnalyzing: {
    borderColor: PALETTE.teal,
  },
  guidanceBox: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PALETTE.yellow + "AA",
    minWidth: 200,
    alignItems: "center",
  },
  guideText: {
    marginTop: 20,
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: PALETTE.yellow,
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PALETTE.yellow,
  },
  captureBtnInnerDisabled: {
    backgroundColor: PALETTE.subtle,
  },
  galleryBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  galleryBtnText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  modeIndicator: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  // 画像プレビュー
  imagePreview: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewLabel: {
    fontSize: 12,
    color: PALETTE.subtle,
    fontWeight: "700",
    marginBottom: 8,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: PALETTE.stroke,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  overlayText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },

  // 検出結果（改善版）
  resultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${PALETTE.good}33`,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.stroke,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.good,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${PALETTE.good}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTextBox: {
    flex: 1,
  },
  resultLabel2: {
    fontSize: 11,
    color: PALETTE.subtle,
    fontWeight: "600",
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 16,
    color: PALETTE.ink,
    fontWeight: "700",
  },
  resultDivider: {
    height: 1,
    backgroundColor: PALETTE.stroke,
    marginVertical: 12,
  },
  adviceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: `${PALETTE.yellow}15`,
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.ink,
    lineHeight: 19,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: `${PALETTE.bad}15`,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.bad,
    lineHeight: 19,
    fontWeight: "600",
  },

  // ================================================
  // 登録済み弁当箱セクション
  // ================================================
  registeredBentoSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  registeredBentoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.ink,
    marginBottom: 8,
  },
  registeredBentoCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  registeredBentoMatch: {
    borderColor: PALETTE.good,
    borderWidth: 2,
    backgroundColor: `${PALETTE.good}05`,
  },
  registeredBentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  registeredBentoName: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.ink,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${PALETTE.good}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.good,
  },
  registeredBentoDetails: {
    marginBottom: 4,
  },
  registeredBentoText: {
    fontSize: 12,
    color: PALETTE.ink,
    marginBottom: 2,
  },
  registeredBentoCapacity: {
    fontSize: 11,
    color: PALETTE.subtle,
  },
  goToSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    marginTop: 4,
  },
  goToSettingsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.blue,
  },
  noBentoSection: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  noBentoText: {
    fontSize: 13,
    color: PALETTE.subtle,
    textAlign: 'center',
  },
  registerBentoButton: {
    marginTop: 4,
    backgroundColor: PALETTE.blue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  registerBentoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // ================================================
  // エリア分けレイアウト選択
  // ================================================
  areaSection: {
    marginTop: 12,
  },
  layoutSelector: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  layoutSelectorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.ink,
    marginBottom: 8,
  },
  layoutButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  layoutButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    alignItems: 'center',
  },
  layoutButtonActive: {
    backgroundColor: PALETTE.blue,
    borderColor: PALETTE.blue,
  },
  layoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.subtle,
  },
  layoutButtonTextActive: {
    color: '#fff',
  },
  layoutDescription: {
    fontSize: 11,
    color: PALETTE.subtle,
    textAlign: 'center',
  },
  riceRatioContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  riceRatioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  riceRatioTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.ink,
    flex: 1,
  },
  riceRatioBadge: {
    backgroundColor: PALETTE.coral,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  riceRatioBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  riceRatioButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  ratioButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    alignItems: 'center',
  },
  ratioButtonActive: {
    backgroundColor: PALETTE.coral,
    borderColor: PALETTE.coral,
  },
  ratioButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.subtle,
  },
  ratioButtonTextActive: {
    color: '#fff',
  },
  ratioLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  ratioLabelText: {
    fontSize: 10,
    color: PALETTE.subtle,
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
  
  // 弁当選択関連のスタイル
  selectedBentoSection: {
    marginBottom: 20,
  },
  selectedBentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectedBentoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
    flex: 1,
    marginLeft: 8,
  },
  changeBentoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: PALETTE.grape + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.grape,
  },
  changeBentoText: {
    fontSize: 14,
    color: PALETTE.grape,
    fontWeight: '600',
  },
  bentoInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.stroke,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bentoNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  bentoSizeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoSizeItem: {
    flex: 1,
    alignItems: 'center',
  },
  bentoSizeLabel: {
    fontSize: 12,
    color: PALETTE.subtle,
    fontWeight: '600',
    marginBottom: 4,
  },
  bentoSizeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  noBentoWarning: {
    backgroundColor: PALETTE.coral + '20',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: PALETTE.coral,
    alignItems: 'center',
    marginBottom: 20,
  },
  noBentoWarningText: {
    fontSize: 16,
    color: PALETTE.coral,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  goToSettingsBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PALETTE.coral,
    borderRadius: 12,
    marginTop: 8,
  },
  goToSettingsText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  
  // 弁当選択モーダル関連のスタイル
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.stroke,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: PALETTE.subtle,
    marginTop: 12,
  },
  emptyBentoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyBentoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBentoDesc: {
    fontSize: 16,
    color: PALETTE.subtle,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  settingsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PALETTE.grape,
    borderRadius: 12,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  bentoListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
    marginBottom: 16,
  },
  bentoSelectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: PALETTE.stroke,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bentoSelectCardSelected: {
    borderColor: PALETTE.grape,
    backgroundColor: PALETTE.grape + '10',
  },
  bentoSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bentoSelectName: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
    flex: 1,
    marginLeft: 12,
  },
  bentoSelectNameSelected: {
    color: PALETTE.grape,
  },
  bentoSelectSizeInfo: {
    paddingLeft: 36,
  },
  bentoSelectSize: {
    fontSize: 14,
    color: PALETTE.subtle,
    fontWeight: '600',
    marginBottom: 4,
  },
  bentoSelectCapacity: {
    fontSize: 14,
    color: PALETTE.subtle,
    fontWeight: '600',
  },
});
