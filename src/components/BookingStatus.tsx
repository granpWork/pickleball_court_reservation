import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Calendar, Clock, MapPin, 
  User, ShieldCheck, ShieldAlert, CheckCircle, 
  AlertTriangle, Phone
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface BookingStatusProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup') => void;
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
}

export default function BookingStatus({ setView }: BookingStatusProps) {
  const [searchRef, setSearchRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const performLookup = async (inputRef: string) => {
    if (!inputRef.trim()) return;

    setLoading(true);
    setSearchError('');
    setBooking(null);
    setHasSearched(true);

    const ref = inputRef.trim().toUpperCase();

    if (isFirebaseConfigured && db) {
      try {
        // 1. Try to fetch the document directly by ID (booking reference) first.
        const docRef = doc(db, 'bookings', ref);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as BookingDetails;
          setBooking({ ...data, id: docSnap.id });
        } else {
          // 2. Fall back to querying collection
          try {
            const bookingsRef = collection(db, 'bookings');
            const q = query(bookingsRef, where('bookingReference', '==', ref));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const docSnap = querySnapshot.docs[0];
              const data = docSnap.data() as BookingDetails;
              setBooking({ ...data, id: docSnap.id });
            } else {
              setSearchError(`No reservation found matching Reference Number "${ref}".`);
            }
          } catch (queryErr: any) {
            console.error('Error running fallback query lookup:', queryErr);
            if (queryErr.code === 'permission-denied') {
              setSearchError(`Access restricted: Please log in to view this booking, or contact support.`);
            } else {
              throw queryErr;
            }
          }
        }
      } catch (err: any) {
        console.error('Error looking up booking:', err);
        if (err.code === 'permission-denied') {
          setSearchError('Access denied: Please log in first to track your booking.');
        } else {
          setSearchError('An error occurred while connecting to the database. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // LocalStorage simulated mode
      setTimeout(() => {
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
          } else {
            setSearchError(`No reservation found matching Reference Number "${ref}".`);
          }
        } catch (err) {
          setSearchError('Failed to parse local reservations.');
        } finally {
          setLoading(false);
        }
      }, 500);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchRef);
  };

  // Auto-search on mount if URL contains ref parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('ref');
    if (urlRef) {
      setSearchRef(urlRef);
      performLookup(urlRef);
    }
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const maskName = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts.map(part => {
      if (part.length <= 2) return part[0] + '*';
      return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
    }).join(' ');
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    if (local.length <= 2) return local[0] + '***@' + domain;
    return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + domain;
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length < 7) return '***';
    return cleaned.slice(0, 4) + '***' + cleaned.slice(-4);
  };

  const maskGcashReference = (ref: string) => {
    if (!ref) return '';
    const cleaned = ref.trim();
    if (cleaned.length < 8) return '***';
    if (cleaned.includes(' ')) {
      const parts = cleaned.split(' ');
      if (parts.length >= 3) {
        return parts[0] + ' *** ' + parts[2];
      }
    }
    return cleaned.slice(0, 4) + '***' + cleaned.slice(-4);
  };

  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-[-10%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-[-10%] w-[45%] h-[45%] bg-brand-lime/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-in">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView('landing')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-lime transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Court Booking
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-xs font-bold text-brand-lime uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Reservation Status
          </div>
        </div>

        {/* Main Search Panel */}
        <div className="glass-panel rounded-3xl p-6 md:p-10 border border-slate-800 shadow-2xl relative overflow-hidden text-center mb-8">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-lime/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl md:text-4xl">
              Track Your Reservation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Enter your PicklePoint reference number (e.g. <span className="text-brand-lime font-mono font-bold">PP-XXXX-XXXX</span>) to verify payment verification, court schedule, and access ticket.
            </p>

            <form onSubmit={handleSearch} className="pt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. PP-1234-5678"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 transition-all font-mono uppercase tracking-wider"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchRef.trim()}
                className="py-3.5 px-6 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 hover:scale-[1.01] hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/10 cursor-pointer uppercase disabled:opacity-50 disabled:cursor-not-allowed border-none outline-none"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-650 border-t-dark-bg rounded-full animate-spin"></span>
                    Searching...
                  </>
                ) : (
                  'Search Booking'
                )}
              </button>
            </form>
          </div>
        </div>

      {/* Results Section */}
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-brand-lime/20 border-t-brand-lime rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Retrieving Booking Details...</p>
          </div>
        )}

        {!loading && searchError && (
          <div className="p-6 bg-red-500/10 border border-red-500/25 rounded-2xl flex flex-col items-center text-center gap-3 animate-fade-in select-none max-w-xl mx-auto">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Booking Not Found</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {searchError}
              </p>
            </div>
          </div>
        )}

        {!loading && hasSearched && booking && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            
            {/* Left: Booking Details Card */}
            <div className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
              
              {/* Voucher status block */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Booking Reference</span>
                  <h4 className="text-lg font-black text-brand-lime font-mono tracking-wider">{booking.bookingReference}</h4>
                </div>

                {/* Status Badges */}
                <div className="text-center sm:text-right">
                  {/* Pending Review */}
                  {(booking.status === 'pending' || booking.paymentStatus === 'pending_verification') && (
                    <div className="space-y-1.5 flex flex-col items-center sm:items-end">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pending Verification
                      </span>
                      <span className="text-[10px] text-slate-400 block max-w-[200px] leading-relaxed">
                        GCash receipt is currently under administrator review.
                      </span>
                    </div>
                  )}

                  {/* Confirmed / Approved */}
                  {(booking.status === 'confirmed' || booking.status === 'approved' || booking.paymentStatus === 'paid') && (
                    <div className="space-y-1.5 flex flex-col items-center sm:items-end">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-emerald/10 border border-brand-emerald/25 text-brand-emerald">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirmed & Paid
                      </span>
                      <span className="text-[10px] text-slate-400 block max-w-[200px] leading-relaxed">
                        Validation complete! Access voucher is fully active.
                      </span>
                    </div>
                  )}

                  {/* Cancelled / Failed */}
                  {(booking.status === 'cancelled' || booking.status === 'failed' || booking.paymentStatus === 'failed') && (
                    <div className="space-y-1.5 flex flex-col items-center sm:items-end">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                        <ShieldAlert className="w-3.5 h-3.5" /> Cancelled / Failed
                      </span>
                      <span className="text-[10px] text-slate-400 block max-w-[200px] leading-relaxed">
                        Receipt validation failed or booking has been cancelled.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reserved Court Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Reservation Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-brand-lime mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Court Venue</span>
                      <span className="text-sm font-semibold text-white mt-0.5 block">
                        {booking.ownerCompanyName && booking.ownerCompanyName !== booking.courtName
                          ? `${booking.ownerCompanyName} — ${booking.courtName}`
                          : booking.courtName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-brand-lime mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Scheduled Date</span>
                      <span className="text-sm font-semibold text-white mt-0.5 block">{formatDate(booking.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2">
                  <Clock className="w-4 h-4 text-brand-lime mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reserved Time Slots</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {booking.slots.map((slot, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs font-bold bg-slate-900 text-slate-300 border border-slate-800/80 px-2.5 py-1 rounded-lg"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player details */}
              <div className="border-t border-slate-800/80 pt-5 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Player Info</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-brand-lime mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Player Name</span>
                      <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{maskName(booking.userName)}</span>
                      <span className="text-xs text-slate-400 block leading-tight">{maskEmail(booking.userEmail)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-brand-lime mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GCash Payment Number</span>
                      <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{maskPhone(booking.userPhone)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GCash Verification Specifics */}
              {booking.gcashReferenceNumber && (
                <div className="border-t border-slate-800/80 pt-5 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GCash Transaction Details</span>
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-lime" /> Reference Number</span>
                    <span className="font-mono font-bold text-white tracking-wide">{maskGcashReference(booking.gcashReferenceNumber)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Digital Ticket Voucher */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#0e1424] border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
                {/* Status Bar */}
                <div className={`h-2 bg-gradient-to-r ${
                  booking.status === 'confirmed' || booking.status === 'approved' || booking.paymentStatus === 'paid'
                    ? 'from-blue-600 to-brand-lime' 
                    : booking.status === 'cancelled' || booking.status === 'failed' || booking.paymentStatus === 'failed'
                    ? 'from-red-600 to-red-950'
                    : 'from-yellow-600 to-yellow-400'
                }`}></div>

                {/* Ticket Body */}
                <div className="p-6 space-y-5">
                  <div className="flex justify-between items-baseline font-bold border-b border-slate-800/60 pb-3">
                    <span className="text-xs text-slate-400">Total Charged</span>
                    <span className="text-brand-lime font-sans text-lg">₱{booking.totalCost}</span>
                  </div>

                  {/* Add-ons selected list */}
                  {booking.rentals && booking.rentals.length > 0 && (
                    <div className="space-y-2 text-left">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Equipment Rented</span>
                      <div className="space-y-1.5">
                        {booking.rentals.map((r, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs text-slate-350">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-brand-lime"></span>
                              {r.name} <span className="text-slate-500 font-bold font-sans">x{r.quantity}</span>
                            </span>
                            <span className="font-semibold text-slate-200">₱{r.price * r.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual Barcode section */}
                  <div className="flex flex-col items-center justify-center pt-3 border-t border-slate-900/60 text-center space-y-3">
                    {(booking.status === 'confirmed' || booking.status === 'approved' || booking.paymentStatus === 'paid') ? (
                      /* Active voucher barcode */
                      <>
                        <div className="bg-white p-3 rounded-2xl inline-block shadow-inner select-none">
                          <svg className="w-56 h-12 text-slate-950" viewBox="0 0 100 20" fill="currentColor">
                            <rect x="0" y="0" width="2" height="20" />
                            <rect x="4" y="0" width="1" height="20" />
                            <rect x="7" y="0" width="3" height="20" />
                            <rect x="12" y="0" width="1" height="20" />
                            <rect x="14" y="0" width="2" height="20" />
                            <rect x="18" y="0" width="4" height="20" />
                            <rect x="24" y="0" width="1" height="20" />
                            <rect x="27" y="0" width="2" height="20" />
                            <rect x="31" y="0" width="3" height="20" />
                            <rect x="36" y="0" width="1" height="20" />
                            <rect x="39" y="0" width="2" height="20" />
                            <rect x="43" y="0" width="1" height="20" />
                            <rect x="46" y="0" width="4" height="20" />
                            <rect x="52" y="0" width="2" height="20" />
                            <rect x="56" y="0" width="1" height="20" />
                            <rect x="59" y="0" width="3" height="20" />
                            <rect x="64" y="0" width="1" height="20" />
                            <rect x="67" y="0" width="2" height="20" />
                            <rect x="71" y="0" width="4" height="20" />
                            <rect x="77" y="0" width="1" height="20" />
                            <rect x="80" y="0" width="2" height="20" />
                            <rect x="84" y="0" width="3" height="20" />
                            <rect x="89" y="0" width="1" height="20" />
                            <rect x="92" y="0" width="2" height="20" />
                            <rect x="96" y="0" width="1" height="20" />
                          </svg>
                          <div className="text-[8px] text-slate-800 font-sans tracking-[0.4em] mt-1 font-bold">
                            {booking.bookingReference.replace(/-/g, '')}
                          </div>
                        </div>
                        <span className="text-[8.5px] text-slate-500 font-sans font-semibold uppercase tracking-wider">
                          Voucher Active • Scan at Court Check-In
                        </span>
                      </>
                    ) : (booking.status === 'cancelled' || booking.status === 'failed' || booking.paymentStatus === 'failed') ? (
                      /* Cancelled */
                      <div className="p-4 border border-dashed border-red-500/25 rounded-2xl bg-red-950/5 flex flex-col items-center">
                        <span className="text-2xl mb-1.5">❌</span>
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Invalid Voucher</span>
                        <span className="text-[9px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                          This reservation is cancelled and the check-in voucher is disabled.
                        </span>
                      </div>
                    ) : (
                      /* Pending */
                      <div className="p-4 border border-dashed border-yellow-500/25 rounded-2xl bg-yellow-950/5 flex flex-col items-center">
                        <span className="text-2xl mb-1.5 animate-pulse">⏳</span>
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Voucher Pending Review</span>
                        <span className="text-[9px] text-slate-500 mt-1 max-w-[200px] leading-relaxed font-sans">
                          Once the administrator approves your transaction proof, your check-in barcode will activate here.
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  </div>
  );
}
