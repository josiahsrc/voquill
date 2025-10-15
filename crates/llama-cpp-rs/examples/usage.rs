//! # Usage
//!
//! This is just about the smallest possible way to do inference. To fetch a model from hugging face:
//!
//! ```console
//! git clone --recursive https://github.com/utilityai/llama-cpp-rs
//! cd llama-cpp-rs/examples/usage
//! wget https://huggingface.co/Qwen/Qwen2-1.5B-Instruct-GGUF/resolve/main/qwen2-1_5b-instruct-q4_0.gguf
//! cargo run --example usage -- qwen2-1_5b-instruct-q4_0.gguf
//! ```
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::model::{AddBos, Special};
use llama_cpp_2::sampling::LlamaSampler;
use std::io::Write;

#[allow(clippy::cast_possible_wrap, clippy::cast_possible_truncation)]
fn main() {
    let model_path = std::env::args().nth(1).expect("Please specify model path");
    let backend = LlamaBackend::init().unwrap();
    let params = LlamaModelParams::default();

    let prompt =
        "<|im_start|>user\nHello! how are you?<|im_end|>\n<|im_start|>assistant\n".to_string();
    LlamaContextParams::default();
    let model =
        LlamaModel::load_from_file(&backend, model_path, &params).expect("unable to load model");
    let ctx_params = LlamaContextParams::default();
    let mut ctx = model
        .new_context(&backend, ctx_params)
        .expect("unable to create the llama_context");
    let tokens_list = model
        .str_to_token(&prompt, AddBos::Always)
        .unwrap_or_else(|_| panic!("failed to tokenize {prompt}"));
    let n_len = 64;

    // create a llama_batch with size 512
    // we use this object to submit token data for decoding
    let mut batch = LlamaBatch::new(512, 1);

    let last_index = tokens_list.len() as i32 - 1;
    for (i, token) in (0_i32..).zip(tokens_list.into_iter()) {
        // llama_decode will output logits only for the last token of the prompt
        let is_last = i == last_index;
        batch.add(token, i, &[0], is_last).unwrap();
    }
    ctx.decode(&mut batch).expect("llama_decode() failed");

    let mut n_cur = batch.n_tokens();

    // The `Decoder`
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut sampler = LlamaSampler::greedy();

    while n_cur <= n_len {
        // sample the next token
        {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);

            sampler.accept(token);

            // is it an end of stream?
            if token == model.token_eos() {
                eprintln!();
                break;
            }

            let output_bytes = model.token_to_bytes(token, Special::Tokenize).unwrap();
            // use `Decoder.decode_to_string()` to avoid the intermediate buffer
            let mut output_string = String::with_capacity(32);
            let _decode_result = decoder.decode_to_string(&output_bytes, &mut output_string, false);
            print!("{output_string}");
            std::io::stdout().flush().unwrap();

            batch.clear();
            batch.add(token, n_cur, &[0], true).unwrap();
        }

        n_cur += 1;

        ctx.decode(&mut batch).expect("failed to eval");
    }
}
