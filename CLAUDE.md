# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retcon is a comic book collection manager that scans directories for comic files (CBZ/CBR), extracts metadata, and provides a web interface for browsing collections. Written in TypeScript as a single React Router v7 app with an integrated scanner.

## Commands

### Build & Development

```bash
npm run dev                 # Start dev server with hot reload
npm run build               # Production build
npm run start               # Run production server
npm run lint                # Run ESLint
npm run typecheck           # TypeScript type checking
```

### Database

```bash
npm run db:generate         # Generate Drizzle migrations
npm run db:migrate          # Apply migrations
npm run db:studio           # Open Drizzle Studio
```

### Scanner

```bash
npm run scan                # Run scanner with tsx
```

### Scanner Command-Line Options

```bash
node dist/index.js [options]
--dir <path>       # Override SCAN_DIRECTORY
--force-update     # Force metadata update for all comics
--no-cleanup       # Skip deletion of missing comics/series/publishers
--help            # Show help
```

## Architecture

### Directory Structure

Everything lives under `app/`:

- `app/db/` - Database layer (Drizzle ORM): `schema.ts`, `queries.ts`, `migrate.ts`
- `app/scanner/` - Comic file scanner service
- `app/routes/` - React Router v7 routes
- `app/components/` - Shared UI components
- `app/layouts/` - Layout components
- `app/lib/` - Utilities
- `app/schemas/` - Zod schemas
- `app/services/` - Server-side services
- `app/hooks/` - React hooks
- `app/metadata/` - Metadata extraction logic
- `app/scripts/` - Dev/start scripts

Migrations are in `drizzle/`.

### Database Schema (PostgreSQL + Drizzle ORM)

**Core entities:**

- `publishers` - Publisher info (id, name, slug)
- `series` - Comic series (id, name, volume, slug, publisherId)
- `comics` - Individual comic files (id, fileName, fileModified, lastSynced, slug, number, volume, pageCount, publisherId, seriesId, metadata, releaseDate)
- `users` - Authentication
- `user_comics` - Read progress tracking (userId, comicId, isRead, currentPage)

**Schema location:** `app/db/schema.ts`

**Migration workflow:**

1. Modify `app/db/schema.ts`
2. Run `npm run db:generate -- --name=<descriptive_name>` (always pass a name)
3. Run `npm run db:migrate`

### Database Queries

All queries centralized in `app/db/queries.ts`.

**Query categories:**

- Comic queries: `getComicCount()`, `getRecentComicsForUser()`, `findComicByFileName()`, `searchComics()`
- Publisher queries: `getPublishersWithCounts()`, `findPublisherByName()`, `getPublisherBySlug()`
- Series queries: `getOrCreateSeries()`, `getSeriesComicsForUser()`, `getSeriesReadStatus()`
- User progress: `upsertUserComicProgress()`, `markComicAsRead()`, `markSeriesAsRead()`
- Cleanup: `deleteEmptySeries()`, `deleteEmptyPublishers()`, `deleteComicsOlderThan()`

### Scanner Architecture

**Processing flow:**

1. Pre-load publishers and series into memory maps for performance
2. Recursively scan directory for `.cbz`/`.zip` files
3. For each file:
   - Check if exists in DB by fileName
   - If new: extract metadata, create comic record
   - If exists and unchanged: update lastSynced timestamp
   - If exists and changed: update metadata and lastSynced
4. Cleanup phase (unless `--no-cleanup`):
   - Delete comics not found in scan
   - Delete empty series
   - Delete empty publishers

**Metadata extraction supports:**

- `ComicInfo.xml` (standard format) - parsed with `fast-xml-parser`
- `ComicBookInfo/1.0` (ZIP comment JSON) - fallback format

**Cover extraction:**

- Extracts first image from CBZ
- Resizes to max 300x500px, converts to JPEG (85% quality)
- Saved to: `{DATA_DIRECTORY}/covers/{firstDigitOfId}/{comicId}.jpg`

### Web Application (React Router v7)

**Route structure:**

- Main layout (`/`) - Home, Publishers, Series Details, Comic Details, Reader
- Auth layout - Login, Setup
- Standalone - Comic Reader, Cover endpoint, Progress API, Search

**URL encoding:** Uses SQIDS for ID obfuscation

- Example: `/comic/abc123/batman-detective-1` instead of `/comic/12345/...`
- Utilities: `idToSqid(id)`, `sqidToId(sqid)` in `app/lib/sqids.ts`

**Authentication:**

- `protectRoute(request)` middleware redirects unauthenticated users to `/login`
- Session-based auth using `remix-auth` and `remix-auth-form`

**Key utilities:**

- `app/lib/links.ts` - URL generation helpers
- `app/lib/paginateRecords.ts` - Pagination logic
- `app/lib/comicTitle.ts` - Format comic display names
- `app/lib/generatePageUrl.ts` - Generate page image URLs

### Important Patterns

**Slug generation:**

- Lowercase, trim, replace spaces/underscores with hyphens
- Remove special characters, consecutive hyphens
- Used for: publishers, series, comics (URL-friendly identifiers)

**Smart sync algorithm:**

- Compare `fileModified` timestamps to detect changes
- Only update metadata when file actually changed
- `lastSynced` timestamp tracks scan recency for cleanup

**Type safety:**

- Full TypeScript throughout
- Drizzle ORM provides type-safe queries
- Zod schemas for validation in `app/schemas/`

## Environment Variables

Required in `.env`:

```
DATABASE_URL=postgresql://user:pass@localhost:7432/comics
SCAN_DIRECTORY=/path/to/comics
DATA_DIRECTORY=/path/to/data
COOKIE_SECRET=random-secret-key
```

## Database Notes

**Connection:** Uses `postgres` library (not `pg`), configured in `app/db/index.ts`

**Migrations:** Stored in `drizzle/` directory

**Drizzle Studio:** Run `npm run db:studio` for visual database inspection

## File Processing Notes

**Supported formats:** CBZ (ZIP) files

**Metadata priority:** ComicInfo.xml > ComicBookInfo JSON > filename parsing

**Image extraction:** Uses `node-stream-zip` for efficient streaming ZIP access

**Cover organization:** Subdirectories by first digit of comic ID for filesystem performance with large collections

## React Router v7 Specifics

**SSR + Client hydration:** Server-side renders initial page, client takes over navigation

**Type generation:** React Router auto-generates types in `.react-router/types/` - do not edit manually

**Route exports:**

- `loader()` - Server-side data fetching
- `action()` - Form submission handling
- `meta()` - SEO meta tags
- `ErrorBoundary` - Error UI

**Forms:** Use `<Form>` component from `react-router` for progressive enhancement

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files
<!-- END BEADS INTEGRATION -->
