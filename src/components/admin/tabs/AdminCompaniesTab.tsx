import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  MailPlus,
  Check,
  X,
  Trash2,
  Globe,
  MapPin,
  ShieldCheck,
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  CreditCard,
  ArrowLeft,
  Users,
  Layers,
  Mail,
  ExternalLink,
  Clock,
  ChevronDown,
  Gift,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import {
  type Company,
  type SubscriptionPlan,
  type SubscriptionStatus,
  getEffectiveSubscriptionExpiry,
  isSubscriptionExpired,
  getSubscriptionRemainingDays,
} from '../adminTypes';

interface AdminCompaniesTabProps {
  companies: Company[];
  courts?: any[];
  users?: any[];
  onOpenOnboardModal: () => void;
  onOpenInviteModal?: (company?: Company) => void;
  onApproveCompany?: (companyId: string) => void;
  onRejectCompany?: (companyId: string) => void;
  onDeleteCompany?: (companyId: string) => void;
  onUpdateCompanySubscription?: (
    companyId: string,
    payload: Partial<Company> | any
  ) => void;
}

export interface ClientLead {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  facilityName: string;
  courtCount?: number | string;
  cityLocation?: string;
  socialPlatform?: string;
  socialUrl?: string;
  notes?: string;
  status?: string;
  isFreeEarlyAccess?: boolean;
  appliedAt?: any;
}

