"""
完全な実験フローの実行例
AIゼミ発表用デモスクリプト
"""

import logging
from pathlib import Path

from detector import BentoBoxDetector
from evaluator import ModelEvaluator
from plot_results import ResultVisualizer
from experiment_metadata import ExperimentMetadata

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_complete_experiment():
    """完全な実験フローを実行"""
    
    print("\n" + "="*70)
    print("🍱 弁当箱検出AI - 研究実験デモ（AIゼミ用）")
    print("="*70 + "\n")
    
    # ============================================================
    # STEP 1: 実験メタデータ作成
    # ============================================================
    print("📋 STEP 1: 実験メタデータ作成中...")
    metadata_mgr = ExperimentMetadata(output_dir="./outputs")
    
    metadata_path = metadata_mgr.generate_metadata(
        experiment_name="弁当箱検出3モード比較実験 v1.0",
        model_name="YOLOv3 + OpenCV",
        confidence_threshold=0.5,
        nms_threshold=0.4,
        remarks="AIゼミ研究発表用・初回実験"
    )
    
    print(f"✅ メタデータ生成完了: {metadata_path}\n")
    
    # ============================================================
    # STEP 2: 検出器初期化
    # ============================================================
    print("🔧 STEP 2: 検出器初期化中...")
    detector = BentoBoxDetector(
        yolo_weights_path=None,  # 実際のパスに変更
        yolo_config_path=None,   # 実際のパスに変更
        confidence_threshold=0.5,
        nms_threshold=0.4,
        output_dir="./outputs"
    )
    print("✅ 検出器初期化完了\n")
    
    # ============================================================
    # STEP 3: 評価実行（3モード比較）
    # ============================================================
    print("🔍 STEP 3: 3モード比較評価開始...")
    print("   - OpenCV単体モード")
    print("   - YOLO単体モード")
    print("   - Hybrid（併用）モード\n")
    
    evaluator = ModelEvaluator(detector, output_dir="./outputs")
    
    # テスト画像フォルダパス（切り取り済み画像を使用）
    test_folder = "./test_images_cropped"
    
    # テストフォルダが存在しない場合の処理
    if not Path(test_folder).exists():
        print(f"⚠️  警告: テストフォルダが見つかりません: {test_folder}")
        print(f"   デモ用画像を配置してから再実行してください。\n")
        return
    
    # モック正解データ（実際の実験では実測値を使用）
    ground_truths = {
        "test1.jpg": [100, 100, 200, 150],
        "test2.jpg": [120, 80, 220, 160],
        "test3.jpg": [110, 90, 210, 155],
    }
    
    try:
        summary = evaluator.evaluate_folder(test_folder, ground_truths)
        print("✅ 評価完了\n")
    except Exception as e:
        logger.error(f"評価エラー: {e}")
        print(f"⚠️  評価中にエラーが発生しました。テスト画像を確認してください。\n")
        return
    
    # ============================================================
    # STEP 4: グラフ生成
    # ============================================================
    print("📊 STEP 4: 結果可視化（グラフ生成）...")
    visualizer = ResultVisualizer(output_dir="./outputs/visualizations")
    
    metrics_csv = Path("./outputs/metrics.csv")
    if metrics_csv.exists():
        visualizer.plot_from_csv(str(metrics_csv))
        print("✅ グラフ生成完了")
        print("   - accuracy_comparison.png")
        print("   - speed_comparison.png")
        print("   - success_rate_comparison.png")
        print("   - comprehensive_comparison.png\n")
    else:
        print("⚠️  メトリクスCSVが見つかりません\n")
    
    # ============================================================
    # STEP 5: メタデータ更新
    # ============================================================
    print("📝 STEP 5: 実験結果でメタデータ更新...")
    metadata_mgr.update_with_results(metadata_path, summary)
    print("✅ メタデータ更新完了\n")
    
    # ============================================================
    # STEP 6: レポート生成
    # ============================================================
    print("📄 STEP 6: 実験レポート生成...")
    report_path = metadata_mgr.generate_experiment_report(
        metadata_path,
        output_format='markdown'
    )
    print(f"✅ レポート生成完了: {report_path}\n")
    
    # ============================================================
    # 完了サマリー
    # ============================================================
    print("\n" + "="*70)
    print("🎉 実験完了！")
    print("="*70)
    print("\n📁 出力ファイル:")
    print(f"   - メトリクス: outputs/metrics.csv")
    print(f"   - サマリー: outputs/evaluation_summary.json")
    print(f"   - ログ: outputs/logs/")
    print(f"   - グラフ: outputs/visualizations/")
    print(f"   - メタデータ: {metadata_path}")
    print(f"   - レポート: {report_path}")
    print("\n💡 次のステップ:")
    print("   1. outputs/visualizations/ のグラフを確認")
    print("   2. outputs/metrics.csv でモード間の数値比較")
    print("   3. experiment_report.md を AIゼミ発表資料に活用")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    run_complete_experiment()
