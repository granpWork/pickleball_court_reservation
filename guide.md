# Environment & Deployment Management Guide

Welcome to the **PicklePoint Court Reservation System** Environment Guide. This document provides complete instructions for managing, building, and deploying the application across **Local Development**, **Staging**, and **Production** environments.

---

## 🎯 Environment Matrix Overview

| Feature / Setting | 💻 Local Development | 🧪 Staging Environment | 🚀 Production Environment |
| :--- | :--- | :--- | :--- |
| **Firebase Project ID** | `picklepoint-md` | `picklepoint-md` | `bookpicklecourt-prod` |
| **Configuration File** | `.env` | `.env.staging` | `.env.production` |
| **App Base URL** | `http://localhost:5173` | `https://picklepoint-md.web.app` | `https://bookpicklecourt.com` |
| **Firebase Target Alias** | N/A | `staging` | `production` / `default` |
| **Console Link** | [Firebase Console](https://console.firebase.google.com/project/picklepoint-md/overview) | [Firebase Console](https://console.firebase.google.com/project/picklepoint-md/overview) | [Firebase Console](https://console.firebase.google.com/project/bookpicklecourt-prod/overview) |

---

## 📁 Environment Files & Secrets

### 1. Local Development ([.env](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/.env))
Used automatically when running `npm run dev`. Configured with `picklepoint-md` staging credentials and local base URL `http://localhost:5173`.

```env
VITE_FIREBASE_API_KEY=AIzaSyDhbHifSR81guE1IMNt1HAFSxPTKW0ymCY
VITE_FIREBASE_AUTH_DOMAIN=picklepoint-md.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=picklepoint-md
VITE_FIREBASE_STORAGE_BUCKET=picklepoint-md.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=42026250467
VITE_FIREBASE_APP_ID=1:42026250467:web:edf09fb4ce7cb92c0515d6
VITE_PORT=5173
VITE_APP_BASE_URL=http://localhost:5173
```

### 2. Staging Environment ([.env.staging](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/.env.staging))
Used when building for Staging (`npm run build:staging`). Points to `https://picklepoint-md.web.app`.

```env
VITE_FIREBASE_API_KEY=AIzaSyDhbHifSR81guE1IMNt1HAFSxPTKW0ymCY
VITE_FIREBASE_AUTH_DOMAIN=picklepoint-md.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=picklepoint-md
VITE_FIREBASE_STORAGE_BUCKET=picklepoint-md.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=42026250467
VITE_FIREBASE_APP_ID=1:42026250467:web:edf09fb4ce7cb92c0515d6
VITE_APP_BASE_URL=https://picklepoint-md.web.app
```

### 3. Production Environment ([.env.production](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/.env.production))
Used when building for Production (`npm run build:prod` or `npm run build`). Points to live custom domain `https://bookpicklecourt.com`.

```env
VITE_FIREBASE_API_KEY=AIzaSyAa-LNiHsqzsJSNLclDHrRjTgWvl3NwF_8
VITE_FIREBASE_AUTH_DOMAIN=bookpicklecourt-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bookpicklecourt-prod
VITE_FIREBASE_STORAGE_BUCKET=bookpicklecourt-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=283454806455
VITE_FIREBASE_APP_ID=1:283454806455:web:632b26a0b9563c0c337032
VITE_APP_BASE_URL=https://bookpicklecourt.com
```

---

## 🔧 Key Environment Variable Reference

| Variable Name | Description | Example / Typical Value |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Web App API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain | `bookpicklecourt-prod.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID string | `bookpicklecourt-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket name | `bookpicklecourt-prod.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Messaging Sender ID | `283454806455` |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID | `1:283454806455:web:...` |
| `VITE_APP_BASE_URL` | Public site domain URL used in emails & links | `https://bookpicklecourt.com` |
| `VITE_EMAILJS_*` | EmailJS Service, Template, & Public Key IDs | `service_ug6c3lq` |
| `VITE_HOSTINGER_*` | Hostinger Mail API Bearer Token & Sender Email | `support@bookpicklecourt.com` |

---

## ⚡ Command Workflow Reference

### 1. Local Development
Start local development server with hot module reloading:
```bash
npm run dev
```

### 2. Staging Workflow (`picklepoint-md`)
Test changes on staging before releasing to live production users:
```bash
# Build staging bundle
npm run build:staging

# Deploy Hosting and Firestore Rules to Staging
npm run deploy:staging

# Deploy Hosting ONLY to Staging
npm run deploy:staging:hosting
```

### 3. Production Workflow (`bookpicklecourt-prod`)
Deploy tested code to live production users on `bookpicklecourt.com`:
```bash
# Build production bundle
npm run build:prod

# Deploy Hosting and Firestore Rules to Production
npm run deploy:prod

# Deploy Hosting ONLY to Production
npm run deploy:prod:hosting
```

### 4. Firestore Security Rules Deployment
Deploy updated [firestore.rules](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/firestore.rules) across environments:
```bash
npm run deploy:rules
```

---

## 🌐 Custom Domain Setup (`bookpicklecourt.com`)

To complete pointing your custom domain to your live Firebase deployment:

1. **Add Custom Domain in Firebase Console**:
   - Navigate to [Firebase Hosting Console](https://console.firebase.google.com/project/bookpicklecourt-prod/hosting/main).
   - Click **Add custom domain** and enter `bookpicklecourt.com`.
2. **Configure DNS Records at Registrar (Hostinger / Namecheap / GoDaddy)**:
   - Add the two **`A` Records** (IP addresses) supplied by Firebase to your domain's DNS Zone.
3. **Authorize Custom Domain for OAuth & Auth**:
   - Navigate to [Firebase Auth Settings](https://console.firebase.google.com/project/bookpicklecourt-prod/authentication/settings).
   - Under **Authorized Domains**, click **Add Domain** and add `bookpicklecourt.com` and `www.bookpicklecourt.com`.

---

## 🔒 Security Best Practices

- **Never Commit Sensitive Private Keys**: Ensure `.env`, `.env.staging`, and `.env.production` do not expose private master credentials in public repositories.
- **Sync Firestore Rules**: Always deploy security rules using `npm run deploy:rules` whenever adding new Firestore subcollections or role permissions.
- **Test in Staging First**: Perform feature verification on `https://picklepoint-md.web.app` before executing `npm run deploy:prod`.
