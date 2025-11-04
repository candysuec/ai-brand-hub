#!/bin/bash
# 🧠 Auto-syncs NEXTAUTH_URL, starts dev server, and runs system check

PORT=${1:-3002}

# --- Update NEXTAUTH_URL in .env.local ---
if grep -q "NEXTAUTH_URL=" .env.local; then
  sed -i "s|NEXTAUTH_URL=http://localhost:[0-9]*|NEXTAUTH_URL=http://localhost:$PORT|" .env.local
else
  echo "NEXTAUTH_URL=http://localhost:$PORT" >> .env.local
fi

echo "✅ Updated NEXTAUTH_URL to http://localhost:$PORT"

# --- Run local build + check script ---
echo "🔍 Running system health check before starting..."
if [ -f "./check_system.sh" ]; then
  chmod +x ./check_system.sh
  ./check_system.sh
else
  echo "⚠️ No check_system.sh found — skipping health check."
fi

# --- Start Next.js dev server ---
echo "🚀 Starting dev server on port $PORT ..."
PORT=$PORT npm run dev
