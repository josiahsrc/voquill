# Testing OIDC with Keycloak

This guide explains how to test OIDC SSO locally using the bundled Keycloak container.

## Start Keycloak

```bash
cd enterprise
docker compose up keycloak -d
```

Keycloak will be available at http://localhost:7340

## Configure Keycloak

1. **Login to admin console**
   - URL: http://localhost:7340
   - Username: `admin`
   - Password: `admin`

2. **Create a realm**
   - Click the dropdown in the top-left (shows "Keycloak")
   - Click "Create realm"
   - Name: `voquill-test`
   - Click "Create"

3. **Create a client**
   - Go to Clients → Create client
   - Client ID: `voquill-desktop`
   - Click "Next"
   - Client authentication: ON
   - Click "Next"
   - Valid redirect URIs: `http://localhost:4630/auth/oidc/callback`
   - Click "Save"
   - Go to the "Credentials" tab and copy the Client secret

4. **Create a test user**
   - Go to Users → Add user
   - Username: `testuser`
   - Email: `test@example.com`
   - First name / Last name: whatever you want
   - Click "Create"
   - Go to the "Credentials" tab
   - Click "Set password"
   - Enter a password, turn off "Temporary"
   - Click "Save"

## Configure Voquill

1. **Start the gateway and admin app**
   ```bash
   docker compose up gateway admin -d
   ```

2. **Add the OIDC provider in the admin app**
   - Open http://localhost:5100
   - Go to Identity Providers
   - Click "Add Provider"
   - Name: `Keycloak`
   - Issuer URL: `http://localhost:7340/realms/voquill-test`
   - Client ID: `voquill-desktop`
   - Client Secret: (paste from Keycloak)
   - Enabled: Yes
   - Click "Save"

## Test the flow

1. Run the desktop app in dev mode
2. On the login screen, you should see an SSO button for "Keycloak"
3. Click it → browser opens to Keycloak login
4. Sign in with your test user
5. You'll be redirected back and logged into Voquill

## Troubleshooting

- **Discovery fails**: Make sure the issuer URL is exactly `http://localhost:7340/realms/voquill-test` (no trailing slash)
- **Redirect mismatch**: Verify the redirect URI in Keycloak matches `http://localhost:4630/auth/oidc/callback`
- **User not found after login**: Check that the test user has an email set in Keycloak
