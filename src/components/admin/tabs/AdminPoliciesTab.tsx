import React, { useState } from 'react';
import {
  FileText,
  Shield,
  CloudRain,
  Trophy,
  Sparkles,
  Check,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { type CourtPolicies } from '../adminTypes';

interface AdminPoliciesTabProps {
  policies: CourtPolicies;
  onSavePolicies: (policies: CourtPolicies) => Promise<void>;
}

export const AdminPoliciesTab: React.FC<AdminPoliciesTabProps> = ({ policies, onSavePolicies }) => {
  const [cancellationPolicy, setCancellationPolicy] = useState(policies.cancellationPolicy || '');
  const [rulesPolicy, setRulesPolicy] = useState(policies.rulesPolicy || '');
  const [weatherPolicy, setWeatherPolicy] = useState(policies.weatherPolicy || '');
  const [equipmentPolicy, setEquipmentPolicy] = useState(policies.equipmentPolicy || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAutoGenerateCancellation = () => {
    setCancellationPolicy(
      '• Full Refund (100%): Cancellations submitted at least 24 hours prior to scheduled court time.\n• 50% Credit Voucher: Cancellations submitted between 12 to 24 hours prior to start time.\n• Non-Refundable: Cancellations made within 12 hours of booking time are non-refundable.\n• Rebooking: Free date/time rescheduling allowed up to 12 hours before match.'
    );
  };

  const handleAutoGenerateRules = () => {
    setRulesPolicy(
      '1. Non-marking athletic court shoes are strictly required on all court surfaces.\n2. Paddle rotation rules apply during open play and peak hours.\n3. No glass containers, food, or alcohol allowed inside playing enclosures.\n4. Treat all players, staff, and opponents with sportsmanship and respect.'
    );
  };

  const handleAutoGenerateWeather = () => {
    setWeatherPolicy(
      '• Weather Stoppage: For outdoor courts, matches interrupted by rain or severe weather before 30 minutes played will receive a 100% rebooking voucher.\n• Pro-Rated Voucher: Matches interrupted after 30 minutes will receive a 50% rebooking credit.\n• Indoor Courts: Indoor reservations remain unaffected by outdoor weather.'
    );
  };

  const handleAutoGenerateEquipment = () => {
    setEquipmentPolicy(
      '• Return Policy: All rented paddles, balls, and ball machines must be returned to the reception desk immediately following session end.\n• Gear Care: Renter is responsible for proper care. Damaged or unreturned paddles are subject to replacement fees (₱1,500 per paddle).'
    );
  };

  const handleAutoGenerateAll = () => {
    handleAutoGenerateCancellation();
    handleAutoGenerateRules();
    handleAutoGenerateWeather();
    handleAutoGenerateEquipment();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSavePolicies({
        cancellationPolicy,
        rulesPolicy,
        weatherPolicy,
        equipmentPolicy,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save policies:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Action Controls Bar */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleAutoGenerateAll}
          className="px-4 py-2.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 shadow-md"
        >
          <Sparkles className="w-4 h-4" /> Auto-Generate All Policies
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 4 Policy Editor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Cancellation Policy */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-lime" />
                  1. Cancellation & Refund Policy
                </h4>
                <button
                  type="button"
                  onClick={handleAutoGenerateCancellation}
                  className="px-3 py-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
                </button>
              </div>

              <textarea
                rows={5}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                placeholder="Type or click 'Auto-Generate' to populate standard cancellation terms..."
                className="w-full bg-slate-900 border border-slate-800 text-white text-xs font-medium rounded-2xl p-4 focus:outline-none focus:border-brand-lime transition-all resize-none leading-relaxed"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              💡 You can edit or modify these cancellation terms anytime in the future.
            </p>
          </div>

          {/* 2. Court Rules */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-lime" />
                  2. Court Rules & Player Etiquette
                </h4>
                <button
                  type="button"
                  onClick={handleAutoGenerateRules}
                  className="px-3 py-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
                </button>
              </div>

              <textarea
                rows={5}
                value={rulesPolicy}
                onChange={(e) => setRulesPolicy(e.target.value)}
                placeholder="Type or click 'Auto-Generate' to populate standard court rules..."
                className="w-full bg-slate-900 border border-slate-800 text-white text-xs font-medium rounded-2xl p-4 focus:outline-none focus:border-brand-lime transition-all resize-none leading-relaxed"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              💡 You can edit or modify these court rules anytime in the future.
            </p>
          </div>

          {/* 3. Rainout Policy */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-brand-lime" />
                  3. Rainout & Weather Policy
                </h4>
                <button
                  type="button"
                  onClick={handleAutoGenerateWeather}
                  className="px-3 py-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
                </button>
              </div>

              <textarea
                rows={5}
                value={weatherPolicy}
                onChange={(e) => setWeatherPolicy(e.target.value)}
                placeholder="Type or click 'Auto-Generate' to populate weather policies..."
                className="w-full bg-slate-900 border border-slate-800 text-white text-xs font-medium rounded-2xl p-4 focus:outline-none focus:border-brand-lime transition-all resize-none leading-relaxed"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              💡 You can edit or modify these weather policies anytime in the future.
            </p>
          </div>

          {/* 4. Equipment Rental Guidelines */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-brand-lime" />
                  4. Equipment Rental Guidelines
                </h4>
                <button
                  type="button"
                  onClick={handleAutoGenerateEquipment}
                  className="px-3 py-1.5 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
                </button>
              </div>

              <textarea
                rows={5}
                value={equipmentPolicy}
                onChange={(e) => setEquipmentPolicy(e.target.value)}
                placeholder="Type or click 'Auto-Generate' to populate rental guidelines..."
                className="w-full bg-slate-900 border border-slate-800 text-white text-xs font-medium rounded-2xl p-4 focus:outline-none focus:border-brand-lime transition-all resize-none leading-relaxed"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              💡 You can edit or modify these rental terms anytime in the future.
            </p>
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Changes saved successfully!
              </span>
            ) : (
              'Changes saved will instantly update the public Court Details page for players.'
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-2xl bg-brand-lime text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-[#a6e224] transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-brand-lime/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-dark-bg" /> : <Check className="w-4 h-4" />}
            <span>Save Venue Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
};
