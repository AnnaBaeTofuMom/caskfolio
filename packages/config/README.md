Shared lint, tsconfig, and environment schemas live here.

## Auth/runtime config notes (2026-02-14)
- Web default API base fallback is `/api` (not `/api-proxy`).
- Google OAuth login uses direct redirect endpoint:
  - `GET /api/auth/google?direct=1` -> `302` to Google.
- Production must provide valid OAuth credentials:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- OAuth redirect URI in use: `https://caskfolio.club/auth/login`.

## Runtime additions (2026-02-15)
- Catalog brand bootstrap toggle:
  - `AUTO_SEED_BRANDS_ON_BOOT=true|false`
  - Default is enabled (`true` when unset).
  - On API boot, if brand count is below 100, catalog brand seed list is upserted.
