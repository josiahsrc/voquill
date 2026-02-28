use std::io::ErrorKind;
use std::path::Path as FsPath;
use std::time::Instant;

use axum::extract::{DefaultBodyLimit, Path, Query, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::ApiError;
use crate::models::WhisperModel;
use crate::state::AppState;
use crate::transcription::{ProcessorInfo, TranscriptionInput};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(get_health))
        .route("/v1/models/:model/download", post(download_model))
        .route(
            "/v1/models/:model/download/:job_id",
            get(get_download_progress),
        )
        .route("/v1/models/:model", delete(delete_model))
        .route("/v1/models/:model/status", get(get_model_status))
        .route("/v1/processors", get(list_processors))
        .route(
            "/v1/processors/selected",
            get(get_selected_processor).put(set_selected_processor),
        )
        .route("/v1/transcriptions", post(transcribe))
        .layer(DefaultBodyLimit::max(250 * 1024 * 1024))
        .with_state(state)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: &'static str,
    mode: &'static str,
}

async fn get_health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        mode: state.config.mode.as_str(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessorListResponse {
    processors: Vec<ProcessorInfo>,
    selected_processor_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SelectedProcessorResponse {
    processor: ProcessorInfo,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetSelectedProcessorRequest {
    processor_id: String,
}

async fn list_processors(
    State(state): State<AppState>,
) -> Result<Json<ProcessorListResponse>, ApiError> {
    let processors = state.transcriber.list_processors();
    let selected = state
        .transcriber
        .get_selected_processor()
        .map_err(|err| ApiError::internal("processor_state_unavailable", err))?;

    Ok(Json(ProcessorListResponse {
        processors,
        selected_processor_id: selected.id,
    }))
}

async fn get_selected_processor(
    State(state): State<AppState>,
) -> Result<Json<SelectedProcessorResponse>, ApiError> {
    let processor = state
        .transcriber
        .get_selected_processor()
        .map_err(|err| ApiError::internal("processor_state_unavailable", err))?;

    Ok(Json(SelectedProcessorResponse { processor }))
}

async fn set_selected_processor(
    State(state): State<AppState>,
    Json(request): Json<SetSelectedProcessorRequest>,
) -> Result<Json<SelectedProcessorResponse>, ApiError> {
    let processor = state
        .transcriber
        .set_selected_processor(&request.processor_id)
        .map_err(|err| ApiError::bad_request("invalid_processor", err))?;

    Ok(Json(SelectedProcessorResponse { processor }))
}

#[derive(Debug, Deserialize)]
struct ModelPath {
    model: String,
}

#[derive(Debug, Deserialize)]
struct DownloadProgressPath {
    model: String,
    job_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelStatusQuery {
    validate: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelStatusResponse {
    model: WhisperModel,
    downloaded: bool,
    valid: bool,
    file_bytes: Option<u64>,
    validation_error: Option<String>,
}

async fn download_model(
    State(state): State<AppState>,
    Path(path): Path<ModelPath>,
) -> Result<Json<crate::downloads::DownloadJobSnapshot>, ApiError> {
    let model = parse_model(&path.model)?;
    let destination = state.model_path(model);
    let url = model.download_url();

    let snapshot = state
        .downloads
        .start_or_get_active(model, url, destination, state.http_client.clone())
        .await
        .map_err(|err| ApiError::internal("download_start_failed", err))?;

    Ok(Json(snapshot))
}

async fn get_download_progress(
    State(state): State<AppState>,
    Path(path): Path<DownloadProgressPath>,
) -> Result<Json<crate::downloads::DownloadJobSnapshot>, ApiError> {
    let model = parse_model(&path.model)?;
    let job_id = Uuid::parse_str(path.job_id.trim())
        .map_err(|_| ApiError::bad_request("invalid_job_id", "jobId must be a valid UUID"))?;

    let snapshot = state
        .downloads
        .get_job(model, job_id)
        .await
        .ok_or_else(|| ApiError::not_found("download_not_found", "download job was not found"))?;

    Ok(Json(snapshot))
}

async fn get_model_status(
    State(state): State<AppState>,
    Path(path): Path<ModelPath>,
    Query(query): Query<ModelStatusQuery>,
) -> Result<Json<ModelStatusResponse>, ApiError> {
    let model = parse_model(&path.model)?;
    let status = read_model_status(&state, model, query.validate.unwrap_or(true)).await?;
    Ok(Json(status))
}

async fn delete_model(
    State(state): State<AppState>,
    Path(path): Path<ModelPath>,
) -> Result<Json<ModelStatusResponse>, ApiError> {
    let model = parse_model(&path.model)?;

    if let Some(active_job) = state.downloads.get_active_job(model).await {
        if matches!(
            active_job.status,
            crate::downloads::DownloadJobStatus::Pending
                | crate::downloads::DownloadJobStatus::Running
        ) {
            return Err(ApiError::bad_request(
                "download_in_progress",
                format!(
                    "model '{}' is currently downloading; wait for it to finish before deleting",
                    model.as_slug()
                ),
            ));
        }
    }

    let model_path = state.model_path(model);
    match tokio::fs::remove_file(&model_path).await {
        Ok(_) => {}
        Err(err) if err.kind() == ErrorKind::NotFound => {}
        Err(err) => {
            return Err(ApiError::internal(
                "model_delete_failed",
                format!("failed to delete model '{}': {err}", model.as_slug()),
            ));
        }
    }

    remove_partial_model_downloads(&model_path, model).await?;
    let status = read_model_status(&state, model, false).await?;
    Ok(Json(status))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscribeRequest {
    model: WhisperModel,
    samples: Vec<f32>,
    sample_rate: u32,
    language: Option<String>,
    initial_prompt: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscribeResponse {
    text: String,
    model: WhisperModel,
    inference_device: String,
    duration_ms: u128,
}

async fn transcribe(
    State(state): State<AppState>,
    Json(request): Json<TranscribeRequest>,
) -> Result<Json<TranscribeResponse>, ApiError> {
    let model_path = state.model_path(request.model);

    let metadata = tokio::fs::metadata(&model_path).await.map_err(|_| {
        ApiError::not_found(
            "model_not_downloaded",
            format!(
                "model '{}' is not downloaded; call /v1/models/{}/download first",
                request.model.as_slug(),
                request.model.as_slug()
            ),
        )
    })?;

    if !metadata.is_file() || metadata.len() == 0 {
        return Err(ApiError::not_found(
            "model_not_downloaded",
            format!(
                "model '{}' is not downloaded; call /v1/models/{}/download first",
                request.model.as_slug(),
                request.model.as_slug()
            ),
        ));
    }

    let started = Instant::now();
    let output = state
        .transcriber
        .transcribe(TranscriptionInput {
            model_path,
            samples: request.samples,
            sample_rate: request.sample_rate,
            language: request.language,
            initial_prompt: request.initial_prompt,
        })
        .await
        .map_err(map_transcription_error)?;

    Ok(Json(TranscribeResponse {
        text: output.text,
        model: request.model,
        inference_device: output.inference_device,
        duration_ms: started.elapsed().as_millis(),
    }))
}

fn parse_model(value: &str) -> Result<WhisperModel, ApiError> {
    WhisperModel::from_slug(value).ok_or_else(|| {
        ApiError::bad_request(
            "invalid_model",
            format!(
                "unsupported model '{}'; supported values: {}",
                value,
                WhisperModel::supported().join(", ")
            ),
        )
    })
}

async fn read_model_status(
    state: &AppState,
    model: WhisperModel,
    validate: bool,
) -> Result<ModelStatusResponse, ApiError> {
    let model_path = state.model_path(model);
    let metadata = tokio::fs::metadata(&model_path).await.ok();

    let downloaded = metadata
        .as_ref()
        .map(|meta| meta.is_file() && meta.len() > 0)
        .unwrap_or(false);

    let file_bytes = metadata.map(|meta| meta.len());

    if !downloaded {
        return Ok(ModelStatusResponse {
            model,
            downloaded: false,
            valid: false,
            file_bytes,
            validation_error: None,
        });
    }

    if !validate {
        return Ok(ModelStatusResponse {
            model,
            downloaded: true,
            valid: true,
            file_bytes,
            validation_error: None,
        });
    }

    match state.transcriber.validate_model(model_path).await {
        Ok(valid) => Ok(ModelStatusResponse {
            model,
            downloaded: true,
            valid,
            file_bytes,
            validation_error: None,
        }),
        Err(err) => Ok(ModelStatusResponse {
            model,
            downloaded: true,
            valid: false,
            file_bytes,
            validation_error: Some(err),
        }),
    }
}

async fn remove_partial_model_downloads(
    model_path: &FsPath,
    model: WhisperModel,
) -> Result<(), ApiError> {
    let parent = match model_path.parent() {
        Some(parent) => parent,
        None => return Ok(()),
    };
    let filename = match model_path.file_name().and_then(|name| name.to_str()) {
        Some(filename) => filename,
        None => return Ok(()),
    };
    let prefix = format!("{filename}.");

    let mut entries = match tokio::fs::read_dir(parent).await {
        Ok(entries) => entries,
        Err(err) if err.kind() == ErrorKind::NotFound => return Ok(()),
        Err(err) => {
            return Err(ApiError::internal(
                "model_delete_failed",
                format!(
                    "failed to inspect model directory for '{}': {err}",
                    model.as_slug()
                ),
            ));
        }
    };

    while let Some(entry) = entries.next_entry().await.map_err(|err| {
        ApiError::internal(
            "model_delete_failed",
            format!(
                "failed to enumerate partial model downloads for '{}': {err}",
                model.as_slug()
            ),
        )
    })? {
        let file_name = match entry.file_name().to_str() {
            Some(value) => value.to_string(),
            None => continue,
        };

        if !file_name.starts_with(&prefix) || !file_name.ends_with(".download") {
            continue;
        }

        let partial_path = entry.path();
        match tokio::fs::remove_file(&partial_path).await {
            Ok(_) => {}
            Err(err) if err.kind() == ErrorKind::NotFound => {}
            Err(err) => {
                return Err(ApiError::internal(
                    "model_delete_failed",
                    format!(
                        "failed to delete partial model file '{}' for '{}': {err}",
                        partial_path.display(),
                        model.as_slug()
                    ),
                ));
            }
        }
    }

    Ok(())
}

fn map_transcription_error(error: String) -> ApiError {
    let lower = error.to_ascii_lowercase();

    if lower.contains("sample") || lower.contains("language") || lower.contains("prompt") {
        ApiError::bad_request("invalid_transcription_request", error)
    } else {
        ApiError::internal("transcription_failed", error)
    }
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::util::ServiceExt;

    use crate::compute::ComputeMode;
    use crate::config::SidecarConfig;

    use super::*;

    fn test_state() -> AppState {
        let temp_dir =
            std::env::temp_dir().join(format!("rust-transcription-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("failed to create temp dir");

        AppState::new(SidecarConfig {
            mode: ComputeMode::Cpu,
            host: "127.0.0.1".parse().expect("valid ip"),
            port: 0,
            models_dir: temp_dir,
        })
        .expect("failed to build app state")
    }

    #[tokio::test]
    async fn health_endpoint_returns_mode() {
        let app = create_router(test_state());
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn status_endpoint_rejects_unknown_model() {
        let app = create_router(test_state());
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/v1/models/nano/status")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn status_endpoint_reports_missing_model() {
        let app = create_router(test_state());
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/v1/models/tiny/status")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn delete_endpoint_handles_missing_model() {
        let app = create_router(test_state());
        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri("/v1/models/tiny")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
