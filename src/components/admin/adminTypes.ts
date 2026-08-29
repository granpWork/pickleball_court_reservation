export interface Booking {
  id: string;
  bookingId?: string;
  type?: 'court' | 'open_play' | 'openplay' | 'tournament' | 'bootcamp' | 'coaching';
  openPlayEventId?: string;
  openPlayTitle?: string;
  openPlayCategory?: string;
  playerCount?: number;
  guestCount?: number;
  guests?: { name: string; email: string }[];
  guestNames?: string[];
  guestEmails?: string[];
  companyId?: string;
  courtId: string;
  courtName: string;
  courtType?: string;
  date: string;
  slots: string[];
  totalCost: number;
  status: 'pending' | 'approved' | 'cancelled';
  user: {
    name: string;
    email: string;
    uid?: string;
    phone?: string;
  };
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  createdAt: string;
  paymentMethod?: string;
  paymentStatus?: string;
  bookingReference?: string;
  gcashReferenceNumber?: string;
  receiptImageUrl?: string;
  voucherCode?: string;
  discountAmount?: number;
  refundReceiptUrl?: string;
  isAddGuestOnly?: boolean;
  primaryPlayerName?: string;
  primaryPlayerEmail?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundRequested?: boolean;
  refundRequestReason?: string;
  refundRequestedAt?: string;
  refundRequestStatus?: 'pending' | 'approved' | 'rejected';
  courtOwnerId?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerCompanyName?: string;
  companyAddress?: string;
  rentals?: { id?: string; name: string; price: number; pricingType?: string; quantity: number }[];
}

export interface Voucher {
  id: string;
  code: string;
  type: 'cancellation_credit' | 'rainout_voucher' | 'promo';
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  companyId?: string;
  companyName?: string;
  courtId?: string;
  ownerId?: string;
  issuedToEmail?: string;
  issuedToName?: string;
  sourceBookingId?: string;
  maxUses: number;
  usedCount: number;
  expiryDate?: string;
  status: 'active' | 'exhausted' | 'expired';
  createdAt: string;
}

export type UserRole = 'super_admin' | 'client_admin' | 'manager' | 'editor' | 'player';

export interface UserPermissions {
  canManageBookings?: boolean;
  canManageCourts?: boolean;
  canManageOpenPlay?: boolean;
  canManageVouchers?: boolean;
  canViewFinancials?: boolean;
  canManageTeam?: boolean;
}

export function getUserEffectivePermissions(user?: { role?: string; permissions?: UserPermissions } | null): UserPermissions {
  const role = user?.role;
  const customPerms = user?.permissions || {};

  if (role === 'super_admin' || role === 'client_admin') {
    return {
      canManageBookings: true,
      canManageCourts: true,
      canManageOpenPlay: true,
      canManageVouchers: true,
      canViewFinancials: true,
      canManageTeam: true,
    };
  }

  if (role === 'editor') {
    return {
      canManageBookings: customPerms.canManageBookings ?? true,
      canManageCourts: customPerms.canManageCourts ?? false,
      canManageOpenPlay: customPerms.canManageOpenPlay ?? true,
      canManageVouchers: customPerms.canManageVouchers ?? false,
      canViewFinancials: customPerms.canViewFinancials ?? false,
      canManageTeam: customPerms.canManageTeam ?? false,
    };
  }

  // Manager or default staff role
  return {
    canManageBookings: customPerms.canManageBookings ?? true,
    canManageCourts: customPerms.canManageCourts ?? true,
    canManageOpenPlay: customPerms.canManageOpenPlay ?? true,
    canManageVouchers: customPerms.canManageVouchers ?? true,
    canViewFinancials: customPerms.canViewFinancials ?? true,
    canManageTeam: customPerms.canManageTeam ?? false,
  };
}

export interface UserAccount {
  uid?: string;
  name: string;
  email: string;
  role?: UserRole | string;
  status?: 'active' | 'inactive' | 'pending' | 'deleted';
  companyId?: string;
  companyName?: string;
  permissions?: UserPermissions;
  isInvitedPending?: boolean;
  isInvitation?: boolean;
  inviteToken?: string;
  expiresAt?: string;
  invitedBy?: string;
  customMessage?: string;
  createdAt?: string;
  photoUrl?: string;
  avatarUrl?: string;
}

export interface DayOperatingHours {
  isOpen: boolean;
  isDayOff?: boolean;
  openTime: string;
  closeTime: string;
}

