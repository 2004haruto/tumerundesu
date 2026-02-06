"""
実験結果可視化モジュール
matplotlib で評価メトリクスをグラフ化
"""

import csv
import json
from pathlib import Path
from typing import Dict, List, Optional
import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import logging

# 日本語フォント設定
import matplotlib.font_manager as fm

# 利用可能な日本語フォントを自動検出
def setup_japanese_font():
    """日本語フォントを自動設定"""
    japanese_fonts = [
        'Noto Sans CJK JP',  # Dockerでインストールしたフォント
        'DejaVu Sans',       # フォールバック
        'sans-serif'         # 最終フォールバック
    ]
    
    for font in japanese_fonts:
        if font in [f.name for f in fm.fontManager.ttflist]:
            matplotlib.rcParams['font.family'] = [font]
            break
    else:
        # 日本語フォントが見つからない場合はNoto Sans CJK JPを指定
        matplotlib.rcParams['font.family'] = ['Noto Sans CJK JP', 'DejaVu Sans', 'sans-serif']
    
    matplotlib.rcParams['axes.unicode_minus'] = False

# フォント設定を実行
setup_japanese_font()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResultVisualizer:
    """結果可視化クラス"""
    
    def __init__(self, output_dir: str = "./outputs/visualizations"):
        """
        初期化
        
        Args:
            output_dir: グラフ出力ディレクトリ
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # カラーパレット
        self.colors = {
            'opencv': '#FF7A6E',  # コーラル
            'yolo': '#44D1C9',    # ティール
            'hybrid': '#B89CFF'   # グレープ
        }
    
    def plot_from_csv(self, csv_path: str) -> None:
        """
        CSVファイルから全グラフを生成
        
        Args:
            csv_path: メトリクスCSVファイルパス
        """
        # CSV読み込み
        data = self._load_csv(csv_path)
        
        if not data:
            logger.error("CSVデータが空です")
            return
        
        # 各グラフを生成
        self.plot_accuracy_comparison(data)
        self.plot_speed_comparison(data)
        self.plot_success_rate_comparison(data)
        self.plot_comprehensive_comparison(data)
        
        logger.info(f"全グラフ生成完了: {self.output_dir}")
    
    def plot_accuracy_comparison(self, data: Dict[str, Dict]) -> None:
        """
        精度比較グラフ（平均誤差）
        
        Args:
            data: モード別メトリクスデータ
        """
        modes = list(data.keys())
        avg_errors = [data[mode]['avg_error_mm'] for mode in modes]
        std_errors = [data[mode]['std_error_mm'] for mode in modes]
        colors = [self.colors.get(mode, '#666666') for mode in modes]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        bars = ax.bar(modes, avg_errors, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
        ax.errorbar(modes, avg_errors, yerr=std_errors, fmt='none', ecolor='black', 
                   capsize=5, capthick=2, alpha=0.6)
        
        ax.set_xlabel('検出モード', fontsize=12, fontweight='bold')
        ax.set_ylabel('平均誤差 (mm)', fontsize=12, fontweight='bold')
        ax.set_title('検出精度の比較（平均誤差）', fontsize=14, fontweight='bold', pad=20)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        
        # 数値ラベル
        for bar, error in zip(bars, avg_errors):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{error:.2f}mm',
                   ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        plt.tight_layout()
        output_path = self.output_dir / 'accuracy_comparison.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"精度比較グラフ保存: {output_path}")
    
    def plot_speed_comparison(self, data: Dict[str, Dict]) -> None:
        """
        速度比較グラフ（平均推論時間）
        
        Args:
            data: モード別メトリクスデータ
        """
        modes = list(data.keys())
        avg_times = [data[mode]['avg_inference_time_ms'] for mode in modes]
        colors = [self.colors.get(mode, '#666666') for mode in modes]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        bars = ax.bar(modes, avg_times, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
        
        ax.set_xlabel('検出モード', fontsize=12, fontweight='bold')
        ax.set_ylabel('平均推論時間 (ms)', fontsize=12, fontweight='bold')
        ax.set_title('推論速度の比較（低い方が高速）', fontsize=14, fontweight='bold', pad=20)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        
        # 数値ラベル
        for bar, time_val in zip(bars, avg_times):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{time_val:.2f}ms',
                   ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        plt.tight_layout()
        output_path = self.output_dir / 'speed_comparison.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"速度比較グラフ保存: {output_path}")
    
    def plot_success_rate_comparison(self, data: Dict[str, Dict]) -> None:
        """
        成功率比較グラフ
        
        Args:
            data: モード別メトリクスデータ
        """
        modes = list(data.keys())
        success_rates = [data[mode]['success_rate'] * 100 for mode in modes]
        colors = [self.colors.get(mode, '#666666') for mode in modes]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        bars = ax.bar(modes, success_rates, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
        
        ax.set_xlabel('検出モード', fontsize=12, fontweight='bold')
        ax.set_ylabel('成功率 (%)', fontsize=12, fontweight='bold')
        ax.set_title('検出成功率の比較', fontsize=14, fontweight='bold', pad=20)
        ax.set_ylim(0, 105)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        
        # 数値ラベル
        for bar, rate in zip(bars, success_rates):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{rate:.1f}%',
                   ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        plt.tight_layout()
        output_path = self.output_dir / 'success_rate_comparison.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"成功率比較グラフ保存: {output_path}")
    
    def plot_comprehensive_comparison(self, data: Dict[str, Dict]) -> None:
        """
        総合比較グラフ（3指標を1つに統合）
        
        Args:
            data: モード別メトリクスデータ
        """
        modes = list(data.keys())
        
        # データ準備
        avg_errors = [data[mode]['avg_error_mm'] for mode in modes]
        avg_times = [data[mode]['avg_inference_time_ms'] for mode in modes]
        success_rates = [data[mode]['success_rate'] * 100 for mode in modes]
        
        x = np.arange(len(modes))
        width = 0.25
        
        fig, ax1 = plt.subplots(figsize=(12, 7))
        
        # 誤差（左軸）
        ax1.bar(x - width, avg_errors, width, label='平均誤差 (mm)', 
               color=self.colors['opencv'], alpha=0.8, edgecolor='black')
        ax1.set_xlabel('検出モード', fontsize=12, fontweight='bold')
        ax1.set_ylabel('平均誤差 (mm)', fontsize=12, fontweight='bold', color=self.colors['opencv'])
        ax1.tick_params(axis='y', labelcolor=self.colors['opencv'])
        ax1.set_xticks(x)
        ax1.set_xticklabels(modes)
        
        # 推論時間（右軸1）
        ax2 = ax1.twinx()
        ax2.bar(x, avg_times, width, label='平均推論時間 (ms)', 
               color=self.colors['yolo'], alpha=0.8, edgecolor='black')
        ax2.set_ylabel('平均推論時間 (ms)', fontsize=12, fontweight='bold', color=self.colors['yolo'])
        ax2.tick_params(axis='y', labelcolor=self.colors['yolo'])
        
        # 成功率（右軸2）
        ax3 = ax1.twinx()
        ax3.spines['right'].set_position(('outward', 60))
        ax3.bar(x + width, success_rates, width, label='成功率 (%)', 
               color=self.colors['hybrid'], alpha=0.8, edgecolor='black')
        ax3.set_ylabel('成功率 (%)', fontsize=12, fontweight='bold', color=self.colors['hybrid'])
        ax3.tick_params(axis='y', labelcolor=self.colors['hybrid'])
        ax3.set_ylim(0, 105)
        
        ax1.set_title('総合比較（精度・速度・成功率）', fontsize=14, fontweight='bold', pad=20)
        ax1.legend(loc='upper left')
        ax2.legend(loc='upper center')
        ax3.legend(loc='upper right')
        
        plt.tight_layout()
        output_path = self.output_dir / 'comprehensive_comparison.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"総合比較グラフ保存: {output_path}")
    
    def plot_from_json(self, json_path: str) -> None:
        """
        評価サマリーJSONからグラフ生成
        
        Args:
            json_path: evaluation_summary.json のパス
        """
        with open(json_path, 'r', encoding='utf-8') as f:
            summary = json.load(f)
        
        data = summary.get('modes', {})
        
        if not data:
            logger.error("JSONデータが空です")
            return
        
        self.plot_from_csv(None)  # 後で修正
        
    def _load_csv(self, csv_path: str) -> Dict[str, Dict]:
        """
        CSVファイルを読み込み
        
        Args:
            csv_path: CSVファイルパス
            
        Returns:
            モード別メトリクスデータ
        """
        data = {}
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                mode = row['mode']
                data[mode] = {
                    'avg_error_mm': float(row['avg_error_mm']),
                    'std_error_mm': float(row['std_error_mm']),
                    'avg_inference_time_ms': float(row['avg_inference_time_ms']),
                    'success_rate': float(row['success_rate']),
                    'avg_confidence': float(row['avg_confidence'])
                }
        
        return data


if __name__ == "__main__":
    # テスト実行
    visualizer = ResultVisualizer()
    
    # モックデータ
    mock_data = {
        'opencv': {
            'avg_error_mm': 12.5,
            'std_error_mm': 3.2,
            'avg_inference_time_ms': 45.3,
            'success_rate': 0.85,
            'avg_confidence': 0.7
        },
        'yolo': {
            'avg_error_mm': 8.3,
            'std_error_mm': 2.1,
            'avg_inference_time_ms': 120.7,
            'success_rate': 0.92,
            'avg_confidence': 0.88
        },
        'hybrid': {
            'avg_error_mm': 6.1,
            'std_error_mm': 1.8,
            'avg_inference_time_ms': 95.4,
            'success_rate': 0.95,
            'avg_confidence': 0.89
        }
    }
    
    # グラフ生成
    visualizer.plot_accuracy_comparison(mock_data)
    visualizer.plot_speed_comparison(mock_data)
    visualizer.plot_success_rate_comparison(mock_data)
    visualizer.plot_comprehensive_comparison(mock_data)
    
    print("テストグラフ生成完了!")
