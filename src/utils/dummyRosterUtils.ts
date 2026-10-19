import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { isNonProductionEnvironment } from './envUtils';

export interface DummyPlayerPreset {
  name: string;
  email: string;
  phone: string;
  duprId: string;
  duprRating: string;
  skillLevel: string;
}

export const DUMMY_PLAYERS_POOL: DummyPlayerPreset[] = [
  {
    name: 'Bryan Joven',
    email: 'bryan.joven@picklepoint.test',
    phone: '0917-101-0001',
    duprId: '8KL9MN',
    duprRating: '3.85',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'Alizza Mae',
    email: 'alizza.mae@picklepoint.test',
    phone: '0917-101-0002',
    duprId: '3PQ4RS',
    duprRating: '3.50',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'John Michael Matubis',
    email: 'john.matubis@picklepoint.test',
    phone: '0917-101-0003',
    duprId: '7UV8WX',
    duprRating: '4.10',
    skillLevel: 'Advanced (4.0+)',
  },
  {
    name: 'Tristan Jude Osea',
    email: 'tristan.osea@picklepoint.test',
    phone: '0917-101-0004',
    duprId: '5YZ1AB',
    duprRating: '3.75',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'Carla Mendoza',
    email: 'carla.mendoza@picklepoint.test',
    phone: '0917-101-0005',
    duprId: '2CD3EF',
    duprRating: '3.25',
    skillLevel: 'Novice/Intermediate (3.0-3.4)',
  },
  {
    name: 'Paolo Roxas',
    email: 'paolo.roxas@picklepoint.test',
    phone: '0917-101-0006',
    duprId: '6GH7IJ',
    duprRating: '4.00',
    skillLevel: 'Advanced (4.0+)',
  },
  {
    name: 'Bea Alonzo',
    email: 'bea.alonzo@picklepoint.test',
    phone: '0917-101-0007',
    duprId: '9KL0MN',
    duprRating: '3.40',
    skillLevel: 'Novice/Intermediate (3.0-3.4)',
  },
  {
    name: 'Mark Gil',
    email: 'mark.gil@picklepoint.test',
    phone: '0917-101-0008',
    duprId: '4OP5QR',
    duprRating: '3.65',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'Daphne Oseña',
    email: 'daphne.osena@picklepoint.test',
    phone: '0917-101-0009',
    duprId: '1ST2UV',
    duprRating: '3.90',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'Jericho Rosales',
    email: 'jericho.rosales@picklepoint.test',
    phone: '0917-101-0010',
    duprId: '5WX6YZ',
    duprRating: '4.25',
    skillLevel: 'Advanced (4.0+)',
  },
  {
    name: 'Liza Soberano',
    email: 'liza.soberano@picklepoint.test',
    phone: '0917-101-0011',
    duprId: '8AB9CD',
    duprRating: '3.15',
    skillLevel: 'Beginner (2.5-3.0)',
  },
  {
    name: 'Enrique Gil',
    email: 'enrique.gil@picklepoint.test',
    phone: '0917-101-0012',
    duprId: '2EF3GH',
    duprRating: '3.80',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'Katrina Halili',
    email: 'katrina.halili@picklepoint.test',
    phone: '0917-101-0013',
    duprId: '6IJ7KL',
    duprRating: '3.45',
    skillLevel: 'Novice/Intermediate (3.0-3.4)',
  },
  {
    name: 'Dingdong Dantes',
    email: 'dingdong.dantes@picklepoint.test',
    phone: '0917-101-0014',
    duprId: '9MN0OP',
    duprRating: '4.35',
    skillLevel: 'Advanced (4.0+)',
  },
  {
    name: 'Marian Rivera',
    email: 'marian.rivera@picklepoint.test',
    phone: '0917-101-0015',
    duprId: '3QR4ST',
    duprRating: '3.60',
    skillLevel: 'Intermediate (3.5-3.9)',
  },
  {
    name: 'Piolo Pascual',
    email: 'piolo.pascual@picklepoint.test',
    phone: '0917-101-0016',
    duprId: '7UV8WX',
    duprRating: '4.15',
    skillLevel: 'Advanced (4.0+)',
  },
];

export interface OpenPlayDummyTargetEvent {
  id: string;
  title?: string;
  maxParticipants?: number;
  companyId?: string;
}

/**
 * Seeds realistic dummy registrations for an Open Play event.
 * STRICTLY restricted to Localhost and Staging.
 */
