# ⚙️ Gemini API Diagnostics Guide

This document helps verify that the Gemini API integration is configured and running correctly for **AI Brand Hub**.

---

## 🧩 1. Environment Setup

### Required Environment Variables
In `.env.local` or Vercel project settings:
```bash
GEMINI_API_KEY="your-valid-api-key"
NEXTAUTH_URL="http://localhost:3002"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Installed Packages

```bash
 @google/generative-ai@latest
next @16.0.1
typescript @latest
```

---

## 🧪 2. Health Check — `/api/generate/test`

### Path

```
src/app/api/generate/test/route.ts
```

### Purpose

* Confirms your Gemini API key works.
* Lists all available models.
* Tests a short prompt against `gemini-1.5-pro`.

### Expected Response

```json
{
  "success": true,
  "message": "Gemini API is working correctly.",
  "testOutput": "Brew brilliance in every cup.",
  "models": [
    "models/gemini-1.5-pro",
    "models/gemini-1.5-flash"
  ]
}
```

### Troubleshooting

| Error                             | Meaning                          | Fix                                      |
| --------------------------------- | -------------------------------- | ---------------------------------------- |
| `401 Unauthorized`                | Invalid API key                  | Replace `GEMINI_API_KEY`                 |
| `404 models/gemini-pro not found` | Deprecated model name or old SDK | Update SDK + use `gemini-1.5-pro`        |
| Empty response                    | Network or permissions issue     | Check Google Cloud quota and credentials |

---

## 🤖 3. Brand Identity Generator — `/api/generate/identity`

### Path

```
src/app/api/generate/identity/route.ts
```

### Function

Takes a brand description and returns a structured JSON with:

* Mission
* Vision
* Values

### Example Request

```json
{
  "brandDescription": "A startup crafting sustainable clothing for creatives",
  "brandId": "cmho64qxs000502gvcga16uy0"
}
```

### Example Response

```json
{
  "brandId": "cmho64qxs000502gvcga16uy0",
  "identity": {
    "mission": "Empower creators through sustainable style.",
    "vision": "A world where fashion inspires positive change.",
    "values": ["Sustainability", "Creativity", "Integrity", "Innovation"]
  }
}
```

### Common Errors

| Status | Message                                 | Cause              | Resolution                               |
| ------ | --------------------------------------- | ------------------ | ---------------------------------------- |
| 500    | `404 Not Found models/gemini-pro`       | Old model or SDK   | Update SDK + use `gemini-1.5-pro`        |
| 400    | `Missing brand description`             | Empty request body | Include `brandDescription`               |
| 500    | `Gemini API returned an empty response` | Quota or API error | Retry or handle null response gracefully |

---

## 🧹 4. Maintenance Tips

* Update Gemini SDK regularly:

  ```bash
  npm update @google/generative-ai
  ```
* Clear `.next` and restart after environment changes.
* Log the available models via `/api/generate/test` after SDK upgrades.
* Store `diagnostics.md` in `/docs/` for quick reference.

---

**✅ Success Criteria**

* `/api/generate/test` returns models.
* `/api/generate/identity` returns structured JSON.
* No 404 or 500 errors in terminal.
