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
  User,
  Phone,
  MessageSquare,
  XCircle,
  Search,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../../../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  type Company,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type AdminCompaniesSubTab,
  getEffectiveSubscriptionExpiry,
  isSubscriptionExpired,
  getSubscriptionRemainingDays,
} from '../adminTypes';

interface AdminCompaniesTabProps {
  companies: Company[];
  courts?: any[];
  users?: any[];
  companiesSubTab?: AdminCompaniesSubTab;
  onOpenOnboardModal: (data?: any) => void;
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
  invitedAt?: any;
  rejectReason?: string;
  rejectedAt?: any;
}

export const AdminCompaniesTab: React.FC<AdminCompaniesTabProps> = ({
  companies,
  courts = [],
  users = [],
  companiesSubTab = 'all',
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
  const [activeRosterViewTab, setActiveRosterViewTab] = useState<AdminCompaniesSubTab>(companiesSubTab);
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'invited' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveRosterViewTab(companiesSubTab);
  }, [companiesSubTab]);

  // Client Leads & Venue Applications State
  const [clientLeads, setClientLeads] = useState<ClientLead[]>([]);

  const fetchClientLeads = async () => {
    const leadsMap = new Map<string, ClientLead>();
    const invitedEmailsSet = new Set<string>();

    // 1. Read LocalStorage Fallback Leads & Invitations
    try {
      const localStr = localStorage.getItem('picklepoint_venue_leads');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((l: any) => {
            const emailKey = (l.email || l.applicantEmail || l.clientAdminEmail || '').trim().toLowerCase();
            const key = emailKey || l.id;
            if (key) leadsMap.set(key, l);
          });
        }
      }

      const localInvsStr = localStorage.getItem('picklepoint_invitations');
      if (localInvsStr) {
        const parsedInvs = JSON.parse(localInvsStr);
        if (Array.isArray(parsedInvs)) {
          parsedInvs.forEach((inv: any) => {
            const invEmail = (inv.email || inv.inviteeEmail || '').trim().toLowerCase();
            if (invEmail) invitedEmailsSet.add(invEmail);
          });
        }
      }
    } catch (e) {}

    // 2. Read Cloud Firestore Leads & Invitations
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'client_leads'));
        snap.forEach((docSnap) => {
          const data = docSnap.data() as ClientLead;
          const leadId = docSnap.id;
          const leadEmail = (data.email || (data as any).applicantEmail || (data as any).clientAdminEmail || '').trim().toLowerCase();
          const key = leadEmail || leadId;
          if (key) {
            leadsMap.set(key, { ...data, id: leadId, email: leadEmail || data.email });
          }
        });
      } catch (e) {
        console.warn('Error fetching client leads:', e);
      }

      try {
        const invSnap = await getDocs(collection(db, 'invitations'));
        invSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const invEmail = (data.email || data.inviteeEmail || '').trim().toLowerCase();
          if (invEmail) invitedEmailsSet.add(invEmail);
        });
      } catch (e) {
        console.warn('Error fetching invitations:', e);
      }
    }

    // 3. Reconcile Lead Statuses: If email exists in invitations, force status to 'invited'
    const leads = Array.from(leadsMap.values()).map((lead) => {
      const emailKey = (lead.email || (lead as any).applicantEmail || (lead as any).clientAdminEmail || '').trim().toLowerCase();
      if (emailKey && invitedEmailsSet.has(emailKey) && lead.status !== 'rejected') {
        return {
          ...lead,
          status: 'invited',
          invitedAt: lead.invitedAt || new Date().toISOString(),
        };
      }
      return lead;
    });

    leads.sort((a, b) => {
      const tA = (a.appliedAt?.seconds ? a.appliedAt.seconds * 1000 : new Date(a.appliedAt || 0).getTime());
      const tB = (b.appliedAt?.seconds ? b.appliedAt.seconds * 1000 : new Date(b.appliedAt || 0).getTime());
      return tB - tA;
    });
    setClientLeads(leads);
  };

  useEffect(() => {
    fetchClientLeads();

    let unsubLeads: (() => void) | undefined;
    let unsubInvs: (() => void) | undefined;

    if (isFirebaseConfigured && db) {
      try {
        unsubLeads = onSnapshot(collection(db, 'client_leads'), () => {
          fetchClientLeads();
        });
        unsubInvs = onSnapshot(collection(db, 'invitations'), () => {
          fetchClientLeads();
        });
      } catch (err) {
        console.warn('Error setting up onSnapshot for client_leads/invitations:', err);
      }
    }

    const handleLeadUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && (detail.leadId || detail.email)) {
        setClientLeads((prev) =>
          prev.map((l) => {
            const matchesId = detail.leadId && (l.id === detail.leadId || (l as any).leadId === detail.leadId);
            const lEmail = (l.email || (l as any).applicantEmail || (l as any).clientAdminEmail || '').trim().toLowerCase();
            const matchesEmail = detail.email && lEmail && lEmail === detail.email.trim().toLowerCase();
            if (matchesId || matchesEmail) {
              return { ...l, status: detail.status || 'invited', invitedAt: new Date().toISOString() };
            }
            return l;
          })
        );
      }
      fetchClientLeads();
    };
    window.addEventListener('picklepoint_lead_updated', handleLeadUpdate);
    return () => {
      if (unsubLeads) unsubLeads();
      if (unsubInvs) unsubInvs();
      window.removeEventListener('picklepoint_lead_updated', handleLeadUpdate);
    };
  }, []);

  const handleApproveLeadAndInvite = (lead: ClientLead) => {
    if (onOpenInviteModal) {
      onOpenInviteModal({
        id: lead.id,
        leadId: lead.id,
        name: lead.facilityName,
        facilityName: lead.facilityName,
        fullName: lead.fullName,
        email: lead.email,
        clientAdminEmail: lead.email,
        phone: lead.phone || '',
        city: lead.cityLocation || '',
      } as any);
    }
  };

  // Reject Application Modal State & Handler
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [leadToReject, setLeadToReject] = useState<ClientLead | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const handleExecuteRejectLead = async () => {
    if (!leadToReject) return;

    const reason = rejectReasonInput.trim();

    if (isFirebaseConfigured && db && leadToReject.id) {
      try {
        await updateDoc(doc(db, 'client_leads', leadToReject.id), {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectReason: reason,
        });
      } catch (e) {
        console.warn('Error rejecting lead in Firestore:', e);
      }
    }

    try {
      const localStr = localStorage.getItem('picklepoint_venue_leads');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((l: any) =>
            l.id === leadToReject.id
              ? { ...l, status: 'rejected', rejectReason: reason }
              : l
          );
          localStorage.setItem('picklepoint_venue_leads', JSON.stringify(updated));
        }
      }
    } catch (e) {}

    setClientLeads((prev) =>
      prev.map((l) => (l.id === leadToReject.id ? { ...l, status: 'rejected', rejectReason: reason } : l))
    );

    setShowRejectModal(false);
    setLeadToReject(null);
    setRejectReasonInput('');
  };

  // Delete Lead Record Modal State & Handler
  const [showDeleteLeadModal, setShowDeleteLeadModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<ClientLead | null>(null);

  const handleExecuteDeleteLead = async () => {
    if (!leadToDelete) return;

    if (isFirebaseConfigured && db && leadToDelete.id) {
      try {
        await deleteDoc(doc(db, 'client_leads', leadToDelete.id));
      } catch (e) {
        console.warn('Error deleting lead from Firestore:', e);
      }
    }

    try {
      const localStr = localStorage.getItem('picklepoint_venue_leads');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((l: any) => l.id !== leadToDelete.id);
          localStorage.setItem('picklepoint_venue_leads', JSON.stringify(updated));
        }
      }
    } catch (e) {}

    setClientLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
    setShowDeleteLeadModal(false);
    setLeadToDelete(null);
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

      {/* Sub-navigation Tabs: All Companies vs For Review (Pill Segmented Bar) */}
      <div className="p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center gap-2 backdrop-blur-xl shadow-lg max-w-fit">
        <button
          type="button"
          onClick={() => setActiveRosterViewTab('all')}
          className={`py-2.5 px-4 text-xs font-normal rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeRosterViewTab === 'all'
              ? 'bg-slate-800 text-brand-lime shadow-md border border-brand-lime/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>All Companies ({companies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRosterViewTab('reviews')}
          className={`py-2.5 px-4 text-xs font-normal rounded-xl transition-all flex items-center gap-2 cursor-pointer relative ${
            activeRosterViewTab === 'reviews'
              ? 'bg-slate-800 text-brand-lime shadow-md border border-brand-lime/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4 text-brand-lime" />
          <span>For Review</span>
          {clientLeads.filter(l => l.status !== 'invited' && l.status !== 'rejected').length > 0 && (
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/40 animate-pulse">
              {clientLeads.filter(l => l.status !== 'invited' && l.status !== 'rejected').length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW SUB-TAB 1: FOR REVIEW (PENDING APPLICATIONS & LEADS) */}
      {activeRosterViewTab === 'reviews' && (
        <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800/90 bg-slate-950/70 space-y-6 shadow-2xl animate-fade-in backdrop-blur-xl">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-lime/20 via-emerald-500/10 to-transparent border border-brand-lime/30 flex items-center justify-center text-brand-lime shrink-0 shadow-inner">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-normal text-white flex items-center gap-2">
                  <span>Venue Partner Applications & Pending Reviews</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review submitted venue partner registration applications, inspect social media channels, and issue single-use invitation links.
                </p>
              </div>
            </div>
            <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Free Early Access Program</span>
            </span>
          </div>

          {/* Secondary Controls Bar: Sub-Filter Tabs (Pending, Invited, Rejected, All) + Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            {/* Sub-Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setReviewFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  reviewFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-medium'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Pending ({clientLeads.filter(l => l.status !== 'invited' && l.status !== 'rejected').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('invited')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  reviewFilter === 'invited'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-medium'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Invited ({clientLeads.filter(l => l.status === 'invited').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('rejected')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  reviewFilter === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm font-medium'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Rejected ({clientLeads.filter(l => l.status === 'rejected').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-normal transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  reviewFilter === 'all'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm font-medium'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>All ({clientLeads.length})</span>
              </button>
            </div>

            {/* Search Input Filter */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venue, applicant, email, city..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime/80 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {(() => {
            const displayLeads = clientLeads.filter((lead) => {
              const matchesStatus =
                reviewFilter === 'pending'
                  ? lead.status !== 'invited' && lead.status !== 'rejected'
                  : reviewFilter === 'invited'
                  ? lead.status === 'invited'
                  : reviewFilter === 'rejected'
                  ? lead.status === 'rejected'
                  : true;

              if (!matchesStatus) return false;

              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              return (
                (lead.facilityName || '').toLowerCase().includes(q) ||
                (lead.fullName || '').toLowerCase().includes(q) ||
                (lead.email || '').toLowerCase().includes(q) ||
                (lead.phone || '').toLowerCase().includes(q) ||
                (lead.cityLocation || '').toLowerCase().includes(q) ||
                (lead.socialPlatform || '').toLowerCase().includes(q)
              );
            });

            if (displayLeads.length === 0) {
              return (
                <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto shadow-inner">
                    {searchQuery ? (
                      <Search className="w-7 h-7 text-slate-500" />
                    ) : reviewFilter === 'rejected' ? (
                      <XCircle className="w-7 h-7 text-rose-500/60" />
                    ) : reviewFilter === 'invited' ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-500/60" />
                    ) : (
                      <Clock className="w-7 h-7 text-amber-500/60" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-normal text-slate-300 text-sm">
                      {searchQuery
                        ? `No Applications Match "${searchQuery}"`
                        : reviewFilter === 'rejected'
                        ? 'No Rejected Applications'
                        : reviewFilter === 'invited'
                        ? 'No Invited Applications'
                        : reviewFilter === 'pending'
                        ? 'No Pending Applications For Review'
                        : 'No Applications Found'}
                    </h5>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Try searching for a different facility name, email address, applicant name, or city.'
                        : reviewFilter === 'rejected'
                        ? 'There are currently no rejected venue applications.'
                        : reviewFilter === 'invited'
                        ? 'No applications have been issued invitation links yet.'
                        : 'All venue owner applications have been processed.'}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {displayLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col lg:flex-row items-start lg:items-stretch justify-between gap-6 hover:border-brand-lime/40 transition-all shadow-xl group relative overflow-hidden backdrop-blur-xl"
                >
                  {/* Top glowing accent line on hover */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-lime/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-4 flex-1 min-w-0">
                    {/* Header: Facility Name & Status Badges */}
                    <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800/80 pb-3.5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-brand-lime/40 group-hover:bg-brand-lime/10 flex items-center justify-center text-brand-lime shrink-0 transition-all shadow-md">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-normal text-white text-lg group-hover:text-brand-lime transition-colors truncate">
                            {lead.facilityName}
                          </h3>
                          <p className="text-xs text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.cityLocation || 'Location not specified'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-300 font-normal px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 shadow-sm">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.courtCount || 1} Courts</span>
                        </span>
                        {lead.status === 'invited' ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-normal bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Invitation Link Issued</span>
                          </span>
                        ) : lead.status === 'rejected' ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-normal bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Application Rejected</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg text-xs font-normal bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Owner Contact & Venue Information Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-sm text-slate-300 pt-1">
                      {/* Applicant Name */}
                      <div className="flex items-start gap-2.5">
                        <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-xs font-normal uppercase tracking-wider text-slate-400 block">Applicant Name</span>
                          <span className="text-sm font-normal text-white truncate block">{lead.fullName}</span>
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-brand-lime shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-xs font-normal uppercase tracking-wider text-slate-400 block">Email Address</span>
                          <a href={`mailto:${lead.email}`} className="text-sm font-normal font-mono text-brand-lime hover:underline truncate block">
                            {lead.email}
                          </a>
                        </div>
                      </div>

                      {/* Contact Phone */}
                      <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-xs font-normal uppercase tracking-wider text-slate-400 block">Contact Phone</span>
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="text-sm font-normal text-slate-200 hover:text-white hover:underline truncate block">
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-sm font-normal text-slate-500 block">N/A</span>
                          )}
                        </div>
                      </div>

                      {/* Social Media Channel */}
                      {lead.socialUrl && (
                        <div className="sm:col-span-2 flex items-start gap-2.5">
                          <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-normal uppercase tracking-wider text-slate-400 block mb-0.5">Social Media Channel</span>
                            <a
                              href={lead.socialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 hover:underline font-mono text-xs font-normal truncate max-w-full transition-all shadow-sm"
                            >
                              <span className="capitalize">{lead.socialPlatform || 'Social Page'}</span>
                              <span className="text-slate-400 truncate">({lead.socialUrl})</span>
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rejection Reason Callout (if rejected) */}
                    {lead.status === 'rejected' && (
                      <div className="bg-rose-950/40 p-3.5 rounded-xl border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 font-normal">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-rose-300 block mb-0.5">Reason for Rejection:</span>
                          <span className="text-slate-300 italic">{lead.rejectReason || 'No specific reason provided'}</span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {lead.notes && (
                      <p className="text-sm text-slate-300 italic font-normal pt-2 border-t border-slate-800/60 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>"{lead.notes}"</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap justify-end flex-shrink-0 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 lg:pl-3">
                    {lead.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => {
                          setLeadToDelete(lead);
                          setShowDeleteLeadModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 hover:border-rose-500/60 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Record</span>
                      </button>
                    )}
                    {lead.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={lead.status === 'invited'}
                        onClick={() => {
                          setLeadToReject(lead);
                          setRejectReasonInput(lead.rejectReason || '');
                          setShowRejectModal(true);
                        }}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-normal transition-all flex items-center justify-center gap-2 shadow-sm ${
                          lead.status === 'invited'
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-50'
                            : 'bg-slate-900/90 border-rose-500/40 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/60 cursor-pointer'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={lead.status === 'invited'}
                      onClick={() => handleApproveLeadAndInvite(lead)}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
                        lead.status === 'invited'
                          ? 'bg-slate-800/80 border border-slate-700/60 text-slate-500 cursor-not-allowed opacity-50 shadow-none'
                          : 'bg-gradient-to-r from-brand-lime via-emerald-400 to-emerald-500 text-dark-bg hover:brightness-110 shadow-brand-lime/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                      }`}
                    >
                      <MailPlus className="w-4 h-4" />
                      <span>
                        {lead.status === 'invited'
                          ? 'Invitation Link Issued'
                          : lead.status === 'rejected'
                          ? 'Re-approve & Issue Invite'
                          : 'Approve & Issue Invitation Link'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    )}

      {/* VIEW SUB-TAB 2: ALL COMPANIES TABLE */}
      {activeRosterViewTab === 'all' && (
        <>
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
        </>
      )}

      {renderRejectModal()}
      {renderDeleteLeadModal()}
      {renderForceTerminateModal()}
      {renderDeleteModal()}
    </div>
  );

  function renderRejectModal() {
    if (!showRejectModal || !leadToReject) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Reject Application</h3>
              <p className="text-xs text-slate-400">Venue Partner Application Review</p>
            </div>
          </div>

          <p className="text-sm text-slate-300">
            Are you sure you want to mark the venue application for <strong className="text-white">{leadToReject.facilityName}</strong> ({leadToReject.fullName}) as <span className="text-rose-400 font-bold">Rejected</span>?
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-normal text-slate-300 block">
              Reason for Rejection <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="e.g. Incomplete facility details, duplicate request, out of coverage area..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/80"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectModal(false);
                setLeadToReject(null);
                setRejectReasonInput('');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteRejectLead}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Confirm Reject</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDeleteLeadModal() {
    if (!showDeleteLeadModal || !leadToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Delete Rejected Record</h3>
              <p className="text-xs text-slate-400">Permanent Lead Deletion</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete the venue application record for{' '}
            <strong className="text-white">{leadToDelete.facilityName}</strong> ({leadToDelete.fullName} &bull; {leadToDelete.email})?
            <br />
            <span className="text-rose-400 font-bold block mt-2 text-xs">⚠️ This action cannot be undone.</span>
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setShowDeleteLeadModal(false);
                setLeadToDelete(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteDeleteLead}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
};
