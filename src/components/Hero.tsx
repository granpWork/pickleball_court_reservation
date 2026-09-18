import { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Search,
  X,
  LayoutGrid,
  List,
  Clock,
  Building2,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Trophy,
  Users,
  Check,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  isEventExpired,
  calculateEventDuration,
  formatTime12h,
  formatEventDateLong,
  normalizeOpenPlayEvent,
  type OpenPlayEvent,
  type OpenPlayRegistration,
} from './OpenPlayDetails';
import { isSubscriptionExpired } from './admin/adminTypes';

interface Court {
  id: string;
  name: string;
  type: string;
  dayPrice: number;
  nightPrice: number;
  companyId?: string;
  ownerId?: string;
  ownerCompanyName?: string;
  companyName?: string;
  logoUrl?: string;
  ownerCompanyLogo?: string;
  location?: string;
  mapUrl?: string;
  images?: string[];
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  published?: boolean;
  latitude?: number;
  longitude?: number;
  rentals?: any[];
}

export interface VenueGroup {
  venueId: string;
  name: string;
  logoUrl?: string;
  location?: string;
  addressLine1?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  region?: string;
  coverImages: string[];
  courts: Court[];
  courtCount: number;
  minDayPrice: number;
  maxDayPrice: number;
  minNightPrice: number;
  maxNightPrice: number;
  courtTypes: string[];
  hasRentals: boolean;
}

interface HeroProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'venue_pricing') => void;
  setSelectedCourtId: (id: string, targetDate?: string) => void;
  searchDate: string;
  setSearchDate: (date: string) => void;
  onSelectOpenPlayEvent?: (eventId: string) => void;
}

