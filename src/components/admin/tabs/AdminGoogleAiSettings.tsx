import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Cpu,
  Trash2,
  Clock,
  Layers,
  Users,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../firebase';
import type { GoogleAiIntegrationSettings } from '../adminTypes';

interface AdminGoogleAiSettingsProps {
  user?: { name?: string; email?: string; role?: string; companyId?: string; isAdmin?: boolean } | null;
  companyProfile?: { id: string; name?: string } | null;
}

const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: 'Recommended',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Ultra-fast next-generation model, ideal for instant Open Play Match Matrix pairings and round-by-round player rotations.',
    speed: 'Ultra Fast',
    context: '1M tokens',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: 'Fast & Balanced',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'High-speed model optimized for quick match generation, skill bracket balancing, and sit-out rotation fairness.',
    speed: 'Fast',
    context: '1M tokens',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    tag: 'Deep Reasoning',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Advanced reasoning engine for complex multi-court DUPR parity, partner variety, and tournament-grade match matrices.',
    speed: 'Moderate',
    context: '2M tokens',
  },
];

export const AdminGoogleAiSettings: React.FC<AdminGoogleAiSettingsProps> = ({ user, companyProfile }) => {
  const effectiveCompanyId = companyProfile?.id || user?.companyId || 'default';
  const firestoreDocId = effectiveCompanyId !== 'default' ? `google_ai_${effectiveCompanyId}` : 'google_ai';
  const localStorageKey = effectiveCompanyId !== 'default' ? `picklepoint_google_ai_config_${effectiveCompanyId}` : 'picklepoint_google_ai_config';

  const [enabled, setEnabled] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [defaultModel, setDefaultModel] = useState<string>('gemini-2.0-flash');
  const [status, setStatus] = useState<'unconfigured' | 'connected' | 'error'>('unconfigured');
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByEmail, setUpdatedByEmail] = useState<string | null>(null);

  const [showKey, setShowKey] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    latencyMs?: number;
    modelsFound?: number;
  } | null>(null);

  // Load configuration from Firestore with LocalStorage fallback
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      setLoading(true);
      try {
        if (isFirebaseConfigured && db) {
          const docRef = doc(db, 'settings', firestoreDocId);
          let docSnap = await getDoc(docRef);

          // Fallback to global settings/google_ai if company-specific doc doesn't exist yet
          if (!docSnap.exists() && firestoreDocId !== 'google_ai') {
            docSnap = await getDoc(doc(db, 'settings', 'google_ai'));
          }

          if (docSnap.exists() && isMounted) {
            const data = docSnap.data() as Partial<GoogleAiIntegrationSettings>;
            setEnabled(data.enabled !== undefined ? data.enabled : true);
            setApiKey(data.apiKey || '');
            setDefaultModel(data.defaultModel || 'gemini-2.0-flash');
            setStatus(data.status || (data.apiKey ? 'connected' : 'unconfigured'));
            setLastTestedAt(data.lastTestedAt || null);
            setUpdatedAt(data.updatedAt || null);
            setUpdatedByEmail(data.updatedByEmail || null);
            setLoading(false);
            return;
          }
        }

        // Local storage fallback
        const localData = localStorage.getItem(localStorageKey) || localStorage.getItem('picklepoint_google_ai_config');
        if (localData && isMounted) {
          const parsed = JSON.parse(localData);
          setEnabled(parsed.enabled !== undefined ? parsed.enabled : true);
          setApiKey(parsed.apiKey || '');
          setDefaultModel(parsed.defaultModel || 'gemini-2.0-flash');
          setStatus(parsed.status || (parsed.apiKey ? 'connected' : 'unconfigured'));
          setLastTestedAt(parsed.lastTestedAt || null);
          setUpdatedAt(parsed.updatedAt || null);
          setUpdatedByEmail(parsed.updatedByEmail || null);
        }
      } catch (err: unknown) {
        console.error('Failed to load Google AI Studio settings:', err);
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load configuration.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [firestoreDocId, localStorageKey]);

  // Copy helper
  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Test connection to Google Gemini API
  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setErrorMessage('Please enter a Google AI Studio API key to test.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    const startTime = performance.now();

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status} (${response.statusText})`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errorDetails = errJson.error.message;
          }
        } catch {
          // Response body was not JSON
        }
        throw new Error(errorDetails);
      }

      const data = await response.json();
      const modelsFound = Array.isArray(data?.models) ? data.models.length : 0;
      const testedTimestamp = new Date().toISOString();

      setStatus('connected');
      setLastTestedAt(testedTimestamp);
      setTestResult({
        success: true,
        message: `API Key verified! Ready for AI Match Matrix generation (${modelsFound} Gemini models accessible).`,
        timestamp: new Date().toLocaleTimeString(),
        latencyMs,
        modelsFound,
      });
    } catch (err: unknown) {
      console.error('Google AI Studio connection test failed:', err);
      const msg = err instanceof Error ? err.message : 'Connection test failed. Please verify that your API key is valid.';
      setStatus('error');
      setTestResult({
        success: false,
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setTesting(false);
    }
  };

  // Save settings to Firestore and LocalStorage
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    const trimmedKey = apiKey.trim();
    const now = new Date().toISOString();
    const newStatus = trimmedKey ? (status === 'connected' ? 'connected' : 'connected') : 'unconfigured';

    const payload: GoogleAiIntegrationSettings = {
      enabled,
      apiKey: trimmedKey,
      defaultModel,
      status: newStatus,
      ...(effectiveCompanyId !== 'default' ? { companyId: effectiveCompanyId } : {}),
      ...(lastTestedAt ? { lastTestedAt } : {}),
      updatedAt: now,
      updatedByEmail: user?.email || 'admin',
    };

    try {
      // 1. Save to Firestore under company-scoped settings doc
      if (isFirebaseConfigured && db) {
        const docRef = doc(db, 'settings', firestoreDocId);
        await setDoc(docRef, payload, { merge: true });
      }

      // 2. Save to LocalStorage fallback (both company-scoped and default key for immediate Match Matrix access)
      localStorage.setItem(localStorageKey, JSON.stringify(payload));
      localStorage.setItem('picklepoint_google_ai_config', JSON.stringify(payload));

      setStatus(newStatus);
      setUpdatedAt(now);
      setUpdatedByEmail(user?.email || 'admin');
      setSaveSuccess('AI Match Matrix integration settings saved!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to save Google AI Studio configuration:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save configuration to Firestore.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  // Clear / Delete Key
  const handleClearKey = () => {
    if (window.confirm('Are you sure you want to remove the Google AI Studio API key? Match Matrix will revert to the standard system generator.')) {
      setApiKey('');
      setStatus('unconfigured');
      setTestResult(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse">
        <RefreshCw className="w-8 h-8 text-brand-lime animate-spin mb-3" />
        <span className="text-slate-400 font-semibold text-sm">Loading AI Integration Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Top Access & Facility Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10">
            <Sparkles className="w-4 h-4 text-dark-bg" />
            <span>Google AI Studio — Match Matrix AI</span>
          </div>
          {companyProfile?.name && (
            <span className="text-xs font-bold text-slate-400 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              {companyProfile.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] font-bold text-emerald-300">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Client Admin & Manager Access</span>
        </div>
      </div>

      {/* Hero / Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-40 h-40 bg-brand-lime/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-brand-lime/20 border border-purple-500/30 text-purple-300 shadow-inner">
                <Sparkles className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Google AI Studio (Gemini)</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Match Matrix AI
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Enable your Client Admin and Managers to generate Open Play Match Matrix pairings using Google Gemini AI instead of the default system algorithm.
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge Card */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 self-start md:self-auto">
            <div className="space-y-0.5 text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Integration Status</div>
              <div className="flex items-center gap-2 justify-end">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    enabled && apiKey.trim() && status !== 'error'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                      : status === 'error'
                      ? 'bg-red-400 shadow-sm shadow-red-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span
                  className={`text-xs font-black uppercase tracking-wide ${
                    enabled && apiKey.trim() && status !== 'error'
                      ? 'text-emerald-400'
                      : status === 'error'
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {!enabled
                    ? 'Disabled (System Default)'
                    : status === 'error'
                    ? 'Error / Check Key'
                    : apiKey.trim()
                    ? 'Active for Match Matrix'
                    : 'Not Configured'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
            <Zap className="w-4 h-4 text-brand-lime flex-shrink-0" />
            <span>AI Match Matrix vs System Generator</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
            <Cpu className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Smart DUPR Parity & Sit-Out Fairness</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
            <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Shared Across Client Admin & Managers</span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Option Toggle: Use AI Integration for Match Matrix */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h4 className="text-base sm:text-lg font-bold text-white">
                Use AI Integration for Match Matrix
              </h4>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {enabled ? 'Enabled' : 'Off — System Default'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              When enabled, Client Admins and Managers can choose to generate Open Play matches using Google AI instead of the built-in system algorithm. Turn off anytime to exclusively use the standard system generator.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enabled ? 'bg-brand-lime' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* API Key Configuration Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-brand-lime" />
                Google AI Studio API Key
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your facility&apos;s Google AI Studio API key. Both Client Admin and Managers in your venue will automatically use this key when generating AI matches.
              </p>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>Get API Key from Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Key Input Field with Show/Hide & Copy */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              API Key {enabled && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 pr-28 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime transition-all"
                autoComplete="off"
                spellCheck="false"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy Key"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-brand-lime" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? 'Hide Key' : 'Reveal Key'}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    title="Clear Key"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Keys start with <code className="text-slate-400 font-mono">AIzaSy...</code> from Google AI Studio. Free tier keys are supported.
            </p>
          </div>

          {/* Model Selection Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Gemini Model for Match Matrix Generation
              </label>
              <span className="text-[11px] text-slate-500 font-mono">Selected: {defaultModel}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = defaultModel === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setDefaultModel(model.id)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2.5 ${
                      isSelected
                        ? 'bg-purple-950/20 border-purple-500/60 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-300' : 'text-slate-500'}`} />
                        <span>{model.name}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${model.badgeColor}`}>
                        {model.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed min-h-[36px]">
                      {model.description}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Speed: {model.speed}</span>
                      <span>Context: {model.context}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test & Save Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              disabled={testing || !apiKey.trim()}
              onClick={handleTestConnection}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                testing || !apiKey.trim()
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 hover:border-slate-600 shadow-sm'
              }`}
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                  <span>Validating API Key...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                saving
                  ? 'bg-brand-lime/50 text-dark-bg cursor-not-allowed'
                  : 'bg-brand-lime hover:bg-brand-lime/90 text-dark-bg shadow-lg shadow-brand-lime/10'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save AI Integration Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Alerts & Results */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center gap-3 text-xs sm:text-sm animate-fade-in shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 flex items-center gap-3 text-xs sm:text-sm animate-fade-in shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-md ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/30 border-red-500/40 text-red-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>{testResult.success ? 'Connection Verified' : 'Validation Failed'}</span>
                {testResult.latencyMs && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300">
                    {testResult.latencyMs}ms latency
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">{testResult.message}</p>
              {testResult.timestamp && (
                <div className="text-[10px] text-slate-400 pt-1 font-mono">
                  Checked at: {testResult.timestamp}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security & Audit Card */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Facility AI Credential Vault</div>
              <div className="text-[11px] text-slate-400">
                Scoped to your venue (<code className="text-slate-300 font-mono">settings/{firestoreDocId}</code>) so Client Admins and Managers can seamlessly generate AI matches in Match Matrix.
              </div>
            </div>
          </div>

          {updatedAt && (
            <div className="text-[11px] text-slate-500 font-mono self-end sm:self-auto flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Last saved: {new Date(updatedAt).toLocaleString()} {updatedByEmail && `by ${updatedByEmail}`}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
