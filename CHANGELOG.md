# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Debugged `redirect_uri_mismatch` error by verifying `NEXTAUTH_URL` and Google Cloud Console `Authorized redirect URIs`.
- Resolved 400 error during Google login by regenerating and updating `GOOGLE_CLIENT_SECRET`.
- Corrected smart quotes in `.env.local` for `GEMINI_API_KEY` and `GOOGLE_API_KEY`.

### Added
- Created `src/app/api/generate/gemini/route.ts` for Gemini content generation.

### Removed
- Removed debug routes `src/app/api/test/gemini/route.ts` and `src/app/api/debug/gemini/models/route.ts`.

### Changed
- Ensured `.env.local` is configured for local development and `.env.vercel.local` for production environment variables.
