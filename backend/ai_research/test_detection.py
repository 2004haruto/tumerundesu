"""
弁当箱AI検出 - 動作確認スクリプト
3モードの動作を簡易テスト
"""

import cv2
import numpy as np
import time
from pathlib import Path
from detector import BentoBoxDetector

def create_test_image(filename: str = "test_bento.jpg", size: tuple = (640, 480)):
    """テスト用の弁当箱画像を生成"""
    # 白背景
    image = np.ones((size[1], size[0], 3), dtype=np.uint8) * 255
    
    # 弁当箱を描画（茶色の矩形）
    center_x, center_y = size[0] // 2, size[1] // 2
    box_w, box_h = 200, 150
    x1, y1 = center_x - box_w // 2, center_y - box_h // 2
    x2, y2 = center_x + box_w // 2, center_y + box_h // 2
    
    # 弁当箱本体
    cv2.rectangle(image, (x1, y1), (x2, y2), (139, 90, 43), -1)
    
    # 縁取り
    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 0), 3)
    
    # 仕切り
    cv2.line(image, (center_x, y1), (center_x, y2), (0, 0, 0), 2)
    
    # 画像保存
    cv2.imwrite(filename, image)
    print(f"✅ テスト画像を生成しました: {filename}")
    return filename


def test_detection_modes():
    """3モードの検出をテスト"""
    print("\n" + "="*60)
    print("🍱 弁当箱AI検出 - 動作確認")
    print("="*60 + "\n")
    
    # テスト画像生成
    test_image = create_test_image()
    
    # 検出器初期化
    print("🔧 検出器を初期化中...")
    detector = BentoBoxDetector(
        yolo_weights_path=None,  # YOLOなしでもOpenCVモードはテスト可能
        yolo_config_path=None,
        confidence_threshold=0.5,
        output_dir="./test_outputs",
        px_to_mm_ratio=1.0
    )
    print("✅ 検出器を初期化しました\n")
    
    # 各モードでテスト
    modes = ["opencv"]
    
    # YOLOが利用可能か確認
    if detector.yolo_net is not None:
        modes.extend(["yolo", "hybrid"])
        print("✅ YOLOモデルが読み込まれています（3モード全て利用可能）\n")
    else:
        print("⚠️  YOLOモデルが見つかりません（OpenCV単体モードのみ）\n")
    
    results = {}
    
    for mode in modes:
        print(f"🔍 {mode.upper()}モードでテスト中...")
        try:
            start_time = time.time()
            result = detector.detect(test_image, mode=mode)
            elapsed = (time.time() - start_time) * 1000
            
            results[mode] = result
            
            print(f"   ✅ 検出完了")
            print(f"   - 成功: {'✓' if result.success else '✗'}")
            print(f"   - 信頼度: {result.confidence:.2f}")
            print(f"   - 推論時間: {result.inference_time_ms:.1f}ms")
            print(f"   - 全体処理時間: {elapsed:.1f}ms")
            if result.bbox:
                bbox = result.bbox
                print(f"   - bbox: x={bbox['x']}, y={bbox['y']}, w={bbox['width']}, h={bbox['height']}")
                print(f"   - サイズ: {bbox['width_mm']:.1f}mm × {bbox['height_mm']:.1f}mm")
            print()
            
        except Exception as e:
            print(f"   ❌ エラー: {e}\n")
            results[mode] = None
    
    # 結果サマリー
    print("="*60)
    print("📊 テスト結果サマリー")
    print("="*60)
    
    if len(results) > 1:
        print("\nモード別比較:")
        print(f"{'モード':<10} {'成功':<6} {'信頼度':<10} {'推論時間':<12}")
        print("-" * 50)
        
        for mode, result in results.items():
            if result:
                success = "✓" if result.success else "✗"
                conf = f"{result.confidence:.2f}"
                time_ms = f"{result.inference_time_ms:.1f}ms"
                print(f"{mode.upper():<10} {success:<6} {conf:<10} {time_ms:<12}")
    
    print("\n✅ 動作確認が完了しました")
    print(f"   テスト画像: {test_image}")
    print(f"   ログ: ./test_outputs/logs/")
    print("\n📖 詳細な使い方は DETECTION_GUIDE.md を参照してください\n")


if __name__ == "__main__":
    try:
        test_detection_modes()
    except KeyboardInterrupt:
        print("\n\n⚠️  テストを中断しました")
    except Exception as e:
        print(f"\n❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
