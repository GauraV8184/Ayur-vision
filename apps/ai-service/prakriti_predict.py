import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from prakriti_train import (
    AFFINITY_COLS,
    PRAKRITI_ENCODING_SPEC,
    add_dosha_affinity_features,
    map_answer_with_fuzzy,
    strip_hindi_parens,
)

logger = logging.getLogger("prakriti_predict")

_classifier = None
_label_encoder = None
_metadata: Optional[Dict[str, Any]] = None
_shap_importance: Optional[Dict[str, float]] = None
_ensemble_path_used: Optional[str] = None


def _load_artifacts() -> None:
    global _classifier, _label_encoder, _metadata, _shap_importance, _ensemble_path_used
    if _metadata is not None and _classifier is not None and _label_encoder is not None and _shap_importance is not None:
        return

    base_dir = Path(__file__).resolve().parent
    model_dir = base_dir / "model"

    _metadata = json.loads((model_dir / "prakriti_metadata.json").read_text(encoding="utf-8"))
    _shap_importance = json.loads((model_dir / "prakriti_shap_importance.json").read_text(encoding="utf-8"))
    _label_encoder = joblib.load(model_dir / "prakriti_label_encoder.pkl")

    ens_path = model_dir / "prakriti_ensemble.pkl"
    rf_path = model_dir / "prakriti_rf_classifier.pkl"
    if ens_path.exists():
        _classifier = joblib.load(ens_path)
        _ensemble_path_used = str(ens_path.name)
    else:
        _classifier = joblib.load(rf_path)
        _ensemble_path_used = str(rf_path.name)
        logger.warning("Using legacy %s (ensemble not found)", _ensemble_path_used)


def _normalize_pct(v: float, p: float, k: float) -> Tuple[float, float, float]:
    vv = max(0.0, float(v))
    pp = max(0.0, float(p))
    kk = max(0.0, float(k))
    total = vv + pp + kk
    if total <= 0:
        return 33.3, 33.3, 33.4
    return vv / total * 100.0, pp / total * 100.0, kk / total * 100.0


def _derive_dosha_components(dominant: str, proba_dict_pct: Dict[str, float]) -> Tuple[float, float, float]:
    """Derive Vata/Pitta/Kapha % from 6-class probability masses (%)."""
    dosha_weights = {
        "Vata": (1.0, 0.0, 0.0),
        "Pitta": (0.0, 1.0, 0.0),
        "Kapha": (0.0, 0.0, 1.0),
        "Pitta-Vata": (0.45, 0.45, 0.1),
        "Kapha-Pitta": (0.1, 0.45, 0.45),
        "Kapha-Vata": (0.45, 0.1, 0.45),
    }
    # proba_dict_pct values are 0–100
    v = sum((proba_dict_pct.get(cls, 0.0) / 100.0) * weights[0] for cls, weights in dosha_weights.items())
    p = sum((proba_dict_pct.get(cls, 0.0) / 100.0) * weights[1] for cls, weights in dosha_weights.items())
    k = sum((proba_dict_pct.get(cls, 0.0) / 100.0) * weights[2] for cls, weights in dosha_weights.items())
    return _normalize_pct(v * 100.0, p * 100.0, k * 100.0)


def get_prakriti_inference_keys() -> List[str]:
    """Keys required in the JSON body (matches training `inference_input_keys`)."""
    return ["age", "gender"] + list(PRAKRITI_ENCODING_SPEC.keys())


def _artifacts_present() -> bool:
    model_dir = Path(__file__).resolve().parent / "model"
    meta = model_dir / "prakriti_metadata.json"
    shap = model_dir / "prakriti_shap_importance.json"
    le = model_dir / "prakriti_label_encoder.pkl"
    ens = model_dir / "prakriti_ensemble.pkl"
    rf = model_dir / "prakriti_rf_classifier.pkl"
    return (
        meta.exists()
        and shap.exists()
        and le.exists()
        and (ens.exists() or rf.exists())
    )


def _validate_prakriti_answers(answers: Dict[str, Any]) -> None:
    keys = get_prakriti_inference_keys()
    missing = [k for k in keys if k not in answers]
    if missing:
        raise ValueError(f"Missing required keys: {missing}")
    for k in keys:
        v = answers.get(k)
        if v is None or (isinstance(v, str) and not str(v).strip()):
            raise ValueError(f"Invalid value for '{k}'")


