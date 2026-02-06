"""
弁当箱検出AIモジュール
YOLOv8 (Ultralytics) + OpenCV による3モード検出
- OpenCV単体モード
- YOLOv8単体モード
- YOLOv8 + OpenCV 併用モード（ハイブリッド）

改善版: 参照カードによる自動キャリブレーション対応
"""

import cv2
import numpy as np
import time
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Literal
from dataclasses import dataclass, asdict
import logging

# 参照カード検出モジュール
try:
    from reference_card_detector import ReferenceCardDetector
    CARD_DETECTOR_AVAILABLE = True
except ImportError:
    CARD_DETECTOR_AVAILABLE = False
    logging.warning("reference_card_detector がインポートできません。自動キャリブレーションは無効です。")

# YOLOv8 (Ultralytics)
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logging.warning("ultralytics がインストールされていません。YOLOモードは使用できません。")

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DetectionMode = Literal["opencv", "yolo", "hybrid"]


@dataclass
class DetectionResult:
    """検出結果データクラス"""
    filename: str
    timestamp: str
    mode: DetectionMode
    brightness: float
    angle: float
    inference_time_ms: float
    error_mm: float
    confidence: float
    bbox: Dict[str, float]  # {"x": int, "y": int, "width": int, "height": int, "width_mm": float, "height_mm": float}
    success: bool
    

