import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Hourglass,
  ExternalLink,
  Share2,
  Check,
  Plus,
} from 'lucide-react';
import type { OpenPlayRegistration } from '../../OpenPlayDetails';

interface PlayerOpenPlayTabProps {
  openPlayRegs: OpenPlayRegistration[];
  onGoHome: () => void;
  onOpenEventDetails: (eventId: string) => void;
}

export const PlayerOpenPlayTab: React.FC<PlayerOpenPlayTabProps> = ({
  openPlayRegs,
  onGoHome,
  onOpenEventDetails,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareLink = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?view=openplay&eventId=${eventId}`;
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {}
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel border border-slate-800 bg-slate-900/60 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-black uppercase tracking-wider">
            Community Sessions
          </span>
          <h3 className="text-xl font-black text-white mt-1">My Open Play Entries</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            View your registered Open Play sessions, waitlist status, and session schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoHome}
          className="px-4 py-2.5 rounded-2xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Join Open Play
        </button>
      </div>

      {/* Regs List */}
      {openPlayRegs.length === 0 ? (
        <div className="glass-panel border border-slate-800 bg-slate-900/40 rounded-3xl p-10 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-lg font-extrabold text-white">No Open Play Registrations</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't registered for any Open Play sessions yet. Join a community lobby to play with local players!
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            Explore Open Play Sessions
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openPlayRegs.map((reg) => {
            const isWaitlist = reg.status === 'waitlisted' || reg.paymentStatus === 'waitlisted';
            const isCancelled = reg.status === 'cancelled';

            return (
              <div
                key={reg.id}
                onClick={() => onOpenEventDetails(reg.eventId)}
                className={`glass-panel border rounded-3xl p-5 shadow-xl text-left space-y-4 relative overflow-hidden transition-all cursor-pointer group hover:scale-[1.01] ${
                  isWaitlist
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : isCancelled
                    ? 'border-slate-800 bg-slate-950/40 opacity-75'
                    : 'border-brand-lime/30 bg-slate-900/90'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-brand-lime shrink-0" />
                      <h4 className="text-base font-extrabold text-white truncate group-hover:text-brand-lime transition-colors">
                        {reg.eventTitle || 'Pickleball Open Play'}
                      </h4>
                    </div>
                    {reg.eventDate && (
                      <span className="text-xs font-mono font-bold text-slate-400 block">
                        📅 Date: {reg.eventDate}
                      </span>
                    )}
                  </div>

                  <div>
                    {isWaitlist ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Hourglass className="w-3 h-3" /> Waitlisted
                      </span>
                    ) : isCancelled ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        Cancelled
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed Roster
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Player Count
                    </span>
                    <span className="font-extrabold text-white block">
                      {reg.playerCount || 1} Spot(s)
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Entry Fee
                    </span>
                    <span className="font-mono font-bold text-brand-lime block">
                      ₱{reg.registrationFee || 0}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ref: {reg.gcashReferenceNumber || reg.id.slice(0, 10)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleShareLink(e, reg.eventId)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Share Event Link"
                    >
                      {copiedId === reg.eventId ? (
                        <Check className="w-3.5 h-3.5 text-brand-lime" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEventDetails(reg.eventId)}
                      className="px-3 py-1.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>View Event</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