def _dual_prakriti_name(a: str, b: str) -> str:
    key = frozenset({a, b})
    if key == frozenset({"Vata", "Pitta"}):
        return "Pitta-Vata"
    if key == frozenset({"Pitta", "Kapha"}):
        return "Kapha-Pitta"
    if key == frozenset({"Vata", "Kapha"}):
        return "Kapha-Vata"
    return a


def _heuristic_dominant_from_balance(v_pct: float, p_pct: float, k_pct: float) -> str:
    scores = [("Vata", v_pct), ("Pitta", p_pct), ("Kapha", k_pct)]
    scores.sort(key=lambda x: -x[1])
    (d1, s1), (d2, s2), _ = scores
    if s1 - s2 >= 10.0:
        return d1
    return _dual_prakriti_name(d1, d2)


def _build_encoded_row(answers: Dict[str, Any]) -> Dict[str, Any]:
    g = str(answers.get("gender", "")).strip().lower()
    if g in ("male", "m"):
        gender_val = 0.0
    elif g in ("female", "f"):
        gender_val = 1.0
    else:
        raise ValueError("gender must be 'Male' or 'Female'")

    age_val = float(int(answers.get("age")))

    row: Dict[str, Any] = {"age": age_val, "gender": gender_val}
    for col in PRAKRITI_ENCODING_SPEC:
        spec = PRAKRITI_ENCODING_SPEC[col]
        raw = strip_hindi_parens(str(answers.get(col, "")).strip())
        _, code = map_answer_with_fuzzy(col, raw, spec)
        row[col] = int(code)
    return row


def _predict_prakriti_heuristic(answers: Dict[str, Any]) -> Dict[str, Any]:
    row = _build_encoded_row(answers)
    X_base = pd.DataFrame([row])
    X_full = add_dosha_affinity_features(X_base)
    va = float(X_full["vata_affinity"].iloc[0])
    pa = float(X_full["pitta_affinity"].iloc[0])
    ka = float(X_full["kapha_affinity"].iloc[0])
    t = va + pa + ka
    if t <= 0:
        v_pct, p_pct, k_pct = 33.3, 33.3, 33.4
    else:
        v_pct = round(100.0 * va / t, 1)
        p_pct = round(100.0 * pa / t, 1)
        k_pct = round(100.0 - v_pct - p_pct, 1)

    dominant = _heuristic_dominant_from_balance(v_pct, p_pct, k_pct)
    margin = sorted([v_pct, p_pct, k_pct], reverse=True)
    top_margin = margin[0] - margin[1]
    top_confidence = min(0.78, max(0.48, 0.48 + top_margin / 250.0))
    low_confidence = top_margin < 12.0

    classes = ["Vata", "Pitta", "Kapha", "Pitta-Vata", "Kapha-Pitta", "Kapha-Vata"]
    rest_p = (1.0 - top_confidence) / max(len(classes) - 1, 1)
    dosha_probabilities = {c: rest_p for c in classes}
    dosha_probabilities[dominant] = top_confidence
    all_class_probabilities = {
        k: round(float(v) * 100.0, 1) for k, v in dosha_probabilities.items()
    }

    feat_scores = [(col, abs(float(row[col]) - 1.0)) for col in PRAKRITI_ENCODING_SPEC]
    feat_scores.sort(key=lambda x: -x[1])
    top_features = [{"feature": k, "importance": float(v)} for k, v in feat_scores[:5]]

    return {
        "vata_pct": round(float(v_pct), 1),
        "pitta_pct": round(float(p_pct), 1),
        "kapha_pct": round(float(k_pct), 1),
        "dosha_percentages": {
            "vata": round(float(v_pct), 1),
            "pitta": round(float(p_pct), 1),
            "kapha": round(float(k_pct), 1),
        },
        "dominant_dosha": dominant,
        "confidence": top_confidence,
        "confidence_pct": round(top_confidence * 100.0, 1),
        "low_confidence": low_confidence,
        "dosha_probabilities": dosha_probabilities,
        "all_class_probabilities": all_class_probabilities,
        "top_features": top_features,
        "interpretation": _interpretation(dominant, float(v_pct), float(p_pct), float(k_pct)),
        "model_used": "rule_based_fallback",
    }


