import React from 'react';
import {
  MapPin,
  LayoutDashboard,
  Building2,
  Clock,
  Globe,
  FileText,
  Tag,
  Users,
  Link2,
  Settings,
  User,
  DollarSign,
  ChevronDown,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { type AdminTab, type AdminSettingsSubTab } from './adminTypes';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isSuperAdmin: boolean;
  settingsSubTab: AdminSettingsSubTab;
  setSettingsSubTab: (subTab: AdminSettingsSubTab) => void;
  settingsSubMenuOpen: boolean;
  setSettingsSubMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setView?: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | any) => void;
  user?: { name?: string; email?: string; role?: string; isAdmin?: boolean } | null;
  onLogout?: () => void;
  courtsCount?: number;
  bookingsCount?: number;
  pendingBookingsCount?: number;
  companiesCount?: number;
  pendingCompaniesCount?: number;
  pendingVerificationCount?: number;
  openPlayCount?: number;
  personalAccountsCount?: number;
  bookingLeadTimeMinutes?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  isSuperAdmin,
  settingsSubTab,
  setSettingsSubTab,
  settingsSubMenuOpen,
  setSettingsSubMenuOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  setView,
  user,
  onLogout,
  courtsCount: _courtsCount = 0,
  bookingsCount: _bookingsCount = 0,
  pendingBookingsCount: _pendingBookingsCount = 0,
  companiesCount: _companiesCount = 0,
  pendingCompaniesCount: _pendingCompaniesCount = 0,
  pendingVerificationCount = 0,
  openPlayCount: _openPlayCount = 0,
  personalAccountsCount: _personalAccountsCount = 0,
  bookingLeadTimeMinutes: _bookingLeadTimeMinutes = 30,
}) => {
  const isClientAdminRole = user?.role === 'client_admin';
  const isManagerRole = user?.role === 'manager';

  const userPerms = (user as any)?.permissions || {};

  const canManageVouchers = isSuperAdmin || isClientAdminRole || (isManagerRole && userPerms.canManageVouchers !== false) || userPerms.canManageVouchers === true;
  const canViewFinancials = isSuperAdmin || isClientAdminRole || userPerms.canViewFinancials === true;
  const canManageTeam = isSuperAdmin || isClientAdminRole || userPerms.canManageTeam === true;

  const handleTabClick = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-slate-900/40 backdrop-blur-md border-r border-dark-border flex flex-col justify-between transition-transform duration-300 transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 px-3 py-4 overflow-y-auto">
          {/* Logo Branding */}
          <div 
            onClick={() => {
              window.history.pushState({}, '', '/');
              if (setView) setView('landing');
            }}
            className="flex items-center gap-2.5 px-1.5 mb-4 cursor-pointer group"
          >
            <div className="relative">
              <svg className="w-7 h-7 text-brand-lime transition-transform duration-500 group-hover:rotate-90" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="0.75" />
                <circle cx="8" cy="8" r="0.75" />
                <circle cx="16" cy="8" r="0.75" />
                <circle cx="8" cy="16" r="0.75" />
                <circle cx="16" cy="16" r="0.75" />
              </svg>
              <div className="absolute inset-0 bg-brand-lime/25 blur-md rounded-full -z-10 group-hover:bg-brand-lime/40 transition"></div>
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white group-hover:text-brand-lime transition-colors">
                Booking <span className="text-brand-lime">PickleCourt</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>

          {/* Quick Back to Public Site CTA */}
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              if (setView) setView('landing');
            }}
            className="mb-4 w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-[13px] font-semibold flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-brand-lime group-hover:rotate-12 transition-transform" />
              <span>View Public Site</span>
            </span>
            <ArrowLeft className="w-3 h-3 text-slate-500 rotate-180 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => handleTabClick('courts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'courts'
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4" />
                <span>Courts</span>
              </div>
            </button>

            <button
              onClick={() => handleTabClick('bookings')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'bookings'
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Reservations</span>
              </div>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => handleTabClick('companies')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'companies'
                    ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4" />
                  <span>Companies</span>
                </div>
              </button>
            )}

            <button
              onClick={() => handleTabClick('checkouts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'checkouts'
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                <span>Checkouts</span>
              </div>
              {pendingVerificationCount > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-red-500 text-white animate-pulse">
                  {pendingVerificationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('openplay')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'openplay'
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>Open Play</span>
              </div>
            </button>

            {canManageVouchers && (
              <button
                onClick={() => handleTabClick('vouchers')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'vouchers'
                    ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4" />
                  <span>Vouchers</span>
                </div>
              </button>
            )}

            <button
              onClick={() => handleTabClick('shortener')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'shortener'
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Link2 className="w-4 h-4" />
                <span>URL Shortener</span>
              </div>
            </button>

            <button
              onClick={() => handleTabClick('users')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'users'
                  ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Users</span>
              </div>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => handleTabClick('service_fee')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'service_fee'
                    ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Service Fee</span>
                </div>
              </button>
            )}

            {/* Settings Main Button with Submenu */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (activeTab !== 'settings') {
                    setActiveTab('settings');
                    setSettingsSubMenuOpen(true);
                  } else {
                    setSettingsSubMenuOpen(!settingsSubMenuOpen);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[14px] font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'settings'
                    ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </div>
                <div className="flex items-center">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${settingsSubMenuOpen && activeTab === 'settings' ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Submenu for Settings */}
              {settingsSubMenuOpen && activeTab === 'settings' && (
                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-3">
                  <button
                    type="button"
                    onClick={() => { setSettingsSubTab('profile'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                      settingsSubTab === 'profile'
                        ? 'text-brand-lime bg-brand-lime/10 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSettingsSubTab('organization'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                      settingsSubTab === 'organization'
                        ? 'text-brand-lime bg-brand-lime/10 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Facility</span>
                  </button>

                  {canManageTeam && (
                    <button
                      type="button"
                      onClick={() => { setSettingsSubTab('team'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                        settingsSubTab === 'team'
                          ? 'text-brand-lime bg-brand-lime/10 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Team & Access</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setSettingsSubTab('policies'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                      settingsSubTab === 'policies'
                        ? 'text-brand-lime bg-brand-lime/10 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Venue Rules</span>
                  </button>

                  {canViewFinancials && (
                    <button
                      type="button"
                      onClick={() => { setSettingsSubTab('gcash'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                        settingsSubTab === 'gcash'
                          ? 'text-brand-lime bg-brand-lime/10 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>GCash Accounts</span>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setSettingsSubTab('lead_time'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                      settingsSubTab === 'lead_time'
                        ? 'text-brand-lime bg-brand-lime/10 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Booking Lead Time</span>
                    </div>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => { setSettingsSubTab('service_fee'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                        settingsSubTab === 'service_fee'
                          ? 'text-brand-lime bg-brand-lime/10 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Service Fee</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User Profile & Logout at Bottom */}
        <div className="p-3 border-t border-dark-border bg-slate-950/20">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => { setActiveTab('settings'); setSettingsSubTab('profile'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              title={`View Profile (${user?.email || ''})`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-brand-lime font-extrabold uppercase text-xs flex-shrink-0 group-hover:border-brand-lime transition-colors">
                {user?.name?.slice(0, 2) || 'AD'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="font-extrabold text-white text-xs truncate group-hover:text-brand-lime transition-colors">
                    {user?.name || 'Admin User'}
                  </div>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase flex-shrink-0 ${
                    isSuperAdmin
                      ? 'bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30'
                      : 'bg-brand-lime/15 text-brand-lime border border-brand-lime/30'
                  }`}>
                    {isSuperAdmin ? 'Super' : 'Client'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium" title={user?.email || ''}>
                  {user?.email || ''}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer flex-shrink-0 flex items-center justify-center shadow-md hover:shadow-red-600/20"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
