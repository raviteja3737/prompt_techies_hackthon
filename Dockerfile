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

# Build-time public config (defaults = local dev; compose overrides via args).
# Every NEXT_PUBLIC_* var is baked into the client bundle — set them in
# root .env BEFORE `docker compose build web`.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
# Ask PT chatbot key — intentionally client-side for this hackathon/free-tier
# setup (NEXT_PUBLIC_* vars are inlined into the bundle by design).
ARG NEXT_PUBLIC_GROQ_API_KEY=""
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=""
ARG NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/cbitosc/
ARG NEXT_PUBLIC_TWITTER_URL=https://twitter.com/cbitosc/
ARG NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/cbitosc/
ARG NEXT_PUBLIC_LINKEDIN_URL=https://www.linkedin.com/company/cbitosc/
ARG NEXT_PUBLIC_HACKATHON_LINKEDIN_URL=https://linkedin.com/company/cbit-hackathon
ARG NEXT_PUBLIC_GITHUB_URL=https://github.com/cbitosc
ARG NEXT_PUBLIC_SUBSTACK_URL=https://cbitosc.substack.com/
ARG NEXT_PUBLIC_COMMUNITY_URL=https://cbitosc.github.io/
ARG NEXT_PUBLIC_CODE_OF_CONDUCT_URL=https://cbitosc.github.io/coc/
ARG NEXT_PUBLIC_HACKTOBERFEST_URL=https://hacktoberfest.com
ARG NEXT_PUBLIC_SPONSOR_TITLE_URL=https://google.com
ARG NEXT_PUBLIC_SPONSOR_CO_URL=https://google.com
ARG NEXT_PUBLIC_CONTACT_EMAIL=cosc@cbit.ac.in
ARG NEXT_PUBLIC_CONTACT_PHONE_MEGHANA=+916281657674
ARG NEXT_PUBLIC_CONTACT_PHONE_SRILEKHA=+917416939873
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_GROQ_API_KEY=$NEXT_PUBLIC_GROQ_API_KEY \
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=$NEXT_PUBLIC_GOOGLE_ANALYTICS_ID \
    NEXT_PUBLIC_FACEBOOK_URL=$NEXT_PUBLIC_FACEBOOK_URL \
    NEXT_PUBLIC_TWITTER_URL=$NEXT_PUBLIC_TWITTER_URL \
    NEXT_PUBLIC_INSTAGRAM_URL=$NEXT_PUBLIC_INSTAGRAM_URL \
    NEXT_PUBLIC_LINKEDIN_URL=$NEXT_PUBLIC_LINKEDIN_URL \
    NEXT_PUBLIC_HACKATHON_LINKEDIN_URL=$NEXT_PUBLIC_HACKATHON_LINKEDIN_URL \
    NEXT_PUBLIC_GITHUB_URL=$NEXT_PUBLIC_GITHUB_URL \
    NEXT_PUBLIC_SUBSTACK_URL=$NEXT_PUBLIC_SUBSTACK_URL \
    NEXT_PUBLIC_COMMUNITY_URL=$NEXT_PUBLIC_COMMUNITY_URL \
    NEXT_PUBLIC_CODE_OF_CONDUCT_URL=$NEXT_PUBLIC_CODE_OF_CONDUCT_URL \
    NEXT_PUBLIC_HACKTOBERFEST_URL=$NEXT_PUBLIC_HACKTOBERFEST_URL \
    NEXT_PUBLIC_SPONSOR_TITLE_URL=$NEXT_PUBLIC_SPONSOR_TITLE_URL \
    NEXT_PUBLIC_SPONSOR_CO_URL=$NEXT_PUBLIC_SPONSOR_CO_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_CONTACT_PHONE_MEGHANA=$NEXT_PUBLIC_CONTACT_PHONE_MEGHANA \
    NEXT_PUBLIC_CONTACT_PHONE_SRILEKHA=$NEXT_PUBLIC_CONTACT_PHONE_SRILEKHA

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
