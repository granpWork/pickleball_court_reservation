import React, { useState } from 'react';
import { QrCode, ShieldCheck, Copy, Check } from 'lucide-react';

interface Booking {
  id: string;
  bookingId?: string;
  courtName: string;
  ownerCompanyName?: string;
  date: string;
  slots: string[];
  totalCost: number;
  status?: string;
  paymentStatus?: string;
}

interface PlayerPassesTabProps {
  bookings: Booking[];
  user: { name?: string; email: string } | null;
  onGoHome: () => void;
}

export const PlayerPassesTab: React.FC<PlayerPassesTabProps> = ({
  bookings,
  user,
  onGoHome,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeBookings = bookings.filter(
    (b) => b.status !== 'cancelled' && b.paymentStatus !== 'refunded'
  );

  const userName = user?.name || user?.email?.split('@')[0] || 'Player';

  const handleCopyPassCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedId(code);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {}
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="glass-panel border border-slate-800 bg-slate-900/60 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
            Digital Venue Passbook
          </span>
          <h3 className="text-xl font-black text-white mt-1">QR Entry Match Passes</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Present these digital QR passes at court entrances or staff check-in terminals.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400">
          {activeBookings.length} Active Pass(es)
        </div>
      </div>

      {activeBookings.length === 0 ? (
        <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-10 text-center space-y-3">
          <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-lg font-extrabold text-white">No Active QR Passes Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Reserve a court to generate your digital match pass & entry QR code.
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            Reserve Court
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeBookings.map((b) => {
            const passCode = b.bookingId || b.id;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
              passCode
            )}&color=a6e224&bgcolor=090d16`;

            return (
              <div
                key={b.id}
                className="glass-panel border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-[#07090e] rounded-3xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden group hover:border-emerald-400/60 transition-all"
              >
                {/* Pass Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="text-left">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                      OFFICIAL MATCH PASS
                    </span>
                    <h4 className="text-base font-extrabold text-white truncate max-w-[180px]">
                      {b.courtName}
                    </h4>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>

                {/* QR Code Container */}
                <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 inline-block mx-auto shadow-inner relative group/qr">
                  <img
                    src={qrApiUrl}
                    alt={`QR Pass for ${b.courtName}`}
                    className="w-44 h-44 object-contain rounded-xl mx-auto"
                  />
                  <div className="mt-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    SCAN AT ENTRANCE
                  </div>
                </div>

                {/* Pass Details */}
                <div className="space-y-1.5 text-xs text-left bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Holder:</span>
                    <span className="font-bold text-white truncate max-w-[120px]">{userName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Date:</span>
                    <span className="font-bold text-white">{b.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Hours:</span>
                    <span className="font-mono font-bold text-brand-lime truncate max-w-[120px]">{b.slots?.join(', ')}</span>
                  </div>
                </div>

                {/* Pass Code & Copy Action */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      PASS CODE
                    </span>
                    <span className="text-xs font-mono font-black text-slate-200 truncate block max-w-[130px]">
                      {passCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyPassCode(passCode)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copiedId === passCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-brand-lime" />
                        <span className="text-brand-lime">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
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
