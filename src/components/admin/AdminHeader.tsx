import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { type AdminUser, type AdminTab } from './adminTypes';

interface AdminHeaderProps {
  user?: AdminUser | null;
  activeTab?: AdminTab;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLogout: () => void;
  isSuperAdmin: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogout,
  isSuperAdmin,
}) => {

  return (
    <header className="md:hidden bg-dark-bg/85 backdrop-blur-md border-b border-dark-border py-4 px-6 flex justify-between items-center sticky top-0 z-30 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-slate-400 hover:text-white focus:outline-none cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold tracking-tight text-white">
          Booking <span className="text-brand-lime">PickleCourt</span>
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold uppercase ${
            isSuperAdmin
              ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20'
              : 'bg-brand-lime/10 text-brand-lime border border-brand-lime/20'
          }`}>
            {isSuperAdmin ? 'Super' : 'Client'}
          </span>
        </h1>
      </div>
      <button
        onClick={onLogout}
        title="Log Out"
        className="p-2 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center justify-center"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
};
