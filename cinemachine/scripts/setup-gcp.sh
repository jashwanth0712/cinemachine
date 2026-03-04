#!/bin/bash
# Cinemachine GCP Infrastructure Setup
# Prerequisites: gcloud CLI installed, authenticated, billing active on project cinemachine-app
#
# IMPORTANT: Before running this script:
# 1. Go to https://console.cloud.google.com/billing
# 2. Reactivate a billing account
# 3. Link it to project cinemachine-app

set -euo pipefail
PROJECT_ID="cinemachine-app"
REGION="us-central1"
SERVICE_ACCOUNT="cinemachine-backend"
DB_INSTANCE="cinemachine-db"
DB_NAME="cinemachine"
BUCKET_NAME="cinemachine-videos-$(openssl rand -hex 4)"

echo "=== Step 1: Enable Required APIs ==="
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  secretmanager.googleapis.com \
  --project=$PROJECT_ID

echo "=== Step 2: Create Service Account ==="
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --display-name="Cinemachine Backend" \
  --project=$PROJECT_ID || echo "Service account may already exist"

SA_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

for ROLE in cloudsql.client storage.objectAdmin aiplatform.user secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/${ROLE}" \
    --quiet
done
echo "Roles granted to $SA_EMAIL"

echo "=== Step 3: Create Cloud SQL Postgres Instance ==="
gcloud sql instances create $DB_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --project=$PROJECT_ID \
  --root-password="$(openssl rand -base64 24)" || echo "Instance may already exist"

gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE \
  --project=$PROJECT_ID || echo "Database may already exist"

echo "=== Step 4: Create GCS Bucket ==="
gcloud storage buckets create "gs://${BUCKET_NAME}" \
  --location=$REGION \
  --default-storage-class=STANDARD \
  --project=$PROJECT_ID || echo "Bucket may already exist"

# Lifecycle: move to Nearline after 90 days
cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 90}
    }
  ]
}
EOF
gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file=/tmp/lifecycle.json

# CORS for signed URL uploads from mobile
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF
gcloud storage buckets update "gs://${BUCKET_NAME}" --cors-file=/tmp/cors.json

echo "=== Step 5: Store Secrets ==="
DB_PASSWORD=$(openssl rand -base64 24)

echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=- --project=$PROJECT_ID || echo "Secret may already exist"

echo "NOTE: You must manually add these secrets:"
echo "  - gemini-api-key: Your Gemini API key"
echo "  - oauth-client-secret: Your OAuth client secret"
echo ""
echo "Run:"
echo "  echo -n 'YOUR_KEY' | gcloud secrets create gemini-api-key --data-file=- --project=$PROJECT_ID"
echo "  echo -n 'YOUR_SECRET' | gcloud secrets create oauth-client-secret --data-file=- --project=$PROJECT_ID"

echo ""
echo "=== Step 6: Manual Steps Required ==="
echo "1. Go to https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "2. Configure OAuth consent screen (External, test mode)"
echo "3. Create OAuth 2.0 Client ID (Web application)"
echo "4. Add authorized redirect URIs for Expo AuthSession"
echo "5. Copy the Client ID into your app config"

echo ""
echo "=== Summary ==="
echo "Project:         $PROJECT_ID"
echo "Region:          $REGION"
echo "Service Account: $SA_EMAIL"
echo "DB Instance:     $DB_INSTANCE"
echo "Database:        $DB_NAME"
echo "GCS Bucket:      $BUCKET_NAME"
echo "DB Password:     stored in Secret Manager as 'db-password'"

echo ""
echo "=== Next: Deploy Backend ==="
echo "gcloud run deploy cinemachine-api \\"
echo "  --source=./backend \\"
echo "  --region=$REGION \\"
echo "  --service-account=$SA_EMAIL \\"
echo "  --allow-unauthenticated \\"
echo "  --add-cloudsql-instances=${PROJECT_ID}:${REGION}:${DB_INSTANCE} \\"
echo "  --session-affinity \\"
echo "  --min-instances=0 --max-instances=10 \\"
echo "  --memory=512Mi --timeout=3600 \\"
echo "  --project=$PROJECT_ID"
