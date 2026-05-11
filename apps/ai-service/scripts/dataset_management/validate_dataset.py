"""Run: python validate_dataset.py [path/to/Prakriti200.csv]"""

import sys
from pathlib import Path

import pandas as pd


def validate(path: str) -> None:
    df = pd.read_csv(path)
    issues = []

    if "Dominant_Dosha" in df.columns:
        counts = df["Dominant_Dosha"].value_counts()
        print("Class distribution:\n", counts.to_string())
        minority = counts[counts < 10]
        if not minority.empty:
            issues.append(
                f"WARNING: Under-represented classes (< 10 samples): {minority.index.tolist()}"
            )

    for col in ["Vata_Score", "Pitta_Score", "Kapha_Score"]:
        if col in df.columns:
            issues.append(
                f"LEAKAGE RISK: Column '{col}' is target-derived — never use as model input features."
            )

    if "Gender" in df.columns:
        gender_counts = df["Gender"].value_counts()
        ratio = float(gender_counts.max() / gender_counts.min())
        if ratio > 2.0:
            issues.append(
                f"WARNING: Gender imbalance ratio {ratio:.1f}x — ensure stratified split."
            )

    if "Age" in df.columns:
        age_col = pd.to_numeric(df["Age"], errors="coerce")
        mn, mx = float(age_col.min()), float(age_col.max())
        if mn < 5 or mx > 85:
            issues.append(f"WARNING: Age outliers: min={mn}, max={mx}")

    nulls = int(df.isnull().sum().sum())
    if nulls > 0:
        issues.append(f"ERROR: {nulls} null values found.")

    if issues:
        print("\nIssues found:")
        for i in issues:
            print(" -", i)
    else:
        print("\nDataset passed all validation checks.")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    default_csv = repo_root / "datasets" / "Prakriti200.csv"
    csv_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else (default_csv if default_csv.exists() else Path("Prakriti200.csv"))
    )
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        sys.exit(1)
    validate(str(csv_path))
