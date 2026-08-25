import { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Building2,
  Filter,
  RotateCcw,
  ArrowRight,
  Repeat,
  Clock,
  DollarSign,
  Share2,
  Check
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { isEventExpired, calculateEventDuration, formatTime12h, formatEventDateLong, splitAddressComponents, normalizeOpenPlayEvent, type OpenPlayEvent, type OpenPlayRegistration } from './OpenPlayDetails';

interface OpenPlayPageProps {
  onSelectEvent: (eventId: string) => void;
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp') => void;
}

export default function OpenPlayPage({ onSelectEvent, setView }: OpenPlayPageProps) {
  const [events, setEvents] = useState<OpenPlayEvent[]>([]);
  const [registrations, setRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const handleShareEvent = async (e: React.MouseEvent, event: OpenPlayEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?view=openplay&eventId=${event.id}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 2500);
    } catch (err) {
      console.warn('Share copy error:', err);
    }
  };

  // Tab & Filter states
  const [publicTab, setPublicTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [locationSearch, setLocationSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [companyLogosMap, setCompanyLogosMap] = useState<Record<string, string>>({});

  const fetchOpenPlayData = async () => {
    setLoading(true);
    let eventsList: OpenPlayEvent[] = [];
    let regsList: OpenPlayRegistration[] = [];
    const logosRecord: Record<string, string> = {};

    if (isFirebaseConfigured && db) {
      try {
        const cSnap = await getDocs(collection(db, 'companies'));
        cSnap.forEach((dSnap) => {
          const cData = dSnap.data();
          if (cData.logoUrl) {
            logosRecord[dSnap.id] = cData.logoUrl;
            if (cData.name) {
              logosRecord[cData.name.toLowerCase()] = cData.logoUrl;
            }
          }
        });

        const eSnap = await getDocs(collection(db, 'openplay_events'));
        eSnap.forEach((dSnap) => {
          eventsList.push(normalizeOpenPlayEvent(dSnap.id, dSnap.data()));
        });
        console.log('🌐 [Public OpenPlay Page] Loaded OP IDs from Cloud:', eventsList.map(e => e.id));

        const rSnap = await getDocs(collection(db, 'openplay_registrations'));
        rSnap.forEach((dSnap) => {
          regsList.push({ id: dSnap.id, ...dSnap.data() } as OpenPlayRegistration);
        });

        // Merge unified bookings collection
        try {
          const bSnap = await getDocs(collection(db, 'bookings'));
          bSnap.forEach((dSnap) => {
            const b = dSnap.data();
            if ((b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) && b.status !== 'cancelled') {
              const regId = dSnap.id;
              if (!regsList.some(r => r.id === regId)) {
                regsList.push({
                  id: regId,
                  eventId: b.openPlayEventId,
                  eventTitle: b.openPlayTitle || b.courtName,
                  playerUid: b.userId || b.user?.uid || '',
                  playerName: b.user?.name || b.userName || 'Player',
                  playerEmail: b.user?.email || b.userEmail || '',
                  playerPhone: b.userPhone,
                  playerCount: b.playerCount || 1,
                  guestCount: b.guestCount || (b.guests?.length || 0),
                  guests: b.guests || [],
                  guestNames: b.guestNames || [],
                  guestEmails: b.guestEmails || [],
                  gcashReferenceNumber: b.gcashReferenceNumber,
                  paymentStatus: b.paymentStatus || 'paid',
                  status: b.status || 'approved',
                  createdAt: b.createdAt || new Date().toISOString(),
                });
              }
            }
          });
        } catch (e) {}
      } catch (err) {
        console.warn('Error fetching Open Play data from Firestore:', err);
      }
    }

    const localCompStr = localStorage.getItem('picklepoint_companies');
    if (localCompStr) {
      try {
        const localComps = JSON.parse(localCompStr);
        localComps.forEach((c: any) => {
          if (c.logoUrl) {
            if (c.id) logosRecord[c.id] = c.logoUrl;
            if (c.name) logosRecord[c.name.toLowerCase()] = c.logoUrl;
          }
        });
      } catch (e) {}
    }
    setCompanyLogosMap(logosRecord);

    const localEStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
    const localEventsRaw = localEStr ? JSON.parse(localEStr) : [];
    const localEvents = localEventsRaw.map((e: any) => normalizeOpenPlayEvent(e.id || 'op-' + Date.now(), e));
    const eventsMap = new Map<string, OpenPlayEvent>();
    eventsList.forEach((e: any) => eventsMap.set(e.id, e));
    localEvents.forEach((e: any) => {
      eventsMap.set(e.id, e);
    });
    console.log('🌐 [Public OpenPlay Page] Displaying OP IDs:', Array.from(eventsMap.values()).map(e => e.id));

    if (regsList.length === 0) {
      const localRStr = localStorage.getItem('picklepoint_openplay_registrations');
      regsList = localRStr ? JSON.parse(localRStr) : [];
    }

    // Merge LocalStorage bookings into regsList as well
    try {
      const localBookingsStr = localStorage.getItem('picklepoint_bookings');
      if (localBookingsStr) {
        const localBookings = JSON.parse(localBookingsStr);
        localBookings.forEach((b: any) => {
          if ((b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) && b.status !== 'cancelled') {
            const regId = b.id || b.bookingReference;
            if (!regsList.some(r => r.id === regId)) {
              regsList.push({
                id: regId,
                eventId: b.openPlayEventId,
                eventTitle: b.openPlayTitle || b.courtName,
                playerUid: b.userId || b.user?.uid || '',
                playerName: b.user?.name || b.userName || 'Player',
                playerEmail: b.user?.email || b.userEmail || '',
                playerPhone: b.userPhone,
                playerCount: b.playerCount || 1,
                guestCount: b.guestCount || (b.guests?.length || 0),
                guests: b.guests || [],
                guestNames: b.guestNames || [],
                guestEmails: b.guestEmails || [],
                gcashReferenceNumber: b.gcashReferenceNumber,
                paymentStatus: b.paymentStatus || 'paid',
                status: b.status || 'approved',
                createdAt: b.createdAt || new Date().toISOString(),
              });
            }
          }
        });
      }
    } catch (e) {}

    setEvents(Array.from(eventsMap.values()).filter((e) => e.status !== 'cancelled'));
    setRegistrations(regsList);
    setLoading(false);
  };

  useEffect(() => {
    fetchOpenPlayData();
  }, []);

  const clearFilters = () => {
    setLocationSearch('');
    setCompanySearch('');
    setDateSearch('');
    setCategoryFilter('All');
  };

  const hasActiveFilters = Boolean(locationSearch || companySearch || dateSearch || categoryFilter !== 'All');

  const filteredEvents = events.filter((event) => {
    const isExpired = isEventExpired(event.eventDate, event.endTime) || event.status === 'expired' || event.status === 'completed';

    if (publicTab === 'upcoming' && isExpired) return false;
    if (publicTab === 'past' && !isExpired) return false;

    const matchesLocation =
      !locationSearch.trim() ||
      (event.location?.toLowerCase().includes(locationSearch.toLowerCase()) ?? false);

    const matchesCompany =
      !companySearch.trim() ||
      (event.companyName?.toLowerCase().includes(companySearch.toLowerCase()) ?? false) ||
      (event.title?.toLowerCase().includes(companySearch.toLowerCase()) ?? false);

    const matchesDate = !dateSearch || event.eventDate === dateSearch;

    const matchesCategory = categoryFilter === 'All' || event.category === categoryFilter;

    return matchesLocation && matchesCompany && matchesDate && matchesCategory;
  });

  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-[-10%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-[-10%] w-[45%] h-[45%] bg-brand-lime/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Header Section */}
        <div className="flex flex-col items-center text-center space-y-4 mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-xs font-bold text-brand-lime uppercase tracking-wider">
            <Trophy className="w-4 h-4" /> Open Play Community
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] font-sans">
            Join Social{' '}
            <span className="bg-gradient-to-r from-brand-lime via-brand-lime to-brand-emerald bg-clip-text text-transparent">
              Open Play Events
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Find nearby open play sessions, match with players of your skill level, level up your game, and reserve your spot instantly.
          </p>
        </div>

        {/* Multi-Criteria Filter Bar */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-5 md:p-6 mb-10 shadow-2xl animate-slide-up">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-brand-lime" /> Filter Open Play Sessions
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-brand-lime hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Search Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="e.g. Manila, Makati, Libmanan"
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>
            </div>

            {/* Organization / Company Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Company / Host
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="e.g. Metro Pickleball, Club A"
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Filter by Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={dateSearch}
                  onChange={(e) => setDateSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>
            </div>

            {/* Category / Skill Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Category / Skill Level
              </label>
              <div className="relative">
                <Filter className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-brand-lime transition-all cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Open to All">Open to All</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Doubles">Doubles</option>
                  <option value="Singles">Singles</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter Header */}
        <div className="flex justify-between items-center mb-6 px-1">
          <p className="text-sm font-medium text-slate-400">
            Available Sessions:{' '}
            <span className="text-brand-lime font-bold">{filteredEvents.length}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              setView('landing');
            }}
            className="text-xs text-slate-400 hover:text-brand-lime transition-colors flex items-center gap-1 cursor-pointer"
          >
            Need a private court? Book a court <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Tab Switcher: All vs Upcoming vs Past Sessions */}
        <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Sessions', icon: Trophy, count: events.filter(e => e.status !== 'cancelled').length },
              { id: 'upcoming', label: 'Upcoming Sessions', icon: Calendar, count: events.filter(e => !isEventExpired(e.eventDate, e.endTime) && e.status !== 'cancelled').length },
              { id: 'past', label: 'Past / Concluded', icon: Clock, count: events.filter(e => isEventExpired(e.eventDate, e.endTime) || e.status === 'expired' || e.status === 'completed').length },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = publicTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPublicTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-brand-lime text-dark-bg font-extrabold shadow-md shadow-brand-lime/10'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredEvents.length} {publicTab === 'upcoming' ? 'active' : 'concluded'} open play {filteredEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime animate-spin mb-4">
              <Trophy className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-400 font-medium">Loading Open Play sessions...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 sm:p-16 rounded-3xl glass-panel border border-slate-800 text-center animate-fade-in">
            <Trophy className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">
              {publicTab === 'upcoming' ? 'No Upcoming Open Play Sessions Found' : 'No Past Sessions Recorded'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              {publicTab === 'upcoming' 
                ? 'There are no active open play sessions matching your filter criteria. Try adjusting your search filters or check back later!'
                : 'There are no past or concluded open play sessions recorded yet.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-brand-lime font-semibold text-xs transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
              {publicTab === 'upcoming' && events.some(e => isEventExpired(e.eventDate, e.endTime) || e.status === 'expired' || e.status === 'completed') && (
                <button
                  type="button"
                  onClick={() => setPublicTab('past')}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-brand-lime/40 text-brand-lime font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-brand-lime" />
                  <span>View Past / Concluded Sessions ({events.filter(e => isEventExpired(e.eventDate, e.endTime) || e.status === 'expired' || e.status === 'completed').length})</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left animate-fade-in">
            {filteredEvents.map((event) => {
              const isExpired = isEventExpired(event.eventDate, event.endTime) || event.status === 'expired' || event.status === 'completed';
              const eventRegCount = registrations
                .filter((r) => r.eventId === event.id && r.status !== 'cancelled')
                .reduce((sum, r) => sum + (r.playerCount || 1), 0);
              const approvedCount = registrations
                .filter((r) => r.eventId === event.id && (r.status === 'approved' || r.paymentStatus === 'paid'))
                .reduce((sum, r) => sum + (r.playerCount || 1), 0);
              const pendingCount = registrations
                .filter((r) => r.eventId === event.id && (r.status === 'pending' || r.paymentStatus === 'pending_verification'))
                .reduce((sum, r) => sum + (r.playerCount || 1), 0);
              const availableSlots = Math.max(0, event.maxParticipants - eventRegCount);
              const isFull = availableSlots <= 0;

              const companyLogo = event.companyLogoUrl ||
                (event.companyId ? companyLogosMap[event.companyId] : undefined) ||
                (event.companyName ? companyLogosMap[event.companyName.toLowerCase()] : undefined);

              const durationStr = calculateEventDuration(event.startTime, event.endTime);

              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  className={`glass-panel rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 border group cursor-pointer ${
                    isExpired
                      ? 'border-slate-800/60 bg-slate-950/40 opacity-85 hover:border-slate-700'
                      : 'glass-panel-hover border-slate-800 hover:shadow-2xl hover:shadow-black/50 hover:border-brand-lime/50'
                  }`}
                >
                  <div>
                    {/* Event Poster / Banner */}
                    <div className="w-full aspect-[16/9] bg-slate-900 relative overflow-hidden">
                      {event.posterImageUrl ? (
                        <img
                          src={event.posterImageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : companyLogo ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-dark-bg relative">
                          <img
                            src={companyLogo}
                            alt={event.companyName || event.title}
                            className="max-h-24 max-w-[75%] object-contain mb-1 drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="text-[10px] font-extrabold text-brand-lime uppercase tracking-widest mt-1">
                            {event.companyName || 'Pickleball Open Play'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-dark-bg">
                          <Trophy className="w-10 h-10 text-brand-lime/40 mb-1" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Pickleball Open Play
                          </span>
                        </div>
                      )}

                      {/* Top-Right Share Button Overlay */}
                      <button
                        type="button"
                        onClick={(e) => handleShareEvent(e, event)}
                        title="Share Open Play Event"
                        className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-brand-lime backdrop-blur-md shadow-lg transition-all cursor-pointer hover:scale-110 z-10 flex items-center justify-center"
                      >
                        {copiedEventId === event.id ? (
                          <Check className="w-3.5 h-3.5 text-brand-lime" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Overlay Logo Avatar Badge when poster image is present */}
                      {event.posterImageUrl && companyLogo && (
                        <div className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-xl bg-slate-950/90 border border-slate-700/80 p-1 backdrop-blur-md shadow-lg flex items-center justify-center overflow-hidden">
                          <img src={companyLogo} alt={event.companyName} className="w-full h-full object-contain rounded-lg" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        {isExpired ? (
                          <div className="px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-md border border-amber-400/50 text-dark-bg text-[10px] font-black uppercase tracking-wider shadow">
                            ⏰ Concluded
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-brand-lime/30 text-brand-lime text-[10px] font-black uppercase tracking-wider shadow">
                            {event.category}
                          </div>
                        )}

                        {isFull && !isExpired && (
                          <div className="px-3 py-1 rounded-full bg-red-600/90 backdrop-blur-md border border-red-400/50 text-white text-[10px] font-black uppercase tracking-wider shadow animate-pulse">
                            🚫 FULL
                          </div>
                        )}

                        {event.isRecurring && (
                          <div className="px-2.5 py-0.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Weekly Series</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Information */}
                    <div className="p-5 space-y-3">
                      {event.companyName && (
                        <div className="text-xs sm:text-sm font-black text-brand-lime uppercase tracking-wider flex items-center gap-2.5 mb-1">
                          {companyLogo ? (
                            <img src={companyLogo} alt={event.companyName} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border-2 border-brand-lime/40 flex-shrink-0 shadow-md" />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime flex-shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}
                          <span className="truncate">{event.companyName}</span>
                        </div>
                      )}

                      <h3 className="text-lg font-extrabold text-white leading-snug group-hover:text-brand-lime transition-colors">
                        {event.title}
                      </h3>

                      {/* EMPHASIZED PRICE PER PLAYER & DURATION ROW */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 my-2">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-brand-lime flex-shrink-0" />
                          <span className="text-base font-black text-brand-lime">
                            {event.registrationFee > 0 ? `₱${event.registrationFee}` : 'FREE'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {event.registrationFee > 0 ? '/ player' : ''}
                          </span>
                        </div>
                        {durationStr && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                            <span>{durationStr}</span>
                          </div>
                        )}
                      </div>

                      {event.isRecurring && event.recurrencePattern && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300 bg-purple-950/30 border border-purple-800/40 px-2 py-0.5 rounded-lg">
                          <Repeat className="w-3 h-3 text-purple-400" />
                          <span>{event.recurrencePattern}</span>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                          <span className={`font-bold ${isExpired ? 'text-amber-400/90' : 'text-slate-200'}`}>
                            {formatEventDateLong(event.eventDate)} ({formatTime12h(event.startTime)} - {formatTime12h(event.endTime)})
                          </span>
                        </div>

                        {event.location && (() => {
                          const { primary, secondary } = splitAddressComponents(event.location);
                          return (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-brand-emerald flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-slate-300 leading-normal">
                                <div className="font-bold text-white">{primary}</div>
                                {secondary && (
                                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">{secondary}</div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {event.courtNames && event.courtNames.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                            <span className="truncate">
                              <strong className="text-white font-bold">{event.courtNames.length} {event.courtNames.length === 1 ? 'Court' : 'Courts'}:</strong> {event.courtNames.join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span className={isFull ? 'text-red-400 font-extrabold flex items-center gap-1' : 'text-slate-300 font-medium'}>
                            {eventRegCount} / {event.maxParticipants} Registered {isFull ? '• FULLY BOOKED' : `(${availableSlots} slots left)`}
                          </span>
                        </div>
                        {!isExpired && (approvedCount > 0 || pendingCount > 0) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {approvedCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-2 py-0.5 rounded-full">
                                ✓ {approvedCount} Confirmed
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                ⏳ {pendingCount} Pending
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="p-5 pt-0 mt-auto">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isFull && !isExpired}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event.id);
                        }}
                        className={`flex-grow py-3 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all text-center shadow-lg flex items-center justify-center gap-2 ${
                          isExpired
                            ? 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-850 hover:text-white cursor-pointer'
                            : isFull
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed select-none opacity-80'
                            : 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] shadow-brand-lime/10 hover:scale-[1.01] cursor-pointer'
                        }`}
                      >
                        <span>{isExpired ? 'View Concluded Session' : isFull ? 'FULL — SESSION BOOKED OUT' : 'View Details'}</span>
                        {!isFull && !isExpired && <ArrowRight className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleShareEvent(e, event)}
                        title="Share Event"
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-lime/50 text-slate-300 hover:text-brand-lime transition-all cursor-pointer hover:scale-105 shadow-md flex items-center justify-center flex-shrink-0 group/share"
                      >
                        {copiedEventId === event.id ? (
                          <span className="text-[10px] font-extrabold text-brand-lime flex items-center gap-1">
                            <Check className="w-4 h-4 text-brand-lime" /> Copied
                          </span>
                        ) : (
                          <Share2 className="w-4 h-4 group-hover/share:scale-110 transition-transform" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Notification when link is copied */}
      {copiedEventId && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-dark-bg px-4.5 py-3 rounded-2xl font-sans font-black text-xs shadow-2xl flex items-center gap-2.5 border border-white/20">
          <Check className="w-4 h-4 text-dark-bg" />
          <span>Event link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
