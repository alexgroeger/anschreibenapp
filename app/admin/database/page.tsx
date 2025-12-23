"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default function DatabasePage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [backingUp, setBackingUp] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchSyncStatus()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/database/stats")
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch("/api/admin/database/sync")
      const data = await response.json()
      setSyncStatus(data)
    } catch (error) {
      console.error("Error fetching sync status:", error)
    }
  }

  const handleSync = async (action: 'upload' | 'download') => {
    setSyncing(true)
    try {
      const response = await fetch(`/api/admin/database/sync?action=${action}`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || `${action === 'upload' ? 'Hochgeladen' : 'Heruntergeladen'} erfolgreich!`)
        await fetchSyncStatus()
      } else {
        const data = await response.json()
        alert(data.error || `Fehler beim ${action === 'upload' ? 'Hochladen' : 'Herunterladen'}`)
      }
    } catch (error) {
      console.error(`Error ${action === 'upload' ? 'uploading' : 'downloading'}:`, error)
      alert(`Fehler beim ${action === 'upload' ? 'Hochladen' : 'Herunterladen'}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const response = await fetch("/api/admin/database/backup", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Backup erstellt: ${data.backupPath}`)
      } else {
        alert("Fehler beim Erstellen des Backups")
      }
    } catch (error) {
      console.error("Error creating backup:", error)
      alert("Fehler beim Erstellen des Backups")
    } finally {
      setBackingUp(false)
    }
  }

  const handleOptimize = async () => {
    if (!confirm("Möchten Sie die Datenbank wirklich optimieren?")) {
      return
    }

    setOptimizing(true)
    try {
      const response = await fetch("/api/admin/database/optimize", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        alert("Datenbank erfolgreich optimiert!")
        await fetchStats()
      } else {
        alert("Fehler bei der Optimierung")
      }
    } catch (error) {
      console.error("Error optimizing database:", error)
      alert("Fehler bei der Optimierung")
    } finally {
      setOptimizing(false)
    }
  }

  const handleExport = async (type: string) => {
    try {
      const response = await fetch("/api/admin/data/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })

      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `export_${type}_${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        alert("Fehler beim Exportieren")
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Fehler beim Exportieren")
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Lade Datenbank-Statistiken...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Datenbank" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Datenbank-Verwaltung</h1>
        <p className="text-muted-foreground mt-2">
          Backup, Optimierung und Statistiken
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Datenbank-Statistiken</CardTitle>
            <CardDescription>Übersicht über die Datenbank-Inhalte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Lebenslauf:</span>
                <span className="text-sm font-medium">
                  {stats?.resume?.count?.count || 0} Einträge
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Alte Anschreiben:</span>
                <span className="text-sm font-medium">
                  {stats?.old_cover_letters?.count?.count || 0} Einträge
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Bewerbungen:</span>
                <span className="text-sm font-medium">
                  {stats?.applications?.count?.count || 0} Einträge
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Kontaktpersonen:</span>
                <span className="text-sm font-medium">
                  {stats?.contact_persons?.count?.count || 0} Einträge
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Einstellungen:</span>
                <span className="text-sm font-medium">
                  {stats?.settings?.count?.count || 0} Einträge
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Prompt-Versionen:</span>
                <span className="text-sm font-medium">
                  {stats?.prompt_versions?.count?.count || 0} Einträge
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datenbank-Aktionen</CardTitle>
            <CardDescription>Backup, Optimierung und Export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleBackup} disabled={backingUp} className="w-full">
              {backingUp ? "Erstelle Backup..." : "Backup erstellen"}
            </Button>
            <Button
              onClick={handleOptimize}
              disabled={optimizing}
              variant="outline"
              className="w-full"
            >
              {optimizing ? "Optimiere..." : "Datenbank optimieren"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cloud Storage Synchronisation</CardTitle>
            <CardDescription>
              {syncStatus?.cloudStorageConfigured 
                ? `Bucket: ${syncStatus.bucketName || 'Konfiguriert'}` 
                : 'Nicht konfiguriert - Setzen Sie GCS_BUCKET_NAME'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus?.cloudStorageConfigured ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {syncStatus.message}
                </div>
                
                {/* Local Database Info */}
                {syncStatus.localFile?.exists && (
                  <div className="text-xs space-y-1 p-2 bg-muted rounded">
                    <div className="font-medium">Lokale Datenbank:</div>
                    <div className="flex justify-between">
                      <span>Größe:</span>
                      <span>{(syncStatus.localFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Geändert:</span>
                      <span>{new Date(syncStatus.localFile.modified).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                )}
                
                {/* Cloud Database Info */}
                {syncStatus.cloudFile && (
                  <div className="text-xs space-y-1 p-2 bg-muted rounded">
                    <div className="font-medium">Cloud Storage:</div>
                    {syncStatus.cloudFile.exists ? (
                      <>
                        <div className="flex justify-between">
                          <span>Größe:</span>
                          <span>{(parseInt(syncStatus.cloudFile.size) / 1024).toFixed(2)} KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Zuletzt aktualisiert:</span>
                          <span>{new Date(syncStatus.cloudFile.updated).toLocaleString('de-DE')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">Keine Datenbank in Cloud Storage gefunden</div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleSync('upload')} 
                    disabled={syncing} 
                    className="w-full"
                  >
                    {syncing ? "Synchronisiere..." : "Zu Cloud Storage hochladen"}
                  </Button>
                  <Button 
                    onClick={() => handleSync('download')} 
                    disabled={syncing} 
                    variant="outline"
                    className="w-full"
                  >
                    {syncing ? "Lade herunter..." : "Von Cloud Storage herunterladen"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Cloud Storage ist nicht konfiguriert. Setzen Sie die Environment-Variable 
                <code className="bg-muted px-1 rounded mx-1">GCS_BUCKET_NAME</code> um die Synchronisation zu aktivieren.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daten exportieren</CardTitle>
            <CardDescription>Exportieren Sie Daten als JSON</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => handleExport("all")}
              variant="outline"
              className="w-full"
            >
              Alle Daten exportieren
            </Button>
            <Button
              onClick={() => handleExport("applications")}
              variant="outline"
              className="w-full"
            >
              Bewerbungen exportieren
            </Button>
            <Button
              onClick={() => handleExport("resume")}
              variant="outline"
              className="w-full"
            >
              Lebenslauf exportieren
            </Button>
            <Button
              onClick={() => handleExport("cover-letters")}
              variant="outline"
              className="w-full"
            >
              Alte Anschreiben exportieren
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

