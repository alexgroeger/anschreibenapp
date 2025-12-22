# Git Setup Anleitung

## Schritt 1: Repository auf GitHub erstellen

1. Gehe zu https://github.com und melde dich an
2. Klicke auf das "+" Symbol oben rechts → "New repository"
3. Gib einen Namen ein (z.B. `anschreiben-app`)
4. Wähle "Private" oder "Public"
5. **WICHTIG:** Aktiviere NICHT "Initialize with README"
6. Klicke auf "Create repository"

## Schritt 2: Remote hinzufügen

Nachdem du das Repository erstellt hast, kopiere die URL (z.B. `https://github.com/dein-username/anschreiben-app.git`)

Dann führe diese Befehle aus:

```bash
# Remote hinzufügen (ersetze URL mit deiner GitHub-URL)
git remote add origin https://github.com/DEIN-USERNAME/anschreiben-app.git

# Prüfen ob es funktioniert hat
git remote -v
```

## Schritt 3: Ersten Push durchführen

```bash
# Aktuellen Branch pushen
git push -u origin changes

# Oder wenn du auf main pushen möchtest:
git checkout main
git merge changes
git push -u origin main
```

## Alternative: Nur lokal arbeiten (ohne Remote)

Wenn du noch kein Remote-Repository brauchst, kannst du einfach lokal committen:

```bash
# Änderungen committen
git add .
git commit -m "Deine Commit-Nachricht"

# Später kannst du immer noch ein Remote hinzufügen
```

## Nützliche Git-Befehle

```bash
# Status anzeigen
git status

# Alle Änderungen anzeigen
git diff

# Commit-Historie anzeigen
git log --oneline

# Branch wechseln
git checkout main

# Branch erstellen
git checkout -b neuer-branch-name
```
