---
name: picklepoint-platform
description: >-
  Provides operational runbooks, domain procedures, and implementation workflows for developing,
  debugging, and maintaining the PicklePoint Pickleball Court Reservation, Open Play, and Facility Management system.
  Use when modifying court booking or slot logic, updating GCash payment workflows, managing Open Play
  brackets and DUPR CSV exports, adjusting Firestore schemas or security rules, or executing verification builds.
---

# PicklePoint Platform Operational Skill & Runbook

This skill equips agents with standard operating procedures (SOPs), domain cheat sheets, and step-by-step workflows for developing and maintaining the PicklePoint codebase.

---

## 📋 Table of Contents
1. [Core Safety Guardrails](#1-core-safety-guardrails)
2. [SOP: Court Reservation & Slot Management](#2-sop-court-reservation--slot-management)
3. [SOP: GCash Payment & Checkout Flow](#3-sop-gcash-payment--checkout-flow)
4. [SOP: Open Play Sessions & Match Matrix](#4-sop-open-play-sessions--match-matrix)
5. [SOP: DUPR Match Result CSV Exporter](#5-sop-dupr-match-result-csv-exporter)
6. [SOP: Live Umpire Scoreboard](#6-sop-live-umpire-scoreboard)
7. [SOP: Multi-Tenant Scoping & Venue Onboarding](#7-sop-multi-tenant-scoping--venue-onboarding)
8. [SOP: PSGC Geographic API & Offline Fallback](#8-sop-psgc-geographic-api--offline-fallback)
9. [SOP: Transactional Email Notifications](#9-sop-transactional-email-notifications)
10. [Verification & Build Checklist](#10-verification--build-checklist)

---

## 1. Core Safety Guardrails

Before executing any commands or editing code, verify compliance with project safety rules:

- [x] **No Automatic Git Push**: NEVER execute `git push` without explicit user permission.
- [x] **No Automatic Production Deployment**: NEVER execute `npm run deploy:prod`, `npm run deploy:prod:hosting`, or `firebase deploy` automatically.
- [x] **Account Constraint**: The authorized Firebase deployment account is `ran.peredo@gmail.com`.
- [x] **Mandatory Verification**: Every code change must be verified with `npm run build` prior to completing the task.

---

## 2. SOP: Court Reservation & Slot Management

### File References:
- Time slot generator & hours: [src/utils/timeSlotUtils.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/utils/timeSlotUtils.ts)
- Customer slot picker: [src/components/CourtDetails.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/CourtDetails.tsx)
- Admin calendar view: [src/components/admin/tabs/CourtCalendarView.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/tabs/CourtCalendarView.tsx)

### Slot Generation Rules:
1. Standard hourly slots are formatted as `"HH:00 AM/PM - HH:00 AM/PM"` (e.g., `"05:00 AM - 06:00 AM"`).
2. Use `generateTimeSlots(startHour, endHour)` to create available time slots for a given day.
3. Hour parsing with `parseTimeStringToHour`:
   - Midnight (`"12:00 AM"`, `"12:00 MN"`, `"MIDNIGHT"`) resolves to `24`.
   - Noon (`"12:00 PM"`, `"12:00 MD"`, `"12:00 NN"`, `"NOON"`) resolves to `12`.
4. Day vs. Night Rates:
   - Hours before `18` (6:00 PM) are billed at `court.dayPrice`.
   - Hours `18` and later (6:00 PM to 12:00 AM) are billed at `court.nightPrice`.

### Conflict Checking Procedure:
When evaluating slot availability for a selected date:
1. Query Firestore `bookings` where `courtId == targetCourtId` AND `date == selectedDate`.
2. Exclude bookings where `status == 'cancelled'`.
3. Extract `slots` arrays from all non-cancelled bookings.
4. Mark any overlapping slot as unavailable (`available: false`).

---

## 3. SOP: GCash Payment & Checkout Flow

### File References:
- Checkout component: [src/components/Checkout.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/Checkout.tsx)
- Booking status lookup: [src/components/BookingStatus.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/BookingStatus.tsx)
- Direct receipt uploader: [src/components/UploadReceiptPage.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/UploadReceiptPage.tsx)

### Checkout Steps:
1. **Step 1 (Contact Info)**:
   - Full Name, Email Address, Contact Phone, and optional DUPR ID.
   - Pre-fills from authenticated user profile or session cache.
2. **Step 2 (GCash Payment)**:
   - Renders GCash account details (Account Name & Number with clipboard copy button).
   - Displays payment QR code with interactive lightbox zoom trigger.
   - Allows selecting between multiple venue-configured GCash accounts.
3. **Step 3 (Verification & Submission)**:
   - **Reference Number Validation**:
     - Must be exactly 13 digits.
     - Auto-formatted with spaces: `formatGcashReference` -> `XXXX XXX XXXXXX` (e.g. `9043 231 523444`).
   - **Screenshot Upload**:
     - Dropzone accepts image files (`image/*`).
     - Converts file to base64 for preview and submission.
     - Provides clear delete button (`X`) allowing user to clear upload and select a different file.
   - **Voucher Application**:
     - Checks validity in Firestore `vouchers` collection.
     - Deducts percentage or fixed discount from total cost.

---

## 4. SOP: Open Play Sessions & Match Matrix

### File References:
- Public session list: [src/components/OpenPlayPage.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/OpenPlayPage.tsx)
- Public session details & signup: [src/components/OpenPlayDetails.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/OpenPlayDetails.tsx)
- Admin match management: [src/components/admin/tabs/AdminOpenPlayMatchManagement.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/tabs/AdminOpenPlayMatchManagement.tsx)
- Session normalization: [src/utils/openPlayUtils.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/utils/openPlayUtils.ts)

### Session Lifecycle States:
- `'draft'`: Unpublished, visible only to admins.
- `'active'`: Open for registrations, upcoming or underway.
- `'completed'`: Finished session with finalized match scores.
- `'cancelled'`: Cancelled event.
- `'expired'`: Automatically resolved when `isEventExpired(eventDate, endTime)` evaluates to true.

### Match Matrix Pairing Procedure:
1. **Roster Status Filtering**:
   - Filter roster attendees: only players with status `'active'` are assigned to new rounds.
   - Players marked `'absent'` or `'resting'` are omitted from pairings.
2. **Rotation Rules**:
   - **Winners Stay**: Winners from previous round remain on the court; split partners or take new challengers.
   - **Round Robin**: System cycles partners and opponents to maximize unique matchups.
   - **Random Doubles**: Shuffled pairings balanced by skill rating/DUPR.
3. **Match Status Progression**:
   - `'scheduled'` -> `'in_progress'` -> `'completed'`.
   - Score entry records Team Red vs Team Blue final scores.
   - Determines winner (`'red'` or `'blue'`) based on target points and win-by-two setting.

---

## 5. SOP: DUPR Match Result CSV Exporter

### Implementation Standards:
1. **Per-Game CSV Export Button**:
   - Location: On each match card in the Open Play Match Matrix.
   - Rule: **ONLY enabled when `match.status === 'completed'`**.
   - Disabled while match is `'scheduled'` or `'in_progress'`.
2. **Match Card Deletion Protection**:
   - The Delete button on a match card MUST be disabled when `match.status === 'completed'`.
3. **Filename Specification**:
   - Format: `game<round>_<team_red_player_names>_vs_<team_blue_player_names>_<date>.csv`
   - Example: `game2_Bryan_Alizza_Mae_Joven_vs_John_Michael_Matubis_Tristan_jude_Osea_2026-10-09.csv`
4. **DUPR CSV Header & Columns**:
   ```csv
   Match Date,Court,Game Type,Player 1 Red,Player 2 Red,Player 1 Blue,Player 2 Blue,Score Red,Score Blue,Winner
   ```
   - Matches excluded if incomplete or missing player records.

---

## 6. SOP: Live Umpire Scoreboard

### File Reference:
- [src/components/admin/tabs/AdminScoreboardTab.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/tabs/AdminScoreboardTab.tsx)

### Official Scoring Logic:
1. **Doubles Sequence**:
   - Game begins with serve on right-hand court.
   - First service of the entire game starts on **Server 2** (Score call: `0-0-2`).
   - Subsequent side-outs grant two serves: Server 1 then Server 2.
2. **Point Scoring**:
   - Only the serving team scores points.
   - When serving team scores: increment score, swap court sides for the serving pair.
3. **Fault / Side-Out**:
   - Server 1 faults -> transitions to Server 2.
   - Server 2 faults -> Side-out to opposing team (begins at Server 1).
4. **Web Speech Synthesis**:
   - Score call format: `"{servingScore}, {receivingScore}, {serverNumber}"` (e.g., "4, 2, 1").
   - Voice selection filters for natural English voices (`en-US` / `en-GB`).
5. **Undo Action**:
   - Pushes previous state snapshots to `history` array.
   - Pop operation restores scores, server number, swapped sides state, and serve status.

---

## 7. SOP: Multi-Tenant Scoping & Venue Onboarding

### File References:
- Onboarding wizard: [src/components/ClientAdminOnboarding.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/ClientAdminOnboarding.tsx)
- Tenant data models: [src/components/admin/adminTypes.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/admin/adminTypes.ts)

### Multi-Tenancy Rules:
1. Every court listing, open play event, and manual booking belongs to a `companyId`.
2. **Super Admin**:
   - Has unrestricted read/write access across all `companyId` records.
   - Can switch tenant view filters or view aggregate cross-tenant analytics.
3. **Client Admin**:
   - Scoped strictly to `user.companyId`.
   - Cannot view or edit bookings, courts, or revenue belonging to other companies.
4. **Onboarding Requirements**:
   - Company Name & Contact Details.
   - PSGC Cascading Address (Region, Province, City, Barangay).
   - Operating Hours Map (Mon-Sun).
   - Venue GCash Payment Credentials (Name, Number, QR code image).

---

## 8. SOP: PSGC Geographic API & Offline Fallback

### File Reference:
- [src/services/psgcService.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/services/psgcService.ts)

### Reliability Architecture:
1. **Circuit Breaker for HTTP 429**:
   - If the public PSGC API returns a 429 rate-limit error, activates a 5-minute cooldown timer stored in `localStorage.getItem('psgc_rate_limit_cooldown')`.
2. **In-Memory Cache**:
   - Caches responses in `inMemoryCache = new Map<string, any>()` to prevent duplicate network requests across tabs.
3. **Static Fallbacks**:
   - `REGIONS_FALLBACK`: Contains all 17 Philippine administrative regions with valid PSGC codes.
   - `STATIC_FALLBACKS`: Contains pre-cached cities for NCR, Bicol, and major urban centers.
   - Never let a network failure crash the onboarding or court location selector.

---

## 9. SOP: Transactional Email Notifications

### File Reference:
- [src/services/emailService.ts](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/services/emailService.ts)

### Email Channels:
1. **Hostinger Mail API** (Primary):
   - Direct HTTP POST to Hostinger mail relay.
   - Utilizes custom domain sender `support@bookpicklecourt.com`.
2. **EmailJS** (Automatic Fallback):
   - Invoked if Hostinger API token is missing or request fails.
3. **Triggered Email Events**:
   - `sendBookingConfirmationEmail`: Sent to player upon booking submission.
   - `sendNewCheckoutAdminNotificationEmail`: Sent to venue host notifying of new reservation.
   - `sendOpenPlayInvitationEmail`: Sent to attendees with schedule, venue address, and QR codes.
   - `sendRegistrationConfirmationEmail`: Sent when a client admin or player signs up.

---

## 10. Verification & Build Checklist

Before finalizing any task or reporting to the user, complete this verification runbook:

```bash
# Step 1: Run TypeScript check and production Vite build
npm run build
```
- **Success Criteria**:
  - `tsc -b` exits with code 0 (no TypeScript errors).
  - Vite generates production chunks in `dist/`.
  - Zero fatal compilation blockers.

```bash
# Step 2: (Optional) Run staging build to verify environment compatibility
npm run build:staging
```

```bash
# Step 3: Verify local git tree cleanliness
git status
```
- Ensure no accidental edits or stray files in `node_modules` or `.firebase`.
- NEVER run `git push` or production deployment without explicit user instruction.

