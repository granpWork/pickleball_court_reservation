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
  Tag
} from 'lucide-react';
import { type ShortLink } from '../adminTypes';

export interface AdminShortenerTabProps {
  shortLinks: ShortLink[];
  loading?: boolean;
  onCreateShortLink: (data: {
    title: string;
    shortSlug: string;
    originalUrl: string;
  }) => Promise<void>;
  onDeleteShortLink: (id: string) => Promise<void>;
  defaultVenueUrl?: string;
}

export const AdminShortenerTab: React.FC<AdminShortenerTabProps> = ({
  shortLinks,
  loading = false,
  onCreateShortLink,
  onDeleteShortLink,
  defaultVenueUrl,
}) => {
  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [originalUrlInput, setOriginalUrlInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalLink, setQrModalLink] = useState<ShortLink | null>(null);

  // Quick Random Slug Generator
  const handleGenerateRandomSlug = () => {
    const randomHash = Math.random().toString(36).substring(2, 8);
    setSlugInput(`pk_${randomHash}`);
  };

  const handleOpenCreateModal = () => {
    setTitleInput('');
    setOriginalUrlInput(defaultVenueUrl || '');
    setSlugInput('');
    setFormError(null);
    setModalOpen(true);
  };

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

    setFormSubmitting(true);
    setFormError(null);
    try {
      await onCreateShortLink({
        title: titleInput.trim() || 'Custom Short Link',
        shortSlug: slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
        originalUrl: originalUrlInput.trim(),
      });
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to create short link:', err);
      setFormError((err as Error).message || 'Failed to create short link.');
    } finally {
      setFormSubmitting(false);
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
  const customSlugsCount = useMemo(() => shortLinks.filter((l) => Boolean(l.shortSlug)).length, [shortLinks]);

  // Filtered Links
  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return shortLinks;
    const q = searchQuery.toLowerCase();
    return shortLinks.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.shortSlug.toLowerCase().includes(q) ||
        l.originalUrl.toLowerCase().includes(q)
    );
  }, [shortLinks, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Action Controls */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all flex items-center gap-1.5 shadow-lg shadow-brand-lime/10 cursor-pointer"
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
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Total Link Clicks</span>
            <span className="text-2xl font-black text-emerald-300 mt-0.5 block">{totalClicks}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-sky-500/20 bg-sky-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">Custom Slugs</span>
            <span className="text-2xl font-black text-sky-300 mt-0.5 block">{customSlugsCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search short links or target URLs..."
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
      </div>

      {/* Short Links Roster Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Link Title / Alias</th>
                <th className="py-4 px-6">Branded Short URL</th>
                <th className="py-4 px-6">Target Destination</th>
                <th className="py-4 px-6">Created Date</th>
                <th className="py-4 px-6 text-center">Clicks</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime mx-auto mb-3 shadow-lg shadow-brand-lime/10">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-lime" />
                    </div>
                    <p className="font-extrabold text-white text-sm tracking-wider uppercase">Loading short links database...</p>
                    <p className="text-xs text-slate-400 mt-1">Fetching your custom short links and click statistics.</p>
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                    <p className="font-bold text-slate-300 text-base">No short links found.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery ? 'No links match your search query.' : 'Click "Create Short Link" above to generate your first shareable link.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Title / Alias */}
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-white text-sm group-hover:text-brand-lime transition-colors">
                        {link.title}
                      </div>
                      <div className="text-[11px] font-mono text-brand-lime mt-0.5">
                        /{link.shortSlug}
                      </div>
                    </td>

                    {/* App Short Link */}
                    <td className="py-4 px-6 font-mono text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[220px] text-brand-lime font-bold">{link.shortUrl}</span>
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
                    <td className="py-4 px-6 text-xs text-slate-400 max-w-[260px] truncate">
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

                    {/* Created Date */}
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Click Count */}
                    <td className="py-4 px-6 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-black text-emerald-400">
                        {link.clickCount || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* QR Code Button */}
                        <button
                          onClick={() => setQrModalLink(link)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition-all cursor-pointer"
                          title="Generate QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Test External Redirect */}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SHORT LINK MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
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
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                  {formError}
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

              {/* Custom Short Slug */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Custom Short Slug / Alias
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomSlug}
                    className="text-[11px] font-bold text-brand-lime hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Random Slug
                  </button>
                </div>
                <div className="flex items-center bg-slate-900 border border-dark-border rounded-xl overflow-hidden">
                  <span className="px-3 text-xs text-slate-500 font-mono border-r border-dark-border py-2.5">
                    /s/
                  </span>
                  <input
                    type="text"
                    placeholder="summer-promo"
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 bg-transparent text-white text-xs font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Only lowercase letters, numbers, and hyphens allowed. Left blank = auto-generated.
                </p>
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
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                  <span>{copiedId === 'qr-copy' ? 'Copied Link' : 'Copy Link'}</span>
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
                  <span>Download QR</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