export async function seedDummyOpenPlayRegistrations(
  event: OpenPlayDummyTargetEvent,
  requestedCount: number = 12,
  existingRegistrations: any[] = []
): Promise<any[]> {
  if (!isNonProductionEnvironment()) {
    throw new Error('Dummy roster operations are strictly forbidden in production.');
  }

  const activeExisting = existingRegistrations.filter(
    (r) => r.eventId === event.id && r.status !== 'cancelled'
  );
  const currentTotal = activeExisting.reduce(
    (sum, r) => sum + (r.playerCount || 1 + (r.guestCount || 0)),
    0
  );
  const maxCapacity = event.maxParticipants || 16;
  const spotsAvailable = Math.max(0, maxCapacity - currentTotal);

  const countToAdd = Math.min(requestedCount, spotsAvailable);
  if (countToAdd <= 0) {
    throw new Error(`Open play session is already at full capacity (${currentTotal}/${maxCapacity}).`);
  }

  const existingNames = new Set(
    activeExisting.map((r) => (r.playerName || r.userName || '').toLowerCase().trim())
  );

  // Pick presets that aren't already registered
  const availablePresets = DUMMY_PLAYERS_POOL.filter(
    (p) => !existingNames.has(p.name.toLowerCase().trim())
  );

  const presetsToUse: DummyPlayerPreset[] = [];
  for (let i = 0; i < countToAdd; i++) {
    if (i < availablePresets.length) {
      presetsToUse.push(availablePresets[i]);
    } else {
      // If we need more than available unique presets, generate numbered fallback
      const basePreset = DUMMY_PLAYERS_POOL[i % DUMMY_PLAYERS_POOL.length];
      const seq = Math.floor(i / DUMMY_PLAYERS_POOL.length) + 1;
      presetsToUse.push({
        ...basePreset,
        name: `${basePreset.name} #${seq}`,
        email: `dummy.${basePreset.name.toLowerCase().replace(/\s+/g, '.')}.${seq}@picklepoint.test`,
        phone: `0917-999-00${String(i).padStart(2, '0')}`,
        duprId: `DPR${i + 1}A`,
      });
    }
  }

  const timestamp = Date.now();
  const newRegistrations: any[] = [];

  for (let idx = 0; idx < presetsToUse.length; idx++) {
    const preset = presetsToUse[idx];
    let regId = `reg_dummy_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 6)}`;

    if (isFirebaseConfigured && db) {
      const docRef = doc(collection(db, 'openplay_registrations'));
      regId = docRef.id;
    }

    const regPayload = {
      id: regId,
      eventId: event.id,
      eventTitle: event.title || 'Open Play Session',
      companyId: event.companyId || '',
      playerName: preset.name,
      userName: preset.name,
      playerEmail: preset.email,
      userEmail: preset.email,
      playerPhone: preset.phone,
      userPhone: preset.phone,
      duprId: preset.duprId,
      adminDuprId: preset.duprId,
      duprRating: preset.duprRating,
      adminDuprRating: preset.duprRating,
      skillLevel: preset.skillLevel,
      playerCount: 1,
      guestCount: 0,
      guests: [],
      paymentStatus: 'paid',
      paymentMethod: 'gcash',
      status: 'approved',
      isDummy: true,
      gcashReferenceNumber: `DUMMY-${timestamp.toString().slice(-6)}-${idx + 1}`,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'openplay_registrations', regId), regPayload);
    }

    newRegistrations.push(regPayload);
  }

  // Update localStorage and sessionStorage
  try {
    const localStr =
      localStorage.getItem('picklepoint_openplay_registrations') ||
      sessionStorage.getItem('picklepoint_openplay_registrations');
    const localRegs = localStr ? JSON.parse(localStr) : [];
    const updated = [...localRegs, ...newRegistrations];
    localStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(updated));
    sessionStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(updated));
  } catch (e) {
    console.warn('Storage sync error for dummy registrations:', e);
  }

  return newRegistrations;
}

/**
 * Removes all dummy registrations for a specific Open Play event.
 * Real player registrations are safely preserved.
 */
export async function clearDummyOpenPlayRegistrations(
  eventId: string,
  existingRegistrations: any[]
): Promise<any[]> {
  if (!isNonProductionEnvironment()) {
    throw new Error('Dummy roster operations are strictly forbidden in production.');
  }

  const dummyRegs = existingRegistrations.filter(
    (r) => r.eventId === eventId && r.isDummy === true
  );

  // 1. Delete from Firestore
  if (isFirebaseConfigured && db) {
    for (const dReg of dummyRegs) {
      try {
        await deleteDoc(doc(db, 'openplay_registrations', dReg.id));
      } catch (err) {
        console.warn(`Failed to delete dummy doc ${dReg.id}:`, err);
      }
    }
  }

  // 2. Filter from local storage
  try {
    const localStr =
      localStorage.getItem('picklepoint_openplay_registrations') ||
      sessionStorage.getItem('picklepoint_openplay_registrations');
    if (localStr) {
      const localRegs = JSON.parse(localStr);
      const filtered = localRegs.filter(
        (r: any) => !(r.eventId === eventId && r.isDummy === true)
      );
      localStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(filtered));
      sessionStorage.setItem('picklepoint_openplay_registrations', JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Storage sync error while clearing dummy registrations:', e);
  }

  // Return non-dummy registrations
  return existingRegistrations.filter(
    (r) => !(r.eventId === eventId && r.isDummy === true)
  );
}

