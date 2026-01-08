"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function UserProfileForm() {
  const [valuesMotivation, setValuesMotivation] = useState("")
  const [softSkills, setSoftSkills] = useState("")
  const [workStyleAbilities, setWorkStyleAbilities] = useState("")
  const [developmentDirection, setDevelopmentDirection] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user-profile')
      const data = await response.json()
      if (data.userProfile) {
        setValuesMotivation(data.userProfile.values_motivation || "")
        setSoftSkills(data.userProfile.soft_skills || "")
        setWorkStyleAbilities(data.userProfile.work_style_abilities || "")
        setDevelopmentDirection(data.userProfile.development_direction || "")
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values_motivation: valuesMotivation,
          soft_skills: softSkills,
          work_style_abilities: workStyleAbilities,
          development_direction: developmentDirection,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Nutzerprofil erfolgreich gespeichert!' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Speichern' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern des Nutzerprofils' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Nutzerprofil...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutzerprofil verwalten</CardTitle>
        <CardDescription>
          Ergänzen Sie Ihre persönlichen Informationen. Diese werden automatisch bei jedem Matching und jeder Generierung verwendet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="values_motivation">Was sind meine Werte und welche Themen motivieren mich besonders?</Label>
          <Textarea
            id="values_motivation"
            placeholder="Beschreiben Sie Ihre Werte und motivierenden Themen..."
            value={valuesMotivation}
            onChange={(e) => setValuesMotivation(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="soft_skills">Welche besonderen Softskills bringe ich mit?</Label>
          <Textarea
            id="soft_skills"
            placeholder="Beschreiben Sie Ihre besonderen Soft Skills..."
            value={softSkills}
            onChange={(e) => setSoftSkills(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="work_style_abilities">Was zeichnet meine Arbeitsweise besonders aus und welche besonderen Fähigkeiten bringe ich mit?</Label>
          <Textarea
            id="work_style_abilities"
            placeholder="Beschreiben Sie Ihre Arbeitsweise und besonderen Fähigkeiten..."
            value={workStyleAbilities}
            onChange={(e) => setWorkStyleAbilities(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="development_direction">In welche Richtung möchte ich mich die nächsten Jahre weiterentwickeln?</Label>
          <Textarea
            id="development_direction"
            placeholder="Beschreiben Sie Ihre Entwicklungsrichtung..."
            value={developmentDirection}
            onChange={(e) => setDevelopmentDirection(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={saving}
        >
          {saving ? 'Speichere...' : 'Nutzerprofil speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
