import React from 'react';
import {
  Calendar,
  Trophy,
  Tag,
  Clock,
  QrCode,
  ArrowRight,
  Plus,
  Building2,
} from 'lucide-react';
import type { PlayerTabType } from '../PlayerSidebar';
import type { OpenPlayRegistration } from '../../OpenPlayDetails';

interface Booking {
  id: string;
  bookingId?: string;
  type?: string;
  courtName: string;
  date: string;
  slots: string[];
  totalCost: number;
  status?: string;
  paymentStatus?: string;
}

interface PlayerOverviewTabProps {
  user: {
    uid?: string;
    name?: string;
    email: string;
    role?: string;
    duprId?: string;
  } | null;
  bookings: Booking[];
  openPlayRegs: OpenPlayRegistration[];
  vouchers: any[];
  totalAvailableCredits: number;
  setActiveTab: (tab: PlayerTabType) => void;
  onGoHome: () => void;
}

export const PlayerOverviewTab: React.FC<PlayerOverviewTabProps> = ({
  user,
  bookings,
  openPlayRegs,
  vouchers,
  totalAvailableCredits,
  setActiveTab,
  onGoHome,
}) => {
  const userName = user?.name || user?.email?.split('@')[0] || 'Player';
  const duprId = user?.duprId || '';

  const activeBookings = bookings.filter(
    (b) => b.status !== 'cancelled' && b.paymentStatus !== 'refunded'
  );

  const activeOpenPlays = openPlayRegs.filter(
    (r) => r.status !== 'cancelled'
  );

  // Find next upcoming match (either court reservation or open play)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBookings = activeBookings
    .filter((b) => b.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const nextBooking = upcomingBookings[0];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* 1. Welcome Banner */}
      <div className="glass-panel bg-gradient-to-r from-slate-900 via-slate-950 to-dark-bg border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-lime/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-black uppercase tracking-wider">
                Active Player Portal
              </span>
              {duprId && (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                  ⚡ DUPR ID: {duprId}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-brand-lime">{userName}</span>!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Track your upcoming court reservations, access instant digital QR match passes, and check your Open Play rosters.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onGoHome}
              className="px-5 py-3 rounded-2xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all shadow-lg shadow-brand-lime/20 cursor-pointer flex items-center gap-2 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Reserve Court Now</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('passes')}
              className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-2 hover:bg-slate-800"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>My QR Passes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Reservations */}
        <div
          onClick={() => setActiveTab('bookings')}
          className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-2 bg-slate-900/40 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Court Reservations</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-brand-lime group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {activeBookings.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>{upcomingBookings.length} upcoming session(s)</span>
            <ArrowRight className="w-3 h-3 text-brand-lime ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stat 2: Open Play Sessions */}
        <div
          onClick={() => setActiveTab('openplay')}
          className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-2 bg-slate-900/40 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Open Play Entries</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-brand-lime group-hover:scale-110 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-brand-lime font-mono">
            {activeOpenPlays.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Joined open play rosters</span>
            <ArrowRight className="w-3 h-3 text-brand-lime ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stat 3: Store Credits */}
        <div
          onClick={() => setActiveTab('vouchers')}
          className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-2 bg-slate-900/40 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Store Credits</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-300 font-mono">
            ₱{totalAvailableCredits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>{vouchers.length} active credit voucher(s)</span>
            <ArrowRight className="w-3 h-3 text-purple-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stat 4: QR Match Passes */}
        <div
          onClick={() => setActiveTab('passes')}
          className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-2 bg-slate-900/40 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Digital QR Passes</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {activeBookings.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Ready for venue check-in</span>
            <ArrowRight className="w-3 h-3 text-emerald-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. Upcoming Match Spotlight & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Match Spotlight (Span 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-lime" /> Next Scheduled Match
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className="text-xs text-brand-lime hover:underline font-bold transition-all cursor-pointer"
            >
              View All Reservations →
            </button>
          </div>

          {nextBooking ? (
            <div className="glass-panel border border-brand-lime/30 bg-slate-900/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-[10px] font-black uppercase tracking-wider">
                    Upcoming Match
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">
                    {nextBooking.courtName}
                  </h4>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <div className="text-xs font-bold text-slate-400">Date & Schedule</div>
                  <div className="text-sm font-black text-brand-lime">
                    {nextBooking.date} • {nextBooking.slots?.join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Booking ID: <span className="font-mono text-slate-200">{nextBooking.bookingId || nextBooking.id}</span></div>
                  <div>Total Fee Paid: <span className="font-mono text-brand-lime font-bold">₱{nextBooking.totalCost}</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('passes')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" /> View QR Access Pass
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-8 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-extrabold text-white">No Upcoming Court Matches</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You don't have any active court reservations scheduled for today or upcoming dates.
              </p>
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Book a Court Now
              </button>
            </div>
          )}
        </div>

        {/* Quick Action Shortcuts (Span 1 col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-emerald" /> Quick Actions
          </h3>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onGoHome}
              className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block group-hover:text-brand-lime transition-colors">
                    Reserve a Court
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Find available venues & hours
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            <button
              type="button"
              onClick={onGoHome}
              className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime flex items-center justify-center font-bold">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block group-hover:text-brand-lime transition-colors">
                    Join Open Play
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Social & DUPR rated lobbies
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="w-full p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <span className="text-xs font-black text-white block group-hover:text-amber-300 transition-colors">
                    Update DUPR ID
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Auto-fill DUPR event entries
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
