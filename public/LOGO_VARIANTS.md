# Logo-Varianten für Anschreiben Muckibude

Dieses Verzeichnis enthält verschiedene Logo-Varianten für die Anschreiben Muckibude App.

## Verfügbare Varianten

### 1. `logo-variant-1.svg`
- **Stil**: Klassisch mit Brief und Gewicht
- **Farben**: Blau (#3b82f6) für Brief, Rot (#ef4444) für Gewicht
- **Verwendung**: Hauptlogo, Navigation
- **Größe**: 200x60px

### 2. `logo-variant-2.svg`
- **Stil**: Minimalistisch mit Checkmark
- **Farben**: Blau für Brief, Grün für Checkmark, Rot für Gewicht
- **Verwendung**: Moderne UI, Dashboard
- **Größe**: 200x60px

### 3. `logo-variant-3.svg`
- **Stil**: Modern mit integriertem Design
- **Farben**: Blau mit Transparenz, Rot als Akzent
- **Verwendung**: Hero-Bereich, Landing-Page
- **Größe**: 200x60px

### 4. `logo-variant-4.svg`
- **Stil**: Einfach und klar
- **Farben**: Blau und Rot
- **Verwendung**: Kompakte Bereiche, Footer
- **Größe**: 200x60px

### 5. `logo-icon-only.svg`
- **Stil**: Nur Icon ohne Text
- **Farben**: Blau und Rot
- **Verwendung**: Favicon, App-Icon, kleine Bereiche
- **Größe**: 60x60px (quadratisch)

### 6. `logo-simple.svg`
- **Stil**: Sehr einfach und kompakt
- **Farben**: Blau und Rot
- **Verwendung**: Mobile Navigation, kompakte Header
- **Größe**: 200x50px

## Verwendung in der App

### Navigation-Komponente aktualisieren

Um ein Logo in der Navigation zu verwenden, aktualisieren Sie `components/Navigation.tsx`:

```tsx
import Image from 'next/image'

// Im Logo-Bereich:
<Link href="/" className="flex items-center space-x-2">
  <Image 
    src="/logo-variant-1.svg" 
    alt="Anschreiben Muckibude" 
    width={200} 
    height={60}
    className="h-8 w-auto"
  />
</Link>
```

### Favicon

Für das Favicon können Sie `logo-icon-only.svg` verwenden oder eine PNG-Version erstellen.

## Design-Philosophie

Die Logos kombinieren zwei Elemente:
- **Brief/Dokument**: Repräsentiert "Anschreiben" (Bewerbungsschreiben)
- **Gewicht/Hantel**: Repräsentiert "Muckibude" (Fitnessstudio)

Die Farben:
- **Blau**: Vertrauen, Professionalität (für Anschreiben)
- **Rot**: Energie, Stärke (für Muckibude/Fitness)

## Anpassungen

Alle Logos sind als SVG erstellt und können einfach angepasst werden:
- Farben können in jedem SVG-Editor geändert werden
- Größen können über CSS oder die `viewBox` angepasst werden
- Text kann entfernt oder angepasst werden

## Empfehlung

**Empfohlene Variante für den Start**: `logo-variant-1.svg` oder `logo-variant-2.svg`
- Gut lesbar
- Professionell
- Passt zur App-Funktionalität


