# 弁当箱AI検出 - 使用ガイド

## 概要

このシステムは、**3つの検出モード**を提供します：

1. **OpenCV単体モード** - 伝統的な画像処理（研究・ターミナル用）
2. **YOLO単体モード** - 深層学習ベース（研究・ターミナル用）
3. **ハイブリッドモード** - YOLO + OpenCV併用（フロントエンド推奨）

---

## 🚀 クイックスタート

### 1. 環境セットアップ

```bash
cd backend/ai_research

# 依存パッケージインストール
pip install -r requirements.txt

# YOLOモデルのダウンロード（任意）
# YOLOv3の場合:
mkdir -p models
cd models
wget https://pjreddie.com/media/files/yolov3.weights
wget https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3.cfg
cd ..
```

### 2. 環境変数設定

`.env`ファイルを編集：

```env
# YOLOモデルパス（お持ちのモデルに応じて）
YOLO_WEIGHTS_PATH=./models/yolov3.weights
YOLO_CONFIG_PATH=./models/yolov3.cfg

# その他の設定
CONFIDENCE_THRESHOLD=0.5
PORT=8001
```

### 3. サーバー起動

```bash
# 3モード対応APIサーバー起動
python api_server.py
```

サーバーが起動したら、`http://localhost:8001/docs` でAPIドキュメントを確認できます。

---

## 📱 フロントエンド（React Native）からの利用

### PackingGuideScreen.tsx での使用

**ハイブリッドモード**がフロントエンドで使用されます：

```typescript
// 画像をBase64に変換してAPIに送信
const response = await fetch(`${AI_DETECTION_API_URL}/detect/base64`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image_base64: base64Image,
    filename: 'bento.jpg',
    mode: 'hybrid',  // ハイブリッドモード
    confidence_threshold: 0.5,
  }),
});

const result = await response.json();
// result.bbox に検出された弁当箱の座標・サイズ情報が含まれる
```

### 環境変数設定

`.env`（プロジェクトルート）または`app.json`に追加：

```env
EXPO_PUBLIC_AI_DETECTION_URL=http://localhost:8001
```

---

## 🖥️ ターミナル・研究用の使用方法

### 方法1: CLIツールで3モード比較

```bash
# research_cli.py を使用（推奨）
python research_cli.py --image ./test_images/bento1.jpg --modes all

# 特定モードのみ
python research_cli.py --image ./test_images/bento1.jpg --modes opencv yolo

# フォルダ全体を評価
python research_cli.py --folder ./test_images --modes all
```

### 方法2: APIエンドポイントでモード指定

```bash
# OpenCV単体モード
curl -X POST "http://localhost:8001/detect" \
  -F "file=@test_images/bento1.jpg" \
  -F "mode=opencv" \
  -F "confidence_threshold=0.5"

# YOLO単体モード
curl -X POST "http://localhost:8001/detect" \
  -F "file=@test_images/bento1.jpg" \
  -F "mode=yolo" \
  -F "confidence_threshold=0.5"

# ハイブリッドモード
curl -X POST "http://localhost:8001/detect" \
  -F "file=@test_images/bento1.jpg" \
  -F "mode=hybrid" \
  -F "confidence_threshold=0.5"
```

### 方法3: Pythonスクリプトで直接使用

```python
from detector import BentoBoxDetector

# 検出器初期化
detector = BentoBoxDetector(
    yolo_weights_path="./models/yolov3.weights",
    yolo_config_path="./models/yolov3.cfg",
    confidence_threshold=0.5,
    px_to_mm_ratio=1.0
)

# OpenCV単体
result_opencv = detector.detect("bento.jpg", mode="opencv")

# YOLO単体
result_yolo = detector.detect("bento.jpg", mode="yolo")

# ハイブリッド
result_hybrid = detector.detect("bento.jpg", mode="hybrid")

# 結果表示
print(f"OpenCV: 信頼度={result_opencv.confidence:.2f}, 時間={result_opencv.inference_time_ms:.1f}ms")
print(f"YOLO: 信頼度={result_yolo.confidence:.2f}, 時間={result_yolo.inference_time_ms:.1f}ms")
print(f"Hybrid: 信頼度={result_hybrid.confidence:.2f}, 時間={result_hybrid.inference_time_ms:.1f}ms")
```

---

## 📊 APIエンドポイント一覧

### GET `/`
ルート - APIの基本情報

