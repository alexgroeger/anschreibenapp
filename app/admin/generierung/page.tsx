"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { Trash2, Plus } from "lucide-react"

export default function GenerierungPage() {
  const [prompt, setPrompt] = useState<string>("")
  const [editedPrompt, setEditedPrompt] = useState<string>("")
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [excludedFormulations, setExcludedFormulations] = useState<string[]>([])
  const [editedExcludedFormulations, setEditedExcludedFormulations] = useState<string[]>([])
  const [favoriteFormulations, setFavoriteFormulations] = useState<string[]>([])
  const [editedFavoriteFormulations, setEditedFavoriteFormulations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingExclusions, setSavingExclusions] = useState(false)
  const [savingFavorites, setSavingFavorites] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch prompt
      const promptResponse = await fetch("/api/admin/prompts")
      if (!promptResponse.ok) {
        throw new Error(`HTTP error! status: ${promptResponse.status}`)
      }
      const promptData = await promptResponse.json()
      if (promptData.prompts?.generate?.content) {
        setPrompt(promptData.prompts.generate.content)
        setEditedPrompt(promptData.prompts.generate.content)
      } else {
        // Fallback: Setze leeren String wenn Prompt nicht gefunden
        console.warn("Generate prompt not found in response:", promptData)
        setPrompt("")
        setEditedPrompt("")
      }

      // Fetch settings
      const settingsResponse = await fetch("/api/admin/settings")
      const settingsData = await settingsResponse.json()
      setSettings(settingsData.settings)
      const initial: Record<string, string> = {}
      Object.keys(settingsData.settings).forEach((key) => {
        if (settingsData.settings[key].category === "generation" && key !== "excluded_formulations" && key !== "favorite_formulations") {
          initial[key] = settingsData.settings[key].value
        }
      })
      setEditedSettings(initial)
      
      // Handle excluded_formulations separately - convert from multiline text to array
      if (settingsData.settings?.excluded_formulations) {
        const formulationsText = settingsData.settings.excluded_formulations.value || ""
        const formulationsArray = formulationsText
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
        setExcludedFormulations(formulationsArray)
        setEditedExcludedFormulations(formulationsArray)
      } else {
        setExcludedFormulations([])
        setEditedExcludedFormulations([])
      }

      // Handle favorite_formulations separately - convert from multiline text to array
      if (settingsData.settings?.favorite_formulations) {
        const formulationsText = settingsData.settings.favorite_formulations.value || ""
        const formulationsArray = formulationsText
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
        setFavoriteFormulations(formulationsArray)
        setEditedFavoriteFormulations(formulationsArray)
      } else {
        setFavoriteFormulations([])
        setEditedFavoriteFormulations([])
      }
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
      if (settings[key].category === "generation" && key !== "excluded_formulations" && key !== "favorite_formulations") {
        initial[key] = settings[key].value
      }
    })
    setEditedSettings(initial)
  }

  const handleSaveExclusions = async () => {
    setSavingExclusions(true)
    try {
      // Convert array to multiline text for storage
      const formulationsText = editedExcludedFormulations
        .filter(item => item.trim().length > 0)
        .join('\n')
      
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            excluded_formulations: formulationsText,
          },
        }),
      })

      if (response.ok) {
        alert("Ausschlüsse gespeichert!")
        await fetchData()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving exclusions:", error)
      alert("Fehler beim Speichern der Ausschlüsse")
    } finally {
      setSavingExclusions(false)
    }
  }

  const handleResetExclusions = () => {
    setEditedExcludedFormulations([...excludedFormulations])
  }

  const handleAddExclusion = () => {
    setEditedExcludedFormulations([...editedExcludedFormulations, ""])
  }

  const handleUpdateExclusion = (index: number, value: string) => {
    const updated = [...editedExcludedFormulations]
    updated[index] = value
    setEditedExcludedFormulations(updated)
  }

  const handleDeleteExclusion = (index: number) => {
    const updated = editedExcludedFormulations.filter((_, i) => i !== index)
    setEditedExcludedFormulations(updated)
  }

  const handleSaveFavorites = async () => {
    setSavingFavorites(true)
    try {
      // Convert array to multiline text for storage
      const formulationsText = editedFavoriteFormulations
        .filter(item => item.trim().length > 0)
        .join('\n')
      
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            favorite_formulations: formulationsText,
          },
        }),
      })

      if (response.ok) {
        alert("Favorisierte Formulierungen gespeichert!")
        await fetchData()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving favorites:", error)
      alert("Fehler beim Speichern der favorisierten Formulierungen")
    } finally {
      setSavingFavorites(false)
    }
  }

  const handleResetFavorites = () => {
    setEditedFavoriteFormulations([...favoriteFormulations])
  }

  const handleAddFavorite = () => {
    setEditedFavoriteFormulations([...editedFavoriteFormulations, ""])
  }

  const handleUpdateFavorite = (index: number, value: string) => {
    const updated = [...editedFavoriteFormulations]
    updated[index] = value
    setEditedFavoriteFormulations(updated)
  }

  const handleDeleteFavorite = (index: number) => {
    const updated = editedFavoriteFormulations.filter((_, i) => i !== index)
    setEditedFavoriteFormulations(updated)
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
          <TabsTrigger value="exclusions">Ausschlüsse</TabsTrigger>
          <TabsTrigger value="favorites">Favoriten</TabsTrigger>
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
              {getSettingsByCategory("generation")
                .filter(([key]) => key !== "excluded_formulations" && key !== "favorite_formulations")
                .map(([key, setting]) => (
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
              {getSettingsByCategory("generation").filter(([key]) => key !== "excluded_formulations" && key !== "favorite_formulations").length === 0 && (
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

        <TabsContent value="exclusions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ausgeschlossene Formulierungen</CardTitle>
              <CardDescription>
                Verwalten Sie Formulierungen, die in Anschreiben und KI-Vorschlägen nicht verwendet werden sollen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {editedExcludedFormulations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Noch keine Ausschlüsse hinzugefügt. Klicken Sie auf "Hinzufügen", um einen neuen Ausschluss hinzuzufügen.
                  </p>
                ) : (
                  editedExcludedFormulations.map((formulation, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={formulation}
                        onChange={(e) => handleUpdateExclusion(index, e.target.value)}
                        placeholder="Formulierung eingeben..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteExclusion(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleAddExclusion}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSaveExclusions} disabled={savingExclusions}>
                  {savingExclusions ? "Speichere..." : "Speichern"}
                </Button>
                <Button variant="outline" onClick={handleResetExclusions}>
                  Zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Favorisierte Formulierungen</CardTitle>
              <CardDescription>
                Verwalten Sie Formulierungen, die bei der Erstellung von Anschreiben bevorzugt verwendet werden sollen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {editedFavoriteFormulations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Noch keine favorisierten Formulierungen hinzugefügt. Klicken Sie auf "Hinzufügen", um eine neue favorisierte Formulierung hinzuzufügen.
                  </p>
                ) : (
                  editedFavoriteFormulations.map((formulation, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={formulation}
                        onChange={(e) => handleUpdateFavorite(index, e.target.value)}
                        placeholder="Formulierung eingeben..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteFavorite(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleAddFavorite}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSaveFavorites} disabled={savingFavorites}>
                  {savingFavorites ? "Speichere..." : "Speichern"}
                </Button>
                <Button variant="outline" onClick={handleResetFavorites}>
                  Zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

