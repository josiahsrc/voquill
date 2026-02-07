---
title: Keycloak
description: Configure Keycloak as an OIDC identity provider for Voquill Enterprise.
---

This guide explains how to configure Keycloak as an OIDC identity provider for Voquill Enterprise. Keycloak is an open-source identity provider that can be self-hosted.

## Prerequisites

- A running Keycloak instance
- Voquill Enterprise gateway running
- Admin access to both Keycloak and the Voquill admin panel

## Keycloak Configuration

### 1. Create a Realm

1. Log into the Keycloak admin console
2. Click the dropdown in the top-left (shows "Keycloak" or "master")
3. Click **Create realm**
4. Enter a name (e.g., `voquill` or your company name)
5. Click **Create**

### 2. Create a Client

1. Go to **Clients** → **Create client**
2. Fill in:
   - **Client ID**: `voquill-desktop`
   - Click **Next**
3. Client authentication settings:
   - **Client authentication**: ON
   - Click **Next**
4. Login settings:
   - **Valid redirect URIs**: `https://your-gateway-url/auth/oidc/callback`
   - Click **Save**

### 3. Get the Client Secret

1. Go to the **Credentials** tab of your client
2. Copy the **Client secret**

### 4. Create Users

1. Go to **Users** → **Add user**
2. Fill in:
   - **Username**: (required)
   - **Email**: (required for Voquill)
   - **First name** / **Last name**: (optional)
3. Click **Create**
4. Go to the **Credentials** tab
5. Click **Set password**
6. Enter a password and turn off **Temporary**
7. Click **Save**

## Voquill Configuration

### Add the Identity Provider

1. Open the Voquill admin panel
2. Go to **Identity Providers**
3. Click **Add Provider**
4. Fill in:

| Field | Value |
| --- | --- |
| **Name** | `Keycloak` (or your company name) |
| **Issuer URL** | `https://your-keycloak-url/realms/{realm-name}` |
| **Client ID** | `voquill-desktop` (or whatever you named it) |
| **Client Secret** | The secret from Keycloak |
| **Enabled** | Yes |

5. Click **Save**

## Test the Flow

1. Open the Voquill desktop app
2. Connect to your enterprise server
3. You should see an SSO button with your provider name
4. Click it to authenticate via Keycloak
5. Sign in with your test user
6. You'll be redirected back and logged into Voquill

## Troubleshooting

### "Discovery failed" or connection errors

- Verify the Issuer URL is exactly correct (no trailing slash)
- Check that the realm name matches
- Ensure the gateway can reach Keycloak (network/firewall)

### "Redirect mismatch" error

The redirect URI in Keycloak must match exactly: `http(s)://gateway-url/auth/oidc/callback`

- Check http vs https
- Check the port number

### User not found after login

- Ensure the Keycloak user has an email address set
- The OIDC flow requires the `email` claim
