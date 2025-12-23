"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, CheckCheck } from "lucide-react"

export interface Suggestion {
  id: number
  application_id: number
  version_id: number | null
  paragraph_index: number | null
  original_text: string
  suggested_text: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

interface SuggestionListProps {
  suggestions: Suggestion[]
  onAccept: (suggestionId: number) => void
  onReject: (suggestionId: number) => void
  onAcceptAll?: () => void
  loading?: boolean
}

export function SuggestionList({
  suggestions,
  onAccept,
  onReject,
  onAcceptAll,
  loading = false,
}: SuggestionListProps) {
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
  const acceptedSuggestions = suggestions.filter(s => s.status === 'accepted')
  const rejectedSuggestions = suggestions.filter(s => s.status === 'rejected')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Ausstehend</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Akzeptiert</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Abgelehnt</Badge>
      default:
        return null
    }
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Noch keine Vorschläge vorhanden</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header mit "Alle akzeptieren" Button */}
      {pendingSuggestions.length > 0 && onAcceptAll && (
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <Button
              onClick={onAcceptAll}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Alle akzeptieren ({pendingSuggestions.length})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Suggestions */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Ausstehende Vorschläge ({pendingSuggestions.length})
          </h3>
          {pendingSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-yellow-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Vorschlag #{suggestion.id}</CardTitle>
                  {getStatusBadge(suggestion.status)}
                </div>
                {suggestion.paragraph_index !== null && (
                  <CardDescription className="text-xs">
                    Absatz {suggestion.paragraph_index + 1}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestion.original_text && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Original:</p>
                    <div className="text-sm bg-muted p-2 rounded border border-red-200 line-through text-red-600">
                      {suggestion.original_text}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Vorschlag:</p>
                  <div className="text-sm bg-muted p-2 rounded border border-green-200 text-green-700">
                    {suggestion.suggested_text}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAccept(suggestion.id)}
                    disabled={loading}
                    className="flex-1"
                    variant="default"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Akzeptieren
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onReject(suggestion.id)}
                    disabled={loading}
                    className="flex-1"
                    variant="outline"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Ablehnen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Accepted Suggestions */}
      {acceptedSuggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Akzeptierte Vorschläge ({acceptedSuggestions.length})
          </h3>
          {acceptedSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Vorschlag #{suggestion.id}</CardTitle>
                  {getStatusBadge(suggestion.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-background p-2 rounded border">
                  {suggestion.suggested_text}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rejected Suggestions */}
      {rejectedSuggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Abgelehnte Vorschläge ({rejectedSuggestions.length})
          </h3>
          {rejectedSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-red-200 bg-red-50/50 opacity-60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Vorschlag #{suggestion.id}</CardTitle>
                  {getStatusBadge(suggestion.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-background p-2 rounded border line-through text-muted-foreground">
                  {suggestion.suggested_text}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
