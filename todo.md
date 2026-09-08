# PicklePoint - Project TODO & Improvement Roadmap

## 🎯 Completed Sprints & Hygiene
- [x] **Code Hygiene & Linting**: Resolved all 619 blocking ESLint errors. `npm run lint` now passes cleanly with 0 errors. Fixed syntax hoisting bugs in `AdminSupportTicketsTab.tsx` and `AdminDashboard.tsx`, configured ESLint rules in `eslint.config.js`.

---

## 📋 Backlog & Future Tasks

### Phase 1: Security Hardening (Highest Priority)
- [ ] **Firestore Rules Lockdown**:
  - Restrict `users` collection: Allow write only if `request.auth.uid == userId` or `isSuperAdmin()`.
  - Restrict `bookings`: Allow write/update only to booking owner or venue/super admin.
  - Restrict `vouchers`, `openplay_events`, `openplay_registrations`, and `invitations` write access to `isAdmin()`.
- [ ] **Staging Security Rules Verification**: Deploy updated `firestore.rules` to Staging (`picklepoint-md`) and test permissions.

### Phase 3: Monolith Decomposition & Architecture
- [ ] **Decompose `AdminDashboard.tsx`**:
  - Split 619 KB monolithic component into dedicated sub-components within `src/components/admin/tabs/`.
  - Extract reusable UI components (Badges, Stat Cards, Action Modals).
- [ ] **Decompose `CourtDetails.tsx` & `Checkout.tsx`**:
  - Extract sub-views (Slot Selection, Review Modal, Reference Input, Receipt Selector).
- [ ] **Routing Migration**:
  - Replace manual `window.location.search` & `window.history.pushState` parsing in `App.tsx` with standard client routing (`react-router-dom`).
  - Implement dynamic code-splitting using `React.lazy` and `Suspense` for heavy routes.

### Phase 4: Data Fetching & Performance
- [ ] **Custom Firestore Hooks**:
  - Create reusable hooks (`useBookings`, `useCourts`, `useOpenPlayEvents`, `useUserProfile`).
- [ ] **Caching & Performance**:
  - Reduce duplicate Firestore queries with client-side caching or state synchronization.
