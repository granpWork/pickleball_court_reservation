import React, { useState } from 'react';
import { User, Phone, Mail, Save, Check, Loader2 } from 'lucide-react';
import { db, isFirebaseConfigured } from '../../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PlayerSettingsTabProps {
  user: {
    uid?: string;
    name?: string;
    email: string;
    phone?: string;
    duprId?: string;
  } | null;
  onUpdateUser: (updatedData: any) => void;
}

export const PlayerSettingsTab: React.FC<PlayerSettingsTabProps> = ({
  user,
  onUpdateUser,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [duprId, setDuprId] = useState(user?.duprId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updated = {
      ...user,
      name: name.trim(),
      phone: phone.trim(),
      duprId: duprId.trim(),
    };

    try {
      if (user?.uid && isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            name: name.trim(),
            phone: phone.trim(),
            duprId: duprId.trim(),
          });
        } catch (cloudErr) {
          console.warn('Firestore profile update failed, persisting locally:', cloudErr);
        }
      }

      onUpdateUser(updated);

      try {
        localStorage.setItem('picklepoint_user', JSON.stringify(updated));
        if (duprId.trim()) {
          localStorage.setItem('picklepoint_user_duprId', duprId.trim());
        }
      } catch (e) {}

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save profile error:', err);
      alert('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl text-left space-y-6 animate-fade-in">
      {/* Settings Card */}
      <div className="glass-panel border border-slate-800 bg-slate-900/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-black uppercase tracking-wider">
            Player Profile Settings
          </span>
          <h3 className="text-xl font-black text-white mt-1">Account & DUPR Information</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Update your contact details and DUPR rating ID for automated event entry.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-brand-lime" /> Profile settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Email Readonly */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-lime" /> Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium rounded-xl px-4 py-3 cursor-not-allowed opacity-80"
            />
            <span className="text-[10px] text-slate-500 block">
              Email address is managed by your account authentication.
            </span>
          </div>

          {/* Player Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-lime" /> Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan Cruz"
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-emerald" /> Mobile Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0917 123 4567"
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-all"
            />
          </div>

          {/* DUPR ID */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-amber-950/10 border border-amber-500/20">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              ⚡ DUPR Profile ID
            </label>
            <input
              type="text"
              value={duprId}
              onChange={(e) => setDuprId(e.target.value)}
              placeholder="e.g. DUPR-123456 or Profile Name"
              className="w-full bg-slate-950 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Saving your DUPR ID automatically populates your rating ID whenever you register for DUPR Rated Open Play events.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-lime text-slate-950 font-black text-xs hover:bg-lime-400 transition-all shadow-lg shadow-brand-lime/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
