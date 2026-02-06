"""
弁当箱検出AI FastAPIサーバー
3モード対応版（研究機能統合）
- OpenCV単体モード（ターミナル/研究用）
- YOLO単体モード（ターミナル/研究用）
- ハイブリッドモード（フロントエンド用）
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pathlib import Path
import shutil
import logging
import os
from dotenv import load_dotenv
import base64
import io
from PIL import Image

from detector import BentoBoxDetector, DetectionMode
from evaluator import ModelEvaluator
from plot_results import ResultVisualizer
from experiment_metadata import ExperimentMetadata
from image_preprocessor import ImagePreprocessor

# 環境変数読み込み
load_dotenv()

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPIアプリ初期化
app = FastAPI(
    title="Bento Box Detection AI API",
    description="YOLOv8 + OpenCV 弁当箱検出API（3モード対応・研究機能付き）",
    version="3.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# グローバル変数
detector: Optional[BentoBoxDetector] = None
evaluator: Optional[ModelEvaluator] = None
visualizer: Optional[ResultVisualizer] = None
metadata_manager: Optional[ExperimentMetadata] = None
preprocessor: Optional[ImagePreprocessor] = None

# 環境変数から設定取得
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
YOLO_WEIGHTS_PATH = os.getenv("YOLO_WEIGHTS_PATH")
YOLO_CONFIG_PATH = os.getenv("YOLO_CONFIG_PATH")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
NMS_THRESHOLD = float(os.getenv("NMS_THRESHOLD", "0.4"))
PX_TO_MM_RATIO = float(os.getenv("PX_TO_MM_RATIO", "1.0"))

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./outputs"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
MODELS_DIR = Path(os.getenv("MODELS_DIR", "./models"))
TEST_IMAGES_DIR = Path(os.getenv("TEST_IMAGES_DIR", "./test_images"))
TEST_IMAGES_CROPPED_DIR = Path(os.getenv("TEST_IMAGES_CROPPED_DIR", "./test_images_cropped"))
EVALUATION_DEFAULT_FOLDER = os.getenv("EVALUATION_DEFAULT_FOLDER", "./test_images_cropped")


def calculate_dynamic_px_to_mm_ratio(bento_width_mm: float, bento_height_mm: float, image_path: str) -> float:
    """
    実際の弁当サイズと画像サイズから変換係数を動的計算
    
    Args:
        bento_width_mm: 実際の弁当幅（mm）
        bento_height_mm: 実際の弁当奥行き（mm）
        image_path: 画像ファイルパス
        
    Returns:
        float: 計算されたpx_to_mm_ratio
    """
    try:
        import cv2
        
        # 画像読み込み
        image = cv2.imread(image_path)
        if image is None:
            logger.warning(f"画像読み込み失敗: {image_path}")
            return 0.1862  # デフォルト値
            
        height_px, width_px = image.shape[:2]
        
        # px_to_mm_ratioを計算
        width_ratio = bento_width_mm / width_px
        height_ratio = bento_height_mm / height_px
        
        # 幅と高さの平均を取る
        final_ratio = (width_ratio + height_ratio) / 2
        
        logger.info(f"動的変換係数計算: {width_px}x{height_px}px → {final_ratio:.4f} mm/px")
        return final_ratio
        
    except Exception as e:
        logger.error(f"変換係数計算エラー: {e}")
        return 0.1862  # エラー時はデフォルト値


def update_detector_with_dynamic_ratio(bento_width_mm: Optional[float], bento_height_mm: Optional[float], image_path: str):
    """
    検出器のpx_to_mm_ratioを動的に更新
    
    Args:
        bento_width_mm: 弁当幅（mm）
        bento_height_mm: 弁当奥行き（mm）  
        image_path: 画像パス
    """
    global detector
    
    if detector and bento_width_mm and bento_height_mm:
        # 動的に変換係数を計算して更新
        new_ratio = calculate_dynamic_px_to_mm_ratio(bento_width_mm, bento_height_mm, image_path)
        detector.px_to_mm_ratio = new_ratio
        logger.info(f"検出器の変換係数を更新: {new_ratio:.4f} mm/px")
    else:
        # デフォルト値を使用
        if detector:
            detector.px_to_mm_ratio = 0.1862
            logger.info("デフォルト変換係数を使用: 0.1862 mm/px")


# リクエスト/レスポンスモデル
class DetectionRequest(BaseModel):
    mode: DetectionMode = "hybrid"
    confidence_threshold: float = 0.5
    bento_width_mm: Optional[float] = None  # 弁当幅（mm）
    bento_height_mm: Optional[float] = None  # 弁当奥行き（mm）


class DynamicSizeDetectionRequest(BaseModel):
    """動的サイズ対応検出リクエスト"""
    mode: DetectionMode = "hybrid"
    confidence_threshold: float = 0.5
    bento_width_mm: float = 185.0
    bento_height_mm: float = 110.0


class DetectionResponse(BaseModel):
    """検出結果レスポンス"""
    status: str
    filename: str
    mode: DetectionMode
    confidence: float
    inference_time_ms: float
    bbox: Optional[Dict[str, float]] = None
    success: bool
    brightness: float
    angle: float
    message: str = ""
    # 追加: フレーム内の位置情報（リアルタイムガイド用）
    position_info: Optional[Dict[str, Any]] = None


class Base64DetectionRequest(BaseModel):
    """Base64画像検出リクエスト"""
    image_base64: str
    filename: str = "image.jpg"
    mode: DetectionMode = "hybrid"
    confidence_threshold: float = 0.5
    # 追加: プレビューモード（高速化）
    is_preview: bool = False
    # 追加: 動的サイズ対応
    bento_width_mm: Optional[float] = None
    bento_height_mm: Optional[float] = None


class EvaluationRequest(BaseModel):
    folder_path: str = None  # Noneの場合は環境変数のデフォルトを使用
    confidence_threshold: float = 0.5
    generate_graphs: bool = True


class ExperimentSetupRequest(BaseModel):
    experiment_name: str
    model_name: str = "YOLOv3"
    confidence_threshold: float = 0.5
    nms_threshold: float = 0.4
    remarks: str = ""


# ヘルパー関数
def calculate_position_info(bbox: Dict[str, float], image_width: int, image_height: int) -> Dict[str, Any]:
    """
    検出ボックスの位置情報を計算（リアルタイムガイド用）
    
    Args:
        bbox: 検出ボックス {x, y, width, height, ...}
        image_width: 画像幅
        image_height: 画像高さ
    
    Returns:
        position_info: 位置情報辞書
    """
    center_x = bbox['x'] + bbox['width'] / 2
    center_y = bbox['y'] + bbox['height'] / 2
    
    # 相対位置（0.0 〜 1.0）
    relative_x = center_x / image_width
    relative_y = center_y / image_height
    
    # サイズ比率
    bbox_area = bbox['width'] * bbox['height']
    image_area = image_width * image_height
    size_ratio = bbox_area / image_area
    
    # 位置判定
    position_horizontal = "center"
    if relative_x < 0.35:
        position_horizontal = "left"
    elif relative_x > 0.65:
        position_horizontal = "right"
    
    position_vertical = "center"
    if relative_y < 0.35:
        position_vertical = "top"
    elif relative_y > 0.65:
        position_vertical = "bottom"
    
    # サイズ判定
    size_status = "good"
    if size_ratio < 0.15:
        size_status = "too_small"
    elif size_ratio > 0.7:
        size_status = "too_large"
    
    return {
        "relative_x": relative_x,
        "relative_y": relative_y,
        "size_ratio": size_ratio,
        "position_horizontal": position_horizontal,
        "position_vertical": position_vertical,
        "size_status": size_status,
        "is_centered": abs(relative_x - 0.5) < 0.15 and abs(relative_y - 0.5) < 0.15,
        "is_optimal": size_status == "good" and abs(relative_x - 0.5) < 0.15 and abs(relative_y - 0.5) < 0.15
    }


@app.on_event("startup")
async def startup_event():
    """サーバー起動時の初期化"""
    global detector, evaluator, visualizer, metadata_manager, preprocessor
    
    # ディレクトリ作成
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    TEST_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    TEST_IMAGES_CROPPED_DIR.mkdir(parents=True, exist_ok=True)
    
    # モジュール初期化
    detector = BentoBoxDetector(
        yolo_weights_path=YOLO_WEIGHTS_PATH,
        yolo_config_path=YOLO_CONFIG_PATH,
        confidence_threshold=CONFIDENCE_THRESHOLD,
        nms_threshold=NMS_THRESHOLD,
        output_dir=str(OUTPUT_DIR),
        px_to_mm_ratio=PX_TO_MM_RATIO
    )
    
    evaluator = ModelEvaluator(detector, output_dir=str(OUTPUT_DIR))
    visualizer = ResultVisualizer(output_dir=str(OUTPUT_DIR / "visualizations"))
    metadata_manager = ExperimentMetadata(output_dir=str(OUTPUT_DIR))
    preprocessor = ImagePreprocessor()
    
    logger.info("FastAPIサーバー起動完了（YOLOv8 + 3モード対応）")
    logger.info(f"Host: {HOST}, Port: {PORT}")
    logger.info(f"YOLO Weights: {YOLO_WEIGHTS_PATH}")
    logger.info(f"モデル: YOLOv8 (Ultralytics)")
    logger.info(f"画像前処理: 有効")
    logger.info(f"研究用評価フォルダ: {EVALUATION_DEFAULT_FOLDER}")


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Bento Box Detection AI API",
        "version": "3.0.0",
        "yolo_version": "YOLOv8 (Ultralytics)",
        "modes": {
            "opencv": "OpenCV単体モード（研究用）",
            "yolo": "YOLOv8単体モード（研究用）",
            "hybrid": "ハイブリッドモード（フロントエンド推奨・最高精度）"
        },
        "endpoints": {
            "detect": "POST /detect - 単一画像検出（マルチパート）",
            "detect_base64": "POST /detect/base64 - Base64画像検出",
            "evaluate": "POST /evaluate - フォルダ評価",
            "experiment": "POST /experiment/setup - 実験セットアップ",
            "preprocess_batch": "POST /preprocess/batch - 画像一括前処理",
            "preprocess_single": "POST /preprocess/single - 単一画像前処理",
            "results": "GET /results - 結果取得",
            "visualizations": "GET /visualizations - グラフ一覧",
            "health": "GET /health - ヘルスチェック"
        },
        "features": {
            "auto_crop": "お弁当箱の自動切り取り",
            "realtime_detection": "リアルタイム検出",
            "image_enhancement": "画質自動補正"
        }
    }


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {
        "status": "healthy",
        "detector_ready": detector is not None,
        "yolo_loaded": detector.yolo_model is not None if detector else False,
        "yolo_version": "YOLOv8 (Ultralytics)",
        "modes_available": ["opencv", "yolov8" if detector and detector.yolo_model else None, "hybrid" if detector and detector.yolo_model else None]
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_bento_box(
    file: UploadFile = File(...),
    mode: DetectionMode = "hybrid",
    confidence_threshold: float = 0.5,
    bento_width_mm: Optional[float] = None,
    bento_height_mm: Optional[float] = None
):
    """
    単一画像での弁当箱検出（マルチパートフォーム）
    
    Args:
        file: アップロード画像
        mode: 検出モード (opencv/yolo/hybrid)
        confidence_threshold: 信頼度閾値
        bento_width_mm: 弁当幅（mm）※指定時に動的変換係数計算
        bento_height_mm: 弁当奥行き（mm）※指定時に動的変換係数計算
    """
    if not detector:
        raise HTTPException(status_code=500, detail="検出器が初期化されていません")
    
    # ファイル保存
    upload_path = UPLOAD_DIR / file.filename
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"ファイル保存エラー: {e}")
        raise HTTPException(status_code=500, detail="ファイル保存に失敗しました")
    
    try:
        # 弁当サイズが指定されている場合、動的に変換係数を更新
        if bento_width_mm and bento_height_mm:
            update_detector_with_dynamic_ratio(bento_width_mm, bento_height_mm, str(upload_path))
        
        # 検出実行
        detector.confidence_threshold = confidence_threshold
        result = detector.detect(str(upload_path), mode=mode)
        
        return DetectionResponse(
            status="success",
            filename=result.filename,
            mode=result.mode,
            confidence=result.confidence,
            inference_time_ms=result.inference_time_ms,
            bbox=result.bbox if result.success else None,
            success=result.success,
            brightness=result.brightness,
            angle=result.angle,
            message="検出成功" if result.success else "検出失敗"
        )
    
    except Exception as e:
        logger.error(f"検出エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # アップロードファイル削除（オプション）
        if upload_path.exists():
            try:
                upload_path.unlink()
            except Exception:
                pass


@app.post("/detect/dynamic-size", response_model=DetectionResponse)
async def detect_with_dynamic_size(
    file: UploadFile = File(...),
    mode: DetectionMode = "hybrid",
    confidence_threshold: float = 0.5,
    bento_width_mm: float = 185.0,
    bento_height_mm: float = 110.0
):
    """
    動的弁当サイズ対応検出エンドポイント（アプリ連携専用）
    
    Args:
        file: アップロード画像
        mode: 検出モード
        confidence_threshold: 信頼度閾値
        bento_width_mm: 弁当幅（mm）
        bento_height_mm: 弁当奥行き（mm）
    """
    if not detector:
        raise HTTPException(status_code=500, detail="検出器が初期化されていません")
    
    # ファイル保存
    upload_path = UPLOAD_DIR / file.filename
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"ファイル保存エラー: {e}")
        raise HTTPException(status_code=500, detail="ファイル保存に失敗しました")
    
    try:
        # 動的変換係数計算・更新
        update_detector_with_dynamic_ratio(bento_width_mm, bento_height_mm, str(upload_path))
        
        # 検出実行
        detector.confidence_threshold = confidence_threshold
        result = detector.detect(str(upload_path), mode=mode)
        
        # レスポンス情報に変換係数情報を追加
        response = DetectionResponse(
            status="success",
            filename=result.filename,
            mode=result.mode,
            confidence=result.confidence,
            inference_time_ms=result.inference_time_ms,
            bbox=result.bbox if result.success else None,
            success=result.success,
            brightness=result.brightness,
            angle=result.angle,
            message=f"検出成功 (変換係数: {detector.px_to_mm_ratio:.4f} mm/px)" if result.success else "検出失敗"
        )
        
        logger.info(f"動的サイズ検出完了: {bento_width_mm}×{bento_height_mm}mm, 係数={detector.px_to_mm_ratio:.4f}")
        return response
        
    except Exception as e:
        logger.error(f"動的サイズ検出エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # アップロードファイル削除
        if upload_path.exists():
            try:
                upload_path.unlink()
            except Exception:
                pass


@app.post("/detect/base64", response_model=DetectionResponse)
async def detect_from_base64(request: Base64DetectionRequest):
    """
    Base64エンコード画像から検出（フロントエンド推奨）
    プレビューモード対応で高速化
    
    Args:
        request: Base64検出リクエスト
            - is_preview=True: OpenCV高速モード強制、位置情報付与
            - is_preview=False: 通常検出
    """
    if not detector or not preprocessor:
        raise HTTPException(status_code=500, detail="検出器が初期化されていません")
    
    upload_path = None
    
    try:
        # Base64デコード
        image_data = base64.b64decode(request.image_base64)
        
        # 画像情報取得（位置情報計算用）
        image = Image.open(io.BytesIO(image_data))
        image_width, image_height = image.size
        
        # 画像保存（uploadsフォルダ）
        upload_path = UPLOAD_DIR / request.filename
        with open(upload_path, "wb") as f:
            f.write(image_data)
        
        # 弁当サイズが指定されている場合、動的に変換係数を更新
        if request.bento_width_mm and request.bento_height_mm:
            update_detector_with_dynamic_ratio(
                request.bento_width_mm, 
                request.bento_height_mm, 
                str(upload_path)
            )
        
        # 研究用データとしてtest_imagesにもコピー（成功時のみ）
        test_images_dir = Path("./test_images")
        test_images_dir.mkdir(parents=True, exist_ok=True)
        
        # プレビューモードの場合はOpenCV強制
        detection_mode = "opencv" if request.is_preview else request.mode
        
        # 検出実行
        detector.confidence_threshold = request.confidence_threshold
        result = detector.detect(str(upload_path), mode=detection_mode)
        
        # 検出成功時、元画像とトリミング画像の両方を保存（研究用データ収集）
        if result.success and result.confidence >= 0.5:
            # 元画像をtest_imagesに保存
            test_image_path = test_images_dir / request.filename
            shutil.copy2(str(upload_path), str(test_image_path))
            logger.info(f"✅ 元画像を研究用データとして保存: {test_image_path}")
            
            # トリミング画像をtest_images_croppedに保存
            try:
                cropped_filename = f"cropped_{request.filename}"
                cropped_output = TEST_IMAGES_CROPPED_DIR / cropped_filename
                preprocess_result = preprocessor.process_file(
                    test_image_path,
                    cropped_output,
                    detect_bento=True,
                    enhance=False  # フロントエンドから送られる画像は既に最適化されているため
                )
                if preprocess_result['status'] == 'success':
                    logger.info(f"✂️ トリミング画像を保存: {cropped_output}")
            except Exception as crop_error:
                logger.warning(f"⚠️ トリミング処理に失敗（検出は続行）: {crop_error}")
        
        # 位置情報を計算（成功時のみ）
        position_info = None
        if result.success and result.bbox:
            position_info = calculate_position_info(
                result.bbox, 
                image_width, 
                image_height
            )
        
        return DetectionResponse(
            status="success",
            filename=result.filename,
            mode=result.mode,
            confidence=result.confidence,
            inference_time_ms=result.inference_time_ms,
            bbox=result.bbox if result.success else None,
            success=result.success,
            brightness=result.brightness,
            angle=result.angle,
            message="検出成功" if result.success else "検出失敗",
            position_info=position_info
        )
    
    except Exception as e:
        logger.error(f"Base64検出エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # アップロードファイル削除
        if upload_path and upload_path.exists():
            try:
                upload_path.unlink()
            except Exception as e:
                logger.warning(f"ファイル削除失敗: {e}")


@app.post("/evaluate")
async def evaluate_folder(request: EvaluationRequest, background_tasks: BackgroundTasks):
    """
    フォルダ内全画像を評価
    
    Args:
        request: 評価リクエスト
            - folder_path: 評価対象フォルダ（Noneの場合はEVALUATION_DEFAULT_FOLDERを使用）
            - confidence_threshold: 信頼度閾値
            - generate_graphs: グラフ生成フラグ
    """
    if not evaluator or not visualizer:
        raise HTTPException(status_code=500, detail="評価器が初期化されていません")
    
    # folder_pathがNoneの場合、デフォルト値を使用
    folder_path_str = request.folder_path if request.folder_path else EVALUATION_DEFAULT_FOLDER
    folder_path = Path(folder_path_str)
    
    if not folder_path.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"フォルダが見つかりません: {folder_path}\n"
                   f"デフォルトフォルダ: {EVALUATION_DEFAULT_FOLDER}\n"
                   f"先に画像前処理を実行してください: POST /preprocess/batch"
        )
    
    try:
        # 評価実行
        detector.confidence_threshold = request.confidence_threshold
        summary = evaluator.evaluate_folder(str(folder_path))
        
        # バックグラウンドでグラフ生成
        if request.generate_graphs:
            metrics_csv = OUTPUT_DIR / "metrics.csv"
            if metrics_csv.exists():
                background_tasks.add_task(visualizer.plot_from_csv, str(metrics_csv))
        
        return {
            "status": "success",
            "summary": summary,
            "evaluated_folder": str(folder_path),
            "output_dir": str(OUTPUT_DIR),
            "metrics_csv": str(OUTPUT_DIR / "metrics.csv"),
            "logs_dir": str(OUTPUT_DIR / "logs")
        }
    
    except Exception as e:
        logger.error(f"評価エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/experiment/setup")
async def setup_experiment(request: ExperimentSetupRequest):
    """
    実験セットアップ（メタデータ生成）
    
    Args:
        request: 実験セットアップリクエスト
    """
    if not metadata_manager:
        raise HTTPException(status_code=500, detail="メタデータマネージャーが初期化されていません")
    
    try:
        metadata_path = metadata_manager.generate_metadata(
            experiment_name=request.experiment_name,
            model_name=request.model_name,
            confidence_threshold=request.confidence_threshold,
            nms_threshold=request.nms_threshold,
            remarks=request.remarks
        )
        
        return {
            "status": "success",
            "message": "実験メタデータを生成しました",
            "metadata_path": metadata_path
        }
    
    except Exception as e:
        logger.error(f"セットアップエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/results")
async def get_results():
    """
    評価結果取得
    """
    summary_path = OUTPUT_DIR / "evaluation_summary.json"
    metrics_path = OUTPUT_DIR / "metrics.csv"
    
    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="評価結果が見つかりません")
    
    import json
    with open(summary_path, 'r', encoding='utf-8') as f:
        summary = json.load(f)
    
    return {
        "status": "success",
        "summary": summary,
        "files": {
            "summary_json": str(summary_path) if summary_path.exists() else None,
            "metrics_csv": str(metrics_path) if metrics_path.exists() else None
        }
    }


@app.get("/visualizations")
async def list_visualizations():
    """
    生成されたグラフ一覧
    """
    viz_dir = OUTPUT_DIR / "visualizations"
    
    if not viz_dir.exists():
        return {"status": "success", "visualizations": []}
    
    graphs = [
        {"name": p.name, "path": str(p)} 
        for p in viz_dir.glob("*.png")
    ]
    
    return {
        "status": "success",
        "visualizations": graphs,
        "count": len(graphs)
    }


@app.get("/visualizations/{filename}")
async def get_visualization(filename: str):
    """
    グラフ画像ファイル取得
    
    Args:
        filename: グラフファイル名
    """
    file_path = OUTPUT_DIR / "visualizations" / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="グラフが見つかりません")
    
    return FileResponse(file_path)


@app.get("/logs")
async def list_logs(limit: int = 50):
    """
    ログファイル一覧
    
    Args:
        limit: 取得件数上限
    """
    logs_dir = OUTPUT_DIR / "logs"
    
    if not logs_dir.exists():
        return {"status": "success", "logs": []}
    
    log_files = sorted(logs_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    log_files = log_files[:limit]
    
    logs = []
    for log_file in log_files:
        import json
        with open(log_file, 'r', encoding='utf-8') as f:
            log_data = json.load(f)
            logs.append(log_data)
    
    return {
        "status": "success",
        "logs": logs,
        "count": len(logs)
    }


@app.delete("/clear")
async def clear_outputs():
    """
    出力ファイルをクリア
    """
    try:
        # ログクリア
        logs_dir = OUTPUT_DIR / "logs"
        if logs_dir.exists():
            for f in logs_dir.glob("*"):
                f.unlink()
        
        # グラフクリア
        viz_dir = OUTPUT_DIR / "visualizations"
        if viz_dir.exists():
            for f in viz_dir.glob("*"):
                f.unlink()
        
        return {
            "status": "success",
            "message": "出力ファイルをクリアしました"
        }
    
    except Exception as e:
        logger.error(f"クリアエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preprocess/batch")
async def preprocess_batch(
    input_dir: str = "./test_images",
    output_dir: str = "./test_images_cropped",
    detect_bento: bool = True,
    enhance: bool = False
):
    """
    test_images内の画像を一括前処理
    
    Args:
        input_dir: 入力ディレクトリ
        output_dir: 出力ディレクトリ
        detect_bento: お弁当箱検出を行うか
        enhance: 画質向上処理を行うか
    
    Returns:
        処理結果のサマリー
    """
    if not preprocessor:
        raise HTTPException(status_code=500, detail="前処理器が初期化されていません")
    
    try:
        input_path = Path(input_dir)
        output_path = Path(output_dir)
        
        if not input_path.exists():
            raise HTTPException(status_code=404, detail=f"入力ディレクトリが見つかりません: {input_dir}")
        
        # 一括処理実行
        summary = preprocessor.batch_process(
            input_path,
            output_path,
            pattern="*.jpg",
            detect_bento=detect_bento,
            enhance=enhance
        )
        
        return {
            "status": "success",
            "summary": summary,
            "input_dir": str(input_path),
            "output_dir": str(output_path)
        }
    
    except Exception as e:
        logger.error(f"一括前処理エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preprocess/single")
async def preprocess_single(
    filename: str,
    input_dir: str = "./test_images",
    output_dir: str = "./test_images_cropped",
    detect_bento: bool = True,
    enhance: bool = False
):
    """
    単一画像の前処理
    
    Args:
        filename: ファイル名
        input_dir: 入力ディレクトリ
        output_dir: 出力ディレクトリ
        detect_bento: お弁当箱検出を行うか
        enhance: 画質向上処理を行うか
    
    Returns:
        処理結果
    """
    if not preprocessor:
        raise HTTPException(status_code=500, detail="前処理器が初期化されていません")
    
    try:
        input_path = Path(input_dir) / filename
        output_path = Path(output_dir) / filename
        
        if not input_path.exists():
            raise HTTPException(status_code=404, detail=f"ファイルが見つかりません: {input_path}")
        
        # 処理実行
        result = preprocessor.process_file(
            input_path,
            output_path,
            detect_bento=detect_bento,
            enhance=enhance
        )
        
        return {
            "status": "success",
            "result": result
        }
    
    except Exception as e:
        logger.error(f"前処理エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {HOST}:{PORT}")
    logger.info("モード: OpenCV単体 / YOLO単体 / ハイブリッド")
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info"
    )
