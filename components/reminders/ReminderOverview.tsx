"use client"

import { useState, useEffect } from "react"
import { ReminderCard, Reminder } from "./ReminderCard"
import { ReminderCalendar } from "./ReminderCalendar"
import { ReminderForm } from "./ReminderForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, isToday, startOfDay, differenceInDays } from "date-fns"
import { Calendar as CalendarIcon, AlertTriangle, Clock } from "lucide-react"

export function ReminderOverview() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)

  useEffect(() => {
    // First sync reminders, then load them
    const syncAndLoad = async () => {
      try {
        // Sync reminders for all applications with deadlines
        await fetch("/api/reminders/sync-all", { method: "POST" })
      } catch (error) {
        console.error("Error syncing reminders:", error)
      }
      // Then load reminders
      await loadReminders()
    }
    syncAndLoad()
  }, [])

  const loadReminders = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/reminders?upcoming=true&status=pending")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error("Failed to load reminders:", errorData)
        throw new Error(errorData.error || "Failed to load reminders")
      }
      const data = await response.json()
      setReminders(data.reminders || [])
    } catch (error) {
      console.error("Error loading reminders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group reminders by type and due date
  const groupReminders = (reminders: Reminder[]) => {
    const today = startOfDay(new Date())
    
    // Separate by type
    const deadlineReminders = reminders.filter(r => r.reminder_type === 'deadline')
    const customReminders = reminders.filter(r => r.reminder_type === 'custom')
    
    // Group each type by due date
    const groupByDate = (reminderList: Reminder[]) => {
      const groups = {
        overdue: [] as Reminder[],
        today: [] as Reminder[],
        thisWeek: [] as Reminder[],
        later: [] as Reminder[],
      }

      reminderList.forEach((reminder) => {
        const dueDate = startOfDay(new Date(reminder.due_date))
        const daysDiff = differenceInDays(dueDate, today)

        if (daysDiff < 0) {
          groups.overdue.push(reminder)
        } else if (isToday(dueDate)) {
          groups.today.push(reminder)
        } else if (daysDiff <= 7) {
          groups.thisWeek.push(reminder)
        } else {
          groups.later.push(reminder)
        }
      })

      // Sort reminders within each group by due date
      Object.keys(groups).forEach((key) => {
        groups[key as keyof typeof groups].sort((a, b) => {
          const dateA = new Date(a.due_date).getTime()
          const dateB = new Date(b.due_date).getTime()
          return dateA - dateB
        })
      })

      return groups
    }

    return {
      deadline: groupByDate(deadlineReminders),
      custom: groupByDate(customReminders),
      all: reminders
    }
  }

  const groupedReminders = groupReminders(reminders)
  const hasReminders = reminders.length > 0

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setFormOpen(true)
  }

  const handleSave = async (reminderData: Partial<Reminder>) => {
    try {
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to ${editingReminder ? 'update' : 'create'} reminder`
        throw new Error(errorMessage)
      }
      
      await loadReminders()
      setFormOpen(false)
      setEditingReminder(null)
    } catch (error) {
      console.error("Error saving reminder:", error)
      alert(`Fehler beim ${editingReminder ? 'Aktualisieren' : 'Erstellen'} der Erinnerung`)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Lade Erinnerungen...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Anstehende Erinnerungen
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {reminders.length} {reminders.length === 1 ? "Erinnerung" : "Erinnerungen"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasReminders ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Keine anstehenden Erinnerungen.
          </p>
        ) : (
          <>
            {/* Deadline Reminders (Bewerbungsfristen) */}
            {(groupedReminders.deadline.overdue.length > 0 || 
              groupedReminders.deadline.today.length > 0 || 
              groupedReminders.deadline.thisWeek.length > 0 || 
              groupedReminders.deadline.later.length > 0) && (
              <div>
                <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  Bewerbungsfristen
                </h3>
                
                <div className="space-y-1">
                  {groupedReminders.deadline.overdue.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-red-600 mb-0.5">
                        Überfällig ({groupedReminders.deadline.overdue.length})
                      </h4>
                      {groupedReminders.deadline.overdue.map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}

                  {groupedReminders.deadline.today.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-orange-600 mb-0.5 mt-1.5">
                        Heute ({groupedReminders.deadline.today.length})
                      </h4>
                      {groupedReminders.deadline.today.map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}

                  {groupedReminders.deadline.thisWeek.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-yellow-600 mb-0.5 mt-1.5">
                        Diese Woche ({groupedReminders.deadline.thisWeek.length})
                      </h4>
                      {groupedReminders.deadline.thisWeek.map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}

                  {groupedReminders.deadline.later.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 mt-1.5">
                        Später ({groupedReminders.deadline.later.length})
                      </h4>
                      {groupedReminders.deadline.later.slice(0, 2).map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Custom Reminders (Benutzerdefinierte Erinnerungen) */}
            {(groupedReminders.custom.overdue.length > 0 || 
              groupedReminders.custom.today.length > 0 || 
              groupedReminders.custom.thisWeek.length > 0 || 
              groupedReminders.custom.later.length > 0) && (
              <div className="pt-2 border-t">
                <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Benutzerdefinierte Erinnerungen
                </h3>
                
                <div className="space-y-1">
                  {groupedReminders.custom.overdue.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-red-600 mb-0.5">
                        Überfällig ({groupedReminders.custom.overdue.length})
                      </h4>
                      {groupedReminders.custom.overdue.slice(0, 3).map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}

                  {groupedReminders.custom.today.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-orange-600 mb-0.5 mt-1.5">
                        Heute ({groupedReminders.custom.today.length})
                      </h4>
                      {groupedReminders.custom.today.slice(0, 3).map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}

                  {groupedReminders.custom.thisWeek.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-yellow-600 mb-0.5 mt-1.5">
                        Diese Woche ({groupedReminders.custom.thisWeek.length})
                      </h4>
                      {groupedReminders.custom.thisWeek.slice(0, 3).map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}

                  {groupedReminders.custom.later.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 mt-1.5">
                        Später ({groupedReminders.custom.later.length})
                      </h4>
                      {groupedReminders.custom.later.slice(0, 2).map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onComplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "POST" })
                            loadReminders()
                          }}
                          onUncomplete={async () => {
                            await fetch(`/api/reminders/${reminder.id}/complete`, { method: "PATCH" })
                            loadReminders()
                          }}
                          onEdit={handleEdit}
                          onDelete={async () => {
                            await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                            loadReminders()
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
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
      applicationId={editingReminder?.application_id || null}
      onSave={handleSave}
    />
    </>
  )
}

