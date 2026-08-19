import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  QrCode,
  Upload,
  AlertCircle,
  Loader2,
  CreditCard,
  Phone,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { DEFAULT_OPERATING_HOURS } from '../utils/timeSlotUtils';

const REGIONS_FALLBACK = [
  { code: '1300000000', name: 'National Capital Region (NCR)' },
  { code: '0100000000', name: 'Region I (Ilocos Region)' },
  { code: '0200000000', name: 'Region II (Cagayan Valley)' },
  { code: '0300000000', name: 'Region III (Central Luzon)' },
  { code: '0400000000', name: 'Region IV-A (CALABARZON)' },
  { code: '1700000000', name: 'MIMAROPA Region' },
  { code: '0500000000', name: 'Region V (Bicol Region)' },
  { code: '0600000000', name: 'Region VI (Western Visayas)' },
  { code: '0700000000', name: 'Region VII (Central Visayas)' },
  { code: '0800000000', name: 'Region VIII (Eastern Visayas)' },
  { code: '0900000000', name: 'Region IX (Zamboanga Peninsula)' },
  { code: '1000000000', name: 'Region X (Northern Mindanao)' },
  { code: '1100000000', name: 'Region XI (Davao Region)' },
  { code: '1200000000', name: 'Region XII (SOCCSKSARGEN)' },
  { code: '1400000000', name: 'Cordillera Administrative Region (CAR)' },
  { code: '1600000000', name: 'Region XIII (Caraga)' },
  { code: '1900000000', name: 'Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)' },
];

interface ClientAdminOnboardingProps {
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean };
  onComplete: (updatedUser: { uid?: string; name: string; email: string; role?: string; companyId?: string; companyName?: string; isAdmin?: boolean }) => void;
}

