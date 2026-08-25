import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, AlertCircle, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { auth, db, googleProvider, facebookProvider, isFirebaseConfigured } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signOut, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendRegistrationConfirmationEmail } from '../services/emailService';

interface RegisterProps {
  setView: (view: 'landing' | 'login' | 'register' | 'client_onboarding') => void;
  onLoginSuccess: (user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean; needsOnboarding?: boolean }) => void;
  invitationNotice?: { email: string; company?: string } | null;
}

export default function Register({ setView, onLoginSuccess, invitationNotice }: RegisterProps) {
  const searchParams = new URLSearchParams(window.location.search);
  const inviteTokenParam = searchParams.get('inviteToken') || '';
  const urlEmail = invitationNotice?.email || searchParams.get('email') || '';
  const invitedCompany = invitationNotice?.company || searchParams.get('company') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(urlEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Invite Token Verification State
  const [inviteTokenValidating, setInviteTokenValidating] = useState(!!inviteTokenParam);
  const [isVerifiedInvite, setIsVerifiedInvite] = useState(false);
  const [invalidInviteReason, setInvalidInviteReason] = useState<string | null>(null);

  useEffect(() => {
    const validateInviteToken = async () => {
      if (!inviteTokenParam) {
        setInviteTokenValidating(false);
        return;
      }

      try {
        let inviteData: any = null;

        if (isFirebaseConfigured && db) {
          try {
            const inviteSnap = await getDoc(doc(db, 'invitations', inviteTokenParam));
            if (inviteSnap.exists()) {
              inviteData = inviteSnap.data();
            }
          } catch (fErr) {
            console.warn('Could not read invitation from Firestore, trying localStorage:', fErr);
          }
        }

        if (!inviteData) {
          const localInvsStr = localStorage.getItem('picklepoint_invitations');
          if (localInvsStr) {
            const localInvs = JSON.parse(localInvsStr);
            inviteData = localInvs.find((inv: any) => inv.token === inviteTokenParam);
          }
        }

        if (!inviteData) {
          setInvalidInviteReason('This invitation link is invalid or does not exist.');
          setIsVerifiedInvite(false);
          setInviteTokenValidating(false);
          return;
        }

        // Check if already used
        if (inviteData.status === 'used') {
          setInvalidInviteReason('This invitation link has already been used. Please log in with your credentials or request a new invitation.');
          setIsVerifiedInvite(false);
          setInviteTokenValidating(false);
          return;
        }

        // Check expiration
        if (inviteData.expiresAt && new Date(inviteData.expiresAt).getTime() < Date.now()) {
          setInvalidInviteReason('This invitation link has expired. Please contact the Super Admin to request a fresh invitation.');
          setIsVerifiedInvite(false);
          setInviteTokenValidating(false);
          return;
        }

        // Check email binding to prevent token hijacking
        if (urlEmail && inviteData.email && urlEmail.toLowerCase() !== inviteData.email.toLowerCase()) {
          setInvalidInviteReason('Security Check Failed: The email in this link does not match the authorized invitation recipient.');
          setIsVerifiedInvite(false);
          setInviteTokenValidating(false);
          return;
        }

        // Valid invite
        setIsVerifiedInvite(true);
        setEmail(inviteData.email);
        if (inviteData.name && !name) {
          setName(inviteData.name);
        }
      } catch (err) {
        console.error('Error validating invite token:', err);
        setInvalidInviteReason('An error occurred while verifying your invitation.');
      } finally {
        setInviteTokenValidating(false);
      }
    };

    validateInviteToken();
  }, [inviteTokenParam, urlEmail]);

  const markInvitationUsed = async (token: string) => {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'invitations', token), {
          status: 'used',
          usedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not update invitation status in Firestore:', e);
      }
    }

    const localInvsStr = localStorage.getItem('picklepoint_invitations');
    if (localInvsStr) {
      try {
        const localInvs = JSON.parse(localInvsStr);
        const updated = localInvs.map((inv: any) =>
          inv.token === token ? { ...inv, status: 'used', usedAt: new Date().toISOString() } : inv
        );
        localStorage.setItem('picklepoint_invitations', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (invalidInviteReason) {
      setError(invalidInviteReason);
      return;
    }

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const isClientAdminInvite = isVerifiedInvite || !!inviteTokenParam;
    const finalRole = isClientAdminInvite
      ? 'client_admin'
      : email.toLowerCase() === 'admin@picklepoint.com'
      ? 'super_admin'
      : 'player';

    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        await updateProfile(fbUser, { displayName: name });
        
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              name: name,
              email: fbUser.email || '',
              role: finalRole,
              status: 'active',
              needsOnboarding: isClientAdminInvite,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.error('Error saving user to Firestore:', e);
          }
        }

        if (inviteTokenParam) {
          await markInvitationUsed(inviteTokenParam);
        }

        // Send registration confirmation email
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const loginUrl = `${origin}/?view=login&registered=true&email=${encodeURIComponent(email)}`;
        sendRegistrationConfirmationEmail({
          toEmail: email,
          toName: name,
          role: finalRole,
          loginUrl,
        }).catch((e) => console.warn('Confirmation email error:', e));

        await onLoginSuccess({
          uid: fbUser.uid,
          name: name,
          email: fbUser.email || '',
          role: finalRole,
          isAdmin: finalRole === 'super_admin' || finalRole === 'client_admin',
          needsOnboarding: isClientAdminInvite,
        });
        setLoading(false);
      } catch (err) {
        const firebaseError = err as { code?: string; message?: string };
        console.error('Firebase Email Register Error:', firebaseError);
        if (firebaseError.code === 'auth/email-already-in-use') {
          setError('An account with this email already exists.');
        } else {
          setError(firebaseError.message || 'An error occurred during account creation.');
        }
        setLoading(false);
      }
    } else {
      // Simulate network latency for mock auth
      setTimeout(async () => {
        const usersStr = localStorage.getItem('picklepoint_users');
        const users = (usersStr ? JSON.parse(usersStr) : []) as { name: string; email: string; password?: string; role?: string; needsOnboarding?: boolean }[];

        const userExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

        if (userExists) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        const newUser = { name, email, password, role: finalRole, needsOnboarding: isClientAdminInvite, status: 'active' };
        users.push(newUser);
        localStorage.setItem('picklepoint_users', JSON.stringify(users));

        if (inviteTokenParam) {
          await markInvitationUsed(inviteTokenParam);
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const loginUrl = `${origin}/?view=login&registered=true&email=${encodeURIComponent(email)}`;
        sendRegistrationConfirmationEmail({
          toEmail: email,
          toName: name,
          role: finalRole,
          loginUrl,
        }).catch((e) => console.warn('Confirmation email error:', e));

        onLoginSuccess({
          name: name,
          email: email,
          role: finalRole,
          isAdmin: finalRole === 'super_admin' || finalRole === 'client_admin',
          needsOnboarding: isClientAdminInvite,
        });
        setLoading(false);
      }, 1000);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    const isClientAdminInvite = isVerifiedInvite || !!inviteTokenParam;

    if (isFirebaseConfigured && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        const googleEmail = (fbUser.email || '').trim().toLowerCase();
        const expectedEmail = (email || urlEmail).trim().toLowerCase();

        // If this is a Client Admin invitation, ensure the Google account matches the authorized invited email
        if (isClientAdminInvite && expectedEmail && googleEmail !== expectedEmail) {
          // 1. Delete any Firestore record created for this unauthorized user (by UID and by email)
          if (db) {
            try {
              const { collection, query, where, getDocs } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'users', fbUser.uid));
              const uq = query(collection(db, 'users'), where('email', '==', googleEmail));
              const usnap = await getDocs(uq);
              usnap.forEach((d) => deleteDoc(d.ref).catch(() => {}));
            } catch (e) {}
          }

          // 2. Delete the account from Firebase Auth so no orphan account remains
          try {
            await deleteUser(fbUser);
          } catch (delErr) {
            console.warn('Could not auto-delete rejected auth user:', delErr);
            await signOut(auth);
          }

          setError(`Security check failed: You selected Google account "${fbUser.email}", but this invitation is bound to "${expectedEmail}". Please choose the matching Google account or set your password below.`);
          setLoading(false);
          return;
        }

        const finalRole = isClientAdminInvite
          ? 'client_admin'
          : googleEmail === 'admin@picklepoint.com'
          ? 'super_admin'
          : 'player';

        const displayName = fbUser.displayName || name || 'Client Admin';

        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            await setDoc(
              userDocRef,
              {
                uid: fbUser.uid,
                name: displayName,
                email: fbUser.email || '',
                role: finalRole,
                status: 'active',
                needsOnboarding: isClientAdminInvite,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (e) {
            console.error('Error checking user during Google registration:', e);
          }
        }

        if (inviteTokenParam) {
          await markInvitationUsed(inviteTokenParam);
        }

        // Send registration confirmation email
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const loginUrl = `${origin}/?view=login&registered=true&email=${encodeURIComponent(googleEmail)}`;
        sendRegistrationConfirmationEmail({
          toEmail: googleEmail,
          toName: displayName,
          role: finalRole,
          loginUrl,
        }).catch((e) => console.warn('Confirmation email error:', e));

        await onLoginSuccess({
          uid: fbUser.uid,
          name: displayName,
          email: fbUser.email || '',
          role: finalRole,
          isAdmin: finalRole === 'super_admin' || finalRole === 'client_admin',
          needsOnboarding: isClientAdminInvite,
        });
        setLoading(false);
      } catch (err) {
        const firebaseError = err as { code?: string; message?: string };
        console.error('Firebase Google Register Error:', firebaseError);
        setLoading(false);

        if (firebaseError.code === 'auth/popup-blocked') {
          try {
            const { signInWithRedirect } = await import('firebase/auth');
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (redirectErr) {
            console.error('Google Redirect fallback error:', redirectErr);
            setError('Google sign-in popup was blocked by your browser or extension. Please allow pop-ups for this site or use email registration.');
          }
        } else if (firebaseError.code === 'auth/popup-closed-by-user') {
          setError('Google sign-in popup was closed before completing registration.');
        } else {
          setError(firebaseError.message || 'An error occurred during Google sign in.');
        }
      }
    } else {
      setTimeout(async () => {
        const displayName = name || 'Google Client Admin';
        const finalRole: string = isClientAdminInvite ? 'client_admin' : 'player';

        if (inviteTokenParam) {
          await markInvitationUsed(inviteTokenParam);
        }

        onLoginSuccess({
          name: displayName,
          email: email || 'google.admin@picklepoint.com',
          role: finalRole,
          isAdmin: finalRole === 'super_admin' || finalRole === 'client_admin',
          needsOnboarding: isClientAdminInvite,
        });
        setLoading(false);
      }, 800);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        const result = await signInWithPopup(auth, facebookProvider);
        const fbUser = result.user;
        
        let role: string = 'player';
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              role = userDocSnap.data().role || 'player';
            } else {
              role = fbUser.email?.toLowerCase() === 'admin@picklepoint.com' ? 'super_admin' : 'player';
              await setDoc(userDocRef, {
                uid: fbUser.uid,
                name: fbUser.displayName || 'Facebook Player',
                email: fbUser.email || '',
                role: role,
                createdAt: new Date().toISOString()
              });
            }
          } catch (e) {
            console.error('Error checking user during social signup:', e);
          }
        }

        await onLoginSuccess({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Facebook Player',
          email: fbUser.email || '',
          role: role,
          isAdmin: role === 'super_admin' || role === 'client_admin',
        });
        setLoading(false);
      } catch (err) {
        const firebaseError = err as { code?: string; message?: string };
        console.error('Firebase Facebook Register Error:', firebaseError);
        if (firebaseError.code !== 'auth/popup-closed-by-user') {
          setError(firebaseError.message || 'Failed to sign up with Facebook.');
        }
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        onLoginSuccess({
          name: 'Facebook Player (Demo)',
          email: 'facebook.demo@picklepoint.com',
          role: 'player',
          isAdmin: false
        });
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg relative flex flex-col items-center justify-center px-4 overflow-hidden py-12">
      {/* Decorative Blur Background circles */}
      <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-brand-emerald/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] bg-brand-lime/10 blur-[130px] rounded-full pointer-events-none"></div>

      {/* Back Button */}
      <button
        onClick={() => setView('landing')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Home
      </button>

      {/* Main card panel */}
      <div className="w-full max-w-[440px] glass-panel rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in border border-slate-800">
        <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>

        {/* Verification Status Banner */}
        {inviteTokenValidating ? (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center flex items-center justify-center gap-2 text-xs text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-brand-lime" />
            <span>Verifying secure invitation credentials...</span>
          </div>
        ) : invalidInviteReason ? (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-left animate-fade-in space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-400 text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-red-400" /> Invalid Invitation Link
            </div>
            <p className="text-xs text-red-200 leading-relaxed">
              {invalidInviteReason}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setView('login')}
                className="px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Go to Login Page &rarr;
              </button>
            </div>
          </div>
        ) : isVerifiedInvite ? (
          <div className="mb-6 p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-left animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-brand-lime text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-brand-lime" /> Verified Client Admin Invitation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are registering an authorized <strong>Client Admin</strong> account for <span className="text-brand-lime font-mono">{email}</span>. Complete your password to proceed to facility onboarding.
            </p>
          </div>
        ) : urlEmail && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-left animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-brand-lime text-xs uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-brand-lime" /> Client Admin Invitation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have been invited as Client Admin {invitedCompany ? `for ${invitedCompany}` : ''}! Register your account to activate your dashboard access.
            </p>
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mb-3">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="0.75" />
              <circle cx="8" cy="8" r="0.75" />
              <circle cx="16" cy="8" r="0.75" />
              <circle cx="8" cy="16" r="0.75" />
              <circle cx="16" cy="16" r="0.75" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {isVerifiedInvite ? 'Client Admin Setup' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-base font-normal mt-1.5">
            {isVerifiedInvite ? 'Set your secure password to get started' : 'Join the PicklePoint community today'}
          </p>
        </div>

        {/* Social Sign-In buttons */}
        {isVerifiedInvite ? (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-dark-border bg-slate-900/90 hover:bg-dark-hover hover:border-brand-lime/50 text-sm font-bold text-white transition-all cursor-pointer shadow-md hover:scale-[1.01]"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Continue with Google Account</span>
            </button>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-dark-border/40"></div>
              <span className="flex-shrink mx-4 text-xs font-normal text-slate-500 uppercase tracking-widest">Or set password below</span>
              <div className="flex-grow border-t border-dark-border/40"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-dark-border bg-slate-900/60 hover:bg-dark-hover hover:border-slate-700/80 text-sm font-bold text-slate-200 transition-all cursor-pointer hover:scale-[1.01] shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-dark-border/40"></div>
              <span className="flex-shrink mx-4 text-xs font-normal text-slate-500 uppercase tracking-widest">Or email sign up</span>
              <div className="flex-grow border-t border-dark-border/40"></div>
            </div>
          </>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-normal flex items-start gap-2.5 animate-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name field */}
          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-900 border border-dark-border text-white text-base font-normal rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              {isVerifiedInvite && (
                <span className="text-[10px] uppercase font-bold text-brand-lime flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked & Verified
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                readOnly={isVerifiedInvite}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full border text-base font-normal rounded-xl pl-10 pr-4 py-3 focus:outline-none transition-all ${
                  isVerifiedInvite
                    ? 'bg-slate-900/50 border-brand-lime/40 text-brand-lime cursor-not-allowed font-mono text-sm'
                    : 'bg-slate-900 border-dark-border text-white focus:border-brand-lime'
                }`}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full bg-slate-900 border border-dark-border text-white text-base font-normal rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-brand-lime transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-slate-900 border border-dark-border text-white text-base font-normal rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
              />
            </div>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-2 rounded-xl text-base font-semibold text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] shadow-lg shadow-brand-lime/10 hover:scale-[1.01]'
            }`}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Direct to Sign In */}
        <div className="mt-6 pt-5 border-t border-dark-border/50 text-center text-base font-normal text-slate-400">
          Already have an account?{' '}
          <button
            onClick={() => setView('login')}
            className="text-brand-lime hover:underline font-semibold cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
