"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Mail, Phone, Briefcase, User, Plus, X, Calendar, ArrowLeft, Euro, FileText, MapPin, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Contact {
  name: string
  email?: string | null
  phone?: string | null
  position?: string | null
}

interface ExtractionData {
  keyRequirements?: string
  culture?: string
  skills?: string
  softSkills?: string
  contacts?: Contact[]
  company?: string
  position?: string
  deadline?: string | null
  salary?: string | null
  contractType?: string | null
  workplace?: string | null
  startDate?: string | null
}

interface ExtractionDisplayProps {
  extraction: ExtractionData
  onProceed: () => void
  onExtractionChange?: (extraction: ExtractionData) => void
  onBack?: () => void
  loading?: boolean
  canGoBack?: boolean
}

export function ExtractionDisplay({ extraction, onProceed, onExtractionChange, onBack, loading = false, canGoBack = false }: ExtractionDisplayProps) {
  const [editedExtraction, setEditedExtraction] = useState<ExtractionData>(extraction)
  const [newContact, setNewContact] = useState<Contact>({ name: "", email: "", phone: "", position: "" })
  const [showAddContact, setShowAddContact] = useState(false)

  const handleFieldChange = (field: keyof ExtractionData, value: any) => {
    const updated = { ...editedExtraction, [field]: value }
    setEditedExtraction(updated)
    if (onExtractionChange) {
      onExtractionChange(updated)
    }
  }

  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    const updatedContacts = [...(editedExtraction.contacts || [])]
    updatedContacts[index] = { ...updatedContacts[index], [field]: value }
    const updated = { ...editedExtraction, contacts: updatedContacts }
    setEditedExtraction(updated)
    if (onExtractionChange) {
      onExtractionChange(updated)
    }
  }

  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      alert('Bitte geben Sie mindestens einen Namen ein.')
      return
    }
    const updatedContacts = [...(editedExtraction.contacts || []), { ...newContact }]
    const updated = { ...editedExtraction, contacts: updatedContacts }
    setEditedExtraction(updated)
    setNewContact({ name: "", email: "", phone: "", position: "" })
    setShowAddContact(false)
    if (onExtractionChange) {
      onExtractionChange(updated)
    }
  }

  const handleRemoveContact = (index: number) => {
    const updatedContacts = [...(editedExtraction.contacts || [])]
    updatedContacts.splice(index, 1)
    const updated = { ...editedExtraction, contacts: updatedContacts }
    setEditedExtraction(updated)
    if (onExtractionChange) {
      onExtractionChange(updated)
    }
  }

  const hasContacts = editedExtraction.contacts && editedExtraction.contacts.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - Left Side (2 columns) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Key Requirements - First */}
        <Card>
          <CardHeader>
            <CardTitle>Key Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedExtraction.keyRequirements || ""}
              onChange={(e) => handleFieldChange('keyRequirements', e.target.value)}
              className="min-h-[120px] text-sm"
              placeholder="Key Requirements werden hier angezeigt..."
            />
          </CardContent>
        </Card>

        {/* Hard and Soft Skills - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hard Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Hard Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedExtraction.skills || ""}
                onChange={(e) => handleFieldChange('skills', e.target.value)}
                className="min-h-[150px] text-sm"
                placeholder="Hard Skills werden hier angezeigt..."
              />
            </CardContent>
          </Card>

          {/* Soft Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Soft Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedExtraction.softSkills || ""}
                onChange={(e) => handleFieldChange('softSkills', e.target.value)}
                className="min-h-[150px] text-sm"
                placeholder="Soft Skills werden hier angezeigt..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Culture */}
        <Card>
          <CardHeader>
            <CardTitle>Unternehmenskultur</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedExtraction.culture || ""}
              onChange={(e) => handleFieldChange('culture', e.target.value)}
              className="min-h-[120px] text-sm"
              placeholder="Unternehmenskultur wird hier angezeigt..."
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canGoBack && onBack && (
            <Button 
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          )}
          <Button 
            onClick={onProceed} 
            className={canGoBack ? "flex-1" : "w-full"}
            disabled={loading}
          >
            {loading ? 'Lädt...' : 'Matching durchführen'}
          </Button>
        </div>
      </div>

      {/* Sidebar - Right Side (1 column) */}
      <div className="space-y-4">
        {/* Stellenausschreibung Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stellenausschreibung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Unternehmen</Label>
              <Input
                value={editedExtraction.company || ""}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                placeholder="Unternehmen"
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Position</Label>
              <Input
                value={editedExtraction.position || ""}
                onChange={(e) => handleFieldChange('position', e.target.value)}
                placeholder="Position"
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Bewerbungsfrist
              </Label>
              <Input
                type="date"
                value={editedExtraction.deadline || ""}
                onChange={(e) => handleFieldChange('deadline', e.target.value || null)}
                placeholder="Bewerbungsfrist"
              />
            </div>
          </CardContent>
        </Card>

        {/* Metadaten Card */}
        <Card>
          <CardHeader>
            <CardTitle>Weitere Informationen</CardTitle>
            <CardDescription>
              Zusätzliche Details zur Stelle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Salary */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Vergütung
              </Label>
              <Input
                value={editedExtraction.salary || ""}
                onChange={(e) => handleFieldChange('salary', e.target.value || null)}
                placeholder="z.B. 50.000€ - 70.000€ oder nach Vereinbarung"
              />
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Befristung
              </Label>
              <Input
                value={editedExtraction.contractType || ""}
                onChange={(e) => handleFieldChange('contractType', e.target.value || null)}
                placeholder="z.B. unbefristet, befristet auf 2 Jahre"
              />
            </div>

            {/* Workplace */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Arbeitsplatz
              </Label>
              <Input
                value={editedExtraction.workplace || ""}
                onChange={(e) => handleFieldChange('workplace', e.target.value || null)}
                placeholder="z.B. Remote, Hybrid, Vor Ort Berlin"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Möglicher Start
              </Label>
              <Input
                value={editedExtraction.startDate || ""}
                onChange={(e) => handleFieldChange('startDate', e.target.value || null)}
                placeholder="z.B. ab sofort, 01.03.2025"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Persons Card */}
        <Card>
          <CardHeader>
            <CardTitle>Kontaktpersonen</CardTitle>
            <CardDescription>
              {hasContacts 
                ? `${editedExtraction.contacts?.length} ${editedExtraction.contacts?.length === 1 ? 'Kontaktperson' : 'Kontaktpersonen'}`
                : 'Keine Kontaktpersonen gefunden'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Show message if no contacts */}
            {!hasContacts && (
              <Alert>
                <AlertDescription>
                  Es wurde keine Kontaktperson gefunden. Sie können unten eine hinzufügen.
                </AlertDescription>
              </Alert>
            )}

            {/* Existing Contacts */}
            {hasContacts && (
              <div className="space-y-3">
                {editedExtraction.contacts!.map((contact, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => handleRemoveContact(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input
                          value={contact.name || ""}
                          onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      
                      {contact.position !== undefined && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            Position
                          </Label>
                          <Input
                            value={contact.position || ""}
                            onChange={(e) => handleContactChange(idx, 'position', e.target.value)}
                            className="text-sm"
                            placeholder="Position"
                          />
                        </div>
                      )}
                      
                      {contact.email !== undefined && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            E-Mail
                          </Label>
                          <Input
                            type="email"
                            value={contact.email || ""}
                            onChange={(e) => handleContactChange(idx, 'email', e.target.value)}
                            className="text-sm"
                            placeholder="E-Mail"
                          />
                        </div>
                      )}
                      
                      {contact.phone !== undefined && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Telefon
                          </Label>
                          <Input
                            type="tel"
                            value={contact.phone || ""}
                            onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                            className="text-sm"
                            placeholder="Telefon"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Contact Button / Form */}
            {!showAddContact ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddContact(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Kontaktperson hinzufügen
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Neue Kontaktperson</Label>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Name *</Label>
                      <Input
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        className="text-sm"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        Position
                      </Label>
                      <Input
                        value={newContact.position || ""}
                        onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                        className="text-sm"
                        placeholder="Position"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        E-Mail
                      </Label>
                      <Input
                        type="email"
                        value={newContact.email || ""}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        className="text-sm"
                        placeholder="E-Mail"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefon
                      </Label>
                      <Input
                        type="tel"
                        value={newContact.phone || ""}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        className="text-sm"
                        placeholder="Telefon"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowAddContact(false)
                        setNewContact({ name: "", email: "", phone: "", position: "" })
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleAddContact}
                    >
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