export default function Hero({ setView, setSelectedCourtId, searchDate, setSearchDate, onSelectOpenPlayEvent }: HeroProps) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'dayPrice' | 'nightPrice' | 'courts'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Tab & Open Play States
  const [activeTab, setActiveTab] = useState<'courts' | 'openplay'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab === 'openplay' || urlTab === 'open_play') return 'openplay';
    }
    return 'courts';
  });

  const [openPlayEvents, setOpenPlayEvents] = useState<OpenPlayEvent[]>([]);
  const [openPlayRegistrations, setOpenPlayRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [openPlayLoading, setOpenPlayLoading] = useState<boolean>(true);
  const [openPlayCategoryFilter, _setOpenPlayCategoryFilter] = useState<string>('All');
  const [openPlayTab, setOpenPlayTab] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [companyLogosMap, setCompanyLogosMap] = useState<Record<string, string>>({});
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const handleShareEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?view=openplay&eventId=${eventId}`;
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
      setCopiedEventId(eventId);
      setTimeout(() => setCopiedEventId(null), 2500);
    } catch (err) {
      console.warn('Share copy error:', err);
    }
  };

  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsFocused(false);
    setIsDatePickerOpen(false);
    const resultsElement = document.getElementById('venues-results');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTabChange = (tab: 'courts' | 'openplay') => {
    setActiveTab(tab);
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) {}
  };

  const prevMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const renderMonthGrid = (year: number, monthIndex: number) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayIndex = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const monthName = new Date(year, monthIndex, 1).toLocaleString('default', { month: 'long' });

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`blank-${year}-${monthIndex}-${i}`} className="h-9" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = searchDate === dateStr;
      const isToday = todayStr === dateStr;

      days.push(
        <button
          key={dateStr}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSearchDate(dateStr);
            setIsDatePickerOpen(false);
          }}
          className={`h-9 w-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer mx-auto ${
            isSelected
              ? 'bg-brand-lime text-slate-950 font-black shadow-md shadow-brand-lime/20 scale-105'
              : isToday
              ? 'border border-brand-lime text-brand-lime bg-brand-lime/10 font-bold'
              : 'text-slate-200 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-center font-extrabold text-white text-sm tracking-wide">
          {monthName} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d} className="text-[10px] font-bold text-slate-500 uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setOpenPlayLoading(true);
    }
    try {
      if (isFirebaseConfigured && db) {
        try {
          const [querySnapshot, companiesSnapshot, eSnap, rSnap, bSnap] = await Promise.all([
            getDocs(collection(db, 'courts')),
            getDocs(collection(db, 'companies')).catch(() => null),
            getDocs(collection(db, 'openplay_events')).catch(() => null),
            getDocs(collection(db, 'openplay_registrations')).catch(() => null),
            getDocs(collection(db, 'bookings')).catch(() => null),
          ]);

          const companiesList: any[] = [];
          const logosRecord: Record<string, string> = {};
          if (companiesSnapshot) {
            companiesSnapshot.forEach((docSnap) => {
              const cData = docSnap.data();
              companiesList.push({ id: docSnap.id, ...cData });
              if (cData.logoUrl) {
                logosRecord[docSnap.id] = cData.logoUrl;
                if (cData.name) {
                  logosRecord[cData.name.toLowerCase()] = cData.logoUrl;
                }
              }
            });
          }
          setCompanyLogosMap(logosRecord);

          const firebaseCourts: Court[] = [];
          querySnapshot.forEach((docSnap) => {
            if (docSnap.id !== 'court-championship') {
              const data = docSnap.data();
              const matchedCompany = companiesList.find((comp: any) =>
                (data.companyId && comp.id === data.companyId) ||
                (data.ownerCompanyName && comp.name?.toLowerCase() === data.ownerCompanyName.toLowerCase()) ||
                (data.companyName && comp.name?.toLowerCase() === data.companyName.toLowerCase()) ||
                (data.ownerId && (comp.id === data.ownerId || comp.clientAdminEmail?.toLowerCase() === data.ownerId.toLowerCase()))
              );
              const resolvedLogo = data.logoUrl || data.ownerCompanyLogo || matchedCompany?.logoUrl || '';
              const resolvedCompName = matchedCompany?.name || data.ownerCompanyName || data.companyName || '';
              const isExpired = matchedCompany ? isSubscriptionExpired(matchedCompany) : false;

              firebaseCourts.push({
                id: docSnap.id,
                ...data,
                published: isExpired ? false : (data.published !== false),
                companyId: data.companyId || matchedCompany?.id || '',
                ownerCompanyName: resolvedCompName,
                companyName: resolvedCompName,
                logoUrl: resolvedLogo,
                ownerCompanyLogo: resolvedLogo,
                barangay: data.barangay || matchedCompany?.barangay || '',
                municipality: data.municipality || matchedCompany?.municipality || '',
                province: data.province || matchedCompany?.province || '',
                region: data.region || matchedCompany?.region || '',
              } as Court);
            }
          });
          setCourts(firebaseCourts);

          // Build Open Play Events (Merge Cloud + Local Storage for instant discovery)
          const eventsMap = new Map<string, OpenPlayEvent>();
          if (eSnap) {
            eSnap.forEach((dSnap) => {
              const norm = normalizeOpenPlayEvent(dSnap.id, dSnap.data());
              const matchedCourt = firebaseCourts.find((c) => norm.courtIds?.includes(c.id));
              const matchedComp = companiesList.find((comp: any) =>
                (norm.companyId && comp.id === norm.companyId) ||
                (matchedCourt?.companyId && comp.id === matchedCourt.companyId) ||
                (matchedCourt?.ownerCompanyName && comp.name?.toLowerCase() === matchedCourt.ownerCompanyName.toLowerCase())
              );
              if (matchedComp && isSubscriptionExpired(matchedComp)) {
                norm.status = 'draft';
              }
              eventsMap.set(norm.id, norm);
            });
          }

          const localEStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
          if (localEStr) {
            try {
              const localEventsRaw = JSON.parse(localEStr);
              localEventsRaw.forEach((e: any) => {
                const norm = normalizeOpenPlayEvent(e.id || 'op-' + Date.now(), e);
                const matchedCourt = firebaseCourts.find((c) => norm.courtIds?.includes(c.id));
                const matchedComp = companiesList.find((comp: any) =>
                  (norm.companyId && comp.id === norm.companyId) ||
                  (matchedCourt?.companyId && comp.id === matchedCourt.companyId) ||
                  (matchedCourt?.ownerCompanyName && comp.name?.toLowerCase() === matchedCourt.ownerCompanyName.toLowerCase())
                );
                if (matchedComp && isSubscriptionExpired(matchedComp)) {
                  norm.status = 'draft';
                }
                eventsMap.set(norm.id, norm);
              });
            } catch (err) {}
          }

          const eventsList = Array.from(eventsMap.values());

          const regsList: OpenPlayRegistration[] = [];
          if (rSnap) {
            rSnap.forEach((dSnap) => {
              regsList.push({ id: dSnap.id, ...dSnap.data() } as OpenPlayRegistration);
            });
          }

          if (bSnap) {
            bSnap.forEach((dSnap) => {
              const b = dSnap.data();
              if ((b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) && b.status !== 'cancelled') {
                const regId = dSnap.id;
                if (!regsList.some((r) => r.id === regId)) {
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

          setOpenPlayEvents(eventsList);
          setOpenPlayRegistrations(regsList);
        } catch (err) {
          console.error('Error fetching data from Firestore:', err);
          setCourts([]);
          setOpenPlayEvents([]);
        }
      } else {
        try {
          const courtsStr = localStorage.getItem('picklepoint_courts');
          const compStr = localStorage.getItem('picklepoint_companies');
          const localComps: any[] = compStr ? JSON.parse(compStr) : [];
          let localCourts = courtsStr ? JSON.parse(courtsStr) : [];
          localCourts = localCourts
            .filter((c: Court) => c.id !== 'court-championship')
            .map((c: any) => {
              const matchedComp = localComps.find((comp: any) =>
                (c.companyId && comp.id === c.companyId) ||
                (c.ownerCompanyName && comp.name?.toLowerCase() === c.ownerCompanyName.toLowerCase()) ||
                (c.companyName && comp.name?.toLowerCase() === c.companyName.toLowerCase()) ||
                (c.ownerId && (comp.id === c.ownerId || comp.clientAdminEmail?.toLowerCase() === c.ownerId.toLowerCase()))
              );
              const resolvedLogo = c.logoUrl || c.ownerCompanyLogo || matchedComp?.logoUrl || '';
              const resolvedCompName = matchedComp?.name || c.ownerCompanyName || c.companyName || '';
              return {
                ...c,
                companyId: c.companyId || matchedComp?.id || '',
                ownerCompanyName: resolvedCompName,
                companyName: resolvedCompName,
                logoUrl: resolvedLogo,
                ownerCompanyLogo: resolvedLogo,
                barangay: c.barangay || matchedComp?.barangay || '',
                municipality: c.municipality || matchedComp?.municipality || '',
                province: c.province || matchedComp?.province || '',
                region: c.region || matchedComp?.region || '',
              };
            });
          setCourts(localCourts);

          const localStr = localStorage.getItem('picklepoint_openplay_events');
          const localEventsRaw = localStr ? JSON.parse(localStr) : [];
          const localEvents = localEventsRaw.map((e: any) => normalizeOpenPlayEvent(e.id || 'op-' + Date.now(), e));
          setOpenPlayEvents(localEvents);
        } catch {
          setCourts([]);
          setOpenPlayEvents([]);
        }
      }
    } finally {
      setLoading(false);
      setOpenPlayLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const handleStorageUpdate = () => {
      fetchData(false);
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('openplay_updated', handleStorageUpdate);
    window.addEventListener('focus', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('openplay_updated', handleStorageUpdate);
      window.removeEventListener('focus', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (courts.length > 0) {
      const pendingCourtId = localStorage.getItem('picklepoint_pending_court_id');
      if (pendingCourtId) {
        const court = courts.find(c => c.id === pendingCourtId);
        if (court) {
          setSelectedCourtId(pendingCourtId);
          setSearchQuery(court.name);
          setView('details');
          localStorage.removeItem('picklepoint_pending_court_id');
        }
      }
    }
  }, [courts]);

  // Group published courts by Venue/Organization
  const venueGroups: VenueGroup[] = useMemo(() => {
    const publishedCourts = courts.filter((c) => c.published !== false);
    const groupMap = new Map<string, VenueGroup>();

    publishedCourts.forEach((c) => {
      const key = (c.companyId && c.companyId.trim()) ||
                  (c.ownerCompanyName && c.ownerCompanyName.trim().toLowerCase()) ||
                  (c.companyName && c.companyName.trim().toLowerCase()) ||
                  c.ownerId ||
                  c.id;

      const resolvedVenueName = c.ownerCompanyName || c.companyName || c.name || 'PicklePoint Venue';
      const resolvedLogo = c.logoUrl || c.ownerCompanyLogo || '';

      const existing = groupMap.get(key);
      if (!existing) {
        groupMap.set(key, {
          venueId: key,
          name: resolvedVenueName,
          logoUrl: resolvedLogo,
          location: c.location || '',
          addressLine1: c.addressLine1 || '',
          barangay: c.barangay || '',
          municipality: c.municipality || '',
          province: c.province || '',
          region: c.region || '',
          coverImages: Array.isArray(c.images) ? [...c.images] : [],
          courts: [c],
          courtCount: 1,
          minDayPrice: c.dayPrice || 100,
          maxDayPrice: c.dayPrice || 100,
          minNightPrice: c.nightPrice || 150,
          maxNightPrice: c.nightPrice || 150,
          courtTypes: c.type ? [c.type] : ['Standard Court'],
          hasRentals: Array.isArray(c.rentals) && c.rentals.some((r: any) => r.enabled),
        });
      } else {
        existing.courts.push(c);
        existing.courtCount += 1;
        existing.minDayPrice = Math.min(existing.minDayPrice, c.dayPrice || 100);
        existing.maxDayPrice = Math.max(existing.maxDayPrice, c.dayPrice || 100);
        existing.minNightPrice = Math.min(existing.minNightPrice, c.nightPrice || 150);
        existing.maxNightPrice = Math.max(existing.maxNightPrice, c.nightPrice || 150);
        if (c.type && !existing.courtTypes.includes(c.type)) {
          existing.courtTypes.push(c.type);
        }
        if (Array.isArray(c.images)) {
          c.images.forEach((img) => {
            if (img && !existing.coverImages.includes(img)) {
              existing.coverImages.push(img);
            }
          });
        }
        if (!existing.hasRentals && Array.isArray(c.rentals) && c.rentals.some((r: any) => r.enabled)) {
          existing.hasRentals = true;
        }
      }
    });

    return Array.from(groupMap.values());
  }, [courts]);

  const filteredVenues = useMemo(() => {
    return venueGroups.filter((vg) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const cat = selectedCategory.toLowerCase();
        const matchesCategory = vg.courtTypes.some((t) => t.toLowerCase().includes(cat)) ||
                                (cat === 'indoor' && vg.name.toLowerCase().includes('indoor')) ||
                                (cat === 'outdoor' && vg.name.toLowerCase().includes('outdoor')) ||
                                (cat === 'multi-court' && vg.courtCount > 1);
        if (!matchesCategory) return false;
      }

      // Search Query filter (matches venue name, location, municipality, province, or court names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = vg.name.toLowerCase().includes(q);
        const matchesLocation = vg.location?.toLowerCase().includes(q);
        const matchesMunicipality = vg.municipality?.toLowerCase().includes(q);
        const matchesProvince = vg.province?.toLowerCase().includes(q);
        const matchesBarangay = vg.barangay?.toLowerCase().includes(q);
        const matchesCourts = vg.courts.some(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));

        if (!matchesName && !matchesLocation && !matchesMunicipality && !matchesProvince && !matchesBarangay && !matchesCourts) {
          return false;
        }
      }

      return true;
    });
  }, [venueGroups, selectedCategory, searchQuery]);

  const sortedVenues = useMemo(() => {
    return [...filteredVenues].sort((a, b) => {
      if (sortBy === 'dayPrice') {
        return a.minDayPrice - b.minDayPrice;
      }
      if (sortBy === 'nightPrice') {
        return a.minNightPrice - b.minNightPrice;
      }
      if (sortBy === 'courts') {
        return b.courtCount - a.courtCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredVenues, sortBy]);

  // Filtered Open Play Events
  const filteredOpenPlayEvents = useMemo(() => {
    return openPlayEvents.filter((event) => {
      // Ignore cancelled or draft status events unless active
      if (event.status === 'cancelled' || event.status === 'draft') {
        return false;
      }

      // 1. Status & Expired Filter
      const isExpired = isEventExpired(event.eventDate, event.endTime) || event.status === 'expired' || event.status === 'completed';
      if (openPlayTab === 'upcoming' && isExpired) {
        return false;
      }
      if (openPlayTab === 'past' && !isExpired) {
        return false;
      }

      // 2. Location & Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = event.title?.toLowerCase().includes(q);
        const locMatch = event.location?.toLowerCase().includes(q);
        const companyMatch = event.companyName?.toLowerCase().includes(q);
        const descMatch = event.description?.toLowerCase().includes(q);
        const categoryMatch = event.category?.toLowerCase().includes(q);
        const courtNamesMatch = event.courtNames?.some(c => c.toLowerCase().includes(q));

        // Match assigned court location fields (municipality, province, barangay, location)
        const assignedCourts = courts.filter(c => event.courtIds?.includes(c.id));
        const courtAddrMatch = assignedCourts.some(c =>
          c.name?.toLowerCase().includes(q) ||
          c.municipality?.toLowerCase().includes(q) ||
          c.province?.toLowerCase().includes(q) ||
          c.barangay?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q)
        );

        if (!titleMatch && !locMatch && !companyMatch && !descMatch && !categoryMatch && !courtNamesMatch && !courtAddrMatch) {
          return false;
        }
      }

      // 3. Target Date Filter
      if (searchDate) {
        if (event.eventDate !== searchDate) {
          return false;
        }
      }

      // 4. Category Filter
      if (openPlayCategoryFilter !== 'All') {
        if (event.category !== openPlayCategoryFilter && event.skillLevel !== openPlayCategoryFilter) {
          return false;
        }
      }

      return true;
    });
  }, [openPlayEvents, openPlayTab, searchQuery, searchDate, openPlayCategoryFilter, courts]);

  return (
    <section className="relative z-20 pt-32 pb-24 md:pt-40 md:pb-36 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-emerald/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-lime/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative transition-all duration-300 ${isFocused || isDatePickerOpen ? 'z-40' : 'z-10'}`}>
        <div className="flex flex-col items-center text-center gap-12">
          
          {/* 1. Hero Search Section */}
          <div className="max-w-3xl flex flex-col items-center text-center space-y-4 animate-fade-in">

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] font-sans">
              Reserve Your Court.<br />
              <span className="bg-gradient-to-r from-brand-lime via-brand-lime to-brand-emerald bg-clip-text text-transparent">
                Rule the Kitchen.
              </span>
            </h1>
          </div>

          {/* Sticky Spotlight Search Bar Container */}
          <div id="booking-widget" className={`w-full max-w-6xl sticky top-[76px] sm:top-[96px] transition-all duration-300 animate-slide-up ${isFocused || isDatePickerOpen ? 'z-50' : 'z-30'}`}>
            <form onSubmit={handleExecuteSearch} className="relative group">
              {/* Outer floating search wrapper */}
              <div 
                className={`w-full rounded-2xl bg-slate-900/80 backdrop-blur-2xl p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 sm:gap-3 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.65)] border border-slate-800/80 ${
                  isFocused 
                    ? 'shadow-[0_20px_50px_rgba(181,245,41,0.08)] border-brand-lime/30' 
                    : 'hover:border-slate-700/80'
                }`}
              >
                {/* Field 1: Location & Venue Search */}
                <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 focus-within:border-brand-lime/50 transition-all">
                  <MapPin className="w-4 h-4 text-brand-lime shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                      Search Location / Venue / Host
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="City, province, court, or host..."
                      className="w-full bg-transparent text-white text-xs sm:text-sm font-semibold focus:outline-none placeholder-slate-500 truncate"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Field 2: Target Booking Date */}
                <div 
                  onClick={() => {
                    setIsDatePickerOpen(!isDatePickerOpen);
                    setIsFocused(false);
                  }}
                  className="flex-1 flex items-center gap-3 px-3.5 py-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-blue-400/50 focus-within:border-brand-lime/50 transition-all cursor-pointer group/date"
                >
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0 group-hover/date:text-brand-lime transition-colors" />
                  <div className="flex-1 min-w-0 text-left">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 cursor-pointer">
                      Target Date
                    </label>
                    <span className={`text-xs sm:text-sm font-bold block truncate ${searchDate ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                      {searchDate ? (
                        new Date(searchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      ) : (
                        'Select target date...'
                      )}
                    </span>
                  </div>
                  {searchDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchDate('');
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Field 3: Search Action Button */}
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-brand-lime text-slate-950 font-black text-xs sm:text-sm hover:bg-lime-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-lime/20 shrink-0 group/btn"
                >
                  <Search className="w-4 h-4 text-slate-950 group-hover/btn:scale-110 transition-transform" />
                  <span>Search</span>
                </button>
              </div>

              {/* DUAL-MONTH CALENDAR PANEL POP-OVER */}
              {isDatePickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                  <div className="absolute top-20 right-0 sm:right-auto sm:left-1/3 z-[60] glass-panel bg-slate-950/95 border border-slate-800/90 rounded-3xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-fade-in text-left w-full max-w-2xl">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-lime" />
                        <h4 className="text-sm font-extrabold text-white">Select Target Date</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
                          title="Previous Month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
                          title="Next Month"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDatePickerOpen(false)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Dual Month Grids Side-by-Side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {/* Month 1 */}
                      {renderMonthGrid(calendarViewDate.getFullYear(), calendarViewDate.getMonth())}

                      {/* Month 2 */}
                      {renderMonthGrid(
                        calendarViewDate.getMonth() === 11 ? calendarViewDate.getFullYear() + 1 : calendarViewDate.getFullYear(),
                        (calendarViewDate.getMonth() + 1) % 12
                      )}
                    </div>

                    {/* Quick Selection Shortcuts */}
                    <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            setSearchDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                            setIsDatePickerOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-brand-lime/10 text-slate-300 hover:text-brand-lime border border-slate-800 transition-all cursor-pointer font-bold"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 86400000);
                            setSearchDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                            setIsDatePickerOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-brand-lime/10 text-slate-300 hover:text-brand-lime border border-slate-800 transition-all cursor-pointer font-bold"
                        >
                          Tomorrow
                        </button>
                      </div>
                      {searchDate && (
                        <button
                          type="button"
                          onClick={() => setSearchDate('')}
                          className="text-rose-400 hover:text-rose-300 font-bold underline underline-offset-2 cursor-pointer"
                        >
                          Clear Date
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Floating Dropdown Suggestions Panel */}
              {isFocused && venueGroups.length > 0 && (
                <div className="absolute top-20 left-0 right-0 glass-panel rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.85)] border border-slate-800/80 backdrop-blur-2xl bg-slate-950/95 z-[60] animate-fade-in text-left">
                  {!searchQuery.trim() ? (
                    <div className="p-6 space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Popular Categories
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['All', 'Indoor', 'Outdoor', 'Multi-Court', 'Premium'].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat);
                                setIsFocused(true);
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                selectedCategory === cat
                                  ? 'bg-brand-lime text-dark-bg font-sans'
                                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:bg-slate-850 hover:text-white'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-900">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Recent Searches
                          </h4>
                          <div className="space-y-1">
                            {['Libmanan', 'Camarines Sur', 'Multi-Court'].map((term) => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => {
                                  setSearchQuery(term);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-900 hover:text-brand-lime transition-all flex items-center gap-2 cursor-pointer font-sans"
                              >
                                <Clock className="w-3.5 h-3.5 opacity-60" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Trending Venues
                          </h4>
                          <div className="space-y-1">
                            {['PicklePoint Hub', 'Plexicushion', 'Indoor Courts'].map((term) => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => {
                                  setSearchQuery(term);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-900 hover:text-brand-lime transition-all flex items-center gap-2 cursor-pointer font-sans"
                              >
                                <Search className="w-3.5 h-3.5 text-brand-lime/75" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 max-h-[360px] overflow-y-auto pr-1">
                      <div className="px-3 py-2 border-b border-slate-900/60 mb-2 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Venues ({filteredVenues.length})
                        </span>
                      </div>
                      {filteredVenues.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-500">
                          No matching venues found for "{searchQuery}".
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredVenues.map((v) => (
                            <button
                              key={v.venueId}
                              type="button"
                              onClick={() => {
                                if (v.courts.length > 0) {
                                  setSelectedCourtId(v.courts[0].id, searchDate);
                                  setView('details');
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900/90 transition-all flex items-center gap-4 group cursor-pointer"
                            >
                              {v.coverImages.length > 0 ? (
                                <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-800">
                                  <img
                                    src={v.coverImages[0]}
                                    alt={v.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              ) : (
                                <div className="w-14 h-10 rounded-lg flex-shrink-0 bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                                  <Building2 className="w-4 h-4" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs group-hover:text-brand-lime transition-colors block truncate">
                                    {v.name}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-lime/10 text-brand-lime font-bold border border-brand-lime/20 flex items-center gap-1">
                                    <Layers className="w-2.5 h-2.5" />
                                    {v.courtCount} {v.courtCount === 1 ? 'Court' : 'Courts'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                  {[v.barangay, v.municipality, v.province].filter(Boolean).join(', ') || v.location || 'Location details not set.'}
                                </span>
                              </div>

                              <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[11px] font-extrabold text-brand-lime font-sans">
                                  From ₱{v.minDayPrice}/hr
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Results Header section & Segmented Tab Switcher */}
          <div id="venues-results" className="w-full mt-6 text-left scroll-mt-24">
            
            {/* Segmented View Switcher Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleTabChange('courts')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2.5 ${
                    activeTab === 'courts'
                      ? 'bg-brand-lime text-slate-950 shadow-md shadow-brand-lime/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Book Courts</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'courts' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {sortedVenues.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('openplay')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2.5 ${
                    activeTab === 'openplay'
                      ? 'bg-brand-lime text-slate-950 shadow-md shadow-brand-lime/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Open Play</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'openplay' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {filteredOpenPlayEvents.length}
                  </span>
                </button>
              </div>

              {/* Active Filter Chips */}
              {(searchQuery || searchDate) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Active Filters:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-brand-lime/30 text-xs text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-brand-lime" />
                      <span>"{searchQuery}"</span>
                      <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white cursor-pointer ml-1">
                        <X className="w-3 h-3 text-rose-400" />
                      </button>
                    </span>
                  )}
                  {searchDate && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-blue-500/30 text-xs text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Target: {searchDate}</span>
                      <button type="button" onClick={() => setSearchDate('')} className="text-slate-400 hover:text-white cursor-pointer ml-1">
                        <X className="w-3 h-3 text-rose-400" />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchDate('');
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Court View Controls (Visible when activeTab === 'courts') */}
              {activeTab === 'courts' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      showFilterOptions || selectedCategory !== 'All' || sortBy !== 'relevance'
                        ? 'bg-brand-lime text-slate-950 border-brand-lime shadow-md shadow-brand-lime/20 font-extrabold'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800/80 hover:text-white'
                    }`}
                    title="Toggle Filter Options"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {(selectedCategory !== 'All' || sortBy !== 'relevance') && (
                      <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse ml-0.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-brand-lime text-dark-bg font-bold shadow-md shadow-brand-lime/5'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-brand-lime text-dark-bg font-bold shadow-md shadow-brand-lime/5'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Open Play View Controls (Visible when activeTab === 'openplay') */}
              {activeTab === 'openplay' && (
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                    { id: 'all', label: 'All Sessions', icon: Trophy },
                    { id: 'past', label: 'Past', icon: Clock },
                  ].map((tabItem) => {
                    const Icon = tabItem.icon;
                    const isActive = openPlayTab === tabItem.id;
                    return (
                      <button
                        key={tabItem.id}
                        type="button"
                        onClick={() => setOpenPlayTab(tabItem.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-brand-lime text-slate-950 font-extrabold shadow-sm'
                            : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tabItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collapsible Filter Options Panel (For Courts) */}
            {activeTab === 'courts' && showFilterOptions && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 overflow-x-auto scrollbar-none max-w-full">
                  {['All', 'Indoor', 'Outdoor', 'Multi-Court', 'Premium'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-brand-lime text-dark-bg font-sans shadow-md shadow-brand-lime/10'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 flex-shrink-0 uppercase tracking-wider">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800/80 text-slate-200 text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-brand-lime transition-all cursor-pointer"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="dayPrice">Price: Low to High</option>
                    <option value="nightPrice">Night Rate: Low to High</option>
                    <option value="courts">Most Courts</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Tab Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full text-left">
          
          {/* TAB 1: COURTS GRID / LIST */}
          {activeTab === 'courts' && (
            <>
              {loading ? (
                <div className="py-8 space-y-8">
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-brand-lime animate-spin"></div>
                      <div className="absolute w-7 h-7 rounded-full bg-brand-lime/10 animate-ping"></div>
                      <div className="absolute text-xs select-none">🏓</div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Discovering Pickleball Venues...</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Checking real-time organization courts and slot availability</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={`skeleton-${n}`}
                        className="glass-panel rounded-2xl overflow-hidden text-left flex flex-col justify-between p-0 animate-pulse border border-slate-850"
                      >
                        <div className="w-full aspect-video bg-slate-900/80"></div>
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/40">
                            <div className="w-8 h-8 rounded-xl bg-slate-850"></div>
                            <div className="h-3.5 bg-slate-850 rounded-lg w-28"></div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="h-4 bg-slate-850 rounded-lg w-32"></div>
                            <div className="h-4 bg-slate-850 rounded-lg w-12"></div>
                          </div>
                          <div className="h-3 bg-slate-850/60 rounded w-48"></div>
                          <div className="h-3 bg-slate-850/40 rounded w-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : sortedVenues.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center animate-fade-in min-h-[300px]">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 mb-6 shadow-inner animate-bounce">
                    <Search className="w-8 h-8 text-brand-lime/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No venues found.</h3>
                  <p className="text-sm font-normal text-slate-400 max-w-[280px] leading-relaxed mb-6">
                    We couldn't find venues matching your criteria. Try adjusting your search keywords or target date.
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedVenues.map((v) => (
                    <div
                      key={v.venueId}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (v.courts.length > 0) {
                          setSelectedCourtId(v.courts[0].id, searchDate);
                          setView('details');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (v.courts.length > 0) {
                            setSelectedCourtId(v.courts[0].id, searchDate);
                            setView('details');
                          }
                        }
                      }}
                      className="glass-panel glass-panel-hover group rounded-2xl overflow-hidden text-left flex flex-col justify-between hover:shadow-2xl hover:shadow-black/50 hover:border-brand-lime/30 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-lime/50"
                    >
                      <div>
                        <div className="w-full aspect-video overflow-hidden bg-slate-900 relative">
                          {v.coverImages && v.coverImages.length > 0 ? (
                            <img
                              src={v.coverImages[0]}
                              alt={v.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-900 border-b border-slate-800/80 flex items-center justify-center text-slate-600">
                              <Building2 className="w-10 h-10 text-slate-700" />
                            </div>
                          )}

                          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-bg/85 backdrop-blur-md border border-slate-700/80 shadow-md">
                            <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></span>
                            <span className="text-[11px] font-black text-white">
                              {v.courtCount} {v.courtCount === 1 ? 'Court' : 'Courts'}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-3.5">
                          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/60">
                            {v.logoUrl ? (
                              <img
                                src={v.logoUrl}
                                alt={v.name}
                                className="w-8 h-8 rounded-xl object-cover border border-slate-700/80 bg-slate-900 shadow-md flex-shrink-0"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/25 flex items-center justify-center text-brand-lime flex-shrink-0 shadow-sm">
                                <Building2 className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-bold text-white group-hover:text-brand-lime transition-colors block truncate">
                                {v.name}
                              </h3>
                            </div>
                          </div>

                          <p className="text-sm font-normal text-slate-400 flex items-start gap-1.5 line-clamp-2 min-h-[32px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                            <span>
                              {[v.barangay, v.municipality, v.province].filter(Boolean).join(', ') || v.location || 'Location details not set.'}
                            </span>
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {v.courts.slice(0, 3).map((courtItem, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCourtId(courtItem.id, searchDate);
                                  setView('details');
                                }}
                                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-brand-lime/40 font-medium truncate max-w-[130px] cursor-pointer transition-colors"
                              >
                                🎾 {courtItem.name}
                              </button>
                            ))}
                            {v.courts.length > 3 && (
                              <span className="text-[10px] text-slate-500 font-bold">
                                +{v.courts.length - 3} more
                              </span>
                            )}
                          </div>

                          <div className="pt-3.5 border-t border-slate-800/60 flex justify-between items-center text-xs">
                            <span className="text-sm font-medium text-slate-500">Hourly Rate</span>
                            <span className="text-brand-lime font-semibold font-sans text-base">
                              {v.minDayPrice === v.maxNightPrice ? (
                                `₱${v.minDayPrice}`
                              ) : (
                                `₱${v.minDayPrice} - ₱${v.maxNightPrice}`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 pt-0">
                        <div className="w-full py-3 bg-slate-900 group-hover:bg-brand-lime text-white group-hover:text-dark-bg text-base font-semibold rounded-xl transition-all text-center border border-slate-800 group-hover:border-brand-lime font-sans shadow-sm flex items-center justify-center gap-2">
                          <span>{v.courtCount > 1 ? 'View Courts & Reserve' : 'Reserve Court'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedVenues.map((v) => (
                    <div
                      key={v.venueId}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (v.courts.length > 0) {
                          setSelectedCourtId(v.courts[0].id, searchDate);
                          setView('details');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (v.courts.length > 0) {
                            setSelectedCourtId(v.courts[0].id, searchDate);
                            setView('details');
                          }
                        }
                      }}
                      className="glass-panel glass-panel-hover group rounded-2xl overflow-hidden text-left flex flex-col md:flex-row hover:shadow-2xl hover:shadow-black/50 hover:border-brand-lime/30 transition-all duration-300 gap-6 p-5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-lime/50"
                    >
                      <div className="w-full md:w-64 aspect-video md:aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 relative flex-shrink-0">
                        {v.coverImages && v.coverImages.length > 0 ? (
                          <img
                            src={v.coverImages[0]}
                            alt={v.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-600">
                            <Building2 className="w-10 h-10 text-slate-700" />
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-dark-bg/85 backdrop-blur-md border border-slate-700/80 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-lime"></span>
                          <span className="text-[10px] font-black text-white">
                            {v.courtCount} {v.courtCount === 1 ? 'Court' : 'Courts'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 pb-2 border-b border-slate-800/60">
                            {v.logoUrl ? (
                              <img
                                src={v.logoUrl}
                                alt={v.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700/80 bg-slate-900 shadow-md flex-shrink-0"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/25 flex items-center justify-center text-brand-lime flex-shrink-0 shadow-sm">
                                <Building2 className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xl font-bold text-white group-hover:text-brand-lime transition-colors block truncate">
                                {v.name}
                              </h3>
                            </div>
                            <span className="text-brand-lime font-semibold font-sans text-base flex-shrink-0">
                              {v.minDayPrice === v.maxNightPrice ? `₱${v.minDayPrice}/hr` : `₱${v.minDayPrice} - ₱${v.maxNightPrice}/hr`}
                            </span>
                          </div>

                          <p className="text-sm font-normal text-slate-350 flex items-start gap-1.5 leading-relaxed">
                            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <span>
                              {[v.barangay, v.municipality, v.province].filter(Boolean).join(', ') || v.location || 'Location details not set.'}
                            </span>
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {v.courts.map((cItem, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCourtId(cItem.id, searchDate);
                                  setView('details');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-brand-lime/40 font-medium cursor-pointer transition-colors"
                              >
                                🎾 {cItem.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end mt-4 md:mt-2">
                          <div className="px-6 py-2.5 bg-slate-900 group-hover:bg-brand-lime text-white group-hover:text-dark-bg text-base font-semibold rounded-xl transition-all border border-slate-800 group-hover:border-brand-lime font-sans shadow-sm flex items-center gap-2">
                            <span>{v.courtCount > 1 ? 'View Venue & Choose Court' : 'Reserve Court'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: OPEN PLAY SESSIONS GRID */}
          {activeTab === 'openplay' && (
            <>
              {openPlayLoading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime animate-spin mb-4">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">Loading Open Play sessions...</p>
                </div>
              ) : filteredOpenPlayEvents.length === 0 ? (
                <div className="p-12 sm:p-16 rounded-3xl glass-panel border border-slate-800 text-center">
                  <Trophy className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">
                    No Open Play Sessions Found
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                    {searchQuery || searchDate
                      ? 'There are no open play sessions matching your location or target date filter. Try clearing active filters or searching for another location.'
                      : 'There are currently no active open play sessions available.'}
                  </p>
                  {(searchQuery || searchDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchDate('');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-brand-lime/40 text-brand-lime font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Clear Search Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  {filteredOpenPlayEvents.map((event) => {
                    const isExpired = isEventExpired(event.eventDate, event.endTime) || event.status === 'expired' || event.status === 'completed';
                    const eventRegCount = openPlayRegistrations
                      .filter((r) => r.eventId === event.id && r.status !== 'cancelled')
                      .reduce((sum, r) => sum + (r.playerCount || 1), 0);
                    const availableSlots = Math.max(0, event.maxParticipants - eventRegCount);
                    const isFull = availableSlots <= 0;

                    const companyLogo = event.companyLogoUrl ||
                      (event.companyId ? companyLogosMap[event.companyId] : undefined) ||
                      (event.companyName ? companyLogosMap[event.companyName.toLowerCase()] : undefined);

                    const assignedCourts = courts.filter(c => event.courtIds?.includes(c.id));
                    const courtCover = assignedCourts.find(c => Array.isArray(c.images) && c.images.length > 0)?.images?.[0];
                    const displayBanner = event.posterImageUrl || courtCover;

                    const durationStr = calculateEventDuration(event.startTime, event.endTime);

                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          if (onSelectOpenPlayEvent) {
                            onSelectOpenPlayEvent(event.id);
                          } else {
                            setView('openplay');
                          }
                        }}
                        className={`glass-panel rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 border group cursor-pointer ${
                          isExpired
                            ? 'border-slate-800/60 bg-slate-950/40 opacity-85 hover:border-slate-700'
                            : 'glass-panel-hover border-slate-800 hover:shadow-2xl hover:shadow-black/50 hover:border-brand-lime/50'
                        }`}
                      >
                        <div>
                          {/* Event Poster / Banner Image */}
                          <div className="w-full aspect-[16/9] bg-slate-900 relative overflow-hidden border-b border-slate-800/80">
                            {displayBanner ? (
                              <img
                                src={displayBanner}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : companyLogo ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-dark-bg relative">
                                <img
                                  src={companyLogo}
                                  alt={event.companyName || event.title}
                                  className="max-h-20 max-w-[70%] object-contain mb-1 drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
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

                            {/* Share button overlay */}
                            <button
                              type="button"
                              onClick={(e) => handleShareEvent(e, event.id)}
                              title="Share Event"
                              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-brand-lime backdrop-blur-md shadow-lg transition-all cursor-pointer hover:scale-110 z-10 flex items-center justify-center"
                            >
                              {copiedEventId === event.id ? (
                                <Check className="w-3.5 h-3.5 text-brand-lime" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Host Avatar Badge (When poster image is present) */}
                            {displayBanner && companyLogo && (
                              <div className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-xl bg-slate-950/90 border border-slate-700/80 p-1 backdrop-blur-md shadow-lg flex items-center justify-center overflow-hidden">
                                <img src={companyLogo} alt={event.companyName} className="w-full h-full object-contain rounded-lg" />
                              </div>
                            )}

                            {/* Top Left Category Pill */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                                event.category === 'Beginner' ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/30' :
                                event.category === 'Intermediate' ? 'bg-amber-950/90 text-amber-400 border border-amber-500/30' :
                                event.category === 'Advanced' ? 'bg-rose-950/90 text-rose-400 border border-rose-500/30' :
                                'bg-slate-950/90 text-brand-lime border border-brand-lime/30'
                              }`}>
                                {event.category || 'Open to All'}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 space-y-4">
                            {/* Host info */}
                            <div className="flex items-center gap-2 min-w-0">
                              {companyLogo ? (
                                <img src={companyLogo} alt={event.companyName || 'Host'} className="w-6 h-6 rounded-md object-cover bg-slate-900 border border-slate-800 shrink-0" />
                              ) : (
                                <Building2 className="w-4 h-4 text-brand-lime shrink-0" />
                              )}
                              <span className="text-xs font-bold text-slate-300 truncate">
                                {event.companyName || 'PicklePoint Host'}
                              </span>
                            </div>

                            {/* Event Title & Details */}
                            <div>
                              <h3 className="text-base font-extrabold text-white group-hover:text-brand-lime transition-colors line-clamp-2">
                                {event.title}
                              </h3>
                              <div className="mt-2.5 space-y-1.5 text-xs text-slate-400">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>{formatEventDateLong(event.eventDate)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                                  <span>{formatTime12h(event.startTime)} - {formatTime12h(event.endTime)} ({durationStr})</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Player spots bar */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-900">
                              <div className="flex justify-between items-center text-[11px] font-semibold">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-brand-lime" />
                                  <span>{eventRegCount} / {event.maxParticipants} Players</span>
                                </span>
                                <span className={isFull ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {isFull ? 'Session Full' : `${availableSlots} spots left`}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isFull ? 'bg-rose-500' : 'bg-brand-lime'
                                  }`}
                                  style={{ width: `${Math.min(100, (eventRegCount / event.maxParticipants) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action */}
                        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Registration Fee</span>
                            <span className="text-sm font-extrabold text-brand-lime font-sans">
                              ₱{event.registrationFee} <span className="text-[10px] text-slate-400 font-medium">/ player</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isExpired
                                ? 'bg-slate-900 text-slate-500 border border-slate-800'
                                : isFull
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                                : 'bg-brand-lime text-slate-950 font-black hover:bg-lime-400 shadow-md shadow-brand-lime/20'
                            }`}
                          >
                            <span>{isExpired ? 'Concluded' : isFull ? 'Join Waitlist' : 'Join Session'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </section>
  );
}
