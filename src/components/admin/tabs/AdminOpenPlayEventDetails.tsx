import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Copy,
  Edit2,
  Trash2,
  Download,
  UserCheck,
  LayoutGrid,
  List,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Phone,
  Check,
  Share2,
  Repeat,
  Building2,
  CreditCard,
  FileCode,
  QrCode,
  ExternalLink,
  DollarSign,
  FileText,
  X,
  AlertTriangle,
  Send,
  Loader2,
  Ban,
  Maximize2,
  Bell,
  Clock,
  UserPlus,
} from 'lucide-react';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { type OpenPlayRegistrationItem } from './AdminOpenPlayTab';
import {
  sendOpenPlayEventCancellationEmail,
  sendOpenPlayGameReminderEmail
} from '../../../services/emailService';
import {
  calculateTargetSendTime,
  getScheduledReminderForEvent,
  scheduleReminderForEvent,
  cancelScheduledReminderForEvent,
  type ScheduledReminderJob
} from '../../../utils/reminderScheduler';

interface AdminOpenPlayEventDetailsProps {
  event: OpenPlayEvent;
  registrations: OpenPlayRegistrationItem[];
  onBack: () => void;
  onOpenEditModal: (event: OpenPlayEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCopyShareLink: (eventId: string) => void;
  onDuplicateEvent?: (event: OpenPlayEvent) => void;
  onToggleStatus?: (event: OpenPlayEvent) => void;
  onCancelEvent?: (eventId: string, reason: string, notifyEmails: boolean) => void;
  onExportRoster?: (event: OpenPlayEvent) => void;
  onViewReceipt?: (receiptUrl: string) => void;
  onOpenManualBookingModal?: (event: OpenPlayEvent) => void;
  onOpenQrModal: (event: OpenPlayEvent) => void;
  onOpenJsonModal: (event: OpenPlayEvent) => void;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (time24h: string) => string;
}

export interface RosterAttendee {
  id: string;
  registrationId: string;
  type: 'primary' | 'guest';
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  hostName?: string;
  guestIndex?: number;
  paymentStatus: string;
  status: string;
  gcashReferenceNumber?: string;
  receiptImageUrl?: string;
  createdAt?: string;
}

export const AdminOpenPlayEventDetails: React.FC<AdminOpenPlayEventDetailsProps> = ({
  event,
  registrations,
  onBack,
  onOpenEditModal,
  onDeleteEvent,
  onCopyShareLink,
  onDuplicateEvent,
  onToggleStatus,
  onCancelEvent,
  onExportRoster,
  onViewReceipt,
  onOpenManualBookingModal,
  onOpenQrModal,
  onOpenJsonModal,
  formatEventDateLong = (d) => d,
  formatTime12h = (t) => t,
}) => {
  // Roster View state
  const [rosterViewMode, setRosterViewMode] = useState<'cards' | 'list' | 'table'>('cards');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterFilterRole, setRosterFilterRole] = useState<'all' | 'primary' | 'guest'>('all');
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  // Poster Lightbox Modal State
  const [isPosterModalOpen, setIsPosterModalOpen] = useState<boolean>(false);

  // Flexible Game Start Reminder Modal & Dispatch State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [isDispatchingReminders, setIsDispatchingReminders] = useState<boolean>(false);
  const [activeScheduledJob, setActiveScheduledJob] = useState<ScheduledReminderJob | undefined>(() =>
    getScheduledReminderForEvent(event.id)
  );

