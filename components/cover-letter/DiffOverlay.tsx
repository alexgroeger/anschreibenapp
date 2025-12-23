"use client"

import React, { useRef, useEffect } from "react"
import { computeWordDiff, type DiffSegment } from "@/lib/text-diff"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface DiffOverlayProps {
  originalText: string
  modifiedText: string
  onAccept: () => void
  onReject: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function DiffOverlay({
  originalText,
  modifiedText,
  onAccept,
  onReject,
  textareaRef,
}: DiffOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

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

      {/* Accept/Reject Buttons */}
      <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto z-10">
        <Button
          onClick={onAccept}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
        >
          <Check className="h-4 w-4 mr-1" />
          Änderungen übernehmen
        </Button>
        <Button
          onClick={onReject}
          size="sm"
          variant="destructive"
          className="shadow-lg"
        >
          <X className="h-4 w-4 mr-1" />
          Ablehnen
        </Button>
      </div>
    </div>
  )
}

