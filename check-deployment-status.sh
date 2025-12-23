#!/bin/bash

# Script zum Prüfen des Deployment-Status

export PATH="$PATH:/Users/mac-join/google-cloud-sdk/bin"
BUILD_ID="70109a72-eec7-43b8-be12-c13e3317f85b"
PROJECT_ID="gen-lang-client-0764998759"

echo "=== Deployment-Status ==="
echo ""

STATUS=$(gcloud builds describe $BUILD_ID --project=$PROJECT_ID --format="value(status)" 2>&1)
echo "Status: $STATUS"
echo ""

if [ "$STATUS" = "SUCCESS" ]; then
    echo "✅ Deployment erfolgreich!"
    echo ""
    echo "Service-URL:"
    gcloud run services describe anschreiben-app \
        --region europe-west1 \
        --project=$PROJECT_ID \
        --format="value(status.url)" 2>&1
    echo ""
    echo "Nächste Schritte:"
    echo "1. Service-URL testen"
    echo "2. Admin-Panel prüfen: /admin/database"
    echo "3. Cloud Storage Status prüfen"
elif [ "$STATUS" = "FAILURE" ]; then
    echo "❌ Deployment fehlgeschlagen"
    echo ""
    echo "Logs ansehen:"
    echo "gcloud builds log $BUILD_ID --project=$PROJECT_ID"
    echo ""
    echo "Oder in Cloud Console:"
    echo "https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=411832844870"
else
    echo "⏳ Deployment läuft noch..."
    echo ""
    echo "Aktuelle Schritte:"
    gcloud builds describe $BUILD_ID --project=$PROJECT_ID \
        --format="table(steps[].id,steps[].status)" 2>&1 | head -15
    echo ""
    echo "Vollständige Logs:"
    echo "https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=411832844870"
fi

