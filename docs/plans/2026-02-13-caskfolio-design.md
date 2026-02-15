# Caskfolio MVP Design

## Product
- Digital-first whisky asset management platform
- Positioning: portfolio management, trust-driven premium UX, future vault-ready
- Out of scope: ecommerce, liquor sales payment, auction marketplace

## Confirmed Stack
- Monorepo: Turborepo + pnpm workspaces
- API: NestJS
- Web: Next.js (App Router)
- DB: PostgreSQL + Prisma
- Auth MVP: Email/password + Google + Apple

## Domain Scope (MVP)
- Auth
- Whisky asset registration (brand > product > variant + custom input)
- Portfolio dashboard and chart endpoints
- Public sharing per asset toggle
- Internal aggregated pricing
- Daily market crawling at 09:00 KST (Top 100 variants)
- Admin panel
- Social feed (hybrid): 70% following + 30% recommended

## Feed & Visibility
- Default asset visibility: private
- Public feed only includes assets with visibility=public
- Profile page: `example.com/u/{username}`
- Feed ranking source:
  - Following assets (recent + engagement proxy)
  - Recommended assets (popularity and recency)
- Pagination: cursor-based

## Trusted Price Strategy
Default feed price uses robust aggregation:
1. Weighted median of internal+external data
2. External median fallback
3. Internal median fallback
4. Hide price when sample is insufficient

Weight dimensions:
- Recency
- Sample size
- Source stability

## Core Data Model
- User
- Brand
- Product
- Variant
- WhiskyAsset
- OwnershipHistory
- MarketPriceSnapshot
- BarcodeMapping
- Follow
- FeedScore
- PriceAggregate
- InternalPriceSnapshot

## Security & Reliability
- JWT access/refresh with HttpOnly cookies
- Password reset tokens with expiration
- SSL mandatory
- Daily DB backup

## Non-functional
- Mobile-first responsive web
- Fast loading target (<2s perceived for key pages)
- Cloud deployment ready (AWS/GCP)

## Phase Notes
- Phase 1 includes core MVP plus social feed and trusted price display
- Barcode scan remains planned in Phase 2

## Auth UX/Flow Update (2026-02-14)
- Web runtime API base default is `/api`.
- Google sign-in is now direct browser redirect (not fetch-first popup/json handoff):
  - Entry: `/api/auth/google?direct=1`
  - Result: backend returns immediate `302` to Google OAuth page.
- OAuth return path currently targets `/auth/login` in production domain.
- Production dependency:
  - Active Google OAuth client must exist and match configured `GOOGLE_CLIENT_ID`.

## Implementation Sync Addendum (2026-02-15)
- Route normalization:
  - `/login` is now a redirect-only entry that forwards to `/auth/login`.
- Signup robustness:
  - signup request DTO fields are strictly validated (`email`, `password`, `name`).
  - malformed signup payloads are rejected with `400`, preventing Prisma validation crashes.
- Catalog availability:
  - API bootstraps brand catalog to at least 100 entries (upsert-based) when data is missing.
- Feed composer rule:
  - posting is allowed even with zero existing assets.
  - in zero-asset state, `Asset widget` is disabled while `None/Poll` remain available.
- Profile social visibility:
  - profile header shows `followerCount` and `followingCount`.
  - detailed follower/following member lists are loaded via paginated profile APIs.
  - follower/following list APIs require authenticated user context (`x-user-email`).
