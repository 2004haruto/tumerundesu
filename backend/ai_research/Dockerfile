# Python 3.10 slim イメージを使用
FROM python:3.10-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新と必要なライブラリのインストール
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgthread-2.0-0 \
    fonts-noto-cjk \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# matplotlibの日本語フォント設定
ENV MPLCONFIGDIR=/tmp/matplotlib

# Python依存関係ファイルをコピー
COPY requirements.txt .

# Python依存関係をインストール（キャッシュマウントで高速化）
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# 出力ディレクトリを作成
RUN mkdir -p /app/outputs/logs /app/outputs/visualizations /app/uploads /app/models

# YOLOv8nanoモデルを事前ダウンロード（初回起動時の遅延を防ぐ）
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" || echo "YOLOv8モデルは起動時にダウンロードされます"

# ポート8001を公開
EXPOSE 8001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

# FastAPIサーバーを起動
CMD ["python", "api_server.py"]
