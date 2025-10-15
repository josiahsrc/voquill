locals {
  common_labels = {
    app = "voquill-hub"
  }
}

resource "google_storage_bucket" "version" {
  name                        = var.version_bucket_name
  project                     = var.project_id
  location                    = var.bucket_location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  labels = local.common_labels

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket_iam_binding" "version_public_read" {
  bucket = google_storage_bucket.version.name
  role   = "roles/storage.objectViewer"
  members = [
    "allUsers",
  ]
}

resource "google_storage_bucket" "binaries" {
  name                        = var.binaries_bucket_name
  project                     = var.project_id
  location                    = var.bucket_location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  labels = local.common_labels

  lifecycle {
    prevent_destroy = true
  }
}
