# Rust Reranker Implementation

A Rust implementation of cross-encoder based reranking using llama-cpp-2. Cross-encoder reranking is a more accurate way to determine similarity between queries and documents compared to traditional embedding-based approaches.

## Overview

This implementation adds a new pooling type `LLAMA_POOLING_TYPE_RANK` which enables cross-encoder based reranking. Unlike traditional embedding approaches that encode query and document separately, this method:

- Processes query and document pairs together in a single pass
- Directly evaluates semantic relationships between the pairs
- Outputs raw similarity scores indicating relevance

## Installation

```bash
# Follow instructions to clone repo.
# Navigate to examples reranker
cd examples/reranker

# Build the project
cargo build --release
```

## Usage

### Command Line Interface

```bash
cargo run --release -- \                                                                                                                 ✔ │ 5s │ 12:48:35
    --model-path "models/bge-reranker-v2-m3.gguf" \ 
    --query "what is panda?" \
    --documents "hi" \
    --documents "it's a bear" \
    --documents "The giant panda (Ailuropoda melanoleuca), sometimes called a panda bear or simply panda, is a bear species endemic to China." \
    --pooling rank
```
Should output(with bge-reranker-v2-m3-Q5_0): 
rerank score 0:   -6.551
rerank score 1:   -3.802
rerank score 2:    4.522

### CLI Arguments

- `--model-path`: Path to the GGUF model file
- `--query`: The search query
- `--documents`: One or more documents to rank against the query
- `--pooling`: Pooling type (options: none, mean, rank)

### Pooling Types

- `rank`: Performs cross-encoder reranking 


Note: The raw scores are not normalized through a sigmoid function. If you need scores between 0-1, you'll need to implement sigmoid normalization in your application code.

# Additional notes

- Query and documents are concatenated using the format <bos>query</eos><sep>answer</eos> 

## Supported Models

Some tested models:

- [BAAI/bge-reranker-v2-m3](https://huggingface.co/BAAI/bge-reranker-v2-m3)
- [jinaai/jina-reranker-v1-tiny-en](https://huggingface.co/jinaai/jina-reranker-v1-tiny-en)

Not tested others, but anything supported by llama.cpp should work. 

## Implementation Details

This is a close Rust implementation of the reranker implementation discussed in [llama.cpp PR #9510](https://github.com/ggerganov/llama.cpp/pull/9510).

## Potential issues

The bos, eos, sep tokens are being hardcoded. We need to ideally get it from the model and build out the prompts based on each specific model.