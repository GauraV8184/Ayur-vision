# AyurVision AI Service

Python microservice for **medicinal plant leaf classification**: YOLOv8 ROI extraction → EfficientNetB3 classifier. Used by the Node backend to classify uploaded leaf images.

## Structure

```
ai-service/
  model/                       # plant_classifier.h5, class_names.txt, yolo_leaf.pt
  leaf_detection.py            # Shared YOLO load + ROI crop
  dataset_config.py            # Raw + cropped dataset paths
  prepare_cropped_dataset.py   # Raw images → YOLO crops for training
  train.py                     # EfficientNet training (--mode auto|raw|cropped)
  predict.py                   # Inference (same crop logic as prepare script)
  api.py                       # Flask API
  download_yolo.py             # Seed yolo_leaf.pt (YOLOv8n base weights)
  YOLO_SETUP.md                # Full two-stage training notes
  requirements.txt
```

## Setup

### 1. Python environment

Python 3.9+ recommended. Create and activate a virtualenv:

```bash
cd ai-service
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Dataset

Place the **Indian Medicinal Leaves Image Datasets** under the project root:

```
AyurVision/
  datasets/
    Indian Medicinal Leaves Image Datasets/
      Medicinal leaf dataset/   (or Medicinal plant dataset)
        PlantName1/
          img1.jpg
          img2.jpg
        PlantName2/
          ...
```

Class labels are inferred from folder names.

### 4. YOLO weights (for ROI crop)

```bash
python download_yolo.py
```

See **YOLO_SETUP.md** for fine-tuning the detector on leaf boxes.

If you're training a custom detector, the workflow is:

```bash
python validate_leaf_detector_dataset.py
python train_leaf_detector.py
```

### 5. (Recommended) Build cropped training set

Uses the **same** YOLO crop as inference, then trains EfficientNet on crops:

```bash
python prepare_cropped_dataset.py
```

Output: `datasets/.../cropped_leaf_dataset/<Class>/...`

### 6. Train the classifier

```bash
python train.py
```

- **`--mode auto` (default):** uses `cropped_leaf_dataset/` if present, else raw folders.
- **`--mode cropped` / `--mode raw`:** force one source.
- 80% train / 20% validation; stronger augmentation on raw images, gentler on crops.
- Saves `model/plant_classifier.h5` and `model/class_names.txt`.

### 7. Run the Flask API

```bash
python api.py
```

Server: **http://localhost:5000**

- `GET /health` — health check
- `POST /predict-plant` — form field `image` or `file`; returns `{"plant": "...", "confidence": 0.93}`

## Integration with Node backend

The Express backend calls this service when a user uploads a leaf image:

1. Frontend uploads image → Node saves to `backend/uploads/`
2. Node sends image to `POST http://localhost:5000/predict-plant`
3. AI service returns `{ plant, confidence }`
4. Node responds to frontend with `{ imageUrl, plant, confidence }`

Run **both** services:

- **AI service:** `python api.py` → port **5000**
- **Node backend:** `PORT=3001 npm run dev` (or set `PORT=3001` in `backend/.env`)

Set `AI_SERVICE_URL` in the Node backend if the Flask API runs on another host/port.
