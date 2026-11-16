import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'

const steps = [
  {
    title: '1. Create or open a project',
    body: 'From Projects, start a new analysis or open a project’s detail page to see status and shortcuts.',
  },
  {
    title: '2. Upload data',
    body: 'Use New run to drop a CSV or XLSX. Pick the target column and task type (classification or regression). Advanced options control imputation, scaling, and CV folds.',
  },
  {
    title: '3. Watch the pipeline',
    body: 'After Start analysis, the Progress page polls your backend for queued → preprocessing → EDA → training → evaluation → completed.',
  },
  {
    title: '4. Review results',
    body: 'Results brings EDA charts, the model leaderboard, recommendations, downloads, and per-model detail (metrics, confusion matrix / residuals, SHAP when provided).',
  },
]

export default function Help() {
  return (
    <PageShell maxWidthClass="max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold text-white">Help</h1>
      <p className="mb-8 text-sm text-slate-400">ICMS workflow and where to configure your API.</p>

      <div className="flex flex-col gap-4">
        {steps.map((s) => (
          <GlassCard key={s.title}>
            <h2 className="text-base font-semibold text-white">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
          </GlassCard>
        ))}

        <GlassCard>
          <h2 className="text-base font-semibold text-white">API &amp; environment</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-300">
            <li>
              Set <code className="text-indigo-200">VITE_API_BASE_URL</code> in <code className="text-indigo-200">.env</code> (no trailing slash).
            </li>
            <li>
              Auth: JWT from <code className="text-indigo-200">POST /auth/login</code> and <code className="text-indigo-200">/auth/register</code> (response field{' '}
              <code className="text-indigo-200">access_token</code>).
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/upload">Go to upload</Button>
            <Button to="/activity" variant="ghost">
              Activity
            </Button>
          </div>
        </GlassCard>
      </div>
    </PageShell>
  )
}
