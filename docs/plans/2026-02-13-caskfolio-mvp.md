# Caskfolio MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP whisky asset platform with auth, registration, portfolio, sharing, trusted pricing, daily crawl, admin APIs, and hybrid social feed.

**Architecture:** Turborepo monorepo with Next.js web and NestJS API sharing Prisma/PostgreSQL schema. API provides auth, portfolio, feed, admin, and scheduled crawling. Web consumes API with mobile-first Airbnb-inspired design tokens.

**Tech Stack:** pnpm workspaces, turbo, TypeScript, NestJS, Next.js, Prisma, PostgreSQL, Jest/Vitest.

---

### Task 1: Scaffold monorepo and workspace tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`

**Step 1: Write failing validation check**
- Run: `test -f package.json && exit 1 || exit 0`
- Expected: command exits 0 because file does not exist

**Step 2: Create workspace files**
- Add root package scripts for build/dev/test/lint and workspace setup

**Step 3: Verify structure**
- Run: `ls`
- Expected: root config files present

### Task 2: Implement API app skeleton with domain modules

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/modules/**`

**Step 1: Add module tests for trusted price service**
- Add unit test for weighted median fallback behavior

**Step 2: Run test to verify it fails**
- Run: `pnpm --filter api test -- price-aggregate.service.spec.ts`
- Expected: fail due to missing implementation

**Step 3: Implement minimal service/controller layer**
- Auth, assets, portfolio, social feed, admin stubs and pricing logic

**Step 4: Re-run tests**
- Expected: pass

### Task 3: Define Prisma schema and seed

**Files:**
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/seed.ts`
- Create: `packages/db/package.json`

**Step 1: Add schema validation step**
- Run: `pnpm --filter @caskfolio/db prisma validate`
- Expected: fail before schema exists

**Step 2: Add full schema for MVP models**

**Step 3: Validate schema**
- Expected: pass

### Task 4: Implement web app pages and UI system

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/app/**`
- Create: `apps/web/components/**`
- Create: `apps/web/styles/globals.css`

**Step 1: Add render test for feed card component**

**Step 2: Run test and verify failure**

**Step 3: Implement pages (dashboard/feed/assets/admin/profile) and premium visual system**

**Step 4: Re-run tests**

### Task 5: Add crawler + scheduler contract

**Files:**
- Create: `apps/api/src/modules/crawler/**`

**Step 1: Test next-crawl-time timezone behavior

**Step 2: Implement daily 09:00 KST schedule and snapshot contract

### Task 6: Add docs and run verification

**Files:**
- Create: `README.md`
- Create: `.env.example`

**Step 1: Run workspace sanity checks
- `pnpm -r -w lint`
- `pnpm -r -w test`

**Step 2: Document run/deploy flow

**Step 3: Commit in logical chunks

---

## Post-implementation production updates (2026-02-14)

### Auth flow logic updates
- Web API base fallback changed:
  - from `/api-proxy`
  - to `/api`
- Google login flow changed to direct redirect mode:
  - client entry: `/api/auth/google?direct=1`
  - server behavior: immediate `302` to Google OAuth URL
- Active OAuth redirect URI:
  - `https://caskfolio.club/auth/login`

### Operational verification checklist
1. Check redirect behavior:
   - `curl -i "https://caskfolio.club/api/auth/google?direct=1"`
   - expected: `HTTP/2 302` with `location: https://accounts.google.com/...`
2. Validate client id in redirect `location` matches current intended Google OAuth client.
3. If Google returns `Error 401: deleted_client`:
   - recreate OAuth client in Google Cloud Console
   - update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - rebuild/restart `api`, `web`, `caddy` containers

## Post-implementation production updates (2026-02-15)

### Auth and routing stability updates
- `/login` route is a redirect endpoint to `/auth/login` for consistent chunk/hydration pathing.
- Signup endpoint was hardened:
  - DTO validation for required fields (`email`, `password`, `name`)
  - service-level guard for missing fields before `findUnique` query
  - expected bad-request behavior: `400` on malformed payload

### Catalog seed reliability updates
- API now guarantees baseline brand catalog at startup:
  - if brand count < 100, known brand list is upserted automatically
  - controlled by env `AUTO_SEED_BRANDS_ON_BOOT` (enabled by default)

### Feed composer behavior update
- Feed post creation no longer requires pre-existing assets.
- UX rule:
  - when asset count is zero, `Widget=ASSET` is disabled
  - `Widget=NONE` and `Widget=POLL` are still available
