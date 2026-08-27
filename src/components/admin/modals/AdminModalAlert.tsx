import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface AdminModalAlertData {
  open: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
}

interface AdminModalAlertProps {
  alert: AdminModalAlertData;
  onClose: () => void;
}

export const AdminModalAlert: React.FC<AdminModalAlertProps> = ({ alert, onClose }) => {
  if (!alert.open) return null;

  const type = alert.type || 'info';

  const icons = {
    success: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
    error: <XCircle className="w-8 h-8 text-rose-400" />,
    warning: <AlertTriangle className="w-8 h-8 text-amber-400" />,
    info: <Info className="w-8 h-8 text-sky-400" />,
  };

  const glows = {
    success: 'bg-emerald-500/20 border-emerald-500/30',
    error: 'bg-rose-500/20 border-rose-500/30',
    warning: 'bg-amber-500/20 border-amber-500/30',
    info: 'bg-sky-500/20 border-sky-500/30',
  };

  const buttonColors = {
    success: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    error: 'bg-rose-500 hover:bg-rose-400 text-white',
    warning: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    info: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
  };

  const handleConfirm = () => {
    if (alert.onConfirm) alert.onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl bg-dark-bg/95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Glowing Icon */}
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border mb-5 shadow-lg ${glows[type]}`}>
          {icons[type]}
        </div>

        {/* Content */}
        <h3 className="text-xl font-extrabold text-white mb-2">{alert.title}</h3>
        <p className="text-sm font-normal text-slate-300 mb-6 leading-relaxed">{alert.message}</p>

        {/* Confirm Action Button */}
        <button
          onClick={handleConfirm}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-lg active:scale-[0.98] ${buttonColors[type]}`}
        >
          {alert.confirmText || 'OK'}
        </button>
      </div>
    </div>
  );
};
