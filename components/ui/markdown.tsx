"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  // Clean content - remove any leading/trailing whitespace and normalize line breaks
  const cleanedContent = content?.trim().replace(/\r\n/g, '\n') || '';
  
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
          ),
          // Customize paragraph
          p: ({ node, ...props }) => (
            <p className="mb-3 leading-relaxed text-foreground" {...props} />
          ),
          // Customize lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside mb-4 ml-6 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside mb-4 ml-6 space-y-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="pl-2" {...props} />
          ),
          // Customize code blocks
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code
                className="block p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono mb-4"
                {...props}
              >
                {children}
              </code>
            )
          },
          // Customize blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
              {...props}
            />
          ),
          // Customize links
          a: ({ node, ...props }) => (
            <a
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Customize strong
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          // Customize emphasis
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  )
}


