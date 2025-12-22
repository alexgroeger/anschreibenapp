"use client"

import { useState } from "react"
import { OldCoverLetterUpload } from "@/components/cover-letters/OldCoverLetterUpload"
import { OldCoverLetterList } from "@/components/cover-letters/OldCoverLetterList"

export default function CoverLettersPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUpload = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <OldCoverLetterUpload onUpload={handleUpload} />
        <div>
          <h2 className="text-2xl font-semibold mb-4">Gespeicherte Anschreiben</h2>
          <OldCoverLetterList key={refreshKey} />
        </div>
      </div>
    </main>
  )
}
