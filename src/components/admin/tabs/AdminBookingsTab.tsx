import React, { useState, useRef } from 'react';
import {
  Calendar,
  CalendarDays,
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
  Copy,
  Check,
} from 'lucide-react';
import { type Booking, type UserPermissions, type BookingCategory, type AdminBookingsSubTab, BOOKING_CATEGORIES, getBookingScheduleState } from '../adminTypes';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
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
  openPlayEvents?: OpenPlayEvent[];
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
  openPlayEvents = [],
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

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarCourtId, setSelectedCalendarCourtId] = useState<string>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getTodayString());
  const agendaRef = useRef<HTMLDivElement | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
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

  // Navigation & selection handlers
  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };
  const handleTodayMonth = () => {
    setCalendarMonth(new Date());
    setSelectedCalendarDate(getTodayString());
  };

  const handleSelectCalendarDate = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && agendaRef.current) {
      setTimeout(() => {
        agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const formatNiceDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      ) : (() => {
        const calendarFilteredBookings = bookings.filter(
          (b) => b.status !== 'cancelled' && (selectedCalendarCourtId === 'all' || b.courtId === selectedCalendarCourtId)
        );
        const calendarFilteredOpenPlay = (openPlayEvents || []).filter((ev) => {
          if (ev.status === 'cancelled') return false;
          if (selectedCalendarCourtId === 'all') return true;
          return (
            !ev.courtIds ||
            ev.courtIds.length === 0 ||
            ev.courtIds.includes(selectedCalendarCourtId) ||
            (ev as any).courtId === selectedCalendarCourtId
          );
        });

        const selectedDayBookings = calendarFilteredBookings.filter((b) => b.date === selectedCalendarDate);
        const selectedDayOpenPlay = calendarFilteredOpenPlay.filter(
          (ev) => (ev.eventDate || (ev as any).date) === selectedCalendarDate
        );
        const selectedCourtObj = courts.find((c) => c.id === selectedCalendarCourtId);

        return (
          /* 2-Column Calendar & Scheduled Reservations View */
          <div className="glass-panel border border-slate-800/90 rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl bg-slate-950/80 backdrop-blur-xl transition-all animate-fade-in">
            {/* Section Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-lime/20 via-emerald-500/10 to-transparent border border-brand-lime/30 flex items-center justify-center text-brand-lime shadow-lg shadow-brand-lime/5 shrink-0">
                  <Calendar className="w-5.5 h-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Court Schedule & Calendar
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[11px] font-black tracking-wide">
                      {calendarFilteredBookings.length} Active Reservation{calendarFilteredBookings.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Real-time daily player reservations for{' '}
                    <strong className="text-slate-200">
                      {selectedCourtObj ? selectedCourtObj.name : 'All Courts'}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto justify-end">
                {courts.length > 0 && (
                  <select
                    value={selectedCalendarCourtId}
                    onChange={(e) => setSelectedCalendarCourtId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-brand-lime transition-all cursor-pointer"
                  >
                    <option value="all">🏟️ All Courts ({courts.length})</option>
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        Court: {c.name}
                      </option>
                    ))}
                  </select>
                )}

                {onOpenManualBookingModal && (
                  <button
                    type="button"
                    onClick={onOpenManualBookingModal}
                    className="px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-black text-xs hover:bg-[#a6e224] hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-dark-bg stroke-[3]" />
                    <span>Manual Booking</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Grid: Left Column Calendar (7 cols), Right Column Selected Day Schedule (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Side: Interactive Month Calendar (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Calendar Header Controls */}
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/90 p-2.5 sm:p-3 rounded-2xl shadow-inner">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <h4 className="text-xs sm:text-sm font-black text-white min-w-[130px] sm:min-w-[150px] text-center tracking-wide">
                      {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTodayMonth}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-extrabold text-slate-200 hover:text-brand-lime hover:border-brand-lime/40 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Today
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider py-1">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {calendarDays.map((day, idx) => {
                    const dayBookings = calendarFilteredBookings.filter((b) => b.date === day.dateStr);
                    const dayOpenPlay = calendarFilteredOpenPlay.filter(
                      (ev) => (ev.eventDate || (ev as any).date) === day.dateStr
                    );
                    const bookingCount = dayBookings.length;
                    const openPlayCount = dayOpenPlay.length;
                    const pendingCount = dayBookings.filter((b) => b.status === 'pending').length;
                    const totalCount = bookingCount + openPlayCount;
                    const isSelected = day.dateStr === selectedCalendarDate;
                    const isToday = day.dateStr === getTodayString();

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCalendarDate(day.dateStr)}
                        className={`min-h-[58px] sm:min-h-[76px] p-1 sm:p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'bg-brand-lime/10 border-brand-lime shadow-[0_0_15px_rgba(166,226,36,0.15)] ring-1 ring-brand-lime'
                            : isToday
                            ? 'bg-slate-900 border-slate-700 hover:border-slate-500'
                            : day.isCurrentMonth
                            ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                            : 'bg-slate-950/40 border-slate-900/80 text-slate-600 opacity-40 hover:opacity-80'
                        }`}
                      >
                        {/* Top Day Number & Status Indicator */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[11px] sm:text-xs font-black px-1 sm:px-1.5 py-0.2 rounded-md ${
                              isSelected
                                ? 'bg-brand-lime text-dark-bg font-black shadow-sm'
                                : isToday
                                ? 'bg-slate-700 text-brand-lime font-bold'
                                : day.isCurrentMonth
                                ? 'text-slate-200'
                                : 'text-slate-500'
                            }`}
                          >
                            {day.dayNum}
                          </span>

                          {totalCount > 0 && (
                            <span
                              className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${
                                pendingCount > 0
                                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse'
                                  : openPlayCount > 0
                                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse'
                                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                              }`}
                            />
                          )}
                        </div>

                        {/* Bottom Booking Indicator Pill */}
                        {totalCount > 0 ? (
                          <div className="mt-1 w-full space-y-0.5">
                            {bookingCount > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black leading-tight w-full justify-center shadow-sm ${
                                  pendingCount > 0
                                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                                    : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                }`}
                              >
                                <span>{bookingCount}</span>
                                <span className="hidden sm:inline">Booked</span>
                              </span>
                            )}
                            {openPlayCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[9px] sm:text-[10px] font-black leading-tight w-full justify-center shadow-sm">
                                <span>🏆 Open Play</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] sm:text-[10px] text-slate-600 font-medium px-0.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                            Free
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Selected Day Schedule & Player List (5 cols) */}
              <div ref={agendaRef} className="lg:col-span-5 space-y-4">
                <div className="glass-panel border border-slate-800/90 rounded-2xl p-4 sm:p-5 bg-slate-900/80 space-y-4 shadow-xl backdrop-blur-md">
                  {/* Header: Selected Date Title & Count */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-brand-lime" />
                        <span>SCHEDULED RESERVATIONS</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white mt-0.5">
                        {formatNiceDate(selectedCalendarDate)}
                      </h4>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-black shadow-sm">
                      {selectedDayBookings.length + selectedDayOpenPlay.length} Item
                      {selectedDayBookings.length + selectedDayOpenPlay.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bookings & Open Play List for Selected Date */}
                  {selectedDayBookings.length > 0 || selectedDayOpenPlay.length > 0 ? (
                    <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                      {/* 1. Open Play Events Scheduled for Selected Date */}
                      {selectedDayOpenPlay.map((ev, index) => (
                        <div
                          key={`op-${ev.id || index}`}
                          className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 border-l-4 border-l-cyan-400 transition-all space-y-3 shadow-md group hover:border-cyan-400/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-black text-sm shrink-0">
                                <Trophy className="w-4 h-4 text-cyan-300" />
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{ev.title}</span>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                                    Open Play
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="font-mono text-cyan-200 font-bold">
                                    {ev.startTime} - {ev.endTime}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                window.location.href = `/?eventId=${ev.id}`;
                              }}
                              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
                            >
                              View Roster
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                            <span className="text-slate-400 font-medium">
                              Category: <strong className="text-slate-200">{ev.category || 'Open Play'}</strong>
                            </span>
                            <span className="text-brand-lime font-mono font-bold">
                              ₱{ev.registrationFee || 0} / player
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* 2. Regular & Manual Player Bookings */}
                      {selectedDayBookings.map((b, index) => {
                        const playerName = b.userName || b.user?.name || 'Guest Player';
                        const playerEmail = b.userEmail || b.user?.email || 'No email on file';
                        const playerPhone = b.userPhone || b.user?.phone;
                        const slots = b.slots || [];
                        const isApproved = b.status === 'approved';
                        const isCopied = copiedEmail === playerEmail;
                        const catInfo = getBookingCategoryInfo(b);
                        const manualFlag = isBookingManual(b);

                        return (
                          <div
                            key={b.id || index}
                            className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-brand-lime/40 border-l-4 border-l-brand-lime transition-all space-y-3 shadow-md group"
                          >
                            {/* Top Court & Category Row */}
                            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-900/80">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-200">
                                <Building2 className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                                <span>{b.courtName || 'Pickleball Court'}</span>
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${catInfo.badgeBg} ${catInfo.badgeText} ${catInfo.badgeBorder}`}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                <span>{catInfo.label}</span>
                              </span>
                            </div>

                            {/* Player Info Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-lime/20 to-emerald-500/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-black text-sm shrink-0 shadow-inner">
                                  {playerName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate">
                                    <span className="truncate">{playerName}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate max-w-[140px] sm:max-w-[180px] font-medium">
                                      {playerEmail}
                                    </span>
                                    {playerEmail && playerEmail !== 'No email on file' && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyEmail(playerEmail, e)}
                                        className="text-slate-500 hover:text-brand-lime transition-colors p-0.5 cursor-pointer"
                                        title="Copy Email"
                                      >
                                        {isCopied ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  {playerPhone && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                                      <Phone className="w-3 h-3 text-slate-500" />
                                      <span>{playerPhone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shrink-0 shadow-sm ${
                                  isApproved
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {b.status || 'Approved'}
                              </span>
                            </div>

                            {/* Time Slots & Booking Details */}
                            <div className="pt-2.5 border-t border-slate-900 space-y-2.5 text-xs">
                              {/* Time Slots */}
                              <div className="flex items-start gap-2 text-slate-300">
                                <Clock className="w-3.5 h-3.5 text-brand-lime shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                  {slots.length > 0 ? (
                                    slots.map((s, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-brand-lime shadow-sm"
                                      >
                                        {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 font-medium">Standard Slot</span>
                                  )}
                                </div>
                              </div>

                              {/* Payment Method, Reference, Total Cost & Quick Actions */}
                              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 pt-1.5 border-t border-slate-900/60 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-slate-500">
                                    Ref: {b.bookingReference || b.id?.substring(0, 8) || 'N/A'}
                                  </span>
                                  {b.paymentMethod && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                                      {b.paymentMethod}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                  {manualFlag && onUpdateManualBooking && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditManualModal(b)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                                      title="Edit Manual Booking"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  {b.receiptImageUrl && (
                                    <button
                                      type="button"
                                      onClick={() => onViewReceipt(b)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                                      title="View Payment Receipt"
                                    >
                                      <Eye className="w-3 h-3 text-brand-lime" />
                                      <span>Proof</span>
                                    </button>
                                  )}
                                  <span className="font-black text-white font-mono text-xs">
                                    ₱{b.totalCost?.toLocaleString() || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Empty Day State */
                    <div className="py-8 text-center space-y-3 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/40 p-4">
                      <Clock className="w-8 h-8 text-slate-700 mx-auto" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-300">No Reservations for This Date</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {selectedCourtObj ? selectedCourtObj.name : 'All courts'} available for bookings on{' '}
                          {formatNiceDate(selectedCalendarDate)}.
                        </p>
                      </div>
                      {onOpenManualBookingModal && (
                        <button
                          type="button"
                          onClick={onOpenManualBookingModal}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-brand-lime font-extrabold text-xs hover:bg-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Create Reservation</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
