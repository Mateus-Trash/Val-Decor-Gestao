#!/bin/bash
# Fix esbuild binary permissions for hosting environments (e.g., Hostinger shared hosting)
# esbuild's postinstall is blocked to prevent EACCES errors, so we fix permissions here

# Find and fix ALL esbuild binaries regardless of path structure
find node_modules -name "esbuild" -type f -path "*/bin/*" -exec chmod +x {} \; 2>/dev/null || true

# Also fix any esbuild binaries in @esbuild platform packages
find node_modules -path "*/@esbuild/*/bin/esbuild" -exec chmod +x {} \; 2>/dev/null || true

# Fix esbuild binary in pnpm store
find node_modules/.pnpm -name "esbuild" -type f -path "*/bin/*" -exec chmod +x {} \; 2>/dev/null || true

# Fix @tailwindcss/oxide native bindings
find node_modules -name "*.node" -exec chmod +x {} \; 2>/dev/null || true

# Broad catch: make everything in bin directories executable
find node_modules -path "*/esbuild/bin/*" -type f -exec chmod +x {} \; 2>/dev/null || true
find node_modules -path "*/@esbuild/*/bin/*" -type f -exec chmod +x {} \; 2>/dev/null || true

exit 0
