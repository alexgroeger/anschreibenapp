"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { Check, Edit, Trash2, Calendar, RotateCcw, Clock } from "lucide-react"

export interface Reminder {
  id: number
  application_id: number | null
  title: string
  description: string | null
  due_date: string
  reminder_type: 'deadline' | 'custom'
  status: 'pending' | 'completed' | 'cancelled'
  is_recurring: number
  recurrence_pattern: string | null
  recurrence_interval: number | null
  recurrence_end_date: string | null
  next_occurrence: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

interface ReminderCardProps {
  reminder: Reminder
  onComplete: (id: number) => void
  onUncomplete: (id: number) => void
  onEdit: (reminder: Reminder) => void
  onDelete: (id: number) => void
}

export function ReminderCard({
  reminder,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: ReminderCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const dueDate = new Date(reminder.due_date)
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && reminder.status === 'pending'
  const isDueToday = isToday(dueDate) && reminder.status === 'pending'
  const daysUntilDue = differenceInDays(dueDate, new Date())
  
  // Determine color based on status and due date
  const getStatusColor = () => {
    if (reminder.status === 'completed') {
      return 'bg-green-100 text-green-800 border-green-200'
    }
    if (reminder.status === 'cancelled') {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
    if (isOverdue) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    if (isDueToday) {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    }
    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  
  const getDueDateText = () => {
    if (reminder.status === 'completed') {
      return `Erledigt am ${format(new Date(reminder.completed_at!), 'dd.MM.yyyy')}`
    }
    if (isOverdue) {
      return `Überfällig seit ${Math.abs(daysUntilDue)} Tag${Math.abs(daysUntilDue) !== 1 ? 'en' : ''}`
    }
    if (isDueToday) {
      return 'Heute fällig'
    }
    if (daysUntilDue === 1) {
      return 'Morgen fällig'
    }
    if (daysUntilDue <= 7) {
      return `In ${daysUntilDue} Tagen fällig`
    }
    return format(dueDate, 'dd.MM.yyyy')
  }
  
  const handleDelete = async () => {
    if (!confirm('Möchten Sie diese Erinnerung wirklich löschen?')) {
      return
    }
    setIsDeleting(true)
    try {
      await onDelete(reminder.id)
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">{reminder.title}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor()}`}
                >
                  {reminder.status === 'completed' ? 'Erledigt' : 
                   reminder.status === 'cancelled' ? 'Abgebrochen' : 
                   isOverdue ? 'Überfällig' : 
                   isDueToday ? 'Heute' : 
                   'Offen'}
                </Badge>
                {reminder.reminder_type === 'deadline' && (
                  <Badge variant="outline" className="text-xs">
                    Frist
                  </Badge>
                )}
                {reminder.is_recurring === 1 && (
                  <Badge variant="outline" className="text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Wiederkehrend
                  </Badge>
                )}
              </div>
              {reminder.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {reminder.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Due Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{getDueDateText()}</span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {reminder.status === 'completed' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUncomplete(reminder.id)}
                className="h-7 text-xs flex-1"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Wiedereröffnen
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => onComplete(reminder.id)}
                className="h-7 text-xs flex-1"
              >
                <Check className="h-3 w-3 mr-1" />
                Erledigt
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(reminder)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-7 px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

