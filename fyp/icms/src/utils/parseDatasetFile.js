import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const MAX_PREVIEW_ROWS = 8
const MAX_FILE_BYTES = 50 * 1024 * 1024

export { MAX_FILE_BYTES }

function inferType(value) {
  if (value === '' || value == null) return 'missing'
  const n = Number(value)
  if (!Number.isNaN(n) && String(value).trim() !== '') return Number.isInteger(n) ? 'integer' : 'float'
  return 'string'
}

function rowsToSchema(rows, headers) {
  const cols = headers.map((h) => {
    const samples = rows.slice(0, 50).map((r) => r[h])
    const types = new Set(samples.map(inferType))
    types.delete('missing')
    let dataType = 'string'
    if (types.size === 1) {
      const [t] = [...types]
      dataType = t === 'integer' || t === 'float' ? 'numeric' : t
    } else if (types.has('float') || types.has('integer')) {
      dataType = 'numeric'
    }
    return { name: h, dataType }
  })
  return cols
}

/**
 * @param {File} file
 * @returns {Promise<{ columns: { name: string, dataType: string }[], sampleRows: Record<string, string>[] }>}
 */
async function parseCsvText(file) {
  try {
    return await file.text()
  } catch {
    const buffer = await file.arrayBuffer()
    const encodings = ['windows-1252', 'iso-8859-1', 'utf-8']
    for (const encoding of encodings) {
      try {
        return new TextDecoder(encoding, { fatal: false }).decode(buffer)
      } catch {
        // ignore and try next encoding
      }
    }
    throw new Error('Could not decode CSV file.')
  }
}

export async function parseDatasetPreview(file) {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) {
    const text = await parseCsvText(file)
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (parsed.errors?.length) {
      throw new Error(parsed.errors[0].message || 'Invalid CSV')
    }
    const rows = /** @type {Record<string, string>[]} */ (parsed.data || [])
    const headers = parsed.meta.fields?.filter(Boolean) ?? Object.keys(rows[0] || {})
    const columns = rowsToSchema(rows, headers)
    const sampleRows = rows.slice(0, MAX_PREVIEW_ROWS)
    return { columns, sampleRows }
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.SheetNames[0]
    if (!sheet) throw new Error('Workbook has no sheets.')
    const ws = wb.Sheets[sheet]
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
    const rows = /** @type {Record<string, string>[]} */ (json)
    const headers = rows.length ? Object.keys(rows[0]) : []
    const columns = rowsToSchema(rows, headers)
    const sampleRows = rows.slice(0, MAX_PREVIEW_ROWS)
    return { columns, sampleRows }
  }

  throw new Error('Unsupported file type. Use CSV or XLSX.')
}

export function validateDatasetFile(file) {
  const ok =
    /\.(csv|xlsx|xls)$/i.test(file.name) &&
    (file.type === '' ||
      file.type.includes('csv') ||
      file.type.includes('sheet') ||
      file.type.includes('excel') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  if (!ok) return { valid: false, message: 'Please upload a CSV or XLSX file.' }
  if (file.size > MAX_FILE_BYTES) {
    return { valid: false, message: `File must be under ${MAX_FILE_BYTES / (1024 * 1024)} MB.` }
  }
  return { valid: true }
}
