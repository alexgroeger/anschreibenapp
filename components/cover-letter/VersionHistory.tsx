"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { History, RotateCcw } from "lucide-react"

export interface Version {
  id: number
  application_id: number
  content: string
  version_number: number
  created_at: string
  created_by: string
  description?: string | null
}

interface VersionHistoryProps {
  versions: Version[]
  currentVersionId: number | null
  onVersionSelect: (version: Version) => void
  onRestore: (version: Version) => Promise<void>
  loading?: boolean
}

export function VersionHistory({
  versions,
  currentVersionId,
  onVersionSelect,
  onRestore,
  loading = false,
}: VersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Noch keine Versionen vorhanden</p>
        </CardContent>
      </Card>
  )
  }

  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId)
    const version = versions.find(v => v.id.toString() === versionId)
    if (version) {
      onVersionSelect(version)
    }
  }

  const handleRestore = async () => {
    if (!selectedVersionId) return
    const version = versions.find(v => v.id.toString() === selectedVersionId)
    if (version) {
      await onRestore(version)
      setSelectedVersionId("")
    }
  }

  const selectedVersion = selectedVersionId
    ? versions.find(v => v.id.toString() === selectedVersionId)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Versionshistorie
        </CardTitle>
        <CardDescription>
          {versions.length} Version{versions.length !== 1 ? 'en' : ''} verfügbar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Version auswählen</label>
          <Select
            value={selectedVersionId || (currentVersionId?.toString() || "")}
            onValueChange={handleVersionChange}
            disabled={loading}
          >
            <SelectTrigger className="h-auto min-h-[2.5rem] py-2">
              {(() => {
                const displayVersion = versions.find(
                  v => v.id.toString() === (selectedVersionId || currentVersionId?.toString() || "")
                )
                if (!displayVersion) {
                  return <span className="text-muted-foreground">Version wählen...</span>
                }
                return (
                  <div className="flex items-center gap-2 w-full text-left">
                    <span className="font-medium">
                      Version {displayVersion.version_number}
                      {displayVersion.id === currentVersionId && " (Aktuell)"}
                    </span>
                    {displayVersion.description && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground italic flex-1 truncate" title={displayVersion.description}>
                          {displayVersion.description.length > 25 ? displayVersion.description.substring(0, 25) + '...' : displayVersion.description}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                      {format(new Date(displayVersion.created_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                )
              })()}
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => {
                const displayText = `Version ${version.version_number}${version.id === currentVersionId ? " (Aktuell)" : ""}${version.description ? ` • ${version.description}` : ""} • ${format(new Date(version.created_at), 'dd.MM.yyyy HH:mm')}`
                return (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">
                        Version {version.version_number}
                        {version.id === currentVersionId && " (Aktuell)"}
                      </span>
                      {version.description && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground italic flex-1 truncate" title={version.description}>
                            {version.description.length > 25 ? version.description.substring(0, 25) + '...' : version.description}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {format(new Date(version.created_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedVersion && selectedVersion.id !== currentVersionId && (
          <Button
            onClick={handleRestore}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Zu dieser Version zurückkehren
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Die neueste Version ist Version {versions[0]?.version_number || 0}</p>
        </div>
      </CardContent>
    </Card>
  )
}

