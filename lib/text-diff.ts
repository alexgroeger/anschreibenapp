/**
 * Word-level Diff Utility
 * Erstellt Word-by-Word Diffs für Word-ähnliche Anzeige
 */

export interface DiffSegment {
  text: string
  type: 'unchanged' | 'deleted' | 'added'
}

/**
 * Normalisiert Whitespace für besseren Diff-Vergleich
 * Behält die Struktur bei, normalisiert aber mehrfache Leerzeichen
 * WICHTIG: Diese Funktion wird nur für den Vergleich verwendet,
 * die Original-Formatierung bleibt für die Anzeige erhalten
 */
function normalizeWhitespace(text: string): string {
  // Normalisiere mehrfache Leerzeichen zu einem (außer Zeilenumbrüche)
  // Behalte Absatzstruktur (doppelte Zeilenumbrüche) bei
  // Normalisiere auch Tabs zu Leerzeichen für Vergleich
  return text
    .replace(/[ \t]+/g, ' ') // Mehrfache Leerzeichen/Tabs zu einem Leerzeichen
    .replace(/\n[ \t]+/g, '\n') // Leerzeichen nach Zeilenumbrüchen entfernen
    .replace(/[ \t]+\n/g, '\n') // Leerzeichen vor Zeilenumbrüchen entfernen
    .replace(/\n{3,}/g, '\n\n') // Mehr als 2 Zeilenumbrüche zu genau 2
    .trim()
}

/**
 * Erstellt eine normalisierte Version für Vergleich, die nur inhaltliche Änderungen erkennt
 * Ignoriert reine Formatierungsunterschiede
 * VERBESSERT: Weniger aggressive Normalisierung
 */
function normalizeForComparison(text: string): string {
  // Normalisiere nur mehrfache Leerzeichen, behalte Struktur bei
  return text
    .replace(/[ \t]+/g, ' ') // Mehrfache Leerzeichen/Tabs zu einem
    .replace(/\n[ \t]+/g, '\n') // Leerzeichen nach Zeilenumbrüchen entfernen
    .replace(/[ \t]+\n/g, '\n') // Leerzeichen vor Zeilenumbrüchen entfernen
    .replace(/\n{3,}/g, '\n\n') // Mehr als 2 Zeilenumbrüche zu genau 2
    .trim()
}

/**
 * Teilt Text in Wörter auf (inkl. Whitespace)
 * VERBESSERT: Bessere Tokenisierung, die Wörter nicht zusammenfügt
 */
function tokenize(text: string): string[] {
  // Teile Text in Wörter und Whitespace auf
  // Wichtig: Jedes Token sollte ein einzelnes Wort oder Whitespace sein
  const tokens: string[] = []
  
  // Verbesserte Regex: Erfasst Wörter (inkl. Umlaute), Satzzeichen und Whitespace getrennt
  const regex = /(\s+|[^\s]+)/g
  let match
  let lastIndex = 0
  
  while ((match = regex.exec(text)) !== null) {
    // Stelle sicher, dass wir keine Lücken überspringen
    if (match.index > lastIndex) {
      // Füge fehlenden Text hinzu (sollte nicht passieren, aber sicherheitshalber)
      tokens.push(text.substring(lastIndex, match.index))
    }
    tokens.push(match[0])
    lastIndex = match.index + match[0].length
  }
  
  // Füge restlichen Text hinzu, falls vorhanden
  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex))
  }
  
  return tokens
}

/**
 * Zählt die Anzahl der geänderten Wörter in einem Diff
 */
function countChangedWords(segments: DiffSegment[]): number {
  let count = 0
  for (const segment of segments) {
    if (segment.type === 'deleted' || segment.type === 'added') {
      // Zähle Wörter (nicht Whitespace)
      const words = segment.text.trim().split(/\s+/).filter(w => w.length > 0)
      count += words.length
    }
  }
  return count
}

/**
 * Berechnet Word-by-Word Diff zwischen zwei Texten
 * Verwendet einen vereinfachten LCS-ähnlichen Algorithmus
 * Ignoriert reine Whitespace-Änderungen
 * VERBESSERT: Verwendet Absatz-für-Absatz Vergleich für bessere Genauigkeit
 * Bei großen Änderungen (>3 Wörter) wird ein chunked Ansatz verwendet
 */
