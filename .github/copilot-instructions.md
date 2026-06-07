# Copilot Instructions for comic-scanner

## Project Overview
This is a TypeScript application that scans directories for comic book files (CBZ/CBR), extracts metadata, and stores it in PostgreSQL. The app implements smart sync logic to avoid unnecessary database updates.

## Architecture & Core Concepts

### File Processing Strategy
- **CBZ files**: ZIP archives containing images + optional ComicInfo.xml metadata
- **CBR files**: RAR archives with similar structure
- **Metadata priority**: ComicInfo.xml (if present) > embedded file metadata
- **Sync optimization**: Compare `file_modified` timestamps to skip unchanged files

### Database Design
- PostgreSQL as primary data store
- Track `last_synced` timestamps for incremental updates
- Store file paths, metadata, and modification times
- Consider indexing on file paths and modification times for performance

### Key Processing Flow
1. Directory scanning → file discovery
2. File type detection (CBZ/CBR)
3. Archive extraction (memory-efficient streaming preferred)
4. ComicInfo.xml parsing (if present)
5. Fallback metadata extraction from filename/structure
6. Database upsert with modification time comparison

## Development Guidelines

### TypeScript Patterns
- Use strict TypeScript configuration
- Define interfaces for ComicInfo.xml schema and database models
- Implement proper error handling for file system operations
- Consider using libraries like `yauzl` (CBZ) and `node-rar` (CBR) for archive handling

### Database Integration
- Uses Drizzle ORM for type-safe PostgreSQL interactions
- Schema defined in `src/db/schema.ts`
- Connection configured in `src/db/index.ts` using DATABASE_URL
- Run `npm run db:generate --name descriptive_name` for meaningful migration names
- Apply migrations with `npm run db:migrate`
- Use `npm run db:studio` to inspect database via Drizzle Studio

### File System Operations
- Stream large files instead of loading into memory
- Implement proper file locking checks
- Handle permission errors and missing files
- Use absolute paths for database storage

## Critical Dependencies
- Archive handling: Libraries for ZIP/RAR extraction
- XML parsing: For ComicInfo.xml files
- Database client: PostgreSQL driver with TypeScript support
- File watching (optional): For real-time directory monitoring

## Testing Considerations
- Mock file system operations for unit tests
- Test with various comic file structures and corrupted archives
- Verify metadata extraction accuracy
- Test sync logic with different modification time scenarios

## Performance Optimization
- Batch database operations for large directories
- Implement parallel file processing with controlled concurrency
- Consider caching frequently accessed metadata
- Use database indexes on commonly queried fields

## Error Handling Patterns
- Graceful handling of corrupted archive files
- Database connection retry logic
- Logging for failed file processing (don't stop entire scan)
- Clear error messages for configuration issues

## Configuration Management
- Database connection parameters
- Scan directory paths
- Processing batch sizes and concurrency limits
- Metadata extraction preferences and fallback rules
