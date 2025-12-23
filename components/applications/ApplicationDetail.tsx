"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Markdown } from "@/components/ui/markdown"
import { format } from "date-fns"
import { Pencil, Save, X, Building2, Briefcase, Calendar, User, Mail, Phone, ExternalLink, Plus, Trash2, Euro, FileText, MapPin, Clock, FileEdit, Download, Eye } from "lucide-react"
import { CoverLetterEditor } from "@/components/cover-letter/CoverLetterEditor"
import { ReminderList } from "@/components/reminders/ReminderList"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  match_result: string | null
  match_score: string | null
  cover_letter: string | null
  status: string
  sent_at: string | null
  created_at: string
  contacts?: Contact[]
  job_document_filename?: string | null
  job_document_path?: string | null
  job_document_type?: string | null
}

const statusLabels: Record<string, string> = {
  'gesendet': 'Gesendet',
  'in_bearbeitung': 'In Bearbeitung',
  'abgelehnt': 'Abgelehnt',
  'angenommen': 'Angenommen',
  'rueckmeldung_ausstehend': 'Versandt/Rückmeldung ausstehend',
}

const scoreLabels: Record<string, string> = {
  'nicht_passend': 'Nicht passend',
  'mittel': 'Mittel',
  'gut': 'Gut',
  'sehr_gut': 'Sehr gut',
}

const scoreVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  'nicht_passend': 'destructive',
  'mittel': 'outline',
  'gut': 'secondary',
  'sehr_gut': 'default',
}

function MatchScoreBadge({ score }: { score: string | null }) {
  if (!score || !scoreLabels[score]) {
    return null
  }
  
  // Use green for "sehr_gut"
  if (score === 'sehr_gut') {
    return (
      <Badge className="border-transparent bg-green-500 text-white hover:bg-green-600">
        Passung: {scoreLabels[score]}
      </Badge>
    )
  }
  
  return (
    <Badge variant={scoreVariants[score] || 'outline'}>
      Passung: {scoreLabels[score]}
    </Badge>
  )
}

