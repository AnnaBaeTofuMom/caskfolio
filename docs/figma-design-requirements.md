# Caskfolio Figma Design Requirements (MVP v1)

## 1. Product Context
- Product: whisky asset management platform (not e-commerce)
- Brand keywords: clean, premium, trust-driven, modern (Airbnb-like clarity)
- Out of scope visual cues:
  - Marketplace clutter
  - Trading terminal/hacker UI
  - Auction/sales/payment flow

## 2. Visual Direction
- Tone:
  - Warm white base
  - Soft beige surfaces
  - Whisky amber accent
- Style:
  - Large whitespace
  - Rounded corners
  - Soft shadows
  - Clear hierarchy for numbers/prices
- Typography:
  - Modern sans-serif
  - Large numeric emphasis for portfolio values

## 3. Information Architecture (MVP)
- Global nav:
  - Home
  - Feed
  - Portfolio
  - Assets (registration + my assets)
  - Admin
  - Login
- Public profile route:
  - `/u/{username}`

## 4. Required Screens
- Home (value proposition + primary CTA)
- Login/Auth
  - Email/password login
  - Social login entry (Google/Apple)
  - Phone verification block
- Asset Registration
  - 3-level selection: Brand > Product Line > Variant
  - Custom product fallback input
  - Required fields in UI:
    - Purchase price
    - Purchase date
    - Box available (yes/no)
    - Photo URL/input
    - Caption
    - Visibility (public/private)
- My Assets Panel
  - Asset list cards
  - Visibility toggle
  - Share link generation UI
  - Logged-out state: blocked with login-required message
- Portfolio Dashboard
  - Total estimated value
  - Total purchase value
  - Unrealized gain/loss
  - Asset count
  - Growth chart area
- Community Feed (Instagram-like list)
  - Card must show:
    - Owner
    - Asset name
    - Asset photo (if available)
    - Caption (user-written text)
    - Trusted price + method/confidence
    - Date
- Public Profile
  - User header
  - Follower/following counts in header
  - Clickable follower/following area to open paginated member list
  - Public collection cards (photo + caption + trusted price)
- Admin Dashboard
  - KPI cards
  - Top holders list
  - Management forms (role/catalog/price ops)

## 5. Core Components To Design
- Top navigation bar
- Metric card
- Feed card (with image variant and no-image variant)
- Asset row card
- Form controls:
  - Text input
  - Select
  - Date picker
  - Checkbox
  - Primary/secondary buttons
- Status/empty/error blocks

## 6. States (Must Include)
- Auth:
  - Logged-out
  - Logged-in
- Data:
  - Loading
  - Empty
  - Error
  - Success feedback
- Visibility:
  - Public
  - Private

## 7. Responsive Requirements
- Mobile-first
- Key breakpoints:
  - Mobile: 360-767
  - Tablet: 768-1023
  - Desktop: 1024+
- Ensure nav/form/feed/metrics all readable and touch-friendly on mobile

## 8. Interaction Guidance
- Keep motion subtle and purposeful
- Emphasize trust and readability over decorative effects
- Fast-scan layout for portfolio numbers and feed cards

## 9. Deliverables Requested From Figma
- High-fidelity MVP screens (desktop + mobile)
- Component library (tokens + reusable components)
- Interactive prototype for:
  - Login -> Asset registration -> Feed -> Portfolio
  - Public profile view
  - Admin dashboard basic flow

## 10. Auth Interaction Update (2026-02-14)
- Google login CTA should be treated as full-page redirect action (anchor-style navigation).
  - Target endpoint: `/api/auth/google?direct=1`
- No intermediate client modal/spinner is required before redirect.
- Error state to include in auth designs:
  - OAuth provider error page case (`401 deleted_client`) with retry/help text guidance.
- Implementation alignment note:
  - Web app API default base path is `/api` in production/client fallback logic.

## 11. Feed Composer Update (2026-02-15)
- Users can publish a feed post even when they have zero registered assets.
- In that state:
  - `Asset widget` option must be visibly disabled.
  - `None` and `Poll` widget options stay selectable.
  - Optional helper copy should guide users to asset registration without blocking post creation.
