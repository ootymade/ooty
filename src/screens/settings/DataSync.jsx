import { useEffect, useRef, useState } from 'react'
import { exportAll, importMerge, getMeta } from '../../db/storage.js'
import { useToast } from '../../context/ToastContext.jsx'
import { PageHeader, Card, Button, Spinner } from '../../components/ui.jsx'
import { DownloadIcon, UploadIcon } from '../../components/icons.jsx'

function formatDateTime(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DataSync() {
  const { push } = useToast()
  const fileInput = useRef(null)
  const [lastExport, setLastExport] = useState(null)
  const [lastImport, setLastImport] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const refresh = async () => {
    setLastExport(await getMeta('lastExport'))
    setLastImport(await getMeta('lastImport'))
  }

  useEffect(() => {
    refresh()
  }, [])

  const doExport = async () => {
    setExporting(true)
    try {
      const payload = await exportAll()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `ooty-inventory-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      push('Export ready — check your downloads', { tone: 'success' })
      refresh()
    } catch (err) {
      push(err.message, { tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      await importMerge(payload)
      push('Import merged successfully', { tone: 'success' })
      refresh()
    } catch (err) {
      push(`Import failed: ${err.message}`, { tone: 'error' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Export / Import" back />

      <div className="space-y-4 px-4 py-4">
        <Card className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Export data</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Saves a JSON file with all products, suppliers, purchase orders and stock movements from this
              phone. Share it (e.g. via WhatsApp/email) with a teammate to sync.
            </p>
          </div>
          <Button className="w-full" onClick={doExport} disabled={exporting}>
            {exporting ? <Spinner className="h-4 w-4" /> : <DownloadIcon className="h-5 w-5" />}
            Export data
          </Button>
          <p className="text-xs text-slate-400">Last export: {formatDateTime(lastExport)}</p>
        </Card>

        <Card className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Import data</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Merges a teammate's exported file into this phone's data. Nothing is overwritten — products
              are matched by SKU, and stock movements from both phones are combined so no one's updates get
              lost.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => fileInput.current?.click()} disabled={importing}>
            {importing ? <Spinner className="h-4 w-4" /> : <UploadIcon className="h-5 w-5" />}
            Choose file to import
          </Button>
          <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={onFileChosen} />
          <p className="text-xs text-slate-400">Last import: {formatDateTime(lastImport)}</p>
        </Card>

        <p className="px-1 text-center text-xs text-slate-400">
          Tip: export regularly (e.g. end of shift) and have teammates import each other's files so everyone
          stays roughly in sync.
        </p>
      </div>
    </div>
  )
}
