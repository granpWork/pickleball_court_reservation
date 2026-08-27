import React, { useState } from 'react';
import {
  Plus,
  Users,
  Calendar,
  MapPin,
  Copy,
  Edit2,
  Trash2,
  ArrowLeft,
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
  RotateCcw,
  Trophy,
  FileText,
  Mail,
  Phone,
  Check,
  Share2,
  Repeat,
  Building2,
  CreditCard,
  FileCode,
  QrCode
} from 'lucide-react';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { OpenPlayJsonModal } from '../modals/OpenPlayJsonModal';
import { OpenPlayQrModal } from '../modals/OpenPlayQrModal';

export interface OpenPlayRegistrationItem {
  id: string;
  eventId: string;
  eventTitle?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  playerName?: string;
  playerEmail?: string;
  playerPhone?: string;
  playerCount?: number;
  guestCount?: number;
  guests?: any[];
  guestNames?: string[];
  guestEmails?: string[];
  gcashReferenceNumber?: string;
  receiptImageUrl?: string;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
  isAddGuestOnly?: boolean;
  primaryPlayerName?: string;
  primaryPlayerEmail?: string;
  registrationFee?: number;
}

interface AdminOpenPlayTabProps {
  events: OpenPlayEvent[];
  openPlayRegistrations?: OpenPlayRegistrationItem[];
  selectedEventForRegs: OpenPlayEvent | null;
  setSelectedEventForRegs: (event: OpenPlayEvent | null) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (event: OpenPlayEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCopyShareLink: (eventId: string) => void;
  onDuplicateEvent?: (event: OpenPlayEvent) => void;
  onToggleStatus?: (event: OpenPlayEvent) => void;
  onExportRoster?: (event: OpenPlayEvent) => void;
  onViewReceipt?: (receiptUrl: string) => void;
  onRefreshEvents?: () => void;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
}

export const AdminOpenPlayTab: React.FC<AdminOpenPlayTabProps> = ({
  events,
  openPlayRegistrations = [],
  selectedEventForRegs,
  setSelectedEventForRegs,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteEvent,
  onCopyShareLink,
  onDuplicateEvent,
  onToggleStatus,
  onExportRoster,
  onViewReceipt,
  onRefreshEvents,
  formatEventDateLong = (d) => d,
  formatTime12h = (t) => t,
}) => {
  // Roster View state
  const [rosterViewMode, setRosterViewMode] = useState<'cards' | 'list' | 'table'>('cards');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterFilterRole, setRosterFilterRole] = useState<'all' | 'primary' | 'guest'>('all');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});

  // Session List Filter & View Mode state
  const [adminOpenPlayFilter, setAdminOpenPlayFilter] = useState<'all' | 'upcoming' | 'expired'>('all');
  const [adminOpenPlayViewMode, setAdminOpenPlayViewMode] = useState<'cards' | 'history'>('cards');
  const [copiedShareLink, setCopiedShareLink] = useState<string | null>(null);

  // JSON Modal State
  const [jsonModalState, setJsonModalState] = useState<{
    isOpen: boolean;
    title: string;
    jsonData: any;
    filename: string;
  }>({
    isOpen: false,
    title: '',
    jsonData: null,
    filename: 'openplay_session_data.json',
  });

  // QR Modal State
  const [qrModalState, setQrModalState] = useState<{
    isOpen: boolean;
    event: OpenPlayEvent | null;
  }>({
    isOpen: false,
    event: null,
  });

  const handleOpenQrForEvent = (event: OpenPlayEvent) => {
    setQrModalState({
      isOpen: true,
      event,
    });
  };

  const toggleAttendance = (attendeeId: string) => {
    setAttendanceMap(prev => ({ ...prev, [attendeeId]: !prev[attendeeId] }));
  };

  const isEventExpired = (eventDateStr: string, _endTimeStr?: string) => {
    try {
      if (!eventDateStr) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      if (eventDateStr < todayStr) return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleCopyLink = (eventId: string) => {
    onCopyShareLink(eventId);
    setCopiedShareLink(eventId);
    setTimeout(() => setCopiedShareLink(null), 3000);
  };

  // Filter helper for expired/concluded events
  const isEventConcluded = (e: OpenPlayEvent) => {
    return isEventExpired(e.eventDate, e.endTime) || e.status === 'expired' || e.status === 'completed';
  };

  const generateEventJsonObject = (event: OpenPlayEvent) => {
    const eventRegs = openPlayRegistrations.filter(r => r.eventId === event.id);
    const registeredPlayers = eventRegs.map(r => ({
      registrationId: r.id,
      name: r.userName || r.playerName || 'Player',
      email: r.userEmail || r.playerEmail || '',
      phone: r.userPhone || r.playerPhone || '',
      guestCount: r.guestCount || 0,
      guestNames: r.guestNames || [],
      paymentStatus: r.paymentStatus || 'completed',
      referenceNumber: r.gcashReferenceNumber || 'N/A',
      registeredAt: r.createdAt || new Date().toISOString(),
    }));

    const maxCap = event.maxParticipants || 16;
    const currentCap = registeredPlayers.reduce((sum, r) => sum + 1 + (r.guestCount || 0), 0);
    const spotsRemaining = Math.max(0, maxCap - currentCap);

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      category: event.category || 'Open Play',
      skillLevel: event.skillLevel || 'All Skill Levels',
      hostPhone: event.hostPhone || 'N/A',
      date: event.eventDate,
      formattedDate: formatEventDateLong(event.eventDate),
      startTime: event.startTime,
      formattedStartTime: formatTime12h(event.startTime),
      endTime: event.endTime,
      formattedEndTime: formatTime12h(event.endTime),
      courtIds: event.courtIds || [],
      courtNames: event.courtNames || [],
      companyName: event.companyName || 'Pickleball Facility',
      location: event.location || 'Pickleball Facility',
      pricePerPlayer: event.registrationFee || 0,
      currency: 'PHP',
      maxCapacity: maxCap,
      registeredCount: currentCap,
      spotsLeft: spotsRemaining,
      status: event.status || (isEventConcluded(event) ? 'completed' : 'active'),
      isRecurring: !!event.isRecurring,
      recurrencePattern: event.recurrencePattern || '',
      registeredPlayersCount: registeredPlayers.length,
      registeredPlayers: registeredPlayers,
    };
  };

  const handleOpenJsonForEvent = (event: OpenPlayEvent) => {
    const jsonObj = generateEventJsonObject(event);
    const safeTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setJsonModalState({
      isOpen: true,
      title: `Open Play Session JSON: ${event.title}`,
      jsonData: jsonObj,
      filename: `openplay_${safeTitle}_${event.eventDate}.json`,
    });
  };

  const activeAdminEvents = events.filter(e => !isEventConcluded(e) && e.status !== 'cancelled');
  const expiredAdminEvents = events.filter(e => isEventConcluded(e));

  const displayedAdminEvents = events.filter(event => {
    const isConcluded = isEventConcluded(event);
    if (adminOpenPlayFilter === 'upcoming') return !isConcluded;
    if (adminOpenPlayFilter === 'expired') return isConcluded;
    return true;
  });

  return (
    <div className="text-left">
      {selectedEventForRegs ? (
        /* ========================================================================= */
        /* 1. FULL PAGE PLAYER & GUEST ROSTER INSPECTION VIEW                        */
        /* ========================================================================= */
        <div className="animate-fade-in space-y-6">
          {/* Top Breadcrumb Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark-border">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedEventForRegs(null)}
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider cursor-pointer bg-slate-900 border border-slate-700 hover:border-brand-lime px-4 py-2.5 rounded-2xl shadow-md hover:scale-[1.01]"
              >
                <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Open Play Sessions
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-brand-lime" /> {selectedEventForRegs.title}
                </span>
                {isEventExpired(selectedEventForRegs.eventDate, selectedEventForRegs.endTime) || selectedEventForRegs.status === 'expired' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    ⏰ Expired
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-[10px] font-black uppercase tracking-wider">
                    🟢 Active Session
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenQrForEvent(selectedEventForRegs)}
                className="py-2.5 px-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <QrCode className="w-4 h-4" /> Share QR Code
              </button>

              <button
                onClick={() => handleOpenJsonForEvent(selectedEventForRegs)}
                className="py-2.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-lime text-slate-300 hover:text-white transition-all text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <FileCode className="w-4 h-4 text-brand-lime" /> Generate JSON Data
              </button>

              {onExportRoster && (
                <button
                  onClick={() => onExportRoster(selectedEventForRegs)}
                  className="py-2.5 px-4 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald hover:text-dark-bg transition-all text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" /> Export CSV Roster
                </button>
              )}
            </div>
          </div>

          {/* Roster Body */}
          {(() => {
            const eventRegs = openPlayRegistrations.filter(r => r.eventId === selectedEventForRegs.id);
            
            interface RosterAttendee {
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

            const allAttendees: RosterAttendee[] = [];
            eventRegs.forEach(reg => {
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

            const filteredAttendees = allAttendees.filter(att => {
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

            const totalHeadcount = allAttendees.length;
            const primaryCount = allAttendees.filter(a => a.type === 'primary').length;
            const guestCount = allAttendees.filter(a => a.type === 'guest').length;
            const approvedHeadcount = allAttendees.filter(a => a.status === 'approved' || a.paymentStatus === 'paid').length;
            const pendingHeadcount = allAttendees.filter(a => a.paymentStatus === 'pending_verification' || a.status === 'pending').length;
            const attendedCount = allAttendees.filter(a => attendanceMap[a.id]).length;
            const attendancePercent = totalHeadcount > 0 ? Math.round((attendedCount / totalHeadcount) * 100) : 0;

            return (
              <div className="space-y-6">
                {/* Page Title & Headcount Summary Banner */}
                <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
                      <Users className="w-6 h-6 text-brand-lime" /> {selectedEventForRegs.title} — Player & Guest Roster
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Full headcount breakdown: review registered primary players, guests, verify GCash payments, and track session attendance.
                    </p>
                  </div>

                  {/* Headcount Stat Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-extrabold flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> Total Headcount: {totalHeadcount} / {selectedEventForRegs.maxParticipants}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                        👤 {primaryCount} Primary Players
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-purple-300 font-bold">
                        👥 {guestCount} Guests
                      </span>
                      <span className={`px-3 py-1.5 rounded-xl border font-extrabold flex items-center gap-1.5 ${
                        attendedCount > 0 ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <UserCheck className="w-4 h-4 text-brand-lime" /> 🎯 Attendance: {attendedCount}/{totalHeadcount} ({attendancePercent}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald font-extrabold">
                        ✓ {approvedHeadcount} Approved
                      </span>
                      {pendingHeadcount > 0 && (
                        <span className="px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-extrabold">
                          ⏳ {pendingHeadcount} Pending Review
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Switcher & Search Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Switcher */}
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
                        All
                      </button>
                      <button
                        onClick={() => setRosterFilterRole('primary')}
                        className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer ${
                          rosterFilterRole === 'primary'
                            ? 'bg-brand-lime/20 text-brand-lime border border-brand-lime/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Primary
                      </button>
                      <button
                        onClick={() => setRosterFilterRole('guest')}
                        className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer ${
                          rosterFilterRole === 'guest'
                            ? 'bg-purple-950/40 text-purple-300 border border-purple-800/50'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Guests
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

                {/* Attendee Display Views */}
                {rosterViewMode === 'cards' && (
                  filteredAttendees.length === 0 ? (
                    <div className="glass-panel p-12 text-center border border-slate-800 rounded-3xl text-slate-500">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-bold text-white text-sm">No players registered yet matching filter.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                  <div className="font-extrabold text-sm text-white truncate">{att.name}</div>
                                  {att.hostName && (
                                    <div className="text-[11px] text-purple-300 font-semibold truncate">
                                      Host: <strong className="text-white">{att.hostName}</strong>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" /> {att.email}
                              </div>
                              {att.phone && (
                                <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" /> {att.phone}
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
                  <div className="glass-panel border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-3">
                    {filteredAttendees.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 italic">No attendees match filter.</div>
                    ) : (
                      filteredAttendees.map((att, idx) => (
                        <div key={att.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all text-xs gap-3 ${
                          attendanceMap[att.id] ? 'bg-slate-900/90 border-brand-lime/40' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        }`}>
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
                              <div className="font-extrabold text-white text-sm flex items-center gap-2">
                                <span>{att.name}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  att.type === 'primary' ? 'bg-brand-lime/20 text-brand-lime' : 'bg-purple-950/40 text-purple-300'
                                }`}>
                                  {att.type === 'primary' ? 'Primary' : `Guest (${att.hostName})`}
                                </span>
                              </div>
                              <div className="text-slate-400 text-[11px] mt-0.5">{att.email} • {att.phone || 'No phone'}</div>
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
              </div>
            );
          })()}
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. MAIN SESSIONS OVERVIEW VIEW (CARDS VIEW & HISTORY TABLE)              */
        /* ========================================================================= */
        <div className="animate-fade-in text-left space-y-6">
          {/* Toast alert for copied share link */}
          {copiedShareLink && (
            <div className="p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand-lime" />
                <span>Shareable event link copied to clipboard! ({window.location.origin}/?openplay={copiedShareLink})</span>
              </div>
            </div>
          )}

          {/* Filter Tabs & View Mode Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-dark-border/40">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Sessions', count: events.length },
                { id: 'upcoming', label: 'Active / Upcoming', count: activeAdminEvents.length },
                { id: 'expired', label: 'Concluded / Expired History', count: expiredAdminEvents.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAdminOpenPlayFilter(tab.id as any);
                    if (tab.id === 'expired') {
                      setAdminOpenPlayViewMode('history');
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    adminOpenPlayFilter === tab.id
                      ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    adminOpenPlayFilter === tab.id ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
              {/* View Mode Toggle: Cards vs History Table */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdminOpenPlayViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminOpenPlayViewMode === 'cards'
                      ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminOpenPlayViewMode('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminOpenPlayViewMode === 'history'
                      ? 'bg-brand-lime text-dark-bg shadow-sm font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>

              {/* Refresh Events Button */}
              {onRefreshEvents && (
                <button
                  type="button"
                  onClick={onRefreshEvents}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm"
                  title="Refresh Sessions List"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Create Open Play Event CTA */}
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all flex items-center gap-1.5 shadow-md shadow-brand-lime/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Open Play Event
              </button>
            </div>
          </div>

          {/* Main Content Display (Cards View vs History Table View) */}
          {displayedAdminEvents.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 max-w-xl mx-auto my-6 shadow animate-fade-in">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white">
                No {adminOpenPlayFilter === 'upcoming' ? 'Active / Upcoming' : 'Expired'} Open Play Sessions
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
                {adminOpenPlayFilter === 'upcoming'
                  ? `You have ${events.length} session(s) in total, but none are currently active/upcoming.`
                  : `You have ${events.length} session(s) in total, but none are marked as expired.`}
              </p>
              <button
                onClick={() => setAdminOpenPlayFilter('all')}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-extrabold text-brand-lime bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer"
              >
                View All Sessions ({events.length})
              </button>
            </div>
          ) : adminOpenPlayViewMode === 'history' ? (
            /* History Table View */
            <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-extrabold uppercase tracking-wider">
                      <th className="py-4 px-4">Event Date & Time</th>
                      <th className="py-4 px-4">Session Title</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4 text-center">Turnout / Capacity</th>
                      <th className="py-4 px-4 text-right">Price</th>
                      <th className="py-4 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {displayedAdminEvents.map(event => {
                      const eventRegs = openPlayRegistrations.filter(r => r.eventId === event.id);
                      const headcount = eventRegs.reduce((sum, r) => sum + (r.playerCount || 1), 0);
                      const isExpired = isEventConcluded(event);

                      return (
                        <tr key={event.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            <div>{formatEventDateLong(event.eventDate)}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{formatTime12h(event.startTime)} - {formatTime12h(event.endTime)}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{event.title}</span>
                              {isExpired ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Expired</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-brand-lime/20 text-brand-lime border border-brand-lime/30">Active</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-cyan-300 font-medium">{event.category || 'Open Play'}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-white">
                            {headcount} / {event.maxParticipants || 16}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-brand-lime">
                            ₱{event.registrationFee || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedEventForRegs(event)}
                                className="px-3 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-lime-400 transition-all cursor-pointer"
                              >
                                Roster
                              </button>
                              <button
                                onClick={() => handleOpenQrForEvent(event)}
                                className="p-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all cursor-pointer"
                                title="Share via QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenJsonForEvent(event)}
                                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-lime text-slate-300 hover:text-white transition-all cursor-pointer"
                                title="Generate JSON Data"
                              >
                                <FileCode className="w-4 h-4 text-brand-lime" />
                              </button>
                              <button
                                onClick={() => handleCopyLink(event.id)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                title="Copy Share Link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenEditModal(event)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                title="Edit Event"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteEvent(event.id)}
                                className="p-1.5 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                                title="Delete Event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedAdminEvents.map((event) => {
                const isExpired = isEventConcluded(event);
                const eventRegs = openPlayRegistrations.filter(r => r.eventId === event.id && r.status !== 'cancelled');
                const pendingRegsCount = openPlayRegistrations.filter(r => r.eventId === event.id && r.paymentStatus === 'pending_verification').length;
                const totalSpots = eventRegs.reduce((sum, r) => sum + (r.playerCount || 1), 0);
                const maxCap = event.maxParticipants || 16;
                const isFull = totalSpots >= maxCap;
                
                return (
                  <div key={event.id} className={`glass-panel border rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between transition-all group shadow-lg ${
                    isExpired ? 'border-slate-800/60 bg-slate-950/40 opacity-90' : 'border-slate-800 hover:border-slate-700'
                  }`}>
                    <div>
                      {/* Poster Header */}
                      <div className="w-full aspect-[16/9] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative mb-4">
                        {event.posterImageUrl ? (
                          <img src={event.posterImageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                            <Trophy className="w-8 h-8 text-brand-lime/40 mb-1" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Open Play Event</span>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                          {isExpired ? (
                            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md border border-amber-400/50 text-dark-bg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <span>⏰ EXPIRED / CONCLUDED</span>
                            </div>
                          ) : event.status === 'draft' ? (
                            <button
                              type="button"
                              onClick={() => onToggleStatus && onToggleStatus(event)}
                              title="Click to Publish Event Live for Public Bookings"
                              className="px-2.5 py-0.5 rounded-full bg-amber-500/30 hover:bg-amber-500/50 backdrop-blur-md border border-amber-500/60 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                            >
                              <EyeOff className="w-3 h-3 text-amber-400" />
                              <span>DRAFT (HIDDEN)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onToggleStatus && onToggleStatus(event)}
                              title="Click to Switch to Draft (Hide from Public View)"
                              className="px-2.5 py-0.5 rounded-full bg-brand-lime hover:bg-[#a6e224] backdrop-blur-md text-dark-bg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                            >
                              <Globe className="w-3 h-3 text-dark-bg" />
                              <span>LIVE (PUBLISHED)</span>
                            </button>
                          )}

                          {isFull && !isExpired && (
                            <div className="px-2.5 py-0.5 rounded-full bg-red-600/90 backdrop-blur-md border border-red-400/50 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                              <span>🚫 FULLY BOOKED</span>
                            </div>
                          )}

                          <div className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-wider">
                            {event.category || 'Open Play'}
                          </div>

                          {event.isRecurring && (
                            <div className="px-2 py-0.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Recurring</span>
                            </div>
                          )}
                        </div>

                        <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-white font-mono font-bold text-[11px]">
                          {event.registrationFee && event.registrationFee > 0 ? `₱${event.registrationFee}` : 'FREE'}
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-base font-extrabold text-white leading-tight">{event.title}</h4>
                      </div>

                      {event.isRecurring && event.recurrencePattern && (
                        <div className="mb-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-300 bg-purple-950/30 border border-purple-800/40 px-2.5 py-0.5 rounded-lg">
                            <Repeat className="w-3 h-3 text-purple-400" />
                            <span>{event.recurrencePattern}</span>
                          </span>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                          <span className={isExpired ? 'text-amber-400/90 font-medium' : ''}>
                            {formatEventDateLong(event.eventDate)} ({formatTime12h(event.startTime)} - {formatTime12h(event.endTime)})
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-brand-emerald flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-300 leading-tight">
                              <div className="font-normal text-slate-300">{event.location}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span className="font-bold text-slate-200">
                            {totalSpots} / {event.maxParticipants || 16} Players Registered
                          </span>
                        </div>
                        {event.courtNames && event.courtNames.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                            <span className="truncate">
                              <strong className="text-white font-bold">{event.courtNames.length} {event.courtNames.length === 1 ? 'Court' : 'Courts'}:</strong> {event.courtNames.join(', ')}
                            </span>
                          </div>
                        )}
                        {event.gcashName && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <CreditCard className="w-3.5 h-3.5 text-brand-emerald flex-shrink-0" />
                            <span>GCash: <strong className="text-slate-300">{event.gcashName}</strong> ({event.gcashNumber})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-dark-border/40 flex flex-col gap-2 mt-auto">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(event.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </button>

                        <button
                          onClick={() => setSelectedEventForRegs(event)}
                          className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white hover:bg-slate-800 transition-all font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer relative"
                        >
                          <Users className="w-3.5 h-3.5" /> Roster
                          {pendingRegsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black">
                              {pendingRegsCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenQrForEvent(event)}
                          title="Share via QR Code"
                          className="py-2 px-2.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDuplicateEvent ? onDuplicateEvent(event) : onOpenEditModal(event)}
                          title="Duplicate session"
                          className="py-2 px-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-300 hover:bg-purple-900 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {onExportRoster && (
                          <button
                            onClick={() => onExportRoster(event)}
                            title="Export roster CSV"
                            className="py-2 px-2.5 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald hover:text-dark-bg transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                        <button
                          type="button"
                          onClick={() => handleOpenJsonForEvent(event)}
                          title="Generate JSON Data"
                          className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-brand-lime transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5 text-brand-lime" />
                          <span>Generate JSON</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenEditModal(event)}
                            className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => onDeleteEvent(event.id)}
                            className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-900 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* JSON Viewer Modal */}
      <OpenPlayJsonModal
        isOpen={jsonModalState.isOpen}
        onClose={() => setJsonModalState((prev) => ({ ...prev, isOpen: false }))}
        title={jsonModalState.title}
        jsonData={jsonModalState.jsonData}
        filename={jsonModalState.filename}
      />

      {/* QR Code Share Modal */}
      <OpenPlayQrModal
        isOpen={qrModalState.isOpen}
        onClose={() => setQrModalState({ isOpen: false, event: null })}
        event={qrModalState.event}
        formatEventDateLong={formatEventDateLong}
        formatTime12h={formatTime12h}
      />
    </div>
  );
};
