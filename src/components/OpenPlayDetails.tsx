import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  Shield,
  AlertCircle,
  Loader2,
  Lock,
  MapPin,
  Building2,
  CheckCircle,
  Eye,
  X,
  Navigation,
  ExternalLink,
  Sparkles,
  Repeat,
  UserPlus,
  Award,
} from 'lucide-react';
import { parseGoogleMapsUrl } from '../utils/mapUtils';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, collection, getDocs, setDoc, query, where } from 'firebase/firestore';

export interface OpenPlayEvent {
  id: string;
  title: string;
  location?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  category: 'Beginner' | 'Intermediate' | 'Advanced' | 'Open to All' | 'Doubles' | 'Singles';
  skillLevel?: string;
  hostPhone?: string;
  description: string;
  posterImageUrl?: string;
  maxParticipants: number;
  registrationFee: number;
  gcashAccountId?: string;
  gcashName?: string;
  gcashNumber?: string;
  gcashQrCode?: string;
  companyId?: string;
  companyName?: string;
  companyLogoUrl?: string;
  createdByUid: string;
  createdByEmail: string;
  createdAt: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'expired';
  rotationRule?: 'winners_stay' | 'all_4_rotate' | 'split_winners';
  courtIds?: string[];
  courtNames?: string[];
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceGroupId?: string;
}

export interface AssignedCourtInfo {
  id: string;
  name: string;
  location?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
}

export const isEventExpired = (eventDate: string, endTime?: string): boolean => {
  if (!eventDate || !eventDate.trim()) return false;
  const now = new Date();
  
  let evYear: number | null = null;
  let evMonth: number | null = null;
  let evDay: number | null = null;

  const trimmedDate = eventDate.trim();
  
  const isoMatch = trimmedDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const usMatch = trimmedDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

  if (isoMatch) {
    evYear = parseInt(isoMatch[1], 10);
    evMonth = parseInt(isoMatch[2], 10);
    evDay = parseInt(isoMatch[3], 10);
  } else if (usMatch) {
    evMonth = parseInt(usMatch[1], 10);
    evDay = parseInt(usMatch[2], 10);
    evYear = parseInt(usMatch[3], 10);
  } else {
    const parsed = new Date(trimmedDate);
    if (!isNaN(parsed.getTime())) {
      evYear = parsed.getFullYear();
      evMonth = parsed.getMonth() + 1;
      evDay = parsed.getDate();
    }
  }

  if (!evYear || !evMonth || !evDay) return false;

  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();

  if (evYear < curYear) return true;
  if (evYear > curYear) return false;

  if (evMonth < curMonth) return true;
  if (evMonth > curMonth) return false;

  if (evDay < curDay) return true;
  if (evDay > curDay) return false;

  if (!endTime || !endTime.trim()) return false;

  let endHour = 23;
  let endMinute = 59;
  
  const trimmedTime = endTime.trim();
  if (trimmedTime.includes(':')) {
    const parts = trimmedTime.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1]?.substring(0, 2) || '0', 10);
    
    if (trimmedTime.toLowerCase().includes('pm') && h < 12) h += 12;
    if (trimmedTime.toLowerCase().includes('am') && h === 12) h = 0;
    
    endHour = isNaN(h) ? 23 : h;
    endMinute = isNaN(m) ? 59 : m;
  }
  
  const curHour = now.getHours();
  const curMinute = now.getMinutes();
  
  if (curHour > endHour) return true;
  if (curHour === endHour && curMinute >= endMinute) return true;
  
  return false;
};

export const calculateEventDuration = (startTime?: string, endTime?: string): string => {
  if (!startTime || !endTime) return '';
  
  const parseMins = (tStr: string) => {
    const trimmed = tStr.trim();
    let h = 0;
    let m = 0;
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1]?.substring(0, 2) || '0', 10) || 0;
      if (trimmed.toLowerCase().includes('pm') && h < 12) h += 12;
      if (trimmed.toLowerCase().includes('am') && h === 12) h = 0;
    }
    return h * 60 + m;
  };

  const startMins = parseMins(startTime);
  let endMins = parseMins(endTime);

  if (endMins <= startMins) {
    endMins += 24 * 60;
  }

  const diffMins = endMins - startMins;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} hrs ${mins} mins gameplay`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'} gameplay`;
  } else {
    return `${mins} mins gameplay`;
  }
};

export const formatTime12h = (timeStr?: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    return `${h}:${match12[2]} ${match12[3].toUpperCase()}`;
  }
  
  let h = 0;
  let m = 0;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    h = parseInt(parts[0], 10) || 0;
    m = parseInt(parts[1]?.substring(0, 2) || '0', 10) || 0;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
};

export const formatEventDateLong = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, monthIndex, day);
    if (!isNaN(d.getTime())) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${dayNames[d.getDay()]}`;
    }
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${dayNames[d.getDay()]}`;
    }
  } catch (e) {}

  return dateStr;
};

