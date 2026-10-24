# PicklePoint - Agent Development Rules & Architecture Guide

Welcome to the **PicklePoint** (Book Picklecourt) repository. This document defines the engineering standards, safety guardrails, domain logic, data models, and architectural patterns required for AI agents working on this codebase.

---

## 1. 🚨 Critical Safety Rules & Operational Guardrails

All agents working on this codebase MUST strictly adhere to the following guardrails:

> [!CAUTION]
> ### STRICT PUSH & DEPLOYMENT CONSTRAINT
> - **NEVER run `git push`** automatically.
> - **NEVER deploy to production** (`npm run deploy:prod`, `npm run deploy:prod:hosting`, `firebase deploy`) automatically.
> - **NEVER deploy staging** (`npm run deploy:staging`, `firebase deploy -P staging`) without explicit user instruction.
> - ALWAYS keep all changes local, verify thoroughly using `npm run build`, and wait for explicit confirmation from the user before running any remote push or deployment commands.

### Firebase Deployment Accounts & Environments
- **Authorized CLI Account**: `ran.peredo@gmail.com`
- **Staging Project**: `picklepoint-md` (Hosting URL: `https://picklepoint-md.web.app`)
- **Production Project**: `bookpicklecourt-prod` (Custom Domain: `https://bookpicklecourt.com`)
- **Credential Safety**: Never commit `.env`, `.env.staging`, or `.env.production` secrets or API master keys into version control.

---

## 2. 🏓 Project & Product Overview

**PicklePoint** is a specialized sports facility management and court reservation platform tailored for the Philippine pickleball ecosystem. The platform serves two primary groups of users:

1. **Players & Public Customers**:
   - Discover pickleball venues across Philippine regions, provinces, and cities.
   - Book hourly court slots (day and night rates) with real-time availability.
   - Add rental equipment (paddles, balls, ball machines, coaching).
   - Pay using GCash with QR code display, account copy helpers, formatted reference numbers, and payment receipt upload.
   - Join Open Play sessions, view brackets/match matrices, track DUPR ratings, and monitor player statistics.
   - Access customer profiles to review bookings, download digital vouchers, and track open play registrations.

2. **Venue Owners (Client Admins) & Super Admins**:
   - Multi-tenant facility management: Manage multiple courts, day/night hourly pricing, operating hours, and rental equipment catalogs.
   - Booking operations: Approve/cancel reservations, issue cancellation credits and rainout vouchers, record manual walk-in reservations.
   - Open Play orchestration: Run sessions with automated pairing rules (*Winners Stay*, *Round Robin*, *Random Doubles*), multi-court rosters, live match scoring, and DUPR CSV match result exports.
   - Live Umpire Scoreboard: Digital referee scoreboard with server 1/2 tracking, side-out logic, Web Speech API audio announcements, and undo history.
   - Tenant Onboarding & Administration: Philippine Standard Geographic Code (PSGC) address selectors, staff role management, service fee configuration, and URL shortening (`/s/:slug`).

---

## 3. 🛠 Tech Stack & Dependencies

