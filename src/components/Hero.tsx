import { useState, useEffect, useMemo } from 'react';
import { MapPin, Search, X, LayoutGrid, List, Clock, Building2, Layers } from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

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
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp') => void;
  setSelectedCourtId: (id: string) => void;
}

export default function Hero({ setView, setSelectedCourtId }: HeroProps) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'dayPrice' | 'nightPrice' | 'courts'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchCourts = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && db) {
        try {
          const [querySnapshot, companiesSnapshot] = await Promise.all([
            getDocs(collection(db, 'courts')),
            getDocs(collection(db, 'companies')).catch(() => null)
          ]);

          const companiesList: any[] = [];
          if (companiesSnapshot) {
            companiesSnapshot.forEach((docSnap) => {
              companiesList.push({ id: docSnap.id, ...docSnap.data() });
            });
          }

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

              firebaseCourts.push({
                id: docSnap.id,
                ...data,
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
        } catch (err) {
          console.error('Error fetching courts from Firestore:', err);
          setCourts([]);
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
          localStorage.setItem('picklepoint_courts', JSON.stringify(localCourts));
          
          setCourts(localCourts);
        } catch {
          setCourts([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourts();
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

  // Group published courts by Company/Organization/Venue
  const venueGroups: VenueGroup[] = useMemo(() => {
    const publishedCourts = courts.filter((c) => c.published !== false);
    const groupMap = new Map<string, VenueGroup>();

    publishedCourts.forEach((c) => {
      // Key grouping by companyId, or companyName, or ownerId, or court id
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
        existing.courtCount = existing.courts.length;
        if (c.dayPrice && c.dayPrice < existing.minDayPrice) existing.minDayPrice = c.dayPrice;
        if (c.dayPrice && c.dayPrice > existing.maxDayPrice) existing.maxDayPrice = c.dayPrice;
        if (c.nightPrice && c.nightPrice < existing.minNightPrice) existing.minNightPrice = c.nightPrice;
        if (c.nightPrice && c.nightPrice > existing.maxNightPrice) existing.maxNightPrice = c.nightPrice;
        if (c.type && !existing.courtTypes.includes(c.type)) existing.courtTypes.push(c.type);
        if (Array.isArray(c.rentals) && c.rentals.some((r: any) => r.enabled)) existing.hasRentals = true;
        if (Array.isArray(c.images)) {
          c.images.forEach((img: string) => {
            if (img && !existing.coverImages.includes(img)) existing.coverImages.push(img);
          });
        }
        if (!existing.logoUrl && resolvedLogo) existing.logoUrl = resolvedLogo;
        if (!existing.barangay && c.barangay) existing.barangay = c.barangay;
        if (!existing.municipality && c.municipality) existing.municipality = c.municipality;
        if (!existing.province && c.province) existing.province = c.province;
      }
    });

    return Array.from(groupMap.values());
  }, [courts]);

  const filteredVenues = useMemo(() => {
    return venueGroups.filter((v) => {
      const hasIndoor = v.courtTypes.some((t) => t.toLowerCase().includes('indoor'));
      const hasOutdoor = v.courtTypes.some((t) => t.toLowerCase().includes('outdoor'));
      const hasPremium = v.courtTypes.some((t) => t.toLowerCase().includes('premium')) || v.minDayPrice >= 100;
      const isMultiCourt = v.courtCount > 1;

      const matchesCategory = selectedCategory === 'All' || 
        (selectedCategory === 'Indoor' && hasIndoor) ||
        (selectedCategory === 'Outdoor' && hasOutdoor) ||
        (selectedCategory === 'Multi-Court' && isMultiCourt) ||
        (selectedCategory === 'Premium' && hasPremium);

      if (!searchQuery.trim()) return matchesCategory;
      const query = searchQuery.toLowerCase();
      
      const nameMatch = v.name.toLowerCase().includes(query);
      const courtNameMatch = v.courts.some((c) => c.name.toLowerCase().includes(query));
      const typeMatch = v.courtTypes.some((t) => t.toLowerCase().includes(query));
      const cityMatch = v.location?.toLowerCase().includes(query) || false;
      const municipalityMatch = v.municipality?.toLowerCase().includes(query) || false;
      const provinceMatch = v.province?.toLowerCase().includes(query) || false;
      const barangayMatch = v.barangay?.toLowerCase().includes(query) || false;
      
      return matchesCategory && (nameMatch || courtNameMatch || typeMatch || cityMatch || municipalityMatch || provinceMatch || barangayMatch);
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

  return (
    <section className="relative z-20 pt-32 pb-24 md:pt-40 md:pb-36">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-emerald/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-lime/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center gap-12">
          
          {/* 1. Hero Search Section */}
          <div className="max-w-3xl flex flex-col items-center text-center space-y-4 animate-fade-in">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-medium text-slate-300 backdrop-blur-md">
              <span className="flex h-1.5 w-1.5 rounded-full bg-brand-lime animate-pulse"></span>
              State-of-the-Art Court Booking
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] font-sans">
              Reserve Your Court.<br />
              <span className="bg-gradient-to-r from-brand-lime via-brand-lime to-brand-emerald bg-clip-text text-transparent">
                Rule the Kitchen.
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl font-normal text-slate-400 max-w-xl leading-relaxed">
              Book premium indoor and outdoor pickleball courts in seconds. Join matches, level up your DUPR rating, and play with your local community.
            </p>
          </div>

          {/* Sticky Spotlight Search Bar Container */}
          <div id="booking-widget" className="w-full max-w-4xl sticky top-[96px] z-30 animate-slide-up">
            <div className="relative group">
              {/* Outer floating search wrapper (Borderless) */}
              <div 
                className={`w-full h-16 rounded-2xl bg-slate-900/60 backdrop-blur-2xl px-6 flex items-center gap-4 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.55)] border border-slate-800/40 ${
                  isFocused 
                    ? 'bg-slate-900/80 shadow-[0_20px_50px_rgba(181,245,41,0.06)] border-brand-lime/20' 
                    : 'hover:bg-slate-900/70'
                }`}
              >
                <Search className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-brand-lime' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search city, province, or court name..."
                  className="flex-1 bg-transparent text-white text-base focus:outline-none placeholder-slate-500 font-sans tracking-wide cursor-text font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-brand-lime transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Floating Dropdown Suggestions Panel */}
              {isFocused && venueGroups.length > 0 && (
                <div className="absolute top-20 left-0 right-0 glass-panel rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.65)] border border-slate-800/80 backdrop-blur-2xl bg-slate-950/95 z-40 animate-fade-in text-left">
                  {/* Empty query suggestions */}
                  {!searchQuery.trim() ? (
                    <div className="p-6 space-y-6">
                      {/* Popular category chips */}
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
                        {/* Recent Searches */}
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

                        {/* Trending Searches */}
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
                    /* Search results instant selection inside dropdown */
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
                                  setSelectedCourtId(v.courts[0].id);
                                  setView('details');
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900/90 transition-all flex items-center gap-4 group cursor-pointer"
                            >
                              {/* Thumbnail preview */}
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

                              {/* Title & details */}
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

                              {/* Price */}
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
            </div>
          </div>

          {/* 2. Results Section (Directly Below Hero) */}
          <div className="w-full mt-10 space-y-8 animate-fade-in text-left">
            
            {/* Header section with sort & keyword details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-dark-border">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Pickleball Venues</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-brand-lime/10 text-brand-lime font-extrabold border border-brand-lime/20">
                    {sortedVenues.length} Available
                  </span>
                </h2>
                <p className="text-sm font-normal text-slate-400 mt-1">
                  Browse host organizations and multi-court facilities {searchQuery && <>for "<span className="text-white font-medium">{searchQuery}</span>"</>}
                </p>
              </div>

              {/* Sorting and Category Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Category filters */}
                <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
                  {['All', 'Indoor', 'Outdoor', 'Multi-Court', 'Premium'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-brand-lime text-dark-bg font-sans font-bold shadow-md shadow-brand-lime/5'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-sm font-normal rounded-xl px-3 py-2 focus:outline-none focus:border-brand-lime transition-all cursor-pointer"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="dayPrice">Price: Low to High</option>
                    <option value="nightPrice">Night Rate: Low to High</option>
                    <option value="courts">Most Courts</option>
                  </select>
                </div>

                {/* View Mode Toggle (Grid/List) */}
                <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
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
            </div>

            {/* Results cards grid, Loading State, or Empty State */}
            {loading ? (
              <div className="py-8 space-y-8 animate-fade-in">
                {/* Central spinner with animated progress bar */}
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
                  <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                    <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand-lime to-transparent rounded-full animate-progress"></div>
                  </div>
                </div>

                {/* 4 Card Skeleton Placeholders */}
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
                        <div className="pt-3 border-t border-slate-800/40 flex justify-between">
                          <div className="h-3 bg-slate-850 rounded w-16"></div>
                          <div className="h-4 bg-slate-850 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="p-5 pt-0">
                        <div className="w-full h-11 bg-slate-900 rounded-xl border border-slate-850"></div>
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
                  We couldn't find venues matching your criteria. Try adjusting your search keywords or filter category.
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {['Libmanan', 'Camarines Sur', 'Multi-Court', 'Indoor', 'Outdoor'].map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        if (['Indoor', 'Outdoor', 'Multi-Court', 'Premium'].includes(term)) {
                          setSelectedCategory(term);
                        } else {
                          setSearchQuery(term);
                        }
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                {sortedVenues.map((v) => (
                  <div
                    key={v.venueId}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (v.courts.length > 0) {
                        setSelectedCourtId(v.courts[0].id);
                        setView('details');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (v.courts.length > 0) {
                          setSelectedCourtId(v.courts[0].id);
                          setView('details');
                        }
                      }
                    }}
                    className="glass-panel glass-panel-hover group rounded-2xl overflow-hidden text-left flex flex-col justify-between hover:shadow-2xl hover:shadow-black/50 hover:border-brand-lime/30 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-lime/50"
                  >
                    <div>
                      {/* Image Preview & Court Count Badge */}
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

                        {/* Top Left Inventory Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-bg/85 backdrop-blur-md border border-slate-700/80 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></span>
                          <span className="text-[11px] font-black text-white">
                            {v.courtCount} {v.courtCount === 1 ? 'Court' : 'Courts'}
                          </span>
                        </div>

                        {/* Top Right Surface Tag */}
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-brand-lime/90 text-dark-bg font-black text-[10px] uppercase shadow-md">
                          {v.courtTypes.some(t => t.toLowerCase().includes('indoor')) && v.courtTypes.some(t => t.toLowerCase().includes('outdoor'))
                            ? 'Indoor & Outdoor'
                            : v.courtTypes[0] || 'Pickleball'}
                        </div>
                      </div>

                      {/* Content panel */}
                      <div className="p-5 space-y-3.5">
                        {/* Emphasized Venue / Organization Header */}
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

                        {/* Location address */}
                        <p className="text-sm font-normal text-slate-400 flex items-start gap-1.5 line-clamp-2 min-h-[32px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>
                            {[v.barangay, v.municipality, v.province].filter(Boolean).join(', ') || v.location || 'Location details not set.'}
                          </span>
                        </p>

                        {/* Court List Preview / Features */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {v.courts.slice(0, 3).map((courtItem, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium truncate max-w-[130px]"
                            >
                              🎾 {courtItem.name}
                            </span>
                          ))}
                          {v.courts.length > 3 && (
                            <span className="text-[10px] text-slate-500 font-bold">
                              +{v.courts.length - 3} more
                            </span>
                          )}
                        </div>

                        {/* Pricing details */}
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
              <div className="space-y-4 animate-fade-in">
                {sortedVenues.map((v) => (
                  <div
                    key={v.venueId}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (v.courts.length > 0) {
                        setSelectedCourtId(v.courts[0].id);
                        setView('details');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (v.courts.length > 0) {
                          setSelectedCourtId(v.courts[0].id);
                          setView('details');
                        }
                      }
                    }}
                    className="glass-panel glass-panel-hover group rounded-2xl overflow-hidden text-left flex flex-col md:flex-row hover:shadow-2xl hover:shadow-black/50 hover:border-brand-lime/30 transition-all duration-300 gap-6 p-5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-lime/50"
                  >
                    {/* Left image thumbnail in list view */}
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

                      {/* Top Left Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-dark-bg/85 backdrop-blur-md border border-slate-700/80 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-lime"></span>
                        <span className="text-[10px] font-black text-white">
                          {v.courtCount} {v.courtCount === 1 ? 'Court' : 'Courts'}
                        </span>
                      </div>
                    </div>

                    {/* Right side content wrapper */}
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div className="space-y-3">
                        {/* Emphasized Venue Header */}
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

                        {/* Location address */}
                        <p className="text-sm font-normal text-slate-350 flex items-start gap-1.5 leading-relaxed">
                          <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>
                            {[v.barangay, v.municipality, v.province].filter(Boolean).join(', ') || v.location || 'Location details not set.'}
                          </span>
                        </p>

                        {/* Courts preview pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {v.courts.map((cItem, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-medium"
                            >
                              🎾 {cItem.name} ({cItem.type})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* View details button at the bottom right */}
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
          </div>
        </div>
      </div>
    </section>
  );
}
