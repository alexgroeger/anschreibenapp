"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default function GenerierungPage() {
  const [prompt, setPrompt] = useState<string>("")
  const [editedPrompt, setEditedPrompt] = useState<string>("")
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch prompt
      const promptResponse = await fetch("/api/admin/prompts")
      const promptData = await promptResponse.json()
      if (promptData.prompts?.generate) {
        setPrompt(promptData.prompts.generate.content)
        setEditedPrompt(promptData.prompts.generate.content)
      }

      // Fetch settings
      const settingsResponse = await fetch("/api/admin/settings")
      const settingsData = await settingsResponse.json()
      setSettings(settingsData.settings)
      const initial: Record<string, string> = {}
      Object.keys(settingsData.settings).forEach((key) => {
        if (settingsData.settings[key].category === "generation") {
          initial[key] = settingsData.settings[key].value
        }
      })
      setEditedSettings(initial)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePromptChange = (value: string) => {
    setEditedPrompt(value)
  }

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSavePrompt = async () => {
    setSavingPrompt(true)
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptName: "generate",
          content: editedPrompt,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Prompt gespeichert! Version ${data.version} erstellt.`)
        await fetchData()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving prompt:", error)
      alert("Fehler beim Speichern des Prompts")
    } finally {
      setSavingPrompt(false)
    }
  }

  const handleResetPrompt = () => {
    setEditedPrompt(prompt)
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: editedSettings,
        }),
      })

      if (response.ok) {
        alert("Einstellungen gespeichert!")
        await fetchData()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Fehler beim Speichern der Einstellungen")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetSettings = () => {
    const initial: Record<string, string> = {}
    Object.keys(settings).forEach((key) => {
      if (settings[key].category === "generation") {
        initial[key] = settings[key].value
      }
    })
    setEditedSettings(initial)
  }

  const getSettingsByCategory = (category: string) => {
    return Object.entries(settings).filter(([_, setting]) => setting.category === category)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Lade Daten...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Generierung" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Generierung</h1>
        <p className="text-muted-foreground mt-2">
          Verwaltung des Prompts zur Generierung des Anschreibens und der Generierungs-Einstellungen
        </p>
      </div>

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList>
          <TabsTrigger value="prompt">Generierungs-Prompt</TabsTrigger>
          <TabsTrigger value="settings">Generierungs-Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt zur Generierung des Anschreibens</CardTitle>
              <CardDescription>
                Bearbeiten Sie den Prompt, der für die Generierung von Anschreiben verwendet wird
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-content">Prompt-Inhalt</Label>
                <Textarea
                  id="prompt-content"
                  value={editedPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Prompt-Inhalt..."
                />
                <p className="text-xs text-muted-foreground">
                  Platzhalter wie {"{jobDescription}"}, {"{resume}"}, etc. werden automatisch
                  ersetzt.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSavePrompt} disabled={savingPrompt}>
                  {savingPrompt ? "Speichere..." : "Speichern"}
                </Button>
                <Button variant="outline" onClick={handleResetPrompt}>
                  Zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generierungs-Einstellungen</CardTitle>
              <CardDescription>
                Standardwerte und Limits für die Anschreiben-Generierung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByCategory("generation").map(([key, setting]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{setting.description || key}</Label>
                  <Input
                    id={key}
                    type={key.includes("words") ? "number" : "text"}
                    value={editedSettings[key] || ""}
                    onChange={(e) => handleSettingChange(key, e.target.value)}
                  />
                </div>
              ))}
              {getSettingsByCategory("generation").length === 0 && (
                <p className="text-muted-foreground">
                  Keine Generierungs-Einstellungen gefunden.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex gap-2">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Speichere..." : "Einstellungen speichern"}
            </Button>
            <Button variant="outline" onClick={handleResetSettings}>
              Zurücksetzen
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
