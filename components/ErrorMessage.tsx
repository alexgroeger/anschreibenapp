"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink, RefreshCw, Settings } from "lucide-react"
import Link from "next/link"

interface ErrorMessageProps {
  error: {
    error?: string
    type?: string
    message?: string
    model?: string
    helpUrl?: string
    testedModels?: string[]
  }
  onRetry?: () => void
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  const errorType = error.type || 'UNKNOWN_ERROR'
  const errorText = error.error || error.message || 'Ein unbekannter Fehler ist aufgetreten'

  const getErrorConfig = () => {
    switch (errorType) {
      case 'QUOTA_ERROR':
        return {
          title: 'API-Quota überschritten',
          description: 'Die kostenlose Quota für die Google Gemini API ist aufgebraucht.',
          icon: AlertCircle,
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          actions: [
            {
              label: 'Quota prüfen',
              href: error.helpUrl || 'https://ai.dev/usage?tab=rate-limit',
              external: true,
            },
            {
              label: 'Einstellungen',
              href: '/admin/settings',
            },
          ],
        }
      case 'API_KEY_ERROR':
        return {
          title: 'API-Key Problem',
          description: 'Der API-Key fehlt oder ist ungültig. Bitte überprüfe deine Konfiguration.',
          icon: Settings,
          color: 'bg-red-50 border-red-200 text-red-800',
          actions: [
            {
              label: 'Einstellungen',
              href: '/admin/settings',
            },
          ],
        }
      case 'MODEL_ERROR':
        return {
          title: 'Modell-Fehler',
          description: `Kein funktionierendes KI-Modell gefunden. ${error.testedModels ? `${error.testedModels.length} Modelle wurden getestet.` : ''}`,
          icon: AlertCircle,
          color: 'bg-orange-50 border-orange-200 text-orange-800',
          actions: [
            {
              label: 'Einstellungen',
              href: '/admin/settings',
            },
          ],
        }
      default:
        return {
          title: 'Fehler aufgetreten',
          description: errorText,
          icon: AlertCircle,
          color: 'bg-red-50 border-red-200 text-red-800',
          actions: [],
        }
    }
  }

  const config = getErrorConfig()
  const Icon = config.icon

  return (
    <Card className={`border-2 ${config.color}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <CardTitle>{config.title}</CardTitle>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="font-semibold mb-1">Details:</p>
          <p className="whitespace-pre-wrap">{errorText}</p>
          {error.model && (
            <p className="mt-2">
              <span className="font-semibold">Verwendetes Modell:</span> {error.model}
            </p>
          )}
          {error.testedModels && error.testedModels.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold mb-1">Getestete Modelle:</p>
              <ul className="list-disc list-inside space-y-1">
                {error.testedModels.map((model, idx) => (
                  <li key={idx} className="text-xs">{model}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {config.actions.map((action, idx) => (
            action.external ? (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  {action.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            ) : (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                asChild
              >
                <Link href={action.href}>
                  {action.label}
                </Link>
              </Button>
            )
          ))}
          {onRetry && (
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Erneut versuchen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
