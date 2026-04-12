#!/usr/bin/env bash
set -e

echo "=== Platform v2 — Dev Setup ==="

# Install dependencies
echo "→ Installing dependencies..."
npm install

# Generate Prisma client
echo "→ Generating Prisma client..."
cd packages/db
npx prisma generate
npx prisma db push   # creates dev.db with the schema
cd ../..

echo ""
echo "✓ Dev setup complete!"
echo ""
echo "To start development:"
echo "  npx turbo dev"
echo ""
echo "Backend runs on: http://localhost:3000"
echo "Web app runs on: http://localhost:5173"
echo ""
echo "Default tenant: zenco"
echo "  TENANT=zenco VITE_TENANT=zenco"
