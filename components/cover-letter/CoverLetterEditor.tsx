"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Save, 
  Copy, 
  Undo, 
  Redo, 
  Loader2,
  Check,
  X
} from "lucide-react"
import { CoverLetterChat } from "./CoverLetterChat"
import { SuggestionList, type Suggestion } from "./SuggestionList"
import { VersionHistory, type Version } from "./VersionHistory"
import { parseParagraphs } from "@/lib/paragraph-parser"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Application {
  id: number
  company: string
  position: string
  job_description: string | null
  extraction_data: string | null
  match_result: string | null
  cover_letter: string | null
  status: string
}

interface CoverLetterEditorProps {
  application: Application
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (content: string) => Promise<void>
}

interface HistoryEntry {
  content: string
  suggestions: Suggestion[]
  timestamp: number
}

export function CoverLetterEditor({
  application,
  isOpen,
  onOpenChange,
  onSave,
}: CoverLetterEditorProps) {
  const [content, setContent] = useState(application.cover_letter || "")
  const [tone, setTone] = useState("professionell")
  const [focus, setFocus] = useState("skills")
  const [length, setLength] = useState("mittel")
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  
  // Undo/Redo History
  const [history, setHistory] = useState<HistoryEntry[]>([{
    content: application.cover_letter || "",
    suggestions: [],
    timestamp: Date.now(),
  }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const maxHistorySize = 50

  // Load versions and suggestions on mount
  useEffect(() => {
    if (isOpen && application.id) {
      loadVersions()
      loadSuggestions()
    }
  }, [isOpen, application.id])

  // Initialize content when application changes
  useEffect(() => {
    if (application.cover_letter) {
      setContent(application.cover_letter)
      setHistory([{
        content: application.cover_letter,
        suggestions: [],
        timestamp: Date.now(),
      }])
      setHistoryIndex(0)
      setHasUnsavedChanges(false)
    }
  }, [application.cover_letter])

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/applications/${application.id}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
        if (data.versions && data.versions.length > 0) {
          setCurrentVersionId(data.versions[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading versions:', error)
    }
  }

  const loadSuggestions = async () => {
    try {
      const response = await fetch(`/api/applications/${application.id}/suggestions`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  const addToHistory = useCallback((newContent: string, newSuggestions: Suggestion[]) => {
    const newEntry: HistoryEntry = {
      content: newContent,
      suggestions: [...newSuggestions],
      timestamp: Date.now(),
    }
    
    // Remove any entries after current index (when undoing and then making new changes)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newEntry)
    
    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift()
    } else {
      setHistoryIndex(newHistory.length - 1)
    }
    
    setHistory(newHistory)
  }, [history, historyIndex])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
    
    // Debounce history updates for text edits
    const timeoutId = setTimeout(() => {
      addToHistory(newContent, suggestions)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }

  const handleRegenerate = async () => {
    if (!application.job_description) return

    setRegenerating(true)
    try {
      // First get match result
      const matchResponse = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: application.job_description }),
      })

      if (!matchResponse.ok) {
        throw new Error('Fehler beim Matching')
      }

      const matchData = await matchResponse.json()
      const matchResult = matchData.matchResult

      // Then generate new cover letter
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchResult,
          jobDescription: application.job_description,
          tone,
          focus,
          textLength: length,
        }),
      })

      if (generateResponse.ok) {
        const generateData = await generateResponse.json()
        const newContent = generateData.coverLetter
        setContent(newContent)
        setHasUnsavedChanges(true)
        addToHistory(newContent, suggestions)
      } else {
        throw new Error('Fehler bei der Generierung')
      }
    } catch (error: any) {
      alert(error.message || 'Fehler beim Regenerieren des Anschreibens')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save as new version
      const versionResponse = await fetch(`/api/applications/${application.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!versionResponse.ok) {
        throw new Error('Fehler beim Speichern der Version')
      }

      // Update suggestion statuses
      for (const suggestion of suggestions) {
        if (suggestion.status === 'pending') {
          // Keep pending, will be handled when accepted/rejected
          continue
        }
        
        await fetch(`/api/applications/${application.id}/suggestions/${suggestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: suggestion.status }),
        })
      }

      // Update application cover_letter
      await onSave(content)

      setHasUnsavedChanges(false)
      await loadVersions()
      await loadSuggestions()
    } catch (error: any) {
      alert(error.message || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleSuggestionCreated = async (suggestionData: Omit<Suggestion, 'id' | 'application_id' | 'created_at'>) => {
    try {
      const response = await fetch(`/api/applications/${application.id}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestionData),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(prev => [...prev, data.suggestion])
        setHasUnsavedChanges(true)
      }
    } catch (error) {
      console.error('Error creating suggestion:', error)
    }
  }

  const handleAcceptSuggestion = async (suggestionId: number) => {
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return

    try {
      // Update status
      const response = await fetch(`/api/applications/${application.id}/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      })

      if (response.ok) {
        // Update local state
        setSuggestions(prev => prev.map(s => 
          s.id === suggestionId ? { ...s, status: 'accepted' } : s
        ))

        // Apply suggestion to content
        if (suggestion.paragraph_index !== null) {
          const paragraphs = parseParagraphs(content)
          if (paragraphs[suggestion.paragraph_index]) {
            paragraphs[suggestion.paragraph_index].text = suggestion.suggested_text
            const newContent = paragraphs.map(p => p.text).join('\n\n')
            setContent(newContent)
            setHasUnsavedChanges(true)
            addToHistory(newContent, suggestions.map(s => 
              s.id === suggestionId ? { ...s, status: 'accepted' } : s
            ))
          }
        } else {
          // If no paragraph index, try to find and replace in full text
          if (suggestion.original_text) {
            const newContent = content.replace(suggestion.original_text, suggestion.suggested_text)
            setContent(newContent)
            setHasUnsavedChanges(true)
            addToHistory(newContent, suggestions.map(s => 
              s.id === suggestionId ? { ...s, status: 'accepted' } : s
            ))
          }
        }
      }
    } catch (error) {
      console.error('Error accepting suggestion:', error)
    }
  }

  const handleRejectSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/applications/${application.id}/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })

      if (response.ok) {
        setSuggestions(prev => prev.map(s => 
          s.id === suggestionId ? { ...s, status: 'rejected' } : s
        ))
        setHasUnsavedChanges(true)
        addToHistory(content, suggestions.map(s => 
          s.id === suggestionId ? { ...s, status: 'rejected' } : s
        ))
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error)
    }
  }

  const handleAcceptAll = async () => {
    const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
    
    for (const suggestion of pendingSuggestions) {
      await handleAcceptSuggestion(suggestion.id)
    }
  }

  const handleVersionSelect = (version: Version) => {
    if (hasUnsavedChanges) {
      // Show warning dialog
      setShowUnsavedDialog(true)
      // Store the version to load after confirmation
      return
    }
    
    setContent(version.content)
    setCurrentVersionId(version.id)
    setHasUnsavedChanges(false)
    addToHistory(version.content, suggestions)
  }

  const handleRestoreVersion = async (version: Version) => {
    try {
      const response = await fetch(`/api/applications/${application.id}/versions/${version.id}`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setContent(data.version.content)
        setCurrentVersionId(data.version.id)
        setHasUnsavedChanges(true)
        await loadVersions()
        addToHistory(data.version.content, suggestions)
      }
    } catch (error) {
      console.error('Error restoring version:', error)
    }
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = history[newIndex]
      setContent(entry.content)
      setSuggestions(entry.suggestions)
      setHistoryIndex(newIndex)
      setHasUnsavedChanges(true)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const entry = history[newIndex]
      setContent(entry.content)
      setSuggestions(entry.suggestions)
      setHistoryIndex(newIndex)
      setHasUnsavedChanges(true)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error copying text:', error)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setPendingClose(true)
      setShowUnsavedDialog(true)
    } else {
      onOpenChange(open)
    }
  }

  const handleUnsavedDialogAction = async (action: 'save' | 'discard' | 'cancel') => {
    if (action === 'save') {
      await handleSave()
      if (pendingClose) {
        onOpenChange(false)
        setPendingClose(false)
      }
    } else if (action === 'discard') {
      if (pendingClose) {
        onOpenChange(false)
        setPendingClose(false)
      }
      setHasUnsavedChanges(false)
    }
    setShowUnsavedDialog(false)
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const renderContentWithHighlights = () => {
    const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
    if (pendingSuggestions.length === 0) return content

    let highlightedContent = content
    const paragraphs = parseParagraphs(content)

    // Highlight paragraphs with pending suggestions
    pendingSuggestions.forEach((suggestion) => {
      if (suggestion.paragraph_index !== null && paragraphs[suggestion.paragraph_index]) {
        const para = paragraphs[suggestion.paragraph_index]
        // Mark the paragraph text with a highlight indicator
        const originalParaText = para.text
        const highlightedParaText = `[Vorschlag verfügbar] ${originalParaText}`
        highlightedContent = highlightedContent.replace(originalParaText, highlightedParaText)
      } else if (suggestion.original_text) {
        // Try to find and highlight original text
        highlightedContent = highlightedContent.replace(
          suggestion.original_text,
          `[Vorschlag verfügbar] ${suggestion.original_text}`
        )
      }
    })

    return highlightedContent
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Anschreiben Editor</SheetTitle>
            <SheetDescription>
              Bearbeiten Sie Ihr Anschreiben mit Hilfe des KI-Assistenten
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4">
            {/* Main Editor Area - 70% */}
            <div className="col-span-2 flex flex-col space-y-3 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 pb-0">
                <h2 className="text-lg font-semibold">Anschreiben Editor</h2>
              </div>
              {/* Toolbar */}
              <div className="flex items-end gap-1.5 flex-shrink-0">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tonalität</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger id="tone" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professionell">Professionell</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="enthusiastisch">Enthusiastisch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focus">Fokus</Label>
                    <Select value={focus} onValueChange={setFocus}>
                      <SelectTrigger id="focus" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skills">Skills</SelectItem>
                        <SelectItem value="motivation">Motivation</SelectItem>
                        <SelectItem value="erfahrung">Erfahrung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="length">Länge</Label>
                    <Select value={length} onValueChange={setLength}>
                      <SelectTrigger id="length" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kurz">Kurz</SelectItem>
                        <SelectItem value="mittel">Mittel</SelectItem>
                        <SelectItem value="lang">Lang</SelectItem>
                        <SelectItem value="maximal">Maximal (1 A4 Seite)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  disabled={regenerating || !application.job_description}
                  size="sm"
                  className="h-9"
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    'Generieren'
                  )}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  variant="outline"
                  size="sm"
                  title="Rückgängig"
                  className="h-9"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  variant="outline"
                  size="sm"
                  title="Wiederholen"
                  className="h-9"
                >
                  <Redo className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className={`h-9 ${copySuccess ? "bg-green-100" : ""}`}
                  title="Text kopieren"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copySuccess ? "Kopiert!" : "Kopieren"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  size="sm"
                  className="ml-auto h-9"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Speichere...' : 'Speichern'}
                </Button>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <Label htmlFor="editor">Anschreiben</Label>
                <div className="relative flex-1 min-h-[300px] overflow-hidden">
                  <Textarea
                    id="editor"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="h-full min-h-[300px] font-mono text-sm resize-none overflow-auto"
                    placeholder="Ihr Anschreiben..."
                  />
                  {/* Diff Overlay for suggestions - shows pending suggestions */}
                  {suggestions.filter(s => s.status === 'pending').length > 0 && (
                    <div className="absolute inset-0 pointer-events-none p-3 font-mono text-sm whitespace-pre-wrap opacity-50 overflow-hidden">
                      {renderContentWithHighlights()}
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions List */}
              <div className="flex-shrink-0 max-h-[200px] overflow-y-auto border-t pt-2">
                <SuggestionList
                  suggestions={suggestions}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  onAcceptAll={handleAcceptAll}
                  loading={saving}
                />
              </div>
            </div>

            {/* Sidebar - Chat and Version History - 30% */}
            <div className="col-span-1 flex flex-col space-y-3 min-h-0 overflow-hidden pt-0">
              {/* Version History */}
              <div className="flex-shrink-0 max-h-[200px] overflow-y-auto">
                <VersionHistory
                  versions={versions}
                  currentVersionId={currentVersionId}
                  onVersionSelect={handleVersionSelect}
                  onRestore={handleRestoreVersion}
                  loading={saving}
                />
              </div>

              {/* Chat */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <CoverLetterChat
                  coverLetter={content}
                  matchResult={application.match_result || ''}
                  jobDescription={application.job_description || ''}
                  extraction={application.extraction_data ? JSON.parse(application.extraction_data) : undefined}
                  onCoverLetterUpdate={(newContent) => {
                    setContent(newContent)
                    setHasUnsavedChanges(true)
                    addToHistory(newContent, suggestions)
                  }}
                  onSuggestionCreated={handleSuggestionCreated}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ungespeicherte Änderungen</DialogTitle>
            <DialogDescription>
              Sie haben ungespeicherte Änderungen. Was möchten Sie tun?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleUnsavedDialogAction('cancel')}
            >
              Abbrechen
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUnsavedDialogAction('discard')}
            >
              Verwerfen
            </Button>
            <Button
              onClick={() => handleUnsavedDialogAction('save')}
              disabled={saving}
            >
              {saving ? 'Speichere...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

