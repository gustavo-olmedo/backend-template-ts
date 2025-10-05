# multi-arch image (supports amd64 & arm64 on Linux, macOS, Windows hosts)
FROM node:20-bookworm-slim

WORKDIR /app

# Tooling needed by sharp (your existing list) + procps (ps) + tini (proper PID 1)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
      procps tini \
 && rm -rf /var/lib/apt/lists/*

# In dev, we install deps at container start (compose command), so we don't COPY package files here.
# For prod, you'd COPY package files and run `yarn install` in the image.

EXPOSE 3000

# Make tini PID 1 so signals/restarts work reliably with the dev watcher
ENTRYPOINT ["/usr/bin/tini","--"]

# Default; compose can override this. If you keep your "yarn install && yarn start:dev" command,
# ENTRYPOINT will still wrap it via /bin/sh.
CMD ["yarn","start:dev"]
