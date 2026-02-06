# 🍱 弁当箱AI検出サーバー（YOLOv8 + OpenCV）# 弁当箱検出AI - 研究機能（AIゼミ用）



## 📋 概要## 概要



**YOLOv8 (Ultralytics)** と **OpenCV** による弁当箱検出AIシステム。YOLO + OpenCV による弁当箱検出AIに、**精度・速度の比較実験機能**を追加した研究開発システムです。

Docker完全対応で、3つの検出モードを提供します。

### 主な機能

### ✨ 特徴

1. **3モード検出**

- 🤖 **YOLOv8** - 最新・最高精度のAIモデル   - `OpenCV単体`: エッジ検出ベースの高速検出

- 🎯 **3モード検出** - OpenCV / YOLOv8 / ハイブリッド   - `YOLO単体`: 深層学習ベースの高精度検出

- 🐳 **Docker対応** - 環境構築不要   - `Hybrid`: YOLO+OpenCV併用で精度と速度のバランス

- 📊 **研究機能** - モード間比較・評価・可視化

- 🚀 **FastAPI** - REST APIで簡単統合2. **自動ログ記録**

   - 各画像ごとに検出結果をJSON形式で保存

---   - ファイル名、推論時間、誤差、信頼度などを記録



## 🚀 クイックスタート（Docker）3. **モード間比較評価**

   - 3モードの精度・速度を自動比較

### 1. Docker起動   - 結果をCSV/JSON形式で出力



```bash4. **結果可視化**

# プロジェクトルートで   - matplotlib による比較グラフ自動生成

docker-compose up -d ai_detection   - 誤差・速度・成功率の棒グラフ

```

5. **実験メタデータ管理**

### 2. 動作確認   - 実験条件をYAML形式で自動記録

   - モデル名、閾値、撮影条件、備考など

```bash

# ヘルスチェック6. **FastAPI統合**

curl http://localhost:8001/health   - `/evaluate` エンドポイントでフォルダ評価

   - REST APIで研究機能をシステム統合

# APIドキュメント（ブラウザで開く）

open http://localhost:8001/docs---

```

## ディレクトリ構造

### 3. テスト実行

```

```bashbackend/ai_research/

# コンテナ内でテスト├── detector.py              # 検出モジュール（3モード実装）

docker-compose exec ai_detection python test_detection.py├── evaluator.py             # 評価・比較モジュール

```├── plot_results.py          # 可視化モジュール

├── experiment_metadata.py   # メタデータ管理

---├── api_server.py            # FastAPIサーバー

├── requirements.txt         # 依存パッケージ

## 🎯 3つの検出モード├── README.md                # このファイル

├── models/                  # YOLOモデル配置ディレクトリ

| モード | 説明 | 精度 | 速度 | 用途 |│   └── (yolov3.weights, yolov3.cfg を配置)

|--------|------|------|------|------|├── test_images/             # テスト画像ディレクトリ

| **OpenCV** | エッジ検出ベース | ⭐⭐ | 超高速 | 研究・比較用 |├── outputs/

| **YOLOv8** | YOLOv8単体検出 | ⭐⭐⭐⭐ | 高速 | 研究・単体評価 |│   ├── logs/                # 検出ログ（JSON）

| **Hybrid** | YOLOv8 + OpenCV併用 | ⭐⭐⭐⭐⭐ | 中速 | **本番推奨** |│   ├── visualizations/      # グラフ（PNG）

│   ├── metrics.csv          # 評価メトリクス

---│   ├── evaluation_summary.json

│   └── experiment_meta.yaml # 実験メタデータ

## 📡 API エンドポイント└── uploads/                 # API経由のアップロード画像

```

### 基本情報

---

- **ベースURL**: `http://localhost:8001`

- **ドキュメント**: `http://localhost:8001/docs`## インストール



### 主要エンドポイント### 1. Python環境セットアップ



#### 1. ヘルスチェック```powershell

```bash# Python 3.9+ が必要

GET /healthpython --version

```

# 仮想環境作成（推奨）

#### 2. 画像検出（Base64）python -m venv venv

```bash.\venv\Scripts\Activate.ps1

POST /detect/base64

Content-Type: application/json# 依存パッケージインストール

pip install -r requirements.txt

{```

  "image_base64": "...",

  "filename": "bento.jpg",### 2. YOLOモデルのダウンロード（任意）

  "mode": "hybrid",

  "confidence_threshold": 0.5YOLO単体・Hybridモードを使用する場合は、YOLOv3モデルをダウンロードしてください。

}

``````powershell

