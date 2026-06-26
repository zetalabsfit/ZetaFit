import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ZetaFit',
  description: 'Gym management by ZetaLabs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
