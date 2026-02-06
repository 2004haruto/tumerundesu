"""
実験メタデータ管理モジュール
experiment_meta.yaml の自動生成
"""

import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExperimentMetadata:
    """実験メタデータクラス"""
    
    def __init__(self, output_dir: str = "./outputs"):
        """
        初期化
        
        Args:
            output_dir: 出力ディレクトリ
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_metadata(
        self,
        experiment_name: str,
        model_name: str = "YOLOv3",
        confidence_threshold: float = 0.5,
        nms_threshold: float = 0.4,
        dataset_info: Optional[Dict[str, Any]] = None,
        shooting_conditions: Optional[Dict[str, Any]] = None,
        remarks: str = "",
        output_filename: str = "experiment_meta.yaml"
    ) -> str:
        """
        実験メタデータを生成してYAMLファイルに保存
        
        Args:
            experiment_name: 実験名
            model_name: モデル名
            confidence_threshold: 信頼度閾値
            nms_threshold: NMS閾値
            dataset_info: データセット情報
            shooting_conditions: 撮影条件
            remarks: 備考
            output_filename: 出力ファイル名
            
        Returns:
            保存したファイルパス
        """
        # メタデータ構造
        metadata = {
            'experiment': {
                'name': experiment_name,
                'date': datetime.now().isoformat(),
                'researcher': 'AI Seminar Team',
                'purpose': '弁当箱検出AIの精度・速度比較実験'
            },
            'model': {
                'name': model_name,
                'framework': 'OpenCV DNN + YOLO',
                'version': '3.0',
                'input_size': [416, 416],
                'detection_modes': ['opencv', 'yolo', 'hybrid']
            },
            'hyperparameters': {
                'confidence_threshold': confidence_threshold,
                'nms_threshold': nms_threshold,
                'learning_rate': None,  # 推論のみなのでNone
                'batch_size': 1
            },
            'dataset': dataset_info or {
                'name': 'Bento Box Dataset',
                'total_images': 0,
                'train_split': 0.0,
                'val_split': 0.0,
                'test_split': 1.0,
                'classes': ['bento_box'],
                'annotation_format': 'bbox'
            },
            'shooting_conditions': shooting_conditions or {
                'camera': 'Standard RGB Camera',
                'resolution': '640x480',
                'lighting': 'Indoor Fluorescent',
                'distance_cm': 30,
                'angle_degrees': 45,
                'background': 'Table Surface'
            },
            'evaluation_metrics': {
                'primary': 'average_error_mm',
                'secondary': ['inference_time_ms', 'success_rate', 'confidence'],
                'comparison_modes': ['opencv', 'yolo', 'hybrid']
            },
            'environment': {
                'os': 'Windows/Linux',
                'python_version': '3.9+',
                'opencv_version': '4.8+',
                'gpu': 'Optional (CPU mode available)'
            },
            'output': {
                'logs_dir': './outputs/logs',
                'visualizations_dir': './outputs/visualizations',
                'metrics_csv': './outputs/metrics.csv',
                'summary_json': './outputs/evaluation_summary.json'
            },
            'remarks': remarks or 'AIゼミ研究用・3モード比較実験'
        }
        
        # YAML保存
        output_path = self.output_dir / output_filename
        
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(
                metadata, 
                f, 
                allow_unicode=True, 
                default_flow_style=False,
                sort_keys=False,
                indent=2
            )
        
        logger.info(f"実験メタデータ保存: {output_path}")
        
        return str(output_path)
    
    def load_metadata(self, filepath: str) -> Dict[str, Any]:
        """
        YAMLメタデータを読み込み
        
        Args:
            filepath: YAMLファイルパス
            
        Returns:
            メタデータ辞書
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            metadata = yaml.safe_load(f)
        
        logger.info(f"メタデータ読み込み: {filepath}")
        
        return metadata
    
    def update_with_results(
        self, 
        metadata_path: str,
        results_summary: Dict[str, Any]
    ) -> None:
        """
        評価結果でメタデータを更新
        
        Args:
            metadata_path: メタデータYAMLファイルパス
            results_summary: 評価結果サマリー
        """
        # 既存メタデータ読み込み
        metadata = self.load_metadata(metadata_path)
        
        # 結果追加
        metadata['results'] = {
            'evaluation_date': datetime.now().isoformat(),
            'total_images_evaluated': results_summary.get('total_images', 0),
            'modes': results_summary.get('modes', {})
        }
        
        # 保存
        with open(metadata_path, 'w', encoding='utf-8') as f:
            yaml.dump(
                metadata, 
                f, 
                allow_unicode=True, 
                default_flow_style=False,
                sort_keys=False,
                indent=2
            )
        
        logger.info(f"メタデータ更新: {metadata_path}")
    
    def generate_experiment_report(
        self, 
        metadata_path: str,
        output_format: str = 'markdown'
    ) -> str:
        """
        実験レポートを生成
        
        Args:
            metadata_path: メタデータYAMLファイルパス
            output_format: 出力形式 ('markdown' or 'html')
            
        Returns:
            レポートファイルパス
        """
        metadata = self.load_metadata(metadata_path)
        
        if output_format == 'markdown':
            report_content = self._generate_markdown_report(metadata)
            extension = '.md'
        elif output_format == 'html':
            report_content = self._generate_html_report(metadata)
            extension = '.html'
        else:
            raise ValueError(f"不正な出力形式: {output_format}")
        
        # レポート保存
        report_path = self.output_dir / f"experiment_report{extension}"
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        logger.info(f"実験レポート生成: {report_path}")
        
        return str(report_path)
    
    def _generate_markdown_report(self, metadata: Dict[str, Any]) -> str:
        """Markdown形式のレポート生成"""
        exp = metadata.get('experiment', {})
        model = metadata.get('model', {})
        results = metadata.get('results', {})
        
        report = f"""# 実験レポート: {exp.get('name', 'N/A')}

## 実験概要
- **実験名**: {exp.get('name', 'N/A')}
- **実施日**: {exp.get('date', 'N/A')}
- **研究者**: {exp.get('researcher', 'N/A')}
- **目的**: {exp.get('purpose', 'N/A')}

## モデル情報
- **モデル名**: {model.get('name', 'N/A')}
- **フレームワーク**: {model.get('framework', 'N/A')}
- **検出モード**: {', '.join(model.get('detection_modes', []))}

## 評価結果
"""
        
        if results:
            report += f"- **評価日時**: {results.get('evaluation_date', 'N/A')}\n"
            report += f"- **評価画像数**: {results.get('total_images_evaluated', 0)}枚\n\n"
            
            report += "### モード別結果\n\n"
            
            for mode, metrics in results.get('modes', {}).items():
                report += f"#### {mode.upper()}モード\n"
                report += f"- 成功率: {metrics.get('success_rate', 0) * 100:.1f}%\n"
                report += f"- 平均誤差: {metrics.get('avg_error_mm', 0):.2f}mm\n"
                report += f"- 平均推論時間: {metrics.get('avg_inference_time_ms', 0):.2f}ms\n"
                report += f"- 平均信頼度: {metrics.get('avg_confidence', 0):.2f}\n\n"
        
        report += f"\n## 備考\n{metadata.get('remarks', 'なし')}\n"
        
        return report
    
    def _generate_html_report(self, metadata: Dict[str, Any]) -> str:
        """HTML形式のレポート生成（簡易版）"""
        markdown_report = self._generate_markdown_report(metadata)
        
        html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>実験レポート</title>
    <style>
        body {{ font-family: 'Yu Gothic', sans-serif; padding: 20px; max-width: 900px; margin: auto; }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; }}
        h2 {{ color: #34495e; margin-top: 30px; }}
        pre {{ background: #f4f4f4; padding: 10px; border-radius: 5px; }}
    </style>
</head>
<body>
    <pre>{markdown_report}</pre>
</body>
</html>
"""
        return html


if __name__ == "__main__":
    # テスト実行
    metadata_manager = ExperimentMetadata()
    
    # メタデータ生成
    metadata_path = metadata_manager.generate_metadata(
        experiment_name="Bento Box Detection Comparison v1.0",
        model_name="YOLOv3",
        confidence_threshold=0.5,
        nms_threshold=0.4,
        remarks="3モード比較実験・AIゼミ研究用"
    )
    
    print(f"メタデータ生成完了: {metadata_path}")
    
    # モック結果で更新
    mock_results = {
        'total_images': 50,
        'modes': {
            'opencv': {'success_rate': 0.85, 'avg_error_mm': 12.5, 'avg_inference_time_ms': 45.3, 'avg_confidence': 0.7},
            'yolo': {'success_rate': 0.92, 'avg_error_mm': 8.3, 'avg_inference_time_ms': 120.7, 'avg_confidence': 0.88},
            'hybrid': {'success_rate': 0.95, 'avg_error_mm': 6.1, 'avg_inference_time_ms': 95.4, 'avg_confidence': 0.89}
        }
    }
    
    metadata_manager.update_with_results(metadata_path, mock_results)
    print("結果でメタデータ更新完了")
    
    # レポート生成
    report_path = metadata_manager.generate_experiment_report(metadata_path, output_format='markdown')
    print(f"レポート生成完了: {report_path}")
