//! This is an example of reranking documents for a query using llama-cpp-2.
#![allow(
    clippy::cast_possible_wrap,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss
)]

use std::io::Write;
use std::path::PathBuf;
use std::time::Duration;

use anyhow::{bail, Context, Result};
use clap::Parser;
use hf_hub::api::sync::ApiBuilder;

use llama_cpp_2::context::params::{LlamaContextParams, LlamaPoolingType};
use llama_cpp_2::context::LlamaContext;
use llama_cpp_2::ggml_time_us;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::model::{AddBos, Special};

#[derive(clap::Parser, Debug, Clone)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the model file
    #[clap(long)]
    model_path: PathBuf,

    /// The query to embed
    #[clap(long)]
    query: String,

    /// The documents to embed and compare against
    #[clap(long, num_args = 1..)]
    documents: Vec<String>,

    /// Pooling type (none, mean, or rank)
    #[clap(long, default_value = "none")]
    pooling: String,

    /// Whether to normalise the produced embeddings
    #[clap(long, default_value_t = true)]
    normalise: bool,

    /// Disable offloading layers to the gpu
    #[cfg(any(feature = "cuda", feature = "vulkan"))]
    #[clap(long)]
    disable_gpu: bool,
}

fn main() -> Result<()> {
    let Args {
        model_path,
        query,
        documents,
        pooling,
        normalise,
        #[cfg(any(feature = "cuda", feature = "vulkan"))]
        disable_gpu,
    } = Args::parse();

    // init LLM
    let backend = LlamaBackend::init()?;

    // offload all layers to the gpu
    let model_params = {
        #[cfg(any(feature = "cuda", feature = "vulkan"))]
        if !disable_gpu {
            LlamaModelParams::default().with_n_gpu_layers(1000)
        } else {
            LlamaModelParams::default()
        }
        #[cfg(not(any(feature = "cuda", feature = "vulkan")))]
        LlamaModelParams::default()
    };

    let model = LlamaModel::load_from_file(&backend, model_path, &model_params)
        .with_context(|| "unable to load model")?;
    // println!("pooling: {}", pooling);
    let pooling_type = match pooling.as_str() {
        "mean" => LlamaPoolingType::Mean,
        "none" => LlamaPoolingType::None,
        "rank" => LlamaPoolingType::Rank,
        _ => LlamaPoolingType::Unspecified,
    };

    let ctx_params = LlamaContextParams::default()
        .with_n_threads_batch(std::thread::available_parallelism()?.get().try_into()?)
        .with_embeddings(true)
        .with_pooling_type(pooling_type);
    println!("ctx_params: {:?}", ctx_params);
    let mut ctx = model
        .new_context(&backend, ctx_params)
        .with_context(|| "unable to create the llama_context")?;

    let n_embd = model.n_embd();

    let prompt_lines = {
        let mut lines = Vec::new();
        for doc in documents {
            // Todo!  update to get eos and sep from model instead of hardcoding
            lines.push(format!("{query}{eos}{sep}{doc}", sep = "<s>", eos = "</s>"));
        }
        lines
    };

    println!("prompt_lines: {:?}", prompt_lines);
    // tokenize the prompt
    let tokens_lines_list = prompt_lines
        .iter()
        .map(|line| model.str_to_token(line, AddBos::Always))
        .collect::<Result<Vec<_>, _>>()
        .with_context(|| format!("failed to tokenize {:?}", prompt_lines))?;

    let n_ctx = ctx.n_ctx() as usize;
    let n_ctx_train = model.n_ctx_train();

    eprintln!("n_ctx = {n_ctx}, n_ctx_train = {n_ctx_train}");

    if tokens_lines_list.iter().any(|tok| n_ctx < tok.len()) {
        bail!("One of the provided prompts exceeds the size of the context window");
    }

    // print the prompt token-by-token
    eprintln!();

    for (i, token_line) in tokens_lines_list.iter().enumerate() {
        eprintln!("Prompt {i} --> {}", prompt_lines[i]);
        eprintln!("Number of tokens: {}", token_line.len());
        for token in token_line {
            // Attempt to convert token to string and print it; if it fails, print the token instead
            match model.token_to_str(*token, Special::Tokenize) {
                Ok(token_str) => eprintln!("{token} --> {token_str}"),
                Err(e) => {
                    eprintln!("Failed to convert token to string, error: {e}");
                    eprintln!("Token value: {token}");
                }
            }
        }
        eprintln!();
    }

    std::io::stderr().flush()?;

    // create a llama_batch with the size of the context
    // we use this object to submit token data for decoding
    let mut batch = LlamaBatch::new(2048, 1);

    // Todo!  update to get n_embd  to init vector size for better memory management
    // let mut n_embd_count = if pooling == "none" {
    //     tokens_lines_list.iter().map(|tokens| tokens.len()).sum()
    // } else {
    //     tokens_lines_list.len()
    // };
    let mut embeddings_stored = 0;
    let mut max_seq_id_batch = 0;
    let mut output = Vec::with_capacity(tokens_lines_list.len());

    let t_main_start = ggml_time_us();

    for tokens in &tokens_lines_list {
        // Flush the batch if the next prompt would exceed our batch size
        if (batch.n_tokens() as usize + tokens.len()) > 2048 {
            batch_decode(
                &mut ctx,
                &mut batch,
                max_seq_id_batch,
                n_embd,
                &mut output,
                normalise,
                pooling.clone(),
            )?;
            embeddings_stored += if pooling == "none" {
                batch.n_tokens()
            } else {
                max_seq_id_batch
            };
            max_seq_id_batch = 0;
            batch.clear();
        }

        batch.add_sequence(tokens, max_seq_id_batch, false)?;
        max_seq_id_batch += 1;
    }
    // Handle final batch
    batch_decode(
        &mut ctx,
        &mut batch,
        max_seq_id_batch,
        n_embd,
        &mut output,
        normalise,
        pooling.clone(),
    )?;

    let t_main_end = ggml_time_us();

    for (j, embeddings) in output.iter().enumerate() {
        if pooling == "none" {
            eprintln!("embedding {j}: ");
            for i in 0..n_embd as usize {
                if !normalise {
                    eprint!("{:6.5} ", embeddings[i]);
                } else {
                    eprint!("{:9.6} ", embeddings[i]);
                }
            }
            eprintln!();
        } else if pooling == "rank" {
            eprintln!("rerank score {j}: {:8.3}", embeddings[0]);
        } else {
            eprintln!("embedding {j}: ");
            for i in 0..n_embd as usize {
                if !normalise {
                    eprint!("{:6.5} ", embeddings[i]);
                } else {
                    eprint!("{:9.6} ", embeddings[i]);
                }
            }
            eprintln!();
        }
    }

    let duration = Duration::from_micros((t_main_end - t_main_start) as u64);
    let total_tokens: usize = tokens_lines_list.iter().map(Vec::len).sum();
    eprintln!(
        "Created embeddings for {} tokens in {:.2} s, speed {:.2} t/s\n",
        total_tokens,
        duration.as_secs_f32(),
        total_tokens as f32 / duration.as_secs_f32()
    );

    println!("{}", ctx.timings());

    Ok(())
}

