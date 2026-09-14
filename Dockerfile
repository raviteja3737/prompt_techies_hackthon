# Frontend — Next.js website (Prompt Techies)
# NOTE: NEXT_PUBLIC_* vars are baked in at BUILD time. Changing them
# requires `docker compose build web` (compose passes them as build args).
FROM node:20-alpine AS base
WORKDIR /app

# Pin npm to the version the lockfile was generated with (npm ci is strict
# about lock/package.json sync ACROSS npm majors; node:20-alpine ships npm 10).
RUN npm install -g npm@11.6.2

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build-time public config (defaults = local dev; compose overrides via args)
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
# Ask PT chatbot key — must be set at BUILD time (NEXT_PUBLIC_* vars are
# inlined into the client bundle; a runtime .env cannot change them).
ARG NEXT_PUBLIC_GROQ_API_KEY=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_GROQ_API_KEY=$NEXT_PUBLIC_GROQ_API_KEY

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
