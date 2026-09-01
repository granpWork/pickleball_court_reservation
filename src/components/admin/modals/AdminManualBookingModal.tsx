import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, DollarSign, Check, AlertCircle, CreditCard, FileText } from 'lucide-react';
import { type Court, type Booking, SLOTS, getSlotPrice } from '../adminTypes';

interface AdminManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: Court[];
  existingBookings: Booking[];
  onSaveBooking: (booking: Partial<Booking>) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const AdminManualBookingModal: React.FC<AdminManualBookingModalProps> = ({
  isOpen,
  onClose,
  courts,
  existingBookings,
  onSaveBooking,
  isSubmitting = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedCourtId, setSelectedCourtId] = useState<string>(courts[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'approved' | 'pending'>('pending');
  const [customTotalCost, setCustomTotalCost] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');



  React.useEffect(() => {
    if (isOpen && courts.length > 0) {
      if (!selectedCourtId || !courts.some((c) => c.id === selectedCourtId)) {
        setSelectedCourtId(courts[0].id);
      }
    }
  }, [isOpen, courts, selectedCourtId]);

  const selectedCourt = useMemo(() => {
    return courts.find((c) => c.id === selectedCourtId) || courts[0];
  }, [courts, selectedCourtId]);

  // Determine occupied slots for selected court and date
  const occupiedSlots = useMemo(() => {
    const courtIdToUse = selectedCourtId || courts[0]?.id;
    if (!courtIdToUse || !selectedDate) return new Set<string>();

    const occupied = new Set<string>();
    existingBookings.forEach((b) => {
      if (b.status === 'cancelled') return;
      if (b.courtId === courtIdToUse && b.date === selectedDate) {
        if (Array.isArray(b.slots)) {
          b.slots.forEach((s) => occupied.add(s));
        }
      }
    });
    return occupied;
  }, [existingBookings, selectedCourtId, courts, selectedDate]);

  // Calculate default price for selected slots
  const calculatedTotal = useMemo(() => {
    if (!selectedCourt || selectedSlots.length === 0) return 0;
    const dayRate = selectedCourt.dayPrice || 120;
    const nightRate = selectedCourt.nightPrice || 200;

    let total = 0;
    selectedSlots.forEach((slotStr) => {
      const matchedSlot = SLOTS.find((s) => s.time === slotStr);
      const startHour = matchedSlot ? matchedSlot.startHour : 12;
      total += getSlotPrice(startHour, dayRate, nightRate);
    });
    return total;
  }, [selectedCourt, selectedSlots]);

  if (!isOpen) return null;

  const handleToggleSlot = (slotTime: string) => {
    if (occupiedSlots.has(slotTime)) return;
    setSelectedSlots((prev) =>
      prev.includes(slotTime)
        ? prev.filter((s) => s !== slotTime)
        : [...prev, slotTime]
    );
  };

  const handleSelectAllAvailableSlots = () => {
    const available = SLOTS.map((s) => s.time).filter((t) => !occupiedSlots.has(t));
    setSelectedSlots(available);
  };

  const handleClearSlots = () => {
    setSelectedSlots([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetCourt = selectedCourt || (courts.length > 0 ? courts[0] : null);

    if (!targetCourt) {
      setErrorMsg('Please select a valid court.');
      return;
    }

    if (!selectedDate) {
      setErrorMsg('Please select a date.');
      return;
    }

    if (selectedSlots.length === 0) {
      setErrorMsg('Please select at least one time slot.');
      return;
    }

    const finalName = customerName.trim() || 'Walk-in Guest';
    const finalEmail = customerEmail.trim() || 'walkin@bookpicklecourt.com';

    const finalCost = customTotalCost !== '' ? parseFloat(customTotalCost) : calculatedTotal;
    if (isNaN(finalCost) || finalCost < 0) {
      setErrorMsg('Please enter a valid total cost amount.');
      return;
    }

    const payload: Partial<Booking> = {
      id: `bk_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookingId: `BK-WALKIN-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'court',
      companyId: targetCourt.companyId || '',
      courtId: targetCourt.id,
      courtName: targetCourt.name,
      courtType: targetCourt.type || 'Standard Court',
      date: selectedDate,
      slots: selectedSlots,
      totalCost: finalCost,
      status: paymentStatus,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus === 'approved' ? 'paid' : 'pending_verification',
      user: {
        name: finalName,
        email: finalEmail,
        phone: customerPhone.trim() || undefined,
      },
      userName: finalName,
      userEmail: finalEmail,
      userPhone: customerPhone.trim() || undefined,
      createdAt: new Date().toISOString(),
      bookingReference: internalNotes.trim() || `WALKIN-${Date.now().toString().slice(-6)}`,
    };

    try {
      await onSaveBooking(payload);
      // Reset form on success
      setSelectedSlots([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomTotalCost('');
      setInternalNotes('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create manual booking. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Manual / Walk-in Reservation</h3>
              <p className="text-xs text-slate-400 font-medium">Create a court booking on behalf of a player</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Court & Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Select Court <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedCourtId}
                onChange={(e) => {
                  setSelectedCourtId(e.target.value);
                  setSelectedSlots([]);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type || 'Standard'}) &mdash; ₱{c.dayPrice || 120}/hr
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Reservation Date <span className="text-red-400">*</span>
              </label>
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlots([]);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Time Slots Picker (Matching Landing Page CourtDetails.tsx layout) */}
          <div className="space-y-4 border-t border-b border-slate-800/80 py-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-lime" />
                <span>Select Time Slot (1 Hour)</span>
                <span className="text-red-400">*</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllAvailableSlots}
                  className="text-xs font-bold text-brand-lime hover:underline cursor-pointer"
                >
                  Select Available
                </button>
                <span className="text-slate-600">|</span>
                {selectedSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSlots}
                    className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
              {/* AM (Morning) Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60">
                    AM (Morning)
                  </span>
                  <div className="h-[1px] bg-slate-800/50 flex-1"></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.filter((s) => s.startHour < 12).map((slot, idx) => {
                    const isOccupied = occupiedSlots.has(slot.time);
                    const isSelected = selectedSlots.includes(slot.time);
                    const price = getSlotPrice(slot.startHour, selectedCourt?.dayPrice || 120, selectedCourt?.nightPrice || 200);

                    return (
                      <button
                        key={`am-${idx}`}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => handleToggleSlot(slot.time)}
                        className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center cursor-pointer ${
                          isOccupied
                            ? 'opacity-40 bg-slate-900/20 border-slate-900 text-slate-650 cursor-not-allowed'
                            : isSelected
                            ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold font-sans shadow-md'
                            : 'bg-dark-bg/60 border-slate-800 text-slate-350 hover:bg-slate-850'
                        }`}
                      >
                        <span>{slot.time.split(' - ')[0]}</span>
                        <span
                          className={`text-xs font-extrabold ${
                            isOccupied
                              ? 'text-slate-500 font-sans'
                              : isSelected
                              ? 'text-dark-bg/85 font-sans'
                              : 'text-brand-lime font-sans'
                          }`}
                        >
                          {isOccupied ? 'Booked' : `₱${price}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider between AM & PM */}
              <div className="border-t border-slate-800/80 my-3" />

              {/* PM (Afternoon/Evening) Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60">
                    PM (Afternoon/Evening)
                  </span>
                  <div className="h-[1px] bg-slate-800/50 flex-1"></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.filter((s) => s.startHour >= 12).map((slot, idx) => {
                    const isOccupied = occupiedSlots.has(slot.time);
                    const isSelected = selectedSlots.includes(slot.time);
                    const price = getSlotPrice(slot.startHour, selectedCourt?.dayPrice || 120, selectedCourt?.nightPrice || 200);

                    return (
                      <button
                        key={`pm-${idx}`}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => handleToggleSlot(slot.time)}
                        className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center cursor-pointer ${
                          isOccupied
                            ? 'opacity-40 bg-slate-900/20 border-slate-900 text-slate-650 cursor-not-allowed'
                            : isSelected
                            ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold font-sans shadow-md'
                            : 'bg-dark-bg/60 border-slate-800 text-slate-350 hover:bg-slate-850'
                        }`}
                      >
                        <span>{slot.time.split(' - ')[0]}</span>
                        <span
                          className={`text-xs font-extrabold ${
                            isOccupied
                              ? 'text-slate-500 font-sans'
                              : isSelected
                              ? 'text-dark-bg/85 font-sans'
                              : 'text-brand-lime font-sans'
                          }`}
                        >
                          {isOccupied ? 'Booked' : `₱${price}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total / Selected Summary */}
            {selectedSlots.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">
                  Selected: <strong className="text-brand-lime font-extrabold">{selectedSlots.length} slot(s)</strong> ({selectedSlots.length}.0 hrs)
                </span>
                <span className="text-slate-400 font-medium">
                  Subtotal: <strong className="text-brand-lime font-mono font-bold text-sm">₱{calculatedTotal}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Customer Information */}
          <div className="space-y-3 pt-2 border-t border-slate-800/60">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Customer Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. juan@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Payment Details */}
          <div className="space-y-3 pt-2 border-t border-slate-800/60">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Payment & Status
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime"
                >
                  <option value="cash">Cash (Over the counter)</option>
                  <option value="gcash">GCash Direct</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="complimentary">Complimentary / VIP</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Booking Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime"
                >
                  <option value="approved">Approved & Paid</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Total Cost (₱)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={customTotalCost !== '' ? customTotalCost : calculatedTotal}
                    onChange={(e) => setCustomTotalCost(e.target.value)}
                    placeholder={calculatedTotal.toString()}
                    min="0"
                    step="1"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-brand-lime focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Internal Notes / Reference (Optional)
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="e.g. Walk-in paid cash to reception staff"
                  rows={2}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg text-xs font-black hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Create Reservation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
