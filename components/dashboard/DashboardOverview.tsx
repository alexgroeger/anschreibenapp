"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, differenceInDays } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  TrendingUp,
  FileText,
  AlertTriangle,
  ExternalLink
} from "lucide-react"
import { ReminderOverview } from "@/components/reminders/ReminderOverview"

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
  status: string
  sent_at: string | null
  created_at: string
  deadline: string | null
  contacts?: Contact[]
}

interface Stats {
  total: number
  byStatus: {
    in_bearbeitung: number
    rueckmeldung_ausstehend: number
    abgelehnt: number
    angenommen: number
  }
}

const statusLabels: Record<string, string> = {
  'gesendet': 'Gesendet',
  'in_bearbeitung': 'In Bearbeitung',
  'abgelehnt': 'Abgelehnt',
  'angenommen': 'Angenommen',
  'rueckmeldung_ausstehend': 'Versandt/Rückmeldung ausstehend',
}

const statusColors: Record<string, string> = {
  'gesendet': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'in_bearbeitung': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'abgelehnt': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'angenommen': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'rueckmeldung_ausstehend': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

const statusIcons: Record<string, any> = {
  'gesendet': CheckCircle2,
  'in_bearbeitung': Clock,
  'abgelehnt': XCircle,
  'angenommen': TrendingUp,
  'rueckmeldung_ausstehend': AlertCircle,
}

export function DashboardOverview() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [inProgress, setInProgress] = useState<Application[]>([])
  const [sent7Days, setSent7Days] = useState<Application[]>([])
  const [sent14Days, setSent14Days] = useState<Application[]>([])
  const [sentThisMonth, setSentThisMonth] = useState<Application[]>([])
  const [openTasks, setOpenTasks] = useState<Application[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load all data in parallel
      const [statsRes, inProgressRes, sent7Res, sent14Res, sentMonthRes, openTasksRes] = await Promise.all([
        fetch('/api/applications/stats'),
        fetch('/api/applications/in-progress'),
        fetch('/api/applications/sent-recently?days=7'),
        fetch('/api/applications/sent-recently?days=14'),
        fetch('/api/applications/sent-recently?period=month'),
        fetch('/api/applications/open-tasks'),
      ])

      // Check for errors and log them
      const errors: string[] = []

      // Stats
      if (!statsRes.ok) {
        const errorData = await statsRes.json().catch(() => ({ error: 'Unknown error' }))
        errors.push(`Stats: ${errorData.error || statsRes.statusText}`)
        console.error('Error fetching stats:', errorData)
      } else {
        try {
          const statsData = await statsRes.json()
          setStats(statsData)
        } catch (e) {
          errors.push('Stats: Invalid JSON response')
          console.error('Error parsing stats JSON:', e)
        }
      }

      // In Progress
      if (!inProgressRes.ok) {
        const errorData = await inProgressRes.json().catch(() => ({ error: 'Unknown error' }))
        errors.push(`In Progress: ${errorData.error || inProgressRes.statusText}`)
        console.error('Error fetching in-progress:', errorData)
      } else {
        try {
          const inProgressData = await inProgressRes.json()
          setInProgress(inProgressData.applications || [])
        } catch (e) {
          errors.push('In Progress: Invalid JSON response')
          console.error('Error parsing in-progress JSON:', e)
        }
      }

      // Sent 7 Days
      if (!sent7Res.ok) {
        const errorData = await sent7Res.json().catch(() => ({ error: 'Unknown error' }))
        errors.push(`Sent 7 days: ${errorData.error || sent7Res.statusText}`)
        console.error('Error fetching sent 7 days:', errorData)
      } else {
        try {
          const sent7Data = await sent7Res.json()
          setSent7Days(sent7Data.applications || [])
        } catch (e) {
          errors.push('Sent 7 days: Invalid JSON response')
          console.error('Error parsing sent 7 days JSON:', e)
        }
      }

      // Sent 14 Days
      if (!sent14Res.ok) {
        const errorData = await sent14Res.json().catch(() => ({ error: 'Unknown error' }))
        errors.push(`Sent 14 days: ${errorData.error || sent14Res.statusText}`)
        console.error('Error fetching sent 14 days:', errorData)
      } else {
        try {
          const sent14Data = await sent14Res.json()
          setSent14Days(sent14Data.applications || [])
        } catch (e) {
          errors.push('Sent 14 days: Invalid JSON response')
          console.error('Error parsing sent 14 days JSON:', e)
        }
      }

      // Sent This Month
      if (!sentMonthRes.ok) {
        const errorData = await sentMonthRes.json().catch(() => ({ error: 'Unknown error' }))
        errors.push(`Sent this month: ${errorData.error || sentMonthRes.statusText}`)
        console.error('Error fetching sent this month:', errorData)
      } else {
        try {
          const sentMonthData = await sentMonthRes.json()
          setSentThisMonth(sentMonthData.applications || [])
        } catch (e) {
          errors.push('Sent this month: Invalid JSON response')
          console.error('Error parsing sent this month JSON:', e)
        }
      }

      // Open Tasks
      if (!openTasksRes.ok) {
        const errorData = await openTasksRes.json().catch(() => ({ error: 'Unknown error' }))
        errors.push(`Open Tasks: ${errorData.error || openTasksRes.statusText}`)
        console.error('Error fetching open tasks:', errorData)
      } else {
        try {
          const openTasksData = await openTasksRes.json()
          setOpenTasks(openTasksData.applications || [])
        } catch (e) {
          errors.push('Open Tasks: Invalid JSON response')
          console.error('Error parsing open tasks JSON:', e)
        }
      }

      if (errors.length > 0) {
        setError(`Fehler beim Laden einiger Daten: ${errors.join(', ')}`)
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error)
      setError(`Fehler beim Laden der Dashboard-Daten: ${error.message || 'Unbekannter Fehler'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Sync reminders first, then load data
    const syncAndLoad = async () => {
      try {
        // Sync reminders for all applications with deadlines
        const syncRes = await fetch('/api/reminders/sync-all', { method: 'POST' })
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          console.log('Reminders synced:', syncData)
        }
      } catch (error) {
        console.error('Error syncing reminders:', error)
      }
      // Then load dashboard data
      await loadData()
    }
    syncAndLoad()
  }, [loadData])

  const handleApplicationClick = (id: number) => {
    router.push(`/dashboard/${id}`)
  }

  const getDaysUntilDeadline = (deadline: string | null): number | null => {
    if (!deadline) return null
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)
    return differenceInDays(deadlineDate, today)
  }

  const renderApplicationRow = (application: Application, showDeadline = false) => {
    const daysUntilDeadline = showDeadline ? getDaysUntilDeadline(application.deadline) : null
    const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 3

    return (
      <div
        key={application.id}
        className={`p-2 border rounded-md hover:bg-muted/50 transition-colors ${isUrgent ? 'border-red-300 bg-red-50/30' : ''}`}
      >
        <div className="flex items-center gap-2">
          {/* Company/Title */}
          <Link 
            href={`/dashboard/${application.id}`} 
            className="flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              handleApplicationClick(application.id)
            }}
          >
            <span className={`text-sm font-medium hover:underline ${isUrgent ? 'text-red-600' : ''}`}>
              {application.company}
            </span>
          </Link>
          
          {/* Info badges and date - direkt neben dem Titel */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Position */}
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {application.position}
            </span>
            
            {/* Status-Badge */}
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${statusColors[application.status] || statusColors['rueckmeldung_ausstehend']}`}
            >
              {statusLabels[application.status] || application.status}
            </Badge>
            
            {/* Date Info */}
            {application.sent_at ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Calendar className="h-3 w-3" />
                <span className="whitespace-nowrap">Gesendet: {format(new Date(application.sent_at), 'dd.MM.yyyy')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Calendar className="h-3 w-3" />
                <span className="whitespace-nowrap">Erstellt: {format(new Date(application.created_at), 'dd.MM.yyyy')}</span>
              </div>
            )}
            
            {/* Deadline - nur wenn showDeadline true */}
            {showDeadline && application.deadline && (
              <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${isUrgent ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                <AlertTriangle className="h-3 w-3" />
                <span className="whitespace-nowrap">
                  Frist: {format(new Date(application.deadline), 'dd.MM.yyyy')}
                  {daysUntilDeadline !== null && (
                    <span className="ml-1">
                      ({daysUntilDeadline === 0 ? 'Heute' : daysUntilDeadline === 1 ? 'Morgen' : `in ${daysUntilDeadline} Tagen`})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          
          {/* Action - rechts */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link href={`/dashboard/${application.id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Zur Bewerbung"
                onClick={(e) => {
                  e.stopPropagation()
                  handleApplicationClick(application.id)
                }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Lade Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Übersicht</h1>
          <p className="text-muted-foreground mt-1">
            Gesamt: {stats?.total || 0} Bewerbungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Link href="/bewerbung-hinzufuegen">
            <Button size="sm">Neue Bewerbung</Button>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Aktuell in Arbeit */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Aktuell in Arbeit
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {inProgress.length} {inProgress.length === 1 ? "Bewerbung" : "Bewerbungen"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {inProgress.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Keine Bewerbungen in Arbeit
            </p>
          ) : (
            <>
              {inProgress.slice(0, 10).map((app) => renderApplicationRow(app))}
              {inProgress.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  ... und {inProgress.length - 10} weitere
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Anstehende Erinnerungen */}
      <ReminderOverview />

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats && Object.entries(stats.byStatus).map(([status, count]) => {
          const Icon = statusIcons[status] || FileText
          return (
            <Card key={status} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <Badge className={statusColors[status]}>
                    {count}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-medium mt-2">
                  {statusLabels[status]}
                </CardTitle>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Vor 7 und 14 Tagen versendet + Aktueller Monat - Grafik */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Versendete Bewerbungen</CardTitle>
            </div>
            <Badge variant="outline">{sent7Days.length + sent14Days.length + sentThisMonth.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Grafik */}
            <div className="flex items-end justify-center gap-6 h-48 py-4">
              {/* Vor 7 Tagen */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="relative w-full flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                    style={{ 
                      height: `${(() => {
                        const max = Math.max(sent7Days.length, sent14Days.length, sentThisMonth.length, 1);
                        return sent7Days.length > 0 ? Math.max((sent7Days.length / max) * 150, 30) : 0;
                      })()}px`,
                      minHeight: sent7Days.length > 0 ? '30px' : '0px'
                    }}
                    title={`${sent7Days.length} Bewerbungen vor 7 Tagen versendet`}
                  />
                  <span className="text-2xl font-bold mt-2">{sent7Days.length}</span>
                </div>
                <span className="text-sm text-muted-foreground">Vor 7 Tagen</span>
              </div>
              
              {/* Vor 14 Tagen */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="relative w-full flex flex-col items-center">
                  <div 
                    className="w-full bg-orange-500 rounded-t transition-all hover:bg-orange-600 cursor-pointer"
                    style={{ 
                      height: `${(() => {
                        const max = Math.max(sent7Days.length, sent14Days.length, sentThisMonth.length, 1);
                        return sent14Days.length > 0 ? Math.max((sent14Days.length / max) * 150, 30) : 0;
                      })()}px`,
                      minHeight: sent14Days.length > 0 ? '30px' : '0px'
                    }}
                    title={`${sent14Days.length} Bewerbungen vor 14 Tagen versendet`}
                  />
                  <span className="text-2xl font-bold mt-2">{sent14Days.length}</span>
                </div>
                <span className="text-sm text-muted-foreground">Vor 14 Tagen</span>
              </div>

              {/* Aktueller Monat */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="relative w-full flex flex-col items-center">
                  <div 
                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600 cursor-pointer"
                    style={{ 
                      height: `${(() => {
                        const max = Math.max(sent7Days.length, sent14Days.length, sentThisMonth.length, 1);
                        return sentThisMonth.length > 0 ? Math.max((sentThisMonth.length / max) * 150, 30) : 0;
                      })()}px`,
                      minHeight: sentThisMonth.length > 0 ? '30px' : '0px'
                    }}
                    title={`${sentThisMonth.length} Bewerbungen im aktuellen Monat versendet`}
                  />
                  <span className="text-2xl font-bold mt-2">{sentThisMonth.length}</span>
                </div>
                <span className="text-sm text-muted-foreground">Aktueller Monat</span>
              </div>
            </div>

            {/* Legende */}
            <div className="flex justify-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Vor 7 Tagen ({sent7Days.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Vor 14 Tagen ({sent14Days.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Aktueller Monat ({sentThisMonth.length})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offene Aufgaben */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Offene Aufgaben</CardTitle>
            </div>
            <Badge variant="outline">{openTasks.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine offenen Aufgaben
            </p>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 10).map((app) => renderApplicationRow(app, true))}
              {openTasks.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  ... und {openTasks.length - 10} weitere
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

