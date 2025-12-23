"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, endOfWeek } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { Reminder } from "./ReminderCard"

interface ReminderCalendarProps {
  reminders: Reminder[]
}

export function ReminderCalendar({ reminders }: ReminderCalendarProps) {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Montag
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  
  // Erstelle eine Map von Datum zu Anzahl der Erinnerungen
  const remindersByDate = new Map<string, number>()
  reminders.forEach((reminder) => {
    if (reminder.status === 'pending') {
      const dateKey = format(new Date(reminder.due_date), 'yyyy-MM-dd')
      remindersByDate.set(dateKey, (remindersByDate.get(dateKey) || 0) + 1)
    }
  })
  
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {format(today, 'MMMM yyyy', { locale: de })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Wochentage Header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Kalender Tage */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const reminderCount = remindersByDate.get(dateKey) || 0
              const isCurrentMonth = day >= monthStart && day <= monthEnd
              const isCurrentDay = isToday(day)
              
              return (
                <div
                  key={dateKey}
                  className={`
                    aspect-square flex flex-col items-center justify-center text-[10px] rounded
                    ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                    ${isCurrentDay ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'}
                    relative
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {reminderCount > 0 && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex items-center gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      {reminderCount > 1 && (
                        <span className="text-[8px] text-primary font-semibold">{reminderCount}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

