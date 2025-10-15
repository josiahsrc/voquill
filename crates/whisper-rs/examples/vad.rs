use hound::SampleFormat;
use std::io::Read;
use whisper_rs::{WhisperVadContext, WhisperVadContextParams, WhisperVadParams, WhisperVadSegment};

fn main() {
    let model_path = std::env::args()
        .nth(1)
        .expect("Please specify path to VAD model as argument 1");
    let wav_path = std::env::args()
        .nth(2)
        .expect("Please specify path to WAV file as argument 2");

    let wav_reader = hound::WavReader::open(wav_path).expect("failed to open wav file");
    assert_eq!(
        wav_reader.spec().sample_rate,
        16000,
        "expected 16kHz sample rate"
    );
    assert_eq!(wav_reader.spec().channels, 1, "expected mono audio");

    let samples = decode_to_float(wav_reader);

    let mut vad_ctx_params = WhisperVadContextParams::default();
    vad_ctx_params.set_n_threads(1);
    vad_ctx_params.set_use_gpu(false);

    // Note this context could be held in a global Mutex or similar
    // There's no restrictions on where the output can be sent after it's used,
    // as it just holds a C-style array internally with no references to the model.
    let mut vad_ctx =
        WhisperVadContext::new(&model_path, vad_ctx_params).expect("failed to load model");

    let vad_params = WhisperVadParams::new();
    let result = vad_ctx
        .segments_from_samples(vad_params, &samples)
        .expect("failed to run VAD");

    for WhisperVadSegment { start, end } in result {
        println!(
            "detected speech between {}s and {}s",
            // each segment is in centiseconds so must be modified
            start / 100.0,
            end / 100.0
        );
    }
}

fn decode_to_float<T: Read>(rdr: hound::WavReader<T>) -> Vec<f32> {
    match rdr.spec().sample_format {
        SampleFormat::Float => rdr
            .into_samples::<f32>()
            .map(|x| x.expect("expected fp32 WAV file"))
            .collect(),
        SampleFormat::Int => rdr
            .into_samples::<i16>()
            .map(|x| x.expect("expected i16 WAV file") as f32 / 32768.0)
            .collect(),
    }
}
