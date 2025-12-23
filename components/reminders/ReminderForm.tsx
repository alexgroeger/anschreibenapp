"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
      setDueDate(format(new Date(reminder.due_date), "yyyy-MM-dd'T'HH:mm"))
      setReminderType(reminder.reminder_type)
      setIsRecurring(reminder.is_recurring === 1)
      setRecurrencePattern((reminder.recurrence_pattern as any) || 'weekly')
      setRecurrenceInterval(reminder.recurrence_interval || 1)
      setRecurrenceEndDate(reminder.recurrence_end_date ? format(new Date(reminder.recurrence_end_date), "yyyy-MM-dd") : "")
    } else {
      // Reset form for new reminder
      setTitle("")
      setDescription("")
      const now = new Date()
      now.setHours(now.getHours() + 1) // Default to 1 hour from now
      setDueDate(format(now, "yyyy-MM-dd'T'HH:mm"))
      setReminderType('custom')
      setIsRecurring(false)
      setRecurrencePattern('weekly')
      setRecurrenceInterval(1)
      setRecurrenceEndDate("")
    }
  }, [reminder, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !dueDate) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }

    setSaving(true)
    try {
      const reminderData: Partial<Reminder> = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: new Date(dueDate).toISOString(),
        reminder_type: reminderType,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
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
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Bewerbungsfrist, Nachfassen, Interview vorbereiten"
              required
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderType">Typ</Label>
              <Select value={reminderType} onValueChange={(value: 'deadline' | 'custom') => setReminderType(value)}>
                <SelectTrigger id="reminderType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                  <SelectItem value="deadline">Bewerbungsfrist</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

