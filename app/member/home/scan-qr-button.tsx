'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ScanLine } from 'lucide-react'

const QRScanner = dynamic(() => import('@/components/qr-scanner'), { ssr: false })

export default function ScanQRButton() {
  const [scanning, setScanning] = useState(false)
  const router = useRouter()

  function handleScan(code: string) {
    console.log('[ScanQR] Scanned code:', code)
    setScanning(false)
    // Navigate to the join page which handles attendance
    router.push(`/join/${code}`)
  }

  return (
    <>
      <button
        onClick={() => setScanning(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-light bg-brand-muted py-3 text-sm font-semibold text-brand hover:bg-brand-muted/80 transition-colors"
      >
        <ScanLine className="h-4 w-4" />
        Scan gym QR to check in
      </button>

      {scanning && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}
    </>
  )
}
