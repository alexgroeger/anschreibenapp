"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"

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
  'rueckmeldung_ausstehend': 'Versandt/Rückmeldung ausstehend',
}

const statusColors: Record<string, string> = {
  'gesendet': 'bg-blue-100 text-blue-800',
  'in_bearbeitung': 'bg-yellow-100 text-yellow-800',
  'abgelehnt': 'bg-red-100 text-red-800',
  'angenommen': 'bg-green-100 text-green-800',
  'rueckmeldung_ausstehend': 'bg-sky-100 text-sky-800',
}

export function ApplicationCard({ application }: { application: Application }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{application.company}</CardTitle>
            <CardDescription className="mt-1">{application.position}</CardDescription>
          </div>
          <Badge className={statusColors[application.status] || statusColors['rueckmeldung_ausstehend']}>
            {statusLabels[application.status] || application.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {application.sent_at && (
            <div>
              <strong>Gesendet am:</strong> {format(new Date(application.sent_at), 'dd.MM.yyyy')}
            </div>
          )}
          <div>
            <strong>Erstellt am:</strong> {format(new Date(application.created_at), 'dd.MM.yyyy')}
          </div>
          {application.contacts && application.contacts.length > 0 && (
            <div>
              <strong>Kontaktpersonen:</strong> {application.contacts.map(c => c.name).join(', ')}
            </div>
          )}
        </div>
        <div className="mt-4">
          <Link href={`/dashboard/${application.id}`}>
            <Button variant="outline" className="w-full">
              Details anzeigen
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
