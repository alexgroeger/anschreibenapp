"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Sparkles, ExternalLink } from "lucide-react"
import { extractCompanyWebsite } from "@/lib/website-utils"

interface MotivationQuestionsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (answers: {
    motivation_position: string
    motivation_company: string
    company_website?: string
    company_website_content?: string
  }) => Promise<void>
  applicationId: number
  company: string
  position: string
  jobDescription: string | null
  existingAnswers?: {
    motivation_position: string | null
    motivation_company: string | null
    company_website: string | null
    company_website_content: string | null
  }
}

export function MotivationQuestionsDialog({
  isOpen,
  onClose,
  onSave,
  applicationId,
  company,
  position,
  jobDescription,
  existingAnswers,
}: MotivationQuestionsDialogProps) {
  const [motivationPosition, setMotivationPosition] = useState("")
  const [motivationCompany, setMotivationCompany] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [companyWebsiteContent, setCompanyWebsiteContent] = useState("")
  const [generatingPosition, setGeneratingPosition] = useState(false)
  const [generatingCompany, setGeneratingCompany] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extractingWebsite, setExtractingWebsite] = useState(false)
  const [scrapingWebsite, setScrapingWebsite] = useState(false)

  // Load existing answers when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (existingAnswers) {
        setMotivationPosition(existingAnswers.motivation_position || "")
        setMotivationCompany(existingAnswers.motivation_company || "")
        setCompanyWebsite(existingAnswers.company_website || "")
        setCompanyWebsiteContent(existingAnswers.company_website_content || "")
      } else {
        // Try to load from API
        loadExistingAnswers()
      }
      
      // Try to extract website from job description
      if (jobDescription && !existingAnswers?.company_website) {
        extractWebsiteFromJobDescription()
      }
      
      // If website URL exists but no content, try to scrape
      const websiteUrl = existingAnswers?.company_website || companyWebsite
      if (websiteUrl && !existingAnswers?.company_website_content) {
        scrapeWebsiteContent(websiteUrl)
      }
    }
  }, [isOpen, existingAnswers, jobDescription])

  const loadExistingAnswers = async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/motivation-questions`)
      if (response.ok) {
        const data = await response.json()
        setMotivationPosition(data.motivation_position || "")
        setMotivationCompany(data.motivation_company || "")
        setCompanyWebsite(data.company_website || "")
        setCompanyWebsiteContent(data.company_website_content || "")
        
        // If website URL exists but no content, try to scrape
        if (data.company_website && !data.company_website_content) {
          scrapeWebsiteContent(data.company_website)
        }
      }
    } catch (error) {
      console.error('Error loading existing answers:', error)
    }
  }

  const extractWebsiteFromJobDescription = async () => {
    if (!jobDescription) return
    
    setExtractingWebsite(true)
    try {
      const website = extractCompanyWebsite(jobDescription, company)
      if (website) {
        setCompanyWebsite(website)
        // Auto-save the extracted website
        try {
          await fetch(`/api/applications/${applicationId}/motivation-questions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_website: website,
            }),
          })
          // After saving URL, scrape the content
          await scrapeWebsiteContent(website)
        } catch (error) {
          console.error('Error saving extracted website:', error)
        }
      }
    } catch (error) {
      console.error('Error extracting website:', error)
    } finally {
      setExtractingWebsite(false)
    }
  }

  const scrapeWebsiteContent = async (url: string) => {
    if (!url || !url.trim()) return
    
    setScrapingWebsite(true)
    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          setCompanyWebsiteContent(data.content)
          // Auto-save the scraped content
          try {
            const saveResponse = await fetch(`/api/applications/${applicationId}/motivation-questions`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_website_content: data.content,
              }),
            })
            if (!saveResponse.ok) {
              throw new Error('Fehler beim Speichern der Website-Inhalte')
            }
          } catch (error) {
            console.error('Error saving scraped content:', error)
            alert('Website-Inhalte wurden extrahiert, aber konnten nicht gespeichert werden. Bitte speichern Sie manuell.')
          }
        } else {
          alert('Keine Inhalte von der Website gefunden.')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Durchsuchen der Website')
      }
    } catch (error: any) {
      console.error('Error scraping website:', error)
      alert(error.message || 'Fehler beim Durchsuchen der Website')
    } finally {
      setScrapingWebsite(false)
    }
  }

  const handleGenerateSuggestion = async (questionType: 'position' | 'company') => {
    if (questionType === 'position') {
      setGeneratingPosition(true)
    } else {
      setGeneratingCompany(true)
    }

    try {
      // Ensure we have the latest website URL (might have been updated)
      const currentWebsite = companyWebsite || ''
      
      const response = await fetch('/api/motivation-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType,
          applicationId,
          companyWebsite: currentWebsite || undefined,
          jobDescription: jobDescription || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Vorschlags')
      }

      const data = await response.json()
      const suggestion = data.suggestion

      if (questionType === 'position') {
        setMotivationPosition(suggestion)
      } else {
        setMotivationCompany(suggestion)
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

  const handleSave = async () => {
    if (!motivationPosition.trim() || !motivationCompany.trim()) {
      alert('Bitte beantworten Sie beide Fragen.')
      return
    }

    setSaving(true)
    try {
      // First save to API to ensure data is persisted
      const saveResponse = await fetch(`/api/applications/${applicationId}/motivation-questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivation_position: motivationPosition.trim(),
          motivation_company: motivationCompany.trim(),
          company_website: companyWebsite.trim() || null,
          company_website_content: companyWebsiteContent.trim() || null,
        }),
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Speichern der Antworten')
      }

      // Then call onSave callback (which will trigger generation)
      await onSave({
        motivation_position: motivationPosition.trim(),
        motivation_company: motivationCompany.trim(),
        company_website: companyWebsite.trim() || undefined,
        company_website_content: companyWebsiteContent.trim() || undefined,
      })
      onClose()
    } catch (error: any) {
      console.error('Error saving motivation answers:', error)
      alert(error.message || 'Fehler beim Speichern')
      setSaving(false)
    }
  }

  const canSave = motivationPosition.trim().length > 0 && motivationCompany.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Motivationsfragen</DialogTitle>
          <DialogDescription>
            Bitte beantworten Sie diese Fragen, damit wir ein passendes Anschreiben für Sie erstellen können.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Website */}
          <div className="space-y-2">
            <Label htmlFor="company-website">
              Unternehmenswebsite (optional)
              {extractingWebsite && (
                <span className="ml-2 text-sm text-muted-foreground">Wird extrahiert...</span>
              )}
              {scrapingWebsite && (
                <span className="ml-2 text-sm text-muted-foreground">Wird durchsucht...</span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="company-website"
                value={companyWebsite}
                onChange={async (e) => {
                  const newUrl = e.target.value
                  setCompanyWebsite(newUrl)
                  // Auto-scrape when URL is entered and valid
                  if (newUrl.trim() && newUrl.trim().startsWith('http')) {
                    await scrapeWebsiteContent(newUrl.trim())
                  }
                }}
                placeholder="https://www.unternehmen.de"
                className="flex-1"
              />
              {companyWebsite && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(companyWebsite, '_blank')}
                    title="Website öffnen"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrapeWebsiteContent(companyWebsite)}
                    disabled={scrapingWebsite}
                    title="Website-Inhalte aktualisieren"
                  >
                    {scrapingWebsite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Die Website wird verwendet, um bessere KI-Vorschläge zu generieren.
            </p>
          </div>

          {/* Extracted Website Content */}
          {companyWebsiteContent && (
            <div className="space-y-2">
              <Label htmlFor="company-website-content">
                Extrahierte Informationen aus Unternehmenswebsite
              </Label>
              <Textarea
                id="company-website-content"
                value={companyWebsiteContent}
                onChange={(e) => setCompanyWebsiteContent(e.target.value)}
                placeholder="Extrahierte Website-Inhalte..."
                className="min-h-[150px] font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Diese Informationen wurden automatisch von der Website extrahiert und können bearbeitet werden.
              </p>
            </div>
          )}

          {/* Question 1 */}
          <div className="space-y-2">
            <Label htmlFor="motivation-position">
              Warum begeistert dich die ausgeschrieben Stelle?
            </Label>
            <div className="space-y-2">
              <Textarea
                id="motivation-position"
                value={motivationPosition}
                onChange={(e) => setMotivationPosition(e.target.value)}
                placeholder="z.B. Die Position bietet mir die Möglichkeit, meine Erfahrung in React und TypeScript einzubringen und gleichzeitig neue Technologien zu lernen..."
                className="min-h-[100px]"
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateSuggestion('position')}
                disabled={generatingPosition}
                className="w-full"
              >
                {generatingPosition ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generiere Vorschlag...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    KI-Vorschlag generieren
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Question 2 */}
          <div className="space-y-2">
            <Label htmlFor="motivation-company">
              Was begeistert dich an dem Unternehmen oder warum möchtest du speziell in dem Themenfeld arbeiten?
            </Label>
            <div className="space-y-2">
              <Textarea
                id="motivation-company"
                value={motivationCompany}
                onChange={(e) => setMotivationCompany(e.target.value)}
                placeholder="z.B. Das Unternehmen steht für Innovation und Nachhaltigkeit, was mit meinen Werten übereinstimmt..."
                className="min-h-[100px]"
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateSuggestion('company')}
                disabled={generatingCompany}
                className="w-full"
              >
                {generatingCompany ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generiere Vorschlag...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    KI-Vorschlag generieren
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              'Speichern und fortfahren'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
