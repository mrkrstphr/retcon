#!/usr/bin/env sh

cd /app/packages/common
node dist/db/migrate.js

cd /app/packages/web
pnpm start
