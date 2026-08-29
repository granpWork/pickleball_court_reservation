import React, { useState, Fragment } from 'react';
import {
  Clock,
  Filter,
  CreditCard,
  X,
  ChevronDown,
  Trophy,
  Building2,
  Calendar,
  Loader2,
  RotateCcw,
  User,
  Eye,
  Check,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { type Booking, type GcashAccount, type UserAccount, type UserPermissions } from '../adminTypes';

interface AdminCheckoutsTabProps {
  users?: UserAccount[];
  checkouts?: Booking[];
  filteredCheckouts: Booking[];
  checkoutCategoryFilter: 'all' | 'court' | 'openplay';
  setCheckoutCategoryFilter: (cat: 'all' | 'court' | 'openplay') => void;
  checkoutStatusFilter: 'all' | 'pending' | 'paid' | 'cancelled';
  setCheckoutStatusFilter: (st: 'all' | 'pending' | 'paid' | 'cancelled') => void;
  actionLoading: string | null;
  onApproveBooking: (booking: Booking) => void;
  onRejectBooking: (booking: Booking) => void;
  onRefundBooking: (booking: Booking) => void;
  onViewReceipt: (receiptUrl: string) => void;
  onNavigateToBookings?: () => void;
  personalAccounts?: GcashAccount[];
  globalGcashName?: string;
  globalGcashNumber?: string;
  globalGcashQr?: string;
  onOpenGcashModal?: (type: 'my' | 'global', accountId?: string) => void;
  onDeleteGcashAccount?: (id: string) => void;
  formatEventDateLong?: (dateStr: string) => string;
  formatDateLabel?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
  formatTimestamp?: (ts?: string) => string;
  userPermissions?: UserPermissions;
}

export const AdminCheckoutsTab: React.FC<AdminCheckoutsTabProps> = ({
  users = [],
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
  formatEventDateLong = (d) => d,
  formatDateLabel = (d) => d,
  formatTime12h = (t) => t,
  formatTimestamp = (t) => t || 'N/A',
}) => {
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null);
  const [checkoutDateFilter, setCheckoutDateFilter] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  const activeFilterCount =
    (checkoutCategoryFilter !== 'all' ? 1 : 0) +
    (checkoutStatusFilter !== 'pending' ? 1 : 0) +
    (checkoutDateFilter ? 1 : 0);

  // Compute counts for verification queue badges
  const pendingQueueCount = checkouts.filter(
    (b) => b.paymentStatus === 'pending_verification'
  ).length;

  const displayCheckouts = filteredCheckouts.filter((b) => {
    if (!checkoutDateFilter) return true;
    return b.date === checkoutDateFilter || (b.createdAt && b.createdAt.startsWith(checkoutDateFilter));
  });

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* 1. HEADER & QUEUE MODE TOGGLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-brand-lime" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Payment Verification Queue</h2>
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

        {/* View Mode Segment Switcher: Pending Queue vs Audit History */}
        <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setCheckoutStatusFilter('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
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
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
              checkoutStatusFilter !== 'pending'
                ? 'bg-slate-800 border border-slate-700 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <span>Audit History</span>
            <span className="text-[10px] text-slate-400 font-mono">({checkouts.length})</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR WITH MODAL TRIGGER */}
      <div className="flex items-center justify-between gap-3 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-lime" />
          <span>Verification Queue Filters</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
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

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setCheckoutCategoryFilter('all');
                setCheckoutStatusFilter('pending');
                setCheckoutDateFilter('');
              }}
              className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
                  : 'Try adjusting your category, status, or date filter above to view historical records.'}
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
            {/* MOBILE CARD VIEW (Visible on small screens < md) */}
            <div className="md:hidden space-y-4 p-4">
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

                return (
                  <div key={booking.id} className="glass-panel border border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-xl text-left bg-slate-900/60">
                    {/* Header Row: Customer Info & Category */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
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
                          <div className="font-extrabold text-white text-sm truncate">{bName}</div>
                          <div className="text-xs text-slate-400 font-mono truncate">{booking.user?.email || booking.userEmail || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Category Badge */}
                      {booking.type === 'openplay' || booking.openPlayEventId || (booking as any).isOpenPlay ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-brand-lime/10 border border-brand-lime/30 text-brand-lime shrink-0">
                          <Trophy className="w-3 h-3 text-brand-lime" /> OP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 border border-blue-500/30 text-blue-300 shrink-0">
                          <Building2 className="w-3 h-3 text-blue-400" /> Court
                        </span>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Schedule</span>
                        <div className="font-bold text-white flex items-center gap-1 text-[11px] truncate">
                          <Calendar className="w-3 h-3 text-brand-lime shrink-0" />
                          <span>{formatEventDateLong(booking.date) || formatDateLabel(booking.date)}</span>
                        </div>
                        <div className="text-slate-400 flex items-center gap-1 text-[10px] truncate">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{booking.slots?.join(', ') || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment & Total</span>
                        <div className="font-extrabold text-white text-sm">₱{booking.totalCost}</div>
                        <div className="text-[10px] text-slate-400">
                          {booking.paymentMethod === 'card' ? '💳 Card' : booking.paymentMethod === 'venue' ? '🏢 Counter' : '🔵 GCash'}
                        </div>
                      </div>
                    </div>

                    {/* Status Row */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Status:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
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
                        {booking.paymentStatus === 'pending_verification'
                          ? 'Pending Review'
                          : booking.paymentStatus === 'refunded'
                          ? 'Refunded'
                          : booking.refundRequested
                          ? 'Refund Requested'
                          : booking.paymentStatus || 'unpaid'}
                      </span>
                    </div>

                    {/* Expandable Mobile Roster / Details Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedCheckoutId((prev) => (prev === booking.id ? null : booking.id))}
                      className="w-full py-1.5 text-[11px] font-extrabold text-slate-400 hover:text-white flex items-center justify-center gap-1 bg-slate-950/40 border border-slate-800 rounded-xl transition-all cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Full Details & Roster'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Expanded Mobile Drawer */}
                    {isExpanded && (
                      <div className="pt-2 space-y-3 border-t border-slate-800/80 animate-fade-in text-xs">
                        <div className="bg-slate-950/60 p-3 rounded-xl space-y-1.5">
                          <div className="text-[10px] uppercase font-bold text-brand-lime flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> Contact & Phone:
                          </div>
                          <div className="text-white font-mono">{booking.userPhone || 'No phone provided'}</div>
                          {booking.guests && booking.guests.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">
                                Player Roster ({1 + booking.guests.length}):
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-slate-200">1. {bName} (Primary)</div>
                                {booking.guests.map((g, idx) => (
                                  <div key={idx} className="text-slate-400">
                                    {idx + 2}. {g.name || g.email} (Guest)
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {booking.gcashReferenceNumber && (
                          <div className="bg-slate-950/60 p-3 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">GCash Ref:</span>
                            <span className="font-mono font-bold text-brand-lime">{booking.gcashReferenceNumber}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons Bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                      {isActionPending ? (
                        <Loader2 className="w-4 h-4 text-brand-lime animate-spin" />
                      ) : (
                        <>
                          {proofUrl && (
                            <button
                              type="button"
                              onClick={() => onViewReceipt(proofUrl)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-brand-lime font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Proof
                            </button>
                          )}

                          {booking.paymentStatus === 'pending_verification' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onApproveBooking(booking)}
                                className="px-3.5 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-black text-xs uppercase cursor-pointer shadow hover:bg-[#a6e224]"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onRejectBooking(booking)}
                                className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 font-extrabold text-xs uppercase cursor-pointer hover:bg-red-900 hover:text-white"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {booking.paymentStatus === 'paid' && (
                            <button
                              type="button"
                              onClick={() => onRefundBooking(booking)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-300 font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Refund
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Visible on medium+ screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
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
                                <div className="font-extrabold text-white text-sm">{bName}</div>
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
                              {booking.paymentStatus === 'pending_verification'
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
                                  {/* View Proof of Payment Receipt Button */}
                                  {proofUrl && (
                                    <button
                                      onClick={() => onViewReceipt(proofUrl)}
                                      title="View Proof of Payment Receipt"
                                      className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-brand-lime hover:bg-slate-700 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] flex items-center gap-1.5 shadow-sm"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-brand-lime" />
                                      <span>Proof</span>
                                    </button>
                                  )}

                                  {booking.paymentStatus === 'pending_verification' && (
                                    <>
                                      <button
                                        onClick={() => onApproveBooking(booking)}
                                        title="Approve Payment"
                                        className="px-2.5 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow hover:scale-[1.02]"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => onRejectBooking(booking)}
                                        title="Reject Payment & Cancel Booking"
                                        className="px-2.5 py-1.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02]"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {booking.paymentStatus === 'paid' && (
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
                                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                                          Court Reservation Details
                                        </span>
                                        {booking.courtType && (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                            {booking.courtType}
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
                                    <div className="font-bold text-brand-lime uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" /> Payment Receipt Proof
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
                                      <p className="text-slate-500 italic text-xs">No receipt screenshot attached.</p>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-lime transition-all cursor-pointer [color-scheme:dark]"
                  />
                  {checkoutDateFilter && (
                    <button
                      onClick={() => setCheckoutDateFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20"
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
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Categories' },
                    { id: 'court', label: 'Court Bookings' },
                    { id: 'openplay', label: 'Open Play' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCheckoutCategoryFilter(cat.id as any)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pending', label: 'Pending Review', desc: 'Awaiting admin proof review' },
                    { id: 'all', label: 'All Statuses', desc: 'Show all payment records' },
                    { id: 'paid', label: 'Approved / Paid', desc: 'Payment verified & active' },
                    { id: 'cancelled', label: 'Refunded / Cancelled', desc: 'Cancelled or refunded' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setCheckoutStatusFilter(st.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer space-y-1 ${
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
              <button
                onClick={() => {
                  setCheckoutCategoryFilter('all');
                  setCheckoutStatusFilter('pending');
                  setCheckoutDateFilter('');
                }}
                className="text-xs font-extrabold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer shadow-lg shadow-brand-lime/20"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
