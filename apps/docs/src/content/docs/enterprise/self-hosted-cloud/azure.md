---
title: Azure
description: Deploy Voquill Enterprise on Microsoft Azure.
---

This guide walks you through deploying Voquill Enterprise on Azure using Azure Container Instances and Azure Database for PostgreSQL.

## Prerequisites

- An Azure subscription.
- The [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and configured.
- Your Voquill Enterprise license key.

## 1. Create a Resource Group

```bash
az group create --name voquill --location eastus
```

## 2. Provision a PostgreSQL Database

```bash
az postgres flexible-server create \
  --resource-group voquill \
  --name voquill-db \
  --admin-user postgres \
  --admin-password your-db-password \
  --sku-name Standard_B1ms \
  --version 16 \
  --storage-size 32
```

Note the fully qualified server name (e.g. `voquill-db.postgres.database.azure.com`). You'll use it in the `DATABASE_URL`.

Allow Azure services to connect:

```bash
az postgres flexible-server firewall-rule create \
  --resource-group voquill \
  --name voquill-db \
  --rule-name allow-azure \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## 3. Deploy the Gateway

```bash
az container create \
  --resource-group voquill \
  --name voquill-gateway \
  --image ghcr.io/josiahsrc/voquill/enterprise-gateway:latest \
  --ports 4630 \
  --ip-address Public \
  --environment-variables \
    DATABASE_URL="postgres://postgres:your-db-password@voquill-db.postgres.database.azure.com:5432/voquill?sslmode=require" \
    JWT_SECRET="your-jwt-secret" \
    ENCRYPTION_SECRET="your-encryption-secret" \
    LICENSE_KEY="your-license-key"
```

For production deployments, store secrets in Azure Key Vault and reference them using secure environment variables.

## 4. Deploy the Admin Portal

```bash
az container create \
  --resource-group voquill \
  --name voquill-admin \
  --image ghcr.io/josiahsrc/voquill/enterprise-admin:latest \
  --ports 5173 \
  --ip-address Public
```

Note the public IP addresses assigned to each container. Use the gateway IP when configuring desktop clients and the admin IP to access the admin portal.

## Updating

To deploy a new version, delete and recreate the container with the latest image:

```bash
az container delete --resource-group voquill --name voquill-gateway --yes

az container create \
  --resource-group voquill \
  --name voquill-gateway \
  --image ghcr.io/josiahsrc/voquill/enterprise-gateway:latest \
  --ports 4630 \
  --ip-address Public \
  --environment-variables \
    DATABASE_URL="postgres://postgres:your-db-password@voquill-db.postgres.database.azure.com:5432/voquill?sslmode=require" \
    JWT_SECRET="your-jwt-secret" \
    ENCRYPTION_SECRET="your-encryption-secret" \
    LICENSE_KEY="your-license-key"
```

Repeat for the admin service. Your data in PostgreSQL is not affected by container redeployments.

For zero-downtime deployments, consider using Azure Container Apps instead of Container Instances, which supports rolling updates and revision management.
