import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'

// Lazy load heavy pages to improve initial load time
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProjectUpload = lazy(() => import('./pages/ProjectUpload'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Activity = lazy(() => import('./pages/Activity'))
const Help = lazy(() => import('./pages/Help'))
const Settings = lazy(() => import('./pages/Settings'))
const Progress = lazy(() => import('./pages/Progress'))
const Results = lazy(() => import('./pages/Results'))

// Shared loading component
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400" role="status">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500"></div>
        <p>Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ProjectUpload />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ProjectDetail />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Activity />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Help />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress/:jobId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Progress />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Results />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
