import { useEffect, useRef } from 'react'

/**
 * @param {{ lines: string[] }} props
 */
export function LogViewer({ lines }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-300"
    >
      {lines.length === 0 ? (
        <p className="text-slate-500">Waiting for logs…</p>
      ) : (
        lines.map((line, i) => (
          <div key={`${i}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
