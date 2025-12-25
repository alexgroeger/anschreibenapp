"use client"

import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, X } from "lucide-react"
import { isSupportedFileType } from "@/lib/file-utils"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onTextInput?: (text: string) => void
  accept?: string
  maxSize?: number // in MB
}

export function FileUpload({ 
  onFileSelect, 
  onTextInput,
  accept = ".pdf,.txt,.docx,.doc",
  maxSize = 10
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const validateFile = (file: File): boolean => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      setError(`Datei ist zu groß. Maximale Größe: ${maxSize}MB`)
      return false
    }

    // Check file type
    if (!isSupportedFileType(file)) {
      setError("Nicht unterstütztes Dateiformat. Bitte verwenden Sie PDF, TXT oder DOCX.")
      return false
    }

    setError(null)
    return true
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Datei hier ablegen oder{" "}
                <button
                  type="button"
                  onClick={handleClick}
                  className="text-primary hover:underline"
                >
                  durchsuchen
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Unterstützte Formate: PDF, TXT, DOCX (max. {maxSize}MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {onTextInput && (
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            Oder geben Sie eine URL oder Text ein:
          </p>
          <textarea
            className="w-full min-h-[100px] p-3 border rounded-md resize-none"
            placeholder="URL oder Text der Stellenausschreibung..."
            onChange={(e) => onTextInput(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

