"use client"

import React, { useRef, useEffect, useState } from "react"
import { computeWordDiff, type DiffSegment } from "@/lib/text-diff"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, X, Loader2, Edit } from "lucide-react"

interface DiffOverlayProps {
  originalText: string
  modifiedText: string
  onAccept: () => void
  onReject: () => void
  onRevise?: (revisionInput: string, revisionBase: 'original' | 'pending') => Promise<void>
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function DiffOverlay({
  originalText,
  modifiedText,
  onAccept,
  onReject,
  onRevise,
  textareaRef,
}: DiffOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isRevising, setIsRevising] = useState(false)
  const [revisionInput, setRevisionInput] = useState("")
  const [revisionBase, setRevisionBase] = useState<'original' | 'pending'>('original')
  const [isRevisingLoading, setIsRevisingLoading] = useState(false)

  // Berechne Diff mit Fehlerbehandlung
  let diffSegments: DiffSegment[] = []
  try {
    diffSegments = computeWordDiff(originalText || '', modifiedText || '')
  } catch (error) {
    console.error('Error computing diff:', error)
    // Fallback: Zeige einfach den modifizierten Text
    diffSegments = [{ text: modifiedText || '', type: 'added' }]
  }

  // Synchronisiere Scroll-Position mit Textarea
  useEffect(() => {
    const textarea = textareaRef.current
    const overlay = overlayRef.current

    if (!textarea || !overlay) return

    const handleScroll = () => {
      overlay.scrollTop = textarea.scrollTop
      overlay.scrollLeft = textarea.scrollLeft
    }

    textarea.addEventListener('scroll', handleScroll)
    return () => textarea.removeEventListener('scroll', handleScroll)
  }, [textareaRef])

  // Render Diff-Segmente mit verbesserter Darstellung für große Änderungen
  const renderDiff = () => {
    if (!diffSegments || diffSegments.length === 0) {
      return <span className="text-muted-foreground">Keine Änderungen erkannt</span>
    }
    
    // Gruppiere aufeinanderfolgende deleted/added Segmente für bessere Darstellung
    const groupedSegments: Array<{ deleted?: string; added?: string; unchanged?: string }> = []
    let currentGroup: { deleted?: string; added?: string; unchanged?: string } | null = null
    
    for (const segment of diffSegments) {
      if (!segment || !segment.text) continue
      
      if (segment.type === 'deleted' || segment.type === 'added') {
        // Starte oder erweitere eine Änderungsgruppe
        if (!currentGroup || (currentGroup.deleted && segment.type === 'added') || (currentGroup.added && segment.type === 'deleted')) {
          if (currentGroup) {
            groupedSegments.push(currentGroup)
          }
          currentGroup = {}
        }
        
        if (segment.type === 'deleted') {
          currentGroup.deleted = (currentGroup.deleted || '') + segment.text
        } else {
          currentGroup.added = (currentGroup.added || '') + segment.text
        }
      } else {
        // Unverändertes Segment - schließe aktuelle Gruppe und füge unverändertes hinzu
        if (currentGroup) {
          groupedSegments.push(currentGroup)
          currentGroup = null
        }
        groupedSegments.push({ unchanged: segment.text })
      }
    }
    
    // Füge letzte Gruppe hinzu
    if (currentGroup) {
      groupedSegments.push(currentGroup)
    }
    
    return groupedSegments.map((group, index) => {
      if (group.unchanged) {
        return <span key={index}>{group.unchanged}</span>
      }
      
      // Große Änderung - zeige als Block
      if (group.deleted && group.added) {
        return (
          <div key={index} className="my-2 border-l-4 border-blue-300 pl-3">
            <div className="bg-red-50 border-l-2 border-red-300 pl-2 py-1 mb-1">
              <span className="text-xs font-semibold text-red-700 uppercase">Entfernt:</span>
              <div className="text-red-800 line-through decoration-red-600 mt-1">
                {group.deleted}
              </div>
            </div>
            <div className="bg-green-50 border-l-2 border-green-300 pl-2 py-1">
              <span className="text-xs font-semibold text-green-700 uppercase">Hinzugefügt:</span>
              <div className="text-green-800 font-medium mt-1">
                {group.added}
              </div>
            </div>
          </div>
        )
      } else if (group.deleted) {
        return (
          <div key={index} className="my-2 bg-red-50 border-l-4 border-red-300 pl-3 py-2">
            <span className="text-xs font-semibold text-red-700 uppercase">Entfernt:</span>
            <div className="text-red-800 line-through decoration-red-600 mt-1">
              {group.deleted}
            </div>
          </div>
        )
      } else if (group.added) {
        return (
          <div key={index} className="my-2 bg-green-50 border-l-4 border-green-300 pl-3 py-2">
            <span className="text-xs font-semibold text-green-700 uppercase">Hinzugefügt:</span>
            <div className="text-green-800 font-medium mt-1">
              {group.added}
            </div>
          </div>
        )
      }
      
      return null
    }).filter(Boolean)
  }

