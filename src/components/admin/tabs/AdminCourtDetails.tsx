import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Clock,
  Shield,
  FileText,
  CloudRain,
  Package,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { type Court } from '../adminTypes';

interface AdminCourtDetailsProps {
  court: Court;
  onBack: () => void;
  onOpenEditCourtModal?: (court: Court) => void;
  onDeleteCourt?: (courtId: string) => void;
  onTogglePublishCourt?: (courtId: string, currentPublished: boolean) => void;
  onOpenManualBookingModal?: () => void;
}

export const AdminCourtDetails: React.FC<AdminCourtDetailsProps> = ({
  court,
  onBack,
  onOpenEditCourtModal,
  onDeleteCourt,
  onTogglePublishCourt,
  onOpenManualBookingModal,
}) => {
  const images = Array.isArray(court.images) && court.images.length > 0
    ? court.images.filter(Boolean)
    : ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop'];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isPublished = court.published !== false;
  const minPrice = Math.min(court.dayPrice || 120, court.nightPrice || 200);
  const maxPrice = Math.max(court.dayPrice || 120, court.nightPrice || 200);

  const fullLocation = [
    court.addressLine1,
    court.barangay,
    court.municipality || (court as any).city,
    court.province,
    court.region,
  ].filter(Boolean).join(', ') || court.location || court.companyAddress || 'Location unavailable';

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Navigation Header Bar */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-extrabold transition-all cursor-pointer group shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-brand-lime group-hover:-translate-x-1 transition-transform" />
          <span>Back to Courts List</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Create Walk-in CTA */}
          {onOpenManualBookingModal && (
            <button
              type="button"
              onClick={onOpenManualBookingModal}
              className="px-3.5 py-2 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-lime/10"
            >
              <Plus className="w-3.5 h-3.5 text-dark-bg stroke-[3]" />
              <span>Manual Booking</span>
            </button>
          )}

          {/* Toggle Published Button */}
          {onTogglePublishCourt && (
            <button
              type="button"
              onClick={() => onTogglePublishCourt(court.id, isPublished)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPublished
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isPublished ? 'Live (Published)' : 'Draft (Hidden)'}</span>
            </button>
          )}

          {/* Edit Court Button */}
          {onOpenEditCourtModal && (
            <button
              type="button"
              onClick={() => onOpenEditCourtModal(court)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Edit Details</span>
            </button>
          )}

          {/* Open Public Page */}
          <button
            type="button"
            onClick={() => window.open(`/?view=details&courtId=${court.id}`, '_blank')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-brand-lime hover:text-white hover:border-brand-lime text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Preview Public Page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Link</span>
          </button>

          {/* Delete Button */}
          {onDeleteCourt && (
            <button
              type="button"
              onClick={() => onDeleteCourt(court.id)}
              className="p-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
              title="Delete Court"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Court Header & Gallery Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Carousel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative w-full aspect-[16/9] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl group">
            <img
              src={images[activeImageIndex] || images[0]}
              alt={court.name}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${
                isPublished ? 'bg-emerald-500 text-dark-bg font-black' : 'bg-amber-400 text-dark-bg font-black'
              }`}>
                {isPublished ? 'Published' : 'Draft'}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider">
                {court.type || 'Standard Court'}
              </span>
            </div>

            <div className="absolute bottom-4 right-4 px-4 py-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700 text-brand-lime font-mono font-black text-sm shadow-xl">
              {minPrice === maxPrice ? `₱${minPrice}/hr` : `₱${minPrice} - ₱${maxPrice}/hr`}
            </div>
          </div>

          {/* Thumbnails row */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    activeImageIndex === idx ? 'border-brand-lime scale-105 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key Details & Rates Card */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl space-y-6">
          <div>
            <div className="flex items-center gap-2 text-brand-lime text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{court.type || 'Pickleball Court Listing'}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">{court.name}</h2>

            {(court.companyName || court.ownerCompanyName) && (
              <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mb-4">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{court.companyName || court.ownerCompanyName}</span>
              </p>
            )}

            <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              {court.description || 'No custom description provided for this court listing.'}
            </p>
          </div>

          {/* Rate Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Day Rate</span>
              </div>
              <div className="text-lg font-mono font-black text-emerald-400">
                ₱{court.dayPrice || 120}<span className="text-xs text-slate-500 font-normal">/hr</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">5:00 AM – 6:00 PM</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" />
                <span>Night Rate</span>
              </div>
              <div className="text-lg font-mono font-black text-purple-400">
                ₱{court.nightPrice || 200}<span className="text-xs text-slate-500 font-normal">/hr</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">6:00 PM – 11:00 PM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Location & Equipment Rentals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Venue Address & Location Card */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-lime" />
            <span>Venue Address & Location</span>
          </h3>

          <div className="space-y-2 text-xs text-slate-300">
            <p className="font-medium flex items-start gap-2">
              <span className="text-slate-400 font-bold shrink-0">Address:</span>
              <span>{fullLocation}</span>
            </p>
            {court.barangay && (
              <p className="font-medium">
                <span className="text-slate-400 font-bold">Barangay:</span> {court.barangay}
              </p>
            )}
            {court.province && (
              <p className="font-medium">
                <span className="text-slate-400 font-bold">Province/City:</span> {court.province}
              </p>
            )}
          </div>

          {(court.mapUrl || (court.latitude && court.longitude)) && (
            <button
              type="button"
              onClick={() => {
                const url = court.mapUrl || `https://www.google.com/maps/search/?api=1&query=${court.latitude},${court.longitude}`;
                window.open(url, '_blank');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-brand-lime text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Open Location on Google Maps</span>
            </button>
          )}
        </div>

        {/* Equipment Rentals Add-ons */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            <span>Available Equipment & Add-ons</span>
          </h3>

          {!court.rentals || court.rentals.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No equipment rentals configured for this court.</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {court.rentals.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {r.description || `Stock available: ${r.quantity}`}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-brand-lime text-right">
                    ₱{r.price}
                    <div className="text-[10px] text-slate-500 font-sans font-medium capitalize">
                      {r.pricingType ? r.pricingType.replace('_', ' ') : 'per booking'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rules & Policies Section */}
      {court.policies && (
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Court Rules & Venue Policies</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {court.policies.cancellationPolicy && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cancellation Policy</span>
                </div>
                <p className="text-slate-400 font-normal">{court.policies.cancellationPolicy}</p>
              </div>
            )}

            {court.policies.weatherPolicy && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Weather Policy</span>
                </div>
                <p className="text-slate-400 font-normal">{court.policies.weatherPolicy}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
