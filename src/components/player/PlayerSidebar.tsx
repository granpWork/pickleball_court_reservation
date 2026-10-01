import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  QrCode,
  Trophy,
  Tag,
  FileText,
  Settings,
  LogOut,
  X,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';

export type PlayerTabType =
  | 'overview'
  | 'bookings'
  | 'passes'
  | 'openplay'
  | 'vouchers'
  | 'policies'
  | 'settings';

interface PlayerSidebarProps {
  activeTab: PlayerTabType;
  setActiveTab: (tab: PlayerTabType) => void;
  user: {
    uid?: string;
    name?: string;
    email: string;
    role?: string;
    duprId?: string;
    photoUrl?: string;
  } | null;
  bookingsCount: number;
  openPlayCount: number;
  vouchersCount: number;
  onLogout: () => void;
  onGoHome: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const PlayerSidebar: React.FC<PlayerSidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  bookingsCount,
  openPlayCount,
  vouchersCount,
  onLogout,
  onGoHome,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const userName = user?.name || user?.email?.split('@')[0] || 'Player';
  const duprId = user?.duprId || '';

  const navItems: {
    id: PlayerTabType;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'bookings',
      label: 'My Reservations',
      icon: Calendar,
      badge: bookingsCount,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      id: 'passes',
      label: 'QR Match Passes',
      icon: QrCode,
      badge: bookingsCount > 0 ? bookingsCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'openplay',
      label: 'Open Play Sessions',
      icon: Trophy,
      badge: openPlayCount,
      badgeColor: 'bg-brand-lime/20 text-brand-lime border border-brand-lime/30',
    },
    {
      id: 'vouchers',
      label: 'Credits & Vouchers',
      icon: Tag,
      badge: vouchersCount > 0 ? vouchersCount : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'policies',
      label: 'Venue Policies',
      icon: FileText,
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#090d16] border-r border-slate-800/80 text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onGoHome} title="Return to Landing Page">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-lime via-brand-lime to-brand-emerald text-dark-bg flex items-center justify-center font-black shadow-lg shadow-brand-lime/20 group-hover:scale-105 transition-transform">
            P
          </div>
          <div>
            <span className="text-base font-extrabold text-white tracking-tight block leading-tight">
              Book<span className="text-brand-lime">Picklecourt</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Player Portal
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                isActive
                  ? 'bg-brand-lime text-slate-950 shadow-lg shadow-brand-lime/15 font-black scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-brand-lime'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950'
                        : item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-slate-950 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* User Footer Profile Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
        <div className="flex items-center gap-3">
          {/* Profile Picture */}
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={userName}
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-lime to-brand-emerald text-slate-950 font-black text-sm flex items-center justify-center shadow-md shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5 text-slate-950" />}
            </div>
          )}

          {/* User Name & Email */}
          <div className="flex-1 min-w-0 text-left">
            <span className="text-xs font-extrabold text-white truncate block" title={userName}>
              {userName}
            </span>
            <span className="text-[10px] text-slate-400 truncate block" title={user?.email || ''}>
              {user?.email || 'No email provided'}
            </span>
            {duprId && (
              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-mono font-bold">
                ⚡ DUPR: {duprId}
              </span>
            )}
          </div>

          {/* Logout Icon Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Log Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer shrink-0 group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
