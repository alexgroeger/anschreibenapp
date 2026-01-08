"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Sheet, SheetPortal, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Save, 
  Copy, 
  Undo, 
  Redo, 
  Loader2,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react"
import { SuggestionList, type Suggestion } from "./SuggestionList"
import { VersionHistory, type Version } from "./VersionHistory"
import { DiffOverlay } from "./DiffOverlay"
import { MotivationQuestionsDialog } from "./MotivationQuestionsDialog"
import { parseParagraphs } from "@/lib/paragraph-parser"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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

// Custom SheetContent that allows overlay control
const CustomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { 
    side?: "top" | "bottom" | "left" | "right"
    isMinimized?: boolean
  }
>(({ side = "bottom", className, children, isMinimized = false, ...props }, ref) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (overlayRef.current) {
      if (isMinimized) {
        overlayRef.current.style.pointerEvents = 'none'
        overlayRef.current.style.backgroundColor = 'transparent'
      } else {
        overlayRef.current.style.pointerEvents = 'auto'
        overlayRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
      }
    }
  }, [isMinimized])
  
  const sheetVariants = cva(
    "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
    {
      variants: {
        side: {
          top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          bottom:
            "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[85vh] overflow-hidden",
          left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left max-w-sm",
          right:
            "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right max-w-sm",
        },
      },
    }
  )
  
  return (
    <SheetPortal>
      <DialogPrimitive.Overlay
        ref={overlayRef}
        className={cn(
          "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          isMinimized && "pointer-events-none bg-transparent"
        )}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  )
})
CustomSheetContent.displayName = "CustomSheetContent"

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
  const [formality, setFormality] = useState("formal")
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Diff-Modus State
  const [pendingCoverLetter, setPendingCoverLetter] = useState<string | null>(null)
  const [originalCoverLetter, setOriginalCoverLetter] = useState<string>("")
  const [showDiff, setShowDiff] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Modification input
  const [modificationInput, setModificationInput] = useState("")
  const [isModifying, setIsModifying] = useState(false)
  
  // Version description dialog
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false)
  const [versionDescription, setVersionDescription] = useState("")
  const [pendingSave, setPendingSave] = useState(false)
  const [saveMode, setSaveMode] = useState<'new' | 'update'>('new')
  
  // Motivation questions
  const [showMotivationDialog, setShowMotivationDialog] = useState(false)
  const [motivationAnswers, setMotivationAnswers] = useState<{
    motivation_position: string | null
    motivation_company: string | null
    company_website: string | null
    company_website_content: string | null
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'editor' | 'motivation'>('editor')
  const [generatingPosition, setGeneratingPosition] = useState(false)
  const [generatingCompany, setGeneratingCompany] = useState(false)
  
  // Refs for debouncing auto-save
  const savePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveCompanyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveWebsiteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveWebsiteContentTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
      loadMotivationAnswers()
    }
  }, [isOpen, application.id])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savePositionTimeoutRef.current) {
        clearTimeout(savePositionTimeoutRef.current)
      }
      if (saveCompanyTimeoutRef.current) {
        clearTimeout(saveCompanyTimeoutRef.current)
      }
      if (saveWebsiteTimeoutRef.current) {
        clearTimeout(saveWebsiteTimeoutRef.current)
      }
      if (saveWebsiteContentTimeoutRef.current) {
        clearTimeout(saveWebsiteContentTimeoutRef.current)
      }
    }
  }, [])

  const loadMotivationAnswers = async () => {
    try {
      const response = await fetch(`/api/applications/${application.id}/motivation-questions`)
      if (response.ok) {
        const data = await response.json()
        setMotivationAnswers({
          motivation_position: data.motivation_position || null,
          motivation_company: data.motivation_company || null,
          company_website: data.company_website || null,
          company_website_content: data.company_website_content || null,
        })
      } else {
        console.error('Failed to load motivation answers:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading motivation answers:', error)
    }
  }

  const handleGenerateMotivationSuggestion = async (questionType: 'position' | 'company') => {
    if (questionType === 'position') {
      setGeneratingPosition(true)
    } else {
      setGeneratingCompany(true)
    }

    try {
      // Ensure we have the latest website URL
      const currentWebsite = motivationAnswers?.company_website || ''
      
      const response = await fetch('/api/motivation-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType,
          applicationId: application.id,
          companyWebsite: currentWebsite || undefined,
          jobDescription: application.job_description || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Vorschlags')
      }

      const data = await response.json()
      const suggestion = data.suggestion

      if (questionType === 'position') {
        setMotivationAnswers(prev => ({
          ...prev,
          motivation_position: suggestion,
          motivation_company: prev?.motivation_company || null,
          company_website: prev?.company_website || null,
          company_website_content: prev?.company_website_content || null,
        }))
        // Auto-save the generated suggestion
        try {
          const saveResponse = await fetch(`/api/applications/${application.id}/motivation-questions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              motivation_position: suggestion,
            }),
          })
          if (!saveResponse.ok) {
            throw new Error('Fehler beim Speichern')
          }
          await loadMotivationAnswers()
        } catch (error) {
          console.error('Error saving generated suggestion:', error)
          alert('Vorschlag wurde generiert, aber konnte nicht gespeichert werden. Bitte speichern Sie manuell.')
        }
      } else {
        setMotivationAnswers(prev => ({
          ...prev,
          motivation_position: prev?.motivation_position || null,
          motivation_company: suggestion,
          company_website: prev?.company_website || null,
          company_website_content: prev?.company_website_content || null,
        }))
        // Auto-save the generated suggestion
        try {
          const saveResponse = await fetch(`/api/applications/${application.id}/motivation-questions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              motivation_company: suggestion,
            }),
          })
          if (!saveResponse.ok) {
            throw new Error('Fehler beim Speichern')
          }
          await loadMotivationAnswers()
        } catch (error) {
          console.error('Error saving generated suggestion:', error)
          alert('Vorschlag wurde generiert, aber konnte nicht gespeichert werden. Bitte speichern Sie manuell.')
        }
      }
    } catch (error: any) {
      alert(error.message || 'Fehler beim Generieren des Vorschlags')
    } finally {
      if (questionType === 'position') {
        setGeneratingPosition(false)
      } else {
        setGeneratingCompany(false)
      }
    }
  }


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
      // Reset diff mode when application changes
      setShowDiff(false)
      setPendingCoverLetter(null)
      setOriginalCoverLetter("")
    }
    // Reload motivation answers when application changes
    if (application.id) {
      loadMotivationAnswers()
    }
  }, [application.cover_letter, application.id])

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

    // Check if motivation questions are answered (only for first generation)
    const hasNoContent = !content || content.trim().length === 0
    const hasNoAnswers = !motivationAnswers?.motivation_position || !motivationAnswers?.motivation_company
    
    if (hasNoContent && hasNoAnswers) {
      // Show motivation dialog before first generation
      setShowMotivationDialog(true)
      return
    }

    await performRegeneration()
  }

  const performRegeneration = async () => {
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
          formality,
          extraction: application.extraction_data ? JSON.parse(application.extraction_data) : undefined,
          motivation_position: motivationAnswers?.motivation_position || undefined,
          motivation_company: motivationAnswers?.motivation_company || undefined,
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

  const handleSaveMotivationAnswers = async (answers: {
    motivation_position: string
    motivation_company: string
    company_website?: string
    company_website_content?: string
  }) => {
    try {
      const response = await fetch(`/api/applications/${application.id}/motivation-questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivation_position: answers.motivation_position,
          motivation_company: answers.motivation_company,
          company_website: answers.company_website || null,
          company_website_content: answers.company_website_content || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Speichern der Antworten')
      }

      const data = await response.json()
      
      // Update local state with saved data
      setMotivationAnswers({
        motivation_position: data.motivation_position || null,
        motivation_company: data.motivation_company || null,
        company_website: data.company_website || null,
        company_website_content: data.company_website_content || null,
      })

      // Reload to ensure we have the latest data from database
      await loadMotivationAnswers()

      // After saving, proceed with generation
      await performRegeneration()
    } catch (error: any) {
      console.error('Error saving motivation answers:', error)
      alert(error.message || 'Fehler beim Speichern der Antworten')
      throw error
    }
  }

  const handleSave = async () => {
    // Setze Standard-Modus: 'new' wenn keine Version vorhanden, sonst 'new' als Default
    if (currentVersionId === null) {
      setSaveMode('new')
    } else {
      // Default ist 'new', aber 'update' ist auch möglich
      setSaveMode('new')
    }
    // Zeige Dialog für Beschreibung
    setPendingSave(true)
    setShowDescriptionDialog(true)
  }

  const handleSaveWithDescription = async () => {
    setSaving(true)
    setShowDescriptionDialog(false)
    try {
      let versionResponse
      
      if (saveMode === 'update' && currentVersionId !== null) {
        // Update existing version
        versionResponse = await fetch(`/api/applications/${application.id}/versions/${currentVersionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content,
            description: versionDescription.trim() || null
          }),
        })
      } else {
        // Save as new version
        versionResponse = await fetch(`/api/applications/${application.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content,
            description: versionDescription.trim() || null
          }),
        })
      }

      if (!versionResponse.ok) {
        throw new Error('Fehler beim Speichern der Version')
      }

      const versionData = await versionResponse.json()
      
      // Wenn Update-Modus, bleibt currentVersionId gleich, sonst wird es auf die neue Version gesetzt
      if (saveMode === 'update' && currentVersionId !== null) {
        // currentVersionId bleibt gleich
      } else {
        // Neue Version wurde erstellt, setze currentVersionId
        if (versionData.version) {
          setCurrentVersionId(versionData.version.id)
        }
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
      setVersionDescription("") // Reset description
      setPendingSave(false)
      setSaveMode('new') // Reset to default
      
      // Schließe Dialog komplett, wenn pendingClose gesetzt ist (nicht minimieren)
      if (pendingClose) {
        setIsMinimized(false)
        onOpenChange(false)
        setPendingClose(false)
      }
      
      await loadVersions()
      await loadSuggestions()
    } catch (error: any) {
      alert(error.message || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelSave = () => {
    setShowDescriptionDialog(false)
    setVersionDescription("")
    setPendingSave(false)
    setSaveMode('new') // Reset to default
    // Wenn pendingClose gesetzt war, bleibt der Editor offen
    setPendingClose(false)
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
    if (!open) {
      // Direct close (X button) - show save dialog if there are unsaved changes
      if (hasUnsavedChanges) {
        setPendingClose(true)
        setShowUnsavedDialog(true)
      } else {
        // No unsaved changes - close completely
        setIsMinimized(false)
        onOpenChange(false)
      }
    } else {
      onOpenChange(open)
    }
  }
  
  const handleMinimize = () => {
    // Minimize - just close the sheet and show minimized bar
    setIsMinimized(true)
    onOpenChange(false)
  }
  
  const handleRestore = () => {
    setIsMinimized(false)
    onOpenChange(true)
  }

  const handleUnsavedDialogAction = async (action: 'save' | 'discard' | 'cancel') => {
    if (action === 'save') {
      // Zeige Beschreibungs-Dialog statt direkt zu speichern
      setPendingClose(true)
      setShowUnsavedDialog(false)
      setShowDescriptionDialog(true)
    } else if (action === 'discard') {
      if (pendingClose) {
        // Close completely (not minimized)
        setIsMinimized(false)
        onOpenChange(false)
        setPendingClose(false)
      }
      setHasUnsavedChanges(false)
    } else if (action === 'cancel') {
      // Cancel - keep editor open
      setPendingClose(false)
    }
    setShowUnsavedDialog(false)
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Accept pending changes
  const handleAcceptChanges = () => {
    if (pendingCoverLetter) {
      setContent(pendingCoverLetter)
      setHasUnsavedChanges(true)
      addToHistory(pendingCoverLetter, suggestions)
      setShowDiff(false)
      setPendingCoverLetter(null)
      setOriginalCoverLetter("")
    }
  }

  // Reject pending changes
  const handleRejectChanges = () => {
    setShowDiff(false)
    setPendingCoverLetter(null)
    setOriginalCoverLetter("")
  }

  // Handle revise request from Diff Overlay
  const handleRevise = async (revisionInput: string, revisionBase: 'original' | 'pending') => {
    try {
      // Determine base text based on selection
      const baseText = revisionBase === 'original' 
        ? originalCoverLetter 
        : (pendingCoverLetter || originalCoverLetter)
      
      if (!baseText) {
        throw new Error('Kein Basis-Text verfügbar')
      }

      const response = await fetch('/api/cover-letter/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetter: baseText,
          modificationRequest: revisionInput,
          matchResult: application.match_result || '',
          jobDescription: application.job_description || '',
          extraction: application.extraction_data ? JSON.parse(application.extraction_data) : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Überarbeiten des Anschreibens')
      }

      const data = await response.json()
      const modifiedCoverLetter = data.modifiedCoverLetter

      if (modifiedCoverLetter && modifiedCoverLetter.trim()) {
        // Store the current pending version before updating (needed for diff comparison)
        const previousPending = pendingCoverLetter
        
        // Update pending cover letter with new revision
        setPendingCoverLetter(modifiedCoverLetter.trim())
        
        // Set the base for diff comparison:
        // - If revising from 'pending', compare against the previous pending version
        // - If revising from 'original', compare against the original cover letter
        if (revisionBase === 'pending' && previousPending) {
          // Compare new revision against previous pending version
          setOriginalCoverLetter(previousPending)
        } else {
          // Compare against original (use existing originalCoverLetter if available, otherwise use content)
          // originalCoverLetter should always be set when in diff mode, but fallback to content for safety
          if (!originalCoverLetter) {
            setOriginalCoverLetter(content)
          }
          // If originalCoverLetter is already set, keep it (no need to update)
        }
        setShowDiff(true)
      } else {
        throw new Error('Kein überarbeitetes Anschreiben erhalten')
      }
    } catch (error: any) {
      alert(error.message || 'Fehler beim Überarbeiten des Anschreibens')
      throw error // Re-throw so DiffOverlay can handle it
    }
  }

  // Handle modification request
  const handleModify = async () => {
    if (!modificationInput.trim() || isModifying) return

    setIsModifying(true)
    try {
      // Store original cover letter before modification
      const original = content
      
      const response = await fetch('/api/cover-letter/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverLetter: content,
          modificationRequest: modificationInput.trim(),
          matchResult: application.match_result || '',
          jobDescription: application.job_description || '',
          extraction: application.extraction_data ? JSON.parse(application.extraction_data) : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Überarbeiten des Anschreibens')
      }

      const data = await response.json()
      const modifiedCoverLetter = data.modifiedCoverLetter

      if (modifiedCoverLetter && modifiedCoverLetter.trim()) {
        // Show diff view with the modified version
        setPendingCoverLetter(modifiedCoverLetter.trim())
        setOriginalCoverLetter(original)
        setShowDiff(true)
        setModificationInput("") // Clear input after successful modification
      } else {
        throw new Error('Kein überarbeitetes Anschreiben erhalten')
      }
    } catch (error: any) {
      alert(error.message || 'Fehler beim Überarbeiten des Anschreibens')
    } finally {
      setIsModifying(false)
    }
  }

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
      {/* Minimized bar - shown when minimized and sheet is closed */}
      {isMinimized && !isOpen && (
        <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-background border-t shadow-lg z-50 flex items-center justify-center px-4">
          <div className="absolute left-4 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Anschreiben Editor</h3>
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">• Ungespeicherte Änderungen</span>
            )}
          </div>
          <Button
            onClick={handleRestore}
            variant="ghost"
            size="sm"
            className="h-8"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Öffnen
          </Button>
        </div>
      )}
      
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <CustomSheetContent 
          side="bottom" 
          isMinimized={false}
          className="h-[98vh] flex flex-col overflow-hidden transition-all duration-300"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Anschreiben Editor</SheetTitle>
            <SheetDescription>
              Bearbeiten Sie Ihr Anschreiben mit Hilfe des KI-Assistenten
            </SheetDescription>
          </SheetHeader>
          
          {/* Full editor view */}
          <>
            {/* Minimize Button - centered at top */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <Button
                onClick={handleMinimize}
                variant="ghost"
                size="sm"
                className="h-8"
                title="Minimieren"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Minimieren
              </Button>
            </div>
              
              <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4">
            {/* Main Editor Area - 70% */}
            <div className="col-span-2 flex flex-col min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 pb-2">
                <h2 className="text-lg font-semibold">Anschreiben Editor</h2>
              </div>
              {/* Tabs for Editor and Motivation */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'motivation')} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <TabsList className="grid w-full grid-cols-2 flex-shrink-0 mb-3">
                  <TabsTrigger value="editor">Anschreiben</TabsTrigger>
                  <TabsTrigger value="motivation">Motivation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="editor" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
                  {/* Toolbar */}
                  <div className="flex items-end gap-1.5 flex-shrink-0 mb-3">
                    <div className="flex-1 grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="formality">Formalität</Label>
                    <Select value={formality} onValueChange={setFormality}>
                      <SelectTrigger id="formality" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sehr_formal">Sehr formal</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                        <SelectItem value="kurz">Kurz (150-200 Wörter)</SelectItem>
                        <SelectItem value="mittel">Mittel (200-280 Wörter)</SelectItem>
                        <SelectItem value="lang">Lang (280-350 Wörter)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    </div>

                    <Button
                      onClick={handleRegenerate}
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
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generieren
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mb-3">
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
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor="editor">Anschreiben</Label>
                      <span className="text-sm text-muted-foreground">
                        ({content.trim().split(/\s+/).filter(word => word.length > 0).length} Wörter, {content.length} Zeichen)
                      </span>
                    </div>
                    <div className="relative flex-1 min-h-[300px] overflow-hidden">
                      <Textarea
                        ref={textareaRef}
                        id="editor"
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className={`h-full min-h-[300px] font-mono text-sm resize-none overflow-auto ${showDiff ? 'opacity-0 pointer-events-none' : ''}`}
                        placeholder="Ihr Anschreiben..."
                        disabled={showDiff}
                        readOnly={showDiff}
                      />
                      {/* Diff Overlay for pending changes from chat */}
                      {showDiff && pendingCoverLetter && originalCoverLetter && textareaRef.current && (
                        <DiffOverlay
                          originalText={originalCoverLetter}
                          modifiedText={pendingCoverLetter}
                          onAccept={handleAcceptChanges}
                          onReject={handleRejectChanges}
                          onRevise={handleRevise}
                          textareaRef={textareaRef}
                        />
                      )}
                      {/* Diff Overlay for suggestions - shows pending suggestions */}
                      {!showDiff && suggestions.filter(s => s.status === 'pending').length > 0 && (
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
                </TabsContent>
                
                <TabsContent value="motivation" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-2">Motivationsfragen</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Diese Antworten werden bei der Generierung des Anschreibens verwendet.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Warum begeistert dich die ausgeschrieben Stelle?</Label>
                      <div className="space-y-2">
                        <Textarea
                          value={motivationAnswers?.motivation_position || ''}
                          onChange={(e) => {
                            const newValue = e.target.value
                            setMotivationAnswers(prev => ({
                              ...prev,
                              motivation_position: newValue,
                              motivation_company: prev?.motivation_company || null,
                              company_website: prev?.company_website || null,
                              company_website_content: prev?.company_website_content || null,
                            }))
                            // Clear existing timeout
                            if (savePositionTimeoutRef.current) {
                              clearTimeout(savePositionTimeoutRef.current)
                            }
                            // Auto-save with debouncing
                            savePositionTimeoutRef.current = setTimeout(async () => {
                              try {
                                const response = await fetch(`/api/applications/${application.id}/motivation-questions`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    motivation_position: newValue,
                                  }),
                                })
                                if (!response.ok) {
                                  throw new Error('Fehler beim Speichern')
                                }
                                // Reload to ensure we have the latest data
                                await loadMotivationAnswers()
                              } catch (error) {
                                console.error('Error saving motivation position:', error)
                                alert('Fehler beim Speichern der Antwort. Bitte versuchen Sie es erneut.')
                              }
                            }, 1000) // 1 second debounce
                          }}
                          placeholder="Ihre Antwort..."
                          className="min-h-[100px]"
                          rows={4}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateMotivationSuggestion('position')}
                          disabled={generatingPosition}
                          className="w-full"
                        >
                          {generatingPosition ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              KI-Vorschlag wird generiert...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              KI-Vorschlag generieren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Was begeistert dich an dem Unternehmen oder warum möchtest du speziell in dem Themenfeld arbeiten?</Label>
                      <div className="space-y-2">
                        <Textarea
                          value={motivationAnswers?.motivation_company || ''}
                          onChange={(e) => {
                            const newValue = e.target.value
                            setMotivationAnswers(prev => ({
                              ...prev,
                              motivation_position: prev?.motivation_position || null,
                              motivation_company: newValue,
                              company_website: prev?.company_website || null,
                              company_website_content: prev?.company_website_content || null,
                            }))
                            // Clear existing timeout
                            if (saveCompanyTimeoutRef.current) {
                              clearTimeout(saveCompanyTimeoutRef.current)
                            }
                            // Auto-save with debouncing
                            saveCompanyTimeoutRef.current = setTimeout(async () => {
                              try {
                                const response = await fetch(`/api/applications/${application.id}/motivation-questions`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    motivation_company: newValue,
                                  }),
                                })
                                if (!response.ok) {
                                  throw new Error('Fehler beim Speichern')
                                }
                                // Reload to ensure we have the latest data
                                await loadMotivationAnswers()
                              } catch (error) {
                                console.error('Error saving motivation company:', error)
                                alert('Fehler beim Speichern der Antwort. Bitte versuchen Sie es erneut.')
                              }
                            }, 1000) // 1 second debounce
                          }}
                          placeholder="Ihre Antwort..."
                          className="min-h-[100px]"
                          rows={4}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateMotivationSuggestion('company')}
                          disabled={generatingCompany}
                          className="w-full"
                        >
                          {generatingCompany ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              KI-Vorschlag wird generiert...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              KI-Vorschlag generieren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Unternehmenswebsite (optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={motivationAnswers?.company_website || ''}
                          onChange={(e) => {
                            const newValue = e.target.value
                            setMotivationAnswers(prev => ({
                              ...prev,
                              motivation_position: prev?.motivation_position || null,
                              motivation_company: prev?.motivation_company || null,
                              company_website: newValue,
                              company_website_content: prev?.company_website_content || null,
                            }))
                            // Clear existing timeout
                            if (saveWebsiteTimeoutRef.current) {
                              clearTimeout(saveWebsiteTimeoutRef.current)
                            }
                            // Auto-save with debouncing
                            saveWebsiteTimeoutRef.current = setTimeout(async () => {
                              try {
                                const response = await fetch(`/api/applications/${application.id}/motivation-questions`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    company_website: newValue,
                                  }),
                                })
                                if (!response.ok) {
                                  throw new Error('Fehler beim Speichern')
                                }
                                // If URL is valid, try to scrape content
                                if (newValue.trim() && newValue.trim().startsWith('http')) {
                                  try {
                                    const scrapeResponse = await fetch('/api/scrape-website', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ url: newValue.trim() }),
                                    })
                                    if (scrapeResponse.ok) {
                                      const scrapeData = await scrapeResponse.json()
                                      if (scrapeData.content) {
                                        setMotivationAnswers(prev => ({
                                          ...prev,
                                          company_website_content: scrapeData.content,
                                        }))
                                        // Save scraped content
                                        await fetch(`/api/applications/${application.id}/motivation-questions`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            company_website_content: scrapeData.content,
                                          }),
                                        })
                                      }
                                    }
                                  } catch (scrapeError) {
                                    console.error('Error scraping website:', scrapeError)
                                  }
                                }
                                // Reload to ensure we have the latest data
                                await loadMotivationAnswers()
                              } catch (error) {
                                console.error('Error saving company website:', error)
                                alert('Fehler beim Speichern der Website-URL. Bitte versuchen Sie es erneut.')
                              }
                            }, 1000) // 1 second debounce
                          }}
                          placeholder="https://www.unternehmen.de"
                          className="flex-1"
                        />
                        {motivationAnswers?.company_website && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(motivationAnswers.company_website!, '_blank')}
                            title="Website öffnen"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Extracted Website Content */}
                    {motivationAnswers?.company_website_content && (
                      <div className="space-y-2">
                        <Label>Extrahierte Informationen aus Unternehmenswebsite</Label>
                        <Textarea
                          value={motivationAnswers.company_website_content}
                          onChange={(e) => {
                            const newValue = e.target.value
                            setMotivationAnswers(prev => ({
                              ...prev,
                              motivation_position: prev?.motivation_position || null,
                              motivation_company: prev?.motivation_company || null,
                              company_website: prev?.company_website || null,
                              company_website_content: newValue,
                            }))
                            // Clear existing timeout
                            if (saveWebsiteContentTimeoutRef.current) {
                              clearTimeout(saveWebsiteContentTimeoutRef.current)
                            }
                            // Auto-save with debouncing
                            saveWebsiteContentTimeoutRef.current = setTimeout(async () => {
                              try {
                                const response = await fetch(`/api/applications/${application.id}/motivation-questions`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    company_website_content: newValue,
                                  }),
                                })
                                if (!response.ok) {
                                  throw new Error('Fehler beim Speichern')
                                }
                                await loadMotivationAnswers()
                              } catch (error) {
                                console.error('Error saving website content:', error)
                                alert('Fehler beim Speichern der Website-Inhalte. Bitte versuchen Sie es erneut.')
                              }
                            }, 1000) // 1 second debounce
                          }}
                          placeholder="Extrahierte Website-Inhalte..."
                          className="min-h-[150px] font-mono text-sm"
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          Diese Informationen wurden automatisch von der Website extrahiert und können bearbeitet werden.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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

              {/* Änderungswunsch Eingabe */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">Anschreiben überarbeiten</CardTitle>
                    <CardDescription className="text-xs">
                      Beschreibe deine Änderungswünsche für das Anschreiben
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
                    <div className="flex-1 min-h-0">
                      <Textarea
                        value={modificationInput}
                        onChange={(e) => setModificationInput(e.target.value)}
                        onKeyDown={(e) => {
                          // CMD+Enter (Mac) oder Ctrl+Enter (Windows/Linux) zum Absenden
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            if (!isModifying && modificationInput.trim()) {
                              handleModify();
                            }
                          }
                        }}
                        placeholder="z.B. 'Mache den Ton formeller', 'Kürze den ersten Absatz', 'Hervorhebe mehr meine Erfahrung mit React'... (CMD+Enter zum Absenden)"
                        className="h-full min-h-[100px] resize-none"
                        disabled={isModifying}
                      />
                    </div>
                    <Button
                      onClick={handleModify}
                      disabled={isModifying || !modificationInput.trim()}
                      className="w-full"
                    >
                      {isModifying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Überarbeite...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Anschreiben überarbeiten
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          </>
        </CustomSheetContent>
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

      {/* Motivation Questions Dialog */}
      <MotivationQuestionsDialog
        isOpen={showMotivationDialog}
        onClose={() => {
          setShowMotivationDialog(false)
          // Reload answers after dialog closes to ensure we have latest data
          loadMotivationAnswers()
        }}
        onSave={handleSaveMotivationAnswers}
        applicationId={application.id}
        company={application.company}
        position={application.position}
        jobDescription={application.job_description}
        existingAnswers={motivationAnswers || undefined}
      />

      {/* Version Description Dialog */}
      <Dialog open={showDescriptionDialog} onOpenChange={handleCancelSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version speichern</DialogTitle>
            <DialogDescription>
              Wählen Sie, wie Sie die Version speichern möchten.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Speichermodus Auswahl */}
            <div className="space-y-3">
              <Label>Speichermodus</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveMode"
                    value="new"
                    checked={saveMode === 'new'}
                    onChange={(e) => setSaveMode(e.target.value as 'new' | 'update')}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">
                    Neue Version speichern
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveMode"
                    value="update"
                    checked={saveMode === 'update'}
                    onChange={(e) => setSaveMode(e.target.value as 'new' | 'update')}
                    disabled={currentVersionId === null}
                    className="h-4 w-4 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${currentVersionId === null ? 'text-muted-foreground' : ''}`}>
                    Aktuelle Version überschreiben
                    {currentVersionId === null && ' (nicht verfügbar)'}
                  </span>
                </label>
              </div>
              {saveMode === 'update' && currentVersionId !== null && (
                <p className="text-xs text-muted-foreground">
                  Die aktuelle Version wird überschrieben. Versionsnummer und Datum bleiben erhalten.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="version-description">Beschreibung (optional)</Label>
              <Textarea
                id="version-description"
                value={versionDescription}
                onChange={(e) => {
                  // Begrenze auf 25 Zeichen
                  const text = e.target.value
                  if (text.length <= 25) {
                    setVersionDescription(text)
                  }
                }}
                placeholder="z.B. 'Ton formeller gemacht', 'Ersten Absatz gekürzt'..."
                className="mt-2"
                rows={3}
                maxLength={25}
                autoFocus
                onKeyDown={(e) => {
                  // CMD+Enter oder Ctrl+Enter zum Speichern
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (!saving) {
                      handleSaveWithDescription();
                    }
                  }
                  // Escape zum Abbrechen
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelSave();
                  }
                }}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {versionDescription.length}/25 Zeichen
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelSave}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveWithDescription}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichere...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

