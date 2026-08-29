import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Trophy,
  Calendar,
  Clock,
  Check,
  Loader2,
  ArrowLeft,
  Ticket,
  Save,
  UserCheck,
  Tag,
  RotateCcw,
  QrCode,
  AlertCircle,
  FileText,
  X,
  CloudRain,
  ShieldCheck,
  Building2,
  Search,
  ArrowUpDown,
  Copy,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { Voucher } from './AdminDashboard';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import type { OpenPlayRegistration } from './OpenPlayDetails';

interface Booking {
  id: string;
  bookingId?: string;
  bookingReference?: string;
  type?: 'court' | 'open_play' | 'openplay' | 'tournament' | 'bootcamp' | 'coaching';
  openPlayEventId?: string;
  openPlayTitle?: string;
  openPlayCategory?: string;
  courtId: string;
  courtName: string;
  courtType?: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
  date: string;
  slots: string[];
  totalCost: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  status?: string;
  paymentStatus?: 'pending_verification' | 'paid' | 'failed' | 'cancelled' | string;
  refundReceiptUrl?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  refundRequested?: boolean;
  refundRequestReason?: string;
  refundRequestedAt?: string;
  refundRequestStatus?: 'pending' | 'approved' | 'rejected';
  rentals?: any[];
}

interface CourtPolicies {
  cancellationPolicy?: string;
  rulesPolicy?: string;
  weatherPolicy?: string;
  equipmentPolicy?: string;
}

interface CourtItem {
  id: string;
  name: string;
  location?: string;
  policies?: CourtPolicies;
}

interface ProfileProps {
  user: {
    uid?: string;
    name: string;
    email: string;
    role?: string;
    isAdmin?: boolean;
    phone?: string;
    skillRating?: string;
    playStyle?: string;
  } | null;
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile') => void;
  onLogout: () => void;
}