def _interpretation(dominant: str, v: float, p: float, k: float) -> str:
    dom = dominant.strip()
    templates = {
        "Vata": "Your constitution is primarily Vata, indicating qualities of movement, creativity, and variability. Focus on warmth, routine, and grounding practices.",
        "Pitta": "Your constitution is primarily Pitta, reflecting intensity, sharp digestion, and drive. Prioritize cooling foods, moderation, and calming routines.",
        "Kapha": "Your constitution is primarily Kapha, suggesting stability, endurance, and steadiness. Support lightness with regular movement, warming spices, and stimulation.",
        "Pitta-Vata": "Your constitution is Pitta-Vata, blending intensity with variability. Balance heat and changeability with cooling, nourishing meals and consistent daily rhythms.",
        "Kapha-Pitta": "Your constitution is Kapha-Pitta, combining steadiness with strong metabolism. Favor light, cooling routines and avoid excess heaviness or overheating.",
        "Kapha-Vata": "Your constitution is Kapha-Vata, mixing steadiness with fluctuations. Emphasize warm, nourishing foods, gentle activity, and regular sleep to stay grounded.",
    }
    if dom in templates:
        return templates[dom]
    return (
        f"Your Prakriti profile suggests Vata {v:.1f}%, Pitta {p:.1f}%, Kapha {k:.1f}%. "
        "Use consistent routines and diet/lifestyle choices that support your dominant tendencies."
    )


def predict_prakriti(answers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict Prakriti from questionnaire answers.

    Expected keys (see metadata inference_input_keys): age, gender, Q1..Q24.
    """
    if not isinstance(answers, dict):
        raise ValueError("answers must be an object")

    _validate_prakriti_answers(answers)

    if not _artifacts_present():
        logger.warning(
            "Prakriti ML artifacts missing under ai-service/model; using rule-based fallback"
        )
        return _predict_prakriti_heuristic(answers)

    _load_artifacts()

    assert _metadata is not None and _shap_importance is not None
    assert _classifier is not None and _label_encoder is not None

    feature_names: List[str] = list(_metadata.get("feature_names") or [])
    if not feature_names:
        raise ValueError("Model metadata is missing feature_names")

    row = _build_encoded_row(answers)
    X_base = pd.DataFrame([row])
    X_full = add_dosha_affinity_features(X_base)
    try:
        X = X_full[feature_names].to_numpy(dtype=float)
    except KeyError as e:
        raise ValueError(f"Model feature_names mismatch with encoded row: {e}") from e

    proba = _classifier.predict_proba(X)[0]
    classes: List[str] = [str(c) for c in list(_label_encoder.classes_)]
    top_idx = int(np.argmax(proba))
    dominant = classes[top_idx]
    top_confidence = float(proba[top_idx])

    all_class_probabilities = {classes[i]: round(float(proba[i]) * 100.0, 1) for i in range(len(classes))}
    dosha_probabilities = {classes[i]: float(proba[i]) for i in range(len(classes))}

    v_pct, p_pct, k_pct = _derive_dosha_components(dominant, all_class_probabilities)

    low_confidence = top_confidence < 0.55

    top5 = list(_shap_importance.items())[:5]
    top_features = [{"feature": k, "importance": float(v)} for k, v in top5]

    return {
        "vata_pct": round(float(v_pct), 1),
        "pitta_pct": round(float(p_pct), 1),
        "kapha_pct": round(float(k_pct), 1),
        "dosha_percentages": {
            "vata": round(float(v_pct), 1),
            "pitta": round(float(p_pct), 1),
            "kapha": round(float(k_pct), 1),
        },
        "dominant_dosha": dominant,
        "confidence": top_confidence,
        "confidence_pct": round(top_confidence * 100.0, 1),
        "low_confidence": low_confidence,
        "dosha_probabilities": dosha_probabilities,
        "all_class_probabilities": all_class_probabilities,
        "top_features": top_features,
        "interpretation": _interpretation(dominant, float(v_pct), float(p_pct), float(k_pct)),
        "model_used": _ensemble_path_used,
    }
