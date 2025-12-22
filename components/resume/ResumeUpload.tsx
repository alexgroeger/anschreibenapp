"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function ResumeUpload() {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadResume()
  }, [])

  const loadResume = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/resume')
      const data = await response.json()
      if (data.resume) {
        setContent(data.resume.content)
      }
    } catch (error) {
      console.error('Error loading resume:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!content.trim()) {
      setMessage({ type: 'error', text: 'Bitte geben Sie Ihren Lebenslauf ein.' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Lebenslauf erfolgreich gespeichert!' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Speichern' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern des Lebenslaufs' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Lebenslauf...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lebenslauf verwalten</CardTitle>
        <CardDescription>
          Laden Sie Ihren Lebenslauf einmalig hoch. Dieser wird automatisch bei jedem Matching und jeder Generierung verwendet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resume">Lebenslauf</Label>
          <Textarea
            id="resume"
            placeholder="Fügen Sie hier Ihren Lebenslauf ein..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px]"
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
          {saving ? 'Speichere...' : 'Lebenslauf speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
