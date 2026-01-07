"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { DocumentSearch } from "@/components/documents/DocumentSearch"

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
  deadline?: string | null
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
  'gesendet': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'in_bearbeitung': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'abgelehnt': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'angenommen': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'rueckmeldung_ausstehend': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
}

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  page: number
  totalPages: number
}

export function ApplicationDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [companyFilter, setCompanyFilter] = useState<string>("")
  const [positionFilter, setPositionFilter] = useState<string>("")
  const [sentAtFromFilter, setSentAtFromFilter] = useState<string>("")
  const [sentAtToFilter, setSentAtToFilter] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ company?: string; position?: string; status?: string }>({})
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const companyFilterTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const positionFilterTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadApplications = useCallback(async (page: number, status: string, company: string, position: string, sentAtFrom: string, sentAtTo: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== "all") {
        params.append('status', status)
      }
      if (company.trim()) {
        params.append('company', company.trim())
      }
      if (position.trim()) {
        params.append('position', position.trim())
      }
      if (sentAtFrom) {
        params.append('sent_at_from', sentAtFrom)
      }
      if (sentAtTo) {
        params.append('sent_at_to', sentAtTo)
      }
      params.append('page', page.toString())
      params.append('limit', '50')
      
      const url = `/api/applications?${params.toString()}`
      const response = await fetch(url)
      const data = await response.json()
      setApplications(data.applications || [])
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApplications(1, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter)
    setCurrentPage(1)
  }, [statusFilter, sentAtFromFilter, sentAtToFilter, loadApplications])

  // Debounce company filter
  useEffect(() => {
    if (companyFilterTimeoutRef.current) {
      clearTimeout(companyFilterTimeoutRef.current)
    }
    
    companyFilterTimeoutRef.current = setTimeout(() => {
      loadApplications(1, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter)
      setCurrentPage(1)
    }, 500) // 500ms debounce

    return () => {
      if (companyFilterTimeoutRef.current) {
        clearTimeout(companyFilterTimeoutRef.current)
      }
    }
  }, [companyFilter, statusFilter, positionFilter, sentAtFromFilter, sentAtToFilter, loadApplications])

  // Debounce position filter
  useEffect(() => {
    if (positionFilterTimeoutRef.current) {
      clearTimeout(positionFilterTimeoutRef.current)
    }
    
    positionFilterTimeoutRef.current = setTimeout(() => {
      loadApplications(1, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter)
      setCurrentPage(1)
    }, 500) // 500ms debounce

    return () => {
      if (positionFilterTimeoutRef.current) {
        clearTimeout(positionFilterTimeoutRef.current)
      }
    }
  }, [positionFilter, statusFilter, companyFilter, sentAtFromFilter, sentAtToFilter, loadApplications])

  useEffect(() => {
    if (editingId && editingField && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId, editingField])

  const handleStartEdit = useCallback((id: number, field: string, currentValue: string) => {
    setEditingId(id)
    setEditingField(field)
    setEditValues({ [field]: currentValue })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingField(null)
    setEditValues({})
  }, [])

  const handleSaveEdit = useCallback(async (id: number, field: string) => {
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
        await loadApplications(currentPage, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter)
        handleCancelEdit()
      } else {
        console.error('Failed to update application')
        alert('Fehler beim Speichern der Änderungen')
      }
    } catch (error) {
      console.error('Error updating application:', error)
      alert('Fehler beim Speichern der Änderungen')
    }
  }, [editValues, loadApplications, currentPage, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter, handleCancelEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: number, field: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id, field)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])

  const handleRowClick = useCallback((id: number, e: React.MouseEvent) => {
    // Don't navigate if clicking on editable fields or buttons
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.closest('button')) {
      return
    }
    router.push(`/dashboard/${id}`)
  }, [router])

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
    loadApplications(newPage, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter)
  }, [loadApplications, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter])

  const handleResetFilters = useCallback(() => {
    setStatusFilter("all")
    setCompanyFilter("")
    setPositionFilter("")
    setSentAtFromFilter("")
    setSentAtToFilter("")
    setCurrentPage(1)
    loadApplications(1, "all", "", "", "", "")
  }, [loadApplications])

  const handleExport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append('status', statusFilter)
      }
      if (companyFilter.trim()) {
        params.append('company', companyFilter.trim())
      }
      if (positionFilter.trim()) {
        params.append('position', positionFilter.trim())
      }
      if (sentAtFromFilter) {
        params.append('sent_at_from', sentAtFromFilter)
      }
      if (sentAtToFilter) {
        params.append('sent_at_to', sentAtToFilter)
      }
      
      const url = `/api/applications/export?${params.toString()}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Export fehlgeschlagen')
      }
      
      const applications = data.applications || []
      
      // Prepare data for Excel
      const headers = [
        'ID',
        'Firma',
        'Position',
        'Status',
        'Gesendet am',
        'Erstellt am',
        'Frist',
        'Kontaktpersonen'
      ]
      
      const rows = applications.map((app: Application) => {
        const contacts = app.contacts && app.contacts.length > 0
          ? app.contacts.map(c => `${c.name}${c.email ? ` (${c.email})` : ''}`).join('; ')
          : '-'
        
        const sentAt = app.sent_at 
          ? format(new Date(app.sent_at), 'dd.MM.yyyy')
          : '-'
        
        const createdAt = format(new Date(app.created_at), 'dd.MM.yyyy')
        
        const deadline = app.deadline
          ? format(new Date(app.deadline), 'dd.MM.yyyy')
          : '-'
        
        return [
          app.id,
          app.company,
          app.position,
          statusLabels[app.status] || app.status,
          sentAt,
          createdAt,
          deadline,
          contacts
        ]
      })
      
      // Create worksheet data
      const worksheetData = [headers, ...rows]
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 8 },   // ID
        { wch: 25 },  // Firma
        { wch: 30 },  // Position
        { wch: 25 },  // Status
        { wch: 12 },  // Gesendet am
        { wch: 12 },  // Erstellt am
        { wch: 12 },  // Frist
        { wch: 40 }   // Kontaktpersonen
      ]
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bewerbungen')
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { 
        type: 'array', 
        bookType: 'xlsx',
        cellStyles: true
      })
      
      // Create blob and download
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // Create download link
      const link = document.createElement('a')
      const blobUrl = window.URL.createObjectURL(blob)
      link.setAttribute('href', blobUrl)
      
      // Generate filename with current date
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      link.setAttribute('download', `bewerbungen-export-${dateStr}.xlsx`)
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
    } catch (error) {
      console.error('Error exporting applications:', error)
      alert('Fehler beim Exportieren der Daten')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter])

  // Applications are already filtered server-side, no need for client-side filtering
  const displayedApplications = useMemo(() => applications, [applications])

  if (loading) {
    return <div className="text-center py-8">Lade Bewerbungen...</div>
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="applications" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-semibold">Bewerbungen</h2>
          <div className="flex gap-2">
            <Link href="/bewerbung-hinzufuegen">
              <Button className="w-full sm:w-auto">Neue Bewerbung</Button>
            </Link>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="applications">Bewerbungen</TabsTrigger>
          <TabsTrigger value="documents">Dokumentensuche</TabsTrigger>
        </TabsList>
        
        <TabsContent value="applications" className="space-y-6 mt-6">
          <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <Input
            placeholder="Firma suchen..."
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full sm:w-[180px]"
          />
          <Input
            placeholder="Position suchen..."
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="w-full sm:w-[180px]"
          />
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs text-muted-foreground px-1">Gesendet</label>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Von"
                value={sentAtFromFilter}
                onChange={(e) => setSentAtFromFilter(e.target.value)}
                className="w-full sm:w-[140px]"
              />
              <Input
                type="date"
                placeholder="Bis"
                value={sentAtToFilter}
                onChange={(e) => setSentAtToFilter(e.target.value)}
                className="w-full sm:w-[140px]"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
              <SelectItem value="rueckmeldung_ausstehend">Versandt/Rückmeldung ausstehend</SelectItem>
              <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
              <SelectItem value="angenommen">Angenommen</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="w-full sm:w-auto"
          >
            Filter zurücksetzen
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? 'Exportiere...' : 'Als Excel exportieren'}
          </Button>
        </div>
      </div>

      {displayedApplications.length === 0 ? (
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
        <>
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
                {displayedApplications.map((application) => (
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
                              await loadApplications(currentPage, statusFilter, companyFilter, positionFilter, sentAtFromFilter, sentAtToFilter)
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
                          <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                          <SelectItem value="rueckmeldung_ausstehend">Versandt/Rückmeldung ausstehend</SelectItem>
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
          
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Zeige {((pagination.page - 1) * pagination.limit) + 1} bis {Math.min(pagination.page * pagination.limit, pagination.total)} von {pagination.total} Bewerbungen
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Zurück
                </Button>
                <div className="text-sm">
                  Seite {pagination.page} von {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </>
      )}
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
          <DocumentSearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}
