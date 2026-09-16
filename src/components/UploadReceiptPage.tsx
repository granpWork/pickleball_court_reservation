import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Clock, MapPin, 
  User, ShieldCheck, CheckCircle, 
  AlertTriangle, Phone, Upload, Loader2
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

interface UploadReceiptPageProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'upload_receipt') => void;
}

interface BookingDetails {
  id?: string;
  courtId: string;
  courtName: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
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

export default function UploadReceiptPage({ setView }: UploadReceiptPageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loadError, setLoadError] = useState<string>('');

  const [receiptImagePreview, setReceiptImagePreview] = useState<string>('');
  const [gcashRefInput, setGcashRefInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('upload_receipt') || params.get('ref') || params.get('lookup');

    if (!urlRef) {
      setLoadError('No reservation reference provided in the URL link.');
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      setLoading(true);
      setLoadError('');
      const ref = urlRef.trim().toUpperCase();

      if (isFirebaseConfigured && db) {
        try {
          // 1. Fetch document directly by ID
          const docRef = doc(db, 'bookings', ref);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as BookingDetails;
            setBooking({ ...data, id: docSnap.id });
            if (data.gcashReferenceNumber) setGcashRefInput(data.gcashReferenceNumber);
            if (data.receiptImageUrl) setReceiptImagePreview(data.receiptImageUrl);
          } else {
            // 2. Query collection fallback
            const bookingsRef = collection(db, 'bookings');
            const q = query(bookingsRef, where('bookingReference', '==', ref));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const docSnap = querySnapshot.docs[0];
              const data = docSnap.data() as BookingDetails;
              setBooking({ ...data, id: docSnap.id });
              if (data.gcashReferenceNumber) setGcashRefInput(data.gcashReferenceNumber);
              if (data.receiptImageUrl) setReceiptImagePreview(data.receiptImageUrl);
            } else {
              setLoadError(`No reservation found matching reference "${ref}".`);
            }
          }
        } catch (err: any) {
          console.error('Error fetching reservation:', err);
          setLoadError('Unable to load reservation details. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        // LocalStorage fallback
        try {
          const bookingsStr = localStorage.getItem('picklepoint_bookings');
          const localBookings = bookingsStr ? JSON.parse(bookingsStr) : [];
          const found = localBookings.find(
            (b: any) =>
              (b.bookingReference && b.bookingReference.toUpperCase() === ref) ||
              (b.bookingId && b.bookingId.toUpperCase() === ref) ||
              (b.id && b.id.toUpperCase() === ref)
          );

          if (found) {
            setBooking(found as BookingDetails);
            if (found.gcashReferenceNumber) setGcashRefInput(found.gcashReferenceNumber);
            if (found.receiptImageUrl) setReceiptImagePreview(found.receiptImageUrl);
          } else {
            setLoadError(`No reservation found matching reference "${ref}".`);
          }
        } catch (e) {
          setLoadError('Failed to parse local reservation data.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBooking();
  }, []);

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
      const updateData: any = {
        receiptImageUrl: receiptImagePreview,
        paymentStatus: 'pending_verification',
        status: 'pending',
      };
      if (gcashRefInput.trim()) {
        updateData.gcashReferenceNumber = gcashRefInput.trim();
      }

      if (isFirebaseConfigured && db && bookingDocId) {
        const docRef = doc(db, 'bookings', bookingDocId);
        await updateDoc(docRef, updateData);
      }

      // LocalStorage update
      try {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr);
          if (Array.isArray(localBookings)) {
            const updated = localBookings.map((b: any) => {
              if (
                b.id === bookingDocId ||
                b.bookingReference === booking.bookingReference ||
                b.bookingId === booking.bookingReference
              ) {
                return { ...b, ...updateData };
              }
              return b;
            });
            localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
          }
        }
      } catch (e) {}

      setBooking((prev) => (prev ? { ...prev, ...updateData } : null));
      setUploadSuccessMsg('Payment receipt proof submitted successfully! Your booking is under admin review.');
    } catch (err: any) {
      console.error('Failed to submit receipt:', err);
      alert('Failed to submit receipt proof. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
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
          <div className="glass-panel rounded-3xl p-8 border border-red-500/20 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Reservation Not Found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{loadError}</p>
            <button
              onClick={() => setView('landing')}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        )}

        {!loading && booking && (() => {
          const isApproved = booking.status === 'approved' || booking.status === 'confirmed' || booking.paymentStatus === 'paid';

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Booking Summary Card */}
              <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
                <div className="pb-4 border-b border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Booking Reference
                  </span>
                  <h3 className="text-xl font-black text-brand-lime font-mono tracking-wider mt-0.5">
                    {booking.bookingReference}
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
                        {booking.slots.map((s, idx) => (
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
                      <span className="text-xs text-slate-400 block">{booking.userEmail}</span>
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
                    ₱{booking.totalCost}
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
