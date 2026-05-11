"""
Scans the entire dataset and moves corrupt images to ai-service/corrupt_images/.
Run ONCE before training: python clean_dataset.py
"""
import shutil
from pathlib import Path
from PIL import Image, UnidentifiedImageError

DATASET_BASE = (
    Path(__file__).resolve().parent.parent
    / "datasets"
    / "Indian Medicinal Leaves Image Datasets"
)
CORRUPT_DIR = Path(__file__).resolve().parent / "corrupt_images"
CORRUPT_DIR.mkdir(exist_ok=True)

EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
checked = 0
corrupt = 0

print(f"Scanning: {DATASET_BASE}")

for img_path in DATASET_BASE.rglob("*"):
    if img_path.suffix.lower() not in EXTENSIONS:
        continue
    checked += 1
    try:
        with Image.open(img_path) as img:
            img.verify()
        with Image.open(img_path) as img:
            img.load()
    except (UnidentifiedImageError, Exception) as e:
        corrupt += 1
        dest = CORRUPT_DIR / f"{img_path.parent.name}_{img_path.name}"
        print(f"  CORRUPT: {img_path.name} — {e}")
        shutil.move(str(img_path), str(dest))

print(f"\nDone. Checked {checked} images. Moved {corrupt} corrupt files to:")
print(f"  {CORRUPT_DIR}")

