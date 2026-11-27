import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import CourtDetails from './components/CourtDetails';
import Checkout from './components/Checkout';
import BookingStatus from './components/BookingStatus';
import UploadReceiptPage from './components/UploadReceiptPage';
import OpenPlayDetails from './components/OpenPlayDetails';
import Bootcamp from './components/Bootcamp';
import Profile from './components/Profile';
import ClientAdminOnboarding from './components/ClientAdminOnboarding';
import PrivacyPolicy from './components/PrivacyPolicy';
import VenueSubscription from './components/VenueSubscription';
import { auth, db, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { sendRegistrationConfirmationEmail } from './services/emailService';
import { AlertCircle, Loader2, Clock, Building2, ArrowRight } from 'lucide-react';

function App() {
  const [currentView, setView] = useState<'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding' | 'privacy' | 'upload_receipt' | 'venue_pricing'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'venue_pricing' || window.location.pathname === '/pricing' || window.location.pathname === '/for-venue-owners') {
      return 'venue_pricing';
    }
    if (params.get('view') === 'privacy' || window.location.pathname === '/privacy' || window.location.pathname === '/privacy-policy') {
      return 'privacy';
    }
    if (params.get('view') === 'register' || params.get('inviteToken') || window.location.pathname === '/register') {
      return 'register';
    }
    if (params.get('view') === 'login' || params.get('invite') === 'true' || window.location.pathname === '/login') {
      return 'login';
    }
    if (params.has('upload_receipt') || params.get('view') === 'upload_receipt') {
      return 'upload_receipt';
    }
    if (params.get('view') === 'lookup' || params.get('ref')) {
      return 'lookup';
    }
    if (params.get('openplay') || params.get('eventId') || params.get('view') === 'openplay' || window.location.pathname === '/open-play') {
      return 'openplay';
    }
    if (params.get('view') === 'bootcamp' || window.location.pathname === '/bootcamp') {
      return 'bootcamp';
    }
    if (params.get('view') === 'profile' || window.location.pathname === '/profile') {
      return 'profile';
    }
    if (params.get('view') === 'details' || params.get('courtId') || params.get('court_id') || params.get('court') || window.location.pathname.startsWith('/court')) {
      return 'details';
    }
    if (params.get('view') === 'checkout' || window.location.pathname === '/checkout') {
      return 'checkout';
    }
    if (window.location.pathname === '/pickle-admin' || params.get('view') === 'admin') {
      return 'admin';
    }

    return 'landing';
  });

  const [isRedirectingShortLink, setIsRedirectingShortLink] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/s/') || Boolean(new URLSearchParams(window.location.search).get('s'));
  });

  const [inactiveShortLinkNotice, setInactiveShortLinkNotice] = useState<{
    isInactive: boolean;
    isExpired: boolean;
    linkTitle?: string;
    companyName?: string;
    companyLogoUrl?: string;
    destinationVenueUrl?: string;
  } | null>(null);

  const [openPlayEventId, setOpenPlayEventId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId') || params.get('openplay') || null;
  });

  const handleSelectOpenPlayEvent = (id: string | null, tab?: string) => {
    setOpenPlayEventId(id);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (id) {
          url.pathname = '/open-play';
          url.searchParams.set('eventId', id);
          if (tab) {
            url.searchParams.set('tab', tab);
          } else {
            url.searchParams.delete('tab');
          }
        } else {
          url.searchParams.delete('eventId');
          url.searchParams.delete('openplay');
          url.searchParams.delete('tab');
        }
        window.history.pushState(null, '', url.toString());
      } catch (e) {}
    }
  };
  const [landingSearchDate, setLandingSearchDate] = useState<string>('');
  const [selectedCourtId, setSelectedCourtIdState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCourtId = params.get('courtId') || params.get('court_id') || params.get('court');
    return urlCourtId || sessionStorage.getItem('picklepoint_active_court_id') || localStorage.getItem('picklepoint_pending_court_id') || '';
  });

  const setSelectedCourtId = (id: string, targetDate?: string) => {
    if (id) {
      sessionStorage.setItem('picklepoint_active_court_id', id);
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('courtId', id);
          url.searchParams.delete('court_id');
          url.searchParams.delete('court');
          window.history.replaceState(null, '', url.toString());
        }
      } catch (e) {}
    } else {
      sessionStorage.removeItem('picklepoint_active_court_id');
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('courtId');
          url.searchParams.delete('court_id');
          url.searchParams.delete('court');
          window.history.replaceState(null, '', url.toString());
        }
      } catch (e) {}
    }
    setSelectedCourtIdState(id);
    if (targetDate !== undefined) {
      setLandingSearchDate(targetDate);
    }
  };

  const isUserUnonboardedClientAdmin = (u?: { role?: string; companyId?: string; needsOnboarding?: boolean } | null) => {
    if (!u) return false;
    return u.role === 'client_admin' && (!u.companyId || u.needsOnboarding === true);
  };

  const handleSetView = (nextView: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding' | 'privacy' | 'upload_receipt' | 'venue_pricing') => {
    if (nextView !== 'openplay' && nextView !== 'login' && nextView !== 'register') {
      handleSelectOpenPlayEvent(null);
    }
    if (isUserUnonboardedClientAdmin(user) && nextView !== 'client_onboarding' && nextView !== 'login' && nextView !== 'register') {
      if (typeof window !== 'undefined' && window.location.pathname === '/pickle-admin') {
        window.history.pushState({}, '', '/');
      }
      setView('client_onboarding');
      return;
    }
    if (nextView === 'landing') {
      setSelectedCourtId('');
      if (typeof window !== 'undefined' && (window.location.search || window.location.pathname !== '/')) {
        window.history.pushState({}, '', '/');
      }
    }
    setView(nextView);
  };

  // Handle Short Link /s/:companySlug/:slug or /s/:slug redirection
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    let companySlug: string | null = null;
    let shortSlug: string | null = null;

    if (path.startsWith('/s/')) {
      const raw = path.substring(3).trim();
      const segments = raw.split('/').filter(Boolean);
      if (segments.length >= 2) {
        companySlug = segments[0].toLowerCase();
        shortSlug = segments.slice(1).join('/').toLowerCase();
      } else if (segments.length === 1) {
        shortSlug = segments[0].toLowerCase();
      }
    } else if (searchParams.get('s')) {
      const raw = searchParams.get('s')!.trim();
      const segments = raw.split('/').filter(Boolean);
      if (segments.length >= 2) {
        companySlug = segments[0].toLowerCase();
        shortSlug = segments.slice(1).join('/').toLowerCase();
      } else {
        shortSlug = raw.toLowerCase();
      }
    }

    if (shortSlug) {
      const handleShortLinkRedirect = async () => {
        let matchedLink: any = null;

        if (isFirebaseConfigured && db) {
          try {
            const q = query(collection(db, 'short_links'), where('shortSlug', '==', shortSlug));
            const snap = await getDocs(q);
            if (!snap.empty) {
              if (companySlug) {
                const found = snap.docs.find((d) => {
                  const data = d.data();
                  return (
                    data.companySlug?.toLowerCase() === companySlug ||
                    (data.companyName && data.companyName.toLowerCase().replace(/[^a-z0-9-]/g, '') === companySlug)
                  );
                });
                const chosenDoc = found || snap.docs[0];
                matchedLink = { id: chosenDoc.id, ...chosenDoc.data() };
              } else {
                const docSnap = snap.docs[0];
                matchedLink = { id: docSnap.id, ...docSnap.data() };
              }
            }
          } catch (fErr) {
            console.warn('Firestore short_links fetch warning:', fErr);
          }
        }

        if (!matchedLink) {
          const localStr = localStorage.getItem('picklepoint_short_links');
          if (localStr) {
            try {
              const localLinks = JSON.parse(localStr);
              if (companySlug) {
                matchedLink =
                  localLinks.find((l: any) => {
                    const matchSlug = l.shortSlug?.toLowerCase() === shortSlug?.toLowerCase();
                    const matchComp =
                      l.companySlug?.toLowerCase() === companySlug ||
                      (l.companyName && l.companyName.toLowerCase().replace(/[^a-z0-9-]/g, '') === companySlug);
                    return matchSlug && matchComp;
                  }) || localLinks.find((l: any) => l.shortSlug?.toLowerCase() === shortSlug?.toLowerCase());
              } else {
                matchedLink = localLinks.find((l: any) => l.shortSlug?.toLowerCase() === shortSlug?.toLowerCase());
              }
            } catch (e) {}
          }
        }

        if (matchedLink) {
          const isPaused = matchedLink.isActive === false;
          const isExpired = Boolean(matchedLink.expiresAt && new Date(matchedLink.expiresAt) < new Date());

          if (isPaused || isExpired) {
            setIsRedirectingShortLink(false);
            const venueUrl = matchedLink.companyId
              ? `/venue/${matchedLink.companyId}`
              : (matchedLink.originalUrl || '/');
            setInactiveShortLinkNotice({
              isInactive: isPaused,
              isExpired,
              linkTitle: matchedLink.title,
              companyName: matchedLink.companyName,
              companyLogoUrl: matchedLink.companyLogoUrl,
              destinationVenueUrl: venueUrl,
            });
            return;
          }

          if (isFirebaseConfigured && db && matchedLink.id) {
            updateDoc(doc(db, 'short_links', matchedLink.id), {
              clickCount: increment(1),
            }).catch(() => {});
          }

          const localStr = localStorage.getItem('picklepoint_short_links');
          if (localStr) {
            try {
              const localLinks = JSON.parse(localStr);
              const target = localLinks.find((l: any) => l.id === matchedLink.id || l.shortSlug === matchedLink.shortSlug);
              if (target) {
                target.clickCount = (target.clickCount || 0) + 1;
                localStorage.setItem('picklepoint_short_links', JSON.stringify(localLinks));
              }
            } catch (e) {}
          }

          if (matchedLink.originalUrl) {
            window.location.replace(matchedLink.originalUrl);
            return;
          }
        }

        setIsRedirectingShortLink(false);
      };
      handleShortLinkRedirect();
    } else {
      setIsRedirectingShortLink(false);
    }
  }, []);

  const [checkoutDetails, setCheckoutDetails] = useState<{
    courtId: string;
    courtName: string;
    courtType: string;
    courtImage: string;
    courtLocation: string;
    date: string;
    slots: string[];
    rentals: { id: string; name: string; price: number; pricingType: string; quantity: number }[];
    totalCost: number;
    companyId?: string;
    courtOwnerId?: string;
    gcashAccountId?: string;
    companyName?: string;
    companyAddress?: string;
    ownerCompanyName?: string;
    ownerCompanyAddress?: string;
    hostEmail?: string;
    hostPhone?: string;
  } | null>(() => {
    const saved = sessionStorage.getItem('picklepoint_checkout_details');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn('Failed to parse checkout details from sessionStorage:', err);
      }
    }
    return null;
  });
  const [user, setUser] = useState<{
    uid?: string;
    name: string;
    email: string;
    role?: string;
    isAdmin?: boolean;
    sessionExpiresAt?: string;
    rememberMe?: boolean;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.sessionExpiresAt) {
          const expiresTime = new Date(parsed.sessionExpiresAt).getTime();
          if (Date.now() > expiresTime) {
            localStorage.removeItem('picklepoint_session');
            localStorage.removeItem('picklepoint_remember_me');
            return null;
          }
        }
        return parsed;
      }
      return null;
    } catch (err) {
      console.warn('Failed to parse user session from localStorage:', err);
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const isInviteLink = !!params.get('inviteToken');
    const isAdminRoute = window.location.pathname === '/pickle-admin';
    const hasCachedSession = typeof localStorage !== 'undefined' && !!localStorage.getItem('picklepoint_session');
    
    // Only block UI with full-screen spinner if accessing admin route or invite link without cached session
    return (isAdminRoute || isInviteLink) && !hasCachedSession;
  });
  const [invitationNotice, setInvitationNotice] = useState<{ email: string; company?: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const compParam = params.get('company');
    if (emailParam) {
      return { email: emailParam, company: compParam || undefined };
    }
    return null;
  });
  const [deactivatedModalOpen, setDeactivatedModalOpen] = useState(false);

  // Synchronize checkoutDetails with sessionStorage
  useEffect(() => {
    if (checkoutDetails) {
      sessionStorage.setItem('picklepoint_checkout_details', JSON.stringify(checkoutDetails));
    } else {
      sessionStorage.removeItem('picklepoint_checkout_details');
    }
  }, [checkoutDetails]);

  const restoreSessionView = () => {
    // 0. Strict Client Admin onboarding guard
    if (isUserUnonboardedClientAdmin(user)) {
      sessionStorage.removeItem('picklepoint_checkout_details');
      setCheckoutDetails(null);
      if (typeof window !== 'undefined' && window.location.pathname === '/pickle-admin') {
        window.history.pushState({}, '', '/');
      }
      setView('client_onboarding');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'privacy' || window.location.pathname === '/privacy' || window.location.pathname === '/privacy-policy') {
      setView('privacy');
      return;
    }

    if (params.has('upload_receipt') || params.get('view') === 'upload_receipt') {
      setView('upload_receipt');
      return;
    }

    if (params.get('view') === 'lookup' || params.get('ref')) {
      setView('lookup');
      return;
    }

    if (params.get('view') === 'details' || params.get('courtId') || params.get('court_id') || params.get('court')) {
      const targetCourtId = params.get('courtId') || params.get('court_id') || params.get('court');
      if (targetCourtId) {
        setSelectedCourtId(targetCourtId);
      }
      setView('details');
      return;
    }

    // 1. Explicit admin route check
    if (window.location.pathname === '/pickle-admin') {
      sessionStorage.removeItem('picklepoint_checkout_details');
      setCheckoutDetails(null);
      setView('admin');
      return;
    }

    // 2. Restore checkout session ONLY if explicitly on /checkout route
    const savedCheckoutStr = sessionStorage.getItem('picklepoint_checkout_details');
    if (window.location.pathname === '/checkout' && savedCheckoutStr) {
      try {
        const parsed = JSON.parse(savedCheckoutStr);
        setCheckoutDetails(parsed);
        setView('checkout');
        return;
      } catch (_err) {
        sessionStorage.removeItem('picklepoint_checkout_details');
      }
    }

    // PRIORITY CHECK: If URL contains inviteToken, always load the invitation registration view
    if (params.get('inviteToken')) {
      const invitedEmail = params.get('email') || '';
      const invitedCompany = params.get('company') || '';
      if (invitedEmail) {
        setInvitationNotice({ email: invitedEmail, company: invitedCompany });
      }
      setView('register');
      return;
    }

    // 3. If on root path "/" or view=landing, keep view as landing page
    if (window.location.pathname === '/' || params.get('view') === 'landing') {
      if (!params.get('view') || params.get('view') === 'landing') {
        setView('landing');
        return;
      }
    }

    // 4. URL view parameters for unauthenticated visitors vs logged-in users
    const isUserLoggedIn = !!auth?.currentUser || !!localStorage.getItem('picklepoint_session');

    if (!isUserLoggedIn) {
      if (params.get('view') === 'register' || window.location.pathname === '/register') {
        setView('register');
        return;
      }
      if (params.get('view') === 'login' || params.get('invite') === 'true' || window.location.pathname === '/login') {
        setView('login');
        return;
      }
    } else {
      if ((params.get('view') === 'login' || params.get('view') === 'register' || window.location.pathname === '/login' || window.location.pathname === '/register') && !params.get('inviteToken')) {
        window.history.pushState({}, '', '/');
        setView('landing');
        return;
      }
    }

    if (params.has('upload_receipt') || params.get('view') === 'upload_receipt') {
      setView('upload_receipt');
      return;
    }
    if (params.get('view') === 'lookup' || params.get('ref')) {
      setView('lookup');
      return;
    }
    if (params.get('openplay') || params.get('eventId') || params.get('view') === 'openplay' || window.location.pathname === '/open-play') {
      setView('openplay');
      return;
    }
    if (params.get('view') === 'bootcamp' || window.location.pathname === '/bootcamp') {
      setView('bootcamp');
      return;
    }
    if (params.get('view') === 'profile' || window.location.pathname === '/profile') {
      setView('profile');
      return;
    }
    if (params.get('view') === 'privacy' || window.location.pathname === '/privacy' || window.location.pathname === '/privacy-policy') {
      setView('privacy');
      return;
    }

    if (selectedCourtId) {
      setView('details');
      return;
    }

    setView('landing');
  };

  // Check URL parameters for invitation links, tracking links & Open Play shareable links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('upload_receipt') || params.get('view') === 'upload_receipt') {
      setView('upload_receipt');
      return;
    }
    if (params.get('view') === 'lookup' || params.get('ref')) {
      setView('lookup');
      return;
    }

    const openPlayParam = params.get('eventId') || params.get('openplay');
    if (openPlayParam) {
      setOpenPlayEventId(openPlayParam);
      setView('openplay');
      return;
    }

    if (params.get('inviteToken') || params.get('view') === 'register' || window.location.pathname === '/register') {
      const invitedEmail = params.get('email') || '';
      const invitedCompany = params.get('company') || '';
      if (invitedEmail) {
        setInvitationNotice({ email: invitedEmail, company: invitedCompany });
      }
      setView('register');
      return;
    }
    if (params.get('view') === 'login' || params.get('invite') === 'true' || window.location.pathname === '/login') {
      const invitedEmail = params.get('email') || '';
      const invitedCompany = params.get('company') || '';
      if (invitedEmail) {
        setInvitationNotice({ email: invitedEmail, company: invitedCompany });
      }
      setView('login');
    } else if (params.has('upload_receipt') || params.get('view') === 'upload_receipt') {
      setView('upload_receipt');
    } else if (params.get('view') === 'lookup' || params.get('ref')) {
      setView('lookup');
    } else if (params.get('view') === 'openplay' || window.location.pathname === '/open-play') {
      setView('openplay');
    } else if (params.get('view') === 'bootcamp' || window.location.pathname === '/bootcamp') {
      setView('bootcamp');
    } else if (params.get('view') === 'profile' || window.location.pathname === '/profile') {
      setView('profile');
    } else if (params.get('view') === 'privacy' || window.location.pathname === '/privacy' || window.location.pathname === '/privacy-policy') {
      setView('privacy');
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const firestoreDb = db;
    if (isFirebaseConfigured && auth && firestoreDb) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userDocRef = doc(firestoreDb, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userEmailLower = firebaseUser.email?.toLowerCase() || '';

            // Check for pending invitation matching user's email or inviteToken in URL BEFORE setting default role
            let matchedInvite: { role?: string; company?: string; email?: string } | null = null;
            let inviteDocId: string | null = null;

            if (userEmailLower) {
              try {
                const searchParams = new URLSearchParams(window.location.search);
                const inviteTokenParam = searchParams.get('inviteToken');

                if (inviteTokenParam) {
                  const invRef = doc(firestoreDb, 'invitations', inviteTokenParam);
                  const invSnap = await getDoc(invRef);
                  if (invSnap.exists()) {
                    matchedInvite = invSnap.data();
                    inviteDocId = inviteTokenParam;
                  }
                }

                if (!matchedInvite) {
                  const invQuery = query(
                    collection(firestoreDb, 'invitations'),
                    where('email', '==', userEmailLower),
                    where('status', '==', 'pending')
                  );
                  const invSnap = await getDocs(invQuery);
                  if (!invSnap.empty) {
                    matchedInvite = invSnap.docs[0].data();
                    inviteDocId = invSnap.docs[0].id;
                  }
                }
              } catch (e) {
                console.warn('Error checking pending invitations on auth state change:', e);
              }
            }

            let role = matchedInvite?.role || (userEmailLower === 'admin@picklepoint.com' ? 'super_admin' : 'player');
            let status = 'active';

            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              status = uData.status || (uData.isInvitedPending ? 'pending' : 'active');

              if (status === 'deleted') {
                // Smoothly migrate former staff to active player role
                status = 'active';
                role = 'player';
                try {
                  await setDoc(userDocRef, {
                    status: 'active',
                    role: 'player',
                    companyId: '',
                    companyName: '',
                    permissions: {},
                    isInvitedPending: false
                  }, { merge: true });
                } catch (e) {
                  console.warn('Could not reset deleted status to active player:', e);
                }
              } else if (status === 'inactive') {
                role = 'player';
              } else {
                role = matchedInvite?.role || uData.role || (userEmailLower === 'admin@picklepoint.com' ? 'super_admin' : 'player');

                // If matched invite role differs from stored role, update Firestore document
                if (matchedInvite?.role && uData.role !== matchedInvite.role) {
                  try {
                    await setDoc(userDocRef, {
                      role: matchedInvite.role,
                      companyName: matchedInvite.company || '',
                      isInvitedPending: false
                    }, { merge: true });
                  } catch (e) {
                    console.warn('Could not update user role from invitation:', e);
                  }
                }
              }
            } else {
              status = 'active';
              try {
                await setDoc(userDocRef, {
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName || 'Player',
                  email: firebaseUser.email || '',
                  role: role,
                  companyId: (matchedInvite as any)?.companyId || '',
                  companyName: matchedInvite?.company || '',
                  status: 'active',
                  createdAt: new Date().toISOString()
                });
                const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
                const loginUrl = `${origin}/?view=login&registered=true&email=${encodeURIComponent(firebaseUser.email || '')}`;
                sendRegistrationConfirmationEmail({
                  toEmail: firebaseUser.email || '',
                  toName: firebaseUser.displayName || 'Player',
                  role: role,
                  loginUrl,
                }).catch((e) => console.warn('Welcome email error:', e));
              } catch (e) {
                console.warn('Could not auto-create user document on auth state change:', e);
              }
            }

            // Mark invitation as used if it was matched
            if (matchedInvite && inviteDocId) {
              try {
                await updateDoc(doc(firestoreDb, 'invitations', inviteDocId), {
                  status: 'used',
                  usedAt: new Date().toISOString()
                });
              } catch (e) {
                console.warn('Could not mark invitation used:', e);
              }
            }

            if (status === 'inactive' || status === 'deleted') {
              localStorage.removeItem('picklepoint_session');
              setUser(null);
              setAuthLoading(false);
              setView('login');
              setDeactivatedModalOpen(true);
              if (auth) {
                signOut(auth).catch(() => {});
              }
              return;
            }

            if (status === 'pending') {
              try {
                await setDoc(userDocRef, { status: 'active', isInvitedPending: false }, { merge: true });
                status = 'active';
              } catch (e) {
                console.warn('Could not update pending status to active:', e);
              }
            }
            
            const uData = userDocSnap.exists() ? userDocSnap.data() : {};

            // Auto-promote role to client_admin if user's email matches a company's designated clientAdminEmail
            // Guard: Never auto-promote facility managers or staff editors to client_admin
            let companyId: string | undefined;
            let companyName: string | undefined;
            if (userEmailLower && role !== 'super_admin' && role !== 'manager' && role !== 'editor') {
              try {
                const compQuery = query(collection(firestoreDb, 'companies'), where('clientAdminEmail', '==', userEmailLower));
                const compSnap = await getDocs(compQuery);
                if (!compSnap.empty) {
                  const compData = compSnap.docs[0].data();
                  companyId = compSnap.docs[0].id;
                  companyName = compData.name;
                  if (role !== 'client_admin') {
                    role = 'client_admin';
                    await updateDoc(userDocRef, { role: 'client_admin', companyId, companyName, isInvitedPending: false });
                  }
                }

                // If not found by email, check direct company document if companyId exists on user record
                if (!companyId && uData.companyId) {
                  try {
                    const compDirectSnap = await getDoc(doc(firestoreDb, 'companies', uData.companyId));
                    if (compDirectSnap.exists()) {
                      companyId = uData.companyId;
                      companyName = compDirectSnap.data().name;
                    }
                  } catch (e) {
                    console.warn('Direct company lookup error:', e);
                  }
                }

                // Fallback: Check local companies in localStorage
                if (!companyId) {
                  try {
                    const compStr = localStorage.getItem('picklepoint_companies');
                    const localComps = compStr ? JSON.parse(compStr) : [];
                    const matchedComp = localComps.find(
                      (c: any) => c.clientAdminEmail?.toLowerCase() === userEmailLower || (uData.companyId && c.id === uData.companyId)
                    );
                    if (matchedComp) {
                      companyId = matchedComp.id;
                      companyName = matchedComp.name;
                    }
                  } catch {}
                }

                // Clean up any placeholder invited-* documents with the same email
                const invQuery = query(collection(firestoreDb, 'users'), where('email', '==', userEmailLower));
                const invSnap = await getDocs(invQuery);
                invSnap.forEach((dSnap) => {
                  if (dSnap.id.startsWith('invited-') && dSnap.id !== firebaseUser.uid) {
                    deleteDoc(doc(firestoreDb, 'users', dSnap.id)).catch(() => {});
                  }
                });
              } catch (e) {
                console.warn('Company role check error:', e);
              }
            }
            
            const isAdmin = role === 'super_admin' || role === 'client_admin' || role === 'manager' || role === 'editor' || firebaseUser.email?.toLowerCase() === 'admin@picklepoint.com';
            const resolvedCompanyId = companyId || uData.companyId || (matchedInvite as any)?.companyId || '';
            const needsOnboarding = role === 'client_admin' && (!resolvedCompanyId || uData.needsOnboarding === true);

            const effectiveCompanyName = companyName || uData.companyName || matchedInvite?.company || '';
            const resolvedName =
              (firebaseUser.displayName && uData.name && effectiveCompanyName && uData.name.trim().toLowerCase() === effectiveCompanyName.trim().toLowerCase())
                ? firebaseUser.displayName
                : (uData.name || firebaseUser.displayName || 'Player');

            // If Firestore stored name was identical to companyName, sync Firestore with Gmail registered displayName
            if (firebaseUser.displayName && uData.name && effectiveCompanyName && uData.name.trim().toLowerCase() === effectiveCompanyName.trim().toLowerCase()) {
              updateDoc(userDocRef, { name: firebaseUser.displayName }).catch(() => {});
            }

            const existingSessionStr = localStorage.getItem('picklepoint_session');
            let existingExpiresAt: string | undefined;
            if (existingSessionStr) {
              try {
                existingExpiresAt = JSON.parse(existingSessionStr).sessionExpiresAt;
              } catch (_) {}
            }
            const rememberMePref = localStorage.getItem('picklepoint_remember_me') !== 'false';
            const effectiveExpiresAt =
              existingExpiresAt && new Date(existingExpiresAt).getTime() > Date.now()
                ? existingExpiresAt
                : new Date(Date.now() + (rememberMePref ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString();

            const loadedUser = {
              uid: firebaseUser.uid,
              name: resolvedName,
              email: firebaseUser.email || '',
              role: role,
              status: status,
              companyId: resolvedCompanyId,
              companyName: effectiveCompanyName,
              invitedBy: uData.invitedBy || (matchedInvite as any)?.invitedBy || '',
              permissions: uData.permissions || (matchedInvite as any)?.permissions,
              isAdmin: isAdmin,
              needsOnboarding: needsOnboarding,
              sessionExpiresAt: effectiveExpiresAt,
              rememberMe: rememberMePref,
            };

            setUser(loadedUser);
            localStorage.setItem('picklepoint_session', JSON.stringify(loadedUser));


            if (needsOnboarding) {
              sessionStorage.removeItem('picklepoint_checkout_details');
              setCheckoutDetails(null);
              setView('client_onboarding');
            } else if (isAdmin) {
              const isPrivacyRoute = window.location.pathname === '/privacy' || window.location.pathname === '/privacy-policy' || new URLSearchParams(window.location.search).get('view') === 'privacy';
              const isAdminRoute = window.location.pathname === '/pickle-admin' || new URLSearchParams(window.location.search).get('view') === 'admin';

              if (isPrivacyRoute) {
                setView('privacy');
              } else if (isAdminRoute) {
                if (window.location.search.includes('inviteToken') || window.location.pathname === '/register' || window.location.pathname === '/login') {
                  window.history.pushState({}, '', '/pickle-admin');
                }
                setView('admin');
              } else {
                restoreSessionView();
              }
            } else {
              restoreSessionView();
            }
          } catch (err) {
            console.error('Error fetching user role from Firestore:', err);
            const isDefaultAdmin = firebaseUser.email?.toLowerCase() === 'admin@picklepoint.com';
            const rememberMePref = localStorage.getItem('picklepoint_remember_me') !== 'false';
            const fallbackUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Player',
              email: firebaseUser.email || '',
              role: isDefaultAdmin ? 'super_admin' : 'player',
              isAdmin: isDefaultAdmin,
              sessionExpiresAt: new Date(Date.now() + (rememberMePref ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString(),
              rememberMe: rememberMePref,
            };
            setUser(fallbackUser);
            restoreSessionView();
          }
        } else {
          // Check if there is an unexpired session in localStorage before wiping
          const cachedSession = localStorage.getItem('picklepoint_session');
          let hasValidCachedSession = false;
          if (cachedSession) {
            try {
              const parsed = JSON.parse(cachedSession);
              if (parsed?.sessionExpiresAt && new Date(parsed.sessionExpiresAt).getTime() > Date.now()) {
                hasValidCachedSession = true;
                setUser(parsed);
              }
            } catch (_) {}
          }

          if (!hasValidCachedSession) {
            setUser(null);
            localStorage.removeItem('picklepoint_session');
            localStorage.removeItem('picklepoint_remember_me');
            if (window.location.pathname === '/pickle-admin') {
              setView('login');
            } else if (currentView === 'admin' || currentView === 'profile' || currentView === 'checkout') {
              setView('landing');
            } else {
              restoreSessionView();
            }
          } else {
            restoreSessionView();
          }
        }
        setAuthLoading(false);
      });
      return unsubscribe;
    } else {
      // Fallback: Check localStorage for simulated session
      const savedUser = localStorage.getItem('picklepoint_session');
      setTimeout(() => {
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as { uid?: string; name: string; email: string; role?: string; status?: string; companyId?: string; companyName?: string; isAdmin?: boolean; sessionExpiresAt?: string; rememberMe?: boolean };
          if (parsed.sessionExpiresAt && Date.now() > new Date(parsed.sessionExpiresAt).getTime()) {
            localStorage.removeItem('picklepoint_session');
            localStorage.removeItem('picklepoint_remember_me');
            setUser(null);
            setView('login');
          } else if (parsed.status === 'inactive' || parsed.status === 'deleted') {
            localStorage.removeItem('picklepoint_session');
            setUser(null);
            setView('login');
          } else {
            const compStr = localStorage.getItem('picklepoint_companies');
            const localComps = compStr ? JSON.parse(compStr) : [];
            const matchedComp = localComps.find((c: any) => c.clientAdminEmail?.toLowerCase() === parsed.email?.toLowerCase());
            if (matchedComp && parsed.role !== 'super_admin') {
              parsed.role = 'client_admin';
              parsed.companyId = matchedComp.id;
              parsed.companyName = matchedComp.name;
              parsed.isAdmin = true;
              localStorage.setItem('picklepoint_session', JSON.stringify(parsed));
            }
            setUser(parsed);
            restoreSessionView();
          }
        } else if (window.location.pathname === '/pickle-admin') {
          setView('login');
        } else {
          restoreSessionView();
        }
        setAuthLoading(false);
      }, 0);
    }
  }, []);

  // Monitor path navigation directly to resolve /pickle-admin access
  useEffect(() => {
    if (authLoading) return;

    if (window.location.pathname === '/pickle-admin') {
      setTimeout(() => {
        if (user && (user.isAdmin || user.email.toLowerCase() === 'admin@picklepoint.com')) {
          setView('admin');
        } else {
          setView('login');
        }
      }, 0);
    }
  }, [authLoading, user]);

  // Sync back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const openPlayParam = searchParams.get('eventId') || searchParams.get('openplay');
      const savedCheckoutStr = sessionStorage.getItem('picklepoint_checkout_details');

      if (searchParams.has('upload_receipt') || searchParams.get('view') === 'upload_receipt') {
        setView('upload_receipt');
        return;
      }

      if (searchParams.get('view') === 'lookup' || searchParams.get('ref')) {
        setView('lookup');
        return;
      }

      if (openPlayParam) {
        setOpenPlayEventId(openPlayParam);
        setView('openplay');
        return;
      }

      if (pathname === '/open-play' || searchParams.get('view') === 'openplay') {
        setOpenPlayEventId(null);
        setView('openplay');
        return;
      }

      if (pathname === '/pickle-admin') {
        if (user && (user.isAdmin || user.email.toLowerCase() === 'admin@picklepoint.com')) {
          setView('admin');
        } else {
          setView('login');
        }
      } else if (pathname === '/checkout' && savedCheckoutStr) {
        try {
          setCheckoutDetails(JSON.parse(savedCheckoutStr));
          setView('checkout');
        } catch (e) {
          setView('landing');
        }
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const handleLoginSuccess = async (loggedInUser: { uid?: string; name: string; email: string; role?: string; status?: string; isAdmin?: boolean }) => {
    let userStatus = loggedInUser.status;

    if (!userStatus) {
      if (isFirebaseConfigured && db && loggedInUser.uid) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', loggedInUser.uid));
          if (userDocSnap.exists()) {
            userStatus = userDocSnap.data().status;
          }
        } catch (e) {
          // Ignore permissions fallback if Firestore rules restrict direct read
        }
      } else if (!isFirebaseConfigured) {
        const usersStr = localStorage.getItem('picklepoint_users');
        if (usersStr) {
          const localUsers = JSON.parse(usersStr) as any[];
          const matched = localUsers.find((u) => u.email?.toLowerCase() === loggedInUser.email.toLowerCase());
          if (matched && matched.status) {
            userStatus = matched.status;
          }
        }
      }
    }

    userStatus = userStatus || 'active';

    if (userStatus === 'inactive' || userStatus === 'deleted') {
      localStorage.removeItem('picklepoint_session');
      setUser(null);
      setView('login');
      setDeactivatedModalOpen(true);

      if (isFirebaseConfigured && auth) {
        signOut(auth).catch(() => {});
      }
      return;
    }

    let finalRole = loggedInUser.role || 'player';
    const emailLower = loggedInUser.email.toLowerCase();

    // Verify company association for client_admin role
    // Guard: Never auto-promote facility managers or staff editors to client_admin
    if (emailLower !== 'admin@picklepoint.com' && finalRole !== 'super_admin' && finalRole !== 'manager' && finalRole !== 'editor') {
      if (isFirebaseConfigured && db) {
        try {
          const compQuery = query(collection(db, 'companies'), where('clientAdminEmail', '==', emailLower));
          const compSnap = await getDocs(compQuery);
          if (!compSnap.empty && finalRole !== 'client_admin') {
            finalRole = 'client_admin';
            if (loggedInUser.uid) {
              await updateDoc(doc(db, 'users', loggedInUser.uid), { role: 'client_admin', isInvitedPending: false });
            }
          }
        } catch (e) {
          console.warn('Login company check error:', e);
        }
      } else {
        const compStr = localStorage.getItem('picklepoint_companies');
        const localComps = compStr ? JSON.parse(compStr) : [];
        if (localComps.some((c: any) => c.clientAdminEmail?.toLowerCase() === emailLower)) {
          finalRole = 'client_admin';
        }
      }
    }

    const rememberMePref = (loggedInUser as any).rememberMe ?? (localStorage.getItem('picklepoint_remember_me') !== 'false');
    const sessionExpiresAt =
      (loggedInUser as any).sessionExpiresAt ||
      new Date(Date.now() + (rememberMePref ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString();

    const updatedUser = {
      ...loggedInUser,
      role: finalRole,
      status: userStatus,
      isAdmin: finalRole === 'super_admin' || finalRole === 'client_admin' || finalRole === 'manager' || finalRole === 'editor',
      sessionExpiresAt,
      rememberMe: rememberMePref,
    };

    setUser(updatedUser);
    localStorage.setItem('picklepoint_session', JSON.stringify(updatedUser));

    const pendingCourtId = localStorage.getItem('picklepoint_pending_court_id');
    const pendingOpenPlayId = localStorage.getItem('picklepoint_pending_openplay_id');
    const pendingOpenPlayTab = localStorage.getItem('picklepoint_pending_openplay_tab');
    const isClientAdminNeedsOnboarding =
      finalRole === 'client_admin' &&
      ((loggedInUser as any).needsOnboarding || !(loggedInUser as any).companyId);

    if (pendingCourtId) {
      setSelectedCourtId(pendingCourtId);
      setView('details');
      localStorage.removeItem('picklepoint_pending_court_id');
    } else if (isClientAdminNeedsOnboarding) {
      sessionStorage.removeItem('picklepoint_checkout_details');
      setCheckoutDetails(null);
      setView('client_onboarding');
    } else if (pendingOpenPlayId) {
      localStorage.removeItem('picklepoint_pending_openplay_id');
      localStorage.removeItem('picklepoint_pending_openplay_tab');
      handleSelectOpenPlayEvent(pendingOpenPlayId, pendingOpenPlayTab || 'waitlist');
      setView('openplay');
    } else if (updatedUser.isAdmin || updatedUser.email.toLowerCase() === 'admin@picklepoint.com') {
      sessionStorage.removeItem('picklepoint_checkout_details');
      setCheckoutDetails(null);
      window.history.pushState({}, '', '/pickle-admin');
      setView('admin');
    } else if (selectedCourtId) {
      setView('details');
    } else {
      setView('landing');
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setSelectedCourtId('');
    localStorage.removeItem('picklepoint_session');
    localStorage.removeItem('picklepoint_pending_court_id');
    localStorage.removeItem('picklepoint_remember_me');
    sessionStorage.removeItem('picklepoint_active_court_id');
    sessionStorage.removeItem('picklepoint_checkout_details');
    sessionStorage.clear();

    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
    setView('landing');
  };

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  const renderDeactivatedModal = () => {
    if (!deactivatedModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="glass-panel border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl bg-dark-bg/95">
          {/* Accent Ambient Glow */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-red-500/20 blur-3xl rounded-full pointer-events-none"></div>

          {/* Alert Badge Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/10">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">Account Deactivated</h3>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed font-medium">
            Your account has been deactivated or removed. Please contact system support.
          </p>

          <button
            onClick={() => setDeactivatedModalOpen(false)}
            className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer shadow-lg shadow-red-600/20 active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    );
  };

  if (isRedirectingShortLink) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-brand-lime selection:text-dark-bg">
        <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mb-4 shadow-lg shadow-brand-lime/10">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
        </div>
        <p className="text-sm font-bold text-slate-200 animate-pulse">Redirecting to short link destination...</p>
      </div>
    );
  }

  if (inactiveShortLinkNotice) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-brand-lime selection:text-slate-950">
        <div className="glass-panel border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 bg-slate-900 shadow-2xl text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <Clock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              {inactiveShortLinkNotice.isExpired ? 'Short Link Expired' : 'Short Link Temporarily Paused'}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The promotional link <strong className="text-white font-bold">"{inactiveShortLinkNotice.linkTitle || 'Special Offer'}"</strong> {inactiveShortLinkNotice.isExpired ? 'has passed its expiration date' : 'has been temporarily paused by the facility'}.
            </p>
          </div>

          {inactiveShortLinkNotice.companyName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-300">
              {inactiveShortLinkNotice.companyLogoUrl ? (
                <img src={inactiveShortLinkNotice.companyLogoUrl} alt={inactiveShortLinkNotice.companyName} className="w-4 h-4 rounded-sm object-cover" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-brand-lime" />
              )}
              <span>{inactiveShortLinkNotice.companyName}</span>
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => {
                if (inactiveShortLinkNotice.destinationVenueUrl?.startsWith('http')) {
                  window.location.replace(inactiveShortLinkNotice.destinationVenueUrl);
                } else {
                  window.location.href = inactiveShortLinkNotice.destinationVenueUrl || '/';
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/10 transition-all cursor-pointer active:scale-98"
            >
              <span>Visit Facility Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Go to PicklePoint Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-brand-lime selection:text-dark-bg">
        <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
        </div>
        <p className="text-sm font-bold text-slate-300 animate-pulse">Restoring Session...</p>
      </div>
    );
  }

  if (openPlayEventId && currentView !== 'login' && currentView !== 'register' && currentView !== 'checkout' && currentView !== 'upload_receipt' && currentView !== 'lookup') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />
        <main className="flex-grow">
          <OpenPlayDetails 
            eventId={openPlayEventId} 
            user={user} 
            setCheckoutDetails={setCheckoutDetails}
            setView={handleSetView}
            onNavigateToAuth={(mode) => setView(mode)} 
            onBack={() => {
              handleSelectOpenPlayEvent(null);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
              }
              handleSetView('landing');
            }} 
          />
        </main>
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <>
        <Login setView={handleSetView} onLoginSuccess={handleLoginSuccess} invitationNotice={invitationNotice} />
        {renderDeactivatedModal()}
      </>
    );
  }

  if (currentView === 'register') {
    return (
      <>
        <Register setView={handleSetView} onLoginSuccess={handleLoginSuccess} invitationNotice={invitationNotice} />
        {renderDeactivatedModal()}
      </>
    );
  }

  if (currentView === 'client_onboarding' && user) {
    return (
      <>
        <ClientAdminOnboarding
          user={user}
          onComplete={(updatedUser) => {
            setUser(updatedUser);
            window.history.pushState({}, '', '/pickle-admin');
            setView('admin');
          }}
        />
        {renderDeactivatedModal()}
      </>
    );
  }

  if (currentView === 'admin') {
    const isAuthorized = Boolean(
      user &&
        (user.isAdmin ||
          user.role === 'client_admin' ||
          user.role === 'super_admin' ||
          user.role === 'manager' ||
          user.role === 'editor' ||
          user.email?.toLowerCase() === 'admin@picklepoint.com') &&
        user.role !== 'player' &&
        user.role !== 'client'
    );

    if (!isAuthorized) {
      if (authLoading) {
        return (
          <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center">
            <span className="w-10 h-10 border-4 border-slate-800 border-t-brand-lime rounded-full animate-spin mb-4"></span>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Verifying permissions...</p>
          </div>
        );
      }
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/');
      }
      if (!user) {
        return <Login setView={handleSetView} onLoginSuccess={handleLoginSuccess} invitationNotice={invitationNotice} />;
      }
      setView('landing');
      return null;
    }

    return (
      <>
        <AdminDashboard setView={handleSetView} user={user} onLogout={handleLogout} />
        {renderDeactivatedModal()}
      </>
    );
  }

  if (currentView === 'openplay') {
    if (openPlayEventId) {
      return (
        <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
          {/* Header Navigation */}
          <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

          {/* Main Content Area */}
          <main className="flex-grow pt-20">
            <OpenPlayDetails
              eventId={openPlayEventId}
              onBack={() => {
                setOpenPlayEventId(null);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/');
                }
                handleSetView('landing');
              }}
              user={user}
              setView={handleSetView}
              setCheckoutDetails={setCheckoutDetails}
              onNavigateToAuth={(mode) => setView(mode)}
            />
          </main>

          {/* Footer Branding & Newsletter */}
          <Footer />
          {renderDeactivatedModal()}
        </div>
      );
    }

    if (typeof window !== 'undefined' && window.location.pathname === '/open-play') {
      window.history.pushState({}, '', '/');
    }
    handleSetView('landing');
    return null;
  }

  if (currentView === 'bootcamp') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow">
          <Bootcamp setView={handleSetView} />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'lookup') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow">
          <BookingStatus setView={handleSetView} />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'upload_receipt') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow">
          <UploadReceiptPage setView={handleSetView} />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'checkout' && checkoutDetails) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow pt-28 pb-20 md:pt-36 md:pb-28">
          <Checkout
            setView={handleSetView}
            user={user}
            checkoutDetails={checkoutDetails}
            setCheckoutDetails={setCheckoutDetails}
            setSelectedCourtId={setSelectedCourtId}
            setOpenPlayEventId={setOpenPlayEventId}
          />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'details') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow">
          <CourtDetails
            courtId={selectedCourtId}
            initialSelectedDate={landingSearchDate}
            setView={handleSetView}
            user={user}
            setSelectedCourtId={setSelectedCourtId}
            setCheckoutDetails={setCheckoutDetails}
          />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        <Profile user={user} setView={handleSetView} onLogout={handleLogout} />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'venue_pricing') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />
        <main className="flex-grow pt-16">
          <VenueSubscription
            onBack={() => handleSetView('landing')}
            onSelectPlan={(planId, billingCycle) => {
              void planId; void billingCycle;
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (user) {
                handleSetView('client_onboarding');
              } else {
                handleSetView('register');
              }
            }}
          />
        </main>
        <Footer setView={handleSetView} />
        {renderDeactivatedModal()}
      </div>
    );
  }

  if (currentView === 'privacy') {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />
        <main className="flex-grow pt-16">
          <PrivacyPolicy onBack={() => handleSetView('landing')} />
        </main>
        <Footer setView={handleSetView} />
        {renderDeactivatedModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg overflow-x-hidden w-full relative">
      {/* Header Navigation */}
      <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

      {/* Main Content Area */}
      <main className="flex-grow">
        <Hero
          setView={handleSetView}
          setSelectedCourtId={setSelectedCourtId}
          searchDate={landingSearchDate}
          setSearchDate={setLandingSearchDate}
          onSelectOpenPlayEvent={(eventId) => {
            window.scrollTo({ top: 0, behavior: 'instant' });
            handleSelectOpenPlayEvent(eventId);
            setView('openplay');
          }}
        />
      </main>

      {/* Footer Branding & Newsletter */}
      <Footer setView={handleSetView} />
      {renderDeactivatedModal()}
    </div>
  );
}

export default App;
