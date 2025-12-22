"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/ui/file-upload"

export function OldCoverLetterUpload({ onUpload }: { onUpload?: () => void }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [textContent, setTextContent] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
    setTextContent("") // Clear text when file is selected
    setMessage(null)
  }

  const handleTextInput = (text: string) => {
    setTextContent(text)
    setUploadedFile(null) // Clear file when text is entered
  }

  const handleSave = async () => {
    // Check if either file or text content is provided
    if (!uploadedFile && !textContent.trim()) {
      setMessage({ type: 'error', text: 'Bitte laden Sie eine Datei hoch oder geben Sie das Anschreiben ein.' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      let response: Response

      if (uploadedFile) {
        // Upload file using FormData
        const formData = new FormData()
        formData.append('file', uploadedFile)
        if (company.trim()) {
          formData.append('company', company.trim())
        }
        if (position.trim()) {
          formData.append('position', position.trim())
        }

        response = await fetch('/api/old-cover-letters', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Upload text content using JSON
        response = await fetch('/api/old-cover-letters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            content: textContent, 
            company: company.trim() || null, 
            position: position.trim() || null 
          }),
        })
      }

      if (response.ok) {
        setMessage({ type: 'success', text: 'Anschreiben erfolgreich gespeichert!' })
        setTextContent("")
        setUploadedFile(null)
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
          Unterstützte Formate: PDF, TXT, DOCX, DOC
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

        <FileUpload
          onFileSelect={handleFileSelect}
          onTextInput={handleTextInput}
          accept=".pdf,.txt,.docx,.doc"
          maxSize={10}
        />

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
          disabled={saving || (!uploadedFile && !textContent.trim())}
        >
          {saving ? 'Speichere...' : 'Anschreiben speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
