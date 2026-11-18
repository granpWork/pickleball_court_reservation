import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Loader2,
  Building2,
  Search,
  UserCheck,
  Award,
  Sparkles,
  Info,
} from 'lucide-react';
import type { OpenPlayEvent, OpenPlayRegistration } from '../../OpenPlayDetails';
import type { UserAccount } from '../adminTypes';

interface AdminManualOpenPlayBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OpenPlayEvent | null;
  currentRegistrations?: OpenPlayRegistration[];
  users?: UserAccount[];
  onSaveManualBooking: (payload: any) => Promise<void>;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
}

export const AdminManualOpenPlayBookingModal: React.FC<AdminManualOpenPlayBookingModalProps> = ({
  isOpen,
  onClose,
  event,
  currentRegistrations = [],
  users = [],
  onSaveManualBooking,
  formatEventDateLong,
  formatTime12h,
}) => {
  // Mode Selection: 'existing' user search or 'new' walk-in player
  const [userMode, setUserMode] = useState<'existing' | 'new'>('existing');

  // Existing User Search & Selection State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Form State
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');

  // DUPR Credentials State
  const [playerDuprId, setPlayerDuprId] = useState('');
  const [playerDuprRating, setPlayerDuprRating] = useState('');

  // Guest State (for non-DUPR events)
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'free'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending_verification'>('paid');
  const [customFee, setCustomFee] = useState<string>('0');
  const [gcashRef, setGcashRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track previous open state & event id so switching tabs / background re-fetches don't wipe form state
  const prevIsOpenRef = useRef(false);
  const prevEventIdRef = useRef<string | null>(null);

  // Reset/Initialize State ONLY when modal transitions from closed to open, or when opening a different event
  useEffect(() => {
    if (isOpen && event) {
      const isJustOpened = !prevIsOpenRef.current;
      const isDifferentEvent = prevEventIdRef.current !== event.id;

      if (isJustOpened || isDifferentEvent) {
        setUserMode(users && users.length > 0 ? 'existing' : 'new');
        setUserSearchQuery('');
        setSelectedUser(null);
        setPlayerName('');
        setPlayerEmail('');
        setPlayerPhone('');
        setPlayerDuprId('');
        setPlayerDuprRating('');
        setGuests([]);
        setPaymentMethod('cash');
        setPaymentStatus('paid');
        setCustomFee(event.registrationFee ? String(event.registrationFee) : '0');
        setGcashRef('');
        setAdminNotes('');
        setErrorMsg(null);
        setIsSubmitting(false);
      }
    }

    prevIsOpenRef.current = isOpen;
    prevEventIdRef.current = event?.id || null;
  }, [isOpen, event?.id, event?.registrationFee, users]);

  // Early return when modal is not open or no event selected:
  if (!isOpen || !event) return null;

  // Check if event date/time is expired
  const isExpired = (() => {
    if (!event || !event.eventDate) return false;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (event.eventDate < todayStr) return true;
      if (event.eventDate > todayStr) return false;
      if (event.endTime) {
        const now = new Date();
        const timeParts = event.endTime.trim().split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const eventEndTime = new Date();
          eventEndTime.setHours(hours, minutes, 0, 0);
          return now > eventEndTime;
        }
      }
      return false;
    } catch {
      return false;
    }
  })();

  const isSessionClosed = isExpired || event.status === 'expired';

  const isDuprEvent =
    typeof event.isDupr === 'boolean'
      ? event.isDupr
      : Boolean(
          /\bdupr\b/i.test(event.title || '') &&
          !/non[- ]?dupr|no[- ]?dupr/i.test(event.title || '')
        );

  // Normalize event ID and filter ONLY active registrations belonging to THIS specific event session
  const currentEventId = String(event.id || '').trim();
  const safeRegistrations = Array.isArray(currentRegistrations) ? currentRegistrations : [];
  const activeRegs = safeRegistrations.filter((r) => {
    const regEventId = String(r.eventId || (r as any).openPlayEventId || '').trim();
    return Boolean(currentEventId && regEventId && regEventId === currentEventId && r.status !== 'cancelled');
  });

  const totalRegHeadcount = activeRegs.reduce(
    (sum, r) => sum + (r.playerCount || 1 + (r.guestCount || 0)),
    0
  );

  const absentCount = (() => {
    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      if (!saved) return 0;
      const attMap = JSON.parse(saved);
      return Object.values(attMap).filter((val) => val === 'absent').length;
    } catch {
      return 0;
    }
  })();

  const currentHeadcount = Math.max(0, totalRegHeadcount - absentCount);
  const maxCapacity = event.maxParticipants || 16;
  const spotsRemaining = Math.max(0, maxCapacity - currentHeadcount);
  const isFull = spotsRemaining <= 0;

  const totalHeadcount = 1 + guests.length;
  const feePerPlayer = Number(customFee) || 0;
  const totalAmount = paymentMethod === 'free' ? 0 : feePerPlayer * totalHeadcount;

  // Filtered Users List for Search (plain computation)
  const safeUsers = Array.isArray(users) ? users : [];
  const q = userSearchQuery.trim().toLowerCase();
  const filteredUsers = !q
    ? safeUsers.slice(0, 15)
    : safeUsers
        .filter((u) => {
          const name = (u.name || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = (u.phone || '').toLowerCase();
          const dupr = (u.adminDuprId || u.duprId || '').toLowerCase();
          return name.includes(q) || email.includes(q) || phone.includes(q) || dupr.includes(q);
        })
        .slice(0, 15);

  // Check if selected existing user is already registered for THIS specific event session
  const isAlreadyRegistered = (() => {
    if (!selectedUser) return false;
    const userUid = selectedUser.uid ? String(selectedUser.uid).trim().toLowerCase() : '';
    const userEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

    return activeRegs.some((r) => {
      const regUid = (r.playerUid || r.userId ? String(r.playerUid || r.userId) : '').trim().toLowerCase();
      const regEmail = (r.playerEmail || r.userEmail ? String(r.playerEmail || r.userEmail) : '').trim().toLowerCase();
      if (userUid && regUid && userUid === regUid) return true;
      if (userEmail && regEmail && userEmail === regEmail) return true;
      return false;
    });
  })();

  // Detect if user is registered in another published event session (Cross-Event Detection)
  const crossEventRegistration = (() => {
    if (!selectedUser) return null;
    const userUid = selectedUser.uid ? String(selectedUser.uid).trim().toLowerCase() : '';
    const userEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

    return safeRegistrations.find((r) => {
      const regEventId = String(r.eventId || (r as any).openPlayEventId || '').trim();
      if (!regEventId || regEventId === currentEventId || r.status === 'cancelled') return false;
      const regUid = (r.playerUid || r.userId ? String(r.playerUid || r.userId) : '').trim().toLowerCase();
      const regEmail = (r.playerEmail || r.userEmail ? String(r.playerEmail || r.userEmail) : '').trim().toLowerCase();
      return Boolean((userUid && regUid && userUid === regUid) || (userEmail && regEmail && userEmail === regEmail));
    });
  })();

  // Handle selecting an existing user
  const handleSelectUser = (u: UserAccount) => {
    setSelectedUser(u);
    setPlayerName(u.name || '');
    setPlayerEmail(u.email || '');
    setPlayerPhone(u.phone || '');
    setPlayerDuprId(u.adminDuprId || u.duprId || '');
    setPlayerDuprRating(u.adminDuprRating || u.duprRating || '');
    setErrorMsg(null);
  };

  // Handle switching user mode
  const handleSwitchMode = (mode: 'existing' | 'new') => {
    setUserMode(mode);
    setErrorMsg(null);
    if (mode === 'new') {
      setSelectedUser(null);
      setPlayerName('');
      setPlayerEmail('');
      setPlayerPhone('');
      setPlayerDuprId('');
      setPlayerDuprRating('');
    }
  };

  const handleAddGuest = () => {
    if (isSessionClosed) {
      setErrorMsg('This Open Play session has expired/concluded. Registrations are disabled.');
      return;
    }
    if (totalHeadcount >= spotsRemaining) {
      setErrorMsg(
        `Cannot add more guests. Only ${spotsRemaining} ${spotsRemaining === 1 ? 'spot' : 'spots'} remaining in session.`
      );
      return;
    }
    setErrorMsg(null);
    setGuests((prev) => [...prev, { name: '', email: '' }]);
  };

  const handleRemoveGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  const handleGuestChange = (index: number, field: 'name' | 'email', value: string) => {
    setGuests((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isSessionClosed) {
      setErrorMsg(
        'This Open Play session has expired/concluded. Manual player registrations cannot be added to past sessions.'
      );
      return;
    }

    if (userMode === 'existing' && !selectedUser) {
      setErrorMsg('Please select an existing registered user from the directory.');
      return;
    }

    if (!playerName.trim()) {
      setErrorMsg('Player Name is required.');
      return;
    }

    if (isAlreadyRegistered) {
      setErrorMsg(
        `${selectedUser?.name || 'This user'} is already registered for this Open Play session.`
      );
      return;
    }

    if (totalHeadcount > spotsRemaining) {
      setErrorMsg(
        `Total headcount (${totalHeadcount}) exceeds remaining capacity (${spotsRemaining} spots left).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const guestNames = guests.map((g) => g.name.trim()).filter(Boolean);
      const guestEmails = guests.map((g) => g.email.trim()).filter(Boolean);

      const cleanDuprId = playerDuprId.trim();
      const cleanDuprRating = playerDuprRating.trim();

      const payload = {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.eventDate,
        registrationFee: feePerPlayer,
        playerName: playerName.trim(),
        userName: playerName.trim(),
        playerEmail: playerEmail.trim() || `manual_${Date.now()}@picklepoint.local`,
        userEmail: playerEmail.trim() || `manual_${Date.now()}@picklepoint.local`,
        playerPhone: playerPhone.trim(),
        userPhone: playerPhone.trim(),
        playerUid: selectedUser?.uid || undefined,
        userId: selectedUser?.uid || undefined,
        duprId: cleanDuprId || undefined,
        adminDuprId: cleanDuprId || undefined,
        duprRating: cleanDuprRating || undefined,
        adminDuprRating: cleanDuprRating || undefined,
        playerCount: totalHeadcount,
        guestCount: guests.length,
        guests: guests,
        guestNames: guestNames,
        guestEmails: guestEmails,
        gcashReferenceNumber:
          paymentMethod === 'gcash'
            ? gcashRef.trim()
            : paymentMethod === 'cash'
              ? 'CASH-WALKIN'
              : 'FREE-ENTRY',
        paymentStatus: paymentStatus,
        status: paymentStatus === 'paid' ? 'approved' : 'pending',
        isManualBooking: true,
        paymentMethod: paymentMethod,
        totalAmountPaid: totalAmount,
        adminNotes: adminNotes.trim(),
        createdAt: new Date().toISOString(),
      };

      await onSaveManualBooking(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit manual booking:', err);
      setErrorMsg(err?.message || 'Failed to submit manual registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDropdownClass =
    "w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white font-normal focus:outline-none focus:border-brand-lime cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_14px_center] bg-no-repeat pr-9";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl lg:max-w-3xl w-full shadow-2xl text-left relative flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden">
        {/* Sticky Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shrink-0">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight truncate">
                  Manual Player Registration
                </h3>
                {isDuprEvent ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <Award className="w-3 h-3" /> DUPR
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                    Regular
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-normal truncate">
                Register existing users or walk-in players into this Open Play roster
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0 ml-2"
            disabled={isSubmitting}
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Wrapping Scrollable Body & Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body */}
          <div className="px-4 sm:px-6 py-4 overflow-y-auto space-y-4 sm:space-y-5 flex-1 custom-scrollbar text-xs sm:text-sm">
            {/* Session Highlights Banner */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-white text-sm sm:text-base md:text-lg truncate max-w-[280px] sm:max-w-md">
                  {event.title}
                </span>
                <span
                  className={`px-2.5 py-0.5 sm:py-1 rounded-full font-bold text-[10px] sm:text-xs uppercase border shrink-0 ${
                    spotsRemaining > 0
                      ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  {spotsRemaining > 0
                    ? `${spotsRemaining} ${spotsRemaining === 1 ? 'Spot' : 'Spots'} Left (${currentHeadcount}/${maxCapacity})`
                    : 'Session Full'}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-slate-300 flex-wrap font-normal text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                  <span>{formatEventDateLong ? formatEventDateLong(event.eventDate) : event.eventDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    {formatTime12h
                      ? `${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}`
                      : `${event.startTime} - ${event.endTime}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-none">
                    {event.courtNames && event.courtNames.length > 0 ? event.courtNames.join(', ') : 'Courts'}
                  </span>
                </div>
              </div>
            </div>

            {/* Expired / Full Session Warnings */}
            {isSessionClosed && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-normal flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <span>
                  This Open Play session has concluded/expired. Manual player registrations are disabled for past sessions.
                </span>
              </div>
            )}

            {isFull && !isSessionClosed && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-normal flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-red-400 mt-0.5" />
                <span>
                  This Open Play session is fully booked ({currentHeadcount}/{maxCapacity} spots filled). Manual player registrations are disabled.
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-normal flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Mode Switch Tabs: Existing Registered User vs New Walk-in Player */}
            <div className="space-y-2">
              <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Player Type
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('existing')}
                  className={`py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                    userMode === 'existing'
                      ? 'bg-slate-800 text-brand-lime shadow-md border border-slate-700/80'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate">Existing User</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchMode('new')}
                  className={`py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                    userMode === 'new'
                      ? 'bg-slate-800 text-brand-lime shadow-md border border-slate-700/80'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate">Walk-in Player</span>
                </button>
              </div>
            </div>

            {/* Existing User Selection UI */}
            {userMode === 'existing' && (
              <div className="space-y-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-200">
                    Search Registered Users
                  </label>
                  {selectedUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setPlayerName('');
                        setPlayerEmail('');
                        setPlayerPhone('');
                        setPlayerDuprId('');
                        setPlayerDuprRating('');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                    >
                      Change User
                    </button>
                  )}
                </div>

                {!selectedUser ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search player by name, email, phone, or DUPR ID..."
                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                      />
                    </div>

                    {/* Users search results list */}
                    <div className="max-h-44 sm:max-h-52 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-900 divide-y divide-slate-800/60 custom-scrollbar">
                      {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No registered users found matching "{userSearchQuery}".
                        </div>
                      ) : (
                        filteredUsers.map((u, idx) => {
                          const isDuprTagged = Boolean(u.adminDuprId || u.duprId);
                          const duprDisplay = u.adminDuprId || u.duprId || '';
                          const ratingDisplay = u.adminDuprRating || u.duprRating || '';

                          return (
                            <button
                              key={u.uid || u.email || idx}
                              type="button"
                              onClick={() => handleSelectUser(u)}
                              className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors cursor-pointer group gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {u.photoUrl || (u as any).avatarUrl ? (
                                  <img
                                    src={u.photoUrl || (u as any).avatarUrl}
                                    alt={u.name}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl object-cover shrink-0 border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-lime font-black text-xs shrink-0">
                                    {(u.name || u.email || 'P').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-brand-lime">
                                    {u.name || 'Unnamed Player'}
                                  </div>
                                  <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                                    {u.email} {u.phone ? `• ${u.phone}` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isDuprTagged ? (
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] sm:text-[10px] font-bold">
                                    DUPR {ratingDisplay ? `(${ratingDisplay})` : duprDisplay}
                                  </span>
                                ) : (
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-800 text-slate-500 text-[9px] sm:text-[10px]">
                                    Unrated
                                  </span>
                                )}
                                <span className="text-xs text-brand-lime font-bold opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                                  Select →
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  /* Selected User Summary Card */
                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-brand-lime/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {selectedUser.photoUrl || (selectedUser as any).avatarUrl ? (
                        <img
                          src={selectedUser.photoUrl || (selectedUser as any).avatarUrl}
                          alt={selectedUser.name}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0 border border-brand-lime/40"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-lime/20 to-emerald-500/10 border border-brand-lime/40 flex items-center justify-center text-brand-lime font-black text-sm shrink-0">
                          {(selectedUser.name || selectedUser.email || 'P').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{selectedUser.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold shrink-0">
                            ✓ Selected
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {selectedUser.email} {selectedUser.phone ? `• ${selectedUser.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    {(selectedUser.adminDuprId || selectedUser.duprId) && (
                      <div className="text-right shrink-0 pl-2">
                        <div className="text-[9px] sm:text-[10px] font-bold uppercase text-purple-400">DUPR</div>
                        <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                          {selectedUser.adminDuprRating || selectedUser.duprRating || selectedUser.adminDuprId || selectedUser.duprId}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Duplicate Registration Warning for THIS Session */}
                {isAlreadyRegistered && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-bold">{selectedUser?.name || 'This user'}</span> is already registered for this Open Play session. Duplicate registration is disabled.
                    </div>
                  </div>
                )}

                {/* Cross-Event Registration Information Notice */}
                {!isAlreadyRegistered && crossEventRegistration && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-medium flex items-start gap-2.5">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-blue-400 mt-0.5" />
                    <div className="space-y-1">
                      <div>
                        Notice: <span className="font-bold">{selectedUser?.name || 'This user'}</span> is currently registered in another session: <strong className="text-white">{crossEventRegistration.eventTitle || 'Another Open Play Event'}</strong>.
                      </div>
                      <p className="text-[11px] text-blue-300/80">
                        You may register them in this session as well, or use the <strong>"Move"</strong> button on that session's roster to transfer them.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Primary Player Details Fields */}
            <div className="space-y-3 pt-1">
              <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{userMode === 'existing' ? 'Player Profile Details' : 'Walk-in Player Details'}</span>
                <span className="text-amber-400 font-normal">* Required</span>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-normal text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Juan Cruz"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-normal text-slate-300 mb-1">
                      Email Address {userMode === 'new' && <span className="text-slate-500 text-[11px]">(Optional)</span>}
                    </label>
                    <input
                      type="email"
                      value={playerEmail}
                      onChange={(e) => setPlayerEmail(e.target.value)}
                      placeholder="e.g. player@example.com"
                      className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-normal text-slate-300 mb-1">
                      Phone Number <span className="text-slate-500 text-[11px]">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={playerPhone}
                      onChange={(e) => setPlayerPhone(e.target.value)}
                      placeholder="e.g. 09171234567"
                      className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* DUPR Rating & Credentials Section */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>DUPR Credentials</span>
                </span>
                {isDuprEvent ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] sm:text-[10px] font-bold">
                    Admin Walk-in
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] text-slate-500">Optional for Regular Session</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-normal text-slate-300 mb-1">
                    DUPR ID <span className="text-slate-500 text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={playerDuprId}
                    onChange={(e) => setPlayerDuprId(e.target.value)}
                    placeholder="e.g. DUPR-123456 or 123456"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-300 mb-1">
                    DUPR Rating <span className="text-slate-500 text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={playerDuprRating}
                    onChange={(e) => setPlayerDuprRating(e.target.value)}
                    placeholder="e.g. 3.50 or NR"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Guest Players Section (Non-DUPR Only) */}
            {!isDuprEvent && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Guest Registrations ({guests.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddGuest}
                    disabled={totalHeadcount >= spotsRemaining}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-lime text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Guest
                  </button>
                </div>

                {guests.map((guest, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2 sm:gap-3"
                  >
                    <span className="text-slate-500 font-mono text-xs font-normal pl-1">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="Guest Full Name"
                      value={guest.name}
                      onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                      className="flex-1 px-3 py-1.5 sm:py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(idx)}
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-900 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove guest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Payment & Fee Options Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Payment & Fee Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className={selectDropdownClass}
                  >
                    <option value="cash">Cash / Walk-in</option>
                    <option value="gcash">GCash (Direct)</option>
                    <option value="free">Free / Complimentary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-300 mb-1">
                    Fee Per Player (₱)
                  </label>
                  <input
                    type="number"
                    disabled={paymentMethod === 'free'}
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className={selectDropdownClass}
                  >
                    <option value="paid">✓ Paid & Approved</option>
                    <option value="pending_verification">⏳ Pending Verification</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'gcash' && (
                <div>
                  <label className="block text-xs font-normal text-slate-300 mb-1">
                    GCash Reference Number
                  </label>
                  <input
                    type="text"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                    placeholder="e.g. 10029384756"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-normal text-slate-300 mb-1">
                  Admin Notes <span className="text-slate-500 text-[11px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Paid cash at counter to manager"
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                />
              </div>
            </div>

            {/* Registration Summary Box */}
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 font-normal">Registration: </span>
                <span className="text-white font-bold">
                  {totalHeadcount} {totalHeadcount === 1 ? 'Player' : 'Players'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-400 font-normal">Total Collected: </span>
                <span className="text-base sm:text-lg font-mono font-bold text-brand-lime">
                  ₱{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Modal Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-900/95 backdrop-blur-md z-10">
            <div className="text-xs text-slate-400 truncate hidden xs:block">
              {spotsRemaining > 0 ? (
                <span>Remaining: <strong className="text-brand-lime">{spotsRemaining}</strong></span>
              ) : (
                <span className="text-red-400">Full</span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isSessionClosed ||
                  isFull ||
                  isAlreadyRegistered ||
                  totalHeadcount > spotsRemaining ||
                  (userMode === 'existing' && !selectedUser) ||
                  !playerName.trim()
                }
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  isSubmitting ||
                  isSessionClosed ||
                  isFull ||
                  isAlreadyRegistered ||
                  totalHeadcount > spotsRemaining ||
                  (userMode === 'existing' && !selectedUser) ||
                  !playerName.trim()
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
                    : 'bg-brand-lime hover:bg-[#a6e224] text-dark-bg cursor-pointer shadow-lg shadow-brand-lime/20 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-dark-bg" />
                    <span>Confirm Registration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
