import React, { useState, useRef } from 'react';
import { QrCode, Copy, Check, Download, Printer, X, MapPin } from 'lucide-react';
import { type Court } from '../adminTypes';

interface CourtQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  court: Court | null;
}

export const CourtQrModal: React.FC<CourtQrModalProps> = ({
  isOpen,
  onClose,
  court,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !court) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const shareUrl = `${origin}/?view=details&courtId=${court.id}`;
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
      const safeTitle = court.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.href = blobUrl;
      link.download = `court_qr_${safeTitle}.png`;
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
          <title>Court QR Code - ${court.name}</title>
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
              font-weight: 700;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 16px;
            }
            .badge {
              display: inline-block;
              background-color: #b5f529;
              color: #0f172a;
              font-weight: 700;
              font-size: 12px;
              padding: 4px 12px;
              border-radius: 9999px;
              text-transform: uppercase;
              margin-bottom: 20px;
            }
            .qr-img {
              width: 250px;
              height: 250px;
              margin: 0 auto 20px auto;
              display: block;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              padding: 10px;
            }
            .footer-msg {
              font-size: 14px;
              font-weight: 600;
              color: #334155;
            }
            .url {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 12px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Scan to Book Court</div>
            <div class="title">${court.name}</div>
            ${court.location ? `<div class="subtitle">📍 ${court.location}</div>` : ''}
            <img class="qr-img" src="${qrImageUrl}" alt="Court Booking QR Code" />
            <div class="footer-msg">Scan with your smartphone camera to view court details & reserve slots instantly</div>
            <div class="url">${shareUrl}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-normal text-white leading-tight">Court Booking QR Code</h3>
              <p className="text-xs text-slate-400 font-normal">Shareable QR Code & Reservation Link</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Poster Card Preview Box */}
        <div ref={cardRef} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4 shadow-inner">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-xs font-normal uppercase tracking-wider inline-block">
              Scan to Book Court
            </span>
            <h4 className="text-xl font-normal text-white pt-1">{court.name}</h4>
            {court.location && (
              <p className="text-xs text-slate-400 font-normal flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{court.location}</span>
              </p>
            )}
          </div>

          {/* QR Image Container */}
          <div className="p-3 bg-white rounded-2xl inline-block shadow-xl border border-slate-200">
            <img
              src={qrImageUrl}
              alt={`QR Code for ${court.name}`}
              className="w-48 h-48 md:w-56 md:h-56 object-contain rounded-lg"
            />
          </div>

          <p className="text-xs text-slate-400 font-normal px-2">
            Players can scan this QR code with their camera to instantly view live schedule & book slots online.
          </p>
        </div>

        {/* Copy Link Input Bar */}
        <div className="space-y-1.5">
          <label className="text-xs font-normal text-slate-400 uppercase tracking-wider">Shareable Reservation URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-normal text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-dark-bg'
                  : 'bg-brand-lime hover:bg-[#a6e224] text-dark-bg shadow-md'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDownloadQrImage}
            disabled={downloading}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-normal flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>{downloading ? 'Downloading...' : 'Download PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintQr}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-normal flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-brand-lime" />
            <span>Print Poster</span>
          </button>
        </div>
      </div>
    </div>
  );
};
