/*
wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin
wget https://github.com/ggerganov/whisper.cpp/raw/master/samples/jfk.wav
cargo run --example basic_use ggml-tiny.bin jfk.wav
*/

use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

fn main() {
    let model_path = std::env::args()
        .nth(1)
        .expect("Please specify path to model as argument 1");
    let wav_path = std::env::args()
        .nth(2)
        .expect("Please specify path to wav file as argument 2");

    let samples: Vec<i16> = hound::WavReader::open(wav_path)
        .unwrap()
        .into_samples::<i16>()
        .map(|x| x.unwrap())
        .collect();

    // load a context and model
    let ctx = WhisperContext::new_with_params(&model_path, WhisperContextParameters::default())
        .expect("failed to load model");
    // create a state attached to the model
    let mut state = ctx.create_state().expect("failed to create state");

    // the sampling strategy will determine how accurate your final output is going to be
    // typically BeamSearch is more accurate at the cost of significantly increased CPU time
    let mut params = FullParams::new(SamplingStrategy::BeamSearch {
        // whisper.cpp defaults to a beam size of 5, a reasonable default
        beam_size: 5,
        // this parameter is currently unused but defaults to -1.0
        patience: -1.0,
    });

    // and set the language to translate to as english
    params.set_language(Some("en"));

    // we also explicitly disable anything that prints to stdout
    // despite all of this you will still get things printing to stdout,
    // be prepared to deal with it
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    // we must convert to 16KHz mono f32 samples for the model
    // some utilities exist for this
    // note that you don't need to use these, you can do it yourself or any other way you want
    // these are just provided for convenience
    let mut inter_samples = vec![Default::default(); samples.len()];

    whisper_rs::convert_integer_to_float_audio(&samples, &mut inter_samples)
        .expect("failed to convert audio data");
    let samples = whisper_rs::convert_stereo_to_mono_audio(&inter_samples)
        .expect("failed to convert audio data");

    // now we can run the model
    state
        .full(params, &samples[..])
        .expect("failed to run model");

    // fetch the results
    for segment in state.as_iter() {
        println!(
            "[{} - {}]: {}",
            // these timestamps are in centiseconds (10s of milliseconds)
            segment.start_timestamp(),
            segment.end_timestamp(),
            // this default Display implementation will result in any invalid UTF-8
            // being converted into the Unicode replacement character, U+FFFD
            segment
        );
    }
}