export default function Profile({ user, setView, onLogout }: ProfileProps) {
  // Dashboard Tabs State
  const [activeTab, setActiveTab] = useState<'details' | 'bookings' | 'passes' | 'openplay' | 'vouchers' | 'policies'>('bookings');

  // Player Refund Request Modal State
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(null);
  const [requestReasonCategory, setRequestReasonCategory] = useState<string>('Schedule Conflict');
  const [requestReasonNotes, setRequestReasonNotes] = useState('');
  const [submittingRefundRequest, setSubmittingRefundRequest] = useState(false);
  const [refundRequestSuccess, setRefundRequestSuccess] = useState(false);

  // Venue Policies State
  const [courts, setCourts] = useState<CourtItem[]>([]);
  const [selectedPolicyCourtId, setSelectedPolicyCourtId] = useState<string>('');

  // Reservation Filter & Search State
  const [bookingFilterStatus, setBookingFilterStatus] = useState<'all' | 'approved' | 'pending' | 'refunded' | 'rebooking' | 'cancelled'>('all');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingSortOrder, setBookingSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Profile editable fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [skillRating, setSkillRating] = useState(user?.skillRating || '3.5');
  const [playStyle, setPlayStyle] = useState(user?.playStyle || 'Doubles');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User activity data
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

  const totalAvailableCredits = myVouchers.reduce((acc, v) => {
    if (v.discountType === 'fixed_amount' || !v.discountType) {
      return acc + (v.discountValue || 0);
    }
    return acc;
  }, 0);

  useEffect(() => {
    if (user) {
      setName(user.name);
      loadUserProfileAndActivity();
    }
  }, [user]);

  const loadUserProfileAndActivity = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      let loadedPhone = user.phone || '';
      let loadedRating = user.skillRating || '3.5';
      let loadedStyle = user.playStyle || 'Doubles';

      // 1. Fetch user doc details
      if (isFirebaseConfigured && db && user.uid) {
        try {
          const uSnap = await getDoc(doc(db, 'users', user.uid));
          if (uSnap.exists()) {
            const data = uSnap.data();
            loadedPhone = data.phone || loadedPhone;
            loadedRating = data.skillRating || loadedRating;
            loadedStyle = data.playStyle || loadedStyle;
            if (data.name) setName(data.name);
          }
        } catch (e) {
          console.warn('Error fetching user profile from Firestore:', e);
        }
      }

      setPhone(loadedPhone);
      setSkillRating(loadedRating);
      setPlayStyle(loadedStyle);

      // Helper to match booking to current user across all email & UID property variations
      const isUserBooking = (b: any) => {
        if (!user) return false;
        const targetEmail = user.email?.trim().toLowerCase();
        const targetUid = user.uid;

        const bEmail = (b.user?.email || b.userEmail || b.customerEmail || b.email || '').trim().toLowerCase();
        const bUid = b.user?.uid || b.userId;

        if (targetEmail && bEmail === targetEmail) return true;
        if (targetUid && bUid && bUid === targetUid) return true;
        return false;
      };

      // 2. Fetch court bookings for this user (merging Cloud Firestore & LocalStorage)
      const bookingsMap = new Map<string, Booking>();

      if (isFirebaseConfigured && db) {
        try {
          const bSnap = await getDocs(collection(db, 'bookings'));
          bSnap.forEach((dSnap) => {
            const bData = dSnap.data() as any;
            if (isUserBooking(bData)) {
              bookingsMap.set(dSnap.id, { ...bData, id: dSnap.id });
            }
          });
        } catch (e) {
          console.warn('Firestore fetch user bookings error:', e);
        }
      }

      const localStr = localStorage.getItem('picklepoint_bookings');
      if (localStr) {
        try {
          const allB = JSON.parse(localStr) as any[];
          allB.forEach((b) => {
            if (isUserBooking(b)) {
              const key = b.id || b.bookingId || b.bookingReference;
              if (key && !bookingsMap.has(key)) {
                bookingsMap.set(key, { ...b, id: key });
              }
            }
          });
        } catch (e) {
          console.warn('LocalStorage parse error for bookings:', e);
        }
      }

      const bookingsList = Array.from(bookingsMap.values());
      bookingsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setMyBookings(bookingsList);

      // 3. Fetch Open Play Registrations for this user (merging Cloud Firestore & LocalStorage)
      const regsMap = new Map<string, OpenPlayRegistration>();

      if (isFirebaseConfigured && db) {
        try {
          const rSnap = await getDocs(collection(db, 'openplay_registrations'));
          rSnap.forEach((dSnap) => {
            const rData = dSnap.data() as OpenPlayRegistration;
            const rEmail = (rData.playerEmail || '').trim().toLowerCase();
            if (rEmail === user.email.toLowerCase() || (user.uid && rData.playerUid === user.uid)) {
              regsMap.set(dSnap.id, { ...rData, id: dSnap.id });
            }
          });
        } catch (e) {
          console.warn('Firestore fetch user openplay regs error:', e);
        }
      }

      const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations');
      if (localRegsStr) {
        try {
          const allRegs = JSON.parse(localRegsStr) as OpenPlayRegistration[];
          allRegs.forEach((r) => {
            const rEmail = (r.playerEmail || '').trim().toLowerCase();
            if (rEmail === user.email.toLowerCase() || (user.uid && r.playerUid === user.uid)) {
              const key = r.id || (r as any).registrationId;
              if (key && !regsMap.has(key)) {
                regsMap.set(key, { ...r, id: key });
              }
            }
          });
        } catch (e) {
          console.warn('LocalStorage parse error for openplay regs:', e);
        }
      }

      const regsList = Array.from(regsMap.values());
      regsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setMyRegistrations(regsList);

      // 4. Fetch Credit Vouchers for this user (merging Cloud Firestore & LocalStorage)
      const vouchersMap = new Map<string, Voucher>();

      if (isFirebaseConfigured && db) {
        try {
          const vSnap = await getDocs(collection(db, 'vouchers'));
          vSnap.forEach((dSnap) => {
            const vData = dSnap.data() as Voucher;
            const vEmail = (vData.issuedToEmail || '').trim().toLowerCase();
            if (vEmail === user.email.toLowerCase() && vData.status === 'active') {
              vouchersMap.set(dSnap.id, { ...vData, id: dSnap.id });
            }
          });
        } catch (e) {
          console.warn('Firestore fetch user vouchers error:', e);
        }
      }

      const localVStr = localStorage.getItem('picklepoint_vouchers');
      if (localVStr) {
        try {
          const allV = JSON.parse(localVStr) as Voucher[];
          allV.forEach((v) => {
            const vEmail = (v.issuedToEmail || '').trim().toLowerCase();
            if (vEmail === user.email.toLowerCase() && v.status === 'active') {
              const key = v.id || v.code;
              if (key && !vouchersMap.has(key)) {
                vouchersMap.set(key, { ...v, id: key });
              }
            }
          });
        } catch (e) {
          console.warn('LocalStorage parse error for vouchers:', e);
        }
      }

      setMyVouchers(Array.from(vouchersMap.values()));

      // 5. Fetch Courts list for Venue Policies tab
      let courtsList: CourtItem[] = [];
      if (isFirebaseConfigured && db) {
        try {
          const cSnap = await getDocs(collection(db, 'courts'));
          cSnap.forEach((dSnap) => {
            courtsList.push({ ...(dSnap.data() as any), id: dSnap.id });
          });
        } catch (e) {
          console.warn('Firestore fetch courts error:', e);
        }
      }

      if (courtsList.length === 0) {
        const localCStr = localStorage.getItem('picklepoint_courts');
        if (localCStr) {
          try {
            courtsList = JSON.parse(localCStr);
          } catch (e) {}
        }
      }

      setCourts(courtsList);
      if (courtsList.length > 0 && !selectedPolicyCourtId) {
        setSelectedPolicyCourtId(courtsList[0].id);
      }

    } catch (err) {
      console.error('Error loading user profile & activity:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveSuccess(false);

    const updatedProfile = {
      name: name.trim() || user.name,
      phone: phone.trim(),
      skillRating: skillRating,
      playStyle: playStyle,
    };

    try {
      if (isFirebaseConfigured && db && user.uid) {
        try {
          await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
        } catch (cloudErr) {
          console.warn('Firestore profile update failed, persisting locally:', cloudErr);
        }
      }

      // Update session in localStorage
      const savedUserStr = localStorage.getItem('picklepoint_session');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        localStorage.setItem('picklepoint_session', JSON.stringify({ ...parsed, ...updatedProfile }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleProcessRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalBooking || !user) return;

    setSubmittingRefundRequest(true);
    const fullReason = `${requestReasonCategory}${requestReasonNotes.trim() ? `: ${requestReasonNotes.trim()}` : ''}`;
    const timestamp = new Date().toISOString();

    try {
      if (isFirebaseConfigured && db) {
        try {
          const bookingRef = doc(db, 'bookings', refundModalBooking.id);
          await updateDoc(bookingRef, {
            refundRequested: true,
            refundRequestReason: fullReason,
            refundRequestedAt: timestamp,
            refundRequestStatus: 'pending'
          });
        } catch (cloudErr) {
          console.warn('Firestore refund request update failed, storing fallback:', cloudErr);
        }
      }

      // LocalStorage fallback update
      const bookingsStr = localStorage.getItem('picklepoint_bookings');
      if (bookingsStr) {
        const localBookings = JSON.parse(bookingsStr) as Booking[];
        const updated = localBookings.map((b: Booking) => {
          if (b.id === refundModalBooking.id || b.bookingId === refundModalBooking.id) {
            return {
              ...b,
              refundRequested: true,
              refundRequestReason: fullReason,
              refundRequestedAt: timestamp,
              refundRequestStatus: 'pending' as const
            };
          }
          return b;
        });
        localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
      }

      // Update state in component
      setMyBookings(prev => prev.map(b => {
        if (b.id === refundModalBooking.id) {
          return {
            ...b,
            refundRequested: true,
            refundRequestReason: fullReason,
            refundRequestedAt: timestamp,
            refundRequestStatus: 'pending'
          };
        }
        return b;
      }));

      setRefundRequestSuccess(true);
      setTimeout(() => {
        setRefundRequestSuccess(false);
        setRefundModalBooking(null);
        setRequestReasonNotes('');
      }, 2500);

    } catch (err) {
      console.error('Failed to submit refund request:', err);
      alert('Failed to submit refund request: ' + (err as Error).message);
    } finally {
      setSubmittingRefundRequest(false);
    }
  };

  // Filtered & Sorted Bookings Memo
  const filteredBookings = React.useMemo(() => {
    return myBookings
      .filter((b) => {
        // 1. Status Filter
        if (bookingFilterStatus === 'approved') {
          if (b.status !== 'approved' && b.paymentStatus !== 'paid') return false;
          if (b.refundRequested || b.paymentStatus === 'refunded' || b.paymentStatus === 'rebooking_credit' || b.paymentStatus === 'cancelled_no_refund') return false;
        } else if (bookingFilterStatus === 'pending') {
          if (b.status !== 'pending' && b.paymentStatus !== 'pending_verification' && b.paymentStatus !== 'pending') return false;
          if (b.refundRequested) return false;
        } else if (bookingFilterStatus === 'refunded') {
          if (!b.refundRequested && b.paymentStatus !== 'refunded') return false;
        } else if (bookingFilterStatus === 'rebooking') {
          if (b.paymentStatus !== 'rebooking_credit') return false;
        } else if (bookingFilterStatus === 'cancelled') {
          if (b.status !== 'cancelled' && b.paymentStatus !== 'failed' && b.paymentStatus !== 'cancelled_no_refund') return false;
        }

        // 2. Text Search Query
        if (bookingSearchQuery.trim()) {
          const query = bookingSearchQuery.trim().toLowerCase();
          const courtMatch = (b.courtName || '').toLowerCase().includes(query);
          const refMatch = (b.bookingReference || b.id || '').toLowerCase().includes(query);
          const dateMatch = (b.date || '').toLowerCase().includes(query);
          if (!courtMatch && !refMatch && !dateMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return bookingSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [myBookings, bookingFilterStatus, bookingSearchQuery, bookingSortOrder]);

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mb-4">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
        <p className="text-slate-400 text-xs mb-6">Please log in to view your profile and reservation history.</p>
        <button
          onClick={() => setView('login')}
          className="px-6 py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 py-12 px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-brand-lime/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-brand-emerald/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setView('landing');
            }}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer group uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </button>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>

        {/* User Banner Header Card */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-lime to-brand-emerald text-dark-bg flex items-center justify-center font-black text-3xl shadow-xl border-2 border-slate-900 flex-shrink-0">
              {name ? name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-white">{name || user.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[10px] font-black uppercase tracking-wider">
                  {user.role || 'Player'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-lime" /> {user.email}
                </span>
                {phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-emerald" /> {phone}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
              <div
                onClick={() => setActiveTab('bookings')}
                className="text-center px-2 sm:px-3 border-r border-slate-800 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bookings</div>
                <div className="text-lg font-black text-white font-mono">{myBookings.length}</div>
              </div>
              <div
                onClick={() => setActiveTab('openplay')}
                className="text-center px-2 sm:px-3 border-r border-slate-800 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Play</div>
                <div className="text-lg font-black text-brand-lime font-mono">{myRegistrations.length}</div>
              </div>
              <div
                onClick={() => setActiveTab('vouchers')}
                className="text-center px-2 sm:px-3 cursor-pointer hover:opacity-80 transition-opacity"
                title="View Active Store Credits"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Tag className="w-2.5 h-2.5 text-brand-lime" /> Credits
                </div>
                <div className="text-lg font-black text-brand-lime font-mono">
                  {myVouchers.length > 0 ? `₱${totalAvailableCredits.toLocaleString()}` : '₱0'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-dark-border/60 pb-3">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Reservations ({myBookings.length})
          </button>

          <button
            onClick={() => setActiveTab('passes')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'passes'
                ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" /> QR Match Passes ({myBookings.filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'refunded').length})
          </button>

          <button
            onClick={() => setActiveTab('openplay')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'openplay'
                ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" /> Open Play ({myRegistrations.length})
          </button>

          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'vouchers'
                ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" /> Credit Vouchers ({myVouchers.length})
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'policies'
                ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Venue Policies
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" /> Player Preferences
          </button>
        </div>

        {/* TAB 1: EDIT PROFILE FORM */}
        {activeTab === 'details' && (
          <form onSubmit={handleSaveProfile} className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 animate-fade-in">
            <div className="mb-6 pb-4 border-b border-dark-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-lime" /> Player Profile Information
              </h3>
              <p className="text-xs text-slate-400 mt-1">Update your player contact details, skill level rating, and preferred game format.</p>
            </div>

            {saveSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4" /> Profile details updated successfully!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">Account Email (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-slate-950 border border-dark-border text-slate-400 text-xs font-medium rounded-xl px-4 py-3 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">Contact Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">Preferred Game Format</label>
                <select
                  value={playStyle}
                  onChange={(e) => setPlayStyle(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                >
                  <option value="Doubles">Doubles Play</option>
                  <option value="Singles">Singles Play</option>
                  <option value="Both">Both Doubles & Singles</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-dark-border/60 mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-3 px-6 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10 flex items-center gap-2 hover:scale-[1.01]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: MY COURT BOOKINGS & REFUND REQUESTS */}
        {activeTab === 'bookings' && (
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 animate-fade-in text-left">
            <div className="mb-6 pb-4 border-b border-dark-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-brand-lime" /> My Court Reservations & Refunds
                </h3>
                <p className="text-xs text-slate-400 mt-1">View your booking history, schedule details, and request refunds for eligible reservations.</p>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearchQuery}
                    onChange={(e) => setBookingSearchQuery(e.target.value)}
                    placeholder="Search by court name, date, or ref code..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-brand-lime transition-all"
                  />
                  {bookingSearchQuery && (
                    <button
                      onClick={() => setBookingSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Order Selector */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-brand-lime" /> Sort:
                  </label>
                  <select
                    value={bookingSortOrder}
                    onChange={(e) => setBookingSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="bg-slate-900 border border-slate-800 text-xs font-bold text-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-lime cursor-pointer transition-all"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'All Reservations', count: myBookings.length },
                  {
                    key: 'approved',
                    label: 'Approved',
                    count: myBookings.filter(b => (b.status === 'approved' || b.paymentStatus === 'paid') && !b.refundRequested && b.paymentStatus !== 'refunded' && b.paymentStatus !== 'rebooking_credit' && b.paymentStatus !== 'cancelled_no_refund').length
                  },
                  {
                    key: 'pending',
                    label: 'Pending',
                    count: myBookings.filter(b => (b.status === 'pending' || b.paymentStatus === 'pending_verification' || b.paymentStatus === 'pending') && !b.refundRequested).length
                  },
                  {
                    key: 'refunded',
                    label: 'Refunds / Requested',
                    count: myBookings.filter(b => b.refundRequested || b.paymentStatus === 'refunded').length
                  },
                  {
                    key: 'rebooking',
                    label: 'Rebooking Credit',
                    count: myBookings.filter(b => b.paymentStatus === 'rebooking_credit').length
                  },
                  {
                    key: 'cancelled',
                    label: 'Cancelled',
                    count: myBookings.filter(b => b.status === 'cancelled' || b.paymentStatus === 'failed' || b.paymentStatus === 'cancelled_no_refund').length
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setBookingFilterStatus(tab.key as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      bookingFilterStatus === tab.key
                        ? 'bg-brand-lime text-dark-bg shadow-sm'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      bookingFilterStatus === tab.key ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loadingData ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-lime" /> Loading your reservations...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-xs">
                No court bookings match your selected filter criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((b) => {
                  const isEligibleForRefund = b.paymentStatus === 'paid' || b.status === 'approved';
                  return (
                    <div key={b.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-md">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-extrabold text-white">
                              {b.ownerCompanyName && b.ownerCompanyName !== b.courtName
                                ? `${b.ownerCompanyName} — ${b.courtName}`
                                : b.courtName}
                            </h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              b.paymentStatus === 'refunded'
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                : b.paymentStatus === 'rebooking_credit'
                                ? 'bg-brand-lime/15 border-brand-lime/30 text-brand-lime'
                                : b.paymentStatus === 'cancelled_no_refund'
                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                : b.refundRequested
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse'
                                : b.status === 'cancelled' || b.paymentStatus === 'failed'
                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                : (b.status === 'pending' || b.paymentStatus === 'pending_verification' || b.paymentStatus === 'pending')
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                            }`}>
                              {b.paymentStatus === 'refunded'
                                ? `Refunded (${b.refundAmount ? `₱${b.refundAmount}` : 'Full'})`
                                : b.paymentStatus === 'rebooking_credit'
                                ? 'Voucher Issued (Rebooking)'
                                : b.paymentStatus === 'cancelled_no_refund'
                                ? 'Cancelled (Non-Refundable)'
                                : b.refundRequested
                                ? 'Refund Pending Review'
                                : b.paymentStatus === 'pending_verification' || b.status === 'pending' || b.paymentStatus === 'pending'
                                ? 'Pending'
                                : b.status === 'approved' || b.paymentStatus === 'paid'
                                ? 'Approved'
                                : b.status || 'Approved'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-brand-lime" /> {b.date}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400" /> {b.slots.join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</div>
                            <div className="text-base font-black text-brand-lime font-sans">₱{b.totalCost}</div>
                          </div>

                          {/* Request Refund Action Button */}
                          {isEligibleForRefund && !b.refundRequested && b.paymentStatus !== 'refunded' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundModalBooking(b);
                                setRequestReasonCategory('Schedule Conflict');
                                setRequestReasonNotes('');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow flex items-center gap-1.5 hover:scale-[1.02]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Request Refund
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Refund Request Info Banner if pending or processed */}
                      {b.refundRequested && (
                        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <RotateCcw className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Refund Request Submitted ({b.refundRequestStatus || 'pending'})</span>
                          </div>
                          {b.refundRequestReason && (
                            <p className="text-slate-300 italic text-[11px]">Reason: {b.refundRequestReason}</p>
                          )}
                        </div>
                      )}

                      {b.refundReason && b.paymentStatus === 'refunded' && (
                        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300 space-y-1">
                          <span className="font-bold block">Admin Refund Remarks:</span>
                          <p className="text-slate-300 italic text-[11px]">{b.refundReason}</p>
                        </div>
                      )}

                      {b.paymentStatus === 'rebooking_credit' && (
                        <div className="p-3.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-xs text-brand-lime space-y-1">
                          <div className="font-extrabold flex items-center gap-1.5">
                            <Tag className="w-4 h-4" /> Rebooking Credit Voucher Issued
                          </div>
                          <p className="text-[11px] text-slate-300">
                            {b.refundReason || 'A credit voucher has been added to your wallet for court rebooking.'}
                            {' '}Switch to the <strong>Credit Vouchers</strong> tab above to view and copy your voucher code.
                          </p>
                        </div>
                      )}

                      {b.paymentStatus === 'cancelled_no_refund' && (
                        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-xs text-red-400 space-y-1">
                          <div className="font-extrabold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" /> Cancelled Without Refund
                          </div>
                          <p className="text-[11px] text-red-300/90">
                            Reason: {b.refundReason || 'Cancelled per facility cancellation window policy.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIGITAL MATCH TICKETS & QR PASSES */}
        {activeTab === 'passes' && (
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 animate-fade-in text-left">
            <div className="mb-6 pb-4 border-b border-dark-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-brand-lime" /> Digital QR Entry Passes
                </h3>
                <p className="text-xs text-slate-400 mt-1">Present your digital check-in QR pass at the venue entrance scanner for instant court access.</p>
              </div>
            </div>

            {myBookings.filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'refunded').length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-xs">
                No active match passes available. Book a court to generate your QR entry pass.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myBookings
                  .filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'refunded')
                  .map((b) => (
                    <div key={b.id} className="p-6 rounded-3xl bg-slate-900/90 border border-brand-lime/30 space-y-5 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime/5 blur-xl pointer-events-none rounded-full"></div>

                      <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-extrabold text-brand-lime uppercase tracking-widest block">Official Entry Pass</span>
                          <h4 className="text-base font-extrabold text-white mt-0.5">{b.courtName}</h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-mono text-[10px] font-bold">
                          {b.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                          <span className="text-white font-bold">{b.date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Reserved Slots</span>
                          <span className="text-slate-300 font-semibold">{b.slots.join(', ')}</span>
                        </div>
                      </div>

                      {/* QR Pass Code Visual */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-2">
                        <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`PICKLEPOINT-PASS-${b.id}`)}`}
                            alt="QR Check-in Pass"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Scan at Court Gate</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY OPEN PLAY REGISTRATIONS */}
        {activeTab === 'openplay' && (
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 animate-fade-in">
            <div className="mb-6 pb-4 border-b border-dark-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand-lime" /> My Open Play Entries
                </h3>
                <p className="text-xs text-slate-400 mt-1">Review Open Play session registrations and payment status.</p>
              </div>
            </div>

            {loadingData ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-lime" /> Loading your Open Play entries...
              </div>
            ) : myRegistrations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-xs">
                No Open Play registrations found under {user.email}.
              </div>
            ) : (
              <div className="space-y-4">
                {myRegistrations.map((reg) => (
                  <div key={reg.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-white">{reg.eventTitle}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          reg.paymentStatus === 'paid'
                            ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                            : reg.paymentStatus === 'failed'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                          {reg.paymentStatus === 'pending_verification' ? 'Pending Review' : reg.paymentStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-lime" /> {reg.eventDate}
                        </span>
                        <span className="font-mono text-white font-bold">
                          GCash Ref: {reg.gcashReferenceNumber}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee</div>
                      <div className="text-base font-black text-brand-lime font-sans">
                        {(reg.registrationFee || 0) > 0 ? `₱${reg.registrationFee}` : 'FREE'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: VENUE POLICIES & COURT RULES */}
        {activeTab === 'policies' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white">Venue Rules & Facility Policies</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Review cancellation terms, court footwear rules, weather rainout credits, and equipment guidelines.
                    </p>
                  </div>
                </div>

                {/* Court Facility Selector */}
                {courts.length > 0 && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-lime" /> Court Venue:
                    </label>
                    <select
                      value={selectedPolicyCourtId}
                      onChange={(e) => setSelectedPolicyCourtId(e.target.value)}
                      className="px-4 py-2.5 bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100 rounded-xl focus:outline-none focus:border-brand-lime cursor-pointer transition-all shadow-sm"
                    >
                      {courts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Policy Cards Grid */}
              {(() => {
                const activeCourt = courts.find(c => c.id === selectedPolicyCourtId) || courts[0];
                const pol = activeCourt?.policies;

                const defaultCancellation = '• Full Refund (100%): Cancellations submitted at least 24 hours prior to scheduled court time.\n• 50% Credit Voucher: Cancellations submitted between 12 to 24 hours prior to start time.\n• Non-Refundable: Cancellations made within 12 hours of booking time are non-refundable.\n• Rebooking: Free date/time rescheduling allowed up to 12 hours before match.';
                const defaultRules = '1. Non-marking athletic court shoes are strictly required on all court surfaces.\n2. Paddle rotation rules apply during open play and peak hours.\n3. No glass containers, food, or alcohol allowed inside playing enclosures.\n4. Treat all players, staff, and opponents with sportsmanship and respect.';
                const defaultWeather = '• Weather Stoppage: For outdoor courts, matches interrupted by rain or severe weather before 30 minutes played will receive a 100% rebooking voucher.\n• Pro-Rated Voucher: Matches interrupted after 30 minutes will receive a 50% rebooking credit.\n• Indoor Courts: Indoor reservations remain unaffected by outdoor weather.';
                const defaultEquipment = '• Handle all rental paddles and ball bins with care.\n• Inspect equipment prior to play and report damage to front desk immediately.\n• Equipment must be returned promptly after your reserved time slot ends.';

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Cancellation & Refund Policy */}
                    <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-white">1. Cancellation & Refund Policy</h4>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {pol?.cancellationPolicy || defaultCancellation}
                      </p>
                    </div>

                    {/* 2. Court Rules */}
                    <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="p-2 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-white">2. Court Rules & Player Conduct</h4>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {pol?.rulesPolicy || defaultRules}
                      </p>
                    </div>

                    {/* 3. Rainout Policy */}
                    <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                          <CloudRain className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-white">3. Weather & Rainout Stoppage</h4>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {pol?.weatherPolicy || defaultWeather}
                      </p>
                    </div>

                    {/* 4. Equipment Guidelines */}
                    <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-white">4. Equipment Rental Guidelines</h4>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {pol?.equipmentPolicy || defaultEquipment}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 4: MY CREDIT VOUCHERS WALLET */}
        {activeTab === 'vouchers' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-brand-lime" /> My Credit Vouchers Wallet
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Store credits and rebooking vouchers issued to <strong className="text-slate-200">{user.email}</strong> for cancellations, weather stoppages, or venue promotions.
                  </p>
                </div>

                {myVouchers.length > 0 && (
                  <div className="flex items-center gap-3 bg-slate-950/80 border border-brand-lime/30 rounded-2xl px-4 py-2.5 shrink-0 shadow-lg">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Available Balance</span>
                      <span className="text-xl font-black text-brand-lime font-mono">₱{totalAvailableCredits.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setView('landing')}
                      className="px-3.5 py-2 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-lime-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-lime/20"
                    >
                      Book Court <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* How to Redeem Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-lime/10 to-emerald-950/20 border border-brand-lime/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-brand-lime shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block mb-0.5">How to Redeem Your Credits</span>
                    <span className="text-slate-400 leading-relaxed">
                      Copy your voucher code below, choose any court and schedule, and paste the code under <strong>"Voucher Code"</strong> on the Checkout page to automatically deduct the balance.
                    </span>
                  </div>
                </div>
              </div>

              {loadingData ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-lime" /> Loading your active credit vouchers...
                </div>
              ) : myVouchers.length === 0 ? (
                <div className="p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-center">
                  <Tag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white mb-1">No Active Credit Vouchers</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    You do not currently have any active credit vouchers. When a host issues a rebooking credit or weather stoppage refund, it will appear here automatically.
                  </p>
                  <button
                    onClick={() => setView('landing')}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
                  >
                    Browse Courts
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myVouchers.map((v) => (
                    <div key={v.id} className="p-5 rounded-2xl bg-slate-900/90 border border-brand-lime/30 space-y-4 relative overflow-hidden shadow-lg hover:border-brand-lime/60 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[10px] font-black uppercase tracking-wider">
                          {v.type === 'cancellation_credit' ? '🎟️ Rebooking Credit' : v.type.replace('_', ' ')}
                        </span>
                        {v.expiryDate ? (
                          (() => {
                            const expiryTime = new Date(`${v.expiryDate}T23:59:59`).getTime();
                            const nowTime = Date.now();
                            const diffDays = Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24));
                            const isExpired = diffDays < 0;

                            if (isExpired) {
                              return (
                                <span className="text-[10px] font-bold text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-md">
                                  Expired ({v.expiryDate})
                                </span>
                              );
                            }
                            if (diffDays <= 3) {
                              return (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md">
                                  ⚠️ {diffDays === 0 ? 'Expires today' : `Expires in ${diffDays}d`} ({v.expiryDate})
                                </span>
                              );
                            }
                            return (
                              <span className="text-xs font-mono text-slate-400">
                                ⏳ {diffDays}d left ({v.expiryDate})
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-xs font-mono text-slate-400">No Expiration</span>
                        )}
                      </div>

                      {v.companyName && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold bg-sky-950/40 border border-sky-800/40 rounded-xl px-3 py-1.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Valid at: {v.companyName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Voucher Code</span>
                          <div className="text-xl font-mono font-black text-brand-lime tracking-widest">{v.code}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Credit Value</span>
                          <div className="text-2xl font-extrabold text-white">
                            {v.discountType === 'percentage' ? `${v.discountValue}% OFF` : `₱${v.discountValue?.toLocaleString()} OFF`}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-2 text-xs">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(v.code);
                            setCopiedVoucherCode(v.code);
                            setTimeout(() => setCopiedVoucherCode(null), 2500);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                            copiedVoucherCode === v.code
                              ? 'bg-emerald-500 text-dark-bg font-black'
                              : 'bg-brand-lime/20 border border-brand-lime/40 text-brand-lime hover:bg-brand-lime hover:text-dark-bg'
                          }`}
                        >
                          {copiedVoucherCode === v.code ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copied to Clipboard!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setView('landing')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          Redeem Now <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PLAYER REQUEST REFUND MODAL */}
      {refundModalBooking && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-left">
          <div className="glass-panel border border-purple-500/30 rounded-3xl max-w-lg w-full shadow-2xl relative animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-dark-border flex items-center justify-between flex-shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Request Refund</h3>
                  <p className="text-xs text-slate-400">Submit cancellation refund request to court venue host</p>
                </div>
              </div>
              <button
                onClick={() => setRefundModalBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {refundRequestSuccess ? (
                <div className="p-6 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-center space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">Refund Request Submitted!</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your refund request has been sent to the court facility admin. You will receive an email update once processed.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleProcessRefundRequest} className="space-y-5">
                  {/* Reservation Summary */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Venue / Court:</span>
                      <span className="font-bold text-white">{refundModalBooking.courtName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Schedule:</span>
                      <span className="font-semibold text-slate-350">{refundModalBooking.date} ({refundModalBooking.slots.join(', ')})</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-800">
                      <span className="text-slate-400">Total Paid:</span>
                      <span className="font-extrabold text-brand-lime">₱{refundModalBooking.totalCost}</span>
                    </div>
                  </div>

                  {/* Reason Category Pills */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Select Cancellation Reason <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Schedule Conflict',
                        'Weather / Rainout',
                        'Health / Injury',
                        'Venue Issue',
                        'Personal Reason',
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setRequestReasonCategory(reason)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            requestReasonCategory === reason
                              ? 'bg-purple-600/30 border-purple-400 text-white shadow'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extra Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Additional Remarks / Notes
                    </label>
                    <textarea
                      rows={3}
                      value={requestReasonNotes}
                      onChange={(e) => setRequestReasonNotes(e.target.value)}
                      placeholder="Describe reason for requesting refund..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRefundModalBooking(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRefundRequest}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-purple-500 transition-all cursor-pointer shadow-lg shadow-purple-600/20 flex items-center gap-2"
                    >
                      {submittingRefundRequest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Submit Refund Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
