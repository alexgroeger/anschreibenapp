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
}

export function CoverLetterChat({
  coverLetter,
  matchResult,
  jobDescription,
  extraction,
  onCoverLetterUpdate,
  onSuggestionCreated,
}: CoverLetterChatProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    onFinish: (message: any) => {
      console.log('Chat message finished:', message)
      
      // Extract text from the finished message
      const content = getMessageContent(message).trim()
      console.log('Extracted content length:', content.length)
      
      if (!content) {
        console.warn('Empty content received from chat')
        return
      }
      
      // Parse paragraphs from current cover letter
      const currentParagraphs = parseParagraphs(coverLetter)
      console.log('Current paragraphs count:', currentParagraphs.length)
      
      // Check if the message looks like a new cover letter (long text without question marks)
      if (content.length > 200 && !content.includes('?') && !content.toLowerCase().includes('frage')) {
        console.log('Detected potential full cover letter or paragraph changes')
        // Try to detect if this is a full cover letter or paragraph-level changes
        const responseParagraphs = parseParagraphs(content)
        console.log('Response paragraphs count:', responseParagraphs.length)
        
        // If response has similar structure to current cover letter, it might be a full replacement
        if (responseParagraphs.length >= currentParagraphs.length * 0.8) {
          console.log('Likely full cover letter replacement')
          // Likely a full new cover letter - update it
          if (onCoverLetterUpdate) {
            onCoverLetterUpdate(content)
          }
        } else {
          console.log('Likely paragraph-level changes, extracting suggestions')
          // Likely paragraph-level changes - try to extract suggestions
          extractParagraphSuggestions(content, currentParagraphs, coverLetter)
        }
      } else {
        // Check if it contains paragraph-level suggestions (mentions "Absatz" or similar patterns)
        const hasAbsatz = content.toLowerCase().includes('absatz') || content.match(/absatz\s+\d+/i)
        console.log('Contains Absatz mention:', hasAbsatz)
        
        if (hasAbsatz) {
          console.log('Extracting paragraph suggestions from response')
          extractParagraphSuggestions(content, currentParagraphs, coverLetter)
        } else {
          console.log('Response appears to be a question/answer, not a suggestion')
        }
      }
    },
  } as any)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    console.log('Sending message:', input)
    console.log('Current status:', status)
    
    // Create message object with text property
    // useChat's sendMessage expects an object with 'text' property
    const messageToSend: { text: string } = {
      text: input.trim()
    }
    
    console.log('Message object to send:', messageToSend)
    console.log('Message object type:', typeof messageToSend)
    console.log('Has text property:', 'text' in messageToSend)
    
    try {
      // Ensure we're passing an object, not a string
      if (typeof messageToSend === 'object' && 'text' in messageToSend) {
        sendMessage(messageToSend)
        setInput("")
      } else {
        console.error('Invalid message format:', messageToSend)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const getMessageContent = (message: any): string => {
    // Handle different message structures from AI SDK
    // In the new version, messages have a 'parts' array or direct content
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('') || ''
    } else if (message.text) {
      return message.text
    } else if (message.content) {
      return message.content
    } else if (typeof message === 'string') {
      return message
    }
    return ''
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

