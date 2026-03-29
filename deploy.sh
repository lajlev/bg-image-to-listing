#!/usr/bin/env bash
set -euo pipefail

# Load env vars from backend/.env
export $(grep -v '^#' backend/.env | xargs)

gcloud run deploy bg-image-to-listing \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=${OPENAI_API_KEY},BGG_API_TOKEN=${BGG_API_TOKEN},AUTH_USER=${AUTH_USER},AUTH_PASS=${AUTH_PASS}" \
  --timeout 300 \
  --memory 512Mi
