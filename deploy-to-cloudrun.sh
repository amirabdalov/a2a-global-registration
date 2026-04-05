#!/bin/bash
set -e

PROJECT_ID="winter-jet-492110-g9"
REGION="us-central1"
SERVICE_NAME="a2a-registration"

echo "=== A2A Global — Cloud Run Deployment ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Set project
gcloud config set project $PROJECT_ID

# Step 2: Enable APIs
echo ">>> Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  2>/dev/null || true

# Step 3: Clone the repo
echo ">>> Cloning repository..."
cd /tmp
rm -rf a2a-global-registration
git clone https://github.com/amirabdalov/a2a-global-registration.git
cd a2a-global-registration

# Step 4: Deploy directly from source (Cloud Build handles Docker)
echo ">>> Deploying to Cloud Run (this takes 2-4 minutes)..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 5000 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --quiet

# Step 5: Get the URL
echo ""
echo "=== DEPLOYMENT COMPLETE ==="
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')
echo "Your Cloud Run URL: $SERVICE_URL"
echo ""
echo "Next step: Map your subdomain (e.g., app.a2a.global) to this service:"
echo "  gcloud beta run domain-mappings create --service $SERVICE_NAME --domain app.a2a.global --region $REGION"
echo ""
echo "Or use the Cloud Run URL directly."
