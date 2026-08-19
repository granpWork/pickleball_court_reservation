import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  DollarSign,
  ArrowLeft,
  Shield,
  Check,
  AlertCircle,
  Loader2,
  Lock,
  Phone,
  Upload,
  UserCheck,
  MapPin,
  Building2
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, collection, getDocs, setDoc, query, where } from 'firebase/firestore';

export interface OpenPlayEvent {
  id: string;
  title: string;
  location?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  category: 'Beginner' | 'Intermediate' | 'Advanced' | 'Open to All' | 'Doubles' | 'Singles';
  description: string;
  posterImageUrl?: string;
  maxParticipants: number;
  registrationFee: number;
  gcashAccountId?: string;
  gcashName?: string;
  gcashNumber?: string;
  gcashQrCode?: string;
  companyId?: string;
  companyName?: string;
  createdByUid: string;
  createdByEmail: string;
  createdAt: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  courtIds?: string[];
  courtNames?: string[];
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceGroupId?: string;
}

export const isEventExpired = (eventDate: string, endTime?: string): boolean => {
  if (!eventDate) return false;
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  if (eventDate < todayStr) return true;
  if (eventDate > todayStr) return false;

  if (!endTime) return false;
  
  let endHour = 23;
  let endMinute = 59;
  
  const trimmed = endTime.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1]?.substring(0, 2) || '0', 10);
    
    if (trimmed.toLowerCase().includes('pm') && h < 12) h += 12;
    if (trimmed.toLowerCase().includes('am') && h === 12) h = 0;
    
    endHour = isNaN(h) ? 23 : h;
    endMinute = isNaN(m) ? 59 : m;
  }
  
  const curHour = now.getHours();
  const curMinute = now.getMinutes();
  
  if (curHour > endHour) return true;
  if (curHour === endHour && curMinute >= endMinute) return true;
  
  return false;
};

export interface OpenPlayRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  registrationFee: number;
  playerUid: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  gcashReferenceNumber: string;
  receiptImageUrl?: string;
  paymentStatus: 'pending_verification' | 'paid' | 'failed';
  status: 'pending' | 'approved' | 'cancelled';
  createdAt: string;
}

interface OpenPlayDetailsProps {
  eventId: string;
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null;
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onBack: () => void;
}

