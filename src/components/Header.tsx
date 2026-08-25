import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, User, Trophy, Flame } from 'lucide-react';

interface HeaderProps {
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null;
  onLogout: () => void;
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding') => void;
  currentView?: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp' | 'client_onboarding';
}

export default function Header({ user, onLogout, setView, currentView = 'landing' }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: 'landing' | 'openplay' | 'bootcamp' | 'lookup' | 'profile', path: string, scrollTarget?: string) => {
    setIsOpen(false);
    window.history.pushState({}, '', path);
    setView(view);
    if (scrollTarget) {
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 120);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || currentView !== 'landing'
          ? 'bg-dark-bg/85 backdrop-blur-md border-b border-dark-border py-4 shadow-lg shadow-black/20'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => handleNavClick('landing', '/')}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="relative">
              {/* Custom SVG Pickleball */}
              <svg
                className="w-8 h-8 text-brand-lime transition-transform duration-500 group-hover:rotate-90"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="8" cy="8" r="0.75" />
                <circle cx="16" cy="8" r="0.75" />
                <circle cx="12" cy="12" r="0.75" />
                <circle cx="8" cy="16" r="0.75" />
                <circle cx="16" cy="16" r="0.75" />
                <circle cx="12" cy="7.5" r="0.75" />
                <circle cx="12" cy="16.5" r="0.75" />
                <circle cx="7.5" cy="12" r="0.75" />
                <circle cx="16.5" cy="12" r="0.75" />
              </svg>
              <div className="absolute inset-0 bg-brand-lime/25 blur-md rounded-full -z-10 group-hover:bg-brand-lime/40 transition duration-300"></div>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white whitespace-nowrap">
              Book <span className="text-brand-lime">Picklecourt</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleNavClick('landing', '/', 'booking-widget')}
              className={`text-sm xl:text-base font-medium transition-colors cursor-pointer border-none bg-transparent font-sans relative py-1 whitespace-nowrap ${
                currentView === 'landing' ? 'text-brand-lime font-semibold' : 'text-slate-300 hover:text-brand-lime'
              }`}
            >
              Book Court
              {currentView === 'landing' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-lime rounded-full animate-fade-in" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('openplay', '/open-play')}
              className={`text-sm xl:text-base font-medium transition-colors cursor-pointer border-none bg-transparent font-sans relative py-1 flex items-center gap-1.5 whitespace-nowrap ${
                currentView === 'openplay' ? 'text-brand-lime font-semibold' : 'text-slate-300 hover:text-brand-lime'
              }`}
            >
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span>Open Play</span>
              {currentView === 'openplay' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-lime rounded-full animate-fade-in" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('bootcamp', '/bootcamp')}
              className={`text-sm xl:text-base font-medium transition-colors cursor-pointer border-none bg-transparent font-sans relative py-1 flex items-center gap-1.5 whitespace-nowrap ${
                currentView === 'bootcamp' ? 'text-brand-lime font-semibold' : 'text-slate-300 hover:text-brand-lime'
              }`}
            >
              <Flame className="w-4 h-4 flex-shrink-0" />
              <span>Bootcamp</span>
              {currentView === 'bootcamp' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-lime rounded-full animate-fade-in" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('lookup', '/?view=lookup')}
              className={`text-sm xl:text-base font-medium transition-colors cursor-pointer border-none bg-transparent font-sans relative py-1 whitespace-nowrap ${
                currentView === 'lookup' ? 'text-brand-lime font-semibold' : 'text-slate-300 hover:text-brand-lime'
              }`}
            >
              Check Status
              {currentView === 'lookup' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-lime rounded-full animate-fade-in" />
              )}
            </button>
          </nav>

          {/* Desktop Auth CTA */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4 flex-shrink-0">
            {user ? (
              <>
                {(user.isAdmin || user.email.toLowerCase() === 'admin@picklepoint.com') && (
                  <button
                    onClick={() => {
                      window.history.pushState({}, '', '/pickle-admin');
                      setView('admin');
                    }}
                    className="text-xs xl:text-sm font-semibold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all px-3.5 py-1.5 xl:px-4 xl:py-2 rounded-full cursor-pointer shadow-md shadow-brand-lime/10 whitespace-nowrap flex-shrink-0"
                  >
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => handleNavClick('profile', '/profile')}
                  className={`flex items-center gap-2 text-xs xl:text-sm font-semibold transition-all cursor-pointer border px-3.5 py-1.5 xl:px-4 xl:py-2 rounded-full shadow-sm whitespace-nowrap flex-shrink-0 ${
                    currentView === 'profile'
                      ? 'border-brand-lime bg-brand-lime/25 text-brand-lime ring-1 ring-brand-lime/30'
                      : 'border-brand-lime/40 bg-brand-lime/10 text-white hover:bg-brand-lime/20 hover:text-brand-lime'
                  }`}
                  title="View & Edit Profile Settings"
                >
                  <User className="w-4 h-4 text-brand-lime flex-shrink-0" />
                  <span className="truncate max-w-[140px] xl:max-w-[180px]">{user.name}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs xl:text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer border border-dark-border px-3.5 py-1.5 xl:px-4 xl:py-2 rounded-full hover:bg-dark-hover whitespace-nowrap flex-shrink-0"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setView('login')}
                  className="text-sm xl:text-base font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  onClick={() => setView('register')}
                  className="relative group px-4 py-2 xl:px-5 xl:py-2.5 rounded-full text-xs xl:text-sm font-semibold text-dark-bg bg-brand-lime overflow-hidden shadow-lg shadow-brand-lime/20 cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  <span className="relative z-10 flex items-center gap-1">
                    Register <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-300 hover:text-white focus:outline-none cursor-pointer p-1.5"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div
        className={`lg:hidden fixed inset-x-0 z-40 bg-dark-bg/95 backdrop-blur-lg transition-all duration-300 border-b border-dark-border ${
          isOpen ? 'translate-y-0 opacity-100 pointer-events-auto visible' : '-translate-y-4 opacity-0 pointer-events-none invisible'
        }`}
        style={{ top: '65px', height: 'auto' }}
      >
        <div className="px-4 pt-4 pb-8 space-y-4 shadow-2xl">
          <nav className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleNavClick('landing', '/', 'booking-widget')}
              className={`text-left w-full text-base font-medium py-2.5 border-b border-dark-border/50 cursor-pointer ${
                currentView === 'landing' ? 'text-brand-lime font-bold' : 'text-slate-200 hover:text-brand-lime'
              }`}
            >
              Book Court
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('openplay', '/open-play')}
              className={`text-left w-full text-base font-medium py-2.5 border-b border-dark-border/50 cursor-pointer flex items-center gap-2 ${
                currentView === 'openplay' ? 'text-brand-lime font-bold' : 'text-slate-200 hover:text-brand-lime'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Open Play</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('bootcamp', '/bootcamp')}
              className={`text-left w-full text-base font-medium py-2.5 border-b border-dark-border/50 cursor-pointer flex items-center gap-2 ${
                currentView === 'bootcamp' ? 'text-brand-lime font-bold' : 'text-slate-200 hover:text-brand-lime'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Bootcamp</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('lookup', '/?view=lookup')}
              className={`text-left w-full text-base font-medium py-2.5 border-b border-dark-border/50 cursor-pointer ${
                currentView === 'lookup' ? 'text-brand-lime font-bold' : 'text-slate-200 hover:text-brand-lime'
              }`}
            >
              Check Status
            </button>
          </nav>

          <div className="flex flex-col gap-3 pt-4">
            {user ? (
              <>
                {(user.isAdmin || user.email.toLowerCase() === 'admin@picklepoint.com') && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.history.pushState({}, '', '/pickle-admin');
                      setView('admin');
                    }}
                    className="w-full text-center py-3 rounded-full text-base font-semibold text-dark-bg bg-brand-lime shadow-md shadow-brand-lime/10 cursor-pointer"
                  >
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => handleNavClick('profile', '/profile')}
                  className="w-full text-center py-3 rounded-full text-base font-semibold text-slate-200 bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-brand-lime" />
                  <span>My Profile ({user.name})</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full text-center py-3 rounded-full text-base font-medium text-slate-400 hover:text-white border border-dark-border cursor-pointer"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setView('login');
                  }}
                  className="w-full text-center py-3 rounded-full text-base font-medium text-slate-300 hover:text-white border border-dark-border cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setView('register');
                  }}
                  className="w-full text-center py-3 rounded-full text-base font-semibold text-dark-bg bg-brand-lime shadow-lg shadow-brand-lime/10 cursor-pointer"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
