import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Calendar, Clock, MapPin,
  User, ShieldCheck, CheckCircle,
  AlertTriangle, Phone, Upload, Loader2, Search
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { resolveVenueNotificationRecipients, sendNewCheckoutAdminNotificationEmail } from '../services/emailService';

interface UploadReceiptPageProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'upload_receipt') => void;
}

interface BookingDetails {
  id?: string;
  sourceCollection?: 'bookings' | 'openplay_registrations';
  courtId: string;
  courtName: string;
  companyId?: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
  ownerEmail?: string;
  date: string;
  slots: string[];
  rentals: { id: string; name: string; price: number; pricingType: string; quantity: number }[];
  totalCost: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  bookingReference: string;
  status: 'pending' | 'confirmed' | 'approved' | 'cancelled' | 'failed';
  gcashReferenceNumber?: string;
  receiptImageUrl?: string;
}

const normalizeLoadedBooking = (
  docId: string,
  data: any,
  sourceCollection: 'bookings' | 'openplay_registrations' = 'bookings'
): BookingDetails => {
  const resolvedRef = data.bookingReference || data.bookingId || docId;
  const resolvedCourtName =
    data.courtName ||
    data.openPlayTitle ||
    data.eventTitle ||
    'Pickleball Court';
  const resolvedUserName =
    data.userName ||
    data.playerName ||
    data.user?.name ||
    'Player';
  const resolvedUserEmail =
    data.userEmail ||
    data.playerEmail ||
    data.user?.email ||
    '';
  const resolvedUserPhone =
    data.userPhone ||
    data.playerPhone ||
    data.user?.phone ||
    '';
  const resolvedTotalCost =
    typeof data.totalCost === 'number'
      ? data.totalCost
      : Number(data.totalAmountPaid ?? data.registrationFee ?? data.totalCost ?? 0) || 0;
  const resolvedDate = data.date || data.eventDate || '';
  const resolvedSlots = Array.isArray(data.slots) && data.slots.length > 0 ? data.slots : [];

  return {
    ...data,
    id: docId,
    sourceCollection,
    courtId: data.courtId || data.openPlayEventId || data.eventId || '',
    courtName: resolvedCourtName,
    date: resolvedDate,
    slots: resolvedSlots,
    rentals: Array.isArray(data.rentals) ? data.rentals : [],
    totalCost: resolvedTotalCost,
    userName: resolvedUserName,
    userEmail: resolvedUserEmail,
    userPhone: resolvedUserPhone,
    paymentMethod: data.paymentMethod || 'gcash',
    paymentStatus: data.paymentStatus || 'pending_verification',
    bookingReference: resolvedRef,
    status: data.status || 'pending',
    gcashReferenceNumber: data.gcashReferenceNumber || '',
    receiptImageUrl: data.receiptImageUrl || data.receiptUrl || data.paymentReceiptUrl || '',
  };
};

