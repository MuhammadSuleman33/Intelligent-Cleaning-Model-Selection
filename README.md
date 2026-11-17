# 🤖 ICMS — Intelligent Cleaning and Model Selection System

An end-to-end web-based **Automated Machine Learning (AutoML) platform** designed to simplify tabular machine learning workflows. ICMS automates data cleaning, preprocessing, exploratory data analysis (EDA), model selection, hyperparameter tuning, evaluation, and model explainability.

The platform transforms raw CSV and Excel datasets into trained machine learning models with minimal manual configuration, providing an interactive environment for data analysis, model comparison, and downloadable ML artifacts.

---

## ✨ Key Features

### 1. Project & Dataset Management

* JWT-authenticated user workspaces.
* Create and manage multiple machine learning projects.
* Upload CSV and Excel (`.xlsx`) datasets.
* Organize datasets and training jobs within individual projects.
* Secure user authentication and project management.

### 2. Automated Data Cleaning & Preprocessing

Automatically prepares raw datasets for machine learning:

* Removes duplicate records.
* Handles missing target values.
* Supports configurable missing-value handling:
  * Mean imputation.
  * Most frequent value imputation.
  * Missing-row removal.
* Converts date columns into UTC Unix timestamps.
* Normalizes and lowercases text values.
* Detects and handles outliers using:
  * IQR (Interquartile Range).
  * Z-Score.
* Supports feature scaling:
  * StandardScaler.
  * MinMaxScaler.
* Applies OneHotEncoder with cardinality limits for categorical features.

### 3. Automated Exploratory Data Analysis (EDA)

Generates interactive data insights using Plotly:

* Dataset summary statistics.
* Missing-value distributions.
* Feature correlation matrices.
* Histograms for numerical features.
* Boxplots for outlier visualization.
* Interactive data visualization and analysis.

### 4. Adaptive AutoML Engine

Automatically evaluates multiple machine learning algorithms and identifies suitable models for the selected dataset.

* Uses `RandomizedSearchCV` for hyperparameter optimization.
* Implements adaptive cross-validation:
  * StratifiedKFold for classification.
  * KFold for regression.
* Handles small and imbalanced datasets through adaptive validation strategies.
* Supports multiple machine learning algorithms.
* Includes Scikit-learn, XGBoost, and LightGBM models.
* Provides direct-fit fallbacks when hyperparameter search is unsuitable.
* Compares trained models using evaluation metrics.

### 5. Model Evaluation & Explainability

Provides comprehensive model performance analysis:

* Interactive Model Leaderboard.
* Classification confusion matrices.
* Regression residual plots.
* Ideal prediction comparison (`y = x`).
* SHAP-based feature importance.
* Model performance comparison.
* Explainable machine learning insights.

### 6. Model Artifacts & Downloads

Users can download generated machine learning artifacts:

* Cleaned datasets in CSV format.
* Exploratory Data Analysis reports in JSON format.
* Trained machine learning models in `.joblib` format.
* Serialized preprocessing pipelines.

### 7. Asynchronous Background Processing

Uses Celery and Redis to execute computationally intensive machine learning workflows in the background.

* Background dataset processing.
* Asynchronous model training.
* Real-time job progress polling.
* Execution logs and job status tracking.
* Separate API server and Celery worker processes.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11+, FastAPI |
| **ORM & Migrations** | SQLAlchemy, Alembic |
| **Data Validation** | Pydantic |
| **Task Queue** | Celery |
| **Message Broker** | Redis |
| **Database** | PostgreSQL (Production), SQLite (Local Development) |
| **Machine Learning** | Scikit-learn, XGBoost, LightGBM |
| **Data Processing** | Pandas, NumPy |
| **Model Explainability** | SHAP |
| **Model Serialization** | Joblib |
| **Frontend** | React 19, Vite 8 |
| **Styling** | Tailwind CSS 4 |
| **Routing** | React Router 7 |
| **State Management** | Zustand |
| **API Communication** | Axios |
| **Data Visualization** | Plotly.js |
| **Animations & 3D** | Framer Motion, Three.js |
| **Authentication** | JWT (`python-jose`) |
| **Password Security** | bcrypt |

---

## 📂 Repository Structure