### GET `/health`
ヘルスチェック - サーバー状態確認

### POST `/detect`
単一画像検出（マルチパートフォーム）

**パラメータ:**
- `file`: 画像ファイル（必須）
- `mode`: 検出モード `opencv` / `yolo` / `hybrid`（デフォルト: `hybrid`）
- `confidence_threshold`: 信頼度閾値（デフォルト: 0.5）

**レスポンス例:**
```json
{
  "status": "success",
  "filename": "bento.jpg",
  "mode": "hybrid",
  "confidence": 0.92,
  "inference_time_ms": 87.3,
  "bbox": {
    "x": 120,
    "y": 150,
    "width": 300,
    "height": 220,
    "width_mm": 180.5,
    "height_mm": 132.3
  },
  "success": true,
  "brightness": 128.5,
  "angle": 2.1,
  "message": "検出成功"
}
```

### POST `/detect/base64`
Base64エンコード画像から検出（フロントエンド推奨）

**リクエストボディ:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANS...",
  "filename": "bento.jpg",
  "mode": "hybrid",
  "confidence_threshold": 0.5
}
```

### POST `/evaluate`
フォルダ内全画像を評価（研究用）

**リクエストボディ:**
```json
{
  "folder_path": "./test_images",
  "confidence_threshold": 0.5,
  "generate_graphs": true
}
```

### POST `/experiment/setup`
実験セットアップ（メタデータ生成）

### GET `/results`
評価結果取得

### GET `/visualizations`
生成されたグラフ一覧

### GET `/logs`
ログファイル一覧

### DELETE `/clear`
出力ファイルをクリア

---

## 🔬 3モードの比較

| モード | 精度 | 速度 | 特徴 | 用途 |
|--------|------|------|------|------|
| **OpenCV単体** | 中 | 速い | 軽量、モデル不要 | 研究・ベースライン |
| **YOLO単体** | 高 | 中 | 深層学習、高精度 | 研究・比較 |
| **ハイブリッド** | 最高 | 中 | YOLO+OpenCV併用 | **本番推奨** |

### ハイブリッドモードの仕組み

1. **YOLOで大まかな領域検出** - 弁当箱の存在と大まかな位置を特定
2. **OpenCVで精密化** - 検出領域内でエッジ検出により正確な境界を決定
3. **両方の利点を活用** - 高速かつ高精度な検出を実現

---

## 📁 出力ファイル

### ログ
`outputs/logs/` - 各検出結果のJSON形式ログ

```json
{
  "filename": "bento.jpg",
  "timestamp": "2025-11-04T10:30:45",
  "mode": "hybrid",
  "confidence": 0.92,
  "inference_time_ms": 87.3,
  "bbox": {...},
  "success": true
}
```

### グラフ（研究用）
`outputs/visualizations/` - 評価結果の可視化

- `accuracy_comparison.png` - モード別精度比較
- `inference_time_comparison.png` - 推論時間比較
- `confidence_distribution.png` - 信頼度分布

### メトリクスCSV
`outputs/metrics.csv` - 評価メトリクスの集計

---

## 🛠️ トラブルシューティング

### YOLOモデルが見つからない

**エラー:** `YOLOモデルの読み込みに失敗`

**解決策:**
- `.env`ファイルの`YOLO_WEIGHTS_PATH`と`YOLO_CONFIG_PATH`を確認
- モデルファイルが存在するか確認
- YOLOモデルなしでも**OpenCV単体モード**は使用可能

### APIサーバーに接続できない

**エラー:** `Network request failed`

**解決策:**
1. サーバーが起動しているか確認: `http://localhost:8001/health`
2. ファイアウォール設定を確認
3. `.env`の`PORT`設定を確認
4. フロントエンドの`EXPO_PUBLIC_AI_DETECTION_URL`を確認

### 検出精度が低い

**解決策:**
1. 明るい場所で撮影
2. 弁当箱を画面中央に配置
3. `confidence_threshold`を調整（デフォルト: 0.5）
4. **ハイブリッドモード**を使用（推奨）

---

## 📚 参考資料

- [YOLO公式サイト](https://pjreddie.com/darknet/yolo/)
- [OpenCV Documentation](https://docs.opencv.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- プロジェクト内の`README.md`、`QUICKSTART.md`

---

## 📄 ライセンス

本プロジェクトのライセンスについては、プロジェクトルートの`LICENSE`ファイルを参照してください。
