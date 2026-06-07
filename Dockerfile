# Stage 1: Install all dependencies
FROM node:24-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build the web app
FROM node:24-alpine AS build
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json vite.config.ts react-router.config.ts ./
COPY app/ ./app/
COPY public/ ./public/
RUN pnpm build

# Stage 3: Production image
FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache zip && npm install -g pnpm tsx
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY tsconfig.json ./
COPY app/ ./app/

ENV SCAN_DIRECTORY="/comics"
ENV DATA_DIRECTORY="/data"
EXPOSE 3000

CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
