"""
検出モデル評価モジュール
3モード（OpenCV/YOLO/Hybrid）の精度・速度を比較
"""

import csv
import json
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
from dataclasses import dataclass, asdict
import logging

from detector import BentoBoxDetector, DetectionMode, DetectionResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EvaluationMetrics:
    """評価メトリクスデータクラス"""
    mode: DetectionMode
    total_images: int
    success_count: int
    success_rate: float
    avg_inference_time_ms: float
    avg_error_mm: float
    std_error_mm: float
    min_error_mm: float
    max_error_mm: float
    avg_confidence: float


class ModelEvaluator:
    """モデル評価クラス"""
    
    def __init__(
        self, 
        detector: BentoBoxDetector,
        output_dir: str = "./outputs",
        ground_truth_path: str = "./ground_truth.json"
    ):
        """
        初期化
        
        Args:
            detector: BentoBoxDetectorインスタンス
            output_dir: 出力ディレクトリ
            ground_truth_path: 正解データファイルパス
        """
        self.detector = detector
        self.output_dir = Path(output_dir)
        self.ground_truth = self._load_ground_truth(ground_truth_path)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_ground_truth(self, ground_truth_path: str) -> Dict:
        """
        正解データを読み込み
        
        Args:
            ground_truth_path: 正解データファイルパス
            
        Returns:
            正解データ辞書
        """
        try:
            gt_path = Path(ground_truth_path)
            if gt_path.exists():
                with open(gt_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"正解データファイルが見つかりません: {ground_truth_path}")
                return {}
        except Exception as e:
            logger.error(f"正解データ読み込みエラー: {e}")
            return {}
        
    def evaluate_single_mode(
        self,
        image_paths: List[str],
        mode: DetectionMode,
        ground_truths: Optional[Dict[str, List[int]]] = None
    ) -> EvaluationMetrics:
        """
        単一モードでの評価
        
        Args:
            image_paths: 評価画像パスのリスト
            mode: 検出モード
            ground_truths: 正解データ {filename: [x, y, w, h]}
            
        Returns:
            EvaluationMetrics: 評価メトリクス
        """
        results: List[DetectionResult] = []
        
        logger.info(f"{mode}モードで評価開始 ({len(image_paths)}枚)")
        
        for img_path in image_paths:
            try:
                filename = Path(img_path).name
                gt = self.ground_truth.get(filename) if self.ground_truth else None
                
                result = self.detector.detect(img_path, mode=mode, ground_truth=gt)
                results.append(result)
                
            except Exception as e:
                logger.error(f"エラー ({img_path}): {e}")
        
        # メトリクス計算
        metrics = self._calculate_metrics(results, mode)
        
        logger.info(f"{mode}モード評価完了")
        logger.info(f"  成功率: {metrics.success_rate:.2%}")
        logger.info(f"  平均推論時間: {metrics.avg_inference_time_ms:.2f}ms")
        logger.info(f"  平均誤差: {metrics.avg_error_mm:.2f}mm")
        
        return metrics
    
    def compare_all_modes(
        self,
        image_paths: List[str],
        ground_truths: Optional[Dict[str, List[int]]] = None,
        output_csv: str = "metrics.csv"
    ) -> Dict[DetectionMode, EvaluationMetrics]:
        """
        全モードを比較評価
        
        Args:
            image_paths: 評価画像パスのリスト
            ground_truths: 正解データ
            output_csv: 出力CSVファイル名
            
        Returns:
            各モードの評価メトリクス辞書
        """
        modes: List[DetectionMode] = ["opencv", "yolo", "hybrid"]
        all_metrics: Dict[DetectionMode, EvaluationMetrics] = {}
        
        logger.info("=" * 60)
        logger.info("全モード比較評価開始")
        logger.info("=" * 60)
        
        for mode in modes:
            metrics = self.evaluate_single_mode(image_paths, mode, ground_truths)
            all_metrics[mode] = metrics
        
        # CSV出力
        self._save_metrics_csv(all_metrics, output_csv)
        
        # 比較レポート表示
        self._print_comparison_report(all_metrics)
        
        return all_metrics
    
    def evaluate_folder(
        self,
        folder_path: str,
        ground_truths: Optional[Dict[str, List[int]]] = None
    ) -> Dict[str, any]:
        """
        フォルダ内の全画像を評価
        
        Args:
            folder_path: 画像フォルダパス
            ground_truths: 正解データ
            
        Returns:
            評価結果サマリー
        """
        folder = Path(folder_path)
        
        # 画像ファイルを収集
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        image_paths = [
            str(p) for p in folder.iterdir()
            if p.suffix.lower() in image_extensions
        ]
        
        if not image_paths:
            logger.warning(f"画像が見つかりませんでした: {folder_path}")
            return {}
        
        logger.info(f"評価画像数: {len(image_paths)}枚")
        
        # 全モード比較
        all_metrics = self.compare_all_modes(image_paths, ground_truths)
        
        # サマリー作成
        summary = {
            "total_images": len(image_paths),
            "folder": str(folder_path),
            "modes": {
                mode: asdict(metrics)
                for mode, metrics in all_metrics.items()
            }
        }
        
        # JSON保存
        summary_file = self.output_dir / "evaluation_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        logger.info(f"評価サマリー保存: {summary_file}")
        
        return summary
    
    def _calculate_metrics(
        self, 
        results: List[DetectionResult],
        mode: DetectionMode
    ) -> EvaluationMetrics:
        """評価メトリクスを計算"""
        if not results:
            return EvaluationMetrics(
                mode=mode,
                total_images=0,
                success_count=0,
                success_rate=0.0,
                avg_inference_time_ms=0.0,
                avg_error_mm=0.0,
                std_error_mm=0.0,
                min_error_mm=0.0,
                max_error_mm=0.0,
                avg_confidence=0.0
            )
        
        success_results = [r for r in results if r.success]
        
        inference_times = [r.inference_time_ms for r in results]
        errors = [r.error_mm for r in results if r.error_mm > 0]
        confidences = [r.confidence for r in results]
        
        return EvaluationMetrics(
            mode=mode,
            total_images=len(results),
            success_count=len(success_results),
            success_rate=len(success_results) / len(results),
            avg_inference_time_ms=float(np.mean(inference_times)),
            avg_error_mm=float(np.mean(errors)) if errors else 0.0,
            std_error_mm=float(np.std(errors)) if errors else 0.0,
            min_error_mm=float(np.min(errors)) if errors else 0.0,
            max_error_mm=float(np.max(errors)) if errors else 0.0,
            avg_confidence=float(np.mean(confidences))
        )
    
    def _save_metrics_csv(
        self, 
        all_metrics: Dict[DetectionMode, EvaluationMetrics],
        filename: str
    ) -> None:
        """メトリクスをCSV保存"""
        csv_path = self.output_dir / filename
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = [
                'mode', 'total_images', 'success_count', 'success_rate',
                'avg_inference_time_ms', 'avg_error_mm', 'std_error_mm',
                'min_error_mm', 'max_error_mm', 'avg_confidence'
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            writer.writeheader()
            for metrics in all_metrics.values():
                writer.writerow(asdict(metrics))
        
        logger.info(f"メトリクスCSV保存: {csv_path}")
    
    def _print_comparison_report(
        self, 
        all_metrics: Dict[DetectionMode, EvaluationMetrics]
    ) -> None:
        """比較レポートを表示"""
        print("\n" + "=" * 70)
        print("【モード比較レポート】")
        print("=" * 70)
        
        # ヘッダー
        print(f"{'モード':<12} {'成功率':<10} {'平均誤差(mm)':<15} {'平均時間(ms)':<15} {'信頼度':<10}")
        print("-" * 70)
        
        # 各モードの結果
        for mode, metrics in all_metrics.items():
            print(
                f"{mode:<12} "
                f"{metrics.success_rate:>8.1%}  "
                f"{metrics.avg_error_mm:>12.2f}  "
                f"{metrics.avg_inference_time_ms:>12.2f}  "
                f"{metrics.avg_confidence:>8.2f}"
            )
        
        print("=" * 70)
        
        # ベストモード判定
        best_accuracy = min(all_metrics.items(), key=lambda x: x[1].avg_error_mm)
        best_speed = min(all_metrics.items(), key=lambda x: x[1].avg_inference_time_ms)
        best_success = max(all_metrics.items(), key=lambda x: x[1].success_rate)
        
        print(f"\n【総合評価】")
        print(f"  最高精度: {best_accuracy[0]} ({best_accuracy[1].avg_error_mm:.2f}mm)")
        print(f"  最高速度: {best_speed[0]} ({best_speed[1].avg_inference_time_ms:.2f}ms)")
        print(f"  最高成功率: {best_success[0]} ({best_success[1].success_rate:.1%})")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    # テスト実行
    detector = BentoBoxDetector(
        confidence_threshold=0.5,
        output_dir="./outputs"
    )
    
    evaluator = ModelEvaluator(detector)
    
    # テスト画像フォルダで評価（切り取り済み画像を使用）
    test_folder = "./test_images_cropped"
    
    # モックの正解データ
    ground_truths = {
        "test1.jpg": [100, 100, 200, 150],
        "test2.jpg": [120, 80, 220, 160],
    }
    
    try:
        summary = evaluator.evaluate_folder(test_folder, ground_truths)
        print("\n評価完了！")
    except Exception as e:
        print(f"評価エラー: {e}")
