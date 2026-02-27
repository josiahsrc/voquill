---
title: Azure Entra ID
description: Configure Azure Entra ID (Azure AD) as an OIDC identity provider for Voquill Enterprise.
---

This guide explains how to configure Azure Entra ID as an OIDC identity provider for Voquill Enterprise.

## Prerequisites

- An Azure account with access to Microsoft Entra ID
- Voquill Enterprise gateway running
- Admin access to the Voquill admin panel

## Azure Configuration

### 1. Register the Application

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com)
2. Navigate to **Identity** → **Applications** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `Voquill`
   - **Supported account types**: Select based on your needs (single tenant for most enterprise setups)
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `https://your-gateway-url/auth/oidc/callback`
5. Click **Register**

### 2. Note Your Application IDs

On the application's **Overview** page, copy these values:

| Field | Used For |
| --- | --- |
| **Application (client) ID** | Client ID in Voquill |
| **Directory (tenant) ID** | Constructing the Issuer URL |

### 3. Create a Client Secret

1. In the left sidebar, click **Certificates & secrets**
2. Go to the **Client secrets** tab
3. Click **New client secret**
4. Enter a description (e.g., `voquill-gateway`)
5. Choose an expiration period
6. Click **Add**
7. **Immediately copy the secret Value** (not the Secret ID) - it's only shown once

## Voquill Configuration

### Add the Identity Provider

1. Open the Voquill admin panel
2. Go to **Identity Providers**
3. Click **Add Provider**
4. Fill in:

| Field | Value |
| --- | --- |
| **Name** | `Microsoft` (appears on the login button) |
| **Issuer URL** | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| **Client ID** | Application (client) ID from Azure |
| **Client Secret** | The secret value you created |
| **Enabled** | Yes |

Replace `{tenant-id}` with your Directory (tenant) ID from Azure.

5. Click **Save**

## Test the Flow

1. Open the Voquill desktop app
2. Connect to your enterprise server
3. You should see a "Microsoft" SSO button
4. Click it to authenticate via Azure

## Troubleshooting

### "AADSTS50011: The redirect URI does not match"

The redirect URI in Azure doesn't match what the gateway is sending.

- Verify the redirect URI in Azure App Registration matches your gateway URL exactly
- Include the full path: `/auth/oidc/callback`
- Check http vs https

### "AADSTS700016: Application not found"

- Verify the Client ID is correct
- Make sure you're using the Application (client) ID, not the Object ID

### "Invalid issuer" error

- Verify the tenant ID in your Issuer URL is correct
- The URL must end with `/v2.0`
- No trailing slash after `v2.0`

### User signs in but isn't created in Voquill

- Check that the Azure user has an email address set
- The OIDC flow requires the `email` claim to create/match users
