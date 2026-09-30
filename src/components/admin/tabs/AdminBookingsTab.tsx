import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  User,
  Building2,
  RotateCcw,
  CreditCard,
  Users,
  SlidersHorizontal,
  Trophy,
  Plus,
  Mail,
  Edit3,
  Loader2,
  Phone,
} from 'lucide-react';
import { type Booking, type UserPermissions, type BookingCategory, type AdminBookingsSubTab, BOOKING_CATEGORIES, getBookingScheduleState } from '../adminTypes';
import { Tag } from 'lucide-react';

interface AdminBookingsTabProps {
  bookingsSubTab?: AdminBookingsSubTab;
  setBookingsSubTab?: (subTab: AdminBookingsSubTab) => void;
  bookings: Booking[];
  filteredBookings: Booking[];
  totalRevenue: number;
  pendingBookings: Booking[];
  bookingSearch: string;
  setBookingSearch: (val: string) => void;
  bookingStatusFilter: 'all' | 'approved' | 'pending' | 'cancelled';
  setBookingStatusFilter: (val: 'all' | 'approved' | 'pending' | 'cancelled') => void;
  actionLoading?: string | null;
  onApproveBooking?: (bookingId: string) => void;
  onOpenCancelModal?: (booking: Booking) => void;
  onViewReceipt: (booking: Booking) => void;
  onDeleteBooking?: (bookingId: string) => void;
  onRefundBooking?: (booking: Booking) => void;
  onOpenManualBookingModal?: () => void;
  onUpdateManualBooking?: (
    bookingOrId: Booking | string,
    updatedData: { userName: string; userEmail: string; userPhone: string; paymentMethod: string; totalCost?: number }
  ) => Promise<void> | void;
  courts?: any[];
  users?: { id?: string; uid?: string; name?: string; email?: string; photoUrl?: string; avatarUrl?: string; role?: string }[];
  userPermissions?: UserPermissions;
  currentAdminEmail?: string;
  currentAdminName?: string;
}

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({
  bookingsSubTab = 'list',
  setBookingsSubTab = () => {},
  bookings,
  filteredBookings,
  totalRevenue: _totalRevenue,
  pendingBookings: _pendingBookings,
  bookingSearch,
  setBookingSearch,
  bookingStatusFilter,
  setBookingStatusFilter,
  actionLoading: _actionLoading,
  onApproveBooking: _onApproveBooking,
  onOpenCancelModal: _onOpenCancelModal,
  onViewReceipt,
  onDeleteBooking: _onDeleteBooking,
  onRefundBooking,
  onOpenManualBookingModal,
  onUpdateManualBooking,
  courts = [],
  users = [],
  userPermissions: _userPermissions,
  currentAdminEmail = '',
  currentAdminName = '',
}) => {
  // Calendar View State
  const [internalViewMode, setInternalViewMode] = useState<'table' | 'calendar'>('table');
  const activeViewMode = bookingsSubTab || internalViewMode;

  const handleSetViewMode = (mode: 'list' | 'calendar') => {
    setBookingsSubTab(mode);
    setInternalViewMode(mode === 'calendar' ? 'calendar' : 'table');
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarCourtId, setSelectedCalendarCourtId] = useState<string>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | BookingCategory>('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // Edit Manual Booking Modal state
  const [editingManualBooking, setEditingManualBooking] = useState<Booking | null>(null);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerEmail, setEditCustomerEmail] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('cash');
  const [editTotalCost, setEditTotalCost] = useState<string>('');
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEditManualModal = (booking: Booking) => {
    setEditingManualBooking(booking);
    setEditCustomerName(booking.user?.name || booking.userName || '');
    setEditCustomerEmail(booking.user?.email || booking.userEmail || '');
    setEditCustomerPhone(booking.userPhone || booking.user?.phone || '');
    setEditPaymentMethod(booking.paymentMethod || 'cash');
    setEditTotalCost(booking.totalCost !== undefined ? String(booking.totalCost) : '');
    setEditError(null);
  };

  const handleSaveEditedManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManualBooking || !onUpdateManualBooking) return;
    if (!editCustomerName.trim()) {
      setEditError('Customer Name is required');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const numCost = editTotalCost.trim() !== '' ? parseFloat(editTotalCost) : undefined;
      await onUpdateManualBooking(editingManualBooking, {
        userName: editCustomerName.trim(),
        userEmail: editCustomerEmail.trim(),
        userPhone: editCustomerPhone.trim(),
        paymentMethod: editPaymentMethod,
        ...(numCost !== undefined && !isNaN(numCost) ? { totalCost: numCost } : {}),
      });
      setEditingManualBooking(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update manual booking details');
    } finally {
      setEditSaving(false);
    }
  };

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

  const displayBookings = filteredBookings.filter((b) => {
    if (selectedBookingDate && b.date !== selectedBookingDate) {
      return false;
    }
    if (categoryFilter !== 'all') {
      const bCat = b.bookingCategory || (
        b.type === 'openplay' || b.type === 'open_play' || b.openPlayEventId ? 'tournament' : 'regular'
      );
      if (bCat !== categoryFilter) return false;
    }
    const schedState = getBookingScheduleState(b.date, b.slots);
    if (scheduleFilter === 'active') {
      return schedState === 'upcoming' || schedState === 'in_progress';
    }
    if (scheduleFilter === 'completed') {
      return schedState === 'completed';
    }
    return true;
  });

  const activeFilterCount =
    (selectedBookingDate ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (scheduleFilter !== 'all' ? 1 : 0) +
    (bookingStatusFilter !== 'all' ? 1 : 0);

  const renderStatusBadgeWithDot = (status: string, isScheduleCompleted?: boolean) => {
    const displayStatus = (status === 'approved' && isScheduleCompleted) ? 'completed' : status;
    const isApproved = displayStatus === 'approved';
    const isPending = displayStatus === 'pending';
    const isCompleted = displayStatus === 'completed';

    const dotClass = isApproved
      ? 'bg-emerald-400 shadow-emerald-500/60 ring-4 ring-emerald-500/20'
      : isPending
      ? 'bg-amber-400 shadow-amber-500/60 ring-4 ring-amber-500/20 animate-pulse'
      : isCompleted
      ? 'bg-purple-400 shadow-purple-500/60 ring-4 ring-purple-500/20'
      : 'bg-rose-500 shadow-rose-500/60 ring-4 ring-rose-500/20';

    const tooltipDesc = isApproved
      ? 'Approved & Active'
      : isPending
      ? 'Pending Admin Approval'
      : isCompleted
      ? 'Match Schedule Completed'
      : 'Reservation Cancelled';

    return (
      <div className="relative group/tooltip inline-flex items-center justify-center p-1">
        <span
          title={`${displayStatus.toUpperCase()} - ${tooltipDesc}`}
          className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-md ring-2 transition-all cursor-help hover:scale-125 ${dotClass}`}
        />
        <div className="absolute bottom-full mb-1.5 hidden group-hover/tooltip:flex flex-col items-center z-30 pointer-events-none">
          <span className="bg-slate-900 border border-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {tooltipDesc}
          </span>
          <span className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-700 rotate-45 -mt-1"></span>
        </div>
      </div>
    );
  };

  const formatBookingDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getBookingCategoryInfo = (b: Booking) => {
    if (b.bookingCategory) {
      const found = BOOKING_CATEGORIES.find((c) => c.id === b.bookingCategory);
      if (found) {
        return {
          label: found.shortLabel,
          fullLabel: found.label,
          badgeBg: found.badgeBg,
          badgeText: found.badgeText,
          badgeBorder: found.badgeBorder,
          colorClass: `${found.badgeText} font-extrabold`,
        };
      }
    }

    const typeStr = (b.type || '').toLowerCase();
    
    if (typeStr === 'tournament' || (b as any).isTournament || (b as any).tournamentId) {
      return { label: 'Tournament', fullLabel: 'Tournament', badgeBg: 'bg-cyan-950/40', badgeText: 'text-cyan-300', badgeBorder: 'border-cyan-800/50', colorClass: 'text-cyan-300 font-extrabold' };
    }
    
    if (typeStr === 'bootcamp' || (b as any).isBootcamp || (b as any).bootcampId) {
      return { label: 'Bootcamp', fullLabel: 'Bootcamp', badgeBg: 'bg-purple-950/40', badgeText: 'text-purple-300', badgeBorder: 'border-purple-800/50', colorClass: 'text-purple-300 font-extrabold' };
    }
    
    if (typeStr === 'openplay' || typeStr === 'open_play' || b.openPlayEventId || (b as any).isOpenPlay) {
      return { label: 'Open Play', fullLabel: 'Open Play Event', badgeBg: 'bg-cyan-950/40', badgeText: 'text-cyan-300', badgeBorder: 'border-cyan-800/50', colorClass: 'text-cyan-300 font-extrabold' };
    }

    return { label: 'Regular Walk-in', fullLabel: 'Regular Walk-in', badgeBg: 'bg-emerald-950/40', badgeText: 'text-emerald-400', badgeBorder: 'border-emerald-800/50', colorClass: 'text-emerald-400 font-extrabold' };
  };

  const formatTime12h = (t: string) => {
    if (!t) return 'N/A';
    const trimmed = t.trim();
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      const h = parseInt(match12[1], 10);
      return `${h}:${match12[2]} ${match12[3].toUpperCase()}`;
    }
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const h = parseInt(parts[0], 10);
      if (isNaN(h)) return trimmed;
      const m = parts[1]?.substring(0, 2) || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
    return trimmed;
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  // Helper for generating monthly calendar grid days (42 cells)
  const generateMonthDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const currentMonthLastDate = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const prevDate = new Date(year, month - 1, d);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${mStr}-${dStr}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    for (let i = 1; i <= currentMonthLastDate; i++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true, isToday: dateStr === todayStr });
    }

    // Next month padding days to reach 42 cells
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const dateStr = `${nextDate.getFullYear()}-${mStr}-${dStr}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false, isToday: false });
    }

    return days;
  };

  const calendarDays = generateMonthDays();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };
  const handleTodayMonth = () => {
    setCalendarMonth(new Date());
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Controls, Search & Filter Settings Trigger */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, court, customer name or email..."
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* View Mode Toggle Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode !== 'calendar'
                  ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === 'calendar'
                  ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {onOpenManualBookingModal && (
            <button
              type="button"
              onClick={onOpenManualBookingModal}
              className="px-4 py-2.5 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-brand-lime/10 shrink-0"
              title="Create a manual / walk-in reservation"
            >
              <Plus className="w-4 h-4 text-dark-bg stroke-[3]" />
              <span>Manual Booking</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
              activeFilterCount > 0
                ? 'bg-brand-lime text-dark-bg border-brand-lime shadow-brand-lime/20'
                : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-brand-lime/50 hover:text-white'
            }`}
            title="Open Filter & Timeline Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-current" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-dark-bg text-brand-lime text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {(activeFilterCount > 0 || Boolean(bookingSearch) || Boolean(selectedBookingDate)) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBookingDate('');
                setScheduleFilter('all');
                setBookingStatusFilter('all');
                setBookingSearch('');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="Reset all reservation filters"
            >
              <X className="w-3.5 h-3.5 text-red-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Display: Table View vs Calendar View */}
      {activeViewMode !== 'calendar' ? (
        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
          {/* MOBILE CARDS VIEW (Visible on small screens < md) */}
          <div className="md:hidden space-y-4 p-4">
            {displayBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 glass-panel border border-slate-800/80 rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-400">No bookings match your filter criteria.</p>
              </div>
            ) : (
              displayBookings.map((b) => {
                const schedState = getBookingScheduleState(b.date, b.slots);
                const isCompleted = schedState === 'completed';

                return (
                  <div key={b.id} className={`glass-panel border border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-xl text-left bg-slate-900/60 ${isCompleted ? 'opacity-80 hover:opacity-100 transition-opacity' : ''}`}>
                    {/* Header Row: Ref & Court */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="font-mono font-bold text-white text-xs">{b.bookingReference || b.id.substring(0, 8).toUpperCase()}</div>
                        {(() => {
                          const cat = getBookingCategoryInfo(b);
                          return (
                            <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1 ${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`}>
                              {cat.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderStatusBadgeWithDot(b.status, isCompleted)}
                      </div>
                    </div>

                    {/* Customer Info */}
                    {(() => {
                      const bName = b.user?.name || b.userName || 'Guest';
                      const bEmail = b.user?.email || b.userEmail || '';
                      const bUid = b.user?.uid || (b as any).userId;
                      const matchedUser = users.find(
                        (u) => (u.uid && bUid && u.uid === bUid) || (u.email && bEmail && u.email.toLowerCase() === bEmail.toLowerCase())
                      );
                      const avatarSrc =
                        matchedUser?.photoUrl ||
                        matchedUser?.avatarUrl ||
                        (b.user as any)?.photoUrl ||
                        (b.user as any)?.avatarUrl ||
                        (b as any).photoUrl ||
                        (b as any).avatarUrl ||
                        (b as any).playerPhotoUrl ||
                        (b as any).userPhotoUrl ||
                        `https://robohash.org/${encodeURIComponent(bName)}?set=set4`;

                      return (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60 flex items-center justify-center">
                            <img
                              src={avatarSrc}
                              alt={bName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bName)}&background=b5f529&color=0f172a&bold=true`;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate">{bName}</div>
                            <div className="text-xs text-slate-400 truncate">{bEmail || 'No Email'}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Schedule & Court Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                      <div>
                        <div className="text-slate-500 font-medium">Court</div>
                        <div className="font-bold text-slate-200">{b.courtName || 'Standard Court'}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">Date & Time</div>
                        <div className="font-bold text-slate-200">{formatBookingDate(b.date)}</div>
                      </div>
                    </div>

                    {/* Total & Payment */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="text-slate-400">
                        Total: <strong className="text-white font-mono font-bold text-sm">₱{(b.totalCost || 0).toLocaleString()}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">{b.paymentMethod || 'GCash'}</div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                      {b.receiptImageUrl && (
                        <button onClick={() => onViewReceipt(b)} className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
                          <Eye className="w-3.5 h-3.5" /> Proof
                        </button>
                      )}
                      {onRefundBooking && !isCompleted && (b.status === 'approved' || b.paymentStatus === 'paid' || b.refundRequested) && b.paymentStatus !== 'refunded' && (
                        <button
                          onClick={() => onRefundBooking(b)}
                          title="Issue Refund & Upload Receipt"
                          className={`px-2 py-1 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow hover:scale-[1.02] flex items-center gap-1 ${
                            b.refundRequested
                              ? 'bg-purple-600 border-purple-400 text-white animate-pulse'
                              : 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {b.refundRequested ? 'Approve Refund' : 'Refund'}
                        </button>
                      )}
                      {b.paymentStatus === 'refunded' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-bold uppercase tracking-wider">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Refunded
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on medium+ screens >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Reference & Type</th>
                  <th className="py-4 px-6">Customer Info</th>
                  <th className="py-4 px-6">Schedule Date</th>
                  <th className="py-4 px-6">Total & Payment</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {displayBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-400">No bookings match your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  displayBookings.map((b) => {
                    const schedState = getBookingScheduleState(b.date, b.slots);
                    const isPast = schedState === 'completed';
                    const isCompleted = isPast;
                    const isExpanded = expandedBookingId === b.id;
                    const isManual = isBookingManual(b);

                    const bName = b.user?.name || b.userName || 'Guest';
                    const bEmail = b.user?.email || b.userEmail || '';
                    const bUid = b.user?.uid || (b as any).userId;
                    const matchedUser = users.find(
                      (u) => (u.uid && bUid && u.uid === bUid) || (u.email && bEmail && u.email.toLowerCase() === bEmail.toLowerCase())
                    );
                    const avatarSrc =
                      matchedUser?.photoUrl ||
                      matchedUser?.avatarUrl ||
                      (b.user as any)?.photoUrl ||
                      (b.user as any)?.avatarUrl ||
                      (b as any).photoUrl ||
                      (b as any).avatarUrl ||
                      (b as any).playerPhotoUrl ||
                      (b as any).userPhotoUrl ||
                      `https://robohash.org/${encodeURIComponent(bName)}?set=set4`;

                    return (
                      <React.Fragment key={b.id}>
                        <tr 
                          onClick={() => setExpandedBookingId(prev => prev === b.id ? null : b.id)}
                          className={`transition-colors cursor-pointer ${isCompleted ? 'opacity-75 bg-slate-950/20 hover:opacity-100' : isExpanded ? 'bg-slate-900/40' : 'hover:bg-slate-800/40'}`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180 text-brand-lime' : ''}`} />
                              <div>
                                <div className="font-bold text-white font-mono text-xs">{b.bookingReference || b.id.substring(0, 8).toUpperCase()}</div>
                                {(() => {
                                  const cat = getBookingCategoryInfo(b);
                                  return (
                                    <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1 ${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`}>
                                      {cat.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60 flex items-center justify-center">
                                <img
                                  src={avatarSrc}
                                  alt={bName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bName)}&background=b5f529&color=0f172a&bold=true`;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-200 truncate">{bName}</div>
                                <div className="text-xs text-slate-400 truncate">{bEmail || 'No Email'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                              <span>{formatBookingDate(b.date)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-white">₱{(b.totalCost || 0).toLocaleString()}</div>
                            <div className="text-xs text-slate-400 capitalize">{b.paymentMethod || 'GCash'}</div>
                          </td>
                          <td className="py-4 px-6">
                            {renderStatusBadgeWithDot(b.status, isCompleted)}
                          </td>
                          <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-2">
                              {isManual && onUpdateManualBooking && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditManualModal(b)}
                                  title="Edit Manual Booking Details"
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/50 hover:bg-purple-600 hover:text-white text-purple-300 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] flex items-center gap-1.5 shadow-sm"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-purple-300" />
                                  <span>Edit</span>
                                </button>
                              )}
                              {b.receiptImageUrl && (
                                <button onClick={() => onViewReceipt(b)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all" title="View Proof">
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              {onRefundBooking && !isCompleted && (b.status === 'approved' || b.paymentStatus === 'paid' || b.refundRequested) && b.paymentStatus !== 'refunded' && (
                                <button
                                  onClick={() => onRefundBooking(b)}
                                  title="Issue Refund & Upload Receipt"
                                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow hover:scale-[1.02] flex items-center gap-1.5 ${
                                    b.refundRequested
                                      ? 'bg-purple-600 border-purple-400 text-white animate-pulse'
                                      : 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                                  }`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  {b.refundRequested ? 'Approve Refund' : 'Refund'}
                                </button>
                              )}
                              {b.paymentStatus === 'refunded' && (
                                <span className="inline-flex items-center gap-1 text-xs text-purple-400 font-bold uppercase tracking-wider px-2 py-1">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Refunded
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED ACCORDION PANEL ROW */}
                        {isExpanded && (
                          <tr key={`${b.id}-expanded`} className="bg-slate-950/80 border-b border-dark-border/60 animate-fade-in">
                            <td colSpan={6} className="p-6 text-left space-y-4">
                              {/* Joined Open Play Event Banner */}
                              {(b.type === 'openplay' || b.openPlayEventId || (b as any).isOpenPlay) && (
                                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-sm">
                                      <Trophy className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                                          Joined Open Play Event
                                        </span>
                                        {b.openPlayCategory && (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                            {b.openPlayCategory}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-base font-extrabold text-white mt-0.5">
                                        {b.openPlayTitle || b.courtName || 'Open Play Session'}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                      <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                                      <span>{b.date}</span>
                                    </div>
                                    {b.slots && b.slots.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {b.slots.map((s, idx) => {
                                          const slotText = s.includes(' - ')
                                            ? `${formatTime12h(s.split(' - ')[0])} - ${formatTime12h(s.split(' - ')[1])}`
                                            : formatTime12h(s);
                                          return (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-sm"
                                            >
                                              <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
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
                              {!(b.type === 'openplay' || b.openPlayEventId || (b as any).isOpenPlay) && (
                                <div className="bg-brand-lime/10 border border-brand-lime/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-lime/20 border border-brand-lime/40 flex items-center justify-center text-brand-lime shrink-0 shadow-sm">
                                      <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                      </div>
                                      <h4 className="text-base font-extrabold text-white mt-0.5">
                                        {b.courtName || 'Pickleball Court'}
                                      </h4>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                      <Calendar className="w-4 h-4 text-brand-lime shrink-0" />
                                      <span>{b.date}</span>
                                    </div>
                                    {b.slots && b.slots.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {b.slots.map((s, idx) => {
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
                                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                                          {b.slots.length} {b.slots.length === 1 ? 'hr' : 'hrs'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Customer Profile Card */}
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
                                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bName)}&background=b5f529&color=0f172a&bold=true`;
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
                                    <span className="font-semibold text-slate-200 font-mono text-xs">{bEmail || 'No Email Registered'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400 font-semibold">Phone Number:</span>
                                    <span className="font-semibold text-slate-200 font-mono text-xs">{b.userPhone || (b.user as any)?.phone || 'Not provided'}</span>
                                  </div>
                                  {b.guests && b.guests.length > 0 && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/60">
                                      <div className="text-xs font-semibold text-brand-lime mb-1.5 flex items-center gap-1">
                                        <Users className="w-4 h-4" /> Registered Roster ({1 + b.guests.length} Players):
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs py-0.5 text-slate-200">
                                          <span className="font-semibold">1. {bName}</span>
                                          <span className="text-[10px] font-semibold text-brand-lime uppercase">Primary</span>
                                        </div>
                                        {b.guests.map((g, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-xs py-0.5 text-slate-400">
                                            <span className="font-semibold">{idx + 2}. {g.name || g.email}</span>
                                            <span className="text-[10px] font-semibold text-purple-300 uppercase">Guest</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Financial & Voucher Breakdown Card */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                                  <div className="font-bold text-brand-lime uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Payment & Voucher Breakdown
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400">Transaction Time:</span>
                                    <span className="font-semibold text-slate-300">{formatTimestamp(b.createdAt)}</span>
                                  </div>
                                  {isManual && (
                                    <>
                                      <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                        <span className="text-slate-400 font-semibold">Created By Admin Email:</span>
                                        <span className="font-extrabold text-amber-300 font-mono flex items-center gap-1 text-xs">
                                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                                          {b.createdByAdminEmail || currentAdminEmail || 'admin@picklepoint.com'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                        <span className="text-slate-400 font-semibold">Created By Admin Name:</span>
                                        <span className="font-extrabold text-purple-300 text-xs">
                                          {b.createdByAdminName || currentAdminName || 'Admin'}
                                        </span>
                                      </div>
                                      {b.lastModifiedByAdminEmail && (
                                        <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                          <span className="text-slate-400 font-semibold">Modified By Admin Email:</span>
                                          <span className="font-extrabold text-amber-300 font-mono flex items-center gap-1 text-xs">
                                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                                            {b.lastModifiedByAdminEmail}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400">Payment Mode:</span>
                                    <span className="font-semibold text-white capitalize">{b.paymentMethod || 'GCash'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                    <span className="text-slate-400">Booking Ref:</span>
                                    <span className="font-bold text-white font-mono">{b.bookingReference || b.id}</span>
                                  </div>
                                  {b.gcashReferenceNumber && (
                                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                      <span className="text-slate-400">GCash Ref:</span>
                                      <span className="font-bold text-brand-lime font-mono">{b.gcashReferenceNumber}</span>
                                    </div>
                                  )}
                                  {b.voucherCode && (
                                    <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                      <span className="text-slate-400">Voucher Code:</span>
                                      <span className="font-bold text-brand-lime font-mono">{b.voucherCode}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400">Total Amount Paid:</span>
                                    <span className="font-extrabold text-white text-sm">₱{(b.totalCost || 0).toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Receipt Image Preview & Actions Card */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between text-xs space-y-3">
                                  <div>
                                    <div className="font-bold text-brand-lime uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" /> Payment Receipt Proof
                                    </div>
                                    {b.receiptImageUrl ? (
                                      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black/40 group max-h-28 flex items-center justify-center">
                                        <img
                                          src={b.receiptImageUrl}
                                          alt="Payment Receipt Proof"
                                          className="object-cover w-full h-28"
                                        />
                                        <button
                                          onClick={() => onViewReceipt(b)}
                                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs cursor-pointer"
                                        >
                                          <Eye className="w-4 h-4 text-brand-lime" /> View Full Image
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-slate-500 italic text-xs">No receipt screenshot attached.</p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                                    {onRefundBooking && !isCompleted && (b.status === 'approved' || b.paymentStatus === 'paid' || b.refundRequested) && b.paymentStatus !== 'refunded' && (
                                      <button
                                        onClick={() => onRefundBooking(b)}
                                        className={`w-full py-2 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow hover:scale-[1.01] ${
                                          b.refundRequested
                                            ? 'bg-purple-600 border-purple-400 text-white animate-pulse'
                                            : 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                                        }`}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        {b.refundRequested ? 'Approve Refund & Issue Credit/Receipt' : 'Issue Refund / Rebooking Credit'}
                                      </button>
                                    )}
                                    {b.paymentStatus === 'refunded' && (
                                      <div className="text-center py-1">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold uppercase tracking-wider">
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          Payment Refunded
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar View Matrix */
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in">
          {/* Calendar Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                type="button"
                onClick={handlePrevMonth} 
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base sm:text-lg font-black text-white min-w-[160px] sm:min-w-[200px] text-center tracking-tight">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                type="button"
                onClick={handleNextMonth} 
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={handleTodayMonth} 
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-lime hover:text-white font-extrabold text-xs transition-colors cursor-pointer border border-brand-lime/30"
              >
                Today
              </button>
            </div>

            {courts.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-400 font-bold hidden sm:inline">Filter Court:</span>
                <select 
                  value={selectedCalendarCourtId} 
                  onChange={(e) => setSelectedCalendarCourtId(e.target.value)} 
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-brand-lime transition-all w-full sm:w-auto"
                >
                  <option value="all">🏟️ All Courts ({courts.length})</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>Court: {c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2 bg-slate-900/40 rounded-xl border border-slate-800/60">{d}</div>
            ))}
          </div>

          {/* Monthly Days Matrix */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day, idx) => {
              const dayBookings = bookings.filter((b) => b.date === day.dateStr && (selectedCalendarCourtId === 'all' || b.courtId === selectedCalendarCourtId));
              const activeCount = dayBookings.filter(b => b.status !== 'cancelled').length;
              const pendingCount = dayBookings.filter(b => b.status === 'pending').length;
              const isSelected = selectedCalendarDate === day.dateStr;

              const hasBookings = dayBookings.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasBookings) {
                      setSelectedCalendarDate(day.dateStr);
                    }
                  }}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between text-left group ${
                    hasBookings ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    !day.isCurrentMonth 
                      ? 'opacity-30 bg-slate-950/40 border-slate-900/60' 
                      : isSelected
                      ? 'bg-slate-900/90 border-brand-lime shadow-lg shadow-brand-lime/10 ring-1 ring-brand-lime/40'
                      : day.isToday
                      ? 'bg-slate-900/80 border-brand-lime/60'
                      : hasBookings
                      ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                      : 'bg-slate-900/20 border-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      day.isToday 
                        ? 'text-dark-bg bg-brand-lime px-2 py-0.5 rounded-md font-black shadow-xs' 
                        : day.isCurrentMonth 
                        ? 'text-slate-200' 
                        : 'text-slate-500'
                    }`}>
                      {day.dayNum}
                    </span>
                    {pendingCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title={`${pendingCount} pending booking(s)`} />
                    )}
                  </div>

                  {activeCount > 0 ? (
                    <div className="space-y-1 mt-1">
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-between gap-1 ${
                        pendingCount > 0 
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                          : 'bg-brand-lime/15 text-brand-lime border border-brand-lime/30'
                      }`}>
                        <span className="truncate">{activeCount} {activeCount === 1 ? 'Booking' : 'Bookings'}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      {/* Micro Preview of booking categories */}
                      <div className="flex flex-wrap gap-1 max-h-[32px] overflow-hidden">
                        {dayBookings.slice(0, 3).map((b, bIdx) => {
                          const cat = getBookingCategoryInfo(b);
                          return (
                            <span 
                              key={bIdx} 
                              className={`w-1.5 h-1.5 rounded-full ${cat.badgeBg.replace('/40', '')}`}
                              title={`${b.courtName || 'Court'} - ${cat.label}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      No bookings
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal - Only shown if selected date has bookings */}
      {selectedCalendarDate && bookings.some(b => b.date === selectedCalendarDate && (selectedCalendarCourtId === 'all' || b.courtId === selectedCalendarCourtId)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={() => setSelectedCalendarDate(null)}>
          <div className="glass-panel max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-3xl p-6 bg-slate-950" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white">Bookings for {selectedCalendarDate}</h3>
              <button onClick={() => setSelectedCalendarDate(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              {bookings.filter(b => b.date === selectedCalendarDate).map(b => (
                <div key={b.id} className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-white">{b.courtName}</p>
                    <span className="text-[10px] font-bold uppercase text-brand-lime">{b.status}</span>
                  </div>
                  {(() => {
                    const bName = b.user?.name || b.userName || 'Guest';
                    const bEmail = b.user?.email || b.userEmail || '';
                    const bUid = b.user?.uid || (b as any).userId;
                    const matchedUser = users.find(
                      (u) => (u.uid && bUid && u.uid === bUid) || (u.email && bEmail && u.email.toLowerCase() === bEmail.toLowerCase())
                    );
                    const avatarSrc =
                      matchedUser?.photoUrl ||
                      matchedUser?.avatarUrl ||
                      (b.user as any)?.photoUrl ||
                      (b.user as any)?.avatarUrl ||
                      (b as any).photoUrl ||
                      (b as any).avatarUrl ||
                      (b as any).playerPhotoUrl ||
                      (b as any).userPhotoUrl ||
                      `https://robohash.org/${encodeURIComponent(bName)}?set=set4`;

                    return (
                      <div className="flex items-center gap-2.5 mt-2.5 text-xs text-slate-300">
                        <div className="w-6 h-6 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-xs ring-1 ring-slate-800/60 flex items-center justify-center">
                          <img
                            src={avatarSrc}
                            alt={bName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bName)}&background=b5f529&color=0f172a&bold=true`;
                            }}
                          />
                        </div>
                        <span className="font-semibold text-slate-200">{bName}</span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FILTER & TIMELINE SETTINGS MODAL */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/90 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime shrink-0 shadow-inner">
                  <SlidersHorizontal className="w-5 h-5 text-brand-lime" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">Filter & Timeline Settings</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Refine reservation records by date, timeline, and status.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Filter Controls */}
            <div className="space-y-5">
              {/* Section 1: Specific Date Filter */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-lime" />
                  <span>Specific Match Date</span>
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedBookingDate}
                      onChange={(e) => setSelectedBookingDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 hover:border-brand-lime/50 text-xs font-bold text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-lime/30 cursor-pointer transition-all [color-scheme:dark]"
                    />
                    {selectedBookingDate && (
                      <button
                        type="button"
                        onClick={() => setSelectedBookingDate('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Quick Date Selection Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {[
                      { label: 'All Dates', value: '' },
                      { label: 'Today', value: new Date().toISOString().split('T')[0] },
                      { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                      { label: 'Yesterday', value: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
                    ].map((qd) => (
                      <button
                        key={qd.label}
                        type="button"
                        onClick={() => setSelectedBookingDate(qd.value)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                          selectedBookingDate === qd.value
                            ? 'bg-brand-lime text-dark-bg border-brand-lime font-black shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {qd.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Schedule Timeline Filter */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-lime" />
                  <span>Schedule Timeline</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('all')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                      scheduleFilter === 'all'
                        ? 'bg-brand-lime/10 border-brand-lime text-brand-lime font-black shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('active')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      scheduleFilter === 'active'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-black shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('completed')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                      scheduleFilter === 'completed'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-black shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {/* Section 3: Booking Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-brand-lime" />
                  <span>Booking Status</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'approved', 'pending', 'cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBookingStatusFilter(st)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold capitalize border text-left flex items-center justify-between cursor-pointer transition-all ${
                        bookingStatusFilter === st
                          ? 'bg-brand-lime/10 border-brand-lime text-brand-lime font-black shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{st === 'all' ? 'All Statuses' : st}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({st === 'all' ? bookings.length : bookings.filter((b) => b.status === st).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 4: Booking Purpose / Type Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-lime" />
                  <span>Booking Purpose & Type</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border text-left transition-all cursor-pointer ${
                      categoryFilter === 'all'
                        ? 'bg-brand-lime/10 border-brand-lime text-brand-lime font-black shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    All Types
                  </button>
                  {BOOKING_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold border text-left transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? `${cat.badgeBg} ${cat.badgeBorder} ${cat.badgeText} font-black shadow-sm`
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {cat.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBookingDate('');
                  setScheduleFilter('all');
                  setBookingStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 text-red-400" />
                <span>Reset All Filters</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MANUAL BOOKING MODAL */}
      {editingManualBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Manual Booking</h3>
                  <p className="text-slate-400 text-xs font-medium">Update customer details & payment method</p>
                </div>
              </div>
              <button
                onClick={() => setEditingManualBooking(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditedManualBooking} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {editError}
                </div>
              )}

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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 transition-all"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 transition-all"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 transition-all"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" /> Payment Method
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 transition-all cursor-pointer"
                >
                  <option value="cash">💵 Cash / Counter</option>
                  <option value="gcash">🔵 GCash</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="complimentary">🎁 Complimentary / Free</option>
                  <option value="other">🏢 Other</option>
                </select>
              </div>

              {/* Total Cost */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="text-purple-400 font-bold">₱</span> Total Cost (Amount Paid)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editTotalCost}
                  onChange={(e) => setEditTotalCost(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditingManualBooking(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-extrabold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || !editCustomerName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs cursor-pointer shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all"
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
