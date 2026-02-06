#!/usr/bin/env python3
"""
px_to_mm_ratio 計算スクリプト
実際の弁当箱サイズと画像上のピクセル数から変換係数を算出
"""

import cv2
import numpy as np
from pathlib import Path

def calculate_px_to_mm_ratio():
    """
    テスト画像から px_to_mm_ratio を計算
    """
    print("🔍 px_to_mm_ratio 計算開始...")
    
    # テスト画像を読み込み
    test_images = [
        "/app/test_images_cropped/cropped_bento_1762523798275.jpg",
        "/app/test_images_cropped/cropped_bento_1762523839223.jpg", 
        "/app/test_images_cropped/cropped_bento_1762524617674.jpg"
    ]
    
    # 正解サイズ（ground truth）
    ground_truth = {
        "cropped_bento_1762523798275.jpg": {"width_mm": 150.0, "height_mm": 100.0},
        "cropped_bento_1762523839223.jpg": {"width_mm": 155.0, "height_mm": 105.0},
        "cropped_bento_1762524617674.jpg": {"width_mm": 148.0, "height_mm": 98.0}
    }
    
    ratios = []
    
    for img_path in test_images:
        if not Path(img_path).exists():
            print(f"❌ 画像が見つかりません: {img_path}")
            continue
            
        # 画像読み込み
        image = cv2.imread(img_path)
        if image is None:
            print(f"❌ 画像読み込み失敗: {img_path}")
            continue
            
        filename = Path(img_path).name
        height, width = image.shape[:2]
        
        print(f"\n📷 {filename}")
        print(f"  画像サイズ: {width}px × {height}px")
        
        # 正解データ取得
        gt = ground_truth.get(filename)
        if gt:
            real_width_mm = gt["width_mm"]
            real_height_mm = gt["height_mm"]
            
            # 変換係数計算
            ratio_x = real_width_mm / width
            ratio_y = real_height_mm / height
            avg_ratio = (ratio_x + ratio_y) / 2
            
            print(f"  実際のサイズ: {real_width_mm}mm × {real_height_mm}mm")
            print(f"  X軸変換係数: {ratio_x:.4f} mm/px")
            print(f"  Y軸変換係数: {ratio_y:.4f} mm/px") 
            print(f"  平均変換係数: {avg_ratio:.4f} mm/px")
            
            ratios.append(avg_ratio)
    
    if ratios:
        final_ratio = np.mean(ratios)
        print(f"\n🎯 最終推奨変換係数: {final_ratio:.4f} mm/px")
        print(f"📊 係数の標準偏差: {np.std(ratios):.4f}")
        
        # 検証計算
        print(f"\n✅ 検証例:")
        print(f"  500px × 300px の物体 → {500 * final_ratio:.1f}mm × {300 * final_ratio:.1f}mm")
        
        return final_ratio
    else:
        print("❌ 変換係数を計算できませんでした")
        return 1.0

if __name__ == "__main__":
    ratio = calculate_px_to_mm_ratio()
    print(f"\n💡 detector.py で px_to_mm_ratio = {ratio:.4f} に設定してください")