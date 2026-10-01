import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import type { Voucher } from '../../AdminDashboard';

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

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch (e) {}
  };

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

      {/* Vouchers Grid */}
      {vouchers.length === 0 ? (
        <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-10 text-center space-y-3">
          <Tag className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-lg font-extrabold text-white">No Active Credit Vouchers</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any promotional vouchers or rain-check credits assigned to your account right now.
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            Book a Court
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.map((v) => {
            const isPercentage = v.discountType === 'percentage';
            const valueDisplay = isPercentage ? `${v.discountValue}% OFF` : `₱${v.discountValue} CREDIT`;

            return (
              <div
                key={v.id}
                className="glass-panel border border-purple-500/30 bg-slate-900/80 rounded-3xl p-5 shadow-xl space-y-4 text-left relative overflow-hidden group hover:border-purple-400/60 transition-all"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-0.5">
                      {(v.discountType as string) === 'percentage' ? 'Discount Promo' : 'Rain Check Credit'}
                    </span>
                    <h4 className="text-lg font-mono font-black text-white">
                      {v.code}
                    </h4>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black font-mono">
                    {valueDisplay}
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <div>Scope: <span className="font-bold text-slate-200">{(v as any).ownerCompanyName || 'All Partner Venues'}</span></div>
                  {v.expiryDate && <div>Expires: <span className="font-mono text-slate-300">{v.expiryDate}</span></div>}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Copy Code at Checkout
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(v.code)}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedCode === v.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-brand-lime" />
                        <span className="text-brand-lime">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
