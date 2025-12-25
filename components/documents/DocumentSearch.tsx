"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, FileText, ExternalLink, Download, Eye } from "lucide-react"
import { format } from "date-fns"

interface SearchResult {
  id: number
  application_id: number
  filename: string
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_at: string
  created_at: string
  company: string
  position: string
  rank?: number | null
  snippet?: string | null
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  limit: number
  offset: number
}

export function DocumentSearch() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setResults([])
      setTotal(0)
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const response = await fetch(`/api/documents/search?q=${encodeURIComponent(query.trim())}`)
      if (response.ok) {
        const data: SearchResponse = await response.json()
        setResults(data.results || [])
        setTotal(data.total || 0)
      } else {
        console.error('Search failed')
        setResults([])
        setTotal(0)
      }
    } catch (error) {
      console.error('Error searching documents:', error)
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 500) // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, performSearch])

  const handleViewDocument = (applicationId: number, docId: number) => {
    window.open(`/api/applications/${applicationId}/documents/${docId}?view=true`, '_blank')
  }

  const handleDownloadDocument = (applicationId: number, docId: number, filename: string) => {
    const link = document.createElement('a')
    link.href = `/api/applications/${applicationId}/documents/${docId}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Dokumentensuche</CardTitle>
          <CardDescription>
            Durchsuchen Sie alle archivierten Bewerbungsdokumente über alle Bewerbungen hinweg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Suchbegriff eingeben..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Suche läuft...
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Keine Dokumente gefunden
              </div>
            )}

            {!loading && hasSearched && results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {total} {total === 1 ? 'Dokument gefunden' : 'Dokumente gefunden'}
                </p>
                <div className="space-y-3">
                  {results.map((result) => (
                    <Card key={result.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm truncate">{result.filename}</h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{result.company}</span>
                                  <span>•</span>
                                  <span>{result.position}</span>
                                  <span>•</span>
                                  <span>
                                    {result.uploaded_at
                                      ? format(new Date(result.uploaded_at), 'dd.MM.yyyy')
                                      : ''}
                                  </span>
                                </div>
                                {result.snippet && (
                                  <div
                                    className="mt-2 text-xs text-muted-foreground line-clamp-2"
                                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(result.application_id, result.id)}
                                className="h-8 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ansehen
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDownloadDocument(
                                    result.application_id,
                                    result.id,
                                    result.filename
                                  )
                                }
                                className="h-8 text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/dashboard/${result.application_id}`)}
                                className="h-8 text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Zur Bewerbung
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!hasSearched && (
              <div className="text-center py-8 text-muted-foreground">
                Geben Sie einen Suchbegriff ein, um Dokumente zu durchsuchen
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


