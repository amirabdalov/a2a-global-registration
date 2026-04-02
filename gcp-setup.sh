#!/bin/bash
# A2A Global — Google Cloud Setup Script
# Run this after creating your GCP project

PROJECT_ID="a2a-global-prod"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create a2a-global \
  --repository-format=docker \
  --location=us-central1 \
  --description="A2A Global Docker images"

# Create Firestore database (Mumbai for India-proximate access)
gcloud firestore databases create \
  --location=asia-south1

# Store API keys as secrets
echo -n "YOUR_RESEND_API_KEY" | gcloud secrets create resend-api-key --data-file=-
echo -n "YOUR_SMS_API_KEY" | gcloud secrets create sms-api-key --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding resend-api-key \
  --member="serviceAccount:$(gcloud iam service-accounts list --filter='displayName:Default compute service account' --format='value(email)')" \
  --role="roles/secretmanager.secretAccessor"

# Deploy from source
gcloud run deploy a2a-registration \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,HOSTNAME=0.0.0.0"

echo "Done! Your service is deployed."
echo "Map your custom domain: gcloud beta run domain-mappings create --service a2a-registration --domain a2a.global --region us-central1"
