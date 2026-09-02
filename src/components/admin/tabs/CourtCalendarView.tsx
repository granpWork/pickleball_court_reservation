import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  Plus,
  Copy,
  Check,
  CalendarDays,
  Trophy,
} from 'lucide-react';
import { type Court, type Booking } from '../adminTypes';
import { type OpenPlayEvent } from '../../OpenPlayDetails';

interface CourtCalendarViewProps {
  court: Court;
  bookings?: Booking[];
  openPlayEvents?: OpenPlayEvent[];
  onOpenManualBookingModal?: () => void;
}

export const CourtCalendarView: React.FC<CourtCalendarViewProps> = ({
  court,
  bookings = [],
  openPlayEvents = [],
  onOpenManualBookingModal,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const agendaRef = useRef<HTMLDivElement | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Format today as YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayString());

  // Filter bookings for this court excluding cancelled ones
  const courtBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.courtId === court.id && b.status !== 'cancelled'
    );
  }, [bookings, court.id]);

  // Group bookings by date string (YYYY-MM-DD)
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    courtBookings.forEach((b) => {
      if (!b.date) return;
      if (!map[b.date]) {
        map[b.date] = [];
      }
      map[b.date].push(b);
    });
    return map;
  }, [courtBookings]);

  // Filter active Open Play events for this court (including drafts)
  const courtOpenPlayEvents = useMemo(() => {
    return (openPlayEvents || []).filter((ev) => {
      if (ev.status === 'cancelled') return false;
      return !ev.courtIds || ev.courtIds.length === 0 || ev.courtIds.includes(court.id) || (ev as any).courtId === court.id;
    });
  }, [openPlayEvents, court.id]);

  // Group Open Play events by date string (YYYY-MM-DD)
  const openPlayEventsByDate = useMemo(() => {
    const map: Record<string, OpenPlayEvent[]> = {};
    courtOpenPlayEvents.forEach((ev) => {
      const dateStr = ev.eventDate || (ev as any).date;
      if (!dateStr) return;
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(ev);
    });
    return map;
  }, [courtOpenPlayEvents]);

  // Month navigation helpers
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(getTodayString());
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    // Smooth scroll to agenda section on mobile/small screens
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

  // Generate calendar day cells
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month filler days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, '0');
      const day = String(prevDate.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${year}-${month}-${day}`,
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${currentYear}-${monthStr}-${dayStr}`,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete grid
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(nextDate.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${year}-${month}-${day}`,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Bookings on selected date
  const selectedDayBookings = useMemo(() => {
    return bookingsByDate[selectedDateStr] || [];
  }, [bookingsByDate, selectedDateStr]);

  // Open Play events on selected date
  const selectedDayOpenPlayEvents = useMemo(() => {
    return openPlayEventsByDate[selectedDateStr] || [];
  }, [openPlayEventsByDate, selectedDateStr]);

  // Format selected date nicely (e.g. "Wednesday, Sept 2, 2026")
  const formatNiceDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="glass-panel border border-slate-800/90 rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl bg-slate-950/80 backdrop-blur-xl transition-all">
      {/* Section Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-lime/20 via-emerald-500/10 to-transparent border border-brand-lime/30 flex items-center justify-center text-brand-lime shadow-lg shadow-brand-lime/5 shrink-0">
            <CalendarIcon className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Court Schedule & Calendar
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[11px] font-black tracking-wide">
                {courtBookings.length} Active Reservation{courtBookings.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Real-time daily player reservations for <strong className="text-slate-200">{court.name}</strong>
            </p>
          </div>
        </div>

        {onOpenManualBookingModal && (
          <button
            type="button"
            onClick={onOpenManualBookingModal}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-black text-xs hover:bg-[#a6e224] hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 text-dark-bg stroke-[3]" />
            <span>Manual Booking</span>
          </button>
        )}
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
                {monthNames[currentMonth]} {currentYear}
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
              onClick={handleToday}
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

          {/* Days Grid - Fully Responsive for Mobile (320px+) to Desktop */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((d, idx) => {
              const dayBookings = bookingsByDate[d.dateStr] || [];
              const dayOpenPlay = openPlayEventsByDate[d.dateStr] || [];
              const bookingCount = dayBookings.length;
              const openPlayCount = dayOpenPlay.length;
              const totalCount = bookingCount + openPlayCount;
              const isSelected = d.dateStr === selectedDateStr;
              const isToday = d.dateStr === getTodayString();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(d.dateStr)}
                  className={`min-h-[58px] sm:min-h-[76px] p-1 sm:p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-brand-lime/10 border-brand-lime shadow-[0_0_15px_rgba(166,226,36,0.15)] ring-1 ring-brand-lime'
                      : isToday
                      ? 'bg-slate-900 border-slate-700 hover:border-slate-500'
                      : d.isCurrentMonth
                      ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900/80 text-slate-600 opacity-40 hover:opacity-80'
                  }`}
                >
                  {/* Top Day Number & Today/Booking Indicators */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-xs font-black px-1 sm:px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-brand-lime text-dark-bg font-black shadow-sm'
                          : isToday
                          ? 'bg-slate-700 text-brand-lime font-bold'
                          : d.isCurrentMonth
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {d.dayNum}
                    </span>

                    {totalCount > 0 && (
                      <span className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${openPlayCount > 0 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`} />
                    )}
                  </div>

                  {/* Bottom Booking Indicator Pill */}
                  {totalCount > 0 ? (
                    <div className="mt-1 w-full space-y-0.5">
                      {bookingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] sm:text-[10px] font-black leading-tight w-full justify-center shadow-sm">
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
                  {formatNiceDate(selectedDateStr)}
                </h4>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-black shadow-sm">
                {selectedDayBookings.length + selectedDayOpenPlayEvents.length} Item{(selectedDayBookings.length + selectedDayOpenPlayEvents.length) !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Bookings & Open Play List for Selected Date */}
            {selectedDayBookings.length > 0 || selectedDayOpenPlayEvents.length > 0 ? (
              <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                {/* 1. Open Play Events Scheduled for Selected Date */}
                {selectedDayOpenPlayEvents.map((ev, index) => (
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
                          <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                            <span>{ev.title}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                              Open Play
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-mono text-cyan-200 font-bold">{ev.startTime} - {ev.endTime}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { window.location.href = `/?eventId=${ev.id}`; }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        View Roster
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                      <span className="text-slate-400 font-medium">Category: <strong className="text-slate-200">{ev.category || 'Open Play'}</strong></span>
                      <span className="text-brand-lime font-mono font-bold">₱{ev.registrationFee || 0} / player</span>
                    </div>
                  </div>
                ))}

                {/* 2. Regular Individual Player Bookings */}
                {selectedDayBookings.map((b, index) => {
                  const playerName = b.userName || b.user?.name || 'Guest Player';
                  const playerEmail = b.userEmail || b.user?.email || 'No email on file';
                  const playerPhone = b.userPhone || b.user?.phone;
                  const slots = b.slots || [];
                  const isApproved = b.status === 'approved';
                  const isCopied = copiedEmail === playerEmail;

                  return (
                    <div
                      key={b.id || index}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-brand-lime/40 border-l-4 border-l-brand-lime transition-all space-y-3 shadow-md group"
                    >
                      {/* Player Info Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-lime/20 to-emerald-500/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-black text-sm shrink-0 shadow-inner">
                            {playerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                              <span>{playerName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[140px] sm:max-w-[180px] font-medium">{playerEmail}</span>
                              {playerEmail && playerEmail !== 'No email on file' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyEmail(playerEmail, e)}
                                  className="text-slate-500 hover:text-brand-lime transition-colors p-0.5"
                                  title="Copy Email"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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

                        {/* Payment Method, Reference & Total Cost */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900/60">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500">
                              Ref: {b.bookingReference || b.id?.substring(0, 8) || 'N/A'}
                            </span>
                            {b.paymentMethod && (
                              <span className="px-1.5 py-0.2 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                                {b.paymentMethod}
                              </span>
                            )}
                          </div>

                          <span className="font-black text-white font-mono text-xs">
                            ₱{b.totalCost?.toLocaleString() || 0}
                          </span>
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
                    This court is available for bookings on {formatNiceDate(selectedDateStr)}.
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
};