export const AdminCompaniesTab: React.FC<AdminCompaniesTabProps> = ({
  companies,
  courts = [],
  users = [],
  onOpenOnboardModal,
  onOpenInviteModal,
  onApproveCompany,
  onRejectCompany,
  onDeleteCompany,
  onUpdateCompanySubscription,
}) => {
  // Page View Navigation State: null = Roster List Page, Company = Full Details Page
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<Company | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'licensing' | 'profile' | 'courts' | 'team'>('licensing');

  // Client Leads & Venue Applications State
  const [clientLeads, setClientLeads] = useState<ClientLead[]>([]);

  const fetchClientLeads = async () => {
    const leadsMap = new Map<string, ClientLead>();

    // 1. Read LocalStorage Fallback Leads
    try {
      const localStr = localStorage.getItem('picklepoint_venue_leads');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((l: any) => {
            if (l.email) leadsMap.set(l.email.toLowerCase(), l);
          });
        }
      }
    } catch (e) {}

    // 2. Read Cloud Firestore Leads
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'client_leads'));
        snap.forEach((docSnap) => {
          const data = docSnap.data() as ClientLead;
          const leadId = docSnap.id;
          leadsMap.set(data.email ? data.email.toLowerCase() : leadId, { ...data, id: leadId });
        });
      } catch (e) {
        console.warn('Error fetching client leads:', e);
      }
    }

    const leads = Array.from(leadsMap.values());
    leads.sort((a, b) => {
      const tA = (a.appliedAt?.seconds ? a.appliedAt.seconds * 1000 : new Date(a.appliedAt || 0).getTime());
      const tB = (b.appliedAt?.seconds ? b.appliedAt.seconds * 1000 : new Date(b.appliedAt || 0).getTime());
      return tB - tA;
    });
    setClientLeads(leads);
  };

  useEffect(() => {
    fetchClientLeads();
  }, []);

  const handleApproveLeadAndInvite = async (lead: ClientLead) => {
    if (onOpenInviteModal) {
      onOpenInviteModal({
        id: '',
        name: lead.facilityName,
        clientAdminEmail: lead.email,
        phone: lead.phone || '',
        city: lead.cityLocation || '',
      } as any);
    }

    if (isFirebaseConfigured && db && lead.id) {
      try {
        await updateDoc(doc(db, 'client_leads', lead.id), {
          status: 'invited',
        });
        setClientLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, status: 'invited' } : l))
        );
      } catch (e) {
        console.warn('Error updating lead status:', e);
      }
    }
  };

  // Form State for Editing Subscription
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('trial');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('active');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Force Termination Modal States
  const [showForceTerminateModal, setShowForceTerminateModal] = useState(false);
  const [forceTerminateReasonInput, setForceTerminateReasonInput] = useState('');
  const [targetCompanyToForceTerminate, setTargetCompanyToForceTerminate] = useState<Company | null>(null);

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const handleExecuteDeleteCompany = (company?: Company | null) => {
    const compToDelete = company || companyToDelete || selectedCompanyForView;
    if (!compToDelete || !onDeleteCompany) return;

    onDeleteCompany(compToDelete.id);
    setShowDeleteModal(false);
    setCompanyToDelete(null);
    if (selectedCompanyForView && selectedCompanyForView.id === compToDelete.id) {
      setSelectedCompanyForView(null);
    }
  };

  const handleOpenCompanyPage = (company: Company, defaultTab: 'licensing' | 'profile' | 'courts' | 'team' = 'licensing') => {
    setSelectedCompanyForView(company);
    setActiveSubTab(defaultTab);
    setEditPlan(company.subscriptionPlan || (company.isTrialClient ? 'trial' : 'monthly'));
    setEditStatus(company.subscriptionStatus || 'active');

    const effectiveExpiry = getEffectiveSubscriptionExpiry(company);
    if (effectiveExpiry) {
      setEditExpiryDate(effectiveExpiry.toISOString().split('T')[0]);
    } else {
      setEditExpiryDate('');
    }
    setSaveSuccessMsg(false);

    // Scroll to top of tab container
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setEditPlan(plan);
    const d = new Date();
    if (plan === 'monthly' || plan === 'trial') {
      d.setMonth(d.getMonth() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEditExpiryDate(`${year}-${month}-${day}`);
    } else if (plan === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEditExpiryDate(`${year}-${month}-${day}`);
    } else if (plan === 'lifetime') {
      setEditExpiryDate('');
    }
  };

  const handleSaveSubscriptionChanges = () => {
    if (!selectedCompanyForView || !onUpdateCompanySubscription) return;

    let isoExpiry: string = '';
    if (editPlan !== 'lifetime' && editExpiryDate) {
      const [year, month, day] = editExpiryDate.split('-').map(Number);
      if (year && month && day) {
        const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
        isoExpiry = localEnd.toISOString();
      } else {
        isoExpiry = new Date(`${editExpiryDate}T23:59:59.000Z`).toISOString();
      }
    } else if (editStatus === 'expired') {
      isoExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }

    const isTrial = editPlan === 'trial';
    const isForceTerm = editStatus === 'expired' || (selectedCompanyForView.forceTerminated && editStatus !== 'active');

    const updatedData = {
      ...selectedCompanyForView,
      subscriptionPlan: editPlan,
      subscriptionStatus: editStatus,
      subscriptionExpiresAt: isoExpiry,
      isTrialClient: isTrial,
      trialExpiresAt: isTrial ? isoExpiry : '',
      forceTerminated: isForceTerm,
      forceTerminatedAt: isForceTerm ? (selectedCompanyForView.forceTerminatedAt || new Date().toISOString()) : '',
      forceTerminatedReason: isForceTerm ? (selectedCompanyForView.forceTerminatedReason || 'Marked as expired by Super Admin') : '',
    };

    onUpdateCompanySubscription(selectedCompanyForView.id, updatedData);

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);

    // Update current selected company state
    setSelectedCompanyForView((prev) =>
      prev
        ? {
            ...prev,
            ...updatedData,
          }
        : null
    );
  };

  const handleExecuteForceEndSubscription = (company?: Company | null) => {
    const compToUpdate = company || selectedCompanyForView;
    if (!compToUpdate || !onUpdateCompanySubscription) return;

    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const yesterdayDateStr = yesterdayIso.split('T')[0];

    const updatedData = {
      ...compToUpdate,
      subscriptionPlan: (compToUpdate.subscriptionPlan || 'monthly') as SubscriptionPlan,
      subscriptionStatus: 'expired' as SubscriptionStatus,
      subscriptionExpiresAt: yesterdayIso,
      isTrialClient: false,
      trialExpiresAt: yesterdayIso,
      forceTerminated: true,
      forceTerminatedAt: new Date().toISOString(),
      forceTerminatedReason: forceTerminateReasonInput.trim() || 'Force ended by Super Admin',
    };

    onUpdateCompanySubscription(compToUpdate.id, updatedData);

    if (selectedCompanyForView && selectedCompanyForView.id === compToUpdate.id) {
      setSelectedCompanyForView((prev) => (prev ? { ...prev, ...updatedData } : null));
      setEditStatus('expired');
      setEditExpiryDate(yesterdayDateStr);
    }

    setShowForceTerminateModal(false);
    setTargetCompanyToForceTerminate(null);
    setForceTerminateReasonInput('');
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 4000);
  };

  const handleReactivateCompanySubscription = (company?: Company | null) => {
    const compToUpdate = company || selectedCompanyForView;
    if (!compToUpdate || !onUpdateCompanySubscription) return;

    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const year = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const localEnd = new Date(year, d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const reactivateExpiryIso = localEnd.toISOString();
    const planToRestore: SubscriptionPlan = compToUpdate.subscriptionPlan === 'lifetime' ? 'lifetime' : (compToUpdate.subscriptionPlan || 'monthly');

    const updatedData = {
      ...compToUpdate,
      subscriptionPlan: planToRestore,
      subscriptionStatus: 'active' as SubscriptionStatus,
      subscriptionExpiresAt: planToRestore === 'lifetime' ? '' : reactivateExpiryIso,
      isTrialClient: false,
      trialExpiresAt: '',
      forceTerminated: false,
      forceTerminatedAt: '',
      forceTerminatedReason: '',
      cancelReason: '',
      cancelRequestedAt: '',
    };

    onUpdateCompanySubscription(compToUpdate.id, updatedData);

    if (selectedCompanyForView && selectedCompanyForView.id === compToUpdate.id) {
      setSelectedCompanyForView((prev) => (prev ? { ...prev, ...updatedData } : null));
      setEditStatus('active');
      setEditPlan(planToRestore);
      setEditExpiryDate(planToRestore === 'lifetime' ? '' : dateStr);
    }

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 4000);
  };

  const handleToggleCompanyStatus = (company: Company, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentStatus = company.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    if (onUpdateCompanySubscription) {
      onUpdateCompanySubscription(company.id, { status: newStatus });
    } else if (newStatus === 'active' && onApproveCompany) {
      onApproveCompany(company.id);
    } else if (newStatus === 'inactive' && onRejectCompany) {
      onRejectCompany(company.id);
    }

    if (selectedCompanyForView && selectedCompanyForView.id === company.id) {
      setSelectedCompanyForView((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const renderStatusToggleSwitch = (company: Company) => {
    const currentStatus = company.status || 'active';
    const isActive = currentStatus === 'active';
    return (
      <button
        type="button"
        onClick={(e) => handleToggleCompanyStatus(company, e)}
        title={isActive ? 'Click to Deactivate Facility' : 'Click to Activate Facility'}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black transition-all cursor-pointer shadow-md select-none ${
          isActive
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
            : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
        }`}
      >
        <span className="capitalize">{currentStatus}</span>
        <div
          className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
            isActive ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${
              isActive ? 'translate-x-3' : 'translate-x-0'
            }`}
          />
        </div>
      </button>
    );
  };

  const renderSubscriptionBadge = (company: Company) => {
    const isExpired = isSubscriptionExpired(company);
    const plan = company.subscriptionPlan || (company.isTrialClient ? 'trial' : 'monthly');
    const daysLeft = getSubscriptionRemainingDays(company);

    if (company.forceTerminated) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-950 text-rose-300 border border-rose-500/50 gap-1 shadow-sm">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> Force Terminated
        </span>
      );
    }

    if (company.subscriptionStatus === 'canceled' && !isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30 gap-1">
          <Clock className="w-3 h-3" /> Canceled ({daysLeft !== null ? `${daysLeft}d left` : 'Pending Expiry'})
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30 gap-1">
          <AlertTriangle className="w-3 h-3" /> Expired
        </span>
      );
    }

    if (plan === 'lifetime') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/30 gap-1">
          <Sparkles className="w-3 h-3" /> Lifetime
        </span>
      );
    }

    if (plan === 'trial' || company.isTrialClient) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30 gap-1">
          <Zap className="w-3 h-3" /> Trial {daysLeft !== null ? `(${daysLeft}d left)` : ''}
        </span>
      );
    }

    if (plan === 'yearly') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 gap-1">
          <Calendar className="w-3 h-3" /> Yearly {daysLeft !== null ? `(${daysLeft}d left)` : ''}
        </span>
      );
    }

    // Default Monthly
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 gap-1">
        <CreditCard className="w-3 h-3" /> Monthly {daysLeft !== null ? `(${daysLeft}d left)` : ''}
      </span>
    );
  };

  // Filter linked courts & team members for the selected company
  const companyCourts = selectedCompanyForView
    ? courts.filter(
        (c) =>
          c.companyId === selectedCompanyForView.id ||
          (c.ownerEmail && c.ownerEmail.toLowerCase() === selectedCompanyForView.clientAdminEmail.toLowerCase())
      )
    : [];

  const companyTeam = selectedCompanyForView
    ? users.filter(
        (u) =>
          u.companyId === selectedCompanyForView.id ||
          (u.email && u.email.toLowerCase() === selectedCompanyForView.clientAdminEmail.toLowerCase())
      )
    : [];

  // =========================================================================
  // VIEW 1: FULL-PAGE COMPANY DETAILS VIEW
  // =========================================================================
  if (selectedCompanyForView) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top Breadcrumb Header Bar */}
        <div className="flex items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
          <button
            onClick={() => setSelectedCompanyForView(null)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-extrabold text-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-brand-lime" />
            <span>Back to Companies Roster</span>
          </button>

          <div className="flex items-center space-x-3">
            {onOpenInviteModal && (
              <button
                onClick={() => onOpenInviteModal(selectedCompanyForView)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
              >
                <MailPlus className="w-4 h-4 text-brand-lime" />
                <span>Invite Staff to Facility</span>
              </button>
            )}
            {onDeleteCompany && (
              <button
                type="button"
                onClick={() => {
                  setCompanyToDelete(selectedCompanyForView);
                  setShowDeleteModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 font-extrabold text-xs transition-all cursor-pointer shadow-md"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Company</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Company Banner */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#0b0f19] to-slate-950 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime font-bold shadow-lg flex-shrink-0">
                {selectedCompanyForView.logoUrl ? (
                  <img
                    src={selectedCompanyForView.logoUrl}
                    alt={selectedCompanyForView.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Building2 className="w-8 h-8" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black text-white">{selectedCompanyForView.name}</h2>
                  {renderSubscriptionBadge(selectedCompanyForView)}
                  {renderStatusToggleSwitch(selectedCompanyForView)}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {selectedCompanyForView.address || 'Address On File'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-brand-lime">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedCompanyForView.clientAdminEmail}
                  </span>
                  {selectedCompanyForView.subdomain && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{selectedCompanyForView.subdomain}.picklepoint.ph</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Sub-Tabs Switcher */}
        <div className="flex border-b border-slate-800 glass-panel px-6 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('licensing')}
            className={`py-4 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'licensing'
                ? 'border-brand-lime text-brand-lime'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Licensing & Subscription Management</span>
          </button>

          <button
            onClick={() => setActiveSubTab('profile')}
            className={`py-4 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'profile'
                ? 'border-brand-lime text-brand-lime'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Facility Profile</span>
          </button>

          <button
            onClick={() => setActiveSubTab('courts')}
            className={`py-4 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'courts'
                ? 'border-brand-lime text-brand-lime'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Registered Courts ({companyCourts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('team')}
            className={`py-4 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'team'
                ? 'border-brand-lime text-brand-lime'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff & Team ({companyTeam.length})</span>
          </button>
        </div>

        {/* SUB-PAGE 1: LICENSING & SUBSCRIPTION MANAGEMENT */}
        {activeSubTab === 'licensing' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-8 animate-fade-in shadow-2xl">
            {/* Active Plan Summary Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">CURRENT LICENSING TIER</span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-white capitalize">{editPlan} Plan</span>
                  {renderSubscriptionBadge(selectedCompanyForView)}
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">LICENSING EXPIRATION DATE</span>
                <p className="text-sm font-mono font-bold text-brand-lime">
                  {editPlan === 'lifetime'
                    ? 'Never Expires (Permanent Access)'
                    : editExpiryDate
                    ? new Date(editExpiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'No Date Set'}
                </p>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-extrabold flex items-center gap-3 animate-fade-in shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Subscription successfully updated! Licensing changes have been synced across Firestore and Client Admin user accounts.</span>
              </div>
            )}

            {/* Select Subscription Plan */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                1. Select Platform Licensing Tier *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => handleSelectPlan('trial')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    editPlan === 'trial'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Zap className="w-6 h-6 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Temporary</span>
                  </div>
                  <div>
                    <span className="text-sm font-black block text-white">⚡ Trial Access</span>
                    <span className="text-xs opacity-80 mt-1 block">Configurable evaluation period for demo & testing.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPlan('monthly')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    editPlan === 'monthly'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-xl shadow-emerald-500/10'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <CreditCard className="w-6 h-6 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Monthly</span>
                  </div>
                  <div>
                    <span className="text-sm font-black block text-white">📅 Monthly License</span>
                    <span className="text-xs opacity-80 mt-1 block">Recurring 30-day facility subscription.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPlan('yearly')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    editPlan === 'yearly'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-xl shadow-cyan-500/10'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Calendar className="w-6 h-6 text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Annual</span>
                  </div>
                  <div>
                    <span className="text-sm font-black block text-white">🗓️ Yearly License</span>
                    <span className="text-xs opacity-80 mt-1 block">Annual 365-day enterprise license.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPlan('lifetime')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    editPlan === 'lifetime'
                      ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-xl shadow-purple-500/10'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Permanent</span>
                  </div>
                  <div>
                    <span className="text-sm font-black block text-white">♾️ Lifetime Access</span>
                    <span className="text-xs opacity-80 mt-1 block">Unrestricted access with no expiry date.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Subscription Status Dropdown */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                2. Subscription Access Status *
              </label>
              <div className="relative max-w-md">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs font-extrabold focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 cursor-pointer appearance-none pr-10 shadow-md"
                >
                  <option value="active" className="bg-slate-900 text-emerald-400">🟢 Active (Full Facility Access)</option>
                  <option value="past_due" className="bg-slate-900 text-amber-400">🟡 Past Due (Grace Period)</option>
                  <option value="expired" className="bg-slate-900 text-rose-400">🔴 Expired (Administrative Write Actions Locked)</option>
                  <option value="canceled" className="bg-slate-900 text-slate-400">⚪ Canceled</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Save & Danger Actions Zone */}
            {onUpdateCompanySubscription && (
              <div className="pt-6 border-t border-slate-800 space-y-4">
                {/* Cancellation / Force Termination Reason Inspection Banner */}
                {selectedCompanyForView.cancelReason && (
                  <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                    <span className="font-extrabold block text-amber-300">⚠️ Client Submitted Cancellation Feedback:</span>
                    <p className="font-mono">{selectedCompanyForView.cancelReason}</p>
                  </div>
                )}

                {selectedCompanyForView.forceTerminatedReason && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-1">
                    <span className="font-extrabold block text-rose-300">⛔ Super Admin Force Termination Reason:</span>
                    <p className="font-mono">{selectedCompanyForView.forceTerminatedReason}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {selectedCompanyForView.forceTerminated || isSubscriptionExpired(selectedCompanyForView) ? (
                      <button
                        type="button"
                        onClick={() => handleReactivateCompanySubscription(selectedCompanyForView)}
                        className="px-5 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Reactivate & Restore Access (+30d)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetCompanyToForceTerminate(selectedCompanyForView);
                          setShowForceTerminateModal(true);
                        }}
                        className="px-5 py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Force End Subscription Immediately</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSubscriptionChanges}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-lime hover:bg-lime-400 text-slate-950 font-black text-sm shadow-xl shadow-brand-lime/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                    <span>Save Subscription Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-PAGE 2: FACILITY PROFILE */}
        {activeSubTab === 'profile' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 animate-fade-in shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-lime" /> Facility Profile & Contact Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Facility Name</span>
                <p className="font-extrabold text-sm text-white">{selectedCompanyForView.name}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Subdomain / Dedicated URL</span>
                <p className="font-mono font-bold text-brand-lime">{selectedCompanyForView.subdomain || 'global'}.picklepoint.ph</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Client Admin Contact Email</span>
                <p className="font-mono font-bold text-slate-200">{selectedCompanyForView.clientAdminEmail}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Contact Phone</span>
                <p className="font-semibold text-slate-200">{selectedCompanyForView.phone || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 md:col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Full Facility Address</span>
                <p className="font-semibold text-slate-200">{selectedCompanyForView.address || 'Address On File'}</p>
              </div>
            </div>

            {selectedCompanyForView.websiteUrl && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Official Website</span>
                <a
                  href={selectedCompanyForView.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-lime hover:underline font-mono text-xs flex items-center gap-1"
                >
                  <Globe className="w-4 h-4" /> {selectedCompanyForView.websiteUrl} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* SUB-PAGE 3: REGISTERED COURTS */}
        {activeSubTab === 'courts' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 animate-fade-in shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-lime" /> Registered Courts & Venues ({companyCourts.length})
            </h3>

            {companyCourts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-400">No courts created under this facility yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyCourts.map((court: any) => (
                  <div key={court.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{court.name}</h4>
                      <p className="text-xs text-slate-400">{court.type || 'Pickleball Court'} • {court.location || 'Indoor'}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ₱{court.dayPrice || 100}/hr
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-PAGE 4: STAFF & TEAM MEMBERS */}
        {activeSubTab === 'team' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-lime" /> Facility Staff & Client Admins ({companyTeam.length})
              </h3>
              {onOpenInviteModal && (
                <button
                  onClick={() => onOpenInviteModal(selectedCompanyForView)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MailPlus className="w-4 h-4 text-brand-lime" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            {companyTeam.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-400">No staff members assigned yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {companyTeam.map((member: any, idx: number) => (
                  <div key={member.uid || idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-extrabold text-white">{member.name}</p>
                      <p className="font-mono text-slate-400">{member.email}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-brand-lime/10 text-brand-lime border border-brand-lime/30 capitalize">
                      {member.role || 'client_admin'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {renderForceTerminateModal()}
        {renderDeleteModal()}
      </div>
    );
  }

  function renderDeleteModal() {
    if (!showDeleteModal || !companyToDelete) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-left">
        <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-rose-500/40 space-y-5 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-rose-400">
              <Trash2 className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <h4 className="font-extrabold text-white text-base">Delete Facility Organization</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setCompanyToDelete(null);
              }}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-rose-200 leading-relaxed font-semibold">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-extrabold">{companyToDelete.name}</strong>?
            </p>
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
              <span className="font-extrabold uppercase text-rose-400 block">Permanent Action:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-200">
                <li>Permanently deletes this facility organization profile.</li>
                <li>Unassigns linked courts and client admin staff accounts.</li>
                <li>This action cannot be undone.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setCompanyToDelete(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleExecuteDeleteCompany(companyToDelete)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Permanent Deletion</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderForceTerminateModal() {
    if (!showForceTerminateModal || !targetCompanyToForceTerminate) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-left">
        <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-rose-500/40 space-y-5 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <h4 className="font-extrabold text-white text-base">Force End Subscription Immediately</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForceTerminateModal(false);
                setTargetCompanyToForceTerminate(null);
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-rose-200 leading-relaxed font-semibold">
              Are you sure you want to force terminate the subscription for{' '}
              <strong className="text-white font-extrabold">{targetCompanyToForceTerminate.name}</strong>?
            </p>
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
              <span className="font-extrabold uppercase text-rose-400 block">Immediate Operational Impact:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-200">
                <li>Overrides any active trial, monthly, yearly, or lifetime plan.</li>
                <li>Immediately sets subscription status to Expired.</li>
                <li>Triggers the Red Lockout Banner for Client Admins & Managers.</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Termination Reason (Logged for Record)</label>
            <input
              type="text"
              value={forceTerminateReasonInput}
              onChange={(e) => setForceTerminateReasonInput(e.target.value)}
              placeholder="e.g. Terms Violation, Chargeback, Non-payment, or Venue Closure..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForceTerminateModal(false);
                setTargetCompanyToForceTerminate(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleExecuteForceEndSubscription(targetCompanyToForceTerminate)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Immediate Termination</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN COMPANY ROSTER TABLE PAGE
  // =========================================================================
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-lime" /> Company & Client Onboarding
          </h3>
          <p className="text-xs text-slate-400">Onboard venue partners, manage subscriptions, view details pages, and invite Client Admins.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {onOpenInviteModal && (
            <button
              onClick={() => onOpenInviteModal()}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
            >
              <MailPlus className="w-4 h-4 text-brand-lime" />
              <span>Invite Client Admin</span>
            </button>
          )}
          <button
            onClick={onOpenOnboardModal}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-lime-400 shadow-lg shadow-brand-lime/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Company</span>
          </button>
        </div>
      </div>

      {/* Pending Venue Partner Applications Section */}
      {clientLeads.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-brand-lime/30 bg-slate-900/90 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-brand-lime" />
              <span>Pending Venue Partner Applications ({clientLeads.length})</span>
            </h4>
            <span className="text-[10px] font-bold text-brand-lime bg-brand-lime/10 border border-brand-lime/30 px-2.5 py-1 rounded-full uppercase">
              Free Early Access Applicants
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {clientLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-white text-sm">{lead.facilityName}</span>
                    <span className="text-xs text-slate-400 font-normal">({lead.courtCount || 1} Courts)</span>
                    {lead.status === 'invited' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Invitation Sent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                        Pending Review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Applicant: <strong>{lead.fullName}</strong> • <a href={`mailto:${lead.email}`} className="text-brand-lime hover:underline">{lead.email}</a> • {lead.phone}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Location: {lead.cityLocation || 'N/A'} {lead.socialUrl ? `• Social Page: ` : ''}
                    {lead.socialUrl && (
                      <a
                        href={lead.socialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        <Globe className="w-3 h-3" />
                        <span className="capitalize">{lead.socialPlatform || 'Link'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {lead.notes ? ` • Notes: "${lead.notes}"` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApproveLeadAndInvite(lead)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-lime to-emerald-400 text-dark-bg font-extrabold text-xs hover:from-brand-lime/90 hover:to-emerald-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <MailPlus className="w-4 h-4" />
                    <span>Approve & Send Invitation Token</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Companies List Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Company Name</th>
                <th className="py-4 px-6">Location & Address</th>
                <th className="py-4 px-6">Client Admin Email</th>
                <th className="py-4 px-6">Subscription Tier</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No companies onboarded yet.</p>
                  </td>
                </tr>
              ) : (
                companies.map((comp) => (
                  <tr
                    key={comp.id}
                    onClick={() => handleOpenCompanyPage(comp, 'licensing')}
                    className="hover:bg-slate-800/60 transition-all cursor-pointer group border-b border-slate-800/60"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime font-bold flex-shrink-0 group-hover:border-brand-lime/50 transition-all">
                          {comp.logoUrl ? (
                            <img src={comp.logoUrl} alt={comp.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm group-hover:text-brand-lime transition-all block">
                            {comp.name}
                          </span>
                          {comp.subdomain && (
                            <span className="text-[11px] font-mono text-slate-400 block">{comp.subdomain}.picklepoint.ph</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-xs text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{comp.address || 'Address On File'}</span>
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-xs font-mono text-slate-300">{comp.clientAdminEmail}</p>
                      {comp.phone && <p className="text-[11px] text-slate-500">📞 {comp.phone}</p>}
                    </td>

                    <td className="py-4 px-6">{renderSubscriptionBadge(comp)}</td>

                    <td className="py-4 px-6 text-right">
                      {renderStatusToggleSwitch(comp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {renderForceTerminateModal()}
      {renderDeleteModal()}
    </div>
  );
};
