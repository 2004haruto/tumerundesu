#!/usr/bin/env python3
"""
画像前処理CLI
test_images内の画像を自動的に切り取り、test_images_croppedに保存
"""

import argparse
from pathlib import Path
import logging
from image_preprocessor import ImagePreprocessor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    parser = argparse.ArgumentParser(
        description='お弁当箱画像の前処理（切り取り・補正）'
    )
    parser.add_argument(
        '--input',
        type=str,
        default='./test_images',
        help='入力ディレクトリ（デフォルト: ./test_images）'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='./test_images_cropped',
        help='出力ディレクトリ（デフォルト: ./test_images_cropped）'
    )
    parser.add_argument(
        '--pattern',
        type=str,
        default='*.jpg',
        help='処理するファイルパターン（デフォルト: *.jpg）'
    )
    parser.add_argument(
        '--no-detect',
        action='store_true',
        help='お弁当箱検出を無効化（画像中央を基準に切り取り）'
    )
    parser.add_argument(
        '--no-enhance',
        action='store_true',
        help='画質向上処理を無効化'
    )
    parser.add_argument(
        '--ratio',
        type=float,
        default=0.8,
        help='切り取り比率（デフォルト: 0.8）'
    )
    parser.add_argument(
        '--aspect',
        type=float,
        default=4/3,
        help='アスペクト比（横/縦、デフォルト: 1.333）'
    )
    
    args = parser.parse_args()
    
    # 前処理器を初期化
    preprocessor = ImagePreprocessor(
        target_ratio=args.ratio,
        aspect_ratio=args.aspect
    )
    
    input_dir = Path(args.input)
    output_dir = Path(args.output)
    
    if not input_dir.exists():
        print(f"❌ エラー: {input_dir} が見つかりません")
        return 1
    
    print("=" * 60)
    print("🍱 お弁当箱画像前処理ツール")
    print("=" * 60)
    print(f"📁 入力: {input_dir}")
    print(f"📁 出力: {output_dir}")
    print(f"🔍 パターン: {args.pattern}")
    print(f"🎯 お弁当検出: {'無効' if args.no_detect else '有効'}")
    print(f"✨ 画質向上: {'無効' if args.no_enhance else '有効'}")
    print(f"📐 切り取り比率: {args.ratio}")
    print(f"📏 アスペクト比: {args.aspect:.3f}")
    print("=" * 60)
    
    # 一括処理実行
    summary = preprocessor.batch_process(
        input_dir,
        output_dir,
        pattern=args.pattern,
        detect_bento=not args.no_detect,
        enhance=not args.no_enhance
    )
    
    print("\n" + "=" * 60)
    print("📊 処理結果")
    print("=" * 60)
    print(f"✅ 成功: {summary['processed']}")
    print(f"❌ 失敗: {summary['failed']}")
    print(f"📦 合計: {summary['total']}")
    print("=" * 60)
    
    if summary['failed'] > 0:
        print("\n⚠️  失敗した画像:")
        for result in summary['results']:
            if result['status'] == 'error':
                print(f"  - {result['input_path']}: {result['error']}")
    
    print(f"\n✅ 処理済み画像が {output_dir} に保存されました")
    
    return 0

if __name__ == "__main__":
    exit(main())
