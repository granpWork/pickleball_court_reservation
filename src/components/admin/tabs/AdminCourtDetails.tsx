import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Navigation,
  Globe,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  Building2,
  CreditCard,
  Plus,
  Package,
  ChevronDown,
  ChevronUp,
  QrCode,
  Check,
  Share2
} from 'lucide-react';
import { type Court, type Booking, type GcashAccount as PersonalGcashAccount } from '../adminTypes';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { CourtCalendarView } from './CourtCalendarView';

interface AdminCourtDetailsProps {
  court: Court;
  bookings?: Booking[];
  openPlayEvents?: OpenPlayEvent[];
  onBack: () => void;
  onOpenEditCourtModal?: (court: Court) => void;
  onDeleteCourt?: (courtId: string) => void;
  onTogglePublishCourt?: (courtId: string, currentStatus: boolean) => void;
  onOpenManualBookingModal?: () => void;
  onCopyShareLink?: (courtId: string) => void;
  onOpenQrModal?: (court: Court) => void;
  gcashAccounts?: PersonalGcashAccount[];
}

export const AdminCourtDetails: React.FC<AdminCourtDetailsProps> = ({
  court,
  bookings = [],
  openPlayEvents = [],
  onBack,
  onOpenEditCourtModal,
  onDeleteCourt,
  onTogglePublishCourt,
  onOpenManualBookingModal,
  onCopyShareLink,
  onOpenQrModal,
  gcashAccounts = [],
}) => {
  const images = court.images && court.images.length > 0
    ? court.images
    : [court.imageUrl || 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=80'];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isRentalsExpanded, setIsRentalsExpanded] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const handleCopyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/?view=details&courtId=${court.id}`;
    navigator.clipboard.writeText(url);
    if (onCopyShareLink) onCopyShareLink(court.id);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const DEFAULT_COURT_IMAGE = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop';

  const fullLocation = court.streetAddress || court.address || court.location || 'Location not specified';
  const isPublished = court.published !== false && court.status !== 'draft';

  const dayRate = court.dayPrice || 0;
  const nightRate = court.nightPrice || 0;
  const minPrice = dayRate && nightRate ? Math.min(dayRate, nightRate) : (dayRate || nightRate || 0);
  const maxPrice = Math.max(dayRate, nightRate);

  const surfaceTypeDisplay = court.type
    ? court.type.charAt(0).toUpperCase() + court.type.slice(1).replace('_', ' ')
    : 'Standard Acrylic Hard Court';

  const assignedGcashAccount = gcashAccounts.find(a => a.id === court.gcashAccountId);
  const hasMultipleRentals = Boolean(court.rentals && court.rentals.length > 1);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-dark-border">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-all text-sm font-normal uppercase tracking-wider cursor-pointer bg-slate-900 border border-slate-700 hover:border-brand-lime px-4 py-2.5 rounded-2xl shadow-md hover:scale-[1.01]"
        >
          <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Courts List
        </button>

        {/* Toggle Published Button / Status Tag (Top Right h2) */}
        {onTogglePublishCourt ? (
          <button
            type="button"
            onClick={() => onTogglePublishCourt(court.id, isPublished)}
            className={`px-4 py-2 rounded-full text-xs font-normal uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border shadow-sm ${
              isPublished
                ? 'bg-brand-lime/20 border-brand-lime/40 text-brand-lime hover:bg-brand-lime/30'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
            }`}
          >
            {isPublished ? <Globe className="w-4 h-4 text-brand-lime" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
            <h2 className={`text-xs md:text-sm font-normal uppercase tracking-wider inline ${isPublished ? 'text-brand-lime' : 'text-amber-300'}`}>
              {isPublished ? 'LIVE' : 'DRAFT'}
            </h2>
          </button>
        ) : (
          <div
            className={`px-4 py-2 rounded-full text-xs font-normal uppercase tracking-wider flex items-center gap-2 border shadow-sm ${
              isPublished
                ? 'bg-brand-lime/20 border-brand-lime/40 text-brand-lime'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
          >
            {isPublished ? <Globe className="w-4 h-4 text-brand-lime" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
            <h2 className={`text-xs md:text-sm font-normal uppercase tracking-wider inline ${isPublished ? 'text-brand-lime' : 'text-amber-300'}`}>
              {isPublished ? 'LIVE' : 'DRAFT'}
            </h2>
          </div>
        )}
      </div>

      {/* Main Side-by-Side Section: Poster & Venue Left (5 cols), Details & Specs Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Consolidated Court Poster & Location Card */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel border border-slate-800 rounded-3xl p-4 space-y-4 shadow-xl">
            {/* Gallery Poster Box */}
            <div className="relative w-full aspect-[4/3] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group">
              <img
                src={images[activeImageIndex] || images[0]}
                alt={court.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_COURT_IMAGE; }}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-normal uppercase tracking-wider shadow-lg ${
                  isPublished ? 'bg-emerald-500 text-dark-bg' : 'bg-amber-400 text-dark-bg'
                }`}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>

              <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 text-brand-lime font-mono font-normal text-sm shadow-xl">
                {minPrice === maxPrice ? `₱${minPrice}/hr` : `₱${minPrice} - ₱${maxPrice}/hr`}
              </div>
            </div>

            {/* Thumbnails Row */}
            {images.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-18 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      activeImageIndex === idx ? 'border-brand-lime scale-105 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Consolidated Location Details Block */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-lime" />
                <span>Venue Address & Location</span>
              </div>

              <div className="space-y-2 text-sm text-slate-300 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
                <p className="font-normal flex items-start gap-2">
                  <span className="text-slate-400 font-normal shrink-0">Address:</span>
                  <span className="text-slate-200">{fullLocation}</span>
                </p>
                {court.barangay && (
                  <p className="font-normal">
                    <span className="text-slate-400 font-normal">Barangay:</span> <span className="text-slate-200">{court.barangay}</span>
                  </p>
                )}
                {court.province && (
                  <p className="font-normal">
                    <span className="text-slate-400 font-normal">Province/City:</span> <span className="text-slate-200">{court.province}</span>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-brand-lime text-xs font-normal hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Location on Google Maps</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Consolidated Court Details, Specifications & Payment Card */}
        <div className="lg:col-span-7 space-y-5">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            {/* Header & Title */}
            <div>
              <div className="flex items-center gap-2 text-brand-lime text-xs font-normal uppercase tracking-wider mb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Court Specification & Pricing</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-normal text-white mb-2">{court.name}</h2>

              {(court.companyName || court.ownerCompanyName) && (
                <p className="text-sm text-slate-400 font-normal flex items-center gap-1.5 mb-3.5">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{court.companyName || court.ownerCompanyName}</span>
                </p>
              )}

              {court.description && court.description.trim() && (
                <p className="text-sm text-slate-300 leading-relaxed font-normal bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  {court.description}
                </p>
              )}
            </div>

            {/* Pricing Rates Grid (Day vs Night) */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-normal text-slate-400 uppercase tracking-wider">Hourly Reservation Rates</div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-1.5">
                  <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Day Rate</span>
                  </div>
                  <div className="text-xl md:text-2xl font-mono font-normal text-emerald-400">
                    ₱{court.dayPrice || 120}<span className="text-xs text-slate-500 font-normal">/hr</span>
                  </div>
                  <div className="text-xs text-slate-500 font-normal">Standard Hours (5:00 AM – 6:00 PM)</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-1.5">
                  <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Night Rate</span>
                  </div>
                  <div className="text-xl md:text-2xl font-mono font-normal text-purple-400">
                    ₱{court.nightPrice || 200}<span className="text-xs text-slate-500 font-normal">/hr</span>
                  </div>
                  <div className="text-xs text-slate-500 font-normal">Evening Lights (6:00 PM – 11:00 PM)</div>
                </div>
              </div>
            </div>

            {/* Surface Type & Specs Block */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-lime" />
                <span>Surface & Specifications</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-normal text-white">Surface Material:</span>
                  <span className="px-3.5 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-normal text-xs">
                    {surfaceTypeDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Operating Hours Block */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Court Operating Hours</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-normal uppercase">
                  Daily Open Schedule
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-normal text-slate-400 uppercase">Mon – Fri (Weekdays)</div>
                    <div className="font-normal text-white">5:00 AM – 11:00 PM</div>
                    <div className="text-[10px] text-emerald-400 font-normal">Active Booking</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-normal text-slate-400 uppercase">Sat – Sun (Weekends)</div>
                    <div className="font-normal text-white">5:00 AM – 11:00 PM</div>
                    <div className="text-[10px] text-emerald-400 font-normal">Active Booking</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
                    <div className="text-[11px] font-normal text-slate-400 uppercase">Public Holidays</div>
                    <div className="font-normal text-white">5:00 AM – 11:00 PM</div>
                    <div className="text-[10px] text-cyan-400 font-normal">Open All Day</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Destination Block */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Assigned GCash Payment Destination</span>
                </div>
                {onOpenEditCourtModal && (
                  <button
                    type="button"
                    onClick={() => onOpenEditCourtModal(court)}
                    className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-brand-lime text-brand-lime hover:text-white text-xs font-normal transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{court.gcashAccountId ? 'Change Destination' : 'Assign Destination'}</span>
                  </button>
                )}
              </div>

              {assignedGcashAccount || (court.gcashAccountId && court.gcashAccountId !== 'global') ? (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-sm flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {assignedGcashAccount?.paymentName && (
                      <span className="text-xs text-slate-400 font-normal">{assignedGcashAccount.paymentName} •</span>
                    )}
                    <span className="text-sm font-normal text-white">
                      Account Name: <span className="font-normal text-white">{assignedGcashAccount?.gcashName || (court as any).gcashName || 'Custom GCash Destination'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-lime/20 text-brand-lime text-[11px] font-normal uppercase">Connected</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-normal">
                  <span>No specific GCash Account assigned to this court. Payments fall back to default facility account.</span>
                </div>
              )}
            </div>

            {/* Equipment Rentals & Add-ons Section (Only rendered if rentals exist) */}
            {court.rentals && court.rentals.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div
                  className={`flex items-center justify-between flex-wrap gap-2 ${
                    hasMultipleRentals ? 'cursor-pointer select-none group/rentals' : ''
                  }`}
                  onClick={() => {
                    if (hasMultipleRentals) {
                      setIsRentalsExpanded(!isRentalsExpanded);
                    }
                  }}
                >
                  <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>Equipment Rentals & Add-ons</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-normal">
                      {court.rentals.length} {court.rentals.length === 1 ? 'Item Available' : 'Items Available'}
                    </span>

                    {hasMultipleRentals && (
                      <button
                        type="button"
                        className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover/rentals:text-white transition-colors cursor-pointer"
                        title={isRentalsExpanded ? "Collapse Rentals" : "Expand Rentals"}
                      >
                        {isRentalsExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Accordion Content Grid */}
                {(!hasMultipleRentals || isRentalsExpanded) && (
                  <div className="animate-fade-in pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {court.rentals.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2.5 text-sm shadow-md"
                        >
                          <div className="space-y-1">
                            <div className="font-normal text-white text-sm md:text-base">{r.name}</div>
                            <div className="text-slate-400 font-normal text-xs">
                              {r.description || `Stock available: ${r.quantity}`}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                            <span className="text-[11px] text-slate-400 font-normal uppercase tracking-wider">RENTAL RATE</span>
                            <div className="font-mono font-normal text-brand-lime text-sm">
                              ₱{r.price}
                              <span className="text-[11px] text-slate-400 font-sans font-normal ml-1 capitalize">
                                /{r.pricingType ? r.pricingType.replace('_', ' ') : 'booking'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* Court Management Actions Block (Moved directly after Equipment Rentals) */}
              <div className="space-y-3 pt-3.5 border-t border-slate-800/80">
                <div className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-lime" />
                  <span>Court Management Actions</span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Create Walk-in CTA */}
                    {onOpenManualBookingModal && (
                      <button
                        type="button"
                        onClick={onOpenManualBookingModal}
                        className="py-2.5 px-4 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg transition-all text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-brand-lime/20"
                      >
                        <Plus className="w-3.5 h-3.5 text-dark-bg" />
                        <span>Manual Booking</span>
                      </button>
                    )}

                    {/* Edit Court Button */}
                    {onOpenEditCourtModal && (
                      <button
                        type="button"
                        onClick={() => onOpenEditCourtModal(court)}
                        className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-brand-lime text-slate-300 hover:text-white text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit Details</span>
                      </button>
                    )}

                    {/* Share Link */}
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className={`py-2.5 px-4 rounded-xl border transition-all text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                        copiedShareLink
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 hover:border-brand-lime text-slate-300 hover:text-white'
                      }`}
                      title="Copy shareable reservation link"
                    >
                      {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-brand-lime" />}
                      <span>{copiedShareLink ? 'Link Copied!' : 'Share Link'}</span>
                    </button>

                    {/* QR Code Modal Button */}
                    {onOpenQrModal && (
                      <button
                        type="button"
                        onClick={() => onOpenQrModal(court)}
                        className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-brand-lime text-brand-lime hover:text-white text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        title="View & Download Court QR Code Poster"
                      >
                        <QrCode className="w-3.5 h-3.5 text-brand-lime" />
                        <span>QR Code</span>
                      </button>
                    )}

                    {/* Open Public Page */}
                    <button
                      type="button"
                      onClick={() => window.open(`/?view=details&courtId=${court.id}`, '_blank')}
                      className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-brand-lime text-brand-lime hover:text-white text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Public View</span>
                    </button>
                  </div>

                  {/* Delete Court Button */}
                  {onDeleteCourt && (
                    <button
                      type="button"
                      onClick={() => onDeleteCourt(court.id)}
                      className="py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900 transition-all text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      title="Delete Court"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Court Booking Schedule & Interactive Monthly Calendar Section */}
      <CourtCalendarView
        court={court}
        bookings={bookings}
        openPlayEvents={openPlayEvents}
        onOpenManualBookingModal={onOpenManualBookingModal}
      />
    </div>
  );
};
