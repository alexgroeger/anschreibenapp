# Synchronisation der Admin-Konfigurationen

## Zusammenfassung der Änderungen

Die lokalen Konfigurationen aus dem Admin-Bereich wurden mit den Systemdateien verglichen und aktualisiert.

### 📝 Prompts

**Status:** Alle Prompts sind synchronisiert

- ✅ **extract.ts** - Keine Änderungen (bereits synchronisiert)
- ✅ **match.ts** - Keine Änderungen
- ✅ **generate.ts** - Keine Änderungen  
- ✅ **tone-analysis.ts** - Keine Änderungen

### ⚙️ Generierungs-Einstellungen

**Status:** 1 Einstellung wurde aktualisiert

#### Geänderte Einstellungen:

1. **excluded_formulations** (Ausgeschlossene Formulierungen)
   - **Vorher (System):** `""` (leer)
   - **Nachher (Admin → System):** `"mit großem Interesse habe ich Ihre Stellenausschreibung für die Position XYZ gelesen"`
   - **Datei:** `lib/database/init.ts` (Zeile 250)

#### Unveränderte Einstellungen:

- ✅ **default_tone:** "professionell"
- ✅ **default_focus:** "skills"
- ✅ **default_text_length:** "mittel"
- ✅ **default_formality:** "formal"
- ✅ **default_emphasis:** "kombiniert"
- ✅ **cover_letter_min_words:** "300"
- ✅ **cover_letter_max_words:** "400"
- ✅ **favorite_formulations:** "" (leer)

## Aktualisierte Dateien

1. **lib/database/init.ts**
   - Die Standardwerte für `excluded_formulations` wurden aktualisiert
   - Diese Werte werden bei der Datenbankinitialisierung verwendet

## Nächste Schritte

Die Konfigurationen sind jetzt in den Systemdateien gespeichert. Bei einer neuen Datenbankinitialisierung werden die aktualisierten Werte automatisch verwendet.

Um diese Synchronisation erneut durchzuführen, können Sie das Script ausführen:

```bash
npx tsx scripts/sync-admin-config.ts
```

