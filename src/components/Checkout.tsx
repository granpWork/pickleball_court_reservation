import { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle, Calendar, Clock, 
  MapPin, User, Mail, Phone, ShieldCheck, 
  Download, ChevronRight, Lock, Check, Shield, X,
  Copy, UploadCloud, ExternalLink, Tag, Sparkles
} from 'lucide-react';
import type { Voucher } from './AdminDashboard';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { sendBookingConfirmationEmail } from '../services/emailService';

interface CheckoutProps {
  setView: (view: 'landing' | 'login' | 'register' | 'admin' | 'details' | 'checkout' | 'lookup') => void;
  user: { uid?: string; name: string; email: string; role?: string; isAdmin?: boolean } | null;
  checkoutDetails: {
    courtId: string;
    courtName: string;
    courtType: string;
    courtImage: string;
    courtLocation: string;
    date: string;
    slots: string[];
    rentals: { id: string; name: string; price: number; pricingType: string; quantity: number }[];
    totalCost: number;
    companyId?: string;
    courtOwnerId?: string;
    gcashAccountId?: string;
    companyName?: string;
    companyAddress?: string;
    ownerCompanyName?: string;
    ownerCompanyAddress?: string;
    hostEmail?: string;
    hostPhone?: string;
  };
  setCheckoutDetails: (details: any) => void;
  setSelectedCourtId: (id: string) => void;
}

