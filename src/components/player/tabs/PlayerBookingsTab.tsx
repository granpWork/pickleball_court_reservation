import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  QrCode,
  Search,
  Plus,
  Clock,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Booking } from '../../Profile';

interface PlayerBookingsTabProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onOpenQrPass: (booking: Booking) => void;
  onGoHome: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const PlayerBookingsTab: React.FC<PlayerBookingsTabProps> = ({
  bookings,
  onCancelBooking,
  onOpenQrPass,
  onGoHome,
  searchQuery,
  setSearchQuery,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((b) => {
    // 1. Status Filter
    const isCancelled = b.status === 'cancelled' || b.paymentStatus === 'refunded';
    const isPast = b.date < todayStr;
    const isUpcoming = b.date >= todayStr && !isCancelled;

    if (filterStatus === 'upcoming' && !isUpcoming) return false;
    if (filterStatus === 'past' && (!isPast || isCancelled)) return false;
    if (filterStatus === 'cancelled' && !isCancelled) return false;

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = b.courtName?.toLowerCase().includes(q);
      const venueMatch = b.ownerCompanyName?.toLowerCase().includes(q);
      const idMatch = (b.bookingId || b.id)?.toLowerCase().includes(q);
      const dateMatch = b.date?.includes(q);
      if (!nameMatch && !venueMatch && !idMatch && !dateMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Top Filter & Toolbar Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'upcoming', 'past', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-brand-lime text-slate-950 shadow-md font-black'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all'
                ? `All Reservations (${bookings.length})`
                : st === 'upcoming'
                ? `Upcoming`
                : st === 'past'
                ? `Past`
                : `Cancelled`}
            </button>
          ))}
        </div>

        {/* Search Bar on Mobile/Tablet */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by court, venue, ID..."
            className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-brand-lime"
          />
        </div>
      </div>

      {/* Bookings Table View */}
      {filteredBookings.length === 0 ? (
        <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-10 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-extrabold text-white">No Reservations Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No bookings match "${searchQuery}".`
              : `You don't have any ${filterStatus !== 'all' ? filterStatus : ''} court reservations recorded.`}
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Book a Court Now
          </button>
        </div>
      ) : (
        <div className="glass-panel border border-slate-800 bg-slate-900/60 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                  <th className="py-4 px-5">Ref ID & Court</th>
                  <th className="py-4 px-5">Date & Time</th>
                  <th className="py-4 px-5">Total Paid</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredBookings.map((b) => {
                  const isCancelled = b.status === 'cancelled' || b.paymentStatus === 'refunded';
                  const isPast = b.date < todayStr;
                  const isUpcoming = b.date >= todayStr && !isCancelled;
                  const refCode = b.bookingReference || b.bookingId || b.id.slice(0, 8);

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-900/80 transition-colors ${
                        isCancelled ? 'opacity-70 bg-slate-950/30' : ''
                      }`}
                    >
                      {/* 1. Ref ID & Court Name */}
                      <td className="py-4 px-5 align-middle">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                            #{refCode}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                            <span className="font-extrabold text-white block truncate">
                              {b.courtName}
                            </span>
                          </div>
                          {b.ownerCompanyName && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {b.ownerCompanyName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Date & Reserved Time */}
                      <td className="py-4 px-5 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-200 font-extrabold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{b.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-brand-lime font-mono text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-brand-lime shrink-0" />
                            <span>{b.slots?.join(', ')}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Total Fee Paid */}
                      <td className="py-4 px-5 align-middle">
                        <div>
                          <span className="text-sm font-mono font-black text-brand-lime block">
                            ₱{b.totalCost}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                            {b.paymentStatus === 'paid' ? 'Paid Online' : b.paymentStatus || 'Verified'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-4 px-5 align-middle">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </span>
                        ) : isPast ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                          </span>
                        )}
                      </td>

                      {/* 5. Actions */}
                      <td className="py-4 px-5 align-middle text-right">
                        {isUpcoming ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenQrPass(b)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Pass</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onCancelBooking(b.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 font-bold text-xs transition-all cursor-pointer"
                              title="Cancel Reservation"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

