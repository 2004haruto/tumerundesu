#!/usr/bin/env python3
"""
YOLO動作テストスクリプト
"""

try:
    print("🔍 YOLOモデルテスト開始...")
    
    # 1. ultralytics import テスト
    from ultralytics import YOLO
    print("✅ ultralytics インポート成功")
    
    # 2. YOLOモデル初期化テスト
    model = YOLO('yolov8n.pt')
    print("✅ YOLOv8モデル初期化成功")
    
    # 3. モデル情報表示
    print(f"📋 モデル情報: {model.info()}")
    
    # 4. テスト画像で推論
    import cv2
    import numpy as np
    
    # テスト用の簡単な画像を作成
    test_img = np.zeros((640, 640, 3), dtype=np.uint8)
    cv2.rectangle(test_img, (100, 100), (300, 300), (255, 255, 255), -1)
    
    results = model(test_img, verbose=False)
    print(f"✅ 推論テスト成功 - 検出数: {len(results[0].boxes) if results[0].boxes is not None else 0}")
    
    print("🎉 YOLOテスト完了 - 全て正常")
    
except Exception as e:
    print(f"❌ エラー発生: {e}")
    import traceback
    traceback.print_exc()