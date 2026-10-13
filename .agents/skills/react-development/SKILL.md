---
name: react-development
description: >-
  Provides best practices, patterns, and runbooks for developing modern React 19 and TypeScript applications.
  Use when building or refactoring React components, managing application state, implementing custom hooks,
  resolving hook lifecycle and re-render issues, and optimizing Vite build performance.
---

# React 19 & TypeScript Development Skill

This skill provides engineering standards, architectural patterns, and runbooks for developing with **React 19**, **TypeScript 6**, and **Vite 8** in the PicklePoint codebase.

---

## 1. ⚛️ React 19 Core Principles & Guidelines

### 1. Functional Components with Strict Typing
- Always declare props with explicit TypeScript interfaces.
- Avoid `any` for event handlers and callbacks; use React standard types (e.g., `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent`, `React.MouseEvent`).

```tsx
interface CourtCardProps {
  court: Court;
  selectedDate: string;
  onSelect: (courtId: string) => void;
  className?: string;
}

export function CourtCard({ court, selectedDate, onSelect, className = '' }: CourtCardProps) {
  // component implementation
}
```

### 2. Strict Hook Ordering & Rules of Hooks
> [!IMPORTANT]
> **NEVER call hooks conditionally or inside loops/nested functions.**
> Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) must always execute in the exact same order on every render. Early returns (`if (loading) return <Spinner />;`) must appear **AFTER** all top-level hook declarations.

```tsx
// ❌ INCORRECT (Conditional Hook Call)
if (!user) return <LoginPrompt />;
const [slots, setSlots] = useState([]); // ERROR: Hook called after early return

// ✅ CORRECT
const [slots, setSlots] = useState([]);
const [loading, setLoading] = useState(true);

if (!user) return <LoginPrompt />;
```

### 3. State Management & Immutability
- Treat all state as immutable. Always use updater functions when the new state depends on previous state:
  ```tsx
  setAttendees((prev) => [...prev, newAttendee]);
  setRoster((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'active' } : item)));
  ```
- Avoid redundant state that can be derived during render using `useMemo` or plain calculations:
  ```tsx
  // ✅ Derived state - no extra useState needed
  const totalCost = useMemo(() => {
    const slotCost = selectedSlots.length * hourlyRate;
    const rentalsCost = selectedRentals.reduce((sum, r) => sum + r.price * r.quantity, 0);
    return Math.max(0, slotCost + rentalsCost - discountAmount);
  }, [selectedSlots, hourlyRate, selectedRentals, discountAmount]);
  ```

---

## 2. 🧩 Component Architecture & Monolith Decomposition

In this codebase, several historical components (such as [src/components/AdminDashboard.tsx](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/components/AdminDashboard.tsx)) grew into monoliths. Follow these decomposition guidelines when refactoring or creating features:

1. **Feature-Sliced Tabs**:
   - Keep orchestrator components focused on top-level state, auth, and sub-view navigation.
   - Separate complex views into dedicated tab files within `src/components/admin/tabs/` or `src/components/player/tabs/`.
2. **Reusable Presentational Components**:
   - Extract badges, stat cards, metric pill indicators, and buttons into shared presentation modules.
3. **Modals & Dialogs**:
   - Place modals in `src/components/admin/modals/`.
   - Control modal visibility with boolean states passed down with `onClose` callbacks.
   - Use `createPortal` to mount modal elements to `document.body` to avoid parent stacking context and z-index overflow issues.

---

## 3. 🔄 Client Routing & URL State Synchronization

PicklePoint uses a lightweight URL-driven state machine (`currentView` in `App.tsx`):

1. **Reading Route State**:
   ```tsx
   const params = new URLSearchParams(window.location.search);
   const courtId = params.get('courtId');
   ```
2. **Pushing Navigation Updates Without Full Reload**:
   ```tsx
   const navigateToCourt = (id: string) => {
     const url = new URL(window.location.href);
     url.pathname = '/court';
     url.searchParams.set('courtId', id);
     window.history.pushState({}, '', url.toString());
     setView('details');
   };
   ```
3. **Session Persistence**:
   - Keep user auth session cached in `localStorage.getItem('picklepoint_session')`.
   - Keep transient booking checkout state in `sessionStorage.getItem('picklepoint_checkout_details')`.

---

## 4. ⚡ Performance Optimization Patterns

1. **Memoization**:
   - Use `useMemo` for heavy calculations (e.g., matching algorithms, leaderboard sorting, time slot matrix).
   - Use `useCallback` when passing event handlers to deeply nested or memoized children.
2. **Dynamic Code Splitting**:
   - Heavy dependencies (Leaflet, administrative views) can be lazy-loaded with `React.lazy` and `Suspense`:
     ```tsx
     const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
     ```
3. **Optimized Re-renders**:
   - Break large form inputs into isolated subcomponents so typing in one field doesn't re-render an entire multi-court calendar.

---

## 5. 🛠 Code Health & Compilation Verification

After any React or TypeScript modification:
```bash
# Verify TypeScript strict types and Vite production bundle
npm run build
```
Ensure `tsc -b` exits with code 0 before completing tasks.

