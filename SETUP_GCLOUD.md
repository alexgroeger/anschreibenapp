# Google Cloud SDK Installation

Falls gcloud noch nicht funktioniert, installieren Sie es manuell:

## Option 1: Manuelle Installation (Empfohlen)

1. Öffnen Sie ein Terminal
2. Führen Sie aus:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

3. Initialisieren Sie gcloud:
```bash
gcloud init
```

## Option 2: Über Homebrew (falls installiert)

```bash
brew install --cask google-cloud-sdk
```

## Nach der Installation

Führen Sie aus:
```bash
gcloud auth login
gcloud config set project gen-lang-client-0764998759
```
