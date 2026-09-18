import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { getProductByCode } from '../../db/storage.js'
import { PageHeader, Button, Input, Card } from '../../components/ui.jsx'
import { CameraIcon, BoxIcon } from '../../components/icons.jsx'

const REGION_ID = 'qr-reader-region'

export default function Scan() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = params.get('redirect') // "stock-move" | null

  const scannerRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [notFoundCode, setNotFoundCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const handledRef = useRef(false)

  const goToCode = async (code) => {
    if (handledRef.current) return
    handledRef.current = true
    const product = await getProductByCode(code)
    if (product) {
      navigate(redirect === 'stock-move' ? `/stock-move?productId=${product.id}` : `/products/${product.id}`)
    } else {
      setNotFoundCode(code)
      handledRef.current = false
    }
  }

  useEffect(() => {
    let cancelled = false
    let instance = null

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return
      instance = new Html5Qrcode(REGION_ID)
      scannerRef.current = instance
      instance
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            goToCode(decodedText.trim())
          },
          () => {}, // per-frame decode failures are expected; ignore
        )
        .then(() => !cancelled && setScanning(true))
        .catch((err) => {
          if (!cancelled) setCameraError('Camera unavailable — you can type the code below instead.')
          console.warn('camera start failed', err)
        })
    })

    return () => {
      cancelled = true
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitManual = (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    goToCode(manualCode.trim())
  }

  return (
    <div>
      <PageHeader title="Scan" back subtitle={redirect === 'stock-move' ? 'Scan to add/remove stock' : undefined} />

      <div className="px-4 py-4">
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-slate-900">
          <div id={REGION_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
          {!scanning && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
              <CameraIcon className="h-8 w-8" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}
        </div>

        {cameraError && (
          <p className="mt-3 rounded-xl bg-warn-50 px-3.5 py-2.5 text-sm text-warn-600">{cameraError}</p>
        )}

        {notFoundCode && (
          <Card className="mt-3 flex items-center gap-3">
            <BoxIcon className="h-8 w-8 shrink-0 text-slate-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">No product for code</p>
              <p className="truncate text-xs text-slate-400">{notFoundCode}</p>
            </div>
            <Link to={`/products/new?sku=${encodeURIComponent(notFoundCode)}`}>
              <Button size="sm">Add product</Button>
            </Link>
          </Card>
        )}

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Or type SKU / code manually"
          />
          <Button type="submit" variant="outline">
            Go
          </Button>
        </form>
      </div>
    </div>
  )
}
