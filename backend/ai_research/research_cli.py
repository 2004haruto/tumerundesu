"""
研究用CLIツール
OpenCV単体・YOLO単体・ハイブリッドの3モード比較実験
ターミナルでのみ実行
"""

import argparse
import sys
from pathlib import Path
import logging
import json
import re
from datetime import datetime

from detector import BentoBoxDetector
from evaluator import ModelEvaluator
from plot_results import ResultVisualizer
from experiment_metadata import ExperimentMetadata

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_experiment_counter(output_dir: str = "./outputs"):
    """
    実験カウンターを管理するファイルから次の実験番号を取得
    
    Args:
        output_dir: 出力ディレクトリ
        
    Returns:
        int: 次の実験番号
    """
    counter_file = Path(output_dir) / "experiment_counter.json"
    
    # カウンターファイルが存在しない場合は初期化
    if not counter_file.exists():
        counter_data = {"last_experiment_number": 0, "experiments": []}
        counter_file.parent.mkdir(parents=True, exist_ok=True)
        with open(counter_file, 'w', encoding='utf-8') as f:
            json.dump(counter_data, f, ensure_ascii=False, indent=2)
        return 1
    
    # カウンターファイルを読み込み
    try:
        with open(counter_file, 'r', encoding='utf-8') as f:
            counter_data = json.load(f)
        return counter_data.get("last_experiment_number", 0) + 1
    except (json.JSONDecodeError, FileNotFoundError):
        return 1


