import json
import logging
import re
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import shap
from difflib import get_close_matches
from imblearn.combine import SMOTEENN
from imblearn.over_sampling import RandomOverSampler, SMOTE
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import (
    balanced_accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

logger = logging.getLogger("prakriti_train")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

warnings.filterwarnings("ignore", category=UserWarning)

_SCORE_COLS = ["Vata_Score", "Pitta_Score", "Kapha_Score"]
_TARGET_COL = "Dominant_Dosha"

_PARENS_RE = re.compile(r"\([^)]*\)")
_NON_ALNUM_UNDERSCORE_RE = re.compile(r"[^A-Za-z0-9_]+")
_UNDERSCORE_RUN_RE = re.compile(r"_+")

# Canonical answer aliases — CSV variants → encoding spec keys
ANSWER_ALIASES: Dict[str, Dict[str, str]] = {
    "Q6_General_Features": {
        "Dryness, pigmentation": "Thin/prominent features",
        "Smooth, oily": "Soft/rounded features",
        "Warm, freckles": "Sharp/defined features",
    },
    "Q7_Skin_Texture": {
        "Dry, rough": "Dry/rough",
        "Warm, acne-prone": "Sensitive/oily",
        "Smooth, oily": "Moist/smooth",
    },
    "Q9_Overall_Appearance": {
        "Thin/dry look": "Thin/angular",
        "Plump/oily look": "Heavy/rounded",
        "Sharp features": "Medium/proportional",
    },
    "Q10_Eyes_Shape": {
        "Small, active": "Small/narrow",
        "Medium, sharp": "Medium/sharp",
        "Large, round": "Large/round",
    },
    "Q13_Cheeks": {
        "Wrinkled/dry": "Sunken",
        "Rounded, fleshy": "Round/full",
        "Red, sharp": "Moderate",
    },
    "Q16_Nails": {
        "Sharp, reddish": "Medium",
        "Dry, brittle": "Thin/brittle",
        "Thick, oily": "Thick/strong",
    },
    "Q20_Energy_Stamina": {
        "Variable": "Bursts/variable",
        "Steady, long-lasting": "Sustained/slow",
        "Intense, short-lived": "Moderate/intense",
    },
    "Q22_Bowel_Habits": {
        "Irregular, hard stools": "Irregular/constipated",
        "Regular, well-formed": "Regular/heavy",
        "Loose, frequent": "Regular/loose",
    },
    "Q23_Thirst": {
        "Low/variable": "Variable",
        "High": "Excessive",
        "Moderate": "Moderate",
    },
    "Q24_Mind_Temperament": {
        "Anxious, restless": "Active/anxious",
        "Calm, patient": "Calm/steady",
        "Focused, ambitious": "Focused/intense",
    },
}

VATA_FEATURE_MAP = {
    "Q1_Body_Size": 0,
    "Q7_Skin_Texture": 0,
    "Q17_Appetite": 0,
    "Q19_Sleep": 0,
    "Q22_Bowel_Habits": 0,
    "Q24_Mind_Temperament": 0,
}
PITTA_FEATURE_MAP = {
    "Q5_Complexion": 1,
    "Q7_Skin_Texture": 1,
    "Q17_Appetite": 1,
    "Q21_Sweating": 1,
    "Q24_Mind_Temperament": 1,
}
KAPHA_FEATURE_MAP = {
    "Q1_Body_Size": 2,
    "Q4_Bone_Structure": 2,
    "Q7_Skin_Texture": 2,
    "Q17_Appetite": 2,
    "Q19_Sleep": 2,
    "Q24_Mind_Temperament": 2,
}

AFFINITY_COLS = [
    "vata_affinity",
    "pitta_affinity",
    "kapha_affinity",
    "vata_ratio",
    "pitta_ratio",
    "kapha_ratio",
]

PRAKRITI_ENCODING_SPEC: Dict[str, Dict[str, int]] = {
    "Q1_Body_Size": {"Slim": 0, "Medium": 1, "Large/Heavy": 2},
    "Q2_Body_Weight": {"Low, difficult to gain": 0, "Moderate": 1, "Heavy, difficult to lose": 2},
    "Q3_Height": {"Tall": 0, "Medium": 1, "Short": 2},
    "Q4_Bone_Structure": {"Light, small joints": 0, "Medium": 1, "Broad, large": 2},
    "Q5_Complexion": {"Dark/dull": 0, "Fair/reddish": 1, "Pale, white, glowing": 2},
    "Q6_General_Features": {
        "Thin/prominent features": 0,
        "Sharp/defined features": 1,
        "Soft/rounded features": 2,
    },
    "Q7_Skin_Texture": {"Dry/rough": 0, "Sensitive/oily": 1, "Moist/smooth": 2},
    "Q8_Hair_Color": {"Dark/black": 0, "Brown/reddish": 1, "Light/blonde": 2},
    "Q9_Overall_Appearance": {"Thin/angular": 0, "Medium/proportional": 1, "Heavy/rounded": 2},
    "Q10_Eyes_Shape": {"Small/narrow": 0, "Medium/sharp": 1, "Large/round": 2},
    "Q11_Eyelashes": {"Thin/dry": 0, "Moderate": 1, "Thick/long": 2},
    "Q12_Blinking": {"Frequent": 0, "Moderate": 1, "Rare": 2},
    "Q13_Cheeks": {"Sunken": 0, "Moderate": 1, "Round/full": 2},
    "Q14_Nose": {"Thin/small": 0, "Medium": 1, "Large/broad": 2},
    "Q15_Teeth_Lips": {"Thin/irregular": 0, "Medium": 1, "Large/full": 2},
    "Q16_Nails": {"Thin/brittle": 0, "Medium": 1, "Thick/strong": 2},
    "Q17_Appetite": {"Variable/irregular": 0, "Sharp/excessive": 1, "Slow/steady": 2},
    "Q18_Liking_of_Taste": {"Sour/salty": 0, "Sweet/bitter": 1, "Sweet/salty": 2},
    "Q19_Sleep": {"Light/interrupted": 0, "Moderate": 1, "Deep/heavy": 2},
    "Q20_Energy_Stamina": {"Bursts/variable": 0, "Moderate/intense": 1, "Sustained/slow": 2},
    "Q21_Sweating": {"Minimal": 0, "Profuse": 1, "Moderate": 2},
    "Q22_Bowel_Habits": {"Irregular/constipated": 0, "Regular/loose": 1, "Regular/heavy": 2},
    "Q23_Thirst": {"Variable": 0, "Excessive": 1, "Moderate": 2},
    "Q24_Mind_Temperament": {"Active/anxious": 0, "Focused/intense": 1, "Calm/steady": 2},
}


def strip_hindi_parens(text: Any) -> str:
    s = "" if text is None else str(text)
    s = _PARENS_RE.sub("", s)
    return s.strip()


def normalize_answer(col: str, raw: str) -> str:
    """Normalize a raw CSV answer to encoding spec key before fuzzy matching."""
    cleaned = strip_hindi_parens(raw).strip()
    aliases = ANSWER_ALIASES.get(col, {})
    cl = cleaned.lower()
    for alias, canonical in aliases.items():
        if alias.lower() in cl:
            return canonical
    return cleaned


def clean_column_name(name: str) -> str:
    s = strip_hindi_parens(name)
    s = s.replace(".", " ")
    s = s.replace("&", " ")
    s = s.replace("/", " ")
    s = _NON_ALNUM_UNDERSCORE_RE.sub("_", s.strip())
    s = _UNDERSCORE_RUN_RE.sub("_", s).strip("_")
    return s


def _warn_fuzzy(col: str, raw: str, chosen: str) -> None:
    if raw != chosen:
        logger.warning("Fuzzy match used for %s: '%s' -> '%s'", col, raw, chosen)


def map_answer_with_fuzzy(col: str, raw: str, spec: Dict[str, int]) -> Tuple[str, int]:
    value = normalize_answer(col, raw)
    if value in spec:
        return value, spec[value]

    v = value.lower()
    if col == "Q8_Hair_Color":
        if "black" in v or "dark" in v:
            return value, 0
        if "brown" in v or "redd" in v:
            return value, 1
        if "blond" in v or "light" in v or "gold" in v:
            return value, 2
    if col == "Q18_Liking_of_Taste":
        if "pung" in v or "spicy" in v or "sour" in v:
            return value, 0
        if "bitter" in v:
            return value, 1
        if "sweet" in v or "salty" in v:
            return value, 2

    vata_kw = (
        "slim", "thin", "light", "small", "narrow", "sunken", "scant",
        "irregular", "variable", "frequent", "dry", "rough", "brittle", "tall",
    )
    pitta_kw = (
        "medium", "moderate", "sharp", "intense", "excessive", "profuse",
        "warm", "redd", "sensitive", "loose", "fair",
    )
    kapha_kw = (
        "large", "heavy", "broad", "thick", "plump", "round", "full", "deep",
        "slow", "rare", "smooth", "moist", "oily", "short", "steady", "calm",
    )
    score0 = sum(1 for k in vata_kw if k in v)
    score1 = sum(1 for k in pitta_kw if k in v)
    score2 = sum(1 for k in kapha_kw if k in v)
    scores = [score0, score1, score2]
    best = int(np.argmax(scores))
    if scores[best] > 0 and scores.count(scores[best]) == 1:
        logger.warning(
            "Generic heuristic for %s: '%s' -> %s(%d)",
            col, value, ["Vata", "Pitta", "Kapha"][best], best,
        )
        return value, best
    matches = get_close_matches(value, list(spec.keys()), n=1, cutoff=0.55)
    if not matches:
        raise ValueError(f"Unrecognized answer for {col}: '{value}'")
    chosen = matches[0]
    _warn_fuzzy(col, value, chosen)
    return chosen, spec[chosen]


def add_dosha_affinity_features(X_enc: pd.DataFrame) -> pd.DataFrame:
    df = X_enc.copy()
    df["vata_affinity"] = sum(
        (df[col] == val).astype(int) for col, val in VATA_FEATURE_MAP.items()
    )
    df["pitta_affinity"] = sum(
        (df[col] == val).astype(int) for col, val in PITTA_FEATURE_MAP.items()
    )
    df["kapha_affinity"] = sum(
        (df[col] == val).astype(int) for col, val in KAPHA_FEATURE_MAP.items()
    )
    total = df["vata_affinity"] + df["pitta_affinity"] + df["kapha_affinity"] + 1
    df["vata_ratio"] = df["vata_affinity"] / total
    df["pitta_ratio"] = df["pitta_affinity"] / total
    df["kapha_ratio"] = df["kapha_affinity"] / total
    return df


def load_and_clean_dataset(csv_path: Path) -> Tuple[pd.DataFrame, Dict[str, str]]:
    df = pd.read_csv(csv_path)
    if df.empty:
        raise ValueError("Dataset is empty")

    df = df.drop(
        columns=[c for c in ["Participant_ID", "Timestamp"] if c in df.columns],
        errors="ignore",
    )

    original_cols = list(df.columns)
    cleaned_cols = [clean_column_name(c) for c in original_cols]
    q_column_mapping = dict(zip(original_cols, cleaned_cols))
    df = df.rename(columns=q_column_mapping)

    for c in df.columns:
        if df[c].dtype == object:
            df[c] = df[c].map(strip_hindi_parens)

    if "Gender" in df.columns:
        df["Gender"] = df["Gender"].astype(str).str.strip()

    return df, q_column_mapping


def build_encoded_frame(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, List[str], Dict[str, Dict[str, int]], np.ndarray]:
    """Build feature frame (age, gender, Q1–Q24 encoded) + y_cls. Score columns never enter X."""
    required = ["Age", "Gender"] + _SCORE_COLS + [_TARGET_COL]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    q_cols = [c for c in df.columns if re.fullmatch(r"Q\d+.*", c)]
    q_cols = sorted(q_cols, key=lambda x: int(re.match(r"Q(\d+)", x).group(1)))
    if len(q_cols) < 24:
        raise ValueError(f"Expected 24 Q columns, found {len(q_cols)}: {q_cols}")
    q_cols = q_cols[:24]

    rename_q_map = {old: clean_column_name(old) for old in q_cols}
    df = df.rename(columns=rename_q_map)

    canonical_order = list(PRAKRITI_ENCODING_SPEC.keys())
    remaining_cols = set(df.columns)
    for spec_col in canonical_order:
        if spec_col in remaining_cols:
            remaining_cols.remove(spec_col)
            continue
        matches = get_close_matches(spec_col, list(remaining_cols), n=1, cutoff=0.6)
        if not matches:
            raise ValueError(f"Could not find dataset column matching '{spec_col}' after cleaning")
        chosen = matches[0]
        _warn_fuzzy("COLUMN", chosen, spec_col)
        df = df.rename(columns={chosen: spec_col})
        remaining_cols.remove(spec_col)

    gender_raw = df["Gender"].astype(str).map(strip_hindi_parens).str.strip()
    gender_norm = gender_raw.str.lower()
    gender_encoded = gender_norm.map({"male": 0, "m": 0, "female": 1, "f": 1})
    if gender_encoded.isna().any():
        bad = sorted(set(gender_raw[gender_encoded.isna()].tolist()))
        raise ValueError(f"Unrecognized Gender values: {bad}")

    age = pd.to_numeric(df["Age"], errors="coerce")
    if age.isna().any():
        raise ValueError("Age contains non-numeric values after cleaning")

    answer_encoding: Dict[str, Dict[str, int]] = {
        k: dict(v) for k, v in PRAKRITI_ENCODING_SPEC.items()
    }

    rows: Dict[str, Any] = {
        "age": age.astype(float),
        "gender": gender_encoded.astype(float),
    }
    for col in canonical_order:
        spec = PRAKRITI_ENCODING_SPEC[col]
        enc_col = []
        for v in df[col].astype(str).tolist():
            _, code = map_answer_with_fuzzy(col, v, spec)
            enc_col.append(code)
        rows[col] = enc_col

    X_base = pd.DataFrame(rows)

    v = pd.to_numeric(df["Vata_Score"], errors="coerce")
    p = pd.to_numeric(df["Pitta_Score"], errors="coerce")
    k = pd.to_numeric(df["Kapha_Score"], errors="coerce")
    if v.isna().any() or p.isna().any() or k.isna().any():
        raise ValueError("Dosha score columns contain non-numeric values")
    total = (v + p + k).replace(0, np.nan)
    if total.isna().any():
        raise ValueError("Found rows with total dosha score of 0")

    y_cls = df[_TARGET_COL].astype(str).to_numpy()
    base_feature_names = ["age", "gender"] + canonical_order

    return X_base, base_feature_names, answer_encoding, y_cls


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    repo_root = base_dir.parent
    data_path = repo_root / "datasets" / "Prakriti200.csv"
    if not data_path.exists():
        data_path = base_dir / "data" / "Prakriti200.csv"
    model_dir = base_dir / "model"
    model_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Loading dataset: %s", data_path)
    df, q_column_mapping = load_and_clean_dataset(data_path)

    leakage_cols = [c for c in _SCORE_COLS if c in df.columns]
    if leakage_cols:
        logger.info(
            "Target-derived score columns %s kept only for y_reg labels — excluded from model X",
            leakage_cols,
        )

    logger.info("Building encoded features + affinity")
    X_base, base_names, answer_encoding, y_cls_raw = build_encoded_frame(df)
    X_full = add_dosha_affinity_features(X_base)
    feature_names = base_names + AFFINITY_COLS
    X = X_full[feature_names].to_numpy(dtype=float)

    le = LabelEncoder()
    y_enc = le.fit_transform(y_cls_raw)
    joblib.dump(le, model_dir / "prakriti_label_encoder.pkl")

    # Stratified CV (balanced accuracy) on full data — same RF hyperparams as ensemble base
    logger.info("Stratified K-fold CV (balanced accuracy, RandomForest probe)")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    rf_probe = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    cv_scores = cross_val_score(
        rf_probe, X, y_enc, cv=skf, scoring="balanced_accuracy", n_jobs=-1
    )
    logger.info(
        "CV balanced accuracy: %.4f ± %.4f",
        float(cv_scores.mean()),
        float(cv_scores.std()),
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    # RandomOverSampler: bump classes with < 10 samples to 10
    uniq_tr, cnt_tr = np.unique(y_train, return_counts=True)
    ros_strategy = {int(c): 10 for c, n in zip(uniq_tr, cnt_tr) if int(n) < 10}
    if ros_strategy:
        ros = RandomOverSampler(sampling_strategy=ros_strategy, random_state=42)
        X_train, y_train = ros.fit_resample(X_train, y_train)

    smote_k = SMOTE(k_neighbors=3, random_state=42)
    try:
        smoteenn = SMOTEENN(smote=smote_k, random_state=42)
        X_bal, y_bal = smoteenn.fit_resample(X_train, y_train)
    except Exception as e:
        logger.warning("SMOTEENN failed (%s); using ROS training set only", e)
        X_bal, y_bal = X_train, y_train

    xgb_clf = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective="multi:softprob",
        eval_metric="mlogloss",
        n_jobs=-1,
    )
    rf_clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    ensemble = VotingClassifier(
        estimators=[("xgb", xgb_clf), ("rf", rf_clf)],
        voting="soft",
        n_jobs=-1,
    )
    calibrated = CalibratedClassifierCV(ensemble, cv=3, method="isotonic", n_jobs=1)
    logger.info("Training calibrated voting ensemble (XGB + RF)")
    calibrated.fit(X_bal, y_bal)

    joblib.dump(calibrated, model_dir / "prakriti_ensemble.pkl")

    # Standalone RF on same balanced data — SHAP + backward-compatible fallback
    rf_shap = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf_shap.fit(X_bal, y_bal)
    joblib.dump(rf_shap, model_dir / "prakriti_rf_classifier.pkl")

    y_pred = calibrated.predict(X_test)
    bal_acc = float(balanced_accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    f1_arr = f1_score(y_test, y_pred, average=None, zero_division=0)
    per_class_f1 = {
        str(le.classes_[i]): round(float(f1_arr[i]), 4) for i in range(len(le.classes_))
    }
    report = classification_report(
        y_test,
        y_pred,
        target_names=list(le.classes_),
        zero_division=0,
    )

    u_all, c_all = np.unique(y_cls_raw, return_counts=True)
    class_distribution = {str(k): int(v) for k, v in zip(u_all, c_all)}

    logger.info("Computing SHAP feature importance (RandomForest SHAP model)")
    explainer = shap.TreeExplainer(rf_shap)
    shap_values = explainer.shap_values(X_test)
    if isinstance(shap_values, list):
        abs_mean = np.mean(np.abs(np.stack(shap_values, axis=0)), axis=(0, 1))
    else:
        sv = np.asarray(shap_values)
        if sv.ndim == 3:
            abs_mean = np.mean(np.abs(sv), axis=(0, 2))
        else:
            abs_mean = np.mean(np.abs(sv), axis=0)

    importance = {feature_names[i]: float(abs_mean[i]) for i in range(len(feature_names))}
    importance_sorted = dict(sorted(importance.items(), key=lambda kv: kv[1], reverse=True))
    (model_dir / "prakriti_shap_importance.json").write_text(
        json.dumps(importance_sorted, indent=2),
        encoding="utf-8",
    )

    inference_input_keys = base_names
    metadata = {
        "feature_names": feature_names,
        "inference_input_keys": inference_input_keys,
        "q_column_mapping": q_column_mapping,
        "answer_encoding": answer_encoding,
        "label_classes": list(le.classes_),
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset_size": int(len(df)),
        "balanced_accuracy": round(bal_acc, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class_f1": per_class_f1,
        "class_distribution": class_distribution,
        "cv_balanced_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_balanced_accuracy_std": round(float(cv_scores.std()), 4),
        "model_primary": "prakriti_ensemble.pkl",
    }
    (model_dir / "prakriti_metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print("\n=== Prakriti Training Summary ===")
    print(f"Dataset size: {len(df)}")
    print(f"Features (incl. affinity): {len(feature_names)}")
    print(f"CV balanced accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"Test balanced accuracy: {bal_acc:.4f}")
    print(f"Test macro F1: {macro_f1:.4f}")
    print(report)
    print(f"Artifacts saved to: {model_dir}")


if __name__ == "__main__":
    main()
