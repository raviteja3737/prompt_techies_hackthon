# Backend — Express API (Promptothon)
# Secrets are NEVER baked in (.dockerignore excludes .env*); compose
# injects them via env_file: backend/.env at run time.
FROM node:20-alpine AS base
# Prisma engines need openssl on alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY . .

EXPOSE 4000
# migrate deploy is a safe no-op when the DB is already up to date
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
