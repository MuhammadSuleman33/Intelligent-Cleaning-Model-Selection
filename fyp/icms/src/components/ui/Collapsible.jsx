import { useId, useState } from 'react'

/**
 * @param {{ title: string, children: import('react').ReactNode, defaultOpen?: boolean }} props
 */
export function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const panelId = `${id}-panel`
  const btnId = `${id}-btn`

  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <button
        id={btnId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5"
      >
        <span>{title}</span>
        <span className="text-slate-400" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={btnId} className="border-t border-white/10 px-4 py-4">
          {children}
        </div>
      ) : null}
    </div>
  )
}
