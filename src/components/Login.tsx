import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { auth, db, googleProvider, facebookProvider, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendRegistrationConfirmationEmail } from '../services/emailService';

interface LoginProps {
  setView: (view: 'landing' | 'login' | 'register' | 'client_onboarding') => void;
  onLoginSuccess: (user: { uid?: string; name: string; email: string; role?: string; status?: string; isAdmin?: boolean; needsOnboarding?: boolean }) => void;
  invitationNotice?: { email: string; company?: string } | null;
}

export default function Login({ setView, onLoginSuccess, invitationNotice }: LoginProps) {
  const searchParams = new URLSearchParams(window.location.search);
  const isRegisteredSuccess = searchParams.get('registered') === 'true';
  const invitedEmail = invitationNotice?.email || searchParams.get('email') || '';
  const invitedCompany = invitationNotice?.company || searchParams.get('company') || '';

  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        let role: string = 'player';
        let status: string = 'active';
        let needsOnboarding: boolean = false;
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              role = uData.role || 'player';
              status = uData.status || (uData.isInvitedPending ? 'pending' : 'active');
              needsOnboarding = uData.needsOnboarding || (role === 'client_admin' && !uData.companyId);
            } else {
              role = fbUser.email?.toLowerCase() === 'admin@picklepoint.com' ? 'super_admin' : 'player';
              status = 'active';
              await setDoc(userDocRef, {
                uid: fbUser.uid,
                name: fbUser.displayName || 'Player',
                email: fbUser.email || '',
                role: role,
                status: 'active',
                createdAt: new Date().toISOString()
              });
            }
          } catch (e) {
            console.error('Error fetching role during login:', e);
          }
        }

        await onLoginSuccess({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Player',
          email: fbUser.email || '',
          role: role,
          status: status,
          isAdmin: role === 'super_admin' || role === 'client_admin',
          needsOnboarding,
        });
        setLoading(false);
      } catch (err) {
        const firebaseError = err as { code?: string; message?: string };
        console.error('Firebase Email Login Error:', firebaseError);
        if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          setError('Invalid email or password.');
        } else {
          setError(firebaseError.message || 'An error occurred during sign in.');
        }
        setLoading(false);
      }
    } else {
      // Simulate network latency for mock auth fallback
      setTimeout(() => {
        const usersStr = localStorage.getItem('picklepoint_users');
        const users = (usersStr ? JSON.parse(usersStr) : []) as { name: string; email: string; password?: string; role?: string; needsOnboarding?: boolean; companyId?: string }[];

        const matchedUser = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (matchedUser) {
          const role = (matchedUser as any).role || ((matchedUser as any).email.toLowerCase() === 'admin@picklepoint.com' ? 'super_admin' : 'player');
          const status = (matchedUser as any).status || 'active';
          const needsOnboarding = matchedUser.needsOnboarding || (role === 'client_admin' && !matchedUser.companyId);
          onLoginSuccess({
            name: matchedUser.name,
            email: matchedUser.email,
            role: role,
            status: status,
            isAdmin: role === 'super_admin' || role === 'client_admin',
            needsOnboarding,
          });
          setLoading(false);
        } else {
          // Fallback demo accounts
          if (email.toLowerCase() === 'demo@picklepoint.com' && password === 'password123') {
            onLoginSuccess({
              name: 'Demo Player',
              email: 'demo@picklepoint.com',
              role: 'player',
              isAdmin: false
            });
          } else if (email.toLowerCase() === 'admin@picklepoint.com' && password === 'admin123') {
            onLoginSuccess({
              name: 'Admin User',
              email: 'admin@picklepoint.com',
              role: 'super_admin',
              isAdmin: true
            });
          } else {
            setError('Invalid email or password.');
            setLoading(false);
          }
        }
      }, 1000);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        
        let role: string = 'player';
        let status: string = 'active';
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              role = uData.role || 'player';
              status = uData.status || (uData.isInvitedPending ? 'pending' : 'active');
            } else {
              role = fbUser.email?.toLowerCase() === 'admin@picklepoint.com' ? 'super_admin' : 'player';
              status = 'active';
              await setDoc(userDocRef, {
                uid: fbUser.uid,
                name: fbUser.displayName || 'Player',
                email: fbUser.email || '',
                role: role,
                status: 'active',
                createdAt: new Date().toISOString()
              });

              // Send welcome email for newly created user profile via social login
              const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
              const loginUrl = `${origin}/?view=login&registered=true&email=${encodeURIComponent(fbUser.email || '')}`;
              sendRegistrationConfirmationEmail({
                toEmail: fbUser.email || '',
                toName: fbUser.displayName || 'Player',
                role: role,
                loginUrl,
              }).catch((e) => console.warn('Welcome email error:', e));
            }
          } catch (e) {
            console.error('Error fetching role during social login:', e);
          }
        }

        await onLoginSuccess({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Google Player',
          email: fbUser.email || '',
          role: role,
          status: status,
          isAdmin: role === 'super_admin' || role === 'client_admin',
        });
        setLoading(false);
      } catch (err) {
        const firebaseError = err as { code?: string; message?: string };
        console.error('Firebase Google Login Error:', firebaseError);
        setLoading(false);

        if (firebaseError.code === 'auth/popup-blocked') {
          try {
            const { signInWithRedirect } = await import('firebase/auth');
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (redirectErr) {
            console.error('Google Redirect fallback error:', redirectErr);
            setError('Google sign-in popup was blocked by your browser. Please allow pop-ups for this site.');
          }
        } else if (firebaseError.code !== 'auth/popup-closed-by-user') {
          setError(firebaseError.message || 'Failed to sign in with Google.');
        }
      }
    } else {
      // Fallback in simulated mode
      setTimeout(() => {
        onLoginSuccess({
          name: 'Google Player (Demo)',
          email: 'google.demo@picklepoint.com',
          role: 'player',
          isAdmin: false
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
        let status: string = 'active';
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              role = uData.role || 'player';
              status = uData.status || (uData.isInvitedPending ? 'pending' : 'active');
            } else {
              role = fbUser.email?.toLowerCase() === 'admin@picklepoint.com' ? 'super_admin' : 'player';
              status = 'active';
              await setDoc(userDocRef, {
                uid: fbUser.uid,
                name: fbUser.displayName || 'Player',
                email: fbUser.email || '',
                role: role,
                status: 'active',
                createdAt: new Date().toISOString()
              });
            }
          } catch (e) {
            console.error('Error fetching role during social login:', e);
          }
        }

        await onLoginSuccess({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Facebook Player',
          email: fbUser.email || '',
          role: role,
          status: status,
          isAdmin: role === 'super_admin' || role === 'client_admin',
        });
        setLoading(false);
      } catch (err) {
        const firebaseError = err as { code?: string; message?: string };
        console.error('Firebase Facebook Login Error:', firebaseError);
        setLoading(false);

        if (firebaseError.code === 'auth/popup-blocked') {
          try {
            const { signInWithRedirect } = await import('firebase/auth');
            await signInWithRedirect(auth, facebookProvider);
            return;
          } catch (redirectErr) {
            console.error('Facebook Redirect fallback error:', redirectErr);
            setError('Facebook sign-in popup was blocked by your browser. Please allow pop-ups for this site.');
          }
        } else if (firebaseError.code !== 'auth/popup-closed-by-user') {
          setError(firebaseError.message || 'Failed to sign in with Facebook.');
        }
      }
    } else {
      // Fallback in simulated mode
      setTimeout(() => {
        onLoginSuccess({
          name: 'Facebook Player (Demo)',
          email: 'facebook.demo@picklepoint.com',
          role: 'player',
          isAdmin: false
        });
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

        {isRegisteredSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 text-left animate-fade-in flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-brand-emerald flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Registration Confirmed!</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                A confirmation email has been dispatched. Please log in with your new password to complete your Company & GCash facility onboarding.
              </p>
            </div>
          </div>
        )}

        {invitedEmail && !isRegisteredSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-left animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-brand-lime text-xs uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-brand-lime" /> Client Admin Invitation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have been invited as Client Admin {invitedCompany ? `for ${invitedCompany}` : ''}! Sign in or register to claim your dashboard privileges.
            </p>
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
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
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-slate-400 text-base font-normal mt-1.5">Sign in to your PicklePoint account</p>
        </div>

        {/* Social Sign-In buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dark-border bg-slate-900/60 hover:bg-dark-hover hover:border-slate-700/80 text-base font-semibold text-slate-200 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Google
          </button>
          
          <button
            type="button"
            onClick={handleFacebookSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dark-border bg-slate-900/60 hover:bg-dark-hover hover:border-slate-700/80 text-base font-semibold text-slate-200 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <svg className="w-4.5 h-4.5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-dark-border/40"></div>
          <span className="flex-shrink mx-4 text-xs font-normal text-slate-500 uppercase tracking-widest">Or email sign in</span>
          <div className="flex-grow border-t border-dark-border/40"></div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-normal flex items-start gap-2.5 animate-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900 border border-dark-border text-white text-base font-normal rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-brand-lime transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-sm font-medium text-brand-lime hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-dark-border text-white text-base font-normal rounded-xl pl-10 pr-10 py-3.5 focus:outline-none focus:border-brand-lime transition-all"
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

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl text-base font-semibold text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] shadow-lg shadow-brand-lime/10 hover:scale-[1.01]'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials Info */}
        <div className="mt-6 p-3 rounded-xl bg-slate-900/60 border border-dark-border/50 text-xs font-normal text-slate-400 text-left">
          <p className="text-sm font-medium text-slate-300 mb-0.5">Demo Credentials:</p>
          <p>Email: <span className="text-brand-lime">demo@picklepoint.com</span></p>
          <p>Password: <span className="text-brand-lime">password123</span></p>
        </div>

        {/* Direct to Sign Up */}
        <div className="mt-8 pt-6 border-t border-dark-border/50 text-center text-base font-normal text-slate-400">
          Don't have an account?{' '}
          <button
            onClick={() => setView('register')}
            className="text-brand-lime hover:underline font-semibold cursor-pointer"
          >
            Sign up for free
          </button>
        </div>
      </div>
    </div>
  );
}
