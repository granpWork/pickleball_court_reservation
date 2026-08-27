import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Building2,
  Search,
  List,
  LayoutGrid,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { type Court } from '../adminTypes';

interface AdminCourtsTabProps {
  courts: Court[];
  myCompany?: {
    name?: string;
    address?: string;
    addressLine1?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
    postalCode?: string;
  } | null;
  onOpenCreateCourtModal: () => void;
  onOpenEditCourtModal: (court: Court) => void;
  onDeleteCourt: (courtId: string) => void;
  onTogglePublishCourt?: (courtId: string, currentPublished: boolean) => void;
}

export const AdminCourtsTab: React.FC<AdminCourtsTabProps> = ({
  courts,
  myCompany: _myCompany,
  onOpenCreateCourtModal,
  onOpenEditCourtModal,
  onDeleteCourt,
  onTogglePublishCourt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredCourts = courts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.type && c.type.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Filter & Search Action Bar Panel */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search court name or type..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-lime transition-all placeholder-slate-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* LIST vs GRID View Mode Toggle Buttons */}
          <div className="flex gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>LIST</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>GRID</span>
            </button>
          </div>

          {/* Lime Green Create Court Button */}
          <button
            onClick={onOpenCreateCourtModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer shadow-lg shadow-brand-lime/10"
          >
            <Plus className="w-4 h-4 text-dark-bg" />
            <span>Create Court</span>
          </button>
        </div>
      </div>

      {/* Content Display: Cards Grid View vs History Table List View */}
      {filteredCourts.length === 0 ? (
        <div className="glass-panel border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white mb-1">No Courts Found</h4>
          <p className="text-xs text-slate-400 mb-6">
            {searchQuery ? `No court listings match "${searchQuery}".` : 'Click "Create Court" above to add your facility court listings.'}
          </p>
          <button
            onClick={onOpenCreateCourtModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Court</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourts.map((c) => {
            const defaultImg =
              c.images && c.images.length > 0
                ? c.images[0]
                : 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop';
            const isPublished = c.published !== false;
            const minPrice = Math.min(c.dayPrice || 120, c.nightPrice || 200);
            const maxPrice = Math.max(c.dayPrice || 120, c.nightPrice || 200);

            return (
              <div
                key={c.id}
                className="glass-panel border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-xl bg-slate-950/60"
              >
                <div>
                  {/* Poster Image Container */}
                  <div className="relative w-full aspect-[16/9] bg-slate-900 overflow-hidden">
                    <img
                      src={defaultImg}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Top Left Badge: Draft / Published */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${
                          isPublished
                            ? 'bg-emerald-500 text-dark-bg font-black'
                            : 'bg-amber-400 text-dark-bg font-black'
                        }`}
                      >
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {/* Bottom Right Rate Badge */}
                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 text-brand-lime font-mono font-black text-xs shadow-md">
                      {minPrice === maxPrice ? `₱${minPrice}/hr` : `₱${minPrice} - ₱${maxPrice}/hr`}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-extrabold text-white group-hover:text-brand-lime transition-colors">
                      {c.name}
                    </h3>

                    <p className="text-xs text-slate-400 font-semibold">
                      {c.type || 'Painted Asphalt / Concrete (Outdoor)'}
                    </p>

                    {(c.location || c.companyAddress) && (
                      <p className="text-xs text-slate-300 font-medium flex items-center gap-1 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.location || c.companyAddress}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Actions Row */}
                <div className="px-5 py-3.5 border-t border-slate-800/80 flex items-center justify-between mt-auto">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    ACTIONS
                  </span>

                  <div className="flex items-center space-x-2">
                    {/* Eye / EyeOff Toggle Publish Button */}
                    {onTogglePublishCourt && (
                      <button
                        type="button"
                        onClick={() => onTogglePublishCourt(c.id, isPublished)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                        title={isPublished ? 'Unpublish / Mark Draft' : 'Publish Court'}
                      >
                        {isPublished ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => onOpenEditCourtModal(c)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                      title="Edit Court"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => onDeleteCourt(c.id)}
                      className="p-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                      title="Delete Court"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST TABLE VIEW */
        <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs font-extrabold uppercase tracking-wider">
                  <th className="py-4 px-6">Court Details</th>
                  <th className="py-4 px-6">Type & Surface</th>
                  <th className="py-4 px-6">Rates (Day / Night)</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredCourts.map((c) => {
                  const isPublished = c.published !== false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-6 font-bold text-white">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0">
                            <img
                              src={c.images?.[0] || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop'}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm">{c.name}</div>
                            <div className="text-slate-400 text-[11px] font-normal">{c.location || 'Venue Location'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-300">
                        {c.type || 'Standard Court'}
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-brand-lime">
                        ₱{c.dayPrice || 100} / ₱{c.nightPrice || 150} /hr
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isPublished ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {onTogglePublishCourt && (
                            <button
                              type="button"
                              onClick={() => onTogglePublishCourt(c.id, isPublished)}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                              title={isPublished ? 'Unpublish' : 'Publish'}
                            >
                              {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenEditCourtModal(c)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Edit Court"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCourt(c.id)}
                            className="p-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                            title="Delete Court"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
