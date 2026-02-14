Shared lint, tsconfig, and environment schemas live here.

## Auth/runtime config notes (2026-02-14)
- Web default API base fallback is `/api` (not `/api-proxy`).
- Google OAuth login uses direct redirect endpoint:
  - `GET /api/auth/google?direct=1` -> `302` to Google.
- Production must provide valid OAuth credentials:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- OAuth redirect URI in use: `https://caskfolio.club/auth/login`.
