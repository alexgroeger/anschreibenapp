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
  AlertTriangle
} from "lucide-react"

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
    gesendet: number
    in_bearbeitung: number
    abgelehnt: number
    angenommen: number
    rueckmeldung_ausstehend: number
  }
}

const statusLabels: Record<string, string> = {
  'gesendet': 'Gesendet',
  'in_bearbeitung': 'In Bearbeitung',
  'abgelehnt': 'Abgelehnt',
  'angenommen': 'Angenommen',
  'rueckmeldung_ausstehend': 'Rückmeldung ausstehend',
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
  const [stats, setStats] = useState<Stats | null>(null)
  const [inProgress, setInProgress] = useState<Application[]>([])
  const [sent7Days, setSent7Days] = useState<Application[]>([])
  const [sent14Days, setSent14Days] = useState<Application[]>([])
  const [openTasks, setOpenTasks] = useState<Application[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Application[]>([])
  const [urgentDeadlines, setUrgentDeadlines] = useState<Application[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load all data in parallel
      const [statsRes, inProgressRes, sent7Res, sent14Res, openTasksRes, deadlinesRes] = await Promise.all([
        fetch('/api/applications/stats'),
        fetch('/api/applications/in-progress'),
        fetch('/api/applications/sent-recently?days=7'),
        fetch('/api/applications/sent-recently?days=14'),
        fetch('/api/applications/open-tasks'),
        fetch('/api/applications/upcoming-deadlines'),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (inProgressRes.ok) {
        const inProgressData = await inProgressRes.json()
        setInProgress(inProgressData.applications || [])
      }

      if (sent7Res.ok) {
        const sent7Data = await sent7Res.json()
        setSent7Days(sent7Data.applications || [])
      }

      if (sent14Res.ok) {
        const sent14Data = await sent14Res.json()
        setSent14Days(sent14Data.applications || [])
      }

      if (openTasksRes.ok) {
        const openTasksData = await openTasksRes.json()
        setOpenTasks(openTasksData.applications || [])
      }

      if (deadlinesRes.ok) {
        const deadlinesData = await deadlinesRes.json()
        setUpcomingDeadlines(deadlinesData.applications || [])
        setUrgentDeadlines(deadlinesData.urgent || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
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
        onClick={() => handleApplicationClick(application.id)}
        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{application.company}</h4>
              <Badge className={statusColors[application.status] || statusColors['rueckmeldung_ausstehend']}>
                {statusLabels[application.status] || application.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{application.position}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {application.sent_at && (
                <span>Gesendet: {format(new Date(application.sent_at), 'dd.MM.yyyy')}</span>
              )}
              {!application.sent_at && (
                <span>Erstellt: {format(new Date(application.created_at), 'dd.MM.yyyy')}</span>
              )}
              {showDeadline && application.deadline && (
                <span className={isUrgent ? "text-red-600 font-semibold" : ""}>
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Frist: {format(new Date(application.deadline), 'dd.MM.yyyy')}
                  {daysUntilDeadline !== null && (
                    <span className="ml-1">
                      ({daysUntilDeadline === 0 ? 'Heute' : daysUntilDeadline === 1 ? 'Morgen' : `in ${daysUntilDeadline} Tagen`})
                    </span>
                  )}
                </span>
              )}
            </div>
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
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Link href="/bewerbung-hinzufuegen">
            <Button size="sm">Neue Bewerbung</Button>
          </Link>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

      {/* Aktuell in Arbeit und Anstehende Fristen - nebeneinander */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aktuell in Arbeit */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <CardTitle>Aktuell in Arbeit</CardTitle>
              </div>
              <Badge variant="outline">{inProgress.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {inProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Bewerbungen in Arbeit
              </p>
            ) : (
              <div className="space-y-2">
                {inProgress.slice(0, 10).map((app) => renderApplicationRow(app))}
                {inProgress.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ... und {inProgress.length - 10} weitere
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anstehende Fristen */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Anstehende Fristen</CardTitle>
              </div>
              <Badge variant="outline" className={urgentDeadlines.length > 0 ? "border-red-500 text-red-600" : ""}>
                {upcomingDeadlines.length} {urgentDeadlines.length > 0 && `(${urgentDeadlines.length} dringend)`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine anstehenden Fristen
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((app) => renderApplicationRow(app, true))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vor 7 und 14 Tagen versendet - Grafik */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Versendete Bewerbungen</CardTitle>
            </div>
            <Badge variant="outline">{sent7Days.length + sent14Days.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Grafik */}
            <div className="flex items-end justify-center gap-8 h-48 py-4">
              {/* Vor 7 Tagen */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="relative w-full flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                    style={{ 
                      height: `${sent7Days.length > 0 ? Math.max((sent7Days.length / Math.max(sent7Days.length, sent14Days.length, 1)) * 150, 30) : 0}px`,
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
                      height: `${sent14Days.length > 0 ? Math.max((sent14Days.length / Math.max(sent7Days.length, sent14Days.length, 1)) * 150, 30) : 0}px`,
                      minHeight: sent14Days.length > 0 ? '30px' : '0px'
                    }}
                    title={`${sent14Days.length} Bewerbungen vor 14 Tagen versendet`}
                  />
                  <span className="text-2xl font-bold mt-2">{sent14Days.length}</span>
                </div>
                <span className="text-sm text-muted-foreground">Vor 14 Tagen</span>
              </div>
            </div>

            {/* Legende */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Vor 7 Tagen ({sent7Days.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Vor 14 Tagen ({sent14Days.length})</span>
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

