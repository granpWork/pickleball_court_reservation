import React, { useState, useRef } from 'react';
import { QrCode, Copy, Check, Download, Printer, X, Trophy, Calendar, MapPin } from 'lucide-react';
import { type OpenPlayEvent } from '../../OpenPlayDetails';

interface OpenPlayQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OpenPlayEvent | null;
  formatEventDateLong?: (dateStr: string) => string;
  formatTime12h?: (timeStr: string) => string;
}

export const OpenPlayQrModal: React.FC<OpenPlayQrModalProps> = ({
  isOpen,
  onClose,
  event,
  formatEventDateLong = (d) => d,
  formatTime12h = (t) => t,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !event) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const shareUrl = `${origin}/?openplay=${event.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrImage = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.href = blobUrl;
      link.download = `openplay_qr_${safeTitle}_${event.eventDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download QR code image:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Open Play Poster QR - ${event.title}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              background-color: #ffffff;
              color: #0f172a;
            }
            .card {
              max-width: 450px;
              margin: 0 auto;
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 32px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            }
            .title {
              font-size: 24px;
              font-weight: 900;
              margin-bottom: 8px;
            }
            .badge {
              display: inline-block;
              background-color: #b5f529;
              color: #0f172a;
              font-weight: 800;
              font-size: 12px;
              padding: 4px 12px;
              border-radius: 9999px;
              text-transform: uppercase;
              margin-bottom: 20px;
            }
            .qr-img {
              width: 250px;
              height: 250px;
              margin: 16px auto;
              display: block;
              border: 4px solid #0f172a;
              border-radius: 16px;
              padding: 8px;
              background: white;
            }
            .info {
              font-size: 14px;
              color: #475569;
              margin: 6px 0;
            }
            .fee {
              font-size: 18px;
              font-weight: 800;
              color: #15803d;
              margin-top: 16px;
            }
            .footer {
              margin-top: 24px;
              font-size: 11px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Open Play Registration</div>
            <div class="title">${event.title}</div>
            <div class="info">📅 ${formatEventDateLong(event.eventDate)}</div>
            <div class="info">⏰ ${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}</div>
            ${event.location ? `<div class="info">📍 ${event.location}</div>` : ''}
            <img src="${qrImageUrl}" class="qr-img" alt="QR Code" />
            <div class="info" style="font-weight: 700; color: #0f172a;">Scan QR to Join & Register</div>
            <div class="fee">${event.registrationFee && event.registrationFee > 0 ? `₱${event.registrationFee} / Player` : 'FREE Entry'}</div>
            <div class="footer">PicklePoint Court Booking Platform</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative flex flex-col max-h-[90vh] shadow-2xl bg-dark-bg/95 text-center">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-lime/10 border border-brand-lime/20 text-brand-lime">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-extrabold text-white">Event Share QR Code</h3>
              <p className="text-xs text-slate-400 mt-0.5">Scan to open registration page directly on mobile</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Poster Preview Card */}
        <div ref={cardRef} className="my-5 p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-xl space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[11px] font-black uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>{event.category || 'Open Play Event'}</span>
              {event.skillLevel && <span className="text-slate-400">• {event.skillLevel}</span>}
            </div>
            <h4 className="text-lg font-extrabold text-white leading-tight">{event.title}</h4>
          </div>

          {/* QR Code Box */}
          <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl border-4 border-slate-800 flex items-center justify-center relative group">
            <img
              src={qrImageUrl}
              alt={`QR Code for ${event.title}`}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Session Details */}
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center justify-center gap-2 font-bold text-white">
              <Calendar className="w-3.5 h-3.5 text-brand-lime" />
              <span>{formatEventDateLong(event.eventDate)} ({formatTime12h(event.startTime)} - {formatTime12h(event.endTime)})</span>
            </div>
            {event.location && (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-brand-emerald" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-brand-lime font-mono font-extrabold text-sm">
                {event.registrationFee && event.registrationFee > 0 ? `₱${event.registrationFee} / Player` : 'FREE Entry'}
              </span>
            </div>
          </div>
        </div>

        {/* Share Link Preview */}
        <div className="mb-4">
          <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-slate-300 font-mono text-[11px] outline-none px-2 truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-brand-lime" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handlePrintQr}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-800"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Poster</span>
          </button>

          <button
            onClick={handleDownloadQrImage}
            disabled={downloading}
            className="flex-1 py-2.5 px-5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/20 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Downloading Image...' : 'Download QR Code (PNG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