export default function ClientAdminOnboarding({ user, onComplete }: ClientAdminOnboardingProps) {
  // 1. Company Information States
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [logoBase64, setLogoBase64] = useState<string>('');

  // 2. PSGC Cascading Address States
  const [regions, setRegions] = useState<{ code: string; name: string }[]>(REGIONS_FALLBACK);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regionName, setRegionName] = useState('');

  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [cities, setCities] = useState<{ code: string; name: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [cityName, setCityName] = useState('');

  const [barangays, setBarangays] = useState<{ code: string; name: string }[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [barangayName, setBarangayName] = useState('');

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // 3. Payment Setup States (GCash)
  const [gcashName, setGcashName] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [gcashQrBase64, setGcashQrBase64] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch PSGC Regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await fetch('https://psgc.cloud/api/regions');
        const data = await res.json();
        setRegions(Array.isArray(data) && data.length > 0 ? data : REGIONS_FALLBACK);
      } catch (err) {
        console.error('Failed to fetch regions, using fallback:', err);
        setRegions(REGIONS_FALLBACK);
      }
    };
    fetchRegions();
  }, []);

  const fetchCities = async (regionCode: string, provinceCode: string) => {
    if (!regionCode) {
      setCities([]);
      return;
    }
    try {
      const url = provinceCode
        ? `https://psgc.cloud/api/provinces/${provinceCode}/cities-municipalities`
        : `https://psgc.cloud/api/regions/${regionCode}/cities-municipalities`;
      const res = await fetch(url);
      const data = await res.json();
      setCities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
      setCities([]);
    }
  };

  const fetchBarangays = async (cityCode: string) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    try {
      const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${cityCode}/barangays`);
      const data = await res.json();
      setBarangays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch barangays:', err);
      setBarangays([]);
    }
  };

  const handleRegionChange = async (code: string) => {
    setSelectedRegion(code);
    const regionObj = regions.find((r) => r.code === code);
    setRegionName(regionObj ? regionObj.name : '');

    setSelectedProvince('');
    setProvinceName('');
    setSelectedCity('');
    setCityName('');
    setSelectedBarangay('');
    setBarangayName('');

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (code) {
      try {
        const resProv = await fetch(`https://psgc.cloud/api/regions/${code}/provinces`);
        const provs = await resProv.json();
        const hasProvinces = Array.isArray(provs) && provs.length > 0;
        setProvinces(hasProvinces ? provs : []);

        if (!hasProvinces) {
          const resCities = await fetch(`https://psgc.cloud/api/regions/${code}/cities-municipalities`);
          const cts = await resCities.json();
          setCities(Array.isArray(cts) ? cts : []);
        }
      } catch (err) {
        console.error('Error fetching provinces:', err);
      }
    }
  };

  const handleProvinceChange = async (code: string) => {
    setSelectedProvince(code);
    const provObj = provinces.find((p) => p.code === code);
    setProvinceName(provObj ? provObj.name : '');

    setSelectedCity('');
    setCityName('');
    setSelectedBarangay('');
    setBarangayName('');

    setCities([]);
    setBarangays([]);

    if (code) {
      fetchCities(selectedRegion, code);
    }
  };

  const handleCityChange = async (code: string) => {
    setSelectedCity(code);
    const cityObj = cities.find((c) => c.code === code);
    setCityName(cityObj ? cityObj.name : '');

    setSelectedBarangay('');
    setBarangayName('');

    setBarangays([]);

    if (code) {
      fetchBarangays(code);
    }
  };

  const handleBarangayChange = (code: string) => {
    setSelectedBarangay(code);
    const brgyObj = barangays.find((b) => b.code === code);
    setBarangayName(brgyObj ? brgyObj.name : '');
  };

  // File Upload Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('QR Code image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setGcashQrBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!companyName.trim()) {
      setError('Please provide your Company / Facility Name.');
      return;
    }

    if (!regionName) {
      setError('Please select your Region.');
      return;
    }

    if (!cityName.trim()) {
      setError('Please select or enter your Municipality / City.');
      return;
    }

    if (!barangayName.trim()) {
      setError('Please select or enter your Barangay.');
      return;
    }

    if (!addressLine1.trim()) {
      setError('Please enter your Street Address (Address 1).');
      return;
    }

    if (!gcashName.trim() || !gcashNumber.trim()) {
      setError('Please enter your GCash Account Name and Mobile Number.');
      return;
    }

    if (!gcashQrBase64) {
      setError('Please upload your GCash QR Code image so customers can pay during court checkout.');
      return;
    }

    setLoading(true);

    try {
      const compId = 'comp-' + Date.now();
      const formattedAddress = [
        addressLine1.trim(),
        addressLine2.trim(),
        barangayName.trim(),
        cityName.trim(),
        provinceName.trim(),
        regionName.trim(),
        postalCode.trim() ? `Postal: ${postalCode.trim()}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const companyPayload: Record<string, any> = {
        id: compId,
        name: companyName.trim(),
        address: formattedAddress,
        clientAdminEmail: user.email.toLowerCase(),
        addressLine1: addressLine1.trim(),
        region: regionName.trim(),
        status: 'active',
        operatingHours: DEFAULT_OPERATING_HOURS,
        createdAt: new Date().toISOString(),
      };

      if (phone.trim()) companyPayload.phone = phone.trim();
      if (description.trim()) companyPayload.description = description.trim();
      if (logoBase64) companyPayload.logoUrl = logoBase64;
      if (addressLine2.trim()) companyPayload.addressLine2 = addressLine2.trim();
      if (barangayName.trim()) companyPayload.barangay = barangayName.trim();
      if (cityName.trim()) companyPayload.municipality = cityName.trim();
      if (provinceName.trim()) companyPayload.province = provinceName.trim();
      if (postalCode.trim()) companyPayload.postalCode = postalCode.trim();

      const gcashAccountPayload = {
        id: 'gcash-' + Date.now(),
        gcashName: gcashName.trim(),
        gcashNumber: gcashNumber.trim(),
        gcashQrCode: gcashQrBase64,
      };

      // 1. Save to Firestore (if configured)
      if (isFirebaseConfigured && db) {
        try {
          // Save Company
          await setDoc(doc(db, 'companies', compId), companyPayload);

          // Save GCash Payment Settings for this user
          if (user.uid) {
            await setDoc(
              doc(db, 'settings', 'checkout', 'users', user.uid),
              { accounts: [gcashAccountPayload] },
              { merge: true }
            );

            // Update user record
            await updateDoc(doc(db, 'users', user.uid), {
              companyId: compId,
              companyName: companyName.trim(),
              needsOnboarding: false,
              isInvitedPending: false,
              role: 'client_admin',
              status: 'active',
            });
          }
        } catch (fErr) {
          console.warn('Firestore onboarding save failed, saving locally:', fErr);
        }
      }

      // 2. Persist to LocalStorage
      const compStr = localStorage.getItem('picklepoint_companies');
      const localComps = compStr ? JSON.parse(compStr) : [];
      localComps.push(companyPayload);
      localStorage.setItem('picklepoint_companies', JSON.stringify(localComps));

      if (user.uid) {
        localStorage.setItem(
          `picklepoint_checkout_settings_accounts_${user.uid}`,
          JSON.stringify([gcashAccountPayload])
        );
      }

      const usersStr = localStorage.getItem('picklepoint_users');
      if (usersStr) {
        const localUsers = JSON.parse(usersStr);
        const updatedUsers = localUsers.map((u: any) =>
          u.email?.toLowerCase() === user.email.toLowerCase()
            ? {
                ...u,
                companyId: compId,
                companyName: companyName.trim(),
                needsOnboarding: false,
                role: 'client_admin',
                status: 'active',
              }
            : u
        );
        localStorage.setItem('picklepoint_users', JSON.stringify(updatedUsers));
      }

      // 3. Update session
      const updatedUserSession = {
        ...user,
        companyId: compId,
        companyName: companyName.trim(),
        role: 'client_admin',
        isAdmin: true,
      };

      localStorage.setItem('picklepoint_session', JSON.stringify(updatedUserSession));

      // 4. Complete onboarding
      onComplete(updatedUserSession);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to save company profile: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white relative flex flex-col items-center justify-center px-4 py-12 overflow-x-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[5%] left-[15%] w-[45%] h-[45%] bg-brand-emerald/10 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[5%] right-[15%] w-[45%] h-[45%] bg-brand-lime/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 border border-slate-800 animate-fade-in">
        <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>

        {/* Header Title */}
        <div className="text-center mb-8 pb-6 border-b border-slate-800">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4" /> Client Admin Setup Wizard
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Register Your Pickleball Facility
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            Welcome, <strong className="text-white">{user.name}</strong> ({user.email}). Complete your facility profile and GCash payment setup to start managing courts and receiving booking reservations.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-start gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: FACILITY & COMPANY DETAILS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-lime uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>1. Company & Facility Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Company / Facility Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Pickleball Club & Venue"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              {/* Logo Upload */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Facility Logo <span className="text-slate-500 font-normal">(Optional, max 2MB)</span>
                </label>
                <div className="flex items-center gap-4">
                  {logoBase64 ? (
                    <div className="relative w-16 h-16 rounded-2xl border border-brand-lime/40 bg-slate-900 overflow-hidden flex items-center justify-center">
                      <img src={logoBase64} alt="Logo preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setLogoBase64('')}
                        className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md transition-colors"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-500">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}

                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/80 border border-slate-700 hover:border-brand-lime/50 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-brand-lime" />
                    <span>{logoBase64 ? 'Change Logo Image' : 'Upload Facility Logo'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="tel"
                    placeholder="0917-123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  About Facility / Short Bio
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Premier indoor & outdoor pickleball venue with tournament grade courts and lounge."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 resize-none font-sans"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-lime uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              <span>2. Facility Address & Location</span>
            </div>

            {/* Region select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Region <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full bg-slate-900 border border-dark-border text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer font-medium"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Region</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code} className="bg-slate-900 text-white">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Province select (only if provinces exist for the region) */}
            {selectedRegion && provinces.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Province
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer font-medium"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Select Province</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code} className="bg-slate-900 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Municipality & Barangay dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Municipality / City <span className="text-red-400">*</span>
                </label>
                {selectedRegion && cities.length > 0 ? (
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer font-medium"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Select Municipality / City</option>
                    {cities.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Enter Municipality / City"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Barangay <span className="text-red-400">*</span>
                </label>
                {selectedCity && barangays.length > 0 ? (
                  <select
                    value={selectedBarangay}
                    onChange={(e) => handleBarangayChange(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer font-medium"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Select Barangay</option>
                    {barangays.map((b) => (
                      <option key={b.code} value={b.code} className="bg-slate-900 text-white">
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={barangayName}
                    onChange={(e) => setBarangayName(e.target.value)}
                    placeholder="Enter Barangay"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                  />
                )}
              </div>
            </div>

            {/* Address Line 1 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Street Address (Address 1) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 123 Sports Complex Way"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
              />
            </div>

            {/* Address Line 2 & Postal Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Apt, Suite, Unit, etc. (Address 2 - Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Phase 2, Unit B"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Postal / ZIP Code <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1600"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PAYMENT SETUP (GCASH) */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-lime uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              <span>3. GCash Payment Information</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customers will use this GCash QR code and mobile number to pay directly for their court bookings.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GCash Account Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  GCash Account Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JUAN DELA CRUZ"
                  value={gcashName}
                  onChange={(e) => setGcashName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 uppercase"
                />
              </div>

              {/* GCash Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  GCash Mobile Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="09XXXXXXXXX"
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 font-mono"
                />
              </div>

              {/* GCash QR Code Upload */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Upload GCash QR Code Image <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {gcashQrBase64 ? (
                    <div className="relative w-28 h-28 rounded-2xl border border-brand-lime/40 bg-slate-900 p-1 flex items-center justify-center flex-shrink-0">
                      <img src={gcashQrBase64} alt="GCash QR preview" className="w-full h-full object-contain rounded-xl" />
                      <button
                        type="button"
                        onClick={() => setGcashQrBase64('')}
                        className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md transition-colors"
                        title="Remove QR"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                      <QrCode className="w-8 h-8 mb-1" />
                      <span className="text-[10px]">No QR Code</span>
                    </div>
                  )}

                  <label className="w-full flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-slate-900/80 border border-slate-700 hover:border-brand-lime/50 rounded-2xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-all text-center">
                    <QrCode className="w-6 h-6 text-brand-lime" />
                    <span>{gcashQrBase64 ? 'Change GCash QR Code' : 'Click to Upload GCash QR Code'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">PNG, JPG, or WEBP up to 2MB</span>
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-6 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-extrabold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-brand-lime/20 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering Facility & Payment System...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup & Launch Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
