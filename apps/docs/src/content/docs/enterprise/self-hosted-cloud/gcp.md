---
title: GCP
description: Deploy Voquill Enterprise on Google Cloud Platform.
---

This guide walks you through deploying Voquill Enterprise on GCP using Cloud Run and Cloud SQL.

## Prerequisites

- A GCP project with billing enabled.
- The [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and configured.
- Your Voquill Enterprise license key.

## 1. Provision a Cloud SQL PostgreSQL Instance

```bash
gcloud sql instances create voquill-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create voquill --instance=voquill-db

gcloud sql users set-password postgres \
  --instance=voquill-db \
  --password=your-db-password
```

Note the instance connection name (shown in `gcloud sql instances describe voquill-db`). You'll need it for the Cloud Run configuration.

## 2. Deploy the Gateway

```bash
gcloud run deploy voquill-gateway \
  --image=ghcr.io/josiahsrc/voquill/enterprise-gateway:latest \
  --port=4630 \
  --allow-unauthenticated \
  --add-cloudsql-instances=your-project:us-central1:voquill-db \
  --set-env-vars="DATABASE_URL=postgres://postgres:your-db-password@/voquill?host=/cloudsql/your-project:us-central1:voquill-db" \
  --set-env-vars="JWT_SECRET=your-jwt-secret" \
  --set-env-vars="ENCRYPTION_SECRET=your-encryption-secret" \
  --set-env-vars="LICENSE_KEY=your-license-key" \
  --region=us-central1
```

For production deployments, store secrets in Secret Manager and reference them with `--set-secrets` instead of `--set-env-vars`.

## 3. Deploy the Admin Portal

Set `VITE_GATEWAY_URL` to the public URL of the gateway service you deployed in the previous step. The admin portal needs this to communicate with the gateway.

```bash
gcloud run deploy voquill-admin \
  --image=ghcr.io/josiahsrc/voquill/enterprise-admin:latest \
  --port=5173 \
  --allow-unauthenticated \
  --set-env-vars="VITE_GATEWAY_URL=https://voquill-gateway-xxxxx-uc.a.run.app" \
  --region=us-central1
```

Note the URLs that Cloud Run assigns to each service. Use the gateway URL when configuring desktop clients and the admin URL to access the admin portal.

## Updating

To deploy a new version, redeploy the service with the latest image:

```bash
gcloud run deploy voquill-gateway \
  --image=ghcr.io/josiahsrc/voquill/enterprise-gateway:latest \
  --region=us-central1

gcloud run deploy voquill-admin \
  --image=ghcr.io/josiahsrc/voquill/enterprise-admin:latest \
  --region=us-central1
```

Cloud Run performs a rolling update automatically. Your data in Cloud SQL is not affected.