| Layer | Technologies | Notes |
| :--- | :--- | :--- |
| **Framework** | React 19 (`react@^19.2.6`, `react-dom@^19.2.6`) | Modern functional components with hooks |
| **Build Tool** | Vite 8 (`vite@^8.0.12`, `@vitejs/plugin-react@^6.0.1`) | High-speed ESM build and development |
| **Language** | TypeScript 6 (`typescript@~6.0.2`) | Strict type checking (`tsc -b`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite@^4.3.0`) | Modern utility classes |
| **Icons** | Lucide React (`lucide-react@^1.17.0`) | Standard icon set across app |
| **Maps** | Leaflet (`leaflet@^1.9.4`, `@types/leaflet`) | Interactive venue geolocation & picker |
| **Backend / BaaS** | Firebase 12 (`firebase@^12.14.0`) | Auth, Firestore, Analytics, Hosting |
| **Linting** | ESLint 10 (`eslint@^10.3.0`, `@eslint/js`, `typescript-eslint`) | Flat config format (`eslint.config.js`) |
| **Geo API** | PSGC API with circuit breaker & static fallbacks | Philippine regions, provinces, cities, barangays |
| **Email** | Hostinger Mail API + EmailJS hybrid | Booking confirmations, invites, reminders |

---

## 4. 📂 Directory Structure & Core Modules

```text
pickleball_court_reservation/
├── .agents/                          # Customization & agent root
│   ├── AGENTS.md                     # Agent rules mirror
│   └── skills/                       # Registered agent skills
│       ├── dupr-director/            # DUPR Director procedures & rating skill
│       ├── picklepoint-platform/     # Core platform operations skill
│       ├── react-development/        # React 19 & TypeScript skill
│       ├── testing/                  # Testing & mock strategies skill
│       └── ui-ux-tailwind/           # Tailwind CSS v4 design skill
├── public/                           # Static assets & icons
├── src/
│   ├── assets/                       # Image assets and logos
│   ├── components/                   # UI and application views
│   │   ├── admin/                    # Administrative portal modules
│   │   │   ├── modals/               # Admin dialogs (manual booking, QR codes, JSON import)
│   │   │   ├── tabs/                 # Modular tab views (Courts, Bookings, OpenPlay, Scoreboard, etc.)
│   │   │   ├── AdminHeader.tsx       # Admin navigation header
│   │   │   ├── AdminSidebar.tsx      # Admin sidebar with badge counters
│   │   │   └── adminTypes.ts         # Central administrative TypeScript definitions
│   │   ├── player/                   # Player self-service portal
│   │   │   ├── tabs/                 # Player tabs (Overview, Bookings, OpenPlay, Vouchers, Settings)
│   │   │   ├── PlayerHeader.tsx      # Player portal header
│   │   │   └── PlayerSidebar.tsx     # Player portal sidebar
│   │   ├── AdminDashboard.tsx        # Main admin hub & multi-tab orchestrator
│   │   ├── BookingStatus.tsx         # Reference lookup & receipt upload modal
│   │   ├── Bootcamp.tsx              # Training bootcamp programs showcase
│   │   ├── Checkout.tsx              # 3-step GCash booking checkout & receipt upload
│   │   ├── ClientAdminOnboarding.tsx # Venue owner onboarding wizard (PSGC, GCash, hours)
│   │   ├── CourtDetails.tsx          # Hourly slot picker, day/night rate, rental options
│   │   ├── Features.tsx              # Landing page marketing features
│   │   ├── Footer.tsx                # Site footer & links
│   │   ├── Header.tsx                # Top navigation header & user menu
│   │   ├── Hero.tsx                  # Landing hero with search and date selection
│   │   ├── InteractiveMapPicker.tsx  # Leaflet map picker for court coordinates
│   │   ├── Location.tsx              # Location cards & venue directory
│   │   ├── Login.tsx                 # Authentication modal (Google, Facebook, Email)
│   │   ├── OpenPlayDetails.tsx       # Open Play session detail & registration
│   │   ├── OpenPlayPage.tsx          # Open Play schedule catalog & filters
│   │   ├── PrivacyPolicy.tsx         # Privacy policy legal page
│   │   ├── Profile.tsx               # Player profile & booking history
│   │   ├── Rates.tsx                 # Pricing summary cards
│   │   ├── Register.tsx              # Account creation with invitation token handler
│   │   ├── UploadReceiptPage.tsx     # Direct payment receipt submission
│   │   └── VenueSubscription.tsx     # Venue owner SaaS plans and lead capture
│   ├── services/
│   │   ├── emailService.ts           # Hostinger Mail API & EmailJS delivery
│   │   └── psgcService.ts            # PSGC API client with circuit breaker & fallbacks
│   ├── utils/
│   │   ├── mapUtils.ts               # Google Maps & Leaflet coordinate helpers
│   │   ├── openPlayUtils.ts          # Session expiration, duration, and date formatters
│   │   ├── reminderScheduler.ts      # Automated game reminder notifications
│   │   └── timeSlotUtils.ts          # Operating hours, 12h/24h conversion, slot generator
│   ├── App.css / index.css           # Global Tailwind CSS directives & custom styles
│   ├── App.tsx                       # Top-level view router, auth listener, URL shortener
│   ├── firebase.ts                   # Firebase App, Auth, Firestore, Analytics init
│   └── main.tsx                      # React root entrypoint
├── .env                              # Local development environment (staging project)
├── .env.staging                      # Staging build config (picklepoint-md)
├── .env.production                   # Production build config (bookpicklecourt-prod)
├── firestore.rules                   # Security rules for Cloud Firestore
├── package.json                      # NPM dependencies and scripts
└── vite.config.ts                    # Vite and Tailwind configuration
```

---

## 5. 🗺 Routing & State Architecture

PicklePoint currently uses **URL query parameters and `window.history.pushState`** rather than a third-party router.

### `currentView` State Machine
The top-level `currentView` state in [src/App.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/App.tsx) governs which major page is rendered:

- `'landing'`: Default home view (`Hero`, `Rates`, `Location`, `Features`, `Footer`).
- `'details'`: Court reservation page (`CourtDetails.tsx`) selected by `courtId`.
- `'checkout'`: 3-step GCash booking flow (`Checkout.tsx`).
- `'lookup'`: Booking lookup by reference code (`BookingStatus.tsx`).
- `'openplay'`: Open Play session catalog or detail (`OpenPlayPage.tsx`, `OpenPlayDetails.tsx`).
- `'bootcamp'`: Pickleball coaching & training camps (`Bootcamp.tsx`).
- `'profile'`: Player portal (`Profile.tsx`).
- `'admin'`: Administrative management dashboard (`AdminDashboard.tsx`).
- `'client_onboarding'`: New venue owner onboarding wizard (`ClientAdminOnboarding.tsx`).
- `'privacy'`: Legal terms and privacy policy (`PrivacyPolicy.tsx`).
- `'venue_pricing'`: Venue software subscription plans (`VenueSubscription.tsx`).
- `'upload_receipt'`: Standalone receipt upload page (`UploadReceiptPage.tsx`).

### URL Shortener (`/s/:slug`)
When the URL matches `/s/:slug` or `?s=:slug`:
1. [src/App.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/App.tsx) intercepts the route.
2. Queries Firestore `short_links` where `shortSlug == slug`.
3. Falls back to `localStorage.getItem('picklepoint_short_links')` if offline or unconfigured.
4. Increments `clickCount` and redirects with `window.location.replace(matchedLink.originalUrl)`.

### Session Storage & Persistence Keys
- `picklepoint_session`: Logged-in user cached profile.
- `picklepoint_active_court_id`: Currently selected court ID.
- `picklepoint_checkout_details`: In-flight checkout state passed from Court Details to Checkout.
- `psgc_rate_limit_cooldown`: Cooldown timestamp when PSGC API returns 429 Too Many Requests.

---

## 6. 🗄 Firestore Data Schemas

### 1. `users/{userId}`
- `uid`: Firebase Auth user ID.
- `name`, `email`, `phone`: Contact details.
- `role`: `'super_admin' | 'client_admin' | 'manager' | 'editor' | 'player'`.
- `duprId`, `duprRating`: Optional official pickleball rating.
- `companyId`, `companyName`: Attached venue facility ID (for client admins and managers).
- `permissions`: Custom granular overrides (`canManageBookings`, `canManageCourts`, `canManageOpenPlay`, `canManageVouchers`, `canViewFinancials`, `canManageTeam`).
- `subscriptionPlan`: `'trial' | 'monthly' | 'yearly' | 'lifetime' | 'custom'`.

### 2. `companies/{companyId}`
- `name`, `description`, `phone`, `clientAdminEmail`: Venue contact info.
- Address fields: `addressLine1`, `addressLine2`, `barangay`, `municipality`, `province`, `region`, `postalCode`.
- `bookingLeadTimeMinutes`: Minimum notice required for bookings (e.g., 60 mins).
- `operatingHours`: Map of weekdays to `{ isOpen, isDayOff, openTime, closeTime }`.
- `subscriptionPlan`, `subscriptionStatus`, `subscriptionExpiresAt`, `trialExpiresAt`.

### 3. `courts/{courtId}`
- `name`, `type`: Court name and surface type (e.g., Indoor Acrylic, Outdoor Cushion).
- `dayPrice`, `nightPrice`: Hourly rates (night rate applies from 18:00 / 6:00 PM).
- `companyId`, `ownerId`, `ownerEmail`: Multi-tenant ownership links.
- `location`, `latitude`, `longitude`, `mapUrl`: Geolocation and map link.
- `images`: Array of court photo URLs.
- `rentals`: Array of `{ id, name, price, pricingType, quantity, enabled }`.
- `published`: Boolean visibility toggle.

### 4. `bookings/{bookingId}`
- `bookingReference`: Formatted unique reservation code (e.g., `PKL-123456`).
- `courtId`, `courtName`, `date`, `slots`: Reserved date and time slots array.
- `totalCost`, `discountAmount`: Financial totals.
- `status`: `'pending' | 'approved' | 'cancelled'`.
- `user`: `{ name, email, phone, uid }`.
- `paymentMethod`: `'gcash'`.
- `gcashReferenceNumber`: 13-digit transaction reference.
- `receiptImageUrl`: Base64 string or Cloud Storage URL of the payment screenshot.
- `voucherCode`: Applied voucher code.
- `rentals`: Array of rented items and quantities.

### 5. `openplay_events/{eventId}`
- `title`, `description`, `eventDate`, `startTime`, `endTime`, `location`.
- `category`: Skill bracket (e.g., `Beginner (1.0-2.5)`, `Intermediate (3.0-3.5)`, `Open to All`).
- `maxParticipants`, `registrationFee`: Player capacity and price per head.
- `companyId`, `courtIds`, `courtNames`: Courts reserved for the event.
- `rotationRule`: `'winners_stay' | 'round_robin' | 'random_doubles'`.
- `status`: `'draft' | 'active' | 'completed' | 'cancelled' | 'expired'`.
- `isDupr`: Boolean indicating if match results feed into DUPR.

### 6. `openplay_matches/{matchId}`
- `eventId`, `round`: Session ID and round number.
- `courtName`: Court hosting this match.
- `teamRed`, `teamBlue`: `{ score: number, players: OpenPlayMatchPlayer[] }`.
- `status`: `'scheduled' | 'in_progress' | 'completed'`.
- `winner`: `'red' | 'blue' | 'tie'`.

### 7. `vouchers/{voucherId}`
- `code`: Redeemable code (e.g., `RAIN-89412`, `PROMO10`).
- `type`: `'cancellation_credit' | 'rainout_voucher' | 'promo'`.
- `discountType`: `'percentage' | 'fixed_amount'`.
- `discountValue`: Numerical value.
- `companyId`: Scoped facility (or global).
- `maxUses`, `usedCount`, `expiryDate`, `status`.

---

## 7. 👥 Role-Based Access Control (RBAC)

The function `getUserEffectivePermissions()` in [src/components/admin/adminTypes.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/adminTypes.ts) provides standard permission checks:

1. **`super_admin` (`admin@picklepoint.com`)**: Full access across all companies, system settings, subscriptions, and financial logs.
2. **`client_admin`**: Full access within their own `companyId`. Manages venues, courts, bookings, vouchers, team members, and open play sessions.
3. **`manager`**: Operational staff. Can manage bookings, courts, open play, and vouchers, but cannot alter subscription or company ownership.
4. **`editor`**: Day-to-day staff. Can manage bookings and open play, but cannot modify court pricing, delete courts, or view financials.
5. **`player`**: Public user. Can view published courts, book slots, register for open play, and manage personal bookings.

---

## 8. 💡 Key Domain Workflows & Rules

### 1. Hourly Time Slot System ([src/utils/timeSlotUtils.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/utils/timeSlotUtils.ts))
- Standard slots run on 1-hour increments (e.g., `'05:00 AM - 06:00 AM'`).
- `parseTimeStringToHour`: Robustly handles 12-hour AM/PM formats, including midnight (`12:00 AM` -> 24) and noon (`12:00 PM` -> 12).
- Day vs Night Pricing: Hours 18 (6:00 PM) to 24 use `nightPrice`; hours before 18 use `dayPrice`.
- Availability checks query Firestore `bookings` where `courtId == courtId`, `date == selectedDate`, and `status != 'cancelled'`.

### 2. GCash Checkout & Formatting ([src/components/Checkout.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/Checkout.tsx))
- Reference numbers are strictly 13 digits.
- The input formatter converts characters to `XXXX XXX XXXXXX` (e.g., `9043 231 523444`).
- Users must upload a receipt screenshot before submitting.
- Receipts can be removed/replaced via the thumbnail delete button.

### 3. Open Play & DUPR Match Matrix ([src/components/admin/tabs/AdminOpenPlayMatchManagement.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/tabs/AdminOpenPlayMatchManagement.tsx))
- Roster pool tracks attendees (`active`, `resting`, `absent`).
- Absent players are excluded from round match assignments and capacity calculations.
- **DUPR vs Non-DUPR Registration & Checkout Rules**:
  - The explicit boolean `isDupr` on the Open Play event is the authoritative source of truth. Heuristic regex must never override an explicit `false`.
  - **Non-DUPR Events (`isDupr === false`)**:
    - DUPR ID is 100% optional for players during registration and checkout.
    - Checkout validation (`validateStep1`) must NEVER require DUPR ID or block checkout when DUPR ID is omitted.
    - Guest reservations (+1 / +2 spots) are permitted.
  - **DUPR Rated Events (`isDupr === true`)**:
    - DUPR ID is strictly required to checkout and complete registration.
    - Guest reservations are disabled (each participant must register individually with their own account and DUPR ID).
- **Match Result CSV Export Rules**:
  - Per-game CSV button enabled **ONLY** when match status is `'completed'`.
  - Delete button disabled when match status is `'completed'`.
  - Filename format: `game2_<team_red>_vs_<team_blue>_<date>.csv` (e.g., `game2_Bryan_Alizza_Mae_Joven_vs_John_Michael_Matubis_Tristan_jude_Osea_2026-10-09.csv`).
  - Matches formatted according to DUPR import standards.

### 4. Live Digital Scoreboard ([src/components/admin/tabs/AdminScoreboardTab.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/tabs/AdminScoreboardTab.tsx))
- Doubles scoring follows standard pickleball sequence: Server 1 vs Server 2.
- The first serve of the game starts on Server 2 (e.g., `0-0-2`).
- Web Speech API synthesizes audio referee announcements for scores and side-outs.
- Full undo stack allows correcting mistakenly tapped points.

### 5. PSGC Cascading Addresses ([src/services/psgcService.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/services/psgcService.ts))
- Uses PSGC API for Region -> Province -> City/Municipality -> Barangay hierarchy.
- Equipped with in-memory caching and persistent `localStorage` rate-limit cooldown to gracefully handle HTTP 429 errors.
- Includes hardcoded static fallbacks (`REGIONS_FALLBACK` and popular provinces/cities) so the UI never breaks when offline or throttled.

---

## 9. 🧪 Verification & Development Commands

Always verify changes locally before completing work:

```bash
# 1. Start local dev server
npm run dev

# 2. Compile TypeScript & build production bundle (MUST PASS with 0 errors)
npm run build

# 3. Build Staging bundle
npm run build:staging

# 4. Run ESLint checks
npm run lint

# 5. Local preview of production build
npm run preview
```

### Build Verification Standard
Whenever editing TypeScript or component files:
1. Always execute `npm run build`.
2. Ensure `tsc -b` exits with code 0.
3. Verify Vite successfully packages the bundle.

---

## 10. 📝 Code Conventions for Agents

1. **TypeScript Strictness**:
   - Prefer strongly-typed interfaces over `any`.
   - Use types from [src/components/admin/adminTypes.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/adminTypes.ts) for all shared entities.
2. **Defensive Firestore Calls**:
   - Always verify `isFirebaseConfigured` and null-check `db` before Firestore calls.
   - Provide graceful local storage fallbacks where applicable (e.g., short links, session storage).
3. **Preserve Existing Comments**:
   - Retain existing architectural explanations and documentation in modified files.
4. **Tailwind CSS v4 Styling**:
   - Maintain dark-mode aesthetic consistent with existing UI (`bg-slate-900`, `text-emerald-400`, `border-slate-800`, `rounded-2xl`).
