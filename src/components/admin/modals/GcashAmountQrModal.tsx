import React, { useState } from 'react';
import { X, QrCode, Download, Copy, Check } from 'lucide-react';
import { type GcashAccount } from '../adminTypes';

interface GcashAmountQrModalProps {
  account: GcashAccount;
  onClose: () => void;
  orgName?: string;
}

export const GcashAmountQrModal: React.FC<GcashAmountQrModalProps> = ({
  account,
  onClose,
  orgName = 'Pickleball Facility',
}) => {
  const [amount, setAmount] = useState<number>(250);
  const [note, setNote] = useState<string>('Court Booking / Entry Fee');
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  const [copiedDetails, setCopiedDetails] = useState<boolean>(false);

  const presetAmounts = [150, 250, 350, 500, 1000, 1500];

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(account.gcashNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 3000);
  };

  const handleCopyFullDetails = () => {
    const detailsStr = `GCASH PAYMENT DETAILS
Venue: ${orgName}
Payment Purpose: ${account.paymentName || 'GCash Account'} (${note})
Account Name: ${account.gcashName}
GCash Number: ${account.gcashNumber}
Amount Due: ₱${amount.toLocaleString()}`;
    navigator.clipboard.writeText(detailsStr);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 3000);
  };

  const handleDownloadQrPosterCard = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 780;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 780);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 780);

    // Accent header banner
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 30, 540, 720);

    // Border
    ctx.strokeStyle = '#b5f529';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, 540, 720);

    // Organization & Title
    ctx.fillStyle = '#b5f529';
    ctx.font = '900 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(orgName.toUpperCase(), 300, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px sans-serif';
    ctx.fillText(account.paymentName || 'GCash Express Pay', 300, 105);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px sans-serif';
    ctx.fillText(note, 300, 128);

    // Amount Badge Box
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(150, 150, 300, 65, 12);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 11px sans-serif';
    ctx.fillText('TOTAL AMOUNT DUE', 300, 172);

    ctx.fillStyle = '#b5f529';
    ctx.font = '900 28px monospace';
    ctx.fillText(`₱${amount.toLocaleString()}`, 300, 204);

    // Draw QR Code Image if available
    if (account.gcashQrCode) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw white background card for QR
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(160, 235, 280, 280, 16);
        ctx.fill();

        ctx.drawImage(img, 175, 250, 250, 250);

        // Footer details
        drawFooterDetails(ctx);
        triggerDownload(canvas);
      };
      img.onerror = () => {
        drawFooterDetails(ctx);
        triggerDownload(canvas);
      };
      img.src = account.gcashQrCode;
    } else {
      drawFooterDetails(ctx);
      triggerDownload(canvas);
    }
  };

  const drawFooterDetails = (ctx: CanvasRenderingContext2D) => {
    // GCash Account Card Footer Box
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(80, 540, 440, 140, 16);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 11px sans-serif';
    ctx.fillText('ACCOUNT HOLDER NAME', 300, 568);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px sans-serif';
    ctx.fillText(account.gcashName, 300, 594);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 11px sans-serif';
    ctx.fillText('GCASH MOBILE NUMBER', 300, 628);

    ctx.fillStyle = '#b5f529';
    ctx.font = '900 22px monospace';
    ctx.fillText(account.gcashNumber, 300, 656);

    // Powered by footer
    ctx.fillStyle = '#64748b';
    ctx.font = '700 11px sans-serif';
    ctx.fillText('POWERED BY PICKLEPOINT ONLINE RESERVATIONS', 300, 720);
  };

  const triggerDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `gcash_qr_${account.gcashNumber}_₱${amount}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl relative text-left my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[10px] font-black uppercase tracking-wider mb-1">
              <QrCode className="w-3.5 h-3.5" /> Dynamic Amount Generator
            </div>
            <h3 className="text-lg font-extrabold text-white">Generate GCash QR Card</h3>
            <p className="text-xs text-slate-400">
              Create an amount-specific GCash payment card for player checkout or open play fees.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
              Payment Amount (PHP ₱)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">₱</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-brand-lime transition-all"
                placeholder="250"
              />
            </div>
            {/* Quick Amount Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {presetAmounts.map((pAmt) => (
                <button
                  key={pAmt}
                  type="button"
                  onClick={() => setAmount(pAmt)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    amount === pAmt
                      ? 'bg-brand-lime text-dark-bg'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  ₱{pAmt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
              Payment Purpose / Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-lime transition-all"
              placeholder="e.g. Open Play Entry, Court Booking"
            />
            <p className="text-[10px] text-slate-500">Subtitle displayed on the generated payment poster card.</p>
          </div>
        </div>

        {/* Live Card Preview */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-brand-lime uppercase tracking-wider block">
                {account.paymentName || 'GCash Express Pay'}
              </span>
              <h4 className="text-sm font-extrabold text-white">{account.gcashName}</h4>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Amount Due</span>
              <span className="text-lg font-black text-brand-lime font-mono">₱{amount.toLocaleString()}</span>
            </div>
          </div>

          {/* QR Image Frame */}
          <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border border-slate-800">
            {account.gcashQrCode ? (
              <img src={account.gcashQrCode} alt={account.gcashName} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-slate-400 p-4">
                <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-600 block">No QR Uploaded</span>
              </div>
            )}
          </div>

          {/* Account Details Box */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">GCash Mobile Number</span>
              <span className="text-sm font-bold text-white tracking-wide">{account.gcashNumber}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyNumber}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              {copiedNumber ? <Check className="w-3.5 h-3.5 text-brand-lime" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNumber ? 'Copied!' : 'Copy Number'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopyFullDetails}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedDetails ? <Check className="w-4 h-4 text-brand-lime" /> : <Copy className="w-4 h-4" />}
            <span>{copiedDetails ? 'Details Copied!' : 'Copy Payment Info Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadQrPosterCard}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG Poster Card (₱{amount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
