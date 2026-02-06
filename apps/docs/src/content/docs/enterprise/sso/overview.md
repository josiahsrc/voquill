---
title: Single Sign-On (SSO)
description: Configure OIDC-based Single Sign-On for Voquill Enterprise.
---

Voquill Enterprise supports OIDC-based Single Sign-On, allowing users to authenticate via their organization's identity provider.

## Supported Providers

Any OIDC-compliant identity provider should work. Tested providers include:

- [Azure Entra ID (Azure AD)](/enterprise/sso/azure-entra-id/)
- [Keycloak](/enterprise/sso/keycloak/)

## How It Works

1. Admin configures an OIDC provider in the Voquill admin panel (Issuer URL, Client ID, Client Secret)
2. Users see an SSO button on the Voquill login screen
3. Clicking it opens their browser to the identity provider
4. After authentication, they're redirected back and logged into Voquill
5. Users are automatically created on first login (JIT provisioning)

## Adding a New Provider

In the Voquill admin panel:

1. Go to **Identity Providers**
2. Click **Add Provider**
3. Fill in:
   - **Name**: Display name for the login button
   - **Issuer URL**: The OIDC issuer URL (usually ends with a path like `/v2.0` or `/realms/name`)
   - **Client ID**: From your identity provider
   - **Client Secret**: From your identity provider
   - **Enabled**: Toggle on
4. Save

## Required OIDC Claims

Voquill requires the following claims from the ID token:

| Claim | Required | Description |
| --- | --- | --- |
| `sub` | Yes | Unique user identifier |
| `email` | Yes | User's email address |
| `name` | No | User's display name |
