import React, { useState, useMemo } from 'react';
import {
  Tag,
  Copy,
  Check,
  Sparkles,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import type { Voucher } from '../../admin/adminTypes';

interface PlayerVouchersTabProps {
  vouchers: Voucher[];
  totalAvailableCredits: number;
  onGoHome: () => void;
}

export const PlayerVouchersTab: React.FC<PlayerVouchersTabProps> = ({
  vouchers,
  totalAvailableCredits,
  onGoHome,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<'active' | 'used'>('active');

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch (e) {}
  };

  const handleApplyAndBook = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      sessionStorage.setItem('picklepoint_prefilled_voucher', code);
    } catch (e) {}
    onGoHome();
  };

  // Helper: Determine if voucher is actively usable
  const isVoucherActive = (v: Voucher) => {
    if (v.status !== 'active') return false;
    if (v.maxUses > 0 && (v.usedCount || 0) >= v.maxUses) return false;
    if (v.expiryDate) {
      const expTime = new Date(`${v.expiryDate}T23:59:59`).getTime();
      if (expTime < Date.now()) return false;
    }
    return true;
  };

  const activeVouchers = useMemo(() => vouchers.filter(isVoucherActive), [vouchers]);
  const inactiveVouchers = useMemo(() => vouchers.filter((v) => !isVoucherActive(v)), [vouchers]);

  const displayedVouchers = statusTab === 'active' ? activeVouchers : inactiveVouchers;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Credits Header Summary Banner */}
      <div className="glass-panel border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-950 to-dark-bg rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <Sparkles className="w-3.5 h-3.5" /> Player Wallet Balance
          </span>
          <h3 className="text-2xl font-black text-white">Available Store Credits & Vouchers</h3>
          <p className="text-xs text-slate-400">
            Apply active promo codes or credit vouchers during court reservation checkout.
          </p>
        </div>

        <div className="z-10 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-right shrink-0">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Total Available Credit
          </span>
          <span className="text-2xl font-mono font-black text-purple-300">
            ₱{totalAvailableCredits.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setStatusTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            statusTab === 'active'
              ? 'bg-brand-lime text-dark-bg font-black shadow-md shadow-brand-lime/10'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active Vouchers</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusTab === 'active' ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {activeVouchers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('used')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            statusTab === 'used'
              ? 'bg-purple-500 text-white font-black shadow-md shadow-purple-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Used & Expired</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusTab === 'used' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {inactiveVouchers.length}
          </span>
        </button>
      </div>

      {/* Vouchers Grid */}
      {displayedVouchers.length === 0 ? (
        <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-10 text-center space-y-3">
          <Tag className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-lg font-extrabold text-white">
            {statusTab === 'active' ? 'No Active Credit Vouchers' : 'No Used or Expired Vouchers'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {statusTab === 'active'
              ? "You don't have any promotional vouchers or rain-check credits assigned to your account right now."
              : 'Your redemption history will show here once you use your vouchers.'}
          </p>
          {statusTab === 'active' && (
            <button
              type="button"
              onClick={onGoHome}
              className="px-4 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              Book a Court
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedVouchers.map((v) => {
            const isPercentage = v.discountType === 'percentage';
            const valueDisplay = isPercentage ? `${v.discountValue}% OFF` : `₱${v.discountValue} CREDIT`;
            const active = isVoucherActive(v);
            const displayFacility = v.companyName || 'All Partner Venues';

            return (
              <div
                key={v.id}
                className={`glass-panel border rounded-3xl p-5 shadow-xl space-y-4 text-left relative overflow-hidden transition-all ${
                  active
                    ? 'border-purple-500/30 bg-slate-900/80 hover:border-purple-400/60'
                    : 'border-slate-800 bg-slate-950/60 opacity-75'
                }`}
              >
                {/* Card Header: Code & Value */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-0.5">
                      {v.type === 'cancellation_credit'
                        ? 'Cancellation Credit'
                        : v.type === 'rainout_voucher'
                        ? 'Rain Check Credit'
                        : 'Discount Promo'}
                    </span>
                    <h4 className="text-lg font-mono font-black text-white">{v.code}</h4>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black font-mono border ${
                      active
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {valueDisplay}
                  </span>
                </div>

                {/* Scope & Requirements */}
                <div className="text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold truncate">{displayFacility}</span>
                  </div>

                  {/* Requirements Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {v.minSpend && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Min ₱{v.minSpend.toLocaleString()}
                      </span>
                    )}
                    {v.minSlots && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-bold">
                        Min {v.minSlots} hour(s)
                      </span>
                    )}
                    {v.expiryDate && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-mono">
                        Exp: {v.expiryDate}
                      </span>
                    )}
                    {!active && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                        {v.status === 'exhausted' || (v.usedCount >= v.maxUses) ? 'Fully Used' : 'Expired'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(v.code)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  >
                    {copiedCode === v.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {active && (
                    <button
                      type="button"
                      onClick={() => handleApplyAndBook(v.code)}
                      className="px-3 py-1.5 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-brand-lime/10"
                    >
                      <span>Book Court</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
