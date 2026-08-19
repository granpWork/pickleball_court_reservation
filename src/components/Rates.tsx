import { Sun, Moon, ShoppingBag, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function Rates() {
  return (
    <section id="rates" className="py-24 bg-dark-bg/40 relative overflow-hidden border-t border-dark-border">
      {/* Background Gradients */}
      <div className="absolute top-1/3 left-[-10%] w-[40%] h-[50%] bg-brand-lime/5 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-[-10%] w-[40%] h-[50%] bg-brand-emerald/5 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-lime mb-3">
            Transparent Pricing
          </h2>
          <h3 className="text-3xl font-bold text-white mb-5">
            Simple Rates. No Hidden Fees.
          </h3>
          <p className="text-slate-400 text-lg font-normal">
            Choose a slot that fits your schedule. Standard rates apply per hour with no extra charges for lighting or cleanup.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          
          {/* Daytime Card */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between text-left border border-slate-800 hover:border-slate-700/60 transition-all duration-300 relative group">
            <div>
              {/* Header Icon & Title */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-dark-border flex items-center justify-center text-brand-lime">
                  <Sun className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Daytime
                </span>
              </div>

              {/* Price Details */}
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">₱100</span>
                <span className="text-slate-400 text-sm font-medium"> / hour</span>
                <p className="text-xs text-slate-500 mt-2 font-medium">5:00 AM - 6:00 PM</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3.5 mb-8">
                {[
                  'Perfect for morning matches & drills',
                  'Optimal natural lighting conditions',
                  'Pro outdoor plexicushion surface',
                  'Smart lock gate access on booking',
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-base font-normal text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <a
              href="#booking-widget"
              className="w-full py-3 rounded-xl text-base font-semibold text-center bg-slate-900 border border-dark-border hover:border-brand-lime text-slate-300 hover:text-white transition-all block"
            >
              Book Day Slot
            </a>
          </div>

          {/* Nighttime Card (Highlighted/Premium) */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between text-left border border-brand-lime/30 bg-slate-950/40 hover:border-brand-lime/60 shadow-xl shadow-brand-lime/5 transition-all duration-300 relative group overflow-hidden">
            {/* Pop Glow Badge */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/10 blur-2xl rounded-full pointer-events-none -z-10"></div>
            
            <div>
              {/* Header Icon & Title */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-lime/20 border border-brand-lime/35 flex items-center justify-center text-brand-lime animate-pulse">
                  <Moon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-lime/15 text-brand-lime border border-brand-lime/25">
                  Nighttime
                </span>
              </div>

              {/* Price Details */}
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">₱150</span>
                <span className="text-slate-400 text-sm font-medium"> / hour</span>
                <p className="text-xs text-slate-400 mt-2 font-semibold">6:00 PM - 10:00 PM</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3.5 mb-8">
                {[
                  'Pro LED floodlight illumination',
                  'Cooler evening playing temperatures',
                  'Peak social play & matches',
                  'Automated lighting included in fee',
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-base font-normal text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
                    <span className="font-medium text-slate-200">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <a
              href="#booking-widget"
              className="w-full py-3 rounded-xl text-base font-semibold text-center bg-brand-lime text-dark-bg hover:bg-[#a6e224] transition-all block shadow-md shadow-brand-lime/10"
            >
              Book Night Slot
            </a>
          </div>

          {/* Equipment Rentals Card */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between text-left border border-slate-800 hover:border-slate-700/60 transition-all duration-300 relative group">
            <div>
              {/* Header Icon & Title */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-dark-border flex items-center justify-center text-slate-400 group-hover:text-brand-lime transition-colors">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Rentals
                </span>
              </div>

              {/* Price Details */}
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-white">₱30 - ₱50</span>
                <span className="text-slate-400 text-sm font-medium"> / rental</span>
                <p className="text-xs text-slate-500 mt-2 font-medium">Available on check-in</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3.5 mb-8">
                {[
                  'JOOLA & Selkirk paddles: ₱50',
                  'Fresh outdoor pickleballs: ₱30/pack',
                  'Pickup directly from smart lockers',
                  'Add to reservation at final checkout',
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-base font-normal text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <a
              href="#booking-widget"
              className="w-full py-3 rounded-xl text-base font-semibold text-center bg-slate-900 border border-dark-border hover:border-brand-lime text-slate-300 hover:text-white transition-all block"
            >
              Configure Rentals
            </a>
          </div>

        </div>

        {/* CTA scroll up helper */}
        <div className="mt-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
          <div>
            <h4 className="text-xl font-semibold text-white mb-1">Split Court Fees with Friends</h4>
            <p className="text-base font-normal text-slate-400 leading-relaxed max-w-md">
              Create community lobbies, invite players to play, and split court rates dynamically directly at checkout.
            </p>
          </div>
          <a
            href="#booking-widget"
            className="flex items-center gap-1 text-base font-semibold text-brand-lime hover:text-[#a6e224] transition-colors shrink-0 group"
          >
            <span>Reserve a Slot Now</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

      </div>
    </section>
  );
}