fn batch_decode(
    ctx: &mut LlamaContext,
    batch: &mut LlamaBatch,
    s_batch: i32,
    n_embd: i32,
    output: &mut Vec<Vec<f32>>,
    normalise: bool,
    pooling: String,
) -> Result<()> {
    eprintln!(
        "{}: n_tokens = {}, n_seq = {}",
        stringify!(batch_decode),
        batch.n_tokens(),
        s_batch
    );

    // Clear previous kv_cache values
    ctx.clear_kv_cache();

    ctx.decode(batch).with_context(|| "llama_decode() failed")?;

    for i in 0..s_batch {
        let embeddings = ctx
            .embeddings_seq_ith(i)
            .with_context(|| "Failed to get sequence embeddings")?;
        let normalized = if normalise {
            if pooling == "rank" {
                normalize_embeddings(&embeddings, -1)
            } else {
                normalize_embeddings(&embeddings, 2)
            }
        } else {
            embeddings.to_vec()
        };
        output.push(normalized);
    }

    batch.clear();

    Ok(())
}

/// Normalizes embeddings based on different normalization strategies
fn normalize_embeddings(input: &[f32], embd_norm: i32) -> Vec<f32> {
    let n = input.len();
    let mut output = vec![0.0; n];

    let sum = match embd_norm {
        -1 => 1.0, // no normalization
        0 => {
            // max absolute
            let max_abs = input.iter().map(|x| x.abs()).fold(0.0f32, f32::max) / 32760.0;
            max_abs as f64
        }
        2 => {
            // euclidean norm
            input
                .iter()
                .map(|x| (*x as f64).powi(2))
                .sum::<f64>()
                .sqrt()
        }
        p => {
            // p-norm
            let sum = input.iter().map(|x| (x.abs() as f64).powi(p)).sum::<f64>();
            sum.powf(1.0 / p as f64)
        }
    };

    let norm = if sum > 0.0 { 1.0 / sum } else { 0.0 };

    for i in 0..n {
        output[i] = (input[i] as f64 * norm) as f32;
    }

    output
}

// /// Calculates cosine similarity between two embedding vectors
// fn embedding_similarity_cos(embd1: &[f32], embd2: &[f32]) -> f32 {
//     assert_eq!(embd1.len(), embd2.len(), "Embedding vectors must be the same length");

//     let (sum, sum1, sum2) = embd1.iter().zip(embd2.iter()).fold(
//         (0.0f64, 0.0f64, 0.0f64),
//         |(sum, sum1, sum2), (e1, e2)| {
//             let e1 = *e1 as f64;
//             let e2 = *e2 as f64;
//             (
//                 sum + e1 * e2,
//                 sum1 + e1 * e1,
//                 sum2 + e2 * e2
//             )
//         }
//     );

//     // Handle zero vectors
//     if sum1 == 0.0 || sum2 == 0.0 {
//         return if sum1 == 0.0 && sum2 == 0.0 {
//             1.0 // two zero vectors are similar
//         } else {
//             0.0
//         };
//     }

//     (sum / (sum1.sqrt() * sum2.sqrt())) as f32
// }