class BentoBoxDetector:
    """弁当箱検出クラス（YOLOv8対応 + 自動キャリブレーション対応）"""
    
    def __init__(
        self, 
        yolo_weights_path: Optional[str] = None,
        yolo_config_path: Optional[str] = None,  # YOLOv8では不要だが互換性のため残す
        confidence_threshold: float = 0.5,
        nms_threshold: float = 0.4,
        output_dir: str = "./outputs",
        px_to_mm_ratio: float = 1.0,
        enable_auto_calibration: bool = False,
        card_type: str = 'credit_card'
    ):
        """
        初期化
        
        Args:
            yolo_weights_path: YOLOv8モデルファイルパス（.ptファイル）
            yolo_config_path: 互換性のため残すが使用しない
            confidence_threshold: 信頼度閾値
            nms_threshold: NMS閾値
            output_dir: 出力ディレクトリ
            px_to_mm_ratio: ピクセルからmmへの換算係数(デフォルト値)
            enable_auto_calibration: 参照カードによる自動キャリブレーションを有効化
            card_type: カードタイプ ('credit_card', 'business_card', 'custom_card')
        """
        self.confidence_threshold = confidence_threshold
        self.nms_threshold = nms_threshold
        self.output_dir = Path(output_dir)
        self.log_dir = self.output_dir / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.px_to_mm_ratio = px_to_mm_ratio
        self.enable_auto_calibration = enable_auto_calibration
        
        # 参照カード検出器の初期化
        self.card_detector = None
        if enable_auto_calibration and CARD_DETECTOR_AVAILABLE:
            self.card_detector = ReferenceCardDetector(card_type=card_type)
            logger.info("自動キャリブレーションが有効化されました")
        elif enable_auto_calibration and not CARD_DETECTOR_AVAILABLE:
            logger.warning("自動キャリブレーションが要求されましたが、モジュールが利用できません")
        
        # YOLOv8モデル初期化
        self.yolo_model = None
        if YOLO_AVAILABLE and yolo_weights_path:
            try:
                # YOLOv8モデルを読み込み
                self.yolo_model = YOLO(yolo_weights_path)
                logger.info(f"YOLOv8モデルを読み込みました: {yolo_weights_path}")
            except Exception as e:
                logger.warning(f"YOLOv8モデルの読み込みに失敗: {e}")
        elif not YOLO_AVAILABLE:
            logger.warning("ultralytics がインストールされていません")
        
    def detect_opencv(self, image: np.ndarray) -> Tuple[List[int], float, float]:
        """
        OpenCV単体での検出
        シンプルなアルゴリズムを維持（既に良好な性能）
        
        Args:
            image: 入力画像
            
        Returns:
            bbox: [x, y, w, h]
            confidence: 信頼度 (固定値)
            inference_time: 推論時間(ms)
        """
        start_time = time.time()
        
        # グレースケール変換
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # ノイズ除去を強化
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        
        # Cannyエッジ検出（閾値を調整してエッジ精度向上）
        # 低閾値30, 高閾値100に変更（より多くのエッジを検出）
        edges = cv2.Canny(blurred, 30, 100)
        
        # モルフォロジー処理でエッジを連結
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
        # 輪郭検出
        contours, _ = cv2.findContours(
            edges, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        # 最大面積の輪郭を検出（シンプル = 強い）
        if contours:
            max_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(max_contour)
            bbox = [int(x), int(y), int(w), int(h)]
            
            # bbox微調整を適用（精度向上）
            bbox = self._refine_bbox(image, bbox)
            
            confidence = 0.7  # OpenCVは信頼度を返さないので固定値
        else:
            bbox = [0, 0, 0, 0]
            confidence = 0.0
        
        inference_time = (time.time() - start_time) * 1000
        
        return bbox, confidence, inference_time
    
    def detect_yolo(self, image: np.ndarray) -> Tuple[List[int], float, float]:
        """
        YOLOv8単体での検出（改良版）
        - 低い閾値で再試行機能を追加
        - 最大面積のボックスを優先
        
        Args:
            image: 入力画像
            
        Returns:
            bbox: [x, y, w, h]
            confidence: 信頼度
            inference_time: 推論時間(ms)
        """
        if self.yolo_model is None:
            logger.error("YOLOv8モデルが読み込まれていません")
            return [0, 0, 0, 0], 0.0, 0.0
        
        start_time = time.time()
        
        try:
            # まず通常の閾値で試行
            results = self.yolo_model(image, conf=self.confidence_threshold, verbose=False)
            
            # 結果を取得
            if len(results) > 0 and len(results[0].boxes) > 0:
                boxes = results[0].boxes
                confidences = boxes.conf.cpu().numpy()
                xyxy = boxes.xyxy.cpu().numpy()
                
                # 最高信頼度のボックスを選択
                max_idx = np.argmax(confidences)
                confidence = float(confidences[max_idx])
                
                # xyxy形式 (x1, y1, x2, y2) から xywh形式に変換
                x1, y1, x2, y2 = xyxy[max_idx]
                x = int(x1)
                y = int(y1)
                w = int(x2 - x1)
                h = int(y2 - y1)
                
                bbox = [x, y, w, h]
                # bbox微調整を適用（精度向上）
                bbox = self._refine_bbox(image, bbox)
            else:
                # 検出失敗時: より低い閾値で再試行（0.2まで下げる）
                logger.info(f"YOLO初回検出失敗 → 低閾値(0.2)で再試行")
                results = self.yolo_model(image, conf=0.2, verbose=False)
                
                if len(results) > 0 and len(results[0].boxes) > 0:
                    boxes = results[0].boxes
                    confidences = boxes.conf.cpu().numpy()
                    xyxy = boxes.xyxy.cpu().numpy()
                    
                    # 面積が最大のボックスを選択（弁当箱は通常最大）
                    areas = []
                    for box in xyxy:
                        x1, y1, x2, y2 = box
                        area = (x2 - x1) * (y2 - y1)
                        areas.append(area)
                    
                    max_area_idx = np.argmax(areas)
                    confidence = float(confidences[max_area_idx])
                    
                    x1, y1, x2, y2 = xyxy[max_area_idx]
                    x = int(x1)
                    y = int(y1)
                    w = int(x2 - x1)
                    h = int(y2 - y1)
                    
                    bbox = [x, y, w, h]
                    # bbox微調整を適用（精度向上）
                    bbox = self._refine_bbox(image, bbox)
                    logger.info(f"低閾値検出成功: confidence={confidence:.3f}, area={areas[max_area_idx]:.0f}")
                else:
                    bbox = [0, 0, 0, 0]
                    confidence = 0.0
                
        except Exception as e:
            logger.error(f"YOLOv8推論エラー: {e}")
            bbox = [0, 0, 0, 0]
            confidence = 0.0
        
        inference_time = (time.time() - start_time) * 1000
        
        return bbox, confidence, inference_time
    
    def detect_hybrid(self, image: np.ndarray) -> Tuple[List[int], float, float]:
        """
        YOLOv8 + OpenCV 併用での検出（改良版）
        1. YOLOv8で大まかな領域を検出
        2. YOLOが成功 → ROI内でOpenCVで精密化
        3. YOLOが失敗 → OpenCV全体検出にフォールバック
        
        Args:
            image: 入力画像
            
        Returns:
            bbox: [x, y, w, h]
            confidence: 信頼度
            inference_time: 推論時間(ms)
        """
        start_time = time.time()
        
        # まずYOLOv8で検出
        yolo_bbox, yolo_conf, _ = self.detect_yolo(image)
        
        # YOLOが失敗した場合、OpenCV全体検出にフォールバック
        # 閾値を0.2まで緩和（低信頼度でもまず試す）
        if yolo_conf < 0.2 or yolo_bbox == [0, 0, 0, 0]:
            logger.info(f"YOLO検出失敗(conf={yolo_conf:.3f}) → OpenCVフォールバック実行")
            opencv_bbox, opencv_conf, _ = self.detect_opencv(image)
            inference_time = (time.time() - start_time) * 1000
            # OpenCVの信頼度を使用（0.7 or 0.0）
            return opencv_bbox, opencv_conf, inference_time
        
        # YOLOの領域を少し拡大してROIを抽出
        x, y, w, h = yolo_bbox
        margin = 30  # マージンを拡大（20→30）
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(image.shape[1], x + w + margin)
        y2 = min(image.shape[0], y + h + margin)
        
        roi = image[y1:y2, x1:x2]
        
        # ROIが空の場合もOpenCVフォールバック
        if roi.size == 0:
            logger.warning("ROIサイズ0 → OpenCVフォールバック実行")
            opencv_bbox, opencv_conf, _ = self.detect_opencv(image)
            inference_time = (time.time() - start_time) * 1000
            return opencv_bbox, opencv_conf, inference_time
        
        # ROI内でOpenCV検出して精密化
        opencv_bbox, _, _ = self.detect_opencv(roi)
        
        # OpenCVが失敗した場合は元のYOLO結果を使用
        if opencv_bbox == [0, 0, 0, 0]:
            logger.warning("OpenCV精密化失敗 → YOLO結果を使用")
            inference_time = (time.time() - start_time) * 1000
            return yolo_bbox, yolo_conf, inference_time
        
        # 元画像の座標系に戻す
        refined_bbox = [
            x1 + opencv_bbox[0],
            y1 + opencv_bbox[1],
            opencv_bbox[2],
            opencv_bbox[3]
        ]
        
        inference_time = (time.time() - start_time) * 1000
        
        # YOLOとOpenCVの信頼度を統合（改良版）
        # OpenCVから実際の信頼度を取得（opencv_confを使用）
        opencv_conf = 0.7  # デフォルト値（後で改善）
        
        # 精密化の品質を評価（バウンディングボックスの重なり度）
        yolo_area = yolo_bbox[2] * yolo_bbox[3]
        refined_area = refined_bbox[2] * refined_bbox[3]
        
        # 面積が大きく変わりすぎた場合は信頼度を下げる
        if yolo_area > 0:
            area_ratio = min(refined_area / yolo_area, yolo_area / refined_area)
            quality_factor = area_ratio if area_ratio > 0.5 else 0.5
        else:
            quality_factor = 0.5
        
        # YOLO 50% + OpenCV 50% の加重平均に品質係数を適用
        combined_confidence = min(1.0, (yolo_conf * 0.5 + opencv_conf * 0.5) * quality_factor)
        
        return refined_bbox, combined_confidence, inference_time
    
    def detect(
        self, 
        image_path: str, 
        mode: DetectionMode = "hybrid",
        ground_truth: Optional[List[int]] = None
    ) -> DetectionResult:
        """
        検出実行（メイン関数）
        
        Args:
            image_path: 画像ファイルパス
            mode: 検出モード ("opencv", "yolo", "hybrid")
            ground_truth: 正解bbox [x, y, w, h] (誤差計算用)
            
        Returns:
            DetectionResult: 検出結果
        """
        # 画像読み込み
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"画像の読み込みに失敗: {image_path}")
        
        # 自動キャリブレーション（参照カード検出）
        if self.enable_auto_calibration and self.card_detector:
            calibrated_ratio = self.card_detector.calculate_px_to_mm_ratio(image)
            if calibrated_ratio:
                logger.info(f"自動キャリブレーション成功: {calibrated_ratio:.4f} mm/px (元: {self.px_to_mm_ratio:.4f})")
                self.px_to_mm_ratio = calibrated_ratio
            else:
                logger.warning(f"自動キャリブレーション失敗、デフォルト値を使用: {self.px_to_mm_ratio:.4f} mm/px")
        
        # 画像メタデータ取得
        brightness = self._calculate_brightness(image)
        angle = self._estimate_angle(image)
        
        # モード別検出
        if mode == "opencv":
            bbox, confidence, inference_time = self.detect_opencv(image)
        elif mode == "yolo":
            bbox, confidence, inference_time = self.detect_yolo(image)
        elif mode == "hybrid":
            bbox, confidence, inference_time = self.detect_hybrid(image)
        else:
            raise ValueError(f"不正なモード: {mode}")
        
        # 誤差計算
        error_mm = 0.0
        if ground_truth:
            error_mm = self._calculate_error(bbox, ground_truth)
        
        success = confidence >= self.confidence_threshold and bbox != [0, 0, 0, 0]
        
        # bboxをdict形式に変換
        bbox_dict = self._bbox_to_dict(bbox)
        
        # 結果作成
        result = DetectionResult(
            filename=Path(image_path).name,
            timestamp=datetime.now().isoformat(),
            mode=mode,
            brightness=brightness,
            angle=angle,
            inference_time_ms=inference_time,
            error_mm=error_mm,
            confidence=confidence,
            bbox=bbox_dict,
            success=success
        )
        
        # ログ保存
        self._save_log(result)
        
        return result
    
    def _bbox_to_dict(self, bbox: List[int]) -> Dict[str, float]:
        """
        bboxリストをdict形式に変換（mm単位の寸法も追加）
        
        Args:
            bbox: [x, y, w, h]
            
        Returns:
            dict: {"x": int, "y": int, "width": int, "height": int, "width_mm": float, "height_mm": float}
        """
        x, y, w, h = bbox
        return {
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "width_mm": float(w * self.px_to_mm_ratio),
            "height_mm": float(h * self.px_to_mm_ratio)
        }
    
    def _calculate_brightness(self, image: np.ndarray) -> float:
        """画像の明るさを計算"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return float(np.mean(gray))
    
    def _estimate_angle(self, image: np.ndarray) -> float:
        """画像の傾き角度を推定（簡易版）"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        lines = cv2.HoughLines(edges, 1, np.pi/180, 100)
        
        if lines is not None and len(lines) > 0:
            angles = [line[0][1] * 180 / np.pi for line in lines]
            return float(np.mean(angles))
        return 0.0
    
    def _refine_bbox(self, image: np.ndarray, bbox: List[int]) -> List[int]:
        """
        バウンディングボックスを微調整
        エッジ境界を精密化して誤差を削減
        
        Args:
            image: 元画像
            bbox: [x, y, w, h]
            
        Returns:
            refined_bbox: 調整後の [x, y, w, h]
        """
        if bbox == [0, 0, 0, 0]:
            return bbox
        
        x, y, w, h = bbox
        
        # バウンディングボックスが画像範囲外にはみ出さないようクリップ
        x = max(0, x)
        y = max(0, y)
        w = min(w, image.shape[1] - x)
        h = min(h, image.shape[0] - y)
        
        # ROI抽出
        roi = image[y:y+h, x:x+w]
        if roi.size == 0:
            return bbox
        
        # グレースケール化
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # 二値化
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 上下左右から非ゼロピクセルを探して境界を調整
        # 上端調整
        for i in range(h):
            if np.any(binary[i, :] > 0):
                dy = i
                break
        else:
            dy = 0
        
        # 下端調整
        for i in range(h-1, -1, -1):
            if np.any(binary[i, :] > 0):
                h_new = i - dy + 1
                break
        else:
            h_new = h - dy
        
        # 左端調整
        for j in range(w):
            if np.any(binary[:, j] > 0):
                dx = j
                break
        else:
            dx = 0
        
        # 右端調整
        for j in range(w-1, -1, -1):
            if np.any(binary[:, j] > 0):
                w_new = j - dx + 1
                break
        else:
            w_new = w - dx
        
        # 調整後の座標
        x_new = x + dx
        y_new = y + dy
        
        # 調整が極端な場合は元のbboxを返す
        if w_new < w * 0.5 or h_new < h * 0.5:
            return bbox
        
        return [int(x_new), int(y_new), int(w_new), int(h_new)]
    
    def _calculate_error(self, pred_bbox: List[int], gt_size: Dict[str, float]) -> float:
        """
        予測bboxサイズと正解サイズの誤差をmm単位で計算
        
        Args:
            pred_bbox: [x, y, width, height] ピクセル単位
            gt_size: {"width_mm": float, "height_mm": float} mm単位
            
        Returns:
            サイズ誤差（mm）
        """
        if pred_bbox == [0, 0, 0, 0] or not gt_size:
            return 999.0  # 検出失敗時の大きなエラー値
            
        # 予測サイズ（ピクセル→mm変換）
        pred_width_mm = pred_bbox[2] * self.px_to_mm_ratio
        pred_height_mm = pred_bbox[3] * self.px_to_mm_ratio
        
        # 正解サイズ
        gt_width_mm = gt_size.get("width_mm", 0.0)
        gt_height_mm = gt_size.get("height_mm", 0.0)
        
        # サイズ誤差の計算（ユークリッド距離）
        width_error = abs(pred_width_mm - gt_width_mm)
        height_error = abs(pred_height_mm - gt_height_mm)
        
        total_error = np.sqrt(width_error**2 + height_error**2)
        
        return float(total_error)
    
    def _save_log(self, result: DetectionResult) -> None:
        """検出結果をJSON形式でログ保存"""
        log_file = self.log_dir / f"{result.filename}_{result.mode}_{int(time.time())}.json"
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(result), f, ensure_ascii=False, indent=2)
        
        logger.info(f"ログ保存: {log_file}")


if __name__ == "__main__":
    # テスト実行
    detector = BentoBoxDetector(
        confidence_threshold=0.5,
        output_dir="./outputs"
    )
    
    # テスト画像で検出（モック）
    test_image = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.imwrite("test.jpg", test_image)
    
    for mode in ["opencv", "yolo", "hybrid"]:
        try:
            result = detector.detect("test.jpg", mode=mode)
            print(f"\n{mode}モード:")
            print(f"  信頼度: {result.confidence:.2f}")
            print(f"  推論時間: {result.inference_time_ms:.2f}ms")
            print(f"  成功: {result.success}")
        except Exception as e:
            print(f"{mode}モードでエラー: {e}")