export function computeWordDiff(original: string, modified: string): DiffSegment[] {
  if (!original && !modified) {
    return []
  }
  
  if (!original) {
    // Alles wurde hinzugefügt
    return [{ text: modified, type: 'added' }]
  }
  
  if (!modified) {
    // Alles wurde gelöscht
    return [{ text: original, type: 'deleted' }]
  }
  
  // NEUER ANSATZ: Teile in Absätze auf und vergleiche Absatz-für-Absatz
  // Das verhindert, dass Formatierungsänderungen in einem Absatz andere Absätze beeinflussen
  const originalParagraphs = original.split(/\n\n+/)
  const modifiedParagraphs = modified.split(/\n\n+/)
  
  const segments: DiffSegment[] = []
  const maxLength = Math.max(originalParagraphs.length, modifiedParagraphs.length)
  
  for (let i = 0; i < maxLength; i++) {
    const origPara = originalParagraphs[i] || ''
    const modPara = modifiedParagraphs[i] || ''
    
    if (!origPara && modPara) {
      // Neuer Absatz hinzugefügt
      segments.push({ text: modPara, type: 'added' })
      if (i < maxLength - 1) {
        segments.push({ text: '\n\n', type: 'unchanged' })
      }
    } else if (origPara && !modPara) {
      // Absatz gelöscht
      segments.push({ text: origPara, type: 'deleted' })
      if (i < maxLength - 1) {
        segments.push({ text: '\n\n', type: 'unchanged' })
      }
    } else if (origPara && modPara) {
      // Beide existieren - vergleiche sie
      const paraDiff = computeParagraphWordDiff(origPara, modPara)
      
      // Prüfe, ob es eine große Änderung ist (>3 Wörter)
      const changedWords = countChangedWords(paraDiff)
      
      if (changedWords > 3) {
        // Große Änderung - verwende chunked Ansatz (Satz-für-Satz)
        const chunkedDiff = computeChunkedDiff(origPara, modPara)
        segments.push(...chunkedDiff)
      } else {
        // Kleine Änderung - verwende normalen Word-Diff
        segments.push(...paraDiff)
      }
      
      if (i < maxLength - 1) {
        segments.push({ text: '\n\n', type: 'unchanged' })
      }
    }
  }
  
  return mergeSegments(segments)
}

/**
 * Berechnet Word-Diff für einen einzelnen Absatz
 * VERBESSERT: Verwendet einen einfacheren, robusteren Ansatz
 */
function computeParagraphWordDiff(original: string, modified: string): DiffSegment[] {
  // Schneller Check: Wenn normalisierte Versionen identisch sind, ist alles unverändert
  const normalizedOriginal = normalizeForComparison(original)
  const normalizedModified = normalizeForComparison(modified)
  
  if (normalizedOriginal === normalizedModified) {
    // Nur Formatierung geändert - zeige alles als unverändert mit der modifizierten Formatierung
    return [{ text: modified, type: 'unchanged' }]
  }
  
  // Zusätzlicher Check: Wenn die normalisierten Texte sehr ähnlich sind (>95% Übereinstimmung),
  // zeige alles als unverändert (nur Formatierung geändert)
  const similarity = calculateTextSimilarity(normalizedOriginal, normalizedModified)
  if (similarity > 0.95) {
    // Sehr ähnlich - wahrscheinlich nur Formatierung geändert
    // Zeige alles als unverändert mit modifizierter Formatierung
    return [{ text: modified, type: 'unchanged' }]
  }
  
  // Teile in Wörter auf (einfacher Ansatz)
  // Verwende eine einfachere Tokenisierung: nur Wörter und Whitespace
  const originalWords = original.split(/(\s+)/)
  const modifiedWords = modified.split(/(\s+)/)
  
  // Filtere leere Strings
  const origTokens = originalWords.filter(t => t.length > 0)
  const modTokens = modifiedWords.filter(t => t.length > 0)
  
  // Erstelle normalisierte Versionen für Vergleich
  const origTokensNorm = origTokens.map(t => normalizeForComparison(t))
  const modTokensNorm = modTokens.map(t => normalizeForComparison(t))
  
  const segments: DiffSegment[] = []
  let origIdx = 0
  let modIdx = 0
  
  // Einfacherer Diff-Algorithmus: Vergleiche Wort für Wort
  while (origIdx < origTokens.length || modIdx < modTokens.length) {
    if (origIdx < origTokens.length && modIdx < modTokens.length) {
      // Vergleiche normalisierte Versionen
      const origNorm = origTokensNorm[origIdx]
      const modNorm = modTokensNorm[modIdx]
      
      // Prüfe ob Whitespace
      const origIsWs = /^\s+$/.test(origTokens[origIdx])
      const modIsWs = /^\s+$/.test(modTokens[modIdx])
      
      if (origIsWs && modIsWs) {
        // Beide Whitespace - unverändert (verwende modifizierte Version)
        segments.push({ text: modTokens[modIdx], type: 'unchanged' })
        origIdx++
        modIdx++
      } else if (!origIsWs && !modIsWs && origNorm === modNorm && origNorm.length > 0) {
        // Gleiche Wörter (nach Normalisierung) - unverändert
        segments.push({ text: modTokens[modIdx], type: 'unchanged' })
        origIdx++
        modIdx++
      } else {
        // Unterschied - suche nach Match
        let found = false
        const maxLook = Math.min(10, Math.max(origTokens.length - origIdx, modTokens.length - modIdx))
        
        for (let look = 1; look <= maxLook && !found; look++) {
          // Suche in modified
          if (origIdx < origTokens.length) {
            for (let i = modIdx; i < Math.min(modIdx + look, modTokens.length); i++) {
              if (origTokensNorm[origIdx] === modTokensNorm[i] && origTokensNorm[origIdx].length > 0) {
                // Gelöscht
                segments.push({ text: origTokens[origIdx], type: 'deleted' })
                origIdx++
                found = true
                break
              }
            }
          }
          
          // Suche in original
          if (!found && modIdx < modTokens.length) {
            for (let i = origIdx; i < Math.min(origIdx + look, origTokens.length); i++) {
              if (modTokensNorm[modIdx] === origTokensNorm[i] && modTokensNorm[modIdx].length > 0) {
                // Hinzugefügt
                segments.push({ text: modTokens[modIdx], type: 'added' })
                modIdx++
                found = true
                break
              }
            }
          }
        }
        
        if (!found) {
          // Kein Match - markiere beide als geändert
          if (origIdx < origTokens.length) {
            segments.push({ text: origTokens[origIdx], type: 'deleted' })
            origIdx++
          }
          if (modIdx < modTokens.length) {
            segments.push({ text: modTokens[modIdx], type: 'added' })
            modIdx++
          }
        }
      }
    } else {
      // Rest verarbeiten
      if (origIdx < origTokens.length) {
        segments.push({ text: origTokens[origIdx], type: 'deleted' })
        origIdx++
      }
      if (modIdx < modTokens.length) {
        segments.push({ text: modTokens[modIdx], type: 'added' })
        modIdx++
      }
    }
  }
  
  return mergeSegments(segments)
}

