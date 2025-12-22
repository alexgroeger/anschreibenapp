"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Send, Loader2 } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"

interface CoverLetterChatProps {
  coverLetter: string
  matchResult: string
  jobDescription: string
  extraction?: any
  onCoverLetterUpdate?: (newCoverLetter: string) => void
}

export function CoverLetterChat({
  coverLetter,
  matchResult,
  jobDescription,
  extraction,
  onCoverLetterUpdate,
}: CoverLetterChatProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chat = useChat({
    body: {
      coverLetter,
      matchResult,
      jobDescription,
      extraction,
    },
    onFinish: () => {
      // Extract text from the last message after it finishes
      const lastMessage = chat.messages[chat.messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        const content = getMessageContent(lastMessage).trim()
        
        // Check if the message looks like a new cover letter (long text without question marks)
        if (content.length > 200 && !content.includes('?') && !content.toLowerCase().includes('frage')) {
          // Likely a new cover letter - update it
          if (onCoverLetterUpdate) {
            onCoverLetterUpdate(content)
          }
        }
      }
    },
  })
  
  const { messages, sendMessage, status } = chat

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

    sendMessage({ text: input })
    setInput("")
  }

  const getMessageContent = (message: any): string => {
    // Handle different message structures from AI SDK
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('') || ''
    } else if (typeof message === 'string') {
      return message
    } else if (message.text) {
      return message.text
    } else if (message.content) {
      return message.content
    }
    return ''
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