export interface DailyOperatingHoursMap {
  monday: DayOperatingHours;
  tuesday: DayOperatingHours;
  wednesday: DayOperatingHours;
  thursday: DayOperatingHours;
  friday: DayOperatingHours;
  saturday: DayOperatingHours;
  sunday: DayOperatingHours;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  clientAdminEmail: string;
  createdAt: string;
  status?: 'pending' | 'active' | 'inactive';
  phone?: string;
  description?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  logoUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  bookingLeadTimeMinutes?: number;
  operatingHours?: DailyOperatingHoursMap;
  subdomain?: string;
  ownerId?: string;
}

export interface RentalItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  pricingType: 'per_booking' | 'per_hour' | 'per_session';
  quantity: number;
  enabled: boolean;
  images?: string[];
}

export interface CourtPolicies {
  cancellationPolicy?: string;
  rulesPolicy?: string;
  weatherPolicy?: string;
  equipmentPolicy?: string;
}

export interface Court {
  id: string;
  name: string;
  type: string;
  dayPrice: number;
  nightPrice: number;
  companyId?: string;
  companyName?: string;
  ownerId?: string;
  createdByEmail?: string;
  ownerCompanyName?: string;
  companyAddress?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  createdAt?: string;
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
  description?: string;
  rentals?: RentalItem[];
  gcashAccountId?: string;
  published?: boolean;
  policies?: CourtPolicies;
  latitude?: number;
  longitude?: number;
}

export interface GcashAccount {
  id: string;
  paymentName?: string;
  gcashName: string;
  gcashNumber: string;
  gcashQrCode: string;
}

export interface AdminUser {
  uid?: string;
  name: string;
  email: string;
  role?: string;
  isAdmin?: boolean;
}

export interface AdminDashboardProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile') => void;
  user: AdminUser | null;
  onLogout: () => void;
}

