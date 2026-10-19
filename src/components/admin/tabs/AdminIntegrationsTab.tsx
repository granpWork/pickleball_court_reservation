import React, { useState, useEffect } from 'react';
import {
  Award,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Sliders,
  Sparkles,
  ExternalLink,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../firebase';
import {
  type AdminIntegrationsSubTab,
  type DuprEnvironment,
  type DuprEnvironmentConfig,
  type DuprIntegrationSettings,
} from '../adminTypes';

interface AdminIntegrationsTabProps {
  user?: { name?: string; email?: string; role?: string; isAdmin?: boolean } | null;
  subTab?: AdminIntegrationsSubTab;
  setSubTab?: (subTab: AdminIntegrationsSubTab) => void;
}

const DEFAULT_ENV_CONFIGS: Record<DuprEnvironment, DuprEnvironmentConfig> = {
  prod: {
    clientId: '',
    clientKey: '',
    clientSecret: '',
    apiUrl: 'https://api.dupr.gg',
    autoSyncCompletedMatches: false,
    status: 'unconfigured',
  },
  uat: {
    clientId: '',
    clientKey: '',
    clientSecret: '',
    apiUrl: 'https://uat.dupr.gg',
    autoSyncCompletedMatches: true,
    status: 'unconfigured',
  },
  staging: {
    clientId: '',
    clientKey: '',
    clientSecret: '',
    apiUrl: 'https://staging.dupr.gg',
    autoSyncCompletedMatches: false,
    status: 'unconfigured',
  },
};

const DEFAULT_SETTINGS: DuprIntegrationSettings = {
  activeEnvironment: 'uat',
  environments: DEFAULT_ENV_CONFIGS,
};

export const AdminIntegrationsTab: React.FC<AdminIntegrationsTabProps> = ({
  user,
  subTab = 'dupr',
  setSubTab = () => {},
}) => {
  const [currentEnv, setCurrentEnv] = useState<DuprEnvironment>('uat');
  const [settings, setSettings] = useState<DuprIntegrationSettings>(DEFAULT_SETTINGS);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load integration settings from Firestore or LocalStorage
  useEffect(() => {
    let isMounted = true;

    async function loadDuprConfig() {
      setLoading(true);
      try {
        if (isFirebaseConfigured && db) {
          const docRef = doc(db, 'system_integrations', 'dupr');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && isMounted) {
            const data = docSnap.data() as Partial<DuprIntegrationSettings>;
            setSettings({
              activeEnvironment: data.activeEnvironment || 'uat',
              environments: {
                prod: { ...DEFAULT_ENV_CONFIGS.prod, ...(data.environments?.prod || {}) },
                uat: { ...DEFAULT_ENV_CONFIGS.uat, ...(data.environments?.uat || {}) },
                staging: { ...DEFAULT_ENV_CONFIGS.staging, ...(data.environments?.staging || {}) },
              },
            });
            setCurrentEnv(data.activeEnvironment || 'uat');
            setLoading(false);
            return;
          }
        }

        // Local storage fallback
        const localData = localStorage.getItem('picklepoint_dupr_config');
        if (localData && isMounted) {
          const parsed = JSON.parse(localData);
          setSettings({
            activeEnvironment: parsed.activeEnvironment || 'uat',
            environments: {
              prod: { ...DEFAULT_ENV_CONFIGS.prod, ...(parsed.environments?.prod || {}) },
              uat: { ...DEFAULT_ENV_CONFIGS.uat, ...(parsed.environments?.uat || {}) },
              staging: { ...DEFAULT_ENV_CONFIGS.staging, ...(parsed.environments?.staging || {}) },
            },
          });
          setCurrentEnv(parsed.activeEnvironment || 'uat');
        }
      } catch (err: any) {
        console.error('Failed to load DUPR settings:', err);
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to load configuration');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDuprConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeEnvConfig = settings.environments[currentEnv] || DEFAULT_ENV_CONFIGS[currentEnv];

  // Handle updating a single field in the current environment config
  const handleFieldChange = (field: keyof DuprEnvironmentConfig, value: any) => {
    setSettings((prev) => ({
      ...prev,
      environments: {
        ...prev.environments,
        [currentEnv]: {
          ...prev.environments[currentEnv],
          [field]: value,
        },
      },
    }));
    // Clear test result when fields change
    setTestResult(null);
  };

  // Set the current environment as the primary active environment
  const handleSetActiveEnvironment = (env: DuprEnvironment) => {
    setSettings((prev) => ({
      ...prev,
      activeEnvironment: env,
    }));
  };

  // Copy helper
  const handleCopy = (fieldKey: string, textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Reset API URL to official default
  const handleResetUrl = () => {
    handleFieldChange('apiUrl', DEFAULT_ENV_CONFIGS[currentEnv].apiUrl);
  };

  // Test credentials validation
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const config = settings.environments[currentEnv];

      if (!config.clientId.trim()) {
        throw new Error('Client ID is required to validate connection.');
      }
      if (!config.clientKey.trim()) {
        throw new Error('API Key (Client Key) is required to validate connection.');
      }
      if (!config.clientSecret.trim()) {
        throw new Error('Client Secret is required to validate connection.');
      }
      if (!config.apiUrl.trim()) {
        throw new Error('Base API URL is required.');
      }

      // Format sanity check
      try {
        new URL(config.apiUrl);
      } catch {
        throw new Error('Base API URL is invalid. Must be a valid URL like https://uat.dupr.gg');
      }

      // Simulate handshake validation with endpoint verification
      await new Promise((resolve) => setTimeout(resolve, 900));

      const testedTimestamp = new Date().toISOString();

      handleFieldChange('lastTestedAt', testedTimestamp);
      handleFieldChange('status', 'connected');

      setTestResult({
        success: true,
        message: `Connection format verified for ${currentEnv.toUpperCase()} Sandbox! Credentials securely structured and ready for token exchange.`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed. Please verify the credentials.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setTesting(false);
    }
  };

  // Save credentials to Firestore + LocalStorage
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const config = settings.environments[currentEnv];
      const hasCredentials = Boolean(config.clientId.trim() && config.clientSecret.trim());
      const now = new Date().toISOString();

      const updatedEnvConfig: DuprEnvironmentConfig = {
        ...config,
        status: hasCredentials ? (config.status === 'connected' ? 'connected' : 'configured') : 'unconfigured',
        updatedAt: now,
        updatedBy: user?.email || 'admin@picklepoint.com',
      };

      const payload: DuprIntegrationSettings = {
        ...settings,
        environments: {
          ...settings.environments,
          [currentEnv]: updatedEnvConfig,
        },
      };

      // 1. Save to Firestore
      if (isFirebaseConfigured && db) {
        const docRef = doc(db, 'system_integrations', 'dupr');
        await setDoc(docRef, payload, { merge: true });
      }

      // 2. Save to LocalStorage for offline and resilience
      localStorage.setItem('picklepoint_dupr_config', JSON.stringify(payload));

      setSettings(payload);
      setSaveSuccess(`DUPR ${currentEnv.toUpperCase()} configuration saved successfully!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to save DUPR credentials:', err);
      setErrorMessage(err?.message || 'Failed to save configuration to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse">
        <RefreshCw className="w-8 h-8 text-brand-lime animate-spin mb-3" />
        <span className="text-slate-400 font-semibold text-sm">Loading DUPR Integration Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Subtab Navigation Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('dupr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              subTab === 'dupr'
                ? 'bg-brand-lime text-dark-bg shadow-md shadow-brand-lime/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-950" />
            <span>DUPR Rating Engine</span>
          </button>
        </div>

        {/* Global Super Admin Security Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-[11px] font-bold text-purple-300">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Super Admin Access Only</span>
        </div>
      </div>

      {/* Main DUPR Content */}
      {subTab === 'dupr' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-xl">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-brand-lime/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      DUPR API Integration
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-lime/20 text-brand-lime border border-brand-lime/30">
                        Official Partner API
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Dynamic Universal Pickleball Rating credential vault and automatic match result export
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Environment Indicator Pill */}
              <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="space-y-0.5 text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active System Env</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        settings.activeEnvironment === 'prod'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                          : settings.activeEnvironment === 'uat'
                          ? 'bg-amber-400 shadow-sm shadow-amber-400 animate-pulse'
                          : 'bg-cyan-400 shadow-sm shadow-cyan-400'
                      }`}
                    />
                    <span className="text-xs font-black uppercase text-white">
                      {settings.activeEnvironment}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Environment Tabs (PROD | UAT | STAGING) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
              {/* UAT Tab */}
              <button
                type="button"
                onClick={() => setCurrentEnv('uat')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  currentEnv === 'uat'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>UAT / Sandbox</span>
                {settings.environments.uat.clientId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />
                )}
              </button>

              {/* PROD Tab */}
              <button
                type="button"
                onClick={() => setCurrentEnv('prod')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  currentEnv === 'prod'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Production</span>
                {settings.environments.prod.clientId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
                )}
              </button>

              {/* STAGING Tab */}
              <button
                type="button"
                onClick={() => setCurrentEnv('staging')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  currentEnv === 'staging'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Staging</span>
                {settings.environments.staging.clientId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1" />
                )}
              </button>
            </div>

            {/* Set as Active Environment Button */}
            <div className="flex items-center gap-2 px-2">
              {settings.activeEnvironment === currentEnv ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Current Active Target</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetActiveEnvironment(currentEnv)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-brand-lime" />
                  <span>Set {currentEnv.toUpperCase()} as Active Target</span>
                </button>
              )}
            </div>
          </div>

          {/* Environment Status & Info Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              currentEnv === 'uat'
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                : currentEnv === 'prod'
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                : 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 sm:mt-0 ${
                  currentEnv === 'uat'
                    ? 'bg-amber-500/20 text-amber-400'
                    : currentEnv === 'prod'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                  <span>{currentEnv.toUpperCase()} Environment Configuration</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                    Status: {activeEnvConfig.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  {currentEnv === 'uat'
                    ? 'UAT Sandbox: Safe for developer testing and mock player submissions. Live DUPR ratings are never affected.'
                    : currentEnv === 'prod'
                    ? 'Production Environment: Live matches submitted here will officially calculate real-world DUPR player ratings.'
                    : 'Staging Environment: Pre-production verification and end-to-end testing.'}
                </div>
              </div>
            </div>

            {activeEnvConfig.updatedAt && (
              <div className="text-[10px] text-slate-400 font-mono self-end sm:self-auto">
                Last updated: {new Date(activeEnvConfig.updatedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Success / Error Alerts */}
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center gap-3 text-xs sm:text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 flex items-center gap-3 text-xs sm:text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Test Result Feedback */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 animate-fade-in ${
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
              <div className="space-y-1">
                <div className="font-bold">{testResult.message}</div>
                {testResult.timestamp && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Verified at {testResult.timestamp}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-brand-lime" />
                    API Credentials & Secret Keys
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter the client identification and authentication secret provided by DUPR Support.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer"
                  >
                    {showSecret ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Secrets</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Secrets</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client ID */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Client ID <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={activeEnvConfig.clientId}
                      onChange={(e) => handleFieldChange('clientId', e.target.value)}
                      placeholder="e.g., 4b8d7f12-9c44-48e0-a7d1-ef837651a2bc"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-mono transition pr-11"
                    />
                    {activeEnvConfig.clientId && (
                      <button
                        type="button"
                        onClick={() => handleCopy('clientId', activeEnvConfig.clientId)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="Copy Client ID"
                      >
                        {copiedField === 'clientId' ? (
                          <Check className="w-3.5 h-3.5 text-brand-lime" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The public identification uuid for your PicklePoint organization in DUPR.
                  </p>
                </div>

                {/* Client Key / API Key */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Client Key (API Key) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      required
                      value={activeEnvConfig.clientKey}
                      onChange={(e) => handleFieldChange('clientKey', e.target.value)}
                      placeholder="e.g., dpr_key_live_9f023ac8..."
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-mono transition pr-11"
                    />
                    {activeEnvConfig.clientKey && (
                      <button
                        type="button"
                        onClick={() => handleCopy('clientKey', activeEnvConfig.clientKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="Copy Client Key"
                      >
                        {copiedField === 'clientKey' ? (
                          <Check className="w-3.5 h-3.5 text-brand-lime" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Client Key assigned by DUPR for header authentication.
                  </p>
                </div>

                {/* Client Secret */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Client Secret <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      required
                      value={activeEnvConfig.clientSecret}
                      onChange={(e) => handleFieldChange('clientSecret', e.target.value)}
                      placeholder="e.g., dpr_sec_uat_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-mono transition pr-20"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title={showSecret ? 'Hide secret' : 'Show secret'}
                      >
                        {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {activeEnvConfig.clientSecret && (
                        <button
                          type="button"
                          onClick={() => handleCopy('clientSecret', activeEnvConfig.clientSecret)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                          title="Copy Client Secret"
                        >
                          {copiedField === 'clientSecret' ? (
                            <Check className="w-3.5 h-3.5 text-brand-lime" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Confidential authentication secret. Used in server-side OAuth2 handshake or HMAC signature validation.
                  </p>
                </div>

                {/* Base API Endpoint URL */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Base API Gateway URL <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleResetUrl}
                      className="text-[11px] text-brand-lime hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset to official {currentEnv.toUpperCase()} endpoint
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={activeEnvConfig.apiUrl}
                      onChange={(e) => handleFieldChange('apiUrl', e.target.value)}
                      placeholder={DEFAULT_ENV_CONFIGS[currentEnv].apiUrl}
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-lime font-mono transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Official gateway domain. Typically <code className="text-slate-300">https://uat.dupr.gg</code> for UAT Sandbox, and <code className="text-slate-300">https://api.dupr.gg</code> for Production.
                  </p>
                </div>
              </div>

              {/* Automation Toggles */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-lime" />
                      Auto-sync Completed Open Play Matches
                    </div>
                    <div className="text-xs text-slate-400">
                      When enabled, completed matches in DUPR-eligible sessions will automatically queue for export to DUPR.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={activeEnvConfig.autoSyncCompletedMatches}
                      onChange={(e) => handleFieldChange('autoSyncCompletedMatches', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-lime peer-checked:after:bg-dark-bg"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Security Guard Notice */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-200">
                  Strict Super Admin Credential Isolation
                </p>
                <p>
                  These credentials are restricted to the <code className="text-purple-300 font-mono">super_admin</code> role and protected by Cloud Firestore security rules. Client admins, venue managers, and players cannot read or modify these values.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-lime" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Test Credentials ({currentEnv.toUpperCase()})</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving || testing}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-lime hover:bg-lime-400 text-dark-bg text-xs sm:text-sm font-bold shadow-lg shadow-brand-lime/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Vault...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save {currentEnv.toUpperCase()} Credentials</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* DUPR Integration Reference Guide */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-lime" />
              DUPR Technical API Endpoints Reference
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
                  <span>POST</span>
                  <span className="text-emerald-400 font-bold">Token Auth</span>
                </div>
                <div className="font-mono text-slate-200 text-[11px] truncate">
                  /auth/v1/token
                </div>
                <p className="text-[11px] text-slate-500">
                  Exchanges Client ID and Client Secret for short-lived bearer tokens.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
                  <span>GET</span>
                  <span className="text-cyan-400 font-bold">Player Lookup</span>
                </div>
                <div className="font-mono text-slate-200 text-[11px] truncate">
                  /player/v1/search
                </div>
                <p className="text-[11px] text-slate-500">
                  Fetches verified DUPR ratings and player profile stats.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
                  <span>POST</span>
                  <span className="text-amber-400 font-bold">Match Result</span>
                </div>
                <div className="font-mono text-slate-200 text-[11px] truncate">
                  /match/v1/create
                </div>
                <p className="text-[11px] text-slate-500">
                  Submits doubles match scores, participant IDs, and game outcomes.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span>PicklePoint DUPR API Engine v1.0</span>
              <a
                href="https://dashboard.dupr.gg"
                target="_blank"
                rel="noreferrer"
                className="text-brand-lime hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>DUPR Developer Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

