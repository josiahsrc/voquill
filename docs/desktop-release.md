# Desktop Release Configuration

## Release Flow Summary

- Pushes to the `main` branch always run the *Release Desktop* workflow in the **dev** channel.
  - The workflow bumps the previous `desktop-dev-v*` tag by one patch, tags the current `main` commit, and builds all platforms.
  - Built bundles are uploaded to `gs://<binaries-bucket>/desktop/dev/<version>/`.
  - The updater manifest (`latest.json`) and release summary are uploaded to `gs://<version-bucket>/desktop/dev/<version>/` with `latest.json` also copied to `gs://<version-bucket>/desktop/dev/latest.json`.
- Production promotions are manual (`workflow_dispatch`) runs of the same workflow.
  - Choose `environment: prod` (default) and optionally supply a `version` to promote a specific `desktop-dev-v<version>` tag; otherwise the newest dev tag is promoted.
  - Artifacts are published to the analogous `desktop/prod/...` prefixes in both buckets.
- During each build the Tauri config is patched so that the updater reads the correct environment-specific `latest.json` URL from the version bucket.

## Buckets Provisioned by Terraform

The hub Terraform module creates and exports the storage resources that the workflow expects:

| Output | Purpose | Access |
| --- | --- | --- |
| `version_bucket_name` | Public bucket that serves `latest.json` manifests. | Public read (`roles/storage.objectViewer` granted to `allUsers`). |
| `version_bucket_public_url` | HTTPS prefix for the version bucket (`https://storage.googleapis.com/<bucket>`). | Use in updater endpoints. |
| `binaries_bucket_name` | Private bucket that stores the actual platform bundles and installers. | Uniform bucket-level access with public access prevention enforced. |
| `desktop_release_service_account_email` | Service account principal that owns write permissions on both buckets. | Use when generating keys for CI. |

Retrieve the names after applying Terraform:

```sh
terraform -chdir=terraform/hub output -raw version_bucket_name
terraform -chdir=terraform/hub output -raw binaries_bucket_name
terraform -chdir=terraform/hub output -raw version_bucket_public_url
terraform -chdir=terraform/hub output -raw desktop_release_service_account_key_json
```

## Required GitHub Actions Secrets

| Secret | Description | How to obtain |
| --- | --- | --- |
| `TAURI_PRIVATE_KEY` | Tauri signing key used for bundle signing. | Generate with `npx tauri signer generate` (store the private key PEM output). |
| `TAURI_PRIVATE_KEY_PASSWORD` | Optional password for the signing key. Leave blank if the key is unencrypted. | Use the password you set when generating the key. |
| `TAURI_UPDATER_PUBLIC_KEY` | Public key that the desktop app uses to verify update signatures. | Output from `tauri signer generate` (the `public key` line). |
| `DESKTOP_VERSION_BUCKET` | Bucket hosting manifests (`version_bucket_name`). | Use the Terraform output above; supply only the bucket name (with or without `gs://` prefix). |
| `DESKTOP_BINARIES_BUCKET` | Bucket hosting binaries (`binaries_bucket_name`). | Use the Terraform output above. |
| `HUB_STORAGE_SERVICE_ACCOUNT_B64` | Base64-encoded service account JSON with write access to **both** buckets. | Download the JSON credentials for the Terraform-managed service account (`desktop_release_service_account_email`) and encode them with `base64 -w 0 key.json`. |

> Keep the `HUB_STORAGE_SERVICE_ACCOUNT_B64` secret name unless you also update the workflow; the token is consumed both for Google Cloud authentication and (if desired in the future) for signing download URLs.

## Service Account Expectations

1. Apply the Terraform module; it provisions the `desktop_release_service_account` with bucket write permissions.
2. If you intend to generate signed download URLs in CI, grant the service account `roles/iam.serviceAccountTokenCreator` at the project level (not handled automatically).
3. Create a JSON key for the service account (`gcloud iam service-accounts keys create ...`) and base64-encode it when populating the `HUB_STORAGE_SERVICE_ACCOUNT_B64` secret.

## Verifying a Dev Release

1. Push to `main` and wait for the *Release Desktop* workflow to finish.
2. Check the `metadata` job output for the new `desktop-dev-v*` tag.
3. Confirm that the binaries uploaded to the binaries bucket are **not** publicly readable (`gsutil ls -L gs://<binaries-bucket>/desktop/dev/<version>/` should show `Public access: Inherited` / `Not public`).
4. Fetch `https://storage.googleapis.com/<version-bucket>/desktop/dev/latest.json` in a browser to ensure the manifest is publicly accessible.
5. Launch the dev desktop app; the updater should point at the dev manifest URL injected during CI.

## Dev → Prod Promotion Checklist

1. Optionally verify that the desired dev tag exists (`git tag -l 'desktop-dev-v*' --sort=-v:refname`).
2. Trigger the *Release Desktop* workflow manually:
   - Leave `version` blank to promote the most recent dev tag, or set it to an explicit `x.y.z`.
   - Ensure `environment` is `prod`.
3. Validate uploads in both buckets under `desktop/prod/<version>/`.
4. Confirm the production manifest: `https://storage.googleapis.com/<version-bucket>/desktop/prod/latest.json`.

## Outstanding Item: Controlled Binary Downloads

The manifest currently records direct Google Cloud Storage URLs. Because the binaries bucket enforces public access prevention, update downloads will receive `403` responses until we introduce a download broker (for example, a Cloud Run/Cloud Functions endpoint that performs license checks and streams the binary) or generate long-lived signed URLs for each asset during CI.

- If you elect to broker downloads, update `scripts/ci/prepare-tauri-release.mjs` to rewrite each `platform.url` to your broker endpoint instead of the raw GCS URL.
- If you rely on signed URLs, extend the publish job to sign every object after uploading (using the decoded service account key) and replace the manifest URLs with the signed versions. Note that Google Cloud Storage V4 signed URLs expire after seven days; V2 signatures allow longer durations but require additional scripting.
- Until one of these mechanisms is in place, the simplest temporary workaround is to relax the binaries bucket restrictions (e.g., grant `roles/storage.objectViewer` to `allUsers`), though that conflicts with the stated requirement.

Keep this limitation in mind when validating end-to-end updates.
