# comic-scanner

This app will scan a specified directory, find all CBZ or CBR files, read their metadata, either directly from the file or from an internal ComicInfo.xml file, and save them to a PostgreSQL database.

For each file:

1.  If it doesn't exist in the database, insert it
2.  If it does, and the `file_modified` matches the file modified time, simply update its last_synced timestamp
3.  If they do not match, the metadata should be updated

This script is written in Typescript.
