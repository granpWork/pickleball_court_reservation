import React, { useState } from 'react';
import {
  Menu,
  Search,
  Plus,
  Trophy,
  LogOut,
  ChevronDown,
  Settings,
  Calendar,
} from 'lucide-react';
import type { PlayerTabType } from './PlayerSidebar';

interface PlayerHeaderProps {
  activeTab: PlayerTabType;
  setActiveTab: (tab: PlayerTabType) => void;
  user: {
    uid?: string;
    name?: string;
    email: string;
    role?: string;
    duprId?: string;
  } | null;
  onLogout: () => void;
  onGoHome: () => void;
  onOpenMobileSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onGoHome,
  onOpenMobileSidebar,
  searchQuery,
  setSearchQuery,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userName = user?.name || user?.email?.split('@')[0] || 'Player';

  const tabTitles: Record<PlayerTabType, { title: string; subtitle: string }> = {
    overview: {
      title: 'Player Dashboard Overview',
      subtitle: 'Manage your court reservations, QR passes, and Open Play activities.',
    },
    bookings: {
      title: 'My Court Reservations',
      subtitle: 'View, track, and manage your private court bookings.',
    },
    passes: {
      title: 'Digital QR Match Passes',
      subtitle: 'Scan your digital QR pass at venue check-in counters.',
    },
    openplay: {
      title: 'My Open Play Sessions',
      subtitle: 'Review your Open Play registrations, waitlist status, and session dates.',
    },
    vouchers: {
      title: 'Store Credits & Vouchers',
      subtitle: 'Redeem promotional vouchers and track your venue store balance.',
    },
    policies: {
      title: 'Venue Rules & Policies',
      subtitle: 'Review court cancellation rules, weather policies, and host guidelines.',
    },
    settings: {
      title: 'Account Settings',
      subtitle: 'Update your profile information, phone number, and DUPR ID.',
    },
  };

  const currentInfo = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="sticky top-0 z-20 bg-[#07090e]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 text-left">
          <h1 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
            {currentInfo.title}
          </h1>
          <p className="text-[11px] text-slate-400 truncate hidden sm:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search Bar */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookings or sessions..."
            className="w-full bg-slate-900/80 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-brand-lime transition-colors"
          />
        </div>

        {/* Quick CTA: Book Court */}
        <button
          type="button"
          onClick={onGoHome}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all shadow-md shadow-brand-lime/15 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Book Court</span>
        </button>

        {/* Quick CTA: Join Open Play */}
        <button
          type="button"
          onClick={onGoHome}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-brand-lime hover:border-brand-lime/40 font-bold text-xs transition-all cursor-pointer shrink-0"
        >
          <Trophy className="w-3.5 h-3.5 text-brand-lime" />
          <span>Open Play</span>
        </button>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-lime to-brand-emerald text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl py-1.5 z-50 animate-fade-in text-left">
              <div className="px-3.5 py-2 border-b border-slate-800/80">
                <span className="text-xs font-extrabold text-white block truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {user?.email}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-900 font-medium transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-brand-lime" /> Account Settings
              </button>

              <button
                type="button"
                onClick={() => {
                  onGoHome();
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-900 font-medium transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Reserve Courts
              </button>

              <div className="my-1 border-t border-slate-800/80" />

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
