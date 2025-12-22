"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { CoverLetterChat } from "@/components/cover-letter/CoverLetterChat"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload')
  const [jobText, setJobText] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [tone, setTone] = useState("professionell")
  const [focus, setFocus] = useState("skills")
  const [textLength, setTextLength] = useState("mittel")
  const [formality, setFormality] = useState("formal")
  const [emphasis, setEmphasis] = useState("kombiniert")
  const [extraction, setExtraction] = useState<any>(null)
  const [matchResult, setMatchResult] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<any>(null)
  const [showDecisionDialog, setShowDecisionDialog] = useState(false)

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

      if (response.ok) {
        const data = await response.json()
        setExtraction(data.extraction)
        setCurrentStep('extraction')
        setError(null)
        
        // If file was uploaded, store the extracted text for matching
        if (data.jobDescription) {
          setJobText(data.jobDescription)
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
        const data = await response.json()
        setError(data)
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

  const handleGenerate = async () => {
    if (!matchResult) {
      alert('Bitte führen Sie zuerst ein Matching durch.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchResult,
          jobDescription: jobText,
          tone,
          focus,
          textLength,
          formality,
          emphasis,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCoverLetter(data.coverLetter)
        // Nach Generierung direkt zum Entscheidungs-Dialog (decision Schritt)
        setCurrentStep('decision')
        setError(null)
        // Show decision dialog after generation
        setShowDecisionDialog(true)
      } else {
        const data = await response.json()
        setError(data)
      }
    } catch (error: any) {
      console.error('Error generating:', error)
      setError({
        error: error.message || 'Fehler bei der Generierung',
        type: 'UNKNOWN_ERROR',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveApplication = async () => {
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
          cover_letter: coverLetter,
          status: 'in_bearbeitung',
          contacts: extraction?.contacts || [],
          deadline: extraction?.deadline || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowDecisionDialog(false)
        // Direkt zur Detailseite der neuen Bewerbung weiterleiten
        router.push(`/dashboard/${data.application.id}`)
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Error saving application:', error)
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (currentStep === 'extraction') {
      setCurrentStep('upload')
    } else if (currentStep === 'matching') {
      setCurrentStep('extraction')
    } else if (currentStep === 'decision') {
      setCurrentStep('matching')
    }
  }

  const canGoBack = currentStep !== 'upload' && currentStep !== 'saved' && currentStep !== 'generation'

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
                } else if (currentStep === 'matching') {
                  handleGenerate()
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
                disabled={!jobText.trim() || loading}
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
                <CardTitle>Schritt 3: Matching-Ergebnis</CardTitle>
                <CardDescription>
                  Analyse der Übereinstimmung zwischen Ihrem Profil und der Stellenausschreibung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-y-auto">
                  <Markdown content={matchResult} />
                </div>
                <Button 
                  onClick={handleGenerate} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Generiere..." : "Weiter zur Generierung"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Generation (wird als 'decision' im Stepper angezeigt) */}
        {(currentStep === 'generation' || currentStep === 'decision') && coverLetter && (
          <div className="space-y-6">
            {canGoBack && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
            
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">Editor & Parameter</TabsTrigger>
                <TabsTrigger value="chat">KI-Chat</TabsTrigger>
              </TabsList>
              
              <TabsContent value="editor" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Anschreiben-Parameter</CardTitle>
                      <CardDescription>
                        Passen Sie die Generierungsparameter an
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tone">Tonalität</Label>
                          <Select value={tone} onValueChange={setTone}>
                            <SelectTrigger id="tone">
                              <SelectValue placeholder="Tonalität wählen" />
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
                            <SelectTrigger id="focus">
                              <SelectValue placeholder="Fokus wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skills">Skills</SelectItem>
                              <SelectItem value="motivation">Motivation</SelectItem>
                              <SelectItem value="erfahrung">Erfahrung</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="textLength">Textlänge</Label>
                        <Select value={textLength} onValueChange={setTextLength}>
                          <SelectTrigger id="textLength">
                            <SelectValue placeholder="Textlänge wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kurz">Kurz (200-300 Wörter)</SelectItem>
                            <SelectItem value="mittel">Mittel (300-400 Wörter)</SelectItem>
                            <SelectItem value="lang">Lang (400-500 Wörter)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="formality">Formalität</Label>
                        <Select value={formality} onValueChange={setFormality}>
                          <SelectTrigger id="formality">
                            <SelectValue placeholder="Formalität wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sehr_formal">Sehr formal</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="modern">Modern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emphasis">Betonung</Label>
                        <Select value={emphasis} onValueChange={setEmphasis}>
                          <SelectTrigger id="emphasis">
                            <SelectValue placeholder="Betonung wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skills">Skills</SelectItem>
                            <SelectItem value="motivation">Motivation</SelectItem>
                            <SelectItem value="erfahrung">Erfahrung</SelectItem>
                            <SelectItem value="kombiniert">Kombiniert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleGenerate} 
                        className="w-full"
                        disabled={loading}
                        variant="outline"
                      >
                        {loading ? "Regeneriere..." : "Anschreiben neu generieren"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Generiertes Anschreiben</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="min-h-[500px] font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="chat" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Anschreiben</CardTitle>
                      <CardDescription>
                        Aktuelles Anschreiben (bearbeitbar)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="min-h-[500px] font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                  
                  <div className="h-[600px]">
                    <CoverLetterChat
                      coverLetter={coverLetter}
                      matchResult={matchResult}
                      jobDescription={jobText}
                      extraction={extraction}
                      onCoverLetterUpdate={(newCoverLetter) => {
                        setCoverLetter(newCoverLetter)
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Decision Dialog */}
        <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bewerbung speichern?</DialogTitle>
              <DialogDescription>
                Möchten Sie diese Bewerbung in Ihrem Dashboard speichern?
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
                  setShowDecisionDialog(false)
                  setCurrentStep('decision')
                }}
              >
                Nein, nur anzeigen
              </Button>
              <Button
                onClick={handleSaveApplication}
                disabled={saving || !company.trim() || !position.trim()}
              >
                {saving ? 'Speichere...' : 'Ja, speichern'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