/**
 * Berechnet Text-Ähnlichkeit zwischen zwei normalisierten Texten (0-1)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0
  if (text1 === text2) return 1
  
  // Verwende Levenshtein-ähnliche Ähnlichkeit
  const longer = text1.length > text2.length ? text1 : text2
  const shorter = text1.length > text2.length ? text2 : text1
  
  if (longer.length === 0) return 1
  
  // Einfache Ähnlichkeitsberechnung basierend auf gemeinsamen Zeichen
  let matches = 0
  const shorterChars = shorter.split('')
  const longerChars = longer.split('')
  
  for (let i = 0; i < Math.min(shorterChars.length, longerChars.length); i++) {
    if (shorterChars[i] === longerChars[i]) {
      matches++
    }
  }
  
  // Berücksichtige auch gemeinsame Wörter
  const shorterWords = shorter.split(/\s+/).filter(w => w.length > 0)
  const longerWords = longer.split(/\s+/).filter(w => w.length > 0)
  const commonWords = shorterWords.filter(w => longerWords.includes(w))
  
  const wordSimilarity = shorterWords.length > 0 
    ? commonWords.length / Math.max(shorterWords.length, longerWords.length)
    : 0
  
  const charSimilarity = matches / longer.length
  
  // Kombiniere beide Metriken
  return (charSimilarity * 0.6 + wordSimilarity * 0.4)
}

/**
 * Konservativer Diff, der nur echte inhaltliche Änderungen markiert
 * Ignoriert Formatierungsunterschiede besser und behält Formatierung bei
 */
