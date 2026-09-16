import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, CheckCircle, Lock, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, X, Eye, ExternalLink, Building2, BadgeCheck, Phone, Mail, Globe, FileText, Shield, CloudRain, Trophy, LayoutGrid, Layers, Navigation, CheckCircle2, Sun, Moon, Sparkles, Filter, Info, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, getDoc, doc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { parseGoogleMapsUrl } from '../utils/mapUtils';
import { isSubscriptionExpired } from './admin/adminTypes';

import type { DailyOperatingHoursMap } from './AdminDashboard';
import {
  DEFAULT_OPERATING_HOURS,
  DAYS_OF_WEEK,
  MASTER_SLOTS,
  getScheduleForDate,
  generateTimeSlots,
  formatHourTo12h,
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
  initialSelectedDate?: string;
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding' | 'privacy') => void;
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null;
  setSelectedCourtId: (id: string, targetDate?: string) => void;
  setCheckoutDetails: (details: any) => void;
}

export default function CourtDetails({ courtId, initialSelectedDate, setView, user, setSelectedCourtId, setCheckoutDetails }: CourtDetailsProps) {
  const [court, setCourt] = useState<Court | null>(null);
  const [loadingCourt, setLoadingCourt] = useState(true);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate || '');

  useEffect(() => {
    if (initialSelectedDate !== undefined) {
      setSelectedDate(initialSelectedDate);
    }
  }, [initialSelectedDate]);
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
  const [approvedSlotsForDate, setApprovedSlotsForDate] = useState<string[]>([]);
  const [pendingSlotsForDate, setPendingSlotsForDate] = useState<string[]>([]);
  const [playerConflictsForDate, setPlayerConflictsForDate] = useState<Record<string, { courtName: string }>>({});
  const [openPlayBlockedSlots, setOpenPlayBlockedSlots] = useState<Record<string, { eventId: string; title: string; category: string; startTime: string; endTime: string }>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [slotFilterTab, setSlotFilterTab] = useState<'all' | 'am' | 'pm'>('all');
  const [isCourtDropdownOpen, setIsCourtDropdownOpen] = useState(false);

  const handleSelectAllAvailable = (slotsToFilter: any[]) => {
    if (!slotsToFilter || slotsToFilter.length === 0) return;
    const availableTimes = slotsToFilter
      .filter((slot) => {
        const isSlotApproved = approvedSlotsForDate.includes(slot.time);
        const isSlotPending = pendingSlotsForDate.includes(slot.time);
        const isSlotPassed = isSlotPastOrTooSoon(slot.startHour, selectedDate);
        const isPlayerConflict = playerConflictsForDate[slot.time];
        const openPlayInfo = openPlayBlockedSlots[slot.time];
        return slot.available && !isSlotApproved && !isSlotPending && !isSlotPassed && !isPlayerConflict && !openPlayInfo;
      })
      .map((s) => s.time);

    setSelectedSlots(availableTimes);
  };
  
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
    loadVenueCourts(newCourt);
  };

  useEffect(() => {
    const targetCourtId = courtId || localStorage.getItem('picklepoint_pending_court_id');
    if (!targetCourtId) {
      setLoadingCourt(false);
      return;
    }

    // Skip redundant fetch if already active court matching targetCourtId
    if (court && court.id === targetCourtId) {
      setLoadingCourt(false);
      return;
    }

    const fetchCourtDetails = async () => {
      if (!court || court.id !== targetCourtId) {
        setLoadingCourt(true);
      }
      let foundCourt: Court | null = null;
      if (isFirebaseConfigured && db) {
        try {
          const docRef = doc(db, 'courts', targetCourtId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            foundCourt = { id: docSnap.id, ...docSnap.data() } as Court;
          }
        } catch (err) {
          console.warn('Error fetching court details from Firestore, trying local fallback:', err);
        }
      }

      if (!foundCourt) {
        try {
          const courtsStr = localStorage.getItem('picklepoint_courts');
          const localCourts = courtsStr ? JSON.parse(courtsStr) : [];
          foundCourt = localCourts.find((c: Court) => c.id === targetCourtId) || null;
        } catch (err) {
          console.error('Error loading court details from LocalStorage:', err);
        }
      }

      if (foundCourt) {
        if (isFirebaseConfigured && db) {
          try {
            const compId = foundCourt.companyId;
            if (compId) {
              const compSnap = await getDoc(doc(db, 'companies', compId));
              if (compSnap.exists() && isSubscriptionExpired(compSnap.data())) {
                foundCourt.published = false;
              }
            }
          } catch (e) {}
        }
        setCourt(foundCourt);
        loadVenueCourts(foundCourt);
      }
      setLoadingCourt(false);
    };

    fetchCourtDetails();
  }, [courtId]);

  // Fetch bookings dynamically when selectedDate or court.id changes
  useEffect(() => {
    if (!selectedDate || !court?.id) {
      setApprovedSlotsForDate([]);
      setPendingSlotsForDate([]);
      setPlayerConflictsForDate({});
      return;
    }

    const isSameDateStr = (d1?: string, d2?: string): boolean => {
      if (!d1 || !d2) return false;
      const clean1 = String(d1).trim().split('T')[0];
      const clean2 = String(d2).trim().split('T')[0];
      if (clean1 === clean2) return true;

      const p1 = clean1.split('-').map((n) => parseInt(n, 10));
      const p2 = clean2.split('-').map((n) => parseInt(n, 10));
      if (p1.length === 3 && p2.length === 3 && !isNaN(p1[0]) && !isNaN(p2[0])) {
        return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
      }
      return false;
    };

    const parseTimeHour = (timeStr?: string): number => {
      if (!timeStr) return 0;
      const trimmed = String(timeStr).trim();

      // 1. Check hh:mm AM/PM or h:mm AM/PM
      const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match12) {
        let h = parseInt(match12[1], 10);
        const pm = match12[3].toUpperCase() === 'PM';
        if (pm && h < 12) h += 12;
        if (!pm && h === 12) h = 0;
        return h;
      }

      // 2. Check 6pm / 9am / 18pm short formats
      const matchShort = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
      if (matchShort) {
        let h = parseInt(matchShort[1], 10);
        const pm = matchShort[2].toUpperCase() === 'PM';
        if (pm && h < 12) h += 12;
        if (!pm && h === 12) h = 0;
        return h;
      }

      // 3. Check 24-hour hh:mm or h:mm
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
      const approved: string[] = [];
      const pending: string[] = [];
      const conflicts: Record<string, { courtName: string }> = {};
      const openPlayBlocks: Record<string, { eventId: string; title: string; category: string; startTime: string; endTime: string }> = {};
      const currentUserEmail = user?.email?.toLowerCase();
      const currentUserUid = user?.uid;

      // Helper to process an Open Play event for slot blocking
      const processOpenPlayEvent = (ev: any, docId: string) => {
        if (!ev || ev.status === 'cancelled') return;
        const evDate = ev.eventDate || ev.date;
        if (!isSameDateStr(evDate, selectedDate)) return;

        const isCourtMatch =
          !ev.courtIds ||
          !Array.isArray(ev.courtIds) ||
          ev.courtIds.length === 0 ||
          ev.courtIds.some((cid: any) => String(cid) === String(court.id)) ||
          String(ev.courtId) === String(court.id) ||
          (Array.isArray(ev.courtNames) && court.name && ev.courtNames.includes(court.name)) ||
          (ev.companyId && court.companyId && String(ev.companyId) === String(court.companyId));

        if (isCourtMatch) {
          const startH = parseTimeHour(ev.startTime);
          let endH = parseTimeHour(ev.endTime);
          if (endH <= startH && (endH === 0 || endH <= 5)) {
            endH = 24;
          }

          MASTER_SLOTS.forEach((s) => {
            if (s.startHour >= startH && s.startHour < endH) {
              openPlayBlocks[s.time] = {
                eventId: docId || ev.id,
                title: ev.title || 'Open Play Session',
                category: ev.category || 'Open Play',
                startTime: ev.startTime || '13:00',
                endTime: ev.endTime || '19:00',
              };
            }
          });
        }
      };

      const processBookingItem = (data: any) => {
        if (!data || data.status === 'cancelled' || data.status === 'rejected' || data.paymentStatus === 'cancelled' || data.paymentStatus === 'failed') {
          return;
        }

        const bDate = data.date || data.eventDate || data.bookingDate;
        if (!isSameDateStr(bDate, selectedDate)) {
          return;
        }

        const slots = data.slots || data.timeSlots || (data.slot ? [data.slot] : []);
        if (!Array.isArray(slots) || slots.length === 0) {
          return;
        }

        const targetCourtId = String(court.id || '').trim();
        const targetCourtName = String(court.name || '').trim().toLowerCase();

        const dataCourtId = String(data.courtId || data.court_id || '').trim();
        const dataCourtName = String(data.courtName || data.court_name || '').trim().toLowerCase();

        const isTargetCourt =
          (dataCourtId && targetCourtId && dataCourtId === targetCourtId) ||
          (dataCourtName && targetCourtName && dataCourtName === targetCourtName) ||
          (!dataCourtId && !dataCourtName && venueCourts.length <= 1);

        if (isTargetCourt) {
          const isApproved =
            data.status === 'approved' ||
            data.status === 'confirmed' ||
            data.status === 'completed' ||
            data.status === 'active' ||
            data.paymentStatus === 'paid' ||
            data.paymentStatus === 'approved';

          if (isApproved) {
            approved.push(...slots);
          } else {
            pending.push(...slots);
          }
        } else if (currentUserEmail || currentUserUid) {
          const bEmail = data.userEmail?.toLowerCase() || data.user?.email?.toLowerCase();
          const bUid = data.userId || data.user?.uid;
          const isSamePlayer = (currentUserEmail && bEmail === currentUserEmail) || (currentUserUid && bUid === currentUserUid);
          if (isSamePlayer) {
            const conflictCourtName = data.courtName || data.ownerCompanyName || 'Another Venue';
            slots.forEach((st: string) => {
              conflicts[st] = { courtName: conflictCourtName };
            });
          }
        }
      };

      if (isFirebaseConfigured && db) {
        try {
          const bookingsRef = collection(db, 'bookings');
          const allSnap = await getDocs(bookingsRef);
          allSnap.forEach((docSnap) => {
            processBookingItem(docSnap.data());
          });
        } catch (err) {
          console.error('Error fetching bookings:', err);
        }

        // Fetch Open Play from Firestore
        try {
          const opSnap = await getDocs(collection(db, 'openplay_events'));
          opSnap.forEach((docSnap) => {
            processOpenPlayEvent(docSnap.data(), docSnap.id);
          });
        } catch (e) {
          console.warn('Error fetching Open Play events for court availability:', e);
        }
      }

      // Merge LocalStorage bookings for instant offline and multi-tab sync
      try {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        const localBookings = bookingsStr ? JSON.parse(bookingsStr) : [];
        if (Array.isArray(localBookings)) {
          localBookings.forEach((b: any) => {
            processBookingItem(b);
          });
        }
      } catch (err) {
        console.error('Error loading local bookings fallback:', err);
      }

      // Merge LocalStorage / SessionStorage Open Play events
      try {
        const opStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
        if (opStr) {
          const localEvents = JSON.parse(opStr);
          if (Array.isArray(localEvents)) {
            localEvents.forEach((ev: any) => {
              processOpenPlayEvent(ev, ev.id);
            });
          }
        }
      } catch (e) {}
      
      // Ensure unique lists
      const uniqueApproved = [...new Set(approved)];
      const uniquePending = [...new Set(pending)].filter((st) => !uniqueApproved.includes(st));
      setApprovedSlotsForDate(uniqueApproved);
      setPendingSlotsForDate(uniquePending);
      setPlayerConflictsForDate(conflicts);
      setOpenPlayBlockedSlots(openPlayBlocks);
      setLoadingAvailability(false);
    };

    fetchBookingsForDate();

    // Listen to local window events for instant UI updates
    const handleLocalBookingUpdate = () => {
      fetchBookingsForDate();
    };
    window.addEventListener('storage', handleLocalBookingUpdate);
    window.addEventListener('picklepoint_booking_added', handleLocalBookingUpdate);

    // Set up real-time Firestore listener for live bookings updates
    let unsubscribeFirebase: (() => void) | undefined;
    if (isFirebaseConfigured && db) {
      try {
        const bookingsRef = collection(db, 'bookings');
        unsubscribeFirebase = onSnapshot(bookingsRef, () => {
          fetchBookingsForDate();
        });
      } catch (err) {
        console.warn('Real-time bookings snapshot subscription error:', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleLocalBookingUpdate);
      window.removeEventListener('picklepoint_booking_added', handleLocalBookingUpdate);
      if (unsubscribeFirebase) unsubscribeFirebase();
    };
  }, [selectedDate, court?.id, court?.name, user?.email, user?.uid]);

  const effectiveOperatingHours = court?.operatingHours || hostDetails?.operatingHours || DEFAULT_OPERATING_HOURS;

  const currentSchedule = useMemo(() => {
    const baseSched = getScheduleForDate(selectedDate, effectiveOperatingHours);
    if (!baseSched || baseSched.isDayOff) return baseSched;

    // Check if any Open Play block extends past baseSched.closeHour
    let maxHour = baseSched.closeHour;
    Object.keys(openPlayBlockedSlots).forEach((slotTime) => {
      const slotObj = MASTER_SLOTS.find((s) => s.time === slotTime);
      if (slotObj && slotObj.startHour + 1 > maxHour) {
        maxHour = slotObj.startHour + 1;
      }
    });

    if (maxHour > baseSched.closeHour) {
      const extendedSlots = generateTimeSlots(baseSched.openHour, maxHour);
      return {
        ...baseSched,
        closeHour: maxHour,
        closeTime: formatHourTo12h(maxHour),
        slots: extendedSlots,
        morningSlots: extendedSlots.filter((s) => s.startHour < 12),
        afternoonSlots: extendedSlots.filter((s) => s.startHour >= 12),
      };
    }

    return baseSched;
  }, [selectedDate, effectiveOperatingHours, openPlayBlockedSlots]);

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
    <section className={`relative pt-24 md:pt-32 transition-all ${selectedSlots.length > 0 ? 'pb-32 md:pb-36' : 'pb-20 md:pb-28'}`}>
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-emerald/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-lime/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              setSelectedCourtId('');
              if (user?.isAdmin || user?.role === 'client_admin' || user?.role === 'manager' || user?.role === 'super_admin') {
                setView('admin');
              } else {
                setView('landing');
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-brand-lime transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{user?.isAdmin || user?.role === 'client_admin' || user?.role === 'manager' || user?.role === 'super_admin' ? 'Back to Admin Dashboard' : 'Back to Venues'}</span>
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
              <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5 animate-fade-in relative z-40">
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

                {/* Custom Court Selection Dropdown Box */}
                <div className="space-y-2.5 pt-1 w-full max-w-full relative z-40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-brand-lime" />
                      <span>Select Court ({venueCourts.length} {venueCourts.length === 1 ? 'Available' : 'Available'}):</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {venueCourts.length > 1 ? 'Click dropdown to switch' : 'Active court'}
                    </span>
                  </div>

                  {/* Dropdown Selector Button */}
                  <div className="relative w-full max-w-full">
                    <button
                      type="button"
                      onClick={() => venueCourts.length > 1 && setIsCourtDropdownOpen(!isCourtDropdownOpen)}
                      className={`w-full bg-slate-900 border ${
                        isCourtDropdownOpen ? 'border-brand-lime' : 'border-slate-800 hover:border-slate-700'
                      } text-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all cursor-pointer shadow-lg font-sans group ${
                        venueCourts.length <= 1 ? 'cursor-default' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-brand-lime/15 border border-brand-lime/30 text-brand-lime flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                          🎾
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-extrabold text-white truncate">
                              {court?.name || 'Select Court'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-300 shrink-0">
                              {court?.type || 'Standard Court'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {court && (
                          <div className="hidden xs:flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Rate</span>
                            <span className="text-xs sm:text-sm font-black text-brand-lime mt-0.5">
                              ₱{court.dayPrice}{court.dayPrice !== court.nightPrice ? `/₱${court.nightPrice}` : ''}<span className="text-[10px] font-normal text-slate-400">/hr</span>
                            </span>
                          </div>
                        )}

                        {venueCourts.length > 1 && (
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-brand-lime flex items-center justify-center shrink-0">
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCourtDropdownOpen ? 'rotate-180 text-brand-lime' : 'text-slate-400 group-hover:text-white'}`} />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Dropdown Options Popup Menu */}
                    {isCourtDropdownOpen && venueCourts.length > 1 && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[100] bg-slate-950 border border-brand-lime/50 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-2 space-y-1.5 backdrop-blur-2xl animate-fade-in max-h-72 overflow-y-auto custom-scrollbar">
                        {venueCourts.map((c, idx) => {
                          const isSelected = c.id === court?.id;
                          const isSamePrice = c.dayPrice === c.nightPrice;

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                handleSwitchCourt(c);
                                setIsCourtDropdownOpen(false);
                              }}
                              className={`w-full p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-brand-lime/15 border-brand-lime/50 text-white font-extrabold shadow-sm'
                                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                  isSelected ? 'bg-brand-lime text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-sm font-extrabold truncate ${isSelected ? 'text-brand-lime' : 'text-white'}`}>
                                    {c.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-semibold truncate">
                                    {c.type || 'Standard Court'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 font-sans">
                                <span className="text-xs font-black text-brand-lime bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                  ₱{c.dayPrice}{!isSamePrice ? `/₱${c.nightPrice}` : ''}/hr
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reserve Court / Time Scheduler Panel (Right Column on Desktop, directly after Select Court section on Mobile/Tablet) */}
            <div className="lg:col-span-5 lg:row-span-2 lg:col-start-8 lg:row-start-1 space-y-6 lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto pr-0.5 custom-scrollbar w-full max-w-full">
              <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6 border border-slate-800 shadow-2xl">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-xl font-extrabold text-white">Reserve Court</h3>
                  <p className="text-sm text-slate-300 mt-1">Select date and preferred time slots to checkout.</p>
                </div>

                {/* Date Selection */}
                <div className="space-y-2 w-full max-w-full overflow-hidden box-border min-w-0">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-lime shrink-0" /> Choose Date
                  </label>
                  <div className="relative w-full max-w-full box-border min-w-0 overflow-hidden">
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
                      className="w-full max-w-full box-border bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 sm:px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-brand-lime transition-all cursor-pointer font-bold block min-w-0 appearance-none"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Open Play Alert Banner if an Open Play session exists on this court & date */}
                {selectedDate && Object.keys(openPlayBlockedSlots).length > 0 && (() => {
                  const firstBlock = Object.values(openPlayBlockedSlots)[0];
                  return (
                    <div className="p-4 border border-purple-800/80 rounded-2xl bg-purple-950/40 text-purple-200 space-y-2.5 animate-fade-in shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black uppercase tracking-wider text-purple-300 flex items-center gap-2 font-sans">
                          <Trophy className="w-4.5 h-4.5 text-purple-400" /> Open Play Session Scheduled
                        </span>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-purple-900/80 border border-purple-700/60 text-purple-200">
                          Court Locked
                        </span>
                      </div>
                      <p className="text-sm text-purple-200/95 font-medium leading-relaxed">
                        <strong className="text-white">{firstBlock.title}</strong> is hosted on this court from{' '}
                        <span className="text-purple-300 font-bold font-sans">{formatTime12h(firstBlock.startTime)}</span> to{' '}
                        <span className="text-purple-300 font-bold font-sans">{formatTime12h(firstBlock.endTime)}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/?openplay=${firstBlock.eventId}`;
                        }}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer font-sans"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>View & Join Open Play Session</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Availability Slot check */}
                {!selectedDate ? (
                  <div className="p-8 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20 text-center flex flex-col items-center justify-center min-h-[220px]">
                    <Calendar className="w-10 h-10 text-brand-lime/40 mb-3 animate-pulse" />
                    <h4 className="text-sm font-bold text-white mb-1">Check Availability</h4>
                    <p className="text-sm text-slate-300 max-w-[240px] leading-relaxed">
                      Please select a booking date above to view real-time court availability.
                    </p>
                  </div>
                ) : !user ? (
                  <div className="p-6 border border-slate-850 rounded-2xl bg-slate-900/40 text-center flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
                    <Lock className="w-10 h-10 text-brand-lime/60 mb-3 animate-pulse" />
                    <h4 className="text-sm font-bold text-white mb-1">Authentication Required</h4>
                    <p className="text-sm text-slate-300 max-w-[260px] leading-relaxed mb-4">
                      Sign in or create a player profile to view available slots for <span className="text-brand-lime font-bold">{formatDate(selectedDate)}</span> and book.
                    </p>
                    <div className="flex gap-2.5 w-full max-w-[280px]">
                      <button
                        onClick={() => {
                          localStorage.setItem('picklepoint_pending_court_id', court.id);
                          localStorage.setItem('picklepoint_pending_date', selectedDate);
                          setView('login');
                        }}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer shadow-md font-sans"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem('picklepoint_pending_court_id', court.id);
                          localStorage.setItem('picklepoint_pending_date', selectedDate);
                          setView('register');
                        }}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white border border-slate-800 hover:bg-slate-850 transition-all cursor-pointer font-sans"
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
                      <h4 className="text-base font-bold text-white mb-1">Venue Closed ({isSelectedDateDayOff ? 'Day Off' : 'No Slots Scheduled'})</h4>
                      <p className="text-sm text-slate-300 max-w-[280px] leading-relaxed">
                        {isSelectedDateDayOff
                          ? `The venue is closed on ${currentSchedule.dayKey ? currentSchedule.dayKey.charAt(0).toUpperCase() + currentSchedule.dayKey.slice(1) + 's' : 'this date'} (Day Off). Please select another date to reserve a court.`
                          : 'No operating hours are scheduled for this date. Please choose another date.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {/* Header with Title, Slot Stats Pill & Action Links */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <label className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                            Select Time Slot
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-md border border-brand-lime/20 font-sans">
                              1 Hour / Slot
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2">
                        {selectedSlots.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSlots([])}
                            className="text-xs font-bold text-slate-400 hover:text-brand-lime transition-colors cursor-pointer font-sans bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Clear ({selectedSlots.length})
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectAllAvailable(currentSchedule.slots)}
                            className="text-xs font-bold text-brand-lime hover:text-[#a6e224] transition-colors cursor-pointer font-sans bg-brand-lime/10 hover:bg-brand-lime/20 px-2.5 py-1 rounded-lg border border-brand-lime/30 flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-brand-lime" /> Select All Available
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Segmented Control Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setSlotFilterTab('all')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          slotFilterTab === 'all'
                            ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span>All ({currentSchedule.slots.length})</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setSlotFilterTab('am')}
                        disabled={currentSchedule.morningSlots.length === 0}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                          slotFilterTab === 'am'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>AM ({currentSchedule.morningSlots.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSlotFilterTab('pm')}
                        disabled={currentSchedule.afternoonSlots.length === 0}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                          slotFilterTab === 'pm'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>PM ({currentSchedule.afternoonSlots.length})</span>
                      </button>
                    </div>



                    {loadingAvailability ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-2.5 border border-slate-850 rounded-2xl bg-slate-900/10 min-h-[220px]">
                        <span className="w-8 h-8 border-3 border-slate-800 border-t-brand-lime rounded-full animate-spin"></span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Checking availability...</span>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[340px] overflow-y-auto pt-2.5 pl-2 pr-1.5 pb-1 custom-scrollbar">
                        {/* Slots renderer helper */}
                        {(() => {
                          let displaySlots = currentSchedule.slots;
                          if (slotFilterTab === 'am') displaySlots = currentSchedule.morningSlots;
                          if (slotFilterTab === 'pm') displaySlots = currentSchedule.afternoonSlots;

                          if (displaySlots.length === 0) {
                            return (
                              <div className="p-6 border border-slate-800 rounded-xl bg-slate-950/40 text-center text-xs text-slate-400">
                                No slots scheduled for this time filter.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1 pl-1">
                              {displaySlots.map((slot, idx) => {
                                const price = getSlotPrice(slot.startHour);
                                const isSelected = selectedSlots.includes(slot.time);
                                const isSlotApproved = approvedSlotsForDate.includes(slot.time);
                                const isSlotPending = pendingSlotsForDate.includes(slot.time);
                                const isSlotPassed = isSlotPastOrTooSoon(slot.startHour, selectedDate);
                                const isPlayerConflict = playerConflictsForDate[slot.time];
                                const openPlayInfo = openPlayBlockedSlots[slot.time];
                                const isSlotDisabled = !slot.available || isSlotApproved || isSlotPending || isSlotPassed || !!isPlayerConflict || !!openPlayInfo;
                                const isNightRate = slot.startHour >= 18;

                                const [startTimeStr, endTimeStr] = slot.time.split(' - ');

                                return (
                                  <button
                                    key={`slot-${slot.time}-${idx}`}
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
                                    title={openPlayInfo ? `Reserved for Open Play: ${openPlayInfo.title}` : (isPlayerConflict ? `Schedule Conflict: Booked at ${isPlayerConflict.courtName} for ${slot.time}` : isSlotPending ? `Blocked: Payment pending admin approval for ${slot.time}` : isSlotApproved ? `Booked: Reserved for ${slot.time}` : '')}
                                    className={`p-3 rounded-2xl border text-left font-sans transition-all duration-200 cursor-pointer relative overflow-hidden group flex flex-col justify-between gap-2.5 ${
                                      isSelected
                                        ? 'bg-brand-lime border-brand-lime text-slate-950 font-semibold shadow-none'
                                        : openPlayInfo
                                        ? 'bg-gradient-to-br from-purple-950/70 via-purple-900/40 to-slate-900 border-purple-700/70 text-purple-200 hover:border-purple-500 hover:shadow-lg shadow-purple-950/30'
                                        : isPlayerConflict
                                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
                                        : isSlotApproved
                                        ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-55 cursor-not-allowed'
                                        : isSlotPending
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 opacity-80 cursor-not-allowed'
                                        : isSlotPassed
                                        ? 'bg-slate-950/30 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                                        : !slot.available
                                        ? 'bg-slate-900/20 border-slate-900 text-slate-600 line-through opacity-40 cursor-not-allowed'
                                        : 'bg-slate-900/85 border-slate-800/90 text-slate-100 hover:border-brand-lime/50 hover:bg-slate-850 hover:scale-[1.01] hover:shadow-lg shadow-slate-950/40'
                                    }`}
                                  >
                                    {/* Card Header: Time Range & Rate Icon */}
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-1.5">
                                        {isNightRate ? (
                                          <Moon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-900' : 'text-indigo-400'}`} />
                                        ) : (
                                          <Sun className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-900' : 'text-amber-400'}`} />
                                        )}
                                        <div className="flex flex-col">
                                          <span className={`text-sm sm:text-base font-medium tracking-normal leading-none ${isSelected ? 'text-slate-950' : 'text-white'}`}>
                                            {startTimeStr}
                                          </span>
                                          {endTimeStr && (
                                            <span className={`text-[10px] font-normal mt-0.5 ${isSelected ? 'text-slate-900/80' : 'text-slate-400'}`}>
                                              to {endTimeStr}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Status Tag / Checkmark / Price Pill */}
                                      {isSelected ? (
                                        <div className="w-7 h-7 rounded-full bg-slate-950 text-brand-lime flex items-center justify-center shadow-md shrink-0">
                                          <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                      ) : openPlayInfo ? (
                                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-purple-900/90 text-purple-200 border border-purple-600/80 flex items-center gap-1 shrink-0 shadow-sm">
                                          <Trophy className="w-3 h-3 text-purple-300" />
                                          Open Play
                                        </span>
                                      ) : isPlayerConflict ? (
                                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/80 shrink-0">
                                          Conflict
                                        </span>
                                      ) : isSlotApproved ? (
                                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-400 shrink-0">
                                          Booked
                                        </span>
                                      ) : isSlotPending ? (
                                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                                          Blocked
                                        </span>
                                      ) : isSlotPassed ? (
                                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md bg-slate-900 text-slate-500 shrink-0">
                                          Passed
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-brand-lime font-normal text-xs group-hover:border-brand-lime/40 transition-colors shrink-0 shadow-inner">
                                          ₱{price}
                                        </span>
                                      )}
                                    </div>

                                    {/* Subtitle Message for Locked / Open Play States */}
                                    {(openPlayInfo || isPlayerConflict || isSlotPending || isSlotPassed) && (
                                      <div className={`text-[10px] pt-1.5 border-t ${isSelected ? 'border-slate-900/20 text-slate-900' : 'border-slate-800/60 text-slate-400'} font-medium truncate flex items-center gap-1`}>
                                        <Info className="w-3 h-3 shrink-0 opacity-70" />
                                        <span className="truncate">
                                          {openPlayInfo
                                            ? `Open Play: ${openPlayInfo.title}`
                                            : isPlayerConflict
                                            ? `Reserved at ${isPlayerConflict.courtName}`
                                            : isSlotPending
                                            ? 'Blocked - Pending approval'
                                            : isSlotPassed
                                            ? 'Slot time passed'
                                            : ''}
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Equipment Rentals Add-ons */}
                    {court.rentals && court.rentals.filter(r => r.enabled).length > 0 && (
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4.5 space-y-3.5 shadow-inner transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-brand-lime/10 flex items-center justify-center text-sm">🏓</span>
                            <div>
                              <span className="text-sm font-bold text-slate-200 block">Need Equipment Rentals?</span>
                              <span className="text-xs text-slate-300 block font-normal">Paddles, Balls & Gear Add-ons</span>
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
                          <div className="space-y-3 pt-3 border-t border-slate-800/60 animate-fade-in">
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
                                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
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
                                      <h5 className="text-sm font-bold text-white truncate">{item.name}</h5>
                                    </div>
                                    <p className="text-xs text-slate-300 line-clamp-1 mb-1.5">{item.description || 'Quality court equipment'}</p>
                                    <div className="text-xs font-black text-brand-lime">
                                      ₱{item.price} <span className="text-xs font-normal text-slate-400">/{item.pricingType === 'per_hour' ? 'hr' : 'item'}</span>
                                    </div>
                                  </div>

                                  {/* Quantity Controls & Subtotal */}
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 shadow-inner">
                                      <button
                                        type="button"
                                        disabled={qty <= 0}
                                        onClick={() => {
                                          const nextQty = Math.max(0, qty - 1);
                                          setSelectedRentals((prev) => ({ ...prev, [item.id]: nextQty }));
                                        }}
                                        className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                                        className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-brand-lime font-bold text-xs flex items-center justify-center hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                    
                                    {/* Availability / Subtotal */}
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                                      {isSelected ? (
                                        <span className="text-brand-lime font-bold">Total: ₱{itemCost}</span>
                                      ) : (
                                        <span>Avail: {item.quantity}</span>
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
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Left Bottom Column: Media Gallery Carousel, Thumbnails, Title & category badge, Maps, Owner Details, Guidelines */}
            <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2 space-y-6">
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


          </div>
        )}
      </div>

      {/* Fixed Floating Bottom Dock Checkout Bar */}
      {selectedSlots.length > 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[calc(100%-3rem)] lg:max-w-4xl z-[9999] animate-fade-in max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-3rem)] box-border">
          <div className="bg-slate-950/98 border border-brand-lime/40 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-[0_12px_45px_rgba(0,0,0,0.95)] backdrop-blur-2xl flex items-center justify-between gap-2 sm:gap-4 overflow-hidden w-full box-border">
            
            {/* Left Section: Selected Slots & Date Summary */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-lime/15 border border-brand-lime/30 text-brand-lime flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-sm">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap shrink-0">
                    {selectedSlots.length} {selectedSlots.length === 1 ? 'Slot' : 'Slots'}
                  </span>
                  
                  {/* Mobile inline total price tag */}
                  <span className="text-xs font-black text-brand-lime sm:hidden shrink-0 whitespace-nowrap">
                    • ₱{totalCost}
                  </span>

                  {Object.values(selectedRentals).reduce((a, b) => a + b, 0) > 0 && (
                    <span className="text-[10px] font-extrabold uppercase bg-brand-lime/10 text-brand-lime px-2 py-0.5 rounded-full border border-brand-lime/20 shrink-0 hidden md:inline-block font-sans whitespace-nowrap">
                      +{Object.values(selectedRentals).reduce((a, b) => a + b, 0)} Gear
                    </span>
                  )}
                </div>

                <span className="text-[10px] sm:text-[11px] text-slate-400 truncate font-sans block">
                  {formatDate(selectedDate)}
                </span>
              </div>
            </div>

            {/* Right Section: Price (Desktop) & Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-4 shrink-0 min-w-0">
              {/* Separate Total Display for tablet/desktop */}
              <div className="hidden sm:flex flex-col items-end shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total</span>
                <span className="text-base sm:text-xl font-black text-brand-lime font-sans mt-0.5">
                  ₱{totalCost}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSlots([])}
                  className="p-2 sm:p-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer font-sans shrink-0 shadow-inner"
                  title="Clear Selection"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="py-2 sm:py-3 px-3 sm:px-5 bg-gradient-to-r from-brand-lime via-[#b6f937] to-emerald-400 text-slate-950 font-black rounded-xl hover:opacity-95 transition-all shadow-lg shadow-brand-lime/20 hover:scale-[1.02] cursor-pointer font-sans text-xs sm:text-sm flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <span className="hidden xs:inline sm:inline">Proceed to </span>
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

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


