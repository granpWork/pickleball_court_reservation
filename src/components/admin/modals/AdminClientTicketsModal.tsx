import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  X,
  Clock,
  ChevronRight,
  ShieldCheck,
  Search,
  MessageSquare
} from 'lucide-react';
import { type SupportTicket, type AdminUser } from '../adminTypes';

interface AdminClientTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onOpenSubmitModal: () => void;
}

export const AdminClientTicketsModal: React.FC<AdminClientTicketsModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenSubmitModal,
}) => {
  if (!isOpen) return null;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUserEmail = user?.email?.toLowerCase() || '';
  const userCompanyName = (user as any)?.companyName || '';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('picklepoint_support_tickets');
      if (saved) {
        const all: SupportTicket[] = JSON.parse(saved);
        const userTickets = all.filter(
          (t) =>
            t.senderEmail.toLowerCase() === currentUserEmail ||
            (userCompanyName && t.facilityName && t.facilityName.toLowerCase() === userCompanyName.toLowerCase())
        );
        setTickets(userTickets);
      }
    } catch (e) {}
  }, [currentUserEmail, userCompanyName]);

  const categoryLabels: Record<string, string> = {
    technical: '🐛 Technical Bug / App Error',
    billing: '💳 Billing & Service Fee Question',
    courts: '🎾 Court Management & Settings Help',
    permissions: '👥 Staff & User Permissions Assistance',
    feature: '💡 Feature Request / Improvement',
    general: '❓ General Inquiry / Helpdesk',
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketId.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl text-left space-y-5 my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">My Support Tickets & History</h3>
              <p className="text-xs text-slate-400">View submitted support concerns & official Super Admin responses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets by ID or subject..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-lime"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSubmitModal();
            }}
            className="px-4 py-2 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <LifeBuoy className="w-4 h-4 text-dark-bg" />
            <span>Submit New Support Ticket</span>
          </button>
        </div>

        {/* Tickets List View */}
        {selectedTicket ? (
          /* Ticket Detail View */
          <div className="space-y-4 animate-fade-in text-xs">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="text-brand-lime font-bold hover:underline flex items-center gap-1 cursor-pointer mb-2"
            >
              ← Back to All My Tickets
            </button>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-brand-lime font-mono text-xs font-black">
                  #{selectedTicket.ticketId}
                </span>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  selectedTicket.status === 'new'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : selectedTicket.status === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedTicket.status === 'new' ? '🔴 Pending Review' : selectedTicket.status === 'in_progress' ? '🟡 In Progress' : '🟢 Resolved'}
                </span>
              </div>

              <h4 className="text-base font-extrabold text-white pt-1">{selectedTicket.subject}</h4>
              <div className="text-slate-400 text-[11px] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Submitted on {new Date(selectedTicket.submittedAt).toLocaleString()}</span>
                <span>• Category: <strong className="text-slate-300">{categoryLabels[selectedTicket.category]}</strong></span>
              </div>
            </div>

            {/* Original Message */}
            <div className="space-y-1.5">
              <div className="text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                Your Original Support Concern
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-line">
                {selectedTicket.message}
              </div>
            </div>

            {/* Official Super Admin Response */}
            <div className="space-y-1.5 pt-2">
              <div className="text-brand-lime font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-lime" />
                <span>Official Super Admin Response</span>
              </div>

              {selectedTicket.adminNotes ? (
                <div className="p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-white leading-relaxed space-y-2">
                  <div className="font-semibold text-xs whitespace-pre-line">
                    {selectedTicket.adminNotes}
                  </div>
                  {selectedTicket.resolvedBy && (
                    <div className="text-[10px] text-slate-400 border-t border-brand-lime/20 pt-2 flex items-center justify-between">
                      <span>Responded by: <strong className="text-brand-lime">{selectedTicket.resolvedBy}</strong></span>
                      {selectedTicket.resolvedAt && <span>{new Date(selectedTicket.resolvedAt).toLocaleString()}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs italic flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Our Super Admin support desk has received your ticket and is currently inspecting your concern. You will also receive an email notification when responded to.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tickets List */
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="p-10 text-center glass-panel rounded-2xl border border-slate-800 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-extrabold text-slate-300">No Support Tickets Submitted Yet</div>
                <p className="text-xs text-slate-500">
                  Have a technical question or billing inquiry? Click <strong className="text-brand-lime">Submit New Support Ticket</strong> to contact the Super Admin team.
                </p>
              </div>
            ) : (
              filteredTickets.map((t) => (
                <div
                  key={t.ticketId}
                  onClick={() => setSelectedTicket(t)}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-brand-lime/60 transition-all cursor-pointer text-left space-y-2 group shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-brand-lime font-mono text-[11px] font-black">
                        #{t.ticketId}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        t.status === 'new'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : t.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {t.status === 'new' ? '🔴 Pending' : t.status === 'in_progress' ? '🟡 In Progress' : '🟢 Resolved'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-semibold">
                      {new Date(t.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-white group-hover:text-brand-lime transition-colors truncate">
                        {t.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.message}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-lime group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer Close */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
