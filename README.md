# 🏓 PicklePoint (Book PickleCourt)

PicklePoint is a sports facility management and court reservation platform tailored for the Philippine pickleball ecosystem. It empowers court owners to manage multi-court venues, process GCash payments, host Open Play events with automated rotation algorithms, and run digital umpire scoreboards.

---

## 🛠 Tech Stack

- **Framework**: React 19 (`react@^19.2.6`, `react-dom@^19.2.6`)
- **Build Tool**: Vite 8 (`vite@^8.0.12`, `@vitejs/plugin-react@^6.0.1`)
- **Language**: TypeScript 6 (`typescript@~6.0.2`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite@^4.3.0`)
- **Icons**: Lucide React (`lucide-react@^1.17.0`)
- **Maps**: Leaflet (`leaflet@^1.9.4`)
- **Backend / BaaS**: Firebase 12 (Auth, Firestore, Analytics, Hosting)
- **Email Service**: Hostinger Mail API + EmailJS hybrid

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Local Development
```bash
npm run dev
```

### 3. Production & Verification Builds
```bash
# Verify TypeScript strict check and production packaging
npm run build

# Staging build
npm run build:staging

# Run ESLint linter checks
npm run lint
```

---

## 🔥 Firebase CLI: Login, Logout & Account Switching

PicklePoint utilizes Firebase Hosting, Firestore, and Authentication. When deploying to Staging or Production, ensure your Firebase CLI is authenticated with the authorized project owner account.

### Authorized Accounts & Environments
| Environment | Firebase Project ID | Custom Domain / URL | Authorized Account |
| :--- | :--- | :--- | :--- |
| **Production** | `bookpicklecourt-prod` | [bookpicklecourt.com](https://bookpicklecourt.com) | `ran.peredo@gmail.com` |
| **Staging** | `picklepoint-md` | [picklepoint-md.web.app](https://picklepoint-md.web.app) | `ran.peredo@gmail.com` |

---

### Step-by-Step Firebase Authentication Commands

#### 1. Check Currently Logged-in Account
To see which account is currently active in your CLI:
```bash
npx firebase login:list
```

#### 2. Log Out of Firebase
To log out of the current account:
```bash
# Logs out of the active account
npx firebase logout

# Logs out of a specific email (if multiple accounts are stored)
npx firebase logout ran.peredo@gmail.com
```

#### 3. Log In to Firebase
To log in with a new account (opens a browser authentication window):
```bash
# Fresh interactive login
npx firebase login

# If you want to add another account without removing the existing one:
npx firebase login:add
```
> **Note**: Complete the Google authentication prompt in your web browser and click **Allow**.

#### 4. Switch Between Multiple Accounts
If you have multiple Google accounts logged into the Firebase CLI:
```bash
# Switch active account to ran.peredo@gmail.com
npx firebase login:use ran.peredo@gmail.com
```

#### 5. Verify Accessible Firebase Projects
Verify that your active account has permission to access the PicklePoint projects:
```bash
npx firebase projects:list
```
Look for `bookpicklecourt-prod` and `picklepoint-md` in the output table.

---

## 🚢 Deployment Commands

Once authenticated with `ran.peredo@gmail.com`:

```bash
# Deploy to Staging (builds staging bundle & deploys to picklepoint-md)
npm run deploy:staging

# Deploy to Staging (Hosting only)
npm run deploy:staging:hosting

# Deploy to Production (builds prod bundle & deploys to bookpicklecourt-prod)
npm run deploy:prod

# Deploy to Production (Hosting only)
npm run deploy:prod:hosting

# Deploy Firestore Security Rules only
npm run deploy:rules
```

---

## 📁 Key Modules

- `src/components/AdminDashboard.tsx`: Main administrative hub orchestrating venue management, court pricing, bookings, team roles, and settings.
- `src/components/admin/tabs/AdminOpenPlayMatchManagement.tsx`: Open Play round-robin match matrix, player roster management, and DUPR CSV result exports.
- `src/utils/matchGeneratorUtils.ts`: Rotating Doubles Round Robin matching engine guaranteeing unique partners every game and fair bench rotation.
- `src/components/admin/tabs/openplay/OpenPlayAutoGenModal.tsx`: Smart match generator modal with session duration and game pacing calculator (11–15 min games).
- `src/components/admin/tabs/AdminScoreboardTab.tsx`: Digital umpire referee console with audio announcements (Web Speech API) and undo history.
- `src/components/Checkout.tsx`: 3-step customer reservation checkout with GCash payment screenshot upload.
- `src/services/psgcService.ts`: Philippine Standard Geographic Code (PSGC) cascading region, province, city, and barangay address service.
