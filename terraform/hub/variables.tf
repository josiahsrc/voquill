variable "project_id" {
  description = "Google Cloud project ID that owns the hub infrastructure resources."
  type        = string
  default     = "voquill-hub"
}

variable "region" {
  description = "Google Cloud region for provider operations."
  type        = string
  default     = "us-central1"
}

variable "bucket_location" {
  description = "Regional location for storage buckets."
  type        = string
  default     = "us-central1"
}

variable "version_bucket_name" {
  description = "Name of the bucket that stores the latest release metadata JSON."
  type        = string
  default     = "voquill_version_us"
}

variable "binaries_bucket_name" {
  description = "Name of the bucket that stores release binaries."
  type        = string
  default     = "voquill_binaries_us"
}

variable "desktop_release_service_account_id" {
  description = "Service account ID (without domain suffix) that will be granted write access to desktop release buckets."
  type        = string
  default     = "desktop-release-publisher"
}
