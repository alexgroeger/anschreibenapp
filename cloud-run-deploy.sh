#!/bin/bash

# Google Cloud Run Deployment Script
# This script helps deploy the Anschreiben Muckibude to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE_NAME="anschreiben-app"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}GCP_PROJECT_ID is not set.${NC}"
    echo "Please set it: export GCP_PROJECT_ID=your-project-id"
    exit 1
fi

echo -e "${GREEN}Starting deployment to Google Cloud Run...${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"
echo ""

# Set the project
echo -e "${YELLOW}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the image
echo -e "${YELLOW}Building Docker image...${NC}"
gcloud builds submit --tag $IMAGE_NAME

# Check if API key is set
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo -e "${YELLOW}Warning: GOOGLE_GENERATIVE_AI_API_KEY is not set.${NC}"
    echo "You can set it later via:"
    echo "gcloud run services update $SERVICE_NAME --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY=your-key"
    echo ""
    read -p "Do you want to continue without setting the API key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    ENV_VARS=""
else
    ENV_VARS="--set-env-vars GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY"
fi

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    $ENV_VARS

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo ""
echo -e "${GREEN}Deployment successful!${NC}"
echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
echo ""
echo "Next steps:"
echo "1. Configure your domain (if needed):"
echo "   gcloud run domain-mappings create --service $SERVICE_NAME --domain your-domain.com --region $REGION"
echo ""
echo "2. Update environment variables:"
echo "   gcloud run services update $SERVICE_NAME --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY=your-key --region $REGION"
echo ""
echo "3. View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region $REGION"
