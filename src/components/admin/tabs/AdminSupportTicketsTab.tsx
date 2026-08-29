import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  User,
  Building2,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { type SupportTicket, type AdminUser } from '../adminTypes';
import { sendCustomUserEmail } from '../../../services/emailService';

interface AdminSupportTicketsTabProps {
  user: AdminUser | null;
  isSuperAdmin: boolean;
  formatDateLong?: (dateStr: string) => string;
}

export const AdminSupportTicketsTab: React.FC<AdminSupportTicketsTabProps> = ({
  user,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [priorityFilter] = useState<'all' | 'urgent' | 'medium' | 'low'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [directReplyText, setDirectReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Load tickets from persistent storage
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = () => {
    try {
      const saved = localStorage.getItem('picklepoint_support_tickets');
      if (saved) {
        setTickets(JSON.parse(saved));
      } else {
        // Initial mock tickets for demo if empty
        const defaultTickets: SupportTicket[] = [
          {
            id: 'TK-84920',
            ticketId: 'TK-84920',
            senderName: 'Carlos Rivera',
            senderEmail: 'carlos@manilapickle.com',
            senderRole: 'client_admin',
            facilityName: 'Manila Pickleball Club',
            category: 'technical',
            priority: 'urgent',
            subject: 'Unable to update court operating hours for Court 3',
            message: 'Hello Super Admin team, whenever we try to change Court 3 schedule to closing at 10 PM, the system reverts back to 8 PM. Please assist as we have upcoming evening bookings.',
            status: 'new',
            submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'TK-74102',
            ticketId: 'TK-74102',
            senderName: 'Maria Santos',
            senderEmail: 'maria@bgcpickle.ph',
            senderRole: 'manager',
            facilityName: 'BGC Arena Pickleball',
            category: 'billing',
            priority: 'medium',
            subject: 'Question regarding GCash service fee payouts',
            message: 'Hi! Could you clarify if the 2.5% platform transaction fee is automatically deducted before GCash payout transfer?',
            status: 'in_progress',
            submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          }
        ];
        setTickets(defaultTickets);
        localStorage.setItem('picklepoint_support_tickets', JSON.stringify(defaultTickets));
      }
    } catch (e) {}
  };

  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    try {
      localStorage.setItem('picklepoint_support_tickets', JSON.stringify(updated));
    } catch (e) {}
  };

  const updateTicketStatus = (ticketId: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    const updated = tickets.map((t) => {
      if (t.ticketId === ticketId) {
        return {
          ...t,
          status: newStatus,
          resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : t.resolvedAt,
          resolvedBy: newStatus === 'resolved' ? (user?.name || 'Super Admin') : t.resolvedBy,
        };
      }
      return t;
    });

    saveTickets(updated);
    if (selectedTicket?.ticketId === ticketId) {
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
    }

    setActionSuccessToast(`Ticket ${ticketId} status updated to ${newStatus.toUpperCase()}`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const deleteTicket = (ticketId: string) => {
    if (!window.confirm(`Are you sure you want to delete support ticket ${ticketId}?`)) return;
    const updated = tickets.filter((t) => t.ticketId !== ticketId);
    saveTickets(updated);
    if (selectedTicket?.ticketId === ticketId) setSelectedTicket(null);
    setActionSuccessToast(`Ticket ${ticketId} deleted.`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const saveAdminNotes = (ticketId: string) => {
    const updated = tickets.map((t) => {
      if (t.ticketId === ticketId) {
        return { ...t, adminNotes: adminNotesInput.trim() };
      }
      return t;
    });
    saveTickets(updated);
    if (selectedTicket?.ticketId === ticketId) {
      setSelectedTicket((prev) => prev ? { ...prev, adminNotes: adminNotesInput.trim() } : null);
    }
    setActionSuccessToast('Admin notes saved.');
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const handleSendSuperAdminResponse = async (ticket: SupportTicket) => {
    if (!directReplyText.trim()) {
      alert('Please type an official response message before sending.');
      return;
    }

    setIsSendingReply(true);

    const emailSubject = `[RESPONSE] [${ticket.ticketId}] Re: ${ticket.subject}`;
    const emailBody = `
      <div style="background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; padding: 24px; color: #e2e8f0; font-family: sans-serif;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 8px;">
          BOOK PICKLECOURT HELPDESK RESPONSE • TICKET #${ticket.ticketId}
        </div>

        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 900; color: #ffffff;">
          Re: ${ticket.subject}
        </h2>

        <div style="background-color: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          Hi <strong>${ticket.senderName}</strong>,<br/><br/>
          Our Super Admin helpdesk team has processed your customer support inquiry regarding <strong>${ticket.facilityName || 'your facility'}</strong>.
        </div>

        <div style="background-color: #0b132b; border-left: 4px solid #a6e224; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a6e224; margin-bottom: 8px;">Super Admin Official Response</div>
          <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.6; whitespace: pre-line;">
            ${directReplyText.trim().replace(/\n/g, '<br/>')}
          </p>
        </div>

        <div style="background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 12px; margin-bottom: 16px; font-size: 11px; color: #94a3b8;">
          <strong>Original Ticket Concern:</strong><br/>
          <em>"${ticket.message}"</em>
        </div>

        <div style="font-size: 11px; color: #64748b; text-align: center;">
          Book PickleCourt Admin Support System • System Generated Notification
        </div>
      </div>
    `;

    try {
      await sendCustomUserEmail({
        toEmail: ticket.senderEmail,
        toName: ticket.senderName,
        subject: emailSubject,
        message: emailBody,
      });

      const updated = tickets.map((t) => {
        if (t.ticketId === ticket.ticketId) {
          return {
            ...t,
            status: 'resolved' as const,
            adminNotes: directReplyText.trim(),
            resolvedAt: new Date().toISOString(),
            resolvedBy: user?.name || 'Super Admin',
          };
        }
        return t;
      });

      saveTickets(updated);
      setSelectedTicket((prev) => (prev ? { ...prev, status: 'resolved', adminNotes: directReplyText.trim() } : null));
      setDirectReplyText('');
      setActionSuccessToast(`Response sent to ${ticket.senderEmail} and ticket marked RESOLVED!`);
      setTimeout(() => setActionSuccessToast(null), 5000);
    } catch (err) {
      alert('Failed to send response email. Please check network connection and try again.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    technical: '🐛 Technical Bug',
    billing: '💳 Billing & Service Fee',
    courts: '🎾 Court Management',
    permissions: '👥 Staff & Permissions',
    feature: '💡 Feature Request',
    general: '❓ General Inquiry',
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketId.toLowerCase().includes(q) ||
      t.senderName.toLowerCase().includes(q) ||
      t.senderEmail.toLowerCase().includes(q) ||
      (t.facilityName && t.facilityName.toLowerCase().includes(q)) ||
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q)
    );
  });

  // KPI Metrics
  const totalCount = tickets.length;
  const newCount = tickets.filter((t) => t.status === 'new').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="animate-fade-in space-y-6 text-left">
      {/* Toast Alert */}
      {actionSuccessToast && (
        <div className="p-4 rounded-2xl bg-brand-lime/15 border border-brand-lime/40 text-brand-lime text-xs font-bold flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-lime" />
            <span>{actionSuccessToast}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dark-border/40">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-brand-lime" />
            <span>Client Support Inquiries & Helpdesk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Super Admin inbox for managing support concerns submitted by Client Administrators & Facility Managers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-extrabold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>{newCount} New Inquiry Ticket(s)</span>
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total Tickets</div>
          <div className="text-xl sm:text-2xl font-black text-white">{totalCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-red-900/30 bg-red-950/10 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-red-400 tracking-wider">New / Unresolved</div>
          <div className="text-xl sm:text-2xl font-black text-red-400">{newCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-900/30 bg-amber-950/10 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-amber-300 tracking-wider">In Progress</div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">{inProgressCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-900/30 bg-emerald-950/10 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">Resolved</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{resolvedCount}</div>
        </div>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID, sender name, facility, or subject..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-lime"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Tickets', count: totalCount },
              { id: 'new', label: '🔴 New', count: newCount },
              { id: 'in_progress', label: '🟡 In Progress', count: inProgressCount },
              { id: 'resolved', label: '🟢 Resolved', count: resolvedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800 space-y-3">
            <LifeBuoy className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-300">No Support Tickets Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no customer support tickets matching your active filters.
            </p>
          </div>
        ) : (
          filteredTickets.map((t) => (
            <div
              key={t.ticketId}
              onClick={() => {
                setSelectedTicket(t);
                setAdminNotesInput(t.adminNotes || '');
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer text-left space-y-3 shadow-md hover:border-brand-lime/60 ${
                t.status === 'new'
                  ? 'bg-slate-900/90 border-red-500/40'
                  : t.status === 'in_progress'
                  ? 'bg-slate-900/70 border-amber-500/40'
                  : 'bg-slate-950/50 border-slate-800 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-brand-lime font-mono text-xs font-black">
                    #{t.ticketId}
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    t.status === 'new'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : t.status === 'in_progress'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {t.status === 'new' ? '🔴 New Inquiry' : t.status === 'in_progress' ? '🟡 In Progress' : '🟢 Resolved'}
                  </span>

                  <span className="text-[11px] font-bold text-slate-400">
                    {categoryLabels[t.category] || t.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(t.submittedAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white leading-tight">{t.subject}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {t.message}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-300 border-t border-slate-800/60">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-lime" />
                    <span className="font-bold text-white">{t.senderName}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">({t.senderRole || 'Client Admin'})</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.senderEmail}</span>
                  </div>

                  {t.facilityName && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.facilityName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTicketStatus(t.ticketId, t.status === 'resolved' ? 'in_progress' : 'resolved');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      t.status === 'resolved'
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {t.status === 'resolved' ? 'Re-open Ticket' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Details & Reply Lightbox Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl text-left space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-brand-lime font-mono text-sm font-black">
                  #{selectedTicket.ticketId}
                </span>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">Support Ticket Details</h3>
                  <p className="text-xs text-slate-400">Submitted by {selectedTicket.senderName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Metadata Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Client Admin / Manager</div>
                <div className="font-extrabold text-white text-sm mt-0.5">{selectedTicket.senderName}</div>
                <div className="text-slate-400 mt-0.5">{selectedTicket.senderEmail}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Facility / Company</div>
                <div className="font-extrabold text-white text-sm mt-0.5">{selectedTicket.facilityName || 'N/A'}</div>
                <div className="text-slate-400 mt-0.5">Role: <span className="uppercase text-brand-lime font-bold">{selectedTicket.senderRole || 'Client Admin'}</span></div>
              </div>
            </div>

            {/* Category & Status Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-slate-400">Category: </span>
                <span className="font-extrabold text-white">{categoryLabels[selectedTicket.category]}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status: </span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.ticketId, e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none focus:border-brand-lime cursor-pointer"
                >
                  <option value="new">🔴 New Inquiry</option>
                  <option value="in_progress">🟡 In Progress</option>
                  <option value="resolved">🟢 Resolved</option>
                </select>
              </div>
            </div>

            {/* Inquiry Message Text */}
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-white">{selectedTicket.subject}</h4>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {selectedTicket.message}
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-extrabold uppercase tracking-wider">
                Internal Super Admin Resolution Notes
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  placeholder="e.g. Issue verified on Court 3 schedule. Re-indexed timetable."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-brand-lime font-semibold"
                />
                <button
                  type="button"
                  onClick={() => saveAdminNotes(selectedTicket.ticketId)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold transition-all cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </div>

            {/* Direct Official Email Response Form */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
              <label className="block text-slate-300 font-extrabold uppercase tracking-wider flex items-center justify-between">
                <span>Send Official Super Admin Response Email</span>
                <span className="text-[10px] text-slate-400 font-bold">Recipient: {selectedTicket.senderEmail}</span>
              </label>
              <textarea
                rows={3}
                value={directReplyText}
                onChange={(e) => setDirectReplyText(e.target.value)}
                placeholder="Type your official response to the client admin here (e.g. We have resolved the Court 3 operating hours issue on your account)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-semibold leading-relaxed"
                disabled={isSendingReply}
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleSendSuperAdminResponse(selectedTicket)}
                  disabled={isSendingReply || !directReplyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingReply ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                      <span>Dispatching Response...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-dark-bg" />
                      <span>Send Official Reply & Resolve Ticket</span>
                    </>
                  )}
                </button>

                <a
                  href={`mailto:${selectedTicket.senderEmail}?subject=Re: [${selectedTicket.ticketId}] ${selectedTicket.subject}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-slate-300 text-[11px] underline font-medium"
                >
                  Open External Mail App ↗
                </a>
              </div>
            </div>

            {/* Modal Bottom Action Row */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => deleteTicket(selectedTicket.ticketId)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-900 transition-all text-xs font-bold cursor-pointer"
              >
                Delete Ticket
              </button>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all text-xs font-bold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
