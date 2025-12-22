"use client"

import { useState, useEffect } from "react"
import { ApplicationCard } from "./ApplicationCard"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface Application {
  id: number
  company: string
  position: string
  status: string
  sent_at: string | null
  created_at: string
  contacts?: any[]
}

export function ApplicationDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadApplications = async () => {
    setLoading(true)
    try {
      const url = statusFilter === "all" 
        ? '/api/applications'
        : `/api/applications?status=${statusFilter}`
      const response = await fetch(url)
      const data = await response.json()
      setApplications(data.applications || [])
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [statusFilter])

  if (loading) {
    return <div className="text-center py-8">Lade Bewerbungen...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Bewerbungen</h2>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="rueckmeldung_ausstehend">Rückmeldung ausstehend</SelectItem>
              <SelectItem value="gesendet">Gesendet</SelectItem>
              <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
              <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
              <SelectItem value="angenommen">Angenommen</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/">
            <Button>Neue Bewerbung</Button>
          </Link>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Noch keine Bewerbungen vorhanden.</p>
            <p className="text-sm">Erstellen Sie Ihr erstes Anschreiben auf der Hauptseite.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  )
}
