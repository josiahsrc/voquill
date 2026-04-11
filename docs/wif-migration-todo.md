# Workload Identity Federation Migration - Manual Steps

SOC 2 compliance requires eliminating user-managed service account JSON keys.
Two branches (`fix-deployments`) contain the code changes. This doc covers
the manual GCP/GitHub steps needed to complete the migration.

---

## 1. Set up WIF on `voquill-prod` (for voquill/voquill repo)

The zoetis repo already has WIF configured. The voquill repo does not.

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions" \
  --project="voquill-prod" \
  --location="global" \
  --display-name="GitHub Actions"

# Create OIDC Provider for GitHub
gcloud iam workload-identity-pools providers create-oidc "github" \
  --project="voquill-prod" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'voquill'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get project number (save this — you need it for the next command and for GitHub secrets)
gcloud projects describe voquill-prod --format="value(projectNumber)"

# Allow firebase-adminsdk SA to be impersonated via WIF
# Replace PROJECT_NUMBER with the output from above
gcloud iam service-accounts add-iam-policy-binding \
  "firebase-adminsdk-fbsvc@voquill-prod.iam.gserviceaccount.com" \
  --project="voquill-prod" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/voquill/voquill"
```

## 2. Add GitHub secrets to `voquill/voquill`

Replace `PROJECT_NUMBER` with the value from step 1.

| Secret | Value |
|--------|-------|
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github` |
| `WIF_SERVICE_ACCOUNT` | `firebase-adminsdk-fbsvc@voquill-prod.iam.gserviceaccount.com` |

Add these as both repo-level secrets AND to the `web` environment (used by release-docs and release-web workflows).

## 3. Merge the `fix-deployments` branches

- [ ] `voquill/voquill` — merge `fix-deployments` into `main`
- [ ] `voquill/zoetis` — merge `fix-deployments` into `main`

## 4. Verify deployments work

- [ ] Trigger a PR to `main` on voquill touching `apps/web/` — verify `build-web.yml` preview deploy succeeds
- [ ] Merge a change to `apps/web/` — verify `release-web.yml` deploys
- [ ] Merge a change to `apps/docs/` — verify `release-docs.yml` deploys

## 5. Delete old JSON keys from GCP

Once deployments are verified, delete the user-managed keys from these service accounts
in the GCP console (IAM & Admin > Service Accounts > click account > Keys tab):

- [ ] `firebase-adminsdk-fbsvc@voquill-dev.iam.gserviceaccount.com` (voquill-dev project) — not used anywhere, just delete
- [ ] `firebase-adminsdk-fbsvc@voquill-prod.iam.gserviceaccount.com` (voquill-prod project) — delete after step 4 passes
- [ ] `github-actions@voquill-dev.iam.gserviceaccount.com` (voquill-dev project) — created by zoetis setup script, unused
- [ ] `github-actions@voquill-prod.iam.gserviceaccount.com` (voquill-prod project) — created by zoetis setup script, unused

## 6. Delete old GitHub secrets

- [ ] `voquill/voquill`: delete `FIREBASE_ADMIN_BASE64`
- [ ] `voquill/voquill`: delete `FIREBASE_SERVICE_ACCOUNT_VOQUILL_PROD`
- [ ] `voquill/zoetis`: delete `FIREBASE_SERVICE_ACCOUNT_DEV`
- [ ] `voquill/zoetis`: delete `FIREBASE_SERVICE_ACCOUNT_PROD`

## 7. Confirm OneLeet alerts clear

After the keys are deleted, the OneLeet alerts for "GCP user-managed service account keys"
should resolve within their next scan cycle.