export function ApplicationDetail() {
  const params = useParams()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  
  // New state for editable fields
  const [editingCompany, setEditingCompany] = useState(false)
  const [editingPosition, setEditingPosition] = useState(false)
  const [editedCompany, setEditedCompany] = useState("")
  const [editedPosition, setEditedPosition] = useState("")
  const [sentAt, setSentAt] = useState("")
  const [editingSentAt, setEditingSentAt] = useState(false)
  
  // Contact person editing state
  const [addingContact, setAddingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", position: "" })
  
  // Cover letter editing state
  const [editedCoverLetter, setEditedCoverLetter] = useState<string | null>(null)
  
  // Dialog state for sent_at date
  const [showSentAtDialog, setShowSentAtDialog] = useState(false)
  const [dialogSentAt, setDialogSentAt] = useState("")

  const loadApplication = useCallback(async () => {
    if (!params?.id) return
    
    // Handle both string and array formats (Next.js 15 compatibility)
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    if (!id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${id}`)
      if (!response.ok) {
        throw new Error('Failed to load application')
      }
      const data = await response.json()
      if (!data.application) {
        throw new Error('Application not found')
      }
      setApplication(data.application)
      setStatus(data.application.status || 'rueckmeldung_ausstehend')
      setEditedCompany(data.application.company || '')
      setEditedPosition(data.application.position || '')
      
      // Auto-open editor if status is "in_bearbeitung" and no cover letter exists
      const shouldAutoOpen = 
        data.application.status === 'in_bearbeitung' && 
        !data.application.cover_letter
      setEditorOpen(shouldAutoOpen)
      
      if (data.application.sent_at) {
        // Format date for input field (YYYY-MM-DD)
        try {
          const date = new Date(data.application.sent_at)
          setSentAt(format(date, 'yyyy-MM-dd'))
        } catch (e) {
          setSentAt("")
        }
      } else {
        setSentAt("")
      }
    } catch (error) {
      console.error('Error loading application:', error)
      setApplication(null)
    } finally {
      setLoading(false)
    }
  }, [params?.id])

  useEffect(() => {
    if (params?.id) {
      loadApplication()
    }
  }, [params?.id, loadApplication])

  const handleStatusUpdate = async (newStatus?: string) => {
    if (!application) return

    const statusToUpdate = newStatus || status
    setSaving(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: statusToUpdate }),
      })

      if (response.ok) {
        setStatus(statusToUpdate)
        
        // Check if status is "rueckmeldung_ausstehend" and sent_at is empty
        if (statusToUpdate === 'rueckmeldung_ausstehend' && !application.sent_at) {
          // Set today's date as default
          const today = format(new Date(), 'yyyy-MM-dd')
          setDialogSentAt(today)
          setShowSentAtDialog(true)
        } else {
          loadApplication()
        }
      } else {
        alert('Fehler beim Aktualisieren des Status')
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren des Status')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSentAtFromDialog = async () => {
    if (!application) return

    setSaving(true)
    try {
      const sentAtValue = dialogSentAt ? new Date(dialogSentAt).toISOString() : null
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sent_at: sentAtValue }),
      })

      if (response.ok) {
        setShowSentAtDialog(false)
        setDialogSentAt("")
        loadApplication()
      } else {
        alert('Fehler beim Speichern des Versanddatums')
      }
    } catch (error) {
      alert('Fehler beim Speichern des Versanddatums')
    } finally {
      setSaving(false)
    }
  }

  const handleCompanyUpdate = async () => {
    if (!application || !editedCompany.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company: editedCompany.trim() }),
      })

      if (response.ok) {
        setEditingCompany(false)
        loadApplication()
      } else {
        alert('Fehler beim Aktualisieren des Unternehmens')
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren des Unternehmens')
    } finally {
      setSaving(false)
    }
  }

  const handlePositionUpdate = async () => {
    if (!application || !editedPosition.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position: editedPosition.trim() }),
      })

      if (response.ok) {
        setEditingPosition(false)
        loadApplication()
      } else {
        alert('Fehler beim Aktualisieren der Position')
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren der Position')
    } finally {
      setSaving(false)
    }
  }

  const handleSentAtUpdate = async () => {
    if (!application) return

    setSaving(true)
    try {
      const sentAtValue = sentAt ? new Date(sentAt).toISOString() : null
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sent_at: sentAtValue }),
      })

      if (response.ok) {
        setEditingSentAt(false)
        loadApplication()
      } else {
        alert('Fehler beim Aktualisieren des Datums')
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren des Datums')
    } finally {
      setSaving(false)
    }
  }

  const handleAddContact = async () => {
    if (!application || !newContact.name.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/contact-persons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: application.id,
          name: newContact.name.trim(),
          email: newContact.email.trim() || null,
          phone: newContact.phone.trim() || null,
          position: newContact.position.trim() || null,
        }),
      })

      if (response.ok) {
        setNewContact({ name: "", email: "", phone: "", position: "" })
        setAddingContact(false)
        loadApplication()
      } else {
        alert('Fehler beim Hinzufügen der Kontaktperson')
      }
    } catch (error) {
      alert('Fehler beim Hinzufügen der Kontaktperson')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = async (contactId: number) => {
    if (!application || !confirm('Möchten Sie diese Kontaktperson wirklich löschen?')) return

    setSaving(true)
    try {
      const response = await fetch(`/api/contact-persons/${contactId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadApplication()
      } else {
        alert('Fehler beim Löschen der Kontaktperson')
      }
    } catch (error) {
      alert('Fehler beim Löschen der Kontaktperson')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCoverLetter = async (content: string) => {
    if (!application) return

    setSaving(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cover_letter: content }),
      })

      if (response.ok) {
        await loadApplication()
      } else {
        alert('Fehler beim Speichern des Anschreibens')
      }
    } catch (error) {
      alert('Fehler beim Speichern des Anschreibens')
    } finally {
      setSaving(false)
    }
  }

  if (!params?.id) {
    return <div className="text-center py-8">Ungültige Bewerbungs-ID</div>
  }

  if (loading) {
    return <div className="text-center py-8">Lade Bewerbung...</div>
  }

  if (!application) {
    return <div className="text-center py-8">Bewerbung nicht gefunden</div>
  }

  let extractionData = null
  if (application.extraction_data) {
    try {
      extractionData = JSON.parse(application.extraction_data)
    } catch (e) {
      console.error('Error parsing extraction data:', e)
      extractionData = null
    }
  }

  const statusColors: Record<string, string> = {
    'gesendet': 'bg-blue-100 text-blue-800 border-blue-200',
    'in_bearbeitung': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'abgelehnt': 'bg-red-100 text-red-800 border-red-200',
    'angenommen': 'bg-green-100 text-green-800 border-green-200',
    'rueckmeldung_ausstehend': 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const showSentAtField = status === 'rueckmeldung_ausstehend' || status === 'abgelehnt' || status === 'angenommen'

  // Function to convert URLs in text to clickable links
  // Links at the beginning are shortened
  const linkifyText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    // Check if the text starts with a URL
    const startsWithUrl = parts.length > 0 && urlRegex.test(parts[0])
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        // Shorten URL if it's at the beginning
        let displayText = part
        if (index === 0 && startsWithUrl) {
          try {
            const url = new URL(part)
            displayText = url.hostname + (url.pathname.length > 20 ? url.pathname.substring(0, 20) + '...' : url.pathname)
          } catch {
            // If URL parsing fails, just truncate
            displayText = part.length > 50 ? part.substring(0, 50) + '...' : part
          }
        }
        
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
            title={part}
          >
            {displayText}
            <ExternalLink className="h-3 w-3" />
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-4 pb-4 border-b">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold truncate">
            {application.company} - {application.position}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-2"
          >
            <FileEdit className="h-4 w-4" />
            Anschreiben bearbeiten
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Zurück zum Dashboard
          </Button>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reminders */}
          <div className="space-y-2">
            <ReminderList applicationId={application.id} />
          </div>

          {/* Matching Ergebnis */}
          {application.match_result ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Matching-Ergebnis</CardTitle>
                    <CardDescription>
                      Analyse der Übereinstimmung zwischen Ihrem Profil und der Stellenausschreibung
                    </CardDescription>
                  </div>
                  <MatchScoreBadge score={application.match_score} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-y-auto">
                  <Markdown content={application.match_result} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Noch kein Matching-Ergebnis vorhanden</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - right side */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
            <Select 
              value={status} 
              onValueChange={(newStatus) => {
                setStatus(newStatus)
                handleStatusUpdate(newStatus)
              }}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                <SelectItem value="rueckmeldung_ausstehend">Versandt/Rückmeldung ausstehend</SelectItem>
                <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                <SelectItem value="angenommen">Angenommen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sent At (only shown for specific statuses) */}
          {showSentAtField && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Gesendet am
              </label>
              {editingSentAt ? (
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={sentAt}
                    onChange={(e) => setSentAt(e.target.value)}
                    className="w-full h-9"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSentAtUpdate}
                      disabled={saving}
                      className="h-8"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Speichern
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (application.sent_at) {
                          const date = new Date(application.sent_at)
                          setSentAt(format(date, 'yyyy-MM-dd'))
                        } else {
                          setSentAt("")
                        }
                        setEditingSentAt(false)
                      }}
                      disabled={saving}
                      className="h-8"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <p className="text-sm font-medium">
                    {application.sent_at 
                      ? (() => {
                          try {
                            return format(new Date(application.sent_at), 'dd.MM.yyyy')
                          } catch (e) {
                            return 'Ungültiges Datum'
                          }
                        })()
                      : 'Nicht gesetzt'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSentAt(true)}
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Contact Persons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <User className="h-3 w-3" />
                Kontaktpersonen
              </label>
              {!addingContact && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingContact(true)}
                  className="h-6 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Hinzufügen
                </Button>
              )}
            </div>
            
            {addingContact && (
              <div className="border rounded-md p-2.5 space-y-2 bg-muted/30">
                <Input
                  placeholder="Name *"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Telefon"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Position"
                  value={newContact.position}
                  onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddContact}
                    disabled={saving || !newContact.name.trim()}
                    className="h-7 text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Speichern
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingContact(false)
                      setNewContact({ name: "", email: "", phone: "", position: "" })
                    }}
                    disabled={saving}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {application.contacts && application.contacts.length > 0 && (
              <div className="space-y-2">
                {application.contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-md p-2.5 space-y-1.5 hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <div className="font-medium text-xs">{contact.name}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteContact(contact.id)}
                        disabled={saving}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    {contact.position && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-4">
                        <Briefcase className="h-3 w-3" />
                        <span>{contact.position}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-4">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-4">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {(!application.contacts || application.contacts.length === 0) && !addingContact && (
              <p className="text-xs text-muted-foreground italic">Keine Kontaktpersonen vorhanden</p>
            )}
          </div>

          {/* Company */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Unternehmen
            </label>
            {editingCompany ? (
              <div className="space-y-2">
                <Input
                  value={editedCompany}
                  onChange={(e) => setEditedCompany(e.target.value)}
                  placeholder="Unternehmen"
                  className="w-full h-9"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleCompanyUpdate}
                    disabled={saving || !editedCompany.trim()}
                    className="h-8"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Speichern
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditedCompany(application.company)
                      setEditingCompany(false)
                    }}
                    disabled={saving}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <p className="text-sm font-medium">{application.company}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingCompany(true)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              Position
            </label>
            {editingPosition ? (
              <div className="space-y-2">
                <Input
                  value={editedPosition}
                  onChange={(e) => setEditedPosition(e.target.value)}
                  placeholder="Position"
                  className="w-full h-9"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handlePositionUpdate}
                    disabled={saving || !editedPosition.trim()}
                    className="h-8"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Speichern
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditedPosition(application.position)
                      setEditingPosition(false)
                    }}
                    disabled={saving}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <p className="text-sm font-medium">{application.position}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingPosition(true)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Job Description */}
          {application.job_description && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Jobbeschreibung
              </label>
              {/* If document exists, show only download/view buttons, otherwise show text */}
              {application.job_document_path && application.job_document_filename ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="font-medium">{application.job_document_filename}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/api/applications/${application.id}/document?view=true`, '_blank')
                      }}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-3 w-3" />
                      Im Browser öffnen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = `/api/applications/${application.id}/document`
                        link.download = application.job_document_filename || 'document'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-3 w-3" />
                      Herunterladen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs whitespace-pre-wrap bg-muted p-2.5 rounded-md border max-h-64 overflow-y-auto break-words">
                  {linkifyText(application.job_description)}
                </div>
              )}
            </div>
          )}

          {/* Extraction Data */}
          {extractionData && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Extraktionsdaten
              </label>
              <div className="space-y-3">
                {extractionData.keyRequirements && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Key Requirements</label>
                    <div className="text-xs whitespace-pre-wrap bg-muted p-2.5 rounded-md border max-h-32 overflow-y-auto">
                      {typeof extractionData.keyRequirements === 'string' 
                        ? extractionData.keyRequirements 
                        : JSON.stringify(extractionData.keyRequirements, null, 2)}
                    </div>
                  </div>
                )}
                {extractionData.culture && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Unternehmenskultur</label>
                    <div className="text-xs whitespace-pre-wrap bg-muted p-2.5 rounded-md border max-h-32 overflow-y-auto">
                      {typeof extractionData.culture === 'string' 
                        ? extractionData.culture 
                        : JSON.stringify(extractionData.culture, null, 2)}
                    </div>
                  </div>
                )}
                {extractionData.skills && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hard Skills</label>
                    <div className="text-xs whitespace-pre-wrap bg-muted p-2.5 rounded-md border max-h-32 overflow-y-auto">
                      {typeof extractionData.skills === 'string' 
                        ? extractionData.skills 
                        : JSON.stringify(extractionData.skills, null, 2)}
                    </div>
                  </div>
                )}
                {extractionData.softSkills && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Soft Skills</label>
                    <div className="text-xs whitespace-pre-wrap bg-muted p-2.5 rounded-md border max-h-32 overflow-y-auto">
                      {typeof extractionData.softSkills === 'string' 
                        ? extractionData.softSkills 
                        : JSON.stringify(extractionData.softSkills, null, 2)}
                    </div>
                  </div>
                )}
                
                {/* New metadata fields */}
                {(extractionData.deadline || extractionData.salary || extractionData.contractType || extractionData.workplace || extractionData.startDate) && (
                  <div className="pt-2 border-t">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Weitere Informationen</label>
                    <div className="space-y-2">
                      {extractionData.deadline && (
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Bewerbungsfrist:</span>
                          <span className="font-medium">{extractionData.deadline}</span>
                        </div>
                      )}
                      {extractionData.salary && (
                        <div className="flex items-center gap-2 text-xs">
                          <Euro className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Vergütung:</span>
                          <span className="font-medium">{extractionData.salary}</span>
                        </div>
                      )}
                      {extractionData.contractType && (
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Befristung:</span>
                          <span className="font-medium">{extractionData.contractType}</span>
                        </div>
                      )}
                      {extractionData.workplace && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Arbeitsplatz:</span>
                          <span className="font-medium">{extractionData.workplace}</span>
                        </div>
                      )}
                      {extractionData.startDate && (
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Möglicher Start:</span>
                          <span className="font-medium">{extractionData.startDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Created At */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Erstellt am</label>
            <p className="text-xs text-muted-foreground">
              {application.created_at ? format(new Date(application.created_at), 'dd.MM.yyyy HH:mm') : 'Unbekannt'}
            </p>
          </div>
        </div>
      </div>

      {/* Cover Letter Editor */}
      {application && (
        <CoverLetterEditor
          application={application}
          isOpen={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={handleSaveCoverLetter}
        />
      )}

      {/* Dialog for sent_at date */}
      <Dialog open={showSentAtDialog} onOpenChange={setShowSentAtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Versanddatum hinterlegen</DialogTitle>
            <DialogDescription>
              Bitte geben Sie das Datum an, an dem die Bewerbung versendet wurde.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-sent-at">Versendet am</Label>
              <Input
                id="dialog-sent-at"
                type="date"
                value={dialogSentAt}
                onChange={(e) => setDialogSentAt(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSentAtDialog(false)
                setDialogSentAt("")
              }}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveSentAtFromDialog}
              disabled={saving || !dialogSentAt}
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
