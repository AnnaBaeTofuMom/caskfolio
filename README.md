# Caskfolio

Whisky Asset Platform MVP monorepo.

## Stack
- Turborepo + pnpm workspaces
- API: NestJS (`apps/api`)
- Web: Next.js (`apps/web`)
- DB: PostgreSQL + Prisma (`packages/db`)

## MVP modules
- Auth: email/password, Google, Apple (endpoint skeleton)
- Asset registration: brand/product/variant + custom input
- Portfolio summary + growth chart endpoints
- Public sharing by asset visibility
- Trusted pricing: weighted median + fallback logic
- Daily crawl scheduler at 09:00 KST (contract scaffold)
- Admin metrics endpoint
- Social feed: 70% following + 30% recommended

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
- API:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/assets`
  - `GET /api/portfolio/me/summary`
  - `GET /api/social/feed`
  - `GET /api/variants/:variantId/price`
  - `GET /api/admin/metrics`

## Notes
- Crawler uses a scheduled stub. Replace with Playwright/Puppeteer flow with robots.txt compliance.
- OAuth providers are scaffolded at contract level; strategy wiring and provider registration are next implementation steps.
