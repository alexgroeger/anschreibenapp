"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function OldCoverLetterUpload({ onUpload }: { onUpload?: () => void }) {
  const [content, setContent] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSave = async () => {
    if (!content.trim()) {
      setMessage({ type: 'error', text: 'Bitte geben Sie das Anschreiben ein.' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/old-cover-letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content, 
          company: company.trim() || null, 
          position: position.trim() || null 
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Anschreiben erfolgreich gespeichert!' })
        setContent("")
        setCompany("")
        setPosition("")
        if (onUpload) {
          onUpload()
        }
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Speichern' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern des Anschreibens' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Altes Anschreiben hochladen</CardTitle>
        <CardDescription>
          Laden Sie historische Anschreiben hoch, um die Tonalität für zukünftige Generierungen zu verbessern.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Unternehmen (optional)</Label>
            <Input
              id="company"
              placeholder="Unternehmen"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position (optional)</Label>
            <Input
              id="position"
              placeholder="Position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Anschreiben</Label>
          <Textarea
            id="content"
            placeholder="Fügen Sie hier das Anschreiben ein..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px]"
          />
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={saving || !content.trim()}
        >
          {saving ? 'Speichere...' : 'Anschreiben speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
