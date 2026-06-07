# Stage 1: Install all dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the web app
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY tsconfig.json vite.config.ts react-router.config.ts ./
COPY app/ ./app/
COPY public/ ./public/
RUN npm run build

# Stage 3: Production image
FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache zip && npm install -g tsx
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY tsconfig.json ./
COPY app/ ./app/

ENV SCAN_DIRECTORY="/comics"
ENV DATA_DIRECTORY="/data"
EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && npm start"]
