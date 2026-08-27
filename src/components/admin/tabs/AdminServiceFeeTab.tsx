import React, { useState } from 'react';
import { DollarSign, Save, ShieldCheck, CheckCircle2, TrendingUp, Building2, Calendar, Search, CreditCard, RefreshCw } from 'lucide-react';
import { type Booking } from '../adminTypes';

interface Company {
  id: string;
  name: string;
  clientAdminEmail?: string;
  status?: string;
}

interface AdminServiceFeeTabProps {
  globalServiceFee: number;
  globalServiceFeeEnabled: boolean;
  onSaveServiceFee: (fee: number, enabled: boolean) => Promise<void>;
  bookings: Booking[];
  companies: Company[];
  formatEventDateLong?: (dateStr: string) => string;
}

export const AdminServiceFeeTab: React.FC<AdminServiceFeeTabProps> = ({
  globalServiceFee,
  globalServiceFeeEnabled,
  onSaveServiceFee,
  bookings,
  companies,
  formatEventDateLong = (d) => d,
}) => {
  const [feeAmount, setFeeAmount] = useState<number>(globalServiceFee);
  const [feeEnabled, setFeeEnabled] = useState<boolean>(globalServiceFeeEnabled);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    setFeeAmount(globalServiceFee);
  }, [globalServiceFee]);

  React.useEffect(() => {
    setFeeEnabled(globalServiceFeeEnabled);
  }, [globalServiceFeeEnabled]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveServiceFee(feeAmount, feeEnabled);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save service fee:', err);
    } finally {
      setSaving(false);
    }
  };

  // Metrics Calculations
  const approvedBookings = bookings.filter((b) => b.status === 'approved');
  
  // Calculate total platform service fees collected (assumes standard global service fee per approved booking)
  const totalServiceFeesCollected = approvedBookings.length * globalServiceFee;
  const totalGrossBookingVolume = approvedBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);

  // Company revenue breakdown
  const companyBreakdown = companies.map((company) => {
    const companyBookings = approvedBookings.filter(
      (b) => b.companyId === company.id || (b.courtName && b.courtName.toLowerCase().includes(company.name.toLowerCase()))
    );
    const companyVolume = companyBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
    const companyFees = companyBookings.length * globalServiceFee;

    return {
      id: company.id,
      name: company.name,
      bookingsCount: companyBookings.length,
      grossVolume: companyVolume,
      serviceFees: companyFees,
    };
  });

  const filteredLogs = approvedBookings.filter((b) => {
    const query = searchQuery.toLowerCase();
    return (
      b.id?.toLowerCase().includes(query) ||
      b.user?.name?.toLowerCase().includes(query) ||
      b.user?.email?.toLowerCase().includes(query) ||
      b.courtName?.toLowerCase().includes(query) ||
      b.date?.includes(query)
    );
  });

  return (
    <div className="space-y-8 text-left animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin Platform Controls</span>
          </div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-lime" /> Platform Convenience & Service Fee
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure global checkout convenience fee, inspect platform fee earnings, and view revenue per venue.
          </p>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Platform Fees Earned */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Service Fees Earned</span>
            <span className="text-2xl font-black text-brand-lime font-mono block">₱{totalServiceFeesCollected.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">From {approvedBookings.length} completed checkouts</span>
          </div>
        </div>

        {/* Card 2: Active Fee Configuration */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Platform Fee Rate</span>
            <span className="text-2xl font-black text-white font-mono block">
              {globalServiceFeeEnabled ? `₱${globalServiceFee}` : 'FREE (₱0)'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Status: <strong className={globalServiceFeeEnabled ? 'text-brand-lime' : 'text-amber-400'}>{globalServiceFeeEnabled ? 'ACTIVE ON CHECKOUT' : 'DISABLED'}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Gross Booking Volume */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Booking Volume</span>
            <span className="text-2xl font-black text-emerald-400 font-mono block">₱{totalGrossBookingVolume.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Total court reservations value</span>
          </div>
        </div>

        {/* Card 4: Partner Venues Count */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partner Venues</span>
            <span className="text-2xl font-black text-purple-300 font-mono block">{companies.length}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Active pickleball facility partners</span>
          </div>
        </div>
      </div>

      {/* Global Configuration Form */}
      <form onSubmit={handleSave} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-lime" /> Global Convenience Fee Controls
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Set the standard platform convenience fee added to player checkouts across all courts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">Platform Fee Toggle:</span>
            <button
              type="button"
              onClick={() => setFeeEnabled(!feeEnabled)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                feeEnabled ? 'bg-brand-lime' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 bg-slate-950 rounded-full shadow-md transition-transform ${
                  feeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
              Service Fee Amount per Booking (PHP ₱)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">₱</span>
              <input
                type="number"
                min={0}
                required
                value={feeAmount}
                onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-brand-lime transition-all"
                placeholder="30"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              This fee is added automatically at checkout to cover online booking infrastructure costs.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">Fee Policy Summary</h5>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              <li>Fees apply globally to all court checkout transactions.</li>
              <li>Disabling the toggle waives service fees (₱0) for all users.</li>
              <li>Full voucher redemptions automatically bypass service fees.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {savedSuccess ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Platform service fee configuration updated successfully!
            </span>
          ) : (
            <span className="text-xs text-slate-500">Click save to apply changes globally.</span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Service Fee Settings'}</span>
          </button>
        </div>
      </form>

      {/* Partner Venue Revenue Breakdown Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div>
          <h4 className="text-base font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-emerald" /> Partner Venue Fee Breakdown
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Service fees generated across partner pickleball facility organizations.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Partner Venue Name</th>
                <th className="py-3 px-4 text-center">Approved Bookings</th>
                <th className="py-3 px-4 text-right">Gross Court Volume</th>
                <th className="py-3 px-4 text-right">Platform Fees Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
              {companyBreakdown.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-4 font-sans font-extrabold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-lime flex-shrink-0" />
                    <span>{comp.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                    {comp.bookingsCount} bookings
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-300">
                    ₱{comp.grossVolume.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-brand-lime">
                    ₱{comp.serviceFees.toLocaleString()}
                  </td>
                </tr>
              ))}
              {companyBreakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                    No partner venue organizations registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Log Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" /> Service Fee Transaction Logs
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Itemized log of approved reservations charging platform convenience fees.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-lime"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Court Venue</th>
                <th className="py-3 px-4">Date & Slots</th>
                <th className="py-3 px-4 text-right">Court Subtotal</th>
                <th className="py-3 px-4 text-right">Service Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
              {filteredLogs.map((b) => (
                <tr key={b.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {b.bookingId || b.id.slice(0, 10)}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-200">
                    <div>{b.user?.name || 'Customer'}</div>
                    <div className="text-[10px] text-slate-500">{b.user?.email || ''}</div>
                  </td>
                  <td className="py-3.5 px-4 font-sans font-semibold text-cyan-300">
                    {b.courtName}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-400">
                    <div>{formatEventDateLong(b.date)}</div>
                    <div className="text-[10px] text-slate-500">{b.slots?.length || 1} Slot(s)</div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-300">
                    ₱{b.totalCost}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-brand-lime">
                    +₱{globalServiceFee}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    No matching service fee transaction logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
