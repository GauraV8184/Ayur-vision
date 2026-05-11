"""
AyurVision AI Service - Training script for medicinal plant leaf classification.
Uses EfficientNetB3 (ImageNet) transfer learning with data augmentation.

Dataset selection:
  - auto (default): trains on cropped_leaf_dataset/ if present (matches YOLO+EfficientNet inference),
                    otherwise raw folder dataset.
  - --mode raw:     always use original dataset tree.
  - --mode cropped: always use YOLO-generated crops (see prepare_cropped_dataset.py).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.preprocessing import image_dataset_from_directory

from dataset_config import (
    CROPPED_DATASET_DIR,
    is_cropped_dataset_ready,
    resolve_raw_dataset_dir,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_SAVE_PATH = SCRIPT_DIR / "model" / "plant_classifier.h5"
CLASS_NAMES_PATH = SCRIPT_DIR / "model" / "class_names.txt"

IMG_SIZE = (300, 300)
BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2
SEED = 42
EPOCHS = 30

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def resolve_training_data_dir(mode: str) -> tuple[Path, bool]:
    """
    Returns (data_dir_path, using_cropped_dataset).
    """
    if mode == "cropped":
        if not is_cropped_dataset_ready():
            logger.error(
                "Cropped dataset not ready at %s. Run: python prepare_cropped_dataset.py",
                CROPPED_DATASET_DIR,
            )
            sys.exit(1)
        logger.info(
            "Training mode=cropped — EfficientNet on YOLO-aligned ROIs at %s",
            CROPPED_DATASET_DIR,
        )
        return CROPPED_DATASET_DIR.resolve(), True

    if mode == "raw":
        raw = resolve_raw_dataset_dir()
        logger.info(
            "Training mode=raw — full images from %s (no YOLO crop at train time)",
            raw,
        )
        return raw.resolve(), False

    # auto
    if is_cropped_dataset_ready():
        logger.info(
            "Training mode=auto — using CROPPED dataset at %s (recommended for YOLO+EfficientNet).",
            CROPPED_DATASET_DIR,
        )
        return CROPPED_DATASET_DIR.resolve(), True

    raw = resolve_raw_dataset_dir()
    logger.info(
        "Training mode=auto — no cropped dataset at %s; using RAW dataset %s",
        CROPPED_DATASET_DIR,
        raw,
    )
    logger.info(
        "Tip: run `python prepare_cropped_dataset.py` then re-run training so crops match inference."
    )
    return raw.resolve(), False


def build_training_pipeline(data_dir: str, on_cropped_data: bool):
    """
    Load dataset with image_dataset_from_directory, split train/val,
    apply preprocessing and augmentation.
    """
    logger.info(
        "Loading dataset from %s (batch_size=%s, validation_split=%.0f%%, cropped=%s)",
        data_dir,
        BATCH_SIZE,
        VALIDATION_SPLIT * 100,
        on_cropped_data,
    )

    train_ds = image_dataset_from_directory(
        data_dir,
        labels="inferred",
        label_mode="categorical",
        class_names=None,
        color_mode="rgb",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=True,
        seed=SEED,
        validation_split=VALIDATION_SPLIT,
        subset="training",
    )
    class_names = train_ds.class_names
    logger.info("Detected %d classes (order is lexical by folder name).", len(class_names))

    val_ds = image_dataset_from_directory(
        data_dir,
        labels="inferred",
        label_mode="categorical",
        class_names=class_names,
        color_mode="rgb",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=False,
        seed=SEED,
        validation_split=VALIDATION_SPLIT,
        subset="validation",
    )

    def preprocess(images, labels):
        return images, labels

    if on_cropped_data:
        # Crops already isolate the leaf — gentler geom, label-preserving aug.
        augmentation = keras.Sequential(
            [
                layers.RandomRotation(factor=0.18),
                layers.RandomZoom(height_factor=0.18, width_factor=0.18),
                layers.RandomFlip(mode="horizontal"),
                layers.RandomTranslation(height_factor=0.08, width_factor=0.08),
                layers.RandomContrast(factor=0.2),
                layers.RandomBrightness(factor=0.2),
            ],
            name="augmentation_cropped",
        )
    else:
        augmentation = keras.Sequential(
            [
                layers.RandomRotation(factor=0.25),
                layers.RandomZoom(height_factor=0.35, width_factor=0.35),
                layers.RandomFlip(mode="horizontal_and_vertical"),
                layers.RandomTranslation(height_factor=0.15, width_factor=0.15),
                layers.RandomContrast(factor=0.3),
                layers.RandomBrightness(factor=0.3),
            ],
            name="augmentation_raw",
        )

    def augment(images, labels):
        return augmentation(images, training=True), labels

    train_ds = train_ds.map(preprocess, num_parallel_calls=tf.data.AUTOTUNE)
    train_ds = train_ds.map(augment, num_parallel_calls=tf.data.AUTOTUNE)
    val_ds = val_ds.map(preprocess, num_parallel_calls=tf.data.AUTOTUNE)

    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.prefetch(tf.data.AUTOTUNE)

    return train_ds, val_ds, class_names


def build_model(num_classes: int):
    """
    EfficientNetB3 backbone (300x300) with regularized head.
    """
    base = EfficientNetB3(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
        pooling=None,
    )
    base.trainable = False

    inputs = keras.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(
        512,
        activation="relu",
        kernel_regularizer=keras.regularizers.l2(1e-4),
    )(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(
        256,
        activation="relu",
        kernel_regularizer=keras.regularizers.l2(1e-4),
    )(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = Model(inputs, outputs, name="plant_classifier")
    return model, base


def unfreeze_top_layers(model, base, num_layers=10):
    for layer in base.layers[:-num_layers]:
        layer.trainable = False
    for layer in base.layers[-num_layers:]:
        layer.trainable = True
    model.compile(
        optimizer=Adam(learning_rate=1e-6),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=["accuracy"],
    )
    logger.info(
        "Unfroze top %d backbone layers. Fine-tuning at lr=1e-6", num_layers
    )


def main():
    parser = argparse.ArgumentParser(description="Train EfficientNet plant classifier.")
    parser.add_argument(
        "--mode",
        choices=("auto", "raw", "cropped"),
        default="auto",
        help="auto: use cropped dataset if present, else raw. raw/cropped: force.",
    )
    args = parser.parse_args()

    try:
        data_path, on_cropped = resolve_training_data_dir(args.mode)
    except FileNotFoundError as e:
        logger.error("%s", e)
        sys.exit(1)

    data_dir = str(data_path)
    train_ds, val_ds, class_names = build_training_pipeline(data_dir, on_cropped)
    num_classes = len(class_names)
    logger.info("Num classes: %d", num_classes)

    model, base = build_model(num_classes)

    model_dir = MODEL_SAVE_PATH.parent
    model_dir.mkdir(parents=True, exist_ok=True)

    phase1_callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=6,
            restore_best_weights=True,
            verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        keras.callbacks.ModelCheckpoint(
            str(MODEL_SAVE_PATH),
            save_best_only=True,
            monitor="val_accuracy",
            verbose=1,
        ),
    ]

    logger.info("=== Phase 1: Training classifier head (backbone frozen) ===")
    model.compile(
        optimizer=Adam(learning_rate=5e-4),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=["accuracy"],
    )
    model.summary(print_fn=logger.info)
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=25,
        callbacks=phase1_callbacks,
    )

    phase1_path = MODEL_SAVE_PATH.parent / "plant_classifier_phase1.h5"
    model.save(str(phase1_path))
    logger.info("Phase 1 checkpoint saved to %s", phase1_path)

    phase2_callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-8,
            verbose=1,
        ),
        keras.callbacks.ModelCheckpoint(
            str(MODEL_SAVE_PATH),
            save_best_only=True,
            monitor="val_accuracy",
            verbose=1,
        ),
    ]

    logger.info("=== Phase 2: Fine-tuning top 10 backbone layers at lr=1e-6 ===")
    unfreeze_top_layers(model, base, num_layers=10)
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=phase2_callbacks,
    )

    with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(class_names))
    logger.info("Training complete. Model saved to %s", MODEL_SAVE_PATH)
    logger.info("Class names written to %s", CLASS_NAMES_PATH)
    logger.info("Phase 1 backup at %s", phase1_path)


if __name__ == "__main__":
    main()
