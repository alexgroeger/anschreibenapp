"use client"

import { useState, useEffect } from "react"
import { ReminderCard, Reminder } from "./ReminderCard"
import { ReminderForm } from "./ReminderForm"
import { Button } from "@/components/ui/button"
import { Plus, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ReminderListProps {
  applicationId: number
}

export function ReminderList({ applicationId }: ReminderListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const loadReminders = async () => {
    try {
      const response = await fetch(`/api/reminders?application_id=${applicationId}`)
      if (!response.ok) throw new Error("Failed to load reminders")
      const data = await response.json()
      setReminders(data.reminders || [])
    } catch (error) {
      console.error("Error loading reminders:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [applicationId])

  const handleComplete = async (id: number) => {
    try {
      const response = await fetch(`/api/reminders/${id}/complete`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to complete reminder")
      await loadReminders()
    } catch (error) {
      console.error("Error completing reminder:", error)
      alert("Fehler beim Markieren der Erinnerung als erledigt")
    }
  }

  const handleUncomplete = async (id: number) => {
    try {
      const response = await fetch(`/api/reminders/${id}/complete`, {
        method: "PATCH",
      })
      if (!response.ok) throw new Error("Failed to uncomplete reminder")
      await loadReminders()
    } catch (error) {
      console.error("Error uncompleting reminder:", error)
      alert("Fehler beim Wiedereröffnen der Erinnerung")
    }
  }

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete reminder")
      await loadReminders()
    } catch (error) {
      console.error("Error deleting reminder:", error)
      alert("Fehler beim Löschen der Erinnerung")
    }
  }

  const handleSave = async (reminderData: Partial<Reminder>) => {
    try {
      console.log('Saving reminder:', reminderData);
      let response: Response
      if (editingReminder) {
        // Update existing reminder
        response = await fetch(`/api/reminders/${editingReminder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reminderData),
        })
      } else {
        // Create new reminder
        response = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reminderData),
        })
      }
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData);
        const errorMessage = errorData.error || `Failed to ${editingReminder ? 'update' : 'create'} reminder`
        throw new Error(errorMessage)
      }
      
      const result = await response.json();
      console.log('Reminder saved successfully:', result);
      
      await loadReminders()
      setFormOpen(false)
      setEditingReminder(null)
    } catch (error) {
      console.error("Error saving reminder:", error)
      throw error
    }
  }

  const handleNewReminder = () => {
    setEditingReminder(null)
    setFormOpen(true)
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground">Lade Erinnerungen...</div>
  }

  // Separate pending and completed reminders
  const pendingReminders = reminders.filter(r => r.status !== 'completed')
  const completedReminders = reminders.filter(r => r.status === 'completed')

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Erinnerungen</CardTitle>
            <div className="flex items-center gap-2">
              {completedReminders.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="h-7 text-xs relative"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Erledigt
                  <Badge 
                    variant="secondary" 
                    className="ml-1 h-4 min-w-[16px] px-1 text-[10px]"
                  >
                    {completedReminders.length}
                  </Badge>
                </Button>
              )}
              <Button
                size="sm"
                variant="default"
                onClick={handleNewReminder}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Hinzufügen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Noch keine Erinnerungen vorhanden.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pending reminders - always shown */}
              {pendingReminders.length > 0 && (
                <>
                  {pendingReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onComplete={handleComplete}
                      onUncomplete={handleUncomplete}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </>
              )}

              {/* Completed reminders - shown only when toggle is active */}
              {showCompleted && completedReminders.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  {completedReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onComplete={handleComplete}
                      onUncomplete={handleUncomplete}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ReminderForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingReminder(null)
          }
        }}
        reminder={editingReminder}
        applicationId={applicationId}
        onSave={handleSave}
      />
    </>
  )
}

