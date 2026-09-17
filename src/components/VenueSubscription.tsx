import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Send,
  Loader2,
  ArrowLeft,
  Check,
  Gift,
  Mail,
  Clock,
  Share2,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface VenueSubscriptionProps {
  onBack?: () => void;
  onSelectPlan?: (planId: string, billingCycle: string) => void;
}

export default function VenueSubscription({ onBack }: VenueSubscriptionProps) {
  // Lead Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [courtCount, setCourtCount] = useState('4');
  const [cityLocation, setCityLocation] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'website' | 'other'>('facebook');
  const [socialUrl, setSocialUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState('');

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !facilityName.trim() || !phone.trim() || !cityLocation.trim()) {
      setLeadError('Please fill out all required fields.');
      return;
    }

    setSubmittingLead(true);
    setLeadError('');

    try {
      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, 'client_leads'), {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          facilityName: facilityName.trim(),
          courtCount: Number(courtCount) || 1,
          cityLocation: cityLocation.trim(),
          socialPlatform,
          socialUrl: socialUrl.trim(),
          notes: notes.trim(),
          status: 'pending_invite',
          isFreeEarlyAccess: true,
          appliedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        console.log('Firebase not configured, lead saved locally:', {
          fullName, email, facilityName, courtCount
        });
      }

      setLeadSuccess(true);
    } catch (err: any) {
      console.error('Error submitting venue application:', err);
      setLeadError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <section id="venue-pricing" className="py-16 sm:py-20 bg-gradient-to-b from-dark-bg via-slate-950 to-dark-bg text-white relative overflow-hidden">
      {/* Background Lighting Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-lime/10 blur-3xl rounded-full pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Back Navigation Bar */}
        {onBack && (
          <div className="mb-8">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-sm font-semibold transition-all cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-brand-lime" />
              <span>Back to Court Booking</span>
            </button>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold tracking-wide uppercase mb-4 animate-pulse">
            <Gift className="w-4 h-4 text-emerald-400" />
            <span>Early Access Launch — 100% Free Partner Access</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            List Your Facility & Automate GCash Bookings <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime via-emerald-400 to-teal-300">
              Free During Early Access Launch
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300">
            We are waiving all subscription and setup fees for court owners while our player network grows. Apply below to receive an exclusive admin invitation link for your venue!
          </p>
        </div>

        {/* Grid Layout: Benefits Column (Left) + Invitation Sign-Up Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
          
          {/* Left Column: Key Free Partner Benefits */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-brand-lime" />
                <span>What's Included in Your Free Access</span>
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime flex-shrink-0">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">0% Commission & Zero Monthly Fees</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Keep 100% of your booking revenues. Early partner venues enjoy full facility admin privileges without recurring subscription charges.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Automated GCash Proof Validation</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Automatically format, track 13-digit reference numbers, and securely store screenshot proofs. Eliminate manual Facebook Messenger verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Open Play Rosters & Live Group Chat</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Host open play sessions, manage player waitlists automatically, and allow players to coordinate via live in-app event chat.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Dedicated Client Admin Dashboard</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Add courts, set operating hours, configure venue GCash QR codes, manage booking statuses, and invite facility staff members.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin-Gated Callout Badge */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 backdrop-blur-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Admin Approval & Invitation Required</h4>
                <p className="text-xs text-slate-300">
                  To ensure quality partner facilities, applications are reviewed by our admin team. Approved venue owners receive a direct invitation onboarding link by email.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Admin Invitation Application Form */}
          <div className="lg:col-span-6 bg-slate-900 border-2 border-brand-lime/40 rounded-3xl p-6 sm:p-8 relative shadow-2xl backdrop-blur-xl">
            {leadSuccess ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-20 h-20 bg-brand-lime/20 border-2 border-brand-lime text-brand-lime rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white">Application Submitted!</h3>
                <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                  Thank you for applying, <strong>{fullName}</strong>! Our admin team is reviewing your venue request for <strong>{facilityName}</strong>.
                </p>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 max-w-md mx-auto flex items-center gap-3">
                  <Clock className="w-5 h-5 text-brand-lime flex-shrink-0" />
                  <span>You will receive an exclusive onboarding invitation link via email (<strong>{email}</strong>) within 24 hours.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLeadSuccess(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-lime/10 text-brand-lime text-xs font-bold uppercase mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>FREE PARTNER REGISTRATION</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Apply for Free Partner Access</h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Fill out your facility details below. Once verified, our admins will send your admin invitation link.
                  </p>
                </div>

                {leadError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                    {leadError}
                  </div>
                )}

                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Coach Mark Santos"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mark@pickleclub.ph"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile / Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0917 123 4567"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Facility / Club Name *</label>
                      <input
                        type="text"
                        required
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="Metro Pickleball Club"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Courts *</label>
                      <select
                        value={courtCount}
                        onChange={(e) => setCourtCount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime cursor-pointer"
                      >
                        <option value="1">1 Court</option>
                        <option value="2">2 Courts</option>
                        <option value="3">3 Courts</option>
                        <option value="4">4 Courts</option>
                        <option value="6">6 Courts</option>
                        <option value="8+">8+ Courts</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">City / Location *</label>
                    <input
                      type="text"
                      required
                      value={cityLocation}
                      onChange={(e) => setCityLocation(e.target.value)}
                      placeholder="Quezon City, Metro Manila"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  {/* Social Media Section */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-brand-lime text-xs font-bold uppercase tracking-wide">
                      <Share2 className="w-4 h-4" />
                      <span>Social Media Page & Online Presence</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Platform</label>
                        <select
                          value={socialPlatform}
                          onChange={(e) => setSocialPlatform(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-lime cursor-pointer font-medium"
                        >
                          <option value="facebook">Facebook Page</option>
                          <option value="instagram">Instagram Profile</option>
                          <option value="tiktok">TikTok Account</option>
                          <option value="youtube">YouTube Channel</option>
                          <option value="website">Official Website</option>
                          <option value="other">Other Link</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Page URL / Link</label>
                        <input
                          type="url"
                          value={socialUrl}
                          onChange={(e) => setSocialUrl(e.target.value)}
                          placeholder={
                            socialPlatform === 'facebook'
                              ? 'https://facebook.com/yourpickleballclub'
                              : socialPlatform === 'instagram'
                              ? 'https://instagram.com/yourpickleballclub'
                              : socialPlatform === 'tiktok'
                              ? 'https://tiktok.com/@yourpickleballclub'
                              : socialPlatform === 'youtube'
                              ? 'https://youtube.com/@yourpickleballclub'
                              : 'https://yourpickleballclub.com'
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-lime placeholder-slate-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Notes / Target Launch Date</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tell us about your courts or preferred launch timeline..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-lime resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingLead}
                    className="w-full mt-3 py-4 px-4 rounded-xl bg-gradient-to-r from-brand-lime via-emerald-400 to-teal-300 hover:from-brand-lime/90 hover:to-emerald-500 text-dark-bg font-extrabold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/20"
                  >
                    {submittingLead ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Submitting Partner Application...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Submit Application for Free Admin Invitation</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    100% Free during Early Access Launch. No credit card required.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
