import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, Lock, ChevronLeft, ChevronRight, ArrowLeft, X, Eye, ExternalLink, Building2, BadgeCheck, Phone, Mail, Globe, FileText, Shield, CloudRain, Trophy, LayoutGrid, Layers, Navigation } from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, getDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { parseGoogleMapsUrl } from '../utils/mapUtils';

import type { DailyOperatingHoursMap } from './AdminDashboard';
import {
  DEFAULT_OPERATING_HOURS,
  DAYS_OF_WEEK,
  MASTER_SLOTS,
  getScheduleForDate,
} from '../utils/timeSlotUtils';

interface RentalItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  pricingType: 'per_booking' | 'per_hour' | 'per_session';
  quantity: number;
  enabled: boolean;
  images?: string[];
}

interface HostDetails {
  name: string;
  role: string;
  email: string;
  phone: string;
  companyName: string;
  companyAddress: string;
  description?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  logoUrl?: string;
  bookingLeadTimeMinutes?: number;
  operatingHours?: DailyOperatingHoursMap;
}

export interface CourtPolicies {
  cancellationPolicy?: string;
  rulesPolicy?: string;
  weatherPolicy?: string;
  equipmentPolicy?: string;
}

interface Court {
  id: string;
  name: string;
  type: string;
  dayPrice: number;
  nightPrice: number;
  companyId?: string;
  ownerId?: string;
  ownerCompanyName?: string;
  companyAddress?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  logoUrl?: string;
  ownerCompanyLogo?: string;
  location?: string;
  mapUrl?: string;
  images?: string[];
  barangay?: string;
  municipality?: string;
  province?: string;
  description?: string;
  rentals?: RentalItem[];
  gcashAccountId?: string;
  policies?: CourtPolicies;
  published?: boolean;
  latitude?: number;
  longitude?: number;
  operatingHours?: DailyOperatingHoursMap;
}

interface CourtDetailsProps {
  courtId: string;
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup') => void;
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null;
  setSelectedCourtId: (id: string) => void;
  setCheckoutDetails: (details: any) => void;
}

