"use client"

import { useState, useEffect } from "react"
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
import Link from "next/link"

export default function Home() {
  const router = useRouter()
  const [jobInput, setJobInput] = useState("")
  const [tone, setTone] = useState("professionell")
  const [focus, setFocus] = useState("skills")
  const [extraction, setExtraction] = useState<any>(null)
  const [matchResult, setMatchResult] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'extracted' | 'matched' | 'generated'>('input')
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [saving, setSaving] = useState(false)

  const handleExtract = async () => {
    if (!jobInput.trim()) {
      alert('Bitte geben Sie eine Jobbeschreibung ein.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription: jobInput }),
      })

      if (response.ok) {
        const data = await response.json()
        setExtraction(data.extraction)
        setStep('extracted')
        
        // Try to extract company and position from job description
        if (data.extraction) {
          // Simple extraction - could be improved
          const lines = jobInput.split('\n')
          for (const line of lines) {
            if (line.toLowerCase().includes('unternehmen') || line.toLowerCase().includes('firma')) {
              setCompany(line.replace(/.*unternehmen[:\s]+/i, '').replace(/.*firma[:\s]+/i, '').trim())
            }
            if (line.toLowerCase().includes('position') || line.toLowerCase().includes('stelle')) {
              setPosition(line.replace(/.*position[:\s]+/i, '').replace(/.*stelle[:\s]+/i, '').trim())
            }
          }
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler bei der Extraktion')
      }
    } catch (error) {
      console.error('Error extracting:', error)
      alert('Fehler bei der Extraktion')
    } finally {
      setLoading(false)
    }
  }

  const handleMatch = async () => {
    if (!extraction) {
      alert('Bitte führen Sie zuerst eine Extraktion durch.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription: jobInput }),
      })

      if (response.ok) {
        const data = await response.json()
        setMatchResult(data.matchResult)
        setStep('matched')
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler beim Matching')
      }
    } catch (error) {
      console.error('Error matching:', error)
      alert('Fehler beim Matching')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!matchResult) {
      alert('Bitte führen Sie zuerst ein Matching durch.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchResult,
          jobDescription: jobInput,
          tone,
          focus,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCoverLetter(data.coverLetter)
        setStep('generated')
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler bei der Generierung')
      }
    } catch (error) {
      console.error('Error generating:', error)
      alert('Fehler bei der Generierung')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveApplication = async () => {
    if (!company.trim() || !position.trim() || !coverLetter.trim()) {
      alert('Bitte füllen Sie alle Felder aus.')
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
          job_description: jobInput,
          extraction_data: extraction,
          cover_letter: coverLetter,
          status: 'rueckmeldung_ausstehend',
          contacts: extraction?.contacts || [],
        }),
      })

      if (response.ok) {
        const data = await response.json()
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

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          AI Cover Letter Architect
        </h1>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Hinweis:</strong> Bitte laden Sie zuerst Ihren Lebenslauf auf der{" "}
            <Link href="/resume" className="underline font-semibold">
              Lebenslauf-Seite
            </Link>{" "}
            hoch. Dieser wird automatisch für Matching und Generierung verwendet.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Links: Input-Bereich */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Eingaben</CardTitle>
                <CardDescription>
                  Geben Sie die Jobbeschreibung ein
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job">Job-URL oder Text</Label>
                  <Textarea
                    id="job"
                    placeholder="Fügen Sie hier die Job-URL oder den Job-Text ein..."
                    value={jobInput}
                    onChange={(e) => setJobInput(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>

                <Button 
                  onClick={handleExtract} 
                  className="w-full"
                  disabled={!jobInput.trim() || loading}
                >
                  {loading ? 'Analysiere...' : 'Job analysieren'}
                </Button>
              </CardContent>
            </Card>

            {extraction && (
              <Card>
                <CardHeader>
                  <CardTitle>Extraktionsdaten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {extraction.keyRequirements && (
                    <div>
                      <Label className="font-semibold">Key Requirements</Label>
                      <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded mt-1">
                        {extraction.keyRequirements}
                      </div>
                    </div>
                  )}
                  {extraction.contacts && extraction.contacts.length > 0 && (
                    <div>
                      <Label className="font-semibold">Kontaktpersonen</Label>
                      <div className="space-y-2 mt-1">
                        {extraction.contacts.map((contact: any, idx: number) => (
                          <div key={idx} className="text-sm bg-muted p-2 rounded">
                            <div><strong>{contact.name}</strong></div>
                            {contact.position && <div>{contact.position}</div>}
                            {contact.email && <div>📧 {contact.email}</div>}
                            {contact.phone && <div>📞 {contact.phone}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={handleMatch} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Matche...' : 'Matching durchführen'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {matchResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Matching-Ergebnis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded max-h-64 overflow-y-auto">
                    {matchResult}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rechts: Output-Bereich */}
          <div className="space-y-6">
            {/* Anschreiben-Editor Card */}
            <Card>
              <CardHeader>
                <CardTitle>Anschreiben-Editor</CardTitle>
                <CardDescription>
                  Generieren Sie Ihr individuelles Anschreiben
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

                <Button 
                  onClick={handleGenerate} 
                  className="w-full"
                  disabled={!matchResult || loading}
                >
                  {loading ? "Generiere..." : "Anschreiben generieren"}
                </Button>

                {coverLetter && (
                  <div className="space-y-2">
                    <Label>Generiertes Anschreiben</Label>
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {coverLetter && (
              <Card>
                <CardHeader>
                  <CardTitle>Bewerbung speichern</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Unternehmen *</Label>
                    <Input
                      id="company"
                      placeholder="Unternehmen"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      placeholder="Position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveApplication} 
                    className="w-full"
                    disabled={saving || !company.trim() || !position.trim()}
                  >
                    {saving ? 'Speichere...' : 'Bewerbung im Dashboard speichern'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
