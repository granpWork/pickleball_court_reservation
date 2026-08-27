import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
  User
} from 'lucide-react';
import { type Booking, getBookingColorTheme, isPastBookingDate } from '../adminTypes';

interface AdminBookingsTabProps {
  bookings: Booking[];
  filteredBookings: Booking[];
  totalRevenue: number;
  pendingBookings: Booking[];
  bookingSearch: string;
  setBookingSearch: (val: string) => void;
  bookingStatusFilter: 'all' | 'approved' | 'pending' | 'cancelled';
  setBookingStatusFilter: (val: 'all' | 'approved' | 'pending' | 'cancelled') => void;
  actionLoading: string | null;
  onApproveBooking: (bookingId: string) => void;
  onOpenCancelModal: (booking: Booking) => void;
  onViewReceipt: (booking: Booking) => void;
  onDeleteBooking?: (bookingId: string) => void;
  courts?: { id: string; name: string }[];
}

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({
  bookings,
  filteredBookings,
  totalRevenue,
  pendingBookings,
  bookingSearch,
  setBookingSearch,
  bookingStatusFilter,
  setBookingStatusFilter,
  actionLoading,
  onApproveBooking,
  onOpenCancelModal,
  onViewReceipt,
  onDeleteBooking,
  courts = [],
}) => {
  // Calendar View State
  const [bookingsViewMode, setBookingsViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarCourtId, setSelectedCalendarCourtId] = useState<string>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const approvedCount = bookings.filter((b) => b.status === 'approved').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

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
      {/* 1. Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-bold text-white mt-2 group-hover:text-brand-lime transition-colors">
                ₱{totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime shadow-inner">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Approved Bookings</span>
            <span className="text-brand-lime font-semibold">{approvedCount} Paid</span>
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-2xl font-bold text-white mt-2 group-hover:text-brand-lime transition-colors">
                {bookings.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Reservations Placed</span>
            <span className="text-amber-400 font-semibold">{pendingBookings.length} Pending</span>
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Rate</p>
              <h3 className="text-2xl font-bold text-white mt-2 group-hover:text-brand-lime transition-colors">
                {bookings.length > 0 ? Math.round((approvedCount / bookings.length) * 100) : 0}%
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Confirmed Bookings</span>
            <span className="text-emerald-400 font-semibold">{approvedCount} Confirmed</span>
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cancelled / Refunded</p>
              <h3 className="text-2xl font-bold text-white mt-2 group-hover:text-brand-lime transition-colors">
                {cancelledCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Cancelled Reservations</span>
            <span className="text-rose-400 font-semibold">{cancelledCount} Returned</span>
          </div>
        </div>
      </div>

      {/* 2. Controls, Search & View Mode Toggle */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, court, customer..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setBookingsViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                bookingsViewMode === 'table'
                  ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setBookingsViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                bookingsViewMode === 'calendar'
                  ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['all', 'approved', 'pending', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setBookingStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                bookingStatusFilter === status
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {status === 'all' ? `All (${bookings.length})` : `${status} (${bookings.filter((b) => b.status === status).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Display: Table View vs Calendar View */}
      {bookingsViewMode === 'table' ? (
        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
          {/* MOBILE CARDS VIEW (Visible on small screens < md) */}
          <div className="md:hidden space-y-4 p-4">
            {filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 glass-panel border border-slate-800/80 rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-400">No bookings match your filter criteria.</p>
              </div>
            ) : (
              filteredBookings.map((b) => {
                const isPast = isPastBookingDate(b.date);
                const colorTheme = getBookingColorTheme(b.id || b.user?.email || b.courtId);
                const isPendingAction = actionLoading === b.id;

                return (
                  <div key={b.id} className="glass-panel border border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-xl text-left bg-slate-900/60">
                    {/* Header Row: Ref & Court */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="font-mono font-bold text-white text-xs">{b.bookingReference || b.id.substring(0, 8).toUpperCase()}</div>
                        <div className="text-xs text-brand-lime font-bold mt-0.5">{b.courtName}</div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                          b.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : b.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="text-xs space-y-0.5">
                      <div className="font-extrabold text-white">{b.user?.name || b.userName || 'Guest'}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{b.user?.email || b.userEmail || 'No Email'}</div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Schedule Date & Slots</span>
                        <div className="font-bold text-white text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-brand-lime" />
                          <span>{b.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {b.slots?.map((slot, idx) => (
                            <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colorTheme.bg} ${colorTheme.text}`}>
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment</span>
                        <div className="font-extrabold text-white text-sm">₱{(b.totalCost || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{b.paymentMethod || 'GCash'}</div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                      {b.receiptImageUrl && (
                        <button onClick={() => onViewReceipt(b)} className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
                          <Eye className="w-3.5 h-3.5 text-brand-lime" /> Proof
                        </button>
                      )}
                      {b.status === 'pending' && (
                        <button onClick={() => onApproveBooking(b.id)} disabled={isPendingAction} className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 transition-all cursor-pointer">
                          {isPendingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve'}
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button onClick={() => onOpenCancelModal(b)} className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteBooking && isPast && (
                        <button onClick={() => onDeleteBooking(b.id)} className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 transition-all cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                  <th className="py-4 px-6">Reference & Court</th>
                  <th className="py-4 px-6">Customer Info</th>
                  <th className="py-4 px-6">Schedule & Slots</th>
                  <th className="py-4 px-6">Total & Payment</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-400">No bookings match your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const isPast = isPastBookingDate(b.date);
                    const colorTheme = getBookingColorTheme(b.id || b.user?.email || b.courtId);
                    const isPendingAction = actionLoading === b.id;

                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white font-mono text-xs">{b.bookingReference || b.id.substring(0, 8).toUpperCase()}</div>
                          <div className="text-xs text-brand-lime font-medium mt-0.5">{b.courtName}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-200">{b.user?.name || b.userName || 'Guest'}</div>
                          <div className="text-xs text-slate-400">{b.user?.email || b.userEmail || 'No Email'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {b.date}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {b.slots?.map((slot, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${colorTheme.bg} ${colorTheme.text} ${colorTheme.border}`}
                              >
                                {slot}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">₱{(b.totalCost || 0).toLocaleString()}</div>
                          <div className="text-xs text-slate-400 capitalize">{b.paymentMethod || 'GCash'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold capitalize ${
                              b.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : b.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {b.receiptImageUrl && (
                              <button onClick={() => onViewReceipt(b)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all" title="View Proof">
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {b.status === 'pending' && (
                              <button onClick={() => onApproveBooking(b.id)} disabled={isPendingAction} className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                                {isPendingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {b.status !== 'cancelled' && (
                              <button onClick={() => onOpenCancelModal(b)} className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {onDeleteBooking && isPast && (
                              <button onClick={() => onDeleteBooking(b.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={handlePrevMonth} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
              <h3 className="text-lg font-extrabold text-white min-w-[180px] text-center">{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <button onClick={handleNextMonth} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"><ChevronRight className="w-5 h-5" /></button>
              <button onClick={handleTodayMonth} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-lime font-bold text-xs">Today</button>
            </div>
            {courts.length > 0 && (
              <select value={selectedCalendarCourtId} onChange={(e) => setSelectedCalendarCourtId(e.target.value)} className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold">
                <option value="all">All Courts</option>
                {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-400 uppercase">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-2 bg-slate-900/40 rounded-xl border border-slate-800/60">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const dayBookings = bookings.filter((b) => b.date === day.dateStr && (selectedCalendarCourtId === 'all' || b.courtId === selectedCalendarCourtId));
              return (
                <div key={idx} onClick={() => setSelectedCalendarDate(day.dateStr)} className={`min-h-[100px] p-2.5 rounded-2xl border cursor-pointer ${!day.isCurrentMonth ? 'opacity-40' : 'bg-slate-900/50'} hover:border-brand-lime`}>
                  <span className={`text-xs font-bold ${day.isToday ? 'text-brand-lime' : 'text-slate-300'}`}>{day.dayNum}</span>
                  {dayBookings.length > 0 && <div className="mt-2 text-[10px] font-bold bg-slate-800 px-2 py-1 rounded">{dayBookings.length} Bookings</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedCalendarDate && (
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
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <User className="w-3 h-3" /> {b.userName || 'Guest'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
