SCAN_DIRECTORY=/Volumes/Books/Comics \
DATA_DIRECTORY=${PWD}/data \
DATABASE_URL=postgresql://comic_user:comic_password@localhost:7432/comic_scanner \
pnpm --filter=@retcon/scanner start --force-update --dir "/Volumes/Books/Comics/DC/Green Lantern"
