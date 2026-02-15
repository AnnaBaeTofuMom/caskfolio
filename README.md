# Caskfolio

Whisky Asset Platform MVP monorepo.

## Stack
- Turborepo + pnpm workspaces
- API: NestJS (`apps/api`)
- Web: Next.js (`apps/web`)
- DB: PostgreSQL + Prisma (`packages/db`)

## Implemented MVP scope
- Auth: email/password signup/login, JWT access/refresh rotation, logout, password reset token flow, Google/Apple callback upsert flow
- Asset registration: brand/product/variant lookup + custom input + admin review queue
- Portfolio: summary/chart + persistent public share links
- Pricing: internal/external aggregation with weighted-median fallback
- Social: follow/unfollow, hybrid feed (70/30), public profile, follower/following counts and paginated member lists
- Crawler: daily 09:00 KST job writing market snapshots + refreshing aggregates
- Admin: dashboard metrics, users, catalog create endpoints, custom product approval

## Quick start
1. Install deps
```bash
pnpm install
```

2. Start local DB
```bash
docker compose up -d
```

3. Configure env
```bash
cp .env.example .env
```

4. Generate Prisma client and run migration
```bash
pnpm --filter @caskfolio/db prisma generate
pnpm --filter @caskfolio/db prisma migrate dev --name init
pnpm --filter @caskfolio/db prisma db seed
```

5. Run apps
```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api

## Key routes
- Web: `/`, `/feed`, `/portfolio`, `/assets`, `/admin`, `/u/{username}`
- API Auth:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `POST /api/auth/password-reset/request`
  - `POST /api/auth/password-reset/confirm`
  - `GET /api/auth/google` (default: provider URL JSON response)
  - `GET /api/auth/google?direct=1` (direct 302 redirect to Google OAuth)
  - `GET /api/auth/google/callback`
  - `GET /api/auth/apple/callback`
- API Core:
  - `GET /api/catalog/brands|products|variants`
  - `POST /api/assets`
  - `PATCH /api/assets/:id`
  - `GET /api/assets/me`
  - `GET /api/portfolio/me/summary`
  - `GET /api/portfolio/me/chart`
  - `POST /api/portfolio/me/share-link`
  - `GET /api/portfolio/me/share/:slug`
  - `GET /api/social/feed`
  - `POST /api/social/follow/:userId`
  - `DELETE /api/social/follow/:userId`
  - `GET /api/u/:username`
  - `GET /api/u/:username/followers` (auth required)
  - `GET /api/u/:username/following` (auth required)
  - `GET /api/variants/:variantId/price`
- API Admin:
  - `GET /api/admin/metrics`
  - `GET /api/admin/users`
  - `GET /api/admin/custom-products`
  - `PATCH /api/admin/custom-products/:submissionId/approve`
  - `POST /api/admin/catalog/brands|products|variants`

## Notes
- Crawler currently uses simulated external prices as a safe placeholder for marketplace crawling integration.
- OAuth callback currently uses provided query identity values; production token exchange/verification with providers is the next hardening step.

## Production auth hotfix (2026-02-14)
- Web client API fallback default changed from `/api-proxy` to `/api`.
- Login entry switched to direct browser navigation for Google OAuth:
  - Login button href: `/api/auth/google?direct=1`
  - API behavior for `direct=1`: immediate 302 to Google auth endpoint
- OAuth redirect URI in active flow is `https://caskfolio.club/auth/login`.
- If Google shows `Error 401: deleted_client`, the OAuth client in Google Cloud has been deleted.
  - Action: create a new OAuth client and update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in production env.

## Production sync updates (2026-02-15)
- Login route behavior:
  - `/login` now immediately redirects to `/auth/login`.
- Signup hardening:
  - DTO validation is enforced for `email`, `password`, `name`.
  - API-level guard blocks malformed signup requests before Prisma lookup.
  - Invalid payloads return `400` instead of causing `500` with `email: undefined`.
- Catalog bootstrap:
  - API auto-seeds catalog depth on boot: brands + product lines + baseline variants.
  - Includes expanded major brand sub-lines so Product Line/Version selectors are populated.
  - Even when minimum counts are already satisfied, known catalog entries are still upsert-synced on boot (idempotent sync mode).
  - Controlled by `AUTO_SEED_BRANDS_ON_BOOT` (default enabled).
  - WhiskyHunter sync:
    - On boot, service pulls from `https://whiskyhunter.net/api/whiskies_data` and upserts discovered rows additively.
    - Parsing priority is `full_name` first (fallback to `name`) for line/version extraction.
    - Pagination with `next` is followed until exhaustion to maximize product coverage.
    - Sync is additive-only (no delete/shrink path). Existing catalog rows are never removed by sync.
    - Controlled by `WHISKYHUNTER_SYNC_ON_BOOT` (default enabled).
  - User-facing catalog search (`/api/catalog/brands|products|variants`) uses normalized contains matching
    (case-insensitive; ignores spaces/symbols/common article `the`) to avoid exact-match-only behavior.
- Crawler bootstrap/scheduling:
  - Daily scheduled crawl remains `09:00 KST`.
  - On app boot, crawler also runs one immediate pass by default (`CRAWLER_RUN_ON_BOOT=true`).
  - If no owned-asset variants exist yet, crawler falls back to catalog variants for target selection.
- Feed post creation UX:
  - Users can write feed posts even when they have no existing assets.
  - If user has zero assets, `Widget=ASSET` is disabled.
  - `Widget=NONE` / `Widget=POLL` remain available.

## Feed/Asset Separation Update (2026-02-15)
- Registered assets and feed posts are now explicitly separated by `WhiskyAsset.isFeedPost`.
  - Asset registration flow: `isFeedPost=false` (default)
  - Feed composer publish flow: `isFeedPost=true`
- Feed timeline only queries feed-post records (plus legacy fallback condition for old posts).
- Public collection/profile and portfolio ranking exclude feed-post records from asset valuation context.
- Portfolio dashboard summary/chart and share-link fallback selection now also exclude `isFeedPost=true` rows.
- Feed card asset widget now renders selected whisky name and product line above price metrics.
- Soft delete behavior:
  - `DELETE /api/assets/:id` now performs soft delete (`WhiskyAsset.deletedAt` set, visibility forced to `PRIVATE`).
  - Works for both collection assets and feed-post rows from the My Assets UI.
  - Feed timeline, portfolio summary/chart, public profile assets, and share payloads exclude soft-deleted rows.
- Operational note:
  - apply schema change before deploy (`prisma db push` or migration) to add `isFeedPost` and `deletedAt` columns.