  const handleReviseClick = () => {
    if (isRevising) {
      // Abbrechen
      setIsRevising(false)
      setRevisionInput("")
      setRevisionBase('original')
    } else {
      // Überarbeiten-Modus aktivieren
      setIsRevising(true)
    }
  }

  const handleReviseSubmit = async () => {
    if (!onRevise || !revisionInput.trim() || revisionInput.trim().length < 10) {
      return
    }

    setIsRevisingLoading(true)
    try {
      await onRevise(revisionInput.trim(), revisionBase)
      // Nach erfolgreicher Überarbeitung: Input zurücksetzen, aber Modus bleibt aktiv
      setRevisionInput("")
      setIsRevising(false)
    } catch (error) {
      console.error('Error revising:', error)
      // Fehler wird vom Parent-Handler behandelt
    } finally {
      setIsRevisingLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Diff Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 font-mono text-sm whitespace-pre-wrap overflow-auto pointer-events-auto bg-background border rounded-md"
        style={{
          // Gleiche Styles wie Textarea für perfekte Übereinstimmung
          padding: '0.75rem',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
      >
        {renderDiff()}
      </div>

      {/* Accept/Reject/Revise Buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto z-10">
        <div className="flex gap-2">
          <Button
            onClick={onAccept}
            size="sm"
            disabled={isRevising}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          >
            <Check className="h-4 w-4 mr-1" />
            Änderungen übernehmen
          </Button>
          <Button
            onClick={onReject}
            size="sm"
            variant="destructive"
            disabled={isRevising}
            className="shadow-lg"
          >
            <X className="h-4 w-4 mr-1" />
            Ablehnen
          </Button>
          {onRevise && (
            <Button
              onClick={handleReviseClick}
              size="sm"
              variant={isRevising ? "outline" : "secondary"}
              className="shadow-lg"
            >
              {isRevising ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Abbrechen
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Überarbeiten
                </>
              )}
            </Button>
          )}
        </div>

        {/* Überarbeiten Input-Feld */}
        {isRevising && onRevise && (
          <div className="bg-background border rounded-md p-4 shadow-lg min-w-[400px] max-w-[500px]">
            <div className="space-y-3">
              {/* Basis-Auswahl */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Basis für Überarbeitung:</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="revisionBase"
                      value="original"
                      checked={revisionBase === 'original'}
                      onChange={(e) => setRevisionBase(e.target.value as 'original' | 'pending')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">Original-Anschreiben</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="revisionBase"
                      value="pending"
                      checked={revisionBase === 'pending'}
                      onChange={(e) => setRevisionBase(e.target.value as 'original' | 'pending')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">Aktueller Vorschlag</span>
                  </label>
                </div>
              </div>

              {/* Input-Feld */}
              <div className="space-y-2">
                <Label htmlFor="revision-input" className="text-xs font-semibold">
                  Änderungswunsch:
                </Label>
                <Textarea
                  id="revision-input"
                  value={revisionInput}
                  onChange={(e) => setRevisionInput(e.target.value)}
                  placeholder="z.B. 'Mache den Ton formeller', 'Kürze den ersten Absatz', 'Hervorhebe mehr meine Erfahrung mit React'..."
                  className="min-h-[80px] resize-none text-sm"
                  disabled={isRevisingLoading}
                  onKeyDown={(e) => {
                    // CMD+Enter (Mac) oder Ctrl+Enter (Windows/Linux) zum Absenden
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      if (!isRevisingLoading && revisionInput.trim().length >= 10) {
                        handleReviseSubmit()
                      }
                    }
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  {revisionInput.length < 10 ? (
                    <span className="text-amber-600">Mindestens 10 Zeichen erforderlich</span>
                  ) : (
                    <span>{revisionInput.length} Zeichen (CMD+Enter zum Absenden)</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleReviseSubmit}
                disabled={isRevisingLoading || !revisionInput.trim() || revisionInput.trim().length < 10}
                className="w-full"
                size="sm"
              >
                {isRevisingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Überarbeite...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Überarbeiten senden
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

