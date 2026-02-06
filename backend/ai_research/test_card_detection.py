"""
カード検出機能のテストスクリプト
"""

import cv2
from reference_card_detector import ReferenceCardDetector
import sys

def test_with_image(image_path: str):
    """
    指定された画像でカード検出をテスト
    """
    print(f"画像を読み込み中: {image_path}")
    
    # 画像読み込み
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ 画像を読み込めません: {image_path}")
        return
    
    print(f"✅ 画像サイズ: {image.shape[1]}x{image.shape[0]}px")
    
    # カード検出器を初期化
    detector = ReferenceCardDetector(card_type='custom_card')
    
    # カード検出
    print("\n参照カードを検出中...")
    card_bbox = detector.detect_card(image)
    
    if card_bbox:
        x, y, w, h = card_bbox
        print(f"✅ カード検出成功!")
        print(f"   位置: ({x}, {y})")
        print(f"   サイズ: {w}x{h}px")
        print(f"   アスペクト比: {w/h:.3f}")
    else:
        print("❌ カード検出失敗")
        return
    
    # px_to_mm_ratio計算
    print("\n変換係数を計算中...")
    px_to_mm_ratio = detector.calculate_px_to_mm_ratio(image)
    
    if px_to_mm_ratio:
        print(f"✅ 計算成功: {px_to_mm_ratio:.4f} mm/px")
        
        # 弁当箱のサイズを推定(画像全体として)
        bento_width_px = image.shape[1] - w - 50  # おおよその弁当幅(カード除く)
        bento_height_px = image.shape[0]
        
        estimated_width_mm = bento_width_px * px_to_mm_ratio
        estimated_height_mm = bento_height_px * px_to_mm_ratio
        
        print(f"\n推定弁当サイズ:")
        print(f"  幅: {estimated_width_mm:.1f}mm (実測: 190mm)")
        print(f"  高さ: {estimated_height_mm:.1f}mm (実測: 120mm)")
        
    else:
        print("❌ 計算失敗")
        return
    
    # 可視化
    output_path = image_path.replace('.jpg', '_result.jpg').replace('.png', '_result.png')
    success = detector.visualize_detection(image, output_path)
    
    if success:
        print(f"\n✅ 結果を保存: {output_path}")
    
    print("\n" + "="*60)
    print("テスト完了!")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python test_card_detection.py <画像パス>")
        sys.exit(1)
    
    test_with_image(sys.argv[1])
