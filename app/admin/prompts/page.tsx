"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const promptNames = [
  { key: "extract", label: "Extraktion", description: "Analysiert Jobbeschreibungen" },
  { key: "match", label: "Matching", description: "Vergleicht Job mit Profil" },
  { key: "generate", label: "Generierung", description: "Erstellt Anschreiben" },
  { key: "tone-analysis", label: "Tonalitäts-Analyse", description: "Analysiert Schreibstil" },
]

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Record<string, any>>({})
  const [selectedPrompt, setSelectedPrompt] = useState<string>("extract")
  const [editedContent, setEditedContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPrompts()
  }, [])

  useEffect(() => {
    if (prompts[selectedPrompt]) {
      setEditedContent(prompts[selectedPrompt].content)
    }
  }, [selectedPrompt, prompts])

  const fetchPrompts = async () => {
    try {
      const response = await fetch("/api/admin/prompts")
      const data = await response.json()
      setPrompts(data.prompts)
      if (data.prompts[selectedPrompt]) {
        setEditedContent(data.prompts[selectedPrompt].content)
      }
    } catch (error) {
      console.error("Error fetching prompts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptName: selectedPrompt,
          content: editedContent,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Prompt gespeichert! Version ${data.version} erstellt.`)
        await fetchPrompts()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving prompt:", error)
      alert("Fehler beim Speichern des Prompts")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (prompts[selectedPrompt]) {
      setEditedContent(prompts[selectedPrompt].content)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Lade Prompts...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Prompt-Verwaltung</h1>
        <p className="text-muted-foreground mt-2">
          Bearbeiten Sie die KI-Prompts für verschiedene Funktionen
        </p>
      </div>

      <Tabs value={selectedPrompt} onValueChange={setSelectedPrompt}>
        <TabsList className="grid w-full grid-cols-4">
          {promptNames.map((prompt) => (
            <TabsTrigger key={prompt.key} value={prompt.key}>
              {prompt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {promptNames.map((prompt) => (
          <TabsContent key={prompt.key} value={prompt.key} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{prompt.label}</CardTitle>
                <CardDescription>{prompt.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-content">Prompt-Inhalt</Label>
                  <Textarea
                    id="prompt-content"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Prompt-Inhalt..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Platzhalter wie {"{jobDescription}"}, {"{resume}"}, etc. werden automatisch
                    ersetzt.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Speichere..." : "Speichern"}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Zurücksetzen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
