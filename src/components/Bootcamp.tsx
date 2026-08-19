import { Sparkles, Calendar, Award, ArrowLeft, ArrowRight } from 'lucide-react';

interface BootcampProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup' | 'profile' | 'openplay' | 'bootcamp') => void;
}

export default function Bootcamp({ setView }: BootcampProps) {
  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-10 left-[-10%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-[-10%] w-[45%] h-[45%] bg-brand-lime/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-xs font-bold text-brand-lime uppercase tracking-wider mb-6">
          <Sparkles className="w-4 h-4" /> Training & Coaching Programs
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
          Pickleball Bootcamps{' '}
          <span className="bg-gradient-to-r from-brand-lime via-brand-lime to-brand-emerald bg-clip-text text-transparent">
            Coming Soon
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
          We are preparing intensive coaching clinics, DUPR rating bootcamps, and masterclasses led by certified pickleball pros.
        </p>

        {/* Feature Teaser Cards */}
        <div className="grid sm:grid-cols-3 gap-6 text-left mb-12">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Fundamentals Clinic</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Master the kitchen, dinking mechanics, third-shot drops, and court positioning.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">DUPR Level-Up</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Targeted drills and strategy sessions designed to push you from 3.0 to 4.5+.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-lime mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Weekend Intensives</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full-day workshops with video analysis, live match coaching, and pro drills.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-4">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/open-play');
              setView('openplay');
            }}
            className="px-6 py-3.5 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] text-sm font-bold transition-all shadow-lg shadow-brand-lime/10 flex items-center gap-2 cursor-pointer"
          >
            <span>Explore Open Play Events</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              setView('landing');
            }}
            className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Court Booking</span>
          </button>
        </div>
      </div>
    </div>
  );
}
