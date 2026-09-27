import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, DollarSign, Check, AlertCircle, CreditCard, FileText, ChevronDown, Building2, Wrench, Trophy, Crown, Tag, ArrowLeft, ArrowRight } from 'lucide-react';
import { type Court, type Booking, type BookingCategory, BOOKING_CATEGORIES, SLOTS, getSlotPrice } from '../adminTypes';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { getOpenPlayTimeSlots } from '../../../utils/timeSlotUtils';

interface AdminManualBookingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  courts: Court[];
  existingBookings: Booking[];
  openPlayEvents?: OpenPlayEvent[];
  onSaveBooking: (booking: Partial<Booking>) => Promise<void> | void;
  isSubmitting?: boolean;
  isEmbedded?: boolean;
}

export const AdminManualBookingModal: React.FC<AdminManualBookingModalProps> = ({
  isOpen = false,
  onClose = () => {},
  courts,
  existingBookings,
  openPlayEvents = [],
  onSaveBooking,
  isSubmitting = false,
  isEmbedded = false,
}) => {
  const getTodayLocalStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayLocalStr();

  const [bookingCategory, setBookingCategory] = useState<BookingCategory>('regular');
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const isStep1Valid = Boolean(selectedCourtId && selectedDate);
  const isStep2Valid = isStep1Valid && selectedSlots.length > 0;

  const isFormValid = useMemo(() => {
    const hasCourtAndDate = Boolean(selectedCourtId && selectedDate);
    const hasSelectedSlots = selectedSlots.length > 0;
    const hasCustomerDetails = Boolean(customerName.trim());
    const isCostValid = customTotalCost === '' || (!isNaN(parseFloat(customTotalCost)) && parseFloat(customTotalCost) >= 0);

    return hasCourtAndDate && hasSelectedSlots && hasCustomerDetails && isCostValid;
  }, [selectedCourtId, selectedDate, selectedSlots, customerName, customTotalCost]);

  const missingRequirementsText = useMemo(() => {
    if (!selectedCourtId || !selectedDate) return 'Select court & reservation date (Step 1)';
    if (selectedSlots.length === 0) return 'Select at least 1 time slot (Step 2)';
    if (!customerName.trim()) return 'Enter Customer Full Name (Step 3)';
    if (customTotalCost !== '' && (isNaN(parseFloat(customTotalCost)) || parseFloat(customTotalCost) < 0)) {
      return 'Enter a valid total cost amount (Step 3)';
    }
    return '';
  }, [selectedCourtId, selectedDate, selectedSlots, customerName, customTotalCost]);

  const handleGoToStep = (targetStep: 1 | 2 | 3) => {
    if (targetStep === 2 && !isStep1Valid) {
      setErrorMsg('Please select a valid court and reservation date.');
      return;
    }
    if (targetStep === 3 && !isStep2Valid) {
      if (!isStep1Valid) {
        setErrorMsg('Please select a valid court and reservation date.');
      } else {
        setErrorMsg('Please select at least 1 time slot before proceeding.');
      }
      return;
    }
    setErrorMsg('');
    setCurrentStep(targetStep);
  };

  const handleSelectCategory = (cat: BookingCategory) => {
    setBookingCategory(cat);
    if (!customerName.trim()) {
      if (cat === 'maintenance') setCustomerName('Court Maintenance & Repairs');
      else if (cat === 'company_block') setCustomerName('Company Event / Private Block');
      else if (cat === 'tournament') setCustomerName('Tournament / League Match');
      else if (cat === 'vip') setCustomerName('VIP Guest');
    }
    if (cat === 'maintenance') {
      setCustomTotalCost('0');
      setPaymentMethod('complimentary');
      setPaymentStatus('approved');
      setInternalNotes('Blocked for facility maintenance, cleaning, & court surface repairs');
    } else if (cat === 'company_block') {
      setCustomTotalCost('0');
      setPaymentMethod('complimentary');
      setPaymentStatus('approved');
      setInternalNotes('Court reserved for internal company matters & staff activities');
    } else if (cat === 'tournament') {
      setPaymentMethod('cash');
      setPaymentStatus('approved');
      setInternalNotes('Official tournament / league court block');
    } else if (cat === 'vip') {
      setPaymentMethod('complimentary');
      setPaymentStatus('approved');
    }
  };

  React.useEffect(() => {
    if ((isOpen || isEmbedded) && courts.length > 0) {
      if (!selectedCourtId || !courts.some((c) => c.id === selectedCourtId)) {
        setSelectedCourtId(courts[0].id);
      }
    }
  }, [isOpen, isEmbedded, courts, selectedCourtId]);

  const selectedCourt = useMemo(() => {
    return courts.find((c) => c.id === selectedCourtId) || courts[0];
  }, [courts, selectedCourtId]);

  // Determine occupied slots for selected court and date (Regular Bookings + Open Play Sessions)
  const { approvedSlots, pendingSlots } = useMemo(() => {
    const courtIdToUse = selectedCourtId || courts[0]?.id;
    if (!courtIdToUse || !selectedDate) {
      return { approvedSlots: new Set<string>(), pendingSlots: new Set<string>() };
    }

    const approved = new Set<string>();
    const pending = new Set<string>();

    // 1. Regular Court Bookings
    existingBookings.forEach((b) => {
      if (b.status === 'cancelled') return;
      if (b.courtId === courtIdToUse && b.date === selectedDate) {
        if (Array.isArray(b.slots)) {
          const bStatusStr = String(b.status || '');
          const bPaymentStatusStr = String((b as any).paymentStatus || '');
          const isApproved =
            bStatusStr === 'approved' ||
            bStatusStr === 'confirmed' ||
            bStatusStr === 'completed' ||
            bStatusStr === 'active' ||
            bPaymentStatusStr === 'paid' ||
            bPaymentStatusStr === 'approved';

          if (isApproved) {
            b.slots.forEach((s) => approved.add(s));
          } else {
            b.slots.forEach((s) => pending.add(s));
          }
        }
      }
    });

    // 2. Scheduled Open Play Events
    if (openPlayEvents && openPlayEvents.length > 0) {
      openPlayEvents.forEach((ev) => {
        if (ev.status === 'cancelled') return;
        const evDate = ev.eventDate || (ev as any).date;
        if (evDate === selectedDate) {
          const isCourtMatch =
            !ev.courtIds ||
            ev.courtIds.length === 0 ||
            ev.courtIds.includes(courtIdToUse) ||
            (ev as any).courtId === courtIdToUse;
          if (isCourtMatch) {
            const blockedSlots = getOpenPlayTimeSlots(ev.startTime, ev.endTime);
            blockedSlots.forEach((st) => approved.add(st));
          }
        }
      });
    }

    // Approved slots take precedence over pending
    pending.forEach((st) => {
      if (approved.has(st)) {
        pending.delete(st);
      }
    });

    return { approvedSlots: approved, pendingSlots: pending };
  }, [existingBookings, openPlayEvents, selectedCourtId, courts, selectedDate]);

  const occupiedSlots = useMemo(() => {
    return new Set<string>([...approvedSlots, ...pendingSlots]);
  }, [approvedSlots, pendingSlots]);

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

  const currentCategoryMeta = useMemo(() => {
    return BOOKING_CATEGORIES.find((c) => c.id === bookingCategory) || BOOKING_CATEGORIES[0];
  }, [bookingCategory]);

  const isSlotInPast = (startHour: number): boolean => {
    const todayLocalStr = getTodayLocalStr();
    if (selectedDate < todayLocalStr) return true;
    if (selectedDate > todayLocalStr) return false;
    const currentHour = new Date().getHours();
    return startHour <= currentHour;
  };

  useEffect(() => {
    setSelectedSlots((prev) =>
      prev.filter((slotTime) => {
        const slotObj = SLOTS.find((s) => s.time === slotTime);
        if (!slotObj) return false;
        if (occupiedSlots.has(slotTime)) return false;
        if (isSlotInPast(slotObj.startHour)) return false;
        return true;
      })
    );
  }, [selectedDate, occupiedSlots]);

  if (!isEmbedded && !isOpen) return null;

  const handleToggleSlot = (slotTime: string) => {
    const slotObj = SLOTS.find((s) => s.time === slotTime);
    if (occupiedSlots.has(slotTime) || (slotObj && isSlotInPast(slotObj.startHour))) return;
    setSelectedSlots((prev) =>
      prev.includes(slotTime)
        ? prev.filter((s) => s !== slotTime)
        : [...prev, slotTime]
    );
  };

  const handleSelectAllAvailableSlots = () => {
    const available = SLOTS.filter((s) => !occupiedSlots.has(s.time) && !isSlotInPast(s.startHour)).map((s) => s.time);
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
      setCurrentStep(1);
      return;
    }

    if (!selectedDate) {
      setErrorMsg('Please select a date.');
      setCurrentStep(1);
      return;
    }

    if (selectedSlots.length === 0) {
      setErrorMsg('Please select at least one time slot.');
      setCurrentStep(2);
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Please enter customer full name in Step 3.');
      setCurrentStep(3);
      return;
    }

    const defaultNameFallback =
      bookingCategory === 'maintenance' ? 'Court Maintenance & Repairs'
      : bookingCategory === 'company_block' ? 'Company Event / Private Block'
      : bookingCategory === 'tournament' ? 'Tournament / League Match'
      : bookingCategory === 'vip' ? 'VIP Guest'
      : 'Walk-in Guest';

    const defaultEmailFallback =
      bookingCategory === 'maintenance' ? 'maintenance@internal'
      : bookingCategory === 'company_block' ? 'events@company.internal'
      : bookingCategory === 'tournament' ? 'league@pickleball.org'
      : bookingCategory === 'vip' ? 'vip@bookpicklecourt.com'
      : 'walkin@bookpicklecourt.com';

    const finalName = customerName.trim() || defaultNameFallback;
    const finalEmail = customerEmail.trim() || defaultEmailFallback;

    const finalCost = customTotalCost !== '' ? parseFloat(customTotalCost) : calculatedTotal;
    if (isNaN(finalCost) || finalCost < 0) {
      setErrorMsg('Please enter a valid total cost amount.');
      setCurrentStep(3);
      return;
    }

    const payload: Partial<Booking> = {
      id: `bk_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookingId: `BK-WALKIN-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'court',
      bookingCategory: bookingCategory,
      isManual: true,
      bookingSource: 'manual',
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
      setBookingCategory('regular');
      setSelectedSlots([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomTotalCost('');
      setInternalNotes('');
      setCurrentStep(1);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create manual booking. Please try again.');
    }
  };

  const renderSummaryCard = () => (
    <div className="glass-panel border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-left backdrop-blur-md sticky top-4">
      {/* Summary Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-white font-extrabold text-sm">
          <FileText className="w-4 h-4 text-brand-lime" />
          <span>Booking Summary</span>
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${currentCategoryMeta.badgeBg} ${currentCategoryMeta.badgeText} ${currentCategoryMeta.badgeBorder}`}>
          {currentCategoryMeta.shortLabel}
        </span>
      </div>

      {/* Selected Court & Date Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Court Facility</span>
          <span className="text-xs font-extrabold text-white">{selectedCourt?.name || 'Standard Court'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Date</span>
          <span className="text-xs font-bold text-brand-lime flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
          </span>
        </div>
      </div>

      {/* Selected Time Slots */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Time Slots
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedSlots.length} slot(s) ({selectedSlots.length}.0 hrs)
          </span>
        </div>

        {selectedSlots.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
            {selectedSlots.map((s, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-brand-lime/15 border border-brand-lime/30 text-brand-lime text-[11px] font-bold rounded-lg"
              >
                {s}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 italic">
            No time slots selected yet
          </div>
        )}
      </div>

      {/* Customer Information Preview */}
      <div className="space-y-2 border-t border-slate-800/80 pt-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-purple-400" />
          Customer Info
        </span>
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Full Name:</span>
            <span className="font-semibold text-white truncate max-w-[170px]">
              {customerName.trim() || (
                bookingCategory === 'maintenance' ? 'Court Maintenance & Repairs'
                : bookingCategory === 'company_block' ? 'Company Event / Private Block'
                : bookingCategory === 'tournament' ? 'Tournament / League Match'
                : bookingCategory === 'vip' ? 'VIP Guest'
                : 'Walk-in Guest'
              )}
            </span>
          </div>
          {customerEmail.trim() && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Email:</span>
              <span className="text-slate-300 truncate max-w-[170px]">{customerEmail.trim()}</span>
            </div>
          )}
          {customerPhone.trim() && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Phone:</span>
              <span className="text-slate-300 font-mono">{customerPhone.trim()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Status Summary */}
      <div className="space-y-2 border-t border-slate-800/80 pt-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Payment Method:</span>
          <span className="font-semibold text-white uppercase tracking-wider text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {paymentMethod.replace('_', ' ')}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Status:</span>
          <span className={`font-bold text-[11px] px-2 py-0.5 rounded border ${
            paymentStatus === 'approved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
          }`}>
            {paymentStatus === 'approved' ? 'Approved & Paid' : 'Pending Payment'}
          </span>
        </div>
      </div>

      {/* Price Breakdown & Total */}
      <div className="border-t border-slate-800/80 pt-3 space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Calculated Subtotal:</span>
          <span className="font-mono text-slate-300">₱{calculatedTotal.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
          <span className="text-xs font-black text-white uppercase tracking-wider">Total Payable</span>
          <span className="text-xl font-mono font-black text-brand-lime">
            ₱{(customTotalCost !== '' ? parseFloat(customTotalCost) || 0 : calculatedTotal).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Requirement status notice when disabled */}
      {!isFormValid && !isSubmitting && (
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Requires: {missingRequirementsText}</span>
        </div>
      )}

      {/* Quick Submit CTA */}
      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-800/80 disabled:text-slate-500 disabled:border-slate-800 disabled:shadow-none disabled:cursor-not-allowed bg-brand-lime text-dark-bg hover:bg-[#a6e224] shadow-brand-lime/10"
      >
        {isSubmitting ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></span>
            <span>Saving Reservation...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm & Save Reservation</span>
          </>
        )}
      </button>
    </div>
  );

  const renderStepperHeader = () => (
    <div className="glass-panel border border-slate-800 rounded-3xl p-4 shadow-xl w-full mb-6">
      <div className="flex items-center justify-between relative px-2">
        {/* Background Connecting Progress Line */}
        <div className="absolute top-1/2 left-8 right-8 sm:left-12 sm:right-12 -translate-y-1/2 h-1 bg-slate-800/80 rounded-full overflow-hidden -z-0">
          <div
            className="h-full bg-brand-lime transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(181,245,41,0.5)]"
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
          ></div>
        </div>

        {/* Step 1 Badge */}
        <button
          type="button"
          onClick={() => handleGoToStep(1)}
          className={`relative z-10 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
            currentStep === 1
              ? 'bg-brand-lime text-dark-bg border-brand-lime shadow-lg shadow-brand-lime/30 scale-105'
              : currentStep > 1
              ? 'bg-slate-900 text-brand-lime border-brand-lime/40'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-current">
            {currentStep > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
          </span>
          <span className="hidden sm:inline">1. Purpose & Court</span>
        </button>

        {/* Step 2 Badge */}
        <button
          type="button"
          onClick={() => handleGoToStep(2)}
          className={`relative z-10 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
            currentStep === 2
              ? 'bg-brand-lime text-dark-bg border-brand-lime shadow-lg shadow-brand-lime/30 scale-105'
              : currentStep > 2
              ? 'bg-slate-900 text-brand-lime border-brand-lime/40'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-current">
            {currentStep > 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '2'}
          </span>
          <span className="hidden sm:inline">2. Time Slots</span>
        </button>

        {/* Step 3 Badge */}
        <button
          type="button"
          onClick={() => handleGoToStep(3)}
          className={`relative z-10 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
            currentStep === 3
              ? 'bg-brand-lime text-dark-bg border-brand-lime shadow-lg shadow-brand-lime/30 scale-105'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-current">3</span>
          <span className="hidden sm:inline">3. Customer & Payment</span>
        </button>
      </div>
    </div>
  );

  const formFieldsLeft = (
    <div className="space-y-6">
      {/* STEP 1 CARD: Purpose & Court Selection */}
      {currentStep === 1 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shadow-md">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Booking Type, Purpose & Court</h4>
                <p className="text-xs text-slate-400 font-medium">Select the reservation purpose, facility court, and date.</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
              Step 1 of 3
            </span>
          </div>

          {/* Booking Purpose & Category Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand-lime" />
              <span>Booking Type / Purpose</span>
              <span className="text-red-400">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOOKING_CATEGORIES.map((cat) => {
                const isSelected = bookingCategory === cat.id;
                const Icon = cat.id === 'company_block' ? Building2
                  : cat.id === 'maintenance' ? Wrench
                  : cat.id === 'tournament' ? Trophy
                  : cat.id === 'vip' ? Crown
                  : User;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? `${cat.badgeBg} ${cat.badgeBorder} border-2 shadow-lg shadow-brand-lime/5`
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-slate-900/80 text-white' : 'bg-slate-900/40 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-lime stroke-[3]" />}
                    </div>
                    <div>
                      <div className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {cat.shortLabel}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                        {cat.id === 'regular' ? 'Public/Walk-in'
                          : cat.id === 'company_block' ? 'Corporate Block'
                          : cat.id === 'maintenance' ? 'Facility Work'
                          : cat.id === 'tournament' ? 'Match / League'
                          : 'Priority Guest'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Court & Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Select Court <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedCourtId}
                  onChange={(e) => {
                    setSelectedCourtId(e.target.value);
                    setSelectedSlots([]);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-lime appearance-none pr-10 cursor-pointer shadow-md transition-all"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} ({c.type || 'Standard'}) &mdash; ₱{c.dayPrice || 120}/hr
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
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

          {/* Step 1 Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {!isEmbedded ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => handleGoToStep(2)}
              className="px-6 py-2.5 rounded-xl bg-brand-lime text-dark-bg text-xs font-black hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10 flex items-center gap-2"
            >
              <span>Next: Select Time Slots</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 CARD: Select Time Slot (1 Hour) */}
      {currentStep === 2 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shadow-md">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Select Time Slot (1 Hour)</h4>
                <p className="text-xs text-slate-400 font-medium">Choose one or multiple hourly slots for {selectedCourt?.name || 'court'}.</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
              Step 2 of 3
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-lime" />
                <span>Available Hourly Slots</span>
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

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
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
                    const isApproved = approvedSlots.has(slot.time);
                    const isPending = pendingSlots.has(slot.time);
                    const isPast = isSlotInPast(slot.startHour);
                    const isSelected = selectedSlots.includes(slot.time);
                    const isDisabled = isApproved || isPending || isPast;
                    const price = getSlotPrice(slot.startHour, selectedCourt?.dayPrice || 120, selectedCourt?.nightPrice || 200);

                    return (
                      <button
                        key={`am-${idx}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleToggleSlot(slot.time)}
                        className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center ${
                          isApproved
                            ? 'bg-rose-950/20 border-rose-800/60 text-rose-300/80 cursor-not-allowed opacity-90'
                            : isPending
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-400 cursor-not-allowed opacity-90'
                            : isPast
                            ? 'bg-slate-900/40 border-slate-800/40 text-slate-500/70 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold font-sans shadow-md'
                            : 'bg-dark-bg/60 border-slate-800 text-slate-350 hover:bg-slate-850'
                        }`}
                      >
                        <span>{slot.time.split(' - ')[0]}</span>
                        <span
                          className={`text-xs font-extrabold ${
                            isApproved
                              ? 'text-rose-400 font-sans'
                              : isPending
                              ? 'text-amber-400 font-sans'
                              : isPast
                              ? 'text-slate-500 font-sans'
                              : isSelected
                              ? 'text-dark-bg/85 font-sans'
                              : 'text-brand-lime font-sans'
                          }`}
                        >
                          {isApproved ? 'Booked' : isPending ? 'Blocked' : isPast ? 'Passed' : `₱${price}`}
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
                    const isApproved = approvedSlots.has(slot.time);
                    const isPending = pendingSlots.has(slot.time);
                    const isPast = isSlotInPast(slot.startHour);
                    const isSelected = selectedSlots.includes(slot.time);
                    const isDisabled = isApproved || isPending || isPast;
                    const price = getSlotPrice(slot.startHour, selectedCourt?.dayPrice || 120, selectedCourt?.nightPrice || 200);

                    return (
                      <button
                        key={`pm-${idx}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleToggleSlot(slot.time)}
                        className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center ${
                          isApproved
                            ? 'bg-rose-950/20 border-rose-800/60 text-rose-300/80 cursor-not-allowed opacity-90'
                            : isPending
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-400 cursor-not-allowed opacity-90'
                            : isPast
                            ? 'bg-slate-900/40 border-slate-800/40 text-slate-500/70 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold font-sans shadow-md'
                            : 'bg-dark-bg/60 border-slate-800 text-slate-350 hover:bg-slate-850'
                        }`}
                      >
                        <span>{slot.time.split(' - ')[0]}</span>
                        <span
                          className={`text-xs font-extrabold ${
                            isApproved
                              ? 'text-rose-400 font-sans'
                              : isPending
                              ? 'text-amber-400 font-sans'
                              : isPast
                              ? 'text-slate-500 font-sans'
                              : isSelected
                              ? 'text-dark-bg/85 font-sans'
                              : 'text-brand-lime font-sans'
                          }`}
                        >
                          {isApproved ? 'Booked' : isPending ? 'Blocked' : isPast ? 'Passed' : `₱${price}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total / Selected Summary */}
            {selectedSlots.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">
                  Selected: <strong className="text-brand-lime font-extrabold">{selectedSlots.length} slot(s)</strong> ({selectedSlots.length}.0 hrs)
                </span>
                <span className="text-slate-400 font-medium">
                  Subtotal: <strong className="text-brand-lime font-mono font-bold text-sm">₱{calculatedTotal}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Step 2 Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleGoToStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Purpose & Court</span>
            </button>
            <button
              type="button"
              onClick={() => handleGoToStep(3)}
              className="px-6 py-2.5 rounded-xl bg-brand-lime text-dark-bg text-xs font-black hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10 flex items-center gap-2"
            >
              <span>Next: Customer & Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 CARD: Customer Information, Payment & Status */}
      {currentStep === 3 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shadow-md">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Customer Information, Payment & Status</h4>
                <p className="text-xs text-slate-400 font-medium">Provide customer contact info, select payment method & confirm booking status.</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
              Step 3 of 3
            </span>
          </div>

          {/* Section 3: Customer Information */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Customer Details
            </h5>

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
          <div className="space-y-3 pt-4 border-t border-slate-800/60">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Payment & Booking Status
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Payment Method
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime appearance-none pr-9 cursor-pointer shadow-md transition-all font-semibold"
                  >
                    <option value="cash" className="bg-slate-900 text-white">Cash (Over the counter)</option>
                    <option value="gcash" className="bg-slate-900 text-white">GCash Direct</option>
                    <option value="bank_transfer" className="bg-slate-900 text-white">Bank Transfer</option>
                    <option value="complimentary" className="bg-slate-900 text-white">Complimentary / VIP</option>
                    <option value="other" className="bg-slate-900 text-white">Other</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Booking Status
                </label>
                <div className="relative">
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-lime appearance-none pr-9 cursor-pointer shadow-md transition-all font-semibold"
                  >
                    <option value="approved" className="bg-slate-900 text-emerald-400">Approved & Paid</option>
                    <option value="pending" className="bg-slate-900 text-amber-400">Pending Payment</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Total Cost (₱)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={customTotalCost !== '' ? customTotalCost : (calculatedTotal > 0 ? calculatedTotal : '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setCustomTotalCost(val);
                    }}
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

          {/* Step 3 Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleGoToStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Time Slots</span>
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="px-6 py-3 rounded-xl font-black text-xs hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg flex items-center gap-1.5 disabled:bg-slate-800/80 disabled:text-slate-500 disabled:border-slate-800 disabled:shadow-none disabled:cursor-not-allowed bg-brand-lime text-dark-bg shadow-brand-lime/10"
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
        </div>
      )}
    </div>
  );

  if (!isEmbedded && !isOpen) return null;

  if (isEmbedded) {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto text-left">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Container: Manual Court Reservation Panel */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shadow-md">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">Manual Court Reservation</h3>
                    <p className="text-xs text-slate-400 font-medium">Create a court booking directly on behalf of a walk-in player or phone reservation.</p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {renderStepperHeader()}
            {formFieldsLeft}
          </div>

          {/* Right Column: Independent Booking Summary Panel */}
          <div className="lg:col-span-5">
            {renderSummaryCard()}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-left">
        {/* Modal Header */}
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

        <form onSubmit={handleSubmit} className="p-6 max-h-[85vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              {renderStepperHeader()}
              {formFieldsLeft}
            </div>
            <div className="lg:col-span-5">
              {renderSummaryCard()}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
