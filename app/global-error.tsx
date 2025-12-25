'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error)
  }, [error])

  return (
    <html lang="de">
      <body>
        <div className="min-h-screen bg-background p-8 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <CardTitle>Kritischer Fehler</CardTitle>
              </div>
              <CardDescription>
                Ein kritischer Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error.message && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-1">Fehlerdetails:</p>
                  <p className="whitespace-pre-wrap">{error.message}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={reset} className="flex-1">
                  Erneut versuchen
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  Zur Startseite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

