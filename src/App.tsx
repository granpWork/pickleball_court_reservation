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
import OpenPlayDetails from './components/OpenPlayDetails';
import OpenPlayPage from './components/OpenPlayPage';
import Bootcamp from './components/Bootcamp';
import Profile from './components/Profile';
import ClientAdminOnboarding from './components/ClientAdminOnboarding';
import { auth, db, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AlertCircle, Loader2 } from 'lucide-react';

function App() {
  const [currentView, setView] = useState<'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'register' || params.get('inviteToken') || window.location.pathname === '/register') {
      return 'register';
    }
    if (params.get('view') === 'login' || params.get('invite') === 'true' || window.location.pathname === '/login') {
      return 'login';
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
    if (window.location.pathname === '/checkout' || params.get('view') === 'checkout') {
      return 'checkout';
    }
    if (window.location.pathname === '/pickle-admin') {
      return 'admin';
    }
    return 'landing';
  });

  const [isRedirectingShortLink, setIsRedirectingShortLink] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/s/') || Boolean(new URLSearchParams(window.location.search).get('s'));
  });

  const [openPlayEventId, setOpenPlayEventId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId') || params.get('openplay') || null;
  });
  const [selectedCourtId, setSelectedCourtIdState] = useState<string>(() => {
    return sessionStorage.getItem('picklepoint_active_court_id') || localStorage.getItem('picklepoint_pending_court_id') || '';
  });

  const setSelectedCourtId = (id: string) => {
    if (id) {
      sessionStorage.setItem('picklepoint_active_court_id', id);
    } else {
      sessionStorage.removeItem('picklepoint_active_court_id');
    }
    setSelectedCourtIdState(id);
  };

  const isUserUnonboardedClientAdmin = (u?: { role?: string; companyId?: string; needsOnboarding?: boolean } | null) => {
    if (!u) return false;
    return u.role === 'client_admin' && (!u.companyId || (u as any).needsOnboarding === true);
  };

  const handleSetView = (nextView: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding') => {
    setOpenPlayEventId(null);
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

  // Handle Short Link /s/:slug redirection
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    let shortSlug: string | null = null;

    if (path.startsWith('/s/')) {
      shortSlug = path.substring(3).trim();
    } else if (searchParams.get('s')) {
      shortSlug = searchParams.get('s')!.trim();
    }

    if (shortSlug) {
      const handleShortLinkRedirect = async () => {
        let matchedLink: any = null;

        if (isFirebaseConfigured && db) {
          try {
            const { collection, getDocs, query, where, updateDoc, increment, doc: fDoc } = await import('firebase/firestore');
            const q = query(collection(db, 'short_links'), where('shortSlug', '==', shortSlug));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              matchedLink = { id: docSnap.id, ...docSnap.data() };
              updateDoc(fDoc(db, 'short_links', docSnap.id), {
                clickCount: increment(1),
              }).catch(() => {});
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
              matchedLink = localLinks.find((l: any) => l.shortSlug?.toLowerCase() === shortSlug?.toLowerCase());
              if (matchedLink) {
                matchedLink.clickCount = (matchedLink.clickCount || 0) + 1;
                localStorage.setItem('picklepoint_short_links', JSON.stringify(localLinks));
              }
            } catch (e) {}
          }
        }

        if (matchedLink?.originalUrl) {
          window.location.replace(matchedLink.originalUrl);
        } else {
          setIsRedirectingShortLink(false);
        }
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
      } catch (e) {}
    }
    return null;
  });
  const [user, setUser] = useState<{ uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
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

    const params = new URLSearchParams(window.location.search);

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

    // 3. If on root path "/" without explicit view query params, direct admins/managers to admin dashboard, players to landing page
    if (window.location.pathname === '/' && !params.get('view') && !params.get('openplay') && !params.get('eventId') && !params.get('court') && !params.get('ref')) {
      if (user && (user.isAdmin || user.role === 'super_admin' || user.role === 'client_admin' || user.role === 'manager')) {
        setView('admin');
        return;
      }
      setView('landing');
      return;
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

    if (selectedCourtId) {
      setView('details');
      return;
    }

    setView('landing');
  };

  // Check URL parameters for invitation links, tracking links & Open Play shareable links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
    } else if (params.get('view') === 'lookup' || params.get('ref')) {
      setView('lookup');
    } else if (params.get('view') === 'openplay' || window.location.pathname === '/open-play') {
      setView('openplay');
    } else if (params.get('view') === 'bootcamp' || window.location.pathname === '/bootcamp') {
      setView('bootcamp');
    } else if (params.get('view') === 'profile' || window.location.pathname === '/profile') {
      setView('profile');
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
                const { collection, query, where, getDocs, doc: fDoc, getDoc: fGetDoc } = await import('firebase/firestore');
                const searchParams = new URLSearchParams(window.location.search);
                const inviteTokenParam = searchParams.get('inviteToken');

                if (inviteTokenParam) {
                  const invRef = fDoc(firestoreDb, 'invitations', inviteTokenParam);
                  const invSnap = await fGetDoc(invRef);
                  if (invSnap.exists() && invSnap.data().status !== 'used') {
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
              role = matchedInvite?.role || uData.role || (userEmailLower === 'admin@picklepoint.com' ? 'super_admin' : 'player');
              status = uData.status || (uData.isInvitedPending ? 'pending' : 'active');

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
            } else {
              status = 'active';
              try {
                await setDoc(userDocRef, {
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName || 'Player',
                  email: firebaseUser.email || '',
                  role: role,
                  companyName: matchedInvite?.company || '',
                  status: 'active',
                  createdAt: new Date().toISOString()
                });
                const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
                const loginUrl = `${origin}/?view=login&registered=true&email=${encodeURIComponent(firebaseUser.email || '')}`;
                const { sendRegistrationConfirmationEmail } = await import('./services/emailService');
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
                const { updateDoc, doc: fDoc } = await import('firebase/firestore');
                await updateDoc(fDoc(firestoreDb, 'invitations', inviteDocId), {
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
            
            // Auto-promote role to client_admin if user's email matches a company's designated clientAdminEmail
            let companyId: string | undefined;
            let companyName: string | undefined;
            if (userEmailLower && role !== 'super_admin') {
              try {
                const { collection, query, where, getDocs, updateDoc, deleteDoc, doc: fDoc } = await import('firebase/firestore');
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

                // Clean up any placeholder invited-* documents with the same email
                const invQuery = query(collection(firestoreDb, 'users'), where('email', '==', userEmailLower));
                const invSnap = await getDocs(invQuery);
                invSnap.forEach((dSnap) => {
                  if (dSnap.id.startsWith('invited-') && dSnap.id !== firebaseUser.uid) {
                    deleteDoc(fDoc(firestoreDb, 'users', dSnap.id)).catch(() => {});
                  }
                });
              } catch (e) {
                console.warn('Company role check error:', e);
              }
            }
            
            const isAdmin = role === 'super_admin' || role === 'client_admin' || role === 'manager' || role === 'editor' || firebaseUser.email?.toLowerCase() === 'admin@picklepoint.com';
            const needsOnboarding = role === 'client_admin' && !companyId;

            const uData = userDocSnap.exists() ? userDocSnap.data() : {};
            const loadedUser = {
              uid: firebaseUser.uid,
              name: uData.name || firebaseUser.displayName || 'Player',
              email: firebaseUser.email || '',
              role: role,
              status: status,
              companyId: companyId || uData.companyId || (matchedInvite as any)?.companyId || '',
              companyName: companyName || uData.companyName || matchedInvite?.company || '',
              invitedBy: uData.invitedBy || (matchedInvite as any)?.invitedBy || '',
              permissions: uData.permissions || (matchedInvite as any)?.permissions,
              isAdmin: isAdmin,
              needsOnboarding: needsOnboarding,
            };

            setUser(loadedUser);
            localStorage.setItem('picklepoint_session', JSON.stringify(loadedUser));

            if (needsOnboarding) {
              sessionStorage.removeItem('picklepoint_checkout_details');
              setCheckoutDetails(null);
              setView('client_onboarding');
            } else if (isAdmin && window.location.pathname === '/pickle-admin') {
              window.history.pushState({}, '', '/pickle-admin');
              setView('admin');
            } else {
              restoreSessionView();
            }
          } catch (err) {
            console.error('Error fetching user role from Firestore:', err);
            const isDefaultAdmin = firebaseUser.email?.toLowerCase() === 'admin@picklepoint.com';
            const fallbackUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Player',
              email: firebaseUser.email || '',
              role: isDefaultAdmin ? 'super_admin' : 'player',
              isAdmin: isDefaultAdmin,
            };
            setUser(fallbackUser);
            restoreSessionView();
          }
        } else {
          setUser(null);
          if (window.location.pathname === '/pickle-admin') {
            setView('login');
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
          const parsed = JSON.parse(savedUser) as { uid?: string; name: string; email: string; role?: string; status?: string; companyId?: string; companyName?: string; isAdmin?: boolean };
          if (parsed.status === 'inactive' || parsed.status === 'deleted') {
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
      const savedCheckoutStr = sessionStorage.getItem('picklepoint_checkout_details');

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
          const { doc, getDoc } = await import('firebase/firestore');
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
    if (emailLower !== 'admin@picklepoint.com' && finalRole !== 'super_admin') {
      if (isFirebaseConfigured && db) {
        try {
          const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
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

    const updatedUser = {
      ...loggedInUser,
      role: finalRole,
      status: userStatus,
      isAdmin: finalRole === 'super_admin' || finalRole === 'client_admin' || finalRole === 'manager',
    };

    setUser(updatedUser);
    localStorage.setItem('picklepoint_session', JSON.stringify(updatedUser));

    const pendingCourtId = localStorage.getItem('picklepoint_pending_court_id');
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
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error signing out:', err);
      }
    } else {
      localStorage.removeItem('picklepoint_session');
    }
    setUser(null);
    setSelectedCourtId('');
    sessionStorage.removeItem('picklepoint_active_court_id');
    localStorage.removeItem('picklepoint_pending_court_id');
    window.history.pushState({}, '', '/');
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

  if (openPlayEventId && currentView !== 'login' && currentView !== 'register') {
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
              setOpenPlayEventId(null);
              window.history.pushState({}, '', '/open-play');
              setView('openplay');
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
              onBack={() => setOpenPlayEventId(null)}
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

    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg">
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow">
          <OpenPlayPage
            onSelectEvent={(eventId) => {
              window.scrollTo({ top: 0, behavior: 'instant' });
              setOpenPlayEventId(eventId);
            }}
            setView={handleSetView}
          />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
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
        {/* Header Navigation */}
        <Header user={user} onLogout={handleLogout} setView={handleSetView} currentView={currentView} />

        {/* Main Content Area */}
        <main className="flex-grow pt-20">
          <Profile user={user} setView={handleSetView} onLogout={handleLogout} />
        </main>

        {/* Footer Branding & Newsletter */}
        <Footer />
        {renderDeactivatedModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col selection:bg-brand-lime selection:text-dark-bg overflow-x-hidden w-full relative">
      {/* Header Navigation */}
      <Header user={user} onLogout={handleLogout} setView={setView} currentView={currentView} />

      {/* Main Content Area */}
      <main className="flex-grow">
        <Hero
          setView={setView}
          setSelectedCourtId={setSelectedCourtId}
        />
      </main>

      {/* Footer Branding & Newsletter */}
      <Footer />
      {renderDeactivatedModal()}
    </div>
  );
}

export default App;