export default function OpenPlayDetails({ eventId, user, onNavigateToAuth, onBack }: OpenPlayDetailsProps) {
  const [event, setEvent] = useState<OpenPlayEvent | null>(null);
  const [registrations, setRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration Form States
  const [step, setStep] = useState<'details' | 'checkout' | 'success'>('details');
  const [playerPhone, setPlayerPhone] = useState('');
  const [gcashRef, setGcashRef] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError('');
    try {
      let foundEvent: OpenPlayEvent | null = null;
      let foundRegs: OpenPlayRegistration[] = [];

      if (isFirebaseConfigured && db) {
        try {
          const eventSnap = await getDoc(doc(db, 'openplay_events', eventId));
          if (eventSnap.exists()) {
            foundEvent = { id: eventSnap.id, ...eventSnap.data() } as OpenPlayEvent;
          }
        } catch (e) {
          console.warn('Firestore fetch event failed, trying localStorage:', e);
        }
      }

      if (!foundEvent) {
        const localEventsStr = localStorage.getItem('picklepoint_openplay_events');
        if (localEventsStr) {
          const localEvents = JSON.parse(localEventsStr) as OpenPlayEvent[];
          foundEvent = localEvents.find(e => e.id === eventId) || null;
        }
      }

      // Fetch registrations for this event directly using Firestore query
      if (isFirebaseConfigured && db) {
        try {
          const q = query(collection(db, 'openplay_registrations'), where('eventId', '==', eventId));
          const regsSnap = await getDocs(q);
          regsSnap.forEach(dSnap => {
            const regData = dSnap.data() as OpenPlayRegistration;
            foundRegs.push({ ...regData, id: dSnap.id });
          });
        } catch (e) {
          console.warn('Firestore fetch registrations error:', e);
        }
      }

      if (foundRegs.length === 0) {
        const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations');
        if (localRegsStr) {
          const allRegs = JSON.parse(localRegsStr) as OpenPlayRegistration[];
          foundRegs = allRegs.filter(r => r.eventId === eventId);
        }
      }

      setEvent(foundEvent);
      setRegistrations(foundRegs);
    } catch (err) {
      console.error('Failed to load Open Play event details:', err);
      setError('Could not load Open Play event details.');
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyRegistered = user && registrations.some(r => r.playerEmail.toLowerCase() === user.email.toLowerCase() || (user.uid && r.playerUid === user.uid));
  const activeRegistrationsCount = registrations.filter(r => r.status !== 'cancelled').length;
  const availableSlots = event ? Math.max(0, event.maxParticipants - activeRegistrationsCount) : 0;
  const isFull = availableSlots <= 0;
  const isExpired = event ? isEventExpired(event.eventDate, event.endTime) : false;

  const handleProcessReceiptUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 800;
        const scale = max_width / img.width;
        if (scale < 1) {
          canvas.width = max_width;
          canvas.height = img.height * scale;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setReceiptImage(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!event || !user || isExpired) {
      if (isExpired) alert('This Open Play session has already concluded.');
      return;
    }

    const isFree = event.registrationFee <= 0;
    if (!isFree && !gcashRef.trim()) {
      alert('Please enter your GCash Reference Number.');
      return;
    }

    setSubmitting(true);
    const regId = 'reg-' + Date.now();
    const payload: OpenPlayRegistration = {
      id: regId,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.eventDate,
      registrationFee: event.registrationFee,
      playerUid: user.uid || 'anon-' + Date.now(),
      playerName: user.name,
      playerEmail: user.email,
      playerPhone: playerPhone.trim(),
      gcashReferenceNumber: isFree ? 'FREE-ENTRY' : gcashRef.trim(),
      receiptImageUrl: receiptImage || undefined,
      paymentStatus: isFree ? 'paid' : 'pending_verification',
      status: isFree ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'openplay_registrations', regId), payload);
        } catch (cloudErr) {
          console.warn('Firestore openplay registration save failed, persisting locally:', cloudErr);
        }
      }

      const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations');
      const localRegs = localRegsStr ? JSON.parse(localRegsStr) : [];
      localRegs.push(payload);
      localStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(localRegs));

      setRegistrations(prev => [...prev, payload]);
      setStep('success');
    } catch (err) {
      console.error('Failed to submit Open Play registration:', err);
      alert('Failed to submit registration: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
        </div>
        <p className="text-sm font-bold text-slate-300 animate-pulse">Loading Open Play Details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Open Play Event Not Found</h2>
        <p className="text-slate-400 text-sm max-w-md text-center mb-6">
          The Open Play registration link you clicked may have expired or been removed by the organizer.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 relative overflow-hidden py-12 px-4">
      {/* Decorative background glows */}
      <div className="absolute top-[5%] left-[15%] w-[45%] h-[45%] bg-brand-lime/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[5%] right-[15%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Lightbox for receipt or QR code */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)} 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <img src={lightboxImage} alt="Enlarged preview" className="w-full h-full object-contain" />
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer group uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to App
          </button>
          {event.companyName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-brand-lime text-xs font-extrabold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>{event.companyName}</span>
            </div>
          )}
        </div>

        {/* Main Event Registration Container */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden relative">
          
          {/* Header Banner & Poster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 pb-8 border-b border-dark-border/60">
            {/* Event Poster Column */}
            <div className="md:col-span-5">
              <div className="w-full aspect-[4/5] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-xl group">
                {event.posterImageUrl ? (
                  <img src={event.posterImageUrl} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-dark-bg">
                    <Trophy className="w-16 h-16 text-brand-lime/40 mb-3" />
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Pickleball Open Play</span>
                  </div>
                )}
                
                {/* Category Badge overlay */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-brand-lime/40 text-brand-lime text-xs font-black uppercase tracking-wider shadow">
                  {event.category}
                </div>
              </div>
            </div>

            {/* Event Info Column */}
            <div className="md:col-span-7 flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-brand-lime uppercase tracking-widest mb-2">
                  <Trophy className="w-4 h-4" /> Open Play Registration
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-4">{event.title}</h1>
                
                {/* Date, Time & Location Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Date</div>
                      <div className="text-xs font-black text-white">{event.eventDate}</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Slot</div>
                      <div className="text-xs font-black text-white">{event.startTime} - {event.endTime}</div>
                    </div>
                  </div>

                  {event.location && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 sm:col-span-2">
                      <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue Location</div>
                        <div className="text-xs font-black text-white">{event.location}</div>
                      </div>
                    </div>
                  )}

                  {event.courtNames && event.courtNames.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 sm:col-span-2">
                      <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Reserved {event.courtNames.length === 1 ? 'Court' : 'Courts'} ({event.courtNames.length})
                        </div>
                        <div className="text-xs font-black text-white">{event.courtNames.join(', ')}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div className="mb-6">
                    <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">About this Open Play</h4>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Event Key Stats Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration Fee</div>
                  <div className="text-xl font-black text-brand-lime font-sans">
                    {event.registrationFee > 0 ? `₱${event.registrationFee}` : 'FREE ENTRY'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Capacity</div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5 justify-end mt-0.5">
                    <Users className="w-4 h-4 text-brand-lime" />
                    <span className={isFull ? 'text-red-400' : 'text-slate-200'}>
                      {activeRegistrationsCount} / {event.maxParticipants} Registered ({availableSlots} slots left)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Section / Step Switcher */}
          <div className="text-left">
            {/* CASE 0: Event Expired / Concluded */}
            {isExpired && (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center animate-fade-in">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">This Open Play Session Has Concluded</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  This session on <strong className="text-white">{event.eventDate} ({event.startTime} - {event.endTime})</strong> has already taken place and is no longer accepting new player entries.
                </p>
              </div>
            )}

            {/* CASE 1: Event Completed or Cancelled */}
            {!isExpired && event.status !== 'active' && (
              <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold text-center">
                This Open Play event is currently marked as <strong className="uppercase">{event.status}</strong> and is no longer accepting new player entries.
              </div>
            )}

            {/* CASE 2: User Already Registered */}
            {!isExpired && event.status === 'active' && isAlreadyRegistered && (
              <div className="p-6 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-center animate-fade-in">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-brand-emerald" />
                <h3 className="text-sm font-black uppercase tracking-wider">You are Registered for this Open Play!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Your registration entry has been received. The organizer will review your payment confirmation and send updates.
                </p>
              </div>
            )}

            {/* CASE 3: Not Registered & User NOT Authenticated */}
            {!isExpired && event.status === 'active' && !isAlreadyRegistered && !user && (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mx-auto mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">Sign In Required to Register</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  Are you a new or returning player? Please sign in or create an account to secure your spot for this Open Play event.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                  <button
                    onClick={() => onNavigateToAuth('login')}
                    className="w-full py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg hover:scale-[1.01]"
                  >
                    Log In to Register
                  </button>
                  <button
                    onClick={() => onNavigateToAuth('register')}
                    className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Create New Account
                  </button>
                </div>
              </div>
            )}

            {/* CASE 4: Not Registered, User Authenticated, Capacity Reached */}
            {event.status === 'active' && !isAlreadyRegistered && user && isFull && (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">Registration Capacity Reached</h3>
                <p className="text-xs text-slate-300 mt-1">
                  All {event.maxParticipants} slots for this Open Play session have been filled. Please check back later for cancellations or future events.
                </p>
              </div>
            )}

            {/* CASE 5: Not Registered, User Authenticated, Slots Available */}
            {event.status === 'active' && !isAlreadyRegistered && user && !isFull && (
              <div>
                {step === 'details' && (
                  <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 animate-fade-in">
                    <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-brand-lime" /> Player Details Confirmation
                    </h3>
                    <p className="text-xs text-slate-400 mb-6">Confirm your contact information to reserve your Open Play slot.</p>

                    <div className="space-y-4 max-w-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Player Name</label>
                          <input 
                            type="text"
                            disabled
                            value={user.name}
                            className="w-full bg-slate-950 border border-dark-border text-slate-300 text-xs font-bold rounded-xl px-4 py-3 cursor-not-allowed select-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Player Email</label>
                          <input 
                            type="email"
                            disabled
                            value={user.email}
                            className="w-full bg-slate-950 border border-dark-border text-slate-300 text-xs font-bold rounded-xl px-4 py-3 cursor-not-allowed select-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Contact Phone Number (Optional)</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                          <input 
                            type="text"
                            value={playerPhone}
                            onChange={(e) => setPlayerPhone(e.target.value)}
                            placeholder="e.g. 09171234567"
                            className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                          />
                        </div>
                      </div>

                      <div className="pt-3">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            if (event.registrationFee > 0) {
                              setStep('checkout');
                            } else {
                              handleSubmitRegistration();
                            }
                          }}
                          className="w-full py-3.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10 hover:scale-[1.01] flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                              <span>Submitting Registration...</span>
                            </>
                          ) : event.registrationFee > 0 ? (
                            `Proceed to GCash Payment (₱${event.registrationFee})`
                          ) : (
                            'Confirm Free Registration'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: GCash Checkout */}
                {step === 'checkout' && (
                  <form onSubmit={handleSubmitRegistration} className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 animate-fade-in">
                    <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-brand-lime" /> GCash Registration Checkout
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Scan or transfer registration fee to the organizer's designated GCash account.</p>
                      </div>
                      <span className="text-sm font-black text-brand-lime font-sans">
                        ₱{event.registrationFee}
                      </span>
                    </div>

                    {/* GCash Account Info Card */}
                    <div className="mb-6 p-5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                      <div>
                        <div className="text-[10px] font-extrabold text-brand-lime uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Designated GCash Recipient
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">Account Name</span>
                            <span className="text-white font-extrabold">{event.gcashName || 'PicklePoint Venue'}</span>
                          </div>
                          <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">Account Number</span>
                            <span className="text-brand-lime font-mono font-bold">{event.gcashNumber || '0917-000-0000'}</span>
                          </div>
                        </div>
                      </div>

                      {/* QR Code screenshot preview */}
                      <div className="text-center md:border-l md:border-dark-border/40 md:pl-5">
                        {event.gcashQrCode ? (
                          <div>
                            <div 
                              onClick={() => setLightboxImage(event.gcashQrCode || null)}
                              className="w-24 h-24 mx-auto rounded-xl bg-white p-1 border border-slate-700 cursor-zoom-in hover:scale-105 transition-transform"
                            >
                              <img src={event.gcashQrCode} alt="GCash QR" className="w-full h-full object-contain rounded-lg" />
                            </div>
                            <span className="text-[10px] text-brand-lime font-bold hover:underline cursor-pointer block mt-1 uppercase tracking-wider">
                              Tap to Expand QR Code
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">No QR screenshot provided. Please send via GCash mobile number above.</div>
                        )}
                      </div>
                    </div>

                    {/* Payment Inputs */}
                    <div className="space-y-5 max-w-xl">
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          GCash Reference Number <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={gcashRef}
                          onChange={(e) => setGcashRef(e.target.value)}
                          placeholder="e.g. 100234567891"
                          className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-lime font-mono transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          Upload Receipt Screenshot (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-dark-border text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4 text-brand-lime" />
                            <span>{receiptImage ? 'Change Receipt Screenshot' : 'Upload Receipt File'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => e.target.files?.[0] && handleProcessReceiptUpload(e.target.files[0])}
                              className="hidden" 
                            />
                          </label>

                          {receiptImage && (
                            <div 
                              onClick={() => setLightboxImage(receiptImage)}
                              className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden cursor-zoom-in flex-shrink-0"
                            >
                              <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setStep('details')}
                          className="py-3 px-5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-3.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10 flex items-center justify-center gap-2 hover:scale-[1.01]"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                              <span>Submitting Registration...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Submit Open Play Registration</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Step 3: Success Screen */}
                {step === 'success' && (
                  <div className="p-8 rounded-3xl bg-brand-emerald/10 border border-brand-emerald/30 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-brand-emerald/20 border border-brand-emerald/30 text-brand-emerald flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Check className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white mb-2">Open Play Registration Submitted!</h2>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
                      Your entry for <strong className="text-brand-lime">{event.title}</strong> has been received. The organizer will verify your GCash reference number (<span className="font-mono text-white font-bold">{gcashRef}</span>) and update your registration status.
                    </p>
                    
                    <button
                      onClick={onBack}
                      className="px-8 py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg"
                    >
                      Return to PicklePoint App
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