export interface ShortLink {
  id: string;
  title: string;
  shortSlug: string;
  shortUrl: string;
  originalUrl: string;
  companyId?: string;
  createdByEmail?: string;
  createdAt: string;
  clickCount: number;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  senderName: string;
  senderEmail: string;
  senderRole?: string;
  facilityName?: string;
  category: 'technical' | 'billing' | 'courts' | 'permissions' | 'feature' | 'general';
  priority: 'low' | 'medium' | 'urgent';
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type AdminTab = 'dashboard' | 'bookings' | 'courts' | 'users' | 'companies' | 'checkouts' | 'settings' | 'openplay' | 'policies' | 'vouchers' | 'service_fee' | 'shortener' | 'support';
export type AdminSettingsSubTab = 'profile' | 'organization' | 'team' | 'policies' | 'reminders' | 'gcash' | 'lead_time' | 'service_fee';

export const SLOTS = [
  { time: '05:00 AM - 06:00 AM', startHour: 5 },
  { time: '06:00 AM - 07:00 AM', startHour: 6 },
  { time: '07:00 AM - 08:00 AM', startHour: 7 },
  { time: '08:00 AM - 09:00 AM', startHour: 8 },
  { time: '09:00 AM - 10:00 AM', startHour: 9 },
  { time: '10:00 AM - 11:00 AM', startHour: 10 },
  { time: '11:00 AM - 12:00 PM', startHour: 11 },
  { time: '12:00 PM - 01:00 PM', startHour: 12 },
  { time: '01:00 PM - 02:00 PM', startHour: 13 },
  { time: '02:00 PM - 03:00 PM', startHour: 14 },
  { time: '03:00 PM - 04:00 PM', startHour: 15 },
  { time: '04:00 PM - 05:00 PM', startHour: 16 },
  { time: '05:00 PM - 06:00 PM', startHour: 17 },
  { time: '06:00 PM - 07:00 PM', startHour: 18 },
  { time: '07:00 PM - 08:00 PM', startHour: 19 },
  { time: '08:00 PM - 09:00 PM', startHour: 20 },
  { time: '09:00 PM - 10:00 PM', startHour: 21 },
  { time: '10:00 PM - 11:00 PM', startHour: 22 },
  { time: '11:00 AM - 12:00 AM', startHour: 23 },
];

export const getSlotPrice = (startHour: number, dayPrice = 100, nightPrice = 150) => {
  return startHour >= 18 ? nightPrice : dayPrice;
};

export const DEFAULT_OPERATING_HOURS: DailyOperatingHoursMap = {
  monday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  tuesday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  wednesday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  thursday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  friday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  saturday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  sunday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
};

export const DAYS_OF_WEEK: { key: keyof DailyOperatingHoursMap; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const OPERATING_TIME_OPTIONS = [
  '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
  '09:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'
];

export const parseTimeStringToHour = (timeStr: string): number => {
  if (!timeStr) return 5;
  const clean = timeStr.trim().toUpperCase();
  if (clean === '12:00 AM') return 24;
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) return 5;
  let hour = parseInt(match[1], 10);
  const period = match[3];
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
};

export const BOOKING_COLOR_THEMES = [
  { border: 'border-emerald-500/50', bg: 'bg-emerald-950/25', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-500' },
  { border: 'border-cyan-500/50', bg: 'bg-cyan-950/25', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', dot: 'bg-cyan-500' },
  { border: 'border-purple-500/50', bg: 'bg-purple-950/25', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', dot: 'bg-purple-500' },
  { border: 'border-amber-500/50', bg: 'bg-amber-950/25', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-500' },
  { border: 'border-indigo-500/50', bg: 'bg-indigo-950/25', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', dot: 'bg-indigo-500' },
  { border: 'border-rose-500/50', bg: 'bg-rose-950/25', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-500' },
];

export const getBookingColorTheme = (bookingKey: string) => {
  let hash = 0;
  for (let i = 0; i < bookingKey.length; i++) {
    hash = bookingKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BOOKING_COLOR_THEMES.length;
  return BOOKING_COLOR_THEMES[index];
};

export type BookingScheduleState = 'upcoming' | 'in_progress' | 'completed';

export const getBookingScheduleState = (dateStr: string, slots?: string[]): BookingScheduleState => {
  if (!dateStr) return 'upcoming';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'upcoming';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || !month || !day) return 'upcoming';

  const now = new Date();
  const bookingDateStart = new Date(year, month - 1, day, 0, 0, 0);
  const bookingDateEnd = new Date(year, month - 1, day, 23, 59, 59);

  if (now < bookingDateStart) {
    return 'upcoming';
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  if (bookingDateEnd < todayStart) {
    return 'completed';
  }

  // Date is TODAY: evaluate time slots if provided
  if (!slots || slots.length === 0) {
    return 'upcoming';
  }

  const parseSlotHour = (sStr: string): { start: number; end: number } => {
    const parts = sStr.split(' - ');
    const parseSingleHour = (t: string) => {
      const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h;
      }
      return 0;
    };
    if (parts.length === 2) {
      const s = parseSingleHour(parts[0]);
      const e = parseSingleHour(parts[1]);
      return { start: s, end: e || s + 1 };
    }
    const h = parseSingleHour(sStr);
    return { start: h, end: h + 1 };
  };

  const currentHour = now.getHours() + now.getMinutes() / 60;
  let minStart = 24;
  let maxEnd = 0;

  for (const slot of slots) {
    const { start, end } = parseSlotHour(slot);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  if (currentHour < minStart) {
    return 'upcoming';
  }
  if (currentHour >= maxEnd) {
    return 'completed';
  }
  return 'in_progress';
};

export const isPastBookingDate = (dateStr: string, slots?: string[]): boolean => {
  return getBookingScheduleState(dateStr, slots) === 'completed';
};

export const REGIONS_FALLBACK = [
  { code: "1300000000", name: "National Capital Region (NCR)" },
  { code: "0100000000", name: "Region I (Ilocos Region)" },
  { code: "0200000000", name: "Region II (Cagayan Valley)" },
  { code: "0300000000", name: "Region III (Central Luzon)" },
  { code: "0400000000", name: "Region IV-A (CALABARZON)" },
  { code: "1700000000", name: "MIMAROPA Region" },
  { code: "0500000000", name: "Region V (Bicol Region)" },
  { code: "0600000000", name: "Region VI (Western Visayas)" },
  { code: "0700000000", name: "Region VII (Central Visayas)" },
  { code: "0800000000", name: "Region VIII (Eastern Visayas)" },
  { code: "0900000000", name: "Region IX (Zamboanga Peninsula)" },
  { code: "1000000000", name: "Region X (Northern Mindanao)" },
  { code: "1100000000", name: "Region XI (Davao Region)" },
  { code: "1200000000", name: "Region XII (SOCCSKSARGEN)" },
  { code: "1400000000", name: "Cordillera Administrative Region (CAR)" },
  { code: "1600000000", name: "Region XIII (Caraga)" },
  { code: "1900000000", name: "Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)" }
];