```text
fyp/
│
├── icms-backend/
│   ├── app/
│   │   ├── main.py
│   │   │   # FastAPI application entry point, CORS and routers
│   │   │
│   │   ├── config.py
│   │   │   # Environment and application configuration
│   │   │
│   │   ├── database.py
│   │   │   # SQLAlchemy engine and session management
│   │   │
│   │   ├── celery_app.py
│   │   │   # Celery worker and task queue configuration
│   │   │
│   │   ├── models/
│   │   │   # ORM models: User, Project, Dataset, Job, Artifact
│   │   │
│   │   ├── routers/
│   │   │   # Authentication, Projects, Datasets, Jobs,
│   │   │   # Results and Download API endpoints
│   │   │
│   │   ├── schemas/
│   │   │   # Pydantic request and response validation schemas
│   │   │
│   │   ├── services/
│   │   │   # File storage and dataset loading services
│   │   │
│   │   ├── tasks/
│   │   │   └── icms_pipeline.py
│   │   │       # End-to-end asynchronous ML pipeline
│   │   │
│   │   └── ml/
│   │       # Preprocessing, EDA, AutoML, model evaluation,
│   │       # SHAP explainability and recommendation logic
│   │
│   ├── requirements.txt
│   └── .env.example
│
└── icms/
    ├── src/
    │   ├── pages/
    │   │   # Dashboard, Upload, Progress, Results and Auth pages
    │   │
    │   ├── components/
    │   │   # Reusable UI components, charts and modals
    │   │
    │   ├── services/
    │   │   └── api.js
    │   │       # Axios API client with JWT interceptors
    │   │
    │   └── store/
    │       └── authStore.js
    │           # Persisted Zustand authentication state
    │
    ├── package.json
    └── vite.config.js
```

---

## 📋 Prerequisites

Before installing and running ICMS, ensure the following tools are available:

* Python 3.11 or later.
* Node.js 18 or later.
* npm package manager.
* Redis Server or Memurai (Windows).
* Git and GitHub.
* PostgreSQL for production deployment.
* SQLite for local development.

---

## 🚀 Local Setup & Installation

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL

cd fyp
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd icms-backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment.

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Backend Environment Configuration

Create an `.env` file inside the `icms-backend/` directory:

```env
# Database Configuration
DATABASE_URL=sqlite:///./icms.db

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# JWT Authentication
SECRET_KEY=your-secure-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# File Storage
STORAGE_ROOT=./storage
MAX_UPLOAD_MB=50

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_RELAX_LOCAL_DEV=true
```

*Note: Replace placeholder secrets and configure the database URL according to your environment.*

### 4. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd icms
```

Install frontend dependencies:

```bash
npm install
```

Create an `.env.development` file inside the `icms/` directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## ▶️ Running the Application

ICMS requires three separate processes running simultaneously:

### Terminal 1 — FastAPI Backend

Navigate to `icms-backend/` and activate the virtual environment.

Start the FastAPI server:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Backend API:**

```text
http://127.0.0.1:8000
```

**Swagger API Documentation:**

```text
http://127.0.0.1:8000/docs
```

### Terminal 2 — Celery Background Worker

Navigate to `icms-backend/` and activate the virtual environment.

Start the Celery worker:

```bash
celery -A app.celery_app worker -l info --pool=solo
```

*Note: The `--pool=solo` option is recommended for Windows environments to avoid multiprocessing compatibility issues.*

Ensure Redis is running on port `6379` before starting the worker.

### Terminal 3 — React Frontend

Navigate to the `icms/` directory:

```bash
npm run dev
```

**Frontend Application:**

```text
http://localhost:5173
```

---

## 🔗 API Reference Overview

The following endpoints represent the main API functionality:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Authenticate and receive a JWT token |
| `GET` | `/auth/me` | Retrieve authenticated user information |
| `GET / POST` | `/projects` | Retrieve or create ML projects |
| `POST` | `/datasets/upload` | Upload CSV or Excel datasets |
| `POST` | `/jobs/start` | Start an asynchronous AutoML training pipeline |
| `GET` | `/jobs/status/{job_id}` | Retrieve job progress and execution logs |
| `GET` | `/results/{job_id}` | Retrieve EDA, leaderboard, SHAP insights and artifacts |
| `GET` | `/download/{artifact_id}` | Download generated ML artifacts |
| `GET` | `/health` | Check backend API availability |

---

## 🧠 Machine Learning Workflow

ICMS follows an automated machine learning pipeline that transforms raw datasets into evaluated and explainable models.

```text
Dataset Upload (CSV / Excel)
          |
          v
   Data Validation
          |
          v
 Automated Data Cleaning
          |
          v
   Preprocessing
          |
          v
 Exploratory Data Analysis
          |
          v
 Feature Engineering
          |
          v
 Train / Test Splitting
          |
          v
 Hyperparameter Tuning
          |
          v
 Model Training & Comparison
          |
          v
   Model Evaluation
          |
          v
 SHAP Explainability
          |
          v
 Model Leaderboard & Artifacts
          |
          v
       Downloads
```

---

## 🔐 Security & Reliability

* JWT-based user authentication.
* Password hashing using bcrypt.
* Protected API endpoints.
* User-specific project and dataset management.
* Configurable file upload size restrictions.
* CORS configuration for frontend-backend communication.
* Background execution through Celery and Redis.
* Environment-based configuration for sensitive credentials.

---

## 📄 License & Project Information

Developed as a **Final Year Project (FYP)** by:

**Muhammad Suleman Riaz**

Department of Computer Science  
The Islamia University of Bahawalpur  
2022–2026

**Project:** Intelligent Cleaning and Model Selection System (ICMS)

**Primary Objective:** To automate the end-to-end tabular machine learning workflow, making data preprocessing, model selection, evaluation, and explainability accessible through a web-based platform.
