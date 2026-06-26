'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const containerId = 'qr-scanner-container'

  useEffect(() => {
    let scanner: any = null

    async function startScanner() {
      try {
        // Dynamic import — html5-qrcode is browser-only
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // rear camera
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            // Extract gym code from URL or use as-is
            console.log('[QRScanner] Scanned:', decodedText)
            const match = decodedText.match(/\/join\/([A-Z0-9]{7})/)
            const code = match ? match[1] : decodedText.trim().toUpperCase()
            scanner.stop().catch(() => {})
            onScan(code)
          },
          () => {} // ignore per-frame errors
        )
        setStarted(true)
      } catch (err: any) {
        console.error('[QRScanner] Error:', err)
        setError(err?.message ?? 'Camera access denied. Please allow camera permissions.')
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-bg-card overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold text-ink">Scan Gym QR</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-bg-page"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-ink-secondary hover:bg-bg-page">
                Close
              </button>
            </div>
          ) : (
            <>
              <div
                id={containerId}
                className="overflow-hidden rounded-xl"
                style={{ minHeight: '260px' }}
              />
              <p className="mt-3 text-center text-xs text-ink-muted">
                Point camera at the gym QR code
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
