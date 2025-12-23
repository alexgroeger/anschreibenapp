# Berechtigungsproblem beheben

## Problem
Sie haben nicht die notwendigen Berechtigungen für Cloud Build.

## Lösung

### Option 1: Über Google Cloud Console (Empfohlen)

1. Gehen Sie zu: https://console.cloud.google.com/iam-admin/iam?project=gen-lang-client-0764998759
2. Klicken Sie auf "GRANT ACCESS" oder "Berechtigung gewähren"
3. Geben Sie Ihre E-Mail ein: `alexander.groeger@googlemail.com`
4. Fügen Sie folgende Rollen hinzu:
   - **Cloud Build Editor** (oder **Cloud Build Service Account**)
   - **Service Account User**
   - **Storage Admin** (für Container Registry)
   - **Cloud Run Admin** (für Deployment)

### Option 2: Über gcloud CLI

Falls Sie Owner/Admin-Rechte haben, können Sie sich selbst die Berechtigungen geben:

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

# Cloud Build Berechtigungen
gcloud projects add-iam-policy-binding gen-lang-client-0764998759 \
  --member="user:alexander.groeger@googlemail.com" \
  --role="roles/cloudbuild.builds.editor"

# Storage Admin für Container Registry
gcloud projects add-iam-policy-binding gen-lang-client-0764998759 \
  --member="user:alexander.groeger@googlemail.com" \
  --role="roles/storage.admin"

# Cloud Run Admin
gcloud projects add-iam-policy-binding gen-lang-client-0764998759 \
  --member="user:alexander.groeger@googlemail.com" \
  --role="roles/run.admin"

# Service Account User
gcloud projects add-iam-policy-binding gen-lang-client-0764998759 \
  --member="user:alexander.groeger@googlemail.com" \
  --role="roles/iam.serviceAccountUser"
```

### Option 3: Owner/Admin werden

Falls Sie der Projektbesitzer sind, können Sie sich Owner-Rolle geben:

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud projects add-iam-policy-binding gen-lang-client-0764998759 \
  --member="user:alexander.groeger@googlemail.com" \
  --role="roles/owner"
```

## Nach dem Beheben

Führen Sie erneut aus:
```bash
cd "/Users/mac-join/Documents/Cursor/Repos/Anschreiben App"
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud builds submit --tag gcr.io/gen-lang-client-0764998759/anschreiben-app
```
