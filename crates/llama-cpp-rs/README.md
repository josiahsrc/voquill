# 🦙 [llama-cpp-rs][readme] &emsp; [![Docs]][docs.rs] [![Latest Version]][crates.io] [![Lisence]][crates.io]

[Docs]: https://img.shields.io/docsrs/llama-cpp-2.svg

[Latest Version]: https://img.shields.io/crates/v/llama-cpp-2.svg

[crates.io]: https://crates.io/crates/llama-cpp-2

[docs.rs]: https://docs.rs/llama-cpp-2

[Lisence]: https://img.shields.io/crates/l/llama-cpp-2.svg

[llama-cpp-sys]: https://crates.io/crates/llama-cpp-sys-2

[utilityai]: https://utilityai.ca

[readme]: https://github.com/utilityai/llama-cpp-rs/tree/main/llama-cpp-2

This is the home for [llama-cpp-2][crates.io]. It also contains the [llama-cpp-sys] bindings which are updated semi-regularly
and in sync with [llama-cpp-2][crates.io].

This project was created with the explict goal of staying as up to date as possible with llama.cpp, as a result it is
dead simple, very close to raw bindings, and does not follow semver meaningfully.

Check out the [docs.rs] for crate documentation or the [readme] for high level information about the project.

## Try it

We maintain a super simple example of using the library:

Clone the repo

```bash
git clone --recursive https://github.com/utilityai/llama-cpp-rs
cd llama-cpp-rs
```

Run the simple example (add `--featues cuda` if you have a cuda gpu)

```bash
cargo run --release --bin simple -- --prompt "The way to kill a linux process is" hf-model TheBloke/Llama-2-7B-GGUF llama-2-7b.Q4_K_M.gguf
```

<details>
<summary>Output</summary>
<pre>
ggml_init_cublas: GGML_CUDA_FORCE_MMQ:   no
ggml_init_cublas: CUDA_USE_TENSOR_CORES: yes
ggml_init_cublas: found 1 CUDA devices:
  Device 0: NVIDIA GeForce RTX 3090, compute capability 8.6, VMM: yes
