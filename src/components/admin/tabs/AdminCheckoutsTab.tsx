import React, { useState, Fragment, useMemo } from 'react';
import {
  Clock,
  CreditCard,
  X,
  ChevronDown,
  Trophy,
  Building2,
  Calendar,
  Loader2,
  RotateCcw,
  User,
  UserCheck,
  Eye,
  Check,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronUp,
  SlidersHorizontal,
  Share2,
  Copy,
  MessageSquare,
  Edit3,
  Mail,
  Phone,
  Search,
  LayoutGrid,
  Table as TableIcon,
  MoreHorizontal,
} from 'lucide-react';
import { type Booking, type GcashAccount, type UserAccount, type UserPermissions, type Court, type BookingUpdatePayload, SLOTS, getSlotPrice } from '../adminTypes';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { parseTimeStringToHour } from '../../../utils/timeSlotUtils';

interface AdminCheckoutsTabProps {
  users?: UserAccount[];
  courts?: Court[];
  openPlayEvents?: OpenPlayEvent[];
  checkouts?: Booking[];
  filteredCheckouts: Booking[];
  checkoutCategoryFilter: 'all' | 'court' | 'openplay';
  setCheckoutCategoryFilter: (cat: 'all' | 'court' | 'openplay') => void;
  checkoutStatusFilter: 'all' | 'pending' | 'paid' | 'cancelled';
  setCheckoutStatusFilter: (st: 'all' | 'pending' | 'paid' | 'cancelled') => void;
  actionLoading: string | null;
  onApproveBooking: (b: Booking) => void;
  onRejectBooking: (b: Booking) => void;
  onRefundBooking: (b: Booking) => void;
  onViewReceipt: (url: string) => void;
  onNavigateToBookings?: () => void;
  onUpdateManualBooking?: (
    bookingOrId: Booking | string,
    updatedData: BookingUpdatePayload
  ) => Promise<void> | void;
  personalAccounts?: GcashAccount[];
  globalGcashName?: string;
  globalGcashNumber?: string;
  globalGcashQr?: string;
  onOpenGcashModal?: (type: 'my' | 'global', accountId?: string) => void;
  onDeleteGcashAccount?: (id: string) => void;
  formatEventDateLong?: (d: string) => string;
  formatDateLabel?: (d: string) => string;
  formatTime12h?: (t: string) => string;
  formatTimestamp?: (ts?: string) => string;
  userPermissions?: UserPermissions;
  currentAdminEmail?: string;
  currentAdminName?: string;
}

