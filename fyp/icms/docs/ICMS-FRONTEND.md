# ICMS Frontend — Technical Documentation

**Product:** Intelligent Cleaning and Model Selection System (ICMS)  
**Stack:** React 19 · Vite 8 · JavaScript · Tailwind CSS v4  
**Repository path:** `icms/` (relative to your FYP workspace)

This document describes how the frontend is structured, how to run it, how it talks to the backend, and how authentication and storage work.

---

## 1. Executive summary

The ICMS frontend is a single-page application (SPA) that provides:

- JWT-based **authentication** (login, register, forgot password) with session persistence in **localStorage**
- A **projects dashboard** and **project detail** views
- **Dataset upload** (CSV/XLSX) with client-side preview, target column selection, and job configuration
- **Pipeline progress** with polling and live logs
- **Results** with Plotly EDA charts, model leaderboard, recommendations, downloads, and a model detail modal
- Supplementary pages: **Activity** (jobs list), **Help**, **Settings**

The UI uses a **dark glassmorphism** style, **Three.js** background, **Framer Motion** page transitions (via `PageShell`), and is built to be **responsive** with basic **accessibility** (skip link, focus styles, ARIA where relevant).

---

## 2. Technology stack

| Layer | Technology |
|--------|------------|
| Runtime / bundler | Vite 8 |
| UI library | React 19 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| HTTP client | Axios |
| Global auth state | Zustand + `persist` (localStorage) |
| Charts | Plotly.js + `react-plotly.js` (Results route lazy-loaded) |
| 3D background | Three.js |
| Motion | Framer Motion |
| CSV / Excel preview | PapaParse, SheetJS (`xlsx`) |

---

## 3. Prerequisites and scripts

**Requirements:** Node.js 18+ (20+ recommended), npm.

```bash
cd icms
npm install
npm run dev      # development server (default http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # serve dist locally
npm run lint     # ESLint
```

Copy environment defaults:

```bash
cp .env.example .env
# Optional: use .env.development for dev-only flags (Vite loads it in `npm run dev`)
```

---

## 4. Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend origin, **no trailing slash** (e.g. `http://localhost:8000`). If empty, Axios uses relative URLs (same origin as the dev server). |

Protected routes always require a valid JWT from the API. See `.env.example` and `.env.development`.

---

## 5. Project structure

```
icms/
├── docs/
│   └── ICMS-FRONTEND.md          ← this document
├── public/
├── src/
│   ├── App.jsx                   # Routes
│   ├── main.jsx
│   ├── index.css                 # Tailwind entry + global theme
│   ├── constants/
│   │   └── storageKeys.js        # localStorage key names
│   ├── services/
│   │   └── api.js                # Axios instance + API helpers
│   ├── store/
│   │   └── authStore.js          # Zustand auth + persist
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useAuthHydration.js   # Wait for persist rehydration
│   │   └── useJobPolling.js      # Poll job status
│   ├── utils/
│   │   ├── validators.js         # Email / password / name
│   │   ├── rememberEmail.js      # Optional remembered email key
│   │   ├── parseDatasetFile.js   # CSV/XLSX preview
│   ├── components/
│   │   ├── auth/                 # ProtectedRoute, AuthLoading
│   │   ├── layout/               # PageShell, AppHeader, ThreeBackground
│   │   ├── ui/                   # Button, Input, Select, GlassCard, Collapsible
│   │   ├── dashboard/            # ProjectCard
│   │   ├── upload/               # FileDropzone, SchemaPreview
│   │   ├── progress/             # PipelineSteps, LogViewer
│   │   └── results/              # EDA, leaderboard, modal, downloads, recommendation
│   └── pages/                    # Route-level screens
├── vite.config.js
├── index.html
└── package.json
```

---

## 6. Routing

| Path | Access | Page / behavior |
|------|--------|------------------|
| `/login` | Public | Login form; redirects to `/` if JWT already present |
| `/register` | Public | Sign-up; success may auto-login or show “Go to sign in” |
| `/forgot-password` | Public | Request reset email |
| `/` | Protected | Dashboard (project list) |
| `/upload` | Protected | New analysis / dataset upload |
| `/projects/:projectId` | Protected | Project detail |
| `/activity` | Protected | Jobs table (`GET /jobs` or sample data) |
| `/help` | Protected | Static workflow + API notes |
| `/settings` | Protected | Profile summary, logout, env hints |
| `/progress/:jobId` | Protected | Polling pipeline + logs |
| `/results/:id` | Protected (lazy) | Results + Plotly (heavy chunk) |
| `*` | — | Redirects to `/` |

**Protected routes** are wrapped in `ProtectedRoute`, which:

1. Waits for Zustand **persist hydration** (avoids flashing to login before `localStorage` is read).
2. Allows access only when a persisted **`token`** exists in the auth store.
3. Otherwise redirects to `/login` with `state.from` for post-login return.

---

## 7. Authentication and local storage

### 7.1 Session (`icms-auth`)

- **Store:** `src/store/authStore.js` (Zustand + `persist`).
- **Storage key:** `ICMS_AUTH_STORAGE_KEY` → `icms-auth` (`src/constants/storageKeys.js`).
- **Persisted fields:** `token`, `user` only (`partialize`).
- **Storage:** `localStorage` via `createJSONStorage(() => localStorage)`.

After login/register (when the API returns a token), `setAuth(token, user)` runs; Zustand writes the updated state to `localStorage`.

Axios reads the same key in `getStoredToken()` and sets `Authorization: Bearer <token>` on each request.

### 7.2 Remembered email (`icms-last-email`)