# models/ ディレクトリに配置

#### 3. 画像検出（マルチパート）# - yolov3.weights (約237MB)

```bash# - yolov3.cfg

POST /detect# ダウンロード元: https://pjreddie.com/darknet/yolo/

Content-Type: multipart/form-data```



file: <画像ファイル>---

mode: hybrid

confidence_threshold: 0.5---

## 🖼️ 画像前処理機能（新機能）

### 概要

test_images内の縦長・横長の元画像を、AIが正確に検出できるように自動的に切り取ります。
フロントエンド（PackingGuideScreen）と同等の処理をバックエンドでも実行可能。

### 使い方

#### 1. CLIで一括処理

```powershell
cd backend\ai_research
python preprocess_images.py

# カスタムオプション
python preprocess_images.py --input ./test_images --output ./test_images_cropped --no-detect
```

#### 2. Pythonスクリプトで使用

```python
from image_preprocessor import ImagePreprocessor

preprocessor = ImagePreprocessor()

# 単一画像を処理
result = preprocessor.process_file(
    input_path="./test_images/bento1.jpg",
    output_path="./test_images_cropped/bento1.jpg",
    detect_bento=True,  # お弁当箱を検出して中心に配置
    enhance=True        # 画質向上処理を適用
)

# フォルダ一括処理
summary = preprocessor.batch_process(
    input_dir="./test_images",
    output_dir="./test_images_cropped",
    pattern="*.jpg",
    detect_bento=True,
    enhance=True
)

print(f"成功: {summary['processed']}, 失敗: {summary['failed']}")
```

#### 3. APIエンドポイント

```bash
# 一括前処理
curl -X POST "http://localhost:8001/preprocess/batch?input_dir=./test_images&output_dir=./test_images_cropped"

# 単一画像前処理
curl -X POST "http://localhost:8001/preprocess/single?filename=bento1.jpg"
```

### 処理内容

1. **自動切り取り**
   - お弁当箱の位置を検出（OpenCV輪郭検出）
   - 最適なアスペクト比（4:3）で切り取り
   - 各辺に約5%のマージンを追加

2. **画質向上**（オプション）
   - CLAHE（適応的ヒストグラム平坦化）で明るさ補正
   - 軽いシャープ化フィルタ適用

3. **サイズ最適化**
   - 大きすぎる画像は自動リサイズ（max 1920px）
   - 小さすぎる画像はそのまま保持（min 300px）

### 設定オプション

```python
preprocessor = ImagePreprocessor(
    target_ratio=0.8,      # 切り取り比率（0.0-1.0）
    aspect_ratio=4/3,      # アスペクト比（横/縦）
    margin_ratio=0.05,     # マージン比率
    min_size=300,          # 最小サイズ（px）
    max_size=1920          # 最大サイズ（px）
)
```

---

## 使用方法

```

### A. スタンドアロン実行（研究用）

---

#### 1. 単一画像の検出

## 🐳 Dockerコマンド

```python

### サービス管理from detector import BentoBoxDetector



```bashdetector = BentoBoxDetector(

# 起動    yolo_weights_path="./models/yolov3.weights",

docker-compose up -d ai_detection    yolo_config_path="./models/yolov3.cfg",

    confidence_threshold=0.5

# 停止)

docker-compose stop ai_detection

# OpenCVモードで検出

# 再起動result = detector.detect("test_images/bento1.jpg", mode="opencv")

docker-compose restart ai_detectionprint(f"信頼度: {result.confidence}, 推論時間: {result.inference_time_ms}ms")

```

# ログ確認

docker-compose logs -f ai_detection#### 2. フォルダ評価（全モード比較）



# コンテナに入る```python

docker-compose exec ai_detection bashfrom detector import BentoBoxDetector

```from evaluator import ModelEvaluator



### イメージ管理detector = BentoBoxDetector(confidence_threshold=0.5)

evaluator = ModelEvaluator(detector)

```bash

# 再ビルド# test_images/ フォルダ内の全画像を評価

docker-compose build ai_detectionsummary = evaluator.evaluate_folder("./test_images")



# キャッシュなし再ビルド# 結果は outputs/metrics.csv に保存

docker-compose build --no-cache ai_detection```

```

#### 3. グラフ生成

---

```python

## 📦 依存パッケージfrom plot_results import ResultVisualizer



主要ライブラリ：visualizer = ResultVisualizer()

visualizer.plot_from_csv("./outputs/metrics.csv")

- **ultralytics** - YOLOv8

- **torch** - PyTorch# outputs/visualizations/ にグラフ保存

- **opencv-python** - OpenCV```

