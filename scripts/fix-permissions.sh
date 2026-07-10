#!/bin/bash
# Fix esbuild binary permissions for hosting environments
# The esbuild binary may not have execute permissions after pnpm install
# on some hosting platforms (e.g., Hostinger shared hosting)

ESBUILD_DIRS=$(find node_modules/.pnpm -maxdepth 1 -name "esbuild@*" -type d 2>/dev/null)

for dir in $ESBUILD_DIRS; do
  BIN="$dir/node_modules/esbuild/bin/esbuild"
  if [ -f "$BIN" ]; then
    chmod +x "$BIN" 2>/dev/null || true
  fi
done

# Also fix @tailwindcss/oxide if present
OXIDE_DIRS=$(find node_modules/.pnpm -maxdepth 1 -name "@tailwindcss+oxide*" -type d 2>/dev/null)

for dir in $OXIDE_DIRS; do
  find "$dir" -name "*.node" -exec chmod +x {} \; 2>/dev/null || true
done

exit 0
