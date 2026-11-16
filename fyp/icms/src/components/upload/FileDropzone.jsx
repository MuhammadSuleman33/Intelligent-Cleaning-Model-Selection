import { useCallback, useRef, useState } from 'react'
import { validateDatasetFile } from '../../utils/parseDatasetFile'

/**
 * @param {{
 *   onSelect: (payload: { file: File | null, error: string | null }) => void
 *   disabled?: boolean
 *   error?: string
 * }} props
 */
export function FileDropzone({ onSelect, disabled, error }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0]
      if (!file) return
      const v = validateDatasetFile(file)
      if (!v.valid) {
        onSelect({ file: null, error: v.message })
        return
      }
      onSelect({ file, error: null })
    },
    [onSelect],
  )

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDrag(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDrag(false)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDrag(false)
          if (disabled) return
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          drag ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 bg-white/[0.03]'
        } ${disabled ? 'pointer-events-none opacity-50' : 'hover:border-indigo-400/60'}`}
      >
        <p className="text-sm font-medium text-slate-200">Drag & drop CSV or XLSX here</p>
        <p className="mt-2 text-xs text-slate-500">or click to browse · max 50 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
