import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Cover Letter Architect',
  description: 'Eine Web-App, die Bewerbungsschreiben basierend auf Jobanzeigen und dem Nutzer-Lebenslauf mittels KI erstellt.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}

