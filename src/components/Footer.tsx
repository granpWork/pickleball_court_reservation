import { Send, Mail } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 4000);
    }
  };

  return (
    <footer className="bg-[#05070c] border-t border-dark-border text-slate-400 pt-16 pb-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12">
          
          {/* Logo & Description */}
          <div className="lg:col-span-4 text-left">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-8 h-8 text-brand-lime"
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
              <span className="text-xl font-bold tracking-tight text-white">
                Pickle<span className="text-brand-lime">Point</span>
              </span>
            </div>
            <p className="text-base font-normal text-slate-400 mb-6 leading-relaxed">
              Elevating the pickleball booking experience. Find high-quality courts, organize tournaments, coordinate lobbies, and connect with local players effortlessly.
            </p>
            <div className="flex gap-4">
              {/* Instagram */}
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-400 hover:text-brand-lime hover:border-brand-lime transition-all duration-300"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              {/* Twitter / X */}
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-400 hover:text-brand-lime hover:border-brand-lime transition-all duration-300"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              {/* Facebook */}
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-400 hover:text-brand-lime hover:border-brand-lime transition-all duration-300"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              {/* Youtube */}
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-400 hover:text-brand-lime hover:border-brand-lime transition-all duration-300"
                aria-label="Youtube"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
                  <polygon points="10 15 15 12 10 9" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links Categories */}
          <div className="lg:col-span-2 text-left">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Bookings</h4>
            <ul className="space-y-2.5 text-base font-medium">
              <li><a href="#" className="hover:text-brand-lime transition-colors">Find a Court</a></li>
              <li><a href="#" className="hover:text-brand-lime transition-colors">Join Lobbies</a></li>
              <li><a href="#" className="hover:text-brand-lime transition-colors">Ladder Leagues</a></li>
              <li><a href="#" className="hover:text-brand-lime transition-colors">Tournaments</a></li>
            </ul>
          </div>

          <div className="lg:col-span-2 text-left">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5 text-base font-medium">
              <li><a href="#" className="hover:text-brand-lime transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-brand-lime transition-colors">Partner Clubs</a></li>
              <li><a href="#" className="hover:text-brand-lime transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-brand-lime transition-colors">Press Room</a></li>
            </ul>
          </div>

          {/* Newsletter Form */}
          <div className="lg:col-span-4 text-left">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Stay in the Loop</h4>
            <p className="text-base font-normal text-slate-400 mb-4">
              Get notified about new court openings, community lobbies, and local leagues.
            </p>

            {subscribed ? (
              <div className="p-3.5 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-base font-semibold flex items-center gap-2 animate-fade-in">
                <Mail className="w-4 h-4" /> Subscription successful! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-slate-900 border border-dark-border text-white text-base font-normal rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] font-semibold text-base flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Subscribe
                </button>
              </form>
            )}
            <span className="text-xs font-normal text-slate-500 mt-2 block">
              We respect your privacy. Unsubscribe at any time.
            </span>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-dark-border pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-normal">
          <p>© {new Date().getFullYear()} PicklePoint Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Preferences</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
