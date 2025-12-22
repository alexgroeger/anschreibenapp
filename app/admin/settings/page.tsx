"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      const data = await response.json()
      setSettings(data.settings)
      // Initialize edited settings with current values
      const initial: Record<string, string> = {}
      Object.keys(data.settings).forEach((key) => {
        initial[key] = data.settings[key].value
      })
      setEditedSettings(initial)
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
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
        await fetchSettings()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Fehler beim Speichern der Einstellungen")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const initial: Record<string, string> = {}
    Object.keys(settings).forEach((key) => {
      initial[key] = settings[key].value
    })
    setEditedSettings(initial)
  }

  const getSettingsByCategory = (category: string) => {
    return Object.entries(settings).filter(([_, setting]) => setting.category === category)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Lade Einstellungen...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">System-Einstellungen</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurieren Sie KI-Modelle, Temperature-Werte und Standardeinstellungen
        </p>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList>
          <TabsTrigger value="ai">KI-Modell</TabsTrigger>
          <TabsTrigger value="generation">Generierung</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>KI-Modell-Konfiguration</CardTitle>
              <CardDescription>
                Einstellungen für das verwendete KI-Modell und Temperature-Parameter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByCategory("ai").map(([key, setting]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{setting.description || key}</Label>
                  <Input
                    id={key}
                    type={key.includes("temperature") ? "number" : "text"}
                    step={key.includes("temperature") ? "0.1" : undefined}
                    min={key.includes("temperature") ? "0" : undefined}
                    max={key.includes("temperature") ? "2" : undefined}
                    value={editedSettings[key] || ""}
                    onChange={(e) => handleSettingChange(key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generation" className="mt-6">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Speichere..." : "Einstellungen speichern"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Zurücksetzen
        </Button>
      </div>
    </div>
  )
}
