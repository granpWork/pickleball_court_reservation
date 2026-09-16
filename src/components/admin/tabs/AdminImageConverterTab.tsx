import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Check,
  RefreshCw,
  FileImage,
  Sparkles,
  Zap,
  Sliders,
  AlertCircle,
  Copy,
  ArrowRight
} from 'lucide-react';

export interface ConvertedItem {
  id: string;
  originalName: string;
  originalSize: number;
  originalType: string;
  convertedBlob: Blob | null;
  convertedUrl: string;
  convertedSize: number;
  targetFormat: 'jpeg' | 'png' | 'webp';
  width: number;
  height: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMsg?: string;
}

/**
 * Scans a DNG / RAW binary ArrayBuffer to extract embedded JPEG preview stream.
 */
function extractJpegFromDng(buffer: ArrayBuffer): Blob | null {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  let bestStart = -1;
  let bestEnd = -1;
  let maxSize = 0;

  let i = 0;
  while (i < len - 4) {
    // Check for JPEG SOI marker: 0xFF 0xD8 0xFF
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      const start = i;
      let j = start + 2;
      let end = -1;
      while (j < len - 1) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          end = j + 2;
          break;
        }
        j += 1;
      }

      if (end !== -1) {
        const size = end - start;
        // Keep the largest embedded JPEG stream (full-size preview > 5KB)
        if (size > maxSize && size > 5000) {
          maxSize = size;
          bestStart = start;
          bestEnd = end;
        }
        i = end;
        continue;
      }
    }
    i += 1;
  }

  if (bestStart !== -1 && bestEnd !== -1) {
    const jpegBytes = bytes.subarray(bestStart, bestEnd);
    return new Blob([jpegBytes], { type: 'image/jpeg' });
  }

  return null;
}

