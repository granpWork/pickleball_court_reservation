import React, { useState, useMemo } from 'react';
import { Tag, Plus, Trash2, Copy, Search, X } from 'lucide-react';
import { type Voucher } from '../adminTypes';

interface AdminVouchersTabProps {
  vouchers: Voucher[];
  onOpenCreateVoucherModal: () => void;
  onDeleteVoucher?: (voucherId: string) => void;
  onCopyVoucherCode?: (code: string) => void;
}

export const AdminVouchersTab: React.FC<AdminVouchersTabProps> = ({
  vouchers,
  onOpenCreateVoucherModal,
  onDeleteVoucher,
  onCopyVoucherCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.code.toLowerCase().includes(q) ||
        (v.issuedToEmail && v.issuedToEmail.toLowerCase().includes(q)) ||
        (v.type && v.type.toLowerCase().includes(q));

      const isInactive = v.status !== 'active' || (v.maxUses > 0 && v.usedCount >= v.maxUses);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? !isInactive
          : isInactive;

      return matchesSearch && matchesStatus;
    });
  }, [vouchers, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter & Search Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Vouchers', count: vouchers.length },
            { id: 'active', label: 'Active', count: vouchers.filter(v => v.status === 'active' && (v.maxUses === 0 || v.usedCount < v.maxUses)).length },
            { id: 'inactive', label: 'Used / Inactive', count: vouchers.filter(v => v.status !== 'active' || (v.maxUses > 0 && v.usedCount >= v.maxUses)).length },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                statusFilter === tab.id
                  ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === tab.id ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Side: Search Input & Create Action Button */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or email..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onOpenCreateVoucherModal}
            className="flex-shrink-0 flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-lime-400 shadow-md shadow-brand-lime/10 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Voucher</span>
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Voucher Code</th>
                <th className="py-4 px-6">Discount Value</th>
                <th className="py-4 px-6">Type & Recipient</th>
                <th className="py-4 px-6">Usage Count</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">
                      {searchQuery || statusFilter !== 'all' ? 'No vouchers match your search/filter.' : 'No active vouchers found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Code */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-brand-lime text-sm bg-brand-lime/10 border border-brand-lime/30 px-3 py-1 rounded-xl">
                          {v.code}
                        </span>
                        {onCopyVoucherCode && (
                          <button
                            onClick={() => onCopyVoucherCode(v.code)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Copy Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Discount Value */}
                    <td className="py-4 px-6">
                      <p className="font-extrabold text-white text-sm">
                        {v.discountType === 'percentage' ? `${v.discountValue}% OFF` : `₱${v.discountValue} OFF`}
                      </p>
                    </td>

                    {/* Type & Recipient */}
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-xs font-bold text-slate-200 capitalize">
                          {v.type.replace('_', ' ')}
                        </p>
                        {v.issuedToEmail && (
                          <p className="text-[11px] text-slate-400 mt-0.5">To: {v.issuedToEmail}</p>
                        )}
                      </div>
                    </td>

                    {/* Usage */}
                    <td className="py-4 px-6 text-xs text-slate-300">
                      <span className="font-bold text-white">{v.usedCount}</span> / {v.maxUses} Uses
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                          v.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      {onDeleteVoucher && (
                        <button
                          onClick={() => onDeleteVoucher(v.id)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 transition-all"
                          title="Delete Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
