'use client'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, RefreshCw } from 'lucide-react'

interface GymQRProps {
  gymCode: string
  gymName: string
}

export default function GymQR({ gymCode, gymName }: GymQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState('')

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${gymCode}`
    : `https://zetafit.app/join/${gymCode}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#0F6E56', light: '#FFFFFF' },
    }, (err) => {
      if (err) { console.error('[GymQR] Error:', err); return }
      setDataUrl(canvasRef.current?.toDataURL() ?? '')
    })
  }, [joinUrl])

  function handleDownload() {
    if (!dataUrl) return
    // Create a printable PDF-style page
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${gymName} — ZetaFit QR</title>
        <style>
          body { font-family: Inter, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
          .card { border: 2px solid #0F6E56; border-radius: 16px; padding: 32px; text-align: center; max-width: 320px; }
          h1 { color: #0F6E56; font-size: 22px; margin: 0 0 4px; }
          p { color: #6B7280; font-size: 13px; margin: 0 0 20px; }
          img { width: 200px; height: 200px; }
          .code { font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1F2937; margin-top: 12px; font-family: monospace; }
          .sub { font-size: 11px; color: #9CA3AF; margin-top: 6px; }
          @media print { body { print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${gymName}</h1>
          <p>Scan to join or check in</p>
          <img src="${dataUrl}" alt="Gym QR" />
          <div class="code">${gymCode}</div>
          <div class="sub">Powered by ZetaFit · zeta-labs.dev</div>
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Canvas */}
      <div className="rounded-2xl border-2 border-brand p-4 bg-white shadow-sm">
        <canvas ref={canvasRef} />
      </div>

      {/* Gym code */}
      <div className="text-center">
        <p className="text-xs font-medium text-ink-muted mb-1">Gym code</p>
        <p className="text-2xl font-bold tracking-[6px] font-mono text-ink">{gymCode}</p>
        <p className="text-xs text-ink-muted mt-1 break-all max-w-[220px]">{joinUrl}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={!dataUrl}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download / Print
        </button>
      </div>
    </div>
  )
}
