"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingApiKey, setTestingApiKey] = useState(false)
  const [apiKeyTestResult, setApiKeyTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      const data = await response.json()
      setSettings(data.settings)
      // Initialize edited settings with current values (exclude generation category)
      const initial: Record<string, string> = {}
      Object.keys(data.settings).forEach((key) => {
        // Skip generation category settings (they are now in the Generierung page)
        if (data.settings[key].category === "generation") {
          return
        }
        // Für API-Key: Wenn leer, zeige leeren String (nicht den Wert aus .env.local)
        if (key === 'google_api_key' && !data.settings[key].value) {
          initial[key] = ''
        } else {
          initial[key] = data.settings[key].value
        }
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
      // Skip generation category settings (they are now in the Generierung page)
      if (settings[key].category === "generation") {
        return
      }
      if (key === 'google_api_key' && !settings[key].value) {
        initial[key] = ''
      } else {
        initial[key] = settings[key].value
      }
    })
    setEditedSettings(initial)
    setApiKeyTestResult(null)
  }

  const handleTestApiKey = async () => {
    const apiKey = editedSettings['google_api_key'] || ''
    if (!apiKey.trim()) {
      setApiKeyTestResult({
        success: false,
        message: 'Bitte geben Sie einen API-Key ein, um ihn zu testen.'
      })
      return
    }

    setTestingApiKey(true)
    setApiKeyTestResult(null)
    
    try {
      // Temporär den API-Key setzen und testen
      const response = await fetch('/api/test-connection', {
        method: 'GET',
      })

      const data = await response.json()
      
      if (data.success) {
        setApiKeyTestResult({
          success: true,
          message: `✅ API-Key funktioniert! Modell: ${data.model || 'Unbekannt'}`
        })
      } else {
        setApiKeyTestResult({
          success: false,
          message: `❌ Fehler: ${data.error || data.details || 'Unbekannter Fehler'}`
        })
      }
    } catch (error: any) {
      setApiKeyTestResult({
        success: false,
        message: `❌ Fehler beim Testen: ${error.message || 'Unbekannter Fehler'}`
      })
    } finally {
      setTestingApiKey(false)
    }
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
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Einstellungen" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">System-Einstellungen</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurieren Sie KI-Modelle, Temperature-Werte und Standardeinstellungen
        </p>
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList>
          <TabsTrigger value="api">API-Konfiguration</TabsTrigger>
          <TabsTrigger value="ai">KI-Modell</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API-Key Konfiguration</CardTitle>
              <CardDescription>
                Google Gemini API-Key verwalten. Wenn leer gelassen, wird der Key aus .env.local verwendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByCategory("api").map(([key, setting]) => {
                const currentValue = editedSettings[key] || "";
                const hasValue = currentValue.length > 0;
                
                return (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{setting.description || key}</Label>
                    <div className="space-y-2">
                      <Input
                        id={key}
                        type="password"
                        placeholder={key === 'google_api_key' ? 'Leer lassen für .env.local' : ''}
                        value={currentValue}
                        onChange={(e) => handleSettingChange(key, e.target.value)}
                        className="font-mono text-sm"
                      />
                      {key === 'google_api_key' && (
                        <>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleTestApiKey}
                              disabled={testingApiKey || !hasValue}
                              className="mt-2"
                            >
                              {testingApiKey ? 'Teste...' : 'API-Key testen'}
                            </Button>
                          </div>
                          {apiKeyTestResult && (
                            <div className={`mt-2 p-2 rounded text-xs ${
                              apiKeyTestResult.success 
                                ? 'bg-green-50 text-green-800 border border-green-200' 
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              {apiKeyTestResult.message}
                            </div>
                          )}
                          {hasValue && !apiKeyTestResult && (
                            <p className="text-xs text-muted-foreground mt-2">
                              ✓ API-Key ist gesetzt ({currentValue.length} Zeichen). Leer lassen, um .env.local zu verwenden.
                            </p>
                          )}
                          {!hasValue && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Kein API-Key in Datenbank. Es wird der Key aus .env.local verwendet (falls vorhanden).
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            <a 
                              href="https://aistudio.google.com/app/apikey" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              API-Key erstellen →
                            </a>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

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
