import type { OpenPlayEvent } from '../components/OpenPlayDetails';

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
  if (isPast && effectiveStatus === 'active') {
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
    courtIds: Array.isArray(data.courtIds) ? data.courtIds : undefined,
    courtNames: Array.isArray(data.courtNames) ? data.courtNames : undefined,
    isRecurring: data.isRecurring || false,
    recurrencePattern: data.recurrencePattern,
    recurrenceGroupId: data.recurrenceGroupId
  };
};
