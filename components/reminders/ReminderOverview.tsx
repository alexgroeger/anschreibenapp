"use client"

import { useState, useEffect } from "react"
import { ReminderCard, Reminder } from "./ReminderCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, isToday, isThisWeek, startOfDay, differenceInDays } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

export function ReminderOverview() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      const response = await fetch("/api/reminders?upcoming=true&status=pending")
      if (!response.ok) throw new Error("Failed to load reminders")
      const data = await response.json()
      setReminders(data.reminders || [])
    } catch (error) {
      console.error("Error loading reminders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group reminders by due date
  const groupReminders = (reminders: Reminder[]) => {
    const today = startOfDay(new Date())
    const groups = {
      overdue: [] as Reminder[],
      today: [] as Reminder[],
      thisWeek: [] as Reminder[],
      later: [] as Reminder[],
    }

    reminders.forEach((reminder) => {
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

    return groups
  }

  const groups = groupReminders(reminders)
  const hasReminders = reminders.length > 0

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Lade Erinnerungen...</p>
        </CardContent>
      </Card>
    )
  }

  if (!hasReminders) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Anstehende Erinnerungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Keine anstehenden Erinnerungen.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Anstehende Erinnerungen
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {reminders.length} {reminders.length === 1 ? "Erinnerung" : "Erinnerungen"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.overdue.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-600 mb-2">
              Überfällig ({groups.overdue.length})
            </h4>
            <div className="space-y-2">
              {groups.overdue.slice(0, 5).map((reminder) => (
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
                  onEdit={() => {}}
                  onDelete={async () => {
                    await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                    loadReminders()
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {groups.today.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-600 mb-2">
              Heute ({groups.today.length})
            </h4>
            <div className="space-y-2">
              {groups.today.slice(0, 5).map((reminder) => (
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
                  onEdit={() => {}}
                  onDelete={async () => {
                    await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                    loadReminders()
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {groups.thisWeek.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-600 mb-2">
              Diese Woche ({groups.thisWeek.length})
            </h4>
            <div className="space-y-2">
              {groups.thisWeek.slice(0, 5).map((reminder) => (
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
                  onEdit={() => {}}
                  onDelete={async () => {
                    await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                    loadReminders()
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {groups.later.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Später ({groups.later.length})
            </h4>
            <div className="space-y-2">
              {groups.later.slice(0, 3).map((reminder) => (
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
                  onEdit={() => {}}
                  onDelete={async () => {
                    await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" })
                    loadReminders()
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {reminders.length > 10 && (
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Zeige die nächsten 10 von {reminders.length} Erinnerungen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

