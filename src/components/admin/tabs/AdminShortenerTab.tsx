import React, { useState, useMemo } from 'react';
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  QrCode,
  Search,
  X,
  Sparkles,
  TrendingUp,
  Loader2,
  Zap,
  Building2,
  Edit2,
  CheckCircle2,
  PauseCircle,
  Clock,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { type ShortLink, type Company } from '../adminTypes';

export interface AdminShortenerTabProps {
  shortLinks: ShortLink[];
  loading?: boolean;
  onCreateShortLink: (data: {
    title: string;
    shortSlug: string;
    companySlug?: string;
    originalUrl: string;
    isActive?: boolean;
    expiresAt?: string | null;
  }) => Promise<void>;
  onUpdateShortLink?: (id: string, data: Partial<ShortLink>) => Promise<void>;
  onDeleteShortLink: (id: string) => Promise<void>;
  defaultVenueUrl?: string;
  myCompany?: Company | null;
  companies?: Company[];
  isSuperAdmin?: boolean;
}

export const AdminShortenerTab: React.FC<AdminShortenerTabProps> = ({
  shortLinks,
  loading = false,
  onCreateShortLink,
  onUpdateShortLink,
  onDeleteShortLink,
  defaultVenueUrl,
  myCompany,
  companies = [],
  isSuperAdmin = false,
}) => {
  // Modal & Form State - Create
  const [modalOpen, setModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [originalUrlInput, setOriginalUrlInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [createCompanyId, setCreateCompanyId] = useState<string>(myCompany?.id || '');
  const [isActiveInput, setIsActiveInput] = useState(true);
  const [expiresAtInput, setExpiresAtInput] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal & Form State - Edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [editOriginalUrlInput, setEditOriginalUrlInput] = useState('');
  const [editSlugInput, setEditSlugInput] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editExpiresAt, setEditExpiresAt] = useState<string>('');
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Search, Copy & QR Code State
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalLink, setQrModalLink] = useState<ShortLink | null>(null);

  // Helper: Sanitize & Resolve Company Slug
  const getCompanySlug = (comp?: Company | null): string => {
    if (!comp) return 'picklepoint';
    if (comp.subdomain?.trim()) return comp.subdomain.trim().toLowerCase();
    const sanitized = (comp.name || 'picklepoint').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return sanitized || 'picklepoint';
  };

  const activeDefaultCompSlug = useMemo(() => {
    return getCompanySlug(myCompany);
  }, [myCompany]);

  // Selected company object for create
  const selectedCreateCompany = useMemo(() => {
    if (!createCompanyId) return myCompany || null;
    return companies.find((c) => c.id === createCompanyId) || myCompany || null;
  }, [createCompanyId, companies, myCompany]);

  const currentCreateCompSlug = useMemo(() => {
    return getCompanySlug(selectedCreateCompany);
  }, [selectedCreateCompany]);

  // Quick Random Slug Generator
  const handleGenerateRandomSlug = (isEdit: boolean = false) => {
    const randomHash = Math.random().toString(36).substring(2, 8);
    if (isEdit) {
      setEditSlugInput(`pk_${randomHash}`);
    } else {
      setSlugInput(`pk_${randomHash}`);
    }
  };

  // Status computation helper
  const getLinkStatus = (link: ShortLink) => {
    if (link.isActive === false) {
      return {
        status: 'paused' as const,
        label: 'Paused',
        badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        icon: PauseCircle,
      };
    }
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return {
        status: 'expired' as const,
        label: 'Expired',
        badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        icon: Clock,
      };
    }
    return {
      status: 'active' as const,
      label: 'Active',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: CheckCircle2,
    };
  };

  // Duplicate slug check per company
  const checkSlugConflict = (candidateSlug: string, compSlug: string, ignoreLinkId?: string) => {
    const cleanCandidate = candidateSlug.trim().toLowerCase();
    if (!cleanCandidate) return false;
    return shortLinks.some((l) => {
      if (ignoreLinkId && l.id === ignoreLinkId) return false;
      const linkCompSlug = l.companySlug || 'picklepoint';
      return linkCompSlug === compSlug && l.shortSlug.toLowerCase() === cleanCandidate;
    });
  };

  const createSlugConflict = useMemo(() => {
    if (!slugInput.trim()) return false;
    return checkSlugConflict(slugInput, currentCreateCompSlug);
  }, [slugInput, currentCreateCompSlug, shortLinks]);

  const editSlugConflict = useMemo(() => {
    if (!editSlugInput.trim() || !editingLink) return false;
    const targetCompSlug = editingLink.companySlug || activeDefaultCompSlug;
    return checkSlugConflict(editSlugInput, targetCompSlug, editingLink.id);
  }, [editSlugInput, editingLink, activeDefaultCompSlug, shortLinks]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setTitleInput('');
    setOriginalUrlInput(defaultVenueUrl || '');
    setSlugInput('');
    setCreateCompanyId(myCompany?.id || (companies.length > 0 ? companies[0].id : ''));
    setIsActiveInput(true);
    setExpiresAtInput('');
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (link: ShortLink) => {
    setEditingLink(link);
    setEditTitleInput(link.title);
    setEditOriginalUrlInput(link.originalUrl);
    setEditSlugInput(link.shortSlug);
    setEditIsActive(link.isActive !== false);
    setEditExpiresAt(link.expiresAt ? link.expiresAt.substring(0, 16) : '');
    setEditFormError(null);
    setEditModalOpen(true);
  };

  // Create Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalUrlInput.trim()) {
      setFormError('Destination URL is required.');
      return;
    }

    try {
      new URL(originalUrlInput.trim());
    } catch (_) {
      setFormError('Please enter a valid Destination URL (e.g. https://...)');
      return;
    }

    if (createSlugConflict) {
      setFormError(`The slug '${slugInput}' is already in use for this facility. Please choose a different slug.`);
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      await onCreateShortLink({
        title: titleInput.trim() || 'Custom Short Link',
        shortSlug: slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
        companySlug: currentCreateCompSlug,
        originalUrl: originalUrlInput.trim(),
        isActive: isActiveInput,
        expiresAt: expiresAtInput ? new Date(expiresAtInput).toISOString() : null,
      });
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to create short link:', err);
      setFormError((err as Error).message || 'Failed to create short link.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Edit Form Submission
  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    if (!editOriginalUrlInput.trim()) {
      setEditFormError('Destination URL is required.');
      return;
    }

    try {
      new URL(editOriginalUrlInput.trim());
    } catch (_) {
      setEditFormError('Please enter a valid Destination URL (e.g. https://...)');
      return;
    }

    if (editSlugConflict) {
      setEditFormError(`The slug '${editSlugInput}' is already in use for this facility. Please choose a different slug.`);
      return;
    }

    setEditFormSubmitting(true);
    setEditFormError(null);
    try {
      if (onUpdateShortLink) {
        await onUpdateShortLink(editingLink.id, {
          title: editTitleInput.trim() || editingLink.title,
          shortSlug: editSlugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || editingLink.shortSlug,
          originalUrl: editOriginalUrlInput.trim(),
          isActive: editIsActive,
          expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        });
      }
      setEditModalOpen(false);
      setEditingLink(null);
    } catch (err) {
      console.error('Failed to update short link:', err);
      setEditFormError((err as Error).message || 'Failed to update short link.');
    } finally {
      setEditFormSubmitting(false);
    }
  };

  // Quick toggle active status
  const handleToggleActive = async (link: ShortLink) => {
    if (!onUpdateShortLink) return;
    const nextState = link.isActive === false ? true : false;
    try {
      await onUpdateShortLink(link.id, { isActive: nextState });
    } catch (err) {
      console.error('Failed to toggle short link status:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Metrics
  const totalLinks = shortLinks.length;
  const totalClicks = useMemo(() => shortLinks.reduce((sum, l) => sum + (l.clickCount || 0), 0), [shortLinks]);
  const activeLinksCount = useMemo(() => {
    const now = Date.now();
    return shortLinks.filter((l) => l.isActive !== false && (!l.expiresAt || new Date(l.expiresAt).getTime() >= now)).length;
  }, [shortLinks]);

  // Filtered Links
  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return shortLinks;
    const q = searchQuery.toLowerCase();
    return shortLinks.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.shortSlug.toLowerCase().includes(q) ||
        (l.companySlug && l.companySlug.toLowerCase().includes(q)) ||
        (l.companyName && l.companyName.toLowerCase().includes(q)) ||
        l.originalUrl.toLowerCase().includes(q)
    );
  }, [shortLinks, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-lime" />
            Branded Short Links
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create branded shareable links with custom aliases, facility routing, and click analytics.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all flex items-center gap-1.5 shadow-lg shadow-brand-lime/10 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Short Link</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Short Links</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{totalLinks}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime">
            <Link2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Total Clicks</span>
            <span className="text-2xl font-black text-emerald-300 mt-0.5 block">{totalClicks}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-sky-500/20 bg-sky-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">Active Links</span>
            <span className="text-2xl font-black text-sky-300 mt-0.5 block">{activeLinksCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search titles, slugs, facilities, or target URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Showing <strong className="text-white">{filteredLinks.length}</strong> of {totalLinks} links</span>
        </div>
      </div>

      {/* MOBILE / TABLET VIEW (Card Layout) */}
      <div className="block md:hidden space-y-3.5">
        {loading ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-brand-lime mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading short links...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
            <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <p className="font-bold text-slate-300 text-sm">No short links found.</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'No links match your search.' : 'Tap "Create Short Link" above to generate your first link.'}
            </p>
          </div>
        ) : (
          filteredLinks.map((link) => {
            const statusInfo = getLinkStatus(link);
            const StatusIcon = statusInfo.icon;
            const matchedComp = companies.find((c) => c.id === link.companyId);
            const displayCompName = link.companyName || matchedComp?.name || (link.companySlug ? link.companySlug : 'PicklePoint');
            const displayLogo = link.companyLogoUrl || matchedComp?.logoUrl;

            return (
              <div
                key={link.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg space-y-3"
              >
                {/* Card Top: Badges & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.badgeClass}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
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

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onUpdateShortLink && (
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          link.isActive === false
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-brand-lime'
                        }`}
                        title={link.isActive === false ? 'Resume Link' : 'Pause Link'}
                      >
                        {link.isActive === false ? (
                          <ToggleLeft className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(link)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                      title="Edit Link"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setQrModalLink(link)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-brand-lime cursor-pointer"
                      title="QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteShortLink(link.id)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Delete Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Title & Alias */}
                <div>
                  <h3 className="font-extrabold text-white text-sm">{link.title}</h3>
                  <div className="text-[11px] font-mono text-brand-lime mt-0.5">
                    /{link.companySlug ? `${link.companySlug}/` : ''}{link.shortSlug}
                  </div>
                </div>

                {/* Branded Short URL with Copy */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-brand-lime font-bold truncate">
                    {link.shortUrl}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(link.shortUrl, link.id)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer transition-colors"
                      title="Copy Short Link"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Test Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Target Destination Preview */}
                <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Target:</span>
                  <a
                    href={link.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white truncate flex items-center gap-1 text-slate-400 hover:underline"
                  >
                    <span className="truncate">{link.originalUrl}</span>
                    <ExternalLink className="w-3 h-3 text-slate-600 shrink-0" />
                  </a>
                </div>

                {/* Card Footer: Clicks, Expiry, Created */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {link.clickCount || 0} clicks
                    </span>
                    {link.expiresAt ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Exp: {new Date(link.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-slate-500">No expiration</span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono">
                    {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : ''}
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
                <th className="py-4 px-5">Link Title & Status</th>
                <th className="py-4 px-5">Facility / Club</th>
                <th className="py-4 px-5">Branded Short URL</th>
                <th className="py-4 px-5">Target Destination</th>
                <th className="py-4 px-5">Expiration</th>
                <th className="py-4 px-4 text-center">Clicks</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mx-auto mb-3 shadow-lg shadow-brand-lime/10">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
                    </div>
                    <p className="font-extrabold text-white text-sm tracking-wider uppercase">Loading short links database...</p>
                    <p className="text-xs text-slate-400 mt-1">Fetching your custom short links and click statistics.</p>
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                    <p className="font-bold text-slate-300 text-base">No short links found.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery ? 'No links match your search query.' : 'Click "Create Short Link" above to generate your first shareable link.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => {
                  const statusInfo = getLinkStatus(link);
                  const StatusIcon = statusInfo.icon;
                  const matchedComp = companies.find((c) => c.id === link.companyId);
                  const displayCompName = link.companyName || matchedComp?.name || (link.companySlug ? link.companySlug : 'PicklePoint');
                  const displayLogo = link.companyLogoUrl || matchedComp?.logoUrl;

                  return (
                    <tr key={link.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Title & Status */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.badgeClass}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="font-extrabold text-white text-sm group-hover:text-brand-lime transition-colors">
                          {link.title}
                        </div>
                        <div className="text-[11px] font-mono text-brand-lime mt-0.5">
                          /{link.companySlug ? `${link.companySlug}/` : ''}{link.shortSlug}
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
                            <span className="font-bold text-white text-xs block truncate max-w-[140px]">{displayCompName}</span>
                            <span className="text-[10px] font-mono text-slate-500 block">/s/{link.companySlug || 'picklepoint'}</span>
                          </div>
                        </div>
                      </td>

                      {/* App Short Link */}
                      <td className="py-4 px-5 font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[200px] text-brand-lime font-bold">{link.shortUrl}</span>
                          <button
                            onClick={() => handleCopy(link.shortUrl, link.id)}
                            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Copy App Short Link"
                          >
                            {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Target Destination */}
                      <td className="py-4 px-5 text-xs text-slate-400 max-w-[220px] truncate">
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white hover:underline flex items-center gap-1"
                          title={link.originalUrl}
                        >
                          <span className="truncate">{link.originalUrl}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                        </a>
                      </td>

                      {/* Expiration & Created */}
                      <td className="py-4 px-5 text-xs">
                        {link.expiresAt ? (
                          <div className="text-slate-300 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{new Date(link.expiresAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Never expires</span>
                        )}
                        <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                          Created {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      {/* Click Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-black text-emerald-400">
                          {link.clickCount || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Active / Pause Toggle */}
                          {onUpdateShortLink && (
                            <button
                              onClick={() => handleToggleActive(link)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                link.isActive === false
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400'
                              }`}
                              title={link.isActive === false ? 'Activate Short Link' : 'Pause Short Link'}
                            >
                              {link.isActive === false ? (
                                <ToggleLeft className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(link)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                            title="Edit Short Link"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* QR Code Button */}
                          <button
                            onClick={() => setQrModalLink(link)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition-all cursor-pointer"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Test Redirect */}
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                            title="Test Link Redirect"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete Button */}
                          <button
                            onClick={() => onDeleteShortLink(link.id)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                            title="Delete Short Link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE SHORT LINK MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-brand-lime" />
                Create Branded Short Link
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Super Admin: Facility Selector */}
              {isSuperAdmin && companies.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Facility / Club Ownership
                  </label>
                  <select
                    value={createCompanyId}
                    onChange={(e) => setCreateCompanyId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                  >
                    <option value="">PicklePoint Platform Default (/s/picklepoint)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (/s/{getCompanySlug(c)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Link Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Open Play Tournament Share Link"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                />
              </div>

              {/* Destination Target URL */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Destination Target URL *
                  </label>
                  {defaultVenueUrl && (
                    <button
                      type="button"
                      onClick={() => setOriginalUrlInput(defaultVenueUrl)}
                      className="text-[11px] font-bold text-brand-lime hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" /> Insert Venue Link
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://bookpicklecourt.com/venue/picklezone1"
                  value={originalUrlInput}
                  onChange={(e) => setOriginalUrlInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs font-mono focus:outline-none focus:border-brand-lime"
                />
              </div>

              {/* Custom Short Slug with Scoped Facility */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Custom Short Slug / Alias
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomSlug(false)}
                    className="text-[11px] font-bold text-brand-lime hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Random Slug
                  </button>
                </div>
                <div className="flex items-center bg-slate-900 border border-dark-border rounded-xl overflow-hidden">
                  <span className="px-3 text-xs text-slate-500 font-mono border-r border-dark-border py-2.5 bg-slate-950/60 shrink-0">
                    /s/{currentCreateCompSlug}/
                  </span>
                  <input
                    type="text"
                    placeholder="summer-promo"
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 bg-transparent text-white text-xs font-mono focus:outline-none"
                  />
                </div>
                {createSlugConflict && (
                  <p className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    The slug "{slugInput}" is already in use for {selectedCreateCompany?.name || 'this facility'}.
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  Only lowercase letters, numbers, and hyphens allowed. Left blank = auto-generated.
                </p>
              </div>

              {/* Link Status & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Initial Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActiveInput(!isActiveInput)}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      isActiveInput
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <span>{isActiveInput ? 'Active (Live)' : 'Paused'}</span>
                    {isActiveInput ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAtInput}
                    onChange={(e) => setExpiresAtInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-mono focus:outline-none focus:border-brand-lime"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || createSlugConflict}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Generate Short Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHORT LINK MODAL */}
      {editModalOpen && editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-lime" />
                Edit Branded Short Link
              </h3>
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingLink(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="space-y-4">
              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Link Title / Description *
                </label>
                <input
                  type="text"
                  required
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                />
              </div>

              {/* Target Destination URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Destination Target URL *
                </label>
                <input
                  type="url"
                  required
                  value={editOriginalUrlInput}
                  onChange={(e) => setEditOriginalUrlInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs font-mono focus:outline-none focus:border-brand-lime"
                />
              </div>

              {/* Short Slug */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Custom Slug / Alias
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomSlug(true)}
                    className="text-[11px] font-bold text-brand-lime hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Random Slug
                  </button>
                </div>
                <div className="flex items-center bg-slate-900 border border-dark-border rounded-xl overflow-hidden">
                  <span className="px-3 text-xs text-slate-500 font-mono border-r border-dark-border py-2.5 bg-slate-950/60 shrink-0">
                    /s/{editingLink.companySlug || activeDefaultCompSlug}/
                  </span>
                  <input
                    type="text"
                    value={editSlugInput}
                    onChange={(e) => setEditSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 bg-transparent text-white text-xs font-mono focus:outline-none"
                  />
                </div>
                {editSlugConflict && (
                  <p className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    The slug "{editSlugInput}" is already in use for this facility.
                  </p>
                )}
              </div>

              {/* Active Toggle & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Link Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      editIsActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <span>{editIsActive ? 'Active (Live)' : 'Paused'}</span>
                    {editIsActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Expiration Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-mono focus:outline-none focus:border-brand-lime"
                  />
                  {editExpiresAt && (
                    <button
                      type="button"
                      onClick={() => setEditExpiresAt('')}
                      className="text-[10px] text-slate-500 hover:text-slate-300 mt-1 underline cursor-pointer"
                    >
                      Clear expiration
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingLink(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormSubmitting || editSlugConflict}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editFormSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-lime" />
                Shareable QR Code
              </h3>
              <button
                onClick={() => setQrModalLink(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="font-extrabold text-white text-sm">{qrModalLink.title}</div>
              
              {/* QR Image */}
              <div className="w-52 h-52 mx-auto bg-white p-3 rounded-2xl border border-slate-700 shadow-xl flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    qrModalLink.shortUrl
                  )}`}
                  alt="Short Link QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-xs font-mono text-brand-lime truncate px-2">
                {qrModalLink.shortUrl}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleCopy(qrModalLink.shortUrl, 'qr-copy')}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  {copiedId === 'qr-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'qr-copy' ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                    qrModalLink.shortUrl
                  )}`}
                  target="_blank"
                  download="qr-code.png"
                  rel="noreferrer"
                  className="flex-1 py-2 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
