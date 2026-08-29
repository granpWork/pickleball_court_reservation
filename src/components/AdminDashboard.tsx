import { useState, useEffect, useMemo, Fragment } from 'react';
import { AdminSidebar } from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminDashboardTab } from './admin/tabs/AdminDashboardTab';
import { AdminBookingsTab } from './admin/tabs/AdminBookingsTab';
import { AdminCourtsTab } from './admin/tabs/AdminCourtsTab';
import { AdminCompaniesTab } from './admin/tabs/AdminCompaniesTab';
import { AdminCheckoutsTab } from './admin/tabs/AdminCheckoutsTab';
import { AdminOpenPlayTab } from './admin/tabs/AdminOpenPlayTab';
import { AdminVouchersTab } from './admin/tabs/AdminVouchersTab';
import { AdminPoliciesTab } from './admin/tabs/AdminPoliciesTab';
import { AdminUsersTab } from './admin/tabs/AdminUsersTab';
import { AdminSettingsTab } from './admin/tabs/AdminSettingsTab';
import { AdminServiceFeeTab } from './admin/tabs/AdminServiceFeeTab';
import { AdminShortenerTab } from './admin/tabs/AdminShortenerTab';
import { AdminSupportTicketsTab } from './admin/tabs/AdminSupportTicketsTab';
import { type AdminTab, type AdminSettingsSubTab, type ShortLink, type UserPermissions, getUserEffectivePermissions } from './admin/adminTypes';
import { AdminModalAlert, type AdminModalAlertData } from './admin/modals/AdminModalAlert';
import { AdminContactSupportModal } from './admin/modals/AdminContactSupportModal';
import { AdminClientTicketsModal } from './admin/modals/AdminClientTicketsModal';
import { parseGoogleMapsUrl } from '../utils/mapUtils';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import {
  LayoutDashboard,
  UserPlus,
  Calendar,
  Clock,
  User,
  Users,
  TrendingUp,
  DollarSign,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowLeft,
  Loader2,
  UserCheck,
  UserX,
  Filter,
  AlertCircle,
  AlertTriangle,
  XCircle,
  MapPin,
  Plus,
  Shield,
  Menu,
  Globe,
  Star,
  ArrowRight,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  List,
  LayoutGrid,
  Building2,
  Mail,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Share2,
  Upload,
  FileText,
  Sparkles,
  CloudRain,
  CheckCircle,
  CheckCircle2,
  Tag,
  Save,
  RotateCcw,
  Bell,
  Volume2,
  VolumeX,
  Send,
  Settings,
  ChevronUp,
  Repeat,
  CalendarCheck,
  MailPlus,
  Copy,
  Download,
  BarChart3,
  ShieldCheck,
  KeyRound,
  CheckCheck,
  Phone,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, query, where, getDoc, onSnapshot } from 'firebase/firestore';
import { sendCustomUserEmail, sendBookingStatusUpdateEmail, sendCompanyInvitationEmail, sendCompanyApprovalEmail, sendVoucherIssuedEmail, sendRefundConfirmationEmail, sendNonRefundableCancellationEmail, sendPaymentApprovalReceiptEmail, sendPendingPaymentsReminderEmail, sendClientAdminInvitationEmail, sendUserInvitationEmail } from '../services/emailService';
import { isEventExpired, formatTime12h, formatEventDateLong, splitAddressComponents, normalizeOpenPlayEvent, type OpenPlayEvent, type OpenPlayRegistration } from './OpenPlayDetails';

const SLOTS = [
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
  { time: '11:00 PM - 12:00 AM', startHour: 23 },
];

const getSlotPrice = (startHour: number, dayPrice: number = 100, nightPrice: number = 150) => {
  return startHour >= 18 ? nightPrice : dayPrice;
};

interface Booking {
  id: string;
  bookingId?: string; // for local fallback
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

interface UserAccount {
  uid?: string;
  name: string;
  email: string;
  role?: string;
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

const DEFAULT_OPERATING_HOURS: DailyOperatingHoursMap = {
  monday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  tuesday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  wednesday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  thursday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  friday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  saturday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
  sunday: { isOpen: true, openTime: '05:00 AM', closeTime: '10:00 PM' },
};

const DAYS_OF_WEEK: { key: keyof DailyOperatingHoursMap; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const OPERATING_TIME_OPTIONS = [
  '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
  '09:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'
];

const parseTimeStringToHour = (timeStr: string): number => {
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

const BOOKING_COLOR_THEMES = [
  { border: 'border-emerald-500/50', bg: 'bg-emerald-950/25', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-500' },
  { border: 'border-cyan-500/50', bg: 'bg-cyan-950/25', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', dot: 'bg-cyan-500' },
  { border: 'border-purple-500/50', bg: 'bg-purple-950/25', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', dot: 'bg-purple-500' },
  { border: 'border-amber-500/50', bg: 'bg-amber-950/25', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-500' },
  { border: 'border-indigo-500/50', bg: 'bg-indigo-950/25', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', dot: 'bg-indigo-500' },
  { border: 'border-rose-500/50', bg: 'bg-rose-950/25', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-500' },
];

const getBookingColorTheme = (bookingKey: string) => {
  let hash = 0;
  for (let i = 0; i < bookingKey.length; i++) {
    hash = bookingKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BOOKING_COLOR_THEMES.length;
  return BOOKING_COLOR_THEMES[index];
};

const isPastBookingDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || !month || !day) return false;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const bookingEnd = new Date(year, month - 1, day, 23, 59, 59);
  const todayStart = new Date(currentYear, currentMonth - 1, currentDay, 0, 0, 0);

  return bookingEnd < todayStart;
};

interface Company {
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
}

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

const REGIONS_FALLBACK = [
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

interface AdminDashboardProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile') => void;
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean; companyId?: string; needsOnboarding?: boolean } | null;
  onLogout: () => void;
}

export default function AdminDashboard({ setView, user, onLogout }: AdminDashboardProps) {
  const currentUserUid = user?.uid || 'unknown';
  const currentUserEmail = user?.email?.toLowerCase() || '';
  const isSuperAdmin = currentUserEmail === 'admin@picklepoint.com' || user?.role === 'super_admin';

  // Security guard for un-onboarded Client Admins trying to load Admin Dashboard directly
  useEffect(() => {
    if (user?.role === 'client_admin' && (!user.companyId || (user as any).needsOnboarding)) {
      if (typeof window !== 'undefined' && window.location.pathname === '/pickle-admin') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [user, setView]);

  // Support Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isClientTicketsModalOpen, setIsClientTicketsModalOpen] = useState(false);

  // Custom Modal Alert State
  const [modalAlert, setModalAlert] = useState<AdminModalAlertData>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showModalAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    confirmText?: string,
    onConfirm?: () => void
  ) => {
    setModalAlert({ open: true, title, message, type, confirmText, onConfirm });
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      const saved = sessionStorage.getItem('picklepoint_admin_active_tab');
      if (saved && ['bookings', 'courts', 'users', 'companies', 'checkouts', 'settings', 'openplay', 'policies', 'vouchers', 'service_fee', 'shortener'].includes(saved)) {
        return saved as AdminTab;
      }
    } catch (e) {}
    return 'bookings';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('picklepoint_admin_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  const [settingsSubTab, setSettingsSubTab] = useState<AdminSettingsSubTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlSubTab = params.get('subtab') || params.get('settingsSubTab');
        if (urlSubTab && ['profile', 'organization', 'team', 'policies', 'reminders', 'gcash', 'lead_time', 'service_fee'].includes(urlSubTab)) {
          return urlSubTab as AdminSettingsSubTab;
        }
        const saved = sessionStorage.getItem('picklepoint_admin_settings_subtab') || localStorage.getItem('picklepoint_admin_settings_subtab');
        if (saved && ['profile', 'organization', 'team', 'policies', 'reminders', 'gcash', 'lead_time', 'service_fee'].includes(saved)) {
          return saved as AdminSettingsSubTab;
        }
      }
    } catch (e) {}
    return 'profile';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('picklepoint_admin_settings_subtab', settingsSubTab);
      localStorage.setItem('picklepoint_admin_settings_subtab', settingsSubTab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('subtab', settingsSubTab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}
  }, [settingsSubTab]);
  const [settingsSubMenuOpen, setSettingsSubMenuOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingLeadTimeMinutes, setBookingLeadTimeMinutes] = useState<number>(30);
  const [leadTimeSaveSuccess, setLeadTimeSaveSuccess] = useState(false);
  const [leadTimeSaveLoading, setLeadTimeSaveLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [shortLinks, setShortLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Checkout Settings states
  interface GcashAccount {
    id: string;
    paymentName?: string;
    gcashName: string;
    gcashNumber: string;
    gcashQrCode: string;
  }

  const [personalAccounts, setPersonalAccounts] = useState<GcashAccount[]>([]);
  const [globalGcashNameSetting, setGlobalGcashNameSetting] = useState('');
  const [globalGcashNumberSetting, setGlobalGcashNumberSetting] = useState('');
  const [globalGcashQrSetting, setGlobalGcashQrSetting] = useState('');
  const [globalServiceFeeSetting, setGlobalServiceFeeSetting] = useState<number>(30);
  const [globalServiceFeeEnabled, setGlobalServiceFeeEnabled] = useState<boolean>(true);
  const [serviceFeeSaving, setServiceFeeSaving] = useState(false);
  const [serviceFeeSuccessModalMessage, setServiceFeeSuccessModalMessage] = useState<string | null>(null);

  // Form states inside settings modal
  const [gcashModalOpen, setGcashModalOpen] = useState(false);
  const [settingsModalType, setSettingsModalType] = useState<'my' | 'global'>('my');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [paymentNameSetting, setPaymentNameSetting] = useState('');
  const [gcashNameSetting, setGcashNameSetting] = useState('');
  const [gcashNumberSetting, setGcashNumberSetting] = useState('');
  const [gcashQrCodeSetting, setGcashQrCodeSetting] = useState('');
  const [settingsValidationError, setSettingsValidationError] = useState<string | null>(null);

  const [settingsSaveLoading, setSettingsSaveLoading] = useState(false);
  const [receiptLightboxImage, setReceiptLightboxImage] = useState<string | null>(null);
  const [showSettingsSuccessModal, setShowSettingsSuccessModal] = useState(false);

  // Payment Approval Reminder States
  interface PaymentReminderSettings {
    enabled: boolean;
    preset: '5' | '10' | '15' | '30' | 'custom';
    intervalMinutes: number;
    customMinutes: number;
    emailEnabled: boolean;
    emailRecipient: string;
    soundEnabled: boolean;
    browserNotificationEnabled: boolean;
  }

  const [paymentReminderSettings, setPaymentReminderSettings] = useState<PaymentReminderSettings>({
    enabled: false,
    preset: '15',
    intervalMinutes: 15,
    customMinutes: 15,
    emailEnabled: false,
    emailRecipient: user?.email || '',
    soundEnabled: true,
    browserNotificationEnabled: false,
  });

  const [reminderSaveLoading, setReminderSaveLoading] = useState(false);
  const [reminderSaveSuccess, setReminderSaveSuccess] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);
  const [pendingReminderToast, setPendingReminderToast] = useState<{
    open: boolean;
    count: number;
    timestamp: number;
  } | null>(null);

  // Refund Modal States
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('');
  const [_refundReceiptFile, setRefundReceiptFile] = useState<File | null>(null);
  const [refundReceiptBase64, setRefundReceiptBase64] = useState<string>('');
  const [refundReceiptName, setRefundReceiptName] = useState<string>('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Cancellation Resolution Choice State ('refund' | 'voucher' | 'no_refund')
  const [cancellationResolutionMode, setCancellationResolutionMode] = useState<'refund' | 'voucher' | 'no_refund'>('refund');
  const [refundVoucherExpiryDays, setRefundVoucherExpiryDays] = useState<number>(30);
  const nonRefundableReason = 'Late cancellation within 12h policy window';

  // Checkouts Accordion State
  const [expandedCheckoutId, setExpandedCheckoutId] = useState<string | null>(null);
  
  // Reject Checkout Modal States
  const [rejectCheckoutModalBooking, setRejectCheckoutModalBooking] = useState<Booking | null>(null);
  const [rejectReasonOption, setRejectReasonOption] = useState<string>('invalid_ref');
  const [rejectCustomReason, setRejectCustomReason] = useState<string>('');
  const [rejectSendEmail, setRejectSendEmail] = useState<boolean>(true);
  const [rejectCheckoutSubmitting, setRejectCheckoutSubmitting] = useState<boolean>(false);
  const [rejectSuccessAlert, setRejectSuccessAlert] = useState<string | null>(null);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'cancelled'>('all');
  const [checkoutCategoryFilter, setCheckoutCategoryFilter] = useState<'all' | 'court' | 'openplay'>('all');
  const [checkoutStatusFilter, setCheckoutStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('pending');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'player' | 'client_admin' | 'super_admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive' | 'deleted'>('all');
  
  // Edit Booking Modal States
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'cancelled'>('pending');

  // User Edit & Delete Modal States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<'player' | 'client_admin' | 'super_admin'>('player');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'pending' | 'inactive' | 'deleted'>('active');
  const [editUserPhotoUrl, setEditUserPhotoUrl] = useState('');

  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Court Delete Modal States
  const [deleteCourtModalOpen, setDeleteCourtModalOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);
  const [courtDeleteLoading, setCourtDeleteLoading] = useState(false);
  const [courtDeleteError, setCourtDeleteError] = useState<string | null>(null);

  // Booking Delete Modal States
  const [deleteBookingModalOpen, setDeleteBookingModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [bookingDeleteLoading, setBookingDeleteLoading] = useState(false);
  const [bookingDeleteError, setBookingDeleteError] = useState<string | null>(null);

  // Open Play Delete Modal State
  const [deletingOpenPlayEvent, setDeletingOpenPlayEvent] = useState<OpenPlayEvent | null>(null);

  // Email Modal States
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToAddress, setEmailToAddress] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSubjectInput, setEmailSubjectInput] = useState('');
  const [emailMessageInput, setEmailMessageInput] = useState('');
  const [emailTemplateType, setEmailTemplateType] = useState<'custom' | 'approval' | 'cancellation' | 'reminder'>('custom');
  const [emailSendLoading, setEmailSendLoading] = useState(false);

  // User Invitation Modal States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRoleInput, setInviteRoleInput] = useState<'client_admin' | 'super_admin' | 'player' | 'manager' | 'editor'>('client_admin');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteNameInput, setInviteNameInput] = useState('');
  const [inviteCompanyNameInput, setInviteCompanyNameInput] = useState('');
  const [inviteDepartmentInput, setInviteDepartmentInput] = useState('');
  const [inviteCustomMessage, setInviteCustomMessage] = useState('');
  const [inviteExpiryHours, setInviteExpiryHours] = useState<number>(48);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccessInfo, setInviteSuccessInfo] = useState<{ email: string; token: string; link: string; expiresAt: string; role?: string } | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [copiedInviteUserToken, setCopiedInviteUserToken] = useState<string | null>(null);

  const handleSendInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const isClientAdmin = user?.role === 'client_admin';
    if (!isSuperAdmin && !isClientAdmin) {
      showModalAlert('Access Denied', 'Only Administrators can send invitations.', 'warning');
      return;
    }
    if (!isSuperAdmin && isClientAdmin && inviteRoleInput !== 'manager' && inviteRoleInput !== 'editor') {
      showModalAlert('Access Denied', 'Client Administrators can only send invitations for Manager or Editor roles.', 'warning');
      return;
    }
    if (!inviteEmailInput) return;
    if (isSuperAdmin && inviteRoleInput === 'client_admin' && !inviteCompanyNameInput.trim()) {
      showModalAlert('Missing Field', 'Assigned Facility / Company Name is required when inviting a Client Admin.', 'warning');
      return;
    }

    setInviteLoading(true);
    setInviteSuccessInfo(null);
    setCopiedInviteLink(false);

    try {
      const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const expiresAt = new Date(Date.now() + (inviteExpiryHours || 48) * 60 * 60 * 1000).toISOString();
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

      const assignedCompany = isClientAdmin
        ? (effectiveOrgName || myCompany?.name || 'Facility')
        : inviteRoleInput === 'client_admin'
        ? inviteCompanyNameInput.trim()
        : (inviteCompanyNameInput.trim() || 'Global Platform');

      const companyParam = encodeURIComponent(assignedCompany);
      const inviteUrl = `${baseUrl}/register?inviteToken=${inviteToken}&email=${encodeURIComponent(inviteEmailInput.trim())}&company=${companyParam}&role=${inviteRoleInput}`;

      const inviteData = {
        token: inviteToken,
        email: inviteEmailInput.toLowerCase().trim(),
        name: inviteNameInput.trim(),
        company: assignedCompany,
        companyId: myCompany?.id || (user as any)?.companyId || '',
        department: inviteRoleInput === 'super_admin' ? inviteDepartmentInput.trim() : '',
        role: inviteRoleInput,
        permissions: getUserEffectivePermissions({ role: inviteRoleInput }),
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt,
        invitedBy: (user as any)?.email || 'admin@picklepoint.com',
        customMessage: inviteCustomMessage.trim(),
      };

      if (db) {
        await setDoc(doc(db, 'invitations', inviteToken), inviteData);
      }

      await sendUserInvitationEmail({
        toEmail: inviteEmailInput.toLowerCase().trim(),
        toName: inviteNameInput.trim() || undefined,
        role: inviteRoleInput,
        inviteUrl,
        expiresAt,
        invitedBy: (user as any)?.email || 'admin@picklepoint.com',
        companyName: inviteCompanyNameInput.trim() || undefined,
        customMessage: inviteCustomMessage.trim() || undefined,
      });

      setInviteSuccessInfo({
        email: inviteEmailInput.trim(),
        token: inviteToken,
        link: inviteUrl,
        expiresAt,
        role: inviteRoleInput,
      });

      // Refresh users state to immediately render pending invite in Team & Access
      fetchData();

      setInviteEmailInput('');
      setInviteNameInput('');
      setInviteCompanyNameInput('');
      setInviteDepartmentInput('');
      setInviteCustomMessage('');
    } catch (err) {
      console.error('Error sending invitation:', err);
      showModalAlert('Invitation Failed', 'Failed to send invitation. Please check network connection.', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  // Company States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyAddressInput, setCompanyAddressInput] = useState('');
  const [clientAdminEmailInput, setClientAdminEmailInput] = useState('');
  const [companyStatusInput, setCompanyStatusInput] = useState<'pending' | 'active' | 'inactive'>('pending');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');

  // Organization Profile Settings States
  const [orgProfileName, setOrgProfileName] = useState('');
  const [orgProfilePhone, setOrgProfilePhone] = useState('');
  const [orgAddressLine1, setOrgAddressLine1] = useState('');
  const [orgAddressLine2, setOrgAddressLine2] = useState('');
  const [orgPostalCode, setOrgPostalCode] = useState('');
  const [orgCountry, setOrgCountry] = useState('Philippines');

  const [orgSelectedRegion, setOrgSelectedRegion] = useState('');
  const [orgSelectedProvince, setOrgSelectedProvince] = useState('');
  const [orgSelectedCity, setOrgSelectedCity] = useState('');
  const [orgSelectedBarangay, setOrgSelectedBarangay] = useState('');

  const [orgRegionName, setOrgRegionName] = useState('');
  const [orgProvinceName, setOrgProvinceName] = useState('');
  const [orgCityName, setOrgCityName] = useState('');
  const [orgBarangayName, setOrgBarangayName] = useState('');

  const [orgProvinces, setOrgProvinces] = useState<{ code: string; name: string }[]>([]);
  const [orgCities, setOrgCities] = useState<{ code: string; name: string }[]>([]);
  const [orgBarangays, setOrgBarangays] = useState<{ code: string; name: string }[]>([]);

  const [orgProfileWebsite, setOrgProfileWebsite] = useState('');
  const [orgProfileFacebook, setOrgProfileFacebook] = useState('');
  const [orgProfileInstagram, setOrgProfileInstagram] = useState('');
  const [orgProfileLogoUrl, setOrgProfileLogoUrl] = useState<string | null>(null);
  const [orgSubdomain, setOrgSubdomain] = useState('');
  const [orgOperatingHours, setOrgOperatingHours] = useState<DailyOperatingHoursMap>(DEFAULT_OPERATING_HOURS);
  const [orgProfileSaveSuccess, setOrgProfileSaveSuccess] = useState(false);
  const [orgProfileSaveLoading, setOrgProfileSaveLoading] = useState(false);

  const handleToggleDayOff = (dayKey: keyof DailyOperatingHoursMap) => {
    setOrgOperatingHours((prev) => {
      const current = prev[dayKey];
      const isCurrentlyDayOff = current.isDayOff ?? !current.isOpen;
      const nextIsDayOff = !isCurrentlyDayOff;
      return {
        ...prev,
        [dayKey]: {
          ...current,
          isDayOff: nextIsDayOff,
          isOpen: !nextIsDayOff,
        },
      };
    });
  };

  const handleDayTimeChange = (dayKey: keyof DailyOperatingHoursMap, field: 'openTime' | 'closeTime', value: string) => {
    setOrgOperatingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const handleApplyMonToAll = () => {
    const mondayConfig = orgOperatingHours.monday;
    setOrgOperatingHours({
      monday: { ...mondayConfig },
      tuesday: { ...mondayConfig },
      wednesday: { ...mondayConfig },
      thursday: { ...mondayConfig },
      friday: { ...mondayConfig },
      saturday: { ...mondayConfig },
      sunday: { ...mondayConfig },
    });
  };

  const processOrgLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 400;
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setOrgProfileLogoUrl(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  // Open Play States
  const [openPlayEvents, setOpenPlayEvents] = useState<OpenPlayEvent[]>([]);
  const [openPlayRegistrations, setOpenPlayRegistrations] = useState<OpenPlayRegistration[]>([]);
  const [openPlayModalOpen, setOpenPlayModalOpen] = useState(false);
  const [editingOpenPlay, setEditingOpenPlay] = useState<OpenPlayEvent | null>(null);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<OpenPlayEvent | null>(null);
  const [rosterModalViewMode, setRosterModalViewMode] = useState<'cards' | 'list' | 'table'>('cards');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterFilterRole, setRosterFilterRole] = useState<'all' | 'primary' | 'guest'>('all');
  const [copiedShareLink, setCopiedShareLink] = useState<string | null>(null);

  // Persistent Attendance Checker State
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_attendance_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleAttendance = (attendeeId: string) => {
    setAttendanceMap(prev => {
      const nextState = !prev[attendeeId];
      const updated = { ...prev, [attendeeId]: nextState };
      try {
        localStorage.setItem('picklepoint_attendance_map', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save attendance to localStorage:', e);
      }
      return updated;
    });
  };

  const checkHasEventStarted = (event: OpenPlayEvent | null, bufferMinutes: number = 15): boolean => {
    if (!event || !event.eventDate) return true;
    try {
      const now = new Date();
      let eventDateObj: Date | null = null;

      if (event.eventDate.includes('-') && event.eventDate.length === 10) {
        const [year, month, day] = event.eventDate.split('-').map(Number);
        eventDateObj = new Date(year, month - 1, day);
      } else {
        const parsed = Date.parse(event.eventDate);
        if (!isNaN(parsed)) {
          eventDateObj = new Date(parsed);
        }
      }

      if (!eventDateObj) return true;

      const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const eventZero = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate()).getTime();

      if (todayZero > eventZero) {
        return true;
      }
      if (todayZero < eventZero) {
        return false;
      }

      if (event.startTime) {
        let startHour = 0;
        let startMinute = 0;

        const timeStr = event.startTime.trim().toUpperCase();
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
          const isPM = timeStr.includes('PM');
          const isAM = timeStr.includes('AM');
          const cleanTime = timeStr.replace(/(AM|PM)/g, '').trim();
          const parts = cleanTime.split(':').map(Number);
          startHour = parts[0] || 0;
          startMinute = parts[1] || 0;
          if (isPM && startHour < 12) startHour += 12;
          if (isAM && startHour === 12) startHour = 0;
        } else if (timeStr.includes(':')) {
          const parts = timeStr.split(':').map(Number);
          startHour = parts[0] || 0;
          startMinute = parts[1] || 0;
        }

        const eventStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute).getTime();
        const earlyCheckInMs = eventStartMs - (bufferMinutes * 60 * 1000);
        return now.getTime() >= earlyCheckInMs;
      }

      return true;
    } catch (err) {
      console.error('Error checking event start time:', err);
      return true;
    }
  };

  // Form states for Open Play Event creation/edit
  const [openPlayTitle, setOpenPlayTitle] = useState('');
  const [openPlayLocation, setOpenPlayLocation] = useState('');
  const [openPlayDate, setOpenPlayDate] = useState('');
  const [openPlayStartTime, setOpenPlayStartTime] = useState('18:00');
  const [openPlayEndTime, setOpenPlayEndTime] = useState('21:00');
  const [openPlayCategory, setOpenPlayCategory] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Open to All' | 'Doubles' | 'Singles'>('Open to All');
  const [openPlaySkillLevel, setOpenPlaySkillLevel] = useState<string>('All Skill Levels');
  const [openPlayHostPhone, setOpenPlayHostPhone] = useState<string>('');
  const [openPlayDescription, setOpenPlayDescription] = useState('');
  const [openPlayPosterUrl, setOpenPlayPosterUrl] = useState<string | null>(null);
  const [openPlayMaxParticipants, setOpenPlayMaxParticipants] = useState(16);
  const [openPlayFee, setOpenPlayFee] = useState(250);
  const [openPlayGcashAccountId, setOpenPlayGcashAccountId] = useState('');
  const [openPlayCourtIds, setOpenPlayCourtIds] = useState<string[]>([]);
  const [openPlayRotationRule, setOpenPlayRotationRule] = useState<'winners_stay' | 'all_4_rotate' | 'split_winners'>('winners_stay');
  const [openPlayStatusSetting, setOpenPlayStatusSetting] = useState<'draft' | 'active'>('draft');
  
  // Recurring / Looping Event States
  const [isRecurringEnabled, setIsRecurringEnabled] = useState<boolean>(false);
  const [recurringDays, setRecurringDays] = useState<string[]>(['tuesday']);
  const [recurringWeeksCount, setRecurringWeeksCount] = useState<number>(4);
  const [adminOpenPlayFilter, setAdminOpenPlayFilter] = useState<'all' | 'upcoming' | 'expired'>('all');
  const [adminOpenPlayViewMode, setAdminOpenPlayViewMode] = useState<'cards' | 'history'>('cards');

  const calculateRecurringDates = (startDateStr: string, selectedDays: string[], weeksCount: number): string[] => {
    if (!startDateStr || selectedDays.length === 0 || weeksCount <= 0) return [startDateStr];
    
    const daysMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    
    const targetDayIndices = selectedDays.map(d => daysMap[d.toLowerCase()]).filter(idx => idx !== undefined);
    if (targetDayIndices.length === 0) return [startDateStr];
    
    const dates: string[] = [];
    let start = new Date(startDateStr + 'T00:00:00');
    if (isNaN(start.getTime())) {
      start = new Date(startDateStr);
    }
    if (isNaN(start.getTime())) {
      start = new Date();
    }
    const totalDaysToScan = Math.max(1, weeksCount) * 7;
    
    for (let offset = 0; offset < totalDaysToScan; offset++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + offset);
      const dayOfWeek = cur.getDay();
      if (targetDayIndices.includes(dayOfWeek)) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
    }
    
    const uniqueDates = Array.from(new Set(dates));
    return uniqueDates.length > 0 ? uniqueDates : [startDateStr];
  };

  const handleToggleRecurringDay = (dayKey: string) => {
    setRecurringDays(prev => 
      prev.includes(dayKey)
        ? (prev.length > 1 ? prev.filter(d => d !== dayKey) : prev)
        : [...prev, dayKey]
    );
  };

  const handleToggleOpenPlayCourt = (courtId: string) => {
    setOpenPlayCourtIds(prev => 
      prev.includes(courtId) ? prev.filter(id => id !== courtId) : [...prev, courtId]
    );
  };

  const userObj = user as { companyId?: string; companyName?: string; invitedBy?: string; role?: string } | null;
  const currentCompany = companies.find((c) => 
    (c.clientAdminEmail && currentUserEmail && c.clientAdminEmail.toLowerCase() === currentUserEmail.toLowerCase()) ||
    (userObj?.companyId && c.id === userObj.companyId) ||
    (c.id && currentUserUid && c.id === currentUserUid) ||
    (userObj?.companyName && c.name && c.name.toLowerCase() === userObj.companyName.toLowerCase()) ||
    (c.clientAdminEmail && userObj?.invitedBy && c.clientAdminEmail.toLowerCase() === userObj.invitedBy.toLowerCase())
  );

  const availableAdminCourts = (() => {
    const hostEmail = currentUserEmail.trim().toLowerCase();
    const hostCompanyId = currentCompany?.id || userObj?.companyId;
    const hostCompName = (currentCompany?.name || userObj?.companyName || '').trim().toLowerCase();
    const inviterEmail = (currentCompany?.clientAdminEmail || userObj?.invitedBy || '').trim().toLowerCase();
    const isGenericPlaceholder = !hostCompName || hostCompName === 'picklepoint venue' || hostCompName === 'book picklecourt venue';

    const matched = courts.filter((c) => {
      // 1. Direct Owner UID match
      if (c.ownerId && currentUserUid && currentUserUid !== 'unknown' && c.ownerId === currentUserUid) return true;

      // 2. Direct Owner Email or Creator Email match
      if (hostEmail) {
        if (c.ownerEmail && c.ownerEmail.trim().toLowerCase() === hostEmail) return true;
        if (c.createdByEmail && c.createdByEmail.trim().toLowerCase() === hostEmail) return true;
      }

      // 3. Inviter (Client Admin) email match for staff
      if (inviterEmail) {
        if (c.ownerEmail && c.ownerEmail.trim().toLowerCase() === inviterEmail) return true;
        if (c.createdByEmail && c.createdByEmail.trim().toLowerCase() === inviterEmail) return true;
      }

      // 4. Company ID match
      if (hostCompanyId && c.companyId && c.companyId === hostCompanyId) return true;

      // 5. Company Name match
      if (!isGenericPlaceholder) {
        if (c.ownerCompanyName && c.ownerCompanyName.trim().toLowerCase() === hostCompName) return true;
        if (c.companyName && c.companyName.trim().toLowerCase() === hostCompName) return true;
      }

      return false;
    });

    if (matched.length > 0) return matched;
    if (!isSuperAdmin) return courts;
    if (isSuperAdmin && !currentCompany) return courts;
    return [];
  })();

  const handleSelectAllOpenPlayCourts = () => {
    const targetCourts = availableAdminCourts;
    setOpenPlayCourtIds(targetCourts.map(c => c.id));
  };

  const handleDeselectAllOpenPlayCourts = () => {
    setOpenPlayCourtIds([]);
  };

  const processOpenPlayPosterFile = (file: File) => {
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
        setOpenPlayPosterUrl(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateOpenPlay = () => {
    const targetCourts = availableAdminCourts;
    if (targetCourts.length === 0) {
      showModalAlert('Court Required', "You must create at least 1 court for your venue before creating an Open Play session. Please add a court in the Courts tab first.", 'warning');
      setActiveTab('courts');
      return;
    }

    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[today.getDay()];
    const ownerHostPhone = myCompany?.phone || (myCompany as any)?.hostPhone || (user as any)?.phone || '';

    setEditingOpenPlay(null);
    setOpenPlayTitle('');
    // Automatically select court only if 1 court is available; if > 1 court, leave empty for explicit host selection
    setOpenPlayCourtIds(targetCourts.length === 1 ? [targetCourts[0].id] : []);
    setOpenPlayLocation(targetCourts[0]?.location || myCompany?.address || myCompany?.name || '');
    setOpenPlayDate(today.toISOString().split('T')[0]);
    setOpenPlayStartTime('18:00');
    setOpenPlayEndTime('21:00');
    setOpenPlayCategory('Open to All');
    setOpenPlaySkillLevel('All Skill Levels');
    setOpenPlayHostPhone(ownerHostPhone);
    setOpenPlayDescription('');
    setOpenPlayPosterUrl(null);
    setOpenPlayMaxParticipants(16);
    setOpenPlayFee(250);
    setOpenPlayGcashAccountId(personalAccounts[0]?.id || 'global');
    setOpenPlayRotationRule('winners_stay');
    setOpenPlayStatusSetting('draft');
    setIsRecurringEnabled(false);
    setRecurringDays([currentDayName || 'tuesday']);
    setRecurringWeeksCount(4);
    setOpenPlayModalOpen(true);
  };

  const handleOpenEditOpenPlay = (event: OpenPlayEvent) => {
    const targetCourts = availableAdminCourts;
    const eventDay = event.eventDate ? new Date(event.eventDate + 'T00:00:00').getDay() : 0;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const ownerHostPhone = event.hostPhone || myCompany?.phone || (myCompany as any)?.hostPhone || (user as any)?.phone || '';

    setEditingOpenPlay(event);
    setOpenPlayTitle(event.title);
    setOpenPlayCourtIds(
      event.courtIds && event.courtIds.length > 0 
        ? event.courtIds 
        : (targetCourts.length === 1 ? [targetCourts[0].id] : [])
    );
    setOpenPlayLocation(event.location || targetCourts[0]?.location || myCompany?.address || '');
    setOpenPlayDate(event.eventDate);
    setOpenPlayStartTime(event.startTime);
    setOpenPlayEndTime(event.endTime);
    setOpenPlayCategory(event.category);
    setOpenPlaySkillLevel(event.skillLevel || 'All Skill Levels');
    setOpenPlayHostPhone(ownerHostPhone);
    setOpenPlayRotationRule(event.rotationRule || 'winners_stay');
    setOpenPlayStatusSetting(event.status === 'draft' ? 'draft' : 'active');
    setOpenPlayDescription(event.description);
    setOpenPlayPosterUrl(event.posterImageUrl || null);
    setOpenPlayMaxParticipants(event.maxParticipants);
    setOpenPlayFee(event.registrationFee);
    
    // Match GCash Account selection by ID or fallback to matching Account Name (gcashName)
    let selectedAccId = event.gcashAccountId || 'global';
    if ((!event.gcashAccountId || event.gcashAccountId === 'global') && event.gcashName && personalAccounts.length > 0) {
      const nameMatch = personalAccounts.find(p => p.gcashName?.toLowerCase() === event.gcashName?.toLowerCase());
      if (nameMatch) {
        selectedAccId = nameMatch.id;
      }
    }
    setOpenPlayGcashAccountId(selectedAccId);
    
    setIsRecurringEnabled(event.isRecurring || false);
    setRecurringDays([dayNames[eventDay] || 'tuesday']);
    setRecurringWeeksCount(4);
    setOpenPlayModalOpen(true);
  };

  const handleSaveOpenPlayEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openPlayTitle.trim() || !openPlayDate) {
      alert("Please fill in event title and date.");
      return;
    }

    const targetCourts = availableAdminCourts;
    let finalCourtIds = openPlayCourtIds;
    if (finalCourtIds.length === 0 && targetCourts.length > 0) {
      finalCourtIds = targetCourts.map(c => c.id);
    }

    const selectedCourtObjects = courts.filter(c => finalCourtIds.includes(c.id));
    const selectedCourtNames = selectedCourtObjects.map(c => c.name);

    let selectedGcashName = globalGcashNameSetting || 'PicklePoint Venue';
    let selectedGcashNumber = globalGcashNumberSetting || '';
    let selectedGcashQr = globalGcashQrSetting || '';

    if (openPlayGcashAccountId && openPlayGcashAccountId !== 'global') {
      const foundPersonal = personalAccounts.find(p => p.id === openPlayGcashAccountId);
      if (foundPersonal) {
        selectedGcashName = foundPersonal.gcashName;
        selectedGcashNumber = foundPersonal.gcashNumber;
        selectedGcashQr = foundPersonal.gcashQrCode;
      }
    }

    const resolvedLocation = openPlayLocation.trim() || selectedCourtObjects[0]?.location || myCompany?.address || '';

    // CASE A: RECURRING BATCH GENERATION (Creation Mode)
    if (isRecurringEnabled && !editingOpenPlay) {
      const generatedDates = calculateRecurringDates(openPlayDate, recurringDays, recurringWeeksCount);
      const groupId = 'rg-' + Date.now();
      const formattedDaysLabel = recurringDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
      const recurrencePatternLabel = `Every ${formattedDaysLabel} (${recurringWeeksCount} Wks)`;

      const newEventsBatch: OpenPlayEvent[] = generatedDates.map((dateStr, idx) => ({
        id: `op-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: openPlayTitle.trim(),
        location: resolvedLocation,
        eventDate: dateStr,
        startTime: openPlayStartTime,
        endTime: openPlayEndTime,
        category: openPlayCategory,
        skillLevel: openPlaySkillLevel,
        hostPhone: openPlayHostPhone.trim() || undefined,
        description: openPlayDescription.trim(),
        posterImageUrl: openPlayPosterUrl || undefined,
        maxParticipants: Number(openPlayMaxParticipants) || 16,
        registrationFee: Number(openPlayFee) || 0,
        gcashAccountId: openPlayGcashAccountId,
        gcashName: selectedGcashName,
        gcashNumber: selectedGcashNumber,
        gcashQrCode: selectedGcashQr,
        companyId: myCompany?.id,
        companyName: myCompany?.name || (user as any)?.companyName,
        companyLogoUrl: myCompany?.logoUrl || (user as any)?.companyLogoUrl || (user as any)?.logoUrl,
        createdByUid: currentUserUid,
        createdByEmail: currentUserEmail,
        createdAt: new Date().toISOString(),
        status: isEventExpired(dateStr, openPlayEndTime) ? 'expired' : openPlayStatusSetting,
        rotationRule: openPlayRotationRule,
        courtIds: finalCourtIds,
        courtNames: selectedCourtNames,
        isRecurring: true,
        recurrencePattern: recurrencePatternLabel,
        recurrenceGroupId: groupId,
      }));

      setActionLoading('batch');
      try {
        if (isFirebaseConfigured && db) {
          for (const ev of newEventsBatch) {
            try {
              const cleanEv = Object.fromEntries(Object.entries(ev).filter(([_, v]) => v !== undefined));
              await setDoc(doc(db, 'openplay_events', ev.id), cleanEv);
            } catch (cloudErr) {
              console.warn('Firestore openplay batch event save failed:', cloudErr);
            }
          }
        }

        const localStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
        let localEvents = localStr ? JSON.parse(localStr) as OpenPlayEvent[] : [];
        localEvents.push(...newEventsBatch);
        try { localStorage.setItem('picklepoint_openplay_events', JSON.stringify(localEvents)); } catch (e) {}
        try { sessionStorage.setItem('picklepoint_openplay_events', JSON.stringify(localEvents)); } catch (e) {}

        setOpenPlayEvents(prev => [...prev, ...newEventsBatch]);
        setAdminOpenPlayFilter('all');
        setOpenPlayModalOpen(false);
      } catch (err) {
        console.error('Failed to save recurring events:', err);
        alert('Failed to save recurring events: ' + (err as Error).message);
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // CASE B: SINGLE EVENT SAVE (Create or Edit)
    const eventId = editingOpenPlay ? editingOpenPlay.id : 'op-' + Date.now();
    const isPast = isEventExpired(openPlayDate, openPlayEndTime);

    // Conflict Check: Alert admin if private court bookings exist during proposed Open Play hours
    const parseTimeHour = (tStr?: string): number => {
      if (!tStr) return 0;
      const trimmed = tStr.trim();
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

    const existingConflicts = bookings.filter(b => {
      if (b.status === 'cancelled' || b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) return false;
      if (b.date !== openPlayDate) return false;
      const isCourtMatch = finalCourtIds.length === 0 || finalCourtIds.includes(b.courtId);
      if (!isCourtMatch) return false;

      const startH = parseTimeHour(openPlayStartTime);
      const endH = parseTimeHour(openPlayEndTime);
      return b.slots?.some(s => {
        const slotStart = parseTimeHour(s.split(' - ')[0]);
        return slotStart >= startH && slotStart < endH;
      });
    });

    if (existingConflicts.length > 0) {
      const conflictMsg = `Notice: ${existingConflicts.length} existing private court reservation(s) overlap with this Open Play schedule on ${openPlayDate} (${openPlayStartTime} - ${openPlayEndTime}).\n\nThose overlapping hours will be reserved for Open Play. Do you wish to proceed?`;
      if (!confirm(conflictMsg)) {
        return;
      }
    }

    const payload: OpenPlayEvent = {
      id: eventId,
      title: openPlayTitle.trim(),
      location: resolvedLocation,
      eventDate: openPlayDate,
      startTime: openPlayStartTime,
      endTime: openPlayEndTime,
      category: openPlayCategory,
      skillLevel: openPlaySkillLevel,
      hostPhone: openPlayHostPhone.trim() || undefined,
      rotationRule: openPlayRotationRule,
      description: openPlayDescription.trim(),
      posterImageUrl: openPlayPosterUrl || undefined,
      maxParticipants: Number(openPlayMaxParticipants) || 16,
      registrationFee: Number(openPlayFee) || 0,
      gcashAccountId: openPlayGcashAccountId,
      gcashName: selectedGcashName,
      gcashNumber: selectedGcashNumber,
      gcashQrCode: selectedGcashQr,
      companyId: myCompany?.id,
      companyName: myCompany?.name || (user as any)?.companyName,
      companyLogoUrl: myCompany?.logoUrl || (user as any)?.companyLogoUrl || (user as any)?.logoUrl,
      createdByUid: currentUserUid,
      createdByEmail: currentUserEmail,
      createdAt: editingOpenPlay ? editingOpenPlay.createdAt : new Date().toISOString(),
      status: isPast ? 'expired' : openPlayStatusSetting,
      courtIds: finalCourtIds,
      courtNames: selectedCourtNames,
      isRecurring: editingOpenPlay?.isRecurring || isRecurringEnabled,
      recurrencePattern: editingOpenPlay?.recurrencePattern,
      recurrenceGroupId: editingOpenPlay?.recurrenceGroupId
    };

    setActionLoading(eventId);
    console.log('💾 [OpenPlay Event Save] Saving OP ID:', eventId, payload);
    try {
      if (isFirebaseConfigured && db) {
        try {
          const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
          await setDoc(doc(db, 'openplay_events', eventId), cleanPayload, { merge: true });
          console.log('☁️ [Firestore OpenPlay Save Success] Saved OP ID to cloud:', eventId);
        } catch (cloudErr) {
          console.warn('Firestore openplay event save failed, persisting locally:', cloudErr);
        }
      }

      const localStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
      let localEvents = localStr ? JSON.parse(localStr) as OpenPlayEvent[] : [];
      if (editingOpenPlay) {
        localEvents = localEvents.map(e => e.id === eventId ? payload : e);
      } else {
        localEvents.push(payload);
      }
      try { localStorage.setItem('picklepoint_openplay_events', JSON.stringify(localEvents)); } catch (e) {}
      try { sessionStorage.setItem('picklepoint_openplay_events', JSON.stringify(localEvents)); } catch (e) {}

      if (editingOpenPlay) {
        setOpenPlayEvents(prev => prev.map(e => e.id === eventId ? payload : e));
      } else {
        setOpenPlayEvents(prev => [...prev, payload]);
      }
      setAdminOpenPlayFilter('all');
      setOpenPlayModalOpen(false);
      setEditingOpenPlay(null);
    } catch (err) {
      console.error('Failed to save open play event:', err);
      alert('Failed to save event: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyShareableLink = (eventId: string) => {
    const shareableUrl = `${window.location.origin}/?openplay=${eventId}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedShareLink(eventId);
    setTimeout(() => setCopiedShareLink(null), 4000);
  };

  const handleToggleEventStatus = async (event: OpenPlayEvent) => {
    const isPast = isEventExpired(event.eventDate, event.endTime) || event.status === 'expired' || event.status === 'completed';
    const newStatus = event.status === 'draft' ? (isPast ? 'expired' : 'active') : 'draft';
    const updatedPayload: OpenPlayEvent = {
      ...event,
      status: newStatus,
    };

    setActionLoading(event.id);
    try {
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'openplay_events', event.id), updatedPayload, { merge: true });
      }
      const localStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
      if (localStr) {
        const localEvs = JSON.parse(localStr).map((e: any) => e.id === event.id ? updatedPayload : e);
        try { localStorage.setItem('picklepoint_openplay_events', JSON.stringify(localEvs)); } catch (e) {}
        try { sessionStorage.setItem('picklepoint_openplay_events', JSON.stringify(localEvs)); } catch (e) {}
      }
      setOpenPlayEvents(prev => prev.map(e => e.id === event.id ? updatedPayload : e));
    } catch (err) {
      console.error('Failed to update event status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateOpenPlayEvent = (event: OpenPlayEvent) => {
    setEditingOpenPlay(null);
    setOpenPlayTitle(`${event.title} (Copy)`);
    setOpenPlayCategory(event.category);
    setOpenPlaySkillLevel(event.skillLevel || 'All Skill Levels');
    setOpenPlayHostPhone(event.hostPhone || myCompany?.phone || (user as any)?.phone || '');
    setOpenPlayRotationRule(event.rotationRule || 'winners_stay');
    setOpenPlayDescription(event.description || '');
    setOpenPlayPosterUrl(event.posterImageUrl || null);
    setOpenPlayMaxParticipants(event.maxParticipants || 16);
    setOpenPlayFee(event.registrationFee || 0);
    setOpenPlayGcashAccountId(event.gcashAccountId || 'global');
    setOpenPlayCourtIds(event.courtIds || []);
    setOpenPlayLocation(event.location || '');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setOpenPlayDate(`${yyyy}-${mm}-${dd}`);
    setOpenPlayStartTime(event.startTime || '18:00');
    setOpenPlayEndTime(event.endTime || '21:00');
    setIsRecurringEnabled(false);
    setOpenPlayModalOpen(true);
  };

  const handleExportOpenPlayRoster = (event: OpenPlayEvent) => {
    const eventRegs = openPlayRegistrations.filter(r => r.eventId === event.id);
    if (eventRegs.length === 0) {
      alert(`No registrations recorded for "${event.title}".`);
      return;
    }
    
    const headers = ['Attendee Name', 'Participant Role', 'Host Player', 'Email', 'Phone', 'GCash Reference', 'Payment Status', 'Registration Status', 'Date Registered'];
    
    const rows: (string | number)[][] = [];
    
    eventRegs.forEach(r => {
      const primaryName = r.playerName || r.userName || 'Player';
      const primaryEmail = r.playerEmail || r.userEmail || '';
      const primaryPhone = r.playerPhone || r.userPhone || '';
      const gcashRef = r.gcashReferenceNumber || '';
      const paymentStatus = r.paymentStatus || 'pending';
      const status = r.status || 'pending';
      const dateReg = r.createdAt || '';

      // Primary Player row
      rows.push([
        `"${primaryName.replace(/"/g, '""')}"`,
        '"Primary Player"',
        '"-"',
        `"${primaryEmail.replace(/"/g, '""')}"`,
        `"${primaryPhone.replace(/"/g, '""')}"`,
        `"${gcashRef.replace(/"/g, '""')}"`,
        paymentStatus,
        status,
        `"${dateReg.replace(/"/g, '""')}"`
      ]);

      // Guest rows
      const spots = r.playerCount || 1;
      const guestCount = Math.max((r.guests?.length || 0), (r.guestNames?.length || 0), (spots > 1 ? spots - 1 : 0));
      
      for (let i = 0; i < guestCount; i++) {
        const guestName = r.guests?.[i]?.name || r.guestNames?.[i] || `Guest #${i + 1} (${primaryName})`;
        const guestEmail = r.guests?.[i]?.email || r.guestEmails?.[i] || `Shared (${primaryEmail})`;
        
        rows.push([
          `"${guestName.replace(/"/g, '""')}"`,
          '"Guest"',
          `"${primaryName.replace(/"/g, '""')}"`,
          `"${guestEmail.replace(/"/g, '""')}"`,
          `"${primaryPhone.replace(/"/g, '""')}"`,
          `"${gcashRef.replace(/"/g, '""')}"`,
          paymentStatus,
          status,
          `"${dateReg.replace(/"/g, '""')}"`
        ]);
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `openplay_roster_${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${event.eventDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Court Modal States
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [courtModalOpen, setCourtModalOpen] = useState(false);
  const [courtGcashAccountId, setCourtGcashAccountId] = useState('');
  const [courtName, setCourtName] = useState('');
  const [courtType, setCourtType] = useState('Premium Indoor Plexicushion');
  const [courtDayPrice, setCourtDayPrice] = useState(100);
  const [courtNightPrice, setCourtNightPrice] = useState(150);
  const [courtMapUrl, setCourtMapUrl] = useState('');
  const [courtLatitude, setCourtLatitude] = useState<number | null>(null);
  const [courtLongitude, setCourtLongitude] = useState<number | null>(null);
  const [courtImages, setCourtImages] = useState<string[]>([]);
  const [courtAddressLine1, setCourtAddressLine1] = useState('');
  const [courtAddressLine2, setCourtAddressLine2] = useState('');
  const [courtCountry, setCourtCountry] = useState('Philippines');
  const [courtPostalCode, setCourtPostalCode] = useState('');
  const [courtRentals, setCourtRentals] = useState<RentalItem[]>([]);
  const [courtPublished, setCourtPublished] = useState(false);
  const [courtsViewMode, setCourtsViewMode] = useState<'list' | 'grid'>('list');
  // Court Modal Popover Dropdown Toggle States
  const [isCourtTypeOpen, setIsCourtTypeOpen] = useState(false);
  const [isCourtGcashOpen, setIsCourtGcashOpen] = useState(false);
  const [isCourtRegionOpen, setIsCourtRegionOpen] = useState(false);
  const [isCourtProvinceOpen, setIsCourtProvinceOpen] = useState(false);
  const [isCourtCityOpen, setIsCourtCityOpen] = useState(false);
  const [isCourtBarangayOpen, setIsCourtBarangayOpen] = useState(false);
  // Open Play Modal Popover Dropdown Toggle States
  const [isOpenPlayCategoryOpen, setIsOpenPlayCategoryOpen] = useState(false);
  const [isOpenPlaySkillOpen, setIsOpenPlaySkillOpen] = useState(false);
  const [isOpenPlayGcashOpen, setIsOpenPlayGcashOpen] = useState(false);
  const [posterDragActive, setPosterDragActive] = useState(false);
  // Bookings View States
  const [bookingsViewMode, setBookingsViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedCalendarCourtId, setSelectedCalendarCourtId] = useState<string>('all');
  const [calendarSlotFilter, setCalendarSlotFilter] = useState<'all' | 'blocked' | 'available'>('all');

  // Venue Policies States
  const [selectedPolicyCourtId, setSelectedPolicyCourtId] = useState<string>('');
  const [policyCancellation, setPolicyCancellation] = useState<string>('');
  const [policyRules, setPolicyRules] = useState<string>('');
  const [policyWeather, setPolicyWeather] = useState<string>('');
  const [policyEquipment, setPolicyEquipment] = useState<string>('');
  const [showPoliciesSuccessModal, setShowPoliciesSuccessModal] = useState(false);

  // Voucher Creation & Management States
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [voucherDiscountType, setVoucherDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [voucherDiscountValue, setVoucherDiscountValue] = useState<number>(50);
  const [voucherCourtId, setVoucherCourtId] = useState<string>('all');
  const [voucherRecipientEmail, setVoucherRecipientEmail] = useState<string>('');
  const [voucherRecipientName, setVoucherRecipientName] = useState<string>('');
  const [voucherMaxUses, setVoucherMaxUses] = useState<number>(1);
  const [voucherExpiryDays, setVoucherExpiryDays] = useState<number>(30);

  // Policy Cancellation Modal States
  const [cancelBookingModalOpen, setCancelBookingModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationVoucherPercent, setCancellationVoucherPercent] = useState<number>(50);
  const [hoursUntilMatch, setHoursUntilMatch] = useState<number>(48);

  // Rainout Weather Stoppage Modal States
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [weatherBooking, setWeatherBooking] = useState<Booking | null>(null);
  const [stoppageDuration, setStoppageDuration] = useState<'under_30' | 'over_30'>('under_30');

  // Sync selected court policies when selectedPolicyCourtId changes
  useEffect(() => {
    const availableCourts = isSuperAdmin ? courts : availableAdminCourts;
    if (availableCourts.length > 0 && (!selectedPolicyCourtId || !availableCourts.some(c => c.id === selectedPolicyCourtId))) {
      setSelectedPolicyCourtId(availableCourts[0].id);
      return;
    }

    const currentCourt = courts.find((c) => c.id === selectedPolicyCourtId);
    if (currentCourt) {
      setPolicyCancellation(currentCourt.policies?.cancellationPolicy || '');
      setPolicyRules(currentCourt.policies?.rulesPolicy || '');
      setPolicyWeather(currentCourt.policies?.weatherPolicy || '');
      setPolicyEquipment(currentCourt.policies?.equipmentPolicy || '');
    }
  }, [selectedPolicyCourtId, courts, isSuperAdmin, currentUserUid]);

  const handleSavePolicies = async () => {
    if (!selectedPolicyCourtId) {
      alert('Please select a court to save policies for.');
      return;
    }

    const updatedPolicies: CourtPolicies = {
      cancellationPolicy: policyCancellation.trim(),
      rulesPolicy: policyRules.trim(),
      weatherPolicy: policyWeather.trim(),
      equipmentPolicy: policyEquipment.trim(),
    };

    setActionLoading(selectedPolicyCourtId);
    try {
      if (isFirebaseConfigured && db) {
        const courtRef = doc(db, 'courts', selectedPolicyCourtId);
        await updateDoc(courtRef, { policies: updatedPolicies });
      }

      const courtsStr = localStorage.getItem('picklepoint_courts');
      if (courtsStr) {
        const localCourts = JSON.parse(courtsStr) as Court[];
        const updated = localCourts.map((c: Court) => {
          if (c.id === selectedPolicyCourtId) {
            return { ...c, policies: updatedPolicies };
          }
          return c;
        });
        localStorage.setItem('picklepoint_courts', JSON.stringify(updated));
      }

      setCourts((prev) =>
        prev.map((c) => (c.id === selectedPolicyCourtId ? { ...c, policies: updatedPolicies } : c))
      );

      setShowPoliciesSuccessModal(true);
    } catch (err) {
      console.error('Failed to save policies:', err);
      alert('Failed to save policies: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // Voucher Handlers
  const handleOpenCreateVoucher = () => {
    const randomCode = 'PROMO-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    setVoucherCodeInput(randomCode);
    setVoucherDiscountType('percentage');
    setVoucherDiscountValue(50);
    setVoucherCourtId('all');
    setVoucherRecipientEmail('');
    setVoucherRecipientName('');
    setVoucherMaxUses(1);
    setVoucherExpiryDays(30);
    setVoucherModalOpen(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) {
      alert('Voucher Code is required.');
      return;
    }

    const vId = 'vouch-' + Date.now();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(voucherExpiryDays || 30));

    const targetCourt = voucherCourtId !== 'all' ? courts.find(c => c.id === voucherCourtId) : courts[0];
    const resolvedCompanyId = targetCourt?.companyId || '';
    const resolvedCompanyName = targetCourt?.ownerCompanyName || orgProfileName || 'PicklePoint Venue';

    const payload: Voucher = {
      id: vId,
      code: voucherCodeInput.trim().toUpperCase(),
      type: 'promo',
      discountType: voucherDiscountType,
      discountValue: Number(voucherDiscountValue) || 0,
      companyId: resolvedCompanyId || undefined,
      companyName: resolvedCompanyName,
      courtId: voucherCourtId === 'all' ? undefined : voucherCourtId,
      ownerId: targetCourt?.ownerId || currentUserUid,
      issuedToEmail: voucherRecipientEmail.trim() ? voucherRecipientEmail.trim().toLowerCase() : undefined,
      issuedToName: voucherRecipientName.trim() || undefined,
      maxUses: Number(voucherMaxUses) || 1,
      usedCount: 0,
      expiryDate: expiryDate.toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setActionLoading(vId);
    try {
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'vouchers', vId), JSON.parse(JSON.stringify(payload)));
      }
      const vStr = localStorage.getItem('picklepoint_vouchers');
      const localVouchers = vStr ? JSON.parse(vStr) as Voucher[] : [];
      localVouchers.push(payload);
      localStorage.setItem('picklepoint_vouchers', JSON.stringify(localVouchers));

      setVouchers(prev => [payload, ...prev]);
      setVoucherModalOpen(false);

      if (payload.issuedToEmail) {
        sendVoucherIssuedEmail({
          userEmail: payload.issuedToEmail,
          userName: payload.issuedToName || 'Valued Player',
          voucherCode: payload.code,
          discountText: payload.discountType === 'percentage' ? `${payload.discountValue}% Off` : `₱${payload.discountValue} Off`,
          reasonText: 'You have been issued an exclusive promotional credit voucher!',
          expiryDate: payload.expiryDate,
          companyName: payload.companyName,
        }).catch(err => console.warn('Voucher email failed:', err));
      }

      alert(`Voucher ${payload.code} created successfully!`);
    } catch (err) {
      console.error('Failed to create voucher:', err);
      alert('Failed to create voucher: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeVoucher = async (vId: string) => {
    if (!confirm('Are you sure you want to revoke this voucher? It can no longer be redeemed.')) return;
    setActionLoading(vId);
    try {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'vouchers', vId), { status: 'expired' });
      }
      const vStr = localStorage.getItem('picklepoint_vouchers');
      if (vStr) {
        const localVouchers = JSON.parse(vStr) as Voucher[];
        const updated = localVouchers.map(v => v.id === vId ? { ...v, status: 'expired' as const } : v);
        localStorage.setItem('picklepoint_vouchers', JSON.stringify(updated));
      }
      setVouchers(prev => prev.map(v => v.id === vId ? { ...v, status: 'expired' } : v));
    } catch (err) {
      console.error('Failed to revoke voucher:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Cancellation & Rainout Handlers
  const handlePromptCancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    let hrs = 48;
    try {
      const firstSlot = booking.slots?.[0] || '08:00 AM';
      const slotHour = SLOTS.find(s => s.time === firstSlot)?.startHour || 8;
      const matchDateStr = booking.date;
      const matchStart = new Date(`${matchDateStr}T${String(slotHour).padStart(2, '0')}:00:00`);
      const now = new Date();
      hrs = (matchStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    } catch {}

    setHoursUntilMatch(hrs);
    if (hrs >= 24) {
      setCancellationVoucherPercent(100);
    } else if (hrs >= 12) {
      setCancellationVoucherPercent(50);
    } else {
      setCancellationVoucherPercent(0);
    }
    setCancelBookingModalOpen(true);
  };

  const handleConfirmCancelWithVoucher = async () => {
    if (!bookingToCancel) return;
    const isVoucherEligible = cancellationVoucherPercent > 0;
    const vCode = `CREDIT-${cancellationVoucherPercent}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const vId = 'vouch-' + Date.now();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const targetCourt = courts.find(c => c.id === bookingToCancel.courtId);
    const resolvedCompanyId = bookingToCancel.companyId || targetCourt?.companyId || '';
    const resolvedCompanyName = bookingToCancel.ownerCompanyName || targetCourt?.ownerCompanyName || bookingToCancel.courtName || 'PicklePoint Venue';

    const voucherPayload: Voucher = {
      id: vId,
      code: vCode,
      type: 'cancellation_credit',
      discountType: 'percentage',
      discountValue: cancellationVoucherPercent,
      companyId: resolvedCompanyId || undefined,
      companyName: resolvedCompanyName,
      courtId: bookingToCancel.courtId,
      ownerId: targetCourt?.ownerId || bookingToCancel.courtOwnerId || currentUserUid,
      issuedToEmail: bookingToCancel.user.email?.toLowerCase(),
      issuedToName: bookingToCancel.user.name,
      sourceBookingId: bookingToCancel.id,
      maxUses: 1,
      usedCount: 0,
      expiryDate: expiryDate.toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setActionLoading(bookingToCancel.id);
    try {
      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'bookings', bookingToCancel.id), { status: 'cancelled' });
          if (isVoucherEligible) {
            await setDoc(doc(db, 'vouchers', vId), JSON.parse(JSON.stringify(voucherPayload)));
          }
        } catch (cloudErr) {
          console.warn('Firestore cancel/voucher write failed (check security rules), storing locally:', cloudErr);
        }
      }

      const bStr = localStorage.getItem('picklepoint_bookings');
      if (bStr) {
        const localB = JSON.parse(bStr) as Booking[];
        const updated = localB.map(b => b.id === bookingToCancel.id ? { ...b, status: 'cancelled' as const } : b);
        localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
      }

      if (isVoucherEligible) {
        const vStr = localStorage.getItem('picklepoint_vouchers');
        const localV = vStr ? JSON.parse(vStr) as Voucher[] : [];
        localV.push(voucherPayload);
        localStorage.setItem('picklepoint_vouchers', JSON.stringify(localV));
        setVouchers(prev => [voucherPayload, ...prev]);

        sendVoucherIssuedEmail({
          userEmail: bookingToCancel.user.email,
          userName: bookingToCancel.user.name,
          voucherCode: vCode,
          discountText: `${cancellationVoucherPercent}% Credit Voucher`,
          reasonText: `Your reservation at ${bookingToCancel.courtName} on ${bookingToCancel.date} was cancelled.`,
          expiryDate: voucherPayload.expiryDate,
          companyName: voucherPayload.companyName,
        }).catch(err => console.warn('Voucher email error:', err));
      }

      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, status: 'cancelled' } : b));
      setCancelBookingModalOpen(false);
      setBookingToCancel(null);
      alert(isVoucherEligible ? `Booking cancelled and ${cancellationVoucherPercent}% Credit Voucher (${vCode}) issued to ${bookingToCancel.user.email}!` : `Booking cancelled.`);
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenWeatherStoppage = (booking: Booking) => {
    setWeatherBooking(booking);
    setStoppageDuration('under_30');
    setWeatherModalOpen(true);
  };

  const handleConfirmWeatherStoppage = async () => {
    if (!weatherBooking) return;
    const voucherPercent = stoppageDuration === 'under_30' ? 100 : 50;
    const vCode = `RAINOUT-${voucherPercent}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const vId = 'vouch-' + Date.now();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const targetCourt = courts.find(c => c.id === weatherBooking.courtId);
    const resolvedCompanyId = weatherBooking.companyId || targetCourt?.companyId || '';
    const resolvedCompanyName = weatherBooking.ownerCompanyName || targetCourt?.ownerCompanyName || weatherBooking.courtName || 'PicklePoint Venue';

    const voucherPayload: Voucher = {
      id: vId,
      code: vCode,
      type: 'rainout_voucher',
      discountType: 'percentage',
      discountValue: voucherPercent,
      companyId: resolvedCompanyId || undefined,
      companyName: resolvedCompanyName,
      courtId: weatherBooking.courtId,
      ownerId: targetCourt?.ownerId || weatherBooking.courtOwnerId || currentUserUid,
      issuedToEmail: weatherBooking.user.email?.toLowerCase(),
      issuedToName: weatherBooking.user.name,
      sourceBookingId: weatherBooking.id,
      maxUses: 1,
      usedCount: 0,
      expiryDate: expiryDate.toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setActionLoading(weatherBooking.id);
    try {
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'vouchers', vId), JSON.parse(JSON.stringify(voucherPayload)));
          await updateDoc(doc(db, 'bookings', weatherBooking.id), { status: 'cancelled' });
        } catch (cloudErr) {
          console.warn('Firestore weather stoppage write failed (check security rules), storing locally:', cloudErr);
        }
      }

      const vStr = localStorage.getItem('picklepoint_vouchers');
      const localV = vStr ? JSON.parse(vStr) as Voucher[] : [];
      localV.push(voucherPayload);
      localStorage.setItem('picklepoint_vouchers', JSON.stringify(localV));

      const bStr = localStorage.getItem('picklepoint_bookings');
      if (bStr) {
        const localB = JSON.parse(bStr) as Booking[];
        const updated = localB.map(b => b.id === weatherBooking.id ? { ...b, status: 'cancelled' as const } : b);
        localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
      }

      setVouchers(prev => [voucherPayload, ...prev]);
      setBookings(prev => prev.map(b => b.id === weatherBooking.id ? { ...b, status: 'cancelled' } : b));

      sendVoucherIssuedEmail({
        userEmail: weatherBooking.user.email,
        userName: weatherBooking.user.name,
        voucherCode: vCode,
        discountText: `${voucherPercent}% Off Court Rebooking`,
        reasonText: `We are sorry your match at ${weatherBooking.courtName} was interrupted by weather (${stoppageDuration === 'under_30' ? 'less than 30 mins played' : 'over 30 mins played'}).`,
        expiryDate: voucherPayload.expiryDate,
        companyName: voucherPayload.companyName,
      }).catch(err => console.warn('Voucher email failed:', err));

      setWeatherModalOpen(false);
      setWeatherBooking(null);
      alert(`Rainout ${voucherPercent}% Rebooking Voucher issued! Code: ${vCode}`);
    } catch (err) {
      console.error('Failed to issue rainout voucher:', err);
      alert('Failed to issue rainout voucher: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // Rental Modal States
  const [rentalModalOpen, setRentalModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<RentalItem | null>(null);
  const [rentalName, setRentalName] = useState('');
  const [rentalDescription, setRentalDescription] = useState('');
  const [rentalPrice, setRentalPrice] = useState(80);
  const [rentalPricingType, setRentalPricingType] = useState<'per_booking' | 'per_hour' | 'per_session'>('per_booking');
  const [rentalQuantity, setRentalQuantity] = useState(20);
  const [rentalEnabled, setRentalEnabled] = useState(true);
  const [rentalImages, setRentalImages] = useState<string[]>([]);
  const [rentalDragActive, setRentalDragActive] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // PSGC API states
  const [regions, setRegions] = useState<{ code: string; name: string }[]>(REGIONS_FALLBACK);
  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ code: string; name: string }[]>([]);
  const [barangays, setBarangays] = useState<{ code: string; name: string }[]>([]);

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');

  const [regionName, setRegionName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [cityName, setCityName] = useState('');
  const [barangayName, setBarangayName] = useState('');

  const [courtFormError, setCourtFormError] = useState('');

  const courtConstructedFallbackAddress = useMemo(() => {
    return [
      courtName,
      courtAddressLine1,
      courtAddressLine2,
      barangayName ? `Brgy. ${barangayName}` : '',
      cityName,
      provinceName,
      courtPostalCode,
      courtCountry
    ].filter(Boolean).join(', ');
  }, [courtName, courtAddressLine1, courtAddressLine2, barangayName, cityName, provinceName, courtPostalCode, courtCountry]);

  const parsedCourtMap = useMemo(() => {
    return parseGoogleMapsUrl(courtMapUrl, courtConstructedFallbackAddress);
  }, [courtMapUrl, courtConstructedFallbackAddress]);

  const myCompany = currentCompany;
  const effectiveOrgName = myCompany?.name || userObj?.companyName || 'PickleZone1';

  const effectiveOrgShortLocation = useMemo(() => {
    const city = myCompany?.municipality || (myCompany as any)?.city || orgCityName;
    const province = myCompany?.province || orgProvinceName;
    const country = myCompany?.country || orgCountry || 'Philippines';

    const parts = [city, province, country].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');

    return 'Libmanan, Camarines Sur, Philippines';
  }, [myCompany, orgCityName, orgProvinceName, orgCountry]);

  const effectiveOrgAddress = myCompany?.address ||
    [
      (myCompany as any)?.addressLine1,
      (myCompany as any)?.barangay,
      (myCompany as any)?.city,
      (myCompany as any)?.province,
      (myCompany as any)?.region,
      (myCompany as any)?.postalCode,
      'Philippines'
    ].filter(Boolean).join(', ') ||
    '#158 Herrera St, Zone 1, Brgy. Puro-Batia, Libmanan, Camarines Sur, Region V (Bicol Region), 4407, Philippines';

  const [adminDisplayName, setAdminDisplayName] = useState(user?.name || '');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminProfileSaveSuccess, setAdminProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setAdminDisplayName(user.name);
    }
  }, [user]);

  const handleSaveAdminPersonalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserUid || currentUserUid === 'unknown') return;

    try {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'users', currentUserUid), {
          name: adminDisplayName.trim(),
          phone: adminPhone.trim(),
        });
      }
      const savedSession = localStorage.getItem('picklepoint_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.name = adminDisplayName.trim();
        parsed.phone = adminPhone.trim();
        localStorage.setItem('picklepoint_session', JSON.stringify(parsed));
      }
      setAdminProfileSaveSuccess(true);
      setTimeout(() => setAdminProfileSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update admin personal profile:', err);
      const savedSession = localStorage.getItem('picklepoint_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.name = adminDisplayName.trim();
        parsed.phone = adminPhone.trim();
        localStorage.setItem('picklepoint_session', JSON.stringify(parsed));
      }
      setAdminProfileSaveSuccess(true);
      setTimeout(() => setAdminProfileSaveSuccess(false), 4000);
    }
  };

  useEffect(() => {
    if (myCompany) {
      setOrgProfileName(myCompany.name || '');
      setOrgProfilePhone(myCompany.phone || '');
      setOrgAddressLine1(myCompany.addressLine1 || myCompany.address || '');
      setOrgAddressLine2(myCompany.addressLine2 || '');
      setOrgRegionName(myCompany.region || '');
      setOrgProvinceName(myCompany.province || '');
      setOrgCityName(myCompany.municipality || '');
      setOrgBarangayName(myCompany.barangay || '');
      setOrgPostalCode(myCompany.postalCode || '');
      setOrgCountry(myCompany.country || 'Philippines');
      setOrgProfileWebsite(myCompany.websiteUrl || '');
      setOrgProfileFacebook(myCompany.facebookUrl || '');
      setOrgProfileInstagram(myCompany.instagramUrl || '');
      setOrgProfileLogoUrl(myCompany.logoUrl || null);
      setOrgSubdomain(myCompany.subdomain || myCompany.id || '');
      setBookingLeadTimeMinutes(myCompany.bookingLeadTimeMinutes ?? 30);
      if (myCompany.operatingHours) {
        setOrgOperatingHours({
          ...DEFAULT_OPERATING_HOURS,
          ...myCompany.operatingHours,
        });
      } else {
        setOrgOperatingHours(DEFAULT_OPERATING_HOURS);
      }

      // Pre-select PSGC region and cascade provinces/cities if company has region data
      const activeRegions = regions.length > 0 ? regions : REGIONS_FALLBACK;
      if (myCompany.region) {
        const matchReg = activeRegions.find(
          (r) => r.name.toLowerCase() === myCompany.region?.toLowerCase() || r.code === myCompany.region
        );
        if (matchReg) {
          setOrgSelectedRegion(matchReg.code);
          fetch(`https://psgc.cloud/api/regions/${matchReg.code}/provinces`)
            .then((res) => res.json())
            .then((provs) => {
              const hasProvinces = Array.isArray(provs) && provs.length > 0;
              setOrgProvinces(hasProvinces ? provs : []);

              if (!hasProvinces) {
                return fetch(`https://psgc.cloud/api/regions/${matchReg.code}/cities-municipalities`)
                  .then((r) => r.json())
                  .then((cts) => {
                    if (Array.isArray(cts)) {
                      setOrgCities(cts);
                      if (myCompany.municipality) {
                        const matchCity = cts.find(
                          (c: any) =>
                            c.name.toLowerCase() === myCompany.municipality?.toLowerCase() ||
                            c.code === myCompany.municipality
                        );
                        if (matchCity) {
                          setOrgSelectedCity(matchCity.code);
                          fetch(`https://psgc.cloud/api/cities-municipalities/${matchCity.code}/barangays`)
                            .then((r) => r.json())
                            .then((brgys) => {
                              if (Array.isArray(brgys)) {
                                setOrgBarangays(brgys);
                                if (myCompany.barangay) {
                                  const matchB = brgys.find(
                                    (b: any) =>
                                      b.name.toLowerCase() === myCompany.barangay?.toLowerCase() ||
                                      b.code === myCompany.barangay
                                  );
                                  if (matchB) setOrgSelectedBarangay(matchB.code);
                                }
                              }
                            })
                            .catch(() => {});
                        }
                      }
                    }
                  });
              } else if (myCompany.province) {
                const matchProv = provs.find(
                  (p: any) =>
                    p.name.toLowerCase() === myCompany.province?.toLowerCase() ||
                    p.code === myCompany.province
                );
                if (matchProv) {
                  setOrgSelectedProvince(matchProv.code);
                  return fetch(`https://psgc.cloud/api/provinces/${matchProv.code}/cities-municipalities`)
                    .then((r) => r.json())
                    .then((cts) => {
                      if (Array.isArray(cts)) {
                        setOrgCities(cts);
                        if (myCompany.municipality) {
                          const matchCity = cts.find(
                            (c: any) =>
                              c.name.toLowerCase() === myCompany.municipality?.toLowerCase() ||
                              c.code === myCompany.municipality
                          );
                          if (matchCity) {
                            setOrgSelectedCity(matchCity.code);
                            fetch(`https://psgc.cloud/api/cities-municipalities/${matchCity.code}/barangays`)
                              .then((r) => r.json())
                              .then((brgys) => {
                                if (Array.isArray(brgys)) {
                                  setOrgBarangays(brgys);
                                  if (myCompany.barangay) {
                                    const matchB = brgys.find(
                                      (b: any) =>
                                        b.name.toLowerCase() === myCompany.barangay?.toLowerCase() ||
                                        b.code === myCompany.barangay
                                    );
                                    if (matchB) setOrgSelectedBarangay(matchB.code);
                                  }
                                }
                              })
                              .catch(() => {});
                          }
                        }
                      }
                    });
                }
              }
            })
            .catch((e) => console.warn('Could not auto-cascade company address PSGC:', e));
        }
      }
    }
  }, [myCompany, regions]);

  const handleSaveLeadTimeSettings = async () => {
    setLeadTimeSaveLoading(true);
    try {
      const companyDocId = myCompany?.id || (currentUserUid !== 'unknown' ? currentUserUid : 'company-' + currentUserEmail.replace(/[^a-zA-Z0-9]/g, '_'));

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'companies', companyDocId), { bookingLeadTimeMinutes }, { merge: true });
        await setDoc(doc(db, 'settings', 'booking_rules', 'users', currentUserUid), { bookingLeadTimeMinutes }, { merge: true });
      }

      const compStr = localStorage.getItem('picklepoint_companies');
      if (compStr) {
        const localComps = JSON.parse(compStr) as Company[];
        const updated = localComps.map(c => c.id === companyDocId || (c.clientAdminEmail && currentUserEmail && c.clientAdminEmail.toLowerCase() === currentUserEmail.toLowerCase()) ? { ...c, bookingLeadTimeMinutes } : c);
        localStorage.setItem('picklepoint_companies', JSON.stringify(updated));
        setCompanies(updated);
      }
      localStorage.setItem(`picklepoint_booking_lead_time_${currentUserUid}`, String(bookingLeadTimeMinutes));

      setLeadTimeSaveSuccess(true);
      setTimeout(() => setLeadTimeSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save lead time settings:', err);
      alert('Failed to save lead time settings: ' + (err as Error).message);
    } finally {
      setLeadTimeSaveLoading(false);
    }
  };

  const handleOrgRegionChange = async (code: string) => {
    setOrgSelectedRegion(code);
    const activeRegions = regions.length > 0 ? regions : REGIONS_FALLBACK;
    const regionObj = activeRegions.find((r) => r.code === code);
    setOrgRegionName(regionObj ? regionObj.name : '');
    
    setOrgSelectedProvince('');
    setOrgProvinceName('');
    setOrgSelectedCity('');
    setOrgCityName('');
    setOrgSelectedBarangay('');
    setOrgBarangayName('');
    
    setOrgProvinces([]);
    setOrgCities([]);
    setOrgBarangays([]);
    
    if (code) {
      try {
        const resProv = await fetch(`https://psgc.cloud/api/regions/${code}/provinces`);
        const provs = await resProv.json();
        const hasProvinces = Array.isArray(provs) && provs.length > 0;
        setOrgProvinces(hasProvinces ? provs : []);
        
        if (!hasProvinces) {
          const resCities = await fetch(`https://psgc.cloud/api/regions/${code}/cities-municipalities`);
          const cts = await resCities.json();
          setOrgCities(Array.isArray(cts) ? cts : []);
        }
      } catch (err) {
        console.error('Error fetching org provinces:', err);
      }
    }
  };

  const handleOrgProvinceChange = async (code: string) => {
    setOrgSelectedProvince(code);
    const provObj = orgProvinces.find(p => p.code === code);
    setOrgProvinceName(provObj ? provObj.name : '');
    
    setOrgSelectedCity('');
    setOrgCityName('');
    setOrgSelectedBarangay('');
    setOrgBarangayName('');
    
    setOrgCities([]);
    setOrgBarangays([]);
    
    if (code) {
      try {
        const resCities = await fetch(`https://psgc.cloud/api/provinces/${code}/cities-municipalities`);
        const cts = await resCities.json();
        setOrgCities(Array.isArray(cts) ? cts : []);
      } catch (err) {
        console.error('Error fetching org cities:', err);
      }
    }
  };

  const handleOrgCityChange = async (code: string) => {
    setOrgSelectedCity(code);
    const cityObj = orgCities.find(c => c.code === code);
    setOrgCityName(cityObj ? cityObj.name : '');
    
    setOrgSelectedBarangay('');
    setOrgBarangayName('');
    
    setOrgBarangays([]);
    
    if (code) {
      try {
        const resBarangays = await fetch(`https://psgc.cloud/api/cities-municipalities/${code}/barangays`);
        const brgys = await resBarangays.json();
        setOrgBarangays(Array.isArray(brgys) ? brgys : []);
      } catch (err) {
        console.error('Error fetching org barangays:', err);
      }
    }
  };

  const handleOrgBarangayChange = (code: string) => {
    setOrgSelectedBarangay(code);
    const brgyObj = orgBarangays.find(b => b.code === code);
    setOrgBarangayName(brgyObj ? brgyObj.name : '');
  };

  const handleSaveOrgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyDocId = myCompany?.id || (currentUserUid !== 'unknown' ? currentUserUid : 'company-' + currentUserEmail.replace(/[^a-zA-Z0-9]/g, '_'));

    setOrgProfileSaveLoading(true);

    const addressParts = [
      orgAddressLine1.trim(),
      orgAddressLine2.trim(),
      orgBarangayName ? `Brgy. ${orgBarangayName}` : '',
      orgCityName,
      orgProvinceName,
      orgRegionName,
      orgPostalCode.trim(),
      orgCountry.trim()
    ].filter(Boolean);

    const constructedAddress = addressParts.join(', ');

    const updatedCompany: Company = {
      id: companyDocId,
      name: orgProfileName.trim() || myCompany?.name || 'PicklePoint Venue',
      address: constructedAddress || myCompany?.address || '',
      clientAdminEmail: currentUserEmail || myCompany?.clientAdminEmail || '',
      status: myCompany?.status || 'active',
      createdAt: myCompany?.createdAt || new Date().toISOString(),
      phone: orgProfilePhone.trim() || '',
      websiteUrl: orgProfileWebsite.trim() || '',
      facebookUrl: orgProfileFacebook.trim() || '',
      instagramUrl: orgProfileInstagram.trim() || '',
      logoUrl: orgProfileLogoUrl || '',
      addressLine1: orgAddressLine1.trim(),
      addressLine2: orgAddressLine2.trim(),
      barangay: orgBarangayName,
      municipality: orgCityName,
      province: orgProvinceName,
      region: orgRegionName,
      country: orgCountry.trim() || 'Philippines',
      postalCode: orgPostalCode.trim(),
      operatingHours: orgOperatingHours,
      subdomain: orgSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
    };

    try {
      if (isFirebaseConfigured && db) {
        try {
          // Save directly to Firestore companies collection
          await setDoc(doc(db, 'companies', companyDocId), updatedCompany, { merge: true });

          // Also save/merge into user document in Firestore for instant multi-way lookup
          if (currentUserUid && currentUserUid !== 'unknown') {
            await setDoc(doc(db, 'users', currentUserUid), {
              companyId: companyDocId,
              companyName: updatedCompany.name,
              companyAddress: updatedCompany.address,
              companyLogoUrl: updatedCompany.logoUrl,
            }, { merge: true });
          }
        } catch (cloudErr) {
          console.warn('Firestore company profile update failed, persisting locally:', cloudErr);
        }
      }

      const compStr = localStorage.getItem('picklepoint_companies');
      let localComps = (compStr ? JSON.parse(compStr) : []) as Company[];
      const existingIdx = localComps.findIndex((c) => c.id === companyDocId || c.clientAdminEmail?.toLowerCase() === currentUserEmail);
      if (existingIdx >= 0) {
        localComps[existingIdx] = updatedCompany;
      } else {
        localComps.push(updatedCompany);
      }
      localStorage.setItem('picklepoint_companies', JSON.stringify(localComps));

      setCompanies((prev) => {
        const idx = prev.findIndex((c) => c.id === companyDocId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = updatedCompany;
          return updated;
        }
        return [...prev, updatedCompany];
      });

      setOrgProfileSaveSuccess(true);
      setTimeout(() => setOrgProfileSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update organization profile:', err);
      alert('Failed to update organization profile: ' + (err as Error).message);
    } finally {
      setOrgProfileSaveLoading(false);
    }
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    
    // Instant synchronous pre-load of Open Play events from Local/Session Storage for 0ms rendering
    const cachedEStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
    if (cachedEStr) {
      try {
        const cachedEvents = JSON.parse(cachedEStr).map((e: any) => normalizeOpenPlayEvent(e.id || 'op-' + Date.now(), e));
        if (cachedEvents.length > 0) {
          setOpenPlayEvents(cachedEvents);
        }
      } catch (e) {}
    }

    // --- Independent OpenPlay Fetch (runs regardless of other fetch failures) ---
    (async () => {
      let loadedOpenPlayEvents: OpenPlayEvent[] = [];
      if (isFirebaseConfigured && db) {
        try {
          const eventsSnap = await getDocs(collection(db, 'openplay_events'));
          eventsSnap.forEach((dSnap) => {
            loadedOpenPlayEvents.push(normalizeOpenPlayEvent(dSnap.id, dSnap.data()));
          });
          try {
            localStorage.setItem('picklepoint_openplay_events', JSON.stringify(loadedOpenPlayEvents));
            sessionStorage.setItem('picklepoint_openplay_events', JSON.stringify(loadedOpenPlayEvents));
          } catch (e) {}
        } catch (err) {
          console.warn('Firestore openplay_events fetch error, loading local fallback:', err);
          const localEventsStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
          const localEventsRaw = localEventsStr ? JSON.parse(localEventsStr) : [];
          loadedOpenPlayEvents = localEventsRaw.map((e: any) => normalizeOpenPlayEvent(e.id || 'op-' + Date.now(), e));
        }
      } else {
        const localEventsStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
        const localEventsRaw = localEventsStr ? JSON.parse(localEventsStr) : [];
        loadedOpenPlayEvents = localEventsRaw.map((e: any) => normalizeOpenPlayEvent(e.id || 'op-' + Date.now(), e));
      }
      setOpenPlayEvents(loadedOpenPlayEvents);
    })();

    // --- Independent OpenPlay Registrations Fetch (runs regardless of other fetch failures) ---
    (async () => {
      const regMap = new Map<string, OpenPlayRegistration>();

      // 1. Load from LocalStorage picklepoint_bookings
      try {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const allBookings = JSON.parse(bookingsStr);
          allBookings.forEach((b: any) => {
            if ((b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) && b.openPlayEventId && b.status !== 'cancelled') {
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
              } as OpenPlayRegistration);
            }
          });
        }
        const localRegsStr = localStorage.getItem('picklepoint_openplay_registrations') || sessionStorage.getItem('picklepoint_openplay_registrations');
        if (localRegsStr) {
          const allRegs = JSON.parse(localRegsStr) as OpenPlayRegistration[];
          allRegs.forEach((r) => {
            if (r.eventId && !regMap.has(r.id)) regMap.set(r.id, r);
          });
        }
      } catch (e) {}

      // 2. Load from Firestore
      if (isFirebaseConfigured && db) {
        try {
          // Query bookings collection for open play
          const bSnap = await getDocs(collection(db, 'bookings'));
          bSnap.forEach(dSnap => {
            const b = dSnap.data();
            if ((b.type === 'open_play' || b.type === 'openplay' || b.openPlayEventId) && b.openPlayEventId && b.status !== 'cancelled') {
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
              } as OpenPlayRegistration);
            }
          });

          // Query openplay_registrations collection
          const regsSnap = await getDocs(collection(db, 'openplay_registrations'));
          regsSnap.forEach((dSnap) => {
            if (!regMap.has(dSnap.id)) {
              regMap.set(dSnap.id, { id: dSnap.id, ...dSnap.data() } as OpenPlayRegistration);
            }
          });
        } catch (err) {
          console.warn('Firestore registrations fetch error:', err);
        }
      }

      const loadedOpenPlayRegs = Array.from(regMap.values());
      try {
        localStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(loadedOpenPlayRegs));
        sessionStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(loadedOpenPlayRegs));
      } catch (e) {}
      setOpenPlayRegistrations(loadedOpenPlayRegs);
    })();

    try {
      // 1. Fetch companies first so company context is available immediately for filtering
      let loadedCompanies: Company[] = [];
      if (isFirebaseConfigured && db) {
        try {
          if (isSuperAdmin) {
            const compSnapshot = await getDocs(collection(db, 'companies'));
            compSnapshot.forEach((docSnap) => {
              loadedCompanies.push({
                id: docSnap.id,
                ...docSnap.data(),
              } as Company);
            });
          } else if (currentUserEmail) {
            const compQuery = query(collection(db, 'companies'), where('clientAdminEmail', '==', currentUserEmail));
            const compSnapshot = await getDocs(compQuery);
            compSnapshot.forEach((docSnap) => {
              loadedCompanies.push({
                id: docSnap.id,
                ...docSnap.data(),
              } as Company);
            });
          }
        } catch (err) {
          console.warn('Error fetching companies collection from cloud, loading local fallback:', err);
          const compStr = localStorage.getItem('picklepoint_companies');
          loadedCompanies = compStr ? JSON.parse(compStr) : [];
        }
      } else {
        const compStr = localStorage.getItem('picklepoint_companies');
        loadedCompanies = compStr ? JSON.parse(compStr) : [];
      }
      setCompanies(loadedCompanies);

      const myActiveCompany = loadedCompanies.find((c) =>
        (c.clientAdminEmail && currentUserEmail && c.clientAdminEmail.toLowerCase() === currentUserEmail.toLowerCase()) ||
        c.id === currentUserUid ||
        c.id === (user as any)?.companyId ||
        (c.name && (user as any)?.companyName && c.name.toLowerCase() === (user as any).companyName.toLowerCase())
      );

      // 2. Fetch courts
      let loadedCourts: Court[] = [];
      if (isFirebaseConfigured && db) {
        try {
          const courtsSnapshot = await getDocs(collection(db, 'courts'));
          courtsSnapshot.forEach((docSnap) => {
            if (docSnap.id !== 'court-championship') {
              loadedCourts.push({ id: docSnap.id, ...docSnap.data() } as Court);
            }
          });
        } catch (err) {
          console.warn('Error fetching courts collection from cloud, loading local fallback:', err);
          const courtsStr = localStorage.getItem('picklepoint_courts');
          loadedCourts = courtsStr ? JSON.parse(courtsStr) : [];
          loadedCourts = loadedCourts.filter(c => c.id !== 'court-championship');
        }
      } else {
        const courtsStr = localStorage.getItem('picklepoint_courts');
        loadedCourts = courtsStr ? JSON.parse(courtsStr) : [];
        loadedCourts = loadedCourts.filter(c => c.id !== 'court-championship');
        localStorage.setItem('picklepoint_courts', JSON.stringify(loadedCourts));
      }
      setCourts(loadedCourts);

      const scopedAdminCourts = (() => {
        const hostEmail = currentUserEmail.trim().toLowerCase();
        const hostCompanyId = myActiveCompany?.id || (user as any)?.companyId;
        const hostCompName = (myActiveCompany?.name || (user as any)?.companyName || '').trim().toLowerCase();
        const inviterEmail = ((user as any)?.invitedBy || myActiveCompany?.clientAdminEmail || '').trim().toLowerCase();
        const isGenericPlaceholder = !hostCompName || hostCompName === 'picklepoint venue' || hostCompName === 'book picklecourt venue';

        const matched = loadedCourts.filter((c) => {
          if (c.ownerId && currentUserUid && currentUserUid !== 'unknown' && c.ownerId === currentUserUid) return true;
          if (hostEmail) {
            if (c.ownerEmail && c.ownerEmail.trim().toLowerCase() === hostEmail) return true;
            if (c.createdByEmail && c.createdByEmail.trim().toLowerCase() === hostEmail) return true;
          }
          if (inviterEmail) {
            if (c.ownerEmail && c.ownerEmail.trim().toLowerCase() === inviterEmail) return true;
            if (c.createdByEmail && c.createdByEmail.trim().toLowerCase() === inviterEmail) return true;
          }
          if (hostCompanyId && c.companyId && c.companyId === hostCompanyId) return true;
          if (!isGenericPlaceholder) {
            if (c.ownerCompanyName && c.ownerCompanyName.trim().toLowerCase() === hostCompName) return true;
            if (c.companyName && c.companyName.trim().toLowerCase() === hostCompName) return true;
          }
          return false;
        });

        if (matched.length > 0) return matched;
        if (!isSuperAdmin) return loadedCourts;
        if (isSuperAdmin && !myActiveCompany) return loadedCourts;
        return [];
      })();
      const ownedCourtIds = scopedAdminCourts.map(c => c.id);

      // 3. Fetch bookings (Merge Firestore & LocalStorage for 100% data fidelity)
      const bookingMap = new Map<string, Booking>();
      const localBookingsStr = localStorage.getItem('picklepoint_bookings');
      if (localBookingsStr) {
        try {
          const localBookings = JSON.parse(localBookingsStr) as Booking[];
          localBookings.forEach((b) => {
            const key = b.bookingReference || b.bookingId || b.id;
            if (key) bookingMap.set(key, { ...b, id: key });
          });
        } catch (e) {}
      }

      if (isFirebaseConfigured && db) {
        try {
          const querySnapshot = await getDocs(collection(db, 'bookings'));
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as Booking;
            const key = data.bookingReference || docSnap.id;
            bookingMap.set(key, { ...data, id: key });
          });
        } catch (err) {
          console.warn('Error fetching bookings collection from cloud:', err);
        }
      }

      let loadedBookings: Booking[] = Array.from(bookingMap.values());

      // Filter bookings: each admin sees bookings/checkouts for courts or organization they own.
      if (!isSuperAdmin) {
        if (ownedCourtIds.length > 0) {
          loadedBookings = loadedBookings.filter(b => {
            const isOwnedCourt = ownedCourtIds.includes(b.courtId);
            const isOwnedByUid = b.courtOwnerId && b.courtOwnerId === currentUserUid;
            const isOwnedByEmail = b.ownerEmail && currentUserEmail && b.ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
            const isOwnedByInviter = (user as any)?.invitedBy && b.ownerEmail && b.ownerEmail.toLowerCase() === (user as any).invitedBy.toLowerCase();
            const isOwnedByCompanyName = myActiveCompany?.name && b.ownerCompanyName && b.ownerCompanyName.toLowerCase() === myActiveCompany.name.toLowerCase();
            const isOwnedByCompanyId = myActiveCompany?.id && (b as any).companyId && (b as any).companyId === myActiveCompany.id;
            const isUserCompanyMatch = (user as any)?.companyName && b.ownerCompanyName && b.ownerCompanyName.toLowerCase() === (user as any).companyName.toLowerCase();
            return isOwnedCourt || isOwnedByUid || isOwnedByEmail || isOwnedByInviter || isOwnedByCompanyName || isOwnedByCompanyId || isUserCompanyMatch;
          });
        }
      }
      loadedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(loadedBookings);

      // 4. Fetch users (For both Super Admin and Client Admin)
      let loadedUsers: UserAccount[] = [];
      if (isFirebaseConfigured && db) {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const userMap = new Map<string, UserAccount>();
          const orphanDocIdsToDelete: string[] = [];

          usersSnapshot.forEach((docSnap) => {
            const uData = docSnap.data();
            const emailKey = (uData.email || '').trim().toLowerCase();
            if (!emailKey) return;

            const isPlaceholder = docSnap.id.startsWith('invited-');
            const userObj: UserAccount = {
              uid: docSnap.id,
              ...uData,
              status: uData.status || (uData.isInvitedPending ? 'pending' : 'active'),
            } as UserAccount;

            const existing = userMap.get(emailKey);
            if (!existing) {
              userMap.set(emailKey, userObj);
            } else {
              // Deduplicate: prefer real non-invited auth accounts over placeholder invited-* documents
              if (existing.uid?.startsWith('invited-') && !isPlaceholder) {
                orphanDocIdsToDelete.push(existing.uid);
                userObj.companyId = userObj.companyId || existing.companyId;
                userObj.companyName = userObj.companyName || existing.companyName;
                userMap.set(emailKey, userObj);
              } else if (isPlaceholder) {
                orphanDocIdsToDelete.push(docSnap.id);
                existing.companyId = existing.companyId || userObj.companyId;
                existing.companyName = existing.companyName || userObj.companyName;
              } else {
                // Both are real accounts or both placeholders: prefer active over deleted
                if (existing.status === 'deleted' && userObj.status !== 'deleted') {
                  orphanDocIdsToDelete.push(existing.uid!);
                  userMap.set(emailKey, userObj);
                } else {
                  orphanDocIdsToDelete.push(docSnap.id);
                }
              }
            }
          });

          // Also query invitations to display pending invited Client Admins
          try {
            const invitationsSnapshot = await getDocs(collection(db, 'invitations'));
            invitationsSnapshot.forEach((invDoc) => {
              const invData = invDoc.data();
              const invEmail = (invData.email || '').trim().toLowerCase();
              if (!invEmail) return;

              const isPending = invData.status === 'pending';
              const existingUser = userMap.get(invEmail);

              if (!existingUser) {
                if (isPending) {
                  const invRole = invData.role || 'client_admin';
                  const defaultName = invRole === 'manager' ? 'Invited Manager' : invRole === 'editor' ? 'Invited Editor' : 'Invited Client Admin';
                  userMap.set(invEmail, {
                    uid: `invite-${invDoc.id}`,
                    name: invData.name || defaultName,
                    email: invData.email,
                    role: invRole,
                    companyId: invData.companyId || (user as any)?.companyId || myCompany?.id || '',
                    companyName: invData.company || invData.companyName || myCompany?.name || '',
                    permissions: invData.permissions || getUserEffectivePermissions({ role: invRole }),
                    status: 'pending',
                    isInvitedPending: true,
                    isInvitation: true,
                    inviteToken: invDoc.id,
                    invitedBy: invData.invitedBy,
                    expiresAt: invData.expiresAt,
                    customMessage: invData.customMessage,
                    createdAt: invData.createdAt || new Date().toISOString(),
                  });
                }
              } else {
                // Attach invitation metadata if available and override pending invitation status/role/company
                if (isPending) {
                  existingUser.status = 'pending';
                  existingUser.isInvitedPending = true;
                  existingUser.isInvitation = true;
                  existingUser.inviteToken = invDoc.id;
                  existingUser.expiresAt = invData.expiresAt;
                  existingUser.invitedBy = invData.invitedBy;
                  existingUser.customMessage = invData.customMessage;
                  if (invData.role) {
                    existingUser.role = invData.role;
                  }
                  existingUser.companyId = invData.companyId || existingUser.companyId || (user as any)?.companyId || myCompany?.id || '';
                  existingUser.companyName = invData.company || invData.companyName || existingUser.companyName || myCompany?.name || '';
                  existingUser.permissions = invData.permissions || getUserEffectivePermissions({ role: invData.role || existingUser.role });
                  if (invData.name && (!existingUser.name || existingUser.name === 'Player' || existingUser.name.startsWith('Invited'))) {
                    existingUser.name = invData.name;
                  }
                }
              }
            });
          } catch (invErr) {
            console.warn('Error querying invitations collection in fetchData:', invErr);
          }

          // Clean up orphan duplicate placeholder documents in the background
          for (const orphanId of orphanDocIdsToDelete) {
            deleteDoc(doc(db, 'users', orphanId)).catch(() => {});
          }

          loadedUsers = Array.from(userMap.values());
        } catch (err) {
          console.error('Error fetching users collection:', err);
          const usersStr = localStorage.getItem('picklepoint_users');
          loadedUsers = usersStr ? JSON.parse(usersStr) : [];
        }
      } else {
        // Simulated Users Fallback
        const usersStr = localStorage.getItem('picklepoint_users');
        const localUsers = (usersStr ? JSON.parse(usersStr) : []) as any[];
        const localMap = new Map<string, any>();
        localUsers.forEach((u) => {
          const emailKey = (u.email || '').trim().toLowerCase();
          if (emailKey && !localMap.has(emailKey)) {
            localMap.set(emailKey, u);
          }
        });

        // Merge simulated invitations
        const invStr = localStorage.getItem('picklepoint_invitations');
        if (invStr) {
          try {
            const localInvs = JSON.parse(invStr);
            localInvs.forEach((inv: any) => {
              const invEmail = (inv.email || '').trim().toLowerCase();
              if (invEmail && inv.status === 'pending' && !localMap.has(invEmail)) {
                const invRole = inv.role || 'client_admin';
                const defaultName = invRole === 'manager' ? 'Invited Manager' : invRole === 'editor' ? 'Invited Editor' : 'Invited Client Admin';
                localMap.set(invEmail, {
                  uid: `invite-${inv.token}`,
                  name: inv.name || defaultName,
                  email: inv.email,
                  role: invRole,
                  status: 'pending',
                  isInvitedPending: true,
                  isInvitation: true,
                  inviteToken: inv.token,
                  expiresAt: inv.expiresAt,
                  invitedBy: inv.invitedBy,
                  createdAt: inv.createdAt,
                });
              }
            });
          } catch (e) {}
        }

        loadedUsers = Array.from(localMap.values()).map((u) => ({
          uid: u.uid || 'simulated-uid-' + u.email,
          name: u.name,
          email: u.email,
          role: u.role || (u.email?.toLowerCase() === 'admin@picklepoint.com' ? 'super_admin' : 'player'),
          status: u.status || (u.isInvitedPending ? 'pending' : 'active'),
          companyId: u.companyId,
          companyName: u.companyName,
          isInvitedPending: u.isInvitedPending,
          isInvitation: u.isInvitation,
          inviteToken: u.inviteToken,
          expiresAt: u.expiresAt,
          invitedBy: u.invitedBy,
          createdAt: u.createdAt,
        }));
        
        // Ensure default accounts are shown if list is empty
        if (loadedUsers.length === 0) {
          loadedUsers.push({ name: 'Demo Player', email: 'demo@picklepoint.com', role: 'player', status: 'active' });
          loadedUsers.push({ name: 'Admin User', email: 'admin@picklepoint.com', role: 'super_admin', status: 'active' });
        }
      }
      setUsers(loadedUsers);

      // 4. Fetch GCash checkout settings (both personal and global fallback)
      if (isFirebaseConfigured && db) {
        try {
          // Fetch personal or facility GCash details list
          try {
            let accountsToLoad: GcashAccount[] = [];

            // 1. Try reading currentUserUid document directly
            const personalSnap = await getDoc(doc(db, 'settings', 'checkout', 'users', currentUserUid));
            if (personalSnap.exists() && personalSnap.data().accounts && personalSnap.data().accounts.length > 0) {
              accountsToLoad = personalSnap.data().accounts;
            } else {
              const localStr = localStorage.getItem(`picklepoint_checkout_settings_accounts_${currentUserUid}`);
              if (localStr) {
                try { accountsToLoad = JSON.parse(localStr); } catch (e) {}
              }
            }

            // 2. If no accounts found for currentUserUid (e.g. user is Manager or Editor), resolve facility owner (Client Admin)
            if (accountsToLoad.length === 0) {
              const targetCompanyId = (user as any)?.companyId || myCompany?.id;
              const targetCompanyEmail = myCompany?.clientAdminEmail;

              const facilityOwnerUser = loadedUsers.find(
                (u) =>
                  (u.role === 'client_admin' || u.role === 'super_admin') &&
                  (u.companyId === targetCompanyId || (targetCompanyEmail && u.email?.toLowerCase() === targetCompanyEmail.toLowerCase()))
              );

              const targetOwnerUid = facilityOwnerUser?.uid || (myCompany as any)?.ownerId;

              if (targetOwnerUid && targetOwnerUid !== currentUserUid) {
                const ownerSnap = await getDoc(doc(db, 'settings', 'checkout', 'users', targetOwnerUid));
                if (ownerSnap.exists() && ownerSnap.data().accounts && ownerSnap.data().accounts.length > 0) {
                  accountsToLoad = ownerSnap.data().accounts;
                } else {
                  const ownerLocalStr = localStorage.getItem(`picklepoint_checkout_settings_accounts_${targetOwnerUid}`);
                  if (ownerLocalStr) {
                    try { accountsToLoad = JSON.parse(ownerLocalStr); } catch (e) {}
                  }
                }
              }
            }

            // 3. Fallback: query /settings/checkout/users collection for any document matching companyId
            if (accountsToLoad.length === 0 && ((user as any)?.companyId || myCompany?.id)) {
              try {
                const targetCompId = (user as any)?.companyId || myCompany?.id;
                const companyAccountsQuery = query(
                  collection(db, 'settings', 'checkout', 'users'),
                  where('companyId', '==', targetCompId)
                );
                const compAccSnap = await getDocs(companyAccountsQuery);
                if (!compAccSnap.empty && compAccSnap.docs[0].data().accounts) {
                  accountsToLoad = compAccSnap.docs[0].data().accounts;
                }
              } catch (cErr) {
                console.warn('Company checkout query fallback error:', cErr);
              }
            }

            setPersonalAccounts(accountsToLoad);
          } catch (pErr) {
            console.warn('Failed to read personal/facility settings from Firestore:', pErr);
            const localStr = localStorage.getItem(`picklepoint_checkout_settings_accounts_${currentUserUid}`);
            setPersonalAccounts(localStr ? JSON.parse(localStr) : []);
          }

          // Fetch global fallback details
          try {
            const globalSnap = await getDoc(doc(db, 'settings', 'checkout'));
            if (globalSnap.exists()) {
              const data = globalSnap.data();
              setGlobalGcashQrSetting(data.gcashQrCode || '');
              setGlobalGcashNameSetting(data.gcashName || '');
              setGlobalGcashNumberSetting(data.gcashNumber || '');
              setGlobalServiceFeeSetting(typeof data.serviceFee === 'number' ? data.serviceFee : 30);
              setGlobalServiceFeeEnabled(data.serviceFeeEnabled !== undefined ? Boolean(data.serviceFeeEnabled) : true);
            } else {
              const globalStr = localStorage.getItem('picklepoint_checkout_settings');
              if (globalStr) {
                const data = JSON.parse(globalStr);
                setGlobalGcashQrSetting(data.gcashQrCode || '');
                setGlobalGcashNameSetting(data.gcashName || '');
                setGlobalGcashNumberSetting(data.gcashNumber || '');
                setGlobalServiceFeeSetting(typeof data.serviceFee === 'number' ? data.serviceFee : 30);
                setGlobalServiceFeeEnabled(data.serviceFeeEnabled !== undefined ? Boolean(data.serviceFeeEnabled) : true);
              }
            }
          } catch (gErr) {
            console.warn('Failed to read global settings from Firestore:', gErr);
            const globalStr = localStorage.getItem('picklepoint_checkout_settings');
            if (globalStr) {
              const data = JSON.parse(globalStr);
              setGlobalGcashQrSetting(data.gcashQrCode || '');
              setGlobalGcashNameSetting(data.gcashName || '');
              setGlobalGcashNumberSetting(data.gcashNumber || '');
              setGlobalServiceFeeSetting(typeof data.serviceFee === 'number' ? data.serviceFee : 30);
              setGlobalServiceFeeEnabled(data.serviceFeeEnabled !== undefined ? Boolean(data.serviceFeeEnabled) : true);
            }
          }
        } catch (err) {
          console.error('Error fetching checkout settings:', err);
        }
      } else {
        // LocalStorage fallback for personal/facility settings list
        let personalStr = localStorage.getItem(`picklepoint_checkout_settings_accounts_${currentUserUid}`);
        if (!personalStr) {
          const targetCompanyId = (user as any)?.companyId || myCompany?.id;
          const facilityOwnerUser = loadedUsers.find(
            (u) => (u.role === 'client_admin' || u.role === 'super_admin') && (u.companyId === targetCompanyId)
          );
          if (facilityOwnerUser?.uid) {
            personalStr = localStorage.getItem(`picklepoint_checkout_settings_accounts_${facilityOwnerUser.uid}`);
          }
        }
        if (personalStr) {
          setPersonalAccounts(JSON.parse(personalStr) as GcashAccount[]);
        } else {
          setPersonalAccounts([]);
        }
        // LocalStorage fallback for global settings
        const globalStr = localStorage.getItem('picklepoint_checkout_settings');
        if (globalStr) {
          const data = JSON.parse(globalStr);
          setGlobalGcashQrSetting(data.gcashQrCode || '');
          setGlobalGcashNameSetting(data.gcashName || '');
          setGlobalGcashNumberSetting(data.gcashNumber || '');
          setGlobalServiceFeeSetting(typeof data.serviceFee === 'number' ? data.serviceFee : 30);
          setGlobalServiceFeeEnabled(data.serviceFeeEnabled !== undefined ? Boolean(data.serviceFeeEnabled) : true);
        }
        // Fetch Vouchers
        let loadedVouchers: Voucher[] = [];
        if (isFirebaseConfigured && db) {
          try {
            const vouchersSnap = await getDocs(collection(db, 'vouchers'));
            vouchersSnap.forEach((dSnap) => {
              loadedVouchers.push({ id: dSnap.id, ...dSnap.data() } as Voucher);
            });
          } catch (err) {
            console.warn('Firestore vouchers fetch error:', err);
          }
        }
        if (loadedVouchers.length === 0) {
          const vStr = localStorage.getItem('picklepoint_vouchers');
          loadedVouchers = vStr ? JSON.parse(vStr) : [];
        }
        loadedVouchers = loadedVouchers.filter(v => !v.ownerId || v.ownerId === currentUserUid);
        setVouchers(loadedVouchers);
      }

      // 5. Fetch Payment Approval Reminder settings
      let loadedReminderSettings: PaymentReminderSettings | null = null;
      if (isFirebaseConfigured && db) {
        try {
          const remSnap = await getDoc(doc(db, 'settings', 'reminders', 'users', currentUserUid));
          if (remSnap.exists()) {
            const data = remSnap.data();
            loadedReminderSettings = {
              enabled: Boolean(data.enabled),
              preset: data.preset || '15',
              intervalMinutes: Number(data.intervalMinutes) || 15,
              customMinutes: Number(data.customMinutes) || 15,
              emailEnabled: Boolean(data.emailEnabled),
              emailRecipient: data.emailRecipient || user?.email || '',
              soundEnabled: data.soundEnabled !== undefined ? Boolean(data.soundEnabled) : true,
              browserNotificationEnabled: Boolean(data.browserNotificationEnabled),
            };
          }
        } catch (remErr) {
          console.warn('Failed to load payment reminder settings from cloud:', remErr);
        }
      }
      if (!loadedReminderSettings) {
        const localRemStr = localStorage.getItem(`picklepoint_payment_reminder_settings_${currentUserUid}`);
        if (localRemStr) {
          try {
            loadedReminderSettings = JSON.parse(localRemStr);
          } catch (e) {
            console.warn('Failed to parse local reminder settings:', e);
          }
        }
      }
      if (loadedReminderSettings) {
        setPaymentReminderSettings(loadedReminderSettings);
      }

      // 6. Fetch Short Links
      let loadedShortLinks: ShortLink[] = [];
      if (isFirebaseConfigured && db) {
        try {
          const shortSnap = await getDocs(collection(db, 'short_links'));
          shortSnap.forEach((dSnap) => {
            loadedShortLinks.push({ id: dSnap.id, ...dSnap.data() } as ShortLink);
          });
        } catch (err) {
          console.warn('Firestore short links fetch error:', err);
        }
      }
      if (loadedShortLinks.length === 0) {
        const slStr = localStorage.getItem('picklepoint_short_links');
        loadedShortLinks = slStr ? JSON.parse(slStr) : [];
      }
      setShortLinks(loadedShortLinks);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRegions();
  }, []);

  // Real-time Firestore onSnapshot & cross-tab storage listener for Bookings / Checkouts
  useEffect(() => {
    let unsubscribeBookings: (() => void) | null = null;

    if (isFirebaseConfigured && db) {
      try {
        unsubscribeBookings = onSnapshot(collection(db!, 'bookings'), (snapshot) => {
            const bookingMap = new Map<string, Booking>();

            // 1. Include local storage base
            try {
              const localBookingsStr = localStorage.getItem('picklepoint_bookings');
              if (localBookingsStr) {
                const localBookings = JSON.parse(localBookingsStr) as Booking[];
                localBookings.forEach((b) => {
                  const key = b.bookingReference || b.bookingId || b.id;
                  if (key) bookingMap.set(key, { ...b, id: key });
                });
              }
            } catch (e) {}

            // 2. Real-time updates from Firestore
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Booking;
              const key = data.bookingReference || docSnap.id;
              bookingMap.set(key, { ...data, id: key });
            });

            let loadedBookings: Booking[] = Array.from(bookingMap.values());

            // 3. Filter for active venue host
            if (!isSuperAdmin) {
              const ownedCourtIds = courts.map((c) => c.id);
              loadedBookings = loadedBookings.filter((b) => {
                const isOwnedCourt = ownedCourtIds.includes(b.courtId);
                const isOwnedByUid = b.courtOwnerId && b.courtOwnerId === currentUserUid;
                const isOwnedByEmail = b.ownerEmail && currentUserEmail && b.ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();
                const isOwnedByCompanyName = myCompany?.name && b.ownerCompanyName && b.ownerCompanyName.toLowerCase() === myCompany.name.toLowerCase();
                const isOwnedByCompanyId = myCompany?.id && (b as any).companyId && (b as any).companyId === myCompany.id;
                const isUserCompanyMatch = (user as any)?.companyName && b.ownerCompanyName && b.ownerCompanyName.toLowerCase() === (user as any).companyName.toLowerCase();
                return isOwnedCourt || isOwnedByUid || isOwnedByEmail || isOwnedByCompanyName || isOwnedByCompanyId || isUserCompanyMatch;
              });
            }

            loadedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBookings(loadedBookings);
          }, (err) => {
            console.warn('Real-time bookings subscription error:', err);
          });
        } catch (err) {
          console.warn('Failed to initialize real-time bookings listener:', err);
        }
      }

    // Cross-tab storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'picklepoint_bookings' || e.key === 'picklepoint_openplay_registrations') {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Suppress TS unused local warnings
  void [Fragment, LayoutDashboard, TrendingUp, DollarSign, Menu, Globe, Eye, EyeOff, LogOut, ChevronDown, ChevronLeft, ChevronRight, Share2, Save, Volume2, VolumeX, Settings, ChevronUp, BarChart3, Phone, sendPaymentApprovalReceiptEmail, splitAddressComponents, DAYS_OF_WEEK, OPERATING_TIME_OPTIONS, leadTimeSaveSuccess, leadTimeSaveLoading, serviceFeeSaving, reminderSaveLoading, reminderSaveSuccess, testEmailLoading, testEmailMessage, expandedCheckoutId, setExpandedCheckoutId, setUserRoleFilter, setUserStatusFilter, copiedInviteUserToken, setCompanyStatusFilter, orgSelectedRegion, orgSelectedProvince, orgSelectedCity, orgSelectedBarangay, orgProfileSaveSuccess, orgProfileSaveLoading, handleToggleDayOff, handleDayTimeChange, handleApplyMonToAll, processOrgLogoFile, copiedShareLink, attendanceMap, handleToggleAttendance, checkHasEventStarted, adminOpenPlayFilter, adminOpenPlayViewMode, setAdminOpenPlayViewMode, handleToggleEventStatus, handleDuplicateOpenPlayEvent, courtsViewMode, setCourtsViewMode, bookingsViewMode, setBookingsViewMode, calendarMonth, setCalendarMonth, setSelectedCalendarCourtId, handleOpenWeatherStoppage, setAdminPhone, adminProfileSaveSuccess, handleSaveAdminPersonalProfile, handleOrgRegionChange, handleOrgProvinceChange, handleOrgCityChange, handleOrgBarangayChange, handleSaveOrgProfile, requestNotificationPermission, handleSavePaymentReminderSettings, handleTestReminderAlert, handleTestReminderEmail, handleOpenInviteClientAdmin, handleCopyUserInviteLink, handleResendUserInviteEmail, handleRevokeUserInvite, handleOpenCreateCompany, handleOpenEditCompany, handleOpenSendEmail, handleOpenCreateCourt, utilizationRate, filteredCourts, filteredUsers, filteredCompanies];
  return () => {
      if (unsubscribeBookings) unsubscribeBookings();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [courts, isSuperAdmin, currentUserUid, currentUserEmail, myCompany]);



  const handleSaveCheckoutSettings = async () => {
    setSettingsSaveLoading(true);
    try {
      if (settingsModalType === 'my') {

        let updatedAccounts = [...personalAccounts];
        if (editingAccountId) {
          updatedAccounts = updatedAccounts.map(a =>
            a.id === editingAccountId
              ? {
                  ...a,
                  paymentName: paymentNameSetting.trim() || 'GCash Account',
                  gcashName: gcashNameSetting,
                  gcashNumber: gcashNumberSetting,
                  gcashQrCode: gcashQrCodeSetting,
                }
              : a
          );
        } else {
          const newAcc: GcashAccount = {
            id: 'acc-' + Date.now(),
            paymentName: paymentNameSetting.trim() || 'GCash Account',
            gcashName: gcashNameSetting,
            gcashNumber: gcashNumberSetting,
            gcashQrCode: gcashQrCodeSetting,
          };
          updatedAccounts.push(newAcc);
        }

        if (isFirebaseConfigured && db) {
          const compId = (user as any)?.companyId || myCompany?.id || '';
          await setDoc(doc(db, 'settings', 'checkout', 'users', currentUserUid), {
            accounts: updatedAccounts,
            companyId: compId,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          localStorage.setItem(`picklepoint_checkout_settings_accounts_${currentUserUid}`, JSON.stringify(updatedAccounts));
        }

        setPersonalAccounts(updatedAccounts);
      } else {
        // Global configuration
        const payload = {
          gcashQrCode: gcashQrCodeSetting,
          gcashName: gcashNameSetting,
          gcashNumber: gcashNumberSetting,
          serviceFee: Number(globalServiceFeeSetting) || 30,
        };
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'settings', 'checkout'), payload, { merge: true });
        }
        const existing = JSON.parse(localStorage.getItem('picklepoint_checkout_settings') || '{}');
        localStorage.setItem('picklepoint_checkout_settings', JSON.stringify({ ...existing, ...payload }));

        setGlobalGcashQrSetting(gcashQrCodeSetting);
        setGlobalGcashNameSetting(gcashNameSetting);
        setGlobalGcashNumberSetting(gcashNumberSetting);
      }

      setGcashModalOpen(false);
      setShowSettingsSuccessModal(true);
    } catch (err) {
      console.error('Failed to save checkout settings to cloud:', err);
      if (settingsModalType === 'my') {
        let updatedAccounts = [...personalAccounts];
        if (editingAccountId) {
          updatedAccounts = updatedAccounts.map(a =>
            a.id === editingAccountId
              ? { ...a, gcashName: gcashNameSetting, gcashNumber: gcashNumberSetting, gcashQrCode: gcashQrCodeSetting }
              : a
          );
        } else {
          const newAcc: GcashAccount = {
            id: 'acc-' + Date.now(),
            gcashName: gcashNameSetting,
            gcashNumber: gcashNumberSetting,
            gcashQrCode: gcashQrCodeSetting,
          };
          updatedAccounts.push(newAcc);
        }
        localStorage.setItem(`picklepoint_checkout_settings_accounts_${currentUserUid}`, JSON.stringify(updatedAccounts));
        setPersonalAccounts(updatedAccounts);
      } else {
        localStorage.setItem('picklepoint_checkout_settings', JSON.stringify({ gcashQrCode: gcashQrCodeSetting, gcashName: gcashNameSetting, gcashNumber: gcashNumberSetting }));
        setGlobalGcashQrSetting(gcashQrCodeSetting);
        setGlobalGcashNameSetting(gcashNameSetting);
        setGlobalGcashNumberSetting(gcashNumberSetting);
      }
      setGcashModalOpen(false);
      setShowSettingsSuccessModal(true);
    } finally {
      setSettingsSaveLoading(false);
    }
  };

  const handleSaveServiceFee = async (fee?: number, enabled?: boolean) => {
    setServiceFeeSaving(true);
    try {
      const feeNum = fee !== undefined ? Number(fee) : (Number(globalServiceFeeSetting) || 0);
      const isEnabled = enabled !== undefined ? Boolean(enabled) : globalServiceFeeEnabled;
      const payload = { serviceFee: feeNum, serviceFeeEnabled: isEnabled };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'settings', 'checkout'), payload, { merge: true });
      }
      const globalStr = localStorage.getItem('picklepoint_checkout_settings');
      const existing = globalStr ? JSON.parse(globalStr) : {};
      const updated = { ...existing, ...payload };
      localStorage.setItem('picklepoint_checkout_settings', JSON.stringify(updated));

      setGlobalServiceFeeSetting(feeNum);
      setGlobalServiceFeeEnabled(isEnabled);
      showModalAlert(
        'Service Fee Updated!',
        `Online Booking Service Fee updated! ${isEnabled ? `ACTIVE (₱${feeNum} per booking)` : 'INACTIVE (₱0 charged to players)'}`,
        'success'
      );
    } catch (err) {
      console.error('Failed to save service fee:', err);
      showModalAlert('Save Failed', 'Failed to save service fee: ' + (err as Error).message, 'error');
    } finally {
      setServiceFeeSaving(false);
    }
  };

  // --- Payment Approval Reminder Helpers & Handlers ---
  const playReminderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2 (Higher Ding)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.18); // D6
      gain2.gain.setValueAtTime(0.22, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio chime playback failed or blocked:', e);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser.');
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setPaymentReminderSettings(prev => ({ ...prev, browserNotificationEnabled: true }));
        return true;
      } else {
        setPaymentReminderSettings(prev => ({ ...prev, browserNotificationEnabled: false }));
        alert('Notification permission was ' + perm + '. Please allow notifications in browser settings to receive desktop alerts.');
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
          setActiveTab('checkouts');
          notif.close();
        };
      } catch (e) {
        console.warn('Failed to display browser notification:', e);
      }
    }
  };

  const handleSavePaymentReminderSettings = async () => {
    setReminderSaveLoading(true);
    setReminderSaveSuccess(false);
    try {
      let finalMinutes = paymentReminderSettings.preset === 'custom'
        ? Math.max(1, Number(paymentReminderSettings.customMinutes) || 1)
        : Number(paymentReminderSettings.preset);

      if (paymentReminderSettings.preset === 'custom' && (!paymentReminderSettings.customMinutes || paymentReminderSettings.customMinutes < 1)) {
        alert('Please enter a valid custom minute interval (at least 1 minute).');
        setReminderSaveLoading(false);
        return;
      }

      if (paymentReminderSettings.emailEnabled && !paymentReminderSettings.emailRecipient?.trim()) {
        alert('Please enter a valid recipient email address.');
        setReminderSaveLoading(false);
        return;
      }

      const payload: PaymentReminderSettings = {
        ...paymentReminderSettings,
        intervalMinutes: finalMinutes,
      };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'settings', 'reminders', 'users', currentUserUid), payload, { merge: true });
      }

      localStorage.setItem(`picklepoint_payment_reminder_settings_${currentUserUid}`, JSON.stringify(payload));
      setPaymentReminderSettings(payload);
      setReminderSaveSuccess(true);
      setTimeout(() => setReminderSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
      alert('Failed to save reminder settings: ' + (err as Error).message);
    } finally {
      setReminderSaveLoading(false);
    }
  };

  const handleTestReminderAlert = () => {
    if (paymentReminderSettings.soundEnabled) {
      playReminderChime();
    }
    if (paymentReminderSettings.browserNotificationEnabled) {
      sendBrowserNotification(
        '⚠️ Test Payment Approval Reminder',
        `You have ${Math.max(1, pendingVerificationCount)} customer payment(s) awaiting verification in your PicklePoint dashboard.`
      );
    }
    setPendingReminderToast({
      open: true,
      count: Math.max(1, pendingVerificationCount),
      timestamp: Date.now(),
    });
  };

  const handleTestReminderEmail = async () => {
    const targetEmail = paymentReminderSettings.emailRecipient?.trim() || user?.email || currentUserEmail;
    if (!targetEmail) {
      alert('Please enter a recipient email address.');
      return;
    }
    setTestEmailLoading(true);
    setTestEmailMessage(null);
    try {
      const pendingItemsList = bookings
        .filter(b => b.paymentStatus === 'pending_verification' || b.status === 'pending')
        .map(b => ({
          customerName: b.user?.name || b.userName || 'Customer Player',
          courtName: b.courtName || 'Court Facility',
          date: b.date || 'Today',
          slots: b.slots || ['08:00 AM - 09:00 AM'],
          totalCost: b.totalCost || 500,
          paymentMethod: b.paymentMethod || 'GCash',
          gcashReferenceNumber: b.gcashReferenceNumber || 'GC-SAMPLE-REF',
          bookingReference: b.bookingReference || b.id?.slice(0, 8),
        }));

      await sendPendingPaymentsReminderEmail({
        toEmail: targetEmail,
        toName: user?.name || 'Administrator',
        pendingCount: Math.max(1, pendingVerificationCount),
        companyName: myCompany?.name,
        pendingList: pendingItemsList.length > 0 ? pendingItemsList : [
          {
            customerName: 'Juan Dela Cruz (Sample)',
            courtName: courts[0]?.name || 'Court 1',
            date: new Date().toISOString().split('T')[0],
            slots: ['06:00 PM - 07:00 PM'],
            totalCost: 500,
            paymentMethod: 'GCash',
            gcashReferenceNumber: '109823746192',
            bookingReference: 'PKL-SAMPLE',
          }
        ],
        customMessage: 'This is a test payment approval reminder dispatched from your PicklePoint Admin Settings.',
      });

      setTestEmailMessage(`Test reminder email sent to ${targetEmail}!`);
      setTimeout(() => setTestEmailMessage(null), 5000);
    } catch (e) {
      console.error('Failed to send test reminder email:', e);
      alert('Error sending test email: ' + (e as Error).message);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Periodic Payment Approval Reminder Worker Effect
  useEffect(() => {
    if (!paymentReminderSettings.enabled) return;
    const intervalMins = paymentReminderSettings.intervalMinutes || 15;
    const intervalMs = Math.max(1, intervalMins) * 60 * 1000;

    const intervalId = setInterval(() => {
      const currentPendingCount = bookings.filter(
        b => b.paymentStatus === 'pending_verification' || (b.status === 'pending' && b.paymentMethod)
      ).length;

      if (currentPendingCount > 0) {
        // 1. In-App Floating Toast
        setPendingReminderToast({
          open: true,
          count: currentPendingCount,
          timestamp: Date.now(),
        });

        // 2. Sound Chime
        if (paymentReminderSettings.soundEnabled) {
          playReminderChime();
        }

        // 3. Browser Desktop Notification
        if (paymentReminderSettings.browserNotificationEnabled) {
          sendBrowserNotification(
            `⚠️ Action Required: ${currentPendingCount} Payment(s) Need Approval`,
            `There are ${currentPendingCount} customer payment(s) awaiting verification in PicklePoint.`
          );
        }

        // 4. Email Reminder
        if (paymentReminderSettings.emailEnabled) {
          const recipient = paymentReminderSettings.emailRecipient?.trim() || user?.email || currentUserEmail;
          if (recipient) {
            const pendingItemsList = bookings
              .filter(b => b.paymentStatus === 'pending_verification' || (b.status === 'pending' && b.paymentMethod))
              .map(b => ({
                customerName: b.user?.name || b.userName || 'Player',
                courtName: b.courtName || 'Court',
                date: b.date,
                slots: b.slots || [],
                totalCost: b.totalCost || 0,
                paymentMethod: b.paymentMethod,
                gcashReferenceNumber: b.gcashReferenceNumber,
                bookingReference: b.bookingReference,
              }));

            sendPendingPaymentsReminderEmail({
              toEmail: recipient,
              toName: user?.name || 'Administrator',
              pendingCount: currentPendingCount,
              companyName: myCompany?.name,
              pendingList: pendingItemsList,
            }).catch(err => console.warn('Periodic reminder email error:', err));
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [paymentReminderSettings, bookings, user, currentUserEmail, myCompany]);

  const handleDeleteCheckoutSettings = async (type: 'my' | 'global', accountId?: string) => {
    const isGlobal = type === 'global';
    if (!confirm(`Are you sure you want to delete this ${isGlobal ? 'Global Fallback' : 'Personal'} GCash account?`)) return;
    try {
      if (isGlobal) {
        if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'settings', 'checkout'));
        } else {
          localStorage.removeItem('picklepoint_checkout_settings');
        }
        setGlobalGcashQrSetting('');
        setGlobalGcashNameSetting('');
        setGlobalGcashNumberSetting('');
      } else {
        const updatedAccounts = personalAccounts.filter(a => a.id !== accountId);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'settings', 'checkout', 'users', currentUserUid), { accounts: updatedAccounts });
        } else {
          localStorage.setItem(`picklepoint_checkout_settings_accounts_${currentUserUid}`, JSON.stringify(updatedAccounts));
        }
        setPersonalAccounts(updatedAccounts);
      }
      alert('GCash payment account deleted successfully!');
    } catch (err) {
      console.error('Failed to delete GCash settings:', err);
      alert('Failed to delete settings: ' + (err as Error).message);
    }
  };

  const handleOpenSettingsModal = (type: 'my' | 'global', accountId?: string) => {
    setSettingsModalType(type);
    setSettingsValidationError(null);
    if (type === 'my') {
      if (accountId) {
        const acc = personalAccounts.find(a => a.id === accountId);
        if (acc) {
          setPaymentNameSetting(acc.paymentName || '');
          setGcashNameSetting(acc.gcashName);
          setGcashNumberSetting(acc.gcashNumber);
          setGcashQrCodeSetting(acc.gcashQrCode);
          setEditingAccountId(accountId);
        }
      } else {
        setPaymentNameSetting('');
        setGcashNameSetting('');
        setGcashNumberSetting('');
        setGcashQrCodeSetting('');
        setEditingAccountId(null);
      }
    } else {
      // Global
      setPaymentNameSetting('Global Fallback GCash');
      setGcashNameSetting(globalGcashNameSetting);
      setGcashNumberSetting(globalGcashNumberSetting);
      setGcashQrCodeSetting(globalGcashQrSetting);
      setEditingAccountId(null);
    }
    setGcashModalOpen(true);
  };

  const handleGcashQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 400;
        const scale = max_width / img.width;
        canvas.width = max_width;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setGcashQrCodeSetting(compressedBase64);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Back to Main Site
  // @ts-ignore
  const _handleBackToSite = () => {
    window.history.pushState({}, '', '/');
    setView('landing');
  };

  // Actions
  const handleUpdateStatus = async (bookingId: string, newStatus: 'approved' | 'cancelled') => {
    const targetBooking = bookings.find((b) => b.id === bookingId || b.bookingId === bookingId);
    if (targetBooking && isPastBookingDate(targetBooking.date)) {
      alert('Past reservations cannot be modified or cancelled.');
      return;
    }

    setActionLoading(bookingId);
    try {
      const paymentUpdate = newStatus === 'approved' ? 'paid' : 'failed';
      if (isFirebaseConfigured && db) {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { status: newStatus, paymentStatus: paymentUpdate });
      } else {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.map((b: Booking) => {
            if (b.bookingId === bookingId || b.id === bookingId) {
              return { ...b, status: newStatus, paymentStatus: paymentUpdate };
            }
            return b;
          });
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }
      }
      // Optimistic state update
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus, paymentStatus: paymentUpdate } : b))
      );

      // Automated email notification dispatch
      const targetBooking = bookings.find((b) => b.id === bookingId || b.bookingId === bookingId);
      const recipientEmail = targetBooking?.userEmail || targetBooking?.user?.email || '';
      const recipientName = targetBooking?.userName || targetBooking?.user?.name || 'Valued Player';

      if (targetBooking && recipientEmail) {
        sendBookingStatusUpdateEmail(
          {
            bookingId: targetBooking.id || targetBooking.bookingId || bookingId,
            courtName: targetBooking.courtName || 'Court',
            date: targetBooking.date || '',
            slots: targetBooking.slots || [],
            totalCost: targetBooking.totalCost || 0,
            userEmail: recipientEmail,
            userName: recipientName,
            paymentMethod: targetBooking.paymentMethod || 'GCash',
            bookingReference: targetBooking.bookingReference || targetBooking.id || bookingId,
          },
          newStatus
        ).catch((err) => console.warn('Automated status email failed:', err));
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setRefundError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setRefundError(null);
    setRefundReceiptFile(file);
    setRefundReceiptName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 600;
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
        setRefundReceiptBase64(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleProcessRefund = async () => {
    if (!refundModalBooking) return;

    let refundAmt = 0;

    if (cancellationResolutionMode === 'refund') {
      if (!refundReceiptBase64) {
        setRefundError('Please upload a refund receipt image as proof of transfer.');
        return;
      }
      refundAmt = parseFloat(refundAmountInput);
      if (isNaN(refundAmt) || refundAmt <= 0) {
        setRefundError('Please enter a valid refund amount.');
        return;
      }
    } else if (cancellationResolutionMode === 'voucher') {
      refundAmt = parseFloat(refundAmountInput);
      if (isNaN(refundAmt) || refundAmt <= 0) {
        setRefundError('Please enter a valid voucher credit amount.');
        return;
      }
    }

    setRefundSubmitting(true);
    setRefundError(null);

    const refundedAtIso = new Date().toISOString();
    const refundedByInfo = currentUserEmail || currentUserUid || 'Client Admin';
    const targetCourt = courts.find(c => c.id === refundModalBooking.courtId || c.name === refundModalBooking.courtName);
    const ownerCompanyName = targetCourt?.ownerCompanyName || (refundModalBooking as any).ownerCompanyName || refundModalBooking.courtName;
    const ownerCompanyAddress = targetCourt?.companyAddress || targetCourt?.location || (refundModalBooking as any).ownerCompanyAddress || 'Venue Location On File';
    const ownerEmail = targetCourt?.ownerEmail || (refundModalBooking as any).ownerEmail;
    const ownerPhone = targetCourt?.ownerPhone || (refundModalBooking as any).ownerPhone;

    try {
      if (cancellationResolutionMode === 'refund') {
        // Mode 1: Monetary Refund with Receipt Proof
        if (isFirebaseConfigured && db) {
          try {
            const bookingRef = doc(db, 'bookings', refundModalBooking.id);
            await updateDoc(bookingRef, {
              status: 'cancelled',
              paymentStatus: 'refunded',
              refundReceiptUrl: refundReceiptBase64,
              refundAmount: refundAmt,
              refundReason: refundReasonInput || 'Monetary refund issued',
              refundedAt: refundedAtIso,
              refundedBy: refundedByInfo,
            });
          } catch (cloudErr) {
            console.warn('Firestore update failed for refund (check security rules), storing locally:', cloudErr);
          }
        }

        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.map((b: Booking) => {
            if (b.bookingId === refundModalBooking.id || b.id === refundModalBooking.id) {
              return {
                ...b,
                status: 'cancelled' as const,
                paymentStatus: 'refunded',
                refundReceiptUrl: refundReceiptBase64,
                refundAmount: refundAmt,
                refundReason: refundReasonInput || 'Monetary refund issued',
                refundedAt: refundedAtIso,
                refundedBy: refundedByInfo,
              };
            }
            return b;
          });
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }

        setBookings((prev) =>
          prev.map((b) =>
            b.id === refundModalBooking.id
              ? {
                  ...b,
                  status: 'cancelled',
                  paymentStatus: 'refunded',
                  refundReceiptUrl: refundReceiptBase64,
                  refundAmount: refundAmt,
                  refundReason: refundReasonInput || 'Monetary refund issued',
                  refundedAt: refundedAtIso,
                  refundedBy: refundedByInfo,
                }
              : b
          )
        );

        sendRefundConfirmationEmail({
          bookingId: refundModalBooking.id,
          bookingReference: refundModalBooking.bookingReference || refundModalBooking.id,
          courtName: refundModalBooking.courtName || 'Court',
          date: refundModalBooking.date || '',
          slots: refundModalBooking.slots || [],
          totalCost: refundModalBooking.totalCost || 0,
          refundAmount: refundAmt,
          refundReason: refundReasonInput,
          userEmail: refundModalBooking.user?.email || '',
          userName: refundModalBooking.user?.name || 'Valued Player',
          ownerCompanyName,
          ownerCompanyAddress,
          ownerEmail,
          ownerPhone,
        }).catch((err) => console.warn('Automated refund email dispatch failed:', err));

      } else if (cancellationResolutionMode === 'voucher') {
        // Mode 2: Issue Credit Voucher for Rebooking
        const voucherCode = `CREDIT-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;
        const expiryDate = new Date();
        const validityDays = Number(refundVoucherExpiryDays) || 30;
        expiryDate.setDate(expiryDate.getDate() + validityDays);

        const targetCourt = courts.find(c => c.id === refundModalBooking.courtId);
        const resolvedCompanyId = refundModalBooking.companyId || targetCourt?.companyId || '';
        const resolvedCompanyName = ownerCompanyName || targetCourt?.ownerCompanyName || refundModalBooking.courtName || 'PicklePoint Venue';

        const voucherPayload: Voucher = {
          id: 'v-' + Date.now(),
          code: voucherCode,
          type: 'cancellation_credit',
          discountType: 'fixed_amount',
          discountValue: refundAmt,
          maxUses: 1,
          usedCount: 0,
          status: 'active',
          companyId: resolvedCompanyId || undefined,
          companyName: resolvedCompanyName,
          courtId: refundModalBooking.courtId,
          ownerId: targetCourt?.ownerId || refundModalBooking.courtOwnerId || currentUserUid,
          expiryDate: expiryDate.toISOString().split('T')[0],
          createdAt: refundedAtIso,
          issuedToEmail: refundModalBooking.user?.email,
          issuedToName: refundModalBooking.user?.name,
        };

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'vouchers', voucherPayload.id), JSON.parse(JSON.stringify(voucherPayload)));
            const bookingRef = doc(db, 'bookings', refundModalBooking.id);
            await updateDoc(bookingRef, {
              status: 'cancelled',
              paymentStatus: 'rebooking_credit',
              refundAmount: refundAmt,
              refundReason: `Credit Voucher Issued: ${voucherCode}`,
              refundedAt: refundedAtIso,
              refundedBy: refundedByInfo,
            });
          } catch (cloudErr) {
            console.warn('Firestore write failed for voucher issuance (check security rules), storing locally:', cloudErr);
          }
        }

        // Always dual-write to localStorage for instant local availability
        const vStr = localStorage.getItem('picklepoint_vouchers');
        const localV = vStr ? JSON.parse(vStr) : [];
        localV.unshift(voucherPayload);
        localStorage.setItem('picklepoint_vouchers', JSON.stringify(localV));

        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.map((b: Booking) => {
            if (b.bookingId === refundModalBooking.id || b.id === refundModalBooking.id) {
              return {
                ...b,
                status: 'cancelled' as const,
                paymentStatus: 'rebooking_credit',
                refundAmount: refundAmt,
                refundReason: `Credit Voucher Issued: ${voucherCode}`,
                refundedAt: refundedAtIso,
                refundedBy: refundedByInfo,
              };
            }
            return b;
          });
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }

        setVouchers((prev) => [voucherPayload, ...prev]);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === refundModalBooking.id
              ? {
                  ...b,
                  status: 'cancelled',
                  paymentStatus: 'rebooking_credit',
                  refundAmount: refundAmt,
                  refundReason: `Credit Voucher Issued: ${voucherCode}`,
                  refundedAt: refundedAtIso,
                  refundedBy: refundedByInfo,
                }
              : b
          )
        );

        sendVoucherIssuedEmail({
          userEmail: refundModalBooking.user?.email || '',
          userName: refundModalBooking.user?.name || 'Valued Player',
          voucherCode,
          discountText: `₱${refundAmt.toLocaleString()} Credit`,
          reasonText: `Rebooking credit for cancelled reservation #${refundModalBooking.bookingReference || refundModalBooking.id}.`,
          expiryDate: voucherPayload.expiryDate,
          companyName: voucherPayload.companyName,
        }).catch((err) => console.warn('Automated voucher email failed:', err));

      } else {
        // Mode 3: Cancel Without Refund (Non-refundable per policy)
        const finalReason = refundReasonInput.trim() || nonRefundableReason || 'Non-refundable cancellation per facility terms';

        if (isFirebaseConfigured && db) {
          try {
            const bookingRef = doc(db, 'bookings', refundModalBooking.id);
            await updateDoc(bookingRef, {
              status: 'cancelled',
              paymentStatus: 'cancelled_no_refund',
              refundAmount: 0,
              refundReason: finalReason,
              refundedAt: refundedAtIso,
              refundedBy: refundedByInfo,
            });
          } catch (cloudErr) {
            console.warn('Firestore update failed for cancellation (check security rules), storing locally:', cloudErr);
          }
        }

        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.map((b: Booking) => {
            if (b.bookingId === refundModalBooking.id || b.id === refundModalBooking.id) {
              return {
                ...b,
                status: 'cancelled' as const,
                paymentStatus: 'cancelled_no_refund',
                refundAmount: 0,
                refundReason: finalReason,
                refundedAt: refundedAtIso,
                refundedBy: refundedByInfo,
              };
            }
            return b;
          });
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }

        setBookings((prev) =>
          prev.map((b) =>
            b.id === refundModalBooking.id
              ? {
                  ...b,
                  status: 'cancelled',
                  paymentStatus: 'cancelled_no_refund',
                  refundAmount: 0,
                  refundReason: finalReason,
                  refundedAt: refundedAtIso,
                  refundedBy: refundedByInfo,
                }
              : b
          )
        );

        sendNonRefundableCancellationEmail({
          bookingId: refundModalBooking.id,
          bookingReference: refundModalBooking.bookingReference || refundModalBooking.id,
          courtName: refundModalBooking.courtName || 'Court',
          date: refundModalBooking.date || '',
          slots: refundModalBooking.slots || [],
          totalCost: refundModalBooking.totalCost || 0,
          cancellationReason: finalReason,
          userEmail: refundModalBooking.user?.email || '',
          userName: refundModalBooking.user?.name || 'Valued Player',
          ownerCompanyName,
          ownerCompanyAddress,
          ownerEmail,
          ownerPhone,
        }).catch((err) => console.warn('Automated cancellation email failed:', err));
      }

      // Close modal and reset state
      setRefundModalBooking(null);
      setRefundAmountInput('');
      setRefundReasonInput('');
      setRefundReceiptFile(null);
      setRefundReceiptBase64('');
      setRefundReceiptName('');
    } catch (err) {
      console.error('Failed to process cancellation resolution:', err);
      setRefundError('Failed to process resolution. Please try again.');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleConfirmRejectCheckout = async () => {
    if (!rejectCheckoutModalBooking) return;

    let finalReason = '';
    if (rejectReasonOption === 'invalid_ref') {
      finalReason = 'GCash Reference Number is invalid or not found on bank statement.';
    } else if (rejectReasonOption === 'unclear_receipt') {
      finalReason = 'Uploaded payment receipt screenshot is blurry, cut off, or illegible.';
    } else if (rejectReasonOption === 'amount_mismatch') {
      finalReason = 'Transferred amount does not match the required court reservation cost.';
    } else if (rejectReasonOption === 'payment_not_received') {
      finalReason = 'Payment proof could not be verified in the venue GCash account.';
    } else {
      finalReason = rejectCustomReason.trim() || 'Transaction proof was rejected by the venue administrator.';
    }

    setRejectCheckoutSubmitting(true);
    const targetBooking = rejectCheckoutModalBooking;

    try {
      if (isFirebaseConfigured && db) {
        const bookingRef = doc(db, 'bookings', targetBooking.id);
        await updateDoc(bookingRef, {
          status: 'cancelled',
          paymentStatus: 'failed',
          rejectionReason: finalReason,
          rejectedAt: new Date().toISOString(),
          rejectedBy: user?.email || 'Admin',
        });
      } else {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.map((b: Booking) => {
            if (b.bookingId === targetBooking.id || b.id === targetBooking.id) {
              return {
                ...b,
                status: 'cancelled',
                paymentStatus: 'failed',
                rejectionReason: finalReason,
                rejectedAt: new Date().toISOString(),
                rejectedBy: user?.email || 'Admin',
              };
            }
            return b;
          });
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === targetBooking.id || b.bookingId === targetBooking.id
            ? {
                ...b,
                status: 'cancelled',
                paymentStatus: 'failed',
                rejectionReason: finalReason,
              }
            : b
        )
      );

      // Send rejection / cancellation email if enabled
      if (rejectSendEmail && targetBooking.user?.email) {
        const targetCourt = courts.find(
          (c) => c.id === targetBooking.courtId || c.name === targetBooking.courtName
        );
        const ownerCompanyName =
          targetCourt?.ownerCompanyName ||
          (targetBooking as any).ownerCompanyName ||
          myCompany?.name ||
          'PicklePoint Venue';
        const ownerCompanyAddress =
          targetCourt?.companyAddress ||
          targetCourt?.location ||
          (targetBooking as any).ownerCompanyAddress ||
          myCompany?.address ||
          'Venue Location On File';
        const ownerEmail = targetCourt?.ownerEmail || (targetBooking as any).ownerEmail || myCompany?.clientAdminEmail;
        const ownerPhone = targetCourt?.ownerPhone || (targetBooking as any).ownerPhone;

        sendNonRefundableCancellationEmail({
          bookingId: targetBooking.id,
          bookingReference: targetBooking.bookingReference || targetBooking.id,
          courtName: targetBooking.courtName || 'Court',
          date: targetBooking.date || '',
          slots: targetBooking.slots || [],
          totalCost: targetBooking.totalCost || 0,
          cancellationReason: `Payment Verification Rejected: ${finalReason}`,
          userEmail: targetBooking.user.email,
          userName: targetBooking.user.name || 'Valued Player',
          ownerCompanyName,
          ownerCompanyAddress,
          ownerEmail,
          ownerPhone,
        }).catch((err) => console.warn('Automated checkout rejection email failed:', err));
      }

      setRejectCheckoutModalBooking(null);
      setRejectSuccessAlert(
        `Reservation #${targetBooking.bookingReference || targetBooking.id} has been rejected and cancelled.${
          rejectSendEmail && targetBooking.user?.email ? ` A cancellation notice with reasons was emailed to ${targetBooking.user.email}.` : ''
        }`
      );
    } catch (err) {
      console.error('Failed to reject checkout payment:', err);
      alert('Failed to reject checkout payment. Please try again.');
    } finally {
      setRejectCheckoutSubmitting(false);
    }
  };

  const handleOpenDeleteBooking = (booking: Booking) => {
    if (booking.status === 'approved') {
      return;
    }
    setBookingToDelete(booking);
    setBookingDeleteError(null);
    setDeleteBookingModalOpen(true);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    const bookingId = bookingToDelete.id;
    setBookingDeleteLoading(true);
    setBookingDeleteError(null);
    try {
      if (isFirebaseConfigured && db) {
        const bookingRef = doc(db, 'bookings', bookingId);
        await deleteDoc(bookingRef);
      } else {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.filter((b: Booking) => b.bookingId !== bookingId && b.id !== bookingId);
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }
      }
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setDeleteBookingModalOpen(false);
      setBookingToDelete(null);
    } catch (err) {
      console.error('Failed to delete booking:', err);
      setBookingDeleteError((err as Error).message || 'Failed to delete reservation');
    } finally {
      setBookingDeleteLoading(false);
    }
  };

  const handleOpenEdit = (booking: Booking) => {
    if (isPastBookingDate(booking.date)) {
      alert('Past reservations cannot be edited.');
      return;
    }
    setEditingBooking(booking);
    setEditDate(booking.date);
    setEditSlots(booking.slots);
    setEditStatus(booking.status);
  };

  const handleToggleEditSlot = (slotTime: string) => {
    if (!editingBooking) return;
    const isOccupied = bookings.some(
      (b) =>
        b.id !== editingBooking.id &&
        b.bookingId !== editingBooking.id &&
        b.courtId === editingBooking.courtId &&
        b.date === editDate &&
        b.status !== 'cancelled' &&
        b.slots?.includes(slotTime)
    );
    if (isOccupied) return;

    setEditSlots((prev) =>
      prev.includes(slotTime)
        ? prev.filter((t) => t !== slotTime)
        : [...prev, slotTime]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingBooking) return;
    if (editSlots.length === 0) {
      alert('Please select at least one time slot.');
      return;
    }

    const isAnyConflict = editSlots.some((slotTime) =>
      bookings.some(
        (b) =>
          b.id !== editingBooking.id &&
          b.bookingId !== editingBooking.id &&
          b.courtId === editingBooking.courtId &&
          b.date === editDate &&
          b.status !== 'cancelled' &&
          b.slots?.includes(slotTime)
      )
    );
    if (isAnyConflict) {
      alert('One or more selected time slots are already reserved by another booking on this date.');
      return;
    }

    // Calculate new total cost based on slot prices
    const newTotalCost = editSlots.reduce((sum, slotTime) => {
      const slotObj = SLOTS.find((s) => s.time === slotTime);
      if (!slotObj) return sum;
      
      const bCourt = courts.find(c => c.id === editingBooking.courtId);
      const dayPrice = bCourt ? bCourt.dayPrice : 100;
      const nightPrice = bCourt ? bCourt.nightPrice : 150;
      const price = slotObj.startHour >= 18 ? nightPrice : dayPrice;
      
      return sum + price;
    }, 0);

    setActionLoading(editingBooking.id);
    try {
      const updatedFields = {
        date: editDate,
        slots: [...editSlots].sort((a, b) => {
          const idxA = SLOTS.findIndex((s) => s.time === a);
          const idxB = SLOTS.findIndex((s) => s.time === b);
          return idxA - idxB;
        }),
        totalCost: newTotalCost,
        status: editStatus,
      };

      if (isFirebaseConfigured && db) {
        const bookingRef = doc(db, 'bookings', editingBooking.id);
        await updateDoc(bookingRef, updatedFields);
      } else {
        const bookingsStr = localStorage.getItem('picklepoint_bookings');
        if (bookingsStr) {
          const localBookings = JSON.parse(bookingsStr) as Booking[];
          const updated = localBookings.map((b: Booking) => {
            if (b.bookingId === editingBooking.id || b.id === editingBooking.id) {
              return { ...b, ...updatedFields };
            }
            return b;
          });
          localStorage.setItem('picklepoint_bookings', JSON.stringify(updated));
        }
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === editingBooking.id ? { ...b, ...updatedFields } : b))
      );
      setEditingBooking(null);
    } catch (err) {
      console.error('Failed to edit booking:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // User Role Management
  // @ts-ignore
  const _handleUpdateUserRole = async (userEmail: string, newRole: 'client_admin' | 'player' | 'super_admin', userUid?: string) => {
    if (userEmail.toLowerCase() === 'admin@picklepoint.com') {
      showModalAlert('Protected Account', "The primary admin account's role cannot be modified.", 'warning');
      return;
    }

    setActionLoading(userEmail);
    try {
      if (isFirebaseConfigured && db) {
        let uidToUse = userUid;
        if (!uidToUse) {
          const querySnapshot = await getDocs(collection(db, 'users'));
          querySnapshot.forEach((docSnap) => {
            if (docSnap.data().email?.toLowerCase() === userEmail.toLowerCase()) {
              uidToUse = docSnap.id;
            }
          });
        }
        
        if (uidToUse) {
          const userRef = doc(db, 'users', uidToUse);
          await updateDoc(userRef, { role: newRole });
        } else {
          throw new Error('User UID not found.');
        }
      } else {
        const usersStr = localStorage.getItem('picklepoint_users');
        if (usersStr) {
          const localUsers = JSON.parse(usersStr) as { name: string; email: string; role?: string }[];
          const updated = localUsers.map((u) => {
            if (u.email.toLowerCase() === userEmail.toLowerCase()) {
              return { ...u, role: newRole };
            }
            return u;
          });
          localStorage.setItem('picklepoint_users', JSON.stringify(updated));
        }
      }
      
      setUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === userEmail.toLowerCase() ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Failed to update user role:', err);
      showModalAlert('Update Failed', 'Failed to update user role: ' + (err as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // User Edit & Delete Handlers
  const handleOpenEditUser = (targetUser: UserAccount) => {
    if (targetUser.email.toLowerCase() === 'admin@picklepoint.com') {
      showModalAlert('Protected Account', "The primary system admin account details cannot be modified.", 'warning');
      return;
    }

    if (!isSuperAdmin && (targetUser.role === 'super_admin' || targetUser.role === 'client_admin')) {
      showModalAlert('Permission Notice', "Client Admins can only modify standard players.", 'warning');
      return;
    }

    setEditingUser(targetUser);
    setEditUserName(targetUser.name);
    setEditUserEmail(targetUser.email);
    setEditUserRole((targetUser.role as 'player' | 'client_admin' | 'super_admin') || 'player');
    setEditUserStatus(targetUser.status || (targetUser.isInvitedPending ? 'pending' : 'active'));
    setEditUserPhotoUrl(targetUser.photoUrl || targetUser.avatarUrl || '');
    setUserModalOpen(true);
  };

  const handleQuickToggleUserStatus = async (uidOrEmail: string, currentStatus?: string) => {
    const targetUser = users.find((u) => u.uid === uidOrEmail || u.email.toLowerCase() === uidOrEmail.toLowerCase());
    if (!targetUser) return;

    if (targetUser.email.toLowerCase() === 'admin@picklepoint.com') {
      showModalAlert('Protected Account', "The primary system admin account status cannot be modified.", 'warning');
      return;
    }

    if (!isSuperAdmin && (targetUser.role === 'super_admin' || targetUser.role === 'client_admin')) {
      showModalAlert('Permission Notice', "Client Admins can only modify standard players.", 'warning');
      return;
    }

    const nextStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    setActionLoading(targetUser.email);
    try {
      if (isFirebaseConfigured && db) {
        let uidToUse = targetUser.uid;
        if (!uidToUse) {
          const querySnapshot = await getDocs(collection(db, 'users'));
          querySnapshot.forEach((docSnap) => {
            if (docSnap.data().email?.toLowerCase() === targetUser.email.toLowerCase()) {
              uidToUse = docSnap.id;
            }
          });
        }

        if (uidToUse) {
          const userRef = doc(db, 'users', uidToUse);
          await updateDoc(userRef, { status: nextStatus });
        }
      }

      const usersStr = localStorage.getItem('picklepoint_users');
      if (usersStr) {
        const localUsers = JSON.parse(usersStr) as any[];
        const updated = localUsers.map((u) => {
          if (u.email.toLowerCase() === targetUser.email.toLowerCase()) {
            return { ...u, status: nextStatus };
          }
          return u;
        });
        localStorage.setItem('picklepoint_users', JSON.stringify(updated));
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === targetUser.email.toLowerCase()
            ? { ...u, status: nextStatus as any }
            : u
        )
      );
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      showModalAlert('Status Update Failed', 'Failed to update account status: ' + (err as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editUserName.trim() || !editUserEmail.trim()) {
      showModalAlert('Missing Details', "Please provide both name and email.", 'warning');
      return;
    }

    setActionLoading(editingUser.email);
    try {
      const finalRole = isSuperAdmin ? editUserRole : (editingUser.role || 'player');
      if (isFirebaseConfigured && db) {
        let uidToUse = editingUser.uid;
        if (!uidToUse) {
          const querySnapshot = await getDocs(collection(db, 'users'));
          querySnapshot.forEach((docSnap) => {
            if (docSnap.data().email?.toLowerCase() === editingUser.email.toLowerCase()) {
              uidToUse = docSnap.id;
            }
          });
        }

        if (uidToUse) {
          const userRef = doc(db, 'users', uidToUse);
          await updateDoc(userRef, {
            name: editUserName,
            email: editUserEmail,
            role: finalRole,
            status: editUserStatus,
            photoUrl: editUserPhotoUrl,
          });
        } else {
          throw new Error('User UID not found in database.');
        }
      } else {
        const usersStr = localStorage.getItem('picklepoint_users');
        if (usersStr) {
          const localUsers = JSON.parse(usersStr) as any[];
          const updated = localUsers.map((u) => {
            if (u.email.toLowerCase() === editingUser.email.toLowerCase()) {
              return {
                ...u,
                name: editUserName,
                email: editUserEmail,
                role: finalRole,
                status: editUserStatus,
                photoUrl: editUserPhotoUrl,
              };
            }
            return u;
          });
          localStorage.setItem('picklepoint_users', JSON.stringify(updated));
        }
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === editingUser.email.toLowerCase()
            ? { ...u, name: editUserName, email: editUserEmail, role: finalRole, status: editUserStatus, photoUrl: editUserPhotoUrl }
            : u
        )
      );

      setUserModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      showModalAlert('Update Failed', 'Failed to update user: ' + (err as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromptDeleteUser = (targetUser: UserAccount) => {
    if (targetUser.email.toLowerCase() === 'admin@picklepoint.com') {
      showModalAlert('Protected Account', "The primary system admin account cannot be deleted.", 'warning');
      return;
    }

    if (!isSuperAdmin && (targetUser.role === 'super_admin' || targetUser.role === 'client_admin')) {
      showModalAlert('Permission Notice', "Client Admins can only delete standard players.", 'warning');
      return;
    }

    setUserToDelete(targetUser);
    setDeleteUserModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.email);
    try {
      const targetEmailLower = userToDelete.email.toLowerCase();
      if (isFirebaseConfigured && db) {
        // Permanently hard delete all document entries matching this email or UID
        try {
          const querySnapshot = await getDocs(collection(db, 'users'));
          const docsToDelete: string[] = [];
          querySnapshot.forEach((docSnap) => {
            const dEmail = docSnap.data().email?.toLowerCase();
            if (dEmail === targetEmailLower || docSnap.id === userToDelete.uid) {
              docsToDelete.push(docSnap.id);
            }
          });

          for (const docId of docsToDelete) {
            try {
              await deleteDoc(doc(db, 'users', docId));
            } catch (delErr) {
              console.warn('Failed to delete user doc in Firestore:', docId, delErr);
            }
          }
        } catch (fErr) {
          console.error('Error deleting user from Firestore:', fErr);
        }
      }

      const usersStr = localStorage.getItem('picklepoint_users');
      if (usersStr) {
        const localUsers = JSON.parse(usersStr) as any[];
        const updated = localUsers.filter((u) => u.email?.toLowerCase() !== targetEmailLower);
        localStorage.setItem('picklepoint_users', JSON.stringify(updated));
      }

      setUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== targetEmailLower));
      setDeleteUserModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showModalAlert('Deletion Failed', 'Failed to delete user: ' + (err as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveManager = async (updatedManager: UserAccount) => {
    try {
      const targetEmailLower = updatedManager.email.toLowerCase();
      if (isFirebaseConfigured && db) {
        const currentDb = db;
        const querySnapshot = await getDocs(collection(currentDb, 'users'));
        let foundDocId: string | null = null;
        querySnapshot.forEach((docSnap) => {
          const dEmail = docSnap.data().email?.toLowerCase();
          if (dEmail === targetEmailLower || docSnap.id === updatedManager.uid) {
            foundDocId = docSnap.id;
          }
        });

        if (foundDocId) {
          await updateDoc(doc(currentDb, 'users', foundDocId), {
            name: updatedManager.name,
            role: updatedManager.role || 'manager',
            status: updatedManager.status || 'active',
            permissions: updatedManager.permissions || {},
          });
        }

        if (updatedManager.inviteToken || updatedManager.isInvitedPending) {
          const invToken = updatedManager.inviteToken || updatedManager.uid?.replace('invite-', '');
          if (invToken) {
            await updateDoc(doc(currentDb, 'invitations', invToken), {
              name: updatedManager.name,
              role: updatedManager.role || 'manager',
              status: updatedManager.status || 'pending',
              permissions: updatedManager.permissions || {},
            }).catch(() => {});
          }
        }
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === targetEmailLower
            ? {
                ...u,
                name: updatedManager.name,
                role: updatedManager.role || u.role,
                status: updatedManager.status || u.status,
                permissions: updatedManager.permissions || u.permissions,
              }
            : u
        )
      );

      showModalAlert('Staff Member Updated', `Staff member ${updatedManager.name || updatedManager.email} profile and permissions have been updated.`, 'success');
    } catch (err) {
      console.error('Failed to update manager:', err);
      showModalAlert('Update Failed', 'Failed to update manager: ' + (err as Error).message, 'error');
    }
  };

  const handleDeleteManager = async (managerToDelete: UserAccount) => {
    try {
      const targetEmailLower = managerToDelete.email.toLowerCase();
      if (isFirebaseConfigured && db) {
        const currentDb = db;
        const deletePromises: Promise<any>[] = [];

        // 1. Update/Create matching user document in /users (preserve full record with role: 'player')
        const querySnapshot = await getDocs(collection(currentDb, 'users'));
        let foundUserDoc = false;

        querySnapshot.forEach((docSnap) => {
          const dEmail = docSnap.data().email?.toLowerCase();
          if (dEmail === targetEmailLower || docSnap.id === managerToDelete.uid) {
            foundUserDoc = true;
            deletePromises.push(
              setDoc(doc(currentDb, 'users', docSnap.id), {
                status: 'active',
                role: 'player',
                companyId: '',
                companyName: '',
                permissions: {},
                isInvitedPending: false,
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(() => {})
            );
          }
        });

        // If no user document existed yet in /users (e.g. pending invited state), create one to preserve user data
        if (!foundUserDoc) {
          const userDocId = managerToDelete.uid && !managerToDelete.uid.startsWith('invite-') 
            ? managerToDelete.uid 
            : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          deletePromises.push(
            setDoc(doc(currentDb, 'users', userDocId), {
              uid: userDocId,
              name: managerToDelete.name || 'Player',
              email: targetEmailLower,
              role: 'player',
              status: 'active',
              companyId: '',
              companyName: '',
              permissions: {},
              isInvitedPending: false,
              createdAt: new Date().toISOString()
            }, { merge: true }).catch(() => {})
          );
        }

        // 2. Mark matching invitations in /invitations as 'revoked' (preserve audit record in Firestore)
        const invQuery = query(collection(currentDb, 'invitations'), where('email', '==', targetEmailLower));
        const invSnap = await getDocs(invQuery).catch(() => null);
        if (invSnap && !invSnap.empty) {
          invSnap.forEach((invDoc) => {
            deletePromises.push(
              updateDoc(doc(currentDb, 'invitations', invDoc.id), {
                status: 'revoked',
                revokedAt: new Date().toISOString()
              }).catch(() => {})
            );
          });
        }

        if (managerToDelete.inviteToken || managerToDelete.isInvitedPending) {
          const invToken = managerToDelete.inviteToken || managerToDelete.uid?.replace('invite-', '');
          if (invToken) {
            deletePromises.push(
              updateDoc(doc(currentDb, 'invitations', invToken), {
                status: 'revoked',
                revokedAt: new Date().toISOString()
              }).catch(() => {})
            );
          }
        }

        await Promise.all(deletePromises);
      }

      setUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== targetEmailLower));
      showModalAlert('Staff Member Removed', `Staff member ${managerToDelete.name || managerToDelete.email} manager privileges removed. Account updated to Player role.`, 'success');
    } catch (err) {
      console.error('Failed to remove manager:', err);
      showModalAlert('Deletion Failed', 'Failed to remove manager: ' + (err as Error).message, 'error');
    }
  };

  // Client Admin Secure Invitation Handlers
  const generateSecureInviteToken = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return 'sec-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
  };

  const handleOpenInviteClientAdmin = () => {
    setInviteEmailInput('');
    setInviteNameInput('');
    setInviteCustomMessage('');
    setInviteExpiryHours(48);
    setInviteSuccessInfo(null);
    setCopiedInviteLink(false);
    setInviteModalOpen(true);
  };

  const handleSendClientAdminInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = inviteEmailInput.trim().toLowerCase();
    if (!targetEmail) {
      showModalAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }

    const assignedRole = inviteRoleInput || (isSuperAdmin ? 'client_admin' : 'manager');
    const assignedCompany = effectiveOrgName || myCompany?.name || userObj?.companyName || 'Facility';
    const assignedCompanyId = myCompany?.id || (user as any)?.companyId || '';

    setInviteLoading(true);
    try {
      const token = generateSecureInviteToken();
      const expiresAt = new Date(Date.now() + inviteExpiryHours * 60 * 60 * 1000).toISOString();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const companyParam = encodeURIComponent(assignedCompany);
      const inviteUrl = `${origin}/?view=register&inviteToken=${token}&email=${encodeURIComponent(targetEmail)}&company=${companyParam}&role=${assignedRole}`;

      const inviteRecord: Record<string, any> = {
        token,
        email: targetEmail,
        role: assignedRole,
        company: assignedCompany,
        companyId: assignedCompanyId,
        status: 'pending',
        invitedBy: currentUserEmail || user?.email || 'admin@picklepoint.com',
        createdAt: new Date().toISOString(),
        expiresAt,
      };

      if (inviteNameInput.trim()) {
        inviteRecord.name = inviteNameInput.trim();
      }
      if (inviteCustomMessage.trim()) {
        inviteRecord.customMessage = inviteCustomMessage.trim();
      }

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'invitations', token), inviteRecord);
        } catch (fErr) {
          console.error('Error saving invitation to Firestore:', fErr);
          throw fErr;
        }
      }

      const invStr = localStorage.getItem('picklepoint_invitations');
      const localInvs = invStr ? JSON.parse(invStr) : [];
      localInvs.push(inviteRecord);
      localStorage.setItem('picklepoint_invitations', JSON.stringify(localInvs));

      // Send automated email notification
      await sendClientAdminInvitationEmail({
        toEmail: targetEmail,
        toName: inviteNameInput.trim() || undefined,
        inviteUrl,
        expiresAt,
        invitedBy: currentUserEmail || user?.email || 'Administrator',
        customMessage: inviteCustomMessage.trim() || undefined,
      });

      setInviteSuccessInfo({
        email: targetEmail,
        token,
        link: inviteUrl,
        expiresAt,
        role: assignedRole,
      });

      // Refresh users list immediately so the pending invitation appears
      await fetchData();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      showModalAlert('Invitation Error', 'Failed to send invitation: ' + (err as Error).message, 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyUserInviteLink = (u: UserAccount) => {
    if (!u.inviteToken) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const inviteUrl = `${origin}/?view=register&inviteToken=${u.inviteToken}&email=${encodeURIComponent(u.email)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteUserToken(u.inviteToken);
    setTimeout(() => setCopiedInviteUserToken(null), 2500);
    showModalAlert('Link Copied', 'Invite link copied to clipboard!', 'success');
  };

  const handleResendUserInviteEmail = async (u: UserAccount) => {
    if (!u.inviteToken) return;
    setActionLoading(u.email);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const inviteUrl = `${origin}/?view=register&inviteToken=${u.inviteToken}&email=${encodeURIComponent(u.email)}`;
      const expiresAt = u.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await sendClientAdminInvitationEmail({
        toEmail: u.email,
        toName: u.name !== 'Invited Client Admin' ? u.name : undefined,
        inviteUrl,
        expiresAt,
        invitedBy: currentUserEmail || 'Super Administrator',
        customMessage: u.customMessage,
      });

      showModalAlert('Invitation Sent', `Invitation email resent successfully to ${u.email}!`, 'success');
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      showModalAlert('Resend Failed', 'Failed to resend invitation: ' + (err as Error).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeUserInvite = async (u: UserAccount) => {
    showModalAlert(
      'Revoke Invitation',
      `Are you sure you want to revoke and delete the pending invitation for ${u.email}?`,
      'warning',
      'Yes, Revoke',
      async () => {
        setActionLoading(u.email);
        try {
          if (u.inviteToken && isFirebaseConfigured && db) {
            try {
              await updateDoc(doc(db, 'invitations', u.inviteToken), {
                status: 'revoked',
                revokedAt: new Date().toISOString()
              });
            } catch (fErr) {
              console.error('Error marking invitation revoked in Firestore:', fErr);
            }
          }

          // Remove from localStorage
          const invStr = localStorage.getItem('picklepoint_invitations');
          if (invStr) {
            const localInvs = JSON.parse(invStr);
            const updated = localInvs.filter((inv: any) => inv.token !== u.inviteToken && inv.email?.toLowerCase() !== u.email.toLowerCase());
            localStorage.setItem('picklepoint_invitations', JSON.stringify(updated));
          }

          setUsers((prev) => prev.filter((userItem) => userItem.email.toLowerCase() !== u.email.toLowerCase()));
        } catch (err) {
          console.error('Failed to revoke invitation:', err);
          showModalAlert('Revoke Failed', 'Failed to revoke invitation: ' + (err as Error).message, 'error');
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  // Company Management Handlers
  const handleOpenCreateCompany = () => {
    setEditingCompany(null);
    setCompanyNameInput('');
    setCompanyAddressInput('');
    setClientAdminEmailInput('');
    setCompanyStatusInput('pending');
    setCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (comp: Company) => {
    setEditingCompany(comp);
    setCompanyNameInput(comp.name);
    setCompanyAddressInput(comp.address);
    setClientAdminEmailInput(comp.clientAdminEmail);
    setCompanyStatusInput(comp.status || 'active');
    setCompanyModalOpen(true);
  };

  const handleQuickUpdateCompanyStatus = async (companyId: string, newStatus: 'pending' | 'active' | 'inactive') => {
    const targetCompany = companies.find((c) => c.id === companyId);
    if (!targetCompany) return;

    const updatedCompany: Company = {
      ...targetCompany,
      status: newStatus,
    };

    setActionLoading(companyId);
    try {
      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'companies', companyId), { status: newStatus });
        } catch (cloudErr) {
          console.warn('Firestore update company status failed, storing locally:', cloudErr);
        }
      }

      const compStr = localStorage.getItem('picklepoint_companies');
      if (compStr) {
        const localComps = JSON.parse(compStr) as Company[];
        const updated = localComps.map((c) => (c.id === companyId ? updatedCompany : c));
        localStorage.setItem('picklepoint_companies', JSON.stringify(updated));
      }

      setCompanies((prev) => prev.map((c) => (c.id === companyId ? updatedCompany : c)));

      // If approved to active, also activate associated client admin user
      if (newStatus === 'active' && targetCompany.clientAdminEmail) {
        const userEmail = targetCompany.clientAdminEmail.toLowerCase();
        const userObj = users.find((u) => u.email.toLowerCase() === userEmail);
        if (userObj && (userObj.status === 'pending' || userObj.isInvitedPending)) {
          if (isFirebaseConfigured && db && userObj.uid) {
            try {
              await updateDoc(doc(db, 'users', userObj.uid), { status: 'active', isInvitedPending: false });
            } catch (e) {}
          }
          const usersStr = localStorage.getItem('picklepoint_users');
          if (usersStr) {
            const localUsers = JSON.parse(usersStr) as any[];
            const updatedUsers = localUsers.map((u: any) =>
              u.email?.toLowerCase() === userEmail ? { ...u, status: 'active', isInvitedPending: false } : u
            );
            localStorage.setItem('picklepoint_users', JSON.stringify(updatedUsers));
          }
          setUsers((prev) =>
            prev.map((u) =>
              u.email?.toLowerCase() === userEmail ? { ...u, status: 'active', isInvitedPending: false } : u
            )
          );
        }

        sendCompanyApprovalEmail({
          companyName: targetCompany.name,
          companyAddress: targetCompany.address,
          clientAdminEmail: targetCompany.clientAdminEmail,
        }).catch((err) => console.warn('Automated company approval email failed:', err));
      }
    } catch (err) {
      console.error('Failed to update company status:', err);
      alert('Failed to update company status: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyNameInput.trim() || !companyAddressInput.trim() || !clientAdminEmailInput.trim()) {
      alert("Please complete all company fields.");
      return;
    }

    const compId = editingCompany ? editingCompany.id : 'comp-' + Date.now();
    const finalStatus = companyStatusInput || 'pending';
    const payload: Company = {
      id: compId,
      name: companyNameInput.trim(),
      address: companyAddressInput.trim(),
      clientAdminEmail: clientAdminEmailInput.trim().toLowerCase(),
      status: finalStatus,
      createdAt: editingCompany ? editingCompany.createdAt : new Date().toISOString(),
    };

    setActionLoading(compId);
    try {
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'companies', compId), payload);
        } catch (cloudErr) {
          console.warn('Firestore save company failed (check security rules), persisting locally:', cloudErr);
          const compStr = localStorage.getItem('picklepoint_companies');
          let localComps = (compStr ? JSON.parse(compStr) : []) as Company[];
          if (editingCompany) {
            localComps = localComps.map((c) => (c.id === compId ? payload : c));
          } else {
            localComps.push(payload);
          }
          localStorage.setItem('picklepoint_companies', JSON.stringify(localComps));
        }
      } else {
        const compStr = localStorage.getItem('picklepoint_companies');
        let localComps = (compStr ? JSON.parse(compStr) : []) as Company[];
        if (editingCompany) {
          localComps = localComps.map((c) => (c.id === compId ? payload : c));
        } else {
          localComps.push(payload);
        }
        localStorage.setItem('picklepoint_companies', JSON.stringify(localComps));
      }

      // Associate user in users collection (promote existing account or create pending user doc)
      const targetEmail = clientAdminEmailInput.trim().toLowerCase();
      let existingUser = users.find((u) => u.email.toLowerCase() === targetEmail);
      let targetUid = existingUser?.uid;

      if (isFirebaseConfigured && db) {
        try {
          const qSnap = await getDocs(collection(db, 'users'));
          let matchedRealDoc: any = null;
          let matchedInvitedDoc: any = null;
          const duplicateIdsToDelete: string[] = [];

          qSnap.forEach((dSnap) => {
            if (dSnap.data().email?.toLowerCase() === targetEmail) {
              if (dSnap.id.startsWith('invited-')) {
                if (!matchedInvitedDoc) {
                  matchedInvitedDoc = dSnap;
                } else {
                  duplicateIdsToDelete.push(dSnap.id);
                }
              } else {
                if (!matchedRealDoc) {
                  matchedRealDoc = dSnap;
                } else {
                  duplicateIdsToDelete.push(dSnap.id);
                }
              }
            }
          });

          // Delete any extra duplicate documents
          for (const dId of duplicateIdsToDelete) {
            deleteDoc(doc(db, 'users', dId)).catch(() => {});
          }

          if (matchedRealDoc) {
            targetUid = matchedRealDoc.id;
            const rData = matchedRealDoc.data();
            existingUser = {
              uid: matchedRealDoc.id,
              ...rData,
            } as UserAccount;
            if (matchedInvitedDoc) {
              deleteDoc(doc(db, 'users', matchedInvitedDoc.id)).catch(() => {});
            }
          } else if (matchedInvitedDoc) {
            targetUid = matchedInvitedDoc.id;
            const iData = matchedInvitedDoc.data();
            existingUser = {
              uid: matchedInvitedDoc.id,
              ...iData,
            } as UserAccount;
          }
        } catch (e) {
          console.warn('Error querying existing user in Firestore:', e);
        }
      }

      if (existingUser && targetUid) {
        const newRole = existingUser.role === 'super_admin' ? 'super_admin' : 'client_admin';
        const newStatus = finalStatus === 'active' ? 'active' : finalStatus === 'inactive' ? 'inactive' : 'pending';
        const updatedUserPayload: UserAccount = {
          ...existingUser,
          role: newRole,
          status: newStatus,
          companyId: compId,
          companyName: payload.name,
          isInvitedPending: newStatus === 'pending',
        };

        if (isFirebaseConfigured && db) {
          try {
            await updateDoc(doc(db, 'users', targetUid), {
              role: newRole,
              status: newStatus,
              companyId: compId,
              companyName: payload.name,
              isInvitedPending: newStatus === 'pending',
            });
          } catch (e) {
            console.warn('Could not update user company link in Firestore:', e);
          }
        }

        const usersStr = localStorage.getItem('picklepoint_users');
        const localUsers = (usersStr ? JSON.parse(usersStr) : []) as any[];
        const updatedLocal = localUsers.map((u: any) => u.email?.toLowerCase() === targetEmail ? { ...u, role: newRole, status: newStatus, companyId: compId, companyName: payload.name } : u);
        localStorage.setItem('picklepoint_users', JSON.stringify(updatedLocal));

        setUsers((prev) => prev.map((u) => u.email?.toLowerCase() === targetEmail ? updatedUserPayload : u));
      } else {
        // Create pending/active client admin record in users collection
        const pendingUid = 'invited-' + Date.now();
        const initialUserStatus = finalStatus === 'active' ? 'active' : 'pending';
        const pendingUserPayload = {
          uid: pendingUid,
          name: payload.name + ' Admin',
          email: targetEmail,
          role: 'client_admin',
          status: initialUserStatus,
          companyId: compId,
          companyName: payload.name,
          isInvitedPending: initialUserStatus === 'pending',
          createdAt: new Date().toISOString(),
        };

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'users', pendingUid), pendingUserPayload);
          } catch (e) {
            console.warn('Could not save pending user to Firestore:', e);
          }
        }

        const usersStr = localStorage.getItem('picklepoint_users');
        const localUsers = usersStr ? JSON.parse(usersStr) : [];
        if (!localUsers.some((u: any) => u.email?.toLowerCase() === targetEmail)) {
          localUsers.push(pendingUserPayload);
          localStorage.setItem('picklepoint_users', JSON.stringify(localUsers));
        }

        setUsers((prev) => [...prev, pendingUserPayload as UserAccount]);
      }

      if (!editingCompany) {
        sendCompanyInvitationEmail({
          companyName: payload.name,
          companyAddress: payload.address,
          clientAdminEmail: payload.clientAdminEmail,
          status: payload.status,
        }).catch((err) => console.warn('Automated company invitation email failed:', err));
      }

      if (editingCompany) {
        setCompanies((prev) => prev.map((c) => (c.id === compId ? payload : c)));
      } else {
        setCompanies((prev) => [...prev, payload]);
      }

      setCompanyModalOpen(false);
      setEditingCompany(null);
    } catch (err) {
      console.error('Failed to save company:', err);
      alert('Failed to save company: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    setActionLoading(companyId);
    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'companies', companyId));
      }
      
      const compStr = localStorage.getItem('picklepoint_companies');
      if (compStr) {
        const localComps = JSON.parse(compStr) as Company[];
        const updated = localComps.filter((c) => c.id !== companyId);
        localStorage.setItem('picklepoint_companies', JSON.stringify(updated));
      }

      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    } catch (err) {
      console.error('Failed to delete company from Firestore:', err);
      alert('Failed to delete company from cloud: ' + (err as Error).message + '\n\nPlease verify that your Firebase Security Rules for /companies collection have been published.');
      
      // Still update UI & local state if requested
      const compStr = localStorage.getItem('picklepoint_companies');
      if (compStr) {
        const localComps = JSON.parse(compStr) as Company[];
        const updated = localComps.filter((c) => c.id !== companyId);
        localStorage.setItem('picklepoint_companies', JSON.stringify(updated));
      }
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    } finally {
      setActionLoading(null);
    }
  };

  // Email Dispatch Handlers
  const handleOpenSendEmail = (toEmail: string, toName: string, defaultSubject?: string, defaultMessage?: string) => {
    setEmailToAddress(toEmail);
    setEmailToName(toName);
    setEmailSubjectInput(defaultSubject || `Notification from PicklePoint`);
    setEmailMessageInput(defaultMessage || `Hello ${toName},\n\n`);
    setEmailTemplateType('custom');
    setEmailModalOpen(true);
  };

  const handleTemplateChange = (type: 'custom' | 'approval' | 'cancellation' | 'reminder') => {
    setEmailTemplateType(type);
    if (type === 'approval') {
      setEmailSubjectInput(`Booking Approved - PicklePoint`);
      setEmailMessageInput(`Hello ${emailToName},\n\nGreat news! Your pickleball court reservation has been officially APPROVED and CONFIRMED.\n\nWe look forward to seeing you on the court!\n\nBest regards,\nPicklePoint Management`);
    } else if (type === 'cancellation') {
      setEmailSubjectInput(`Booking Status Update - PicklePoint`);
      setEmailMessageInput(`Hello ${emailToName},\n\nYour reservation status has been updated. If you have questions regarding refunds or rescheduling, please reply to this email.\n\nBest regards,\nPicklePoint Management`);
    } else if (type === 'reminder') {
      setEmailSubjectInput(`Reminder: Upcoming Pickleball Match`);
      setEmailMessageInput(`Hello ${emailToName},\n\nThis is a friendly reminder for your upcoming court reservation at PicklePoint.\n\nPlease arrive 10 minutes before your booked time slot. See you on the court!`);
    }
  };

  const handleDispatchEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToAddress || !emailSubjectInput || !emailMessageInput) {
      alert("Please complete all email fields.");
      return;
    }

    setEmailSendLoading(true);
    try {
      const res = await sendCustomUserEmail({
        toEmail: emailToAddress,
        toName: emailToName || 'Valued User',
        subject: emailSubjectInput,
        message: emailMessageInput,
      });

      alert(res.message);
      setEmailModalOpen(false);
    } catch (err) {
      console.error('Failed to send email:', err);
      alert('Failed to send email: ' + (err as Error).message);
    } finally {
      setEmailSendLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const img = new Image();
        img.src = base64String;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_width = 500;
          const scale = max_width / img.width;
          canvas.width = max_width;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setCourtImages((prev) => [...prev, compressedBase64]);
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = e.dataTransfer.files;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const img = new Image();
          img.src = base64String;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const max_width = 500;
            const scale = max_width / img.width;
            canvas.width = max_width;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
              setCourtImages((prev) => [...prev, compressedBase64]);
            }
          };
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // PSGC API cascading fetchers
  const fetchRegions = async () => {
    try {
      const res = await fetch('https://psgc.cloud/api/regions');
      const data = await res.json();
      setRegions(Array.isArray(data) && data.length > 0 ? data : REGIONS_FALLBACK);
    } catch (err) {
      console.error('Failed to fetch regions, using fallback:', err);
      setRegions(REGIONS_FALLBACK);
    }
  };

  const fetchCities = async (regionCode: string, provinceCode: string) => {
    if (!regionCode) {
      setCities([]);
      return;
    }
    try {
      const url = provinceCode 
        ? `https://psgc.cloud/api/provinces/${provinceCode}/cities-municipalities`
        : `https://psgc.cloud/api/regions/${regionCode}/cities-municipalities`;
      const res = await fetch(url);
      const data = await res.json();
      setCities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
      setCities([]);
    }
  };

  const fetchBarangays = async (cityCode: string) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    try {
      const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${cityCode}/barangays`);
      const data = await res.json();
      setBarangays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch barangays:', err);
      setBarangays([]);
    }
  };

  const handleRegionChange = async (code: string) => {
    setSelectedRegion(code);
    const regionObj = regions.find(r => r.code === code);
    setRegionName(regionObj ? regionObj.name : '');
    
    setSelectedProvince('');
    setProvinceName('');
    setSelectedCity('');
    setCityName('');
    setSelectedBarangay('');
    setBarangayName('');
    
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    
    if (code) {
      try {
        const resProv = await fetch(`https://psgc.cloud/api/regions/${code}/provinces`);
        const provs = await resProv.json();
        const hasProvinces = Array.isArray(provs) && provs.length > 0;
        setProvinces(hasProvinces ? provs : []);
        
        if (!hasProvinces) {
          const resCities = await fetch(`https://psgc.cloud/api/regions/${code}/cities-municipalities`);
          const cts = await resCities.json();
          setCities(Array.isArray(cts) ? cts : []);
        }
      } catch (err) {
        console.error('Error fetching provinces:', err);
      }
    }
  };

  const handleProvinceChange = async (code: string) => {
    setSelectedProvince(code);
    const provObj = provinces.find(p => p.code === code);
    setProvinceName(provObj ? provObj.name : '');
    
    setSelectedCity('');
    setCityName('');
    setSelectedBarangay('');
    setBarangayName('');
    
    setCities([]);
    setBarangays([]);
    
    if (code) {
      fetchCities(selectedRegion, code);
    }
  };

  const handleCityChange = async (code: string) => {
    setSelectedCity(code);
    const cityObj = cities.find(c => c.code === code);
    setCityName(cityObj ? cityObj.name : '');
    
    setSelectedBarangay('');
    setBarangayName('');
    
    setBarangays([]);
    
    if (code) {
      fetchBarangays(code);
    }
  };

  const handleBarangayChange = (code: string) => {
    setSelectedBarangay(code);
    const brgyObj = barangays.find(b => b.code === code);
    setBarangayName(brgyObj ? brgyObj.name : '');
  };

  const [autofillAddressSuccess, setAutofillAddressSuccess] = useState(false);

  const handleAutofillFromCompanyAddress = async () => {
    if (!myCompany) {
      alert('No facility profile found. Please configure your company details in Settings.');
      return;
    }

    setCourtAddressLine1(myCompany.addressLine1 || '');
    setCourtAddressLine2(myCompany.addressLine2 || '');
    setCourtPostalCode(myCompany.postalCode || '');

    const targetRegion = myCompany.region || '';
    const targetProvince = myCompany.province || '';
    const targetCity = myCompany.municipality || '';
    const targetBarangay = myCompany.barangay || '';

    setRegionName(targetRegion);
    setProvinceName(targetProvince);
    setCityName(targetCity);
    setBarangayName(targetBarangay);

    setAutofillAddressSuccess(true);
    setTimeout(() => setAutofillAddressSuccess(false), 3000);

    try {
      const activeRegions = regions.length > 0 ? regions : REGIONS_FALLBACK;
      const matchReg = activeRegions.find(
        (r) => r.name.toLowerCase() === targetRegion.toLowerCase() || r.code === targetRegion
      );

      if (matchReg) {
        setSelectedRegion(matchReg.code);

        const resProv = await fetch(`https://psgc.cloud/api/regions/${matchReg.code}/provinces`);
        const provs = await resProv.json();
        const hasProvinces = Array.isArray(provs) && provs.length > 0;
        setProvinces(hasProvinces ? provs : []);

        let matchedProvCode = '';
        if (hasProvinces && targetProvince) {
          const matchProv = provs.find(
            (p: any) => p.name.toLowerCase() === targetProvince.toLowerCase() || p.code === targetProvince
          );
          if (matchProv) {
            setSelectedProvince(matchProv.code);
            matchedProvCode = matchProv.code;
          }
        }

        const urlCities = matchedProvCode
          ? `https://psgc.cloud/api/provinces/${matchedProvCode}/cities-municipalities`
          : `https://psgc.cloud/api/regions/${matchReg.code}/cities-municipalities`;

        const resCities = await fetch(urlCities);
        const cts = await resCities.json();
        if (Array.isArray(cts)) {
          setCities(cts);
          if (targetCity) {
            const matchCity = cts.find(
              (c: any) => c.name.toLowerCase() === targetCity.toLowerCase() || c.code === targetCity
            );
            if (matchCity) {
              setSelectedCity(matchCity.code);

              const resBrgy = await fetch(`https://psgc.cloud/api/cities-municipalities/${matchCity.code}/barangays`);
              const brgys = await resBrgy.json();
              if (Array.isArray(brgys)) {
                setBarangays(brgys);
                if (targetBarangay) {
                  const matchBrgy = brgys.find(
                    (b: any) => b.name.toLowerCase() === targetBarangay.toLowerCase() || b.code === targetBarangay
                  );
                  if (matchBrgy) {
                    setSelectedBarangay(matchBrgy.code);
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error autofilling PSGC address from company:', e);
    }
  };

  // Court Actions
  const handleOpenCreateCourt = () => {
    if (isSuperAdmin) {
      alert("Super Admins cannot create courts. Courts are created by Client Admins.");
      return;
    }
    setEditingCourt(null);
    setCourtName('');
    setCourtType('Premium Indoor Plexicushion');
    setCourtDayPrice(100);
    setCourtNightPrice(150);
    setCourtMapUrl('');
    setCourtLatitude(null);
    setCourtLongitude(null);
    setCourtImages([]);
    setCourtAddressLine1('');
    setCourtAddressLine2('');
    setCourtCountry('Philippines');
    setCourtPostalCode('');
    setCourtRentals([]);
    setCourtGcashAccountId('');
    setCourtPublished(false);

    setSelectedRegion('');
    setRegionName('');
    setSelectedProvince('');
    setProvinceName('');
    setSelectedCity('');
    setCityName('');
    setSelectedBarangay('');
    setBarangayName('');
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setCourtFormError('');
    
    setCourtModalOpen(true);
    fetchRegions();
  };

  const handleOpenEditCourt = async (court: Court) => {
    setEditingCourt(court);
    setCourtName(court.name);
    setCourtType(court.type);
    setCourtDayPrice(court.dayPrice);
    setCourtNightPrice(court.nightPrice);
    setCourtMapUrl(court.mapUrl || '');
    
    let initialLat = court.latitude ?? null;
    let initialLng = court.longitude ?? null;
    if (initialLat === null || initialLng === null) {
      const parsed = parseGoogleMapsUrl(court.mapUrl || '');
      if (parsed.coordinates) {
        initialLat = parsed.coordinates.lat;
        initialLng = parsed.coordinates.lng;
      }
    }
    setCourtLatitude(initialLat);
    setCourtLongitude(initialLng);

    setCourtImages(court.images || []);
    setCourtAddressLine1(court.addressLine1 || '');
    setCourtAddressLine2(court.addressLine2 || '');
    setCourtCountry(court.country || 'Philippines');
    setCourtPostalCode(court.postalCode || '');
    setCourtRentals(court.rentals || []);
    setCourtGcashAccountId(court.gcashAccountId || '');
    setCourtPublished(court.published !== false);

    setSelectedRegion('');
    setRegionName(court.region || '');
    setSelectedProvince('');
    setProvinceName(court.province || '');
    setSelectedCity('');
    setCityName(court.municipality || '');
    setSelectedBarangay('');
    setBarangayName(court.barangay || '');
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setCourtFormError('');

    setCourtModalOpen(true);

    try {
      const resReg = await fetch('https://psgc.cloud/api/regions');
      const regs = await resReg.json();
      if (Array.isArray(regs)) {
        setRegions(regs);
        const matchReg = regs.find(r => r.name.toLowerCase() === court.region?.toLowerCase());
        if (matchReg) {
          setSelectedRegion(matchReg.code);
          
          const resProv = await fetch(`https://psgc.cloud/api/regions/${matchReg.code}/provinces`);
          const provs = await resProv.json();
          const hasProvinces = Array.isArray(provs) && provs.length > 0;
          setProvinces(hasProvinces ? provs : []);
          
          let matchedProvCode = '';
          if (hasProvinces) {
            const matchProv = provs.find(p => p.name.toLowerCase() === court.province?.toLowerCase());
            if (matchProv) {
              setSelectedProvince(matchProv.code);
              matchedProvCode = matchProv.code;
            }
          }
          
          const urlCities = matchedProvCode 
            ? `https://psgc.cloud/api/provinces/${matchedProvCode}/cities-municipalities`
            : `https://psgc.cloud/api/regions/${matchReg.code}/cities-municipalities`;
          const resCities = await fetch(urlCities);
          const cts = await resCities.json();
          if (Array.isArray(cts)) {
            setCities(cts);
            const matchCity = cts.find(c => c.name.toLowerCase() === court.municipality?.toLowerCase());
            if (matchCity) {
              setSelectedCity(matchCity.code);
              
              const resBrgy = await fetch(`https://psgc.cloud/api/cities-municipalities/${matchCity.code}/barangays`);
              const brgys = await resBrgy.json();
              if (Array.isArray(brgys)) {
                setBarangays(brgys);
                const matchBrgy = brgys.find(b => b.name.toLowerCase() === court.barangay?.toLowerCase());
                if (matchBrgy) {
                  setSelectedBarangay(matchBrgy.code);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error preloading PSGC address values:', e);
    }
  };

  const handleSaveCourt = async () => {
    setCourtFormError('');

    if (!courtName.trim()) {
      setCourtFormError('Court Name is required.');
      return;
    }
    if (!courtType.trim()) {
      setCourtFormError('Court Description / Surface Type is required.');
      return;
    }
    if (!selectedRegion) {
      setCourtFormError('Region is required.');
      return;
    }
    if (!cityName.trim()) {
      setCourtFormError('Municipality / City is required.');
      return;
    }
    if (!barangayName.trim()) {
      setCourtFormError('Barangay is required.');
      return;
    }
    if (!courtAddressLine1.trim()) {
      setCourtFormError('Street Address is required.');
      return;
    }
    if (!courtPostalCode.trim()) {
      setCourtFormError('Postal Code is required.');
      return;
    }
    if (!courtMapUrl.trim()) {
      setCourtFormError('Google Maps Pin Link / Embed Code is required.');
      return;
    }

    setLoading(true);
    try {
      const ownerId = user?.uid || 'system';
      
      const addressParts = [
        courtAddressLine1.trim(),
        courtAddressLine2.trim(),
        barangayName ? `Brgy. ${barangayName}` : '',
        cityName,
        provinceName,
        regionName,
        courtPostalCode.trim(),
        courtCountry.trim()
      ].filter(Boolean);
      
      const constructedLocation = addressParts.join(', ');

      // Sanitize rentals: remove any undefined fields inside each rental item
      const sanitizedRentals = courtRentals.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        price: Number(r.price) || 0,
        pricingType: r.pricingType,
        quantity: Number(r.quantity) || 0,
        enabled: r.enabled,
        images: Array.isArray(r.images) ? r.images : []
      }));

      const resolvedCourtCompanyName = effectiveOrgName || (editingCourt?.ownerCompanyName && editingCourt.ownerCompanyName !== editingCourt.name ? editingCourt.ownerCompanyName : (companies.length > 0 ? companies[0].name : 'PicklePoint Venue'));
      const resolvedCourtCompanyAddress = effectiveOrgAddress || editingCourt?.companyAddress || constructedLocation;
      const resolvedCourtEmail = myCompany?.clientAdminEmail || editingCourt?.ownerEmail || currentUserEmail || '';
      const resolvedCourtPhone = myCompany?.phone || editingCourt?.ownerPhone || '';

      const resolvedLat = courtLatitude !== null ? courtLatitude : (parsedCourtMap.coordinates ? parsedCourtMap.coordinates.lat : undefined);
      const resolvedLng = courtLongitude !== null ? courtLongitude : (parsedCourtMap.coordinates ? parsedCourtMap.coordinates.lng : undefined);
      const finalMapUrl = courtMapUrl.trim() || (resolvedLat && resolvedLng ? `https://www.google.com/maps?q=${resolvedLat},${resolvedLng}` : '');

      const courtPayload = {
        name: courtName.trim(),
        type: courtType.trim(),
        dayPrice: Number(courtDayPrice) || 0,
        nightPrice: Number(courtNightPrice) || 0,
        location: constructedLocation,
        mapUrl: finalMapUrl,
        latitude: resolvedLat,
        longitude: resolvedLng,
        images: Array.isArray(courtImages) ? courtImages : [],
        addressLine1: courtAddressLine1.trim(),
        addressLine2: courtAddressLine2.trim() || '',
        barangay: barangayName || '',
        municipality: cityName || '',
        province: provinceName || '',
        region: regionName || '',
        country: courtCountry.trim() || 'Philippines',
        postalCode: courtPostalCode.trim() || '',
        rentals: sanitizedRentals,
        ownerId: editingCourt ? (editingCourt.ownerId || ownerId) : ownerId,
        ownerCompanyName: resolvedCourtCompanyName,
        companyAddress: resolvedCourtCompanyAddress,
        ownerEmail: resolvedCourtEmail,
        ownerPhone: resolvedCourtPhone,
        gcashAccountId: courtGcashAccountId,
        published: courtPublished,
        createdAt: editingCourt ? (editingCourt.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      const courtId = editingCourt ? editingCourt.id : ('court-' + Math.random().toString(36).substring(2, 9));
      const finalCourtPayload: Court = {
        ...courtPayload,
        id: courtId,
      };

      console.log('[handleSaveCourt] payload:', finalCourtPayload);

      if (isFirebaseConfigured && db) {
        try {
          if (editingCourt) {
            const courtRef = doc(db, 'courts', editingCourt.id);
            await updateDoc(courtRef, courtPayload);
          } else {
            const courtRef = doc(db, 'courts', courtId);
            await setDoc(courtRef, finalCourtPayload);
          }
        } catch (cloudErr) {
          console.warn('Firestore court write failed (check security rules), storing locally:', cloudErr);
        }
      }

      // Always sync local storage and component state
      const courtsStr = localStorage.getItem('picklepoint_courts');
      const localCourts = (courtsStr ? JSON.parse(courtsStr) : []) as Court[];
      
      if (editingCourt) {
        const updated = localCourts.map((c: Court) => {
          if (c.id === editingCourt.id) {
            return { ...c, ...finalCourtPayload };
          }
          return c;
        });
        localStorage.setItem('picklepoint_courts', JSON.stringify(updated));
        setCourts(prev => prev.map(c => c.id === editingCourt.id ? { ...c, ...finalCourtPayload } : c));
      } else {
        localCourts.push(finalCourtPayload);
        localStorage.setItem('picklepoint_courts', JSON.stringify(localCourts));
        setCourts(prev => [...prev, finalCourtPayload]);
      }

      setCourtModalOpen(false);
      setEditingCourt(null);
    } catch (err) {
      console.error('Error saving court:', err);
      alert('Failed to save court: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteCourt = (court: Court) => {
    setCourtToDelete(court);
    setCourtDeleteError(null);
    setDeleteCourtModalOpen(true);
  };

  const handleConfirmDeleteCourt = async () => {
    if (!courtToDelete) return;
    const courtId = courtToDelete.id;
    setCourtDeleteLoading(true);
    setCourtDeleteError(null);
    try {
      if (isFirebaseConfigured && db) {
        const courtRef = doc(db, 'courts', courtId);
        await deleteDoc(courtRef);
      } else {
        const courtsStr = localStorage.getItem('picklepoint_courts');
        if (courtsStr) {
          const localCourts = JSON.parse(courtsStr) as Court[];
          const updated = localCourts.filter(c => c.id !== courtId);
          localStorage.setItem('picklepoint_courts', JSON.stringify(updated));
        }
      }
      setCourts(prev => prev.filter(c => c.id !== courtId));
      setDeleteCourtModalOpen(false);
      setCourtToDelete(null);
    } catch (err) {
      console.error('Error deleting court:', err);
      setCourtDeleteError((err as Error).message || 'Failed to delete court');
    } finally {
      setCourtDeleteLoading(false);
    }
  };

  const handleTogglePublishCourt = async (court: Court) => {
    setActionLoading(court.id);
    try {
      const newStatus = court.published !== false ? false : true;
      if (isFirebaseConfigured && db) {
        const courtRef = doc(db, 'courts', court.id);
        await updateDoc(courtRef, { published: newStatus });
      } else {
        const courtsStr = localStorage.getItem('picklepoint_courts');
        if (courtsStr) {
          const localCourts = JSON.parse(courtsStr) as Court[];
          const updated = localCourts.map((c: Court) => {
            if (c.id === court.id) {
              return { ...c, published: newStatus };
            }
            return c;
          });
          localStorage.setItem('picklepoint_courts', JSON.stringify(updated));
        }
      }
      setCourts(prev => prev.map(c => c.id === court.id ? { ...c, published: newStatus } : c));
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
      alert('Failed to update publish status: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // Rental Item Actions
  const handleOpenCreateRental = () => {
    setEditingRental(null);
    setRentalName('');
    setRentalDescription('');
    setRentalPrice(80);
    setRentalPricingType('per_booking');
    setRentalQuantity(20);
    setRentalEnabled(true);
    setRentalImages([]);
    setRentalModalOpen(true);
  };

  const handleOpenEditRental = (item: RentalItem) => {
    setEditingRental(item);
    setRentalName(item.name);
    setRentalDescription(item.description || '');
    setRentalPrice(item.price);
    setRentalPricingType(item.pricingType);
    setRentalQuantity(item.quantity);
    setRentalEnabled(item.enabled);
    setRentalImages(item.images || []);
    setRentalModalOpen(true);
  };

  const handleSaveRental = () => {
    if (!rentalName.trim()) {
      alert('Rental Item Name is required.');
      return;
    }

    const payload: RentalItem = {
      id: editingRental ? editingRental.id : 'rental-' + Math.random().toString(36).substring(2, 9),
      name: rentalName.trim(),
      description: rentalDescription.trim() || '',
      price: Number(rentalPrice) || 0,
      pricingType: rentalPricingType,
      quantity: Number(rentalQuantity) || 0,
      enabled: rentalEnabled,
      images: rentalImages
    };

    if (editingRental) {
      setCourtRentals(prev => prev.map(r => r.id === editingRental.id ? payload : r));
    } else {
      setCourtRentals(prev => [...prev, payload]);
    }

    setRentalModalOpen(false);
  };

  // Rental image upload helpers
  const processRentalImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 500;
        const scale = max_width / img.width;
        canvas.width = max_width;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setRentalImages(prev => [...prev, compressed]);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRentalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(processRentalImageFile);
  };

  const handleRentalDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setRentalDragActive(true);
    } else if (e.type === 'dragleave') {
      setRentalDragActive(false);
    }
  };

  const handleRentalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRentalDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach(processRentalImageFile);
    }
  };

  const handleRentalSetCover = (index: number) => {
    setRentalImages(prev => {
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      return [target, ...copy];
    });
  };

  const handleRentalImagesDropped = (draggedIndex: number, hoverIndex: number) => {
    if (draggedIndex === hoverIndex) return;
    setRentalImages(prev => {
      const copy = [...prev];
      const [target] = copy.splice(draggedIndex, 1);
      copy.splice(hoverIndex, 0, target);
      return copy;
    });
  };

  const handleDeleteRental = (id: string) => {
    if (confirm('Are you sure you want to delete this rental item?')) {
      setCourtRentals(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleToggleRentalEnabled = (id: string) => {
    setCourtRentals(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  // Image actions: Set cover, Reorder, drag drop
  const handleSetCoverImage = (index: number) => {
    setCourtImages(prev => {
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      return [target, ...copy];
    });
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= courtImages.length) return;
    setCourtImages(prev => {
      const copy = [...prev];
      const [target] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, target);
      return copy;
    });
  };

  const handleImagesDropped = (draggedIndex: number, hoverIndex: number) => {
    if (draggedIndex === hoverIndex) return;
    setCourtImages(prev => {
      const copy = [...prev];
      const [target] = copy.splice(draggedIndex, 1);
      copy.splice(hoverIndex, 0, target);
      return copy;
    });
  };

  // Metrics Calculations
  const approvedBookings = bookings.filter((b) => b.status === 'approved');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  
  const totalRevenue = approvedBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
  
  // Utilization rate: percentage of slots booked out of total operating slots for all dates present in the list
  // Operating capacity: 17 slots per day
  const uniqueDatesCount = new Set(bookings.map((b) => b.date).filter(Boolean)).size || 1;
  const totalAvailableCapacity = uniqueDatesCount * (SLOTS?.length || 17);
  const totalBookedSlotsCount = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.slots?.length || 0), 0);
  const utilizationRate = Math.min(
    100,
    Math.round((totalBookedSlotsCount / totalAvailableCapacity) * 100) || 0
  );

  // Filter and Search Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (b.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (b.date?.includes(searchQuery) ?? false);

    const matchesStatus = statusFilter === 'all' ? true : b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter Courts
  const filteredCourts = courts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesOwner = isSuperAdmin || availableAdminCourts.some(ac => ac.id === c.id);
    return matchesSearch && matchesOwner;
  });

  const associatedPlayerEmails = new Set([
    ...bookings.map((b) => b.user?.email?.toLowerCase()).filter(Boolean),
    ...openPlayRegistrations.map((r) => (r.playerEmail || r.userEmail || r.primaryPlayerEmail)?.toLowerCase()).filter(Boolean)
  ]);

  const scopedUsers = users.filter((u) => {
    if (isSuperAdmin) return true;
    const isStandardPlayer = !u.role || u.role === 'player' || u.role === 'user';
    const isAssociated = associatedPlayerEmails.has(u.email?.toLowerCase());
    return isStandardPlayer && isAssociated;
  });

  const filteredUsers = scopedUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const uRole = u.role || 'player';
    const matchesRole =
      userRoleFilter === 'all'
        ? true
        : userRoleFilter === 'player'
        ? uRole === 'player'
        : uRole === userRoleFilter;

    const uStatus = u.status || (u.isInvitedPending ? 'pending' : 'active');
    const matchesStatus =
      userStatusFilter === 'all'
        ? true
        : uStatus === userStatusFilter;

    if (isSuperAdmin) {
      return matchesSearch && matchesRole && matchesStatus;
    }

    return matchesSearch && matchesStatus;
  });

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientAdminEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const compStatus = c.status || 'active';
    const matchesStatus =
      companyStatusFilter === 'all'
        ? true
        : compStatus === companyStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingVerificationCount = bookings.filter(
    (b) => b.paymentStatus === 'pending_verification'
  ).length;

  const checkoutBookings = bookings.filter(
    (b) => b.paymentMethod !== undefined && b.paymentMethod !== ''
  );

  const filteredCheckouts = checkoutBookings.filter((b) => {
    const matchesSearch =
      b.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.userName && b.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.userEmail && b.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.gcashReferenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.courtName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.openPlayTitle && b.openPlayTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const isOpenPlay = b.type === 'openplay' || !!b.openPlayEventId || !!(b as any).isOpenPlay;
    const matchesCategory =
      checkoutCategoryFilter === 'all'
        ? true
        : checkoutCategoryFilter === 'openplay'
        ? isOpenPlay
        : !isOpenPlay;

    const matchesStatus =
      checkoutStatusFilter === 'all'
        ? true
        : checkoutStatusFilter === 'pending'
        ? b.paymentStatus === 'pending_verification'
        : checkoutStatusFilter === 'paid'
        ? b.paymentStatus === 'paid'
        : (b.paymentStatus === 'refunded' || b.paymentStatus === 'cancelled_no_refund' || b.paymentStatus === 'failed' || b.paymentStatus === 'rebooking_credit');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimestamp = (timestampStr?: string) => {
    if (!timestampStr) return 'N/A';
    try {
      const d = new Date(timestampStr);
      if (isNaN(d.getTime())) return timestampStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return timestampStr;
    }
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'openplay') {
      setSelectedEventForRegs(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-emerald/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-brand-lime/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      {/* Desktop & Mobile Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isSuperAdmin={isSuperAdmin}
        settingsSubTab={settingsSubTab}
        setSettingsSubTab={setSettingsSubTab}
        settingsSubMenuOpen={settingsSubMenuOpen}
        setSettingsSubMenuOpen={setSettingsSubMenuOpen}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setView={setView}
        user={user}
        onLogout={onLogout}
        onOpenSupportModal={() => setIsSupportModalOpen(true)}
        onOpenClientTicketsModal={() => setIsClientTicketsModalOpen(true)}
        courtsCount={(isSuperAdmin ? courts : availableAdminCourts).length}
        bookingsCount={bookings.length}
        pendingBookingsCount={pendingBookings.length}
        companiesCount={companies.length}
        pendingCompaniesCount={companies.filter((c) => c.status === 'pending').length}
        pendingVerificationCount={pendingVerificationCount}
        openPlayCount={openPlayEvents.length}
        personalAccountsCount={personalAccounts.length}
        bookingLeadTimeMinutes={bookingLeadTimeMinutes}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen md:ml-[260px]">
        <AdminHeader
          user={user}
          activeTab={activeTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onLogout={onLogout}
          isSuperAdmin={isSuperAdmin}
        />

        {/* Main Content Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 text-left">
          {/* Top Title Banner */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {activeTab === 'dashboard'
                ? 'Analytics & Overview'
                : activeTab === 'bookings' 
                ? 'Reservations Management' 
                : activeTab === 'courts' 
                ? 'Courts Management' 
                : activeTab === 'users' 
                ? 'Registered Users' 
                : activeTab === 'companies'
                ? 'Company & Client Management'
                : activeTab === 'checkouts'
                ? 'Checkouts & Payments'
                : activeTab === 'openplay'
                ? 'Open Play Management'
                : activeTab === 'policies'
                ? 'Venue Policies & Rules'
                : activeTab === 'vouchers'
                ? 'Vouchers & Discount Codes'
                : activeTab === 'service_fee'
                ? 'Platform Service Fee Management'
                : activeTab === 'support'
                ? 'Client Support Inquiries & Helpdesk'
                : 'Checkout Settings'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {activeTab === 'dashboard'
                ? 'Real-time financial metrics, court revenue leaderboards, peak-hour distributions, and category breakdowns.'
                : activeTab === 'support'
                ? 'Inspect, manage, and resolve support ticket concerns submitted by Client Administrators & Facility Managers.'
                : activeTab === 'service_fee'
                ? 'Configure global convenience & service fee per checkout, inspect fee earnings, and view revenue breakdown.'
                : activeTab === 'openplay'
                ? 'Create Open Play sessions, collect GCash entry fees, manage player rosters, and share direct event links.'
                : activeTab === 'policies'
                ? 'Configure court rules, cancellation policies, weather terms, and venue guidelines.'
                : activeTab === 'vouchers'
                ? 'Create and manage promotional discount vouchers for court bookings.'
                : activeTab === 'settings'
                ? 'Configure centralized GCash QR code, Account Name, and Phone Number for venue payments.'
                : activeTab === 'checkouts'
                ? 'Inspect reference numbers, review uploaded receipts, and approve or reject user bookings.'
                : activeTab === 'companies'
                ? 'Manage corporate pickleball clients, venue companies, and assign client admin managers.'
                : isSuperAdmin 
                ? 'Manage reservations, view reports, assign roles, and monitor PicklePoint system status.'
                : 'Manage your pickleball courts, view reservations, and track business reports.'}
            </p>

            {/* Organization Identifier Badge */}
            {effectiveOrgName ? (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-xs text-slate-200 shadow-sm animate-fade-in">
                <Building2 className="w-4 h-4 text-brand-lime flex-shrink-0" />
                <span>
                  <strong className="text-brand-lime font-extrabold text-xs">{effectiveOrgName}</strong>
                  {effectiveOrgShortLocation && <span className="text-slate-400 font-normal text-xs"> — {effectiveOrgShortLocation}</span>}
                </span>
              </div>
            ) : isSuperAdmin ? (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 text-xs text-slate-200 shadow-sm animate-fade-in">
                <Shield className="w-4 h-4 text-brand-emerald flex-shrink-0" />
                <span>
                  Role: <strong className="text-brand-emerald font-extrabold text-xs">Super Admin (All Organizations)</strong>
                </span>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300 shadow-sm animate-fade-in">
                <Building2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span>
                  Organization: <strong className="text-yellow-400 font-extrabold text-xs">Pending Organization Assignment</strong>
                </span>
              </div>
            )}
          </div>

          {/* Subcomponents Rendering */}
          {activeTab === 'dashboard' && (
            <AdminDashboardTab
              bookings={bookings}
              courts={courts}
              users={users}
              openPlayEvents={openPlayEvents}
              onNavigateTab={(tab) => setActiveTab(tab as AdminTab)}
              userPermissions={getUserEffectivePermissions(user as any)}
            />
          )}

          {activeTab === 'bookings' && (
            <AdminBookingsTab
              bookings={bookings}
              filteredBookings={filteredBookings}
              totalRevenue={totalRevenue}
              pendingBookings={pendingBookings}
              bookingSearch={searchQuery}
              setBookingSearch={setSearchQuery}
              bookingStatusFilter={statusFilter}
              setBookingStatusFilter={setStatusFilter}
              actionLoading={actionLoading}
              onApproveBooking={(id) => handleUpdateStatus(id, 'approved')}
              onOpenCancelModal={handlePromptCancelBooking}
              onViewReceipt={(b) => setReceiptLightboxImage(b.receiptImageUrl || null)}
              onDeleteBooking={(id) => { const b = bookings.find(x => x.id === id); if (b) handleOpenDeleteBooking(b); }}
              courts={courts}
              users={users}
              userPermissions={getUserEffectivePermissions(user as any)}
              onRefundBooking={(booking) => {
                setRefundModalBooking(booking);
                setRefundAmountInput(booking.totalCost.toString());
                setRefundReasonInput(booking.refundRequestReason ? `Player Requested: ${booking.refundRequestReason}` : '');
                setRefundReceiptFile(null);
                setRefundReceiptBase64('');
                setRefundReceiptName('');
                setRefundError(null);
              }}
            />
          )}

          {activeTab === 'courts' && (
            <AdminCourtsTab
              courts={isSuperAdmin ? courts : availableAdminCourts}
              myCompany={currentCompany}
              onOpenCreateCourtModal={() => { setEditingCourt(null); setCourtModalOpen(true); }}
              onOpenEditCourtModal={handleOpenEditCourt}
              onDeleteCourt={(id) => { const c = courts.find(x => x.id === id); if (c) handleOpenDeleteCourt(c); }}
              onTogglePublishCourt={(courtId) => { const c = courts.find(x => x.id === courtId); if (c) handleTogglePublishCourt(c); }}
              userPermissions={getUserEffectivePermissions(user as any)}
            />
          )}

          {activeTab === 'companies' && isSuperAdmin && (
            <AdminCompaniesTab
              companies={companies}
              onOpenOnboardModal={() => { setEditingCompany(null); setCompanyModalOpen(true); }}
              onOpenInviteModal={(comp) => { setInviteModalOpen(true); if (comp) setInviteEmailInput(comp.clientAdminEmail || ''); }}
              onApproveCompany={(id) => handleQuickUpdateCompanyStatus(id, 'active')}
              onRejectCompany={(id) => handleQuickUpdateCompanyStatus(id, 'inactive')}
              onDeleteCompany={(id) => handleDeleteCompany(id)}
            />
          )}

          {activeTab === 'checkouts' && (
            <AdminCheckoutsTab
              users={users}
              checkouts={bookings}
              filteredCheckouts={filteredCheckouts}
              checkoutCategoryFilter={checkoutCategoryFilter}
              setCheckoutCategoryFilter={setCheckoutCategoryFilter}
              checkoutStatusFilter={checkoutStatusFilter}
              setCheckoutStatusFilter={setCheckoutStatusFilter}
              actionLoading={actionLoading}
              userPermissions={getUserEffectivePermissions(user as any)}
              onApproveBooking={async (booking) => {
                setActionLoading(booking.id);
                try {
                  if (isFirebaseConfigured && db) {
                    await updateDoc(doc(db, 'bookings', booking.id), { status: 'approved', paymentStatus: 'paid' });
                  }
                  setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'approved', paymentStatus: 'paid' } : b));
                } catch (err) {
                  console.error('Failed to approve checkout payment:', err);
                } finally {
                  setActionLoading(null);
                }
              }}
              onRejectBooking={(booking) => {
                setRejectCheckoutModalBooking(booking);
                setRejectReasonOption('invalid_ref');
                setRejectCustomReason('');
                setRejectSendEmail(true);
              }}
              onRefundBooking={(booking) => {
                setRefundModalBooking(booking);
                setRefundAmountInput(booking.totalCost.toString());
                setRefundReasonInput(booking.refundRequestReason ? `Player Requested: ${booking.refundRequestReason}` : '');
                setRefundReceiptFile(null);
                setRefundReceiptBase64('');
                setRefundReceiptName('');
                setRefundError(null);
              }}
              onViewReceipt={(receiptUrl) => setReceiptLightboxImage(receiptUrl)}
              onNavigateToBookings={() => setActiveTab('bookings')}
              personalAccounts={personalAccounts}
              globalGcashName={globalGcashNameSetting}
              globalGcashNumber={globalGcashNumberSetting}
              globalGcashQr={globalGcashQrSetting}
              onOpenGcashModal={handleOpenSettingsModal}
              onDeleteGcashAccount={(id) => handleDeleteCheckoutSettings('my', id)}
              formatEventDateLong={formatEventDateLong}
              formatDateLabel={formatDateLabel}
              formatTime12h={formatTime12h}
              formatTimestamp={formatTimestamp}
            />
          )}

          {activeTab === 'openplay' && (
            <AdminOpenPlayTab
              events={openPlayEvents}
              openPlayRegistrations={openPlayRegistrations}
              selectedEventForRegs={selectedEventForRegs}
              setSelectedEventForRegs={setSelectedEventForRegs}
              onOpenCreateModal={handleOpenCreateOpenPlay}
              onOpenEditModal={handleOpenEditOpenPlay}
              onDeleteEvent={(id) => { const ev = openPlayEvents.find(x => x.id === id); if (ev) setDeletingOpenPlayEvent(ev); }}
              onCopyShareLink={handleCopyShareableLink}
              onDuplicateEvent={handleDuplicateOpenPlayEvent}
              onToggleStatus={handleToggleEventStatus}
              onExportRoster={handleExportOpenPlayRoster}
              onViewReceipt={(receiptUrl) => setReceiptLightboxImage(receiptUrl)}
              onRefreshEvents={fetchData}
              formatEventDateLong={formatEventDateLong}
              formatTime12h={formatTime12h}
              userPermissions={getUserEffectivePermissions(user as any)}
            />
          )}

          {activeTab === 'vouchers' && (
            <AdminVouchersTab
              vouchers={vouchers}
              onOpenCreateVoucherModal={handleOpenCreateVoucher}
              onDeleteVoucher={handleRevokeVoucher}
              onCopyVoucherCode={(code) => { navigator.clipboard.writeText(code); }}
            />
          )}

          {activeTab === 'shortener' && (
            <AdminShortenerTab
              shortLinks={shortLinks}
              loading={loading}
              onCreateShortLink={async (data) => {
                const baseAppUrl = import.meta.env.VITE_APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://bookpicklecourt.com');
                const cleanBaseUrl = baseAppUrl.replace(/\/+$/, '');
                const slugToUse = data.shortSlug || Math.random().toString(36).substring(2, 8);
                const shortUrl = `${cleanBaseUrl}/s/${slugToUse}`;

                const newLink: ShortLink = {
                  id: `sl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  title: data.title,
                  shortSlug: slugToUse,
                  shortUrl,
                  originalUrl: data.originalUrl,
                  createdByEmail: user?.email || '',
                  createdAt: new Date().toISOString(),
                  clickCount: 0,
                };

                if (isFirebaseConfigured && db) {
                  try {
                    await setDoc(doc(db, 'short_links', newLink.id), newLink);
                  } catch (err) {
                    console.error('Error saving short link to Firestore:', err);
                  }
                }

                const existingStr = localStorage.getItem('picklepoint_short_links');
                const existingList: ShortLink[] = existingStr ? JSON.parse(existingStr) : [];
                const updatedList = [newLink, ...existingList];
                localStorage.setItem('picklepoint_short_links', JSON.stringify(updatedList));

                setShortLinks((prev) => [newLink, ...prev]);
              }}
              onDeleteShortLink={async (id) => {
                if (isFirebaseConfigured && db) {
                  try {
                    await deleteDoc(doc(db, 'short_links', id));
                  } catch (err) {
                    console.error('Error deleting short link from Firestore:', err);
                  }
                }

                const existingStr = localStorage.getItem('picklepoint_short_links');
                if (existingStr) {
                  const existingList: ShortLink[] = JSON.parse(existingStr);
                  const updatedList = existingList.filter((l) => l.id !== id);
                  localStorage.setItem('picklepoint_short_links', JSON.stringify(updatedList));
                }

                setShortLinks((prev) => prev.filter((l) => l.id !== id));
              }}
              defaultVenueUrl={`${(import.meta.env.VITE_APP_BASE_URL || window.location.origin).replace(/\/+$/, '')}/venue/${orgSubdomain || myCompany?.id || 'picklezone1'}`}
            />
          )}

          {activeTab === 'policies' && (
            <AdminPoliciesTab
              policies={{
                cancellationPolicy: policyCancellation,
                rulesPolicy: policyRules,
                weatherPolicy: policyWeather,
                equipmentPolicy: policyEquipment,
              }}
              onSavePolicies={async (newP) => {
                setPolicyCancellation(newP.cancellationPolicy || '');
                setPolicyRules(newP.rulesPolicy || '');
                setPolicyWeather(newP.weatherPolicy || '');
                setPolicyEquipment(newP.equipmentPolicy || '');
                await handleSavePolicies();
              }}
            />
          )}

          {activeTab === 'support' && (
            <AdminSupportTicketsTab
              user={user}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              users={filteredUsers}
              isSuperAdmin={isSuperAdmin}
              onEditUser={(u) => handleOpenEditUser(u)}
              onToggleStatus={(uid, currentStatus) => handleQuickToggleUserStatus(uid, currentStatus)}
              onDeleteUser={(u) => {
                const target = typeof u === 'string' ? users.find(x => x.uid === u || x.email === u) : u;
                if (target) handlePromptDeleteUser(target);
              }}
              onOpenInviteModal={() => setInviteModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              user={user}
              settingsSubTab={settingsSubTab}
              setSettingsSubTab={setSettingsSubTab}
              adminDisplayName={adminDisplayName}
              setAdminDisplayName={setAdminDisplayName}
              adminPhone={adminPhone}
              setAdminPhone={setAdminPhone}
              onSaveAdminProfile={handleSaveAdminPersonalProfile}
              companyProfile={currentCompany}
              orgProfileName={orgProfileName}
              setOrgProfileName={setOrgProfileName}
              orgProfilePhone={orgProfilePhone}
              setOrgProfilePhone={setOrgProfilePhone}
              orgAddressLine1={orgAddressLine1}
              setOrgAddressLine1={setOrgAddressLine1}
              orgAddressLine2={orgAddressLine2}
              setOrgAddressLine2={setOrgAddressLine2}
              orgPostalCode={orgPostalCode}
              setOrgPostalCode={setOrgPostalCode}
              orgCountry={orgCountry}
              setOrgCountry={setOrgCountry}
              orgSelectedRegion={orgSelectedRegion}
              orgSelectedProvince={orgSelectedProvince}
              orgSelectedCity={orgSelectedCity}
              orgSelectedBarangay={orgSelectedBarangay}
              orgProvinces={orgProvinces}
              orgCities={orgCities}
              orgBarangays={orgBarangays}
              handleOrgRegionChange={handleOrgRegionChange}
              handleOrgProvinceChange={handleOrgProvinceChange}
              handleOrgCityChange={handleOrgCityChange}
              handleOrgBarangayChange={handleOrgBarangayChange}
              orgProfileWebsite={orgProfileWebsite}
              setOrgProfileWebsite={setOrgProfileWebsite}
              orgProfileFacebook={orgProfileFacebook}
              setOrgProfileFacebook={setOrgProfileFacebook}
              orgProfileInstagram={orgProfileInstagram}
              setOrgProfileInstagram={setOrgProfileInstagram}
              orgProfileLogoUrl={orgProfileLogoUrl}
              setOrgProfileLogoUrl={setOrgProfileLogoUrl}
              orgSubdomain={orgSubdomain}
              setOrgSubdomain={setOrgSubdomain}
              processOrgLogoFile={processOrgLogoFile}
              orgOperatingHours={orgOperatingHours}
              setOrgOperatingHours={setOrgOperatingHours}
              handleToggleDayOff={handleToggleDayOff}
              handleDayTimeChange={handleDayTimeChange}
              handleApplyMonToAll={handleApplyMonToAll}
              onSaveOrgProfile={handleSaveOrgProfile}
              personalAccounts={personalAccounts}
              globalGcashName={globalGcashNameSetting}
              globalGcashNumber={globalGcashNumberSetting}
              globalGcashQr={globalGcashQrSetting}
              onOpenGcashModal={handleOpenSettingsModal}
              onDeleteGcashAccount={(id) => handleDeleteCheckoutSettings('my', id)}
              paymentReminderSettings={paymentReminderSettings}
              setPaymentReminderSettings={setPaymentReminderSettings}
              onSavePaymentReminderSettings={handleSavePaymentReminderSettings}
              onRequestNotificationPermission={requestNotificationPermission}
              onTestReminderAlert={handleTestReminderAlert}
              onTestReminderEmail={handleTestReminderEmail}
              bookingLeadTimeMinutes={bookingLeadTimeMinutes}
              onSaveLeadTime={async (min) => { setBookingLeadTimeMinutes(min); await handleSaveLeadTimeSettings(); }}
              globalServiceFee={globalServiceFeeSetting}
              globalServiceFeeEnabled={globalServiceFeeEnabled}
              onSaveServiceFee={async (fee, enabled) => {
                await handleSaveServiceFee(fee, enabled);
              }}
              onOpenInviteManagerModal={() => {
                setInviteRoleInput('manager');
                setInviteCompanyNameInput(effectiveOrgName || myCompany?.name || '');
                setInviteEmailInput('');
                setInviteNameInput('');
                setInviteCustomMessage('');
                setInviteSuccessInfo(null);
                setInviteModalOpen(true);
              }}
              teamMembers={users.filter(u =>
                (u.role === 'manager' || u.role === 'editor' || u.role === 'client_admin') &&
                (!isSuperAdmin || (myCompany?.id && u.companyId === myCompany.id))
              )}
              onSaveManager={handleSaveManager}
              onDeleteManager={handleDeleteManager}
              policies={{
                cancellationPolicy: policyCancellation,
                rulesPolicy: policyRules,
                weatherPolicy: policyWeather,
                equipmentPolicy: policyEquipment,
              }}
              onSavePolicies={async (newP: CourtPolicies) => {
                setPolicyCancellation(newP.cancellationPolicy || '');
                setPolicyRules(newP.rulesPolicy || '');
                setPolicyWeather(newP.weatherPolicy || '');
                setPolicyEquipment(newP.equipmentPolicy || '');
                await handleSavePolicies();
              }}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {activeTab === 'service_fee' && isSuperAdmin && (
            <AdminServiceFeeTab
              globalServiceFee={globalServiceFeeSetting}
              globalServiceFeeEnabled={globalServiceFeeEnabled}
              onSaveServiceFee={async (fee, enabled) => {
                await handleSaveServiceFee(fee, enabled);
              }}
              bookings={bookings}
              companies={companies}
              formatEventDateLong={formatEventDateLong}
            />
          )}
        </div>
      </div>

      {/* RECEIPT ZOOM LIGHTBOX OVERLAY */}
      {receiptLightboxImage && (
        <div 
          onClick={() => setReceiptLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-lg w-full max-h-[85vh] flex items-center justify-center animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <img src={receiptLightboxImage} alt="Payment Receipt Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-800 shadow-2xl" />
            <button
              onClick={() => setReceiptLightboxImage(null)}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/80 border border-slate-800 p-2 rounded-full backdrop-blur"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ISSUE REFUND MODAL */}
      {refundModalBooking && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-purple-500/30 rounded-3xl max-w-lg w-full shadow-2xl relative animate-scale-up text-left flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-dark-border flex items-center justify-between flex-shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cancellation Resolution Manager</h3>
                  <p className="text-xs text-slate-400">Choose resolution: Monetary Refund, Rebooking Credit Voucher, or Cancel Without Refund</p>
                </div>
              </div>
              <button
                onClick={() => setRefundModalBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Mode Selector Pills */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCancellationResolutionMode('refund')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                    cancellationResolutionMode === 'refund'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  💸 Monetary Refund
                </button>
                <button
                  type="button"
                  onClick={() => setCancellationResolutionMode('voucher')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                    cancellationResolutionMode === 'voucher'
                      ? 'bg-brand-lime text-dark-bg border-brand-lime shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎟️ Rebooking Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setCancellationResolutionMode('no_refund')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                    cancellationResolutionMode === 'no_refund'
                      ? 'bg-red-600 border-red-400 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ❌ Cancel (No Refund)
                </button>
              </div>

              {refundError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              {/* Booking Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-dark-border space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Booking Ref:</span>
                  <span className="font-mono font-bold text-white">{refundModalBooking.bookingReference || refundModalBooking.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold text-white">{refundModalBooking.user?.name || 'Customer'} ({refundModalBooking.user?.email || 'N/A'})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Original Total Paid:</span>
                  <span className="font-extrabold text-brand-lime">₱{refundModalBooking.totalCost}</span>
                </div>
              </div>

              {/* Conditional Form Content by Mode */}
              <div className="space-y-4">
                {/* MODE 1: MONETARY REFUND */}
                {cancellationResolutionMode === 'refund' && (
                  <>
                    {/* Quick Percentage Refund Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Quick Refund Percentage</span>
                        <span className="text-[10px] text-purple-400 font-normal normal-case">Or enter custom amount below</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {[20, 50, 80, 100].map((pct) => {
                          const calculatedVal = (refundModalBooking.totalCost * (pct / 100));
                          const calculatedStr = Number.isInteger(calculatedVal) ? calculatedVal.toString() : calculatedVal.toFixed(2);
                          const isSelected = parseFloat(refundAmountInput || '0') === parseFloat(calculatedStr);

                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setRefundAmountInput(calculatedStr)}
                              className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-purple-600/30 border-purple-400 text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-purple-300'
                              }`}
                            >
                              <span className="text-xs font-black">{pct === 100 ? '100% Full' : `${pct}%`}</span>
                              <span className="text-[10px] font-mono font-bold text-purple-300/80 mt-0.5">₱{calculatedStr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Refund Amount (₱) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        className="w-full bg-slate-900/80 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                        placeholder="Enter amount"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Refund Reason / Notes
                      </label>
                      <textarea
                        rows={2}
                        value={refundReasonInput}
                        onChange={(e) => setRefundReasonInput(e.target.value)}
                        className="w-full bg-slate-900/80 border border-dark-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g. GCash transfer sent, Customer requested cancellation..."
                      />
                    </div>

                    {/* Receipt File Upload */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Upload Refund Receipt Proof <span className="text-red-400">*</span>
                      </label>
                      
                      {refundReceiptBase64 ? (
                        <div className="relative rounded-2xl border border-purple-500/40 bg-slate-950 p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img src={refundReceiptBase64} alt="Refund Receipt Preview" className="w-16 h-16 object-cover rounded-xl border border-slate-800" />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-white truncate max-w-[200px]">{refundReceiptName || 'Refund Receipt'}</p>
                              <p className="text-[10px] text-purple-400 font-semibold mt-0.5">✓ Ready for upload</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRefundReceiptFile(null);
                              setRefundReceiptBase64('');
                              setRefundReceiptName('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900 hover:text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center group">
                          <Upload className="w-7 h-7 text-slate-500 group-hover:text-purple-400 transition-colors mb-2" />
                          <span className="text-xs font-bold text-slate-300 group-hover:text-white">Click to upload refund receipt screenshot</span>
                          <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, WEBP formats accepted</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleRefundReceiptChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}

                {/* MODE 2: REBOOKING VOUCHER */}
                {cancellationResolutionMode === 'voucher' && (
                  <>
                    <div className="p-3.5 bg-brand-lime/10 border border-brand-lime/30 rounded-2xl flex items-start gap-3">
                      <Tag className="w-5 h-5 text-brand-lime shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300">
                        <p className="font-bold text-white mb-0.5">Automated Digital Credit Voucher</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          A unique single-use voucher code (e.g. <span className="font-mono text-brand-lime font-bold">CREDIT-XXXX-XXX</span>) will be automatically generated and emailed to <strong className="text-white">{refundModalBooking.user?.email || 'the player'}</strong>. No receipt upload is required.
                        </p>
                      </div>
                    </div>

                    {/* Quick Percentage Voucher Value Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Voucher Credit Percentage</span>
                        <span className="text-[10px] text-brand-lime font-normal normal-case">Or enter custom value below</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {[20, 50, 80, 100].map((pct) => {
                          const calculatedVal = (refundModalBooking.totalCost * (pct / 100));
                          const calculatedStr = Number.isInteger(calculatedVal) ? calculatedVal.toString() : calculatedVal.toFixed(2);
                          const isSelected = parseFloat(refundAmountInput || '0') === parseFloat(calculatedStr);

                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setRefundAmountInput(calculatedStr)}
                              className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-brand-lime/20 border-brand-lime text-brand-lime shadow-lg scale-[1.02]'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-brand-lime/50 hover:text-brand-lime'
                              }`}
                            >
                              <span className="text-xs font-black">{pct === 100 ? '100% Full' : `${pct}%`}</span>
                              <span className="text-[10px] font-mono font-bold text-brand-lime/80 mt-0.5">₱{calculatedStr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Voucher Credit Value (₱) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        className="w-full bg-slate-900/80 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-brand-lime"
                        placeholder="Enter voucher amount"
                      />
                    </div>

                    {/* Expiration Duration & Validity Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-brand-lime" /> Validity Period / Expiration Date
                        </span>
                        <span className="text-[10px] text-brand-lime font-mono font-bold">
                          Valid until: {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + (Number(refundVoucherExpiryDays) || 30));
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          })()}
                        </span>
                      </label>

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { days: 15, label: '15 Days' },
                          { days: 30, label: '1 Month', badge: 'Default' },
                          { days: 60, label: '2 Months' },
                          { days: 90, label: '3 Months' },
                        ].map((preset) => {
                          const isSelected = refundVoucherExpiryDays === preset.days;
                          return (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() => setRefundVoucherExpiryDays(preset.days)}
                              className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-brand-lime/20 border-brand-lime text-brand-lime shadow-lg scale-[1.02]'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-brand-lime/50 hover:text-brand-lime'
                              }`}
                            >
                              <span className="text-xs font-black">{preset.label}</span>
                              {preset.badge && (
                                <span className="text-[9px] font-mono text-brand-lime/80 mt-0.5">({preset.badge})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-400">Custom Duration:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={refundVoucherExpiryDays}
                          onChange={(e) => setRefundVoucherExpiryDays(Math.max(1, Number(e.target.value)))}
                          className="w-24 bg-slate-900/80 border border-dark-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-lime text-center"
                        />
                        <span className="text-[11px] text-slate-500">days from today</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Voucher Issue Reason / Notes
                      </label>
                      <textarea
                        rows={2}
                        value={refundReasonInput}
                        onChange={(e) => setRefundReasonInput(e.target.value)}
                        className="w-full bg-slate-900/80 border border-dark-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-lime"
                        placeholder="e.g. Rebooking credit for customer rescheduling..."
                      />
                    </div>
                  </>
                )}

                {/* MODE 3: CANCEL WITHOUT REFUND */}
                {cancellationResolutionMode === 'no_refund' && (
                  <>
                    <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300">
                        <p className="font-bold text-red-300 mb-0.5">Non-Refundable Cancellation</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          This reservation will be marked as <strong className="text-red-400">Cancelled</strong> with no monetary refund or credit voucher issued per facility terms (e.g. late cancellation within policy window or customer no-show).
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Cancellation Reason / Policy Note
                      </label>
                      <textarea
                        rows={3}
                        value={refundReasonInput}
                        onChange={(e) => setRefundReasonInput(e.target.value)}
                        className="w-full bg-slate-900/80 border border-dark-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                        placeholder="e.g. Late cancellation within 12h policy window, Player no-show..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 p-5 sm:p-6 border-t border-dark-border flex-shrink-0 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setRefundModalBooking(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-dark-border text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundSubmitting}
                onClick={handleProcessRefund}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  cancellationResolutionMode === 'refund'
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                    : cancellationResolutionMode === 'voucher'
                    ? 'bg-brand-lime hover:bg-lime-400 text-dark-bg shadow-brand-lime/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                }`}
              >
                {refundSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : cancellationResolutionMode === 'refund' ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Confirm Monetary Refund
                  </>
                ) : cancellationResolutionMode === 'voucher' ? (
                  <>
                    <Tag className="w-4 h-4" />
                    Issue Rebooking Voucher
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirm Cancellation (No Refund)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CHECKOUT PAYMENT CONFIRMATION MODAL ALERT */}
      {rejectCheckoutModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-panel border border-red-900/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-left space-y-5 shadow-2xl relative animate-scale-up my-8 bg-dark-bg/95">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Reject Checkout Payment
                  </h3>
                  <p className="text-xs text-red-400/90 font-semibold mt-0.5">
                    Cancel booking #{rejectCheckoutModalBooking.bookingReference || rejectCheckoutModalBooking.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectCheckoutModalBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Details Box */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Court / Venue:</span>
                <span className="font-bold text-white text-right truncate max-w-[220px]">
                  {rejectCheckoutModalBooking.ownerCompanyName && rejectCheckoutModalBooking.ownerCompanyName !== rejectCheckoutModalBooking.courtName
                    ? `${rejectCheckoutModalBooking.ownerCompanyName} — ${rejectCheckoutModalBooking.courtName}`
                    : rejectCheckoutModalBooking.courtName}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-200">
                  {rejectCheckoutModalBooking.user?.name || 'Valued Player'} ({rejectCheckoutModalBooking.user?.email || 'N/A'})
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Schedule:</span>
                <span className="font-semibold text-slate-300">
                  {rejectCheckoutModalBooking.date} &bull; {rejectCheckoutModalBooking.slots?.join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">GCash Ref Number:</span>
                <span className="font-mono font-bold text-brand-lime">
                  {rejectCheckoutModalBooking.gcashReferenceNumber || 'Not Provided'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-extrabold text-white text-sm">
                  ₱{rejectCheckoutModalBooking.totalCost?.toLocaleString()}
                </span>
              </div>

              {/* Receipt Preview Trigger if available */}
              {rejectCheckoutModalBooking.receiptImageUrl && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-400">Uploaded Receipt:</span>
                  <button
                    type="button"
                    onClick={() => setReceiptLightboxImage(rejectCheckoutModalBooking.receiptImageUrl || null)}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-lime hover:underline font-bold cursor-pointer"
                  >
                    <span>View Uploaded Proof</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Rejection Reason Selector */}
            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-extrabold uppercase tracking-wider">
                Select Reason for Rejection:
              </label>

              <div className="space-y-1.5">
                {[
                  { id: 'invalid_ref', label: 'GCash Reference Number not found or invalid' },
                  { id: 'unclear_receipt', label: 'Uploaded screenshot is blurry, cut off, or illegible' },
                  { id: 'amount_mismatch', label: 'Transferred amount does not match required fee' },
                  { id: 'payment_not_received', label: 'Payment was not credited to venue GCash account' },
                  { id: 'custom', label: 'Other / Custom explanation' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      rejectReasonOption === opt.id
                        ? 'bg-red-950/30 border-red-500/50 text-white'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      checked={rejectReasonOption === opt.id}
                      onChange={() => setRejectReasonOption(opt.id)}
                      className="accent-red-500 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>

              {rejectReasonOption === 'custom' && (
                <div className="pt-2 animate-fade-in">
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter specific explanation for rejecting this transaction proof..."
                    value={rejectCustomReason}
                    onChange={(e) => setRejectCustomReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            {/* Email Notification Option */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rejectSendEmail}
                onChange={(e) => setRejectSendEmail(e.target.checked)}
                className="accent-brand-lime rounded cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium">
                Send automated cancellation notice to <strong className="text-white">{rejectCheckoutModalBooking.user?.email || 'player'}</strong>
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectCheckoutModalBooking(null)}
                disabled={rejectCheckoutSubmitting}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer border border-slate-800"
              >
                Cancel / Keep Booking
              </button>
              <button
                type="button"
                disabled={rejectCheckoutSubmitting}
                onClick={handleConfirmRejectCheckout}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {rejectCheckoutSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CHECKOUT SUCCESS MODAL ALERT */}
      {rejectSuccessAlert && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative animate-scale-up bg-slate-950">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Payment Proof Rejected
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                {rejectSuccessAlert}
              </p>
            </div>

            <button
              onClick={() => setRejectSuccessAlert(null)}
              className="w-full py-3.5 rounded-2xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/20"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS SAVE SUCCESS MODAL */}
      {showSettingsSuccessModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm transition-all">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl text-center relative animate-scale-up">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime mb-4">
              <Check className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-semibold text-white">Settings Saved!</h3>
            <p className="text-slate-400 text-xs mt-2">
              Centralized GCash configuration credentials and QR screenshot have been updated successfully.
            </p>
            
            <button
              onClick={() => setShowSettingsSuccessModal(false)}
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer font-sans shadow-md shadow-brand-lime/10"
            >
              Okay, Got it
            </button>
          </div>
        </div>
      )}

      {/* POLICIES SAVE SUCCESS MODAL */}
      {showPoliciesSuccessModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-brand-lime/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowPoliciesSuccessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full bg-slate-900/60 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-full bg-brand-lime/10 border-2 border-brand-lime/40 text-brand-lime flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Venue Policies Saved!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your cancellation, court rules, weather, and rental policies have been updated and are live on the public court details page.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowPoliciesSuccessModal(false)}
                className="w-full py-3.5 rounded-2xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/20"
              >
                Okay, Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE FEE SAVED SUCCESS MODAL OVERLAY */}
      {serviceFeeSuccessModalMessage && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-brand-lime/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setServiceFeeSuccessModalMessage(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full bg-slate-900/60 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-full bg-brand-lime/10 border-2 border-brand-lime/40 text-brand-lime flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Service Fee Updated!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                {serviceFeeSuccessModalMessage}
              </p>
            </div>

            <button
              onClick={() => setServiceFeeSuccessModalMessage(null)}
              className="w-full py-3.5 rounded-2xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/20"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS VALIDATION ERROR MODAL */}
      {settingsValidationError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm transition-all animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-red-900/35 shadow-2xl text-center relative animate-scale-up">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-semibold text-white">Validation Error</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              {settingsValidationError}
            </p>
            
            <button
              onClick={() => setSettingsValidationError(null)}
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold text-white bg-red-950 border border-red-800/40 hover:bg-red-900 transition-all cursor-pointer font-sans"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING POLICY MODAL */}
      {cancelBookingModalOpen && bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 max-w-md w-full text-left space-y-5 shadow-2xl relative animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <X className="w-5 h-5 text-red-400" /> Cancel Reservation
              </h3>
              <button onClick={() => setCancelBookingModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Match Date:</span>
                <span className="font-bold text-white">{bookingToCancel.date}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Player:</span>
                <span className="font-bold text-brand-lime">{bookingToCancel.user?.name} ({bookingToCancel.user?.email})</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Paid:</span>
                <span className="font-bold text-white">₱{bookingToCancel.totalCost}</span>
              </div>
            </div>

            {/* Policy Engine Calculation Alert */}
            <div className="p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 space-y-1.5">
              <div className="text-xs font-bold text-brand-lime flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Policy Engine Assessment:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {hoursUntilMatch >= 24
                  ? '✅ Match is more than 24h away. Player is eligible for 100% Full Cash/GCash Refund.'
                  : hoursUntilMatch >= 12
                  ? '🎟️ Cancellation requested between 12–24h prior. System will issue a 50% Credit Voucher.'
                  : '⚠️ Cancellation is within 12h of match start. Match is Non-Refundable per policy.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCancelBookingModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancelWithVoucher}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-red-500 transition-all cursor-pointer shadow-lg shadow-red-600/20"
              >
                {cancellationVoucherPercent > 0 ? `Cancel & Issue ${cancellationVoucherPercent}% Voucher` : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEATHER STOPPAGE RAINOUT MODAL */}
      {weatherModalOpen && weatherBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-blue-500/30 rounded-3xl p-6 max-w-md w-full text-left space-y-5 shadow-2xl relative animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-blue-400" /> Report Weather Stoppage / Rainout
              </h3>
              <button onClick={() => setWeatherModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Venue Court:</span>
                <span className="font-bold text-white">{weatherBooking.courtName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Player:</span>
                <span className="font-bold text-brand-lime">{weatherBooking.user?.name} ({weatherBooking.user?.email})</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Select Stoppage Duration:
              </label>

              <div className="space-y-2">
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  stoppageDuration === 'under_30' ? 'bg-blue-500/10 border-blue-500 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="stoppage"
                      checked={stoppageDuration === 'under_30'}
                      onChange={() => setStoppageDuration('under_30')}
                      className="accent-brand-lime cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold block">Interrupted &lt; 30 mins played</span>
                      <span className="text-[11px] text-slate-400">Eligible for 100% Rebooking Voucher</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-brand-lime">100% OFF</span>
                </label>

                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  stoppageDuration === 'over_30' ? 'bg-blue-500/10 border-blue-500 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="stoppage"
                      checked={stoppageDuration === 'over_30'}
                      onChange={() => setStoppageDuration('over_30')}
                      className="accent-brand-lime cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold block">Interrupted &gt; 30 mins played</span>
                      <span className="text-[11px] text-slate-400">Eligible for 50% Pro-Rated Credit Voucher</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-brand-lime">50% OFF</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setWeatherModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWeatherStoppage}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-blue-500 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Issue Voucher & Email Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE VOUCHER MODAL */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-left space-y-5 shadow-2xl relative animate-scale-up my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-lime" /> Issue New Credit Voucher / Promo
              </h3>
              <button onClick={() => setVoucherModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Voucher Code
                </label>
                <input
                  type="text"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER50"
                  className="w-full bg-slate-900 border border-slate-800 text-brand-lime font-mono font-bold text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={voucherDiscountType}
                    onChange={(e) => setVoucherDiscountType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₱)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={voucherDiscountValue}
                    onChange={(e) => setVoucherDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Recipient Player Email (Optional - Lock to specific player)
                </label>
                <input
                  type="email"
                  value={voucherRecipientEmail}
                  onChange={(e) => setVoucherRecipientEmail(e.target.value)}
                  placeholder="e.g. player@gmail.com"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Max Redemption Uses
                  </label>
                  <input
                    type="number"
                    value={voucherMaxUses}
                    onChange={(e) => setVoucherMaxUses(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Valid For (Days)
                  </label>
                  <input
                    type="number"
                    value={voucherExpiryDays}
                    onChange={(e) => setVoucherExpiryDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/20"
                >
                  Save & Issue Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {gcashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm transition-all overflow-y-auto">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl relative animate-scale-up text-left my-8">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            <div className="flex justify-between items-center pb-4 border-b border-dark-border mb-5">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4.5 h-4.5 text-brand-lime" />
                  {(settingsModalType === 'global' ? globalGcashNameSetting : editingAccountId) ? 'Edit GCash Payment Details' : 'Add GCash Payment Details'}
                </h3>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mt-1">
                  {settingsModalType === 'global' ? 'System Fallback Credentials' : 'Your Personal Credentials'}
                </span>
              </div>
              <button
                onClick={() => setGcashModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Payment Label / Purpose Name */}
              {settingsModalType === 'my' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Payment / Account Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Court Booking GCash, Open Play Entry Account, Tournament Account"
                    value={paymentNameSetting}
                    onChange={(e) => setPaymentNameSetting(e.target.value)}
                    className="w-full bg-slate-900/60 border border-dark-border text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                  />
                  <p className="text-[10px] text-slate-500">
                    Descriptive label to help identify this GCash account (e.g., Court Reservations, Open Play).
                  </p>
                </div>
              )}

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  GCash Account Name
                </label>
                <input
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={gcashNameSetting}
                  onChange={(e) => setGcashNameSetting(e.target.value)}
                  className="w-full bg-slate-900/60 border border-dark-border text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  GCash Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0917 123 4567"
                  value={gcashNumberSetting}
                  onChange={(e) => setGcashNumberSetting(e.target.value)}
                  className="w-full bg-slate-900/60 border border-dark-border text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              {/* QR Upload Screenshot */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  GCash QR Code Screenshot
                </label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-28 h-28 rounded-xl bg-slate-955 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 select-none shadow">
                    {gcashQrCodeSetting ? (
                      <img src={gcashQrCodeSetting} alt="GCash QR Preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-500 p-2">
                        <span className="text-xl block mb-1">📲</span>
                        <span className="text-xs font-bold">No Image</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="relative group rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/20 p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGcashQrUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                      <Plus className="w-4 h-4 text-slate-500 mb-1 group-hover:text-brand-lime transition-colors" />
                      <span className="text-xs text-slate-350 font-bold block">Upload QR Screenshot</span>
                      <span className="text-[8.5px] text-slate-500 block">PNG, JPG format</span>
                    </div>

                    {gcashQrCodeSetting && (
                      <button
                        type="button"
                        onClick={() => setGcashQrCodeSetting('')}
                        className="py-1.5 px-2.5 border border-red-955 bg-red-955/10 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-dark-border mt-6">
              <button
                type="button"
                onClick={() => setGcashModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-all font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCheckoutSettings}
                disabled={settingsSaveLoading || !gcashNameSetting || !gcashNumberSetting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-brand-lime/10 cursor-pointer"
              >
                {settingsSaveLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RESERVATION DETAILS MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative animate-scale-up text-left my-8 max-h-[90vh] flex flex-col justify-between">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-dark-border mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-brand-lime" /> Edit Reservation Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modify reservation date, court schedule slots, and booking status for this customer.
                  </p>
                </div>
                <button
                  onClick={() => setEditingBooking(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Top Settings Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Client Summary */}
                  <div className="bg-dark-bg/60 border border-dark-border p-3.5 rounded-2xl flex flex-col justify-center">
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-1">Reservation Client</div>
                    <div className="font-bold text-white text-xs truncate">{editingBooking.user?.name || 'Anonymous'}</div>
                    <div className="text-slate-400 text-[11px] truncate mt-0.5">{editingBooking.user?.email || 'N/A'}</div>
                  </div>

                  {/* 1. Date Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-lime" /> Booking Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border text-slate-300 rounded-2xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all cursor-pointer font-medium"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  {/* 2. Status Select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-brand-lime" /> Booking Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'pending' | 'approved' | 'cancelled')}
                      className="w-full bg-dark-bg border border-dark-border text-slate-300 rounded-2xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all cursor-pointer font-medium"
                    >
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* 3. Time Slots Toggle Grid */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Clock className="w-3.5 h-3.5 text-brand-lime" /> Court Schedule Slots ({editSlots.length} hours reserved)
                    </label>
                    <span className="text-xs text-slate-400 font-medium">
                      Date: <strong className="text-brand-lime">{editDate}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {(() => {
                      const otherBookedSlots = bookings
                        .filter(
                          (b) =>
                            b.id !== editingBooking.id &&
                            b.bookingId !== editingBooking.id &&
                            b.courtId === editingBooking.courtId &&
                            b.date === editDate &&
                            b.status !== 'cancelled'
                        )
                        .flatMap((b) => b.slots || []);

                      return SLOTS.map((slot, idx) => {
                        const bCourt = courts.find(c => c.id === editingBooking.courtId);
                        const dayPrice = bCourt ? bCourt.dayPrice : 100;
                        const nightPrice = bCourt ? bCourt.nightPrice : 150;
                        const price = getSlotPrice(slot.startHour, dayPrice, nightPrice);
                        const isSelected = editSlots.includes(slot.time);
                        const isBookedByOther = otherBookedSlots.includes(slot.time);

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isBookedByOther}
                            onClick={() => handleToggleEditSlot(slot.time)}
                            className={`py-2.5 px-3 rounded-xl border text-left text-xs transition-all relative flex justify-between items-center ${
                              isBookedByOther
                                ? 'bg-slate-950/80 border-slate-850 text-slate-600 cursor-not-allowed opacity-65'
                                : isSelected
                                ? 'bg-brand-lime text-dark-bg border-brand-lime font-bold shadow-md'
                                : 'bg-dark-bg/60 border-dark-border text-slate-300 hover:bg-dark-hover cursor-pointer'
                            }`}
                          >
                            <span className="truncate pr-1">{slot.time.split(' - ')[0]}</span>
                            {isBookedByOther ? (
                              <span className="text-[10px] font-extrabold text-red-400/90 uppercase tracking-wider bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                Booked
                              </span>
                            ) : (
                              <span className={`text-xs font-extrabold ${isSelected ? 'text-dark-bg/85 font-sans' : 'text-brand-lime'}`}>
                                ₱{price}
                              </span>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex gap-3 mt-8 pt-5 border-t border-dark-border">
              <button
                onClick={() => setEditingBooking(null)}
                className="flex-1 py-3.5 rounded-2xl text-xs font-extrabold text-slate-400 border border-dark-border hover:bg-slate-900 transition-all cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading !== null}
                className="flex-1 py-3.5 rounded-2xl text-xs font-extrabold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex justify-center items-center gap-2 shadow-lg shadow-brand-lime/20 uppercase tracking-wider"
              >
                {actionLoading !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-dark-bg" /> Updating...
                  </>
                ) : (
                  'Save Reservation Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* COURT CREATE/EDIT MODAL */}
      {courtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm transition-all animate-fade-in">
          <div className="w-full max-w-4xl bg-dark-bg border border-slate-800 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl shadow-black/90 z-10 animate-scale-up text-left">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            <div className="flex flex-wrap justify-between items-center pb-4 border-b border-dark-border mb-5 gap-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-lime" />
                {editingCourt ? 'Edit Court Details' : 'Create New Court'}
              </h3>

              <div className="flex items-center gap-4">
                {/* Publish Court Toggle (Bigger & Prominent) */}
                <label className={`inline-flex items-center gap-3 cursor-pointer select-none px-4 py-2 rounded-xl transition-all border ${
                  courtPublished 
                    ? 'bg-brand-lime/15 border-brand-lime/40 text-brand-lime shadow-sm shadow-brand-lime/10' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}>
                  <span className="text-sm font-extrabold tracking-wide">
                    {courtPublished ? 'Published' : 'Draft'}
                  </span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courtPublished}
                      onChange={(e) => setCourtPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-450 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-lime peer-checked:after:bg-dark-bg peer-checked:after:border-brand-lime"></div>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => setCourtModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {courtFormError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold mb-4 text-left animate-shake">
                {courtFormError}
              </div>
            )}

            <div className="space-y-6 max-h-[62vh] overflow-y-auto pr-2">
              
              {/* CARD 1: BASIC INFORMATION */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-slate-800/50 pb-2">
                  Basic Information
                </h4>
                
                {/* Court Name */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Court Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    placeholder="e.g., Championship Court A"
                    className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Surface Type Dropdown */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Surface Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCourtTypeOpen(!isCourtTypeOpen);
                        setIsCourtGcashOpen(false);
                        setIsCourtRegionOpen(false);
                        setIsCourtProvinceOpen(false);
                        setIsCourtCityOpen(false);
                        setIsCourtBarangayOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                    >
                      <span className="truncate">
                        {courtType || 'Select Surface Type...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isCourtTypeOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                    </button>

                    {isCourtTypeOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCourtTypeOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          {[
                            "Premium Indoor Plexicushion",
                            "Cushioned Acrylic (Outdoor)",
                            "Hard Acrylic / SportMaster",
                            "Interlocking Modular Polymer Tiles",
                            "Polyurethane Rubber Court (Indoor)",
                            "Polished Concrete (Indoor)",
                            "Painted Asphalt / Concrete (Outdoor)",
                            "Synthetic Turf / Short Pile Grass"
                          ].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                setCourtType(st);
                                setIsCourtTypeOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                courtType === st ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{st}</span>
                              {courtType === st && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Select the court surface material and playing condition.</p>
                </div>

                {/* Assign GCash Account */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Assign GCash Payment Destination</span>
                    {courtGcashAccountId && (
                      <span className="text-[10px] font-bold text-brand-lime uppercase">Custom Destination Active</span>
                    )}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCourtGcashOpen(!isCourtGcashOpen);
                        setIsCourtTypeOpen(false);
                        setIsCourtRegionOpen(false);
                        setIsCourtProvinceOpen(false);
                        setIsCourtCityOpen(false);
                        setIsCourtBarangayOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                    >
                      <span className="truncate">
                        {(() => {
                          const found = personalAccounts.find((a) => a.id === courtGcashAccountId);
                          if (found) {
                            return `${found.paymentName ? `${found.paymentName} — ` : ''}${found.gcashName} (${found.gcashNumber})`;
                          }
                          return '-- Use Default Choice --';
                        })()}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isCourtGcashOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                    </button>

                    {isCourtGcashOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCourtGcashOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              setCourtGcashAccountId('');
                              setIsCourtGcashOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                              !courtGcashAccountId ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>-- Use Default Choice --</span>
                            {!courtGcashAccountId && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                          </button>
                          {personalAccounts.map((a) => {
                            const labelText = `${a.paymentName ? `${a.paymentName} — ` : ''}${a.gcashName} (${a.gcashNumber})`;
                            const isSelected = courtGcashAccountId === a.id;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setCourtGcashAccountId(a.id);
                                  setIsCourtGcashOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{labelText}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Select which configured GCash account receives reservation payments for this court. If none is assigned, the client owner's primary account details (or fallback) are shown.
                  </p>
                </div>
              </div>

              {/* CARD 2: PRICING */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-slate-800/50 pb-2">
                  Pricing Rates
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {/* Day Price */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Day Rate (5:00 AM – 6:00 PM)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550 font-bold text-xs">
                        ₱ PHP
                      </span>
                      <input
                        type="number"
                        required
                        value={courtDayPrice}
                        onChange={(e) => setCourtDayPrice(Number(e.target.value))}
                        placeholder="100"
                        className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl pl-16 pr-4 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Night Price */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Night Rate (6:00 PM – 10:00 PM)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-555 font-bold text-xs">
                        ₱ PHP
                      </span>
                      <input
                        type="number"
                        required
                        value={courtNightPrice}
                        onChange={(e) => setCourtNightPrice(Number(e.target.value))}
                        placeholder="150"
                        className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl pl-16 pr-4 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium leading-relaxed italic bg-slate-950/20 p-3 rounded-xl border border-slate-800/40">
                  These rates are automatically applied based on the customer's selected booking time.
                </p>
              </div>

              {/* CARD 3: COURT ADDRESS */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Court Address
                  </h4>
                  {myCompany && (myCompany.address || myCompany.addressLine1) && (
                    <button
                      type="button"
                      onClick={handleAutofillFromCompanyAddress}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
                        autofillAddressSuccess
                          ? 'bg-brand-emerald/20 border border-brand-emerald text-brand-emerald'
                          : 'bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg'
                      }`}
                    >
                      {autofillAddressSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Address Applied!</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Use Facility Address</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Region select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Region <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCourtRegionOpen(!isCourtRegionOpen);
                        setIsCourtProvinceOpen(false);
                        setIsCourtCityOpen(false);
                        setIsCourtBarangayOpen(false);
                        setIsCourtTypeOpen(false);
                        setIsCourtGcashOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                    >
                      <span className="truncate">
                        {regions.find((r) => r.code === selectedRegion)?.name || regionName || 'Select Region'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isCourtRegionOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                    </button>

                    {isCourtRegionOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCourtRegionOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              handleRegionChange('');
                              setIsCourtRegionOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                              !selectedRegion ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>Select Region</span>
                            {!selectedRegion && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                          </button>
                          {regions.map((r) => (
                            <button
                              key={r.code}
                              type="button"
                              onClick={() => {
                                handleRegionChange(r.code);
                                setIsCourtRegionOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                selectedRegion === r.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{r.name}</span>
                              {selectedRegion === r.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Province select (only if provinces exist for the region) */}
                {selectedRegion && provinces.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Province</label>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!selectedRegion}
                        onClick={() => {
                          setIsCourtProvinceOpen(!isCourtProvinceOpen);
                          setIsCourtRegionOpen(false);
                          setIsCourtCityOpen(false);
                          setIsCourtBarangayOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span className="truncate">
                          {provinces.find((p) => p.code === selectedProvince)?.name || provinceName || 'Select Province'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isCourtProvinceOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                      </button>

                      {isCourtProvinceOpen && selectedRegion && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsCourtProvinceOpen(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                            <button
                              type="button"
                              onClick={() => {
                                handleProvinceChange('');
                                setIsCourtProvinceOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                !selectedProvince ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span>Select Province</span>
                              {!selectedProvince && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                            </button>
                            {provinces.map((p) => (
                              <button
                                key={p.code}
                                type="button"
                                onClick={() => {
                                  handleProvinceChange(p.code);
                                  setIsCourtProvinceOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                  selectedProvince === p.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{p.name}</span>
                                {selectedProvince === p.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Municipality & Barangay dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Municipality / City <span className="text-red-500">*</span></label>
                    {selectedRegion && cities.length > 0 ? (
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!selectedRegion}
                          onClick={() => {
                            setIsCourtCityOpen(!isCourtCityOpen);
                            setIsCourtRegionOpen(false);
                            setIsCourtProvinceOpen(false);
                            setIsCourtBarangayOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="truncate">
                            {cities.find((c) => c.code === selectedCity)?.name || cityName || 'Select Municipality/City'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isCourtCityOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                        </button>

                        {isCourtCityOpen && selectedRegion && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsCourtCityOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                              <button
                                type="button"
                                onClick={() => {
                                  handleCityChange('');
                                  setIsCourtCityOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                  !selectedCity ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span>Select Municipality/City</span>
                                {!selectedCity && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                              </button>
                              {cities.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    handleCityChange(c.code);
                                    setIsCourtCityOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                    selectedCity === c.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="truncate">{c.name}</span>
                                  {selectedCity === c.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        placeholder="Enter City / Municipality"
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all font-semibold shadow-inner"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Barangay <span className="text-red-500">*</span></label>
                    {selectedCity && barangays.length > 0 ? (
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!selectedCity}
                          onClick={() => {
                            setIsCourtBarangayOpen(!isCourtBarangayOpen);
                            setIsCourtRegionOpen(false);
                            setIsCourtProvinceOpen(false);
                            setIsCourtCityOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="truncate">
                            {barangays.find((b) => b.code === selectedBarangay)?.name || barangayName || 'Select Barangay'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isCourtBarangayOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                        </button>

                        {isCourtBarangayOpen && selectedCity && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsCourtBarangayOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                              <button
                                type="button"
                                onClick={() => {
                                  handleBarangayChange('');
                                  setIsCourtBarangayOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                  !selectedBarangay ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span>Select Barangay</span>
                                {!selectedBarangay && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                              </button>
                              {barangays.map((b) => (
                                <button
                                  key={b.code}
                                  type="button"
                                  onClick={() => {
                                    handleBarangayChange(b.code);
                                    setIsCourtBarangayOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                    selectedBarangay === b.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="truncate">{b.name}</span>
                                  {selectedBarangay === b.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={barangayName}
                        onChange={(e) => setBarangayName(e.target.value)}
                        placeholder="Enter Barangay"
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all font-semibold shadow-inner"
                      />
                    )}
                  </div>
                </div>

                {/* Address Line 1 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Street Address (Address 1) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={courtAddressLine1}
                    onChange={(e) => setCourtAddressLine1(e.target.value)}
                    placeholder="e.g., 123 Pickleball Lane"
                    className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Address Line 2 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Apt, Suite, Unit, etc. (Address 2 - Optional)</label>
                  <input
                    type="text"
                    value={courtAddressLine2}
                    onChange={(e) => setCourtAddressLine2(e.target.value)}
                    placeholder="e.g., Phase 2, Court B"
                    className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Postal Code & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Postal Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={courtPostalCode}
                      onChange={(e) => setCourtPostalCode(e.target.value)}
                      placeholder="e.g., 1600"
                      className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Country</label>
                    <input
                      type="text"
                      required
                      value={courtCountry}
                      onChange={(e) => setCourtCountry(e.target.value)}
                      placeholder="e.g., Philippines"
                      className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                    />
                  </div>
                </div>

                {/* Interactive Map Pinning & Google Maps Link */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-brand-lime" />
                        Pin Exact Court Location <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[10px] text-brand-lime font-medium">Click map to drop / drag pin</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Search any landmark or city, click on the map, or drag the green pin marker to pinpoint your court's exact spot.
                    </p>
                  </div>

                  {/* In-Page Interactive Map Picker */}
                  <InteractiveMapPicker
                    latitude={courtLatitude}
                    longitude={courtLongitude}
                    courtAddress={courtConstructedFallbackAddress}
                    mapUrl={courtMapUrl}
                    onChange={(lat, lng, url) => {
                      setCourtLatitude(lat);
                      setCourtLongitude(lng);
                      setCourtMapUrl(url);
                    }}
                  />

                  {/* Manual Link / Coordinates Input */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Google Maps URL / Coordinates (Auto-generated from Pin)
                      </label>
                      {courtMapUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourtMapUrl('');
                            setCourtLatitude(null);
                            setCourtLongitude(null);
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Reset Pin
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={courtMapUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCourtMapUrl(val);
                          const parsed = parseGoogleMapsUrl(val, courtConstructedFallbackAddress);
                          if (parsed.coordinates) {
                            setCourtLatitude(parsed.coordinates.lat);
                            setCourtLongitude(parsed.coordinates.lng);
                          }
                        }}
                        placeholder="Auto-generated from map pin or paste Google Maps URL/iframe"
                        className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs focus:outline-none focus:border-brand-lime transition-all"
                      />
                      {courtMapUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourtMapUrl('');
                            setCourtLatitude(null);
                            setCourtLongitude(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all p-1"
                          title="Clear link"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      💡 <strong>Tip:</strong> You can also paste an existing Google Maps URL or raw coordinates (e.g., <code>13.6218, 123.1948</code>) to automatically move the interactive map pin above.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 4: COURT PHOTOS */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-left">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-slate-800/50 pb-2">
                  Court Photos
                </h4>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-all relative ${
                    dragActive 
                      ? 'border-brand-lime bg-brand-lime/10' 
                      : 'border-dark-border hover:border-brand-lime hover:bg-slate-900/30'
                  }`}
                >
                  <svg className="w-8 h-8 text-slate-400 mb-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-bold text-slate-300 text-center">Drag & Drop Court Photos here</span>
                  <span className="text-xs text-slate-500 mt-1 mb-3">Or choose files from your device</span>
                  
                  <label className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-750 transition-all cursor-pointer">
                    Browse Files
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview Grid with Reorder / Cover actions */}
                {courtImages.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Uploaded Images ({courtImages.length})</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {courtImages.map((src, index) => {
                        const isCover = index === 0;
                        return (
                          <div
                            key={index}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const draggedIdx = Number(e.dataTransfer.getData('text/plain'));
                              handleImagesDropped(draggedIdx, index);
                            }}
                            className={`relative group rounded-xl overflow-hidden border aspect-video bg-slate-950 flex items-center justify-center transition-all cursor-move ${
                              isCover ? 'border-brand-lime ring-2 ring-brand-lime/25 shadow-lg' : 'border-slate-800'
                            }`}
                          >
                            <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover select-none" />
                            
                            {/* Hover overlay panel */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              {/* Top row actions */}
                              <div className="flex justify-between items-center w-full">
                                {isCover ? (
                                  <span className="text-xs font-extrabold uppercase bg-brand-lime text-dark-bg px-2 py-0.5 rounded">
                                    Cover
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCoverImage(index)}
                                    title="Make Cover Image"
                                    className="p-1 rounded bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-brand-lime hover:border-brand-lime cursor-pointer transition-all"
                                  >
                                    <Star className="w-3 h-3" />
                                  </button>
                                )}
                                
                                <button
                                  type="button"
                                  onClick={() => setCourtImages(prev => prev.filter((_, i) => i !== index))}
                                  className="p-1 rounded bg-red-950/85 border border-red-900/30 text-red-400 hover:bg-red-650 hover:text-white cursor-pointer transition-all ml-auto"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Bottom row: Move actions */}
                              <div className="flex gap-1 justify-center w-full mt-auto">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveImage(index, index - 1)}
                                  className="p-1 rounded bg-slate-900/90 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === courtImages.length - 1}
                                  onClick={() => handleMoveImage(index, index + 1)}
                                  className="p-1 rounded bg-slate-900/90 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Cover visual badge in static mode */}
                            {isCover && (
                              <div className="absolute top-1.5 left-1.5 bg-brand-lime text-dark-bg text-xs font-extrabold px-2 py-0.5 rounded shadow pointer-events-none z-10 uppercase">
                                Cover
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 5: EQUIPMENT RENTALS & ADD-ONS */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Equipment Rentals & Add-ons
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenCreateRental}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer shadow"
                  >
                    <Plus className="w-3 h-3" /> Add Rental Item
                  </button>
                </div>

                <p className="text-xs text-slate-400">Offer optional items (like paddles, ball sets, and locker services) for users to book alongside the court.</p>

                {courtRentals.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-850 rounded-xl bg-slate-955/10 text-slate-500 text-xs">
                    No rental items added yet. Click "+ Add Rental Item" to configure.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {courtRentals.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex gap-3.5 transition-all ${
                          item.enabled 
                            ? 'bg-slate-950/30 border-slate-800 hover:border-slate-700/80' 
                            : 'bg-slate-955/10 border-slate-900 opacity-60'
                        }`}
                      >
                        {/* Rental thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl select-none flex-shrink-0 shadow-inner overflow-hidden">
                          {item.images && item.images.length > 0
                            ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                            : '🏓'}
                        </div>

                        {/* Rental specs */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="font-bold text-white text-xs truncate block">{item.name}</span>
                            
                            {/* Toggle checkbox */}
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={() => handleToggleRentalEnabled(item.id)}
                                className="sr-only peer"
                              />
                              <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-450 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-lime peer-checked:after:bg-dark-bg peer-checked:after:border-brand-lime"></div>
                            </label>
                          </div>

                          <p className="text-xs text-slate-450 line-clamp-1 mt-0.5">{item.description || 'No description provided.'}</p>
                          
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-900/60 text-xs">
                            <span className="text-brand-lime font-bold font-sans">
                              ₱{item.price} <span className="text-slate-500 font-medium text-xs">/ {item.pricingType.replace('_', ' ')}</span>
                            </span>
                            <span className="text-slate-400 font-semibold font-sans">Qty: {item.quantity}</span>
                          </div>

                          {/* Edit / Delete actions */}
                          <div className="flex gap-2 justify-end mt-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRental(item)}
                              className="text-xs font-bold text-slate-400 hover:text-brand-lime cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                            <span className="text-slate-800">|</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRental(item.id)}
                              className="text-xs font-bold text-red-400 hover:text-red-500 cursor-pointer transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCourtModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCourt}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Court'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT RENTAL ITEM MODAL */}
      {rentalModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm transition-all animate-fade-in">
          <div className="w-full max-w-md bg-dark-bg border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scale-up text-left">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-lime" />
                {editingRental ? 'Edit Rental Item' : 'Add Rental Item'}
              </h3>
              <button
                onClick={() => setRentalModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[62vh] pr-1">
              {/* ── SECTION: Basic Information ── */}
              <div className="space-y-1 pb-1">
                <p className="text-xs font-extrabold text-brand-lime uppercase tracking-widest">Basic Information</p>
              </div>


              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rentalName}
                  onChange={(e) => setRentalName(e.target.value)}
                  placeholder="e.g., Pickleball Paddle, Ball Set"
                  className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  value={rentalDescription}
                  onChange={(e) => setRentalDescription(e.target.value)}
                  placeholder="e.g., Professional grade graphite paddle, lightweight."
                  className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all resize-none font-medium"
                />
              </div>

              {/* ── SECTION: Pricing ── */}
              <div className="space-y-1 pt-1 pb-1 border-t border-slate-800/60">
                <p className="text-xs font-extrabold text-brand-lime uppercase tracking-widest pt-2">Pricing</p>
              </div>

              {/* Price & Pricing Type Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rental Price (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold font-sans">₱</span>
                    <input
                      type="number"
                      value={rentalPrice}
                      onChange={(e) => setRentalPrice(Number(e.target.value))}
                      placeholder="80"
                      className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl pl-7 pr-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all font-sans font-bold"
                    />
                  </div>
                </div>

                {/* Pricing Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing Type</label>
                  <select
                    value={rentalPricingType}
                    onChange={(e) => setRentalPricingType(e.target.value as 'per_booking' | 'per_hour' | 'per_session')}
                    className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all cursor-pointer font-medium"
                  >
                    <option value="per_booking">Per Booking</option>
                    <option value="per_hour">Per Hour</option>
                    <option value="per_session">Per Session</option>
                  </select>
                </div>
              </div>

              {/* ── SECTION: Inventory ── */}
              <div className="space-y-1 pt-1 pb-1 border-t border-slate-800/60">
                <p className="text-xs font-extrabold text-brand-lime uppercase tracking-widest pt-2">Inventory</p>
              </div>

              {/* Available Quantity */}
              <div className="space-y-1.5 max-w-[180px]">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Quantity</label>
                <input
                  type="number"
                  value={rentalQuantity}
                  onChange={(e) => setRentalQuantity(Number(e.target.value))}
                  placeholder="20"
                  className="w-full bg-dark-bg/60 border border-dark-border text-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-brand-lime transition-all font-sans font-bold"
                />
              </div>

              {/* ── SECTION: Images ── */}
              <div className="space-y-1 pt-1 pb-1 border-t border-slate-800/60">
                <p className="text-xs font-extrabold text-brand-lime uppercase tracking-widest pt-2">Images</p>
                <p className="text-xs text-slate-500">First image is used as the cover thumbnail. Accepts JPG, PNG, WEBP.</p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleRentalDrag}
                onDragLeave={handleRentalDrag}
                onDragOver={handleRentalDrag}
                onDrop={handleRentalDrop}
                className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-5 gap-2 transition-all cursor-pointer ${
                  rentalDragActive
                    ? 'border-brand-lime bg-brand-lime/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-brand-lime/50 bg-dark-bg/30 hover:bg-brand-lime/5'
                }`}
                onClick={() => document.getElementById('rental-image-file-input')?.click()}
              >
                <input
                  id="rental-image-file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={handleRentalImageUpload}
                />
                <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-300">
                    {rentalDragActive ? 'Drop images here' : 'Drag & Drop or Browse'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">JPG, PNG, WEBP • Multiple supported</p>
                </div>
                {rentalImages.length > 0 && (
                  <span className="absolute top-2 right-2 text-xs font-bold text-brand-lime bg-brand-lime/10 border border-brand-lime/20 rounded-full px-2 py-0.5">
                    {rentalImages.length} image{rentalImages.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Image Preview Grid */}
              {rentalImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {rentalImages.map((img, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('rentalImgIdx', String(idx))}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = Number(e.dataTransfer.getData('rentalImgIdx'));
                        handleRentalImagesDropped(from, idx);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab group transition-all ${
                        idx === 0 ? 'border-brand-lime' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={img} alt={`Rental ${idx + 1}`} className="w-full h-full object-cover" />

                      {/* Cover badge */}
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 bg-brand-lime text-dark-bg text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">
                          Cover
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRentalSetCover(idx); }}
                            title="Set as Cover"
                            className="text-xs font-bold text-dark-bg bg-brand-lime rounded-full px-2 py-0.5 hover:bg-[#a6e224] transition-colors"
                          >
                            ★ Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setRentalImages(prev => prev.filter((_, i) => i !== idx)); }}
                          title="Remove image"
                          className="text-xs font-bold text-white bg-red-500/80 rounded-full px-2 py-0.5 hover:bg-red-600 transition-colors"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SECTION: Availability ── */}
              <div className="space-y-1 pt-1 pb-1 border-t border-slate-800/60">
                <p className="text-xs font-extrabold text-brand-lime uppercase tracking-widest pt-2">Availability</p>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRentalEnabled(prev => !prev)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${rentalEnabled ? 'bg-brand-lime' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${rentalEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs font-semibold text-slate-300 select-none">
                  {rentalEnabled ? 'Enabled — visible to customers' : 'Disabled — hidden from customers'}
                </span>
              </div>
            </div>

            {/* Bottom Rental Modal Actions */}
            <div className="flex gap-3 mt-6 pt-5 border-t border-slate-800">
              <button
                onClick={() => setRentalModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRental}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer"
              >
                Save Rental Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COMPANY MODAL */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-lime" />
                {editingCompany ? 'Edit Company Profile' : 'Create New Company'}
              </h3>
              <button
                onClick={() => { setCompanyModalOpen(false); setEditingCompany(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Pickleball Club"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Physical Address / Location
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. 123 Sports Complex Way, Quezon City, Metro Manila"
                  value={companyAddressInput}
                  onChange={(e) => setCompanyAddressInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 resize-none"
                />
              </div>

              {/* Client Admin Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Client Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. owner@metropickle.com"
                  value={clientAdminEmailInput}
                  onChange={(e) => setClientAdminEmailInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Assigning this email will grant Client Admin permissions to manage this company's courts & bookings.
                </p>
              </div>

              {/* Company Account Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Company Account Status
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCompanyStatusInput('pending')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      companyStatusInput === 'pending'
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-sm shadow-yellow-500/10'
                        : 'bg-slate-900 border-dark-border text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Pending</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompanyStatusInput('active')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      companyStatusInput === 'active'
                        ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald shadow-sm shadow-brand-emerald/10'
                        : 'bg-slate-900 border-dark-border text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompanyStatusInput('inactive')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      companyStatusInput === 'inactive'
                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-sm shadow-red-500/10'
                        : 'bg-slate-900 border-dark-border text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    <span>Inactive</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {companyStatusInput === 'pending'
                    ? '🟡 Pending: Organization requires review / onboarding before going fully live.'
                    : companyStatusInput === 'active'
                    ? '🟢 Active: Organization is approved and fully operational on PicklePoint.'
                    : '🔴 Inactive: Organization is paused or temporarily deactivated.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setCompanyModalOpen(false); setEditingCompany(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {actionLoading !== null ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingCompany ? 'Save Changes' : 'Create Company'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND CUSTOM EMAIL MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-lime" />
                Send Email Notification
              </h3>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchEmail} className="space-y-4">
              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={emailToAddress}
                  onChange={(e) => setEmailToAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              {/* Template Quick Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Pre-made Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'custom', label: 'Custom' },
                    { id: 'approval', label: 'Approved' },
                    { id: 'cancellation', label: 'Cancelled' },
                    { id: 'reminder', label: 'Reminder' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id as any)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        emailTemplateType === t.id
                          ? 'bg-brand-lime text-dark-bg font-extrabold'
                          : 'bg-slate-900 border border-dark-border text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Subject
                </label>
                <input
                  type="text"
                  required
                  value={emailSubjectInput}
                  onChange={(e) => setEmailSubjectInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Message Body
                </label>
                <textarea
                  required
                  rows={5}
                  value={emailMessageInput}
                  onChange={(e) => setEmailMessageInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 resize-none font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSendLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-brand-lime/10"
                >
                  {emailSendLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE CLIENT ADMIN MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-brand-lime/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MailPlus className="w-5 h-5 text-brand-lime" />
                {inviteRoleInput === 'manager' ? 'Invite Facility Manager' : inviteRoleInput === 'client_admin' ? 'Invite New Client Admin' : 'Invite User'}
              </h3>
              <button
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteSuccessInfo(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccessInfo ? (
              <div className="space-y-4">
                <div className="bg-brand-emerald/10 border border-brand-emerald/30 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-emerald flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Invitation Sent & Generated!</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      An official invitation email has been dispatched to <strong className="text-brand-lime">{inviteSuccessInfo.email}</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-lime" /> Secure Single-Use Registration Link
                  </div>
                  <div className="p-2.5 bg-black/40 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 break-all select-all">
                    {inviteSuccessInfo.link}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Expires: {new Date(inviteSuccessInfo.expiresAt).toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteSuccessInfo.link);
                        setCopiedInviteLink(true);
                        setTimeout(() => setCopiedInviteLink(false), 3000);
                        showModalAlert('Link Copied', 'Invite link copied to clipboard!', 'success');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-lime hover:underline cursor-pointer"
                    >
                      {copiedInviteLink ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-brand-emerald" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-lime flex-shrink-0 mt-0.5" />
                  <span>
                    When the invitee opens the link, their email will be locked and verified against this single-use cryptographic token.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteModalOpen(false);
                      setInviteSuccessInfo(null);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer shadow-md shadow-brand-lime/10"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendClientAdminInvite} className="space-y-4">
                {/* Invitee Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Client Admin Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="facility.host@example.com"
                      value={inviteEmailInput}
                      onChange={(e) => setInviteEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 font-medium"
                    />
                  </div>
                </div>

                {/* Invitee Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Invitee Name / Facility Contact <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={inviteNameInput}
                    onChange={(e) => setInviteNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 font-medium"
                  />
                </div>

                {/* Token Expiration Window */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Invitation Expiry Window
                  </label>
                  <select
                    value={inviteExpiryHours}
                    onChange={(e) => setInviteExpiryHours(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer"
                  >
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days - Recommended)</option>
                    <option value={72}>72 Hours (3 Days)</option>
                    <option value={168}>7 Days (1 Week)</option>
                  </select>
                </div>


                {/* Security Note */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-lime flex-shrink-0 mt-0.5" />
                  <span>
                    A secure, single-use 64-character token will be generated and tied exclusively to this email address to prevent unauthorized registrations.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-brand-lime/10"
                  >
                    {inviteLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteUserModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-red-900/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Confirm User Deletion
              </h3>
              <button
                onClick={() => { setDeleteUserModalOpen(false); setUserToDelete(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete the user account for{' '}
                <strong className="text-white font-bold">{userToDelete.name}</strong> (
                <span className="text-brand-lime font-mono">{userToDelete.email}</span>)?
              </p>
              
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-[11px] text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>This action cannot be undone. All account access for this user will be revoked immediately.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setDeleteUserModalOpen(false); setUserToDelete(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading === userToDelete.email}
                  onClick={handleConfirmDeleteUser}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20"
                >
                  {actionLoading === userToDelete.email ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BOOKING CONFIRMATION MODAL */}
      {deleteBookingModalOpen && bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-red-900/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Confirm Reservation Deletion
              </h3>
              <button
                type="button"
                onClick={() => { setDeleteBookingModalOpen(false); setBookingToDelete(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Reservation card summary */}
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <span className="font-mono text-xs text-brand-lime font-bold">
                    {bookingToDelete.bookingReference || bookingToDelete.id}
                  </span>
                  <span className="text-xs font-bold text-white">
                    ₱{bookingToDelete.totalCost?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-white truncate">{bookingToDelete.courtName}</div>
                  <div className="text-slate-400 text-[11px]">
                    {bookingToDelete.date} • {bookingToDelete.slots?.length || 0} {bookingToDelete.slots?.length === 1 ? 'Slot' : 'Slots'} ({bookingToDelete.slots?.join(', ')})
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">
                    Customer: <span className="text-slate-200">{bookingToDelete.user?.name || bookingToDelete.userName || 'Guest'}</span> ({bookingToDelete.user?.email || bookingToDelete.userEmail || 'N/A'})
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Are you sure you want to permanently delete this reservation?
              </p>
              
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-[11px] text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>This reservation record will be permanently deleted from the database. This action cannot be undone.</span>
              </div>

              {bookingDeleteError && (
                <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3 text-[11px] text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{bookingDeleteError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setDeleteBookingModalOpen(false); setBookingToDelete(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bookingDeleteLoading}
                  onClick={handleConfirmDeleteBooking}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20"
                >
                  {bookingDeleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Reservation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteCourtModalOpen && courtToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-red-900/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Confirm Court Deletion
              </h3>
              <button
                type="button"
                onClick={() => { setDeleteCourtModalOpen(false); setCourtToDelete(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3">
                {courtToDelete.images && courtToDelete.images.length > 0 ? (
                  <img
                    src={courtToDelete.images[0]}
                    alt={courtToDelete.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700/80 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{courtToDelete.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{courtToDelete.type} • ₱{courtToDelete.dayPrice}-₱{courtToDelete.nightPrice}/hr</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this court? It will no longer be available for public booking or displayed in search results.
              </p>
              
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3 text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>All historical customer reservations, payment receipts, and checkout transaction records associated with this court will remain safely preserved.</span>
              </div>

              {courtDeleteError && (
                <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3 text-[11px] text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{courtDeleteError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setDeleteCourtModalOpen(false); setCourtToDelete(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={courtDeleteLoading}
                  onClick={handleConfirmDeleteCourt}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20"
                >
                  {courtDeleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Court
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {userModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-lime" />
                Edit User Profile
              </h3>
              <button
                onClick={() => { setUserModalOpen(false); setEditingUser(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              {/* Profile Avatar Preview & Photo URL */}
              <div className="flex items-center gap-4 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <div className="w-12 h-12 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-brand-lime/20">
                  <img
                    src={editUserPhotoUrl || `https://robohash.org/${encodeURIComponent(editUserName || editUserEmail || 'User')}?set=set4`}
                    alt={editUserName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(editUserName || 'User')}&background=b5f529&color=0f172a&bold=true`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Profile Avatar URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={editUserPhotoUrl}
                    onChange={(e) => setEditUserPhotoUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-dark-border text-white rounded-lg text-xs focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              {/* Role (Super Admin only) */}
              {isSuperAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned Role
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as 'player' | 'client_admin' | 'super_admin')}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <option value="player">Standard Player</option>
                    <option value="client_admin">Client Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Standard Player"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-dark-border/40 text-slate-400 rounded-xl text-xs cursor-not-allowed font-medium"
                  />
                </div>
              )}

              {/* Account Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Status
                </label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as 'active' | 'pending' | 'inactive' | 'deleted')}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer font-bold uppercase tracking-wider"
                >
                  <option value="active">Active (Normal Access)</option>
                  <option value="pending">Pending Invitation</option>
                  <option value="inactive">Inactive / Suspended</option>
                  <option value="deleted">Deleted (Deactivated)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setUserModalOpen(false); setEditingUser(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editingUser.email}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {actionLoading === editingUser.email ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPEN PLAY EVENT CREATION / EDIT MODAL */}
      {openPlayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-8 pt-8 sm:pt-12 pb-12 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-5xl w-full text-left relative shadow-2xl bg-dark-bg my-auto sm:my-4 max-h-[90vh] flex flex-col animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-5 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand-lime" />
                  {editingOpenPlay ? 'Edit Open Play Event' : 'Create Open Play Registration'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure event details, category, poster image, and choose payment GCash account.</p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Draft vs Live Switch Toggle Beside Close Button */}
                <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-2xl shadow-inner">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    openPlayStatusSetting === 'draft' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    Draft
                  </span>

                  <button
                    type="button"
                    onClick={() => setOpenPlayStatusSetting(prev => prev === 'draft' ? 'active' : 'draft')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all cursor-pointer border ${
                      openPlayStatusSetting === 'active' ? 'bg-brand-lime border-brand-lime shadow-[0_0_10px_rgba(181,245,41,0.3)]' : 'bg-slate-950 border-slate-700'
                    }`}
                    title={openPlayStatusSetting === 'draft' ? 'Click to Publish Event Live' : 'Click to Save as Draft (Hidden)'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                        openPlayStatusSetting === 'active' ? 'translate-x-6 bg-dark-bg' : 'translate-x-1 bg-amber-400'
                      }`}
                    />
                  </button>

                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    openPlayStatusSetting === 'active' ? 'text-brand-lime' : 'text-slate-400'
                  }`}>
                    Live
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenPlayModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveOpenPlayEvent} className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={openPlayTitle}
                    onChange={(e) => setOpenPlayTitle(e.target.value)}
                    placeholder="e.g. Friday Night Social Open Play"
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Event Location */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Venue Location / Address</label>
                  <input
                    type="text"
                    value={openPlayLocation}
                    onChange={(e) => setOpenPlayLocation(e.target.value)}
                    placeholder="e.g. 123 Sports Complex, Makati City"
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Court Selection Section (Select 1, Multiple, or All Courts) */}
                <div className="space-y-2 md:col-span-2 p-4 rounded-2xl bg-slate-900/90 border border-dark-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-brand-lime" /> Assigned Venue Courts *
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Select 1 or more courts reserved for this Open Play session (e.g. 2 courts, 3 courts, or all courts).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        openPlayCourtIds.length > 0
                          ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        {openPlayCourtIds.length} of {availableAdminCourts.length} Selected
                      </span>

                      <button
                        type="button"
                        onClick={handleSelectAllOpenPlayCourts}
                        className="text-[11px] text-brand-lime hover:underline font-bold transition-all cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600 text-xs">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllOpenPlayCourts}
                        className="text-[11px] text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Court Selection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                    {availableAdminCourts.map((court) => {
                      const isSelected = openPlayCourtIds.includes(court.id);
                      return (
                        <div
                          key={court.id}
                          onClick={() => handleToggleOpenPlayCourt(court.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                            isSelected
                              ? 'bg-brand-lime/10 border-brand-lime text-white shadow-sm shadow-brand-lime/5'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                              isSelected ? 'bg-brand-lime border-brand-lime text-dark-bg' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="truncate">
                              <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {court.name}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {court.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {openPlayCourtIds.length === 0 && (
                    <p className="text-[11px] text-red-400 font-bold pt-1">
                      ⚠️ Please select at least 1 court for this Open Play event.
                    </p>
                  )}
                </div>

                {/* Event Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={openPlayDate}
                    onChange={(e) => setOpenPlayDate(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Category</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpenPlayCategoryOpen(!isOpenPlayCategoryOpen);
                        setIsOpenPlaySkillOpen(false);
                        setIsOpenPlayGcashOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                    >
                      <span className="truncate">
                        {openPlayCategory || 'Open to All'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpenPlayCategoryOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                    </button>

                    {isOpenPlayCategoryOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpenPlayCategoryOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          {['Open to All', 'Beginner', 'Intermediate', 'Advanced', 'Doubles', 'Singles'].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setOpenPlayCategory(cat as any);
                                setIsOpenPlayCategoryOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                openPlayCategory === cat ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{cat}</span>
                              {openPlayCategory === cat && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Skill Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Skill Level Rating</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpenPlaySkillOpen(!isOpenPlaySkillOpen);
                        setIsOpenPlayCategoryOpen(false);
                        setIsOpenPlayGcashOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                    >
                      <span className="truncate">
                        {openPlaySkillLevel || 'All Skill Levels'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpenPlaySkillOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                    </button>

                    {isOpenPlaySkillOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpenPlaySkillOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          {[
                            'All Skill Levels',
                            '2.0 - 2.5 (Beginner)',
                            '3.0 - 3.5 (Intermediate)',
                            '3.5 - 4.0 (Advanced)',
                            '4.0+ (Competitive / DUPR)'
                          ].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => {
                                setOpenPlaySkillLevel(lvl);
                                setIsOpenPlaySkillOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                openPlaySkillLevel === lvl ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{lvl}</span>
                              {openPlaySkillLevel === lvl && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Host Contact Phone Number */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Host / Organizer Contact Phone Number</span>
                    <span className="text-[10px] text-brand-lime font-normal">Pre-filled from Venue Profile</span>
                  </label>
                  <input
                    type="tel"
                    value={openPlayHostPhone}
                    onChange={(e) => setOpenPlayHostPhone(e.target.value)}
                    placeholder="e.g. +63 917 123 4567"
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Time Slots */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Start Time</label>
                  <input
                    type="time"
                    value={openPlayStartTime}
                    onChange={(e) => setOpenPlayStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">End Time</label>
                  <input
                    type="time"
                    value={openPlayEndTime}
                    onChange={(e) => setOpenPlayEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* 3 COURT ROTATION & PLAY FORMAT RULE OPTIONS */}
                <div className="space-y-2 md:col-span-2 p-4 rounded-2xl bg-slate-900/90 border border-dark-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-brand-lime" /> Paddle Rotation & Court Rules (3 Options) *
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Select the court rotation rule for players after each completed match.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {/* Option 1: Winners Stay */}
                    <div
                      onClick={() => setOpenPlayRotationRule('winners_stay')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        openPlayRotationRule === 'winners_stay'
                          ? 'bg-brand-lime/10 border-brand-lime text-white shadow-lg shadow-brand-lime/5'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            👑 Winners Stay (King of Court)
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            openPlayRotationRule === 'winners_stay' ? 'bg-brand-lime border-brand-lime text-dark-bg' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {openPlayRotationRule === 'winners_stay' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Winning team stays on court (max 2 consecutive games cap). Losers rotate off into the waiting paddle stack.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-brand-lime uppercase tracking-wider mt-3 block">
                        • Standard Open Play
                      </span>
                    </div>

                    {/* Option 2: All 4 Rotate */}
                    <div
                      onClick={() => setOpenPlayRotationRule('all_4_rotate')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        openPlayRotationRule === 'all_4_rotate'
                          ? 'bg-blue-500/10 border-blue-500 text-white shadow-lg shadow-blue-500/5'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            🔄 All 4 Players Rotate Off
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            openPlayRotationRule === 'all_4_rotate' ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {openPlayRotationRule === 'all_4_rotate' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          All 4 players (winners and losers) leave the court after each game, replacing the entire court with the next 4 players in queue.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-3 block">
                        • Full Court Rotation
                      </span>
                    </div>

                    {/* Option 3: Split Winners & Rotate */}
                    <div
                      onClick={() => setOpenPlayRotationRule('split_winners')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        openPlayRotationRule === 'split_winners'
                          ? 'bg-purple-500/10 border-purple-500 text-white shadow-lg shadow-purple-500/5'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            🔀 Split Winners & Mix Partners
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            openPlayRotationRule === 'split_winners' ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {openPlayRotationRule === 'split_winners' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Winners split up and play as opponents in the next match with incoming new partners from the queue.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mt-3 block">
                        • Social Mix & Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* RECURRING / LOOPING EVENT SCHEDULE */}
                {!editingOpenPlay && (
                  <div className="md:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-brand-lime" />
                        <div>
                          <label className="text-xs font-bold text-white uppercase tracking-wider block">
                            Repeat this Event (Recurring Weekly Loop)
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Automatically create scheduled sessions every week (e.g. Every Tuesday, Saturday, or custom days).
                          </span>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRecurringEnabled}
                          onChange={(e) => setIsRecurringEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-450 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-lime peer-checked:after:bg-dark-bg peer-checked:after:border-brand-lime"></div>
                      </label>
                    </div>

                    {isRecurringEnabled && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-fade-in">
                        {/* Days of Week Selector */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                            Select Repeat Day(s) of the Week:
                          </label>
                          <div className="grid grid-cols-7 gap-1.5">
                            {[
                              { id: 'monday', label: 'Mon' },
                              { id: 'tuesday', label: 'Tue' },
                              { id: 'wednesday', label: 'Wed' },
                              { id: 'thursday', label: 'Thu' },
                              { id: 'friday', label: 'Fri' },
                              { id: 'saturday', label: 'Sat' },
                              { id: 'sunday', label: 'Sun' },
                            ].map(day => {
                              const isDaySelected = recurringDays.includes(day.id);
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  onClick={() => handleToggleRecurringDay(day.id)}
                                  className={`py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer border ${
                                    isDaySelected
                                      ? 'bg-brand-lime text-dark-bg border-brand-lime shadow-sm'
                                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Recurrence Duration (Weeks) */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                            Recurrence Duration:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { weeks: 2, label: '2 Weeks' },
                              { weeks: 4, label: '4 Weeks (1 Mo)' },
                              { weeks: 8, label: '8 Weeks (2 Mo)' },
                              { weeks: 12, label: '12 Weeks (3 Mo)' },
                            ].map(preset => (
                              <button
                                key={preset.weeks}
                                type="button"
                                onClick={() => setRecurringWeeksCount(preset.weeks)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  recurringWeeksCount === preset.weeks
                                    ? 'bg-brand-lime/15 border-brand-lime text-brand-lime font-black'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic Live Preview Box */}
                        {(() => {
                          const previewDates = calculateRecurringDates(openPlayDate, recurringDays, recurringWeeksCount);
                          return (
                            <div className="p-3 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-medium flex items-center gap-2">
                              <CalendarCheck className="w-4 h-4 flex-shrink-0" />
                              <span>
                                <strong>Will generate {previewDates.length} scheduled sessions</strong> ({previewDates.slice(0, 3).join(', ')}{previewDates.length > 3 ? ` + ${previewDates.length - 3} more` : ''})
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Registration Fee */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Registration Fee (₱ PHP)</label>
                  <input
                    type="number"
                    min={0}
                    value={openPlayFee}
                    onChange={(e) => setOpenPlayFee(Number(e.target.value))}
                    placeholder="250"
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* Capacity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Max Participants / Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={openPlayMaxParticipants}
                    onChange={(e) => setOpenPlayMaxParticipants(Number(e.target.value))}
                    placeholder="16"
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                {/* PAYMENT METHOD SELECTOR (GCash Account Selection) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Payment Method / Recipient GCash Account *</span>
                    <span className="text-[10px] text-brand-lime normal-case">Loaded from Checkout Settings</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpenPlayGcashOpen(!isOpenPlayGcashOpen);
                        setIsOpenPlayCategoryOpen(false);
                        setIsOpenPlaySkillOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                    >
                      <span className="truncate">
                        {(() => {
                          if (openPlayGcashAccountId === 'global') {
                            return `${globalGcashNameSetting || 'Global Account'} — (${globalGcashNumberSetting}) [Global Fallback]`;
                          }
                          const found = personalAccounts.find(acc => acc.id === openPlayGcashAccountId);
                          if (found) {
                            return `${found.paymentName ? `${found.paymentName} — ` : ''}${found.gcashName} (${found.gcashNumber})`;
                          }
                          if (personalAccounts.length > 0) {
                            const first = personalAccounts[0];
                            return `${first.paymentName ? `${first.paymentName} — ` : ''}${first.gcashName} (${first.gcashNumber})`;
                          }
                          return 'Select GCash Payment Destination';
                        })()}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpenPlayGcashOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                    </button>

                    {isOpenPlayGcashOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpenPlayGcashOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          {personalAccounts.map((acc) => {
                            const labelText = `${acc.paymentName ? `${acc.paymentName} — ` : ''}${acc.gcashName} (${acc.gcashNumber})`;
                            const isSelected = openPlayGcashAccountId === acc.id || (!openPlayGcashAccountId && personalAccounts[0]?.id === acc.id);
                            return (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => {
                                  setOpenPlayGcashAccountId(acc.id);
                                  setIsOpenPlayGcashOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{labelText}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                              </button>
                            );
                          })}
                          {(globalGcashNameSetting || globalGcashNumberSetting) && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenPlayGcashAccountId('global');
                                setIsOpenPlayGcashOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                                openPlayGcashAccountId === 'global' ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{globalGcashNameSetting || 'Global Account'} — ({globalGcashNumberSetting}) [Global Fallback]</span>
                              {openPlayGcashAccountId === 'global' && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Poster Image Upload (Matching Court Photos Upload Style 1:1) */}
                <div className="space-y-3 md:col-span-2 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <label className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Poster Image Upload <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    {openPlayPosterUrl && (
                      <span className="text-[10px] font-bold text-brand-lime uppercase tracking-widest bg-brand-lime/10 px-2 py-0.5 rounded border border-brand-lime/30">
                        Poster Attached
                      </span>
                    )}
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPosterDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPosterDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPosterDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPosterDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processOpenPlayPosterFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 px-4 cursor-pointer transition-all relative ${
                      posterDragActive 
                        ? 'border-brand-lime bg-brand-lime/10' 
                        : 'border-dark-border hover:border-brand-lime hover:bg-slate-900/30'
                    }`}
                  >
                    <svg className="w-8 h-8 text-slate-400 mb-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-bold text-slate-300 text-center">Drag & Drop Event Poster image here</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 mb-2.5">Or choose an image file from your device</span>
                    
                    <label className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-750 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-brand-lime" />
                      <span>{openPlayPosterUrl ? 'Change Poster File' : 'Browse Poster File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && processOpenPlayPosterFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Poster Preview Card */}
                  {openPlayPosterUrl && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Event Poster Preview</span>
                      <div className="relative group rounded-xl overflow-hidden border border-brand-lime ring-2 ring-brand-lime/25 shadow-lg max-w-sm aspect-video bg-slate-950 flex items-center justify-center transition-all">
                        <img src={openPlayPosterUrl} alt="Event Poster Preview" className="w-full h-full object-cover select-none" />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] font-extrabold uppercase bg-brand-lime text-dark-bg px-2 py-0.5 rounded">
                              Event Banner
                            </span>
                            <button
                              type="button"
                              onClick={() => setOpenPlayPosterUrl('')}
                              className="p-1 rounded bg-red-950/85 border border-red-900/30 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer transition-all ml-auto"
                              title="Remove Poster"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="mt-auto">
                            <label className="w-full py-1.5 px-3 bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5">
                              <Upload className="w-3 h-3 text-brand-lime" />
                              <span>Upload Different Poster</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && processOpenPlayPosterFile(e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description & Venue Rules */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-lime" /> Description, Play Format & Venue House Rules
                    </label>
                    
                    {/* Quick Rules Auto-Fill Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const openPlayTemplate = `🎾 PLAY FORMAT & ROTATION:
• Paddle Stack System: Winner stays 2 games max, then rotates back into paddle rack.
• Game Scoring: First to 11 points (win by 2) or 12-minute time cap per match.
• All skill levels welcome - games arranged by ladder rotation.

👟 VENUE HOUSE RULES:
• Footwear: Non-marking court shoes mandatory on pickleball surfaces.
• Arrive 10-15 minutes prior to session start for court assignment.
• Hydration: Water refill stations available on-site. Bring a reusable bottle.

🎒 EQUIPMENT & GEAR:
• Tournament balls provided by venue.
• Demo paddles available for rent at reception desk.`;

                          setOpenPlayDescription(prev => prev.trim() ? `${prev}\n\n${openPlayTemplate}` : openPlayTemplate);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Fill Standard Open Play Rules
                      </button>

                      {policyRules && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenPlayDescription(prev => prev.trim() ? `${prev}\n\n📋 VENUE HOUSE RULES:\n${policyRules}` : `📋 VENUE HOUSE RULES:\n${policyRules}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-brand-lime text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          📋 Import Saved Court Rules
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={openPlayDescription}
                    onChange={(e) => setOpenPlayDescription(e.target.value)}
                    placeholder="Provide full details about play format (e.g., King of the Court, round-robin, paddle stack rotation), skill level expectations, venue house rules, footwear, and equipment guidelines..."
                    className="w-full bg-slate-900 border border-dark-border text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all resize-y min-h-[140px] leading-relaxed"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border mt-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenPlayModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-6 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all flex items-center gap-2 cursor-pointer shadow"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-dark-bg" /> : <Check className="w-4 h-4" />}
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAYER ROSTER & PAYMENT VERIFICATION MODAL (Disabled - using Full Page Roster view instead) */}
      {false && registrationsModalOpen && selectedEventForRegs && (() => {
        const selEvt = selectedEventForRegs!;
        const eventRegs = openPlayRegistrations.filter(r => r.eventId === selEvt.id);
        
        interface RosterAttendee {
          id: string;
          registrationId: string;
          type: 'primary' | 'guest';
          name: string;
          email: string;
          phone: string;
          hostName?: string;
          guestIndex?: number;
          paymentStatus: string;
          status: string;
          gcashReferenceNumber?: string;
          receiptImageUrl?: string;
          createdAt?: string;
          regObj: OpenPlayRegistration;
        }

        const allAttendees: RosterAttendee[] = [];
        eventRegs.forEach(reg => {
          const primaryName = reg.playerName || reg.userName || 'Player';
          const primaryEmail = reg.playerEmail || reg.userEmail || '';
          const primaryPhone = reg.playerPhone || reg.userPhone || '';
          const gcashRef = reg.gcashReferenceNumber || '';
          const paymentStatus = reg.paymentStatus || 'pending';
          const status = reg.status || 'pending';

          const isAddGuestOnly = reg.isAddGuestOnly === true || (reg as any).isAddGuestOnly === true;

          // Primary Player (Only if NOT an add-guest-only entry)
          if (!isAddGuestOnly) {
            allAttendees.push({
              id: `${reg.id}-primary`,
              registrationId: reg.id,
              type: 'primary',
              name: primaryName,
              email: primaryEmail,
              phone: primaryPhone,
              paymentStatus,
              status,
              gcashReferenceNumber: gcashRef,
              receiptImageUrl: reg.receiptImageUrl,
              createdAt: reg.createdAt,
              regObj: reg
            });
          }

          // Guests
          const spots = reg.playerCount || 1;
          const numGuests = isAddGuestOnly
            ? Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots || 1)
            : Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots > 1 ? spots - 1 : 0);
          const hostName = reg.primaryPlayerName || (reg as any).primaryPlayerName || primaryName;

          for (let gIdx = 0; gIdx < numGuests; gIdx++) {
            const gName = reg.guests?.[gIdx]?.name || reg.guestNames?.[gIdx] || `Guest #${gIdx + 1} (${hostName})`;
            const gEmail = reg.guests?.[gIdx]?.email || reg.guestEmails?.[gIdx] || `Shared (${reg.primaryPlayerEmail || primaryEmail})`;
            allAttendees.push({
              id: `${reg.id}-guest-${gIdx}`,
              registrationId: reg.id,
              type: 'guest',
              name: gName,
              email: gEmail,
              phone: primaryPhone,
              hostName: hostName,
              guestIndex: gIdx + 1,
              paymentStatus,
              status,
              gcashReferenceNumber: gcashRef,
              receiptImageUrl: reg.receiptImageUrl,
              createdAt: reg.createdAt,
              regObj: reg
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

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-8 pt-8 sm:pt-12 pb-12 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
            <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-5xl w-full text-left relative shadow-2xl bg-dark-bg my-auto sm:my-4 max-h-[90vh] flex flex-col animate-scale-up">
              
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-dark-border mb-5 gap-3 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-lime" /> {selEvt.title} — Player & Guest Roster
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Full headcount breakdown: review registered primary players, guests, verify GCash payments, and track session attendance.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleExportOpenPlayRoster(selEvt)}
                    className="py-1.5 px-3 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald hover:text-dark-bg transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Export complete player & guest CSV"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>

                  <button
                    onClick={() => setRegistrationsModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Headcount Stat Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs flex-shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-extrabold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Total Headcount: {totalHeadcount} / {selEvt.maxParticipants}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                    👤 {primaryCount} Primary Players
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-950/40 border border-purple-800/50 text-purple-300 font-bold">
                    👥 {guestCount} Guests
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald font-bold">
                    ✓ {approvedHeadcount} Approved
                  </span>
                  {pendingHeadcount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">
                      ⏳ {pendingHeadcount} Pending Review
                    </span>
                  )}
                </div>
              </div>

              {/* View Switcher & Search Bar Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 flex-shrink-0">
                {/* View Mode Toggle Buttons */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    onClick={() => setRosterModalViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      rosterModalViewMode === 'cards'
                        ? 'bg-brand-lime text-dark-bg shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Cards View
                  </button>
                  <button
                    onClick={() => setRosterModalViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      rosterModalViewMode === 'list'
                        ? 'bg-brand-lime text-dark-bg shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Attendance List
                  </button>
                  <button
                    onClick={() => setRosterModalViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      rosterModalViewMode === 'table'
                        ? 'bg-brand-lime text-dark-bg shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Bookings Table
                  </button>
                </div>

                {/* Search Input & Role Filters */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search player, guest, email, GCash ref..."
                      value={rosterSearchQuery}
                      onChange={(e) => setRosterSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime transition-all"
                    />
                  </div>

                  <select
                    value={rosterFilterRole}
                    onChange={(e) => setRosterFilterRole(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-lime cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="primary">Primary Only</option>
                    <option value="guest">Guests Only</option>
                  </select>
                </div>
              </div>

              {/* Content Views */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-4">
                
                {/* VIEW 1: CARDS GRID VIEW */}
                {rosterModalViewMode === 'cards' && (
                  filteredAttendees.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic bg-slate-900/30 rounded-2xl border border-slate-800/50">
                      No players or guests match the current search filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {filteredAttendees.map((att, idx) => {
                        const isApproved = att.status === 'approved' || att.paymentStatus === 'paid';
                        const isPending = att.paymentStatus === 'pending_verification';

                        return (
                          <div
                            key={att.id}
                            className={`glass-panel border rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden shadow-md ${
                              att.type === 'guest'
                                ? 'bg-purple-950/20 border-purple-900/40 hover:border-purple-800/60'
                                : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              {/* Attendee Header (Number + Role Badge) */}
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-black text-[11px] ${
                                    att.type === 'guest'
                                      ? 'bg-purple-950 border-purple-700 text-purple-300'
                                      : 'bg-slate-800 border-slate-700 text-white'
                                  }`}>
                                    {idx + 1}
                                  </div>

                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                    att.type === 'guest'
                                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                      : 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime'
                                  }`}>
                                    {att.type === 'guest' ? `Guest #${att.guestIndex}` : 'Primary Player'}
                                  </span>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                  isApproved
                                    ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                                    : isPending
                                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                  {isApproved ? '✓ Paid' : isPending ? '⏳ Pending' : '✗ Rejected'}
                                </span>
                              </div>

                              {/* Name & Contact */}
                              <h4 className="text-sm font-extrabold text-white leading-snug truncate mb-1">
                                {att.name}
                              </h4>

                              {att.type === 'guest' && att.hostName && (
                                <div className="text-[11px] font-semibold text-purple-300 mb-2 flex items-center gap-1">
                                  <span>Host:</span>
                                  <span className="text-white underline">{att.hostName}</span>
                                </div>
                              )}

                              <div className="space-y-1 text-xs text-slate-400 mb-3">
                                {att.email && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                                    <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                    <span className="truncate">{att.email}</span>
                                  </div>
                                )}
                                {att.phone && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                    <span>{att.phone}</span>
                                  </div>
                                )}
                                {att.gcashReferenceNumber && (
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-brand-lime">
                                    <CreditCard className="w-3 h-3 text-brand-lime flex-shrink-0" />
                                    <span>Ref: {att.gcashReferenceNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Footer: Receipt & Verification Action */}
                            <div className="pt-2.5 border-t border-dark-border/40 flex items-center justify-between gap-2 mt-auto text-[11px]">
                              {att.receiptImageUrl ? (
                                <button
                                  onClick={() => setReceiptLightboxImage(att.receiptImageUrl || null)}
                                  className="text-brand-lime hover:underline font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  Receipt <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ) : (
                                <span className="text-slate-600 text-[10px] italic">No receipt</span>
                              )}

                              {isPending && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={async () => {
                                      setActionLoading(att.registrationId);
                                      try {
                                        if (isFirebaseConfigured && db) {
                                          await updateDoc(doc(db, 'openplay_registrations', att.registrationId), { paymentStatus: 'paid', status: 'approved' });
                                        }
                                        const updateLocal = (str: string | null) => {
                                          if (!str) return;
                                          try {
                                            const updated = JSON.parse(str).map((r: any) => r.id === att.registrationId ? { ...r, paymentStatus: 'paid', status: 'approved' } : r);
                                            return JSON.stringify(updated);
                                          } catch { return null; }
                                        };
                                        const lsStr = localStorage.getItem('picklepoint_openplay_registrations');
                                        const ssStr = sessionStorage.getItem('picklepoint_openplay_registrations');
                                        const updatedLs = updateLocal(lsStr);
                                        const updatedSs = updateLocal(ssStr);
                                        if (updatedLs) localStorage.setItem('picklepoint_openplay_registrations', updatedLs);
                                        if (updatedSs) sessionStorage.setItem('picklepoint_openplay_registrations', updatedSs);
                                        setOpenPlayRegistrations(prev => prev.map(r => r.id === att.registrationId ? { ...r, paymentStatus: 'paid', status: 'approved' } : r));
                                      } catch (err) {
                                        console.error('Failed to approve registration:', err);
                                      } finally {
                                        setActionLoading(null);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-brand-lime text-dark-bg font-extrabold text-[10px] uppercase hover:bg-[#a6e224] transition-all cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Are you sure you want to reject this payment?')) return;
                                      setActionLoading(att.registrationId);
                                      try {
                                        if (isFirebaseConfigured && db) {
                                          await updateDoc(doc(db, 'openplay_registrations', att.registrationId), { paymentStatus: 'failed', status: 'cancelled' });
                                        }
                                        const updateLocal = (str: string | null) => {
                                          if (!str) return;
                                          try {
                                            const updated = JSON.parse(str).map((r: any) => r.id === att.registrationId ? { ...r, paymentStatus: 'failed', status: 'cancelled' } : r);
                                            return JSON.stringify(updated);
                                          } catch { return null; }
                                        };
                                        const lsStr = localStorage.getItem('picklepoint_openplay_registrations');
                                        const ssStr = sessionStorage.getItem('picklepoint_openplay_registrations');
                                        const updatedLs = updateLocal(lsStr);
                                        const updatedSs = updateLocal(ssStr);
                                        if (updatedLs) localStorage.setItem('picklepoint_openplay_registrations', updatedLs);
                                        if (updatedSs) sessionStorage.setItem('picklepoint_openplay_registrations', updatedSs);
                                        setOpenPlayRegistrations(prev => prev.map(r => r.id === att.registrationId ? { ...r, paymentStatus: 'failed', status: 'cancelled' } : r));
                                      } catch (err) {
                                        console.error('Failed to reject registration:', err);
                                      } finally {
                                        setActionLoading(null);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 font-extrabold text-[10px] uppercase hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* VIEW 2: ATTENDANCE LIST VIEW */}
                {rosterModalViewMode === 'list' && (
                  filteredAttendees.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic bg-slate-900/30 rounded-2xl border border-slate-800/50">
                      No players or guests match the current search filter.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAttendees.map((att, idx) => {
                        const isApproved = att.status === 'approved' || att.paymentStatus === 'paid';
                        const isPending = att.paymentStatus === 'pending_verification';

                        return (
                          <div
                            key={att.id}
                            className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-white text-xs flex-shrink-0">
                                {idx + 1}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-white text-sm truncate">
                                    {att.name}
                                  </span>

                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                    att.type === 'guest'
                                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                      : 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime'
                                  }`}>
                                    {att.type === 'guest' ? `Guest of ${att.hostName}` : 'Primary Player'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                                  {att.email && <span>{att.email}</span>}
                                  {att.phone && <span>• {att.phone}</span>}
                                  {att.gcashReferenceNumber && (
                                    <span className="font-mono text-brand-lime font-bold">• Ref: {att.gcashReferenceNumber}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                              {att.receiptImageUrl ? (
                                <button
                                  onClick={() => setReceiptLightboxImage(att.receiptImageUrl || null)}
                                  className="text-brand-lime hover:underline font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  View Receipt <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ) : (
                                <span className="text-slate-600 text-[10px] italic">No receipt</span>
                              )}

                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                                isApproved
                                  ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                                  : isPending
                                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                  : 'bg-red-500/10 border-red-500/30 text-red-400'
                              }`}>
                                {isApproved ? '✓ Confirmed' : isPending ? '⏳ Pending' : '✗ Rejected'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* VIEW 3: BOOKINGS TABLE VIEW */}
                {rosterModalViewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-dark-border/60 bg-slate-900/40 text-slate-400 text-xs font-extrabold uppercase tracking-wider">
                          <th className="py-3.5 px-4">Primary Player & Guests</th>
                          <th className="py-3.5 px-4">Contact</th>
                          <th className="py-3.5 px-4">GCash Reference</th>
                          <th className="py-3.5 px-4">Receipt</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border/40 text-xs">
                        {eventRegs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                              No players have registered for this Open Play session yet.
                            </td>
                          </tr>
                        ) : (
                          eventRegs.map((reg) => (
                            <tr key={reg.id} className="hover:bg-slate-900/20 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-white">
                                <div>{reg.playerName || reg.userName || 'Player'}</div>
                                {((reg.guestCount && reg.guestCount > 0) || (reg.guests && reg.guests.length > 0)) && (
                                  <div className="text-[11px] font-semibold text-brand-lime mt-1 flex flex-col gap-0.5">
                                    <span>
                                      +{reg.guestCount || reg.guests?.length} {reg.guestCount === 1 ? 'Guest' : 'Guests'}:
                                    </span>
                                    <span className="text-slate-300 font-normal">
                                      {reg.guests && reg.guests.length > 0
                                        ? reg.guests.map(g => g.name || g.email).filter(Boolean).join(', ')
                                        : reg.guestNames && reg.guestNames.length > 0
                                        ? reg.guestNames.join(', ')
                                        : 'Guest names on file'}
                                    </span>
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                  Total Spots: {reg.playerCount || 1}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-slate-300">
                                <div>{reg.playerEmail || reg.userEmail}</div>
                                {(reg.playerPhone || reg.userPhone) && <div className="text-[11px] text-slate-500">{reg.playerPhone || reg.userPhone}</div>}
                              </td>

                              <td className="py-3.5 px-4 font-mono font-bold text-brand-lime">
                                {reg.gcashReferenceNumber}
                              </td>

                              <td className="py-3.5 px-4">
                                {reg.receiptImageUrl ? (
                                  <button
                                    onClick={() => setReceiptLightboxImage(reg.receiptImageUrl || null)}
                                    className="text-brand-lime hover:underline font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                  >
                                    View Receipt <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                ) : (
                                  <span className="text-slate-500 italic">No receipt file</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                  reg.status === 'approved' || reg.paymentStatus === 'paid'
                                    ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
                                    : reg.status === 'cancelled' || reg.paymentStatus === 'failed'
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                }`}>
                                  {reg.status === 'approved' || reg.paymentStatus === 'paid'
                                    ? '✓ Approved'
                                    : reg.status === 'cancelled' || reg.paymentStatus === 'failed'
                                    ? '✗ Rejected'
                                    : '⏳ Pending Review'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {reg.paymentStatus === 'pending_verification' && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          setActionLoading(reg.id);
                                          try {
                                            if (isFirebaseConfigured && db) {
                                              await updateDoc(doc(db, 'openplay_registrations', reg.id), { paymentStatus: 'paid', status: 'approved' });
                                            }
                                            const updateLocal = (str: string | null) => {
                                              if (!str) return;
                                              try {
                                                const updated = JSON.parse(str).map((r: any) => r.id === reg.id ? { ...r, paymentStatus: 'paid', status: 'approved' } : r);
                                                return JSON.stringify(updated);
                                              } catch { return null; }
                                            };
                                            const lsStr = localStorage.getItem('picklepoint_openplay_registrations');
                                            const ssStr = sessionStorage.getItem('picklepoint_openplay_registrations');
                                            const updatedLs = updateLocal(lsStr);
                                            const updatedSs = updateLocal(ssStr);
                                            if (updatedLs) localStorage.setItem('picklepoint_openplay_registrations', updatedLs);
                                            if (updatedSs) sessionStorage.setItem('picklepoint_openplay_registrations', updatedSs);
                                            setOpenPlayRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, paymentStatus: 'paid', status: 'approved' } : r));
                                          } catch (err) {
                                            console.error('Failed to approve registration:', err);
                                          } finally {
                                            setActionLoading(null);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-brand-lime text-dark-bg font-extrabold text-[10px] uppercase hover:bg-[#a6e224] transition-all cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!confirm('Are you sure you want to reject this registration payment?')) return;
                                          setActionLoading(reg.id);
                                          try {
                                            if (isFirebaseConfigured && db) {
                                              await updateDoc(doc(db, 'openplay_registrations', reg.id), { paymentStatus: 'failed', status: 'cancelled' });
                                            }
                                            const updateLocal = (str: string | null) => {
                                              if (!str) return;
                                              try {
                                                const updated = JSON.parse(str).map((r: any) => r.id === reg.id ? { ...r, paymentStatus: 'failed', status: 'cancelled' } : r);
                                                return JSON.stringify(updated);
                                              } catch { return null; }
                                            };
                                            const lsStr = localStorage.getItem('picklepoint_openplay_registrations');
                                            const ssStr = sessionStorage.getItem('picklepoint_openplay_registrations');
                                            const updatedLs = updateLocal(lsStr);
                                            const updatedSs = updateLocal(ssStr);
                                            if (updatedLs) localStorage.setItem('picklepoint_openplay_registrations', updatedLs);
                                            if (updatedSs) sessionStorage.setItem('picklepoint_openplay_registrations', updatedSs);
                                            setOpenPlayRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, paymentStatus: 'failed', status: 'cancelled' } : r));
                                          } catch (err) {
                                            console.error('Failed to reject registration:', err);
                                          } finally {
                                            setActionLoading(null);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 font-extrabold text-[10px] uppercase hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {reg.paymentStatus !== 'pending_verification' && (
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                      reg.status === 'approved' || reg.paymentStatus === 'paid'
                                        ? 'text-brand-emerald'
                                        : reg.status === 'cancelled'
                                        ? 'text-red-400'
                                        : 'text-slate-500'
                                    }`}>
                                      {reg.status === 'approved' || reg.paymentStatus === 'paid'
                                        ? '✓ Approved'
                                        : reg.status === 'cancelled'
                                        ? '✗ Rejected'
                                        : 'Done'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}
      {/* DAILY CALENDAR HOURLY SLOT BREAKDOWN MODAL */}
      {selectedCalendarDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in"
          onClick={() => setSelectedCalendarDate(null)}
        >
          <div
            className="glass-panel max-w-4xl w-full max-h-[90vh] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/95 shadow-2xl flex flex-col animate-scale-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Daily Court Schedule & Reserved Slots
                  </h3>
                  <p className="text-xs text-brand-lime font-bold mt-0.5">
                    {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-900 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {(() => {
                const dateBookings = bookings.filter(
                  (b) =>
                    b.date === selectedCalendarDate &&
                    (selectedCalendarCourtId === 'all' ? true : b.courtId === selectedCalendarCourtId)
                );
                const approvedBookings = dateBookings.filter((b) => b.status === 'approved');
                const pendingBookings = dateBookings.filter((b) => b.status === 'pending');
                const dateRevenue = approvedBookings.reduce((sum, b) => sum + b.totalCost, 0);

                const activeBookedSlots = dateBookings
                  .filter((b) => b.status !== 'cancelled')
                  .flatMap((b) => b.slots);

                const reservedSlotCount = new Set(activeBookedSlots).size;

                // Determine operating hours for this specific day of the week
                const dateObj = new Date(selectedCalendarDate + 'T00:00:00');
                const dayKeys: (keyof DailyOperatingHoursMap)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayKey = dayKeys[dateObj.getDay()];

                const daySchedule = myCompany?.operatingHours?.[dayKey] || DEFAULT_OPERATING_HOURS[dayKey];
                const isDayOff = daySchedule?.isDayOff ?? !daySchedule?.isOpen;

                const openHour = parseTimeStringToHour(daySchedule?.openTime || '05:00 AM');
                const closeHour = parseTimeStringToHour(daySchedule?.closeTime || '10:00 PM');

                const activeSlots = isDayOff
                  ? []
                  : SLOTS.filter((s) => s.startHour >= openHour && s.startHour < closeHour);

                const blockedSlots = activeSlots.filter((slot) =>
                  dateBookings.some((b) => b.status !== 'cancelled' && b.slots.includes(slot.time))
                );
                const availableSlots = activeSlots.filter(
                  (slot) => !dateBookings.some((b) => b.status !== 'cancelled' && b.slots.includes(slot.time))
                );

                const displaySlots =
                  calendarSlotFilter === 'blocked'
                    ? blockedSlots
                    : calendarSlotFilter === 'available'
                    ? availableSlots
                    : activeSlots;

                return (
                  <>
                    {/* Metrics Summary Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Revenue</span>
                        <span className="text-lg font-bold text-brand-lime font-sans mt-0.5 block">₱{dateRevenue.toLocaleString()}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reserved Slots</span>
                        <span className="text-lg font-bold text-brand-emerald font-sans mt-0.5 block">{reservedSlotCount} / {activeSlots.length}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved Bookings</span>
                        <span className="text-lg font-bold text-white font-sans mt-0.5 block">{approvedBookings.length}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
                        <span className="text-lg font-bold text-amber-400 font-sans mt-0.5 block">{pendingBookings.length}</span>
                      </div>
                    </div>

                    {/* Hourly Slots Schedule Table / List */}
                    {isDayOff ? (
                      <div className="p-8 border border-slate-800 rounded-2xl bg-slate-950/50 text-center flex flex-col items-center justify-center min-h-[220px] space-y-3 opacity-85">
                        <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                          <Clock className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">Venue Closed (Day Off)</h4>
                          <p className="text-xs text-slate-400 max-w-[320px] leading-relaxed">
                            The venue is scheduled as <strong className="text-slate-200">Day Off</strong> on {dayKey ? dayKey.charAt(0).toUpperCase() + dayKey.slice(1) + 's' : 'this day'}. Operating slots are unavailable.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Filter Tabs Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
                          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-850">
                            <button
                              type="button"
                              onClick={() => setCalendarSlotFilter('all')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                calendarSlotFilter === 'all'
                                  ? 'bg-brand-lime text-dark-bg shadow-sm font-sans'
                                  : 'text-slate-400 hover:text-white font-sans'
                              }`}
                            >
                              All Slots ({activeSlots.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalendarSlotFilter('blocked')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                calendarSlotFilter === 'blocked'
                                  ? 'bg-brand-lime text-dark-bg shadow-sm font-sans'
                                  : 'text-slate-400 hover:text-white font-sans'
                              }`}
                            >
                              Blocked / Reserved ({blockedSlots.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalendarSlotFilter('available')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                calendarSlotFilter === 'available'
                                  ? 'bg-brand-lime text-dark-bg shadow-sm font-sans'
                                  : 'text-slate-400 hover:text-white font-sans'
                              }`}
                            >
                              Available Only ({availableSlots.length})
                            </button>
                          </div>

                          <span className="text-[11px] text-slate-400 font-medium px-2">
                            Showing {daySchedule?.openTime || '5:00 AM'} – {daySchedule?.closeTime || '10:00 PM'} operating hours
                          </span>
                        </div>

                        {displaySlots.length === 0 ? (
                          <div className="p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-center flex flex-col items-center justify-center min-h-[180px]">
                            <Filter className="w-8 h-8 text-slate-600 mb-2" />
                            <h5 className="text-xs font-bold text-slate-300">No Time Slots Match Filter</h5>
                            <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                              There are currently no slots under the <strong className="text-slate-300">'{calendarSlotFilter === 'blocked' ? 'Blocked / Reserved' : calendarSlotFilter === 'available' ? 'Available' : 'All'}'</strong> filter for this date.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                            {displaySlots.map((slot) => {
                              const bookingForSlot = dateBookings.find(
                                (b) => b.status !== 'cancelled' && b.slots.includes(slot.time)
                              );

                              const isNight = slot.startHour >= 18;
                              const selectedCourtObj = courts.find((c) => c.id === selectedCalendarCourtId);
                              const dayPrice = selectedCourtObj ? selectedCourtObj.dayPrice : 100;
                              const nightPrice = selectedCourtObj ? selectedCourtObj.nightPrice : 150;
                              const price = getSlotPrice(slot.startHour, dayPrice, nightPrice);

                              if (bookingForSlot) {
                                const isApproved = bookingForSlot.status === 'approved';
                                const isPending = bookingForSlot.status === 'pending';

                                // Color theme grouping based on booking ID or user key
                                const groupKey = bookingForSlot.id || bookingForSlot.user?.email || bookingForSlot.userName || 'default';
                                const theme = getBookingColorTheme(groupKey);

                                const userName = bookingForSlot.user?.name || bookingForSlot.userName || 'Client';
                                const userEmail = bookingForSlot.user?.email || bookingForSlot.userEmail || '';
                                const userPhone = bookingForSlot.userPhone || bookingForSlot.user?.phone || '';

                                return (
                                  <div
                                    key={slot.time}
                                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 shadow-md ${theme.bg} ${theme.border}`}
                                  >
                                    {/* Slot Header: Time & Status Badge */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} animate-pulse`}></span>
                                        <span className="text-xs font-extrabold text-white font-mono">{slot.time}</span>
                                      </div>
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${theme.badge}`}>
                                        {isApproved ? 'RESERVED / BLOCKED' : 'PENDING REVIEW'}
                                      </span>
                                    </div>

                                    {/* Booked Player & Details Card */}
                                    <div className="bg-slate-950/75 p-3 rounded-xl border border-slate-800/90 space-y-2">
                                      {/* User Name & Price */}
                                      <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                                            <span>{userName}</span>
                                          </div>
                                          {userEmail && (
                                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                              <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                              <span className="truncate max-w-[200px]">{userEmail}</span>
                                            </div>
                                          )}
                                        </div>
                                        <span className={`text-xs font-extrabold font-sans ${theme.text}`}>
                                          ₱{price}
                                        </span>
                                      </div>

                                      {/* Additional Booking Info Grid */}
                                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-900 text-[10px]">
                                        <div>
                                          <span className="text-slate-500 uppercase tracking-wider block font-bold">Contact:</span>
                                          <span className="text-slate-300 font-medium">{userPhone || 'N/A'}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 uppercase tracking-wider block font-bold">Court:</span>
                                          <span className="text-slate-300 font-medium truncate block">{bookingForSlot.courtName || 'Court'}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 uppercase tracking-wider block font-bold">Payment:</span>
                                          <span className="text-slate-300 font-medium">{bookingForSlot.paymentMethod || 'GCash'}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 uppercase tracking-wider block font-bold">Booking Ref:</span>
                                          <span className="text-slate-300 font-mono font-medium">{bookingForSlot.bookingReference || bookingForSlot.id.slice(0, 8)}</span>
                                        </div>
                                      </div>

                                      {bookingForSlot.gcashReferenceNumber && (
                                        <div className="text-[10px] text-slate-400 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 flex items-center justify-between">
                                          <span className="text-slate-500 font-bold uppercase">GCash Ref:</span>
                                          <span className="font-mono text-brand-lime font-bold">{bookingForSlot.gcashReferenceNumber}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    {(() => {
                                      const isPastDate = isPastBookingDate(bookingForSlot.date || selectedCalendarDate || '');

                                      return (
                                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-900/60">
                                          {isPending && !isPastDate && (
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateStatus(bookingForSlot.id, 'approved')}
                                              className="px-2.5 py-1 rounded-lg bg-brand-lime text-dark-bg font-extrabold text-[10px] uppercase hover:bg-[#a6e224] transition-all cursor-pointer shadow-sm"
                                            >
                                              Approve
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            disabled={isPastDate}
                                            onClick={() => {
                                              if (isPastDate) return;
                                              handleOpenEdit(bookingForSlot);
                                              setSelectedCalendarDate(null);
                                            }}
                                            title={isPastDate ? 'Past reservations cannot be edited' : 'Edit Booking'}
                                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                                              isPastDate
                                                ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed opacity-40'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer'
                                            }`}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isPastDate}
                                            onClick={() => {
                                              if (isPastDate) return;
                                              handleUpdateStatus(bookingForSlot.id, 'cancelled');
                                            }}
                                            title={isPastDate ? 'Past reservations cannot be cancelled' : 'Cancel Booking'}
                                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                                              isPastDate
                                                ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed opacity-40'
                                                : 'bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer'
                                            }`}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={slot.time}
                                  className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900/80 hover:border-slate-800 transition-all text-left flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                                    <div>
                                      <span className="text-xs font-bold text-slate-300 font-mono block">{slot.time}</span>
                                      <span className="text-[10px] text-slate-500 font-sans">{isNight ? 'Night Rate' : 'Day Rate'}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 font-sans">₱{price}</span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-500 border border-slate-800">
                                      AVAILABLE
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING IN-APP PAYMENT APPROVAL REMINDER TOAST */}
      {pendingReminderToast && pendingReminderToast.open && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-slide-left pointer-events-auto">
          <div className="glass-panel rounded-2xl border border-amber-500/40 bg-slate-950/95 backdrop-blur-xl p-4.5 shadow-2xl shadow-black/80 flex items-start gap-3.5 text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400"></div>

            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Approval Reminder
                </span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>

              <h4 className="text-xs font-bold text-white mt-1.5 leading-snug">
                {pendingReminderToast.count} Customer Payment{pendingReminderToast.count > 1 ? 's' : ''} Awaiting Review
              </h4>

              <p className="text-[11px] text-slate-400 mt-1">
                There are reservation checkout payments needing your verification. Approve them to issue active player vouchers.
              </p>

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPendingReminderToast(null);
                    setActiveTab('checkouts');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-lime text-dark-bg text-xs font-bold hover:bg-[#a6e224] transition-all cursor-pointer shadow-md shadow-brand-lime/10 flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Review Checkouts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingReminderToast(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPendingReminderToast(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-900"
              title="Close Reminder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* OPEN PLAY DELETE CONFIRMATION MODAL ALERT */}
      {deletingOpenPlayEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-red-900/40 rounded-3xl max-w-md w-full shadow-2xl relative text-left overflow-hidden flex flex-col">
            {/* Extended Header Title Divider */}
            <div className="flex justify-between items-center p-6 sm:px-8 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Confirm Open Play Deletion
              </h3>
              <button
                type="button"
                onClick={() => setDeletingOpenPlayEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-4">
              {/* Event card summary */}
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <span className="font-extrabold text-xs text-brand-lime truncate">
                    {deletingOpenPlayEvent.title}
                  </span>
                  <span className="text-xs font-bold text-white flex-shrink-0">
                    {deletingOpenPlayEvent.registrationFee > 0 ? `₱${deletingOpenPlayEvent.registrationFee}` : 'FREE'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                    <span>{formatEventDateLong(deletingOpenPlayEvent.eventDate)} ({formatTime12h(deletingOpenPlayEvent.startTime)} - {formatTime12h(deletingOpenPlayEvent.endTime)})</span>
                  </div>
                  {deletingOpenPlayEvent.courtNames && deletingOpenPlayEvent.courtNames.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                      <span>{deletingOpenPlayEvent.courtNames.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Are you sure you want to permanently delete this Open Play event?
              </p>
              
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-[11px] text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>This Open Play session record will be permanently deleted from the database. This action cannot be undone.</span>
              </div>
            </div>

            {/* Extended Footer Divider */}
            <div className="p-6 sm:px-8 border-t border-slate-800 bg-slate-950/40 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingOpenPlayEvent(null)}
                disabled={actionLoading === deletingOpenPlayEvent.id}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deletingOpenPlayEvent) return;
                  const targetId = deletingOpenPlayEvent.id;
                  setActionLoading(targetId);
                  try {
                    if (isFirebaseConfigured && db) {
                      await deleteDoc(doc(db, 'openplay_events', targetId));
                    }
                    const localStr = localStorage.getItem('picklepoint_openplay_events') || sessionStorage.getItem('picklepoint_openplay_events');
                    if (localStr) {
                      const filtered = JSON.parse(localStr).filter((e: any) => e.id !== targetId);
                      try { localStorage.setItem('picklepoint_openplay_events', JSON.stringify(filtered)); } catch (e) {}
                      try { sessionStorage.setItem('picklepoint_openplay_events', JSON.stringify(filtered)); } catch (e) {}
                    }
                    setOpenPlayEvents(prev => prev.filter(e => e.id !== targetId));
                    setDeletingOpenPlayEvent(null);
                  } catch (err) {
                    console.error('Failed to delete event:', err);
                    alert('Failed to delete event: ' + (err as Error).message);
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={actionLoading === deletingOpenPlayEvent.id}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading === deletingOpenPlayEvent.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVITE USER MODAL                                                         */}
      {/* ========================================================================= */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setInviteModalOpen(false);
                setInviteSuccessInfo(null);
                setCopiedInviteLink(false);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isSuperAdmin ? 'Invite Platform User' : `Invite Facility Manager`}
                </h3>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin
                    ? 'Issue an authorized invitation link to register a new user on Book Picklecourt.'
                    : `Issue a single-use registration link for a new manager at ${effectiveOrgName || 'your facility'}.`}
                </p>
              </div>
            </div>

            {/* Role Selection Selector */}
            {isSuperAdmin ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Select Account Role *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRoleInput('client_admin')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      inviteRoleInput === 'client_admin'
                        ? 'bg-brand-lime/10 border-brand-lime text-brand-lime shadow-md shadow-brand-lime/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      🎾 Client Admin
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">Facility Host</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRoleInput('manager')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      inviteRoleInput === 'manager'
                        ? 'bg-brand-lime/10 border-brand-lime text-brand-lime shadow-md shadow-brand-lime/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      📋 Manager
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">Facility Staff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRoleInput('super_admin')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      inviteRoleInput === 'super_admin'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      🛡️ Super Admin
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">Global Platform</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRoleInput('player')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      inviteRoleInput === 'player'
                        ? 'bg-sky-500/10 border-sky-500 text-sky-400 shadow-md shadow-sky-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      ⚡ Player
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">Member</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Select Staff Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRoleInput('manager')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      inviteRoleInput === 'manager'
                        ? 'bg-brand-lime/10 border-brand-lime text-brand-lime shadow-md shadow-brand-lime/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      📋 Facility Manager
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">Full Operations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRoleInput('editor')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      inviteRoleInput === 'editor'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      ✏️ Staff Editor
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">Check-in Staff</span>
                  </button>
                </div>
              </div>
            )}

            {/* Super Admin Security Alert */}
            {inviteRoleInput === 'super_admin' && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2 animate-fade-in">
                <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span><strong>Security Notice:</strong> Super Admin role grants full global administrative privileges including managing system fees, viewing revenue, and configuring platform settings.</span>
              </div>
            )}

            {inviteSuccessInfo && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs space-y-2 animate-fade-in">
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Invitation successfully created and email dispatched to {inviteSuccessInfo.email}!</span>
                </div>

                {inviteSuccessInfo.link && (
                  <div className="pt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      SHAREABLE INVITATION LINK
                    </label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-[11px] text-brand-lime break-all">
                      <span className="flex-1 truncate mr-2">{inviteSuccessInfo.link}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteSuccessInfo.link);
                          setCopiedInviteLink(true);
                          setTimeout(() => setCopiedInviteLink(false), 3000);
                          showModalAlert('Link Copied', 'Invite link copied to clipboard!', 'success');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                      >
                        {copiedInviteLink ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-brand-emerald" />
                            <span className="text-brand-emerald font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSendInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  placeholder="e.g. user@picklezone.ph"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime font-mono"
                />
              </div>

              {/* Dynamic Field: Facility / Company Name for Client Admin */}
              {inviteRoleInput === 'client_admin' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Assigned Facility / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteCompanyNameInput}
                    onChange={(e) => setInviteCompanyNameInput(e.target.value)}
                    placeholder="e.g. PickleZone Libmanan"
                    className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime"
                  />
                </div>
              )}

              {/* Dynamic Field: Department for Super Admin */}
              {inviteRoleInput === 'super_admin' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Administrative Designation / Department (Optional)</label>
                  <input
                    type="text"
                    value={inviteDepartmentInput}
                    onChange={(e) => setInviteDepartmentInput(e.target.value)}
                    placeholder="e.g. Operations & Support Team"
                    className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime"
                  />
                </div>
              )}

              {/* Dynamic Field: Preferred Facility for Player */}
              {inviteRoleInput === 'player' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Preferred Facility Affiliation (Optional)</label>
                  <input
                    type="text"
                    value={inviteCompanyNameInput}
                    onChange={(e) => setInviteCompanyNameInput(e.target.value)}
                    placeholder="e.g. PickleZone Libmanan (or leave blank for Global)"
                    className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime"
                  />
                </div>
              )}


              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInviteSuccessInfo(null);
                    setCopiedInviteLink(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {inviteLoading
                      ? 'Sending Invite...'
                      : inviteRoleInput === 'editor'
                      ? 'Send Staff Editor Invite'
                      : inviteRoleInput === 'manager'
                      ? 'Send Manager Invite'
                      : inviteRoleInput === 'super_admin'
                      ? 'Send Super Admin Invite'
                      : inviteRoleInput === 'player'
                      ? 'Send Player Invite'
                      : 'Send Client Admin Invite'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Custom Modal Alert */}
      <AdminModalAlert alert={modalAlert} onClose={() => setModalAlert((prev) => ({ ...prev, open: false }))} />

      {/* Contact Support Modal (Client Admin & Manager) */}
      <AdminContactSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        user={user}
      />

      {/* Client Admin & Manager Support Tickets History Modal */}
      <AdminClientTicketsModal
        isOpen={isClientTicketsModalOpen}
        onClose={() => setIsClientTicketsModalOpen(false)}
        user={user}
        onOpenSubmitModal={() => setIsSupportModalOpen(true)}
      />
    </div>
  );
}