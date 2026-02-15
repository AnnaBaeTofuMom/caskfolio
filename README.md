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
- Social: follow/unfollow, hybrid feed (70/30), public profile
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
  - API auto-seeds catalog brands on boot when brand count is below 100.
  - Controlled by `AUTO_SEED_BRANDS_ON_BOOT` (default enabled).
- Feed post creation UX:
  - Users can write feed posts even when they have no existing assets.
  - If user has zero assets, `Widget=ASSET` is disabled.
  - `Widget=NONE` / `Widget=POLL` remain available.