export const splitAddressComponents = (locationStr?: string) => {
  if (!locationStr || !locationStr.trim()) return { primary: '', secondary: '' };
  
  let cleaned = locationStr.trim();
  cleaned = cleaned.replace(/,\s*Philippines$/i, '');
  cleaned = cleaned.replace(/,\s*Region\s+[I|V|X|VI|VII|VIII|IX|XI|XII|XIII\d]+(?:\s*\([^)]*\))?/gi, '');
  cleaned = cleaned.replace(/,\s*Postal:\s*\d+/gi, '');
  cleaned = cleaned.replace(/,\s*\d{4,}$/gi, '');

  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  
  if (parts.length <= 1) {
    return { primary: cleaned, secondary: '' };
  }

  if (parts.length === 2) {
    return { primary: parts[0], secondary: parts[1] };
  }

  let secondaryStartIndex = Math.max(1, parts.length - 2);
  
  for (let i = 0; i < parts.length; i++) {
    const partLower = parts[i].toLowerCase();
    if (
      partLower.includes('city') ||
      partLower.includes('municipality') ||
      partLower.includes('libmanan') ||
      partLower.includes('naga') ||
      partLower.includes('sur') ||
      partLower.includes('norte') ||
      partLower.includes('metro') ||
      partLower.includes('manila')
    ) {
      secondaryStartIndex = i;
      break;
    }
  }

  const primary = parts.slice(0, secondaryStartIndex).join(', ');
  const secondary = parts.slice(secondaryStartIndex).join(', ');

  return { primary: primary || parts[0], secondary: secondary || parts.slice(1).join(', ') };
};

export const normalizeOpenPlayEvent = (id: string, data: any): OpenPlayEvent => {
  if (!data) {
    return {
      id,
      title: 'Open Play Session',
      eventDate: '',
      startTime: '18:00',
      endTime: '21:00',
      category: 'Open to All',
      description: '',
      maxParticipants: 16,
      registrationFee: 0,
      createdByUid: '',
      createdByEmail: '',
      createdAt: new Date().toISOString(),
      status: 'active'
    };
  }

  const eventDate = data.eventDate || data.date || data.startDate || data.event_date || data.scheduleDate || data.day || '';
  const endTime = data.endTime || '21:00';
  const isPast = isEventExpired(eventDate, endTime);

  let effectiveStatus: 'draft' | 'active' | 'completed' | 'cancelled' | 'expired' = data.status || (isPast ? 'expired' : 'active');
  if (isPast && (effectiveStatus === 'active' || effectiveStatus === 'draft')) {
    effectiveStatus = 'expired';
  } else if (!isPast && effectiveStatus === 'expired') {
    effectiveStatus = data.status || 'active';
  }

  const rawMax = data?.maxParticipants ?? data?.maxPlayers ?? data?.capacity ?? data?.max_participants;
  const parsedMax = Number(rawMax);
  const finalMax = (!isNaN(parsedMax) && parsedMax > 0) ? parsedMax : 16;

  return {
    id,
    title: data.title || data.name || data.eventTitle || 'Open Play Session',
    location: data.location || data.address || '',
    eventDate,
    startTime: data.startTime || '18:00',
    endTime,
    category: data.category || data.skillLevel || 'Open to All',
    description: data.description || '',
    posterImageUrl: data.posterImageUrl || data.imageUrl || data.posterUrl || undefined,
    maxParticipants: finalMax,
    registrationFee: Number(data.registrationFee || data.fee || data.price) || 0,
    gcashAccountId: data.gcashAccountId || 'global',
    gcashName: data.gcashName || '',
    gcashNumber: data.gcashNumber || '',
    gcashQrCode: data.gcashQrCode || '',
    companyId: data.companyId || '',
    companyName: data.companyName || '',
    companyLogoUrl: data.companyLogoUrl || data.logoUrl || data.companyLogo || undefined,
    createdByUid: data.createdByUid || '',
    createdByEmail: data.createdByEmail || '',
    createdAt: data.createdAt || new Date().toISOString(),
    status: effectiveStatus,
    rotationRule: data.rotationRule || 'winners_stay',
    courtIds: data.courtIds || [],
    courtNames: data.courtNames || [],
    isRecurring: Boolean(data.isRecurring),
    recurrencePattern: data.recurrencePattern,
    recurrenceGroupId: data.recurrenceGroupId
  };
};

export interface OpenPlayRegistration {
  id: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  registrationFee?: number;
  playerUid?: string;
  userId?: string;
  playerName?: string;
  userName?: string;
  playerEmail?: string;
  userEmail?: string;
  playerPhone?: string;
  userPhone?: string;
  playerCount?: number;
  guestCount?: number;
  guests?: { name: string; email?: string }[];
  guestNames?: string[];
  guestEmails?: string[];
  gcashReferenceNumber?: string;
  receiptImageUrl?: string;
  paymentStatus: 'pending_verification' | 'paid' | 'failed';
  status: 'pending' | 'approved' | 'cancelled';
  createdAt: string;
  isAddGuestOnly?: boolean;
  primaryPlayerName?: string;
  primaryPlayerEmail?: string;
}

interface OpenPlayDetailsProps {
  eventId: string;
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null;
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onBack: () => void;
  setCheckoutDetails?: (details: any) => void;
  setView?: (view: any) => void;
}

