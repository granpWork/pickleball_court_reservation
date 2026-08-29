import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Building2,
  Clock,
  BarChart3,
  Sparkles,
  CreditCard,
  Layers,
} from 'lucide-react';
import { type Booking, type UserPermissions, getBookingScheduleState } from '../adminTypes';

interface AdminDashboardTabProps {
  bookings: Booking[];
  courts?: any[];
  users?: any[];
  openPlayEvents?: any[];
  vouchers?: any[];
  onNavigateTab?: (tab: string) => void;
  userPermissions?: UserPermissions;
}

type TimeRange = 'all' | 'today' | 'week' | 'month' | 'last30';

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  bookings = [],
  courts: _courts = [],
  users: _users = [],
  openPlayEvents: _openPlayEvents = [],
  onNavigateTab: _onNavigateTab,
  userPermissions,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Filter bookings by selected time range
  const filteredBookings = useMemo(() => {
    if (timeRange === 'all') return bookings;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return bookings.filter((b) => {
      if (!b.date) return false;

      if (timeRange === 'today') {
        return b.date === todayStr;
      }

      const bDate = new Date(b.date);
      const diffTime = Math.abs(now.getTime() - bDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeRange === 'week') return diffDays <= 7;
      if (timeRange === 'last30') return diffDays <= 30;
      if (timeRange === 'month') {
        return (
          bDate.getMonth() === now.getMonth() &&
          bDate.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [bookings, timeRange]);

  // Overall Financial & Booking Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let activeScheduleCount = 0;
    let completedScheduleCount = 0;
    let gcashRevenue = 0;
    let cashRevenue = 0;

    filteredBookings.forEach((b) => {
      const isApproved = b.status === 'approved';
      const isPending = b.status === 'pending';
      const isCancelled = b.status === 'cancelled';

      if (isApproved) {
        approvedCount++;
        const cost = b.totalCost || 0;
        totalRevenue += cost;

        const pm = (b.paymentMethod || 'gcash').toLowerCase();
        if (pm.includes('cash') && !pm.includes('gcash')) {
          cashRevenue += cost;
        } else {
          gcashRevenue += cost;
        }
      }

      if (isPending) pendingCount++;
      if (isCancelled) cancelledCount++;

      const schedState = getBookingScheduleState(b.date, b.slots);
      if (schedState === 'upcoming' || schedState === 'in_progress') {
        activeScheduleCount++;
      } else if (schedState === 'completed') {
        completedScheduleCount++;
      }
    });

    return {
      totalRevenue,
      approvedCount,
      pendingCount,
      cancelledCount,
      activeScheduleCount,
      completedScheduleCount,
      gcashRevenue,
      cashRevenue,
      totalCount: filteredBookings.length,
    };
  }, [filteredBookings]);

  // Booking Category Distribution (Court vs Open Play vs Tournament vs Bootcamp)
  const categoryStats = useMemo(() => {
    let courtCount = 0;
    let courtRevenue = 0;
    let openPlayCount = 0;
    let openPlayRevenue = 0;
    let tournamentCount = 0;
    let tournamentRevenue = 0;
    let bootcampCount = 0;
    let bootcampRevenue = 0;

    filteredBookings.forEach((b) => {
      const isApproved = b.status === 'approved';
      const cost = isApproved ? b.totalCost || 0 : 0;
      const typeStr = (b.type || '').toLowerCase();

      if (typeStr === 'tournament' || (b as any).isTournament) {
        tournamentCount++;
        tournamentRevenue += cost;
      } else if (typeStr === 'bootcamp' || (b as any).isBootcamp) {
        bootcampCount++;
        bootcampRevenue += cost;
      } else if (typeStr === 'openplay' || typeStr === 'open_play' || b.openPlayEventId || (b as any).isOpenPlay) {
        openPlayCount++;
        openPlayRevenue += cost;
      } else {
        courtCount++;
        courtRevenue += cost;
      }
    });

    return [
      {
        name: 'Court Reservations',
        count: courtCount,
        revenue: courtRevenue,
        color: 'bg-brand-lime',
        textColor: 'text-brand-lime',
        borderColor: 'border-brand-lime/30',
        bgAlpha: 'bg-brand-lime/10',
      },
      {
        name: 'Open Play Events',
        count: openPlayCount,
        revenue: openPlayRevenue,
        color: 'bg-cyan-400',
        textColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/30',
        bgAlpha: 'bg-cyan-500/10',
      },
      {
        name: 'Tournaments',
        count: tournamentCount,
        revenue: tournamentRevenue,
        color: 'bg-amber-400',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        bgAlpha: 'bg-amber-500/10',
      },
      {
        name: 'Bootcamps',
        count: bootcampCount,
        revenue: bootcampRevenue,
        color: 'bg-purple-400',
        textColor: 'text-purple-400',
        borderColor: 'border-purple-500/30',
        bgAlpha: 'bg-purple-500/10',
      },
    ];
  }, [filteredBookings]);

  // Top Performing Courts Leaderboard
  const courtLeaderboard = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; bookings: number; slots: number }>();

    filteredBookings.forEach((b) => {
      const courtName = b.courtName || 'Court A';
      const existing = map.get(courtName) || { name: courtName, revenue: 0, bookings: 0, slots: 0 };
      existing.bookings += 1;
      existing.slots += (b.slots?.length || 1);
      if (b.status === 'approved') {
        existing.revenue += b.totalCost || 0;
      }
      map.set(courtName, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredBookings]);

  // Peak Hours Distribution
  const peakHours = useMemo(() => {
    const hourCounts: { [key: string]: number } = {};

    filteredBookings.forEach((b) => {
      b.slots?.forEach((slot) => {
        hourCounts[slot] = (hourCounts[slot] || 0) + 1;
      });
    });

    return Object.entries(hourCounts)
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredBookings]);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header & Time Period Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 glass-panel border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-lime" />
            <h2 className="text-xl font-black text-white tracking-tight">Business Analytics & Metrics</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Real-time revenue metrics, booking performance, court leaderboards, and peak hour trends.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'last30', label: 'Last 30 Days' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeRange(item.id as TimeRange)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                timeRange === item.id
                  ? 'bg-brand-lime text-slate-950 shadow-md shadow-brand-lime/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. TOP PERFORMANCE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-black text-white mt-2 group-hover:text-brand-lime transition-colors">
                {userPermissions?.canViewFinancials !== false
                  ? `₱${metrics.totalRevenue.toLocaleString()}`
                  : '🔒 Financials Restricted'}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime shadow-inner">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Payment Verified</span>
            <span className="text-brand-lime font-bold">{metrics.approvedCount} Approved</span>
          </div>
        </div>

        {/* Card 2: Total Bookings */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-2xl font-black text-white mt-2 group-hover:text-cyan-400 transition-colors">
                {metrics.totalCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Reservations</span>
            <span className="text-amber-400 font-bold">{metrics.pendingCount} Pending</span>
          </div>
        </div>

        {/* Card 3: Active / Upcoming Schedule */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active / Upcoming</p>
              <h3 className="text-2xl font-black text-white mt-2 group-hover:text-emerald-400 transition-colors">
                {metrics.activeScheduleCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Completed Schedules</span>
            <span className="text-purple-400 font-bold">{metrics.completedScheduleCount} Done</span>
          </div>
        </div>

        {/* Card 4: Cancelled Bookings */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all group shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cancelled</p>
              <h3 className="text-2xl font-black text-white mt-2 group-hover:text-rose-400 transition-colors">
                {metrics.cancelledCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Cancellation Rate</span>
            <span className="text-rose-400 font-bold">
              {metrics.totalCount > 0 ? Math.round((metrics.cancelledCount / metrics.totalCount) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY BREAKDOWN & PAYMENT METHOD DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Breakdown */}
        <div className="lg:col-span-2 glass-panel border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-lime" />
              <h3 className="text-base font-extrabold text-white">Booking Category Breakdown</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Revenue & Share</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoryStats.map((cat, idx) => {
              const revPercent =
                metrics.totalRevenue > 0
                  ? Math.round((cat.revenue / metrics.totalRevenue) * 100)
                  : 0;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${cat.borderColor} ${cat.bgAlpha} space-y-2.5 transition-transform hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={cat.textColor}>{cat.name}</span>
                    <span className="text-white font-mono">{cat.count} Bookings</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-black text-white">₱{cat.revenue.toLocaleString()}</div>
                    <span className="text-xs font-bold text-slate-400">{revPercent}% of total</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color} transition-all duration-500`} style={{ width: `${revPercent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Payment Method Share */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-brand-lime" />
              <h3 className="text-base font-extrabold text-white">Payment Method Share</h3>
            </div>

            <div className="space-y-4">
              {/* GCash */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    GCash Digital Payment
                  </span>
                  <span className="text-white font-mono">₱{metrics.gcashRevenue.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${
                        metrics.totalRevenue > 0
                          ? Math.round((metrics.gcashRevenue / metrics.totalRevenue) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Cash */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    On-Site Cash Payment
                  </span>
                  <span className="text-white font-mono">₱{metrics.cashRevenue.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{
                      width: `${
                        metrics.totalRevenue > 0
                          ? Math.round((metrics.cashRevenue / metrics.totalRevenue) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand-lime/10 border border-brand-lime/20 p-3.5 rounded-xl text-xs text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-lime shrink-0" />
            <span>Digital payments via GCash represent the majority of court transactions.</span>
          </div>
        </div>
      </div>

      {/* 3. TOP COURTS & PEAK HOURS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courts Leaderboard */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-lime" />
              <h3 className="text-base font-extrabold text-white">Top Performing Courts</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">By Revenue</span>
          </div>

          {courtLeaderboard.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">No court performance data available.</div>
          ) : (
            <div className="space-y-3">
              {courtLeaderboard.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-extrabold text-xs flex items-center justify-center border border-slate-700">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.slots} Hours Reserved ({item.bookings} Bookings)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-brand-lime text-sm">₱{item.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak Hours Distribution */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-extrabold text-white">Most Popular Time Slots</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Demand Heatmap</span>
          </div>

          {peakHours.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">No slot booking data available.</div>
          ) : (
            <div className="space-y-3">
              {peakHours.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/20">
                      #{index + 1}
                    </div>
                    <div className="font-bold text-white text-xs">{item.slot}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {item.count} Times Booked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
