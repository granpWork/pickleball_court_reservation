---
name: testing
description: >-
  Provides testing methodologies, test strategies, mock patterns, and verification runbooks for PicklePoint.
  Use when writing unit tests, testing React components, verifying Firebase Firestore queries,
  mocking APIs and browser storage, or validating business workflows like bookings and match matrices.
---

# Testing & Quality Assurance Skill

This skill defines the testing strategies, unit testing patterns, mocking techniques, and verification workflows for the PicklePoint platform.

---

## 1. 🎯 Testing Strategy & Layers

PicklePoint utilizes a layered testing approach to ensure high reliability across critical business flows:

| Layer | Target Areas | Focus |
| :--- | :--- | :--- |
| **Type & Static Analysis** | Entire codebase | Strict TypeScript compilation (`npm run build`) & ESLint (`npm run lint`) |
| **Unit Testing** | Utilities & Helpers | Slot math, 12h/24h time conversion, GCash formatters, DUPR CSV generators |
| **Component Testing** | UI Components | Modal open/close, stepper wizards, receipt upload/delete, form validation |
| **Integration Testing** | Booking & Match Flows | Firestore operations, multi-court reservation conflict prevention, RBAC permissions |

---

## 2. 🧪 Unit Testing Utilities & Pure Functions

Pure functions in `src/utils/` should have comprehensive test coverage for edge cases:

### 1. Testing Time Slot & Pricing Logic (`timeSlotUtils.ts`)
Key edge cases to verify:
- Midnight string formats (`"12:00 AM"`, `"12:00 MN"`, `"MIDNIGHT"` -> `24`)
- Noon string formats (`"12:00 PM"`, `"12:00 MD"`, `"12:00 NN"` -> `12`)
- Day rate threshold: Hour 17 uses `dayPrice`; Hour 18 uses `nightPrice`.
- Operating hours slot filtering: Ensure slots outside venue open/close times are omitted.

```ts
// Example Vitest / Jest test pattern for timeSlotUtils
import { parseTimeStringToHour, getSlotPrice } from '../src/utils/timeSlotUtils';

describe('timeSlotUtils', () => {
  it('correctly maps 12:00 AM to midnight (24)', () => {
    expect(parseTimeStringToHour('12:00 AM')).toBe(24);
  });

  it('correctly maps 12:00 PM to noon (12)', () => {
    expect(parseTimeStringToHour('12:00 PM')).toBe(12);
  });

  it('applies night pricing starting at 6:00 PM (hour 18)', () => {
    expect(getSlotPrice(17, 100, 150)).toBe(100);
    expect(getSlotPrice(18, 100, 150)).toBe(150);
  });
});
```

### 2. Testing GCash Reference Formatter & Validator (`Checkout.tsx`)
- Exactly 13 numeric digits required.
- Format spaced pattern: `XXXX XXX XXXXXX` (e.g., `9043 231 523444`).
- Stripping non-numeric inputs and rejecting shorter/longer lengths.

---

## 3. 🛡 Mocking Firebase, LocalStorage & External APIs

### 1. Mocking Firebase Auth & Firestore
When running tests without live credentials, isolate database calls using mock factories:

```ts
export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ id: 'court-1', name: 'Court 1', dayPrice: 150, nightPrice: 200 }),
  }),
  getDocs: vi.fn().mockResolvedValue({
    empty: false,
    docs: [],
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
};
```

### 2. Mocking `localStorage` & `sessionStorage`
```ts
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });
```

### 3. Mocking Web Speech API (Scoreboard Announcer)
In test environments, `window.speechSynthesis` is not defined by default:
```ts
if (typeof window !== 'undefined' && !window.speechSynthesis) {
  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
    onvoiceschanged: null,
  } as any;
}
```

---

## 4. 📋 Critical Regression & Manual Verification Checklist

Whenever testing an updated feature, run through the domain verification matrix:

1. **Court Booking Flow**:
   - [ ] Slot picker renders correct hours based on venue operating hours.
   - [ ] Night price activates for slots starting at or after 6:00 PM.
   - [ ] Already booked slots cannot be selected.
   - [ ] Rental equipment quantities increment and calculate in total cost.
2. **GCash Checkout Flow**:
   - [ ] Reference number requires exactly 13 digits and formats with spaces.
   - [ ] Uploaded screenshot displays file name and preview thumbnail.
   - [ ] Screenshot can be cleared with the delete `X` button.
   - [ ] Submission triggers booking creation and confirmation modal.
3. **Open Play & Match Matrix**:
   - [ ] Absent players are excluded from round match generation.
   - [ ] Match scores update team points correctly.
   - [ ] Completed matches enable the per-game DUPR CSV export button (`game2_<red>_vs_<blue>_<date>.csv`).
   - [ ] Completed match cards disable the Delete button.
4. **Live Scoreboard**:
   - [ ] First serve starts on Server 2 (`0-0-2`).
   - [ ] Undo reverts point, server number, and swapped court sides.
   - [ ] Audio announcement synthesizes without errors.

---

## 5. ⚡ Automated Build & Type Verification

Always execute before concluding any task:
```bash
npm run build
```
Confirms all components, hooks, interfaces, and JSX compile without errors.

