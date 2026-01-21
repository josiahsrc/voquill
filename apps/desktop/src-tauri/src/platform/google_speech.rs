use prost::Message;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tonic::codegen::http::uri::PathAndQuery;
use tonic::metadata::MetadataValue;
use tonic::transport::{Channel, Uri};
use tonic::Streaming;

// Chirp 3 requires regional endpoints - using "us" region
const GOOGLE_SPEECH_ENDPOINT: &str = "https://us-speech.googleapis.com";

#[derive(Clone, PartialEq, Message)]
pub struct StreamingRecognizeRequest {
    #[prost(string, tag = "3")]
    pub recognizer: String,
    #[prost(oneof = "streaming_recognize_request::StreamingRequest", tags = "6, 5")]
    pub streaming_request: Option<streaming_recognize_request::StreamingRequest>,
}

pub mod streaming_recognize_request {
    use super::*;

    #[derive(Clone, PartialEq, Message)]
    pub struct StreamingConfig {
        #[prost(message, optional, tag = "1")]
        pub config: Option<super::RecognitionConfig>,
        #[prost(message, optional, tag = "2")]
        pub streaming_features: Option<super::StreamingRecognitionFeatures>,
    }

    #[derive(Clone, PartialEq, prost::Oneof)]
    pub enum StreamingRequest {
        #[prost(message, tag = "6")]
        StreamingConfig(StreamingConfig),
        #[prost(bytes, tag = "5")]
        Audio(Vec<u8>),
    }
}

#[derive(Clone, PartialEq, Message)]
pub struct RecognitionConfig {
    #[prost(message, optional, tag = "8")]
    pub explicit_decoding_config: Option<ExplicitDecodingConfig>,
    #[prost(string, tag = "9")]
    pub model: String,
    #[prost(string, repeated, tag = "10")]
    pub language_codes: Vec<String>,
    #[prost(message, optional, tag = "2")]
    pub features: Option<RecognitionFeatures>,
}

#[derive(Clone, PartialEq, Message)]
pub struct ExplicitDecodingConfig {
    #[prost(enumeration = "AudioEncoding", tag = "1")]
    pub encoding: i32,
    #[prost(int32, tag = "2")]
    pub sample_rate_hertz: i32,
    #[prost(int32, tag = "3")]
    pub audio_channel_count: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, prost::Enumeration)]
#[repr(i32)]
pub enum AudioEncoding {
    Unspecified = 0,
    Linear16 = 1,
    Mulaw = 2,
    Alaw = 3,
}

#[derive(Clone, PartialEq, Message)]
pub struct RecognitionFeatures {
    #[prost(bool, tag = "1")]
    pub profanity_filter: bool,
    #[prost(bool, tag = "2")]
    pub enable_word_time_offsets: bool,
    #[prost(bool, tag = "3")]
    pub enable_word_confidence: bool,
    #[prost(bool, tag = "4")]
    pub enable_automatic_punctuation: bool,
    #[prost(bool, tag = "14")]
    pub enable_spoken_punctuation: bool,
    #[prost(bool, tag = "15")]
    pub enable_spoken_emojis: bool,
}

#[derive(Clone, PartialEq, Message)]
pub struct StreamingRecognitionFeatures {
    #[prost(bool, tag = "1")]
    pub enable_voice_activity_events: bool,
    #[prost(int32, tag = "2")]
    pub interim_results: i32,
}

#[derive(Clone, PartialEq, Message)]
pub struct StreamingRecognizeResponse {
    #[prost(message, repeated, tag = "6")]
    pub results: Vec<StreamingRecognitionResult>,
    #[prost(enumeration = "SpeechEventType", tag = "3")]
    pub speech_event_type: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, prost::Enumeration)]
#[repr(i32)]
pub enum SpeechEventType {
    Unspecified = 0,
    EndOfSingleUtterance = 1,
    SpeechActivityBegin = 2,
    SpeechActivityEnd = 3,
    SpeechActivityTimeout = 4,
}

