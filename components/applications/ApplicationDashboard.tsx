"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

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
  'rueckmeldung_ausstehend': 'Rückmeldung ausstehend',
}

const statusColors: Record<string, string> = {
  'gesendet': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'in_bearbeitung': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'abgelehnt': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'angenommen': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'rueckmeldung_ausstehend': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function ApplicationDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [companyFilter, setCompanyFilter] = useState<string>("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ company?: string; position?: string; status?: string }>({})
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (editingId && editingField && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId, editingField])

  const handleStartEdit = (id: number, field: string, currentValue: string) => {
    setEditingId(id)
    setEditingField(field)
    setEditValues({ [field]: currentValue })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingField(null)
    setEditValues({})
  }

  const handleSaveEdit = async (id: number, field: string) => {
    const value = editValues[field as keyof typeof editValues]
    if (value === undefined) {
      handleCancelEdit()
      return
    }

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        await loadApplications()
        handleCancelEdit()
      } else {
        console.error('Failed to update application')
        alert('Fehler beim Speichern der Änderungen')
      }
    } catch (error) {
      console.error('Error updating application:', error)
      alert('Fehler beim Speichern der Änderungen')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: number, field: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id, field)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleRowClick = (id: number, e: React.MouseEvent) => {
    // Don't navigate if clicking on editable fields or buttons
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.closest('button')) {
      return
    }
    router.push(`/dashboard/${id}`)
  }

  const filteredApplications = applications.filter(app => {
    if (companyFilter && !app.company.toLowerCase().includes(companyFilter.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading) {
    return <div className="text-center py-8">Lade Bewerbungen...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold">Bewerbungen</h2>
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          <Input
            placeholder="Firma suchen..."
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full sm:w-[200px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
            <Button className="w-full sm:w-auto">Neue Bewerbung</Button>
          </Link>
        </div>
      </div>

      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">
              {applications.length === 0 
                ? "Noch keine Bewerbungen vorhanden."
                : "Keine Bewerbungen gefunden, die den Filtern entsprechen."}
            </p>
            <p className="text-sm">Erstellen Sie Ihr erstes Anschreiben auf der Hauptseite.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Firma</TableHead>
                <TableHead className="w-[200px]">Position</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[120px]">Gesendet am</TableHead>
                <TableHead className="w-[120px]">Erstellt am</TableHead>
                <TableHead>Kontaktpersonen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((application) => (
                <TableRow
                  key={application.id}
                  onClick={(e) => handleRowClick(application.id, e)}
                  className="cursor-pointer"
                >
                  <TableCell
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(application.id, 'company', application.company)
                    }}
                  >
                    {editingId === application.id && editingField === 'company' ? (
                      <Input
                        ref={inputRef}
                        value={editValues.company || application.company}
                        onChange={(e) => setEditValues({ company: e.target.value })}
                        onBlur={() => handleSaveEdit(application.id, 'company')}
                        onKeyDown={(e) => handleKeyDown(e, application.id, 'company')}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8"
                      />
                    ) : (
                      <span className="font-medium">{application.company}</span>
                    )}
                  </TableCell>
                  <TableCell
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(application.id, 'position', application.position)
                    }}
                  >
                    {editingId === application.id && editingField === 'position' ? (
                      <Input
                        value={editValues.position || application.position}
                        onChange={(e) => setEditValues({ position: e.target.value })}
                        onBlur={() => handleSaveEdit(application.id, 'position')}
                        onKeyDown={(e) => handleKeyDown(e, application.id, 'position')}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8"
                      />
                    ) : (
                      <span>{application.position}</span>
                    )}
                  </TableCell>
                  <TableCell
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(application.id, 'status', application.status)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingId === application.id && editingField === 'status' ? (
                      <Select
                        value={editValues.status || application.status}
                        onValueChange={async (value) => {
                          setEditValues({ status: value })
                          // Save immediately when status is selected
                          try {
                            const response = await fetch(`/api/applications/${application.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ status: value }),
                            })

                            if (response.ok) {
                              await loadApplications()
                              handleCancelEdit()
                            } else {
                              console.error('Failed to update application')
                              alert('Fehler beim Speichern der Änderungen')
                            }
                          } catch (error) {
                            console.error('Error updating application:', error)
                            alert('Fehler beim Speichern der Änderungen')
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-full">
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
                    ) : (
                      <Badge className={statusColors[application.status] || statusColors['rueckmeldung_ausstehend']}>
                        {statusLabels[application.status] || application.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {application.sent_at 
                      ? format(new Date(application.sent_at), 'dd.MM.yyyy')
                      : <span className="text-muted-foreground">-</span>
                    }
                  </TableCell>
                  <TableCell>
                    {format(new Date(application.created_at), 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell>
                    {application.contacts && application.contacts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {application.contacts.map((contact) => (
                          <Badge key={contact.id} variant="outline" className="text-xs">
                            {contact.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
