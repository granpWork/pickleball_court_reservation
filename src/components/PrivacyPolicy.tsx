import { Shield, ArrowLeft, Lock, FileText, CheckCircle2, Mail, Globe } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack || (() => { window.location.href = '/'; })}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-brand-lime/40 transition-all cursor-pointer"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Book Picklecourt</h1>
                <p className="text-xs text-brand-lime font-semibold">Privacy Policy & Data Security Statement</p>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Last Updated: August 30, 2026
          </span>
        </div>

        {/* Hero Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-brand-lime/20 bg-gradient-to-r from-brand-lime/5 via-slate-900/40 to-slate-900/80 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>User Data Protection Guarantee</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Your Privacy is Our Top Priority</h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            Book Picklecourt ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This policy outlines how we collect, use, store, and protect your data when you use our court reservation platform.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300">

          {/* Section 1 */}
          <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-lime" />
              1. Information We Collect
            </h3>
            <p className="leading-relaxed text-slate-300">
              When you register, log in, or complete a court reservation on Book Picklecourt, we may collect the following personal information:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><strong className="text-white">Account Data:</strong> Full Name, Email Address, and Profile Picture provided during Google Sign-In or manual account registration.</li>
              <li><strong className="text-white">Reservation Details:</strong> Venue selected, court assignment, date, time slots, equipment rentals, and booking references.</li>
              <li><strong className="text-white">Payment Verification:</strong> Proof-of-payment receipts uploaded for GCash or Bank Transfer validation.</li>
              <li><strong className="text-white">Technical Metadata:</strong> IP address, device type, browser information, and active session timestamps.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-lime" />
              2. How We Use Your Information
            </h3>
            <p className="leading-relaxed text-slate-300">
              We process your data strictly to provide, maintain, and improve our court booking service:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li>To confirm, manage, and process court reservations and open play registrations.</li>
              <li>To send instant booking confirmations, digital receipts, and automated payment reminders via email.</li>
              <li>To enable facility managers to verify payment proofs and manage schedule availability.</li>
              <li>To protect against unauthorized access, fraudulent bookings, and security breaches.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-lime" />
              3. Google OAuth 2.0 & Data Security
            </h3>
            <p className="leading-relaxed text-slate-300">
              Book Picklecourt utilizes Google OAuth 2.0 authentication. We only request basic user profile scope (<code className="bg-slate-900 px-1.5 py-0.5 rounded text-brand-lime font-mono text-xs">openid</code>, <code className="bg-slate-900 px-1.5 py-0.5 rounded text-brand-lime font-mono text-xs">email</code>, <code className="bg-slate-900 px-1.5 py-0.5 rounded text-brand-lime font-mono text-xs">profile</code>).
            </p>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand-lime flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                We do <strong className="text-white">never sell, rent, or trade</strong> your Google profile data or personal credentials to third-party advertisers. All authentication credentials are encrypted using industry-standard Firebase Security Rules and SSL/TLS encryption.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-lime" />
              4. Data Retention & Your Rights
            </h3>
            <p className="leading-relaxed text-slate-300">
              You retain full ownership and control of your personal data on Book Picklecourt:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><strong className="text-white">Right to Access:</strong> You can inspect your profile and reservation history anytime via your account portal.</li>
              <li><strong className="text-white">Right to Deletion:</strong> You may request full account and data deletion by contacting our privacy team.</li>
              <li><strong className="text-white">Data Retention:</strong> Active user data is retained for the duration of your account activity to ensure seamless booking management.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-lime" />
              5. Contact Us
            </h3>
            <p className="leading-relaxed text-slate-300">
              If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out to our team:
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <a
                href="mailto:support@bookpicklecourt.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg transition-all font-bold text-xs"
              >
                <Mail className="w-4 h-4" />
                <span>support@bookpicklecourt.com</span>
              </a>
              <span className="text-xs font-mono text-slate-500">Website: https://bookpicklecourt.com</span>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-6 border-t border-slate-800">
          <p>© {new Date().getFullYear()} Book Picklecourt. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