#[derive(Clone, PartialEq, Message)]
pub struct StreamingRecognitionResult {
    #[prost(message, repeated, tag = "1")]
    pub alternatives: Vec<SpeechRecognitionAlternative>,
    #[prost(bool, tag = "2")]
    pub is_final: bool,
    #[prost(float, tag = "3")]
    pub stability: f32,
}

#[derive(Clone, PartialEq, Message)]
pub struct SpeechRecognitionAlternative {
    #[prost(string, tag = "1")]
    pub transcript: String,
    #[prost(float, tag = "2")]
    pub confidence: f32,
}

#[derive(Debug)]
pub struct GoogleChirpConfig {
    pub service_account_json: String,
    pub sample_rate: u32,
    pub language: String,
}

pub struct GoogleChirpSession {
    audio_tx: Option<mpsc::Sender<Vec<f32>>>,
    final_transcript: Arc<Mutex<String>>,
    partial_transcript: Arc<Mutex<String>>,
    stream_done_rx: Arc<Mutex<Option<tokio::sync::oneshot::Receiver<()>>>>,
    _task_handle: tauri::async_runtime::JoinHandle<()>,
}

mod speech_client {
    use super::*;
    use tonic::codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder};
    use tonic::{Code, Status};

    #[derive(Debug, Clone)]
    pub struct ProstCodec<T, U>(std::marker::PhantomData<(T, U)>);

    impl<T, U> Default for ProstCodec<T, U> {
        fn default() -> Self {
            Self(std::marker::PhantomData)
        }
    }

    impl<T, U> Codec for ProstCodec<T, U>
    where
        T: Message + Send + 'static,
        U: Message + Default + Send + 'static,
    {
        type Encode = T;
        type Decode = U;
        type Encoder = ProstEncoder<T>;
        type Decoder = ProstDecoder<U>;

        fn encoder(&mut self) -> Self::Encoder {
            ProstEncoder(std::marker::PhantomData)
        }

        fn decoder(&mut self) -> Self::Decoder {
            ProstDecoder(std::marker::PhantomData)
        }
    }

    #[derive(Debug, Clone)]
    pub struct ProstEncoder<T>(std::marker::PhantomData<T>);

    impl<T: Message> Encoder for ProstEncoder<T> {
        type Item = T;
        type Error = Status;

        fn encode(&mut self, item: Self::Item, buf: &mut EncodeBuf<'_>) -> Result<(), Self::Error> {
            item.encode(buf)
                .map_err(|e| Status::new(Code::Internal, e.to_string()))
        }
    }

    #[derive(Debug, Clone)]
    pub struct ProstDecoder<U>(std::marker::PhantomData<U>);

    impl<U: Message + Default> Decoder for ProstDecoder<U> {
        type Item = U;
        type Error = Status;

        fn decode(&mut self, buf: &mut DecodeBuf<'_>) -> Result<Option<Self::Item>, Self::Error> {
            let item = U::decode(buf).map_err(|e| Status::new(Code::Internal, e.to_string()))?;
            Ok(Some(item))
        }
    }

    #[derive(Clone)]
    pub struct SpeechClient {
        inner: tonic::client::Grpc<Channel>,
        access_token: String,
    }

    impl SpeechClient {
        pub fn new(channel: Channel, access_token: String) -> Self {
            let inner = tonic::client::Grpc::new(channel);
            Self { inner, access_token }
        }

        pub async fn streaming_recognize(
            &mut self,
            request: impl tonic::IntoStreamingRequest<Message = StreamingRecognizeRequest>,
        ) -> Result<tonic::Response<Streaming<StreamingRecognizeResponse>>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(Code::Unknown, format!("Service not ready: {}", e))
            })?;

            let codec: ProstCodec<StreamingRecognizeRequest, StreamingRecognizeResponse> =
                ProstCodec::default();
            let path =
                PathAndQuery::from_static("/google.cloud.speech.v2.Speech/StreamingRecognize");

            let mut req = request.into_streaming_request();
            let bearer_token = format!("Bearer {}", self.access_token);
            let auth_value: MetadataValue<_> = bearer_token
                .parse()
                .map_err(|_| tonic::Status::invalid_argument("Invalid access token"))?;
            req.metadata_mut().insert("authorization", auth_value);

            self.inner.streaming(req, path, codec).await
        }
    }
}

