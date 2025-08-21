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
RUN npm run build \
 && npm prune \
 && chmod +x ./ci/entrypoint.sh

COPY package.json dist/package.json

EXPOSE 4000
EXPOSE 9229
ENV SERVICEDIR=dist/services

ENTRYPOINT ["sh", "-c", "./ci/entrypoint.sh"]
