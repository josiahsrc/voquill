output "version_bucket_name" {
  description = "Bucket storing release metadata JSON."
  value       = google_storage_bucket.version.name
}

output "version_bucket_public_url" {
  description = "HTTPS base URL that clients can use to read release metadata."
  value       = "https://storage.googleapis.com/${google_storage_bucket.version.name}"
}

output "binaries_bucket_name" {
  description = "Bucket storing release binaries."
  value       = google_storage_bucket.binaries.name
}
