"""
AyurVision AI Service - Prediction logic for medicinal plant leaf classification.
YOLOv8 detects and crops leaf ROI; EfficientNet classifies the crop with TTA.
"""

import logging
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

from leaf_detection import (
    CLASSIFIER_IMG_SIZE,
    YOLO_MODEL_PATH,
    extract_leaf_for_classifier,
    load_yolo_detector,
)

# Backward-compatible names (same values as leaf_detection).
SCRIPT_DIR = Path(__file__).resolve().parent
IMG_SIZE = CLASSIFIER_IMG_SIZE
EFFICIENTNET_MODEL_PATH = SCRIPT_DIR / "model" / "plant_classifier.h5"
CLASS_NAMES_PATH = SCRIPT_DIR / "model" / "class_names.txt"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

_efficientnet_model = None
_class_names = None


def _load_class_names():
    """Load ordered class labels from file written during training."""
    global _class_names
    if _class_names is not None:
        return _class_names
    if not CLASS_NAMES_PATH.exists():
        raise FileNotFoundError(
            f"Class names file not found: {CLASS_NAMES_PATH}. Run train.py first."
        )
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        _class_names = [line.strip() for line in f if line.strip()]
    logger.info("Loaded %d class labels", len(_class_names))
    return _class_names


def load_yolo_model():
    """Lazy-load YOLO (alias used by tooling); delegates to leaf_detection."""
    return load_yolo_detector()


def load_efficientnet_model():
    """Lazy-load EfficientNet plant classifier and class names."""
    global _efficientnet_model
    if _efficientnet_model is not None:
        return _efficientnet_model
    if not EFFICIENTNET_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {EFFICIENTNET_MODEL_PATH}. Run train.py first."
        )
    logger.info("Loading model from %s", EFFICIENTNET_MODEL_PATH)
    _efficientnet_model = keras.models.load_model(EFFICIENTNET_MODEL_PATH)
    _load_class_names()
    return _efficientnet_model


def load_model():
    """Alias for startup / external callers — loads EfficientNet classifier."""
    return load_efficientnet_model()


_tta_augment = tf.keras.Sequential(
    [
        tf.keras.layers.RandomRotation(0.1),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomBrightness(0.15),
    ],
    name="tta_augment",
)


def predict_image(image_path: str, tta_steps: int = 8) -> dict:
    """
    YOLO crop then EfficientNet with Test-Time Augmentation (TTA).
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    model = load_efficientnet_model()
    class_names = _load_class_names()

    img_array, yolo_detected = extract_leaf_for_classifier(path)
    img_tensor = tf.convert_to_tensor(np.expand_dims(img_array, axis=0))

    all_preds = []
    for _ in range(tta_steps):
        aug = _tta_augment(img_tensor, training=True)
        preds = model.predict(aug, verbose=0)
        all_preds.append(preds[0])

    avg_preds = np.mean(all_preds, axis=0)
    idx = int(np.argmax(avg_preds))

    return {
        "plant": class_names[idx],
        "confidence": round(float(avg_preds[idx]), 4),
        "tta_steps": tta_steps,
        "model": "yolo+efficientnet",
        "yolo_detected": yolo_detected,
    }
