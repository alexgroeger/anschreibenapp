/**
 * Utility-Funktionen für Paragraph-Parsing
 * Absätze werden durch doppelte Zeilenschaltung (\n\n) getrennt
 */

export interface Paragraph {
  index: number
  text: string
  startIndex: number
  endIndex: number
}

/**
 * Teilt Text in Absätze auf (getrennt durch \n\n)
 */
export function parseParagraphs(text: string): Paragraph[] {
  if (!text || text.trim() === '') {
    return []
  }

  // Teile Text an doppelten Zeilenschaltungen
  const parts = text.split(/\n\n+/)
  const paragraphs: Paragraph[] = []
  let currentIndex = 0

  parts.forEach((part, index) => {
    const trimmedPart = part.trim()
    if (trimmedPart) {
      const startIndex = text.indexOf(part, currentIndex)
      const endIndex = startIndex + part.length
      
      paragraphs.push({
        index,
        text: trimmedPart,
        startIndex,
        endIndex,
      })
      
      currentIndex = endIndex
    }
  })

  return paragraphs
}

/**
 * Findet den Absatz-Index für eine gegebene Textposition
 */
export function findParagraphIndex(paragraphs: Paragraph[], textPosition: number): number {
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (textPosition >= paragraphs[i].startIndex) {
      return i
    }
  }
  return 0
}

/**
 * Findet den Absatz, der einen bestimmten Text enthält
 */
export function findParagraphContainingText(
  paragraphs: Paragraph[],
  searchText: string
): Paragraph | null {
  const normalizedSearch = searchText.trim().toLowerCase()
  
  for (const paragraph of paragraphs) {
    if (paragraph.text.toLowerCase().includes(normalizedSearch)) {
      return paragraph
    }
  }
  
  return null
}

/**
 * Erstellt Text aus Absätzen zurück
 */
export function paragraphsToText(paragraphs: Paragraph[]): string {
  return paragraphs.map(p => p.text).join('\n\n')
}

/**
 * Vergleicht zwei Texte auf Paragraph-Ebene und findet Unterschiede
 */
export interface ParagraphDiff {
  index: number
  original: string | null
  modified: string | null
  type: 'unchanged' | 'added' | 'removed' | 'modified'
}

export function diffParagraphs(
  originalText: string,
  modifiedText: string
): ParagraphDiff[] {
  const originalParagraphs = parseParagraphs(originalText)
  const modifiedParagraphs = parseParagraphs(modifiedText)
  
  const diffs: ParagraphDiff[] = []
  const maxLength = Math.max(originalParagraphs.length, modifiedParagraphs.length)
  
  for (let i = 0; i < maxLength; i++) {
    const original = originalParagraphs[i]?.text || null
    const modified = modifiedParagraphs[i]?.text || null
    
    if (original === null && modified !== null) {
      diffs.push({
        index: i,
        original: null,
        modified,
        type: 'added',
      })
    } else if (original !== null && modified === null) {
      diffs.push({
        index: i,
        original,
        modified: null,
        type: 'removed',
      })
    } else if (original !== null && modified !== null) {
      if (original === modified) {
        diffs.push({
          index: i,
          original,
          modified,
          type: 'unchanged',
        })
      } else {
        diffs.push({
          index: i,
          original,
          modified,
          type: 'modified',
        })
      }
    }
  }
  
  return diffs
}

