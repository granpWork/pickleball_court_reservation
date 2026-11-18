import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  Calendar,
  Clock,
  Building2,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import type { OpenPlayEvent } from '../../OpenPlayDetails';
import type { RosterAttendee } from '../tabs/AdminOpenPlayEventDetails';

interface AdminMoveOpenPlayPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: RosterAttendee | null;
  sourceEvent: OpenPlayEvent | null;
  allEvents: OpenPlayEvent[];
  allRegistrations?: any[];
  onConfirmMove: (params: {
    attendee: RosterAttendee;
    sourceEvent: OpenPlayEvent;
    targetEvent: OpenPlayEvent;
    adminNotes: string;
  }) => Promise<void>;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
}

export const AdminMoveOpenPlayPlayerModal: React.FC<AdminMoveOpenPlayPlayerModalProps> = ({
  isOpen,
  onClose,
  attendee,
  sourceEvent,
  allEvents = [],
  allRegistrations = [],
  onConfirmMove,
  formatEventDateLong,
  formatTime12h,
}) => {
  const [selectedTargetEventId, setSelectedTargetEventId] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !attendee || !sourceEvent) return null;

  // Filter available candidate target events (exclude source event & draft/cancelled events)
  const candidateEvents = allEvents.filter((ev) => {
    if (ev.id === sourceEvent.id) return false;
    if (ev.status === 'cancelled' || ev.status === 'draft') return false;
    return true;
  });

  const selectedTargetEvent = candidateEvents.find((e) => e.id === selectedTargetEventId) || null;

  // Compute spot availability for candidate events
  const getEventCapacityInfo = (ev: OpenPlayEvent) => {
    const activeRegs = allRegistrations.filter(
      (r) => (r.eventId === ev.id || (r as any).openPlayEventId === ev.id) && r.status !== 'cancelled'
    );
    const totalHeadcount = activeRegs.reduce(
      (sum, r) => sum + (r.playerCount || 1 + (r.guestCount || 0)),
      0
    );
    const maxCapacity = ev.maxParticipants || 16;
    const spotsRemaining = Math.max(0, maxCapacity - totalHeadcount);
    return { currentCount: totalHeadcount, maxCapacity, spotsRemaining, isFull: spotsRemaining <= 0 };
  };

  const targetEventCapacity = selectedTargetEvent ? getEventCapacityInfo(selectedTargetEvent) : null;

  const handleExecuteMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetEvent) {
      setErrorMsg('Please select a destination Open Play event session.');
      return;
    }

    if (targetEventCapacity && targetEventCapacity.isFull) {
      if (!window.confirm(`Notice: "${selectedTargetEvent.title}" has reached its maximum capacity (${targetEventCapacity.maxCapacity} players). Do you still wish to move ${attendee.name} as an admin override?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const generatedNote = adminNotes.trim()
        ? adminNotes.trim()
        : `Moved from "${sourceEvent.title}" to "${selectedTargetEvent.title}" by Admin on ${new Date().toLocaleDateString()}`;

      await onConfirmMove({
        attendee,
        sourceEvent,
        targetEvent: selectedTargetEvent,
        adminNotes: generatedNote,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to move player to destination event:', err);
      setErrorMsg(err?.message || 'Failed to move player. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full text-left relative shadow-2xl bg-dark-bg max-h-[96vh] sm:max-h-[90vh] flex flex-col animate-scale-up">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-md pb-3 border-b border-slate-800/80 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 pt-3 flex-shrink-0">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                  <span>Move Player Between Sessions</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Transfer <strong className="text-white">{attendee.name}</strong> from current roster to another session
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE MODAL BODY */}
        <form onSubmit={handleExecuteMove} className="space-y-4 sm:space-y-5 flex-1 overflow-y-auto overscroll-contain pr-1 sm:pr-2 custom-scrollbar p-3.5 sm:p-6 flex flex-col">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Player Profile Info Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {attendee.photoUrl ? (
                <img
                  src={attendee.photoUrl}
                  alt={attendee.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-purple-500/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-sm shrink-0">
                  {attendee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{attendee.name}</span>
                  {attendee.type === 'guest' && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase">
                      Guest
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {attendee.email || 'No email on record'} {attendee.phone ? `• ${attendee.phone}` : ''}
                </div>
              </div>
            </div>

            {(attendee.adminDuprId || attendee.duprId) && (
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold uppercase text-purple-400">DUPR Account</div>
                <div className="text-xs font-mono font-bold text-slate-200">
                  {attendee.adminDuprId || attendee.duprId}
                  {attendee.adminDuprRating || attendee.duprRating ? ` (${attendee.adminDuprRating || attendee.duprRating})` : ''}
                </div>
              </div>
            )}
          </div>

          {/* 2. Source Event Summary */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Session (Source)
            </label>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm truncate">{sourceEvent.title}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase">
                  {sourceEvent.category || 'Open Play'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 text-[11px] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-lime" />
                  <span>{formatEventDateLong ? formatEventDateLong(sourceEvent.eventDate) : sourceEvent.eventDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {formatTime12h
                      ? `${formatTime12h(sourceEvent.startTime)} - ${formatTime12h(sourceEvent.endTime)}`
                      : `${sourceEvent.startTime} - ${sourceEvent.endTime}`}
                  </span>
                </div>
                {sourceEvent.courtNames && sourceEvent.courtNames.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{sourceEvent.courtNames.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Destination Event Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Select Destination Session (Target) *</span>
              <span className="text-[10px] text-purple-400 normal-case">
                {candidateEvents.length} other published {candidateEvents.length === 1 ? 'session' : 'sessions'} available
              </span>
            </label>

            {candidateEvents.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                No other published Open Play sessions found. Please create or publish another event first before moving players.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {candidateEvents.map((ev) => {
                  const isSelected = selectedTargetEventId === ev.id;
                  const capInfo = getEventCapacityInfo(ev);
                  const isTargetDupr = ev.isDupr;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedTargetEventId(ev.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                        isSelected
                          ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                            {ev.title}
                          </span>
                          {isTargetDupr ? (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black uppercase">
                              DUPR
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-bold uppercase">
                              {ev.category || 'Open Play'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-brand-lime" />
                            {ev.eventDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            {formatTime12h ? `${formatTime12h(ev.startTime)} - ${formatTime12h(ev.endTime)}` : `${ev.startTime} - ${ev.endTime}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 pl-2">
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold block ${
                              capInfo.isFull
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {capInfo.isFull ? 'Full' : `${capInfo.spotsRemaining} Left`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                            {capInfo.currentCount}/{capInfo.maxCapacity}
                          </span>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-purple-500 border-purple-400 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Payment & Transfer Audit Notes */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Transfer Details & Audit Log</span>
              <span className="text-[10px] text-brand-lime normal-case">Preserves Paid Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Status</span>
                <div className="font-extrabold text-white flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    attendee.paymentStatus === 'paid' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className="capitalize">{attendee.paymentStatus.replace('_', ' ')}</span>
                  {attendee.gcashReferenceNumber && (
                    <span className="text-[10px] font-mono text-slate-400 ml-auto">
                      Ref: {attendee.gcashReferenceNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Fee Difference</span>
                <div className="font-extrabold text-slate-300">
                  {selectedTargetEvent ? (
                    sourceEvent.registrationFee === selectedTargetEvent.registrationFee ? (
                      <span className="text-emerald-400 font-bold">Same Fee (₱{selectedTargetEvent.registrationFee || 0})</span>
                    ) : (
                      <span>
                        ₱{sourceEvent.registrationFee || 0} → <strong className="text-brand-lime">₱{selectedTargetEvent.registrationFee || 0}</strong>
                      </span>
                    )
                  ) : (
                    <span className="text-slate-500">Select target event</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Admin Note / Audit Reason (Optional)
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={`e.g. Player requested transfer from ${sourceEvent.title} to ${selectedTargetEvent?.title || 'destination'}`}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </form>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-20 bg-dark-bg/95 backdrop-blur-md pt-3 pb-2 border-t border-slate-800/80 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 flex-shrink-0">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteMove}
              disabled={isSubmitting || !selectedTargetEvent || candidateEvents.length === 0}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isSubmitting || !selectedTargetEvent || candidateEvents.length === 0
                  ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
                  : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-purple-600/20 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Transferring Player...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 text-white" />
                  <span>Confirm Move Player</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