export const AdminImageConverterTab: React.FC = () => {
  const [items, setItems] = useState<ConvertedItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [quality, setQuality] = useState<number>(85); // 85%
  const [maxDimension, setMaxDimension] = useState<number>(1920); // 1920px
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [_isProcessingBatch, setIsProcessingBatch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = async (file: File) => {
    const itemId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ConvertedItem = {
      id: itemId,
      originalName: file.name,
      originalSize: file.size,
      originalType: file.type || file.name.split('.').pop() || 'Unknown',
      convertedBlob: null,
      convertedUrl: '',
      convertedSize: 0,
      targetFormat,
      width: 0,
      height: 0,
      status: 'processing',
    };

    setItems((prev) => [newItem, ...prev]);

    try {
      let imageSrc = '';
      let isObjectUrl = false;

      const fileNameLower = file.name.toLowerCase();
      const isRawOrDng =
        fileNameLower.endsWith('.dng') ||
        fileNameLower.endsWith('.raw') ||
        fileNameLower.endsWith('.cr2') ||
        fileNameLower.endsWith('.nef') ||
        fileNameLower.endsWith('.arw');

      if (isRawOrDng) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const extractedJpeg = extractJpegFromDng(arrayBuffer);
          if (extractedJpeg) {
            imageSrc = URL.createObjectURL(extractedJpeg);
            isObjectUrl = true;
          }
        } catch (e) {
          console.warn('Could not extract embedded JPEG from DNG:', e);
        }
      }

      if (!imageSrc) {
        imageSrc = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file data.'));
          reader.readAsDataURL(file);
        });
      }

      const img = new Image();
      img.src = imageSrc;

      img.onerror = () => {
        if (isObjectUrl) URL.revokeObjectURL(imageSrc);
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  status: 'error',
                  errorMsg: 'Unreadable image stream. Please convert to JPG first.',
                }
              : it
          )
        );
      };

      img.onload = () => {
        const origW = img.width;
        const origH = img.height;

        let targetW = origW;
        let targetH = origH;

        if (maxDimension > 0 && (origW > maxDimension || origH > maxDimension)) {
          if (origW > origH) {
            targetW = maxDimension;
            targetH = Math.round((origH * maxDimension) / origW);
          } else {
            targetH = maxDimension;
            targetW = Math.round((origW * maxDimension) / origH);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          if (isObjectUrl) URL.revokeObjectURL(imageSrc);
          setItems((prev) =>
            prev.map((it) =>
              it.id === itemId
                ? { ...it, status: 'error', errorMsg: 'Canvas context failed.' }
                : it
            )
          );
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);

        const mimeType =
          targetFormat === 'png'
            ? 'image/png'
            : targetFormat === 'webp'
            ? 'image/webp'
            : 'image/jpeg';

        const qualityDecimal = quality / 100;

        canvas.toBlob(
          (blob) => {
            if (isObjectUrl) URL.revokeObjectURL(imageSrc);

            if (!blob) {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === itemId
                    ? { ...it, status: 'error', errorMsg: 'Conversion failed.' }
                    : it
                )
              );
              return;
            }

            const blobUrl = URL.createObjectURL(blob);

            setItems((prev) =>
              prev.map((it) =>
                it.id === itemId
                  ? {
                      ...it,
                      convertedBlob: blob,
                      convertedUrl: blobUrl,
                      convertedSize: blob.size,
                      width: targetW,
                      height: targetH,
                      status: 'success',
                    }
                  : it
              )
            );
          },
          mimeType,
          qualityDecimal
        );
      };
    } catch (err: any) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                status: 'error',
                errorMsg: err?.message || 'Processing error',
              }
            : it
        )
      );
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingBatch(true);
    const fileArray = Array.from(files);
    fileArray.forEach(processFile);
    setIsProcessingBatch(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDownload = (item: ConvertedItem) => {
    if (!item.convertedUrl) return;
    const a = document.createElement('a');
    a.href = item.convertedUrl;
    const baseName = item.originalName.substring(0, item.originalName.lastIndexOf('.')) || item.originalName;
    const ext = item.targetFormat === 'jpeg' ? 'jpg' : item.targetFormat;
    a.download = `${baseName}_converted.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    const successItems = items.filter((it) => it.status === 'success');
    successItems.forEach((item, index) => {
      setTimeout(() => {
        handleDownload(item);
      }, index * 300);
    });
  };

  const handleCopyDataUrl = (item: ConvertedItem) => {
    if (!item.convertedUrl) return;
    navigator.clipboard.writeText(item.convertedUrl);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = () => {
    items.forEach((it) => {
      if (it.convertedUrl) {
        URL.revokeObjectURL(it.convertedUrl);
      }
    });
    setItems([]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.convertedUrl) {
        URL.revokeObjectURL(target.convertedUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-black uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant DNG & Camera RAW Conversion</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Image Converter & Optimizer
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Convert DNG, camera RAW photos, PNG, WEBP, and JPG images into web-optimized formats in seconds. Reduce file sizes by up to 95% without sacrificing visual quality.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap">
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleDownloadAll}
                className="py-2.5 px-4 rounded-xl bg-brand-lime hover:bg-lime-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-lime/10"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>Download All ({items.filter((i) => i.status === 'success').length})</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Clear List
              </button>
            </>
          )}
        </div>
      </div>

      {/* Control Panel: Output Settings & Upload Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Column (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl text-left">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-brand-lime" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Conversion Settings</h3>
          </div>

          {/* Output Format Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Output Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'jpeg', label: 'JPG', desc: 'Web Photo' },
                { id: 'webp', label: 'WEBP', desc: 'Ultra Small' },
                { id: 'png', label: 'PNG', desc: 'Lossless' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setTargetFormat(fmt.id as any)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    targetFormat === fmt.id
                      ? 'bg-brand-lime/15 border-brand-lime text-brand-lime font-black shadow-md shadow-brand-lime/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-black">{fmt.label}</span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (for JPG & WEBP) */}
          {targetFormat !== 'png' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-300 uppercase tracking-wider">
                  Compression Quality
                </label>
                <span className="font-mono font-extrabold text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded border border-brand-lime/20">
                  {quality}%
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-brand-lime cursor-pointer bg-slate-950 rounded-lg h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>Smaller File (40%)</span>
                <span>Recommended (85%)</span>
                <span>Best Quality (100%)</span>
              </div>
            </div>
          )}

          {/* Max Resolution Preset */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Max Dimension Preset
            </label>
            <select
              value={maxDimension}
              onChange={(e) => setMaxDimension(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl p-3 focus:outline-none focus:border-brand-lime cursor-pointer transition-all"
            >
              <option value={1920}>Full HD (1920px) — Recommended for Courts</option>
              <option value={1280}>Standard Web (1280px)</option>
              <option value={800}>Thumbnail / Mobile (800px)</option>
              <option value={0}>Original Dimensions (No Resize)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Sparkles className="w-3.5 h-3.5 text-brand-lime" />
              <span>100% Private & Offline</span>
            </div>
            <p className="leading-relaxed">
              Your DNG and photo files are processed right inside your browser session. Files are never uploaded to external conversion servers.
            </p>
          </div>
        </div>

        {/* Dropzone & Converter Area (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Dropzone Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden ${
              dragActive
                ? 'border-brand-lime bg-brand-lime/10 scale-[1.01]'
                : 'border-slate-800 bg-slate-900/40 hover:border-brand-lime/50 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.dng,.raw,.cr2,.nef,.arw"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime shadow-lg shadow-brand-lime/5">
              <Upload className="w-7 h-7 text-brand-lime animate-bounce" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">
                {dragActive ? 'Drop images here to convert' : 'Click to select or Drag & Drop Photos'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Supports DNG, RAW, PNG, WEBP, JPG, HEIC, and camera photos
              </p>
            </div>

            <span className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold transition-all shadow-sm">
              Browse Files from Computer
            </span>
          </div>

          {/* Converted Files List */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Converted Queue ({items.length})
                </h3>
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const savedPct =
                    item.originalSize > 0 && item.convertedSize > 0
                      ? Math.round(((item.originalSize - item.convertedSize) / item.originalSize) * 100)
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-750"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
                          {item.convertedUrl ? (
                            <img
                              src={item.convertedUrl}
                              alt={item.originalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileImage className="w-6 h-6 text-slate-600 animate-pulse" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 text-left">
                          <h4 className="text-xs font-bold text-white truncate leading-tight">
                            {item.originalName}
                          </h4>

                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                            <span className="text-slate-400">
                              Original: <strong>{formatFileSize(item.originalSize)}</strong>
                            </span>

                            {item.status === 'success' && (
                              <>
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                                <span className="text-brand-lime font-bold">
                                  Converted: {formatFileSize(item.convertedSize)}
                                </span>
                                {item.width > 0 && (
                                  <span className="text-slate-500">
                                    ({item.width}×{item.height}px)
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions & Badges */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {item.status === 'processing' && (
                          <div className="flex items-center gap-2 text-xs text-brand-lime font-bold animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Converting...</span>
                          </div>
                        )}

                        {item.status === 'error' && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-950/40 border border-red-900/40 px-2.5 py-1 rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                            <span className="max-w-[200px] truncate" title={item.errorMsg}>
                              {item.errorMsg || 'Failed'}
                            </span>
                          </div>
                        )}

                        {item.status === 'success' && (
                          <>
                            {savedPct > 0 && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px]">
                                -{savedPct}%
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyDataUrl(item)}
                              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                              title="Copy Data URL"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-4 h-4 text-brand-lime" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              className="py-1.5 px-3 rounded-xl bg-brand-lime text-slate-950 font-bold text-xs hover:bg-lime-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-950" />
                              <span>Download</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900 transition-all cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