def update_experiment_counter(experiment_number: int, experiment_name: str, output_dir: str = "./outputs"):
    """
    実験カウンターを更新
    
    Args:
        experiment_number: 実験番号
        experiment_name: 実験名
        output_dir: 出力ディレクトリ
    """
    counter_file = Path(output_dir) / "experiment_counter.json"
    
    # 既存データを読み込み
    try:
        with open(counter_file, 'r', encoding='utf-8') as f:
            counter_data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        counter_data = {"last_experiment_number": 0, "experiments": []}
    
    # 新しい実験情報を追加
    counter_data["last_experiment_number"] = experiment_number
    counter_data["experiments"].append({
        "number": experiment_number,
        "name": experiment_name,
        "timestamp": datetime.now().isoformat(),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    # ファイルに書き込み
    with open(counter_file, 'w', encoding='utf-8') as f:
        json.dump(counter_data, f, ensure_ascii=False, indent=2)


def create_numbered_output_dir(base_dir: str, experiment_number: int, experiment_name: str):
    """
    実験番号付きの出力ディレクトリを作成
    
    Args:
        base_dir: ベースディレクトリ
        experiment_number: 実験番号
        experiment_name: 実験名
        
    Returns:
        str: 作成された出力ディレクトリパス
    """
    # 実験名から無効な文字を削除
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', experiment_name)
    safe_name = safe_name.strip()
    
    # 実験番号付きディレクトリ名を作成
    dir_name = f"experiment_{experiment_number:03d}_{safe_name}"
    output_path = Path(base_dir) / dir_name
    
    # ディレクトリを作成
    output_path.mkdir(parents=True, exist_ok=True)
    (output_path / "logs").mkdir(exist_ok=True)
    (output_path / "visualizations").mkdir(exist_ok=True)
    
    return str(output_path)


def calculate_px_to_mm_ratio(bento_width_mm: float, bento_height_mm: float, image_folder: str):
    """
    実際の弁当サイズと画像サイズから変換係数を自動計算
    
    Args:
        bento_width_mm: 実際の弁当幅（mm）
        bento_height_mm: 実際の弁当奥行き（mm）
        image_folder: 画像フォルダパス
        
    Returns:
        float: 計算されたpx_to_mm_ratio
    """
    import cv2
    
    # 画像ファイル一覧を取得
    image_folder_path = Path(image_folder)
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp')
    image_files = [f for f in image_folder_path.glob('*') 
                  if f.suffix.lower() in supported_formats]
    
    if not image_files:
        logger.warning("画像が見つかりません。デフォルト値を使用します。")
        return 0.1862  # デフォルト値
    
    # 複数画像の平均を計算
    ratios = []
    for image_file in image_files:
        try:
            image = cv2.imread(str(image_file))
            if image is None:
                continue
                
            height_px, width_px = image.shape[:2]
            
            # px_to_mm_ratioを計算
            width_ratio = bento_width_mm / width_px
            height_ratio = bento_height_mm / height_px
            
            # 幅と高さの平均を取る
            avg_ratio = (width_ratio + height_ratio) / 2
            ratios.append(avg_ratio)
            
            logger.info(f"{image_file.name}: {width_px}x{height_px}px → {width_ratio:.4f}, {height_ratio:.4f} mm/px")
            
        except Exception as e:
            logger.warning(f"画像処理エラー {image_file.name}: {e}")
            continue
    
    if not ratios:
        logger.error("有効な画像がありませんでした。デフォルト値を使用します。")
        return 0.1862
    
    # 平均値を計算
    final_ratio = sum(ratios) / len(ratios)
    std_dev = (sum((r - final_ratio) ** 2 for r in ratios) / len(ratios)) ** 0.5
    
    logger.info(f"計算された変換係数: {final_ratio:.4f} mm/px")
    logger.info(f"標準偏差: {std_dev:.4f}")
    logger.info(f"サンプル数: {len(ratios)}枚")
    
    return final_ratio


def create_dynamic_ground_truth(bento_width_mm: float, bento_height_mm: float, image_folder: str):
    """
    指定された弁当サイズで動的にground_truth.jsonを生成
    
    Args:
        bento_width_mm: 弁当箱の幅（mm）
        bento_height_mm: 弁当箱の奥行き（mm）
        image_folder: 画像フォルダパス
        
    Returns:
        str: 生成されたground_truth.jsonのパス
    """
    # 画像ファイル一覧を取得
    image_folder_path = Path(image_folder)
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp')
    image_files = [f for f in image_folder_path.glob('*') 
                  if f.suffix.lower() in supported_formats]
    
    # ground_truth.jsonを生成
    ground_truth_data = {}
    for i, image_file in enumerate(image_files, 1):
        ground_truth_data[image_file.name] = {
            "width_mm": float(bento_width_mm),
            "height_mm": float(bento_height_mm), 
            "description": f"切り取り済み弁当画像{i} - 動的生成（{bento_width_mm}×{bento_height_mm}mm）"
        }
    
    # ground_truth.jsonファイルパス
    ground_truth_path = "ground_truth.json"
    
    # 既存ファイルがあればバックアップ
    if Path(ground_truth_path).exists():
        backup_path = f"ground_truth_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        Path(ground_truth_path).rename(backup_path)
        logger.info(f"既存のground_truth.jsonをバックアップ: {backup_path}")
    
    # 新しいground_truth.jsonを保存
    with open(ground_truth_path, 'w', encoding='utf-8') as f:
        json.dump(ground_truth_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"動的ground_truth.json生成: {bento_width_mm}×{bento_height_mm}mm")
    logger.info(f"対象画像数: {len(image_files)}枚")
    
    return ground_truth_path


def print_banner():
    """バナー表示"""
    print("\n" + "=" * 70)
    print("🔬 弁当箱検出AI - 研究用比較実験ツール")
    print("=" * 70)
    print("📊 3モード比較: OpenCV単体 | YOLO単体 | ハイブリッド")
    print("=" * 70 + "\n")


def run_comparison_experiment(
    folder_path: str,
    yolo_weights: str = None,
    yolo_config: str = None,
    confidence_threshold: float = 0.5,
    generate_graphs: bool = True,
    experiment_name: str = "Comparison Experiment",
    px_to_mm_ratio: float = 0.1862
):
    """
    3モード比較実験を実行
    
    Args:
        folder_path: テスト画像フォルダ
        yolo_weights: YOLOモデルweightsパス
        yolo_config: YOLOモデル設定パス
        confidence_threshold: 信頼度閾値
        generate_graphs: グラフ生成フラグ
        experiment_name: 実験名
        px_to_mm_ratio: ピクセル→mm変換係数
    """
    print_banner()
    
    # 0. 実験番号を取得して出力ディレクトリを作成
    experiment_number = get_experiment_counter()
    numbered_output_dir = create_numbered_output_dir("./outputs", experiment_number, experiment_name)
    
    print(f"🔢 実験番号: {experiment_number}")
    print(f"📁 出力先: {numbered_output_dir}")
    print()
    
    # 1. 実験メタデータ生成
    print("📋 STEP 1: 実験メタデータ生成...")
    metadata_mgr = ExperimentMetadata(output_dir=numbered_output_dir)
    metadata_path = metadata_mgr.generate_metadata(
        experiment_name=f"#{experiment_number:03d} - {experiment_name}",
        model_name="YOLOv3 + OpenCV",
        confidence_threshold=confidence_threshold,
        remarks="研究用3モード比較実験（CLI）"
    )
    print(f"✅ メタデータ: {metadata_path}\n")
    
    # 2. 検出器初期化
    print("🔧 STEP 2: 検出器初期化...")
    
    # YOLOモデルのパスを設定（None の場合はデフォルトモデルを使用）
    if yolo_weights is None:
        yolo_weights = 'yolov8n.pt'  # デフォルトモデル
    
    detector = BentoBoxDetector(
        yolo_weights_path=yolo_weights,
        yolo_config_path=yolo_config,
        confidence_threshold=confidence_threshold,
        output_dir=numbered_output_dir,
        px_to_mm_ratio=px_to_mm_ratio,  # デフォルト値(自動キャリブレーション失敗時用)
        enable_auto_calibration=True,  # 参照カードによる自動キャリブレーションを有効化
        card_type='custom_card'  # カードタイプ
    )
    print("✅ 初期化完了（自動キャリブレーション有効）\n")
    
    # 3. 評価実行
    print("🔍 STEP 3: 3モード比較評価開始...")
    print("-" * 70)
    evaluator = ModelEvaluator(detector, output_dir=numbered_output_dir)
    
    try:
        summary = evaluator.evaluate_folder(folder_path)
    except Exception as e:
        logger.error(f"評価エラー: {e}")
        print(f"\n❌ 評価に失敗しました: {e}")
        sys.exit(1)
    
    print("-" * 70)
    print("✅ 評価完了\n")
    
    # 4. 結果表示
    print("📊 STEP 4: 結果サマリー")
    print("=" * 70)
    
    if summary and 'modes' in summary:
        for mode, metrics in summary['modes'].items():
            print(f"\n【{mode.upper()}モード】")
            print(f"  成功率:       {metrics['success_rate'] * 100:.1f}%")
            print(f"  平均誤差:     {metrics['avg_error_mm']:.2f} mm")
            print(f"  平均推論時間: {metrics['avg_inference_time_ms']:.2f} ms")
            print(f"  平均信頼度:   {metrics['avg_confidence'] * 100:.1f}%")
    
    print("\n" + "=" * 70)
    
    # 5. グラフ生成
    if generate_graphs:
        print("\n📈 STEP 5: グラフ生成...")
        visualizer = ResultVisualizer(output_dir=f"{numbered_output_dir}/visualizations")
        
        metrics_csv = Path(f"{numbered_output_dir}/metrics.csv")
        if metrics_csv.exists():
            visualizer.plot_from_csv(str(metrics_csv))
            print("✅ グラフ生成完了")
            print("  - accuracy_comparison.png")
            print("  - speed_comparison.png")
            print("  - success_rate_comparison.png")
            print("  - comprehensive_comparison.png")
    
    # 6. メタデータ更新
    print("\n📝 STEP 6: メタデータ更新...")
    metadata_mgr.update_with_results(metadata_path, summary)
    print("✅ 更新完了\n")
    
    # 7. 実験カウンター更新
    update_experiment_counter(experiment_number, experiment_name)
    
    # 完了
    print("=" * 70)
    print("🎉 実験完了！")
    print("=" * 70)
    print(f"\n📁 実験 #{experiment_number:03d} の出力ファイル:")
    print(f"  - メトリクス:     {numbered_output_dir}/metrics.csv")
    print(f"  - サマリー:       {numbered_output_dir}/evaluation_summary.json")
    print(f"  - ログ:          {numbered_output_dir}/logs/")
    print(f"  - グラフ:        {numbered_output_dir}/visualizations/")
    print(f"  - メタデータ:    {metadata_path}")
    print(f"\n📊 実験履歴は './outputs/experiment_counter.json' で確認できます")
    print("\n" + "=" * 70 + "\n")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="弁当箱検出AI - 3モード比較実験ツール（研究用）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # 基本的な使用（デフォルトで./test_images_croppedを使用）
  python research_cli.py
  
  # カスタムフォルダを指定
  python research_cli.py --folder ./test_images_cropped
  
  # YOLOモデルを指定
  python research_cli.py --folder ./test_images_cropped \\
      --yolo-weights ./models/yolov3.weights \\
      --yolo-config ./models/yolov3.cfg
  
  # 信頼度閾値を変更
  python research_cli.py --confidence 0.7
  
  # グラフ生成をスキップ
  python research_cli.py --no-graphs

注意:
  - 研究用実験には切り取り済み画像（test_images_cropped）を使用
  - OpenCV単体とYOLO単体の比較はこのCLIツールでのみ実行
  - アプリ（FastAPI）はハイブリッドモードのみ使用
        """
    )
    
    parser.add_argument(
        '--folder',
        type=str,
        default='./test_images_cropped',
        help='テスト画像フォルダパス（デフォルト: ./test_images_cropped）'
    )
    
    parser.add_argument(
        '--yolo-weights',
        type=str,
        default=None,
        help='YOLOモデルweightsファイルパス（オプション）'
    )
    
    parser.add_argument(
        '--yolo-config',
        type=str,
        default=None,
        help='YOLOモデル設定ファイルパス（オプション）'
    )
    
    parser.add_argument(
        '--confidence',
        type=float,
        default=0.5,
        help='信頼度閾値（デフォルト: 0.5）'
    )
    
    parser.add_argument(
        '--no-graphs',
        action='store_true',
        help='グラフ生成をスキップ'
    )
    
    parser.add_argument(
        '--experiment-name',
        type=str,
        default="3-Mode Comparison Experiment",
        help='実験名（デフォルト: "3-Mode Comparison Experiment"）'
    )
    
    parser.add_argument(
        '--bento-width',
        type=float,
        default=185.0,
        help='弁当箱の幅（mm）（デフォルト: 185.0）'
    )
    
    parser.add_argument(
        '--bento-height',
        type=float,
        default=110.0,
        help='弁当箱の奥行き（mm）（デフォルト: 110.0）'
    )
    
    args = parser.parse_args()
    
    # フォルダ存在確認
    folder = Path(args.folder)
    if not folder.exists():
        print(f"❌ エラー: フォルダが見つかりません: {args.folder}")
        sys.exit(1)
    
    # ground_truth.json確認
    ground_truth_path = "ground_truth.json"
    if not Path(ground_truth_path).exists():
        # 存在しない場合のみ動的生成
        print(f"\n📏 ground_truth.jsonが存在しないため、動的生成します")
        print(f"   弁当サイズ設定: {args.bento_width}mm × {args.bento_height}mm")
        ground_truth_path = create_dynamic_ground_truth(
            bento_width_mm=args.bento_width,
            bento_height_mm=args.bento_height,
            image_folder=args.folder
        )
    else:
        print(f"\n✅ 既存のground_truth.jsonを使用します")
        print(f"   ※上書きしたい場合は、ファイルを削除してから実行してください")
    
    # px_to_mm_ratio自動計算
    print("📐 変換係数を自動計算中...")
    px_to_mm_ratio = calculate_px_to_mm_ratio(
        bento_width_mm=args.bento_width,
        bento_height_mm=args.bento_height,
        image_folder=args.folder
    )
    print(f"✅ 計算完了: {px_to_mm_ratio:.4f} mm/px\n")
    
    # 実験実行
    run_comparison_experiment(
        folder_path=args.folder,
        yolo_weights=args.yolo_weights,
        yolo_config=args.yolo_config,
        confidence_threshold=args.confidence,
        generate_graphs=not args.no_graphs,
        experiment_name=args.experiment_name,
        px_to_mm_ratio=px_to_mm_ratio
    )


if __name__ == "__main__":
    main()