export default function CourtDetails({ courtId, setView, user, setSelectedCourtId, setCheckoutDetails }: CourtDetailsProps) {
  const [court, setCourt] = useState<Court | null>(null);
  const [loadingCourt, setLoadingCourt] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedRentals, setSelectedRentals] = useState<{[rentalId: string]: number}>({});
  const [bookingConfirmed] = useState(false);
  const [error] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  
  // Rental spec modal states
  const [selectedRentalForModal, setSelectedRentalForModal] = useState<RentalItem | null>(null);
  const [rentalActiveImageIndex, setRentalActiveImageIndex] = useState(0);
  const [isRentalZoomed, setIsRentalZoomed] = useState(false);
  const [rentalZoomPosition, setRentalZoomPosition] = useState({ x: 0, y: 0 });
  const [isEquipmentRentalEnabled, setIsEquipmentRentalEnabled] = useState(false);

  // Dynamic booking slots states
  const [bookedSlotsForDate, setBookedSlotsForDate] = useState<string[]>([]);
  const [playerConflictsForDate, setPlayerConflictsForDate] = useState<Record<string, { courtName: string }>>({});
  const [openPlayBlockedSlots, setOpenPlayBlockedSlots] = useState<Record<string, { eventId: string; title: string; category: string; startTime: string; endTime: string }>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Carousel State
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Full-Screen Gallery View Modal State
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryFilterTab, setGalleryFilterTab] = useState<'all' | 'courts' | 'rentals'>('all');

  // Court Owner / Host Details State
  const [hostDetails, setHostDetails] = useState<HostDetails | null>(null);

  // Combined Gallery Images Memo (Court Photos + Equipment Rentals)
  const allGalleryImages = useMemo(() => {
    if (!court) return [];
    const items: { url: string; label: string; isRental?: boolean }[] = [];

    if (Array.isArray(court.images) && court.images.length > 0) {
      court.images.forEach((img, idx) => {
        if (img) {
          items.push({
            url: img,
            label: `Court Photo ${idx + 1}`,
            isRental: false,
          });
        }
      });
    }

    if (Array.isArray(court.rentals)) {
      court.rentals
        .filter((r) => r.enabled && Array.isArray(r.images) && r.images.length > 0)
        .forEach((r) => {
          r.images!.forEach((img) => {
            if (img && !items.some(i => i.url === img)) {
              items.push({
                url: img,
                label: `Equipment: ${r.name}`,
                isRental: true,
              });
            }
          });
        });
    }

    return items;
  }, [court]);

  // Google Maps pin and embed parsing
  const parsedMap = useMemo(() => {
    if (!court) {
      return parseGoogleMapsUrl('', '');
    }
    const fallback = [court.name, court.location, court.barangay, court.municipality, court.province].filter(Boolean).join(', ');
    if (court.latitude !== undefined && court.longitude !== undefined && court.latitude !== null && court.longitude !== null) {
      const coordUrl = `https://www.google.com/maps?q=${court.latitude},${court.longitude}`;
      return parseGoogleMapsUrl(coordUrl, fallback);
    }
    return parseGoogleMapsUrl(court.mapUrl || '', fallback);
  }, [court]);

  const directionsUrl = useMemo(() => {
    if (!court) return '';
    if (court.latitude && court.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${court.latitude},${court.longitude}`;
    }
    if (parsedMap.coordinates) {
      return `https://www.google.com/maps/dir/?api=1&destination=${parsedMap.coordinates.lat},${parsedMap.coordinates.lng}`;
    }
    return parsedMap.directUrl || (court.mapUrl?.trim().startsWith('http') ? court.mapUrl.trim() : '');
  }, [court, parsedMap]);

  // Reset active image index if it goes out of bounds
  useEffect(() => {
    if (activeImageIndex >= allGalleryImages.length) {
      setActiveImageIndex(0);
    }
  }, [allGalleryImages.length, activeImageIndex]);

  // Restore date state if it was persisted for auth flow
  useEffect(() => {
    const pendingDate = localStorage.getItem('picklepoint_pending_date');
    if (pendingDate) {
      setSelectedDate(pendingDate);
      localStorage.removeItem('picklepoint_pending_date');
    }
  }, []);

  // Fetch court host & owner personal details
  useEffect(() => {
    if (!court) return;

    const fetchHostDetails = async () => {
      try {
        const ownerId = court.ownerId;
        let matchedUser: any = null;
        let matchedCompany: any = null;

        if (isFirebaseConfigured && db && ownerId && ownerId !== 'system') {
          // 1. Try fetching user account by UID
          try {
            const userDocSnap = await getDoc(doc(db, 'users', ownerId));
            if (userDocSnap.exists()) {
              matchedUser = userDocSnap.data();
            }
          } catch (e) {}

          // 2. Try fetching user by email
          if (!matchedUser) {
            try {
              const qUser = query(collection(db, 'users'), where('email', '==', ownerId));
              const qSnap = await getDocs(qUser);
              if (!qSnap.empty) {
                matchedUser = qSnap.docs[0].data();
              }
            } catch (e) {}
          }

          // 3. Try fetching company doc by ownerId or user's companyId/email or company collection
          try {
            const compDocSnap = await getDoc(doc(db, 'companies', ownerId));
            if (compDocSnap.exists()) {
              matchedCompany = { id: compDocSnap.id, ...compDocSnap.data() };
            }
          } catch (e) {}

          if (!matchedCompany && matchedUser?.companyId) {
            try {
              const compDocSnap = await getDoc(doc(db, 'companies', matchedUser.companyId));
              if (compDocSnap.exists()) {
                matchedCompany = { id: compDocSnap.id, ...compDocSnap.data() };
              }
            } catch (e) {}
          }

          if (!matchedCompany && (matchedUser?.email || ownerId)) {
            try {
              const targetEmail = matchedUser?.email || ownerId;
              const qComp = query(collection(db, 'companies'), where('clientAdminEmail', '==', targetEmail));
              const qSnap = await getDocs(qComp);
              if (!qSnap.empty) {
                matchedCompany = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
              }
            } catch (e) {}
          }

          if (!matchedCompany) {
            try {
              const compDocs = await getDocs(collection(db, 'companies'));
              const compList = compDocs.docs.map(d => ({ id: d.id, ...d.data() }) as any);
              matchedCompany = compList.find((c: any) =>
                (matchedUser?.companyId && c.id === matchedUser.companyId) ||
                c.id === ownerId ||
                (matchedUser?.email && c.clientAdminEmail?.toLowerCase() === matchedUser.email.toLowerCase()) ||
                (ownerId && c.clientAdminEmail?.toLowerCase() === ownerId.toLowerCase()) ||
                (court.ownerCompanyName && c.name?.toLowerCase() === court.ownerCompanyName.toLowerCase())
              );
              if (!matchedCompany && compList.length > 0) {
                matchedCompany = compList[0];
              }
            } catch (e) {}
          }
        }

        // LocalStorage fallback check
        const compStr = localStorage.getItem('picklepoint_companies');
        const localComps: any[] = compStr ? JSON.parse(compStr) : [];
        const usersStr = localStorage.getItem('picklepoint_users');
        const localUsers: any[] = usersStr ? JSON.parse(usersStr) : [];

        if (!matchedUser && ownerId && ownerId !== 'system') {
          matchedUser = localUsers.find(u => u.uid === ownerId || u.email?.toLowerCase() === ownerId.toLowerCase());
        }
        if (!matchedCompany) {
          matchedCompany = localComps.find(c => 
            (ownerId && (c.id === ownerId || c.clientAdminEmail?.toLowerCase() === ownerId.toLowerCase())) ||
            (matchedUser?.companyId && c.id === matchedUser.companyId) ||
            (matchedUser?.email && c.clientAdminEmail?.toLowerCase() === matchedUser.email.toLowerCase()) ||
            (court.ownerCompanyName && c.name?.toLowerCase() === court.ownerCompanyName.toLowerCase())
          );
        }

        if (!matchedCompany && localComps.length > 0) {
          matchedCompany = localComps[0];
        }

        // Construct Host Details - companyName MUST be companies.name
        const defaultHostName = court.name.includes('Court')
          ? `${court.name.split('Court')[0].trim()} Facility Host`
          : `${court.name} Host`;

        const hostName = matchedUser?.name || matchedCompany?.clientAdminEmail?.split('@')[0] || defaultHostName;
        const hostRole = matchedUser?.role === 'super_admin' ? 'Super Administrator' : (matchedUser?.role === 'client_admin' ? 'Court Owner & Facility Host' : 'Verified Venue Host');
        const hostEmail = matchedUser?.email || matchedCompany?.clientAdminEmail || 'support@picklepoint.com';
        const hostPhone = matchedUser?.phone || matchedCompany?.phone || '+63 917 123 4567';
        const companyName = matchedCompany?.name || matchedUser?.companyName || (court.ownerCompanyName && court.ownerCompanyName !== court.name ? court.ownerCompanyName : 'PicklePoint Venue');
        const companyAddress = matchedCompany?.address || court.companyAddress || [court.barangay, court.municipality, court.province].filter(Boolean).join(', ') || court.location || 'Camarines Sur, Philippines';
        const description = `Verified court host managing ${court.name}. Dedicated to maintaining high-performance surfaces, night lighting, and seamless reservations for pickleball players.`;

        setHostDetails({
          name: hostName,
          role: hostRole,
          email: hostEmail,
          phone: hostPhone,
          companyName: companyName,
          companyAddress: companyAddress,
          description: description,
          websiteUrl: matchedCompany?.websiteUrl,
          facebookUrl: matchedCompany?.facebookUrl,
          instagramUrl: matchedCompany?.instagramUrl,
          logoUrl: matchedCompany?.logoUrl || matchedUser?.companyLogoUrl,
          bookingLeadTimeMinutes: matchedCompany?.bookingLeadTimeMinutes ?? 30,
          operatingHours: matchedCompany?.operatingHours,
        });
      } catch (err) {
        console.error('Error loading court host details:', err);
      }
    };

    fetchHostDetails();
  }, [court]);

  const [venueCourts, setVenueCourts] = useState<Court[]>([]);

  // Load all sibling courts belonging to this venue / organization
  const loadVenueCourts = async (activeCourt: Court) => {
    try {
      const courtsList: Court[] = [];
      if (isFirebaseConfigured && db) {
        const querySnapshot = await getDocs(collection(db, 'courts'));
        querySnapshot.forEach((docSnap) => {
          if (docSnap.id !== 'court-championship') {
            const data = docSnap.data() as any;
            const isMatch =
              (activeCourt.companyId && data.companyId && data.companyId === activeCourt.companyId) ||
              (activeCourt.ownerCompanyName && data.ownerCompanyName && data.ownerCompanyName.toLowerCase() === activeCourt.ownerCompanyName.toLowerCase()) ||
              (activeCourt.ownerId && data.ownerId && data.ownerId === activeCourt.ownerId);

            if (isMatch && data.published !== false) {
              courtsList.push({ id: docSnap.id, ...data } as Court);
            }
          }
        });
      } else {
        const courtsStr = localStorage.getItem('picklepoint_courts');
        const localCourts: Court[] = courtsStr ? JSON.parse(courtsStr) : [];
        localCourts.forEach((c: Court) => {
          if (c.published !== false && c.id !== 'court-championship') {
            const isMatch =
              (activeCourt.companyId && c.companyId && c.companyId === activeCourt.companyId) ||
              (activeCourt.ownerCompanyName && c.ownerCompanyName && c.ownerCompanyName.toLowerCase() === activeCourt.ownerCompanyName.toLowerCase()) ||
              (activeCourt.ownerId && c.ownerId && c.ownerId === activeCourt.ownerId);
            if (isMatch) {
              courtsList.push(c);
            }
          }
        });
      }

      // Ensure activeCourt is present in the list
      if (!courtsList.some((c) => c.id === activeCourt.id)) {
        courtsList.unshift(activeCourt);
      }

      setVenueCourts(courtsList);
    } catch (e) {
      console.warn('Error loading venue sister courts:', e);
      setVenueCourts([activeCourt]);
    }
  };

  const handleSwitchCourt = (newCourt: Court) => {
    if (newCourt.id === court?.id) return;
    setCourt(newCourt);
    setSelectedCourtId(newCourt.id);
    setSelectedSlots([]);
    setActiveImageIndex(0);
  };

  useEffect(() => {
    const targetCourtId = courtId || localStorage.getItem('picklepoint_pending_court_id');
    if (!targetCourtId) {
      setLoadingCourt(false);
      return;
    }

    const fetchCourtDetails = async () => {
      setLoadingCourt(true);
      if (isFirebaseConfigured && db) {
        try {
          const docRef = doc(db, 'courts', targetCourtId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const loadedCourt = { id: docSnap.id, ...docSnap.data() } as Court;
            setCourt(loadedCourt);
            loadVenueCourts(loadedCourt);
          } else {
            console.error('No such court found in Firestore');
          }
        } catch (err) {
          console.error('Error fetching court details:', err);
        } finally {
          setLoadingCourt(false);
        }
      } else {
        // LocalStorage fallback
        try {
          const courtsStr = localStorage.getItem('picklepoint_courts');
          const localCourts = courtsStr ? JSON.parse(courtsStr) : [];
          const matched = localCourts.find((c: Court) => c.id === targetCourtId);
          if (matched) {
            setCourt(matched);
            loadVenueCourts(matched);
          }
        } catch (err) {
          console.error('Error loading court details from LocalStorage:', err);
        } finally {
          setLoadingCourt(false);
        }
      }
    };

    fetchCourtDetails();
  }, [courtId]);

  // Fetch bookings dynamically when selectedDate or court.id changes
  useEffect(() => {
    if (!selectedDate || !court?.id) {
      setBookedSlotsForDate([]);
      setPlayerConflictsForDate({});
      return;
    }

    const parseTimeHour = (timeStr?: string): number => {
      if (!timeStr) return 0;
      const trimmed = timeStr.trim();
      const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match12) {
        let h = parseInt(match12[1], 10);
        const pm = match12[3].toUpperCase() === 'PM';
        if (pm && h < 12) h += 12;
        if (!pm && h === 12) h = 0;
        return h;
      }
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        let h = parseInt(parts[0], 10) || 0;
        if (trimmed.toLowerCase().includes('pm') && h < 12) h += 12;
        if (trimmed.toLowerCase().includes('am') && h === 12) h = 0;
        return h;
      }
      return parseInt(trimmed, 10) || 0;
    };

    const fetchBookingsForDate = async () => {
      setLoadingAvailability(true);
      let booked: string[] = [];
      let conflicts: Record<string, { courtName: string }> = {};
      let openPlayBlocks: Record<string, { eventId: string; title: string; category: string; startTime: string; endTime: string }> = {};
      const currentUserEmail = user?.email?.toLowerCase();
      const currentUserUid = user?.uid;

      if (isFirebaseConfigured && db) {
        try {
          const bookingsRef = collection(db, 'bookings');
          const q = query(
            bookingsRef,
            where('date', '==', selectedDate)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status !== 'cancelled' && data.slots && Array.isArray(data.slots)) {
              if (data.courtId === court.id) {
                booked.push(...data.slots);
              } else if (currentUserEmail || currentUserUid) {
                const bEmail = data.userEmail?.toLowerCase() || data.user?.email?.toLowerCase();
                const bUid = data.userId || data.user?.uid;
                const isSamePlayer = (currentUserEmail && bEmail === currentUserEmail) || (currentUserUid && bUid === currentUserUid);
                if (isSamePlayer) {
                  const targetCourtName = data.courtName || data.ownerCompanyName || 'Another Venue';
                  data.slots.forEach((st: string) => {
                    conflicts[st] = { courtName: targetCourtName };
                  });
                }
              }
            }
          });
        } catch (err) {
          console.error('Error fetching bookings:', err);
        }

        // Fetch active Open Play events on selectedDate to prevent time overlaps
        try {
          const opQuery = query(collection(db, 'openplay_events'), where('eventDate', '==', selectedDate));
          const opSnap = await getDocs(opQuery);
          opSnap.forEach((docSnap) => {
            const ev = docSnap.data();
            if (ev.status !== 'cancelled') {
              const isCourtMatch = !ev.courtIds || ev.courtIds.length === 0 || ev.courtIds.includes(court.id);
              if (isCourtMatch) {
                const startH = parseTimeHour(ev.startTime);
                const endH = parseTimeHour(ev.endTime);
                MASTER_SLOTS.forEach((s) => {
                  if (s.startHour >= startH && s.startHour < endH) {
                    openPlayBlocks[s.time] = {
                      eventId: docSnap.id,
                      title: ev.title || 'Open Play Session',
                      category: ev.category || 'Open Play',
                      startTime: ev.startTime || '13:00',
                      endTime: ev.endTime || '19:00',
                    };
                  }
                });
              }
            }
          });
        } catch (e) {
          console.warn('Error fetching Open Play events for court availability:', e);
        }
      } else {
        // LocalStorage fallback
        try {
          const bookingsStr = localStorage.getItem('picklepoint_bookings');
          const localBookings = bookingsStr ? JSON.parse(bookingsStr) : [];
          localBookings.forEach((b: any) => {
            if (b.date === selectedDate && b.status !== 'cancelled' && b.slots && Array.isArray(b.slots)) {
              if (b.courtId === court.id) {
                booked.push(...b.slots);
              } else if (currentUserEmail || currentUserUid) {
                const bEmail = b.userEmail?.toLowerCase() || b.user?.email?.toLowerCase();
                const bUid = b.userId || b.user?.uid;
                const isSamePlayer = (currentUserEmail && bEmail === currentUserEmail) || (currentUserUid && bUid === currentUserUid);
                if (isSamePlayer) {
                  const targetCourtName = b.courtName || b.ownerCompanyName || 'Another Venue';
                  b.slots.forEach((st: string) => {
                    conflicts[st] = { courtName: targetCourtName };
                  });
                }
              }
            }
          });
        } catch (err) {
          console.error('Error loading bookings fallback:', err);
        }

        // LocalStorage fallback for Open Play events
        try {
          const opStr = localStorage.getItem('picklepoint_openplay_events');
          if (opStr) {
            const localEvents = JSON.parse(opStr);
            localEvents.forEach((ev: any) => {
              const evDate = ev.eventDate || ev.date;
              if (evDate === selectedDate && ev.status !== 'cancelled') {
                const isCourtMatch = !ev.courtIds || ev.courtIds.length === 0 || ev.courtIds.includes(court.id);
                if (isCourtMatch) {
                  const startH = parseTimeHour(ev.startTime);
                  const endH = parseTimeHour(ev.endTime);
                  MASTER_SLOTS.forEach((s) => {
                    if (s.startHour >= startH && s.startHour < endH) {
                      openPlayBlocks[s.time] = {
                        eventId: ev.id,
                        title: ev.title || 'Open Play Session',
                        category: ev.category || 'Open Play',
                        startTime: ev.startTime || '13:00',
                        endTime: ev.endTime || '19:00',
                      };
                    }
                  });
                }
              }
            });
          }
        } catch (e) {}
      }
      
      // Ensure unique list
      setBookedSlotsForDate([...new Set(booked)]);
      setPlayerConflictsForDate(conflicts);
      setOpenPlayBlockedSlots(openPlayBlocks);
      setLoadingAvailability(false);
    };

    fetchBookingsForDate();
  }, [selectedDate, court?.id, user?.email, user?.uid]);

  const effectiveOperatingHours = court?.operatingHours || hostDetails?.operatingHours || DEFAULT_OPERATING_HOURS;

  const currentSchedule = useMemo(() => {
    return getScheduleForDate(selectedDate, effectiveOperatingHours);
  }, [selectedDate, effectiveOperatingHours]);

  const isSelectedDateDayOff = currentSchedule.isDayOff;

  // Prune any selected slots that do not fall within the current day's active slots
  useEffect(() => {
    if (selectedSlots.length > 0 && currentSchedule.slots.length > 0) {
      const validSlotTimes = new Set(currentSchedule.slots.map((s) => s.time));
      const filtered = selectedSlots.filter((st) => validSlotTimes.has(st));
      if (filtered.length !== selectedSlots.length) {
        setSelectedSlots(filtered);
      }
    }
  }, [currentSchedule, selectedSlots]);

  if (loadingCourt) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[400px]">
        <span className="w-10 h-10 border-4 border-slate-800 border-t-brand-lime rounded-full animate-spin mb-4"></span>
        <p className="text-slate-400 text-sm">Loading court specs...</p>
      </div>
    );
  }

  if (!court) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Court not found</h3>
        <p className="text-slate-400 text-sm mb-6">The venue selection may have been deleted or is incorrect.</p>
        <button
          onClick={() => {
            setSelectedCourtId('');
            setView('landing');
          }}
          className="px-6 py-2.5 bg-brand-lime text-dark-bg font-bold rounded-xl hover:bg-[#a6e224] transition-all cursor-pointer font-sans text-xs"
        >
          Return to Search
        </button>
      </div>
    );
  }

  const getSlotPrice = (startHour: number) => {
    if (!court) return 0;
    return startHour >= 18 ? court.nightPrice : court.dayPrice;
  };

  const totalSlotsCost = selectedSlots.reduce((sum, slotTime) => {
    const slot = MASTER_SLOTS.find((s) => s.time === slotTime);
    if (!slot) return sum;
    return sum + getSlotPrice(slot.startHour);
  }, 0);

  const getRentalItemCost = (item: RentalItem, qty: number) => {
    if (item.pricingType === 'per_hour') {
      return item.price * qty * selectedSlots.length;
    }
    return item.price * qty;
  };

  const totalRentalsCost = court?.rentals
    ? court.rentals
        .filter((r) => r.enabled && selectedRentals[r.id] > 0)
        .reduce((sum, r) => sum + getRentalItemCost(r, selectedRentals[r.id]), 0)
    : 0;

  const totalCost = totalSlotsCost + totalRentalsCost;

  const getSortedSelectedSlots = () => {
    return [...selectedSlots].sort((a, b) => {
      const idxA = MASTER_SLOTS.findIndex((s) => s.time === a);
      const idxB = MASTER_SLOTS.findIndex((s) => s.time === b);
      return idxA - idxB;
    });
  };

  const isSlotPastOrTooSoon = (slotStartHour: number, dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return false;

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    // Lead time buffer applies when booking for the current day
    const isToday = year === todayYear && month === todayMonth && day === todayDay;
    if (!isToday) return false;

    const slotStartTime = new Date(year, month - 1, day, slotStartHour, 0, 0, 0);
    const leadTimeMinutes = hostDetails?.bookingLeadTimeMinutes ?? 30;
    const diffMinutes = (slotStartTime.getTime() - now.getTime()) / (1000 * 60);

    return diffMinutes < leadTimeMinutes;
  };

  const handleToggleSlot = (slotTime: string) => {
    const slotObj = MASTER_SLOTS.find((s) => s.time === slotTime);
    if (slotObj && isSlotPastOrTooSoon(slotObj.startHour, selectedDate)) {
      return;
    }
    setSelectedSlots((prev) =>
      prev.includes(slotTime) ? prev.filter((s) => s !== slotTime) : [...prev, slotTime]
    );
  };

  const handleProceedToCheckout = () => {
    if (selectedSlots.length === 0 || !selectedDate || !court) return;

    const courtLocation = [court.barangay, court.municipality, court.province].filter(Boolean).join(', ') || court.location || '';

    const selectedRentalsList = court.rentals
      ? court.rentals
          .filter((r) => r.enabled && selectedRentals[r.id] > 0)
          .map((r) => ({
            id: r.id,
            name: r.name,
            price: r.price,
            pricingType: r.pricingType,
            quantity: selectedRentals[r.id]
          }))
      : [];

    try {
      sessionStorage.removeItem('picklepoint_last_submitted_booking');
      localStorage.removeItem('picklepoint_last_submitted_booking');
    } catch (e) {}

    setCheckoutDetails({
      type: 'court',
      courtId: court.id,
      courtName: court.name,
      courtType: court.type,
      courtImage: court.images?.[0] || '',
      courtLocation,
      date: selectedDate,
      slots: getSortedSelectedSlots(),
      rentals: selectedRentalsList,
      totalCost,
      companyId: court.companyId || (hostDetails as any)?.companyId || '',
      courtOwnerId: court.ownerId || '',
      gcashAccountId: court.gcashAccountId || '',
      companyName: (hostDetails?.companyName && hostDetails.companyName !== court.name ? hostDetails.companyName : (court.ownerCompanyName && court.ownerCompanyName !== court.name ? court.ownerCompanyName : 'PicklePoint Venue')),
      ownerCompanyName: (hostDetails?.companyName && hostDetails.companyName !== court.name ? hostDetails.companyName : (court.ownerCompanyName && court.ownerCompanyName !== court.name ? court.ownerCompanyName : 'PicklePoint Venue')),
      companyAddress: hostDetails?.companyAddress || court.companyAddress || courtLocation,
      ownerCompanyAddress: hostDetails?.companyAddress || court.companyAddress || courtLocation,
      hostEmail: hostDetails?.email || (court as any).createdByEmail || '',
      hostPhone: hostDetails?.phone || '',
    });
    setView('checkout');
  };

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };



  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextImage = () => {
    if (allGalleryImages.length === 0) return;
    setActiveImageIndex((prev) => (prev + 1) % allGalleryImages.length);
    setIsZoomed(false);
  };

  const prevImage = () => {
    if (allGalleryImages.length === 0) return;
    setActiveImageIndex((prev) => (prev - 1 + allGalleryImages.length) % allGalleryImages.length);
    setIsZoomed(false);
  };

  const nextRentalImage = (images: string[]) => {
    setRentalActiveImageIndex((prev) => (prev + 1) % images.length);
    setIsRentalZoomed(false);
  };

  const prevRentalImage = (images: string[]) => {
    setRentalActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsRentalZoomed(false);
  };

  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-28">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-emerald/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-lime/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              setSelectedCourtId('');
              setView('landing');
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-brand-lime transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Venues</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Viewing Venue:</span>
            <span className="text-xs font-bold text-white bg-slate-900 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-lime" />
              <span>{court?.ownerCompanyName || hostDetails?.companyName || 'PicklePoint Venue'}</span>
            </span>
          </div>
        </div>

        {bookingConfirmed ? (
          <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto shadow-2xl border border-slate-800 animate-fade-in my-10">
            <div className="w-16 h-16 rounded-full bg-brand-emerald/20 flex items-center justify-center border border-brand-emerald text-brand-emerald mb-6 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Booking Confirmed!</h3>
            <div className="text-sm text-slate-350 px-4 space-y-3 leading-relaxed">
              <p>
                Your reservation at <span className="text-brand-lime font-semibold">{court.name}</span> for {formatDate(selectedDate)} has been successfully saved.
              </p>
              <div className="text-xs text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-dark-border mt-3">
                <strong>Selected Slots:</strong><br />
                {getSortedSelectedSlots().join(', ')}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-8">
              Redirecting to receipt page... (Simulated)
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Venue Info Header, Media Gallery, Info, Map */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Venue Info & Multi-Court Selector Banner */}
              <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3.5">
                    {hostDetails?.logoUrl || court?.ownerCompanyLogo ? (
                      <img
                        src={hostDetails?.logoUrl || court?.ownerCompanyLogo}
                        alt={hostDetails?.companyName || court?.ownerCompanyName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700/80 bg-slate-900 shadow-md flex-shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/25 flex items-center justify-center text-brand-lime flex-shrink-0 shadow-sm">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span>{court?.ownerCompanyName || hostDetails?.companyName || court.name}</span>
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>
                          {[court.barangay, court.municipality, court.province].filter(Boolean).join(', ') || court.location || hostDetails?.companyAddress || 'Location details not set.'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <span className="px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-extrabold text-xs flex items-center gap-1.5 shadow-sm">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{venueCourts.length} {venueCourts.length === 1 ? 'Playable Court' : 'Playable Courts'}</span>
                    </span>
                  </div>
                </div>

                {/* Interactive Multi-Court Selector Tabs */}
                {venueCourts.length > 1 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-brand-lime" />
                        <span>Select Court ({venueCourts.length} Available):</span>
                      </h2>
                      <span className="text-[11px] text-slate-500">Click tab to switch rates</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {venueCourts.map((c, idx) => {
                        const isSelected = c.id === court?.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSwitchCourt(c)}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 relative overflow-hidden group ${
                              isSelected
                                ? 'bg-gradient-to-br from-brand-lime/15 via-slate-900 to-slate-900 border-brand-lime shadow-lg shadow-brand-lime/10'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                  isSelected ? 'bg-brand-lime text-dark-bg' : 'bg-slate-800 text-slate-400 group-hover:text-white'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="font-bold text-sm truncate">{c.name}</span>
                              </div>
                              <p className="text-xs text-slate-400 truncate pl-8">
                                {c.type || 'Standard Court'}
                              </p>
                              <div className="pl-8 text-xs font-semibold text-brand-lime">
                                ₱{c.dayPrice} <span className="text-[10px] text-slate-500 font-normal">day</span> / ₱{c.nightPrice} <span className="text-[10px] text-slate-500 font-normal">night</span>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-lime text-dark-bg font-extrabold text-[10px] uppercase flex-shrink-0 shadow-sm">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-brand-lime/10 text-brand-lime flex items-center justify-center font-bold text-xs">
                        🎾
                      </span>
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Active Court:</span>
                        <span className="text-sm font-bold text-white">{court.name} ({court.type})</span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-brand-lime">
                      ₱{court.dayPrice} <span className="text-[10px] text-slate-500 font-normal">day</span> / ₱{court.nightPrice} <span className="text-[10px] text-slate-500 font-normal">night</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Media carousel */}
              <div className="relative rounded-3xl overflow-hidden bg-slate-900/40 border border-slate-800/85 shadow-2xl aspect-[16/10] md:aspect-[3/2] group">
                {allGalleryImages.length > 0 ? (
                  <>
                    <img
                      src={allGalleryImages[activeImageIndex]?.url}
                      alt={allGalleryImages[activeImageIndex]?.label || court.name}
                      className="w-full h-full object-cover select-none cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                      onClick={() => setIsLightboxOpen(true)}
                    />

                    {/* Equipment Rental Badge overlay if current image is a rental */}
                    {allGalleryImages[activeImageIndex]?.isRental && (
                      <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-brand-lime/40 text-brand-lime backdrop-blur-md shadow-lg text-xs font-extrabold animate-fade-in pointer-events-none">
                        <span>🏓</span>
                        <span>{allGalleryImages[activeImageIndex].label}</span>
                      </div>
                    )}

                    {/* Gallery View Trigger Button Overlay */}
                    <button
                      type="button"
                      onClick={() => setIsGalleryModalOpen(true)}
                      className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 text-white backdrop-blur-md hover:border-brand-lime hover:text-brand-lime transition-all cursor-pointer shadow-xl text-xs font-bold font-sans group"
                      title="Open Full Photo Gallery"
                    >
                      <LayoutGrid className="w-4 h-4 text-brand-lime group-hover:scale-110 transition-transform" />
                      <span>Gallery View ({allGalleryImages.length})</span>
                    </button>

                    {/* Left/Right Arrows if multiple images */}
                    {allGalleryImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-955/80 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-955/80 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Dot indicator bullets */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                          {allGalleryImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                activeImageIndex === idx ? 'bg-brand-lime w-4' : 'bg-white/40'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                    <MapPin className="w-12 h-12 text-slate-700" />
                    <span className="text-xs">No media images uploaded.</span>
                  </div>
                )}
              </div>

              {/* Thumbnails row */}
              {allGalleryImages.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {allGalleryImages.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 md:w-24 aspect-[16/10] rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 relative group cursor-pointer ${
                        activeImageIndex === idx ? 'border-brand-lime scale-[0.98]' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={`${item.label} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover select-none"
                      />
                      {item.isRental && (
                        <div className="absolute top-1 left-1 bg-slate-950/80 text-brand-lime text-[10px] px-1 py-0.5 rounded border border-brand-lime/30 z-10 font-bold">
                          🏓
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    </button>
                  ))}
                </div>
              )}

              {/* Title & category badge */}
              <div className="p-6 glass-panel rounded-3xl space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-brand-lime uppercase tracking-widest block">Verified Court Venue</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mt-1">{court.name}</h1>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-lg bg-brand-lime/10 text-brand-lime border border-brand-lime/20 font-extrabold block">
                    {court.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Region</span>
                    <span className="text-slate-350 font-bold block mt-0.5">{court.province || 'Camarines Sur'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Day Pricing</span>
                    <span className="text-brand-lime font-bold block mt-0.5">₱{court.dayPrice}/hr</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Night Pricing</span>
                    <span className="text-brand-lime font-bold block mt-0.5">₱{court.nightPrice}/hr</span>
                  </div>
                </div>
              </div>

              {/* Google Maps view */}
              {parsedMap.embedUrl ? (
                <div className="p-6 glass-panel rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-brand-lime" />
                      <h3 className="text-lg font-bold text-white">Location Map</h3>
                    </div>
                    
                    {directionsUrl && (
                      <div className="flex items-center gap-2">
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-lime hover:text-white transition-all bg-brand-lime/10 hover:bg-brand-lime/20 px-3 py-1.5 rounded-lg border border-brand-lime/30"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Get Directions</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Address: </strong>
                    {[court.barangay, court.municipality, court.province].filter(Boolean).join(', ') || court.location || 'Location details not set.'}
                  </p>

                  {/* Google Maps embed iframe */}
                  <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/60 relative">
                    <iframe
                      title="Google Maps Location"
                      src={parsedMap.embedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              ) : null}

              {/* Court Owner & Organization Details Section */}
              <div className="p-6 md:p-8 glass-panel rounded-3xl space-y-6 border border-slate-800/80 shadow-2xl relative overflow-hidden">
                {/* Ambient background glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-lime/5 blur-3xl rounded-full pointer-events-none"></div>

                {/* Header: Organization Profile & Verified Badge */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-lime/20 via-brand-emerald/10 to-slate-900 border border-brand-lime/30 flex items-center justify-center text-brand-lime shadow-lg flex-shrink-0 overflow-hidden">
                      {hostDetails?.logoUrl ? (
                        <img src={hostDetails.logoUrl} alt={hostDetails.companyName} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-lime">
                          Court Owner & Organization
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-lime/15 text-brand-lime border border-brand-lime/30">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Verified Organization
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                        {hostDetails?.companyName || 'PicklePoint Verified Venue'}
                      </h3>
                      {hostDetails?.companyAddress && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                          <span>{hostDetails.companyAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Organization Description */}
                {hostDetails?.description && (
                  <p className="text-xs text-slate-350 leading-relaxed">
                    {hostDetails.description}
                  </p>
                )}

                {/* Organization Contact Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime border border-brand-lime/20 flex-shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Organization Phone</span>
                        <span className="text-xs font-bold text-white">{hostDetails?.phone || '+63 917 123 4567'}</span>
                      </div>
                    </div>
                    {hostDetails?.phone && (
                      <a
                        href={`tel:${hostDetails.phone}`}
                        className="px-2.5 py-1 rounded-lg bg-brand-lime/10 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-colors text-[11px] font-bold"
                      >
                        Call
                      </a>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime border border-brand-lime/20 flex-shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Organization Email</span>
                        <span className="text-xs font-bold text-white truncate block">{hostDetails?.email || 'support@picklepoint.com'}</span>
                      </div>
                    </div>
                    {hostDetails?.email && (
                      <a
                        href={`mailto:${hostDetails.email}`}
                        className="px-2.5 py-1 rounded-lg bg-brand-lime/10 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-colors text-[11px] font-bold flex-shrink-0 ml-2"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </div>

                {/* Social & Web Links Footer */}
                {(hostDetails?.websiteUrl || hostDetails?.facebookUrl || hostDetails?.instagramUrl) && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Official Links & Socials:</span>
                    <div className="flex items-center gap-2">
                      {hostDetails?.websiteUrl && (
                        <a
                          href={hostDetails.websiteUrl.startsWith('http') ? hostDetails.websiteUrl : `https://${hostDetails.websiteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-brand-lime border border-slate-800 transition-colors"
                          title="Official Website"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {hostDetails?.facebookUrl && (
                        <a
                          href={hostDetails.facebookUrl.startsWith('http') ? hostDetails.facebookUrl : `https://${hostDetails.facebookUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-brand-lime border border-slate-800 transition-colors"
                          title="Facebook Page"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                          </svg>
                        </a>
                      )}
                      {hostDetails?.instagramUrl && (
                        <a
                          href={hostDetails.instagramUrl.startsWith('http') ? hostDetails.instagramUrl : `https://${hostDetails.instagramUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-brand-lime border border-slate-800 transition-colors"
                          title="Instagram Profile"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Venue Daily Operating Hours Card */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-lime" /> Daily Operating Hours
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                      Weekly Schedule
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {DAYS_OF_WEEK.map(({ key, label }) => {
                      const daySchedule = hostDetails?.operatingHours?.[key] || DEFAULT_OPERATING_HOURS[key];
                      const isDayOff = daySchedule?.isDayOff ?? !daySchedule?.isOpen;

                      const todayDayIndex = new Date().getDay();
                      const dayKeysOrder: (keyof DailyOperatingHoursMap)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const isToday = dayKeysOrder[todayDayIndex] === key;

                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${
                            isToday
                              ? 'bg-brand-lime/10 border-brand-lime/40 text-white'
                              : !isDayOff
                              ? 'bg-slate-900/50 border-slate-800/80 text-slate-300'
                              : 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isToday ? 'text-brand-lime' : isDayOff ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                              {label}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-brand-lime text-dark-bg rounded">
                                Today
                              </span>
                            )}
                          </div>

                          {!isDayOff ? (
                            <span className={`font-semibold ${isToday ? 'text-brand-lime' : 'text-slate-400'}`}>
                              {daySchedule?.openTime || '05:00 AM'} – {daySchedule?.closeTime || '10:00 PM'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60">
                              Day Off
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* VENUE POLICIES & COURT GUIDELINES */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-800/90 shadow-2xl text-left">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-lime/10 border border-brand-lime/20 text-brand-lime">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">
                        Venue Policies & Court Guidelines
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Review booking cancellation, court conduct, and weather policies before reserving.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Cancellation Policy Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-brand-lime font-bold">
                      <FileText className="w-4 h-4" />
                      <span>Cancellation & Refund Policy</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                      {court.policies?.cancellationPolicy ||
                        '• Full Refund (100%): Cancellations submitted at least 24 hours prior to scheduled court time.\n• 50% Credit Voucher: Cancellations submitted between 12 to 24 hours prior.\n• Non-Refundable: Cancellations within 12 hours are non-refundable.'}
                    </p>
                  </div>

                  {/* Court Rules Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-brand-lime font-bold">
                      <Shield className="w-4 h-4" />
                      <span>Court Rules & Etiquette</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                      {court.policies?.rulesPolicy ||
                        '1. Non-marking athletic court shoes are strictly required on all court surfaces.\n2. Paddle rotation rules apply during open play and peak hours.\n3. No glass containers or food allowed inside playing enclosures.'}
                    </p>
                  </div>

                  {/* Weather Policy Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-brand-lime font-bold">
                      <CloudRain className="w-4 h-4" />
                      <span>Rainout & Inclement Weather Policy</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                      {court.policies?.weatherPolicy ||
                        '• Weather Stoppage: For outdoor courts, matches interrupted before 30 minutes will receive a 100% rebooking voucher.\n• Pro-Rated Voucher: Interrupted matches past 30 minutes receive a 50% voucher.'}
                    </p>
                  </div>

                  {/* Equipment Rental Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-brand-lime font-bold">
                      <Trophy className="w-4 h-4" />
                      <span>Equipment Rental Guidelines</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                      {court.policies?.equipmentPolicy ||
                        '• Return Policy: All rented paddles and gear must be returned to reception immediately post match.\n• Gear Care: Renter is responsible for paddle damage (replacement fee: ₱1,500).'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Time Scheduler Panel */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-[96px]">
              <div className="glass-panel rounded-3xl p-6 space-y-6 border border-slate-800 shadow-2xl">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white">Reserve Court</h3>
                  <p className="text-xs text-slate-400 mt-1">Select date and select preferred time slots to checkout.</p>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-lime" /> Choose Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={(() => {
                      const d = new Date();
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch {}
                    }}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlots([]);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-brand-lime transition-all cursor-pointer font-medium"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                {/* Availability Slot check */}
                {!selectedDate ? (
                  <div className="p-8 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20 text-center flex flex-col items-center justify-center min-h-[220px]">
                    <Calendar className="w-10 h-10 text-brand-lime/40 mb-3 animate-pulse" />
                    <h4 className="text-xs font-bold text-white mb-1">Check Availability</h4>
                    <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                      Please select a booking date above to view real-time court availability.
                    </p>
                  </div>
                ) : !user ? (
                  <div className="p-6 border border-slate-850 rounded-2xl bg-slate-900/40 text-center flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
                    <Lock className="w-10 h-10 text-brand-lime/60 mb-3 animate-pulse" />
                    <h4 className="text-xs font-bold text-white mb-1">Authentication Required</h4>
                    <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed mb-4">
                      Sign in or create a player profile to view available slots for <span className="text-brand-lime font-medium">{formatDate(selectedDate)}</span> and book.
                    </p>
                    <div className="flex gap-2.5 w-full max-w-[260px]">
                      <button
                        onClick={() => {
                          localStorage.setItem('picklepoint_pending_court_id', court.id);
                          localStorage.setItem('picklepoint_pending_date', selectedDate);
                          setView('login');
                        }}
                        className="flex-1 py-2.5 rounded-lg text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer shadow-md font-sans"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem('picklepoint_pending_court_id', court.id);
                          localStorage.setItem('picklepoint_pending_date', selectedDate);
                          setView('register');
                        }}
                        className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white border border-slate-800 hover:bg-slate-850 transition-all cursor-pointer font-sans"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                ) : isSelectedDateDayOff || currentSchedule.slots.length === 0 ? (
                  <div className="p-6 border border-slate-800 rounded-2xl bg-slate-950/50 text-center flex flex-col items-center justify-center min-h-[220px] space-y-3 opacity-85 animate-fade-in">
                    <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                      <Clock className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Venue Closed ({isSelectedDateDayOff ? 'Day Off' : 'No Slots Scheduled'})</h4>
                      <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
                        {isSelectedDateDayOff
                          ? `The venue is closed on ${currentSchedule.dayKey ? currentSchedule.dayKey.charAt(0).toUpperCase() + currentSchedule.dayKey.slice(1) + 's' : 'this date'} (Day Off). Please select another date to reserve a court.`
                          : 'No operating hours are scheduled for this date. Please choose another date.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-lime" /> Select Time Slot (1 Hour)
                      </label>
                      {selectedSlots.length > 0 && (
                        <button
                          onClick={() => setSelectedSlots([])}
                          className="text-xs font-bold text-slate-500 hover:text-brand-lime transition-colors cursor-pointer font-sans"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {loadingAvailability ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-2.5 border border-slate-850 rounded-2xl bg-slate-900/10 min-h-[220px]">
                        <span className="w-8 h-8 border-3 border-slate-800 border-t-brand-lime rounded-full animate-spin"></span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Checking availability...</span>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                        {/* AM (Morning) Section */}
                        {currentSchedule.morningSlots.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60">
                                AM (Morning)
                              </span>
                              <div className="h-[1px] bg-slate-800/50 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {currentSchedule.morningSlots.map((slot, idx) => {
                                const price = getSlotPrice(slot.startHour);
                                const isSelected = selectedSlots.includes(slot.time);
                                const isSlotBooked = bookedSlotsForDate.includes(slot.time);
                                const isSlotPassed = isSlotPastOrTooSoon(slot.startHour, selectedDate);
                                const isPlayerConflict = playerConflictsForDate[slot.time];
                                const openPlayInfo = openPlayBlockedSlots[slot.time];
                                const isSlotDisabled = !slot.available || isSlotBooked || isSlotPassed || !!isPlayerConflict || !!openPlayInfo;
                                return (
                                  <button
                                    key={`am-${idx}`}
                                    disabled={isSlotDisabled && !isPlayerConflict && !openPlayInfo}
                                    onClick={() => {
                                      if (openPlayInfo) {
                                        if (confirm(`Open Play Event: "${openPlayInfo.title}" is hosted on this court from ${formatTime12h(openPlayInfo.startTime)} to ${formatTime12h(openPlayInfo.endTime)}.\n\nWould you like to view and register for this Open Play event?`)) {
                                          window.location.href = `/?openplay=${openPlayInfo.eventId}`;
                                        }
                                        return;
                                      }
                                      if (isPlayerConflict) {
                                        alert(`Schedule Conflict: You already have an active reservation at ${isPlayerConflict.courtName} on ${formatDate(selectedDate)} for ${slot.time}. A player cannot book overlapping times across multiple venues.`);
                                        return;
                                      }
                                      handleToggleSlot(slot.time);
                                    }}
                                    title={openPlayInfo ? `Reserved for Open Play: ${openPlayInfo.title}` : (isPlayerConflict ? `Schedule Conflict: Booked at ${isPlayerConflict.courtName} for ${slot.time}` : '')}
                                    className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center ${
                                      openPlayInfo
                                        ? 'bg-purple-950/40 border-purple-800/60 text-purple-200 cursor-pointer hover:border-purple-600 shadow-sm'
                                        : isPlayerConflict
                                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-300 font-medium cursor-pointer shadow-sm hover:border-amber-400'
                                        : isSlotDisabled
                                        ? 'opacity-40 bg-slate-900/20 border-slate-900 text-slate-650 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold font-sans'
                                        : 'bg-dark-bg/60 border-slate-800 text-slate-350 hover:bg-slate-850'
                                    }`}
                                  >
                                    <span>{slot.time.split(' - ')[0]}</span>
                                    <span className={`text-xs font-extrabold ${openPlayInfo ? 'text-purple-300 font-sans' : isPlayerConflict ? 'text-amber-400 font-sans' : isSlotDisabled ? 'text-slate-500' : isSelected ? 'text-dark-bg/85 font-sans' : 'text-brand-lime'}`}>
                                      {openPlayInfo ? '🏆 Open Play' : isPlayerConflict ? 'Conflict' : isSlotBooked ? 'Booked' : `₱${price}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Divider between AM & PM if both present */}
                        {currentSchedule.morningSlots.length > 0 && currentSchedule.afternoonSlots.length > 0 && (
                          <div className="border-t border-slate-800/80 my-3" />
                        )}

                        {/* PM (Afternoon/Evening) Section */}
                        {currentSchedule.afternoonSlots.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/60">
                                PM (Afternoon/Evening)
                              </span>
                              <div className="h-[1px] bg-slate-800/50 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {currentSchedule.afternoonSlots.map((slot, idx) => {
                                const price = getSlotPrice(slot.startHour);
                                const isSelected = selectedSlots.includes(slot.time);
                                const isSlotBooked = bookedSlotsForDate.includes(slot.time);
                                const isSlotPassed = isSlotPastOrTooSoon(slot.startHour, selectedDate);
                                const isPlayerConflict = playerConflictsForDate[slot.time];
                                const openPlayInfo = openPlayBlockedSlots[slot.time];
                                const isSlotDisabled = !slot.available || isSlotBooked || isSlotPassed || !!isPlayerConflict || !!openPlayInfo;
                                return (
                                  <button
                                    key={`pm-${idx}`}
                                    disabled={isSlotDisabled && !isPlayerConflict && !openPlayInfo}
                                    onClick={() => {
                                      if (openPlayInfo) {
                                        if (confirm(`Open Play Event: "${openPlayInfo.title}" is hosted on this court from ${formatTime12h(openPlayInfo.startTime)} to ${formatTime12h(openPlayInfo.endTime)}.\n\nWould you like to view and register for this Open Play event?`)) {
                                          window.location.href = `/?openplay=${openPlayInfo.eventId}`;
                                        }
                                        return;
                                      }
                                      if (isPlayerConflict) {
                                        alert(`Schedule Conflict: You already have an active reservation at ${isPlayerConflict.courtName} on ${formatDate(selectedDate)} for ${slot.time}. A player cannot book overlapping times across multiple venues.`);
                                        return;
                                      }
                                      handleToggleSlot(slot.time);
                                    }}
                                    title={openPlayInfo ? `Reserved for Open Play: ${openPlayInfo.title}` : (isPlayerConflict ? `Schedule Conflict: Booked at ${isPlayerConflict.courtName} for ${slot.time}` : '')}
                                    className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center ${
                                      openPlayInfo
                                        ? 'bg-purple-950/40 border-purple-800/60 text-purple-200 cursor-pointer hover:border-purple-600 shadow-sm'
                                        : isPlayerConflict
                                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-300 font-medium cursor-pointer shadow-sm hover:border-amber-400'
                                        : isSlotDisabled
                                        ? 'opacity-40 bg-slate-900/20 border-slate-900 text-slate-650 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold font-sans'
                                        : 'bg-dark-bg/60 border-slate-800 text-slate-350 hover:bg-slate-850'
                                    }`}
                                  >
                                    <span>{slot.time.split(' - ')[0]}</span>
                                    <span className={`text-xs font-extrabold ${openPlayInfo ? 'text-purple-300 font-sans' : isPlayerConflict ? 'text-amber-400 font-sans' : isSlotDisabled ? 'text-slate-500' : isSelected ? 'text-dark-bg/85 font-sans' : 'text-brand-lime'}`}>
                                      {openPlayInfo ? '🏆 Open Play' : isPlayerConflict ? 'Conflict' : isSlotBooked ? 'Booked' : `₱${price}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Equipment Rentals Add-ons */}
                    {court.rentals && court.rentals.filter(r => r.enabled).length > 0 && (
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-inner transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-brand-lime/10 flex items-center justify-center text-xs">🏓</span>
                            <div>
                              <span className="text-xs font-bold text-slate-200 block">Need Equipment Rentals?</span>
                              <span className="text-[10px] text-slate-400 block font-normal">Paddles, Balls & Gear Add-ons</span>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEquipmentRentalEnabled}
                            onClick={() => {
                              const nextState = !isEquipmentRentalEnabled;
                              setIsEquipmentRentalEnabled(nextState);
                              if (!nextState) {
                                setSelectedRentals({});
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEquipmentRentalEnabled ? 'bg-brand-lime' : 'bg-slate-800 hover:bg-slate-750'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                                isEquipmentRentalEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Expandable Equipment List */}
                        {isEquipmentRentalEnabled && (
                          <div className="space-y-2.5 pt-3 border-t border-slate-800/60 animate-fade-in">
                            {court.rentals.filter(r => r.enabled).map((item) => {
                              const qty = selectedRentals[item.id] || 0;
                              const itemCost = qty > 0 ? getRentalItemCost(item, qty) : 0;
                              const isSelected = qty > 0;
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    setSelectedRentalForModal(item);
                                    setRentalActiveImageIndex(0);
                                    setIsRentalZoomed(false);
                                  }}
                                  className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                                    isSelected 
                                      ? 'border-brand-lime/40 bg-brand-lime/[0.04] shadow-[0_0_12px_rgba(163,230,53,0.06)]' 
                                      : 'border-slate-800/80 bg-slate-950/20 hover:border-slate-750 hover:bg-slate-900/40'
                                  }`}
                                >
                                  {/* Item Image/Icon */}
                                  <div className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center text-xl select-none flex-shrink-0 transition-all relative group/img cursor-pointer ${
                                    isSelected
                                      ? 'bg-brand-lime/10 border border-brand-lime/30'
                                      : 'bg-slate-900 border border-slate-800'
                                  }`}>
                                    {item.images && item.images.length > 0 ? (
                                      <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" />
                                    ) : (
                                      <span>🏓</span>
                                    )}
                                  </div>

                                  {/* Item Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                                    </div>
                                    <p className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">{item.description || 'Quality court equipment'}</p>
                                    <div className="text-[11px] font-extrabold text-brand-lime">
                                      ₱{item.price} <span className="text-[9.5px] font-normal text-slate-400">/{item.pricingType === 'per_hour' ? 'hr' : 'item'}</span>
                                    </div>
                                  </div>

                                  {/* Quantity Controls & Subtotal */}
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 shadow-inner">
                                      <button
                                        type="button"
                                        disabled={qty <= 0}
                                        onClick={() => {
                                          const nextQty = Math.max(0, qty - 1);
                                          setSelectedRentals((prev) => ({ ...prev, [item.id]: nextQty }));
                                        }}
                                        className="w-5 h-5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center text-xs font-black text-white">{qty}</span>
                                      <button
                                        type="button"
                                        disabled={qty >= item.quantity}
                                        onClick={() => {
                                          const nextQty = Math.min(item.quantity, qty + 1);
                                          setSelectedRentals((prev) => ({ ...prev, [item.id]: nextQty }));
                                        }}
                                        className="w-5 h-5 rounded bg-slate-900 border border-slate-800 text-brand-lime font-bold text-xs flex items-center justify-center hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                    
                                    {/* Availability / Subtotal */}
                                    <div className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest mr-1">
                                      {isSelected ? (
                                        <span className="text-brand-lime/90 font-bold">Total: ₱{itemCost}</span>
                                      ) : (
                                        <span>Available: {item.quantity}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {error && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {error}
                      </div>
                    )}

                    {/* Cost Breakdown */}
                    {selectedSlots.length > 0 && (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Court ({selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''})</span>
                          <span className="font-bold text-white font-sans">₱{totalSlotsCost}</span>
                        </div>
                        {totalRentalsCost > 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>Equipment rentals</span>
                            <span className="font-bold text-white font-sans">₱{totalRentalsCost}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                          <span className="text-slate-300">Total</span>
                          <span className="text-brand-lime font-sans">₱{totalCost}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        disabled={selectedSlots.length === 0}
                        onClick={handleProceedToCheckout}
                        className={`w-full py-3.5 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 transition-all duration-300 ${
                          selectedSlots.length > 0
                            ? 'bg-brand-lime text-dark-bg shadow-lg shadow-brand-lime/15 hover:scale-[1.01] cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        {selectedSlots.length > 0
                          ? `Checkout (₱${totalCost})`
                          : 'Select Slots to Reserve'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox fullscreen Modal */}
      {isLightboxOpen && allGalleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-lg overflow-hidden animate-fade-in select-none"
          onClick={() => {
            setIsLightboxOpen(false);
            setIsZoomed(false);
          }}
        >
          {/* Top Panel (Context info & Close Button) */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="text-left">
              <h4 className="text-white text-sm font-extrabold">{allGalleryImages[activeImageIndex]?.label || court.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Image {activeImageIndex + 1} of {allGalleryImages.length}
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsLightboxOpen(false);
                setIsZoomed(false);
              }}
              className="text-slate-400 hover:text-white hover:scale-105 cursor-pointer transition-all p-2.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Interactive Zoom Area */}
          <div 
            className="relative max-w-5xl w-full h-[70vh] flex items-center justify-center animate-scale-in mt-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Arrows inside lightbox */}
            {allGalleryImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-2 md:-left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 border border-slate-800 text-slate-350 flex items-center justify-center hover:bg-brand-lime hover:text-dark-bg cursor-pointer transition-all z-20 shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-2 md:-right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 border border-slate-800 text-slate-350 flex items-center justify-center hover:bg-brand-lime hover:text-dark-bg cursor-pointer transition-all z-20 shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Zoomable Image Container */}
            <div 
              className={`w-full h-full rounded-2xl overflow-hidden bg-slate-950/60 border border-slate-900 flex items-center justify-center relative select-none ${
                isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
              onMouseMove={(e) => {
                if (!isZoomed) return;
                const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - left) / width) * 100;
                const y = ((e.clientY - top) / height) * 100;
                setZoomPosition({ x, y });
              }}
            >
              <img
                src={allGalleryImages[activeImageIndex]?.url || court.images?.[0]}
                alt={allGalleryImages[activeImageIndex]?.label || `${court.name} - Full View`}
                className="max-w-full max-h-full object-contain transition-transform duration-200 select-none pointer-events-none"
                style={{
                  transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                  transformOrigin: isZoomed ? `${zoomPosition.x}% ${zoomPosition.y}%` : 'center',
                }}
              />
              
              {/* Tap to zoom tooltip hint */}
              <div className="absolute bottom-4 left-4 bg-slate-900/70 border border-slate-800 text-xs text-slate-400 px-2.5 py-1 rounded-md pointer-events-none flex items-center gap-1.5 backdrop-blur-sm z-10 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse"></span>
                <span>{isZoomed ? 'Click to zoom out' : 'Click anywhere on image to zoom'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnails/Indicators Strip inside lightbox */}
          {allGalleryImages.length > 1 && (
            <div 
              className="absolute bottom-6 flex gap-2 z-10 max-w-full overflow-x-auto px-4 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              {allGalleryImages.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setIsZoomed(false);
                  }}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer relative ${
                    activeImageIndex === idx ? 'border-brand-lime scale-95 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                  {item.isRental && (
                    <div className="absolute top-0.5 left-0.5 bg-slate-955/80 text-brand-lime text-[9px] px-1 py-0.2 rounded border border-brand-lime/30 z-10 font-bold">
                      🏓
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Equipment Rental Detail Modal */}
      {selectedRentalForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden animate-fade-in"
          onClick={() => {
            setSelectedRentalForModal(null);
            setIsRentalZoomed(false);
          }}
        >
          <div 
            className="glass-panel max-w-lg w-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/95 shadow-2xl flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/30">
              <div>
                <span className="text-xs font-bold text-brand-lime uppercase tracking-widest bg-brand-lime/10 px-2 py-0.5 rounded-full border border-brand-lime/20 font-sans">Equipment Spec</span>
                <h3 className="text-base font-semibold text-white mt-1">{selectedRentalForModal.name}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedRentalForModal(null);
                  setIsRentalZoomed(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer transition-colors p-2 rounded-xl bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Image Viewport Container */}
              {selectedRentalForModal.images && selectedRentalForModal.images.length > 0 ? (
                <div className="space-y-3">
                  <div 
                    className={`w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center relative select-none ${
                      isRentalZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                    onClick={() => setIsRentalZoomed(!isRentalZoomed)}
                    onMouseMove={(e) => {
                      if (!isRentalZoomed) return;
                      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - left) / width) * 100;
                      const y = ((e.clientY - top) / height) * 100;
                      setRentalZoomPosition({ x, y });
                    }}
                  >
                    {/* Navigation Arrows if multiple images */}
                    {selectedRentalForModal.images.length > 1 && !isRentalZoomed && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            prevRentalImage(selectedRentalForModal.images!);
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/90 border border-slate-850 text-slate-350 flex items-center justify-center hover:bg-brand-lime hover:text-dark-bg cursor-pointer transition-all z-10 shadow"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            nextRentalImage(selectedRentalForModal.images!);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/90 border border-slate-850 text-slate-350 flex items-center justify-center hover:bg-brand-lime hover:text-dark-bg cursor-pointer transition-all z-10 shadow"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <img
                      src={selectedRentalForModal.images[rentalActiveImageIndex]}
                      alt={selectedRentalForModal.name}
                      className="max-w-full max-h-full object-contain transition-transform duration-200 select-none pointer-events-none"
                      style={{
                        transform: isRentalZoomed ? 'scale(2.2)' : 'scale(1)',
                        transformOrigin: isRentalZoomed ? `${rentalZoomPosition.x}% ${rentalZoomPosition.y}%` : 'center',
                      }}
                    />

                    {/* Hint overlay */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 border border-slate-850 text-xs text-slate-400 px-2.5 py-0.5 rounded pointer-events-none flex items-center gap-1.5 backdrop-blur-sm z-10 font-sans">
                      <span className="w-1 h-1 rounded-full bg-brand-lime animate-pulse"></span>
                      <span>{isRentalZoomed ? 'Click to zoom out' : 'Click anywhere on image to zoom'}</span>
                    </div>
                  </div>

                  {/* Thumbnail Strip inside Modal */}
                  {selectedRentalForModal.images.length > 1 && (
                    <div className="flex gap-2 justify-center py-1">
                      {selectedRentalForModal.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setRentalActiveImageIndex(idx);
                            setIsRentalZoomed(false);
                          }}
                          className={`w-12 h-9 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            rentalActiveImageIndex === idx ? 'border-brand-lime scale-95 shadow' : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="rental thumbnail" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900/20 border border-slate-850 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <span className="text-3xl">🏓</span>
                  <span className="text-xs">No product images available.</span>
                </div>
              )}

              {/* Specs and Details */}
              <div className="space-y-4">
                <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider font-sans">Rental Price</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold text-brand-lime font-sans">₱{selectedRentalForModal.price}</span>
                      <span className="text-xs text-slate-400">/ {selectedRentalForModal.pricingType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider font-sans">Availability</div>
                    <div className="text-xs font-bold text-white font-sans">
                      {selectedRentalForModal.quantity} units in stock
                    </div>
                  </div>
                </div>

                {selectedRentalForModal.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Description</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/30 border border-slate-850/60 p-3.5 rounded-2xl italic">
                      {selectedRentalForModal.description}
                    </p>
                  </div>
                )}

                {/* Equipment Rentals Add-ons */}
                {court.rentals && court.rentals.filter(r => r.enabled).length > 0 && (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-inner transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-brand-lime/10 flex items-center justify-center text-xs">🏓</span>
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Need Equipment Rentals?</span>
                          <span className="text-[10px] text-slate-400 block font-normal">Paddles, Balls & Gear Add-ons</span>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEquipmentRentalEnabled}
                        onClick={() => {
                          const nextState = !isEquipmentRentalEnabled;
                          setIsEquipmentRentalEnabled(nextState);
                          if (!nextState) {
                            setSelectedRentals({});
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEquipmentRentalEnabled ? 'bg-brand-lime' : 'bg-slate-800 hover:bg-slate-750'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                            isEquipmentRentalEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Expandable Equipment List */}
                    {isEquipmentRentalEnabled && (
                      <div className="space-y-2.5 pt-3 border-t border-slate-800/60 animate-fade-in">
                        {court.rentals.filter(r => r.enabled).map((item) => {
                          const qty = selectedRentals[item.id] || 0;
                          const itemCost = qty > 0 ? getRentalItemCost(item, qty) : 0;
                          const isSelected = qty > 0;
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedRentalForModal(item);
                                setRentalActiveImageIndex(0);
                                setIsRentalZoomed(false);
                              }}
                              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                                isSelected 
                                  ? 'border-brand-lime/40 bg-brand-lime/[0.04] shadow-[0_0_12px_rgba(163,230,53,0.06)]' 
                                  : 'border-slate-800/80 bg-slate-950/20 hover:border-slate-750 hover:bg-slate-900/40'
                              }`}
                            >
                              {/* Item Image/Icon */}
                              <div className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center text-xl select-none flex-shrink-0 transition-all relative group/img cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-lime/10 border border-brand-lime/30'
                                  : 'bg-slate-900 border border-slate-800'
                              }`}>
                                {item.images && item.images.length > 0 ? (
                                  <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" />
                                ) : (
                                  <span>🏓</span>
                                )}
                              </div>

                              {/* Item Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">{item.description || 'Quality court equipment'}</p>
                                <div className="text-[11px] font-extrabold text-brand-lime">
                                  ₱{item.price} <span className="text-[9.5px] font-normal text-slate-400">/{item.pricingType === 'per_hour' ? 'hr' : 'item'}</span>
                                </div>
                              </div>

                              {/* Quantity Controls & Subtotal */}
                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 shadow-inner">
                                  <button
                                    type="button"
                                    disabled={qty <= 0}
                                    onClick={() => {
                                      const nextQty = Math.max(0, qty - 1);
                                      setSelectedRentals((prev) => ({ ...prev, [item.id]: nextQty }));
                                    }}
                                    className="w-5 h-5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center text-xs font-black text-white">{qty}</span>
                                  <button
                                    type="button"
                                    disabled={qty >= item.quantity}
                                    onClick={() => {
                                      const nextQty = Math.min(item.quantity, qty + 1);
                                      setSelectedRentals((prev) => ({ ...prev, [item.id]: nextQty }));
                                    }}
                                    className="w-5 h-5 rounded bg-slate-900 border border-slate-800 text-brand-lime font-bold text-xs flex items-center justify-center hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                                
                                {/* Availability / Subtotal */}
                                <div className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest mr-1">
                                  {isSelected ? (
                                    <span className="text-brand-lime/90 font-bold">Total: ₱{itemCost}</span>
                                  ) : (
                                    <span>Available: {item.quantity}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE GALLERY VIEW MODAL */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col animate-fade-in text-left overflow-hidden">
          {/* Top Header Bar */}
          <div className="p-4 md:px-8 md:py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 shadow-2xl">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-white flex items-center gap-2 font-sans tracking-tight">
                <LayoutGrid className="w-5 h-5 text-brand-lime" />
                {court.name} — Photo Gallery
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Explore {allGalleryImages.length} high-definition venue, surface, and equipment photos
              </p>
            </div>

            {/* Desktop Filter Pills & Close Button */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setGalleryFilterTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    galleryFilterTab === 'all'
                      ? 'bg-brand-lime text-dark-bg shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  All Photos ({allGalleryImages.length})
                </button>
                <button
                  onClick={() => setGalleryFilterTab('courts')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    galleryFilterTab === 'courts'
                      ? 'bg-brand-lime text-dark-bg shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Court & Venue ({allGalleryImages.filter(i => !i.isRental).length})
                </button>
                {allGalleryImages.some(i => i.isRental) && (
                  <button
                    onClick={() => setGalleryFilterTab('rentals')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      galleryFilterTab === 'rentals'
                        ? 'bg-brand-lime text-dark-bg shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Equipment ({allGalleryImages.filter(i => i.isRental).length})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsGalleryModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                title="Close Gallery View"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Filter Row */}
          <div className="sm:hidden p-3 border-b border-slate-800 bg-slate-900/40 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setGalleryFilterTab('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap ${
                galleryFilterTab === 'all' ? 'bg-brand-lime text-dark-bg' : 'bg-slate-900 text-slate-400'
              }`}
            >
              All ({allGalleryImages.length})
            </button>
            <button
              onClick={() => setGalleryFilterTab('courts')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap ${
                galleryFilterTab === 'courts' ? 'bg-brand-lime text-dark-bg' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Court Surfaces ({allGalleryImages.filter(i => !i.isRental).length})
            </button>
            {allGalleryImages.some(i => i.isRental) && (
              <button
                onClick={() => setGalleryFilterTab('rentals')}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap ${
                  galleryFilterTab === 'rentals' ? 'bg-brand-lime text-dark-bg' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Equipment ({allGalleryImages.filter(i => i.isRental).length})
              </button>
            )}
          </div>

          {/* Gallery Photo Grid Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {allGalleryImages
                .filter((img) => {
                  if (galleryFilterTab === 'courts') return !img.isRental;
                  if (galleryFilterTab === 'rentals') return img.isRental;
                  return true;
                })
                .map((img, idx) => {
                  const originalIndex = allGalleryImages.findIndex(i => i.url === img.url);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveImageIndex(originalIndex >= 0 ? originalIndex : 0);
                        setIsLightboxOpen(true);
                      }}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 cursor-zoom-in hover:border-brand-lime hover:scale-[1.02] transition-all shadow-xl"
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 select-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                        <span className={`self-start text-[10px] font-extrabold px-2.5 py-1 rounded-xl border backdrop-blur-md uppercase tracking-wider ${
                          img.isRental
                            ? 'bg-purple-950/90 border-purple-500/40 text-purple-300'
                            : 'bg-slate-950/90 border-brand-lime/40 text-brand-lime'
                        }`}>
                          {img.isRental ? '🏓 Equipment Rental' : '🏆 Venue Photo'}
                        </span>
                        <div className="flex justify-between items-center text-white">
                          <span className="text-xs font-bold truncate pr-2 font-sans">{img.label}</span>
                          <Eye className="w-4 h-4 text-brand-lime shrink-0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


