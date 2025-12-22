"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

interface CoverLetter {
  id: number
  content: string
  company: string | null
  position: string | null
  uploaded_at: string
}

export function OldCoverLetterList() {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  const loadCoverLetters = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/old-cover-letters')
      const data = await response.json()
      setCoverLetters(data.coverLetters || [])
    } catch (error) {
      console.error('Error loading cover letters:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoverLetters()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Möchten Sie dieses Anschreiben wirklich löschen?')) {
      return
    }

    setDeleting(id)
    try {
      const response = await fetch(`/api/old-cover-letters/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadCoverLetters()
      } else {
        alert('Fehler beim Löschen')
      }
    } catch (error) {
      alert('Fehler beim Löschen')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Anschreiben...</div>
  }

  if (coverLetters.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Noch keine Anschreiben hochgeladen.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {coverLetters.map((letter) => (
        <Card key={letter.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {letter.company || 'Unbekanntes Unternehmen'}
                </CardTitle>
                <CardDescription>
                  {letter.position && `${letter.position} • `}
                  {format(new Date(letter.uploaded_at), 'dd.MM.yyyy')}
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(letter.id)}
                disabled={deleting === letter.id}
              >
                {deleting === letter.id ? 'Lösche...' : 'Löschen'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {letter.content.substring(0, 500)}
              {letter.content.length > 500 && '...'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
