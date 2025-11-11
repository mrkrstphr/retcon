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