export default function UploadReceiptPage({ setView }: UploadReceiptPageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loadError, setLoadError] = useState<string>('');
  const [manualSearchRef, setManualSearchRef] = useState<string>('');

  const [receiptImagePreview, setReceiptImagePreview] = useState<string>('');
  const [gcashRefInput, setGcashRefInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('');

  const applyMatchedBooking = useCallback((normalized: BookingDetails) => {
    setBooking(normalized);
    setLoadError('');
    setGcashRefInput(normalized.gcashReferenceNumber || '');
    setReceiptImagePreview(normalized.receiptImageUrl || '');
  }, []);

  const fetchBookingByRef = useCallback(async (inputRef: string) => {
    const rawRef = (inputRef || '').trim().replace(/^<+|>+$/g, '').trim();

    if (!rawRef || rawRef.toLowerCase() === 'booking ref') {
      setBooking(null);
      setLoadError('Please enter your reservation reference code (e.g. WALKIN-123456 or PKL-123456) below to upload your payment proof.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    setUploadSuccessMsg('');

    const upperRef = rawRef.toUpperCase();
    let matched: BookingDetails | null = null;

    if (isFirebaseConfigured && db) {
      try {
        // Strategy A: Direct Document ID lookup on `bookings` (guard against '/')
        if (!rawRef.includes('/')) {
          const directCandidates = upperRef !== rawRef ? [rawRef, upperRef] : [rawRef];
          for (const docKey of directCandidates) {
            try {
              const docSnap = await getDoc(doc(db, 'bookings', docKey));
              if (docSnap.exists()) {
                matched = normalizeLoadedBooking(docSnap.id, docSnap.data(), 'bookings');
                break;
              }
            } catch {
              // Continue to next lookup strategy
            }
          }
        }

        // Strategy B: Indexed field queries on `bookings`
        if (!matched) {
          const bookingsRef = collection(db, 'bookings');
          const querySpecs: Array<[string, string]> = [
            ['bookingReference', rawRef],
            ...(upperRef !== rawRef ? [['bookingReference', upperRef] as [string, string]] : []),
            ['bookingId', rawRef],
            ...(upperRef !== rawRef ? [['bookingId', upperRef] as [string, string]] : []),
            ['id', rawRef],
          ];

          for (const [field, val] of querySpecs) {
            try {
              const q = query(bookingsRef, where(field, '==', val));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const dSnap = querySnapshot.docs[0];
                matched = normalizeLoadedBooking(dSnap.id, dSnap.data(), 'bookings');
                break;
              }
            } catch {
              // Continue to next query
            }
          }
        }

        // Strategy C: Direct Document ID check on `openplay_registrations`
        if (!matched && !rawRef.includes('/')) {
          try {
            const regSnap = await getDoc(doc(db, 'openplay_registrations', rawRef));
            if (regSnap.exists()) {
              matched = normalizeLoadedBooking(regSnap.id, regSnap.data(), 'openplay_registrations');
            }
          } catch {
            // Continue to collection scan fallback
          }
        }

        // Strategy D: Case-insensitive scan fallback across `bookings` and `openplay_registrations`
        if (!matched) {
          try {
            const allBookingsSnap = await getDocs(collection(db, 'bookings'));
            for (const dSnap of allBookingsSnap.docs) {
              const data = dSnap.data();
              const candidates = [dSnap.id, data.id, data.bookingReference, data.bookingId]
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                .map((v) => v.trim().toUpperCase());
              if (candidates.includes(upperRef)) {
                matched = normalizeLoadedBooking(dSnap.id, data, 'bookings');
                break;
              }
            }
          } catch {
            // Continue to openplay_registrations scan
          }
        }

        if (!matched) {
          try {
            const allRegsSnap = await getDocs(collection(db, 'openplay_registrations'));
            for (const dSnap of allRegsSnap.docs) {
              const data = dSnap.data();
              const candidates = [dSnap.id, data.id, data.bookingReference, data.bookingId]
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                .map((v) => v.trim().toUpperCase());
              if (candidates.includes(upperRef)) {
                matched = normalizeLoadedBooking(dSnap.id, data, 'openplay_registrations');
                break;
              }
            }
          } catch {
            // Proceed to localStorage fallback
          }
        }
      } catch (err) {
        console.warn('Firestore reservation lookup warning, checking local cache:', err);
      }
    }

    // Strategy E: LocalStorage fallback (runs both offline and if Firestore yielded no match)
    if (!matched) {
      const storageChecks: Array<{ key: string; source: 'bookings' | 'openplay_registrations' }> = [
        { key: 'picklepoint_bookings', source: 'bookings' },
        { key: 'picklepoint_openplay_registrations', source: 'openplay_registrations' },
      ];

      for (const { key, source } of storageChecks) {
        try {
          const rawStr = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (!rawStr) continue;
          const items = JSON.parse(rawStr);
          if (!Array.isArray(items)) continue;
          const found = items.find((item: any) => {
            const candidates = [item?.bookingReference, item?.bookingId, item?.id]
              .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
              .map((v) => v.trim().toUpperCase());
            return candidates.includes(upperRef);
          });
          if (found) {
            matched = normalizeLoadedBooking(found.id || found.bookingReference || upperRef, found, source);
            break;
          }
        } catch {
          // Ignore malformed local storage
        }
      }
    }

    if (matched) {
      applyMatchedBooking(matched);
    } else {
      setBooking(null);
      setLoadError(`No reservation found matching reference "${rawRef}".`);
    }
    setLoading(false);
  }, [applyMatchedBooking]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('upload_receipt') || params.get('ref') || params.get('lookup') || '';
    const cleaned = urlRef.trim().replace(/^<+|>+$/g, '').trim();
    if (cleaned && cleaned.toLowerCase() !== 'booking ref') {
      setManualSearchRef(cleaned);
    }
    fetchBookingByRef(urlRef);
  }, [fetchBookingByRef]);

  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualSearchRef.trim().replace(/^<+|>+$/g, '').trim();
    if (!cleaned) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('upload_receipt', cleaned);
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Ignore URL update errors
    }
    fetchBookingByRef(cleaned);
  };

  const formatGcashReference = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 13);
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.slice(0, 4);
    }
    if (clean.length > 4) {
      formatted += ' ' + clean.slice(4, 7);
    }
    if (clean.length > 7) {
      formatted += ' ' + clean.slice(7, 13);
    }
    return formatted;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !receiptImagePreview) return;

    setIsUploading(true);
    setUploadSuccessMsg('');

    try {
      const bookingDocId = booking.id || booking.bookingReference;
      const targetCollection = booking.sourceCollection || 'bookings';
      const updateData: any = {
        receiptImageUrl: receiptImagePreview,
        paymentStatus: 'pending_verification',
        status: 'pending',
      };
      if (gcashRefInput.trim()) {
        updateData.gcashReferenceNumber = gcashRefInput.trim();
      }

      if (isFirebaseConfigured && db && bookingDocId) {
        const docRef = doc(db, targetCollection, bookingDocId);
        await updateDoc(docRef, updateData);
      }

      // LocalStorage update for matched collection
      const storageKey =
        targetCollection === 'openplay_registrations'
          ? 'picklepoint_openplay_registrations'
          : 'picklepoint_bookings';
      try {
        const storedStr = localStorage.getItem(storageKey);
        if (storedStr) {
          const items = JSON.parse(storedStr);
          if (Array.isArray(items)) {
            const updated = items.map((b: any) => {
              if (
                b.id === bookingDocId ||
                b.bookingReference === booking.bookingReference ||
                b.bookingId === booking.bookingReference
              ) {
                return { ...b, ...updateData };
              }
              return b;
            });
            localStorage.setItem(storageKey, JSON.stringify(updated));
          }
        }
      } catch (e) {}

      setBooking((prev) => (prev ? { ...prev, ...updateData } : null));
      setUploadSuccessMsg('Payment receipt proof submitted successfully! Your booking is under admin review.');

      // Notify opted-in Client Admins & Facility Managers of receipt upload
      resolveVenueNotificationRecipients({
        companyId: booking.companyId,
        companyName: booking.ownerCompanyName,
        courtId: booking.courtId,
        fallbackAdminEmail: booking.ownerEmail,
        notificationKey: 'notifyReceiptUploads',
      })
        .then((recipients) => {
          recipients.forEach((recipient) => {
            sendNewCheckoutAdminNotificationEmail({
              adminEmail: recipient.email,
              adminName: recipient.name,
              recipientRole: recipient.roleLabel,
              bookingType: targetCollection === 'openplay_registrations' ? 'open_play' : 'court',
              itemTitle: booking.courtName,
              bookingReference: booking.bookingReference || bookingDocId,
              customerName: booking.userName,
              customerEmail: booking.userEmail,
              customerPhone: booking.userPhone,
              date: booking.date,
              slots: booking.slots || [],
              totalCost: booking.totalCost || 0,
              paymentMethod: booking.paymentMethod || 'GCash',
              paymentStatus: 'Receipt Uploaded - Pending Verification',
              gcashReferenceNumber: gcashRefInput.trim() || booking.gcashReferenceNumber,
              ownerCompanyName: booking.ownerCompanyName,
              eventHeading: 'Payment Receipt Uploaded',
              actionBadgeText: '🧾 PAYMENT RECEIPT UPLOADED FOR VERIFICATION',
            }).catch((err) => console.warn('Failed to send receipt upload admin email:', err));
          });
        })
        .catch((err) => console.warn('Failed to resolve receipt upload recipients:', err));
    } catch (err: any) {
      console.error('Failed to submit receipt:', err);
      alert('Failed to submit receipt proof. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parsed = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
    if (isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden font-sans">
      {/* Decorative Gradients */}
      <div className="absolute top-10 left-[-10%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-[-10%] w-[45%] h-[45%] bg-brand-lime/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-in">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setView('landing')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-lime transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Home
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-xs font-bold text-brand-lime uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Payment Submission
          </div>
        </div>

        {/* Content Section */}
        {loading && (
          <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 shadow-2xl">
            <Loader2 className="w-10 h-10 text-brand-lime animate-spin mx-auto mb-4" />
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
              Loading Reservation Details...
            </p>
          </div>
        )}

        {!loading && loadError && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/20 text-center max-w-lg mx-auto space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Reservation Lookup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{loadError}</p>
            </div>

            {/* Interactive Reference Search Fallback */}
            <form onSubmit={handleManualLookupSubmit} className="space-y-3 text-left pt-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Enter Booking Reference Code
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={manualSearchRef}
                    onChange={(e) => setManualSearchRef(e.target.value)}
                    placeholder="e.g. WALKIN-123456 or PKL-123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-lg shadow-brand-lime/10"
                >
                  Find Reservation
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-800/60">
              <button
                onClick={() => setView('landing')}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Return Home
              </button>
            </div>
          </div>
        )}

        {!loading && booking && (() => {
          const isApproved = booking.status === 'approved' || booking.status === 'confirmed' || booking.paymentStatus === 'paid';
          const displaySlots = booking.slots && booking.slots.length > 0 ? booking.slots : ['Assigned Session Slot'];

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Booking Summary Card */}
              <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
                <div className="pb-4 border-b border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Booking Reference
                  </span>
                  <h3 className="text-xl font-black text-brand-lime font-mono tracking-wider mt-0.5 break-all">
                    {booking.bookingReference || booking.id}
                  </h3>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Status</span>
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald">
                      <CheckCircle className="w-3.5 h-3.5" /> Approved & Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pending Verification
                    </span>
                  )}
                </div>

                {/* Court Info */}
                <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-brand-lime mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Court Venue
                      </span>
                      <span className="text-sm font-semibold text-white block mt-0.5">
                        {booking.ownerCompanyName && booking.ownerCompanyName !== booking.courtName
                          ? `${booking.ownerCompanyName} — ${booking.courtName}`
                          : booking.courtName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-brand-lime mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Scheduled Date
                      </span>
                      <span className="text-sm font-semibold text-white block mt-0.5">
                        {formatDate(booking.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-brand-lime mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Reserved Time Slots
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {displaySlots.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-bold bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-3 pt-4 border-t border-slate-800/60">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-brand-lime mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Player Profile
                      </span>
                      <span className="text-sm font-semibold text-slate-200 block mt-0.5">
                        {booking.userName}
                      </span>
                      {booking.userEmail && (
                        <span className="text-xs text-slate-400 block">{booking.userEmail}</span>
                      )}
                    </div>
                  </div>

                  {booking.userPhone && (
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-brand-lime mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                          Contact Phone
                        </span>
                        <span className="text-sm font-semibold text-slate-200 block mt-0.5">
                          {booking.userPhone}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Amount Due
                  </span>
                  <span className="text-2xl font-black text-brand-lime font-sans">
                    ₱{Number(booking.totalCost || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Right Column: Upload GCash Receipt Form */}
              <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                      Upload GCash Receipt Proof
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Attach screenshot & input GCash Reference No.
                    </p>
                  </div>
                </div>

                {isApproved && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-white text-xs uppercase tracking-wider">Payment Verified & Approved</span>
                      <span className="text-[11px] text-slate-300 mt-0.5 block leading-relaxed">
                        Your payment receipt has been reviewed and approved by the administrator. Receipt proof cannot be re-uploaded or modified.
                      </span>
                    </div>
                  </div>
                )}

                {uploadSuccessMsg && !isApproved && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{uploadSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* File Upload Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                      GCash Receipt Screenshot / Image *
                    </label>

                    {receiptImagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-h-60 flex items-center justify-center shadow-inner group">
                        <img
                          src={receiptImagePreview}
                          alt="GCash Payment Proof"
                          className="max-h-60 object-contain w-full"
                        />
                        {!isApproved && (
                          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="px-3.5 py-2 rounded-xl bg-brand-lime text-dark-bg text-xs font-extrabold uppercase tracking-wider cursor-pointer hover:bg-[#a6e224] transition-colors shadow">
                              Change Photo
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className={`border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-900/40 ${
                        isApproved ? 'opacity-60 cursor-not-allowed' : 'hover:border-brand-lime/60 hover:bg-slate-900/80 cursor-pointer group'
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-brand-lime/10 flex items-center justify-center text-slate-400 group-hover:text-brand-lime transition-colors mb-3">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-300 group-hover:text-brand-lime transition-colors">
                          Click to select GCash Receipt image
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, or WEBP screenshot</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isApproved}
                          onChange={handleFileSelect}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>

                  {/* GCash Ref Input */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      13-Digit GCash Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      maxLength={15}
                      placeholder="e.g. 9043 231 523444"
                      value={gcashRefInput}
                      onChange={(e) => setGcashRefInput(formatGcashReference(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 transition-all font-mono tracking-wider font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-500 block leading-none">
                      Type the 13-digit code from your GCash transaction receipt.
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isApproved || isUploading || !receiptImagePreview}
                    className={`w-full py-3.5 px-4 rounded-xl font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg uppercase border-none outline-none ${
                      isApproved
                        ? 'bg-slate-800/90 text-slate-400 border border-slate-700/80 cursor-not-allowed opacity-80 shadow-none'
                        : 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-brand-lime/10'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Payment Approved & Verified
                      </>
                    ) : isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                        Submitting Proof...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Submit Payment Proof
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
