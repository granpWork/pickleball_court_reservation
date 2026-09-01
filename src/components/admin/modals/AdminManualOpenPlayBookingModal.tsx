import React, { useState } from 'react';
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
} from 'lucide-react';
import type { OpenPlayEvent, OpenPlayRegistration } from '../../OpenPlayDetails';

interface AdminManualOpenPlayBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OpenPlayEvent | null;
  currentRegistrations: OpenPlayRegistration[];
  onSaveManualBooking: (payload: any) => Promise<void>;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
}

export const AdminManualOpenPlayBookingModal: React.FC<AdminManualOpenPlayBookingModalProps> = ({
  isOpen,
  onClose,
  event,
  currentRegistrations,
  onSaveManualBooking,
  formatEventDateLong,
  formatTime12h,
}) => {
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
    } catch (e) {
      return false;
    }
  })();

  const isSessionClosed = isExpired || event.status === 'expired';

  // Calculate Capacity
  const activeRegs = currentRegistrations.filter(r => r.eventId === event.id && r.status !== 'cancelled');
  const currentHeadcount = activeRegs.reduce((sum, r) => sum + (r.playerCount || (1 + (r.guestCount || 0))), 0);
  const maxCapacity = event.maxParticipants || 16;
  const spotsRemaining = Math.max(0, maxCapacity - currentHeadcount);

  // Form State
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  
  // Guest State
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'free'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending_verification'>('paid');
  const [customFee, setCustomFee] = useState<string>(event.registrationFee ? String(event.registrationFee) : '0');
  const [gcashRef, setGcashRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalHeadcount = 1 + guests.length;
  const feePerPlayer = Number(customFee) || 0;
  const totalAmount = paymentMethod === 'free' ? 0 : feePerPlayer * totalHeadcount;

  const handleAddGuest = () => {
    if (isSessionClosed) {
      setErrorMsg('This Open Play session has expired/concluded. Registrations are disabled.');
      return;
    }
    if (totalHeadcount >= spotsRemaining) {
      setErrorMsg(`Cannot add more guests. Only ${spotsRemaining} ${spotsRemaining === 1 ? 'spot' : 'spots'} remaining in session.`);
      return;
    }
    setErrorMsg(null);
    setGuests(prev => [...prev, { name: '', email: '' }]);
  };

  const handleRemoveGuest = (index: number) => {
    setGuests(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  const handleGuestChange = (index: number, field: 'name' | 'email', value: string) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isSessionClosed) {
      setErrorMsg('This Open Play session has expired/concluded. Manual player registrations cannot be added to past sessions.');
      return;
    }

    if (!playerName.trim()) {
      setErrorMsg('Primary Player Name is required.');
      return;
    }

    if (totalHeadcount > spotsRemaining) {
      setErrorMsg(`Total headcount (${totalHeadcount}) exceeds remaining capacity (${spotsRemaining} spots left).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const guestNames = guests.map(g => g.name.trim()).filter(Boolean);
      const guestEmails = guests.map(g => g.email.trim()).filter(Boolean);

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
        playerCount: totalHeadcount,
        guestCount: guests.length,
        guests: guests,
        guestNames: guestNames,
        guestEmails: guestEmails,
        gcashReferenceNumber: paymentMethod === 'gcash' ? gcashRef.trim() : (paymentMethod === 'cash' ? 'CASH-WALKIN' : 'FREE-ENTRY'),
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

  const selectDropdownClass = "w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-normal focus:outline-none focus:border-brand-lime cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_14px_center] bg-no-repeat pr-9";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-3xl w-full shadow-2xl text-left space-y-6 my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-normal text-white leading-tight">Manual Player Registration</h3>
              <p className="text-sm text-slate-400 font-normal">Add walk-in, cash, or phone bookings to Open Play roster</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Highlights Banner */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-normal text-white text-base md:text-lg">{event.title}</span>
            <span className={`px-3 py-1 rounded-full font-normal text-xs uppercase border ${
              spotsRemaining > 0 ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {spotsRemaining > 0 ? `${spotsRemaining} ${spotsRemaining === 1 ? 'Spot' : 'Spots'} Left` : 'Session Full'}
            </span>
          </div>

          <div className="flex items-center gap-5 text-slate-300 flex-wrap font-normal">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-lime" />
              <span>{formatEventDateLong ? formatEventDateLong(event.eventDate) : event.eventDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{formatTime12h ? `${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}` : `${event.startTime} - ${event.endTime}`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>{event.courtNames && event.courtNames.length > 0 ? event.courtNames.join(', ') : 'Courts'}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSessionClosed && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-normal flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <span>This Open Play session has concluded/expired. Manual player registrations are disabled for past sessions.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-normal flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Player Section */}
          <div className="space-y-3.5 pt-1">
            <div className="text-sm font-normal text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Primary Player Information</span>
              <span className="text-xs text-amber-400 font-normal">* Required</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Juan Cruz"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={playerEmail}
                    onChange={(e) => setPlayerEmail(e.target.value)}
                    placeholder="e.g. player@example.com"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={playerPhone}
                    onChange={(e) => setPlayerPhone(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Guest Players Section */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-sm font-normal text-slate-400 uppercase tracking-wider">
                Guest Registrations ({guests.length})
              </span>
              <button
                type="button"
                onClick={handleAddGuest}
                disabled={totalHeadcount >= spotsRemaining}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-lime text-xs md:text-sm font-normal flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add Guest
              </button>
            </div>

            {guests.map((guest, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <span className="text-slate-500 font-mono text-xs md:text-sm font-normal pl-1">#{idx + 1}</span>
                <input
                  type="text"
                  placeholder="Guest Full Name"
                  value={guest.name}
                  onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveGuest(idx)}
                  className="p-2 rounded-xl hover:bg-slate-900 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Payment & Fee Options Section */}
          <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
            <div className="text-sm font-normal text-slate-400 uppercase tracking-wider">Payment & Fee Details</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Payment Method</label>
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
                <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Fee Per Player (₱)</label>
                <input
                  type="number"
                  disabled={paymentMethod === 'free'}
                  value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-normal text-white focus:outline-none focus:border-brand-lime disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Payment Status</label>
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
                <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">GCash Reference Number</label>
                <input
                  type="text"
                  value={gcashRef}
                  onChange={(e) => setGcashRef(e.target.value)}
                  placeholder="e.g. 10029384756"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs md:text-sm font-normal text-slate-300 mb-1.5">Admin Notes (Optional)</label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Paid cash to counter manager"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-normal text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
              />
            </div>
          </div>

          {/* Registration Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-sm">
            <div>
              <span className="text-slate-400 font-normal">Total Registration: </span>
              <span className="text-white font-normal">{totalHeadcount} {totalHeadcount === 1 ? 'Player' : 'Players'}</span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 font-normal">Total Collected: </span>
              <span className="text-lg md:text-xl font-mono font-normal text-brand-lime">
                ₱{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-normal transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isSessionClosed || totalHeadcount > spotsRemaining}
              className="px-6 py-2.5 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg text-sm font-normal flex items-center gap-2 shadow-lg shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                  <span>Saving Registration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-dark-bg" />
                  <span>Confirm Manual Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
