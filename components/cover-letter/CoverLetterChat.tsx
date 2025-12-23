"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Send, Loader2 } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"
import { parseParagraphs, findParagraphContainingText } from "@/lib/paragraph-parser"
import type { Suggestion } from "./SuggestionList"

interface CoverLetterChatProps {
  coverLetter: string
  matchResult: string
  jobDescription: string
  extraction?: any
  onCoverLetterUpdate?: (newCoverLetter: string) => void
  onSuggestionCreated?: (suggestion: Omit<Suggestion, 'id' | 'application_id' | 'created_at'>) => void
  onPendingChanges?: (newCoverLetter: string, originalCoverLetter: string) => void
}

export function CoverLetterChat({
  coverLetter,
  matchResult,
  jobDescription,
  extraction,
  onCoverLetterUpdate,
  onSuggestionCreated,
  onPendingChanges,
}: CoverLetterChatProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const originalCoverLetterRef = useRef<string>(coverLetter)

  // Update original cover letter ref when coverLetter prop changes
  useEffect(() => {
    originalCoverLetterRef.current = coverLetter
  }, [coverLetter])

  const { messages, sendMessage, status, error } = useChat({
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
    api: '/api/chat',
    body: () => ({
      coverLetter,
      matchResult,
      jobDescription,
      extraction,
    }),
    onError: (error: Error) => {
      console.error('Chat error:', error)
    },
    onFinish: (result: any) => {
      console.log('Chat message finished:', result)
      console.log('Result structure:', {
        hasMessage: !!result.message,
        hasMessages: !!result.messages,
        keys: Object.keys(result || {}),
        resultType: typeof result
      })
      
      // The actual message is in result.message
      const message = result.message || result
      console.log('Message object:', {
        hasText: !!message.text,
        hasContent: !!message.content,
        hasParts: !!message.parts,
        messageKeys: Object.keys(message || {}),
        messageType: typeof message
      })
      console.log('Full message structure:', JSON.stringify(message, null, 2).substring(0, 1000))
      
      // Extract text from the finished message
      let content = ''
      
      // Try different ways to extract content
      if (message.text) {
        content = typeof message.text === 'string' ? message.text : String(message.text)
      } else if (message.content) {
        if (typeof message.content === 'string') {
          content = message.content
        } else if (Array.isArray(message.content)) {
          content = message.content
            .filter((part: any) => part.type === 'text' || typeof part === 'string')
            .map((part: any) => typeof part === 'string' ? part : part.text || '')
            .join('')
        }
      } else if (message.parts && Array.isArray(message.parts)) {
        console.log('Extracting from parts array, length:', message.parts.length)
        console.log('Parts structure:', message.parts.map((p: any) => ({ type: p.type, hasText: !!p.text })))
        content = message.parts
          .filter((part: any) => {
            const isText = part.type === 'text' || (typeof part === 'string')
            console.log('Part:', { type: part.type, isText, hasText: !!part.text, partValue: typeof part === 'string' ? part.substring(0, 50) : part.text?.substring(0, 50) })
            return isText
          })
          .map((part: any) => {
            if (typeof part === 'string') {
              return part
            } else if (part.text) {
              return part.text
            } else if (part.content) {
              return typeof part.content === 'string' ? part.content : ''
            }
            return ''
          })
          .join('')
        console.log('Extracted from parts, content length:', content.length)
      } else if (typeof message === 'string') {
        content = message
      } else {
        // Last resort: try getMessageContent
        console.warn('Trying getMessageContent as fallback')
        content = getMessageContent(message)
      }
      
      content = content.trim()
      console.log('Extracted content length:', content.length)
      console.log('Extracted content preview:', content.substring(0, 200))
      
      if (!content) {
        console.warn('Empty content received from chat')
        // Try to get content from messages array if available
        // Find the last assistant message
        if (result.messages && Array.isArray(result.messages) && result.messages.length > 0) {
          for (let i = result.messages.length - 1; i >= 0; i--) {
            const msg = result.messages[i]
            if (msg.role === 'assistant') {
              content = getMessageContent(msg).trim()
              console.log('Tried messages array (assistant message), content length:', content.length)
              break
            }
          }
        }
        
        if (!content) {
          console.warn('Could not extract content from onFinish callback')
          // Try to get from the messages array in result
          if (result.messages && Array.isArray(result.messages)) {
            console.log('Trying to extract from result.messages, count:', result.messages.length)
            for (let i = result.messages.length - 1; i >= 0; i--) {
              const msg = result.messages[i]
              console.log(`Message ${i}:`, {
                role: msg.role,
                keys: Object.keys(msg || {}),
                hasText: !!msg.text,
                hasContent: !!msg.content,
                hasParts: !!msg.parts
              })
              if (msg.role === 'assistant') {
                const extracted = getMessageContent(msg)
                if (extracted && extracted.trim()) {
                  content = extracted.trim()
                  console.log('Found content in result.messages:', content.length)
                  break
                }
              }
            }
          }
          
          if (!content) {
            console.warn('Could not extract content from onFinish callback')
            return
          }
        }
      }
      
      // Intelligente Erkennung: Ist das eine Änderung am Anschreiben oder nur eine Antwort?
      const isCoverLetterChange = detectCoverLetterChange(content, coverLetter || '')
      
      console.log('Chat onFinish - decision:', {
        isCoverLetterChange,
        hasOnPendingChanges: !!onPendingChanges,
        hasOnCoverLetterUpdate: !!onCoverLetterUpdate,
        contentLength: content.length
      })
      
      if (isCoverLetterChange) {
        console.log('Detected cover letter change - showing diff view')
        // Neue Version des Anschreibens - für Diff-Anzeige vorbereiten
        if (onPendingChanges) {
          console.log('Calling onPendingChanges with:', {
            newLength: content.length,
            originalLength: originalCoverLetterRef.current.length
          })
          onPendingChanges(content, originalCoverLetterRef.current)
        } else if (onCoverLetterUpdate) {
          console.log('Fallback: Calling onCoverLetterUpdate')
          // Fallback: Direktes Update wenn onPendingChanges nicht verfügbar
          onCoverLetterUpdate(content)
        } else {
          console.warn('No callback available for cover letter update!')
        }
      } else {
        console.log('Response appears to be a question/answer, not a cover letter change')
        // Nur eine Antwort - keine Änderung am Anschreiben
        // Die Antwort wird bereits in der Chat-UI angezeigt
      }
    },
  } as any)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Track processed message IDs to avoid duplicate processing
  const processedMessageIdsRef = useRef<Set<string>>(new Set())

  // Watch for new assistant messages and process them
  useEffect(() => {
    if (messages.length === 0) return
    
    // Find the last assistant message that hasn't been processed yet
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i] as any
      if (message.role === 'assistant' && message.id && !processedMessageIdsRef.current.has(message.id)) {
        // Mark as processed immediately to avoid duplicate processing
        processedMessageIdsRef.current.add(message.id)
        
        const messageContent = getMessageContent(message)
        console.log('New assistant message detected in messages array:', {
          id: message.id,
          role: message.role,
          contentLength: messageContent.length,
          contentPreview: messageContent.substring(0, 100),
          messageKeys: Object.keys(message)
        })
        
        if (messageContent.trim() && messageContent.length > 0) {
          console.log('Processing message from messages array, content length:', messageContent.length)
          
          // Intelligente Erkennung: Ist das eine Änderung am Anschreiben oder nur eine Antwort?
          const isCoverLetterChange = detectCoverLetterChange(messageContent.trim(), coverLetter || '')
          
          console.log('Message processing - decision:', {
            isCoverLetterChange,
            hasOnPendingChanges: !!onPendingChanges,
            hasOnCoverLetterUpdate: !!onCoverLetterUpdate,
            contentLength: messageContent.length
          })
          
          if (isCoverLetterChange) {
            console.log('Detected cover letter change from messages array - showing diff view')
            if (onPendingChanges) {
              console.log('Calling onPendingChanges with:', {
                newLength: messageContent.length,
                originalLength: originalCoverLetterRef.current.length
              })
              onPendingChanges(messageContent.trim(), originalCoverLetterRef.current)
            } else if (onCoverLetterUpdate) {
              console.log('Fallback: Calling onCoverLetterUpdate')
              onCoverLetterUpdate(messageContent.trim())
            }
          }
        }
        break // Only process the most recent unprocessed message
      }
    }
  }, [messages, coverLetter, onPendingChanges, onCoverLetterUpdate])

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) {
      console.log('Cannot send message:', { hasInput: !!input.trim(), isLoading })
      return
    }

    const messageText = input.trim()
    console.log('Sending message:', messageText)
    console.log('Current status:', status)
    console.log('Current cover letter length:', coverLetter.length)
    
    try {
      // useChat's sendMessage expects an object with role and content
      sendMessage({
        role: 'user',
        content: messageText
      } as any)
      setInput("")
      console.log('Message sent successfully')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const getMessageContent = (message: any): string => {
    if (!message) return ''
    
    console.log('getMessageContent called with:', {
      keys: Object.keys(message || {}),
      hasText: !!message.text,
      hasContent: !!message.content,
      hasParts: !!message.parts,
      partsLength: message.parts?.length || 0
    })
    
    // Handle different message structures from AI SDK
    // In the new version, messages have a 'parts' array or direct content
    
    // Try text property first
    if (message.text) {
      const text = typeof message.text === 'string' ? message.text : String(message.text)
      if (text.trim()) {
        console.log('Found content in message.text:', text.length)
        return text
      }
    }
    
    // Try content property
    if (message.content) {
      if (typeof message.content === 'string') {
        console.log('Found content in message.content (string):', message.content.length)
        return message.content
      } else if (Array.isArray(message.content)) {
        const extracted = message.content
          .filter((part: any) => part.type === 'text' || typeof part === 'string')
          .map((part: any) => typeof part === 'string' ? part : part.text || '')
          .join('')
        if (extracted.trim()) {
          console.log('Found content in message.content (array):', extracted.length)
          return extracted
        }
      }
    }
    
    // Try parts array - but check if it's actually populated
    if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
      console.log('Processing parts array, length:', message.parts.length)
      const extracted = message.parts
        .filter((part: any) => {
          // Accept text parts or string parts
          return part.type === 'text' || typeof part === 'string' || part.text
        })
        .map((part: any) => {
          if (typeof part === 'string') {
            return part
          } else if (part.text) {
            return part.text
          } else if (part.content) {
            return typeof part.content === 'string' ? part.content : ''
          }
          return ''
        })
        .join('')
      if (extracted.trim()) {
        console.log('Found content in message.parts:', extracted.length)
        return extracted
      }
    }
    
    // Try string directly
    if (typeof message === 'string') {
      console.log('Message is string:', message.length)
      return message
    }
    
    // Last resort: try to find any string property
    for (const key of Object.keys(message || {})) {
      const value = message[key]
      if (typeof value === 'string' && value.trim().length > 10) {
        console.log(`Found content in message.${key}:`, value.length)
        return value
      }
    }
    
    console.warn('Could not extract content from message:', {
      keys: Object.keys(message || {}),
      message: JSON.stringify(message).substring(0, 200)
    })
    return ''
  }

  /**
   * Erkennt intelligently, ob die Antwort ein neues Anschreiben ist oder nur eine Antwort
   */
  const detectCoverLetterChange = (responseText: string, currentCoverLetter: string): boolean => {
    console.log('detectCoverLetterChange called:', {
      responseLength: responseText.length,
      currentLength: currentCoverLetter.length,
      responsePreview: responseText.substring(0, 100)
    })

    // 1. Länge-Check: Anschreiben sind normalerweise > 200 Zeichen
    if (responseText.length < 200) {
      console.log('Response too short, not a cover letter')
      return false
    }

    // 2. Fragezeichen-Check: Antworten enthalten oft Fragezeichen, Anschreiben nicht
    // Aber lockern: Nur wenn es MEHRERE Fragezeichen gibt (3+), ist es wahrscheinlich eine Antwort
    const questionMarkCount = (responseText.match(/\?/g) || []).length
    if (questionMarkCount >= 3) {
      console.log('Too many question marks, likely an answer:', questionMarkCount)
      return false
    }

    // 3. Struktur-Check: Anschreiben haben ähnliche Absatz-Struktur
    const currentParagraphs = parseParagraphs(currentCoverLetter)
    const responseParagraphs = parseParagraphs(responseText)
    
    console.log('Paragraph comparison:', {
      current: currentParagraphs.length,
      response: responseParagraphs.length,
      ratio: responseParagraphs.length / Math.max(currentParagraphs.length, 1)
    })
    
    // Wenn die Antwort ähnlich viele Absätze hat wie das aktuelle Anschreiben, ist es wahrscheinlich ein neues Anschreiben
    if (currentParagraphs.length > 0 && responseParagraphs.length >= currentParagraphs.length * 0.6) {
      console.log('Similar paragraph structure detected, likely cover letter')
      return true
    }

    // 4. Inhalt-Check: Prüfe ob typische Anschreiben-Phrasen enthalten sind
    const coverLetterIndicators = [
      'sehr geehrte',
      'mit freundlichen grüßen',
      'bewerbung',
      'ich bewerbe mich',
      'ihr anschreiben',
      'mit freundlichen',
      'grüße',
    ]
    
    const lowerResponse = responseText.toLowerCase()
    const hasCoverLetterIndicators = coverLetterIndicators.some(indicator => 
      lowerResponse.includes(indicator)
    )

    console.log('Cover letter indicators found:', hasCoverLetterIndicators)

    // 5. Ähnlichkeits-Check: Wenn der Text sehr ähnlich zum aktuellen Anschreiben ist, könnte es eine Änderung sein
    const similarity = calculateSimilarity(
      currentCoverLetter.substring(0, 500),
      responseText.substring(0, 500)
    )

    console.log('Similarity score:', similarity)

    // Entscheidung: Wenn es Indikatoren gibt ODER hohe Ähnlichkeit (>20%), ist es wahrscheinlich eine Änderung
    const isChange = hasCoverLetterIndicators || similarity > 0.2
    console.log('Final decision - is cover letter change:', isChange)
    
    return isChange
  }

  /**
   * Berechnet einfache Text-Ähnlichkeit (0-1)
   */
  const calculateSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0
    
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    
    const set1 = new Set(words1)
    const set2 = new Set(words2)
    
    // Calculate intersection
    let intersectionSize = 0
    set1.forEach(word => {
      if (set2.has(word)) {
        intersectionSize++
      }
    })
    
    // Calculate union
    const union = new Set<string>()
    words1.forEach(word => union.add(word))
    words2.forEach(word => union.add(word))
    
    return intersectionSize / union.size
  }

  const extractParagraphSuggestions = (
    responseText: string,
    currentParagraphs: ReturnType<typeof parseParagraphs>,
    originalText: string
  ) => {
    console.log('Extracting paragraph suggestions from:', responseText.substring(0, 200))
    
    if (!onSuggestionCreated) {
      console.warn('onSuggestionCreated callback not provided')
      return
    }

    // Try to extract paragraph suggestions from the response
    // Look for patterns like "Absatz X:" or numbered paragraphs
    // Using [\s\S] instead of . with 's' flag for ES2017 compatibility
    const paragraphPattern = /(?:absatz\s*(\d+)[:.]?\s*)?([\s\S]+?)(?=(?:absatz\s*\d+[:.]?|$))/gi
    const matches = Array.from(responseText.matchAll(paragraphPattern))
    console.log('Found paragraph pattern matches:', matches.length)
    
    if (matches.length === 0) {
      console.log('No explicit paragraph markers, trying content similarity matching')
      // If no explicit paragraph markers, try to match by content similarity
      const responseParagraphs = parseParagraphs(responseText)
      
      responseParagraphs.forEach((responsePara, index) => {
        console.log(`Processing response paragraph ${index}:`, responsePara.text.substring(0, 100))
        
        // Find the most similar paragraph in the original
        const matchingPara = findParagraphContainingText(
          currentParagraphs,
          responsePara.text.substring(0, 50) // Use first 50 chars for matching
        )
        
        if (matchingPara) {
          console.log(`Found matching paragraph at index ${matchingPara.index}`)
          
          if (responsePara.text !== matchingPara.text) {
            console.log('Creating suggestion for paragraph', matchingPara.index)
            // Found a suggestion
            try {
              onSuggestionCreated({
                version_id: null,
                paragraph_index: matchingPara.index,
                original_text: matchingPara.text,
                suggested_text: responsePara.text,
                status: 'pending',
              })
              console.log('Suggestion created successfully')
            } catch (error) {
              console.error('Error creating suggestion:', error)
            }
          } else {
            console.log('Paragraph unchanged, skipping suggestion')
          }
        } else {
          console.log('No matching paragraph found for response paragraph', index)
        }
      })
    } else {
      // Process explicit paragraph markers
      matches.forEach((match) => {
        const paragraphNum = match[1] ? parseInt(match[1]) - 1 : null
        const suggestedText = match[2].trim()
        
        if (paragraphNum !== null && paragraphNum >= 0 && paragraphNum < currentParagraphs.length) {
          const originalPara = currentParagraphs[paragraphNum]
          console.log(`Processing explicit paragraph ${paragraphNum + 1}`)
          
          if (suggestedText !== originalPara.text) {
            console.log('Creating suggestion for explicit paragraph', paragraphNum)
            try {
              onSuggestionCreated({
                version_id: null,
                paragraph_index: paragraphNum,
                original_text: originalPara.text,
                suggested_text: suggestedText,
                status: 'pending',
              })
              console.log('Suggestion created successfully')
            } catch (error) {
              console.error('Error creating suggestion:', error)
            }
          } else {
            console.log('Paragraph unchanged, skipping suggestion')
          }
        } else if (paragraphNum === null) {
          console.log('No paragraph number, trying content matching')
          // No paragraph number, try to find by content
          const matchingPara = findParagraphContainingText(currentParagraphs, suggestedText.substring(0, 50))
          
          if (matchingPara) {
            console.log(`Found matching paragraph at index ${matchingPara.index}`)
            
            if (suggestedText !== matchingPara.text) {
              console.log('Creating suggestion for matched paragraph', matchingPara.index)
              try {
                onSuggestionCreated({
                  version_id: null,
                  paragraph_index: matchingPara.index,
                  original_text: matchingPara.text,
                  suggested_text: suggestedText,
                  status: 'pending',
                })
                console.log('Suggestion created successfully')
              } catch (error) {
                console.error('Error creating suggestion:', error)
              }
            } else {
              console.log('Paragraph unchanged, skipping suggestion')
            }
          } else {
            console.log('No matching paragraph found')
          }
        } else {
          console.warn('Invalid paragraph number:', paragraphNum)
        }
      })
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat mit KI-Assistenten</CardTitle>
        <CardDescription>
          Stelle Fragen zum Anschreiben oder bitte um gezielte Verbesserungen
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              <p className="mb-2">Starte eine Unterhaltung über dein Anschreiben!</p>
              <p className="text-xs">Beispiele:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-left max-w-md mx-auto">
                <li>"Kannst du den ersten Absatz kürzer machen?"</li>
                <li>"Mache den Ton formeller"</li>
                <li>"Hervorhebe mehr meine Erfahrung mit React"</li>
                <li>"Wie kann ich die Motivation stärker betonen?"</li>
              </ul>
            </div>
          )}
          
          {messages.map((message) => {
            const content = getMessageContent(message)
            const isUser = message.role === 'user'
            
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {!isUser ? (
                    <Markdown content={content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{content}</p>
                  )}
                </div>
              </div>
            )
          })}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">KI denkt nach...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-start">
              <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2">
                <p className="text-sm">Fehler: {error.message || 'Unbekannter Fehler'}</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frage stellen oder Verbesserung anfragen..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

