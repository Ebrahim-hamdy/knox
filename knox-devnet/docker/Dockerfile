FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  git \
  clang \
  llvm-dev \
  libclang-dev \
  make \
  build-essential \
  pkg-config \
  libssl-dev \
  unzip \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG PROTOC_VERSION=25.1
RUN curl -LO "https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-linux-x86_64.zip" && \
  unzip "protoc-${PROTOC_VERSION}-linux-x86_64.zip" -d /usr/local && \
  rm "protoc-${PROTOC_VERSION}-linux-x86_64.zip"

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build
RUN git clone https://github.com/sigilante/nockchain.git && \
  cd nockchain && \
  make build-hoon-all && \
  cargo build --release --bin nockchain --bin nockchain-wallet


FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
  supervisor \
  curl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG ENVOY_VERSION=v1.22.0
RUN curl -L https://github.com/envoyproxy/envoy/releases/download/${ENVOY_VERSION}/envoy-${ENVOY_VERSION}-linux-amd64 -o /usr/local/bin/envoy && \
  chmod +x /usr/local/bin/envoy

RUN useradd -m -u 1000 -s /bin/bash nockchain

RUN mkdir -p /data && chown -R nockchain:nockchain /data

WORKDIR /data

COPY --chown=nockchain:nockchain --from=builder /build/nockchain/target/release/nockchain /usr/local/bin/
COPY --chown=nockchain:nockchain --from=builder /build/nockchain/target/release/nockchain-wallet /usr/local/bin/

COPY --chown=nockchain:nockchain ./nockchain-dev-stack/docker/envoy.yaml /etc/envoy/envoy.yaml
COPY --chown=nockchain:nockchain ./nockchain-dev-stack/docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf


USER nockchain

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]