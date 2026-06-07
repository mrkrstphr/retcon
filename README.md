# Rack Manager

A comic book collection manager that scans directories for comic files (CBZ/CBR), extracts metadata, and provides a web interface for browsing your collection.

## Features

- **Smart Scanning**: Efficiently processes CBZ and CBR files with intelligent sync logic
- **Metadata Extraction**: Supports ComicInfo.xml and ComicBookInfo formats
- **Cover Extraction**: Automatically generates optimized cover images
- **Web Interface**: Beautiful card-based view of your collection
- **PostgreSQL Storage**: Reliable database backend with full-text search capabilities

For each file:

1.  If it doesn't exist in the database, insert it
2.  If it does, and the `file_modified` matches the file modified time, simply update its last_synced timestamp
3.  If they do not match, the metadata should be updated

This script is written in Typescript.

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

Pushing the tag triggers the GitHub Actions release workflow, which builds a multi-arch Docker image (`linux/amd64` + `linux/arm64`) and pushes it to Docker Hub as `mrkrstphr/retcon` with tags `:x.y.z`, `:x`, and `:latest`.