export default function Checkout({ 
  setView, 
  user, 
  checkoutDetails, 
  setCheckoutDetails, 
  setSelectedCourtId 
}: CheckoutProps) {
  // Billing details
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  
  // Copy state for micro-interactions
  const [copiedField, setCopiedField] = useState<'number' | 'name' | null>(null);

  // Centralized GCash parameters
  interface GcashAccount {
    id: string;
    gcashName: string;
    gcashNumber: string;
    gcashQrCode: string;
    isPrimary?: boolean;
    companyId?: string;
    userId?: string;
  }

  const [availableAccounts, setAvailableAccounts] = useState<GcashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [tempSelectedAccountId, setTempSelectedAccountId] = useState<string>('');
  const [isGcashAccountModalOpen, setIsGcashAccountModalOpen] = useState(false);
  
  // Fallback direct globals
  const [globalGcashName, setGlobalGcashName] = useState('');
  const [globalGcashNumber, setGlobalGcashNumber] = useState('');
  const [globalGcashQr, setGlobalGcashQr] = useState('');

  // Transaction form states
  const [gcashReferenceNumber, setGcashReferenceNumber] = useState('');
  const [receiptImageBase64, setReceiptImageBase64] = useState('');
  const [receiptImageName, setReceiptImageName] = useState('');
  
  // Processing & Success states
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [error, setError] = useState('');
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [receiptLightboxImage, setReceiptLightboxImage] = useState<string | null>(null);

  // Court Facility Owner Company Info
  const [courtOwnerId, setCourtOwnerId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [ownerCompanyName, setOwnerCompanyName] = useState('');
  const [ownerCompanyAddress, setOwnerCompanyAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Service fee state
  const [serviceFee, setServiceFee] = useState<number>(30);
  const [serviceFeeEnabled, setServiceFeeEnabled] = useState<boolean>(true);

  // Promo / Credit Voucher States
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Dynamic cost calculations
  const calculateDiscount = () => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.discountType === 'percentage') {
      return Math.round((checkoutDetails.totalCost * appliedVoucher.discountValue) / 100);
    }
    return Math.min(appliedVoucher.discountValue, checkoutDetails.totalCost);
  };

  const discountAmount = calculateDiscount();
  const isFullyCoveredByVoucher = !!appliedVoucher && (
    (appliedVoucher.discountType === 'percentage' && appliedVoucher.discountValue >= 100) ||
    (discountAmount >= checkoutDetails.totalCost)
  );
  
  const netCourtCost = Math.max(0, checkoutDetails.totalCost - discountAmount);
  const effectiveServiceFee = isFullyCoveredByVoucher ? 0 : (serviceFeeEnabled ? serviceFee : 0);
  const finalTotal = isFullyCoveredByVoucher ? 0 : (netCourtCost + effectiveServiceFee);

  const handleApplyVoucher = async (codeToTest?: string) => {
    const code = (codeToTest || voucherCodeInput).trim().toUpperCase();
    setVoucherError(null);
    if (!code) {
      setVoucherError('Please enter a voucher code.');
      return;
    }

    setIsValidatingVoucher(true);
    let foundVoucher: Voucher | undefined;

    // 1. Check Cloud Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const vSnap = await getDocs(collection(db, 'vouchers'));
        vSnap.forEach((dSnap) => {
          const vData = { id: dSnap.id, ...dSnap.data() } as Voucher;
          if (vData.code && vData.code.trim().toUpperCase() === code) {
            foundVoucher = vData;
          }
        });
      } catch (err) {
        console.warn('Firestore vouchers fetch error (falling back to local):', err);
      }
    }

    // 2. Fallback to LocalStorage
    if (!foundVoucher) {
      const vStr = localStorage.getItem('picklepoint_vouchers');
      if (vStr) {
        try {
          const localVouchers = JSON.parse(vStr) as Voucher[];
          foundVoucher = localVouchers.find(v => v.code && v.code.trim().toUpperCase() === code);
        } catch (e) {
          console.warn('LocalStorage parse error for vouchers:', e);
        }
      }
    }

    setIsValidatingVoucher(false);

    if (!foundVoucher) {
      setVoucherError('Invalid voucher code. Please verify and try again.');
      return;
    }

    if (foundVoucher.status !== 'active') {
      setVoucherError('This voucher code is no longer active.');
      return;
    }

    if ((foundVoucher.usedCount || 0) >= (foundVoucher.maxUses || 1)) {
      setVoucherError('This voucher code has reached its maximum redemption limit.');
      return;
    }

    if (foundVoucher.expiryDate) {
      const expiryTimestamp = new Date(`${foundVoucher.expiryDate}T23:59:59`).getTime();
      if (expiryTimestamp < Date.now()) {
        setVoucherError(`This credit voucher expired on ${foundVoucher.expiryDate} and can no longer be redeemed.`);
        return;
      }
    }

    // 3. User Recipient Isolation
    const currentEmail = (email || user?.email || '').trim().toLowerCase();
    if (foundVoucher.issuedToEmail) {
      const voucherTargetEmail = foundVoucher.issuedToEmail.trim().toLowerCase();
      if (currentEmail && voucherTargetEmail !== currentEmail) {
        setVoucherError(`This credit voucher is exclusively issued to ${foundVoucher.issuedToEmail}.`);
        return;
      }
    }

    // 4. Company & Organization Scoping Isolation
    const currentCourtCompanyId = checkoutDetails.companyId || '';
    const currentCourtOwnerId = checkoutDetails.courtOwnerId || '';
    const currentVenueName = checkoutDetails.ownerCompanyName || checkoutDetails.companyName || checkoutDetails.courtName || 'this venue';

    if (foundVoucher.companyId) {
      if (currentCourtCompanyId && foundVoucher.companyId !== currentCourtCompanyId) {
        setVoucherError(
          `This credit voucher was issued by ${foundVoucher.companyName || 'another venue organization'} and cannot be redeemed at ${currentVenueName}.`
        );
        return;
      }
    }

    // 5. Host / Owner Scoping Isolation (Fallback when no companyId is assigned)
    if (foundVoucher.ownerId && foundVoucher.ownerId !== 'system') {
      if (
        currentCourtOwnerId &&
        currentCourtOwnerId !== 'system' &&
        foundVoucher.ownerId !== currentCourtOwnerId &&
        !foundVoucher.companyId
      ) {
        setVoucherError(
          `This credit voucher is exclusively valid for facilities hosted by ${foundVoucher.companyName || 'the issuing host'}.`
        );
        return;
      }
    }

    // 6. Court-Specific Scoping (If explicitly restricted to single court)
    if (foundVoucher.courtId && foundVoucher.courtId !== checkoutDetails.courtId) {
      setVoucherError('This voucher code is exclusively valid for a specific court.');
      return;
    }

    setAppliedVoucher(foundVoucher);
    setVoucherError(null);
  };

  // Load settings on mount (court owner settings with global fallback)
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      // 1. ALWAYS load global service fee settings (from cloud or localStorage)
      let feeLoaded = false;
      if (isFirebaseConfigured && db) {
        try {
          const globalDoc = await getDoc(doc(db, 'settings', 'checkout'));
          if (globalDoc.exists()) {
            const data = globalDoc.data();
            if (typeof data.serviceFee === 'number') {
              setServiceFee(data.serviceFee);
            }
            if (typeof data.serviceFeeEnabled === 'boolean') {
              setServiceFeeEnabled(data.serviceFeeEnabled);
            }
            feeLoaded = true;
          }
        } catch (err) {
          console.warn('Failed to fetch global checkout settings from cloud:', err);
        }
      }

      if (!feeLoaded) {
        const settingsStr = localStorage.getItem('picklepoint_checkout_settings');
        if (settingsStr) {
          try {
            const data = JSON.parse(settingsStr);
            if (typeof data.serviceFee === 'number') {
              setServiceFee(data.serviceFee);
            }
            if (typeof data.serviceFeeEnabled === 'boolean') {
              setServiceFeeEnabled(data.serviceFeeEnabled);
            }
          } catch (e) {}
        }
      }

      // 2. Load GCash payment accounts (owner-specific or fallback)
      const ownerId = checkoutDetails.courtOwnerId || 'system';
      if (isFirebaseConfigured && db) {
        try {
          let docSnap = await getDoc(doc(db, 'settings', 'checkout', 'users', ownerId));
          let isList = true;
          
          if (!docSnap.exists()) {
            docSnap = await getDoc(doc(db, 'settings', 'checkout'));
            isList = false;
          }
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (isList && data.accounts && data.accounts.length > 0) {
              const accs = data.accounts as GcashAccount[];
              setAvailableAccounts(accs);
              const targetAcc = accs.find(a => a.id === checkoutDetails.gcashAccountId) || accs[0];
              setGlobalGcashQr(targetAcc.gcashQrCode || '');
              setGlobalGcashName(targetAcc.gcashName || '');
              setGlobalGcashNumber(targetAcc.gcashNumber || '');
              setSelectedAccountId(targetAcc.id);
            } else {
              const singleAcc: GcashAccount = {
                id: 'global-fallback',
                gcashName: data.gcashName || '',
                gcashNumber: data.gcashNumber || '',
                gcashQrCode: data.gcashQrCode || ''
              };
              setAvailableAccounts([singleAcc]);
              setGlobalGcashQr(singleAcc.gcashQrCode);
              setGlobalGcashName(singleAcc.gcashName);
              setGlobalGcashNumber(singleAcc.gcashNumber);
              setSelectedAccountId(singleAcc.id);
            }
          }
        } catch (err) {
          console.error('Error fetching checkout settings:', err);
        }
      } else {
        const accountsStr = localStorage.getItem(`picklepoint_checkout_settings_accounts_${ownerId}`);
        if (accountsStr) {
          const accs = JSON.parse(accountsStr) as GcashAccount[];
          if (accs.length > 0) {
            setAvailableAccounts(accs);
            const targetAcc = accs.find(a => a.id === checkoutDetails.gcashAccountId) || accs[0];
            setGlobalGcashQr(targetAcc.gcashQrCode || '');
            setGlobalGcashName(targetAcc.gcashName || '');
            setGlobalGcashNumber(targetAcc.gcashNumber || '');
            setSelectedAccountId(targetAcc.id);
            return;
          }
        }

        const settingsStr = localStorage.getItem('picklepoint_checkout_settings');
        if (settingsStr) {
          const data = JSON.parse(settingsStr);
          const singleAcc: GcashAccount = {
            id: 'global-fallback',
            gcashName: data.gcashName || '',
            gcashNumber: data.gcashNumber || '',
            gcashQrCode: data.gcashQrCode || ''
          };
          setAvailableAccounts([singleAcc]);
          setGlobalGcashQr(singleAcc.gcashQrCode);
          setGlobalGcashName(singleAcc.gcashName);
          setGlobalGcashNumber(singleAcc.gcashNumber);
          setSelectedAccountId(singleAcc.id);
        }
      }

      // 3. Load Court Facility Owner & Company details
      if (checkoutDetails.courtId) {
        let rawCourt: any = null;
        if (isFirebaseConfigured && db) {
          try {
            const cSnap = await getDoc(doc(db, 'courts', checkoutDetails.courtId));
            if (cSnap.exists()) rawCourt = cSnap.data();
          } catch (e) {}
        }

        if (!rawCourt) {
          const cStr = localStorage.getItem('picklepoint_courts');
          if (cStr) {
            try {
              const cList = JSON.parse(cStr);
              rawCourt = cList.find((c: any) => c.id === checkoutDetails.courtId);
            } catch (e) {}
          }
        }

        let resolvedCompName = (checkoutDetails.companyName && checkoutDetails.companyName !== checkoutDetails.courtName) 
          ? checkoutDetails.companyName 
          : ((rawCourt?.ownerCompanyName && rawCourt.ownerCompanyName !== rawCourt.name) ? rawCourt.ownerCompanyName : '');
        let resolvedAddress = checkoutDetails.companyAddress || rawCourt?.companyAddress || rawCourt?.location || checkoutDetails.courtLocation;
        let resolvedEmail = checkoutDetails.hostEmail || rawCourt?.ownerEmail || rawCourt?.contactEmail || '';
        let resolvedPhone = checkoutDetails.hostPhone || rawCourt?.ownerPhone || rawCourt?.contactPhone || '';
        let resolvedCompId = '';

        const ownerId = rawCourt?.ownerId || rawCourt?.companyId || checkoutDetails.courtOwnerId;
        
        // 2-Step Firestore / LocalStorage Company Resolution
        if (isFirebaseConfigured && db) {
          try {
            let matchedUserEmail = resolvedEmail;
            let matchedUserCompanyId = '';
            if (ownerId && ownerId !== 'system') {
              const uSnap = await getDoc(doc(db, 'users', ownerId));
              if (uSnap.exists()) {
                const uData = uSnap.data();
                if (uData.email) matchedUserEmail = uData.email;
                if (uData.companyId) matchedUserCompanyId = uData.companyId;
                if (uData.companyName) resolvedCompName = uData.companyName;
              }
            }

            const compDocs = await getDocs(collection(db, 'companies'));
            const compList = compDocs.docs.map(d => ({ id: d.id, ...d.data() }) as any);
            const matchedComp = compList.find((c: any) =>
              (matchedUserCompanyId && c.id === matchedUserCompanyId) ||
              c.id === ownerId ||
              (matchedUserEmail && c.clientAdminEmail?.toLowerCase() === matchedUserEmail.toLowerCase()) ||
              (ownerId && c.clientAdminEmail?.toLowerCase() === ownerId.toLowerCase()) ||
              (resolvedCompName && c.name?.toLowerCase() === resolvedCompName.toLowerCase()) ||
              (rawCourt?.ownerCompanyName && c.name?.toLowerCase() === rawCourt.ownerCompanyName.toLowerCase())
            ) || (compList.length > 0 ? compList[0] : null);

            if (matchedComp) {
              if (matchedComp.id) resolvedCompId = matchedComp.id;
              if (matchedComp.name) resolvedCompName = matchedComp.name;
              if (matchedComp.address) resolvedAddress = matchedComp.address;
              if (matchedComp.clientAdminEmail && !resolvedEmail) resolvedEmail = matchedComp.clientAdminEmail;
              if (matchedComp.phone && !resolvedPhone) resolvedPhone = matchedComp.phone;
            }
          } catch (e) {}
        }

        // LocalStorage fallback check
        const compStr = localStorage.getItem('picklepoint_companies');
        const usersStr = localStorage.getItem('picklepoint_users');
        if (compStr) {
          try {
            const localComps = JSON.parse(compStr);
            const localUsers = usersStr ? JSON.parse(usersStr) : [];
            const matchedUser = localUsers.find((u: any) => u.uid === ownerId || u.id === ownerId || u.email?.toLowerCase() === ownerId?.toLowerCase());
            const matchedUserEmail = matchedUser?.email || resolvedEmail;
            const matchedUserCompanyId = matchedUser?.companyId;

            const matchedComp = localComps.find((comp: any) =>
              (matchedUserCompanyId && comp.id === matchedUserCompanyId) ||
              comp.id === ownerId ||
              (matchedUserEmail && comp.clientAdminEmail?.toLowerCase() === matchedUserEmail.toLowerCase()) ||
              (ownerId && comp.clientAdminEmail?.toLowerCase() === ownerId.toLowerCase()) ||
              (resolvedCompName && comp.name?.toLowerCase() === resolvedCompName.toLowerCase()) ||
              (rawCourt?.ownerCompanyName && comp.name?.toLowerCase() === rawCourt.ownerCompanyName.toLowerCase())
            ) || (localComps.length > 0 ? localComps[0] : null);

            if (matchedComp) {
              if (matchedComp.id) resolvedCompId = matchedComp.id;
              if (matchedComp.name) resolvedCompName = matchedComp.name;
              if (matchedComp.address) resolvedAddress = matchedComp.address;
              if (matchedComp.clientAdminEmail && !resolvedEmail) resolvedEmail = matchedComp.clientAdminEmail;
              if (matchedComp.phone && !resolvedPhone) resolvedPhone = matchedComp.phone;
            }
          } catch (e) {}
        }

        const finalCompName = (resolvedCompName && resolvedCompName !== checkoutDetails.courtName)
          ? resolvedCompName
          : 'PicklePoint Venue';

        setCourtOwnerId(ownerId || checkoutDetails.courtOwnerId || '');
        setCompanyId(resolvedCompId);
        setOwnerCompanyName(finalCompName);
        setOwnerCompanyAddress(resolvedAddress);
        setOwnerEmail(resolvedEmail);
        setOwnerPhone(resolvedPhone);
      }
    };
    fetchGlobalSettings();
  }, [checkoutDetails.courtOwnerId, checkoutDetails.gcashAccountId]);

  // Sync user details if user signs in mid-checkout
  useEffect(() => {
    if (user) {
      if (!name) setName(user.name);
      if (!email) setEmail(user.email);
    }
  }, [user]);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const file = files[0];
    setReceiptImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 600;
        const scale = max_width / img.width;
        if (scale < 1) {
          canvas.width = max_width;
          canvas.height = img.height * scale;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setReceiptImageBase64(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCopy = (text: string, field: 'name' | 'number') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const formatGcashReference = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 13);
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.slice(0, 4);
    }
    if (clean.length > 4) {
      formatted += ' ' + clean.slice(4, 7);
    }
    if (clean.length > 7) {
      formatted += ' ' + clean.slice(7, 13);
    }
    return formatted;
  };

  // Final booking execution
  const executeBooking = async () => {
    setIsProcessing(true);
    setError('');

    const refNum = `PP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const resolvedOwnerCompanyName = (ownerCompanyName && ownerCompanyName !== checkoutDetails.courtName)
      ? ownerCompanyName
      : ((checkoutDetails.companyName && checkoutDetails.companyName !== checkoutDetails.courtName)
          ? checkoutDetails.companyName
          : ((checkoutDetails.ownerCompanyName && checkoutDetails.ownerCompanyName !== checkoutDetails.courtName)
              ? checkoutDetails.ownerCompanyName
              : 'PicklePoint Venue'));
    const resolvedOwnerCompanyAddress = ownerCompanyAddress || checkoutDetails.companyAddress || checkoutDetails.ownerCompanyAddress || checkoutDetails.courtLocation;
    const resolvedOwnerEmail = ownerEmail || checkoutDetails.hostEmail || '';
    const resolvedOwnerPhone = ownerPhone || checkoutDetails.hostPhone || '';

    const isVoucherPayment = finalTotal === 0 && !!appliedVoucher;
    const resolvedPaymentMethod = isVoucherPayment ? 'voucher' : 'gcash';
    const resolvedPaymentStatus = isVoucherPayment ? 'paid' : 'pending_verification';
    const resolvedBookingStatus = isVoucherPayment ? 'approved' : 'pending';

    const docPayload = {
      courtId: checkoutDetails.courtId,
      courtName: checkoutDetails.courtName,
      courtType: checkoutDetails.courtType || '',
      courtOwnerId: courtOwnerId || checkoutDetails.courtOwnerId || '',
      companyId: companyId || '',
      ownerCompanyName: resolvedOwnerCompanyName,
      ownerCompanyAddress: resolvedOwnerCompanyAddress,
      ownerEmail: resolvedOwnerEmail,
      ownerPhone: resolvedOwnerPhone,
      date: checkoutDetails.date,
      slots: checkoutDetails.slots,
      rentals: checkoutDetails.rentals,
      totalCost: finalTotal,
      userId: user?.uid || 'anonymous',
      userName: name,
      userEmail: email,
      userPhone: phone,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: resolvedPaymentStatus,
      bookingReference: refNum,
      createdAt: new Date().toISOString(),
      status: resolvedBookingStatus,
      gcashReferenceNumber: isVoucherPayment ? (appliedVoucher?.code || 'VOUCHER') : gcashReferenceNumber,
      receiptImageUrl: isVoucherPayment ? '' : receiptImageBase64,
      ...(appliedVoucher ? { voucherCode: appliedVoucher.code, discountAmount } : { discountAmount: 0 }),
      user: {
        name,
        email,
        uid: user?.uid || 'anonymous'
      }
    };

    const cleanPayload = JSON.parse(JSON.stringify(docPayload));

    // Update voucher usage in both Firestore & LocalStorage
    if (appliedVoucher) {
      const updatedCount = (appliedVoucher.usedCount || 0) + 1;
      const updatedStatus = updatedCount >= (appliedVoucher.maxUses || 1) ? 'exhausted' as const : 'active' as const;

      if (isFirebaseConfigured && db) {
        try {
          const { doc: firestoreDoc, updateDoc: firestoreUpdateDoc } = await import('firebase/firestore');
          await firestoreUpdateDoc(firestoreDoc(db, 'vouchers', appliedVoucher.id), {
            usedCount: updatedCount,
            status: updatedStatus,
            lastUsedAt: new Date().toISOString(),
          });
        } catch (vErr) {
          console.warn('Failed to update voucher status in Firestore (check security rules):', vErr);
        }
      }

      const vStr = localStorage.getItem('picklepoint_vouchers');
      if (vStr) {
        try {
          const localV = JSON.parse(vStr) as Voucher[];
          const updated = localV.map(v => v.id === appliedVoucher.id || v.code === appliedVoucher.code ? { ...v, usedCount: updatedCount, status: updatedStatus } : v);
          localStorage.setItem('picklepoint_vouchers', JSON.stringify(updated));
        } catch (e) {}
      }
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'bookings', refNum), cleanPayload);
        setBookingRef(refNum);
        setSuccess(true);
        sendBookingConfirmationEmail({
          bookingId: refNum,
          courtName: checkoutDetails.courtName,
          date: checkoutDetails.date,
          slots: checkoutDetails.slots,
          totalCost: finalTotal,
          userEmail: email,
          userName: name,
          paymentMethod: resolvedPaymentMethod,
          bookingReference: refNum,
          ownerCompanyName: ownerCompanyName || checkoutDetails.courtName,
          ownerCompanyAddress: ownerCompanyAddress || checkoutDetails.courtLocation,
          ownerEmail,
          ownerPhone,
        }).catch((err) => console.warn('Automated confirmation email failed:', err));
      } catch (err) {
        console.error('Error saving checkout booking:', err);
        setError('Failed to record reservation. Please check network connection and try again.');
        setIsErrorModalOpen(true);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setTimeout(() => {
        try {
          const bookingsStr = localStorage.getItem('picklepoint_bookings');
          const bookings = bookingsStr ? JSON.parse(bookingsStr) : [];
          const localPayload = {
            ...docPayload,
            id: refNum,
            bookingId: refNum,
            courtOwnerId: courtOwnerId || checkoutDetails.courtOwnerId || '',
            companyId: companyId || '',
            ownerCompanyName: ownerCompanyName || checkoutDetails.courtName,
            ownerCompanyAddress: ownerCompanyAddress || checkoutDetails.courtLocation,
            ownerEmail,
            ownerPhone,
          };
          bookings.push(localPayload);
          localStorage.setItem('picklepoint_bookings', JSON.stringify(bookings));
          setBookingRef(refNum);
          setSuccess(true);
          sendBookingConfirmationEmail({
            bookingId: refNum,
            courtName: checkoutDetails.courtName,
            date: checkoutDetails.date,
            slots: checkoutDetails.slots,
            totalCost: finalTotal,
            userEmail: email,
            userName: name,
            paymentMethod: resolvedPaymentMethod,
            bookingReference: refNum,
            ownerCompanyName: ownerCompanyName || checkoutDetails.courtName,
            ownerCompanyAddress: ownerCompanyAddress || checkoutDetails.courtLocation,
            ownerEmail,
            ownerPhone,
          }).catch((err) => console.warn('Automated confirmation email failed:', err));
        } catch (err) {
          setError('Failed to record reservation locally.');
          setIsErrorModalOpen(true);
        } finally {
          setIsProcessing(false);
        }
      }, 1200);
    }
  };

  // Handle Form Submission
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your contact information.');
      setIsErrorModalOpen(true);
      return;
    }
    if (finalTotal > 0) {
      if (!gcashReferenceNumber.trim()) {
        setError('Please enter your 13-digit GCash Reference Number.');
        setIsErrorModalOpen(true);
        return;
      }
      if (gcashReferenceNumber.replace(/\D/g, '').length !== 13) {
        setError('GCash Reference Number must be exactly 13 digits.');
        setIsErrorModalOpen(true);
        return;
      }
      if (!receiptImageBase64) {
        setError('Please upload your payment receipt/screenshot.');
        setIsErrorModalOpen(true);
        return;
      }
    }
    setError('');
    executeBooking();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetToHome = () => {
    setCheckoutDetails(null);
    setSelectedCourtId('');
    setView('landing');
  };

  // ----------------------------------------------------
  // RENDER SUCCESS STATE (Digital Receipt / Ticket)
  // ----------------------------------------------------
  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in font-sans">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime mb-4 shadow-[0_0_20px_rgba(181,245,41,0.2)] animate-scale-in">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Receipt Submitted!
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 px-4 leading-relaxed">
            Your GCash payment is pending administrator review. Your ticket voucher will activate once approved.
          </p>
        </div>

        {/* Perforated Printable Ticket */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl print:border-none print:shadow-none">
          {/* Top colored indicator */}
          <div className="h-2 bg-gradient-to-r from-blue-500 to-brand-lime"></div>

          {/* Ticket Header */}
          <div className="p-6 pb-5 border-b border-dashed border-slate-800 relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/10 border border-blue-500/25 text-blue-400">
                  Pending Verification
                </span>
                <h3 className="text-lg font-semibold text-white mt-2 leading-tight">
                  {checkoutDetails.courtName}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {checkoutDetails.courtLocation}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Reference No</span>
                <span className="text-xs font-black text-brand-lime font-sans tracking-wide block mt-0.5">
                  {bookingRef}
                </span>
              </div>
            </div>
            
            {/* Left and Right punches for perforated ticket look */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-dark-bg border-r border-slate-800 z-10"></div>
            <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-dark-bg border-l border-slate-800 z-10"></div>
          </div>

          {/* Ticket Details */}
          <div className="p-6 py-5 space-y-4 border-b border-dashed border-slate-800 relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-brand-lime" /> Date
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {formatDate(checkoutDetails.date)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-brand-lime" /> Time Slots
                </span>
                <div className="text-xs font-semibold text-slate-200 flex flex-col gap-0.5 max-h-[80px] overflow-y-auto pr-1">
                  {checkoutDetails.slots.map((slot, idx) => (
                    <span key={idx}>{slot.split(' - ')[0]} ({slot.includes('PM') && parseInt(slot.split(':')[0]) >= 6 ? 'Night' : 'Day'})</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-brand-lime" /> Player
                </span>
                <span className="text-xs font-semibold text-slate-200 block truncate">{name}</span>
                <span className="text-xs text-slate-400 block truncate leading-none">{email}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-brand-lime" /> Payment Info
                </span>
                <span className="text-xs font-semibold text-slate-200 block capitalize font-sans flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> GCash QR
                </span>
                <span className="text-xs text-slate-400 block leading-none">
                  Ref: {gcashReferenceNumber.slice(0, 4)}...{gcashReferenceNumber.slice(-4)}
                </span>
              </div>
            </div>

            {/* Equipment list if present */}
            {checkoutDetails.rentals.length > 0 && (
              <div className="pt-3 border-t border-slate-900/60">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Add-ons Selected</span>
                <div className="grid grid-cols-1 gap-1 text-xs text-slate-350">
                  {checkoutDetails.rentals.map((r, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{r.name} (x{r.quantity})</span>
                      <span className="font-semibold text-slate-200">₱{r.price * r.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Left and Right punches */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-dark-bg border-r border-slate-800 z-10"></div>
            <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-dark-bg border-l border-slate-800 z-10"></div>
          </div>

          {/* Ticket Footer / Barcode Area */}
          <div className="p-6 pt-5 bg-slate-900/10 text-center space-y-4">
            <div className="flex justify-between items-baseline font-bold text-sm border-b border-slate-800/60 pb-3">
              <span className="text-xs text-slate-400">Total Charged</span>
              <span className="text-brand-lime font-sans text-lg">₱{finalTotal}</span>
            </div>

            {/* SVG Custom Barcode Mock */}
            <div className="flex flex-col items-center justify-center space-y-2 pt-2">
              <div className="bg-white p-3 rounded-2xl inline-block shadow-inner select-none">
                <svg className="w-64 h-12 text-slate-950" viewBox="0 0 100 20" fill="currentColor">
                  <rect x="0" y="0" width="2" height="20" />
                  <rect x="4" y="0" width="1" height="20" />
                  <rect x="7" y="0" width="3" height="20" />
                  <rect x="12" y="0" width="1" height="20" />
                  <rect x="14" y="0" width="2" height="20" />
                  <rect x="18" y="0" width="4" height="20" />
                  <rect x="24" y="0" width="1" height="20" />
                  <rect x="27" y="0" width="2" height="20" />
                  <rect x="31" y="0" width="3" height="20" />
                  <rect x="36" y="0" width="1" height="20" />
                  <rect x="39" y="0" width="2" height="20" />
                  <rect x="43" y="0" width="1" height="20" />
                  <rect x="46" y="0" width="4" height="20" />
                  <rect x="52" y="0" width="2" height="20" />
                  <rect x="56" y="0" width="1" height="20" />
                  <rect x="59" y="0" width="3" height="20" />
                  <rect x="64" y="0" width="1" height="20" />
                  <rect x="67" y="0" width="2" height="20" />
                  <rect x="71" y="0" width="4" height="20" />
                  <rect x="77" y="0" width="1" height="20" />
                  <rect x="80" y="0" width="2" height="20" />
                  <rect x="84" y="0" width="3" height="20" />
                  <rect x="89" y="0" width="1" height="20" />
                  <rect x="92" y="0" width="2" height="20" />
                  <rect x="96" y="0" width="1" height="20" />
                  <rect x="98" y="0" width="2" height="20" />
                </svg>
                <div className="text-[8px] text-slate-800 font-sans tracking-[0.4em] mt-1 font-bold">
                  {bookingRef.replace(/-/g, '')}
                </div>
              </div>
              <span className="text-[8.5px] text-slate-500 font-sans font-semibold uppercase tracking-wider">
                VOUCHER PENDING REVIEW • SCAN ONCE APPROVED
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3.5 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-900 transition-all font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-lime" /> Print Voucher
          </button>
          <button
            onClick={handleResetToHome}
            className="flex-1 py-3 rounded-xl bg-brand-lime text-dark-bg hover:bg-[#a6e224] transition-all font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-lime/10"
          >
            Book Another Court <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN PAYMENT AND CHECKOUT RENDER FLOW (GCASH SOLE PAYMENT)
  // ----------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans animate-fade-in">
      {/* Top Breadcrumb Back button */}
      <button
        onClick={() => setView('details')}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Scheduling
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Billing and GCash Payment Forms (Lg spans 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Ambient subtle light overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-lime" /> Complete Reservation
            </h2>
            <p className="text-xs text-slate-400 mt-1 pb-4 border-b border-slate-800/80">
              Provide your details and complete the GCash QR transfer below to secure your booking.
            </p>

            {/* Error Message banner */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl flex items-center gap-2.5 mt-4 select-none animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-ping"></span>
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-6 pt-5">
              
              {/* Section 1: Contact Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-sm text-brand-lime font-black shadow-[0_0_15px_rgba(181,245,41,0.15)] flex-shrink-0">1</span>
                    Contact Information
                  </h3>
                  {user && (
                    <span className="text-[10px] bg-brand-lime/10 text-brand-lime px-2 py-0.5 rounded-full border border-brand-lime/20 font-bold uppercase">
                      Signed In
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-brand-lime" /> Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-brand-lime" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-brand-lime" /> GCash Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="09171234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 transition-all"
                  />
                  <span className="text-[10px] text-slate-500 block leading-normal">
                    Enter the phone number associated with the payment for tracking.
                  </span>
                </div>
              </div>

              {isFullyCoveredByVoucher ? (
                /* Section 2: 100% Voucher Waiver Card */
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-sm text-brand-lime font-black shadow-[0_0_15px_rgba(181,245,41,0.15)] flex-shrink-0">2</span>
                    Voucher Confirmation & Waiver
                  </h3>

                  <div className="relative overflow-hidden bg-gradient-to-br from-brand-lime/15 via-emerald-950/20 to-slate-900/60 border border-brand-lime/30 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 text-left">
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-brand-lime/10 blur-2xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between pb-3 border-b border-brand-lime/20">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-lime/20 border border-brand-lime/40 flex items-center justify-center text-brand-lime">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs md:text-sm font-extrabold text-white">100% Covered by Rebooking Voucher</h4>
                          <p className="text-[11px] text-brand-lime font-mono font-bold">{appliedVoucher?.code}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-brand-lime/20 border border-brand-lime/40 text-brand-lime px-3 py-1 rounded-full uppercase tracking-wider">
                        ₱0 Due
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 space-y-2 text-left">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <CheckCircle className="w-4 h-4 text-brand-lime" />
                        <span>No cash transfer or GCash receipt required.</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                        Your credit voucher covers 100% of this reservation. Your court booking will be automatically approved and ticket generated immediately upon clicking confirm below.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section 2: GCash QR Portal */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-sm text-brand-lime font-black shadow-[0_0_15px_rgba(181,245,41,0.15)] flex-shrink-0">2</span>
                      GCash Secure Portal {appliedVoucher ? `(Remaining ₱${finalTotal})` : ''}
                    </h3>

                    {/* Main Premium GCash Gradient Box */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-950/40 via-blue-950/20 to-slate-900/40 border border-blue-500/20 rounded-3xl p-5 md:p-6 shadow-xl space-y-6">
                      {/* Glowing blue accent in background */}
                      <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>
                      
                      {/* Portal Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-blue-900/30">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">G</div>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">GCash Instant QR Checkout</h4>
                            <p className="text-[10px] text-blue-400">Scan QR Code or send manually to the numbers below</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold bg-blue-600/10 border border-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Official Payment
                        </span>
                      </div>

                      {/* Merchant Details copy panel */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 border border-blue-900/20 rounded-2xl p-4 flex flex-col justify-between relative transition-colors">
                          <div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">GCash Account Name</span>
                            <h5 className="text-sm font-bold text-white truncate">{globalGcashName || 'PicklePoint Merchant'}</h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(globalGcashName || 'PicklePoint Merchant', 'name')}
                            className="self-end mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-white transition-colors cursor-pointer bg-blue-950/50 hover:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-900/30"
                          >
                            {copiedField === 'name' ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Name
                              </>
                            )}
                          </button>
                        </div>

                        <div className="bg-slate-950/50 border border-blue-900/20 rounded-2xl p-4 flex flex-col justify-between relative transition-colors">
                          <div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">GCash Account Number</span>
                            <h5 className="text-sm font-mono font-bold text-brand-lime tracking-wider">{globalGcashNumber || '0917-XXX-XXXX'}</h5>
                          </div>
                          <div className="flex gap-2 justify-end mt-2">
                            {availableAccounts.length > 1 && !checkoutDetails.gcashAccountId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTempSelectedAccountId(selectedAccountId);
                                  setIsGcashAccountModalOpen(true);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg"
                              >
                                Switch Account
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopy(globalGcashNumber || '', 'number')}
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-white transition-colors cursor-pointer bg-blue-950/50 hover:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-900/30"
                            >
                              {copiedField === 'number' ? (
                                <>
                                  <Check className="w-3 h-3 text-green-400" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Number
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* QR code and scanning visual instructions */}
                      <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-950/40 border border-blue-955/60 rounded-2xl p-5">
                        {/* Scanner Mockup Screen */}
                        <div className="relative group flex-shrink-0">
                          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-600 to-brand-lime opacity-30 blur group-hover:opacity-60 transition duration-500"></div>
                          <div 
                            onClick={() => setReceiptLightboxImage(globalGcashQr || '/placeholder-qr.png')}
                            className="relative w-36 h-36 bg-white rounded-xl p-2.5 flex items-center justify-center overflow-hidden shadow-inner select-none cursor-pointer"
                          >
                            {globalGcashQr ? (
                              <img 
                                src={globalGcashQr} 
                                alt="Merchant GCash QR Code" 
                                className="w-full h-full object-contain" 
                              />
                            ) : (
                              <div className="text-slate-850 font-extrabold flex flex-col items-center justify-center p-1 w-full h-full">
                                <svg className="w-full h-full text-blue-955" viewBox="0 0 100 100" fill="currentColor">
                                  <rect width="100" height="100" fill="white" />
                                  <rect x="8" y="8" width="26" height="26" fill="black" />
                                  <rect x="13" y="13" width="16" height="16" fill="white" />
                                  <rect x="16" y="16" width="10" height="10" fill="black" />
                                  <rect x="66" y="8" width="26" height="26" fill="black" />
                                  <rect x="71" y="13" width="16" height="16" fill="white" />
                                  <rect x="74" y="16" width="10" height="10" fill="black" />
                                  <rect x="8" y="66" width="26" height="26" fill="black" />
                                  <rect x="13" y="71" width="16" height="16" fill="white" />
                                  <rect x="16" y="74" width="10" height="10" fill="black" />
                                  <rect x="44" y="44" width="12" height="12" fill="black" />
                                  <rect x="66" y="66" width="12" height="12" fill="black" />
                                  <rect x="78" y="78" width="14" height="14" fill="black" />
                                  <rect x="56" y="78" width="12" height="12" fill="black" />
                                  <rect x="78" y="56" width="12" height="12" fill="black" />
                                </svg>
                              </div>
                            )}
                            {/* Hover scan overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white flex items-center gap-1">
                                <ExternalLink className="w-3.5 h-3.5 text-brand-lime" /> Zoom QR
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Instructions</span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              1. Scan the QR code or copy the payment details above.<br />
                              2. Open your GCash app, select **Send Money** &gt; **Express Send** (or scan QR).<br />
                              3. Send exactly <span className="text-brand-lime font-bold">₱{finalTotal}</span> to the merchant.
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-2 bg-blue-955/50 border border-blue-900/40 rounded-xl px-3 py-1.5 text-xs text-blue-300">
                            <Lock className="w-3.5 h-3.5 text-brand-lime" /> Official Merchant Account Secured
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Section 3: Reference Number and Screenshot */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-sm text-brand-lime font-black shadow-[0_0_15px_rgba(181,245,41,0.15)] flex-shrink-0">3</span>
                      Verification & Upload
                    </h3>

                    <div className="space-y-4">
                      {/* Reference Number input */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          13-Digit GCash Reference Number
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          placeholder="e.g. 9043 231 523444"
                          value={gcashReferenceNumber}
                          onChange={(e) => setGcashReferenceNumber(formatGcashReference(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20 transition-all font-mono tracking-wider font-bold"
                        />
                        <span className="text-[10px] text-slate-500 block leading-none">
                          Type the exactly 13 digits code from the GCash transaction receipt.
                        </span>
                      </div>

                      {/* Receipt File Upload */}
                      <div className="space-y-3 text-left">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Upload Screenshot Proof of Payment
                        </label>

                        {receiptImageBase64 ? (
                          /* Redesigned Premium File Preview Card */
                          <div className="relative group overflow-hidden bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shadow-xl transition-all duration-300">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                              {/* Large Preview Frame */}
                              <div 
                                className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-850 flex-shrink-0 group-hover:border-slate-700 transition-colors cursor-zoom-in flex items-center justify-center" 
                                onClick={() => setReceiptLightboxImage(receiptImageBase64)}
                              >
                                <img src={receiptImageBase64} alt="Receipt Upload" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">Zoom</span>
                                </div>
                              </div>

                              {/* File Details and Remove Button */}
                              <div className="flex-1 w-full text-center sm:text-left space-y-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-brand-lime">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wide">Screenshot Uploaded</span>
                                  </div>
                                  <h5 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[280px] mx-auto sm:mx-0 font-sans" title={receiptImageName}>
                                    {receiptImageName || 'receipt_screenshot.png'}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 font-mono">Secured & Encoded (Base64)</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setReceiptImageBase64('');
                                    setReceiptImageName('');
                                  }}
                                  className="w-full sm:w-auto px-4 py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                >
                                  <X className="w-3.5 h-3.5" /> Remove Screenshot
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Redesigned Premium File Selection Dropzone */
                          <div className="relative group rounded-2xl border border-dashed border-slate-800 hover:border-blue-500/40 bg-slate-900/10 hover:bg-blue-950/[0.02] p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[140px]">
                            <input
                              type="file"
                              required
                              accept="image/*"
                              onChange={handleReceiptUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            />
                            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-lime group-hover:border-brand-lime/30 transition-all duration-300 shadow-sm mb-3">
                              <UploadCloud className="w-6 h-6 animate-pulse" />
                            </div>
                            <span className="text-xs text-slate-200 font-bold block group-hover:text-white transition-colors">
                              Drag & drop receipt here or click to browse
                            </span>
                            <span className="text-[10px] text-slate-555 block mt-1.5">Supports JPG, PNG (Max 5MB)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl bg-brand-lime text-dark-bg font-black text-xs tracking-wider flex items-center justify-center gap-1.5 hover:scale-[1.01] hover:bg-[#a6e224] transition-all shadow-lg shadow-brand-lime/10 cursor-pointer uppercase border-none outline-none"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-650 border-t-dark-bg rounded-full animate-spin"></span>
                      Saving Reservation...
                    </>
                  ) : isFullyCoveredByVoucher ? (
                    <>
                      <Sparkles className="w-4 h-4" /> Confirm Free Rebooking (₱0)
                    </>
                  ) : (
                    `Confirm GCash & Book (₱${finalTotal})`
                  )}
                </button>
              </div>

            </form>

            {/* Simulated Payment Security Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-xs font-sans font-bold tracking-wider select-none">
              <Lock className="w-3.5 h-3.5 text-brand-lime/70" /> 256-BIT CRYPTOGRAPHY SECURED CHECKOUT
            </div>
          </div>
        </div>

        {/* Right Column - Booking Summary Card (Lg spans 5) */}
        <div className="lg:col-span-5 lg:sticky lg:top-[96px] space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5">
            <div className="pb-3.5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Booking Summary</h3>
              <p className="text-xs text-slate-400 mt-1">Verify details before proceeding to payment.</p>
            </div>

            {/* Venue Card header */}
            <div className="flex gap-4">
              {checkoutDetails.courtImage ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex-shrink-0">
                  <img src={checkoutDetails.courtImage} alt={checkoutDetails.courtName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-800 text-2xl flex items-center justify-center flex-shrink-0">
                  🏓
                </div>
              )}
              <div className="text-left space-y-1">
                <span className="text-[8px] font-extrabold bg-brand-lime/10 border border-brand-lime/25 text-brand-lime px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                  {checkoutDetails.courtType}
                </span>
                <h4 className="text-sm font-extrabold text-white mt-1 leading-snug">{checkoutDetails.courtName}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {checkoutDetails.courtLocation}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-850"></div>

            {/* Date & Time slots Summary */}
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-brand-lime mt-0.5" />
                <div className="text-left">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">Scheduled Date</span>
                  <span className="text-xs font-semibold text-slate-200 mt-0.5 block">{formatDate(checkoutDetails.date)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-brand-lime mt-0.5" />
                <div className="text-left w-full">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">Time Slots Reserved</span>
                  <div className="mt-1 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                    {checkoutDetails.slots.map((slot, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs font-bold bg-slate-900 text-slate-300 border border-slate-850 px-2 py-1 rounded-md"
                      >
                        {slot.split(' - ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Add-ons list if present */}
            {checkoutDetails.rentals.length > 0 && (
              <>
                <div className="border-t border-slate-850"></div>
                <div className="space-y-2">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">Equipment Add-ons</span>
                  <div className="space-y-1.5">
                    {checkoutDetails.rentals.map((r, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-350">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-lime"></span>
                          {r.name} <span className="text-slate-500 font-bold font-sans">x{r.quantity}</span>
                        </span>
                        <span className="font-semibold text-slate-200">₱{r.price * r.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* VOUCHER / PROMO CODE PANEL */}
            <div className="border-t border-slate-850 pt-4 space-y-3 text-left">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-brand-lime" /> Credit Voucher or Promo Code
              </label>

              {appliedVoucher ? (
                <div className="p-3.5 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-extrabold text-brand-lime text-xs block">{appliedVoucher.code}</span>
                    <span className="text-[10px] text-slate-300 font-bold block">
                      {appliedVoucher.discountType === 'percentage' ? `${appliedVoucher.discountValue}% Credit Discount Applied` : `₱${appliedVoucher.discountValue} Discount Applied`}
                    </span>
                    {appliedVoucher.expiryDate && (
                      <span className="text-[9.5px] text-slate-400 font-mono block">
                        Valid until: {appliedVoucher.expiryDate}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedVoucher(null)}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCodeInput}
                    onChange={(e) => {
                      setVoucherCodeInput(e.target.value.toUpperCase());
                      setVoucherError(null);
                    }}
                    placeholder="Enter Code (e.g. CREDIT-50-XXXX)"
                    className="flex-1 bg-slate-900 border border-slate-800 text-brand-lime font-mono font-bold text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-lime uppercase"
                  />
                  <button
                    type="button"
                    disabled={isValidatingVoucher}
                    onClick={() => handleApplyVoucher()}
                    className="px-4 py-2.5 rounded-xl bg-brand-lime/20 border border-brand-lime/40 text-brand-lime font-extrabold text-xs hover:bg-brand-lime hover:text-dark-bg transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                  >
                    {isValidatingVoucher ? (
                      <span className="w-3.5 h-3.5 border-2 border-brand-lime border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
              )}

              {voucherError && (
                <p className="text-[11px] text-red-400 font-bold leading-tight">{voucherError}</p>
              )}
            </div>

            {/* Pricing Cost breakdown */}
            <div className="border-t border-slate-850 pt-4 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Court booking total</span>
                <span className="font-bold text-slate-200">
                  ₱{checkoutDetails.totalCost - checkoutDetails.rentals.reduce((sum, r) => sum + (r.price * r.quantity), 0)}
                </span>
              </div>
              
              {checkoutDetails.rentals.length > 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Equipment add-ons total</span>
                  <span className="font-bold text-slate-200">
                    ₱{checkoutDetails.rentals.reduce((sum, r) => sum + (r.price * r.quantity), 0)}
                  </span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-brand-lime font-bold">
                  <span>Voucher discount ({appliedVoucher?.code})</span>
                  <span>-₱{discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-400">
                <span>Online booking service fee</span>
                <span className={`font-bold ${serviceFeeEnabled ? 'text-slate-200' : 'text-brand-lime font-mono'}`}>
                  {serviceFeeEnabled ? `₱${serviceFee}` : 'FREE (₱0)'}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline font-bold">
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Total payment due</span>
                <span className="text-brand-lime font-sans text-xl">₱{finalTotal}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* GCASH ACCOUNT SELECTION MODAL */}
      {isGcashAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm transition-all animate-fade-in">
          <div className="w-full max-w-2xl bg-dark-bg border border-slate-800 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl relative animate-scale-up text-left my-8">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-850 mb-6">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-lime" /> Choose a GCash Account
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select one of the available GCash accounts below to display its details and QR code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGcashAccountModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content (Card List) */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 mb-6">
              {availableAccounts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20">
                  <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-855 flex items-center justify-center text-slate-500 text-lg mx-auto mb-4 select-none">📲</div>
                  <h4 className="text-xs font-black text-white">No GCash accounts are available.</h4>
                  <p className="text-xs text-slate-550 mt-1.5">Please contact admin support.</p>
                </div>
              ) : (
                availableAccounts.slice(0, 3).map((acc) => {
                  const isSelected = tempSelectedAccountId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setTempSelectedAccountId(acc.id)}
                      className={`glass-panel border rounded-2xl p-5 relative overflow-hidden transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                        isSelected
                          ? 'border-brand-lime bg-brand-lime/[0.03] shadow-[0_0_15px_rgba(181,245,41,0.06)]'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                      }`}
                    >
                      {/* Checkmark badge inside chosen card */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-lime flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 text-dark-bg stroke-[3]" />
                        </div>
                      )}

                      {/* Left */}
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm transition-colors ${
                          isSelected ? 'bg-brand-lime/10 text-brand-lime' : 'bg-slate-900/50 text-slate-400 group-hover:bg-slate-900'
                        }`}>
                          📲
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{acc.gcashName || 'Unnamed Account'}</h4>
                          <p className="text-xs font-mono text-slate-400 mt-1 font-bold">{acc.gcashNumber || 'No Number'}</p>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-center justify-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 max-w-[120px] self-center sm:self-auto shrink-0 w-full sm:w-auto">
                        <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center overflow-hidden mb-1 shadow-inner select-none">
                          {acc.gcashQrCode ? (
                            <img src={acc.gcashQrCode} alt="QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-[6px] text-slate-450 font-mono text-center">QR Code</div>
                          )}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Scan QR</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsGcashAccountModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 hover:text-white transition-all cursor-pointer text-center font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetAcc = availableAccounts.find(a => a.id === tempSelectedAccountId);
                  if (targetAcc) {
                    setGlobalGcashQr(targetAcc.gcashQrCode || '');
                    setGlobalGcashName(targetAcc.gcashName || '');
                    setGlobalGcashNumber(targetAcc.gcashNumber || '');
                    setSelectedAccountId(targetAcc.id);
                  }
                  setIsGcashAccountModalOpen(false);
                }}
                disabled={availableAccounts.length === 0}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-dark-bg bg-brand-lime hover:bg-[#a6e224] transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-lime/10 font-sans"
              >
                Confirm Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR QR ENLARGEMENT */}
      {receiptLightboxImage && (
        <div 
          onClick={() => setReceiptLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-lg w-full max-h-[85vh] flex items-center justify-center animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <img src={receiptLightboxImage} alt="GCash QR Code Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-850 shadow-2xl bg-white p-4" />
            <button
              type="button"
              onClick={() => setReceiptLightboxImage(null)}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/80 border border-slate-800 p-2 rounded-full backdrop-blur"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ERROR MODAL ALERT */}
      {isErrorModalOpen && error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm transition-all animate-fade-in">
          <div className="w-full max-w-md bg-dark-bg border border-red-500/30 rounded-3xl p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)] relative animate-scale-up text-center">
            <div className="absolute inset-0 court-lines opacity-5 pointer-events-none rounded-3xl"></div>
            
            {/* Warning Icon with pulse glow */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/25 text-red-500 mb-4 animate-bounce">
              <Shield className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Verification Required
            </h3>
            
            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              {error}
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer text-center font-sans shadow-lg shadow-red-600/15"
              >
                Go Back & Fix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
