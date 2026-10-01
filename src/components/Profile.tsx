import React, { useState, useEffect } from 'react';
import {
  User,
  Check,
  Loader2,
  RotateCcw,
  AlertCircle,
  X,
  CloudRain,
} from 'lucide-react';
import type { Voucher } from './AdminDashboard';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import type { OpenPlayRegistration } from './OpenPlayDetails';

import { PlayerSidebar, type PlayerTabType } from './player/PlayerSidebar';
import { PlayerHeader } from './player/PlayerHeader';
import { PlayerOverviewTab } from './player/tabs/PlayerOverviewTab';
import { PlayerBookingsTab } from './player/tabs/PlayerBookingsTab';
import { PlayerPassesTab } from './player/tabs/PlayerPassesTab';
import { PlayerOpenPlayTab } from './player/tabs/PlayerOpenPlayTab';
import { PlayerVouchersTab } from './player/tabs/PlayerVouchersTab';
import { PlayerSettingsTab } from './player/tabs/PlayerSettingsTab';

export interface Booking {
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
    duprId?: string;
    skillRating?: string;
    playStyle?: string;
  } | null;
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay') => void;
  onLogout: () => void;
  setOpenPlayEventId?: (id: string | null) => void;
}

export default function Profile({ user, setView, onLogout, setOpenPlayEventId }: ProfileProps) {
  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<PlayerTabType>('overview');

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected QR Pass Lightbox Modal
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);

  // Cancel / Refund Request Modal State
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(null);
  const [requestReasonCategory, setRequestReasonCategory] = useState<string>('Schedule Conflict');
  const [requestReasonNotes, setRequestReasonNotes] = useState('');
  const [submittingRefundRequest, setSubmittingRefundRequest] = useState(false);
  const [refundRequestSuccess, setRefundRequestSuccess] = useState(false);

  // User activity data
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
  const [courts, setCourts] = useState<CourtItem[]>([]);
  const [selectedPolicyCourtId, setSelectedPolicyCourtId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);

  // Local User State
  const [currentUserData, setCurrentUserData] = useState<any>(user);

  useEffect(() => {
    if (user) {
      setCurrentUserData(user);
      loadUserProfileAndActivity();
    }
  }, [user]);

  const totalAvailableCredits = myVouchers.reduce((acc, v) => {
    if (v.discountType === 'fixed_amount' || !v.discountType || (v.discountType as string) === 'fixed') {
      return acc + (v.discountValue || 0);
    }
    return acc;
  }, 0);

  const loadUserProfileAndActivity = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      let loadedPhone = user.phone || '';
      let loadedDupr = user.duprId || '';

      try {
        const localSavedDupr = localStorage.getItem('picklepoint_user_duprId');
        if (localSavedDupr) loadedDupr = localSavedDupr;
      } catch (e) {}

      // 1. Fetch user doc details
      if (isFirebaseConfigured && db && user.uid) {
        try {
          const uSnap = await getDoc(doc(db, 'users', user.uid));
          if (uSnap.exists()) {
            const data = uSnap.data();
            loadedPhone = data.phone || loadedPhone;
            loadedDupr = data.duprId || loadedDupr;
            setCurrentUserData((prev: any) => ({
              ...prev,
              name: data.name || prev?.name,
              phone: loadedPhone,
              duprId: loadedDupr,
            }));
          }
        } catch (e) {
          console.warn('Error fetching user profile from Firestore:', e);
        }
      }

      // Helper to match booking to current user
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

      // 2. Fetch court bookings for this user
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
          console.warn('Error fetching bookings from Firestore:', e);
        }
      }

      // Check LocalStorage
      try {
        const localStr = localStorage.getItem('picklepoint_bookings') || sessionStorage.getItem('picklepoint_bookings');
        if (localStr) {
          const localBookings = JSON.parse(localStr) as Booking[];
          localBookings.forEach((b) => {
            if (isUserBooking(b)) {
              bookingsMap.set(b.id || b.bookingId || 'local-' + Math.random(), b);
            }
          });
        }
      } catch (e) {}

      const sortedBookings = Array.from(bookingsMap.values()).sort(
        (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
      setMyBookings(sortedBookings);

      // 3. Fetch Open Play Registrations
      const regsMap = new Map<string, OpenPlayRegistration>();

      if (isFirebaseConfigured && db) {
        try {
          const rSnap = await getDocs(collection(db, 'openplay_registrations'));
          rSnap.forEach((dSnap) => {
            const rData = dSnap.data() as any;
            if (isUserBooking(rData)) {
              regsMap.set(dSnap.id, { ...rData, id: dSnap.id });
            }
          });
        } catch (e) {
          console.warn('Error fetching openplay registrations from Firestore:', e);
        }
      }

      try {
        const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations') || sessionStorage.getItem('picklepoint_openplay_registrations');
        if (localRegsStr) {
          const localRegs = JSON.parse(localRegsStr) as OpenPlayRegistration[];
          localRegs.forEach((r) => {
            if (isUserBooking(r)) {
              regsMap.set(r.id, r);
            }
          });
        }
      } catch (e) {}

      const sortedRegs = Array.from(regsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMyRegistrations(sortedRegs);

      // 4. Fetch Vouchers
      const vouchersMap = new Map<string, Voucher>();
      if (isFirebaseConfigured && db) {
        try {
          const vSnap = await getDocs(collection(db, 'vouchers'));
          vSnap.forEach((dSnap) => {
            const vData = dSnap.data() as any;
            if (vData.isPublic || (vData.userEmail && vData.userEmail.toLowerCase() === user.email.toLowerCase())) {
              vouchersMap.set(dSnap.id, { ...vData, id: dSnap.id });
            }
          });
        } catch (e) {}
      }

      try {
        const localVoucherStr = localStorage.getItem('picklepoint_vouchers');
        if (localVoucherStr) {
          const localVouchers = JSON.parse(localVoucherStr) as Voucher[];
          localVouchers.forEach((v) => vouchersMap.set(v.id, v));
        }
      } catch (e) {}

      setMyVouchers(Array.from(vouchersMap.values()));

      // 5. Fetch Courts for Venue Policies
      if (isFirebaseConfigured && db) {
        try {
          const cSnap = await getDocs(collection(db, 'courts'));
          const loadedCourts: CourtItem[] = [];
          cSnap.forEach((docSnap) => {
            loadedCourts.push({ id: docSnap.id, ...docSnap.data() } as CourtItem);
          });
          setCourts(loadedCourts);
          if (loadedCourts.length > 0) {
            setSelectedPolicyCourtId(loadedCourts[0].id);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Profile activity fetch error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdateUserData = (updated: any) => {
    setCurrentUserData(updated);
  };

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setView('landing');
  };

  const handleOpenOpenPlayDetails = (eventId: string) => {
    if (setOpenPlayEventId) {
      setOpenPlayEventId(eventId);
    }
    setView('openplay');
  };

  const handleSubmitPlayerRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalBooking) return;
    setSubmittingRefundRequest(true);
    setRefundRequestSuccess(false);

    try {
      const bId = refundModalBooking.id;
      const fullReason = `[${requestReasonCategory}] ${requestReasonNotes.trim() || 'Player requested cancellation.'}`;
      const timestamp = new Date().toISOString();

      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'bookings', bId), {
            refundRequested: true,
            refundRequestReason: fullReason,
            refundRequestedAt: timestamp,
            refundRequestStatus: 'pending',
            status: 'cancelled',
          });
        } catch (err) {}
      }

      setMyBookings((prev) =>
        prev.map((b) =>
          b.id === bId
            ? {
                ...b,
                refundRequested: true,
                refundRequestReason: fullReason,
                refundRequestedAt: timestamp,
                refundRequestStatus: 'pending',
                status: 'cancelled',
              }
            : b
        )
      );

      setRefundRequestSuccess(true);
      setTimeout(() => {
        setRefundRequestSuccess(false);
        setRefundModalBooking(null);
      }, 2500);
    } catch (err) {
      alert('Failed to process cancellation request.');
    } finally {
      setSubmittingRefundRequest(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <User className="w-16 h-16 text-slate-600 animate-pulse" />
        <h2 className="text-2xl font-black text-white">Player Authentication Required</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Please sign in to your PicklePoint account to view your court reservations, QR match passes, and Open Play rosters.
        </p>
        <button
          onClick={() => setView('login')}
          className="px-6 py-3 rounded-2xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer shadow-lg"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  const selectedCourtPolicy = courts.find((c) => c.id === selectedPolicyCourtId);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col lg:flex-row relative">
      {/* 1. Admin-Style Player Sidebar Navigation */}
      <PlayerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={currentUserData}
        bookingsCount={myBookings.filter((b) => b.status !== 'cancelled' && b.paymentStatus !== 'refunded').length}
        openPlayCount={myRegistrations.filter((r) => r.status !== 'cancelled').length}
        vouchersCount={myVouchers.length}
        onLogout={onLogout}
        onGoHome={handleGoHome}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* 2. Main Dashboard Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header Bar */}
        <PlayerHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={currentUserData}
          onLogout={onLogout}
          onGoHome={handleGoHome}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {loadingData ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Loading Player Dashboard...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <PlayerOverviewTab
                  user={currentUserData}
                  bookings={myBookings}
                  openPlayRegs={myRegistrations}
                  vouchers={myVouchers}
                  totalAvailableCredits={totalAvailableCredits}
                  setActiveTab={setActiveTab}
                  onGoHome={handleGoHome}
                />
              )}

              {activeTab === 'bookings' && (
                <PlayerBookingsTab
                  bookings={myBookings}
                  onCancelBooking={(id) => {
                    const found = myBookings.find((b) => b.id === id);
                    if (found) setRefundModalBooking(found);
                  }}
                  onOpenQrPass={(b) => setSelectedPassBooking(b)}
                  onGoHome={handleGoHome}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}

              {activeTab === 'passes' && (
                <PlayerPassesTab
                  bookings={myBookings}
                  user={currentUserData}
                  onGoHome={handleGoHome}
                />
              )}

              {activeTab === 'openplay' && (
                <PlayerOpenPlayTab
                  openPlayRegs={myRegistrations}
                  onGoHome={handleGoHome}
                  onOpenEventDetails={handleOpenOpenPlayDetails}
                />
              )}

              {activeTab === 'vouchers' && (
                <PlayerVouchersTab
                  vouchers={myVouchers}
                  totalAvailableCredits={totalAvailableCredits}
                  onGoHome={handleGoHome}
                />
              )}

              {activeTab === 'policies' && (
                <div className="space-y-6 text-left animate-fade-in max-w-4xl">
                  <div className="glass-panel border border-slate-800 bg-slate-900/60 rounded-3xl p-6 shadow-xl space-y-4">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-black uppercase tracking-wider">
                        Venue Guidelines
                      </span>
                      <h3 className="text-xl font-black text-white mt-1">Court Cancellation & Weather Policies</h3>
                      <p className="text-xs text-slate-400">
                        Select a partner venue to review specific rules and rain-check credit policies.
                      </p>
                    </div>

                    {courts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {courts.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedPolicyCourtId(c.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              selectedPolicyCourtId === c.id
                                ? 'bg-brand-lime text-slate-950 font-black shadow-md'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCourtPolicy?.policies ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-2">
                        <h4 className="text-xs font-extrabold text-brand-lime uppercase tracking-wider flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4" /> Cancellation Policy
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {selectedCourtPolicy.policies.cancellationPolicy || 'Standard 24-hour advance cancellation required for full store credit refund.'}
                        </p>
                      </div>

                      <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-5 space-y-2">
                        <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CloudRain className="w-4 h-4" /> Inclement Weather Policy
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {selectedCourtPolicy.policies.weatherPolicy || 'Rain-check credits issued automatically for outdoor courts affected by rain or wet surfaces.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-6 text-xs text-slate-400">
                      Standard PicklePoint venue policies apply: Cancellations requested at least 24 hours prior to game time are eligible for 100% store credit refund.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <PlayerSettingsTab
                  user={currentUserData}
                  onUpdateUser={handleUpdateUserData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* QR Code Pass Lightbox Modal */}
      {selectedPassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-emerald-500/40 bg-[#090d16] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedPassBooking(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                ENTRY PASS
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {selectedPassBooking.courtName}
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 inline-block mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  selectedPassBooking.bookingId || selectedPassBooking.id
                )}&color=a6e224&bgcolor=090d16`}
                alt="QR Pass"
                className="w-48 h-48 object-contain rounded-xl mx-auto"
              />
            </div>

            <div className="text-xs text-slate-300 font-mono space-y-1 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div>Date: {selectedPassBooking.date}</div>
              <div className="text-brand-lime font-bold">Hours: {selectedPassBooking.slots?.join(', ')}</div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPassBooking(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* Cancel Reservation Modal */}
      {refundModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 bg-slate-900 rounded-3xl p-6 max-w-md w-full text-left space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" /> Cancel Reservation
              </h3>
              <button
                type="button"
                onClick={() => setRefundModalBooking(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundRequestSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Cancellation requested successfully!
              </div>
            ) : (
              <form onSubmit={handleSubmitPlayerRefundRequest} className="space-y-4 text-xs">
                <p className="text-slate-300">
                  Cancel reservation for <strong className="text-white font-bold">{refundModalBooking.courtName}</strong> on <strong className="text-brand-lime">{refundModalBooking.date}</strong>?
                </p>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 uppercase tracking-wider block">
                    Reason for Cancellation
                  </label>
                  <select
                    value={requestReasonCategory}
                    onChange={(e) => setRequestReasonCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-lime"
                  >
                    <option value="Schedule Conflict">Schedule Conflict</option>
                    <option value="Weather Concern">Weather Concern</option>
                    <option value="Personal Emergency">Personal Emergency</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 uppercase tracking-wider block">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={requestReasonNotes}
                    onChange={(e) => setRequestReasonNotes(e.target.value)}
                    placeholder="Provide details for venue staff..."
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-brand-lime"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundModalBooking(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white font-bold cursor-pointer"
                  >
                    Keep Booking
                  </button>

                  <button
                    type="submit"
                    disabled={submittingRefundRequest}
                    className="px-4 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {submittingRefundRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Cancellation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
