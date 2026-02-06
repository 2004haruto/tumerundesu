"""
参照カード検出モジュール
画像内の参照カード(クレジットカード、定規など)を検出して
自動的にpx_to_mm_ratioを計算する
"""

import cv2
import numpy as np
from typing import Optional, Tuple, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ReferenceCardDetector:
    """参照カード検出クラス"""
    
    # 標準的なカードサイズ(mm)
    STANDARD_CARD_SIZES = {
        'credit_card': {'width': 85.6, 'height': 53.98, 'aspect_ratio': 1.586},
        'business_card': {'width': 91.0, 'height': 55.0, 'aspect_ratio': 1.655},
        'custom_card': {'width': 85.6, 'height': 54.0, 'aspect_ratio': 1.585},  # MOVE21カードなど
    }
    
    def __init__(self, card_type: str = 'credit_card'):
        """
        初期化
        
        Args:
            card_type: カードタイプ ('credit_card', 'business_card', 'custom_card')
        """
        if card_type not in self.STANDARD_CARD_SIZES:
            logger.warning(f"未知のカードタイプ: {card_type}、credit_cardを使用します")
            card_type = 'credit_card'
            
        self.card_type = card_type
        self.card_info = self.STANDARD_CARD_SIZES[card_type]
        logger.info(f"参照カード: {card_type} ({self.card_info['width']}mm × {self.card_info['height']}mm)")
    
    def detect_card(self, image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        画像から参照カードを検出
        
        Args:
            image: 入力画像(BGR)
            
        Returns:
            (x, y, width, height) カードのバウンディングボックス、見つからない場合はNone
        """
        # グレースケール変換
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # ガウシアンブラーで滑らかに
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # 二値化(Otsuの自動閾値)
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 輪郭検出
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # カード候補を探す
        card_candidates = []
        
        for contour in contours:
            # 輪郭を四角形で近似
            epsilon = 0.02 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # 四角形であることを確認
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                
                # サイズフィルタリング(小さすぎる・大きすぎるものを除外)
                image_area = image.shape[0] * image.shape[1]
                contour_area = w * h
                
                if contour_area < image_area * 0.05 or contour_area > image_area * 0.5:
                    continue
                
                # アスペクト比チェック
                aspect_ratio = w / h if w > h else h / w
                expected_ratio = self.card_info['aspect_ratio']
                
                # 許容誤差 ±15%
                if abs(aspect_ratio - expected_ratio) / expected_ratio < 0.15:
                    # 候補として追加(面積も記録)
                    card_candidates.append({
                        'bbox': (x, y, w, h),
                        'area': contour_area,
                        'aspect_ratio': aspect_ratio,
                        'score': abs(aspect_ratio - expected_ratio)  # 理想値との差
                    })
        
        if not card_candidates:
            logger.warning("参照カードが検出できませんでした")
            return None
        
        # 最もスコアの良い候補を選択
        best_candidate = min(card_candidates, key=lambda c: c['score'])
        x, y, w, h = best_candidate['bbox']
        
        logger.info(f"参照カード検出: ({x}, {y}, {w}, {h}), アスペクト比: {best_candidate['aspect_ratio']:.3f}")
        
        return (x, y, w, h)
    
    def calculate_px_to_mm_ratio(self, image: np.ndarray) -> Optional[float]:
        """
        参照カードを使ってpx_to_mm_ratioを計算
        
        Args:
            image: 入力画像(BGR)
            
        Returns:
            px_to_mm_ratio: 計算された変換係数、失敗時はNone
        """
        card_bbox = self.detect_card(image)
        
        if card_bbox is None:
            return None
        
        x, y, w, h = card_bbox
        
        # カードの長辺を基準に変換係数を計算
        card_long_side_px = max(w, h)
        card_short_side_px = min(w, h)
        
        card_width_mm = self.card_info['width']
        card_height_mm = self.card_info['height']
        
        # 長辺・短辺それぞれで計算
        ratio_long = card_width_mm / card_long_side_px
        ratio_short = card_height_mm / card_short_side_px
        
        # 平均を取る
        px_to_mm_ratio = (ratio_long + ratio_short) / 2
        
        logger.info(f"変換係数計算: {px_to_mm_ratio:.4f} mm/px")
        logger.info(f"  長辺: {card_long_side_px}px → {card_width_mm}mm (比率: {ratio_long:.4f})")
        logger.info(f"  短辺: {card_short_side_px}px → {card_height_mm}mm (比率: {ratio_short:.4f})")
        
        return px_to_mm_ratio
    
    def visualize_detection(self, image: np.ndarray, output_path: str) -> bool:
        """
        カード検出結果を可視化して保存
        
        Args:
            image: 入力画像(BGR)
            output_path: 保存先パス
            
        Returns:
            成功したかどうか
        """
        card_bbox = self.detect_card(image)
        
        if card_bbox is None:
            return False
        
        # 画像にバウンディングボックスを描画
        result_image = image.copy()
        x, y, w, h = card_bbox
        
        cv2.rectangle(result_image, (x, y), (x + w, y + h), (0, 255, 0), 3)
        cv2.putText(result_image, f"Reference Card: {w}x{h}px", 
                   (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # 変換係数を計算して表示
        px_to_mm_ratio = self.calculate_px_to_mm_ratio(image)
        if px_to_mm_ratio:
            cv2.putText(result_image, f"Ratio: {px_to_mm_ratio:.4f} mm/px", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        
        # 保存
        cv2.imwrite(output_path, result_image)
        logger.info(f"可視化結果を保存: {output_path}")
        
        return True


def test_card_detection(image_path: str, card_type: str = 'credit_card'):
    """
    テスト用関数: カード検出をテスト
    
    Args:
        image_path: テスト画像パス
        card_type: カードタイプ
    """
    import os
    
    detector = ReferenceCardDetector(card_type=card_type)
    
    # 画像読み込み
    image = cv2.imread(image_path)
    if image is None:
        logger.error(f"画像を読み込めません: {image_path}")
        return
    
    logger.info(f"画像サイズ: {image.shape[1]}x{image.shape[0]}px")
    
    # カード検出
    px_to_mm_ratio = detector.calculate_px_to_mm_ratio(image)
    
    if px_to_mm_ratio:
        print(f"\n✅ 成功！")
        print(f"変換係数: {px_to_mm_ratio:.4f} mm/px")
        
        # 可視化
        output_path = image_path.replace('.jpg', '_card_detection.jpg')
        detector.visualize_detection(image, output_path)
        print(f"結果を保存: {output_path}")
    else:
        print(f"\n❌ カード検出失敗")


if __name__ == "__main__":
    # テスト実行例
    import sys
    
    if len(sys.argv) > 1:
        test_card_detection(sys.argv[1])
    else:
        print("使用方法: python reference_card_detector.py <画像パス>")