function computeConservativeDiff(original: string, modified: string): DiffSegment[] {
  // Verwende die normale Tokenisierung, aber mit besserer Normalisierung für Vergleich
  const originalTokens = tokenize(original)
  const modifiedTokens = tokenize(modified)
  
  // Erstelle normalisierte Versionen für Vergleich
  const normalizedOriginal = normalizeForComparison(original)
  const normalizedModified = normalizeForComparison(modified)
  const normalizedOriginalTokens = tokenize(normalizedOriginal)
  const normalizedModifiedTokens = tokenize(normalizedModified)
  
  const segments: DiffSegment[] = []
  let origIndex = 0
  let modIndex = 0
  
  while (origIndex < normalizedOriginalTokens.length || modIndex < normalizedModifiedTokens.length) {
    // Versuche, gemeinsame Tokens zu finden (vergleiche normalisierte Versionen)
    if (origIndex < normalizedOriginalTokens.length && modIndex < normalizedModifiedTokens.length) {
      const origTokenNorm = normalizedOriginalTokens[origIndex]
      const modTokenNorm = normalizedModifiedTokens[modIndex]
      
      // Normalisiere für Vergleich (ignoriere Whitespace-Unterschiede)
      const origTokenClean = origTokenNorm.trim() || origTokenNorm
      const modTokenClean = modTokenNorm.trim() || modTokenNorm
      
      const origIsWhitespace = /^\s+$/.test(origTokenNorm)
      const modIsWhitespace = /^\s+$/.test(modTokenNorm)
      
      if ((origIsWhitespace && modIsWhitespace) || 
          (!origIsWhitespace && !modIsWhitespace && origTokenClean === modTokenClean && origTokenClean.length > 0) ||
          origTokenNorm === modTokenNorm) {
        // Gleicher Token - unverändert (verwende modifizierte Version für Formatierung)
        segments.push({
          text: modifiedTokens[modIndex] || originalTokens[origIndex],
          type: 'unchanged'
        })
        origIndex++
        modIndex++
        continue
      }
    }
    
    // Unterschied gefunden - suche nach nächstem Match
    let foundMatch = false
    const maxLookAhead = Math.min(
      normalizedOriginalTokens.length - origIndex,
      normalizedModifiedTokens.length - modIndex,
      10
    )
    
    for (let lookAhead = 1; lookAhead <= maxLookAhead && !foundMatch; lookAhead++) {
      // Suche in modified nach original[origIndex]
      if (origIndex < normalizedOriginalTokens.length) {
        const searchToken = normalizedOriginalTokens[origIndex]
        const searchTokenClean = searchToken.trim() || searchToken
        const searchIsWhitespace = /^\s+$/.test(searchToken)
        
        for (let i = modIndex; i < Math.min(modIndex + lookAhead, normalizedModifiedTokens.length); i++) {
          const compareToken = normalizedModifiedTokens[i]
          const compareTokenClean = compareToken.trim() || compareToken
          const compareIsWhitespace = /^\s+$/.test(compareToken)
          
          if ((searchIsWhitespace && compareIsWhitespace) ||
              (!searchIsWhitespace && !compareIsWhitespace && searchTokenClean === compareTokenClean && searchTokenClean.length > 0) ||
              searchToken === compareToken) {
            // Gelöschtes Token gefunden
            if (origIndex < originalTokens.length) {
              segments.push({
                text: originalTokens[origIndex],
                type: 'deleted'
              })
            }
            origIndex++
            foundMatch = true
            break
          }
        }
      }
      
      // Suche in original nach modified[modIndex]
      if (!foundMatch && modIndex < normalizedModifiedTokens.length) {
        const searchToken = normalizedModifiedTokens[modIndex]
        const searchTokenClean = searchToken.trim() || searchToken
        const searchIsWhitespace = /^\s+$/.test(searchToken)
        
        for (let i = origIndex; i < Math.min(origIndex + lookAhead, normalizedOriginalTokens.length); i++) {
          const compareToken = normalizedOriginalTokens[i]
          const compareTokenClean = compareToken.trim() || compareToken
          const compareIsWhitespace = /^\s+$/.test(compareToken)
          
          if ((searchIsWhitespace && compareIsWhitespace) ||
              (!searchIsWhitespace && !compareIsWhitespace && searchTokenClean === compareTokenClean && searchTokenClean.length > 0) ||
              searchToken === compareToken) {
            // Hinzugefügtes Token gefunden
            if (modIndex < modifiedTokens.length) {
              segments.push({
                text: modifiedTokens[modIndex],
                type: 'added'
              })
            }
            modIndex++
            foundMatch = true
            break
          }
        }
      }
    }
    
    if (!foundMatch) {
      // Kein Match - markiere als geändert
      if (origIndex < originalTokens.length) {
        segments.push({
          text: originalTokens[origIndex],
          type: 'deleted'
        })
        origIndex++
      }
      
      if (modIndex < modifiedTokens.length) {
        segments.push({
          text: modifiedTokens[modIndex],
          type: 'added'
        })
        modIndex++
      }
    }
  }
  
  return mergeSegments(segments)
}

/**
 * Berechnet einen chunked Diff für große Änderungen
 * Teilt Text in Sätze auf und vergleicht Satz-für-Satz
 * Das macht große Änderungen übersichtlicher
 */
