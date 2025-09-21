# multi-arch image (supports amd64 & arm64 on Linux, macOS, Windows hosts)
FROM node:20-bookworm-slim

WORKDIR /app

# If sharp ever falls back to building from source, these help:
# (They add ~200MB; you can remove if not needed.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# In dev, we install deps at container start (see compose command),
# so we don't copy package files here. For prod, you'd COPY and RUN yarn install.

EXPOSE 3000

