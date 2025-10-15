resource "google_service_account" "desktop_release" {
  account_id   = var.desktop_release_service_account_id
  display_name = "Desktop Release Publisher"

  depends_on = [
    google_storage_bucket.version,
    google_storage_bucket.binaries,
  ]
}

resource "google_storage_bucket_iam_member" "version_release_writer" {
  bucket = google_storage_bucket.version.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.desktop_release.email}"
}

resource "google_storage_bucket_iam_member" "binaries_release_writer" {
  bucket = google_storage_bucket.binaries.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.desktop_release.email}"
}

resource "google_service_account_key" "desktop_release_key" {
  service_account_id = google_service_account.desktop_release.id
  keepers = {
    last_rotation = "2025-10-15"
  }
}
