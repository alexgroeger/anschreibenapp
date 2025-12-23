"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Reminder } from "./ReminderCard"
import { format } from "date-fns"

interface ReminderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reminder?: Reminder | null
  applicationId?: number | null
  onSave: (reminder: Partial<Reminder>) => Promise<void>
}

export function ReminderForm({
  open,
  onOpenChange,
  reminder,
  applicationId,
  onSave,
}: ReminderFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [reminderType, setReminderType] = useState<'deadline' | 'custom'>('custom')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title)
      setDescription(reminder.description || "")
      setDueDate(format(new Date(reminder.due_date), "yyyy-MM-dd"))
      setReminderType(reminder.reminder_type)
      setIsRecurring(reminder.is_recurring === 1)
      setRecurrencePattern((reminder.recurrence_pattern as any) || 'weekly')
      setRecurrenceInterval(reminder.recurrence_interval || 1)
      setRecurrenceEndDate(reminder.recurrence_end_date ? format(new Date(reminder.recurrence_end_date), "yyyy-MM-dd") : "")
    } else {
      // Reset form for new reminder
      setTitle("")
      setDescription("")
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1) // Default to tomorrow
      setDueDate(format(tomorrow, "yyyy-MM-dd"))
      setReminderType('custom')
      setIsRecurring(false)
      setRecurrencePattern('weekly')
      setRecurrenceInterval(1)
      setRecurrenceEndDate("")
    }
  }, [reminder, open])
  
  // Update title when reminder type changes to deadline
  useEffect(() => {
    if (reminderType === 'deadline' && !reminder) {
      setTitle('Bewerbungsfrist')
    }
  }, [reminderType, reminder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Für deadline-Typ immer "Bewerbungsfrist" als Titel verwenden
    const finalTitle = reminderType === 'deadline' ? 'Bewerbungsfrist' : title.trim()
    
    if (!finalTitle || !dueDate) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }

    setSaving(true)
    try {
      // Set time to end of day (23:59:59) for date-only picker
      const dueDateObj = new Date(dueDate)
      dueDateObj.setHours(23, 59, 59, 999)
      
      const reminderData: Partial<Reminder> = {
        title: finalTitle,
        description: description.trim() || null,
        due_date: dueDateObj.toISOString(),
        reminder_type: reminderType,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate + 'T23:59:59').toISOString() : null,
      }

      if (applicationId) {
        reminderData.application_id = applicationId
      }

      await onSave(reminderData)
      // Don't close here - let onSave handle it
    } catch (error) {
      console.error("Error saving reminder:", error)
      const errorMessage = error instanceof Error ? error.message : "Fehler beim Speichern der Erinnerung"
      alert(errorMessage)
      // Don't close dialog on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reminder ? "Erinnerung bearbeiten" : "Neue Erinnerung erstellen"}
          </DialogTitle>
          <DialogDescription>
            {reminder ? "Bearbeiten Sie die Details der Erinnerung." : "Erstellen Sie eine neue Erinnerung für diese Bewerbung."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Typ der Erinnerung</Label>
            <Tabs value={reminderType} onValueChange={(value: string) => {
              if (value === 'deadline' || value === 'custom') {
                setReminderType(value)
                // Automatisch "Bewerbungsfrist" als Titel setzen wenn Typ deadline ist
                if (value === 'deadline') {
                  setTitle('Bewerbungsfrist')
                }
              }
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deadline">Bewerbungsfrist</TabsTrigger>
                <TabsTrigger value="custom">Persönlich</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {reminderType === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Nachfassen, Interview vorbereiten"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Notizen zur Erinnerung"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isRecurring" className="font-normal cursor-pointer">
                Wiederkehrende Erinnerung
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrencePattern">Wiederholung</Label>
                    <Select 
                      value={recurrencePattern} 
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') => setRecurrencePattern(value)}
                    >
                      <SelectTrigger id="recurrencePattern">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Täglich</SelectItem>
                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                        <SelectItem value="yearly">Jährlich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrenceInterval">Intervall</Label>
                    <Input
                      id="recurrenceInterval"
                      type="number"
                      min="1"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      z.B. 2 = alle 2 {recurrencePattern === 'daily' ? 'Tage' : 
                                      recurrencePattern === 'weekly' ? 'Wochen' : 
                                      recurrencePattern === 'monthly' ? 'Monate' : 'Jahre'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrenceEndDate">Enddatum (optional)</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leer lassen für unbegrenzte Wiederholung
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Speichern..." : reminder ? "Aktualisieren" : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

