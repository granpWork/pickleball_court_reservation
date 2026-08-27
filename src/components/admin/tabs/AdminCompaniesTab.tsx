import React from 'react';
import { Building2, Plus, MailPlus, Check, X, Trash2, Globe, MapPin } from 'lucide-react';
import { type Company } from '../adminTypes';

interface AdminCompaniesTabProps {
  companies: Company[];
  onOpenOnboardModal: () => void;
  onOpenInviteModal?: (company?: Company) => void;
  onApproveCompany?: (companyId: string) => void;
  onRejectCompany?: (companyId: string) => void;
  onDeleteCompany?: (companyId: string) => void;
}

export const AdminCompaniesTab: React.FC<AdminCompaniesTabProps> = ({
  companies,
  onOpenOnboardModal,
  onOpenInviteModal,
  onApproveCompany,
  onRejectCompany,
  onDeleteCompany,
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-lg font-extrabold text-white">Company & Client Onboarding</h3>
          <p className="text-xs text-slate-400">Onboard venue partners, manage corporate accounts, and invite Client Admins.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {onOpenInviteModal && (
            <button
              onClick={() => onOpenInviteModal()}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all"
            >
              <MailPlus className="w-4 h-4 text-brand-lime" />
              <span>Invite Client Admin</span>
            </button>
          )}
          <button
            onClick={onOpenOnboardModal}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-lime-400 shadow-lg shadow-brand-lime/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Company</span>
          </button>
        </div>
      </div>

      {/* Companies List Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Company Name</th>
                <th className="py-4 px-6">Location & Address</th>
                <th className="py-4 px-6">Client Admin Email</th>
                <th className="py-4 px-6">Onboarded Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No companies onboarded yet.</p>
                  </td>
                </tr>
              ) : (
                companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{comp.name}</p>
                          {comp.websiteUrl && (
                            <a
                              href={comp.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-brand-lime hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Globe className="w-3 h-3" /> Website
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-xs text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{comp.address || 'Address On File'}</span>
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-xs font-mono text-slate-300">{comp.clientAdminEmail}</p>
                      {comp.phone && <p className="text-[11px] text-slate-500">📞 {comp.phone}</p>}
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-400">
                      {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                          comp.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : comp.status === 'inactive'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {comp.status || 'Active'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {comp.status === 'pending' && onApproveCompany && (
                          <button
                            onClick={() => onApproveCompany(comp.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                            title="Approve Company"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {comp.status === 'pending' && onRejectCompany && (
                          <button
                            onClick={() => onRejectCompany(comp.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
                            title="Reject Company"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteCompany && (
                          <button
                            onClick={() => onDeleteCompany(comp.id)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 transition-all"
                            title="Delete Company"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
