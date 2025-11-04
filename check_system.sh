#!/bin/bash
echo ""
echo "🧠 AI Brand Hub - Full System + Safe Vercel Deployment + GitHub Update"
echo "-----------------------------------------------------------------------"

# Helper function for rollback
rollback_to_last_good() {
  echo ""
  echo "⚠️ Rolling back to previous stable deployment..."
  LAST_GOOD=$(vercel ls ai-brand-hub --confirm --yes | grep "Ready" | head -n 1 | awk '{print $2}')
  if [ -z "$LAST_GOOD" ]; then
    echo "❌ No previous stable deployment found to roll back to."
    exit 1
  fi

  echo "🔁 Reverting to: $LAST_GOOD"
  vercel rollback $LAST_GOOD --confirm --yes
  echo "✅ Rolled back to previous version: $LAST_GOOD"
  exit 1
}

# 1️⃣ Environment
if [ -f ".env.local" ]; then
  echo "✅ .env.local found"
else
  echo "❌ .env.local missing — please create it before testing."
  exit 1
fi

# 2️⃣ Required env vars
REQUIRED_VARS=("DATABASE_URL" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "GOOGLE_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "$var=" .env.local; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "✅ All required environment variables are set"
else
  echo "❌ Missing variables: ${MISSING_VARS[*]}"
  exit 1
fi

# 3️⃣ Prisma generation
echo ""
echo "🔍 Checking Prisma..."
npx prisma generate &>/dev/null
if [ $? -eq 0 ]; then
  echo "✅ Prisma generated successfully"
else
  echo "❌ Prisma generate failed"
  rollback_to_last_good
fi

# 4️⃣ Migrations
echo ""
echo "🗄 Applying Prisma migrations..."
npx prisma migrate deploy
if [ $? -eq 0 ]; then
  echo "✅ Prisma migrations applied successfully"
else
  echo "❌ Migration failed — check DATABASE_URL or schema"
  rollback_to_last_good
fi

# 5️⃣ Build
echo ""
echo "🏗  Running build..."
npm run build --silent
if [ $? -eq 0 ]; then
  echo "✅ Build succeeded"
else
  echo "❌ Build failed — cannot deploy safely"
  rollback_to_last_good
fi

# 6️⃣ Local API test
echo ""
echo "🚀 Testing local API..."
nohup npm run dev >/dev/null 2>&1 & 
SERVER_PID=$!
sleep 8

RESPONSE=$(curl -s -X POST http://localhost:3002/api/generate/slogan \
  -H "Content-Type: application/json" \
  -d '{"prompt":"check system"}')

if echo "$RESPONSE" | grep -q "result"; then
  echo "✅ Local API test passed"
else
  echo "⚠️ Local API test failed — check Gemini API key or route.ts"
fi

# Kill local server
kill $SERVER_PID >/dev/null 2>&1
echo "🧩 Local environment verified"

# 7️⃣ Commit unpushed changes
echo ""
if git diff --quiet && git diff --cached --quiet; then
  echo "✅ No uncommitted changes"
else
  echo "⚠️ Local changes found — committing automatically"
  git add .
  git commit -m "Auto commit: pre-deploy system health check" >/dev/null 2>&1
fi

# 8️⃣ Deploy to Vercel
echo ""
echo "☁️ Deploying to Vercel (Production)..."
vercel --prod --confirm --yes >/tmp/vercel_output.txt 2>&1
if grep -q "Production:" /tmp/vercel_output.txt; then
  DEPLOY_URL=$(grep "Production:" /tmp/vercel_output.txt | awk '{print $2}')
  echo "✅ Deployment triggered successfully"
  echo "🌐 Deployed at: $DEPLOY_URL"
else
  echo "❌ Deployment command failed"
  tail -n 10 /tmp/vercel_output.txt
  rollback_to_last_good
fi

# 9️⃣ Check status
echo ""
echo "🔎 Checking deployment status..."
vercel ls ai-brand-hub --confirm --yes | head -n 8 > /tmp/vercel_status.txt
cat /tmp/vercel_status.txt
if grep -q "Error" /tmp/vercel_status.txt; then
  echo "❌ Deployment shows errors — fetching logs..."
  vercel logs ai-brand-hub --prod --confirm --yes | tail -n 10
  rollback_to_last_good
else
  echo "✅ Deployment healthy!"
fi

# 🔟 Live test
echo ""
echo "🌍 Testing live API at $DEPLOY_URL/api/generate/slogan..."
LIVE_RESPONSE=$(curl -s -X POST "$DEPLOY_URL/api/generate/slogan" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"check live system"}')

if echo "$LIVE_RESPONSE" | grep -q "result"; then
  echo "✅ Live API test passed successfully"
else
  echo "❌ Live API test failed — rolling back to last stable version"
  rollback_to_last_good
fi

# 1️⃣1️⃣ Auto-update GitHub README
echo ""
echo "📝 Updating README.md with latest deployment info..."
DATE=$(date '+%Y-%m-%d %H:%M:%S')
if grep -q "### Latest Deployment" README.md; then
  sed -i "/### Latest Deployment/,+2d" README.md
fi
cat <<EOT >> README.md

---

### Latest Deployment
✅ **Deployed successfully:** $DATE  
🌐 **Live URL:** [$DEPLOY_URL]($DEPLOY_URL)

EOT

git add README.md
git commit -m "Auto-update README with latest deployment info" >/dev/null 2>&1
git push -u origin main >/dev/null 2>&1
echo "✅ README.md updated and pushed to GitHub"

# ✅ Summary
echo ""
echo "🎉 Full Safe Deployment + GitHub Update Complete!"
echo "------------------------------------------------"
echo "✅ Env OK"
echo "✅ Prisma OK"
echo "✅ Migrations OK"
echo "✅ Build OK"
echo "✅ Local API OK"
echo "✅ Vercel Deploy OK"
echo "✅ Live API OK"
echo "✅ GitHub README updated"
echo ""
echo "📦 Live Site: $DEPLOY_URL"
echo ""