  // Cancellation Modal & Email Dispatch State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelPresetReason, setCancelPresetReason] = useState<string>('Inclement Weather / Rainout');
  const [cancelCustomNote, setCancelCustomNote] = useState<string>('');
  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(true);
  const [customRefundNotice, setCustomRefundNotice] = useState<string>('');
  const [isDispatchingEmails, setIsDispatchingEmails] = useState<boolean>(false);
  const [dispatchStatusToast, setDispatchStatusToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Persistent Attendance Map from localStorage
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleAttendance = (attendeeId: string) => {
    setAttendanceMap((prev) => {
      const updated = { ...prev, [attendeeId]: !prev[attendeeId] };
      try {
        localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const markAllAttendeesPresent = (attendeeIds: string[]) => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      attendeeIds.forEach((id) => {
        updated[id] = true;
      });
      try {
        localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearAttendeesAttendance = (attendeeIds: string[]) => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      attendeeIds.forEach((id) => {
        updated[id] = false;
      });
      try {
        localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleCopyLink = () => {
    onCopyShareLink(event.id);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 3000);
  };

  const handleOpenPublicPage = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    window.open(`${origin}/?openplay=${event.id}`, '_blank', 'noopener,noreferrer');
  };

  const isEventExpired = (() => {
    try {
      if (!event.eventDate) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      if (event.eventDate < todayStr) return true;
      if (event.eventDate > todayStr) return false;

      if (event.endTime) {
        const now = new Date();
        const timeParts = event.endTime.trim().split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const eventEndTime = new Date();
          eventEndTime.setHours(hours, minutes, 0, 0);
          return now > eventEndTime;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  })();

  // Filter registrations specifically for this event
  const eventRegs = registrations.filter((r) => r.eventId === event.id);

  // Build complete attendees list expanding primary players and guests
  const allAttendees: RosterAttendee[] = [];
  eventRegs.forEach((reg) => {
    const primaryName = reg.playerName || reg.userName || 'Player';
    const primaryEmail = reg.playerEmail || reg.userEmail || '';
    const primaryPhone = reg.playerPhone || reg.userPhone || '';
    const primaryPhoto = (reg as any).photoUrl || (reg as any).userPhoto;
    const gcashRef = reg.gcashReferenceNumber || '';
    const paymentStatus = reg.paymentStatus || 'pending';
    const status = reg.status || 'pending';
    const isAddGuestOnly = reg.isAddGuestOnly === true || (reg as any).isAddGuestOnly === true;

    if (!isAddGuestOnly) {
      allAttendees.push({
        id: `${reg.id}-primary`,
        registrationId: reg.id,
        type: 'primary',
        name: primaryName,
        email: primaryEmail,
        phone: primaryPhone,
        photoUrl: primaryPhoto,
        paymentStatus,
        status,
        gcashReferenceNumber: gcashRef,
        receiptImageUrl: reg.receiptImageUrl,
        createdAt: reg.createdAt,
      });
    }

    const spots = reg.playerCount || 1;
    const numGuests = isAddGuestOnly
      ? Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots || 1)
      : Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots > 1 ? spots - 1 : 0);
    const hostName = reg.primaryPlayerName || primaryName;

    for (let gIdx = 0; gIdx < numGuests; gIdx++) {
      const gName = reg.guests?.[gIdx]?.name || reg.guestNames?.[gIdx] || `Guest #${gIdx + 1} (${hostName})`;
      const gEmail = reg.guests?.[gIdx]?.email || reg.guestEmails?.[gIdx] || `Shared (${reg.primaryPlayerEmail || primaryEmail})`;
      const gPhoto = (reg.guests?.[gIdx] as any)?.photoUrl || primaryPhoto;
      allAttendees.push({
        id: `${reg.id}-guest-${gIdx}`,
        registrationId: reg.id,
        type: 'guest',
        name: gName,
        email: gEmail,
        phone: primaryPhone,
        photoUrl: gPhoto,
        hostName: hostName,
        guestIndex: gIdx + 1,
        paymentStatus,
        status,
        gcashReferenceNumber: gcashRef,
        receiptImageUrl: reg.receiptImageUrl,
        createdAt: reg.createdAt,
      });
    }
  });

  const filteredAttendees = allAttendees.filter((att) => {
    if (rosterFilterRole === 'primary' && att.type !== 'primary') return false;
    if (rosterFilterRole === 'guest' && att.type !== 'guest') return false;
    if (!rosterSearchQuery.trim()) return true;
    const q = rosterSearchQuery.toLowerCase();
    return (
      att.name.toLowerCase().includes(q) ||
      att.email.toLowerCase().includes(q) ||
      att.phone.toLowerCase().includes(q) ||
      (att.hostName && att.hostName.toLowerCase().includes(q)) ||
      (att.gcashReferenceNumber && att.gcashReferenceNumber.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const maxCapacity = event.maxParticipants || 16;
  const totalHeadcount = allAttendees.length;
  const primaryCount = allAttendees.filter((a) => a.type === 'primary').length;
  const guestCount = allAttendees.filter((a) => a.type === 'guest').length;
  const approvedHeadcount = allAttendees.filter((a) => a.status === 'approved' || a.paymentStatus === 'paid').length;
  const pendingHeadcount = allAttendees.filter((a) => a.paymentStatus === 'pending_verification' || a.status === 'pending').length;
  const attendedCount = allAttendees.filter((a) => attendanceMap[a.id]).length;
  const attendancePercent = totalHeadcount > 0 ? Math.round((attendedCount / totalHeadcount) * 100) : 0;
  const feePerPlayer = event.registrationFee || 0;
  const totalGrossRevenue = approvedHeadcount * feePerPlayer;

  const handleConfirmCancellation = async () => {
    const finalReason = cancelCustomNote.trim()
      ? `${cancelPresetReason} - ${cancelCustomNote.trim()}`
      : cancelPresetReason;

    setIsDispatchingEmails(true);
    let sentCount = 0;
    let failCount = 0;

    if (sendEmailNotification && allAttendees.length > 0) {
      const recipients = allAttendees.filter(
        (att) => att.email && att.email.includes('@') && !att.email.toLowerCase().startsWith('shared (')
      );

      setDispatchStatusToast({
        type: 'info',
        message: `Dispatching cancellation emails to ${recipients.length} registered participant(s)...`,
      });

      for (const recipient of recipients) {
        try {
          const res = await sendOpenPlayEventCancellationEmail({
            toEmail: recipient.email,
            toName: recipient.name,
            eventTitle: event.title,
            eventDate: formatEventDateLong(event.eventDate),
            eventTime: `${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}`,
            location: event.location,
            cancellationReason: finalReason,
            refundNotice: customRefundNotice.trim() || undefined,
            companyName: event.category || 'Book Picklecourt Host',
            hostPhone: event.hostPhone,
          });

          if (res.success) {
            sentCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
        }
      }
    }

    setIsDispatchingEmails(false);
    setIsCancelModalOpen(false);

    if (onCancelEvent) {
      onCancelEvent(event.id, finalReason, sendEmailNotification);
    } else if (onToggleStatus) {
      onToggleStatus({ ...event, status: 'cancelled' });
    }

    setDispatchStatusToast({
      type: 'success',
      message: sendEmailNotification
        ? `Event cancelled! ${sentCount} notification email(s) successfully dispatched.`
        : `Event marked as cancelled.`,
    });

    setTimeout(() => setDispatchStatusToast(null), 6000);
  };

  const handleConfirmSendReminders = async (mode: 'now' | 'schedule' = 'now') => {
    const recipients = allAttendees.filter(
      (att) => att.email && att.email.includes('@') && !att.email.toLowerCase().startsWith('shared (')
    );

    if (recipients.length === 0) {
      setIsReminderModalOpen(false);
      setDispatchStatusToast({
        type: 'error',
        message: 'No registered participants with valid email addresses found in the roster.',
      });
      setTimeout(() => setDispatchStatusToast(null), 5000);
      return;
    }

    if (mode === 'schedule') {
      const scheduledJob = scheduleReminderForEvent(event, reminderMinutes, recipients.length);
      setActiveScheduledJob(scheduledJob);
      setIsReminderModalOpen(false);

      setDispatchStatusToast({
        type: 'success',
        message: `⏰ Automated Reminder Scheduled! Alert will send automatically at ${scheduledJob.targetSendTimeFormatted} (${reminderMinutes} mins before game).`,
      });
      setTimeout(() => setDispatchStatusToast(null), 7000);
      return;
    }

    // Immediate dispatch mode ("Send Immediately Now")
    setIsDispatchingReminders(true);
    let sentCount = 0;
    let failCount = 0;

    setDispatchStatusToast({
      type: 'info',
      message: `Dispatching immediate game start reminders to ${recipients.length} participant(s)...`,
    });

    for (const recipient of recipients) {
      try {
        const res = await sendOpenPlayGameReminderEmail({
          toEmail: recipient.email,
          toName: recipient.name,
          eventTitle: event.title,
          eventDate: formatEventDateLong(event.eventDate),
          eventTime: `${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}`,
          location: event.location || 'Venue Location On File',
          eventDateIso: event.eventDate,
          startTime24h: event.startTime,
          leadTimeMinutes: reminderMinutes,
          assignedCourts: event.courtNames?.join(', ') || undefined,
          companyName: event.category || 'Book Picklecourt Host',
          hostPhone: event.hostPhone,
        });

        if (res.success) {
          sentCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsDispatchingReminders(false);
    setIsReminderModalOpen(false);

    setDispatchStatusToast({
      type: 'success',
      message: `🚀 Immediate Game Start Reminder successfully dispatched to ${sentCount} participant(s)!`,
    });

    setTimeout(() => setDispatchStatusToast(null), 6000);
  };

  const handleCancelScheduledReminder = () => {
    cancelScheduledReminderForEvent(event.id);
    setActiveScheduledJob(undefined);
    setDispatchStatusToast({
      type: 'info',
      message: 'Scheduled reminder for this event has been cancelled.',
    });
    setTimeout(() => setDispatchStatusToast(null), 5000);
  };

  return (
    <div className="animate-fade-in space-y-6 text-left">
      {/* Toast Alert for Copied Share Link / Email Dispatch */}
      {copiedShareLink && (
        <div className="p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-brand-lime" />
            <span>Shareable event link copied to clipboard! ({window.location.origin}/?openplay={event.id})</span>
          </div>
        </div>
      )}

      {dispatchStatusToast && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-md ${
          dispatchStatusToast.type === 'error'
            ? 'bg-red-500/15 border border-red-500/40 text-red-300'
            : dispatchStatusToast.type === 'info'
            ? 'bg-blue-500/15 border border-blue-500/40 text-blue-300'
            : 'bg-brand-lime/15 border border-brand-lime/40 text-brand-lime'
        }`}>
          <div className="flex items-center gap-2">
            {dispatchStatusToast.type === 'info' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-brand-lime" />
            )}
            <span>{dispatchStatusToast.message}</span>
          </div>
        </div>
      )}

      {/* Active Scheduled Reminder Indicator Banner */}
      {activeScheduledJob && activeScheduledJob.status === 'pending' && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
            <div>
              <span className="font-extrabold text-amber-300 uppercase tracking-wider block text-[11px]">Automated Game Reminder Active</span>
              <span className="text-slate-200 font-medium">
                Email notification set for <strong className="text-amber-400 font-bold">{activeScheduledJob.targetSendTimeFormatted}</strong> ({activeScheduledJob.leadTimeMinutes} mins before session start) for {activeScheduledJob.recipientsCount} participant(s).
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleConfirmSendReminders('now')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-dark-bg hover:bg-amber-400 font-extrabold text-[11px] transition-all cursor-pointer shadow-sm"
            >
              Send Now
            </button>
            <button
              type="button"
              onClick={handleCancelScheduledReminder}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer"
            >
              Cancel Schedule
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-dark-border">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider cursor-pointer bg-slate-900 border border-slate-700 hover:border-brand-lime px-4 py-2.5 rounded-2xl shadow-md hover:scale-[1.01]"
        >
          <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Sessions
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {event.status === 'draft' ? (
            <button
              type="button"
              onClick={() => onToggleStatus && onToggleStatus(event)}
              className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Click to Publish Event Live"
            >
              <EyeOff className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-amber-300 inline">DRAFT</h2>
            </button>
          ) : isEventExpired || event.status === 'expired' ? (
            <span className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-black uppercase tracking-wider">
              ⏰ EXPIRED / CONCLUDED
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStatus && onToggleStatus(event)}
              className="px-4 py-1.5 rounded-full bg-brand-lime/20 border border-brand-lime/40 text-brand-lime hover:bg-brand-lime/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Click to Switch to Draft Mode"
            >
              <Globe className="w-4 h-4 text-brand-lime" />
              <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-brand-lime inline">LIVE</h2>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards Grid (Right after Back to Sessions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat 1: Gross Revenue */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-1 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-brand-lime" />
          </div>
          <div className="text-2xl font-mono font-black text-brand-lime">
            ₱{totalGrossRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">
            From {approvedHeadcount} confirmed {approvedHeadcount === 1 ? 'player' : 'players'}
          </div>
        </div>

        {/* Stat 2: Total Headcount */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-1 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Headcount</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {totalHeadcount} <span className="text-xs text-slate-500 font-bold">/ {maxCapacity} Max</span>
          </div>
          <div className="text-[11px] text-slate-400">
            👤 {primaryCount} Primary • 👥 {guestCount} Guests
          </div>
        </div>

        {/* Stat 3: Attendance Tracking */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-1 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Attendance</span>
            <UserCheck className="w-4 h-4 text-brand-lime" />
          </div>
          <div className="text-2xl font-black text-brand-lime">
            {attendedCount} <span className="text-xs text-slate-400 font-bold">({attendancePercent}%)</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {totalHeadcount - attendedCount} remaining to check in
          </div>
        </div>

        {/* Stat 4: Payment Verification */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-lg text-left space-y-1 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Payment Status</span>
            <CreditCard className="w-4 h-4 text-brand-emerald" />
          </div>
          <div className="text-2xl font-black text-brand-emerald">
            {approvedHeadcount} <span className="text-xs text-slate-400 font-bold">Approved</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {pendingHeadcount > 0 ? (
              <span className="text-yellow-400 font-bold">⏳ {pendingHeadcount} Pending Verification</span>
            ) : (
              <span>All payments verified</span>
            )}
          </div>
        </div>
      </div>

      {/* Hero Session Summary & Poster Section */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-6 items-start">
        {/* Left Column: Poster Image Preview */}
        <div
          onClick={() => {
            if (event.posterImageUrl) setIsPosterModalOpen(true);
          }}
          className={`w-full md:w-72 lg:w-80 flex-shrink-0 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative group shadow-lg ${
            event.posterImageUrl ? 'cursor-pointer' : ''
          }`}
          title={event.posterImageUrl ? 'Click to view full poster image' : ''}
        >
          <div className="w-full aspect-[3/4] max-h-[380px] bg-slate-950 flex items-center justify-center relative">
            {event.posterImageUrl ? (
              <>
                <img
                  src={event.posterImageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 backdrop-blur-md flex items-center gap-2 text-white font-extrabold text-xs shadow-xl">
                    <Maximize2 className="w-4 h-4 text-brand-lime" />
                    <span>View Full Poster</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                <Trophy className="w-12 h-12 text-brand-lime/40 mb-2" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Open Play Event Poster</span>
              </div>
            )}

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-brand-lime text-xs font-black uppercase tracking-wider shadow-sm">
                {event.category || 'Open Play'}
              </span>
              {event.skillLevel && (
                <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-300 text-xs font-extrabold shadow-sm">
                  {event.skillLevel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Overview Metadata */}
        <div className="flex-1 min-w-0 w-full space-y-4 flex flex-col justify-between self-stretch">
          <div className="space-y-4 min-w-0">
            {/* Header: Title & Entry Fee Box */}
            <div className="flex flex-row items-start justify-between gap-4 pb-3 border-b border-slate-800/80 min-w-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight break-words">
                  {event.title}
                </h2>
                <div className="flex items-center gap-2.5 mt-2 flex-wrap text-sm">
                  <span className="font-semibold text-slate-300">
                    Category: <strong className="text-brand-lime font-mono font-bold">{event.category || 'Open Play'}</strong>
                  </span>
                  {event.isRecurring && event.recurrencePattern && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-950/50 border border-purple-800/60 px-3 py-1 rounded-xl">
                      <Repeat className="w-3.5 h-3.5 text-purple-400" />
                      <span>{event.recurrencePattern}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-2.5 text-right shadow-md">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Entry Fee</span>
                <span className="text-xl md:text-2xl font-mono font-bold text-brand-lime">
                  {feePerPlayer > 0 ? `₱${feePerPlayer}` : 'FREE'}
                </span>
              </div>
            </div>

            {/* Description Block */}
            {event.description && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-sm font-semibold text-slate-200 leading-relaxed break-words whitespace-pre-line">
                {event.description}
              </div>
            )}

            {/* Open Minimalist Metadata Section (No Individual Card Boxes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-200 min-w-0 py-1">
              {/* Date & Time */}
              <div className="flex items-start gap-3 border-l-2 border-brand-lime/60 pl-3.5 py-0.5 min-w-0">
                <Calendar className="w-5 h-5 text-brand-lime flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Date & Schedule</div>
                  <div className="font-normal text-white text-base md:text-[17px] break-words mt-0.5 space-y-0.5">
                    <div>{formatEventDateLong(event.eventDate)}</div>
                    <div className="text-brand-lime font-mono text-sm md:text-base font-normal">
                      {formatTime12h(event.startTime)} - {formatTime12h(event.endTime)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue Location */}
              {event.location && (
                <div className="flex items-start gap-3 border-l-2 border-brand-emerald/60 pl-3.5 py-0.5 min-w-0">
                  <MapPin className="w-5 h-5 text-brand-emerald flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Venue Location</div>
                    <div className="font-normal text-white text-base md:text-[17px] break-words leading-snug mt-0.5">
                      {event.location}
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Courts */}
              {event.courtNames && event.courtNames.length > 0 && (
                <div className="flex items-start gap-3 border-l-2 border-brand-lime/60 pl-3.5 py-0.5 min-w-0">
                  <Building2 className="w-5 h-5 text-brand-lime flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assigned Courts</div>
                    <div className="font-normal text-white text-base md:text-[17px] break-words mt-0.5">
                      {event.courtNames.length} {event.courtNames.length === 1 ? 'Court' : 'Courts'}: {event.courtNames.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Capacity & Skill Level */}
              <div className="flex items-start gap-3 border-l-2 border-blue-500/60 pl-3.5 py-0.5 min-w-0">
                <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Capacity & Skill Level</div>
                  <div className="font-normal text-white text-base md:text-[17px] break-words mt-0.5">
                    {maxCapacity} Max Players • {event.skillLevel || 'All Skill Levels'}
                  </div>
                </div>
              </div>

              {/* Host Contact */}
              {event.hostPhone && (
                <div className="flex items-start gap-3 border-l-2 border-cyan-500/60 pl-3.5 py-0.5 min-w-0">
                  <Phone className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Host Contact</div>
                    <div className="font-normal text-white text-base md:text-[17px] break-words mt-0.5">
                      {event.hostPhone}
                    </div>
                  </div>
                </div>
              )}

              {/* GCash Payment Info */}
              {(event.gcashName || event.gcashNumber) && (
                <div className="flex items-start gap-3 border-l-2 border-brand-emerald/60 pl-3.5 py-0.5 min-w-0">
                  <CreditCard className="w-5 h-5 text-brand-emerald flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">GCash Account</div>
                    <div className="font-normal text-white text-base md:text-[17px] break-words mt-0.5">
                      {event.gcashName ? `${event.gcashName} (` : ''}{event.gcashNumber}{event.gcashName ? ')' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar Row next to Copy Shareable Link */}
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-800 text-xs mt-auto">
            {onOpenManualBookingModal && (
              <button
                type="button"
                disabled={isEventExpired || event.status === 'expired'}
                onClick={() => onOpenManualBookingModal(event)}
                className={`py-2 px-3.5 rounded-2xl transition-all text-xs font-black flex items-center gap-1.5 shadow-lg ${
                  isEventExpired || event.status === 'expired'
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
                    : 'bg-brand-lime hover:bg-[#a6e224] text-dark-bg cursor-pointer shadow-brand-lime/20'
                }`}
                title={isEventExpired || event.status === 'expired' ? "Cannot add player to an expired event session" : "Manually add walk-in or cash player registration"}
              >
                <UserPlus className={`w-4 h-4 ${isEventExpired || event.status === 'expired' ? 'text-slate-500' : 'text-dark-bg'}`} />
                <span>+ Add Player (Manual)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsReminderModalOpen(true)}
              className="py-2 px-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-dark-bg transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Send flexible game start email reminder to all rostered participants"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Send Game Start Reminder</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px]">
                {allAttendees.filter((a) => a.email && a.email.includes('@') && !a.email.toLowerCase().startsWith('shared (')).length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-lime text-slate-300 hover:text-white transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4 text-brand-lime" />
              <span>Copy Shareable Link</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPublicPage}
              className="py-2 px-3.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open public registration page in new tab"
            >
              <ExternalLink className="w-4 h-4" /> View Public Page
            </button>

            <button
              type="button"
              onClick={() => onOpenQrModal(event)}
              className="py-2 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-lime text-slate-300 hover:text-white transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <QrCode className="w-4 h-4 text-brand-lime" /> Share QR Code
            </button>

            <button
              type="button"
              onClick={() => onOpenJsonModal(event)}
              className="py-2 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-lime text-slate-300 hover:text-white transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileCode className="w-4 h-4 text-brand-lime" /> Generate JSON
            </button>

            {onExportRoster && (
              <button
                type="button"
                onClick={() => onExportRoster(event)}
                className="py-2 px-3.5 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald hover:text-dark-bg transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenEditModal(event)}
              className="py-2 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>

            {onDuplicateEvent && (
              <button
                type="button"
                onClick={() => onDuplicateEvent(event)}
                className="py-2 px-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/50 text-purple-300 hover:bg-purple-900 transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Duplicate Session"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="py-2 px-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/60 transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Cancel Session & Notify Registered Roster"
            >
              <Ban className="w-4 h-4 text-red-400" /> Cancel Event
            </button>

            <button
              type="button"
              onClick={() => onDeleteEvent(event.id)}
              className="py-2 px-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-900 transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Delete Session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Event Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-left space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">Cancel Open Play Session</h3>
                  <p className="text-xs text-slate-400">Notify registered participants & process refund guidance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDispatchingEmails && setIsCancelModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                disabled={isDispatchingEmails}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Info Badge */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="font-extrabold text-white text-sm">{event.title}</div>
              <div className="text-slate-400">
                📅 {formatEventDateLong(event.eventDate)} ({formatTime12h(event.startTime)} - {formatTime12h(event.endTime)})
              </div>
              <div className="text-brand-lime font-mono font-bold pt-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-lime" />
                <span>
                  {allAttendees.filter((a) => a.email && a.email.includes('@') && !a.email.toLowerCase().startsWith('shared (')).length} Recipient(s) ({allAttendees.length} Total Headcount)
                </span>
              </div>
            </div>

            {/* Cancellation Reason Dropdown & Custom Input */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                  Select Reason for Cancellation
                </label>
                <select
                  value={cancelPresetReason}
                  onChange={(e) => setCancelPresetReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-brand-lime font-semibold"
                  disabled={isDispatchingEmails}
                >
                  <option value="Inclement Weather / Rainout">🌧️ Inclement Weather / Rainout</option>
                  <option value="Court Facility Maintenance">🛠️ Court Facility Maintenance</option>
                  <option value="Host / Organizer Unavailability">👤 Host / Organizer Unavailability</option>
                  <option value="Minimum Registration Headcount Not Met">👥 Minimum Headcount Not Met</option>
                  <option value="Emergency Facility Closure">🚨 Emergency Facility Closure</option>
                  <option value="Custom Note / Other">✏️ Custom Reason / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                  Additional Message to Players (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancelCustomNote}
                  onChange={(e) => setCancelCustomNote(e.target.value)}
                  placeholder="e.g. Heavy thunderstorms predicted. We apologize for the inconvenience and will reschedule next week."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-semibold text-xs leading-relaxed"
                  disabled={isDispatchingEmails}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-1.5">
                  Refund & Payment Notice (Optional)
                </label>
                <input
                  type="text"
                  value={customRefundNotice}
                  onChange={(e) => setCustomRefundNotice(e.target.value)}
                  placeholder="e.g. Full GCash refunds are being processed to your original GCash number within 24 hours."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-semibold text-xs"
                  disabled={isDispatchingEmails}
                />
              </div>

              {/* Send Email Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-lime cursor-pointer mt-0.5"
                  disabled={isDispatchingEmails}
                />
                <div className="text-xs">
                  <span className="font-extrabold text-white block">Dispatch Cancellation Email to Roster</span>
                  <span className="text-slate-400">Automatically send an HTML cancellation email to all primary registered players & invited guests.</span>
                </div>
              </label>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black transition-all cursor-pointer"
                disabled={isDispatchingEmails}
              >
                Keep Session Active
              </button>

              <button
                type="button"
                onClick={handleConfirmCancellation}
                disabled={isDispatchingEmails}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDispatchingEmails ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Confirm & Send Notifications</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Roster Controls & View Switcher Bar */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-lime" /> Registered Player & Guest Roster
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review primary players and guests, mark present check-ins, and inspect GCash references.
            </p>
          </div>

          {/* Bulk Attendance Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenManualBookingModal && (
              <button
                type="button"
                disabled={isEventExpired || event.status === 'expired'}
                onClick={() => onOpenManualBookingModal(event)}
                className={`px-3.5 py-2 rounded-xl transition-all font-black text-xs flex items-center gap-1.5 ${
                  isEventExpired || event.status === 'expired'
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
                    : 'bg-brand-lime hover:bg-[#a6e224] text-dark-bg cursor-pointer shadow-md'
                }`}
                title={isEventExpired || event.status === 'expired' ? "Cannot add player to an expired event session" : "Manually add walk-in or cash player registration"}
              >
                <UserPlus className={`w-4 h-4 ${isEventExpired || event.status === 'expired' ? 'text-slate-500' : 'text-dark-bg'}`} />
                <span>+ Add Player (Manual)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => markAllAttendeesPresent(filteredAttendees.map((a) => a.id))}
              className="px-3.5 py-2 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all font-extrabold text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Mark All Present ({filteredAttendees.length})</span>
            </button>
            <button
              type="button"
              onClick={() => clearAttendeesAttendance(filteredAttendees.map((a) => a.id))}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all font-bold text-xs cursor-pointer shadow-sm"
            >
              <span>Clear Marks</span>
            </button>
          </div>
        </div>

        {/* View Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Pills */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setRosterViewMode('cards')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  rosterViewMode === 'cards'
                    ? 'bg-brand-lime text-dark-bg font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Cards View
              </button>
              <button
                onClick={() => setRosterViewMode('list')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  rosterViewMode === 'list'
                    ? 'bg-brand-lime text-dark-bg font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Attendance List
              </button>
              <button
                onClick={() => setRosterViewMode('table')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  rosterViewMode === 'table'
                    ? 'bg-brand-lime text-dark-bg font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Bookings Table
              </button>
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setRosterFilterRole('all')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer ${
                  rosterFilterRole === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({allAttendees.length})
              </button>
              <button
                onClick={() => setRosterFilterRole('primary')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer ${
                  rosterFilterRole === 'primary'
                    ? 'bg-brand-lime/20 text-brand-lime border border-brand-lime/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Primary ({primaryCount})
              </button>
              <button
                onClick={() => setRosterFilterRole('guest')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer ${
                  rosterFilterRole === 'guest'
                    ? 'bg-purple-950/40 text-purple-300 border border-purple-800/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Guests ({guestCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rosterSearchQuery}
                onChange={(e) => setRosterSearchQuery(e.target.value)}
                placeholder="Search attendee by name, email, phone, or GCash ref..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
              />
            </div>
          </div>
        </div>

        {/* Attendee Views Display */}
        {rosterViewMode === 'cards' && (
          filteredAttendees.length === 0 ? (
            <div className="glass-panel p-12 text-center border border-slate-800 rounded-3xl text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-white text-sm">No players registered yet matching filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredAttendees.map((att, idx) => {
                const isApproved = att.status === 'approved' || att.paymentStatus === 'paid';
                const isPending = att.paymentStatus === 'pending_verification';

                return (
                  <div
                    key={att.id}
                    className={`glass-panel border rounded-2xl p-4 space-y-3 relative transition-all shadow-md flex flex-col justify-between ${
                      attendanceMap[att.id] ? 'border-brand-lime/50 bg-slate-900/90 ring-1 ring-brand-lime/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-black text-slate-300 font-mono">
                          #{idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          att.type === 'primary' ? 'bg-brand-lime/20 text-brand-lime border border-brand-lime/40' : 'bg-purple-950/40 text-purple-300 border border-purple-800/50'
                        }`}>
                          {att.type === 'primary' ? 'Primary Player' : `Guest #${att.guestIndex}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ml-auto ${
                          isApproved ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/30' : isPending ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {isApproved ? '✓ Paid' : isPending ? '⏳ Pending' : '✕ Failed'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-11 h-11 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
                          <img
                            src={att.photoUrl || `https://robohash.org/${encodeURIComponent(att.name)}?set=set4`}
                            alt={att.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(att.name)}&background=b5f529&color=0f172a&bold=true`;
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="font-normal text-base md:text-lg text-white truncate">{att.name}</div>
                          {att.hostName && (
                            <div className="text-xs text-purple-300 font-normal truncate">
                              Host: <span className="text-white font-normal">{att.hostName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-slate-300 truncate mt-1 flex items-center gap-1.5 font-normal">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {att.email}
                      </div>
                      {att.phone && (
                        <div className="text-sm text-slate-300 truncate mt-0.5 flex items-center gap-1.5 font-normal">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {att.phone}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 text-[11px] space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleAttendance(att.id)}
                        className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                          attendanceMap[att.id]
                            ? 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] ring-2 ring-brand-lime/40'
                            : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-brand-lime hover:text-white'
                        }`}
                      >
                        {attendanceMap[att.id] ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-dark-bg" />
                            <span>🟢 PRESENT</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 text-slate-400" />
                            <span>MARK PRESENT</span>
                          </>
                        )}
                      </button>

                      {att.gcashReferenceNumber && (
                        <div className="flex items-center justify-between text-slate-300 pt-1">
                          <span className="text-slate-500 font-bold uppercase text-[9px]">GCash Ref:</span>
                          <span className="font-mono font-bold text-brand-lime">{att.gcashReferenceNumber}</span>
                        </div>
                      )}

                      {att.receiptImageUrl && onViewReceipt && (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(att.receiptImageUrl!)}
                          className="w-full py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-brand-lime text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-brand-lime" /> View GCash Receipt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {rosterViewMode === 'list' && (
          <div className="space-y-3 pt-2">
            {filteredAttendees.length === 0 ? (
              <div className="py-8 text-center text-slate-500 italic">No attendees match filter.</div>
            ) : (
              filteredAttendees.map((att, idx) => (
                <div
                  key={att.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all text-xs gap-3 ${
                    attendanceMap[att.id] ? 'bg-slate-900/90 border-brand-lime/40' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-500 font-bold text-[11px]">#{idx + 1}</span>
                    <div className="w-10 h-10 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
                      <img
                        src={att.photoUrl || `https://robohash.org/${encodeURIComponent(att.name)}?set=set4`}
                        alt={att.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(att.name)}&background=b5f529&color=0f172a&bold=true`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-normal text-white text-base md:text-lg flex items-center gap-2">
                        <span>{att.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          att.type === 'primary' ? 'bg-brand-lime/20 text-brand-lime' : 'bg-purple-950/40 text-purple-300'
                        }`}>
                          {att.type === 'primary' ? 'Primary' : `Guest (${att.hostName})`}
                        </span>
                      </div>
                      <div className="text-slate-300 text-xs md:text-sm mt-0.5">{att.email} • {att.phone || 'No phone'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => toggleAttendance(att.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                        attendanceMap[att.id]
                          ? 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] ring-2 ring-brand-lime/40'
                          : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-brand-lime hover:text-white'
                      }`}
                    >
                      {attendanceMap[att.id] ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-dark-bg" />
                          <span>🟢 PRESENT</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 text-slate-400" />
                          <span>MARK PRESENT</span>
                        </>
                      )}
                    </button>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                      att.status === 'approved' || att.paymentStatus === 'paid'
                        ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                        : att.paymentStatus === 'pending_verification'
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {att.status === 'approved' || att.paymentStatus === 'paid' ? '✓ Confirmed' : att.paymentStatus === 'pending_verification' ? '⏳ Pending' : '✕ Rejected'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {rosterViewMode === 'table' && (
          <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs font-extrabold uppercase tracking-wider">
                    <th className="py-4 px-4">#</th>
                    <th className="py-4 px-4">Attendee Name & Role</th>
                    <th className="py-4 px-4">Contact Info</th>
                    <th className="py-4 px-4">Payment & Ref</th>
                    <th className="py-4 px-4 text-center">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs md:text-sm">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                        No attendees match filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((att, idx) => {
                      const isApproved = att.status === 'approved' || att.paymentStatus === 'paid';
                      const isPending = att.paymentStatus === 'pending_verification';

                      return (
                        <tr key={att.id} className={`hover:bg-slate-900/40 transition-colors ${attendanceMap[att.id] ? 'bg-slate-900/60' : ''}`}>
                          <td className="py-3.5 px-4 font-mono text-slate-500 font-bold">#{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 overflow-hidden flex-shrink-0">
                                <img
                                  src={att.photoUrl || `https://robohash.org/${encodeURIComponent(att.name)}?set=set4`}
                                  alt={att.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(att.name)}&background=b5f529&color=0f172a&bold=true`;
                                  }}
                                />
                              </div>
                              <div>
                                <div className="font-normal text-white text-base md:text-lg flex items-center gap-2">
                                  <span>{att.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    att.type === 'primary' ? 'bg-brand-lime/20 text-brand-lime border border-brand-lime/30' : 'bg-purple-950/40 text-purple-300 border border-purple-800/50'
                                  }`}>
                                    {att.type === 'primary' ? 'Primary' : `Guest (${att.hostName})`}
                                  </span>
                                </div>
                                {att.hostName && <div className="text-xs text-purple-300 font-normal">Host: <span className="text-white font-normal">{att.hostName}</span></div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-xs md:text-sm">
                            <div>{att.email}</div>
                            <div className="text-slate-500 text-xs">{att.phone || 'No phone'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                isApproved ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' : isPending ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                              }`}>
                                {isApproved ? '✓ Paid' : isPending ? '⏳ Pending' : '✕ Failed'}
                              </span>
                              {att.gcashReferenceNumber && (
                                <span className="font-mono text-brand-lime text-[11px] font-bold">Ref: {att.gcashReferenceNumber}</span>
                              )}
                            </div>
                            {att.receiptImageUrl && onViewReceipt && (
                              <button
                                type="button"
                                onClick={() => onViewReceipt(att.receiptImageUrl!)}
                                className="mt-1 text-[10px] font-bold text-brand-lime hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" /> View GCash Proof
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleAttendance(att.id)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                                attendanceMap[att.id]
                                  ? 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] ring-2 ring-brand-lime/40'
                                  : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-brand-lime hover:text-white'
                              }`}
                            >
                              {attendanceMap[att.id] ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-dark-bg" />
                                  <span>🟢 PRESENT</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 text-slate-400" />
                                  <span>MARK PRESENT</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Poster Lightbox Modal */}
      {isPosterModalOpen && event.posterImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-4xl w-full shadow-2xl space-y-4 my-6 relative max-h-[92vh] flex flex-col text-left">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white leading-tight">{event.title}</h3>
                  <p className="text-xs text-slate-400">Full Poster View • {event.category || 'Open Play Event'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPosterModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable & Zoom-Friendly Poster Image Container */}
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 max-h-[75vh]">
              <img
                src={event.posterImageUrl}
                alt={event.title}
                className="max-w-full h-auto object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0">
              <a
                href={event.posterImageUrl}
                download={`${event.title.replace(/\s+/g, '_')}_Poster.jpg`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-brand-lime" />
                <span>Download Poster Image</span>
              </a>

              <button
                type="button"
                onClick={() => setIsPosterModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-extrabold text-xs transition-all cursor-pointer shadow-md"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flexible Game Start Reminder Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-left relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white leading-tight">Send Game Start Email Reminder</h3>
                  <p className="text-xs text-slate-400">Dispatch session start alert email to registered roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Reminder Lead Time */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Reminder Lead Time:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[10, 15, 20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setReminderMinutes(mins)}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border text-center ${
                      reminderMinutes === mins
                        ? 'bg-amber-500 text-dark-bg border-amber-400 shadow-md scale-105'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    {mins >= 60 ? '60 Mins (1 hr)' : `${mins} Mins`}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Schedule Calculation */}
            {(() => {
              const { formattedTime, isPast } = calculateTargetSendTime(
                event.eventDate,
                event.startTime,
                reminderMinutes
              );
              const recipientCount = allAttendees.filter((a) => a.email && a.email.includes('@') && !a.email.toLowerCase().startsWith('shared (')).length;

              return (
                <>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Game Start: {formatTime12h(event.startTime)} ({formatEventDateLong(event.eventDate)})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-brand-lime font-mono text-[10px]">
                        Target Send: {formattedTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      With <strong className="text-amber-400 font-extrabold">{reminderMinutes} mins</strong> lead time selected, emails will notify <strong className="text-brand-lime font-black">{recipientCount} participant(s)</strong> that the session begins at {formatTime12h(event.startTime)}.
                    </p>

                    {!isPast && (
                      <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Scheduled mode will automatically trigger emails at <strong>{formattedTime}</strong>.</span>
                      </div>
                    )}
                  </div>

                  {/* Event Details Summary */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                    <div><strong className="text-slate-400">Event Title:</strong> <span className="text-white font-bold">{event.title}</span></div>
                    <div><strong className="text-slate-400">Date:</strong> <span className="text-brand-lime font-mono font-bold">{formatEventDateLong(event.eventDate)}</span></div>
                    <div><strong className="text-slate-400">Venue Location:</strong> <span className="text-slate-300">{event.location}</span></div>
                    {event.courtNames && event.courtNames.length > 0 && (
                      <div><strong className="text-slate-400">Courts:</strong> <span className="text-cyan-400 font-bold">{event.courtNames.join(', ')}</span></div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsReminderModalOpen(false)}
                      disabled={isDispatchingReminders}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                      <button
                        type="button"
                        onClick={() => handleConfirmSendReminders('now')}
                        disabled={isDispatchingReminders}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/50 hover:bg-slate-800 text-amber-300 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        title="Send reminder emails immediately right now"
                      >
                        {isDispatchingReminders ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        ) : (
                          <Send className="w-4 h-4 text-amber-400" />
                        )}
                        <span>🚀 Send Immediately Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmSendReminders('schedule')}
                        disabled={isDispatchingReminders}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-bg font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        title={`Schedule system to send email automatically at ${formattedTime}`}
                      >
                        <Clock className="w-4 h-4 text-dark-bg" />
                        <span>⏰ Schedule ({formattedTime})</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
