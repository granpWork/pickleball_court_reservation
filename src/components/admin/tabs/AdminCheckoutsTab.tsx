import React, { useState, Fragment } from 'react';
import {
  Clock,
  Filter,
  CreditCard,
  X,
  ChevronDown,
  AlertCircle,
  Trophy,
  Building2,
  Calendar,
  Loader2,
  RotateCcw,
  User,
  Eye,
  Check
} from 'lucide-react';
import { type Booking, type GcashAccount, type UserAccount } from '../adminTypes';

interface AdminCheckoutsTabProps {
  users?: UserAccount[];
  checkouts: Booking[];
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
}

export const AdminCheckoutsTab: React.FC<AdminCheckoutsTabProps> = ({
  users = [],
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
  formatEventDateLong = (d) => d,
  formatDateLabel = (d) => d,
  formatTime12h = (t) => t,
  formatTimestamp = (t) => t || 'N/A',
}) => {
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null);
  const [checkoutDateFilter, setCheckoutDateFilter] = useState<string>('');
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);

  const displayCheckouts = filteredCheckouts.filter((b) => {
    if (!checkoutDateFilter) return true;
    return b.date === checkoutDateFilter || (b.createdAt && b.createdAt.startsWith(checkoutDateFilter));
  });

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* 1. FILTER CONTROLS */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
        {/* Line 1 on Mobile: Category & Status Side-by-Side */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Custom Category Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                setIsCategoryOpen(!isCategoryOpen);
                setIsStatusOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-brand-lime/50 text-xs font-extrabold text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-lime/30 cursor-pointer transition-all shadow-sm"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Filter className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold hidden lg:inline">Category:</span>
                <span className="text-white truncate">
                  {checkoutCategoryFilter === 'court' ? 'Courts' : checkoutCategoryFilter === 'openplay' ? 'Open Play' : 'All Categories'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isCategoryOpen ? 'rotate-180 text-brand-lime' : ''}`} />
            </button>

            {isCategoryOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)} />
                <div className="absolute left-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar w-48 sm:w-52">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutCategoryFilter('all');
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutCategoryFilter === 'all' ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>All Categories</span>
                    {checkoutCategoryFilter === 'all' && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutCategoryFilter('court');
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutCategoryFilter === 'court' ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Court Bookings</span>
                    {checkoutCategoryFilter === 'court' && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutCategoryFilter('openplay');
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutCategoryFilter === 'openplay' ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Open Play</span>
                    {checkoutCategoryFilter === 'openplay' && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Custom Payment Status Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsCategoryOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-emerald-400/50 text-xs font-extrabold text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-400/30 cursor-pointer transition-all shadow-sm"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold hidden lg:inline">Status:</span>
                <span className="text-white truncate">
                  {checkoutStatusFilter === 'pending' ? 'Pending' : checkoutStatusFilter === 'paid' ? 'Approved' : checkoutStatusFilter === 'cancelled' ? 'Refunded' : 'All Statuses'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isStatusOpen ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {isStatusOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsStatusOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar w-48 sm:w-52">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStatusFilter('all');
                      setIsStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutStatusFilter === 'all' ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>All Statuses</span>
                    {checkoutStatusFilter === 'all' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStatusFilter('pending');
                      setIsStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutStatusFilter === 'pending' ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Pending Review</span>
                    {checkoutStatusFilter === 'pending' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStatusFilter('paid');
                      setIsStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutStatusFilter === 'paid' ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Approved / Paid</span>
                    {checkoutStatusFilter === 'paid' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStatusFilter('cancelled');
                      setIsStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                      checkoutStatusFilter === 'cancelled' ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Refunded / Cancelled</span>
                    {checkoutStatusFilter === 'cancelled' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Line 2 on Mobile: Date Filter & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Date Filter */}
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400 flex items-center gap-1.5 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold hidden lg:inline">Date:</span>
            </div>
            <input
              type="date"
              value={checkoutDateFilter}
              onChange={(e) => setCheckoutDateFilter(e.target.value)}
              className="w-full sm:w-auto pl-9 lg:pl-18 pr-2 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-blue-400/50 text-xs font-extrabold text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400/30 cursor-pointer transition-all shadow-sm [color-scheme:dark]"
            />
          </div>

          {/* Reset Filters Button */}
          {(checkoutCategoryFilter !== 'all' || checkoutStatusFilter !== 'all' || Boolean(checkoutDateFilter)) && (
            <button
              onClick={() => {
                setCheckoutCategoryFilter('all');
                setCheckoutStatusFilter('all');
                setCheckoutDateFilter('');
                setIsCategoryOpen(false);
                setIsStatusOpen(false);
              }}
              className="text-xs text-slate-300 hover:text-white px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
              title="Reset checkout filters"
            >
              <X className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN CHECKOUTS & PAYMENTS VERIFICATION CONTAINER */}
      <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* MOBILE CARD VIEW (Visible on small screens < md) */}
        <div className="md:hidden space-y-4 p-4">
          {displayCheckouts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 glass-panel border border-slate-800/80 rounded-2xl p-6">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-3" />
              <p className="font-bold text-white text-sm">No checkout records found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your category, status, or date filter above.</p>
            </div>
          ) : (
            displayCheckouts.map((booking) => {
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
                        <Trophy className="w-3 h-3 text-brand-lime" /> Open Play
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
                              className="px-3 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-black text-xs uppercase cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectBooking(booking)}
                              className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 font-extrabold text-xs uppercase cursor-pointer"
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
            })
          )}
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
              {displayCheckouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-3" />
                    <p className="font-bold text-white text-sm">No checkout records found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your category, status, or date filter above.</p>
                  </td>
                </tr>
              ) : (
                displayCheckouts.map((booking) => {
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

                  return (
                    <Fragment key={booking.id}>
                      <tr 
                        onClick={() => setExpandedCheckoutId(prev => prev === booking.id ? null : booking.id)}
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
                              {booking.guests && booking.guests.length > 0 && (
                                <div className="text-[11px] text-brand-lime font-semibold mt-1">
                                  +{booking.guests.length} {booking.guests.length === 1 ? 'Guest' : 'Guests'}: {booking.guests.map(g => g.name || g.email).filter(Boolean).join(', ')}
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
                              <span>Open Play</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-300 shadow-sm">
                              <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                              <span>Court Booking</span>
                            </span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="py-4.5 px-6 font-semibold text-slate-300 capitalize">
                          {booking.paymentMethod === 'card' ? '💳 Credit Card' : booking.paymentMethod === 'venue' ? '🏢 On Counter' : booking.paymentMethod === 'maya' ? '🟢 Maya Online' : '🔵 GCash'}
                        </td>

                        {/* Reservation Schedule */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                            <span>{formatEventDateLong(booking.date) || formatDateLabel(booking.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>
                              {booking.slots && booking.slots.length > 0
                                ? booking.slots.map(s => {
                                    if (s.includes(' - ')) {
                                      const parts = s.split(' - ');
                                      return `${formatTime12h(parts[0])} - ${formatTime12h(parts[1])}`;
                                    }
                                    return formatTime12h(s);
                                  }).join(', ')
                                : 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="py-4.5 px-6">
                          <div className="font-extrabold text-white text-sm font-sans">₱{booking.totalCost}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{booking.slots?.length || 1} hrs reserved</div>
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
                                {(booking.receiptImageUrl || (booking as any).receiptUrl || (booking as any).paymentReceiptUrl) && (
                                  <button
                                    onClick={() => onViewReceipt(booking.receiptImageUrl || (booking as any).receiptUrl || (booking as any).paymentReceiptUrl)}
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
                                {booking.paymentStatus !== 'pending_verification' && booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'refunded' && !(booking.receiptImageUrl || (booking as any).receiptUrl || (booking as any).paymentReceiptUrl) && (
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
                          <td colSpan={7} className="p-6 text-left space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Customer Details */}
                              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-1">
                                  <div className="font-bold text-brand-lime uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Customer Profile
                                  </div>
                                  <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-950 overflow-hidden shrink-0 shadow-sm">
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
                                  <span className="text-slate-400">Full Name:</span>
                                  <span className="font-bold text-white">{bName}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                  <span className="text-slate-400">Email Address:</span>
                                  <span className="font-semibold text-slate-300 font-mono">{booking.user?.email || booking.userEmail || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                                  <span className="text-slate-400">Phone Number:</span>
                                  <span className="font-semibold text-slate-300 font-mono">{booking.userPhone || 'Not provided'}</span>
                                </div>
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
                                  {booking.receiptImageUrl ? (
                                    <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black/40 group max-h-28 flex items-center justify-center">
                                      <img
                                        src={booking.receiptImageUrl}
                                        alt="GCash Receipt Proof"
                                        className="object-cover w-full h-28"
                                      />
                                      <button
                                        onClick={() => onViewReceipt(booking.receiptImageUrl!)}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
