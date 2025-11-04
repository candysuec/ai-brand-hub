#!/bin/bash
# 🧠 Auto-syncs NEXTAUTH_URL with chosen port and starts the dev server

PORT=${1:-3002}

# Update NEXTAUTH_URL line in .env.local (or add it if missing)
if grep -q "NEXTAUTH_URL=" .env.local; then
  sed -i "s|NEXTAUTH_URL=http://localhost:[0-9]*|NEXTAUTH_URL=http://localhost:$PORT|" .env.local
else
  echo "NEXTAUTH_URL=http://localhost:$PORT" >> .env.local
fi

echo "✅ Updated NEXTAUTH_URL to http://localhost:$PORT"
echo "🚀 Starting dev server on port $PORT ..."
PORT=$PORT npm run dev
