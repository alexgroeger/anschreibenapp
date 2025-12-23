"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { Check, Trash2, Calendar, RotateCcw, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"

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
    <div 
      className={`p-2 border rounded-md hover:bg-muted/50 transition-colors ${isOverdue ? 'border-red-300 bg-red-50/30' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Title */}
        {reminder.application_id ? (
          <Link href={`/dashboard/${reminder.application_id}`} className="flex-shrink-0">
            <span className={`text-sm font-medium hover:underline ${isOverdue ? 'text-red-600' : ''}`}>
              {reminder.title}
            </span>
          </Link>
        ) : (
          <span className={`text-sm font-medium flex-shrink-0 ${isOverdue ? 'text-red-600' : ''}`}>
            {reminder.title}
          </span>
        )}
        
        {/* Info badges and date - direkt neben dem Titel */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Typ-Badge */}
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${reminder.reminder_type === 'deadline' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}
          >
            {reminder.reminder_type === 'deadline' ? 'Frist' : 'Persönlich'}
          </Badge>
          
          {/* Wiederkehrend Icon */}
          {reminder.is_recurring === 1 && (
            <div title="Wiederkehrend" className="flex-shrink-0">
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          
          {/* Fälligkeitsdatum */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Calendar className="h-3 w-3" />
            <span className="whitespace-nowrap">{getDueDateText()}</span>
          </div>
          
          {/* Status-Badge */}
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${getStatusColor()}`}
          >
            {reminder.status === 'completed' ? '✓ Erledigt' : 
             reminder.status === 'cancelled' ? '✗ Abgebrochen' : 
             isOverdue ? '! Überfällig' : 
             isDueToday ? 'Heute' : 
             'Offen'}
          </Badge>
        </div>
        
        {/* Actions - rechts */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {reminder.status === 'completed' ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUncomplete(reminder.id)}
              className="h-6 w-6 p-0"
              title="Wiedereröffnen"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onComplete(reminder.id)}
              className="h-6 w-6 p-0"
              title="Erledigt"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          {reminder.application_id && (
            <Link href={`/dashboard/${reminder.application_id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Zur Bewerbung"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            title="Löschen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Description - nur wenn vorhanden, unter der Hauptzeile */}
      {reminder.description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
          {reminder.description}
        </p>
      )}
    </div>
  )
}

