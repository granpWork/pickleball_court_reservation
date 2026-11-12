import React, { useState } from 'react';
import {
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Maximize2,
  Loader2,
  GripVertical,
} from 'lucide-react';

interface OpenPlayRulesPostersManagerProps {
  posters: string[];
  onChange: (nextPosters: string[]) => void;
  maxPosters?: number;
  isSaving?: boolean;
  onPreviewPoster?: (url: string, index: number) => void;
  compact?: boolean;
}

/**
 * Compresses an uploaded rules/guidelines poster image in-browser so text remains crisp
 * while keeping total Firestore document size well within limits.
 */
const compressRulesPosterFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1100;
        const scale = maxWidth / img.width;
        if (scale < 1) {
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * scale);
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.78);
        resolve(compressedBase64);
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Reusable manager for uploading, compressing, previewing, and reordering up to 3
 * Rules & Guidelines posters on an Open Play event.
 */
export const OpenPlayRulesPostersManager: React.FC<OpenPlayRulesPostersManagerProps> = ({
  posters,
  onChange,
  maxPosters = 3,
  isSaving = false,
  onPreviewPoster,
  compact = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [internalLightboxUrl, setInternalLightboxUrl] = useState<string | null>(null);

  const remainingSlots = Math.max(0, maxPosters - posters.length);

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) {
      setStatusNotice('Please select valid image files (PNG, JPG, WebP).');
      return;
    }

    if (remainingSlots <= 0) {
      setStatusNotice(`Maximum of ${maxPosters} rules posters reached. Remove one to upload another.`);
      return;
    }

    const accepted = incoming.slice(0, remainingSlots);
    if (incoming.length > remainingSlots) {
      setStatusNotice(
        `Only ${remainingSlots} slot(s) remaining (max ${maxPosters} posters). Added the first ${accepted.length} image(s).`
      );
    } else {
      setStatusNotice(null);
    }

    setProcessing(true);
    try {
      const compressed = await Promise.all(accepted.map((file) => compressRulesPosterFile(file)));
      onChange([...posters, ...compressed].slice(0, maxPosters));
    } catch (err) {
      console.error('Failed to process rules poster(s):', err);
      setStatusNotice('One or more selected images could not be processed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= posters.length) return;
    const next = [...posters];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const handleRemove = (index: number) => {
    setStatusNotice(null);
    onChange(posters.filter((_, idx) => idx !== index));
  };

  const handleCardDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      return;
    }
    const next = [...posters];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDraggedIdx(null);
    onChange(next);
  };

  const openPreview = (url: string, idx: number) => {
    if (onPreviewPoster) {
      onPreviewPoster(url, idx);
    } else {
      setInternalLightboxUrl(url);
    }
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <label className="text-xs font-extrabold text-white uppercase tracking-wider">
            Rules &amp; Guidelines Posters{' '}
            <span className="text-slate-400 font-normal normal-case">(Optional, up to {maxPosters})</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
              posters.length > 0
                ? 'text-brand-lime bg-brand-lime/10 border-brand-lime/30'
                : 'text-slate-400 bg-slate-900 border-slate-700'
            }`}
          >
            {posters.length} / {maxPosters} Uploaded
          </span>
        </div>
      </div>

      {/* Drag and Drop Upload Zone (shown while slots remain) */}
      {remainingSlots > 0 && (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              void handleFilesSelected(e.dataTransfer.files);
            }
          }}
          className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl ${
            compact ? 'py-4 px-3' : 'py-5 px-4'
          } transition-all relative ${
            dragActive
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-dark-border hover:border-amber-400/70 hover:bg-slate-900/40'
          }`}
        >
          {processing ? (
            <div className="flex items-center gap-2 py-2 text-xs font-bold text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Optimizing poster image(s)...</span>
            </div>
          ) : (
            <>
              <span className="text-xs font-bold text-slate-300 text-center">
                Drag &amp; Drop Rules / Guidelines Poster(s) here
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 mb-2.5 text-center">
                Upload infographics, house rules, or rotation guides ({remainingSlots} slot{remainingSlots === 1 ? '' : 's'} remaining)
              </span>

              <label className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-bold hover:border-amber-400/60 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Browse Rules Poster{remainingSlots > 1 ? 's' : ''}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple={remainingSlots > 1}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      void handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      )}

      {statusNotice && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
          {statusNotice}
        </div>
      )}

      {/* Uploaded Posters Grid (up to 3 slots) */}
      {posters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {posters.map((url, idx) => (
            <div
              key={`${idx}-${url.slice(-24)}`}
              draggable={posters.length > 1}
              onDragStart={() => setDraggedIdx(idx)}
              onDragOver={(e) => {
                if (draggedIdx !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardDrop(idx);
              }}
              onDragEnd={() => setDraggedIdx(null)}
              className={`group relative rounded-xl overflow-hidden border bg-slate-950 flex flex-col transition-all ${
                draggedIdx === idx
                  ? 'opacity-50 border-amber-400 ring-2 ring-amber-400/40 scale-[0.98]'
                  : 'border-slate-800 hover:border-amber-400/70'
              }`}
            >
              {/* Top Pill Bar */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/95 border-b border-slate-800/80 text-[10px] font-extrabold text-slate-300">
                <span className="flex items-center gap-1 text-amber-300 uppercase tracking-wider">
                  {posters.length > 1 && <GripVertical className="w-3 h-3 text-slate-500 cursor-grab" />}
                  Rule Poster {idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  {posters.length > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, -1)}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === posters.length - 1}
                        onClick={() => handleMove(idx, 1)}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Move right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded bg-red-950/80 border border-red-900/40 text-red-400 hover:bg-red-600 hover:text-white cursor-pointer transition-colors"
                    title={`Remove Rule Poster ${idx + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Image Preview */}
              <div
                onClick={() => openPreview(url, idx)}
                className="relative aspect-[3/4] max-h-[220px] w-full bg-slate-950 flex items-center justify-center cursor-zoom-in overflow-hidden"
                title="Click to inspect poster fullscreen"
              >
                <img
                  src={url}
                  alt={`Rules & Guidelines Poster ${idx + 1}`}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 select-none"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-lg">
                    <Maximize2 className="w-3 h-3 text-amber-400" /> Zoom
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fallback Lightbox Modal if parent didn't supply onPreviewPoster */}
      {internalLightboxUrl && (
        <div
          onClick={() => setInternalLightboxUrl(null)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85dvh] w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 flex flex-col items-center cursor-default"
          >
            <button
              type="button"
              onClick={() => setInternalLightboxUrl(null)}
              className="self-end p-2 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-700 mb-2 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={internalLightboxUrl}
              alt="Rules Poster Fullscreen Preview"
              className="max-w-full max-h-[75dvh] object-contain rounded-xl select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