function computeChunkedDiff(original: string, modified: string): DiffSegment[] {
  // Teile in Sätze auf (getrennt durch Punkt, Ausrufezeichen, Fragezeichen)
  const sentenceRegex = /([.!?]+\s*)/g
  const originalSentences: string[] = []
  const modifiedSentences: string[] = []
  
  // Teile Original in Sätze
  let lastIndex = 0
  let match
  sentenceRegex.lastIndex = 0
  while ((match = sentenceRegex.exec(original)) !== null) {
    const sentence = original.substring(lastIndex, match.index + match[0].length)
    if (sentence.trim()) {
      originalSentences.push(sentence)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < original.length) {
    const remaining = original.substring(lastIndex)
    if (remaining.trim()) {
      originalSentences.push(remaining)
    }
  }
  
  // Teile Modified in Sätze
  lastIndex = 0
  sentenceRegex.lastIndex = 0
  while ((match = sentenceRegex.exec(modified)) !== null) {
    const sentence = modified.substring(lastIndex, match.index + match[0].length)
    if (sentence.trim()) {
      modifiedSentences.push(sentence)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < modified.length) {
    const remaining = modified.substring(lastIndex)
    if (remaining.trim()) {
      modifiedSentences.push(remaining)
    }
  }
  
  const segments: DiffSegment[] = []
  const maxLength = Math.max(originalSentences.length, modifiedSentences.length)
  
  for (let i = 0; i < maxLength; i++) {
    const origSentence = originalSentences[i] || ''
    const modSentence = modifiedSentences[i] || ''
    
    // Normalisiere für Vergleich
    const origNorm = normalizeForComparison(origSentence)
    const modNorm = normalizeForComparison(modSentence)
    
    if (!origSentence && modSentence) {
      // Neuer Satz hinzugefügt
      segments.push({ text: modSentence, type: 'added' })
    } else if (origSentence && !modSentence) {
      // Satz gelöscht
      segments.push({ text: origSentence, type: 'deleted' })
    } else if (origNorm === modNorm) {
      // Satz unverändert
      segments.push({ text: modSentence, type: 'unchanged' })
    } else {
      // Satz geändert - zeige beide Versionen mit Trennzeichen
      segments.push({ text: origSentence, type: 'deleted' })
      segments.push({ text: ' → ', type: 'unchanged' }) // Trennzeichen für bessere Lesbarkeit
      segments.push({ text: modSentence, type: 'added' })
    }
  }
  
  return segments
}

/**
 * Merged benachbarte Segmente gleichen Typs
 */
function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) {
    return []
  }
  
  const merged: DiffSegment[] = []
  let current = { ...segments[0] }
  
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type === current.type) {
      // Gleicher Typ - merge
      current.text += segments[i].text
    } else {
      // Anderer Typ - speichere aktuelles Segment und starte neues
      merged.push(current)
      current = { ...segments[i] }
    }
  }
  
  // Füge letztes Segment hinzu
  merged.push(current)
  
  return merged
}

/**
 * Erstellt eine vereinfachte Diff-Ansicht für große Texte
 * Nutzt Paragraph-Level Diff für bessere Performance
 */
export function computeParagraphDiff(original: string, modified: string): DiffSegment[] {
  const originalParas = original.split(/\n\n+/)
  const modifiedParas = modified.split(/\n\n+/)
  
  const segments: DiffSegment[] = []
  const maxLength = Math.max(originalParas.length, modifiedParas.length)
  
  for (let i = 0; i < maxLength; i++) {
    const origPara = originalParas[i] || ''
    const modPara = modifiedParas[i] || ''
    
    // Normalisiere für Vergleich
    const origParaNorm = normalizeWhitespace(origPara)
    const modParaNorm = normalizeWhitespace(modPara)
    
    if (origParaNorm === modParaNorm) {
      // Unverändert (nach Normalisierung)
      segments.push({
        text: modPara + (i < maxLength - 1 ? '\n\n' : ''),
        type: 'unchanged'
      })
    } else if (!origPara) {
      // Neu hinzugefügt
      segments.push({
        text: modPara + (i < maxLength - 1 ? '\n\n' : ''),
        type: 'added'
      })
    } else if (!modPara) {
      // Gelöscht
      segments.push({
        text: origPara + (i < maxLength - 1 ? '\n\n' : ''),
        type: 'deleted'
      })
    } else {
      // Geändert - verwende Word-Diff für diesen Absatz
      const paraDiff = computeWordDiff(origPara, modPara)
      segments.push(...paraDiff)
      if (i < maxLength - 1) {
        segments.push({
          text: '\n\n',
          type: 'unchanged'
        })
      }
    }
  }
  
  return segments
}
