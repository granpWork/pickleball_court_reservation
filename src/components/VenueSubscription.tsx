import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Search,
  Trophy,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { sendFreePartnerApplicationEmails } from '../services/emailService';

interface CountryOption {
  name: string;
  code: string;
  flag: string;
  iso: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { name: 'Philippines', code: '+63', flag: '🇵🇭', iso: 'PH' },
  { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', iso: 'SG' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { name: 'Afghanistan', code: '+93', flag: '🇦🇫', iso: 'AF' },
  { name: 'Albania', code: '+355', flag: '🇦🇱', iso: 'AL' },
  { name: 'Algeria', code: '+213', flag: '🇩🇿', iso: 'DZ' },
  { name: 'Andorra', code: '+376', flag: '🇦🇩', iso: 'AD' },
  { name: 'Angola', code: '+244', flag: '🇦🇴', iso: 'AO' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', iso: 'AR' },
  { name: 'Armenia', code: '+374', flag: '🇦🇲', iso: 'AM' },
  { name: 'Austria', code: '+43', flag: '🇦🇹', iso: 'AT' },
  { name: 'Azerbaijan', code: '+994', flag: '🇦🇿', iso: 'AZ' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭', iso: 'BH' },
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩', iso: 'BD' },
  { name: 'Belgium', code: '+32', flag: '🇧🇪', iso: 'BE' },
  { name: 'Belize', code: '+501', flag: '🇧🇿', iso: 'BZ' },
  { name: 'Benin', code: '+229', flag: '🇧🇯', iso: 'BJ' },
  { name: 'Bhutan', code: '+975', flag: '🇧🇹', iso: 'BT' },
  { name: 'Bolivia', code: '+591', flag: '🇧🇴', iso: 'BO' },
  { name: 'Bosnia & Herzegovina', code: '+387', flag: '🇧🇦', iso: 'BA' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', iso: 'BR' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳', iso: 'BN' },
  { name: 'Bulgaria', code: '+359', flag: '🇧🇬', iso: 'BG' },
  { name: 'Cambodia', code: '+855', flag: '🇰🇭', iso: 'KH' },
  { name: 'Chile', code: '+56', flag: '🇨🇱', iso: 'CL' },
  { name: 'China', code: '+86', flag: '🇨🇳', iso: 'CN' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴', iso: 'CO' },
  { name: 'Costa Rica', code: '+506', flag: '🇨🇷', iso: 'CR' },
  { name: 'Croatia', code: '+385', flag: '🇭🇷', iso: 'HR' },
  { name: 'Cyprus', code: '+357', flag: '🇨🇾', iso: 'CY' },
  { name: 'Czech Republic', code: '+420', flag: '🇨🇿', iso: 'CZ' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰', iso: 'DK' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨', iso: 'EC' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', iso: 'EG' },
  { name: 'Estonia', code: '+372', flag: '🇪🇪', iso: 'EE' },
  { name: 'Finland', code: '+358', flag: '🇫🇮', iso: 'FI' },
  { name: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
  { name: 'Georgia', code: '+995', flag: '🇬🇪', iso: 'GE' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
  { name: 'Greece', code: '+30', flag: '🇬🇷', iso: 'GR' },
  { name: 'Guatemala', code: '+502', flag: '🇬🇹', iso: 'GT' },
  { name: 'Hong Kong', code: '+852', flag: '🇭🇰', iso: 'HK' },
  { name: 'Hungary', code: '+36', flag: '🇭🇺', iso: 'HU' },
  { name: 'Iceland', code: '+354', flag: '🇮🇸', iso: 'IS' },
  { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩', iso: 'ID' },
  { name: 'Ireland', code: '+353', flag: '🇮🇪', iso: 'IE' },
  { name: 'Israel', code: '+972', flag: '🇮🇱', iso: 'IL' },
  { name: 'Italy', code: '+39', flag: '🇮🇹', iso: 'IT' },
  { name: 'Jamaica', code: '+1', flag: '🇯🇲', iso: 'JM' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { name: 'Jordan', code: '+962', flag: '🇯🇴', iso: 'JO' },
  { name: 'Kazakhstan', code: '+7', flag: '🇰🇿', iso: 'KZ' },
  { name: 'Kenya', code: '+254', flag: '🇰🇪', iso: 'KE' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼', iso: 'KW' },
  { name: 'Laos', code: '+856', flag: '🇱🇦', iso: 'LA' },
  { name: 'Latvia', code: '+371', flag: '🇱🇻', iso: 'LV' },
  { name: 'Lebanon', code: '+961', flag: '🇱🇧', iso: 'LB' },
  { name: 'Lithuania', code: '+370', flag: '🇱🇹', iso: 'LT' },
  { name: 'Luxembourg', code: '+352', flag: '🇱🇺', iso: 'LU' },
  { name: 'Macau', code: '+853', flag: '🇲🇴', iso: 'MO' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾', iso: 'MY' },
  { name: 'Maldives', code: '+960', flag: '🇲🇻', iso: 'MV' },
  { name: 'Malta', code: '+356', flag: '🇲🇹', iso: 'MT' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', iso: 'MX' },
  { name: 'Monaco', code: '+377', flag: '🇲🇨', iso: 'MC' },
  { name: 'Mongolia', code: '+976', flag: '🇲🇳', iso: 'MN' },
  { name: 'Morocco', code: '+212', flag: '🇲🇦', iso: 'MA' },
  { name: 'Nepal', code: '+977', flag: '🇳🇵', iso: 'NP' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱', iso: 'NL' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿', iso: 'NZ' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬', iso: 'NG' },
  { name: 'Norway', code: '+47', flag: '🇳🇴', iso: 'NO' },
  { name: 'Oman', code: '+968', flag: '🇴🇲', iso: 'OM' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰', iso: 'PK' },
  { name: 'Panama', code: '+507', flag: '🇵🇦', iso: 'PA' },
  { name: 'Paraguay', code: '+595', flag: '🇵🇾', iso: 'PY' },
  { name: 'Peru', code: '+51', flag: '🇵🇪', iso: 'PE' },
  { name: 'Poland', code: '+48', flag: '🇵🇱', iso: 'PL' },
  { name: 'Portugal', code: '+351', flag: '🇵🇹', iso: 'PT' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦', iso: 'QA' },
  { name: 'Romania', code: '+40', flag: '🇷🇴', iso: 'RO' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', iso: 'SA' },
  { name: 'Serbia', code: '+381', flag: '🇷🇸', iso: 'RS' },
  { name: 'Slovakia', code: '+421', flag: '🇸🇰', iso: 'SK' },
  { name: 'Slovenia', code: '+386', flag: '🇸🇮', iso: 'SI' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', iso: 'ZA' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', iso: 'KR' },
  { name: 'Spain', code: '+34', flag: '🇪🇸', iso: 'ES' },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰', iso: 'LK' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪', iso: 'SE' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭', iso: 'CH' },
  { name: 'Taiwan', code: '+886', flag: '🇹🇼', iso: 'TW' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭', iso: 'TH' },
  { name: 'Tunisia', code: '+216', flag: '🇹🇳', iso: 'TN' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', iso: 'TR' },
  { name: 'Ukraine', code: '+380', flag: '🇺🇦', iso: 'UA' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', iso: 'AE' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾', iso: 'UY' },
  { name: 'Uzbekistan', code: '+998', flag: '🇺🇿', iso: 'UZ' },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪', iso: 'VE' },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳', iso: 'VN' },
];

interface VenueSubscriptionProps {
  onBack?: () => void;
  onSelectPlan?: (planId: string, billingCycle: string) => void;
}

export default function VenueSubscription({ onBack }: VenueSubscriptionProps) {
  // Lead Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    c.code.includes(countrySearchQuery) ||
    c.iso.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [courtCount, setCourtCount] = useState('4');
  const [cityLocation, setCityLocation] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'website' | 'other'>('facebook');
  const [socialUrl, setSocialUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !facilityName.trim() || !phoneNumber.trim() || !cityLocation.trim()) {
      setLeadError('Please fill out all required fields.');
      return;
    }

    setSubmittingLead(true);
    setLeadError('');

    const targetEmail = email.trim().toLowerCase();
    const fullPhone = `${selectedCountry.code} ${phoneNumber.trim()}`;

    const leadPayload = {
      fullName: fullName.trim(),
      email: targetEmail,
      phone: fullPhone,
      facilityName: facilityName.trim(),
      courtCount: Number(courtCount) || 1,
      cityLocation: cityLocation.trim(),
      socialPlatform,
      socialUrl: socialUrl.trim(),
      notes: notes.trim(),
      status: 'pending_invite',
      isFreeEarlyAccess: true,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      let existingLead: any = null;
      let existingCompany: any = null;

      if (isFirebaseConfigured && db) {
        // 1. Check client_leads collection
        try {
          const leadsSnap = await getDocs(collection(db, 'client_leads'));
          leadsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.email && data.email.trim().toLowerCase() === targetEmail) {
              existingLead = { ...data, id: docSnap.id };
            }
          });
        } catch (e) {
          console.warn('Error querying client_leads:', e);
        }

        // 2. Check companies collection
        try {
          const compSnap = await getDocs(collection(db, 'companies'));
          compSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const compEmail = (data.clientAdminEmail || data.email || '').trim().toLowerCase();
            if (compEmail === targetEmail) {
              existingCompany = { ...data, id: docSnap.id };
            }
          });
        } catch (e) {
          console.warn('Error querying companies:', e);
        }
      }

      // 3. Fallback check in localStorage
      try {
        const localLeadsStr = localStorage.getItem('picklepoint_venue_leads');
        if (localLeadsStr) {
          const localLeads = JSON.parse(localLeadsStr);
          if (Array.isArray(localLeads)) {
            const found = localLeads.find((l: any) => l.email && l.email.trim().toLowerCase() === targetEmail);
            if (found && !existingLead) existingLead = found;
          }
        }
      } catch (e) {}

      // Handle detected duplicates with tailored venue owner alerts
      if (existingCompany) {
        setSubmittingLead(false);
        setLeadError(`🎉 Great news! An account for ${targetEmail} has already been approved and registered as a venue partner. Please check your email inbox for your portal login details.`);
        return;
      }

      if (existingLead) {
        const st = existingLead.status;
        if (st === 'pending_invite' || st === 'pending') {
          setSubmittingLead(false);
          setLeadError(`📩 An early partner access application for ${targetEmail} has already been received and is currently under review by our team. We will process your request and reach out to you shortly!`);
          return;
        }

        if (st === 'invited' || st === 'approved') {
          setSubmittingLead(false);
          setLeadError(`🎉 Great news! An account for ${targetEmail} has already been approved. Please check your email inbox for your admin invitation link.`);
          return;
        }

        if (st === 'rejected') {
          setSubmittingLead(false);
          setLeadError(`⚠️ An application associated with ${targetEmail} was previously reviewed. To update your facility information or inquire about re-application, please contact our onboarding team directly at support@picklepoint.ph.`);
          return;
        }

        setSubmittingLead(false);
        setLeadError(`The email address ${targetEmail} is already registered in our system. If you need assistance, please contact support@picklepoint.ph.`);
        return;
      }

      // If brand new email application, save lead doc
      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, 'client_leads'), {
          id: 'lead_' + Date.now(),
          ...leadPayload,
          appliedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        const existingStr = localStorage.getItem('picklepoint_venue_leads') || '[]';
        const existing: any[] = JSON.parse(existingStr);
        existing.push({ id: 'lead_' + Date.now(), ...leadPayload, createdAt: new Date().toISOString() });
        localStorage.setItem('picklepoint_venue_leads', JSON.stringify(existing));
      }

      // Notify open dashboards/tabs in real-time about new lead application submission
      window.dispatchEvent(new Event('picklepoint_lead_updated'));

      // Dispatch Email Notifications (Applicant Confirmation & Super Admin Alert)
      sendFreePartnerApplicationEmails({
        applicantName: fullName.trim(),
        applicantEmail: email.trim().toLowerCase(),
        applicantPhone: fullPhone,
        facilityName: facilityName.trim(),
        courtCount,
        cityLocation: cityLocation.trim(),
        socialPlatform,
        socialUrl: socialUrl.trim(),
        notes: notes.trim(),
      }).catch((emailErr) => {
        console.warn('Non-blocking application email notification warning:', emailErr);
      });

      setLeadSuccess(true);
    } catch (err: any) {
      console.warn('Error submitting venue application, fallback to success:', err);
      setLeadSuccess(true);
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
                <span>What's Included in Your Free Partner Access</span>
              </h3>

              <div className="space-y-6">
                {/* 1. Voice Scoreboard & Referee Console */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                      <span>Live Voice Scoreboard & Referee Console</span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">New</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Transform matches with official 3-number callouts (`2-5-2`), natural human neural voice announcements, synthesized referee whistle sounds, win-by-2 deuce enforcement, and court side swapping.
                    </p>
                  </div>
                </div>

                {/* 2. 0% Commission */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime flex-shrink-0">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">0% Commission & Zero Monthly Fees</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Keep 100% of your court revenues. Early partner venues enjoy full facility admin privileges without recurring subscription charges.
                    </p>
                  </div>
                </div>

                {/* 3. Automated GCash Proof Validation */}
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

                {/* 4. Open Play Event Engine & Auto Rosters */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Open Play Event Engine & Auto Rosters</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Host open play sessions, manage player waitlists automatically, collect GCash entry fees, auto-pull rosters into live scoreboards, and let players chat via live in-app event messaging.
                    </p>
                  </div>
                </div>

                {/* 5. Dedicated Client Admin & Security Suite */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Full Facility Admin Control Suite</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Add courts, configure peak/night rate toggles, set lead-time rules, manage GCash QR codes, invite staff managers, and access in-browser WebP photo optimization tools.
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
                    <div className="relative flex rounded-xl border border-slate-800 focus-within:border-brand-lime bg-slate-950 transition-colors" ref={countryDropdownRef}>
                      {/* Country Code Dropdown Trigger */}
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="flex items-center gap-2 bg-slate-900 border-r border-slate-800 px-3 py-3 text-xs sm:text-sm text-white focus:outline-none hover:bg-slate-800/80 transition-colors rounded-l-xl shrink-0 font-medium"
                      >
                        <img
                          src={`https://flagcdn.com/w40/${selectedCountry.iso.toLowerCase()}.png`}
                          srcSet={`https://flagcdn.com/w80/${selectedCountry.iso.toLowerCase()}.png 2x`}
                          alt={selectedCountry.name}
                          className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0"
                          loading="eager"
                        />
                        <span>{selectedCountry.code}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Phone Input */}
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="123-456-7890"
                        className="w-full bg-transparent px-4 py-3 text-sm text-white focus:outline-none font-mono"
                      />

                      {/* Floating Dropdown Card */}
                      {isCountryDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-72 max-h-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1.5">
                          {/* Search Input Box */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={countrySearchQuery}
                              onChange={(e) => setCountrySearchQuery(e.target.value)}
                              placeholder="Search country or code..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
                              autoFocus
                            />
                          </div>

                          {/* Country List */}
                          <div className="overflow-y-auto max-h-56 divide-y divide-slate-800/40 pr-0.5">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((c) => {
                                const isSelected = selectedCountry.iso === c.iso && selectedCountry.code === c.code;
                                return (
                                  <button
                                    key={`${c.iso}-${c.code}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountry(c);
                                      setIsCountryDropdownOpen(false);
                                      setCountrySearchQuery('');
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm transition-colors text-left ${
                                      isSelected ? 'bg-slate-800 text-brand-lime font-medium' : 'text-slate-200 hover:bg-slate-800/60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <img
                                        src={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png`}
                                        srcSet={`https://flagcdn.com/w80/${c.iso.toLowerCase()}.png 2x`}
                                        alt={c.name}
                                        className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0"
                                        loading="lazy"
                                      />
                                      <span className="truncate">{c.name}</span>
                                      <span className="text-slate-400 font-mono text-xs shrink-0">({c.code})</span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-brand-lime shrink-0 ml-2" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-500">No country found</div>
                            )}
                          </div>
                        </div>
                      )}
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
