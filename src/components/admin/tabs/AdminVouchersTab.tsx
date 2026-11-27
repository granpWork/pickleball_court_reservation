import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Copy,
  Search,
  X,
  Building2,
  Check,
  TrendingUp,
  History,
  Layers,
  Clock,
  Download,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { type Voucher, type Company } from '../adminTypes';

export interface AdminVouchersTabProps {
  vouchers: Voucher[];
  onOpenCreateVoucherModal: () => void;
  onDeleteVoucher?: (voucherId: string) => void;
  onCopyVoucherCode?: (code: string) => void;
  companies?: Company[];
  isSuperAdmin?: boolean;
  myCompany?: Company | null;
  onBulkCreateVouchers?: (data: {
    quantity: number;
    prefix: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    companyId?: string;
    maxUses: number;
    expiryDays: number;
    minSpend?: number;
    minSlots?: number;
  }) => Promise<Voucher[]>;
}

export const AdminVouchersTab: React.FC<AdminVouchersTabProps> = ({
  vouchers,
  onOpenCreateVoucherModal,
  onDeleteVoucher,
  onCopyVoucherCode,
  companies = [],
  isSuperAdmin = false,
  myCompany,
  onBulkCreateVouchers,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Redemption History Modal State
  const [historyModalVoucher, setHistoryModalVoucher] = useState<Voucher | null>(null);

  // Bulk Generator Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState<number>(10);
  const [bulkPrefix, setBulkPrefix] = useState<string>('PROMO-');
  const [bulkDiscountType, setBulkDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [bulkDiscountValue, setBulkDiscountValue] = useState<number>(20);
  const [bulkCompanyId, setBulkCompanyId] = useState<string>(myCompany?.id || '');
  const [bulkMaxUses, setBulkMaxUses] = useState<number>(1);
  const [bulkExpiryDays, setBulkExpiryDays] = useState<number>(30);
  const [bulkMinSpend, setBulkMinSpend] = useState<string>('');
  const [bulkMinSlots, setBulkMinSlots] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkGeneratedVouchers, setBulkGeneratedVouchers] = useState<Voucher[] | null>(null);

  const handleCopy = (code: string) => {
    if (onCopyVoucherCode) {
      onCopyVoucherCode(code);
    } else {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Helper to check voucher active status
  const isVoucherActive = (v: Voucher) => {
    if (v.status !== 'active') return false;
    if (v.maxUses > 0 && v.usedCount >= v.maxUses) return false;
    if (v.expiryDate) {
      const expTime = new Date(`${v.expiryDate}T23:59:59`).getTime();
      if (expTime < Date.now()) return false;
    }
    return true;
  };

  // Metrics Calculations
  const totalVouchersCount = vouchers.length;
  const activeVouchersCount = useMemo(() => vouchers.filter(isVoucherActive).length, [vouchers]);
  const totalRedemptionsCount = useMemo(() => vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0), [vouchers]);
  const totalMaxCapacity = useMemo(() => vouchers.reduce((sum, v) => sum + (v.maxUses || 0), 0), [vouchers]);
  const redemptionRatePercent = totalMaxCapacity > 0 ? Math.round((totalRedemptionsCount / totalMaxCapacity) * 100) : 0;
  const totalDiscountSaved = useMemo(() => {
    return vouchers.reduce((sum, v) => {
      if (v.redemptions && v.redemptions.length > 0) {
        return sum + v.redemptions.reduce((rSum, r) => rSum + (r.discountAmount || 0), 0);
      }
      if (v.discountType === 'fixed_amount') {
        return sum + (v.usedCount || 0) * v.discountValue;
      }
      return sum;
    }, 0);
  }, [vouchers]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.code.toLowerCase().includes(q) ||
        (v.issuedToEmail && v.issuedToEmail.toLowerCase().includes(q)) ||
        (v.issuedToName && v.issuedToName.toLowerCase().includes(q)) ||
        (v.companyName && v.companyName.toLowerCase().includes(q)) ||
        (v.type && v.type.toLowerCase().includes(q));

      const active = isVoucherActive(v);
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? active : !active;

      const matchesCompany =
        companyFilter === 'all' || !v.companyId || v.companyId === companyFilter;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [vouchers, searchQuery, statusFilter, companyFilter]);

  // Handle Bulk Generation Submit
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBulkCreateVouchers) return;

    setBulkSubmitting(true);
    try {
      const result = await onBulkCreateVouchers({
        quantity: Math.min(100, Math.max(1, Number(bulkQuantity) || 10)),
        prefix: bulkPrefix.trim().toUpperCase(),
        discountType: bulkDiscountType,
        discountValue: Number(bulkDiscountValue) || 0,
        companyId: bulkCompanyId || undefined,
        maxUses: Number(bulkMaxUses) || 1,
        expiryDays: Number(bulkExpiryDays) || 30,
        minSpend: Number(bulkMinSpend) > 0 ? Number(bulkMinSpend) : undefined,
        minSlots: Number(bulkMinSlots) > 0 ? Number(bulkMinSlots) : undefined,
      });
      setBulkGeneratedVouchers(result);
    } catch (err) {
      console.error('Failed to generate bulk vouchers:', err);
      alert('Failed to generate vouchers: ' + (err as Error).message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // CSV Export for Bulk Generation
  const handleDownloadBulkCsv = (batch: Voucher[]) => {
    const headers = ['Voucher Code', 'Discount Type', 'Discount Value', 'Max Uses', 'Expires At', 'Facility', 'Min Spend', 'Min Slots'];
    const rows = batch.map((v) => [
      v.code,
      v.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount',
      v.discountType === 'percentage' ? `${v.discountValue}%` : `₱${v.discountValue}`,
      String(v.maxUses),
      v.expiryDate || 'N/A',
      v.companyName || 'All Venues',
      v.minSpend ? `₱${v.minSpend}` : 'None',
      v.minSlots ? `${v.minSlots} slots` : 'None',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vouchers_batch_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllBulkCodes = (batch: Voucher[]) => {
    const text = batch.map((v) => v.code).join('\n');
    navigator.clipboard.writeText(text);
    alert(`Copied ${batch.length} voucher codes to clipboard!`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-lime" />
            Credit Vouchers & Promotions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage promotional discounts, cancellation credits, rainout vouchers, and bulk promotional batches.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onBulkCreateVouchers && (
            <button
              onClick={() => {
                setBulkGeneratedVouchers(null);
                setBulkModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Bulk Generator</span>
            </button>
          )}

          <button
            onClick={onOpenCreateVoucherModal}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all flex items-center gap-1.5 shadow-lg shadow-brand-lime/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Voucher</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vouchers */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Vouchers</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{totalVouchersCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        {/* Active Vouchers */}
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Active & Usable</span>
            <span className="text-2xl font-black text-emerald-300 mt-0.5 block">{activeVouchersCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Redemptions */}
        <div className="glass-panel p-4 rounded-xl border border-sky-500/20 bg-sky-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">Total Redemptions</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-sky-300">{totalRedemptionsCount}</span>
              <span className="text-xs font-bold text-sky-400">({redemptionRatePercent}% rate)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Discount Granted */}
        <div className="glass-panel p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Total Discount Value</span>
            <span className="text-2xl font-black text-purple-300 mt-0.5 block">
              {totalDiscountSaved > 0 ? `₱${totalDiscountSaved.toLocaleString()}` : 'Dynamic'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-2">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Vouchers', count: totalVouchersCount },
            { id: 'active', label: 'Active', count: activeVouchersCount },
            { id: 'inactive', label: 'Used / Inactive', count: totalVouchersCount - activeVouchersCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                statusFilter === tab.id
                  ? 'bg-brand-lime text-dark-bg font-extrabold shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-dark-bg/20 text-dark-bg' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Facility Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {isSuperAdmin && companies.length > 0 && (
            <div className="relative">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-lime cursor-pointer font-bold"
              >
                <option value="all">All Facilities</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, email, or facility..."
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
        </div>
      </div>

      {/* MOBILE / TABLET VIEW (Cards Layout) */}
      <div className="block md:hidden space-y-3.5">
        {filteredVouchers.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
            <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <p className="font-bold text-slate-300 text-sm">No vouchers match your criteria.</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Click "Create Voucher" above to issue your first voucher.'}
            </p>
          </div>
        ) : (
          filteredVouchers.map((v) => {
            const active = isVoucherActive(v);
            const matchedComp = companies.find((c) => c.id === v.companyId);
            const displayCompName = v.companyName || matchedComp?.name || 'All Partner Venues';
            const displayLogo = matchedComp?.logoUrl;

            return (
              <div
                key={v.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg space-y-3"
              >
                {/* Card Top: Badges & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {active ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{active ? 'Active' : v.status === 'exhausted' ? 'Exhausted' : 'Expired'}</span>
                    </span>

                    {/* Facility Pill */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-bold">
                      {displayLogo ? (
                        <img src={displayLogo} alt="Logo" className="w-3 h-3 rounded-full object-cover" />
                      ) : (
                        <Building2 className="w-3 h-3 text-slate-400" />
                      )}
                      <span className="truncate max-w-[120px]">{displayCompName}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setHistoryModalVoucher(v)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                      title="Redemption History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteVoucher && (
                      <button
                        onClick={() => onDeleteVoucher(v.id)}
                        className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Delete Voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Code & Discount Banner */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-brand-lime text-sm tracking-wider">
                      {v.code}
                    </span>
                    <button
                      onClick={() => handleCopy(v.code)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode === v.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-black text-xs">
                    {v.discountType === 'percentage' ? `${v.discountValue}% OFF` : `₱${v.discountValue} OFF`}
                  </span>
                </div>

                {/* Requirements / Conditions */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-bold capitalize bg-slate-800/60 px-2 py-0.5 rounded-md">
                    {v.type.replace('_', ' ')}
                  </span>
                  {v.minSpend && (
                    <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                      Min ₱{v.minSpend}
                    </span>
                  )}
                  {v.minSlots && (
                    <span className="text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md font-bold">
                      Min {v.minSlots} hrs
                    </span>
                  )}
                  {v.issuedToEmail && (
                    <span className="text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md font-mono truncate max-w-[160px]">
                      Locked: {v.issuedToEmail}
                    </span>
                  )}
                </div>

                {/* Card Footer: Usage & Expiration */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <button
                    onClick={() => setHistoryModalVoucher(v)}
                    className="flex items-center gap-1 font-bold text-sky-400 hover:underline cursor-pointer"
                  >
                    <History className="w-3 h-3" />
                    <span>{v.usedCount} / {v.maxUses} used</span>
                  </button>

                  <span className="text-slate-400 flex items-center gap-1 font-mono text-[10.5px]">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {v.expiryDate ? `Exp: ${v.expiryDate}` : 'No Expiry'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW (Table Layout) */}
      <div className="hidden md:block glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-5">Voucher Code & Status</th>
                <th className="py-4 px-5">Facility / Club</th>
                <th className="py-4 px-5">Discount & Type</th>
                <th className="py-4 px-5">Requirements</th>
                <th className="py-4 px-5 text-center">Usage & Redemptions</th>
                <th className="py-4 px-5">Expiration</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Tag className="w-10 h-10 text-slate-600 mx-auto mb-2 animate-pulse" />
                    <p className="font-bold text-slate-300 text-base">No vouchers found.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery || statusFilter !== 'all' ? 'No vouchers match your current filters.' : 'Click "Create Voucher" above to generate your first discount code.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const active = isVoucherActive(v);
                  const matchedComp = companies.find((c) => c.id === v.companyId);
                  const displayCompName = v.companyName || matchedComp?.name || 'All Partner Venues';
                  const displayLogo = matchedComp?.logoUrl;

                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Code & Status */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-extrabold text-brand-lime text-sm bg-brand-lime/10 border border-brand-lime/30 px-3 py-1 rounded-xl">
                            {v.code}
                          </span>
                          <button
                            onClick={() => handleCopy(v.code)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Copy Code"
                          >
                            {copiedCode === v.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                              active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {active ? 'Active' : v.status === 'exhausted' ? 'Exhausted' : 'Expired'}
                          </span>
                        </div>
                      </td>

                      {/* Facility Branding */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          {displayLogo ? (
                            <img src={displayLogo} alt="Logo" className="w-6 h-6 rounded-full object-cover border border-slate-700" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-white text-xs block truncate max-w-[150px]">{displayCompName}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {v.courtId ? 'Specific Court' : 'Facility-wide'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Discount & Type */}
                      <td className="py-4 px-5">
                        <p className="font-extrabold text-white text-sm">
                          {v.discountType === 'percentage' ? `${v.discountValue}% OFF` : `₱${v.discountValue} OFF`}
                        </p>
                        <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                          {v.type.replace('_', ' ')}
                        </p>
                      </td>

                      {/* Requirements */}
                      <td className="py-4 px-5 text-xs">
                        <div className="space-y-1">
                          {v.minSpend && (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-[10.5px]">
                              Min ₱{v.minSpend}
                            </span>
                          )}
                          {v.minSlots && (
                            <span className="inline-block px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold text-[10.5px] ml-1">
                              Min {v.minSlots} hrs
                            </span>
                          )}
                          {v.issuedToEmail && (
                            <p className="text-[10.5px] font-mono text-slate-400 truncate max-w-[180px]">
                              To: {v.issuedToEmail}
                            </p>
                          )}
                          {!v.minSpend && !v.minSlots && !v.issuedToEmail && (
                            <span className="text-slate-500 text-[11px]">No conditions</span>
                          )}
                        </div>
                      </td>

                      {/* Usage & Redemptions */}
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => setHistoryModalVoucher(v)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-sky-300 hover:border-sky-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                          title="View Redemption History"
                        >
                          <History className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-extrabold text-white">{v.usedCount}</span>
                          <span className="text-slate-500">/ {v.maxUses}</span>
                        </button>
                      </td>

                      {/* Expiration */}
                      <td className="py-4 px-5 text-xs text-slate-300">
                        {v.expiryDate ? (
                          <div className="flex items-center gap-1 font-mono text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{v.expiryDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">No Expiry</span>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                          Created {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setHistoryModalVoucher(v)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 transition-all cursor-pointer"
                            title="View Redemptions"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {onDeleteVoucher && (
                            <button
                              onClick={() => onDeleteVoucher(v.id)}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                              title="Delete / Revoke Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REDEMPTION HISTORY MODAL */}
      {historyModalVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-left space-y-5 shadow-2xl relative animate-scale-up my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-400" />
                  Redemption History: <span className="font-mono text-brand-lime">{historyModalVoucher.code}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing all recorded player usages for this voucher code.
                </p>
              </div>
              <button
                onClick={() => setHistoryModalVoucher(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Summary Pill */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Discount Value</span>
                <span className="font-extrabold text-white">
                  {historyModalVoucher.discountType === 'percentage'
                    ? `${historyModalVoucher.discountValue}% OFF`
                    : `₱${historyModalVoucher.discountValue} OFF`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Redemption Count</span>
                <span className="font-extrabold text-sky-400">
                  {historyModalVoucher.usedCount} of {historyModalVoucher.maxUses} used
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Facility Scope</span>
                <span className="font-bold text-white">
                  {historyModalVoucher.companyName || 'All Partner Venues'}
                </span>
              </div>
            </div>

            {/* Redemptions List */}
            {(!historyModalVoucher.redemptions || historyModalVoucher.redemptions.length === 0) ? (
              <div className="py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-300 text-sm">No redemptions recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When a player redeems this code during checkout, their reservation reference and transaction details will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Court / Venue</th>
                      <th className="py-3 px-4">Redeemed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {historyModalVoucher.redemptions.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white">{r.customerName || 'Player'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{r.customerEmail}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-brand-lime">
                          {r.bookingReference}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-emerald-400">
                          ₱{r.discountAmount}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {r.courtName || r.companyName || 'Venue Court'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(r.redeemedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalVoucher(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white font-bold text-xs border border-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK VOUCHER GENERATOR MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-left space-y-5 shadow-2xl relative animate-scale-up my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Bulk Voucher Generator
              </h3>
              <button
                onClick={() => {
                  setBulkModalOpen(false);
                  setBulkGeneratedVouchers(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkGeneratedVouchers ? (
              /* Success / Results Screen */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      Generated {bulkGeneratedVouchers.length} Unique Vouchers!
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      The batch has been persisted to the platform and is ready for distribution or export.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 max-h-56 overflow-y-auto font-mono text-xs text-brand-lime space-y-1.5">
                  {bulkGeneratedVouchers.map((v) => (
                    <div key={v.id} className="flex justify-between items-center px-2 py-1 bg-slate-950/60 rounded-lg">
                      <span className="font-bold">{v.code}</span>
                      <span className="text-slate-400 text-[11px]">
                        {v.discountType === 'percentage' ? `${v.discountValue}%` : `₱${v.discountValue}`} | Exp: {v.expiryDate}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => handleDownloadBulkCsv(bulkGeneratedVouchers)}
                    className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white font-extrabold text-xs hover:bg-purple-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV</span>
                  </button>

                  <button
                    onClick={() => handleCopyAllBulkCodes(bulkGeneratedVouchers)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy All Codes</span>
                  </button>

                  <button
                    onClick={() => {
                      setBulkModalOpen(false);
                      setBulkGeneratedVouchers(null);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer border border-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Generation Form Screen */
              <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
                {/* Quantity and Prefix */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Batch Quantity (1 - 100)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Code Prefix
                    </label>
                    <input
                      type="text"
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                      placeholder="e.g. TOURN-"
                      className="w-full bg-slate-900 border border-slate-800 text-brand-lime font-mono font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime uppercase"
                    />
                  </div>
                </div>

                {/* Discount Type and Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Discount Type
                    </label>
                    <select
                      value={bulkDiscountType}
                      onChange={(e) => setBulkDiscountType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime cursor-pointer"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed_amount">Fixed Amount (₱)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={bulkDiscountValue}
                      onChange={(e) => setBulkDiscountValue(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime"
                    />
                  </div>
                </div>

                {/* Super Admin: Facility Selector */}
                {isSuperAdmin && companies.length > 0 && (
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Facility Ownership
                    </label>
                    <select
                      value={bulkCompanyId}
                      onChange={(e) => setBulkCompanyId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime cursor-pointer"
                    >
                      <option value="">PicklePoint Platform Default (All Venues)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Max Uses & Validity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Max Uses per Code
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={bulkMaxUses}
                      onChange={(e) => setBulkMaxUses(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Valid For (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={bulkExpiryDays}
                      onChange={(e) => setBulkExpiryDays(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime"
                    />
                  </div>
                </div>

                {/* Minimum Requirements */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Min Booking Spend (₱)
                    </label>
                    <input
                      type="number"
                      value={bulkMinSpend}
                      onChange={(e) => setBulkMinSpend(e.target.value)}
                      placeholder="Optional (e.g. 1000)"
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Min Booking Hours
                    </label>
                    <input
                      type="number"
                      value={bulkMinSlots}
                      onChange={(e) => setBulkMinSlots(e.target.value)}
                      placeholder="Optional (e.g. 2)"
                      className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-lime"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-purple-600 transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {bulkSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate {bulkQuantity} Codes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
