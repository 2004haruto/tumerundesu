"""
画像前処理モジュール
お弁当箱の画像を最適な状態に切り取り・補正する
フロントエンドの処理と同等の機能をバックエンドでも提供
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """画像前処理クラス"""
    
    def __init__(
        self,
        target_ratio: float = 0.8,  # 画像全体に対する切り取り領域の比率
        aspect_ratio: float = 4/3,  # アスペクト比（横:縦）
        margin_ratio: float = 0.05,  # マージン比率（各辺）
        min_size: int = 300,  # 最小サイズ（px）
        max_size: int = 1920,  # 最大サイズ（px）
    ):
        """
        初期化
        
        Args:
            target_ratio: 切り取り領域の比率（0.0-1.0）
            aspect_ratio: 切り取り後のアスペクト比
            margin_ratio: 各辺のマージン比率
            min_size: 最小サイズ（これより小さい画像は処理しない）
            max_size: 最大サイズ（これより大きい画像はリサイズ）
        """
        self.target_ratio = target_ratio
        self.aspect_ratio = aspect_ratio
        self.margin_ratio = margin_ratio
        self.min_size = min_size
        self.max_size = max_size
    
    def auto_crop_bento(
        self, 
        image: np.ndarray,
        detect_bento: bool = True
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        お弁当箱を中心に自動切り取り
        
        Args:
            image: 入力画像（BGR形式）
            detect_bento: Trueの場合、お弁当箱を検出して中心に配置
                          Falseの場合、画像中央を基準に切り取り
        
        Returns:
            cropped_image: 切り取り後の画像
            crop_info: 切り取り情報（座標、サイズなど）
        """
        original_height, original_width = image.shape[:2]
        
        # 画像が大きすぎる場合はリサイズ
        if max(original_width, original_height) > self.max_size:
            scale = self.max_size / max(original_width, original_height)
            new_width = int(original_width * scale)
            new_height = int(original_height * scale)
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            logger.info(f"画像をリサイズ: {original_width}x{original_height} → {new_width}x{new_height}")
        
        height, width = image.shape[:2]
        
        # 画像が小さすぎる場合はそのまま返す
        if min(width, height) < self.min_size:
            logger.warning(f"画像が小さすぎます: {width}x{height}")
            return image, {
                'original_size': (original_width, original_height),
                'cropped_size': (width, height),
                'crop_applied': False,
                'reason': 'image_too_small'
            }
        
        # お弁当箱の中心位置を検出または推定
        if detect_bento:
            center_x, center_y = self._detect_bento_center(image)
            if center_x is None:
                # 検出失敗時は画像中央を使用
                center_x = width // 2
                center_y = height // 2
                logger.info("お弁当箱検出失敗、画像中央を使用")
        else:
            center_x = width // 2
            center_y = height // 2
        
        # 切り取りサイズを計算
        # フロントエンドの仕様に合わせる：width * 0.8, height * 0.6相当
        # ただし、縦長画像の場合は横幅基準で計算
        if width > height:
            # 横長画像
            crop_width = int(width * self.target_ratio)
            crop_height = int(crop_width / self.aspect_ratio)
        else:
            # 縦長画像（問題の画像はこちら）
            # 横幅を基準に、アスペクト比を維持
            crop_width = int(width * self.target_ratio)
            crop_height = int(crop_width / self.aspect_ratio)
            
            # 高さが画像からはみ出る場合は高さ基準で再計算
            if crop_height > height * 0.9:
                crop_height = int(height * self.target_ratio)
                crop_width = int(crop_height * self.aspect_ratio)
        
        # マージンを追加
        margin = int(min(crop_width, crop_height) * self.margin_ratio)
        crop_width_with_margin = crop_width + margin * 2
        crop_height_with_margin = crop_height + margin * 2
        
        # 切り取り開始位置を計算（中心基準）
        x1 = max(0, center_x - crop_width_with_margin // 2)
        y1 = max(0, center_y - crop_height_with_margin // 2)
        x2 = min(width, x1 + crop_width_with_margin)
        y2 = min(height, y1 + crop_height_with_margin)
        
        # はみ出した場合の補正
        if x2 - x1 < crop_width_with_margin:
            x1 = max(0, x2 - crop_width_with_margin)
        if y2 - y1 < crop_height_with_margin:
            y1 = max(0, y2 - crop_height_with_margin)
        
        # 切り取り実行
        cropped = image[y1:y2, x1:x2]
        
        crop_info = {
            'original_size': (original_width, original_height),
            'resized_size': (width, height),
            'cropped_size': (x2 - x1, y2 - y1),
            'crop_box': (x1, y1, x2, y2),
            'center': (center_x, center_y),
            'crop_applied': True,
            'margin': margin,
            'detect_bento': detect_bento
        }
        
        logger.info(f"✂️ 画像を切り取り: {width}x{height} → {x2-x1}x{y2-y1}")
        
        return cropped, crop_info
    
    def _detect_bento_center(self, image: np.ndarray) -> Tuple[Optional[int], Optional[int]]:
        """
        お弁当箱の中心位置を簡易検出
        OpenCVの輪郭検出を使用
        
        Args:
            image: 入力画像
        
        Returns:
            (center_x, center_y): 中心座標（検出失敗時はNone）
        """
        try:
            # グレースケール変換
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # ガウシアンブラー
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # エッジ検出
            edges = cv2.Canny(blurred, 50, 150)
            
            # 輪郭検出
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return None, None
            
            # 最大面積の輪郭を取得
            max_contour = max(contours, key=cv2.contourArea)
            
            # 輪郭の面積が画像全体の5%以上の場合のみ有効とする
            contour_area = cv2.contourArea(max_contour)
            image_area = image.shape[0] * image.shape[1]
            
            if contour_area < image_area * 0.05:
                logger.debug("輪郭が小さすぎるため無視")
                return None, None
            
            # バウンディングボックスの中心を取得
            x, y, w, h = cv2.boundingRect(max_contour)
            center_x = x + w // 2
            center_y = y + h // 2
            
            logger.debug(f"お弁当箱中心検出: ({center_x}, {center_y})")
            
            return center_x, center_y
            
        except Exception as e:
            logger.error(f"お弁当箱中心検出エラー: {e}")
            return None, None
    
    def preprocess_image(
        self,
        image: np.ndarray,
        enhance: bool = True
    ) -> np.ndarray:
        """
        画像の前処理（明るさ調整、シャープ化など）
        
        Args:
            image: 入力画像
            enhance: 画質向上処理を適用するか
        
        Returns:
            processed_image: 処理後の画像
        """
        if not enhance:
            return image
        
        # 明るさ自動調整
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # CLAHEによる明るさ補正
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # 軽いシャープ化
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]]) / 9
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        return sharpened
    
    def process_file(
        self,
        input_path: Path,
        output_path: Path,
        detect_bento: bool = True,
        enhance: bool = True
    ) -> Dict[str, Any]:
        """
        ファイルから画像を読み込み、前処理して保存
        
        Args:
            input_path: 入力画像パス
            output_path: 出力画像パス
            detect_bento: お弁当箱検出を行うか
            enhance: 画質向上処理を行うか
        
        Returns:
            処理結果の辞書
        """
        try:
            # 画像読み込み
            image = cv2.imread(str(input_path))
            
            if image is None:
                raise ValueError(f"画像の読み込みに失敗: {input_path}")
            
            # 切り取り
            cropped, crop_info = self.auto_crop_bento(image, detect_bento=detect_bento)
            
            # 画質向上
            if enhance:
                cropped = self.preprocess_image(cropped, enhance=True)
            
            # 保存
            output_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(output_path), cropped)
            
            result = {
                'status': 'success',
                'input_path': str(input_path),
                'output_path': str(output_path),
                'crop_info': crop_info
            }
            
            logger.info(f"✅ 画像処理完了: {input_path.name} → {output_path.name}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ 画像処理エラー: {e}")
            return {
                'status': 'error',
                'input_path': str(input_path),
                'error': str(e)
            }
    
    def batch_process(
        self,
        input_dir: Path,
        output_dir: Path,
        pattern: str = "*.jpg",
        detect_bento: bool = True,
        enhance: bool = True
    ) -> Dict[str, Any]:
        """
        フォルダ内の画像を一括処理
        
        Args:
            input_dir: 入力ディレクトリ
            output_dir: 出力ディレクトリ
            pattern: ファイルパターン
            detect_bento: お弁当箱検出を行うか
            enhance: 画質向上処理を行うか
        
        Returns:
            処理結果のサマリー
        """
        input_dir = Path(input_dir)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        image_files = list(input_dir.glob(pattern))
        
        if not image_files:
            logger.warning(f"処理対象の画像が見つかりません: {input_dir}/{pattern}")
            return {
                'status': 'no_images',
                'processed': 0,
                'failed': 0
            }
        
        results = []
        success_count = 0
        failed_count = 0
        
        for img_path in image_files:
            output_path = output_dir / img_path.name
            result = self.process_file(
                img_path,
                output_path,
                detect_bento=detect_bento,
                enhance=enhance
            )
            
            results.append(result)
            
            if result['status'] == 'success':
                success_count += 1
            else:
                failed_count += 1
        
        summary = {
            'status': 'completed',
            'total': len(image_files),
            'processed': success_count,
            'failed': failed_count,
            'results': results
        }
        
        logger.info(f"📊 一括処理完了: {success_count}成功 / {failed_count}失敗 / {len(image_files)}合計")
        
        return summary


if __name__ == "__main__":
    # テスト実行
    import sys
    logging.basicConfig(level=logging.INFO)
    
    preprocessor = ImagePreprocessor()
    
    # test_imagesフォルダを処理
    input_dir = Path("./test_images")
    output_dir = Path("./test_images_cropped")
    
    if input_dir.exists():
        print(f"📁 {input_dir} 内の画像を処理します...")
        summary = preprocessor.batch_process(
            input_dir,
            output_dir,
            pattern="*.jpg",
            detect_bento=True,
            enhance=True
        )
        print(f"\n📊 処理結果:")
        print(f"  成功: {summary['processed']}")
        print(f"  失敗: {summary['failed']}")
        print(f"  合計: {summary['total']}")
        print(f"\n✅ 処理済み画像: {output_dir}")
    else:
        print(f"❌ {input_dir} が見つかりません")
        sys.exit(1)