export default function OpenPlayDetails({ eventId, user, onNavigateToAuth, onBack, setCheckoutDetails, setView }: OpenPlayDetailsProps) {
  const [event, setEvent] = useState<OpenPlayEvent | null>(null);
  const [registrations, setRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration Form States
  const [step, setStep] = useState<'details' | 'checkout' | 'success'>('details');
  const [playerPhone] = useState('');
  const [gcashRef] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logoUrl: string }>({ name: '', logoUrl: '' });
  const [associatedCourt, setAssociatedCourt] = useState<AssignedCourtInfo | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  void step; void setStep; void playerPhone; void gcashRef; void receiptImage; void submitting; void setSubmitting;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError('');
    try {
      let foundEvent: OpenPlayEvent | null = null;
      let foundRegs: OpenPlayRegistration[] = [];

      if (isFirebaseConfigured && db) {
        try {
          const eventSnap = await getDoc(doc(db, 'openplay_events', eventId));
          if (eventSnap.exists()) {
            foundEvent = { id: eventSnap.id, ...eventSnap.data() } as OpenPlayEvent;
          }
        } catch (e) {
          console.warn('Firestore fetch event failed, trying localStorage:', e);
        }
      }

      if (!foundEvent) {
        const localEventsStr = localStorage.getItem('picklepoint_openplay_events');
        if (localEventsStr) {
          const localEvents = JSON.parse(localEventsStr) as OpenPlayEvent[];
          foundEvent = localEvents.find(e => e.id === eventId) || null;
        }
      }

      // Fetch company logo and name from companies or users collection
      if (foundEvent) {
        let compName = foundEvent.companyName || '';
        let compLogo = foundEvent.companyLogoUrl || '';

        if (isFirebaseConfigured && db) {
          if (foundEvent.companyId) {
            try {
              const compSnap = await getDoc(doc(db, 'companies', foundEvent.companyId));
              if (compSnap.exists()) {
                const compData = compSnap.data();
                compName = compName || compData.name || compData.companyName || '';
                compLogo = compLogo || compData.logoUrl || compData.logo || '';
              }
            } catch (e) {}
          }
          if ((!compName || !compLogo) && foundEvent.createdByUid) {
            try {
              const userSnap = await getDoc(doc(db, 'users', foundEvent.createdByUid));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                compName = compName || uData.companyName || uData.name || '';
                compLogo = compLogo || uData.companyLogoUrl || uData.logoUrl || '';
              }
            } catch (e) {}
          }
        }
        setCompanyInfo({ name: compName || 'PicklePoint Venue Host', logoUrl: compLogo });

        // Fetch associated court details for exact location & map pin matching View Court Details page
        let matchedCourt: AssignedCourtInfo | null = null;
        const targetCourtId = (foundEvent.courtIds && foundEvent.courtIds.length > 0) ? foundEvent.courtIds[0] : null;

        if (targetCourtId && isFirebaseConfigured && db) {
          try {
            const courtSnap = await getDoc(doc(db, 'courts', targetCourtId));
            if (courtSnap.exists()) {
              const cData = courtSnap.data();
              matchedCourt = {
                id: courtSnap.id,
                name: cData.name || '',
                location: cData.location || '',
                barangay: cData.barangay || '',
                municipality: cData.municipality || '',
                province: cData.province || '',
                mapUrl: cData.mapUrl || '',
                latitude: cData.latitude,
                longitude: cData.longitude,
              };
            }
          } catch (cErr) {
            console.warn('Failed to read court from Firestore:', cErr);
          }
        }

        if (!matchedCourt) {
          const localCourtsStr = localStorage.getItem('picklepoint_courts');
          if (localCourtsStr) {
            try {
              const localCourts = JSON.parse(localCourtsStr) as any[];
              const foundC = localCourts.find((c: any) =>
                (targetCourtId && c.id === targetCourtId) ||
                (foundEvent?.companyId && c.companyId === foundEvent.companyId) ||
                (foundEvent?.createdByUid && c.ownerId === foundEvent.createdByUid)
              );
              if (foundC) {
                matchedCourt = {
                  id: foundC.id,
                  name: foundC.name || '',
                  location: foundC.location || '',
                  barangay: foundC.barangay || '',
                  municipality: foundC.municipality || '',
                  province: foundC.province || '',
                  mapUrl: foundC.mapUrl || '',
                  latitude: foundC.latitude,
                  longitude: foundC.longitude,
                };
              }
            } catch (e) {}
          }
        }

        setAssociatedCourt(matchedCourt);
      }

      // Fetch registrations / bookings for this event (unified bookings + fallback)
      const regMap = new Map<string, OpenPlayRegistration>();

      // 1. Check LocalStorage
      try {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const allBookings = JSON.parse(bookingsStr);
          allBookings.forEach((b: any) => {
            if ((b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) && b.openPlayEventId === eventId && b.status !== 'cancelled') {
              const regId = b.id || b.bookingReference;
              regMap.set(regId, {
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
                isAddGuestOnly: b.isAddGuestOnly === true,
                primaryPlayerName: b.primaryPlayerName || b.userName || b.user?.name,
                primaryPlayerEmail: b.primaryPlayerEmail || b.userEmail || b.user?.email,
              });
            }
          });
        }
        const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations');
        if (localRegsStr) {
          const allRegs = JSON.parse(localRegsStr) as OpenPlayRegistration[];
          allRegs.forEach((r) => {
            if (r.eventId === eventId && !regMap.has(r.id)) regMap.set(r.id, r);
          });
        }
      } catch (e) {}

      // 2. Fetch from Firestore
      if (isFirebaseConfigured && db) {
        try {
          // Query bookings collection
          const bQuery = query(collection(db, 'bookings'), where('openPlayEventId', '==', eventId));
          const bSnap = await getDocs(bQuery);
          bSnap.forEach(dSnap => {
            const b = dSnap.data();
            if (b.status !== 'cancelled') {
              const regId = dSnap.id;
              regMap.set(regId, {
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
                isAddGuestOnly: b.isAddGuestOnly === true,
                primaryPlayerName: b.primaryPlayerName || b.userName || b.user?.name,
                primaryPlayerEmail: b.primaryPlayerEmail || b.userEmail || b.user?.email,
              });
            }
          });

          // Query legacy openplay_registrations collection
          const q = query(collection(db, 'openplay_registrations'), where('eventId', '==', eventId));
          const regsSnap = await getDocs(q);
          regsSnap.forEach(dSnap => {
            const regData = dSnap.data() as OpenPlayRegistration;
            if (!regMap.has(dSnap.id)) {
              regMap.set(dSnap.id, { ...regData, id: dSnap.id });
            }
          });
        } catch (e) {
          console.warn('Firestore fetch registrations error:', e);
        }
      }

      foundRegs = Array.from(regMap.values());

      setEvent(foundEvent);
      setRegistrations(foundRegs);
    } catch (err) {
      console.error('Failed to load Open Play event details:', err);
      setError('Could not load Open Play event details.');
    } finally {
      setLoading(false);
    }
  };
  const getFormattedEventDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const year = d.getFullYear();
      return `${dayName}, ${monthName} ${dayNum}, ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const parseTimeToMinutes = (timeStr?: string) => {
    if (!timeStr) return 0;
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      return hours * 60 + minutes;
    }
    return 0;
  };

  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '';
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) return `${match12[1]}:${match12[2]} ${match12[3].toUpperCase()}`;
    const totalMins = parseTimeToMinutes(timeStr);
    let hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return '';
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    let diff = endMins - startMins;
    if (diff <= 0) diff += 24 * 60;
    const hours = diff / 60;
    return hours % 1 === 0 ? `${hours} hrs` : `${hours.toFixed(1)} hrs`;
  };

  const parsedMapInfo = useMemo(() => {
    if (!event) return null;

    if (associatedCourt) {
      const courtFallback = [
        associatedCourt.name,
        associatedCourt.location,
        associatedCourt.barangay,
        associatedCourt.municipality,
        associatedCourt.province
      ].filter(Boolean).join(', ');

      if (associatedCourt.latitude !== undefined && associatedCourt.longitude !== undefined && associatedCourt.latitude !== null && associatedCourt.longitude !== null) {
        const coordUrl = `https://www.google.com/maps?q=${associatedCourt.latitude},${associatedCourt.longitude}`;
        return parseGoogleMapsUrl(coordUrl, courtFallback || event.location);
      }
      if (associatedCourt.mapUrl) {
        return parseGoogleMapsUrl(associatedCourt.mapUrl, courtFallback || event.location);
      }
    }

    if (event.location) {
      return parseGoogleMapsUrl('', event.location);
    }
    return null;
  }, [event, associatedCourt]);

  const directionsUrl = useMemo(() => {
    if (associatedCourt?.latitude && associatedCourt?.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${associatedCourt.latitude},${associatedCourt.longitude}`;
    }
    if (parsedMapInfo?.coordinates) {
      return `https://www.google.com/maps/dir/?api=1&destination=${parsedMapInfo.coordinates.lat},${parsedMapInfo.coordinates.lng}`;
    }
    if (parsedMapInfo?.directUrl) {
      return parsedMapInfo.directUrl;
    }
    if (event?.location) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
    }
    return '';
  }, [associatedCourt, parsedMapInfo, event]);

  const displayCompanyName = event?.companyName || companyInfo.name || 'PicklePoint Venue Host';
  const displayCompanyLogo = companyInfo.logoUrl || event?.companyLogoUrl || '';

  const handleProceedToCheckout = (isAddGuestMode: boolean = false) => {
    if (!event) return;
    if (isExpired) {
      alert('This Open Play session has already concluded.');
      return;
    }
    if (isFull) {
      alert('This Open Play session is at maximum capacity.');
      return;
    }
    if (!user) {
      onNavigateToAuth('login');
      return;
    }

    try {
      sessionStorage.removeItem('picklepoint_last_submitted_booking');
      localStorage.removeItem('picklepoint_last_submitted_booking');
    } catch (e) {}

    const durationText = calculateDuration(event.startTime, event.endTime);
    const slotString = `${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}${durationText ? ` (${durationText})` : ''}`;

    const checkoutPayload = {
      type: 'open_play',
      openPlayEventId: event.id,
      openPlayTitle: event.title,
      openPlayCategory: event.category,
      courtId: event.id,
      courtName: event.title,
      courtType: event.category,
      courtImage: event.posterImageUrl || '',
      courtLocation: event.location || '',
      date: event.eventDate,
      slots: [slotString],
      rentals: [],
      basePricePerSpot: event.registrationFee,
      maxAvailableSlots: availableSlots,
      totalCost: event.registrationFee,
      companyId: event.companyId,
      courtOwnerId: event.createdByUid,
      gcashAccountId: event.gcashAccountId,
      companyName: displayCompanyName,
      companyLogoUrl: displayCompanyLogo,
      gcashName: event.gcashName,
      gcashNumber: event.gcashNumber,
      gcashQrCode: event.gcashQrCode,
      isAddGuestOnly: isAddGuestMode,
      initialGuestCount: isAddGuestMode ? 1 : 0,
    };

    if (setCheckoutDetails) {
      setCheckoutDetails(checkoutPayload);
    }
    if (setView) {
      window.history.pushState({}, '', '/checkout');
      setView('checkout');
    }
  };

  const isAlreadyRegistered = user && registrations.some(r => r.status !== 'cancelled' && ((r.playerEmail || '').toLowerCase() === user.email.toLowerCase() || (user.uid && r.playerUid === user.uid)));
  const activeRegistrations = useMemo(() => registrations.filter(r => r.status !== 'cancelled'), [registrations]);
  const approvedRegistrations = useMemo(() => activeRegistrations.filter(r => r.status === 'approved' || r.paymentStatus === 'paid'), [activeRegistrations]);
  const pendingRegistrations = useMemo(() => activeRegistrations.filter(r => r.status === 'pending' || r.paymentStatus === 'pending_verification'), [activeRegistrations]);

  const activeRegistrationsCount = useMemo(() => activeRegistrations.reduce((acc, r) => acc + (r.playerCount || 1), 0), [activeRegistrations]);
  const approvedCount = useMemo(() => approvedRegistrations.reduce((acc, r) => acc + (r.playerCount || 1), 0), [approvedRegistrations]);
  const pendingCount = useMemo(() => pendingRegistrations.reduce((acc, r) => acc + (r.playerCount || 1), 0), [pendingRegistrations]);
  const availableSlots = event ? Math.max(0, event.maxParticipants - activeRegistrationsCount) : 0;
  const isFull = availableSlots <= 0;
  const isExpired = event ? isEventExpired(event.eventDate, event.endTime) : false;
  const fillPercentage = event ? Math.min(100, Math.round((activeRegistrationsCount / event.maxParticipants) * 100)) : 0;

  const handleProcessReceiptUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 800;
        const scale = max_width / img.width;
        if (scale < 1) {
          canvas.width = max_width;
          canvas.height = img.height * scale;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setReceiptImage(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };
  void handleProcessReceiptUpload;

  const handleSubmitRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!event || !user || isExpired) {
      if (isExpired) alert('This Open Play session has already concluded.');
      return;
    }

    const isFree = event.registrationFee <= 0;
    if (!isFree && !gcashRef.trim()) {
      alert('Please enter your GCash Reference Number.');
      return;
    }

    setSubmitting(true);
    const regId = 'reg-' + Date.now();
    const payload: OpenPlayRegistration = {
      id: regId,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.eventDate,
      registrationFee: event.registrationFee,
      playerUid: user.uid || 'anon-' + Date.now(),
      playerName: user.name,
      playerEmail: user.email,
      playerPhone: playerPhone.trim(),
      playerCount: 1,
      guestCount: 0,
      guests: [],
      guestNames: [],
      gcashReferenceNumber: isFree ? 'FREE-ENTRY' : gcashRef.trim(),
      receiptImageUrl: receiptImage || undefined,
      paymentStatus: isFree ? 'paid' : 'pending_verification',
      status: isFree ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'openplay_registrations', regId), payload);
        } catch (cloudErr) {
          console.warn('Firestore openplay registration save failed, persisting locally:', cloudErr);
        }
      }

      const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations');
      const localRegs = localRegsStr ? JSON.parse(localRegsStr) : [];
      localRegs.push(payload);
      localStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(localRegs));

      setRegistrations(prev => [...prev, payload]);
      setStep('success');
    } catch (err) {
      console.error('Failed to submit Open Play registration:', err);
      alert('Failed to submit registration: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };
  void handleSubmitRegistration;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
        </div>
        <p className="text-sm font-bold text-slate-300 animate-pulse">Loading Open Play Details...</p>
      </div>
    );
  }

  const isDraft = event?.status === 'draft';
  const isOrganizerOrAdmin = user && (user.isAdmin || user.uid === event?.createdByUid);

  if (isDraft && !isOrganizerOrAdmin) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Open Play Session is in Draft Mode</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          This Open Play event is currently saved in Draft mode by the organizer and is not yet open for public registrations.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg"
        >
          Return to Home
        </button>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Open Play Event Not Found</h2>
        <p className="text-slate-400 text-sm max-w-md text-center mb-6">
          The Open Play registration link you clicked may have expired or been removed by the organizer.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 relative overflow-hidden pt-20 md:pt-24 pb-12 px-4 md:px-8">
      {/* Decorative background glows */}
      <div className="absolute top-[5%] left-[15%] w-[45%] h-[45%] bg-brand-lime/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[5%] right-[15%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Lightbox for poster, receipt or QR code */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)} 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 cursor-zoom-out animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] w-full rounded-3xl overflow-y-auto custom-scrollbar bg-slate-950 border border-slate-800 shadow-2xl p-3 sm:p-5 flex flex-col items-center cursor-default"
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="sticky top-2 right-2 self-end z-20 p-2.5 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors shadow-lg cursor-pointer"
              title="Close Fullscreen View"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={lightboxImage}
              alt="Enlarged poster preview"
              className="max-w-full h-auto object-contain rounded-2xl select-none mx-auto shadow-2xl my-auto"
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer group uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to App
          </button>
        </div>

        {/* Main Event Registration Container */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden relative">
          {/* Admin Draft Preview Notice Banner */}
          {isDraft && isOrganizerOrAdmin && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between gap-4 animate-fade-in shadow-lg">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Admin Preview Mode:</strong> This event is currently saved in <span className="underline uppercase font-extrabold">Draft Mode</span> and is hidden from public players. Switch to <strong>Live / Published</strong> in Admin Dashboard to accept bookings.
                </span>
              </div>
            </div>
          )}

          {/* Header Banner & Poster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 pb-8 border-b border-dark-border/60">
            {/* Event Poster Column */}
            <div className="md:col-span-5">
              <div
                onClick={() => event.posterImageUrl && setLightboxImage(event.posterImageUrl)}
                className={`w-full aspect-[4/5] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative shadow-xl group ${
                  event.posterImageUrl ? 'cursor-zoom-in' : ''
                }`}
              >
                {event.posterImageUrl ? (
                  <>
                    <img src={event.posterImageUrl} alt={event.title} className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-brand-lime/50 text-brand-lime text-xs font-bold shadow-lg flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Tap for Fullscreen
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-dark-bg">
                    <Trophy className="w-16 h-16 text-brand-lime/40 mb-3" />
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Pickleball Open Play</span>
                  </div>
                )}
              </div>
            </div>

            {/* Event Info Column */}
            <div className="md:col-span-7 flex flex-col justify-between text-left">
              <div>
                {/* Title Header Row with Book Now Button Opposite Title */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-extrabold text-brand-lime uppercase tracking-widest mb-1.5">
                      <Trophy className="w-4 h-4" /> Open Play Event
                    </div>

                    <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">{event.title}</h1>
                  </div>

                  {/* Action Button Opposite Title (Book Now or Add Guest) */}
                  {isAlreadyRegistered ? (
                    <button
                      type="button"
                      onClick={() => handleProceedToCheckout(true)}
                      disabled={isExpired || isFull}
                      className={`px-7 py-3.5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2.5 flex-shrink-0 my-auto border ${
                        isExpired || isFull
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed opacity-80 select-none'
                          : 'bg-gradient-to-r from-brand-lime via-[#a6e224] to-emerald-400 text-dark-bg border-brand-lime/40 hover:opacity-95 shadow-xl shadow-brand-lime/20 hover:scale-[1.02] cursor-pointer'
                      }`}
                    >
                      <UserPlus className={`w-4.5 h-4.5 ${isExpired || isFull ? 'text-red-400' : 'text-dark-bg'}`} />
                      <span>{isExpired ? 'Session Concluded' : isFull ? 'Full — No Guest Slots' : `+ Add Guest (${event.registrationFee > 0 ? `₱${event.registrationFee}` : 'Free'})`}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleProceedToCheckout(false)}
                      disabled={isExpired || isFull}
                      className={`px-7 py-3.5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2.5 flex-shrink-0 my-auto ${
                        isExpired || isFull
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed opacity-80 select-none'
                          : 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] shadow-xl shadow-brand-lime/10 hover:scale-[1.02] cursor-pointer'
                      }`}
                    >
                      <Sparkles className={`w-4.5 h-4.5 ${isExpired || isFull ? 'text-red-400' : 'text-dark-bg'}`} />
                      <span>{isExpired ? 'Session Concluded' : isFull ? 'FULL — SESSION BOOKED OUT' : `Book Now (${event.registrationFee > 0 ? `₱${event.registrationFee}` : 'Free'})`}</span>
                    </button>
                  )}
                </div>

                {/* Host Company Card under Title */}
                {displayCompanyName && (
                  <div className="flex items-center gap-3 py-2.5 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 w-fit mb-6 shadow-sm">
                    {displayCompanyLogo ? (
                      <img src={displayCompanyLogo} alt={displayCompanyName} className="w-8 h-8 rounded-full object-cover border border-brand-lime/40 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hosted & Managed By</div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{displayCompanyName}</span>
                        <Shield className="w-3.5 h-3.5 text-brand-lime" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Date, Time & Location Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Date</div>
                      <div className="text-xs font-black text-white">{getFormattedEventDate(event.eventDate)}</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Slot</div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                        <span>{formatTime12h(event.startTime)} - {formatTime12h(event.endTime)}</span>
                        {calculateDuration(event.startTime, event.endTime) && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-extrabold uppercase tracking-wider">
                            {calculateDuration(event.startTime, event.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {event.location && (() => {
                    const { primary, secondary } = splitAddressComponents(event.location);
                    return (
                      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 sm:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald flex-shrink-0 mt-0.5">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue Location</div>
                            <div className="text-xs font-extrabold text-white">{primary}</div>
                            {secondary && (
                              <div className="text-xs font-semibold text-brand-emerald/90 mt-0.5">{secondary}</div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsMapModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-brand-emerald/10 hover:bg-brand-emerald/20 border border-brand-emerald/30 text-brand-emerald text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02] flex-shrink-0 self-center"
                        >
                          <MapPin className="w-4 h-4 text-brand-emerald" />
                          <span>View Map</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Paddle Rotation Rule */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 sm:col-span-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                      <Repeat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Court Rotation & Play Format</div>
                      <div className="text-xs font-black text-white">
                        {(!event.rotationRule || event.rotationRule === 'winners_stay') && (
                          <span className="text-brand-lime font-extrabold">
                            👑 Winners Stay, Losers Rotate (Max 2 games stay)
                          </span>
                        )}
                        {event.rotationRule === 'all_4_rotate' && (
                          <span className="text-blue-400 font-extrabold">
                            🔄 All 4 Players Rotate Off (Full Court Rotation)
                          </span>
                        )}
                        {event.rotationRule === 'split_winners' && (
                          <span className="text-purple-300 font-extrabold">
                            🔀 Split Winners & Rotate (Mix & Match Partners)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reserved Courts & Category / Skill Level Section (Side-by-Side) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
                    {/* Reserved Courts */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime flex-shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Reserved {event.courtNames && event.courtNames.length > 1 ? 'Courts' : 'Court'} {event.courtNames && event.courtNames.length > 0 ? `(${event.courtNames.length})` : ''}
                        </div>
                        <div className="text-xs font-black text-white">
                          {event.courtNames && event.courtNames.length > 0 ? event.courtNames.join(', ') : 'Venue Facility Courts'}
                        </div>
                      </div>
                    </div>

                    {/* Category / Skill Level */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category / Skill Level</div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold uppercase tracking-wider text-[11px]">
                            {event.category || 'Open to All'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <div className="mb-6">
                    <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">About this Open Play</h4>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Event Key Stats Card & Live Capacity Progress Bar */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration Fee</div>
                    <div className="text-2xl font-black text-brand-lime font-sans mt-0.5">
                      {event.registrationFee > 0 ? `₱${event.registrationFee}` : 'FREE ENTRY'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Capacity</div>
                    <div className="text-sm font-black text-white flex items-center gap-1.5 justify-end mt-0.5">
                      <Users className="w-4 h-4 text-brand-lime" />
                      <span className={isFull ? 'text-red-400 font-extrabold' : 'text-slate-200'}>
                        {activeRegistrationsCount} / {event.maxParticipants} Registered
                      </span>
                    </div>
                    <div className="text-[11px] font-extrabold mt-0.5">
                      {isFull ? (
                        <span className="text-red-400 uppercase tracking-wider">Full / Waitlist Only</span>
                      ) : (
                        <span className="text-brand-lime">{availableSlots} {availableSlots === 1 ? 'slot' : 'slots'} remaining</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Animated Capacity Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400 uppercase tracking-wider">Capacity Fill Rate</span>
                    <span className="text-slate-300 font-mono">{fillPercentage}% Full</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                    <div
                      style={{ width: `${fillPercentage}%` }}
                      className={`h-full transition-all duration-500 ${
                        isFull ? 'bg-red-500' : fillPercentage > 80 ? 'bg-amber-400' : 'bg-brand-lime'
                      }`}
                    />
                  </div>
                </div>

                {/* Registration Status Breakdown Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> {approvedCount} Confirmed
                    </span>
                    {pendingCount > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {pendingCount} Pending Review
                      </span>
                    )}
                  </div>

                  <span className="text-slate-500 text-[10px] font-medium">
                    Updated real-time from roster
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar & Registration Control */}
          <div className="text-left mt-8">
            {/* CASE 0: Event Expired / Concluded */}
            {isExpired && (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center animate-fade-in">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">This Open Play Session Has Concluded</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  This session on <strong className="text-white">{event.eventDate} ({event.startTime} - {event.endTime})</strong> has already taken place and is no longer accepting new player entries.
                </p>
              </div>
            )}

            {/* CASE 1: Event Completed or Cancelled */}
            {!isExpired && event.status !== 'active' && (
              <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold text-center">
                This Open Play event is currently marked as <strong className="uppercase">{event.status}</strong> and is no longer accepting new player entries.
              </div>
            )}



            {/* CASE 3: Not Registered & User NOT Authenticated */}
            {!isExpired && event.status === 'active' && !isAlreadyRegistered && !user && (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mx-auto mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">Sign In Required to Register</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  Are you a new or returning player? Please sign in or create an account to secure your spot for this Open Play event.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                  <button
                    onClick={() => onNavigateToAuth('login')}
                    className="w-full py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg hover:scale-[1.01]"
                  >
                    Log In to Register
                  </button>
                  <button
                    onClick={() => onNavigateToAuth('register')}
                    className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Create New Account
                  </button>
                </div>
              </div>
            )}

            {/* CASE 4: Not Registered, User Authenticated, Capacity Reached */}
            {event.status === 'active' && !isAlreadyRegistered && user && isFull && (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">Registration Capacity Reached</h3>
                <p className="text-xs text-slate-300 mt-1">
                  All {event.maxParticipants} slots for this Open Play session have been filled. Please check back later for cancellations or future events.
                </p>
              </div>
            )}


          </div>

          {/* Action Button (Book Now or Add Guest) */}
          <div className="mt-8 flex justify-end">
            {isAlreadyRegistered ? (
              <button
                type="button"
                onClick={() => handleProceedToCheckout(true)}
                disabled={isExpired || isFull}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 border ${
                  isExpired || isFull
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed opacity-80 select-none'
                    : 'bg-gradient-to-r from-brand-lime via-[#a6e224] to-emerald-400 text-dark-bg border-brand-lime/40 hover:opacity-95 shadow-xl shadow-brand-lime/20 hover:scale-[1.02] cursor-pointer'
                }`}
              >
                <UserPlus className={`w-4.5 h-4.5 ${isExpired || isFull ? 'text-red-400' : 'text-dark-bg'}`} />
                <span>{isExpired ? 'Session Concluded' : isFull ? 'Full — No Guest Slots' : `+ Add Guest (${event.registrationFee > 0 ? `₱${event.registrationFee}` : 'Free'})`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleProceedToCheckout(false)}
                disabled={isExpired || isFull}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                  isExpired || isFull
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed opacity-80 select-none'
                    : 'bg-brand-lime text-dark-bg hover:bg-[#a6e224] shadow-xl shadow-brand-lime/10 hover:scale-[1.02] cursor-pointer'
                }`}
              >
                <Sparkles className={`w-4.5 h-4.5 ${isExpired || isFull ? 'text-red-400' : 'text-dark-bg'}`} />
                <span>{isExpired ? 'Session Concluded' : isFull ? 'FULL — SESSION BOOKED OUT' : `Book Now (${event.registrationFee > 0 ? `₱${event.registrationFee}` : 'Free'})`}</span>
              </button>
            )}
          </div>

          {/* SESSION PARTICIPANT ROSTER CARD */}
          {activeRegistrations.length > 0 && (() => {
            interface ParticipantCard {
              id: string;
              name: string;
              type: 'primary' | 'guest';
              photoUrl?: string;
              hostName?: string;
              guestIndex?: number;
              isApproved: boolean;
              dateStr: string;
            }

            const participants: ParticipantCard[] = [];
            activeRegistrations.forEach(reg => {
              const isApproved = reg.status === 'approved' || reg.paymentStatus === 'paid';
              const primaryName = reg.playerName || 'Player';
              const primaryPhoto = (reg as any).photoUrl || (reg as any).playerPhotoUrl || (reg as any).avatarUrl || (reg as any).userPhotoUrl;
              const dateStr = reg.createdAt ? reg.createdAt.split('T')[0] : 'Registered';

              // Primary Player (Only if not an add-guest-only entry)
              const isAddGuestOnly = (reg as any).isAddGuestOnly === true;
              if (!isAddGuestOnly) {
                participants.push({
                  id: `${reg.id}-primary`,
                  name: primaryName,
                  type: 'primary',
                  photoUrl: primaryPhoto,
                  isApproved,
                  dateStr
                });
              }

              // Guests
              const spots = reg.playerCount || 1;
              const numGuests = isAddGuestOnly
                ? Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots || 1)
                : Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots > 1 ? spots - 1 : 0);
              const hostName = (reg as any).primaryPlayerName || primaryName;

              for (let gIdx = 0; gIdx < numGuests; gIdx++) {
                const gName = reg.guests?.[gIdx]?.name || reg.guestNames?.[gIdx] || `Guest #${gIdx + 1} (${hostName})`;
                const gPhoto = (reg.guests?.[gIdx] as any)?.photoUrl;
                participants.push({
                  id: `${reg.id}-guest-${gIdx}`,
                  name: gName,
                  type: 'guest',
                  photoUrl: gPhoto,
                  hostName: hostName,
                  guestIndex: gIdx + 1,
                  isApproved,
                  dateStr
                });
              }
            });

            const totalHeadcount = participants.length;
            const confirmedHeadcount = participants.filter(p => p.isApproved).length;
            const pendingHeadcount = participants.filter(p => !p.isApproved).length;

            return (
              <div className="mt-8 pt-8 border-t border-dark-border/60 text-left animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-lime" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                      Session Player & Guest Roster ({totalHeadcount} Attendees)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {confirmedHeadcount} Confirmed • {pendingHeadcount} Pending Review
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        p.type === 'guest'
                          ? 'bg-purple-950/20 border-purple-900/40 hover:border-purple-800/60'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
                          <img
                            src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=b5f529&color=0f172a&bold=true`;
                            }}
                          />
                        </div>
                        <div className="truncate min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-white truncate">
                              {p.name}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase flex-shrink-0 ${
                              p.type === 'guest'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-brand-lime/10 text-brand-lime border border-brand-lime/30'
                            }`}>
                              {p.type === 'guest' ? 'Guest' : 'Player'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                        p.isApproved
                          ? 'bg-brand-lime/10 border border-brand-lime/30 text-brand-lime'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                      }`}>
                        {p.isApproved ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {/* LOCATION MAP MODAL */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5 text-brand-lime" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Venue Location Map</h3>
                  <p className="text-xs text-slate-400 truncate max-w-md">
                    {associatedCourt ? (
                      [associatedCourt.name, associatedCourt.location, associatedCourt.barangay, associatedCourt.municipality, associatedCourt.province].filter(Boolean).join(', ')
                    ) : (
                      event?.location
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-brand-lime/10 hover:bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Get Directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative shadow-inner">
                {parsedMapInfo?.embedUrl ? (
                  <iframe
                    title="Location Map"
                    src={parsedMapInfo.embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Map preview unavailable for this location.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-slate-700 transition-all cursor-pointer"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
