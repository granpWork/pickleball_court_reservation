import React, { useState } from 'react';
import {
  LifeBuoy,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  User,
  Mail
} from 'lucide-react';
import { sendCustomUserEmail } from '../../../services/emailService';

interface AdminContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
    companyName?: string;
  } | null;
}

export const AdminContactSupportModal: React.FC<AdminContactSupportModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!isOpen) return null;

  const isClientAdmin = user?.role === 'client_admin';
  const isManager = user?.role === 'manager';
  const isAuthorized = isClientAdmin || isManager;

  const [category, setCategory] = useState<'technical' | 'billing' | 'courts' | 'permissions' | 'feature' | 'general'>('technical');
  const [priority, setPriority] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ ticketId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoryLabels: Record<string, string> = {
    technical: '🐛 Technical Bug / App Error',
    billing: '💳 Billing & Service Fee Question',
    courts: '🎾 Court Management & Settings Help',
    permissions: '👥 Staff & User Permissions Assistance',
    feature: '💡 Feature Request / Improvement',
    general: '❓ General Inquiry / Helpdesk',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMsg('Only Client Administrators and Facility Managers are authorized to submit support concerns.');
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Please enter a subject for your support inquiry.');
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      setErrorMsg('Please provide a detailed message (at least 10 characters).');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const ticketId = `TK-${Math.floor(10000 + Math.random() * 90000)}`;
    const senderName = user?.name || 'Facility Admin';
    const senderEmail = user?.email || 'admin@picklepoint.com';
    const facilityName = user?.companyName || 'Registered Facility';

    const emailSubject = `[${priority.toUpperCase()}] [${ticketId}] ${categoryLabels[category]} - ${facilityName}`;
    const emailBody = `
      <div style="background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; padding: 24px; color: #e2e8f0; font-family: sans-serif;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 8px;">
          NEW CLIENT ADMIN SUPPORT TICKET #${ticketId}
        </div>

        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 900; color: #ffffff;">
          ${subject.trim()}
        </h2>

        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <tr>
            <td style="font-size: 12px; color: #cbd5e1; line-height: 1.6;">
              <div>👤 <strong>Sender Name:</strong> ${senderName} (${user?.role || 'Admin'})</div>
              <div>✉️ <strong>Sender Email:</strong> ${senderEmail}</div>
              <div>🏢 <strong>Facility / Company:</strong> ${facilityName}</div>
              <div>🏷️ <strong>Category:</strong> ${categoryLabels[category]}</div>
              <div>⚡ <strong>Priority Level:</strong> <span style="color: ${priority === 'urgent' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#3b82f6'}; font-weight: 800; text-transform: uppercase;">${priority}</span></div>
            </td>
          </tr>
        </table>

        <div style="background-color: #0b132b; border-radius: 12px; border: 1px solid #1e293b; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Inquiry Message Details</div>
          <p style="margin: 0; font-size: 14px; color: #f1f5f9; line-height: 1.6; whitespace: pre-line;">
            ${message.trim().replace(/\n/g, '<br/>')}
          </p>
        </div>

        <div style="font-size: 11px; color: #64748b; text-align: center;">
          Book PickleCourt Admin Support System • System Generated Notification
        </div>
      </div>
    `;

    try {
      await sendCustomUserEmail({
        toEmail: 'admin@picklepoint.com',
        toName: 'Book PickleCourt Super Admin',
        subject: emailSubject,
        message: emailBody,
      });

      // Save ticket to local history log & persistent store for Super Admin inspection
      try {
        const historyStr = localStorage.getItem('picklepoint_support_tickets') || '[]';
        const history = JSON.parse(historyStr);
        history.unshift({
          id: ticketId,
          ticketId,
          senderName,
          senderEmail,
          senderRole: user?.role || 'client_admin',
          facilityName,
          category,
          priority,
          subject: subject.trim(),
          message: message.trim(),
          status: 'new',
          submittedAt: new Date().toISOString(),
        });
        localStorage.setItem('picklepoint_support_tickets', JSON.stringify(history));
      } catch (e) {}

      setSubmitSuccess({ ticketId });
    } catch (err) {
      setErrorMsg('Failed to submit support ticket. Please check network connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-left space-y-5 my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">Contact Customer Support</h3>
              <p className="text-xs text-slate-400">Exclusive Helpdesk for Client Admins & Facility Managers</p>
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

        {/* Authorization Banner */}
        {!isAuthorized ? (
          <div className="p-5 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-red-400">
              <ShieldAlert className="w-5 h-5" /> Restricted Support Access
            </div>
            <p className="leading-relaxed">
              Customer support submission is restricted exclusively to <strong>Client Administrators</strong> and <strong>Facility Managers</strong>.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : submitSuccess ? (
          /* Success Message State */
          <div className="p-6 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-left space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-brand-lime font-black text-lg">
              <CheckCircle2 className="w-7 h-7" /> Support Request Submitted!
            </div>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Your support ticket <strong className="text-brand-lime font-mono text-sm">#{submitSuccess.ticketId}</strong> has been successfully dispatched to the Book PickleCourt helpdesk.
              </p>
              <p className="text-slate-400">
                Our support team will inspect your issue and respond directly to <strong className="text-white">{user?.email}</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(null);
                  setSubject('');
                  setMessage('');
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Main Support Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sender Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-lime flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Sender Name</div>
                  <div className="font-extrabold text-white truncate">{user?.name || 'Admin User'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Contact Email</div>
                  <div className="font-extrabold text-white truncate">{user?.email || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Category & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                  Support Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-brand-lime font-semibold"
                  disabled={isSubmitting}
                >
                  <option value="technical">🐛 Technical Bug / App Error</option>
                  <option value="billing">💳 Billing & Service Fees</option>
                  <option value="courts">🎾 Court Management & Settings</option>
                  <option value="permissions">👥 Staff & User Permissions</option>
                  <option value="feature">💡 Feature Request</option>
                  <option value="general">❓ General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-brand-lime font-semibold"
                  disabled={isSubmitting}
                >
                  <option value="low">🟢 Low (General Question)</option>
                  <option value="medium">🟡 Medium (Normal Priority)</option>
                  <option value="urgent">🔴 Urgent / Critical Issue</option>
                </select>
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Unable to update court operating hours for Court B"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-semibold"
                disabled={isSubmitting}
              />
            </div>

            {/* Message Textarea */}
            <div>
              <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                Describe Your Concern
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe the issue or inquiry in detail, including court name, steps to reproduce, or relevant booking reference numbers..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-semibold leading-relaxed"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button Row */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                    <span>Submitting Inquiry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-dark-bg" />
                    <span>Submit Support Concern</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