impl GoogleChirpSession {
    pub async fn new(
        config: GoogleChirpConfig,
        transcript_callback: impl Fn(String, bool) + Send + Sync + 'static,
        error_callback: impl Fn(String) + Send + Sync + 'static,
    ) -> Result<Self, String> {
        let service_account = super::google_auth::parse_service_account_key(&config.service_account_json)?;
        let project_id = service_account.project_id.clone();

        eprintln!("[Google Chirp] Getting access token for project: {}", project_id);
        let access_token = super::google_auth::get_access_token(&service_account).await?;
        eprintln!("[Google Chirp] Got access token successfully");

        let uri: Uri = GOOGLE_SPEECH_ENDPOINT
            .parse()
            .map_err(|e| format!("Invalid URI: {}", e))?;

        let channel = Channel::builder(uri)
            .tls_config(tonic::transport::ClientTlsConfig::new().with_enabled_roots())
            .map_err(|e| format!("Failed to configure TLS: {}", e))?
            .connect()
            .await
            .map_err(|e| format!("Failed to connect to Google Speech: {}", e))?;

        let mut client = speech_client::SpeechClient::new(channel, access_token);

        let (audio_tx, mut audio_rx) = mpsc::channel::<Vec<f32>>(100);

        let final_transcript = Arc::new(Mutex::new(String::new()));
        let partial_transcript = Arc::new(Mutex::new(String::new()));

        let final_transcript_clone = final_transcript.clone();
        let partial_transcript_clone = partial_transcript.clone();

        let (stream_done_tx, stream_done_rx) = tokio::sync::oneshot::channel::<()>();

        let sample_rate = config.sample_rate;
        // Chirp 3 requires full locale codes like "en-US", not just "en"
        let language = if config.language == "en" {
            "en-US".to_string()
        } else {
            config.language.clone()
        };

        let task_handle = tauri::async_runtime::spawn(async move {
            // TODO: Make recognizer_id and location configurable in UI
            let recognizer = format!("projects/{}/locations/us/recognizers/test", project_id);
            eprintln!("[Google Chirp] Using recognizer: {}", recognizer);

            let streaming_config = streaming_recognize_request::StreamingConfig {
                config: Some(RecognitionConfig {
                    explicit_decoding_config: Some(ExplicitDecodingConfig {
                        encoding: AudioEncoding::Linear16 as i32,
                        sample_rate_hertz: sample_rate as i32,
                        audio_channel_count: 1,
                    }),
                    model: String::new(), // Use model from recognizer config
                    language_codes: vec![language],
                    features: None, // Use features from recognizer config
                }),
                streaming_features: Some(StreamingRecognitionFeatures {
                    enable_voice_activity_events: true,
                    interim_results: 1,
                }),
            };

            let config_request = StreamingRecognizeRequest {
                recognizer,
                streaming_request: Some(
                    streaming_recognize_request::StreamingRequest::StreamingConfig(streaming_config),
                ),
            };

            let outbound = async_stream::stream! {
                eprintln!("[Google Chirp] Sending config request...");
                yield config_request;

                let mut chunk_count = 0u32;
                while let Some(samples) = audio_rx.recv().await {
                    chunk_count += 1;
                    let pcm16: Vec<u8> = samples
                        .iter()
                        .flat_map(|&sample| {
                            let clamped = sample.clamp(-1.0, 1.0);
                            let scaled = (clamped * 32767.0) as i16;
                            scaled.to_le_bytes()
                        })
                        .collect();

                    if chunk_count <= 3 || chunk_count % 20 == 0 {
                        eprintln!("[Google Chirp] Sending audio chunk #{}, {} bytes", chunk_count, pcm16.len());
                    }

                    yield StreamingRecognizeRequest {
                        recognizer: String::new(),
                        streaming_request: Some(
                            streaming_recognize_request::StreamingRequest::Audio(pcm16),
                        ),
                    };
                }
                eprintln!("[Google Chirp] Audio stream ended, sent {} chunks total", chunk_count);
            };

            eprintln!("[Google Chirp] Starting streaming_recognize...");
            match client.streaming_recognize(outbound).await {
                Ok(response) => {
                    eprintln!("[Google Chirp] Got response, reading messages...");
                    let mut inbound = response.into_inner();
                    let mut msg_count = 0u32;
                    loop {
                        match inbound.message().await {
                            Ok(Some(msg)) => {
                                msg_count += 1;
                                eprintln!("[Google Chirp] Received message #{}, results: {}", msg_count, msg.results.len());
                                for result in &msg.results {
                                    if let Some(alt) = result.alternatives.first() {
                                        let text = alt.transcript.clone();
                                        let is_final = result.is_final;
                                        eprintln!("[Google Chirp] Transcript (final={}): {}", is_final, &text);

                                        if is_final {
                                            let mut final_t = final_transcript_clone.lock().await;
                                            if !final_t.is_empty() {
                                                final_t.push(' ');
                                            }
                                            final_t.push_str(&text);
                                            let mut partial_t = partial_transcript_clone.lock().await;
                                            *partial_t = String::new();
                                        } else {
                                            let mut partial_t = partial_transcript_clone.lock().await;
                                            *partial_t = text.clone();
                                        }

                                        transcript_callback(text, is_final);
                                    }
                                }
                            }
                            Ok(None) => {
                                eprintln!("[Google Chirp] Stream ended normally after {} messages", msg_count);
                                break;
                            }
                            Err(e) => {
                                eprintln!("[Google Chirp] Stream error: {}", e);
                                error_callback(format!("gRPC stream error: {}", e));
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[Google Chirp] gRPC streaming_recognize failed: {}", e);
                    error_callback(format!("gRPC streaming error: {}", e));
                }
            }
            // Signal that the stream is done
            let _ = stream_done_tx.send(());
        });

        Ok(Self {
            audio_tx: Some(audio_tx),
            final_transcript,
            partial_transcript,
            stream_done_rx: Arc::new(Mutex::new(Some(stream_done_rx))),
            _task_handle: task_handle,
        })
    }

    pub async fn send_audio(&self, samples: Vec<f32>) -> Result<(), String> {
        if let Some(ref tx) = self.audio_tx {
            tx.send(samples)
                .await
                .map_err(|e| format!("Failed to send audio: {}", e))
        } else {
            Err("Audio channel closed".to_string())
        }
    }

    pub async fn finalize(&mut self) -> String {
        eprintln!("[Google Chirp] Finalizing stream...");

        // Drop the audio sender to signal end of input
        self.audio_tx = None;

        // Wait for stream to complete (with timeout)
        let done_rx = {
            let mut guard = self.stream_done_rx.lock().await;
            guard.take()
        };

        if let Some(rx) = done_rx {
            // Wait up to 5 seconds for the stream to complete
            let _ = tokio::time::timeout(Duration::from_secs(5), rx).await;
        }

        let final_t = self.final_transcript.lock().await;
        let partial_t = self.partial_transcript.lock().await;

        let result = if partial_t.is_empty() {
            final_t.clone()
        } else if final_t.is_empty() {
            partial_t.clone()
        } else {
            format!("{} {}", final_t, partial_t)
        };

        eprintln!("[Google Chirp] Finalized with transcript length: {}", result.len());
        result
    }
}
