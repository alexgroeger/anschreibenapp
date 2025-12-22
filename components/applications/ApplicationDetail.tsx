"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"

interface Contact {
  id: number
  name: string
  email: string | null
  phone: string | null
  position: string | null
}

interface Application {
  id: number
  company: string
  position: string
  job_description: string | null
  extraction_data: string | null
  cover_letter: string | null
  status: string
  sent_at: string | null
  created_at: string
  contacts?: Contact[]
}

const statusLabels: Record<string, string> = {
  'gesendet': 'Gesendet',
  'in_bearbeitung': 'In Bearbeitung',
  'abgelehnt': 'Abgelehnt',
  'angenommen': 'Angenommen',
  'rueckmeldung_ausstehend': 'Rückmeldung ausstehend',
}

export function ApplicationDetail() {
  const params = useParams()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadApplication()
  }, [params.id])

  const loadApplication = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${params.id}`)
      const data = await response.json()
      setApplication(data.application)
      setStatus(data.application.status)
    } catch (error) {
      console.error('Error loading application:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!application) return

    setSaving(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        loadApplication()
      } else {
        alert('Fehler beim Aktualisieren des Status')
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren des Status')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Bewerbung...</div>
  }

  if (!application) {
    return <div className="text-center py-8">Bewerbung nicht gefunden</div>
  }

  const extractionData = application.extraction_data 
    ? JSON.parse(application.extraction_data) 
    : null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">{application.company}</h2>
          <p className="text-muted-foreground mt-1">{application.position}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Zurück zum Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rueckmeldung_ausstehend">Rückmeldung ausstehend</SelectItem>
                  <SelectItem value="gesendet">Gesendet</SelectItem>
                  <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                  <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                  <SelectItem value="angenommen">Angenommen</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleStatusUpdate} disabled={saving || status === application.status}>
                {saving ? 'Speichere...' : 'Aktualisieren'}
              </Button>
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <div><strong>Erstellt am:</strong> {format(new Date(application.created_at), 'dd.MM.yyyy HH:mm')}</div>
              {application.sent_at && (
                <div><strong>Gesendet am:</strong> {format(new Date(application.sent_at), 'dd.MM.yyyy HH:mm')}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {application.contacts && application.contacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Kontaktpersonen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {application.contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-lg p-3">
                    <div className="font-semibold">{contact.name}</div>
                    {contact.position && <div className="text-sm text-muted-foreground">{contact.position}</div>}
                    {contact.email && <div className="text-sm text-muted-foreground">📧 {contact.email}</div>}
                    {contact.phone && <div className="text-sm text-muted-foreground">📞 {contact.phone}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {extractionData && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Extraktionsdaten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {extractionData.keyRequirements && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Requirements</h4>
                    <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                      {typeof extractionData.keyRequirements === 'string' 
                        ? extractionData.keyRequirements 
                        : JSON.stringify(extractionData.keyRequirements, null, 2)}
                    </div>
                  </div>
                )}
                {extractionData.culture && (
                  <div>
                    <h4 className="font-semibold mb-2">Unternehmenskultur</h4>
                    <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                      {typeof extractionData.culture === 'string' 
                        ? extractionData.culture 
                        : JSON.stringify(extractionData.culture, null, 2)}
                    </div>
                  </div>
                )}
                {extractionData.skills && (
                  <div>
                    <h4 className="font-semibold mb-2">Hard Skills</h4>
                    <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                      {typeof extractionData.skills === 'string' 
                        ? extractionData.skills 
                        : JSON.stringify(extractionData.skills, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {application.cover_letter && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Anschreiben</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={application.cover_letter}
                readOnly
                className="min-h-[400px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        )}

        {application.job_description && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Jobbeschreibung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-muted p-4 rounded max-h-96 overflow-y-auto">
                {application.job_description}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
