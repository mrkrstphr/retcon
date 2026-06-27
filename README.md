# Retcon

A comic book collection manager that scans directories for comic files (CBZ/CBR), extracts metadata, and provides a web interface for browsing and reading your collection.

## Features

- **Smart Scanning**: Efficiently processes CBZ files with intelligent sync logic — only re-reads metadata when files change
- **Metadata Extraction**: Supports ComicInfo.xml and ComicBookInfo formats, with filename parsing as a fallback
- **Cover Extraction**: Automatically generates optimized cover images
- **Publisher & Series Organization**: Hierarchical browsing by publisher and series
- **In-Browser Reader**: Read comics directly in the browser with page-by-page navigation
- **Reading Progress**: Tracks current page and read/unread status per user
- **Search**: Full-text search across your collection
- **Authentication**: Multi-user support with session-based login
- **PostgreSQL Storage**: Reliable database backend via Drizzle ORM

## Setup

### Environment Variables

Create a `.env` file:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/comics
SCAN_DIRECTORY=/path/to/comics
DATA_DIRECTORY=/path/to/data
COOKIE_SECRET=random-secret-key
```

### Running

```bash
npm install
npm run db:migrate
npm run dev        # development
npm run build && npm run start  # production
```

### Scanning Your Collection

```bash
npm run scan
```

Scanner options:

```bash
--dir <path>       # Override SCAN_DIRECTORY
--force-update     # Force metadata update for all comics
--no-cleanup       # Skip deletion of missing comics/series/publishers
--help             # Show help
```

## Docker

A multi-arch Docker image (`linux/amd64` + `linux/arm64`) is available on Docker Hub:

```
mrkrstphr/retcon:latest
```

## Cutting a Release

Bump the version, commit, and tag in one step:

```bash
npm version patch   # 1.0.0 → 1.0.1  (bug fixes)
npm version minor   # 1.0.0 → 1.1.0  (new features)
npm version major   # 1.0.0 → 2.0.0  (breaking changes)
```

Then push the commit and tag:

```bash
git push --follow-tags
```

Pushing the tag triggers the GitHub Actions release workflow, which builds and pushes the Docker image with tags `:x.y.z`, `:x`, and `:latest`.
