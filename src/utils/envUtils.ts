/**
 * Environment detection utility for PicklePoint.
 * Ensures sandbox/test utilities are strictly restricted to development (localhost)
 * and staging (picklepoint-md), and completely blocked from production (bookpicklecourt.com).
 */

export function isNonProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Localhost / Vite Development Mode
  const isLocal =
    Boolean(import.meta.env.DEV) ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local');

  // 2. Staging project / domain
  const isStaging =
    import.meta.env.VITE_FIREBASE_PROJECT_ID === 'picklepoint-md' ||
    window.location.hostname.includes('picklepoint-md') ||
    window.location.hostname.includes('web.app') ||
    window.location.hostname.includes('firebaseapp.com');

  // 3. Strict Production Exclusion Guard
  const isProd =
    import.meta.env.VITE_FIREBASE_PROJECT_ID === 'bookpicklecourt-prod' ||
    window.location.hostname === 'bookpicklecourt.com' ||
    window.location.hostname === 'www.bookpicklecourt.com';

  return (isLocal || isStaging) && !isProd;
}

