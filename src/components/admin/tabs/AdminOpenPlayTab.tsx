import React, { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  Calendar,
  MapPin,
  Copy,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  EyeOff,
  Globe,
  RotateCcw,
  Trophy,
  Check,
  Share2,
  Repeat,
  FileCode,
  QrCode,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { OpenPlayJsonModal } from '../modals/OpenPlayJsonModal';
import { OpenPlayQrModal } from '../modals/OpenPlayQrModal';
import { AdminOpenPlayEventDetails } from './AdminOpenPlayEventDetails';

import { type UserPermissions } from '../adminTypes';

export function formatCityProvince(location?: string): string {
  if (!location || !location.trim()) return '';

  const parts = location
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return location.trim();

  const filtered = parts.filter(
    (p) =>
      !['philippines', 'ph', 'philippine', 'pilipinas'].includes(p.toLowerCase()) &&
      !/^\d{4,5}$/.test(p)
  );

  if (filtered.length === 0) return location.trim();
  if (filtered.length === 1) return filtered[0];

  return filtered.slice(-2).join(', ');
}

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
  onOpenManualBookingModal?: (event: OpenPlayEvent) => void;
  onRefreshEvents?: () => void;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
  userPermissions?: UserPermissions;
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
  onOpenManualBookingModal,
  onRefreshEvents,
  formatEventDateLong = (d) => d,
  formatTime12h = (t) => t,
  userPermissions: _userPermissions,
}) => {
  // Session List Filter & View Mode state
  const [adminOpenPlayFilter, setAdminOpenPlayFilter] = useState<'upcoming' | 'all' | 'expired'>('upcoming');
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

  const DEFAULT_OPENPLAY_IMAGE = 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=800&q=80';

  // Restore selected event on initial page load / refresh
  useEffect(() => {
    if (events.length > 0 && !selectedEventForRegs) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('eventId') || urlParams.get('openplay');
        if (eventId) {
          const matched = events.find(e => e.id === eventId);
          if (matched) {
            setSelectedEventForRegs(matched);
          }
        }
      } catch (e) {}
    }
  }, [events, selectedEventForRegs, setSelectedEventForRegs]);

  // Handle browser back / forward navigation popstate events
  useEffect(() => {
    const handlePopState = () => {
      if (events.length > 0) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const eventId = urlParams.get('eventId') || urlParams.get('openplay');
          if (eventId) {
            const matched = events.find(e => e.id === eventId);
            if (matched) {
              setSelectedEventForRegs(matched);
              return;
            }
          }
          setSelectedEventForRegs(null);
        } catch (e) {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [events, setSelectedEventForRegs]);

  const handleSelectEvent = (event: OpenPlayEvent | null) => {
    setSelectedEventForRegs(event);
    if (event) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('eventId', event.id);
        window.history.pushState(null, '', url.toString());
      } catch (e) {}
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('eventId');
        url.searchParams.delete('openplay');
        window.history.pushState(null, '', url.toString());
      } catch (e) {}
    }
  };

  const handleOpenQrForEvent = (event: OpenPlayEvent) => {
    setQrModalState({
      isOpen: true,
      event,
    });
  };

  const isEventExpired = (eventDateStr: string, endTimeStr?: string) => {
    try {
      if (!eventDateStr) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      if (eventDateStr < todayStr) return true;
      if (eventDateStr > todayStr) return false;

      // If event date is today, evaluate endTime if provided
      if (endTimeStr) {
        const now = new Date();
        const timeParts = endTimeStr.trim().split(':');
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
  };

  const handleCopyLink = (eventId: string) => {
    onCopyShareLink(eventId);
    setCopiedShareLink(eventId);
    setTimeout(() => setCopiedShareLink(null), 3000);
  };

  const handleOpenPublicDetails = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?openplay=${eventId}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
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

  const displayedAdminEvents = events
    .filter(event => {
      const isConcluded = isEventConcluded(event);
      if (adminOpenPlayFilter === 'upcoming') return !isConcluded;
      if (adminOpenPlayFilter === 'expired') return isConcluded;
      return true;
    })
    .sort((a, b) => {
      const aConcluded = isEventConcluded(a);
      const bConcluded = isEventConcluded(b);
      if (aConcluded !== bConcluded) {
        return aConcluded ? 1 : -1; // Active / not expired events first
      }
      if (!aConcluded) {
        return (a.eventDate || '').localeCompare(b.eventDate || '');
      }
      return (b.eventDate || '').localeCompare(a.eventDate || '');
    });

  return (
    <div className="text-left">
      {selectedEventForRegs ? (
        <AdminOpenPlayEventDetails
          event={selectedEventForRegs}
          registrations={openPlayRegistrations}
          onBack={() => handleSelectEvent(null)}
          onOpenEditModal={onOpenEditModal}
          onDeleteEvent={onDeleteEvent}
          onCopyShareLink={onCopyShareLink}
          onDuplicateEvent={onDuplicateEvent}
          onToggleStatus={onToggleStatus}
          onExportRoster={onExportRoster}
          onViewReceipt={onViewReceipt}
          onOpenManualBookingModal={onOpenManualBookingModal}
          onOpenQrModal={handleOpenQrForEvent}
          onOpenJsonModal={handleOpenJsonForEvent}
          formatEventDateLong={formatEventDateLong}
          formatTime12h={formatTime12h}
        />
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
                { id: 'upcoming', label: 'Active / Upcoming', count: activeAdminEvents.length },
                { id: 'all', label: 'All Sessions', count: events.length },
                { id: 'expired', label: 'Concluded / Expired History', count: expiredAdminEvents.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminOpenPlayFilter(tab.id as any)}
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
                            <div
                              onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }}
                              className="flex items-center gap-2 cursor-pointer hover:text-brand-lime transition-colors group/tbl"
                              title="Click to view Admin Event Details Page"
                            >
                              {event.status === 'draft' ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Draft</span>
                              ) : isExpired ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">Expired</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-brand-lime/20 text-brand-lime border border-brand-lime/30">Active</span>
                              )}
                              <span>{event.title}</span>
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
                                onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }}
                                className="px-3 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-lime-400 transition-all cursor-pointer shadow-sm flex items-center gap-1"
                                title="Open Admin Event Details Page & Roster"
                              >
                                <Trophy className="w-3.5 h-3.5" /> Manage Event
                              </button>
                              <button
                                onClick={(e) => handleOpenPublicDetails(event.id, e)}
                                className="p-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all cursor-pointer"
                                title="View Public Details Page in New Tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenQrForEvent(event); }}
                                className="p-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all cursor-pointer"
                                title="Share via QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenJsonForEvent(event); }}
                                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-lime text-slate-300 hover:text-white transition-all cursor-pointer"
                                title="Generate JSON Data"
                              >
                                <FileCode className="w-4 h-4 text-brand-lime" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopyLink(event.id); }}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                title="Copy Share Link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpenEditModal(event); }}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                title="Edit Event"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
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
                const totalSpots = eventRegs.reduce((sum, r) => sum + (r.playerCount || 1), 0);
                const maxCap = event.maxParticipants || 16;
                const isFull = totalSpots >= maxCap;
                
                return (
                  <div
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`glass-panel border rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between transition-all group shadow-lg cursor-pointer hover:border-brand-lime/50 ${
                    isExpired ? 'border-slate-800/60 bg-slate-950/40 opacity-90' : 'border-slate-800 hover:border-slate-700'
                  }`}>
                    <div>
                      {/* Poster Header */}
                      <div
                        onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }}
                        className="w-full aspect-[16/9] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative mb-4 cursor-pointer group/poster"
                        title="Click to view Admin Event Details Page"
                      >
                        {event.posterImageUrl ? (
                          <img src={event.posterImageUrl} alt={event.title} onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_OPENPLAY_IMAGE; }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                            <Trophy className="w-8 h-8 text-brand-lime/40 mb-1" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Open Play Event</span>
                          </div>
                        )}
                      </div>

                      {/* Clean High-Contrast Tags Row Above Title Header */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        {/* Status Tag */}
                        {event.status === 'draft' ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleStatus && onToggleStatus(event); }}
                            title="Click to Publish Event Live for Public Bookings"
                            className="px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                          >
                            <EyeOff className="w-3 h-3 text-amber-400" />
                            <h2 className="text-[10px] font-black uppercase tracking-wider text-amber-300 inline">DRAFT</h2>
                          </button>
                        ) : isExpired ? (
                          <div className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span>⏰ EXPIRED / CONCLUDED</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleStatus && onToggleStatus(event); }}
                            title="Click to Switch to Draft (Hide from Public View)"
                            className="px-2.5 py-0.5 rounded-full bg-brand-lime/20 hover:bg-brand-lime/30 border border-brand-lime/40 text-brand-lime text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                          >
                            <Globe className="w-3 h-3 text-brand-lime" />
                            <h2 className="text-[10px] font-black uppercase tracking-wider text-brand-lime inline">LIVE</h2>
                          </button>
                        )}

                        {/* Category Tag */}
                        <div className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider">
                          {event.category || 'Open Play'}
                        </div>

                        {/* Capacity Tag */}
                        {isFull && !isExpired && (
                          <div className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                            <span>🚫 FULLY BOOKED</span>
                          </div>
                        )}

                        {/* Recurring Tag */}
                        {event.isRecurring && (
                          <div className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Recurring</span>
                          </div>
                        )}

                        {/* Price Badge */}
                        <div className="ml-auto px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-white font-mono font-bold text-[11px] shadow-sm">
                          {event.registrationFee && event.registrationFee > 0 ? `₱${event.registrationFee}` : 'FREE'}
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4
                          onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }}
                          className="text-lg sm:text-xl font-semibold text-white leading-tight cursor-pointer hover:text-brand-lime transition-colors flex items-center gap-1.5 group/title"
                          title="Click to view Admin Event Details Page"
                        >
                          <span>{event.title}</span>
                        </h4>
                      </div>

                      {event.isRecurring && event.recurrencePattern && (
                        <div className="mb-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-950/30 border border-purple-800/40 px-2.5 py-0.5 rounded-lg">
                            <Repeat className="w-3.5 h-3.5 text-purple-400" />
                            <span>{event.recurrencePattern}</span>
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 text-sm font-semibold text-slate-300 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand-lime flex-shrink-0" />
                          <span className={isExpired ? 'text-amber-400/90 font-semibold' : 'text-slate-200 font-semibold'}>
                            {formatEventDateLong(event.eventDate)} ({formatTime12h(event.startTime)} - {formatTime12h(event.endTime)})
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-brand-emerald flex-shrink-0 mt-0.5" />
                            <div className="text-sm font-semibold text-slate-200 leading-tight">
                              <div className="font-semibold text-slate-200">{formatCityProvince(event.location)}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-200">
                            {totalSpots} / {event.maxParticipants || 16} Players Registered
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-dark-border/40 flex flex-col gap-2 mt-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        {onOpenManualBookingModal && (
                          <button
                            type="button"
                            disabled={isExpired || event.status === 'expired' || isFull}
                            onClick={(e) => { e.stopPropagation(); onOpenManualBookingModal(event); }}
                            className={`py-2 px-3 rounded-xl font-normal text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                              isExpired || event.status === 'expired' || isFull
                                ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                                : 'bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg cursor-pointer'
                            }`}
                            title={
                              isExpired || event.status === 'expired'
                                ? "Cannot add player to an expired event session"
                                : isFull
                                  ? "This Open Play session is fully booked"
                                  : "Manually add walk-in or cash player"
                            }
                          >
                            <UserPlus className="w-3.5 h-3.5" /> + Add Player
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleOpenPublicDetails(event.id, e)}
                          title="Preview public registration page in a new tab"
                          className="py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-brand-lime transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopyLink(event.id); }}
                          className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-brand-lime transition-all font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-brand-lime" /> Share
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenQrForEvent(event); }}
                          title="Share via QR Code"
                          className="py-2 px-2.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDuplicateEvent ? onDuplicateEvent(event) : onOpenEditModal(event); }}
                          title="Duplicate session"
                          className="py-2 px-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-300 hover:bg-purple-900 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenJsonForEvent(event); }}
                          title="Generate JSON Data"
                          className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-brand-lime transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5 text-brand-lime" />
                          <span>Generate JSON</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenEditModal(event); }}
                            className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
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
