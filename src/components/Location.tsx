import { MapPin, Clock, Navigation, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Location() {
  return (
    <section id="location" className="py-24 bg-dark-bg/60 relative overflow-hidden border-t border-dark-border">
      {/* Background Gradients */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[40%] h-[50%] bg-brand-lime/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-[10%] w-[30%] h-[40%] bg-brand-emerald/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Coordinates & Info Card */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-lime bg-brand-lime/10 px-3 py-1.5 rounded-full border border-brand-lime/20">
                Location Details
              </span>
              <h3 className="text-3xl font-bold text-white mt-4 mb-3">
                Visit the Kitchen
              </h3>
              <p className="text-slate-400 text-base font-normal leading-relaxed">
                Come play at our premium championship court. Equipped with pro-grade outdoor plexicushion surfacing and professional LED lighting for night plays.
              </p>
            </div>

            {/* Location Cards */}
            <div className="space-y-4">
              {/* Address Card */}
              <div className="flex gap-4 p-4 rounded-2xl glass-panel border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-dark-border flex items-center justify-center text-brand-lime shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">Court Address</h4>
                  <p className="text-sm font-normal text-slate-400 mt-1 leading-relaxed">
                    Libmanan, Camarines Sur, Philippines
                  </p>
                  <span className="text-xs font-normal text-slate-500 mt-1 block">
                    Coordinates: 13°41'22.8"N 123°02'46.4"E
                  </span>
                </div>
              </div>

              {/* Operating Hours Card */}
              <div className="flex gap-4 p-4 rounded-2xl glass-panel border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-dark-border flex items-center justify-center text-brand-lime shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">Operating Hours</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    5:00 AM - 10:00 PM Daily
                  </p>
                  <span className="text-xs font-medium text-brand-lime/80 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Booking required for entry
                  </span>
                </div>
              </div>

              {/* Plus Code / Accessibility */}
              <div className="flex gap-4 p-4 rounded-2xl glass-panel border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-dark-border flex items-center justify-center text-brand-lime shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">Plus Code Location</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    M2QW+VF9, Libmanan
                  </p>
                  <span className="text-xs font-normal text-slate-500 mt-1 block">
                    Easily searchable on any mapping software
                  </span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2">
              <a
                href="https://maps.app.goo.gl/z9EdaP2koxzuGn4n8"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/10 hover:scale-[1.01] cursor-pointer"
              >
                Open in Google Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Column: Google Maps Embed Card */}
          <div className="lg:col-span-7 w-full h-[400px] lg:h-[450px]">
            <div className="w-full h-full glass-panel border border-slate-800 rounded-3xl p-2.5 shadow-2xl relative overflow-hidden group">
              {/* Decorative Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-lime/0 via-brand-lime/5 to-brand-emerald/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10"></div>
              
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m13!1m8!1m3!1d3876.47503798627!2d123.0441148!3d13.6896544!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTPCsDQxJzIyLjgiTiAxMjPCsDAyJzQ2LjQiRQ!5e0!3m2!1sen!2sph!4v1780474195104!5m2!1sen!2sph"
                className="w-full h-full rounded-2xl border-0 relative z-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps exact location for Championship Pickleball Court"
              ></iframe>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
