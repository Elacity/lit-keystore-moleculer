ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS builder

ARG NODE_ENV=production

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source
COPY . .

ENV NODE_ENV=$NODE_ENV

EXPOSE 9229

ENTRYPOINT ["/app/ci/entrypoint.sh"]
