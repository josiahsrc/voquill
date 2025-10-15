ARG CUDA_VERSION=12.3.1
ARG UBUNTU_VERSION=22.04
FROM nvcr.io/nvidia/cuda:${CUDA_VERSION}-devel-ubuntu${UBUNTU_VERSION} AS base-cuda

# Install requirements for rustup install + bindgen: https://rust-lang.github.io/rust-bindgen/requirements.html
RUN DEBIAN_FRONTEND=noninteractive apt update -y && apt install -y curl llvm-dev libclang-dev clang pkg-config libssl-dev cmake git
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH=/root/.cargo/bin:$PATH

COPY . .
RUN cargo build --bin simple --features cuda

FROM nvcr.io/nvidia/cuda:${CUDA_VERSION}-runtime-ubuntu${UBUNTU_VERSION} AS base-cuda-runtime

COPY --from=base-cuda /target/debug/simple /usr/local/bin/simple

ENTRYPOINT ["/usr/local/bin/simple"]