- **Key:** `ICMS_LAST_EMAIL_KEY` → `icms-last-email`.
- **Purpose:** Prefill login email; **passwords are never stored**.
- **Helpers:** `src/utils/rememberEmail.js` (`getSavedEmail`, `saveLastEmail`, `clearLastEmail`).
- Login form includes **Remember email on this device**; successful sign-in updates or clears this key.

### 7.3 Hydration

`useAuthHydration` ensures `ProtectedRoute` and auth pages do not treat the user as logged out before `persist` finishes rehydrating. It handles the case where rehydration completes before `useEffect` runs (uses `queueMicrotask` + `onFinishHydration`).

### 7.4 Token shapes from API

`extractAuthFromResponse()` in `api.js` accepts common variants:

`access_token`, `token`, `access`, `jwt`, or nested `data.access_token` / `data.token`, plus `user` or nested `data.user`.

---

## 8. Backend API contract (expected)

Base URL: `VITE_API_BASE_URL`. All paths below are relative to that base.

| Method | Path | Used by |
|--------|------|---------|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| POST | `/auth/forgot-password` | Forgot password |
| GET | `/projects` | Dashboard |
| POST | `/projects` | Dashboard “New project” |
| GET | `/projects/:id` | Project detail |
| GET | `/jobs` | Activity |
| POST | `/datasets/upload` | multipart `file` + optional fields | Upload |
| POST | `/jobs/start` | Start analysis after upload |
| GET | `/jobs/status/:jobId` | Progress polling |
| GET | `/results/:id` | Results page |

**CORS:** The FastAPI app allows origins listed in `CORS_ORIGINS` (default `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`). If you use another Vite port, add it to `icms-backend` `.env` as `CORS_ORIGINS=...`.

### 8.1 Upload → job flow (frontend expectations)

1. `POST /datasets/upload` → response should include `dataset_id` (or `id` / `dataset.id`).
2. `POST /jobs/start` with JSON body: numeric `dataset_id`, `target_column`, `task_type`, optional integer `project_id`, `options` → response should include `job_id` (or `id` / `job.id`).
3. App navigates to `/progress/:jobId`.

### 8.2 Job status (flexible fields)

Progress UI reads several possible keys: `step` / `current_step` / `phase`, `status` / `state`, `progress` / `percent`, `logs` (array or newline string), `error`, `completed`.

### 8.3 Results (flexible fields)

Results page accepts flexible JSON, for example:

- `eda` — histograms, boxplots, correlation heatmap (`z` matrix + labels), missing-value bars
- `leaderboard` / `models` / `model_leaderboard`
- `recommendation` / `best` — e.g. `best_model`, `reason`
- `downloads` / `artifacts` — URLs keyed by `cleaned_dataset`, `trained_model`, `pipeline`, `eda_report`, `pdf_report`, `code_snippet`
- `model_details` / `details` — per-model extras for the modal

---

## 9. UI architecture

- **`PageShell`:** Three.js background, skip link, optional **`AppHeader`** (`showNav`, default `true`). Auth pages set `showNav={false}`.
- **`AppHeader`:** Nav to main sections; when **no JWT**, shows **Log in** / **Sign up**.
- **`Button`:** Supports `to` / `state` / `replace` for React Router `Link` styled as a button.
- **Glass cards:** Frosted panels via Tailwind (`GlassCard`).

---

## 10. Main user flows

1. **Sign up → Sign in:** Register validates name/email/password; may receive token immediately or a success screen linking to login with email prefilled.
2. **Sign in:** Validates email/password; stores session; optional remember email.
3. **Projects:** Lists projects from `GET /projects`; **New project** calls `POST /projects` then opens the project detail page.
4. **Project card:** View details (`/projects/:id` with optional `location.state`), new dataset run (`/upload?project=...`).
5. **Upload:** Validates file type/size; parses preview; submits upload + start job; navigates to progress.
6. **Progress:** `useJobPolling` polls until terminal state; shows steps, optional progress bar, logs, failure UI. `ProgressContent` is keyed by `jobId` to reset state per job.
7. **Results:** Lazy-loaded; Plotly charts and tables; modal for model detail.

---

## 11. Build and deployment

- **Output:** `dist/` after `npm run build`.
- **SPA hosting:** Configure the host to serve `index.html` for unknown paths (fallback) so client-side routes work.
- **API:** Set `VITE_API_BASE_URL` at build time for production, or serve the app from the same origin as the API.
- **Security note:** JWT in `localStorage` is standard for SPAs but is readable by XSS; for higher assurance, prefer **httpOnly** cookies with a backend you control.

---

## 12. Troubleshooting

| Symptom | Things to check |
|---------|-------------------|
| API errors / CORS | `VITE_API_BASE_URL`, browser network tab, server CORS config |
| Stuck on “Restoring session…” | Should be resolved by current `useAuthHydration`; hard-refresh; clear `localStorage` for the site |
| Always dashboard, no login | Valid session in `localStorage` — use Log out in Settings or clear `icms-auth` |
| Login page flashes then home | Valid session in `localStorage` — expected `Navigate` to `/` |
| Results bundle large | Plotly is heavy; Results route is code-split; consider further splitting if needed |
| Activity empty | No jobs yet, or `GET /jobs` failed — check network tab and auth |

---

## 13. File reference (quick index)

| Concern | Primary files |
|---------|----------------|
| Routes | `src/App.jsx` |
| Auth gate | `src/components/auth/ProtectedRoute.jsx` |
| API | `src/services/api.js` |
| Auth state | `src/store/authStore.js` |
| Storage keys | `src/constants/storageKeys.js` |
| Job polling | `src/hooks/useJobPolling.js` |
| File preview | `src/utils/parseDatasetFile.js` |

---

*Document generated to match the ICMS frontend as implemented in this repository. Update this file when you change routes, env vars, or API contracts.*