- **fastapi** - Web API

- **uvicorn** - ASGIサーバー#### 4. 実験メタデータ生成



完全なリスト: `requirements.txt````python

from experiment_metadata import ExperimentMetadata

---

metadata_mgr = ExperimentMetadata()

## 🔬 YOLOv8モデルmetadata_path = metadata_mgr.generate_metadata(

    experiment_name="Bento Detection v1.0",

| モデル | サイズ | 精度 | 速度 | 推奨用途 |    model_name="YOLOv3",

|--------|--------|------|------|----------|    confidence_threshold=0.5,

| yolov8n.pt | 6MB | Good | 最速 | **開発・テスト（デフォルト）** |    remarks="初回実験"

| yolov8s.pt | 22MB | Better | 高速 | バランス型 |)

| yolov8m.pt | 52MB | Great | 中速 | 高精度 |

| yolov8l.pt | 88MB | Excellent | やや遅 | より高精度 |# outputs/experiment_meta.yaml に保存

| yolov8x.pt | 136MB | Best | 遅い | 最高精度 |```



モデルは初回起動時に自動ダウンロードされます。---



---### B. FastAPI サーバー実行（システム統合用）



## 🛠️ トラブルシューティング#### 1. サーバー起動



### YOLOモデルが読み込めない```powershell

cd backend/ai_research

```bashpython api_server.py

# コンテナ内で手動ダウンロード

docker-compose exec ai_detection python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"# または

```uvicorn api_server:app --host 0.0.0.0 --port 8001 --reload

```

### ポートが使用中

サーバーが起動すると、`http://localhost:8001` でアクセス可能です。

```bash

# .env でポート変更#### 2. エンドポイント一覧

PORT=8002

| エンドポイント | メソッド | 説明 |

# 再起動|--------------|---------|------|

docker-compose restart ai_detection| `/` | GET | API情報 |

```| `/detect` | POST | 単一画像検出 |

| `/evaluate` | POST | フォルダ評価 |

### OpenCVエラー| `/experiment/setup` | POST | 実験セットアップ |

| `/results` | GET | 評価結果取得 |

```bash| `/visualizations` | GET | グラフ一覧 |

# イメージ再ビルド| `/visualizations/{filename}` | GET | グラフ画像取得 |

docker-compose build --no-cache ai_detection| `/logs` | GET | ログ一覧 |

```| `/clear` | DELETE | 出力クリア |



---#### 3. APIドキュメント



## 📚 関連ドキュメント起動後、以下にアクセスすると自動生成ドキュメントが表示されます:



- **DOCKER_SETUP.md** - Docker詳細ガイド（プロジェクトルート）- Swagger UI: `http://localhost:8001/docs`

- **DETECTION_GUIDE.md** - 検出機能詳細- ReDoc: `http://localhost:8001/redoc`

- **API Docs** - http://localhost:8001/docs

---

---

### C. 実験例（AIゼミ発表用）

## 🎯 使用例（フロントエンド連携）

```python

```typescriptfrom detector import BentoBoxDetector

// React Native / Expofrom evaluator import ModelEvaluator

const detectBentoBox = async (imageUri: string) => {from plot_results import ResultVisualizer

  const base64 = await FileSystem.readAsStringAsync(imageUri, {from experiment_metadata import ExperimentMetadata

    encoding: FileSystem.EncodingType.Base64,

  });# 1. 実験セットアップ

metadata_mgr = ExperimentMetadata()

  const response = await fetch('http://localhost:8001/detect/base64', {metadata_mgr.generate_metadata(

    method: 'POST',    experiment_name="3モード比較実験 - 撮影条件別",

    headers: { 'Content-Type': 'application/json' },    model_name="YOLOv3",

    body: JSON.stringify({    confidence_threshold=0.5,

      image_base64: base64,    remarks="明るさ・角度を変えた50枚で比較"

      filename: 'bento.jpg',)

      mode: 'hybrid',

      confidence_threshold: 0.5,# 2. 検出器初期化

    }),detector = BentoBoxDetector(confidence_threshold=0.5)

  });evaluator = ModelEvaluator(detector)



  const result = await response.json();# 3. 評価実行

  console.log(`信頼度: ${result.confidence * 100}%`);summary = evaluator.evaluate_folder("./test_images")

};

