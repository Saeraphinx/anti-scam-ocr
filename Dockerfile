# syntax=docker/dockerfile:1
FROM node:25-alpine AS base

#FROM base AS basebuilder
#RUN apk add --no-cache python3 make g++ py3-pip

FROM base AS builder
WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --immutable --immutable-cache --check-cache
COPY src/ src/
RUN yarn run build

FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --immutable --immutable-cache --check-cache --production

FROM base
WORKDIR /app
RUN \
  addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nodejs

COPY --chown=1001:1001 package.json ./
COPY --chown=1001:1001 --from=deps /app/node_modules ./node_modules
COPY --chown=1001:1001 --from=builder /app/build ./build

USER nodejs
ENV NODE_ENV=production

CMD ["yarn", "start"]