export const AdminCheckoutsTab: React.FC<AdminCheckoutsTabProps> = ({
  users = [],
  courts = [],
  openPlayEvents = [],
  checkouts = [],
  filteredCheckouts,
  checkoutCategoryFilter,
  setCheckoutCategoryFilter,
  checkoutStatusFilter,
  setCheckoutStatusFilter,
  actionLoading,
  onApproveBooking,
  onRejectBooking,
  onRefundBooking,
  onViewReceipt,
  onNavigateToBookings,
  onUpdateManualBooking,
  formatEventDateLong = (d) => d,
  formatDateLabel = (d) => d,
  formatTime12h = (t) => t,
  formatTimestamp = (t) => t || 'N/A',
  userPermissions: _userPermissions,
  currentAdminEmail = '',
  currentAdminName = '',
}) => {
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null);
  const [expandedMessageCheckoutIds, setExpandedMessageCheckoutIds] = useState<Record<string, boolean>>({});
  const [checkoutDateFilter, setCheckoutDateFilter] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_checkouts_view_mode');
      if (saved === 'cards' || saved === 'table') return saved;
    } catch {}
    return 'cards';
  });

  const handleToggleViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('picklepoint_checkouts_view_mode', mode);
    } catch {}
  };

  // Edit Booking Modal state
  const [editingManualBooking, setEditingManualBooking] = useState<Booking | null>(null);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerEmail, setEditCustomerEmail] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('cash');
  const [editTotalCost, setEditTotalCost] = useState<string>('');
  const [editCourtId, setEditCourtId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'cancelled'>('pending');
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isEditingCourtBooking = Boolean(
    editingManualBooking &&
    editingManualBooking.type !== 'open_play' &&
    editingManualBooking.type !== 'openplay'
  );

  const selectedEditCourt = useMemo(() => {
    if (!editingManualBooking) return null;
    return courts.find(c => c.id === editCourtId) ||
      courts.find(c => c.id === editingManualBooking.courtId) ||
      courts[0] || null;
  }, [courts, editCourtId, editingManualBooking]);

  // Compute booked/occupied slots for conflict avoidance
  const occupiedSlots = useMemo(() => {
    if (!editingManualBooking || !editCourtId || !editDate) return new Set<string>();

    const occupied = new Set<string>();

    // 1. Conflict from other bookings on this court and date
    checkouts.forEach((b) => {
      if (
        b.id === editingManualBooking.id ||
        b.bookingId === editingManualBooking.id ||
        (editingManualBooking.bookingReference && b.bookingReference === editingManualBooking.bookingReference)
      ) {
        return;
      }
      if (b.status === 'cancelled') return;
      if (b.courtId === editCourtId && b.date === editDate && Array.isArray(b.slots)) {
        b.slots.forEach((s) => occupied.add(s));
      }
    });

    // 2. Conflict from Open Play sessions on that court and date
    openPlayEvents.forEach((ev) => {
      if (ev.status === 'cancelled') return;
      const courtIds = ev.courtIds || ((ev as any).courtId ? [(ev as any).courtId] : []);
      if (courtIds.includes(editCourtId) && ev.eventDate === editDate) {
        const startH = parseTimeStringToHour(ev.startTime);
        const endH = parseTimeStringToHour(ev.endTime);
        SLOTS.forEach((s) => {
          if (s.startHour >= startH && s.startHour < endH) {
            occupied.add(s.time);
          }
        });
      }
    });

    return occupied;
  }, [editingManualBooking, editCourtId, editDate, checkouts, openPlayEvents]);

  const handleOpenEditManualModal = (booking: Booking) => {
    setEditingManualBooking(booking);
    setEditCustomerName(booking.user?.name || booking.userName || '');
    setEditCustomerEmail(booking.user?.email || booking.userEmail || '');
    setEditCustomerPhone(booking.userPhone || booking.user?.phone || '');
    setEditPaymentMethod(booking.paymentMethod || 'cash');
    setEditTotalCost(booking.totalCost !== undefined ? String(booking.totalCost) : '');
    setEditCourtId(booking.courtId || '');
    setEditDate(booking.date || '');
    setEditSlots(Array.isArray(booking.slots) ? [...booking.slots] : []);
    setEditStatus((booking.status as any) || 'pending');
    setEditError(null);
  };

  const handleToggleEditSlot = (slotTime: string) => {
    if (occupiedSlots.has(slotTime)) return;

    setEditSlots((prev) => {
      const nextSlots = prev.includes(slotTime)
        ? prev.filter((s) => s !== slotTime)
        : [...prev, slotTime];

      // Auto-recalculate totalCost when slots change
      if (selectedEditCourt) {
        const dayPrice = selectedEditCourt.dayPrice || 120;
        const nightPrice = selectedEditCourt.nightPrice || 200;
        const newCost = nextSlots.reduce((sum, sTime) => {
          const sObj = SLOTS.find((s) => s.time === sTime);
          const price = sObj ? getSlotPrice(sObj.startHour, dayPrice, nightPrice) : dayPrice;
          return sum + price;
        }, 0);
        setEditTotalCost(String(newCost));
      }

      return nextSlots;
    });
  };

  const handleSaveEditedManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManualBooking || !onUpdateManualBooking) return;
    if (!editCustomerName.trim()) {
      setEditError('Customer Name is required');
      return;
    }

    if (isEditingCourtBooking) {
      if (!editDate) {
        setEditError('Please select a valid booking date.');
        return;
      }
      if (editSlots.length === 0) {
        setEditError('Please select at least one court time slot.');
        return;
      }
      const hasConflict = editSlots.some((s) => occupiedSlots.has(s));
      if (hasConflict) {
        setEditError('One or more selected time slots conflict with an existing reservation.');
        return;
      }
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const numCost = editTotalCost.trim() !== '' ? parseFloat(editTotalCost) : undefined;
      const sortedSlots = [...editSlots].sort((a, b) => {
        const idxA = SLOTS.findIndex((s) => s.time === a);
        const idxB = SLOTS.findIndex((s) => s.time === b);
        return idxA - idxB;
      });

      await onUpdateManualBooking(editingManualBooking, {
        userName: editCustomerName.trim(),
        userEmail: editCustomerEmail.trim(),
        userPhone: editCustomerPhone.trim(),
        paymentMethod: editPaymentMethod,
        ...(numCost !== undefined && !isNaN(numCost) ? { totalCost: numCost } : {}),
        ...(isEditingCourtBooking ? {
          date: editDate,
          slots: sortedSlots,
          courtId: editCourtId || editingManualBooking.courtId,
          courtName: selectedEditCourt?.name || editingManualBooking.courtName,
          status: editStatus,
        } : {}),
      });
      setEditingManualBooking(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update reservation details');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleMessageAccordion = (checkoutId: string) => {
    setExpandedMessageCheckoutIds((prev) => ({
      ...prev,
      [checkoutId]: !prev[checkoutId],
    }));
  };

  const generateCheckoutMessage = (booking: Booking): string => {
    const bName = booking.user?.name || booking.userName || 'Player';
    const courtName = booking.courtName || 'Pickleball Court';
    const dateStr = formatEventDateLong(booking.date) || formatDateLabel(booking.date);
    const slotsStr = booking.slots && booking.slots.length > 0 ? booking.slots.join(', ') : '1 Hour';
    const totalCost = booking.totalCost || 0;
    const refCode = booking.bookingReference || booking.bookingId || booking.id;
    const shareUrl = `${window.location.origin}/?upload_receipt=${encodeURIComponent(refCode)}`;

    return `Hi ${bName}! 🎾
Here are your reservation details:

📍 Court: ${courtName}
📅 Date: ${dateStr}
⏰ Time: ${slotsStr}
💵 Total Amount Due: ₱${totalCost}
🎟️ Booking Ref: ${refCode}

👇 UPLOAD GCASH RECEIPT PROOF HERE 👇
${shareUrl}

Please click the link above to submit your GCash payment receipt screenshot & reference number to confirm your reservation.

Thank you!`;
  };

  const activeFilterCount =
    (checkoutCategoryFilter !== 'all' ? 1 : 0) +
    (checkoutStatusFilter !== 'pending' ? 1 : 0) +
    (checkoutDateFilter ? 1 : 0);

  const isBookingManual = (b: Booking): boolean => {
    if (!b) return false;
    const bId = (b.id || '').toLowerCase();
    const bBkId = (b.bookingId || '').toLowerCase();
    const bRef = (b.bookingReference || '').toLowerCase();
    const bEmail = (b.userEmail || b.user?.email || '').toLowerCase();
    const bName = (b.userName || b.user?.name || '').toLowerCase();
    const bPay = (b.paymentMethod || '').toLowerCase();

    return (
      b.isManual === true ||
      (b as any).isManualBooking === true ||
      (b as any).bookingSource === 'manual' ||
      Boolean(b.bookingCategory) ||
      bId.includes('manual') ||
      bId.includes('walkin') ||
      bId.includes('walk-in') ||
      bBkId.includes('manual') ||
      bBkId.includes('walkin') ||
      bBkId.includes('walk-in') ||
      bRef.includes('manual') ||
      bRef.includes('walkin') ||
      bRef.includes('walk-in') ||
      bEmail.includes('walkin@') ||
      bEmail.includes('internal') ||
      bName.includes('walk-in') ||
      bName.includes('walkin') ||
      Boolean(b.createdByAdminEmail) ||
      bPay === 'cash' ||
      bPay === 'venue' ||
      bPay === 'counter' ||
      bPay === 'on_counter'
    );
  };

  // Compute counts for verification queue badges
  const pendingQueueCount = checkouts.filter(
    (b) => b.paymentStatus === 'pending_verification' || b.paymentStatus === 'pending' || b.status === 'pending'
  ).length;

  const displayCheckouts = useMemo(() => {
    return filteredCheckouts.filter((b) => {
      if (checkoutDateFilter) {
        const matchesDate = b.date === checkoutDateFilter || (b.createdAt && b.createdAt.startsWith(checkoutDateFilter));
        if (!matchesDate) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bName = (b.user?.name || b.userName || '').toLowerCase();
        const bEmail = (b.user?.email || b.userEmail || '').toLowerCase();
        const bPhone = (b.userPhone || b.user?.phone || '').toLowerCase();
        const bRef = (b.bookingReference || b.bookingId || b.id || '').toLowerCase();
        const bGcash = (b.gcashReferenceNumber || '').toLowerCase();
        const bCourt = (b.courtName || '').toLowerCase();
        const matchesSearch =
          bName.includes(q) ||
          bEmail.includes(q) ||
          bPhone.includes(q) ||
          bRef.includes(q) ||
          bGcash.includes(q) ||
          bCourt.includes(q);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [filteredCheckouts, checkoutDateFilter, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* 1. HEADER & QUEUE MODE TOGGLE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-brand-lime" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Payment Verification Queue</h2>
              {pendingQueueCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
                  {pendingQueueCount} Pending
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  All Clear
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and approve or reject player payment proofs. Complete bookings remain accessible on the Reservations page.
            </p>
          </div>
        </div>

        {/* Action Controls: Queue Switcher & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* View Mode Segment Switcher: Pending Queue vs Audit History */}
          <div className="grid grid-cols-2 sm:flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCheckoutStatusFilter('pending')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                checkoutStatusFilter === 'pending'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <span>Action Required</span>
              {pendingQueueCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-black flex items-center justify-center">
                  {pendingQueueCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCheckoutStatusFilter('all')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                checkoutStatusFilter !== 'pending'
                  ? 'bg-slate-800 border border-slate-700 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <span>Audit History</span>
              <span className="text-[10px] text-slate-400 font-mono">({checkouts.length})</span>
            </button>
          </div>

          {/* View Mode Toggle: Cards vs Table (Visible on Tablet & Desktop) */}
          <div className="hidden md:flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => handleToggleViewMode('cards')}
              title="Cards Grid View (Tablet & Mobile Optimized)"
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'cards'
                  ? 'bg-brand-lime text-dark-bg font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[11px] hidden lg:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              title="Table View (Full Multi-Column View)"
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-brand-lime text-dark-bg font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span className="text-[11px] hidden lg:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR & QUICK SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800">
        {/* Search Bar Input */}
        <div className="relative w-full sm:w-72 lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search player, phone, ref, court..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[42px] bg-slate-950/80 border border-slate-800 rounded-xl pl-9.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime/50 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Trigger & Reset Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end shrink-0">
          {/* Active Filter Summary Pills */}
          {checkoutCategoryFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-300">
              {checkoutCategoryFilter === 'court' ? 'Court Only' : 'Open Play'}
              <button onClick={() => setCheckoutCategoryFilter('all')} className="hover:text-white ml-0.5 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {checkoutDateFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              {checkoutDateFilter}
              <button onClick={() => setCheckoutDateFilter('')} className="hover:text-white ml-0.5 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilterCount > 0
                ? 'bg-brand-lime/10 border-brand-lime/40 text-brand-lime shadow-md'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Open Filter Settings Modal"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-lime" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-brand-lime text-slate-950 text-[10px] font-black">
                ({activeFilterCount})
              </span>
            )}
          </button>

          {(activeFilterCount > 0 || searchQuery) && (
            <button
              onClick={() => {
                setCheckoutCategoryFilter('all');
                setCheckoutStatusFilter('pending');
                setCheckoutDateFilter('');
                setSearchQuery('');
              }}
              className="min-h-[42px] text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Reset checkout filters"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. MAIN CHECKOUTS & PAYMENTS VERIFICATION CONTAINER */}
      <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* EMPTY QUEUE STATE CARD */}
        {displayCheckouts.length === 0 ? (
          <div className="py-16 px-6 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center mx-auto text-brand-lime shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-brand-lime" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                {checkoutStatusFilter === 'pending' ? 'Verification Queue Clear!' : 'No checkout records found'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {checkoutStatusFilter === 'pending'
                  ? 'All payment checkouts have been verified. There are currently no pending payments requiring approval or rejection.'
                  : 'Try adjusting your category, status, date, or search filter above to view historical records.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {onNavigateToBookings && (
                <button
                  type="button"
                  onClick={onNavigateToBookings}
                  className="px-5 py-2.5 rounded-2xl bg-brand-lime text-dark-bg font-extrabold text-xs flex items-center gap-2 hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg hover:scale-[1.02]"
                >
                  <span>View Reservations Page</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {checkoutStatusFilter === 'pending' && (
                <button
                  type="button"
                  onClick={() => setCheckoutStatusFilter('all')}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>View Audit History</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* FULL-WIDTH RESPONSIVE CARD VIEW (Visible always on mobile, and on tablet/desktop when cards mode selected) */}
            <div
              className={
                viewMode === 'cards'
                  ? 'space-y-3 sm:space-y-4 p-3.5 sm:p-5 w-full'
                  : 'md:hidden space-y-3.5 p-3.5 sm:p-4'
              }
            >
              {displayCheckouts.map((booking) => {
                const bEmail = (booking.user?.email || booking.userEmail || '').toLowerCase();
                const bName = booking.user?.name || booking.userName || 'Player';
                const matchedAccount = users.find((u) => u.email?.toLowerCase() === bEmail);
                const avatarSrc =
                  matchedAccount?.photoUrl ||
                  matchedAccount?.avatarUrl ||
                  (booking.user as any)?.photoUrl ||
                  (booking as any).userPhotoUrl ||
                  (booking as any).photoUrl ||
                  `https://robohash.org/${encodeURIComponent(bName || bEmail)}?set=set4`;

                const proofUrl = booking.receiptImageUrl || (booking as any).receiptUrl || (booking as any).paymentReceiptUrl;
                const isActionPending = actionLoading === booking.id;
                const isExpanded = expandedCheckoutId === booking.id;
                const isManual = isBookingManual(booking);

                return (
                  <div
                    key={booking.id}
                    className="w-full glass-panel border border-slate-800/80 hover:border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl text-left bg-slate-900/70 transition-all space-y-3 sm:space-y-4"
                  >
                    {/* MAIN CARD ROW: Horizontal on lg/xl, responsive stacking on mobile/tablet */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* 1. Customer Info & Category/Manual Badge */}
                      <div className="flex items-center gap-3 min-w-0 lg:w-[26%] shrink-0">
                        <div className="w-12 h-12 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
                          <img
                            src={avatarSrc}
                            alt={bName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bName)}&background=b5f529&color=0f172a&bold=true`;
                            }}
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-white text-sm sm:text-base tracking-tight truncate">{bName}</span>
                            {/* Category Badge */}
                            {booking.type === 'openplay' || booking.openPlayEventId || (booking as any).isOpenPlay ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shrink-0">
                                <Trophy className="w-2.5 h-2.5 text-brand-lime" /> Open Play
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 border border-blue-500/30 text-blue-300 shrink-0">
                                <Building2 className="w-2.5 h-2.5 text-blue-400" /> Court
                              </span>
                            )}
                            {isManual && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0 shadow-sm">
                                Manual
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate">{booking.user?.email || booking.userEmail || 'N/A'}</div>
                          {booking.userPhone && (
                            <div className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{booking.userPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Court, Schedule & Status Badge */}
                      <div className="min-w-0 lg:w-[28%] space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-xs sm:text-sm truncate">
                            {booking.courtName || 'Court Facility'}
                          </span>
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              booking.paymentStatus === 'paid'
                                ? booking.refundRequested
                                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse'
                                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : booking.paymentStatus === 'refunded'
                                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                                : booking.paymentStatus === 'rebooking_credit'
                                ? 'bg-brand-lime/15 border-brand-lime/40 text-brand-lime'
                                : booking.paymentStatus === 'cancelled_no_refund' || booking.paymentStatus === 'failed'
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                            }`}
                          >
                            {booking.paymentStatus === 'pending_verification' || booking.paymentStatus === 'pending' || booking.status === 'pending'
                              ? 'Pending Review'
                              : booking.paymentStatus === 'refunded'
                              ? 'Refunded'
                              : booking.refundRequested
                              ? 'Refund Requested'
                              : booking.paymentStatus || 'Unpaid'}
                          </span>
                        </div>
                        <div className="text-slate-300 flex items-center gap-1.5 text-xs truncate">
                          <Calendar className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                          <span>{formatEventDateLong(booking.date) || formatDateLabel(booking.date)}</span>
                        </div>
                        <div className="text-slate-400 flex items-center gap-1.5 text-[11px] truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{booking.slots?.join(', ') || 'N/A'}</span>
                        </div>
                      </div>

                      {/* 3. Amount & GCash Reference Number */}
                      <div className="min-w-0 lg:w-[18%] space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-brand-lime text-base sm:text-lg">₱{booking.totalCost?.toLocaleString()}</span>
                          <span className="text-[11px] text-slate-400 font-semibold capitalize">
                            {booking.paymentMethod === 'card'
                              ? 'Card'
                              : booking.paymentMethod === 'venue'
                              ? 'Counter'
                              : booking.paymentMethod === 'maya'
                              ? 'Maya'
                              : 'GCash'}
                          </span>
                        </div>
                        {booking.gcashReferenceNumber ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-400 font-mono truncate">
                              Ref: <strong className="text-white">{booking.gcashReferenceNumber}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(booking.gcashReferenceNumber!);
                                setCopiedShareId(`gcash-${booking.id}`);
                                setTimeout(() => setCopiedShareId(null), 2500);
                              }}
                              className="p-1 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 cursor-pointer shrink-0"
                              title="Copy GCash Ref"
                            >
                              {copiedShareId === `gcash-${booking.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            Ref: {booking.bookingReference || booking.bookingId || booking.id}
                          </div>
                        )}
                      </div>

                      {/* 4. Compact Receipt Thumbnail Preview */}
                      {proofUrl ? (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(proofUrl)}
                          className="relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden border border-slate-700/80 bg-black/40 group cursor-pointer hover:border-brand-lime shrink-0 transition-all flex items-center justify-center"
                          title="Click to view full receipt proof"
                        >
                          <img
                            src={proofUrl}
                            alt="Proof of Payment"
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                            <Eye className="w-4 h-4 text-brand-lime drop-shadow" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 shrink-0 flex flex-col items-center justify-center text-slate-600 text-[10px] text-center p-1 leading-tight">
                          <span>No Proof</span>
                        </div>
                      )}

                      {/* 5. RIGHT-SIDE ACTION ICONS (Check for approve, X for reject, Pencil for edit, ... for more details) */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 justify-end">
                        {isActionPending ? (
                          <div className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        ) : (
                          <>
                            {/* Check icon (Approve Payment) */}
                            {(booking.paymentStatus === 'pending_verification' || booking.paymentStatus === 'pending' || booking.status === 'pending') && (
                              <button
                                type="button"
                                onClick={() => onApproveBooking(booking)}
                                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-brand-lime/15 hover:bg-brand-lime border border-brand-lime/30 text-brand-lime hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-brand-lime/20 active:scale-95"
                                title="Approve Payment & Confirm Reservation"
                                aria-label="Approve Payment"
                              >
                                <Check className="w-5 h-5 stroke-[2.5]" />
                              </button>
                            )}

                            {/* X icon (Reject Payment) */}
                            {(booking.paymentStatus === 'pending_verification' || booking.paymentStatus === 'pending' || booking.status === 'pending') && (
                              <button
                                type="button"
                                onClick={() => onRejectBooking(booking)}
                                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                                title="Reject Payment"
                                aria-label="Reject Payment"
                              >
                                <X className="w-5 h-5 stroke-[2.5]" />
                              </button>
                            )}

                            {/* Pencil icon (Edit Details) */}
                            {(isManual || (booking.type !== 'open_play' && booking.type !== 'openplay')) && onUpdateManualBooking && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditManualModal(booking)}
                                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-purple-500/15 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                                title="Edit Reservation Details"
                                aria-label="Edit Reservation"
                              >
                                <Edit3 className="w-4.5 h-4.5" />
                              </button>
                            )}

                            {/* Ellipsis (...) icon (Toggle Inline Details Drawer) */}
                            <button
                              type="button"
                              onClick={() => setExpandedCheckoutId((prev) => (prev === booking.id ? null : booking.id))}
                              className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
                                isExpanded
                                  ? 'bg-slate-800 border-brand-lime/50 text-brand-lime'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                              }`}
                              title={isExpanded ? 'Hide Details Drawer' : 'More Details & Roster'}
                              aria-label="More Details"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* INLINE COLLAPSIBLE DRAWER (EXPANDED ON "..." CLICK) */}
                    {isExpanded && (
                      <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-fade-in text-xs">
                        {/* Refund option (if booking is already paid) */}
                        {(booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed' || booking.status === 'approved') && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
                            <div>
                              <div className="font-bold text-white text-xs">Payment Approved & Active</div>
                              <div className="text-[11px] text-slate-400">Need to cancel or issue cancellation credit?</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRefundBooking(booking)}
                              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Issue Refund</span>
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Contact & Roster Box */}
                          <div className="bg-slate-950/70 p-3.5 rounded-xl space-y-2 border border-slate-800/70">
                            <div className="text-[10px] uppercase font-bold text-brand-lime flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" /> Contact & Player Roster
                            </div>
                            <div className="text-white font-mono text-xs">{booking.userPhone || 'No phone provided'}</div>

                            {booking.guests && booking.guests.length > 0 && (
                              <div className="pt-2 border-t border-slate-800 space-y-1">
                                <div className="text-[10px] font-bold text-slate-400">
                                  Total Attendees ({1 + booking.guests.length} Players):
                                </div>
                                <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                                  <div className="text-slate-200 font-semibold">1. {bName} (Primary)</div>
                                  {booking.guests.map((g, idx) => (
                                    <div key={idx} className="text-slate-400">
                                      {idx + 2}. {g.name || g.email} (Guest)
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Full Payment Proof Box if available */}
                          {proofUrl && (
                            <div className="bg-slate-950/70 p-3.5 rounded-xl space-y-2 border border-slate-800/70 flex flex-col justify-between">
                              <div>
                                <div className="text-[10px] uppercase font-bold text-brand-lime flex items-center justify-between pb-1.5 border-b border-slate-800">
                                  <span className="flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-brand-lime" /> Proof Screenshot
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onViewReceipt(proofUrl)}
                                    className="text-brand-lime hover:underline font-bold text-[10px] cursor-pointer"
                                  >
                                    View Full Size &rarr;
                                  </button>
                                </div>
                                <div
                                  onClick={() => onViewReceipt(proofUrl)}
                                  className="mt-2 relative rounded-lg overflow-hidden border border-slate-800 bg-black/40 group max-h-36 flex items-center justify-center cursor-pointer"
                                >
                                  <img
                                    src={proofUrl}
                                    alt="Receipt"
                                    className="object-cover w-full h-36"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-xs">
                                    <Eye className="w-4 h-4 text-brand-lime" /> Tap to Zoom
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Manual Booking Admin Audit Box */}
                        {isManual && (
                          <div className="bg-slate-950/70 p-3 rounded-xl space-y-1.5 border border-purple-500/20 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                                <Mail className="w-3 h-3 text-amber-400" /> Created By Admin:
                              </span>
                              <span className="font-mono font-bold text-amber-300">
                                {booking.createdByAdminEmail || currentAdminEmail || 'admin@picklepoint.com'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Admin Name:</span>
                              <span className="font-bold text-purple-300">
                                {booking.createdByAdminName || currentAdminName || 'Admin'}
                              </span>
                            </div>
                            {booking.lastModifiedByAdminEmail && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                                <span className="text-slate-400">Last Modified:</span>
                                <span className="font-mono font-bold text-amber-300">
                                  {booking.lastModifiedByAdminEmail}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pre-Formatted Messenger Share Card */}
                        <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3 space-y-2 text-left">
                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                            <div className="flex items-center gap-1.5 text-purple-300 font-black text-[10px] uppercase tracking-wider">
                              <MessageSquare className="w-3.5 h-3.5" /> Messenger Summary Message
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = generateCheckoutMessage(booking);
                                navigator.clipboard.writeText(msg);
                                setCopiedMessageId(booking.id);
                                setTimeout(() => setCopiedMessageId(null), 3000);
                              }}
                              className="min-h-[30px] px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            >
                              {copiedMessageId === booking.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span className="text-emerald-300">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Message</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all max-h-36 overflow-y-auto">
                            {generateCheckoutMessage(booking)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Visible on medium+ screens when table mode is selected) */}
            <div className={viewMode === 'table' ? 'hidden md:block overflow-x-auto' : 'hidden'}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 bg-slate-900/30 text-slate-400 text-xs font-extrabold uppercase tracking-wider">
                    <th className="py-4 px-6">Player Info</th>
                    <th className="py-4 px-6">Category / Type</th>
                    <th className="py-4 px-6">Payment Mode</th>
                    <th className="py-4 px-6">Reservation Schedule</th>
                    <th className="py-4 px-6">Total Cost</th>
                    <th className="py-4 px-6 text-center">Payment Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40 text-xs">
                  {displayCheckouts.map((booking) => {
                    const isActionPending = actionLoading === booking.id;
                    const isExpanded = expandedCheckoutId === booking.id;
                    const isManual = isBookingManual(booking);

                    const bEmail = (booking.user?.email || booking.userEmail || '').toLowerCase();
                    const bName = booking.user?.name || booking.userName || 'Player';
                    const matchedAccount = users.find((u) => u.email?.toLowerCase() === bEmail);
                    const avatarSrc =
                      matchedAccount?.photoUrl ||
                      matchedAccount?.avatarUrl ||
                      (booking.user as any)?.photoUrl ||
                      (booking as any).userPhotoUrl ||
                      (booking as any).photoUrl ||
                      `https://robohash.org/${encodeURIComponent(bName || bEmail)}?set=set4`;

                    const proofUrl = booking.receiptImageUrl || (booking as any).receiptUrl || (booking as any).paymentReceiptUrl;

                    return (
                      <Fragment key={booking.id}>
                        <tr
                          onClick={() => setExpandedCheckoutId((prev) => (prev === booking.id ? null : booking.id))}
                          className={`transition-colors cursor-pointer ${isExpanded ? 'bg-slate-900/40' : 'hover:bg-slate-900/20'}`}
                        >
                          {/* Customer Info */}
                          <td className="py-4.5 px-6">
                            <div className="flex items-center gap-3.5">
                              {/* Roster Avatar Container */}
                              <div className="relative w-10 h-10 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
                                <img
                                  src={avatarSrc}
                                  alt={bName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      bName
                                    )}&background=b5f529&color=0f172a&bold=true`;
                                  }}
                                />
                              </div>

                              <div>
                                <div className="font-extrabold text-white text-sm flex items-center gap-2">
                                  <span>{bName}</span>
                                </div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5">{booking.user?.email || booking.userEmail || 'N/A'}</div>
                                {booking.userPhone && (
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{booking.userPhone}</div>
                                )}
                                {!(booking.type === 'openplay' || booking.openPlayEventId || (booking as any).isOpenPlay) && booking.guests && booking.guests.length > 0 && (
                                  <div className="text-[11px] text-brand-lime font-semibold mt-1">
                                    +{booking.guests.length} {booking.guests.length === 1 ? 'Guest' : 'Guests'}: {booking.guests.map((g) => g.name || g.email).filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category / Type */}
                          <td className="py-4.5 px-6">
                            <div className="flex flex-col items-start gap-1">
                              {booking.type === 'openplay' || booking.openPlayEventId || (booking as any).isOpenPlay ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shadow-sm">
                                  <Trophy className="w-3 h-3 text-brand-lime shrink-0" />
                                  <span>OP</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-300 shadow-sm">
                                  <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                                  <span>Court</span>
                                </span>
                              )}
                              {isManual && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-sm">
                                  <UserCheck className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                  <span>Manual</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Payment Method */}
                          <td className="py-4.5 px-6 font-semibold text-slate-300 capitalize">
                            {booking.paymentMethod === 'card' ? '💳 Credit Card' : booking.paymentMethod === 'venue' ? '🏢 On Counter' : booking.paymentMethod === 'maya' ? '🟢 Maya Online' : '🔵 GCash'}
                          </td>

                          {/* Reservation Schedule */}
                          <td className="py-4.5 px-6">
                            <div className="flex items-center gap-1.5 text-white font-medium text-xs">
                              <Calendar className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                              <span>{formatEventDateLong(booking.date) || formatDateLabel(booking.date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs mt-1">
                              <Clock className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                              <span>
                                {booking.slots && booking.slots.length > 0
                                  ? `${booking.slots.length} ${booking.slots.length === 1 ? 'hour' : 'hours'}`
                                  : '1 hour'}
                              </span>
                            </div>
                          </td>

                          {/* Total Cost */}
                          <td className="py-4.5 px-6">
                            <div className="font-medium text-white text-sm font-sans">₱{booking.totalCost}</div>
                          </td>

                          {/* Payment Status */}
                          <td className="py-4.5 px-6 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase border ${
                                booking.paymentStatus === 'paid'
                                  ? booking.refundRequested
                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse'
                                    : 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                                  : booking.paymentStatus === 'refunded'
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                  : booking.paymentStatus === 'rebooking_credit'
                                  ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime'
                                  : booking.paymentStatus === 'cancelled_no_refund' || booking.paymentStatus === 'failed'
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                  : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                              }`}
                            >
                              {(booking.paymentStatus === 'pending_verification' || booking.paymentStatus === 'pending' || booking.status === 'pending')
                                ? 'Pending Review'
                                : booking.paymentStatus === 'refunded'
                                ? `Refunded (${booking.refundAmount ? `₱${booking.refundAmount}` : 'Full'})`
                                : booking.paymentStatus === 'rebooking_credit'
                                ? 'Rebooking Credit'
                                : booking.paymentStatus === 'cancelled_no_refund'
                                ? 'Cancelled (No Refund)'
                                : booking.refundRequested
                                ? 'Refund Requested'
                                : booking.paymentStatus || 'unpaid'}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4.5 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              {isActionPending ? (
                                <Loader2 className="w-4 h-4 text-brand-lime animate-spin" />
                              ) : (
                                <>
                                  {(isManual || (booking.type !== 'open_play' && booking.type !== 'openplay')) && onUpdateManualBooking && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditManualModal(booking)}
                                      title="Edit reservation schedule & details"
                                      className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white transition-all cursor-pointer shadow-xs hover:scale-105 flex items-center justify-center"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {/* View Proof of Payment Receipt Button */}
                                  {proofUrl && (
                                    <button
                                      type="button"
                                      onClick={() => onViewReceipt(proofUrl)}
                                      title="View proof of payment"
                                      className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-brand-lime hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-xs hover:scale-105 flex items-center justify-center"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}

                                  {(booking.paymentStatus === 'pending_verification' || booking.paymentStatus === 'pending' || booking.status === 'pending') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onApproveBooking(booking)}
                                        title="Approve payment"
                                        className="p-2 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] transition-all cursor-pointer shadow-xs hover:scale-105 flex items-center justify-center"
                                      >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onRejectBooking(booking)}
                                        title="Reject payment"
                                        className="p-2 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-xs hover:scale-105 flex items-center justify-center"
                                      >
                                        <X className="w-4 h-4 stroke-[2.5]" />
                                      </button>
                                    </>
                                  )}
                                  {(booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed' || booking.status === 'approved') && (
                                    <button
                                      onClick={() => onRefundBooking(booking)}
                                      title="Issue Refund & Upload Receipt"
                                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow hover:scale-[1.02] flex items-center gap-1.5 ${
                                        booking.refundRequested
                                          ? 'bg-purple-600 border-purple-400 text-white animate-pulse'
                                          : 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                                      }`}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      {booking.refundRequested ? 'Approve Refund' : 'Refund'}
                                    </button>
                                  )}
                                  {booking.paymentStatus === 'refunded' && (
                                    <span className="inline-flex items-center gap-1 text-xs text-purple-400 font-bold uppercase tracking-wider">
                                      <RotateCcw className="w-3 h-3" />
                                      Refunded
                                    </span>
                                  )}
                                  {booking.paymentStatus !== 'pending_verification' && booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'refunded' && !proofUrl && (
                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verified</span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED ACCORDION PANEL ROW */}
                        {isExpanded && (
                          <tr key={`${booking.id}-expanded`} className="bg-slate-950/80 border-b border-dark-border/60 animate-fade-in">
                            <td colSpan={7} className="p-6 text-left space-y-4">
                              {/* Joined Open Play Event Banner */}
                              {(booking.type === 'openplay' || booking.openPlayEventId || (booking as any).isOpenPlay) && (
                                <div className="bg-brand-lime/10 border border-brand-lime/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-lime/20 border border-brand-lime/40 flex items-center justify-center text-brand-lime shrink-0 shadow-sm">
                                      <Trophy className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-lime">
                                          Joined Open Play Event
                                        </span>
                                        {booking.openPlayCategory && (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-brand-lime/20 text-brand-lime border border-brand-lime/40">
                                            {booking.openPlayCategory}
                                          </span>
                                        )}
                                        {isManual && (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                            <UserCheck className="w-3 h-3 text-purple-400 shrink-0" /> Manual Booking
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-base font-extrabold text-white mt-0.5">
                                        {booking.openPlayTitle || booking.courtName || 'Open Play Session'}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                      <Calendar className="w-4 h-4 text-brand-lime shrink-0" />
                                      <span>{formatEventDateLong(booking.date) || formatDateLabel(booking.date)}</span>
                                    </div>
                                    {booking.slots && booking.slots.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {booking.slots.map((s, idx) => {
                                          const slotText = s.includes(' - ')
                                            ? `${formatTime12h(s.split(' - ')[0])} - ${formatTime12h(s.split(' - ')[1])}`
                                            : formatTime12h(s);
                                          return (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shadow-sm"
                                            >
                                              <Clock className="w-3 h-3 text-brand-lime shrink-0" />
                                              <span>{slotText}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Court Booking Details Banner */}
                              {!(booking.type === 'openplay' || booking.openPlayEventId || (booking as any).isOpenPlay) && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 shadow-sm">
                                      <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        {isManual && (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                            <UserCheck className="w-3 h-3 text-purple-400 shrink-0" /> Manual Booking
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-base font-extrabold text-white mt-0.5">
                                        {booking.courtName || 'Pickleball Court'}
                                      </h4>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                                      <span>{formatEventDateLong(booking.date) || formatDateLabel(booking.date)}</span>
                                    </div>
                                    {booking.slots && booking.slots.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {booking.slots.map((s, idx) => {
                                          const slotText = s.includes(' - ')
                                            ? `${formatTime12h(s.split(' - ')[0])} - ${formatTime12h(s.split(' - ')[1])}`
                                            : formatTime12h(s);
                                          return (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-300 shadow-sm"
                                            >
                                              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                                              <span>{slotText}</span>
                                            </span>
                                          );
                                        })}
                                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                                          {booking.slots.length} {booking.slots.length === 1 ? 'hr' : 'hrs'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Generated Messenger Summary & Shareable Message Card (Accordion) */}
                              {(() => {
                                const isMsgExpanded = Boolean(expandedMessageCheckoutIds[booking.id]);
                                return (
                                  <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl overflow-hidden shadow-md transition-all mb-4">
                                    {/* Accordion Header */}
                                    <div
                                      onClick={() => toggleMessageAccordion(booking.id)}
                                      className="flex items-center justify-between flex-wrap gap-3 p-4 cursor-pointer hover:bg-purple-950/20 transition-colors select-none"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                                          <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">
                                              Generated Messenger Message
                                            </h5>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border transition-all ${
                                              isMsgExpanded
                                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                              {isMsgExpanded ? 'Expanded' : 'Click to View'}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-0.5">
                                            Pre-formatted checkout summary & receipt upload link for FB Messenger / SMS.
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const msg = generateCheckoutMessage(booking);
                                            navigator.clipboard.writeText(msg);
                                            setCopiedMessageId(booking.id);
                                            setTimeout(() => setCopiedMessageId(null), 3000);
                                          }}
                                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow"
                                        >
                                          {copiedMessageId === booking.id ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                                              <span className="text-emerald-300">Message Copied!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              <span>Copy Messenger Message</span>
                                            </>
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => toggleMessageAccordion(booking.id)}
                                          className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                                          title={isMsgExpanded ? 'Collapse Message' : 'Expand Message'}
                                        >
                                          {isMsgExpanded ? <ChevronUp className="w-4 h-4 text-purple-300" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Accordion Body */}
                                    {isMsgExpanded && (
                                      <div className="p-4 pt-0 border-t border-slate-800/80 space-y-3 animate-fade-in">
                                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                                          {generateCheckoutMessage(booking)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Customer Details */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-sm">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-1">
                                    <div className="font-semibold text-brand-lime uppercase tracking-wider text-xs flex items-center gap-1.5">
                                      <User className="w-4 h-4" /> Customer Profile
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-950 overflow-hidden shrink-0 shadow-sm">
                                      <img
                                        src={avatarSrc}
                                        alt={bName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            bName
                                          )}&background=b5f529&color=0f172a&bold=true`;
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400 font-semibold">Full Name:</span>
                                    <span className="font-semibold text-white text-sm">{bName}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400 font-semibold">Email Address:</span>
                                    <span className="font-semibold text-slate-200 font-mono text-xs">{booking.user?.email || booking.userEmail || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400 font-semibold">Phone Number:</span>
                                    <span className="font-semibold text-slate-200 font-mono text-xs">{booking.userPhone || 'Not provided'}</span>
                                  </div>
                                  {booking.guests && booking.guests.length > 0 && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/60">
                                      <div className="text-xs font-semibold text-brand-lime mb-1.5 flex items-center gap-1">
                                        <Users className="w-4 h-4" /> Registered Roster ({1 + booking.guests.length} Players):
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs py-0.5 text-slate-200">
                                          <span className="font-semibold">1. {bName}</span>
                                          <span className="text-[10px] font-semibold text-brand-lime uppercase">Primary</span>
                                        </div>
                                        {booking.guests.map((g, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-xs py-0.5 text-slate-400">
                                            <span className="font-semibold">{idx + 2}. {g.name || g.email}</span>
                                            <span className="text-[10px] font-semibold text-purple-300 uppercase">Guest</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Financial & Voucher Breakdown */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                                  <div className="font-bold text-brand-lime uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Payment & Voucher Breakdown
                                  </div>
                                  {isManual && (
                                    <>
                                      <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                        <span className="text-slate-400">Source:</span>
                                        <span className="font-extrabold text-purple-300 flex items-center gap-1">
                                          <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Manual / Admin Walk-in
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                        <span className="text-slate-400 font-semibold">Created By Admin Email:</span>
                                        <span className="font-extrabold text-amber-300 font-mono flex items-center gap-1 text-xs">
                                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                                          {booking.createdByAdminEmail || currentAdminEmail || 'admin@picklepoint.com'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                        <span className="text-slate-400 font-semibold">Created By Admin Name:</span>
                                        <span className="font-extrabold text-purple-300 text-xs">
                                          {booking.createdByAdminName || currentAdminName || 'Admin'}
                                        </span>
                                      </div>
                                      {booking.lastModifiedByAdminEmail && (
                                        <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                          <span className="text-slate-400 font-semibold">Modified By Admin Email:</span>
                                          <span className="font-extrabold text-amber-300 font-mono flex items-center gap-1 text-xs">
                                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                                            {booking.lastModifiedByAdminEmail}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400">Transaction Time:</span>
                                    <span className="font-semibold text-slate-300">{formatTimestamp(booking.createdAt)}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400">Payment Mode:</span>
                                    <span className="font-semibold text-white capitalize">{booking.paymentMethod || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400">Booking Ref:</span>
                                    <span className="font-bold text-white font-mono">{booking.bookingReference || booking.id}</span>
                                  </div>
                                  {booking.gcashReferenceNumber && (
                                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                      <span className="text-slate-400">GCash Ref:</span>
                                      <span className="font-bold text-brand-lime font-mono">{booking.gcashReferenceNumber}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400">Total Amount Paid:</span>
                                    <span className="font-extrabold text-white text-sm">₱{booking.totalCost}</span>
                                  </div>
                                </div>

                                {/* Receipt Image Preview */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between text-xs">
                                  <div>
                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 mb-2 gap-2 flex-wrap">
                                      <div className="font-bold text-brand-lime uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-brand-lime" /> Payment Receipt Proof
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const refCode = booking.bookingReference || booking.bookingId || booking.id;
                                          const shareUrl = `${window.location.origin}/?upload_receipt=${encodeURIComponent(refCode)}`;
                                          navigator.clipboard.writeText(shareUrl);
                                          setCopiedShareId(booking.id);
                                          setTimeout(() => setCopiedShareId(null), 3000);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-extrabold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                        title="Copy receipt upload link for FB Messenger"
                                      >
                                        {copiedShareId === booking.id ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400">Copied Link!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Share2 className="w-3 h-3 text-purple-400" />
                                            <span>Share Messenger Link</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    {proofUrl ? (
                                      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black/40 group max-h-28 flex items-center justify-center">
                                        <img
                                          src={proofUrl}
                                          alt="GCash Receipt Proof"
                                          className="object-cover w-full h-28"
                                        />
                                        <button
                                          onClick={() => onViewReceipt(proofUrl)}
                                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs cursor-pointer"
                                        >
                                          <Eye className="w-4 h-4 text-brand-lime" /> View Full Image
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 py-1">
                                        <p className="text-slate-400 italic text-xs">No receipt screenshot attached yet.</p>
                                        <p className="text-[11px] text-slate-500 leading-snug">
                                          Click <strong className="text-purple-300 font-semibold">Share Messenger Link</strong> above to send the upload link to the player via FB Messenger.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* FILTER & CHECKOUT SETTINGS MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Filter & Checkout Settings</h3>
                  <p className="text-slate-400 text-xs font-medium">Customize date boundaries, categories, and verification status</p>
                </div>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* 1. Date Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block cursor-pointer">
                  Specific Match Date
                </label>
                <div className="relative cursor-pointer">
                  <input
                    type="date"
                    value={checkoutDateFilter}
                    onClick={(e) => {
                      if ('showPicker' in e.currentTarget) {
                        try { e.currentTarget.showPicker(); } catch {}
                      }
                    }}
                    onChange={(e) => setCheckoutDateFilter(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-all cursor-pointer [color-scheme:dark]"
                  />
                  {checkoutDateFilter && (
                    <button
                      onClick={() => setCheckoutDateFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 min-h-[36px] flex items-center justify-center cursor-pointer"
                    >
                      Clear Date
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Booking Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Categories' },
                    { id: 'court', label: 'Court Bookings' },
                    { id: 'openplay', label: 'Open Play' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCheckoutCategoryFilter(cat.id as any)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] flex items-center justify-center text-center ${
                        checkoutCategoryFilter === cat.id
                          ? 'bg-brand-lime/10 text-brand-lime border-brand-lime/40 shadow-sm font-extrabold'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Verification Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Verification Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'pending', label: 'Pending Review', desc: 'Awaiting admin proof review' },
                    { id: 'all', label: 'All Statuses', desc: 'Show all payment records' },
                    { id: 'paid', label: 'Approved / Paid', desc: 'Payment verified & active' },
                    { id: 'cancelled', label: 'Refunded / Cancelled', desc: 'Cancelled or refunded' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setCheckoutStatusFilter(st.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer space-y-1 min-h-[52px] flex flex-col justify-center ${
                        checkoutStatusFilter === st.id
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-sm font-extrabold'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{st.label}</span>
                        {checkoutStatusFilter === st.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{st.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
              <button
                onClick={() => {
                  setCheckoutCategoryFilter('all');
                  setCheckoutStatusFilter('pending');
                  setCheckoutDateFilter('');
                }}
                className="w-full sm:w-auto text-xs font-extrabold text-rose-400 hover:text-rose-300 flex items-center justify-center gap-1.5 cursor-pointer px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors min-h-[44px]"
              >
                <X className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer shadow-lg shadow-brand-lime/20 min-h-[44px] flex items-center justify-center"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOOKING MODAL */}
      {editingManualBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Edit3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Reservation Details</h3>
                  <p className="text-slate-400 text-xs font-medium">
                    {isEditingCourtBooking
                      ? 'Modify reservation date, court schedule slots, customer details & pricing'
                      : 'Update customer contact details & payment method'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingManualBooking(null)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body - Scrollable with min-h-0 */}
            <form onSubmit={handleSaveEditedManualBooking} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 overscroll-contain">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {editError}
                </div>
              )}

              {/* SECTION: COURT SCHEDULE & TIMING (Only for Court Bookings) */}
              {isEditingCourtBooking && (
                <div className="p-4.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-brand-lime" /> Court Schedule & Timing
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">
                      {editSlots.length} slot(s) selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Court Selector (if multiple courts) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        Court Facility
                      </label>
                      {courts.length > 1 ? (
                        <select
                          value={editCourtId}
                          onChange={(e) => setEditCourtId(e.target.value)}
                          className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all cursor-pointer font-medium"
                        >
                          {courts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.type ? `(${c.type})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-4 py-2.5 min-h-[44px] flex items-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-bold">
                          {selectedEditCourt?.name || editingManualBooking.courtName || 'Default Court'}
                        </div>
                      )}
                    </div>

                    {/* Reservation Date Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" /> Booking Date <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all cursor-pointer font-medium"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>

                  {/* Interactive Time Slot Grid */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-lime" /> Available 1-Hour Time Slots
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Date: <strong className="text-brand-lime">{editDate || 'Select a date'}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                      {SLOTS.map((slot, idx) => {
                        const dayPrice = selectedEditCourt?.dayPrice || 120;
                        const nightPrice = selectedEditCourt?.nightPrice || 200;
                        const slotPrice = getSlotPrice(slot.startHour, dayPrice, nightPrice);
                        const isSelected = editSlots.includes(slot.time);
                        const isBooked = occupiedSlots.has(slot.time);

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleToggleEditSlot(slot.time)}
                            className={`py-2 px-2.5 min-h-[48px] rounded-xl border text-left text-xs transition-all relative flex flex-col justify-between gap-1 ${
                              isBooked
                                ? 'bg-slate-950/70 border-slate-850 text-slate-600 cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'bg-brand-lime text-slate-950 border-brand-lime font-black shadow-md'
                                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white cursor-pointer'
                            }`}
                          >
                            <span className="truncate text-[11px] leading-tight">
                              {slot.time.split(' - ')[0]}
                            </span>
                            <div className="flex items-center justify-between w-full">
                              {isBooked ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                  Booked
                                </span>
                              ) : (
                                <>
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-950/80' : 'text-slate-400'}`}>
                                    ₱{slotPrice}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-slate-950/20 px-1 rounded text-slate-950">
                                      Selected
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: CUSTOMER & FINANCIAL DETAILS */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Customer Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" /> Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      placeholder="Enter customer full name"
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all font-medium"
                    />
                  </div>

                  {/* Customer Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-400" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={editCustomerEmail}
                      onChange={(e) => setEditCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all font-medium"
                    />
                  </div>

                  {/* Customer Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-purple-400" /> Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      placeholder="0917 123 4567"
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-purple-400" /> Payment Method
                    </label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all cursor-pointer font-medium"
                    >
                      <option value="cash">💵 Cash / Counter</option>
                      <option value="gcash">🔵 GCash</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="complimentary">🎁 Complimentary / Free</option>
                      <option value="other">🏢 Other</option>
                    </select>
                  </div>

                  {/* Booking Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      Booking Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all cursor-pointer font-medium"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Total Cost */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="text-purple-400 font-bold">₱</span> Total Cost (Amount)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editTotalCost}
                      onChange={(e) => setEditTotalCost(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Actions - Pinned Bottom */}
              <div className="shrink-0 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditingManualBooking(null)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-extrabold cursor-pointer transition-colors flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || !editCustomerName.trim() || (isEditingCourtBooking && editSlots.length === 0)}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs cursor-pointer shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
