import React, { useState, useEffect } from 'react';
import {
  Clock,
  DollarSign,
  Building2,
  User,
  Save,
  CheckCircle2,
  Globe,
  Bell,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Volume2,
  Mail,
  Shield,
  Copy,
  ExternalLink,
  Upload,
  Check,
  MapPin,
  Sparkles,
  QrCode,
  ChevronDown,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { AdminPoliciesTab } from './AdminPoliciesTab';
import { GcashAmountQrModal } from '../modals/GcashAmountQrModal';
import {
  type AdminUser,
  type UserAccount,
  type UserRole,
  type UserPermissions,
  type AdminSettingsSubTab,
  type Company,
  type DailyOperatingHoursMap,
  type CourtPolicies,
  DAYS_OF_WEEK,
  OPERATING_TIME_OPTIONS
} from '../adminTypes';

export interface PaymentReminderSettings {
  enabled: boolean;
  preset: '5' | '10' | '15' | '30' | 'custom';
  intervalMinutes: number;
  customMinutes: number;
  emailEnabled: boolean;
  emailRecipient: string;
  soundEnabled: boolean;
  browserNotificationEnabled: boolean;
}

export interface GcashAccount {
  id: string;
  paymentName?: string;
  gcashName: string;
  gcashNumber: string;
  gcashQrCode: string;
}

const REGIONS_FALLBACK = [
  { code: '1300000000', name: 'National Capital Region (NCR)' },
  { code: '0100000000', name: 'Region I (Ilocos Region)' },
  { code: '0200000000', name: 'Region II (Cagayan Valley)' },
  { code: '0300000000', name: 'Region III (Central Luzon)' },
  { code: '0400000000', name: 'Region IV-A (CALABARZON)' },
  { code: '1700000000', name: 'MIMAROPA Region' },
  { code: '0500000000', name: 'Region V (Bicol Region)' },
  { code: '0600000000', name: 'Region VI (Western Visayas)' },
  { code: '0700000000', name: 'Region VII (Central Visayas)' },
  { code: '0800000000', name: 'Region VIII (Eastern Visayas)' },
  { code: '0900000000', name: 'Region IX (Zamboanga Peninsula)' },
  { code: '1000000000', name: 'Region X (Northern Mindanao)' },
  { code: '1100000000', name: 'Region XI (Davao Region)' },
  { code: '1200000000', name: 'Region XII (SOCCSKSARGEN)' },
  { code: '1400000000', name: 'Cordillera Administrative Region (CAR)' },
  { code: '1600000000', name: 'Region XIII (Caraga)' },
  { code: '1900000000', name: 'Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)' }
];

interface AdminSettingsTabProps {
  user: AdminUser | null;
  settingsSubTab: AdminSettingsSubTab;
  setSettingsSubTab: (subTab: AdminSettingsSubTab) => void;

  // Profile Props
  adminDisplayName?: string;
  setAdminDisplayName?: (val: string) => void;
  adminPhone?: string;
  setAdminPhone?: (val: string) => void;
  onSaveAdminProfile?: (e?: any) => Promise<void>;

  // Organization Props (with Subdomain / Venue Slug)
  companyProfile?: Company | null;
  orgProfileName?: string;
  setOrgProfileName?: (val: string) => void;
  orgProfilePhone?: string;
  setOrgProfilePhone?: (val: string) => void;
  orgSubdomain?: string;
  setOrgSubdomain?: (val: string) => void;
  orgAddressLine1?: string;
  setOrgAddressLine1?: (val: string) => void;
  orgAddressLine2?: string;
  setOrgAddressLine2?: (val: string) => void;
  orgPostalCode?: string;
  setOrgPostalCode?: (val: string) => void;
  orgCountry?: string;
  setOrgCountry?: (val: string) => void;
  orgSelectedRegion?: string;
  orgSelectedProvince?: string;
  orgSelectedCity?: string;
  orgSelectedBarangay?: string;
  orgProvinces?: { code: string; name: string }[];
  orgCities?: { code: string; name: string }[];
  orgBarangays?: { code: string; name: string }[];
  handleOrgRegionChange?: (e: any) => void;
  handleOrgProvinceChange?: (e: any) => void;
  handleOrgCityChange?: (e: any) => void;
  handleOrgBarangayChange?: (e: any) => void;
  orgProfileWebsite?: string;
  setOrgProfileWebsite?: (val: string) => void;
  orgProfileFacebook?: string;
  setOrgProfileFacebook?: (val: string) => void;
  orgProfileInstagram?: string;
  setOrgProfileInstagram?: (val: string) => void;
  orgProfileLogoUrl?: string | null;
  setOrgProfileLogoUrl?: (val: string | null) => void;
  processOrgLogoFile?: (file: File) => void;
  orgOperatingHours?: DailyOperatingHoursMap;
  setOrgOperatingHours?: React.Dispatch<React.SetStateAction<DailyOperatingHoursMap>>;
  handleToggleDayOff?: (dayKey: keyof DailyOperatingHoursMap) => void;
  handleDayTimeChange?: (dayKey: keyof DailyOperatingHoursMap, field: 'openTime' | 'closeTime', value: string) => void;
  handleApplyMonToAll?: () => void;
  onSaveOrgProfile?: (e?: any) => Promise<void>;

  // GCash Props
  personalAccounts?: GcashAccount[];
  globalGcashName?: string;
  globalGcashNumber?: string;
  globalGcashQr?: string;
  onOpenGcashModal?: (type: 'my' | 'global', accountOrId?: any) => void;
  onDeleteGcashAccount?: (id: string) => void;

  // Reminders Props
  paymentReminderSettings?: PaymentReminderSettings;
  setPaymentReminderSettings?: React.Dispatch<React.SetStateAction<PaymentReminderSettings>>;
  onSavePaymentReminderSettings?: () => Promise<void>;
  onRequestNotificationPermission?: () => Promise<boolean>;
  onTestReminderAlert?: () => void;
  onTestReminderEmail?: () => Promise<void>;

  // Lead Time Props
  bookingLeadTimeMinutes: number;
  onSaveLeadTime: (minutes: number) => Promise<void>;

  // Service Fee Props
  globalServiceFee?: number;
  globalServiceFeeEnabled?: boolean;
  onSaveServiceFee?: (fee: number, enabled: boolean) => Promise<void>;

  // Team / Manager Invite Props
  onOpenInviteManagerModal?: () => void;
  teamMembers?: UserAccount[];
  onSaveManager?: (updatedManager: UserAccount) => Promise<void>;
  onDeleteManager?: (managerToDelete: UserAccount) => Promise<void>;

  // Policies Props
  policies?: CourtPolicies;
  onSavePolicies?: (policies: CourtPolicies) => Promise<void>;

  isSuperAdmin: boolean;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  user,
  settingsSubTab,
  setSettingsSubTab: _setSettingsSubTab,
  onOpenInviteManagerModal,
  teamMembers = [],
  onSaveManager,
  onDeleteManager,
  policies,
  onSavePolicies,
  adminDisplayName = '',
  setAdminDisplayName,
  adminPhone = '',
  setAdminPhone,
  onSaveAdminProfile,
  companyProfile,
  orgProfileName = '',
  setOrgProfileName,
  orgProfilePhone = '',
  setOrgProfilePhone,
  orgSubdomain = '',
  setOrgSubdomain,
  orgAddressLine1 = '',
  setOrgAddressLine1,
  orgAddressLine2 = '',
  setOrgAddressLine2,
  orgPostalCode = '',
  setOrgPostalCode,
  orgCountry = 'Philippines',
  setOrgCountry,
  orgSelectedRegion = '',
  orgSelectedProvince = '',
  orgSelectedCity = '',
  orgSelectedBarangay = '',
  orgProvinces = [],
  orgCities = [],
  orgBarangays = [],
  handleOrgRegionChange,
  handleOrgProvinceChange,
  handleOrgCityChange,
  handleOrgBarangayChange,
  orgProfileWebsite = '',
  setOrgProfileWebsite,
  orgProfileFacebook = '',
  setOrgProfileFacebook,
  orgProfileInstagram = '',
  setOrgProfileInstagram,
  orgProfileLogoUrl = null,
  setOrgProfileLogoUrl,
  processOrgLogoFile,
  orgOperatingHours,
  handleToggleDayOff,
  handleDayTimeChange,
  handleApplyMonToAll,
  onSaveOrgProfile,
  personalAccounts = [],
  globalGcashName = '',
  globalGcashNumber = '',
  globalGcashQr: _globalGcashQr = '',
  onOpenGcashModal,
  onDeleteGcashAccount,
  paymentReminderSettings,
  setPaymentReminderSettings,
  onSavePaymentReminderSettings,
  onRequestNotificationPermission,
  onTestReminderAlert,
  onTestReminderEmail,
  bookingLeadTimeMinutes,
  onSaveLeadTime,
  globalServiceFee,
  globalServiceFeeEnabled,
  onSaveServiceFee,
  isSuperAdmin,
}) => {
  // Local form saving loading feedback states
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [adminProfileSaved, setAdminProfileSaved] = useState(false);

  const [savingOrgProfile, setSavingOrgProfile] = useState(false);
  const [orgProfileSaved, setOrgProfileSaved] = useState(false);

  const [savingLeadTime, setSavingLeadTime] = useState(false);
  const [leadTimeSaved, setLeadTimeSaved] = useState(false);

  const [savingFee, setSavingFee] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);

  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);

  const [copiedSlugLink, setCopiedSlugLink] = useState(false);
  const [selectedAmountQrAccount, setSelectedAmountQrAccount] = useState<GcashAccount | null>(null);

  // Popover States for Location Dropdowns & Operating Hours
  const [isOrgRegionOpen, setIsOrgRegionOpen] = useState(false);
  const [isOrgProvinceOpen, setIsOrgProvinceOpen] = useState(false);
  const [isOrgCityOpen, setIsOrgCityOpen] = useState(false);
  const [isOrgBarangayOpen, setIsOrgBarangayOpen] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);

  // Manager / Staff Edit & Delete Modal States
  const [editingManager, setEditingManager] = useState<UserAccount | null>(null);
  const [deletingManager, setDeletingManager] = useState<UserAccount | null>(null);
  const [editManagerName, setEditManagerName] = useState('');
  const [editManagerRole, setEditManagerRole] = useState<UserRole>('manager');
  const [editManagerStatus, setEditManagerStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  const [editManagerPermissions, setEditManagerPermissions] = useState<UserPermissions>({
    canManageBookings: true,
    canManageCourts: true,
    canManageOpenPlay: true,
    canManageVouchers: true,
  });
  const [isEditStatusDropdownOpen, setIsEditStatusDropdownOpen] = useState(false);
  const [managerActionLoading, setManagerActionLoading] = useState(false);

  const handleStartEditManager = (m: UserAccount) => {
    setEditingManager(m);
    setEditManagerName(m.name || '');
    const currentRole = (m.role as UserRole) || 'manager';
    setEditManagerRole(currentRole);
    setEditManagerStatus((m.status as any) || 'active');

    const defaultPerms: UserPermissions = currentRole === 'editor' ? {
      canManageBookings: true,
      canManageCourts: false,
      canManageOpenPlay: true,
      canManageVouchers: false,
      canViewFinancials: false,
      canManageTeam: false,
    } : {
      canManageBookings: true,
      canManageCourts: true,
      canManageOpenPlay: true,
      canManageVouchers: true,
      canViewFinancials: false,
      canManageTeam: false,
    };

    setEditManagerPermissions(m.permissions ? { ...defaultPerms, ...m.permissions } : defaultPerms);
  };

  const handleSaveEditManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManager || !onSaveManager) return;
    setManagerActionLoading(true);
    try {
      await onSaveManager({
        ...editingManager,
        name: editManagerName.trim() || editingManager.name,
        role: editManagerRole,
        status: editManagerStatus,
        permissions: editManagerPermissions,
      });
      setEditingManager(null);
    } catch (err) {
      console.error('Error saving manager edit:', err);
    } finally {
      setManagerActionLoading(false);
    }
  };

  const handleConfirmDeleteManager = async () => {
    if (!deletingManager || !onDeleteManager) return;
    setManagerActionLoading(true);
    try {
      await onDeleteManager(deletingManager);
      setDeletingManager(null);
    } catch (err) {
      console.error('Error deleting manager:', err);
    } finally {
      setManagerActionLoading(false);
    }
  };

  const [leadTimeInput, setLeadTimeInput] = useState(bookingLeadTimeMinutes);
  const [feeAmount, setFeeAmount] = useState(globalServiceFee || 0);
  const [feeEnabled, setFeeEnabled] = useState(!!globalServiceFeeEnabled);

  useEffect(() => {
    setFeeAmount(globalServiceFee || 0);
    setFeeEnabled(!!globalServiceFeeEnabled);
  }, [globalServiceFee, globalServiceFeeEnabled]);

  // Subdomain slug calculation with dynamic base URL
  const baseAppUrl = import.meta.env.VITE_APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://bookpicklecourt.com');
  const cleanBaseUrl = baseAppUrl.replace(/\/+$/, '');
  const resolvedSubdomain = orgSubdomain || companyProfile?.subdomain || companyProfile?.id || (user as any)?.companyId || 'picklezone1';
  const fullPublicVenueUrl = `${cleanBaseUrl}/venue/${resolvedSubdomain}`;

  const handleCopySubdomainUrl = () => {
    navigator.clipboard.writeText(fullPublicVenueUrl);
    setCopiedSlugLink(true);
    setTimeout(() => setCopiedSlugLink(false), 3000);
  };

  const handleAdminProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveAdminProfile) return;
    setSavingAdminProfile(true);
    try {
      await onSaveAdminProfile();
      setAdminProfileSaved(true);
      setTimeout(() => setAdminProfileSaved(false), 3000);
    } catch (err) {
      console.error('Admin profile save error:', err);
    } finally {
      setSavingAdminProfile(false);
    }
  };

  const handleOrgProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveOrgProfile) return;
    setSavingOrgProfile(true);
    try {
      await onSaveOrgProfile();
      setOrgProfileSaved(true);
      setTimeout(() => setOrgProfileSaved(false), 3000);
    } catch (err) {
      console.error('Org profile save error:', err);
    } finally {
      setSavingOrgProfile(false);
    }
  };

  const handleLeadTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLeadTime(true);
    try {
      await onSaveLeadTime(leadTimeInput);
      setLeadTimeSaved(true);
      setTimeout(() => setLeadTimeSaved(false), 3000);
    } catch (err) {
      console.error('Lead time save error:', err);
    } finally {
      setSavingLeadTime(false);
    }
  };

  const handleServiceFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveServiceFee) return;
    setSavingFee(true);
    try {
      await onSaveServiceFee(feeAmount, feeEnabled);
      setFeeSaved(true);
      setTimeout(() => setFeeSaved(false), 3000);
    } catch (err) {
      console.error('Service fee save error:', err);
    } finally {
      setSavingFee(false);
    }
  };

  const handleReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSavePaymentReminderSettings) return;
    setSavingReminder(true);
    try {
      await onSavePaymentReminderSettings();
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 3000);
    } catch (err) {
      console.error('Reminder settings save error:', err);
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-left w-full">

      {/* ========================================================================= */}
      {/* VENUE RULES & POLICIES SUB-TAB                                            */}
      {/* ========================================================================= */}
      {settingsSubTab === 'policies' && (
        <AdminPoliciesTab
          policies={policies || { cancellationPolicy: '', rulesPolicy: '', weatherPolicy: '', equipmentPolicy: '' }}
          onSavePolicies={onSavePolicies || (async () => {})}
        />
      )}

      {/* ========================================================================= */}
      {/* FACILITY TEAM & USER ACCESS CONTROL SUB-TAB                              */}
      {/* ========================================================================= */}
      {settingsSubTab === 'team' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Facility Team & User Access Control</h4>
                <p className="text-xs text-slate-400">Manage facility team roles, managers, staff editors, and fine-grained feature permissions.</p>
              </div>
            </div>

            {onOpenInviteManagerModal && (
              <button
                type="button"
                onClick={onOpenInviteManagerModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all flex items-center gap-1.5 shadow-md shadow-brand-lime/10 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Staff Member</span>
              </button>
            )}
          </div>

          {/* Role Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Primary Owner</span>
                <span className="text-xs font-extrabold text-white flex items-center gap-1">🎾 Client Admin</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-brand-lime/20 text-brand-lime">1 Owner</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Operational Staff</span>
                <span className="text-xs font-extrabold text-white flex items-center gap-1">📋 Facility Managers</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400">
                {teamMembers.filter(m => m.role === 'manager').length} Assigned
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Front-Desk / Check-in</span>
                <span className="text-xs font-extrabold text-white flex items-center gap-1">✏️ Staff Editors</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400">
                {teamMembers.filter(m => m.role === 'editor').length} Assigned
              </span>
            </div>
          </div>

          {/* Managers & Staff Roster Table */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Access Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-400">No facility team members found.</p>
                        <p className="text-[11px] text-slate-500 mt-1">Click <strong>Invite Staff Member</strong> above to issue a registration link.</p>
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((m, idx) => {
                      const isOwner = m.role === 'client_admin';
                      const isEditorRole = m.role === 'editor';
                      const perms = m.permissions || (isEditorRole ? { canManageBookings: true, canManageOpenPlay: true } : { canManageBookings: true, canManageCourts: true, canManageOpenPlay: true, canManageVouchers: true });

                      return (
                        <tr key={m.uid || m.email || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-white">
                            {m.name || 'Pending Invitee'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {m.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              isOwner
                                ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime'
                                : isEditorRole
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                            }`}>
                              {isOwner ? '🎾 Client Admin' : isEditorRole ? '✏️ Editor' : '📋 Facility Manager'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {perms.canManageBookings && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">Bookings</span>
                              )}
                              {perms.canManageCourts && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">Courts</span>
                              )}
                              {perms.canManageOpenPlay && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">Open Play</span>
                              )}
                              {perms.canManageVouchers && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">Vouchers</span>
                              )}
                              {perms.canViewFinancials && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">Financials</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              m.status === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                            }`}>
                              {m.status || 'pending'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isOwner ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditManager(m)}
                                  title="Edit Staff Access"
                                  className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2.5"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-brand-lime" />
                                  <span>Manage Access</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingManager(m)}
                                  title="Delete Staff Account"
                                  className="p-1.5 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/80 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Primary Host</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EDIT STAFF MEMBER MODAL WITH CHECKBOX PERMISSIONS */}
          {editingManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-left">
              <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-brand-lime/30 shadow-2xl space-y-5 relative bg-slate-900/95 max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setEditingManager(null)}
                  className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Manage Staff Access & Permissions</h3>
                    <p className="text-xs text-slate-400">Configure role and custom checkbox permissions for {editingManager.name || editingManager.email}.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveEditManagerSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Staff Member Name *</label>
                    <input
                      type="text"
                      required
                      value={editManagerName}
                      onChange={(e) => setEditManagerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={editingManager.email}
                      className="w-full bg-[#050711]/60 border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  {/* ROLE & STATUS SELECTION */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Assigned Staff Role *
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditManagerRole('manager');
                            setEditManagerPermissions({
                              canManageBookings: true,
                              canManageCourts: true,
                              canManageOpenPlay: true,
                              canManageVouchers: true,
                              canViewFinancials: false,
                              canManageTeam: false,
                            });
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            editManagerRole === 'manager'
                              ? 'bg-sky-500/10 border-sky-400 text-sky-300 shadow-md shadow-sky-500/10 font-bold ring-1 ring-sky-400/30'
                              : 'bg-[#050711] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs font-extrabold flex items-center gap-1.5">
                            📋 Facility Manager
                          </span>
                          <span className="text-[10px] opacity-75 mt-1">Full Operations Staff</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditManagerRole('editor');
                            setEditManagerPermissions({
                              canManageBookings: true,
                              canManageCourts: false,
                              canManageOpenPlay: true,
                              canManageVouchers: false,
                              canViewFinancials: false,
                              canManageTeam: false,
                            });
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            editManagerRole === 'editor'
                              ? 'bg-amber-500/10 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10 font-bold ring-1 ring-amber-400/30'
                              : 'bg-[#050711] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs font-extrabold flex items-center gap-1.5">
                            ✏️ Staff Editor
                          </span>
                          <span className="text-[10px] opacity-75 mt-1">Front-Desk & Check-in</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Account Status *
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsEditStatusDropdownOpen(!isEditStatusDropdownOpen)}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-3 bg-[#050711] border border-slate-800 hover:border-brand-lime/50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              editManagerStatus === 'active' ? 'bg-emerald-400' : editManagerStatus === 'pending' ? 'bg-amber-400' : 'bg-red-400'
                            }`} />
                            <span>
                              {editManagerStatus === 'active' ? 'Active Access' : editManagerStatus === 'pending' ? 'Pending Invitation' : 'Inactive / Suspended'}
                            </span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isEditStatusDropdownOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                        </button>

                        {isEditStatusDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsEditStatusDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1">
                              {[
                                { id: 'active', label: 'Active Access', desc: 'Full operational access according to permissions', color: 'text-emerald-400' },
                                { id: 'pending', label: 'Pending Invitation', desc: 'Registration link sent, pending user signup', color: 'text-amber-400' },
                                { id: 'inactive', label: 'Inactive / Suspended', desc: 'Account access disabled temporarily', color: 'text-red-400' },
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setEditManagerStatus(item.id as any);
                                    setIsEditStatusDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                                    editManagerStatus === item.id ? 'bg-slate-800 font-bold text-white ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div>
                                    <div className={`font-bold ${item.color}`}>{item.label}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                                  </div>
                                  {editManagerStatus === item.id && <Check className="w-4 h-4 text-brand-lime" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CHECKBOX PERMISSION MATRIX */}
                  <div className="space-y-2 border-t border-b border-slate-800 py-3">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Feature Checkbox Permissions *
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-brand-lime/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!editManagerPermissions.canManageBookings}
                          onChange={(e) => setEditManagerPermissions(prev => ({ ...prev, canManageBookings: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 text-brand-lime focus:ring-brand-lime accent-[#a6e224] cursor-pointer"
                        />
                        <span className="text-slate-200 font-semibold">Bookings & Reservations</span>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-brand-lime/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!editManagerPermissions.canManageCourts}
                          onChange={(e) => setEditManagerPermissions(prev => ({ ...prev, canManageCourts: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 text-brand-lime focus:ring-brand-lime accent-[#a6e224] cursor-pointer"
                        />
                        <span className="text-slate-200 font-semibold">Courts & Operating Hours</span>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-brand-lime/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!editManagerPermissions.canManageOpenPlay}
                          onChange={(e) => setEditManagerPermissions(prev => ({ ...prev, canManageOpenPlay: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 text-brand-lime focus:ring-brand-lime accent-[#a6e224] cursor-pointer"
                        />
                        <span className="text-slate-200 font-semibold">Open Play Sessions</span>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-brand-lime/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!editManagerPermissions.canManageVouchers}
                          onChange={(e) => setEditManagerPermissions(prev => ({ ...prev, canManageVouchers: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 text-brand-lime focus:ring-brand-lime accent-[#a6e224] cursor-pointer"
                        />
                        <span className="text-slate-200 font-semibold">Vouchers & Promos</span>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-brand-lime/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!editManagerPermissions.canViewFinancials}
                          onChange={(e) => setEditManagerPermissions(prev => ({ ...prev, canViewFinancials: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 text-brand-lime focus:ring-brand-lime accent-[#a6e224] cursor-pointer"
                        />
                        <span className="text-slate-200 font-semibold">Financials & GCash</span>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-brand-lime/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!editManagerPermissions.canManageTeam}
                          onChange={(e) => setEditManagerPermissions(prev => ({ ...prev, canManageTeam: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 text-brand-lime focus:ring-brand-lime accent-[#a6e224] cursor-pointer"
                        />
                        <span className="text-slate-200 font-semibold">Staff & User Access</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingManager(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={managerActionLoading}
                      className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{managerActionLoading ? 'Saving...' : 'Save Permissions'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE MANAGER CONFIRMATION MODAL ALERT */}
          {deletingManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-left">
              <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-red-500/30 shadow-2xl space-y-5 relative bg-slate-900/95">
                <button
                  onClick={() => setDeletingManager(null)}
                  className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                  <Trash2 className="w-7 h-7" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">Delete Facility Manager?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Are you sure you want to remove manager <strong className="text-white">{deletingManager.name || deletingManager.email}</strong> from your facility? They will immediately lose access.
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingManager(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={managerActionLoading}
                    onClick={handleConfirmDeleteManager}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {managerActionLoading ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MY PROFILE SUB-TAB                                                     */}
      {/* ========================================================================= */}
      {settingsSubTab === 'profile' && (
        <form onSubmit={handleAdminProfileSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">User Administrator Profile</h4>
              <p className="text-xs text-slate-400">Account metadata associated with your administrative login.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase">Administrator Name</label>
              <input
                type="text"
                value={adminDisplayName || user?.name || ''}
                onChange={(e) => setAdminDisplayName && setAdminDisplayName(e.target.value)}
                placeholder="Enter Administrator Full Name"
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:border-brand-lime transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase">Contact Phone Number</label>
              <input
                type="text"
                value={adminPhone}
                onChange={(e) => setAdminPhone && setAdminPhone(e.target.value)}
                placeholder="0917XXXXXXX"
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-brand-lime transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || 'admin@picklepoint.com'}
                className="w-full mt-1 bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-sm text-slate-400 font-mono opacity-80 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase">Account Administrative Role</label>
              <div className="mt-1 flex items-center gap-2 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                <Shield className="w-4 h-4 text-brand-lime" />
                <span className="text-xs font-bold text-white uppercase">
                  {isSuperAdmin ? 'Super Administrator' : 'Client Venue Admin'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {adminProfileSaved ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={savingAdminProfile}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingAdminProfile ? 'Saving...' : 'Save Admin Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 2. FACILITY & ORGANIZATION PROFILE (WITH SUBDOMAIN SLUG)                  */}
      {/* ========================================================================= */}
      {settingsSubTab === 'organization' && (
        <form onSubmit={handleOrgProfileSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-5 h-5 text-brand-lime" />
                <h4 className="text-lg font-bold text-white">Organization & Company Profile</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manage venue information for <span className="text-brand-lime font-bold">{orgProfileName || 'PickleZone1'}</span> visible to players and administrators.
              </p>
            </div>

            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#062c1b] text-[#34d399] border border-[#065f46] self-start sm:self-center">
              {isSuperAdmin ? 'Super Admin' : 'Client Admin'}
            </span>
          </div>

          {/* VENUE SUBDOMAIN / CUSTOM LINK SLUG CARD */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-lime" /> VENUE SUBDOMAIN / CUSTOM LINK SLUG
              </label>
              <span className="text-[10px] font-bold text-brand-lime bg-brand-lime/10 px-2.5 py-0.5 rounded-full border border-brand-lime/30">
                Public Web Slug
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 flex items-center bg-[#050711] border border-slate-800 rounded-xl overflow-hidden w-full">
                <span className="px-3 text-xs text-slate-500 font-mono bg-slate-950/80 border-r border-slate-800 py-2.5">
                  {cleanBaseUrl}/venue/
                </span>
                <input
                  type="text"
                  value={orgSubdomain}
                  onChange={(e) => setOrgSubdomain && setOrgSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="picklezone1"
                  className="flex-1 px-3 py-2.5 bg-transparent text-xs font-mono font-bold text-brand-lime focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopySubdomainUrl}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  {copiedSlugLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSlugLink ? 'Copied Link!' : 'Copy Venue Link'}</span>
                </button>

                <a
                  href={fullPublicVenueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
                  title="Open Public Link in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Players can access your court listings and book reservations directly using this dedicated link slug.
            </p>
          </div>

          {/* ORGANIZATION LOGO CARD */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">ORGANIZATION LOGO</label>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#050711] border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
                {orgProfileLogoUrl ? (
                  <img src={orgProfileLogoUrl} alt="Organization Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-600" />
                )}
              </div>

              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2 rounded-xl bg-[#0a2318] hover:bg-[#14532d] border border-[#166534] text-[#4ade80] text-xs font-extrabold transition-all cursor-pointer shadow-sm flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0] && processOrgLogoFile) {
                          processOrgLogoFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {orgProfileLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setOrgProfileLogoUrl && setOrgProfileLogoUrl(null)}
                      className="px-4 py-2 rounded-xl bg-[#2d0a1b] hover:bg-[#4c0519] border border-[#831843] text-[#f472b6] text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Recommended size: Square PNG or JPG (min 200×200px). Uploaded logo appears on court details & receipts.
                </p>
              </div>
            </div>
          </div>

          {/* FIELD GRID (2 COLUMNS) */}
          <div className="space-y-4">
            {/* ROW 1: NAME & ASSIGNED ADMIN EMAIL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">COMPANY / ORGANIZATION NAME</label>
                <input
                  type="text"
                  value={orgProfileName}
                  onChange={(e) => setOrgProfileName && setOrgProfileName(e.target.value)}
                  placeholder="PickleZone1"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">ASSIGNED CLIENT ADMIN EMAIL</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'ran.peredo@gmail.com'}
                    className="w-full bg-[#050711] border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-xs font-mono font-bold text-slate-400 opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* ROW 2: PHONE NUMBER & WEBSITE URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">CONTACT PHONE NUMBER</label>
                <input
                  type="text"
                  value={orgProfilePhone}
                  onChange={(e) => setOrgProfilePhone && setOrgProfilePhone(e.target.value)}
                  placeholder="09773898316"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">OFFICIAL WEBSITE URL</label>
                <input
                  type="text"
                  value={orgProfileWebsite}
                  onChange={(e) => setOrgProfileWebsite && setOrgProfileWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>
            </div>

            {/* ROW 3: FACEBOOK PAGE URL & INSTAGRAM HANDLE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">FACEBOOK PAGE URL</label>
                <input
                  type="text"
                  value={orgProfileFacebook}
                  onChange={(e) => setOrgProfileFacebook && setOrgProfileFacebook(e.target.value)}
                  placeholder="https://facebook.com/yourcourtpage"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">INSTAGRAM PAGE / HANDLE</label>
                <input
                  type="text"
                  value={orgProfileInstagram}
                  onChange={(e) => setOrgProfileInstagram && setOrgProfileInstagram(e.target.value)}
                  placeholder="e.g. @pickleball_club or URL"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>
            </div>
          </div>

          {/* ORGANIZATION LOCATION & ADDRESS */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
              <MapPin className="w-4 h-4 text-brand-lime" />
              <h5 className="text-xs font-black uppercase tracking-wider text-white">ORGANIZATION LOCATION & ADDRESS</h5>
            </div>

            <div className="space-y-4">
              {/* ROW 1: REGION & PROVINCE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* REGION POPOVER */}
                <div className="relative">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">REGION</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOrgRegionOpen(!isOrgRegionOpen);
                      setIsOrgProvinceOpen(false);
                      setIsOrgCityOpen(false);
                      setIsOrgBarangayOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer"
                  >
                    <span className="truncate">
                      {REGIONS_FALLBACK.find((r) => r.code === orgSelectedRegion)?.name || 'Select Region'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOrgRegionOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                  </button>

                  {isOrgRegionOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsOrgRegionOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            handleOrgRegionChange?.({ target: { value: '' } } as any);
                            setIsOrgRegionOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                            !orgSelectedRegion ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Select Region</span>
                          {!orgSelectedRegion && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                        </button>
                        {REGIONS_FALLBACK.map((r) => (
                          <button
                            key={r.code}
                            type="button"
                            onClick={() => {
                              handleOrgRegionChange?.({ target: { value: r.code } } as any);
                              setIsOrgRegionOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                              orgSelectedRegion === r.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{r.name}</span>
                            {orgSelectedRegion === r.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* PROVINCE POPOVER */}
                <div className="relative">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">PROVINCE</label>
                  <button
                    type="button"
                    disabled={!orgSelectedRegion}
                    onClick={() => {
                      setIsOrgProvinceOpen(!isOrgProvinceOpen);
                      setIsOrgRegionOpen(false);
                      setIsOrgCityOpen(false);
                      setIsOrgBarangayOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="truncate">
                      {orgProvinces.find((p) => p.code === orgSelectedProvince)?.name || 'Select Province'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOrgProvinceOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                  </button>

                  {isOrgProvinceOpen && orgSelectedRegion && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsOrgProvinceOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            handleOrgProvinceChange?.({ target: { value: '' } } as any);
                            setIsOrgProvinceOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                            !orgSelectedProvince ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Select Province</span>
                          {!orgSelectedProvince && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                        </button>
                        {orgProvinces.map((p) => (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => {
                              handleOrgProvinceChange?.({ target: { value: p.code } } as any);
                              setIsOrgProvinceOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                              orgSelectedProvince === p.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            {orgSelectedProvince === p.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ROW 2: CITY / MUNICIPALITY & BARANGAY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CITY / MUNICIPALITY POPOVER */}
                <div className="relative">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">CITY / MUNICIPALITY</label>
                  <button
                    type="button"
                    disabled={!orgSelectedProvince}
                    onClick={() => {
                      setIsOrgCityOpen(!isOrgCityOpen);
                      setIsOrgRegionOpen(false);
                      setIsOrgProvinceOpen(false);
                      setIsOrgBarangayOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="truncate">
                      {orgCities.find((c) => c.code === orgSelectedCity)?.name || 'Select City/Municipality'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOrgCityOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                  </button>

                  {isOrgCityOpen && orgSelectedProvince && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsOrgCityOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            handleOrgCityChange?.({ target: { value: '' } } as any);
                            setIsOrgCityOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                            !orgSelectedCity ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Select City/Municipality</span>
                          {!orgSelectedCity && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                        </button>
                        {orgCities.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              handleOrgCityChange?.({ target: { value: c.code } } as any);
                              setIsOrgCityOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                              orgSelectedCity === c.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            {orgSelectedCity === c.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* BARANGAY POPOVER */}
                <div className="relative">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">BARANGAY</label>
                  <button
                    type="button"
                    disabled={!orgSelectedCity}
                    onClick={() => {
                      setIsOrgBarangayOpen(!isOrgBarangayOpen);
                      setIsOrgRegionOpen(false);
                      setIsOrgProvinceOpen(false);
                      setIsOrgCityOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none hover:border-brand-lime/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="truncate">
                      {orgBarangays.find((b) => b.code === orgSelectedBarangay)?.name || 'Select Barangay'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOrgBarangayOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                  </button>

                  {isOrgBarangayOpen && orgSelectedCity && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsOrgBarangayOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            handleOrgBarangayChange?.({ target: { value: '' } } as any);
                            setIsOrgBarangayOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                            !orgSelectedBarangay ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Select Barangay</span>
                          {!orgSelectedBarangay && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                        </button>
                        {orgBarangays.map((b) => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => {
                              handleOrgBarangayChange?.({ target: { value: b.code } } as any);
                              setIsOrgBarangayOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                              orgSelectedBarangay === b.code ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{b.name}</span>
                            {orgSelectedBarangay === b.code && <Check className="w-3.5 h-3.5 text-brand-lime shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ROW 3: STREET ADDRESS (LINE 1) */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">STREET ADDRESS (LINE 1)</label>
                <input
                  type="text"
                  value={orgAddressLine1}
                  onChange={(e) => setOrgAddressLine1 && setOrgAddressLine1(e.target.value)}
                  placeholder="#158 Herrera St"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              {/* ROW 4: BUILDING, SUITE, FLOOR (LINE 2 - OPTIONAL) */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">BUILDING, SUITE, FLOOR (LINE 2 - OPTIONAL)</label>
                <input
                  type="text"
                  value={orgAddressLine2}
                  onChange={(e) => setOrgAddressLine2 && setOrgAddressLine2(e.target.value)}
                  placeholder="Zone 1"
                  className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                />
              </div>

              {/* ROW 5: POSTAL CODE & COUNTRY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">POSTAL CODE</label>
                  <input
                    type="text"
                    value={orgPostalCode}
                    onChange={(e) => setOrgPostalCode && setOrgPostalCode(e.target.value)}
                    placeholder="4407"
                    className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">COUNTRY</label>
                  <input
                    type="text"
                    value={orgCountry || 'Philippines'}
                    onChange={(e) => setOrgCountry && setOrgCountry(e.target.value)}
                    placeholder="Philippines"
                    className="w-full bg-[#050711] border border-slate-800 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brand-lime transition-all"
                  />
                </div>
              </div>
            </div>
          </div>



          {/* DAILY OPERATING HOURS CARD */}
          {orgOperatingHours && (
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-brand-lime" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-white">DAILY OPERATING HOURS</h5>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Configure opening and closing schedules for each day of the week.</p>
                </div>

                {handleApplyMonToAll && (
                  <button
                    type="button"
                    onClick={handleApplyMonToAll}
                    className="px-4 py-2 rounded-xl bg-[#0a2318] hover:bg-[#14532d] border border-[#166534] text-[#4ade80] text-xs font-extrabold transition-all cursor-pointer shadow-sm flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Mon to All Days</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-1">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const hours = orgOperatingHours[key];
                  const isDayOff = hours?.isDayOff ?? !hours?.isOpen;

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-2xl bg-[#050711] border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* LEFT: DAY NAME & STATUS BADGE */}
                      <div className="flex items-center gap-4 min-w-[180px]">
                        <span className="text-sm font-bold text-white capitalize">{label}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isDayOff
                              ? 'bg-red-950/40 text-red-400 border-red-900/40'
                              : 'bg-[#062c1b] text-[#34d399] border-[#065f46]'
                          }`}
                        >
                          {isDayOff ? 'CLOSED' : 'OPEN'}
                        </span>
                      </div>

                      {/* RIGHT: DAY OFF TOGGLE & TIME SELECTORS */}
                      <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
                        <div className="flex items-center gap-2 mr-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DAY OFF</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDayOff && handleToggleDayOff(key)}
                            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                              isDayOff ? 'bg-brand-lime' : 'bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-slate-950 rounded-full shadow-md transition-transform ${
                                isDayOff ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {!isDayOff && handleDayTimeChange && (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* OPEN TIME POPOVER */}
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">OPEN:</span>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveTimePicker(activeTimePicker === `${key}-open` ? null : `${key}-open`)}
                                className="flex items-center gap-1.5 bg-[#0a0d1d] border border-slate-800 hover:border-brand-lime/50 text-white text-xs font-mono font-bold rounded-xl px-3 py-2 transition-all cursor-pointer shadow-sm"
                              >
                                <span>{hours.openTime || '06:00'}</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeTimePicker === `${key}-open` ? 'rotate-180 text-brand-lime' : ''}`} />
                              </button>

                              {activeTimePicker === `${key}-open` && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveTimePicker(null)} />
                                  <div className="absolute left-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar w-32">
                                    {OPERATING_TIME_OPTIONS.map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                          handleDayTimeChange(key, 'openTime', t);
                                          setActiveTimePicker(null);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                                          hours.openTime === t ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{t}</span>
                                        {hours.openTime === t && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            <span className="text-slate-500 font-bold px-1">-</span>

                            {/* CLOSE TIME POPOVER */}
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">CLOSE:</span>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveTimePicker(activeTimePicker === `${key}-close` ? null : `${key}-close`)}
                                className="flex items-center gap-1.5 bg-[#0a0d1d] border border-slate-800 hover:border-brand-lime/50 text-white text-xs font-mono font-bold rounded-xl px-3 py-2 transition-all cursor-pointer shadow-sm"
                              >
                                <span>{hours.closeTime || '22:00'}</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeTimePicker === `${key}-close` ? 'rotate-180 text-brand-lime' : ''}`} />
                              </button>

                              {activeTimePicker === `${key}-close` && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveTimePicker(null)} />
                                  <div className="absolute left-0 sm:left-auto right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar w-32">
                                    {OPERATING_TIME_OPTIONS.map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                          handleDayTimeChange(key, 'closeTime', t);
                                          setActiveTimePicker(null);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                                          hours.closeTime === t ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{t}</span>
                                        {hours.closeTime === t && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {orgProfileSaved ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Facility Profile saved successfully!
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={savingOrgProfile}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingOrgProfile ? 'Saving...' : 'Save Organization Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 3. CHECKOUT SETTINGS / GCASH & PAYMENT REMINDERS SUB-TAB                 */}
      {/* ========================================================================= */}
      {(settingsSubTab === 'gcash' || settingsSubTab === 'reminders') && (
        <div className="space-y-6 animate-fade-in">

          {/* GCASH ACCOUNTS CARD */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">GCash Payment Accounts</h4>
                  <p className="text-xs text-slate-400">Configure GCash QR codes and accounts for player checkout payments.</p>
                </div>
              </div>

              {onOpenGcashModal && (
                <button
                  type="button"
                  onClick={() => onOpenGcashModal('my')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all cursor-pointer shadow-md shadow-brand-lime/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure GCash Account</span>
                </button>
              )}
            </div>

            {personalAccounts.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-white">No GCash Accounts Configured</h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Add your venue's GCash account name, mobile number, and QR code to collect player reservations.
                </p>
                {onOpenGcashModal && (
                  <button
                    type="button"
                    onClick={() => onOpenGcashModal('my')}
                    className="px-4 py-2 rounded-xl bg-brand-lime text-dark-bg text-xs font-bold hover:bg-[#a6e224] transition-all shadow-md"
                  >
                    Configure First GCash Account
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalAccounts.map((acc) => (
                  <div key={acc.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[10px] font-black uppercase tracking-wider truncate">
                          {acc.paymentName || 'GCash Account'}
                        </span>
                      </div>

                      <div className="w-full aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center mb-3">
                        {acc.gcashQrCode ? (
                          <img src={acc.gcashQrCode} alt={acc.gcashName} className="w-full h-full object-contain p-2" />
                        ) : (
                          <CreditCard className="w-12 h-12 text-slate-700" />
                        )}
                      </div>
                      <h5 className="text-sm font-extrabold text-white">{acc.gcashName}</h5>
                      <p className="text-xs font-mono font-bold text-brand-lime mt-0.5">{acc.gcashNumber}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedAmountQrAccount(acc)}
                        className="px-2.5 py-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Generate Dynamic Amount QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Amount QR</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        {onOpenGcashModal && (
                          <button
                            type="button"
                            onClick={() => onOpenGcashModal('my', acc)}
                            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit GCash Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteGcashAccount && (
                          <button
                            type="button"
                            onClick={() => onDeleteGcashAccount(acc.id)}
                            className="p-2 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900 hover:text-white transition-colors cursor-pointer"
                            title="Delete GCash Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dynamic Amount QR Generator Modal */}
            {selectedAmountQrAccount && (
              <GcashAmountQrModal
                account={selectedAmountQrAccount}
                onClose={() => setSelectedAmountQrAccount(null)}
                orgName={companyProfile?.name || (user as any)?.companyName || 'Pickleball Venue'}
              />
            )}

            {/* Super Admin Global GCash Fallback Box */}
            {isSuperAdmin && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div>
                  <span className="text-xs font-bold text-white uppercase block">Global Platform Fallback GCash QR</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {globalGcashName ? `${globalGcashName} (${globalGcashNumber})` : 'No global fallback QR configured.'}
                  </p>
                </div>
                {onOpenGcashModal && (
                  <button
                    type="button"
                    onClick={() => onOpenGcashModal('global')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex-shrink-0"
                  >
                    Configure Global Fallback
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PAYMENT APPROVAL REMINDERS CARD */}
          {paymentReminderSettings && (
            <form onSubmit={handleReminderSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <Bell className="w-5 h-5 text-brand-lime" />
                    <h4 className="text-lg font-bold text-white">Payment Approval Reminders</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Automatically receive reminders and notifications when customer payments require your review and approval.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      paymentReminderSettings.enabled ? 'text-brand-lime' : 'text-slate-500'
                    }`}
                  >
                    {paymentReminderSettings.enabled ? 'ACTIVE (ENABLED)' : 'INACTIVE (DISABLED)'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentReminderSettings &&
                      setPaymentReminderSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                    }
                    className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      paymentReminderSettings.enabled ? 'bg-brand-lime' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-slate-950 rounded-full shadow-md transition-transform ${
                        paymentReminderSettings.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* REMINDER FREQUENCY / INTERVAL CARD */}
              <div className="p-5 rounded-2xl bg-[#050711] border border-slate-800 space-y-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-brand-lime" />
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-white">REMINDER FREQUENCY / INTERVAL</h5>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    How frequently the system should check and remind you if pending customer payments remain unapproved.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { key: '5', title: '5 MINS', desc: 'Urgent check' },
                    { key: '10', title: '10 MINS', desc: 'Fast check' },
                    { key: '15', title: '15 MINS', desc: 'Recommended' },
                    { key: '30', title: '30 MINS', desc: 'Standard' },
                    { key: 'custom', title: 'CUSTOM', desc: 'Enter mins' },
                  ].map((item) => {
                    const isSelected = paymentReminderSettings.preset === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setPaymentReminderSettings &&
                          setPaymentReminderSettings((prev) => ({ ...prev, preset: item.key as any }))
                        }
                        className={`p-4 rounded-xl text-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#0c2317] border-2 border-brand-lime text-brand-lime font-extrabold shadow-md'
                            : 'bg-[#0a0d1d] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-sm font-black block font-mono">{item.title}</span>
                        <span className={`text-[11px] block mt-1 ${isSelected ? 'text-brand-lime/80 font-bold' : 'text-slate-500'}`}>
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {paymentReminderSettings.preset === 'custom' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                      CUSTOM MINUTES INTERVAL
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={paymentReminderSettings.customMinutes}
                      onChange={(e) =>
                        setPaymentReminderSettings &&
                        setPaymentReminderSettings((prev) => ({ ...prev, customMinutes: parseInt(e.target.value, 10) || 1 }))
                      }
                      placeholder="15"
                      className="w-48 bg-[#0a0d1d] border border-slate-800 rounded-xl p-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-lime"
                    />
                  </div>
                )}
              </div>

              {/* NOTIFICATION CHANNELS & DELIVERY METHODS CARD */}
              <div className="p-5 rounded-2xl bg-[#050711] border border-slate-800 space-y-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-brand-lime" />
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-white">NOTIFICATION CHANNELS & DELIVERY METHODS</h5>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* EMAIL REMINDERS */}
                  <div className="p-4 rounded-xl bg-[#0a0d1d] border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Email Reminder Notifications</span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">Dispatches detailed email summary to admin</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPaymentReminderSettings &&
                        setPaymentReminderSettings((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer flex-shrink-0 ${
                        paymentReminderSettings.emailEnabled ? 'bg-brand-lime' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-slate-950 rounded-full shadow-md transition-transform ${
                          paymentReminderSettings.emailEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* DESKTOP & SOUND NOTIFICATIONS */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#0a0d1d] border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime flex-shrink-0 mt-0.5">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">Browser Desktop Notifications</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">Pushes OS/browser banner even in background tabs</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!paymentReminderSettings.browserNotificationEnabled && onRequestNotificationPermission) {
                            onRequestNotificationPermission();
                          } else if (setPaymentReminderSettings) {
                            setPaymentReminderSettings((prev) => ({ ...prev, browserNotificationEnabled: !prev.browserNotificationEnabled }));
                          }
                        }}
                        className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer flex-shrink-0 ${
                          paymentReminderSettings.browserNotificationEnabled ? 'bg-brand-lime' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-slate-950 rounded-full shadow-md transition-transform ${
                            paymentReminderSettings.browserNotificationEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0a0d1d] border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">Audio Alert Chime</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">Plays crisp audible chime on interval trigger</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentReminderSettings &&
                          setPaymentReminderSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
                        }
                        className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer flex-shrink-0 ${
                          paymentReminderSettings.soundEnabled ? 'bg-brand-lime' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-slate-950 rounded-full shadow-md transition-transform ${
                            paymentReminderSettings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {paymentReminderSettings.emailEnabled && (
                  <div className="pt-2 animate-fade-in border-t border-slate-800/60">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                      RECIPIENT EMAIL FOR REMINDER SUMMARIES
                    </label>
                    <input
                      type="email"
                      value={paymentReminderSettings.emailRecipient}
                      onChange={(e) =>
                        setPaymentReminderSettings &&
                        setPaymentReminderSettings((prev) => ({ ...prev, emailRecipient: e.target.value }))
                      }
                      placeholder="admin@picklezone.ph"
                      className="w-full bg-[#0a0d1d] border border-slate-800 rounded-xl p-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-brand-lime"
                    />
                  </div>
                )}
              </div>

              {/* FOOTER ACTION BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {onTestReminderAlert && (
                    <button
                      type="button"
                      onClick={onTestReminderAlert}
                      className="px-4 py-2.5 rounded-xl bg-[#0a0d1d] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-brand-lime" />
                      <span>Preview Alert (Sound & Banner)</span>
                    </button>
                  )}

                  {onTestReminderEmail && paymentReminderSettings.emailEnabled && (
                    <button
                      type="button"
                      onClick={onTestReminderEmail}
                      className="px-4 py-2.5 rounded-xl bg-[#0a0d1d] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-brand-lime" />
                      <span>Send Test Email</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {reminderSaved && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Reminder settings saved!
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={savingReminder}
                    className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingReminder ? 'Saving...' : 'Save Reminder Settings'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BOOKING LEAD TIME BUFFER SUB-TAB                                       */}
      {/* ========================================================================= */}
      {settingsSubTab === 'lead_time' && (
        <form onSubmit={handleLeadTimeSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Booking Lead Time Buffer</h4>
              <p className="text-xs text-slate-400">Set minimum lead time required before a user can book an upcoming slot.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Minimum Advance Notice (Minutes)
            </label>
            <input
              type="number"
              min={0}
              max={1440}
              value={leadTimeInput}
              onChange={(e) => setLeadTimeInput(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-lime font-mono font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Example: 30 minutes prevents players from booking slots starting within the next 30 minutes.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {leadTimeSaved ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Lead time updated successfully!
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={savingLeadTime}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingLeadTime ? 'Saving...' : 'Save Lead Time'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 6. PLATFORM SERVICE FEE SUB-TAB (SUPER ADMIN)                              */}
      {/* ========================================================================= */}
      {settingsSubTab === 'service_fee' && isSuperAdmin && (
        <form onSubmit={handleServiceFeeSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Platform Service Fee Settings</h4>
              <p className="text-xs text-slate-400">Configure global convenience / service fee added at checkout.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="feeToggle"
                checked={feeEnabled}
                onChange={(e) => setFeeEnabled(e.target.checked)}
                className="w-4 h-4 accent-brand-lime rounded cursor-pointer"
              />
              <label htmlFor="feeToggle" className="text-xs font-bold text-white cursor-pointer">
                Enable Platform Convenience Fee at Checkout
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Service Fee Amount (PHP ₱)</label>
              <input
                type="number"
                min={0}
                value={feeAmount}
                onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {feeSaved ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Platform fee saved!
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={savingFee}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingFee ? 'Saving...' : 'Save Fee Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
