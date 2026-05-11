# AyurVision AI

**AyurVision AI** is an AI-powered Ayurvedic Clinical Decision Support System (CDSS) built for doctors, clinics, and healthcare practitioners. It combines computer vision, patient diagnostics, prakriti prediction, disease risk analysis, and an Ayurvedic knowledge assistant into a single modern platform.

The platform helps practitioners:

- Analyze medicinal plant and leaf images
- Predict patient prakriti and dosha imbalance
- Generate AI-assisted disease predictions
- Chat with an Ayurvedic knowledge assistant using patient-aware context
- Manage patient history, reports, and consultations
- Access a clean clinical dashboard for decision support

---

## Features

### Clinical Dashboard
- Doctor-friendly dashboard with analytics, patient activity, and quick actions
- Patient history tracking and report generation
- Clinical workflow for intake, prediction, and follow-up

### Plant & Leaf Detection
- AI-based medicinal plant recognition
- Uses a hybrid pipeline with leaf detection and classification
- Supports a large merged dataset of medicinal plants

### Prakriti Prediction
- Predicts prakriti types such as Vata, Pitta, and Kapha
- Uses patient symptoms and metadata to infer body constitution
- Displays dosha balance and constitution analysis

### Disease Prediction
- Predicts likely Ayurvedic conditions from patient symptoms
- Shows confidence scores and ranked disease outputs
- Helps doctors narrow down possible diagnoses

### Ayurvedic Knowledge Assistant
- Chat-based assistant for Ayurvedic questions
- Uses Retrieval-Augmented Generation (RAG)
- Supports patient-aware context during conversations
- Includes persistent chat history and thread management

### Voice-to-Text Support
- Built-in speech recognition for hands-free interaction in the knowledge assistant
- Useful during doctor consultations and patient discussions

---

## Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- Supabase Client
- Context API

### Backend
- Node.js
- Express
- TypeScript
- JWT Authentication
- Supabase
- REST APIs

### AI Service
- Python
- Flask
- TensorFlow / Keras
- YOLO-based leaf detection
- EfficientNet-based plant classification
- Prakriti prediction models

### Knowledge Assistant
- Retrieval-Augmented Generation (RAG)
- Vector database support
- Chunking, embeddings, reranking, and metadata tagging
- PDF ingestion and Ayurvedic document retrieval

---

## Repository Structure

```bash
apps/
├── frontend/      # React frontend
├── backend/       # Node.js + Express backend
├── ai-service/    # Python AI services and RAG pipeline

data/
├── datasets-repo/ # Medicinal plant datasets

.github/
├── workflows/     # CI/CD deployment workflows
```

---

## Main Modules

### Frontend
Located in `apps/frontend`

Key pages include:
- Dashboard
- Patient Analysis
- Prediction Results
- Knowledge Assistant
- Patient Reports
- History
- Profile & Settings

### Backend
Located in `apps/backend`

Main API areas:
- Authentication
- File uploads
- Prakriti prediction
- Knowledge assistant chat
- Patient context management

### AI Service
Located in `apps/ai-service`

Core AI capabilities:
- Plant classification
- Leaf detection
- Disease prediction
- Prakriti prediction
- Ayurvedic RAG system

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

### 2. Install Dependencies

#### Frontend

```bash
cd apps/frontend
npm install
```

#### Backend

```bash
cd apps/backend
npm install
```

#### AI Service

```bash
cd apps/ai-service
pip install -r requirements.txt
```

---

## Environment Variables

Each app contains its own `.env.example` file.

Create `.env` files in:

```bash
apps/frontend/.env
apps/backend/.env
apps/ai-service/.env
```

Example variables:

```env
# Frontend
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Backend
PORT=
JWT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# AI Service
OPENAI_API_KEY=
MODEL_PATH=
VECTOR_DB_PATH=
```

---

## Running the Project

### Start Frontend

```bash
cd apps/frontend
npm run dev
```

### Start Backend

```bash
cd apps/backend
npm run dev
```

### Start AI Service

```bash
cd apps/ai-service
python api.py
```

---

## AI Workflow

1. User uploads a plant image or enters patient symptoms
2. Backend sends the request to the AI service
3. Leaf detection identifies the relevant plant region
4. Classification predicts the medicinal plant
5. Prakriti and disease models generate patient insights
6. Knowledge assistant retrieves Ayurvedic context
7. Results are displayed in the frontend dashboard

---

## RAG Knowledge Assistant

The Ayurvedic knowledge assistant uses a retrieval pipeline that includes:

- Document chunking
- Embedding generation
- Metadata tagging
- Retrieval and reranking
- Patient-aware prompt construction
- Ayurvedic text sources and PDFs

Relevant directories:

```bash
apps/ai-service/docs/
apps/ai-service/rag/
```

---

## Testing

### Frontend

```bash
cd apps/frontend
npm run test
```

### Backend

```bash
cd apps/backend
npm run test
```

### AI Service

```bash
cd apps/ai-service
pytest
```

---

## Deployment

The repository includes CI/CD workflows for:

- Frontend deployment
- Backend deployment
- AI service deployment

Workflow files are located in:

```bash
.github/workflows/
```

Suggested deployment stack:

- Frontend: Vercel
- Backend: Render
- Database: Supabase
- AI Service: Render / Railway / Docker container

---

## Future Improvements

- Real-time doctor collaboration
- Multilingual support
- Audio consultation summaries
- Better explainability for predictions
- More Ayurvedic knowledge sources
- Mobile application support
- Advanced patient timeline tracking

---

## Contributing

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Push to your branch
5. Open a pull request

---

## License

This project is intended for educational, research, and healthcare innovation purposes.

---

Built with ❤️ for smarter Ayurvedic healthcare.