"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Lade Admin-Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin-Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Verwaltung von Prompts, Einstellungen und Daten
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lebenslauf</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resume?.count?.count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.resume?.totalSize || 0) > 0
                ? `${Math.round(stats.resume.totalSize / 1024)} KB`
                : "Keine Daten"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Alte Anschreiben</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.old_cover_letters?.count?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.old_cover_letters?.totalSize || 0) > 0
                ? `${Math.round(stats.old_cover_letters.totalSize / 1024)} KB`
                : "Keine Daten"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bewerbungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.applications?.count?.count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.applications?.byStatus?.length || 0} verschiedene Status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Kontaktpersonen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.contact_persons?.count?.count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          <TabsTrigger value="database">Datenbank</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Schnellzugriff auf wichtige Funktionen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/admin/prompts">
                  <Button variant="outline" className="w-full justify-start">
                    Prompts verwalten
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant="outline" className="w-full justify-start">
                    System-Einstellungen
                  </Button>
                </Link>
                <Link href="/admin/database">
                  <Button variant="outline" className="w-full justify-start">
                    Datenbank-Verwaltung
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bewerbungen nach Status</CardTitle>
                <CardDescription>Verteilung der Bewerbungen</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.applications?.byStatus?.length > 0 ? (
                  <div className="space-y-2">
                    {stats.applications.byStatus.map((item: any) => (
                      <div key={item.status} className="flex justify-between">
                        <span className="text-sm capitalize">
                          {item.status.replace("_", " ")}
                        </span>
                        <span className="text-sm font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt-Verwaltung</CardTitle>
              <CardDescription>
                Verwalten Sie die KI-Prompts für Extraktion, Matching, Generierung und
                Tonalitäts-Analyse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/prompts">
                <Button>Zu Prompt-Verwaltung</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System-Einstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie KI-Modelle, Temperature-Werte und Standardeinstellungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/settings">
                <Button>Zu Einstellungen</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Datenbank-Verwaltung</CardTitle>
              <CardDescription>
                Backup, Optimierung und Statistiken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/database">
                <Button>Zu Datenbank-Verwaltung</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
