# 🩺 AyurVision AI

**AyurVision AI** is an AI-powered **Ayurvedic Clinical Decision Support System (CDSS)** designed to assist doctors in analyzing patients, identifying possible conditions, and generating personalized Ayurvedic recommendations.

The platform combines **computer vision**, **AI-assisted diagnosis**, and a **modern SaaS-style medical dashboard** to bring **data-driven intelligence to Ayurvedic practice**.

AyurVision aims to bridge **traditional Ayurvedic knowledge with modern AI technologies** to help practitioners make faster and more informed decisions.

---

# 🌟 Key Highlights

* 🌿 **Medicinal Plant Recognition using Computer Vision**
* 🧠 **AI-assisted Ayurvedic diagnosis**
* 📊 **Modern SaaS-style medical dashboard**
* 🧑‍⚕️ **Doctor workflow system**
* 💬 **Interactive AI knowledge assistant**
* 🔐 **Secure authentication & protected APIs**
* 🧱 **Microservice-based architecture**

---

# 🧠 System Architecture

AyurVision uses a **microservice architecture** separating UI, backend logic, and machine learning services.

```
Frontend (React + Vite)
        │
        ▼
Backend API (Node.js + Express)
        │
        ▼
AI Microservice (Python + Flask + TensorFlow)
        │
        ▼
EfficientNetB0 Plant Classification Model
```

### Request Flow

1️⃣ Doctor uploads a **leaf image**
2️⃣ Backend stores the image securely
3️⃣ Image is forwarded to **AI microservice**
4️⃣ TensorFlow model performs **plant classification**
5️⃣ Prediction is returned to the dashboard

Example response:

```
Plant: Brahmi
Confidence: 95%
```

---

# ✨ Features

## 👨‍⚕️ Doctor Dashboard

A **modern SaaS-style medical interface** designed for clinical workflows.

Features include:

* Collapsible sidebar navigation
* Global command palette (**Ctrl / ⌘ + K**)
* Real-time analytics charts
* Patient activity feed
* Quick navigation system

---

## 🧑‍⚕️ Patient Analysis Workflow

Step-based patient intake system designed to mimic real clinical workflows.

Steps include:

1. Patient basic details
2. Symptoms & observations
3. Ayurvedic indicators
4. AI-assisted diagnosis

---

## 🤖 AI Diagnosis Interface

The AI system generates simulated Ayurvedic insights including:

* **Prakriti distribution**
* **Dosha imbalance visualization**
* **Predicted conditions**
* **Confidence scores**
* **Recommended herbs**
* **Diet & lifestyle guidance**

---

## 🌿 Medicinal Plant Recognition

Computer vision module built using **TensorFlow EfficientNetB0 transfer learning**.

The model predicts **medicinal plant species from leaf images**.

Output includes:

* Plant name
* Confidence score

Example:

```
Tulsi – 94%
Neem – 88%
Brahmi – 95%
```

---

## 🌱 Ayurvedic Herb Library

A searchable herb knowledge base with:

* Herb descriptions
* Dosha-based filtering
* Benefits & cautions
* Ayurvedic usage information

---

## 💬 AI Knowledge Assistant

Chat-style assistant designed to help doctors explore Ayurvedic knowledge.

Features:

* Suggested prompts
* Streaming responses
* Knowledge guidance
* Context-aware interactions

---

## 🔐 Authentication System

Secure user authentication with:

* JWT-based login & signup
* Protected API routes
* Secure image uploads

---

# 🧱 Tech Stack

## Frontend

* React
* Vite
* TailwindCSS
* Recharts
* Lucide Icons
* Axios

---

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Multer (File Upload Handling)

---

## AI Microservice

* Python
* Flask
* TensorFlow
* EfficientNetB0
* Transfer Learning
* Image Classification

---

# 🏗 Project Structure

```
AyurVision/
│
├── ai-service/                     # Python AI microservice
│   ├── api.py                      # Flask API
│   ├── train.py                    # Model training script
│   ├── predict.py                  # Prediction pipeline
│   ├── requirements.txt
│   │
│   └── model/
│       ├── class_names.txt
│       └── trained_model/
│
├── datasets/                       # Training datasets
│   └── Indian Medicinal Leaves Image Dataset/
│
├── backend/                        # Node.js API
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   │
│   ├── models/
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   └── upload.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   └── uploads/                    # Uploaded images
│
└── frontend/                       # React application
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    │
    └── src/
        ├── layouts/
        ├── components/
        ├── pages/
        ├── data/
        ├── services/
        └── utils/
```

---

# 🚀 Getting Started

## 1️⃣ Clone the Repository

```
git clone https://github.com/your-username/ayurvision-ai.git
cd ayurvision-ai
```

---

# ⚙️ Backend Setup

### Requirements

* Node.js (LTS)
* MongoDB

Create `.env` inside `backend/`

```
MONGO_URI=mongodb://127.0.0.1:27017/ayurvision_ai
JWT_SECRET=your-secret-key
PORT=3001
AI_SERVICE_URL=http://localhost:5000
```

Install dependencies:

```
cd backend
npm install
```

Run backend:

```
npm run dev
```

Backend runs at:

```
http://localhost:3001
```

---

# 🤖 AI Service Setup

Navigate to AI service:

```
cd ai-service
```

Create virtual environment:

```
python -m venv venv
```

Activate environment

Windows:

```
venv\Scripts\activate
```

Mac/Linux:

```
source venv/bin/activate
```

Install dependencies:

```
pip install -r requirements.txt
```

---

## Dataset Structure

Place dataset inside:

```
datasets/
   Indian Medicinal Leaves Image Dataset/
      Medicinal plant dataset/
         Neem/
         Tulsi/
         Brahmi/
```

Each folder represents a **class label**.

---

## Train the Model

```
python train.py
```

After training:

* Model saved in `ai-service/model/`
* Class labels saved in `class_names.txt`

---

## Run AI API

```
python api.py
```

AI service runs at:

```
http://localhost:5000
```

---

# 💻 Frontend Setup

Install dependencies:

```
cd frontend
npm install
```

Run development server:

```
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

# 🔌 API Endpoints

## Authentication

```
POST /api/auth/signup
POST /api/auth/login
```

---

## Image Upload

```
POST /api/upload
```

Headers:

```
Authorization: Bearer <token>
```

Form Data:

```
image: <file>
```

Uploaded images can be accessed at:

```
GET /uploads/<filename>
```

---

# 🧪 Demo Mode

You can explore the UI **without running backend or AI services**.

Steps:

1️⃣ Open **Login / Signup**
2️⃣ Click **Continue in Demo Mode**

Demo mode enables:

* Dashboard
* AI diagnosis UI
* Knowledge assistant
* Plant library

---

# 📌 Future Improvements

* Real Ayurvedic diagnosis ML models
* Patient medical history database
* LLM-powered Ayurvedic knowledge system
* RAG-based Ayurvedic literature search
* Doctor report generation
* Dockerized deployment
* Cloud deployment (AWS / GCP)

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request

---

# 📄 License

MIT License

---

# 👨‍💻 Author

Built with ❤️ by **Nilay Nahar**

⭐ If you found this project useful, consider giving it a **star on GitHub**.
