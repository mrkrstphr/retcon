SCAN_DIR=./comics \
DATA_DIRECTORY=${PWD}/data \
DATABASE_URL=postgresql://comic_user:comic_password@localhost:7432/comic_scanner \
node packages/scanner/dist/watcher.js