```# 4. グラフ生成

visualizer = ResultVisualizer()

---visualizer.plot_from_csv("./outputs/metrics.csv")



## 🚀 バージョン# 5. レポート生成

metadata_mgr.generate_experiment_report(

- **v3.0.0** - YOLOv8 (Ultralytics) 対応、Docker完全統合    "./outputs/experiment_meta.yaml",

    output_format="markdown"

---)



**最高精度のYOLOv8で、弁当箱検出を体験しよう！** 🍱✨print("実験完了！")

print("  - メトリクス: outputs/metrics.csv")
print("  - グラフ: outputs/visualizations/")
print("  - レポート: outputs/experiment_report.md")
```

---

## 出力ファイル

### 1. 検出ログ（JSON）

`outputs/logs/` に保存される各画像の検出結果:

```json
{
  "filename": "bento1.jpg",
  "timestamp": "2025-11-03T12:34:56",
  "mode": "hybrid",
  "brightness": 128.5,
  "angle": 45.2,
  "inference_time_ms": 95.4,
  "error_mm": 6.1,
  "confidence": 0.89,
  "bbox": [100, 120, 250, 180],
  "success": true
}
```

### 2. 評価メトリクス（CSV）

`outputs/metrics.csv`:

```csv
mode,total_images,success_count,success_rate,avg_inference_time_ms,avg_error_mm,std_error_mm,min_error_mm,max_error_mm,avg_confidence
opencv,50,42,0.84,45.3,12.5,3.2,8.1,18.7,0.70
yolo,50,46,0.92,120.7,8.3,2.1,5.2,13.4,0.88
hybrid,50,48,0.96,95.4,6.1,1.8,3.8,10.2,0.89
```

### 3. 実験メタデータ（YAML）

`outputs/experiment_meta.yaml`:

```yaml
experiment:
  name: Bento Detection v1.0
  date: '2025-11-03T12:00:00'
  researcher: AI Seminar Team
  purpose: 弁当箱検出AIの精度・速度比較実験

model:
  name: YOLOv3
  framework: OpenCV DNN + YOLO
  detection_modes: [opencv, yolo, hybrid]

# ... その他メタデータ
```

### 4. グラフ（PNG）

`outputs/visualizations/` に保存:

- `accuracy_comparison.png` - 精度比較（平均誤差）
- `speed_comparison.png` - 速度比較（推論時間）
- `success_rate_comparison.png` - 成功率比較
- `comprehensive_comparison.png` - 総合比較

---

## カスタマイズ

### 1. 信頼度閾値の変更

```python
detector = BentoBoxDetector(confidence_threshold=0.7)  # デフォルト0.5
```

### 2. NMS閾値の調整

```python
detector = BentoBoxDetector(nms_threshold=0.3)  # デフォルト0.4
```

### 3. カスタム正解データで誤差計算

```python
ground_truths = {
    "bento1.jpg": [100, 100, 200, 150],  # [x, y, w, h]
    "bento2.jpg": [120, 80, 220, 160]
}

summary = evaluator.evaluate_folder("./test_images", ground_truths=ground_truths)
```

---

## トラブルシューティング

### YOLOモデルが読み込めない

- `models/` ディレクトリに `yolov3.weights` と `yolov3.cfg` があるか確認
- OpenCVモードのみ使用する場合は、YOLOモデル不要

### グラフの日本語が文字化け

`plot_results.py` のフォント設定を変更:

```python
matplotlib.rcParams['font.family'] = ['MS Gothic', 'Yu Gothic', 'sans-serif']
```

### FastAPIサーバーが起動しない

- ポート8001が使用中の場合は別ポートを指定:
  ```python
  uvicorn.run(app, host="0.0.0.0", port=8002)
  ```

---

## ライセンス

MIT License

---

## 研究発表向けポイント

### AIゼミで強調すべき点

1. **システム統合と研究の両立**
   - FastAPI で実用的なシステムとして動作
   - 同時に研究用の詳細ログ・比較機能も完備

2. **再現性の確保**
   - 実験メタデータ自動記録
   - 全パラメータ・条件を YAML で保存

3. **自動化による効率化**
   - フォルダ指定だけで全モード比較
   - グラフ・レポート自動生成

4. **拡張性**
   - 新しい検出モードの追加が容易
   - 評価メトリクスのカスタマイズ可能

5. **実験データの可視化**
   - matplotlib による比較グラフ
   - 精度・速度・成功率を一目で把握

---

## 今後の拡張案

- [ ] GPU対応（CUDA）
- [ ] リアルタイム動画検出
- [ ] データベース連携（PostgreSQL）
- [ ] Webフロントエンド（React）
- [ ] モバイルアプリ統合（React Native）
- [ ] A/Bテスト機能
- [ ] CI/CD パイプライン構築

---

**Happy Researching! 🍱🔬**
