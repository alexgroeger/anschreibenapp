"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorMessage } from "@/components/ErrorMessage"
import { FileUpload } from "@/components/ui/file-upload"
import { ExtractionDisplay } from "@/components/extraction/ExtractionDisplay"
import { Markdown } from "@/components/ui/markdown"
import { WorkflowStepper, type WorkflowStep } from "@/components/workflow/WorkflowStepper"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function BewerbungHinzufuegenPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload')
  const [jobText, setJobText] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extraction, setExtraction] = useState<any>(null)
  const [documentInfo, setDocumentInfo] = useState<{ filename: string; path: string; type: string } | null>(null)
  const [matchResult, setMatchResult] = useState("")
  const [matchScore, setMatchScore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<any>(null)
  const [showCreateApplicationDialog, setShowCreateApplicationDialog] = useState(false)

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
    setError(null)
    // File will be parsed on the server when extracting
  }

  const handleTextInput = (text: string) => {
    setJobText(text)
    setUploadedFile(null)
  }

  const handleExtract = async () => {
    if (!jobText.trim() && !uploadedFile) {
      alert('Bitte geben Sie eine Jobbeschreibung ein oder laden Sie eine Datei hoch.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      let response
      
      if (uploadedFile) {
        // File upload via FormData
        const formData = new FormData()
        formData.append('file', uploadedFile)
        
        response = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Text input via JSON
        response = await fetch('/api/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription: jobText }),
        })
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      const isJson = contentType && contentType.includes('application/json')
      
      if (response.ok) {
        if (!isJson) {
          const text = await response.text()
          console.error('Non-JSON response:', text.substring(0, 200))
          setError({
            error: 'Server returned invalid response format',
            type: 'UNKNOWN_ERROR',
          })
          return
        }
        
        const data = await response.json()
        setExtraction(data.extraction)
        setCurrentStep('extraction')
        setError(null)
        
        // If file was uploaded, store the extracted text for matching
        if (data.jobDescription) {
          setJobText(data.jobDescription)
        }
        
        // Store document info if available
        if (data.documentInfo) {
          setDocumentInfo(data.documentInfo)
        }
        
        // Extract company and position from extraction data
        if (data.extraction) {
          // Set company if available, otherwise try to extract from job text
          if (data.extraction.company && data.extraction.company.trim()) {
            setCompany(data.extraction.company.trim())
          } else {
            // Fallback: Try to extract company name from job description
            const companyMatch = jobText.match(/(?:bei|für|von)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/i) ||
                                 jobText.match(/([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)\s+(?:sucht|stellt ein|bietet)/i)
            if (companyMatch && companyMatch[1]) {
              setCompany(companyMatch[1].trim())
            }
          }
          
          // Set position if available, otherwise try to extract from job text
          if (data.extraction.position && data.extraction.position.trim()) {
            setPosition(data.extraction.position.trim())
          } else {
            // Fallback: Try to extract position from common patterns
            const positionPatterns = [
              /(?:als|Position:|Stelle:)\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zäöüß]+)*)/i,
              /([A-ZÄÖÜ][a-zäöüß]+\s+(?:Engineer|Manager|Developer|Designer|Analyst|Consultant|Specialist|Coordinator|Assistent))/i,
              /(?:Wir suchen|Gesucht wird)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zäöüß]+)*)/i
            ]
            
            for (const pattern of positionPatterns) {
              const match = jobText.match(pattern)
              if (match && match[1]) {
                setPosition(match[1].trim())
                break
              }
            }
          }
        }
      } else {
        // Try to parse error as JSON, fallback to text
        let errorData
        try {
          if (isJson) {
            errorData = await response.json()
          } else {
            const text = await response.text()
            errorData = {
              error: `Server error: ${response.status} ${response.statusText}`,
              details: text.substring(0, 500),
              type: 'HTTP_ERROR',
            }
          }
        } catch (parseError) {
          errorData = {
            error: `Server error: ${response.status} ${response.statusText}`,
            type: 'HTTP_ERROR',
          }
        }
        setError(errorData)
      }
    } catch (error: any) {
      console.error('Error extracting:', error)
      setError({
        error: error.message || 'Fehler bei der Extraktion',
        type: 'UNKNOWN_ERROR',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMatch = async () => {
    if (!extraction) {
      alert('Bitte führen Sie zuerst eine Extraktion durch.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription: jobText }),
      })

      if (response.ok) {
        const data = await response.json()
        setMatchResult(data.matchResult)
        setMatchScore(data.matchScore || null)
        setCurrentStep('matching')
        setError(null)
      } else {
        const data = await response.json()
        setError(data)
      }
    } catch (error: any) {
      console.error('Error matching:', error)
      setError({
        error: error.message || 'Fehler beim Matching',
        type: 'UNKNOWN_ERROR',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApplication = async () => {
    if (!company.trim() || !position.trim()) {
      alert('Bitte geben Sie Unternehmen und Position ein.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: company.trim(),
          position: position.trim(),
          job_description: jobText,
          extraction_data: extraction,
          match_result: matchResult,
          match_score: matchScore,
          cover_letter: null, // Kein Anschreiben beim Erstellen
          status: 'in_bearbeitung',
          contacts: extraction?.contacts || [],
          deadline: extraction?.deadline || null,
          document_info: documentInfo,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateApplicationDialog(false)
        // Direkt zur Detailseite der neuen Bewerbung weiterleiten
        router.push(`/dashboard/${data.application.id}`)
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler beim Erstellen der Bewerbung')
      }
    } catch (error) {
      console.error('Error creating application:', error)
      alert('Fehler beim Erstellen der Bewerbung')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (currentStep === 'extraction') {
      setCurrentStep('upload')
    } else if (currentStep === 'matching') {
      setCurrentStep('extraction')
    }
  }

  const canGoBack = currentStep !== 'upload' && currentStep !== 'saved'

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Workflow Stepper */}
        <div className="mb-4">
          <WorkflowStepper currentStep={currentStep} />
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage 
              error={error} 
              onRetry={() => {
                setError(null)
                if (currentStep === 'upload') {
                  handleExtract()
                } else if (currentStep === 'extraction') {
                  handleMatch()
                }
              }}
            />
          </div>
        )}

        {/* Step 1: Upload/Input */}
        {currentStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Schritt 1: Stellenausschreibung hochladen</CardTitle>
              <CardDescription>
                Laden Sie eine Datei hoch oder geben Sie eine URL oder Text ein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFileSelect={handleFileSelect}
                onTextInput={handleTextInput}
              />
              <Button 
                onClick={handleExtract} 
                className="w-full"
                disabled={(!jobText.trim() && !uploadedFile) || loading}
              >
                {loading ? 'Analysiere...' : 'Weiter zur Extraktion'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Extraction */}
        {currentStep === 'extraction' && extraction && (
          <Card>
            <CardHeader>
              <CardTitle>Schritt 2: Extraktionsdaten</CardTitle>
              <CardDescription>
                Überprüfen Sie die extrahierten Informationen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExtractionDisplay
                extraction={extraction}
                onProceed={handleMatch}
                onBack={handleBack}
                canGoBack={canGoBack}
                onExtractionChange={(updatedExtraction) => {
                  setExtraction(updatedExtraction)
                  // Update company and position if changed
                  if (updatedExtraction.company) {
                    setCompany(updatedExtraction.company)
                  }
                  if (updatedExtraction.position) {
                    setPosition(updatedExtraction.position)
                  }
                }}
                loading={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Matching */}
        {currentStep === 'matching' && matchResult && (
          <div className="space-y-6">
            {canGoBack && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Schritt 3: Matching-Ergebnis</CardTitle>
                    <CardDescription>
                      Analyse der Übereinstimmung zwischen Ihrem Profil und der Stellenausschreibung
                    </CardDescription>
                  </div>
                  {matchScore && (
                    <Badge 
                      variant={
                        matchScore === 'nicht_passend' ? 'destructive' :
                        matchScore === 'mittel' ? 'outline' :
                        matchScore === 'gut' ? 'secondary' :
                        undefined
                      }
                      className={
                        matchScore === 'sehr_gut' 
                          ? 'border-transparent bg-green-500 text-white hover:bg-green-600'
                          : undefined
                      }
                    >
                      Passung: {matchScore === 'nicht_passend' ? 'Nicht passend' :
                        matchScore === 'mittel' ? 'Mittel' :
                        matchScore === 'gut' ? 'Gut' :
                        matchScore === 'sehr_gut' ? 'Sehr gut' :
                        matchScore}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-y-auto">
                  <Markdown content={matchResult} />
                </div>
                <Button 
                  onClick={() => setShowCreateApplicationDialog(true)}
                  className="w-full"
                  disabled={loading}
                >
                  Neue Bewerbung erstellen?
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Application Dialog */}
        <Dialog open={showCreateApplicationDialog} onOpenChange={setShowCreateApplicationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Bewerbung erstellen?</DialogTitle>
              <DialogDescription>
                Möchten Sie eine neue Bewerbung in Ihrem Dashboard erstellen? Das Anschreiben können Sie später auf der Detailseite erstellen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-company">Unternehmen *</Label>
                <Input
                  id="dialog-company"
                  placeholder={extraction?.company ? `Vorschlag: ${extraction.company}` : "Unternehmen"}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                {extraction?.company && !company && (
                  <p className="text-xs text-muted-foreground">
                    Vorschlag aus Extraktion: {extraction.company}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-position">Position *</Label>
                <Input
                  id="dialog-position"
                  placeholder={extraction?.position ? `Vorschlag: ${extraction.position}` : "Position"}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
                {extraction?.position && !position && (
                  <p className="text-xs text-muted-foreground">
                    Vorschlag aus Extraktion: {extraction.position}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateApplicationDialog(false)
                }}
              >
                Nein, abbrechen
              </Button>
              <Button
                onClick={handleCreateApplication}
                disabled={saving || !company.trim() || !position.trim()}
              >
                {saving ? 'Erstelle...' : 'Ja, Bewerbung erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}

