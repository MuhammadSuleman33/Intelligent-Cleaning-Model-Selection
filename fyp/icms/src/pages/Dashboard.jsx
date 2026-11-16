import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject, deleteProject, fetchProjects, getErrorMessage } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { ProjectCard } from '../components/dashboard/ProjectCard'
import { getFromCache, setCache, invalidateCachePattern } from '../utils/apiCache'

const PROJECTS_CACHE_KEY = 'projects_list'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError('')
        
        // Check cache first
        const cached = getFromCache(PROJECTS_CACHE_KEY, 60 * 1000) // 1 minute cache
        if (cached) {
          if (!cancelled) {
            setProjects(cached)
            setLoading(false)
          }
          return
        }
        
        const data = await fetchProjects()
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.projects ?? data?.items ?? []
        setProjects(list)
        
        // Cache the result
        setCache(PROJECTS_CACHE_KEY, list)
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Could not load projects.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    
    // Listen for project deletion events from other tabs
    const handleProjectDeleted = (e) => {
      try {
        const data = JSON.parse(localStorage.getItem('project_deleted'))
        if (data?.id) {
          invalidateCachePattern('projects')
        }
      } catch (err) {
        // Ignore
      }
    }
    
    window.addEventListener('storage', handleProjectDeleted)
    
    return () => {
      cancelled = true
      window.removeEventListener('storage', handleProjectDeleted)
    }
  }, [])

  async function onCreateProject() {
    setCreating(true)
    setError('')
    try {
      const name = `Project ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
      const p = await createProject({ name, description: '' })
      const id = p?.id ?? p?.project_id
      
      // Invalidate cache
      invalidateCachePattern('projects')
      
      if (id != null) {
        navigate(`/projects/${encodeURIComponent(String(id))}`)
        return
      }
      const data = await fetchProjects()
      setProjects(Array.isArray(data) ? data : data?.projects ?? data?.items ?? [])
    } catch (e) {
      setError(getErrorMessage(e, 'Could not create project.'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteProject(rawId) {
    const id = String(rawId)
    const proj = projects.find((p) => String(p.id ?? p.project_id ?? '') === id)
    const label = proj?.name ? `"${proj.name}"` : `project ${id}`
    if (
      !window.confirm(
        `Delete ${label}?\n\nAll runs (jobs) for this project will be removed from the database and their output files deleted. Uploaded datasets stay in your library with no project link.`,
      )
    ) {
      return
    }
    setDeletingId(id)
    setError('')
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => String(p.id ?? p.project_id ?? '') !== id))
      
      // Invalidate cache
      invalidateCachePattern('projects')
      
      // Signal other pages that a project was deleted
      localStorage.setItem('project_deleted', JSON.stringify({ id, timestamp: Date.now() }))
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete project.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageShell>
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as{' '}
            <span className="text-slate-200">
              {user?.email || user?.name || user?.full_name || 'Guest'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={creating} onClick={() => onCreateProject()}>
            {creating ? 'Creating…' : 'New project'}
          </Button>
          <Button to="/upload">New analysis</Button>
          <Button to="/settings" variant="ghost">
            Settings
          </Button>
          <Button type="button" variant="ghost" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </header>

      {loading ? (
        <GlassCard>
          <p className="text-slate-400">Loading projects…</p>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <p className="text-rose-400" role="alert">
            {error}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ensure <code className="text-slate-400">VITE_API_BASE_URL</code> points to your API and CORS is enabled.
          </p>
        </GlassCard>
      ) : projects.length === 0 ? (
        <GlassCard className="text-center">
          <p className="text-slate-300">No projects yet.</p>
          <p className="mt-2 text-sm text-slate-500">Create a project, then upload a dataset and run a pipeline.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button type="button" disabled={creating} onClick={() => onCreateProject()}>
              {creating ? 'Creating…' : 'Create project'}
            </Button>
            <Button to="/upload" variant="ghost">
              Or start analysis without a project
            </Button>
          </div>
        </GlassCard>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const id = String(p.id ?? p.project_id ?? p.slug ?? '')
            const name = String(p.name ?? p.title ?? 'Untitled project')
            const last = p.last_run_status ?? p.status ?? p.last_status
            return (
              <li key={id || name}>
                <ProjectCard
                  id={id || name}
                  name={name}
                  last_run_status={last}
                  onDelete={handleDeleteProject}
                  deleting={deletingId === id}
                />
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
