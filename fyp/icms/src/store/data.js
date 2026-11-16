/**
 * Data Store (Zustand)
 * 
 * Manages application data:
 * - Projects (current selected, list)
 * - Datasets (current dataset, cached list)
 * - Jobs (current job, list)
 * - Results (cached results)
 * 
 * Not persisted (refreshed from API)
 */

import { create } from 'zustand'

/**
 * @typedef {Object} Project
 * @property {number} id - Project ID
 * @property {string} name - Project name
 * @property {string} [description] - Project description
 * @property {string} [last_run_status] - Status of last job
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} Dataset
 * @property {number} id - Dataset ID
 * @property {string} original_filename - Original file name
 * @property {number} [row_count] - Number of rows
 * @property {number} size_bytes - File size
 * @property {Object} schema_preview - Column info
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} Job
 * @property {string} id - Job UUID
 * @property {string} [project_id] - Associated project
 * @property {string} status - Job status (queued, preprocessing, eda, training, evaluation, completed, failed)
 * @property {string} [current_step] - Current pipeline step
 * @property {number} [progress] - Progress percentage (0-100)
 * @property {string[]} [logs] - Job logs
 * @property {string} created_at - ISO timestamp
 */

/**
 * Data state store
 * 
 * @property {Project|null} currentProject - Currently selected project
 * @property {Project[]} projects - Cached projects list
 * @property {Dataset|null} currentDataset - Currently selected dataset
 * @property {Dataset[]} datasets - Cached datasets list
 * @property {Job|null} currentJob - Currently selected job
 * @property {Job[]} jobs - Cached jobs list
 * @property {Object|null} currentResults - Cached results for current job
 * @property {boolean} isLoading - Global loading state
 * @property {string|null} error - Current error message
 */
export const useDataStore = create((set, get) => ({
  // Data state
  currentProject: null,
  projects: [],
  currentDataset: null,
  datasets: [],
  currentJob: null,
  jobs: [],
  currentResults: null,

  // UI state for data operations
  isLoading: false,
  error: null,

  // Project actions
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  addProject: (project) => {
    const { projects } = get()
    set({ projects: [project, ...projects] })
  },
  removeProject: (projectId) => {
    const { projects, currentProject } = get()
    set({
      projects: projects.filter((p) => p.id !== projectId),
      currentProject: currentProject?.id === projectId ? null : currentProject,
    })
  },

  // Dataset actions
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
  setDatasets: (datasets) => set({ datasets }),
  addDataset: (dataset) => {
    const { datasets } = get()
    set({ datasets: [dataset, ...datasets] })
  },
  removeDataset: (datasetId) => {
    const { datasets, currentDataset } = get()
    set({
      datasets: datasets.filter((d) => d.id !== datasetId),
      currentDataset: currentDataset?.id === datasetId ? null : currentDataset,
    })
  },

  // Job actions
  setCurrentJob: (job) => set({ currentJob: job }),
  setJobs: (jobs) => set({ jobs }),
  addJob: (job) => {
    const { jobs } = get()
    set({ jobs: [job, ...jobs] })
  },
  removeJob: (jobId) => {
    const { jobs, currentJob } = get()
    set({
      jobs: jobs.filter((j) => j.id !== jobId),
      currentJob: currentJob?.id === jobId ? null : currentJob,
    })
  },
  updateJobStatus: (jobId, status) => {
    const { jobs, currentJob } = get()
    set({
      jobs: jobs.map((j) => (j.id === jobId ? { ...j, ...status } : j)),
      currentJob: currentJob?.id === jobId ? { ...currentJob, ...status } : currentJob,
    })
  },

  // Results actions
  setCurrentResults: (results) => set({ currentResults: results }),
  clearCurrentResults: () => set({ currentResults: null }),

  // Loading and error state
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Batch clear
  clearAll: () =>
    set({
      currentProject: null,
      projects: [],
      currentDataset: null,
      datasets: [],
      currentJob: null,
      jobs: [],
      currentResults: null,
      isLoading: false,
      error: null,
    }),
}))
