import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  formatMessengerMessage,
  DEFAULT_MESSENGER_TEMPLATE,
  type BookingMessengerData,
} from '../../../utils/messengerTemplateUtils';

export interface AdminMessengerPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingMessengerData | null;
  customTemplate?: string;
}

export const AdminMessengerPreviewModal: React.FC<AdminMessengerPreviewModalProps> = ({
  isOpen,
  onClose,
  bookingData,
  customTemplate,
}) => {
  const [messageText, setMessageText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && bookingData) {
      const populated = formatMessengerMessage(customTemplate || DEFAULT_MESSENGER_TEMPLATE, bookingData);
      setMessageText(populated);
      setIsCopied(false);
    }
  }, [isOpen, bookingData, customTemplate]);

  if (!isOpen || !bookingData) return null;

  const handleCopy = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleReset = () => {
    const fresh = formatMessengerMessage(customTemplate || DEFAULT_MESSENGER_TEMPLATE, bookingData);
    setMessageText(fresh);
    setIsCopied(false);
  };

  const modalNode = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl text-left bg-slate-900 max-h-[90vh] flex flex-col overflow-hidden m-auto my-auto relative">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Facebook Messenger Confirmation</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Ready to copy and send to <strong className="text-slate-200">{bookingData.playerName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Booking Summary Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Ref Code</span>
              <span className="font-mono font-extrabold text-brand-lime text-xs truncate block">
                {bookingData.bookingRef || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Player</span>
              <span className="font-bold text-white text-xs truncate block">
                {bookingData.playerName || 'Guest'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Date</span>
              <span className="font-bold text-slate-300 text-xs truncate block">
                {bookingData.date || 'Scheduled'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Total</span>
              <span className="font-extrabold text-emerald-400 text-xs truncate block">
                ₱{bookingData.totalCost || '0'}
              </span>
            </div>
          </div>

          {/* Editable Message Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Generated Messenger Message (Editable)</span>
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-slate-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset to fresh template populated values"
              >
                <RotateCcw className="w-3 h-3" /> Reset Text
              </button>
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500 transition-colors selection:bg-blue-600 selection:text-white resize-y"
              placeholder="Message content will appear here..."
            />
            <p className="text-[10px] text-slate-500">
              Tip: You can edit or add notes above before copying. Line breaks and emoji formatting are preserved.
            </p>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950/95 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <a
            href="https://www.messenger.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Messenger Web</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isCopied
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
