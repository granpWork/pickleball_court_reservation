import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, X } from 'lucide-react';

interface OpenPlayJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  jsonData: Record<string, any> | Array<Record<string, any>>;
  filename?: string;
}

export const OpenPlayJsonModal: React.FC<OpenPlayJsonModalProps> = ({
  isOpen,
  onClose,
  title,
  jsonData,
  filename = 'openplay_session_data.json',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(jsonData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full relative flex flex-col max-h-[90vh] shadow-2xl bg-dark-bg/95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-lime/10 border border-brand-lime/20 text-brand-lime">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Structured JSON format for integration & records</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JSON Preview Content Area */}
        <div className="my-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-t-xl text-xs font-mono text-slate-400">
            <span>JSON Payload ({jsonString.length} chars)</span>
            <span className="text-brand-lime font-bold">utf-8</span>
          </div>
          <pre className="p-4 bg-slate-950 border border-t-0 border-slate-800 rounded-b-xl overflow-auto text-xs font-mono text-emerald-400 leading-relaxed max-h-[50vh] select-all scrollbar-thin">
            <code>{jsonString}</code>
          </pre>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-mono">
            {copied && <span className="text-brand-lime font-bold animate-fade-in">✓ Copied to clipboard!</span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer hover:bg-slate-800"
            >
              {copied ? <Check className="w-4 h-4 text-brand-lime" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all flex items-center gap-2 shadow-lg shadow-brand-lime/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