llama_model_params { n_gpu_layers: 1000, split_mode: 1, main_gpu: 0, tensor_split: 0x0, progress_callback: None, progress_callback_user_data: 0x0, kv_overrides: 0x0, vocab_only: false, use_mmap: true, use_mlock: false }
llama_model_loader: loaded meta data with 19 key-value pairs and 291 tensors from /home/marcus/.cache/huggingface/hub/models--TheBloke--Llama-2-7B-GGUF/snapshots/b4e04e128f421c93a5f1e34ac4d7ca9b0af47b80/llama-2-7b.Q4_K_M.gguf (version GGUF V2)
llama_model_loader: Dumping metadata keys/values. Note: KV overrides do not apply in this output.
llama_model_loader: - kv   0:                       general.architecture str              = llama
llama_model_loader: - kv   1:                               general.name str              = LLaMA v2
llama_model_loader: - kv   2:                       llama.context_length u32              = 4096
llama_model_loader: - kv   3:                     llama.embedding_length u32              = 4096
llama_model_loader: - kv   4:                          llama.block_count u32              = 32
llama_model_loader: - kv   5:                  llama.feed_forward_length u32              = 11008
llama_model_loader: - kv   6:                 llama.rope.dimension_count u32              = 128
llama_model_loader: - kv   7:                 llama.attention.head_count u32              = 32
llama_model_loader: - kv   8:              llama.attention.head_count_kv u32              = 32
llama_model_loader: - kv   9:     llama.attention.layer_norm_rms_epsilon f32              = 0.000010
llama_model_loader: - kv  10:                          general.file_type u32              = 15
llama_model_loader: - kv  11:                       tokenizer.ggml.model str              = llama
llama_model_loader: - kv  12:                      tokenizer.ggml.tokens arr[str,32000]   = ["<unk>", "<s>", "</s>", "<0x00>", "<...
llama_model_loader: - kv  13:                      tokenizer.ggml.scores arr[f32,32000]   = [0.000000, 0.000000, 0.000000, 0.0000...
llama_model_loader: - kv  14:                  tokenizer.ggml.token_type arr[i32,32000]   = [2, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, ...
llama_model_loader: - kv  15:                tokenizer.ggml.bos_token_id u32              = 1
llama_model_loader: - kv  16:                tokenizer.ggml.eos_token_id u32              = 2
llama_model_loader: - kv  17:            tokenizer.ggml.unknown_token_id u32              = 0
llama_model_loader: - kv  18:               general.quantization_version u32              = 2
llama_model_loader: - type  f32:   65 tensors
llama_model_loader: - type q4_K:  193 tensors
llama_model_loader: - type q6_K:   33 tensors
llm_load_vocab: special tokens definition check successful ( 259/32000 ).
llm_load_print_meta: format           = GGUF V2
llm_load_print_meta: arch             = llama
llm_load_print_meta: vocab type       = SPM
llm_load_print_meta: n_vocab          = 32000
llm_load_print_meta: n_merges         = 0
llm_load_print_meta: n_ctx_train      = 4096
llm_load_print_meta: n_embd           = 4096
llm_load_print_meta: n_head           = 32
llm_load_print_meta: n_head_kv        = 32
llm_load_print_meta: n_layer          = 32
llm_load_print_meta: n_rot            = 128
llm_load_print_meta: n_embd_head_k    = 128
llm_load_print_meta: n_embd_head_v    = 128
llm_load_print_meta: n_gqa            = 1
llm_load_print_meta: n_embd_k_gqa     = 4096
llm_load_print_meta: n_embd_v_gqa     = 4096
llm_load_print_meta: f_norm_eps       = 0.0e+00
llm_load_print_meta: f_norm_rms_eps   = 1.0e-05
llm_load_print_meta: f_clamp_kqv      = 0.0e+00
llm_load_print_meta: f_max_alibi_bias = 0.0e+00
llm_load_print_meta: n_ff             = 11008
llm_load_print_meta: n_expert         = 0
llm_load_print_meta: n_expert_used    = 0
llm_load_print_meta: rope scaling     = linear
llm_load_print_meta: freq_base_train  = 10000.0
llm_load_print_meta: freq_scale_train = 1
llm_load_print_meta: n_yarn_orig_ctx  = 4096
llm_load_print_meta: rope_finetuned   = unknown
llm_load_print_meta: model type       = 7B
llm_load_print_meta: model ftype      = Q4_K - Medium
llm_load_print_meta: model params     = 6.74 B
llm_load_print_meta: model size       = 3.80 GiB (4.84 BPW) 
llm_load_print_meta: general.name     = LLaMA v2
llm_load_print_meta: BOS token        = 1 '<s>'
llm_load_print_meta: EOS token        = 2 '</s>'
llm_load_print_meta: UNK token        = 0 '<unk>'
llm_load_print_meta: LF token         = 13 '<0x0A>'
llm_load_tensors: ggml ctx size =    0.22 MiB
llm_load_tensors: offloading 32 repeating layers to GPU
llm_load_tensors: offloading non-repeating layers to GPU
llm_load_tensors: offloaded 33/33 layers to GPU
llm_load_tensors:      CUDA0 buffer size =  3820.94 MiB
llm_load_tensors:        CPU buffer size =    70.31 MiB
..................................................................................................
Loaded "/home/marcus/.cache/huggingface/hub/models--TheBloke--Llama-2-7B-GGUF/snapshots/b4e04e128f421c93a5f1e34ac4d7ca9b0af47b80/llama-2-7b.Q4_K_M.gguf"
llama_new_context_with_model: n_ctx      = 2048
llama_new_context_with_model: freq_base  = 10000.0
llama_new_context_with_model: freq_scale = 1
llama_kv_cache_init:      CUDA0 KV buffer size =  1024.00 MiB
llama_new_context_with_model: KV self size  = 1024.00 MiB, K (f16):  512.00 MiB, V (f16):  512.00 MiB
llama_new_context_with_model:  CUDA_Host input buffer size   =    13.02 MiB
ggml_gallocr_reserve_n: reallocating CUDA0 buffer from size 0.00 MiB to 164.01 MiB
ggml_gallocr_reserve_n: reallocating CUDA_Host buffer from size 0.00 MiB to 8.00 MiB
llama_new_context_with_model:      CUDA0 compute buffer size =   164.01 MiB
llama_new_context_with_model:  CUDA_Host compute buffer size =     8.00 MiB
llama_new_context_with_model: graph splits (measure): 3
n_len = 32, n_ctx = 2048, k_kv_req = 32

The way to kill a linux process is to send it a SIGKILL signal.
The way to kill a windows process is to send it a S

decoded 24 tokens in 0.23 s, speed 105.65 t/s

load time = 727.50 ms
sample time = 0.46 ms / 24 runs (0.02 ms per token, 51835.85 tokens per second)
prompt eval time = 68.52 ms / 9 tokens (7.61 ms per token, 131.35 tokens per second)
eval time = 225.70 ms / 24 runs (9.40 ms per token, 106.34 tokens per second)
total time = 954.18 ms
</pre>
</details>

## Hacking

Ensure that when you clone this project you also clone the submodules. This can be done with the following command:

```sh
git clone --recursive https://github.com/utilityai/llama-cpp-rs
```

or if you have already cloned the project you can run:

```sh
git submodule update --init --recursive
```
