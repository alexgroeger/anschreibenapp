"use client"

import { useState, useEffect } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Home() {
  const [resume, setResume] = useState("")
  const [jobInput, setJobInput] = useState("")
  const [tone, setTone] = useState("professionell")
  const [focus, setFocus] = useState("skills")
  const [analysis, setAnalysis] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const { completion, complete, isLoading } = useCompletion({
    api: '/api/generate',
    onFinish: () => {
      setIsGenerating(false)
    },
    onError: (error) => {
      console.error('Fehler bei der Generierung:', error)
      setIsGenerating(false)
    }
  })

  const handleAnalyze = () => {
    // TODO: Implement API call for job analysis
    setAnalysis("Job-Analyse wird hier angezeigt...")
  }

  const handleGenerate = async () => {
    if (!resume || !jobInput) {
      return
    }

    setIsGenerating(true)
    
    try {
      // useCompletion erwartet den Body als zweiten Parameter
      await complete('', {
        body: {
          cvText: resume,
          jobDescription: jobInput,
          tone: tone,
          focus: focus
        }
      })
    } catch (error) {
      console.error('Fehler:', error)
      setIsGenerating(false)
    }
  }

  // Bearbeitbarer State für das Anschreiben nach der Generierung
  const [editableCoverLetter, setEditableCoverLetter] = useState("")
  
  // Synchronisiere completion mit editableCoverLetter
  useEffect(() => {
    if (completion) {
      setEditableCoverLetter(completion)
    }
  }, [completion])

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          AI Cover Letter Architect
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Links: Input-Bereich */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Eingaben</CardTitle>
                <CardDescription>
                  Geben Sie Ihren Lebenslauf und die Jobbeschreibung ein
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resume">Lebenslauf</Label>
                  <Textarea
                    id="resume"
                    placeholder="Fügen Sie hier Ihren Lebenslauf ein..."
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="job">Job-URL oder Text</Label>
                  <Textarea
                    id="job"
                    placeholder="Fügen Sie hier die Job-URL oder den Job-Text ein..."
                    value={jobInput}
                    onChange={(e) => setJobInput(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>

                <Button 
                  onClick={handleAnalyze} 
                  className="w-full"
                  disabled={!resume || !jobInput}
                >
                  Job analysieren
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Rechts: Output-Bereich */}
          <div className="space-y-6">
            {/* Job-Analyse Card */}
            <Card>
              <CardHeader>
                <CardTitle>Job-Analyse</CardTitle>
                <CardDescription>
                  Analyse der Jobbeschreibung
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis ? (
                  <div className="text-sm whitespace-pre-wrap">
                    {analysis}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Klicken Sie auf &quot;Job analysieren&quot; um die Analyse zu starten.
                  </p>
                )}
              </CardContent>
            </Card>

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
                  disabled={!resume || !jobInput || isGenerating || isLoading}
                >
                  {isGenerating || isLoading ? "Generiere..." : "Anschreiben generieren"}
                </Button>

                {(completion || isGenerating || isLoading || editableCoverLetter) && (
                  <div className="space-y-2">
                    <Label>Generiertes Anschreiben</Label>
                    <Textarea
                      value={isGenerating || isLoading ? completion : editableCoverLetter}
                      onChange={(e) => {
                        // Erlaube manuelle Bearbeitung nach der Generierung
                        if (!isGenerating && !isLoading) {
                          setEditableCoverLetter(e.target.value)
                        }
                      }}
                      className="min-h-[300px] font-mono text-sm"
                      readOnly={isGenerating || isLoading}
                    />
                    {(isGenerating || isLoading) && (
                      <p className="text-xs text-muted-foreground">
                        Generiere Anschreiben...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
