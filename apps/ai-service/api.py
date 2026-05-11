"""
AyurVision AI Service - Flask API for plant leaf classification.
Exposes POST /predict-plant for image upload and prediction.
"""

import os
import logging
import tempfile
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

from predict import predict_image, load_model
from prakriti_predict import predict_prakriti, get_prakriti_inference_keys
from dotenv import load_dotenv as _load_dotenv
from pathlib import Path as _Path
_api_dir = _Path(__file__).resolve().parent
for _env_file in (".env", ".env.example"):
    if (_api_dir / _env_file).exists():
        _load_dotenv(_api_dir / _env_file)
        break
from rag.query import rag_query as _rag_query

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Allow browser calls (React dev server) to hit API routes
CORS(app, resources={
    r"/health": {"origins": "*"},
    r"/predict": {"origins": "*"},
    r"/predict-plant": {"origins": "*"},
    r"/predict-prakriti": {"origins": "*"},
    r"/rag-query": {"origins": "*"},
})
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload

# Allowed extensions for image upload
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "webp"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTENSIONS


@app.route("/health", methods=["GET"])
def health():
    """Health check for load balancers and backend."""
    return jsonify({"status": "ok", "service": "ayurvision-ai"})


@app.route("/predict-plant", methods=["POST"])
def predict_plant():
    """
    Accept an image file, run the plant classifier, return plant and confidence.

    Request: multipart/form-data with field 'image' (or 'file') containing the image.
    Response: {"plant": "<name>", "confidence": <0-1>}
    """
    if "image" not in request.files and "file" not in request.files:
        return jsonify({"error": "No image provided. Use form field 'image' or 'file'."}), 400

    file = request.files.get("image") or request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": "Invalid file type. Allowed: " + ", ".join(ALLOWED_EXTENSIONS),
        }), 400

    tmp_path = None
    try:
        # Save to a temporary file (predict.py expects a path)
        suffix = Path(file.filename).suffix or ".jpg"
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        file.save(tmp_path)

        result = predict_image(tmp_path)
        return jsonify(result)
    except FileNotFoundError as e:
        logger.warning("Model or image missing: %s", e)
        return jsonify({"error": "Model or image not found. Train the model first."}), 503
    except ValueError as e:
        logger.warning("Invalid image: %s", e)
        return jsonify({"error": "Could not process image."}), 400
    except Exception as e:
        logger.exception("Prediction failed: %s", e)
        return jsonify({"error": "Prediction failed."}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


app.add_url_rule("/predict", view_func=predict_plant, methods=["POST"])


@app.route("/predict-prakriti", methods=["POST"])
def predict_prakriti_route():
    """
    Accept JSON body with patient answers to 24 Prakriti questions.
    Returns dosha percentages, dominant dosha, and SHAP explanations.

    Request: application/json with keys: age, gender, Q1_Body_Size, Q2_Body_Weight, ... Q24_Mind_Temperament
    Response: {vata_pct, pitta_pct, kapha_pct, dominant_dosha, confidence, dosha_probabilities, top_features, interpretation}
    """
    try:
        if not request.is_json:
            raise ValueError("Content-Type must be application/json")

        data = request.get_json(silent=False)
        if not isinstance(data, dict):
            raise ValueError("Request body must be a JSON object")

        # Validate required keys using feature_names from metadata
        from pathlib import Path as _P
        import json as _json

        model_dir = _P(__file__).resolve().parent / "model"
        meta_path = model_dir / "prakriti_metadata.json"
        if meta_path.exists():
            metadata = _json.loads(meta_path.read_text(encoding="utf-8"))
            feature_names = metadata.get("feature_names") or []
            validate_keys = metadata.get("inference_input_keys") or feature_names
        else:
            logger.info(
                "prakriti_metadata.json not found; validating request with built-in inference keys"
            )
            validate_keys = get_prakriti_inference_keys()

        missing = [k for k in validate_keys if k not in data]
        if missing:
            raise ValueError(f"Missing required keys: {missing}")

        # Also ensure no null/empty values for questionnaire keys
        for k in validate_keys:
            if data.get(k) is None or (isinstance(data.get(k), str) and not str(data.get(k)).strip()):
                raise ValueError(f"Invalid value for '{k}'")

        result = predict_prakriti(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception("Prakriti prediction failed: %s", e)
        return jsonify({"error": "Prediction failed"}), 500


@app.route("/rag-query", methods=["POST"])
def rag_query_endpoint():
    """
    RAG knowledge query endpoint.

    Request JSON: { "question": "...", "plant": "Neem" (optional) }
    Response: { "answer": "...", "sources": [...], "retrieved_chunks": 5, "model": "..." }
    """
    data = request.get_json(silent=True)
    if not data or not data.get("question"):
        return jsonify({"error": "Missing 'question' in request body"}), 400

    question = str(data["question"]).strip()
    if len(question) < 3:
        return jsonify({"error": "Question too short"}), 400

    plant_filter = data.get("plant") or None

    try:
        result = _rag_query(question, plant_filter=plant_filter)
        return jsonify(result)
    except ValueError as e:
        logger.warning("RAG config error: %s", e)
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        logger.exception("RAG query failed: %s", e)
        return jsonify({"error": "Knowledge query failed."}), 500


if __name__ == "__main__":
    # Preload model at startup so first request is fast
    try:
        load_model()
        logger.info("Model loaded successfully.")
    except FileNotFoundError as e:
        logger.warning("Model not loaded: %s. Train with train.py first.", e)

    app.run(host="0.0.0.0", port=5000, debug=False)
