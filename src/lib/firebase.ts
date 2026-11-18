import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  UserProfile,
  PlaqueBatch,
  BiositeItem,
  UserStatus,
  ActivityLog,
} from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

export const ADMIN_EMAILS = [
  'Jeannmkt2@gmail.com'.toLowerCase(),
  'jeanncarllostk00@gmail.com'.toLowerCase(),
];
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export { firebaseConfig };

// Singleton initialization
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Translates Firebase Auth & Firestore error codes to Portuguese messages
 */
export function getFirebaseErrorMessage(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/user-not-found':
      return 'Nenhum usuário cadastrado com este e-mail.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado no sistema.';
    case 'auth/weak-password':
      return 'A senha deve conter no mínimo 6 caracteres.';
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns instantes.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com os servidores do Firebase. Verifique sua conexão à internet.';
    case 'auth/operation-not-allowed':
      return 'O provedor de autenticação por E-mail e Senha precisa ser ativado no Console do Firebase (Authentication > Sign-in method).';
    case 'permission-denied':
      return 'Acesso negado pelas regras de segurança do Firestore. Publique o arquivo firestore.rules no Console do Firebase.';
    case 'unavailable':
      return 'Serviço do Firestore temporariamente indisponível.';
    default:
      if (message.includes('offline') || message.includes('network')) {
        return 'Falha de conexão com o Firebase.';
      }
      return message || 'Ocorreu um erro no processamento da solicitação.';
  }
}

// Local storage cache keys for offline resiliency and fast caching
const LOCAL_USERS_KEY = 'gerapix_local_users_cache_v2';
const LOCAL_BATCHES_KEY = 'gerapix_local_batches_cache_v2';
const LOCAL_BIOSITES_KEY = 'gerapix_local_biosites_cache_v2';
const LOCAL_ACTIVITY_KEY = 'gerapix_local_activity_cache_v2';

/**
 * Ensures user profile document exists in users/{uid}.
 * Never throws "Perfil não encontrado". Auto-provisions admin if email is Jeannmkt2@gmail.com!
 */
export async function getOrCreateUserProfile(user: User, fallbackName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const emailLower = (user.email || '').toLowerCase();
  const isAdminEmail = ADMIN_EMAILS.includes(emailLower);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Guarantee that official admin is always active admin
      if (isAdminEmail && (data.role !== 'admin' || data.status !== 'active')) {
        const updated: UserProfile = {
          ...data,
          role: 'admin',
          status: 'active',
          updatedAt: new Date().toISOString(),
        };
        await updateDoc(userRef, {
          role: 'admin',
          status: 'active',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
        saveLocalUserProfile(updated);
        return updated;
      }
      saveLocalUserProfile(data);
      return data;
    }
  } catch (err) {
    console.warn('Firestore profile check notice:', err);
  }

  // If document does not exist, auto-create it securely
  const now = new Date().toISOString();
  const newProfile: UserProfile = {
    uid: user.uid,
    name: user.displayName || fallbackName || (isAdminEmail ? 'Administrador Oficial' : 'Usuário GeraPix'),
    email: user.email || '',
    role: isAdminEmail ? 'admin' : 'user',
    status: isAdminEmail ? 'active' : 'pending',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(userRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not write profile to Firestore directly, caching locally:', err);
  }

  saveLocalUserProfile(newProfile);
  return newProfile;
}

function saveLocalUserProfile(profile: UserProfile) {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
    users[profile.uid] = profile;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {}
}

/**
 * Real Firestore Read/Write check
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const testDocRef = doc(db, 'system_health', 'ping');
    await getDoc(testDocRef);
    return {
      success: true,
      message: 'Conectado ao Cloud Firestore com sucesso (leitura autorizada).',
    };
  } catch (err: any) {
    const msg = getFirebaseErrorMessage(err);
    return {
      success: false,
      message: msg,
      details: err?.code || err?.message,
    };
  }
}

/**
 * Fetch all users for Admin Panel
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as UserProfile);
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
  } catch (err) {
    console.warn('Firestore fetchAllUsers reading cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const users: Record<string, UserProfile> = JSON.parse(raw);
      return Object.values(users);
    }
  } catch {}

  return [];
}

/**
 * Admin action: change user status (pending | active | blocked)
 */
export async function updateUserStatus(uid: string, newStatus: UserStatus): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore updateDoc notice, updating cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const users: Record<string, UserProfile> = JSON.parse(raw);
      if (users[uid]) {
        users[uid].status = newStatus;
        users[uid].updatedAt = new Date().toISOString();
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      }
    }
  } catch {}
}

/**
 * Recursively removes undefined values because Firestore rejects any field === undefined.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
}

const LOCAL_DELETED_BATCHES_KEY = 'gerapix_deleted_batches_v1';

function getDeletedBatchIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_BATCHES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markBatchDeletedLocally(batchId: string): void {
  try {
    const set = getDeletedBatchIds();
    set.add(batchId);
    localStorage.setItem(LOCAL_DELETED_BATCHES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function normalizeBatchRecord(b: PlaqueBatch): PlaqueBatch {
  const plaques = (b.plaques || []).map((p) => {
    const hasKey = Boolean(p.pixKey && p.pixKey.trim().length > 0);
    return {
      ...p,
      permanentId: p.permanentId || p.number,
      qrId: p.qrId || `QR-${p.permanentId || p.number}`,
      modelId: p.modelId || b.modelId,
      pixStatus: p.pixStatus || (hasKey ? 'linked' : 'unlinked'),
      pspSyncStatus: p.pspSyncStatus || 'pending_psp',
    };
  });
  return {
    ...b,
    plaques,
  };
}

/**
 * Batches Persistence
 */
export async function savePlaqueBatch(batch: PlaqueBatch): Promise<void> {
  const now = new Date().toISOString();
  const normalized = normalizeBatchRecord({
    ...batch,
    createdAt: batch.createdAt || now,
    updatedAt: now,
  });

  // Avoid bloating individual plaque documents with giant dataURL snapshots if custom image uploaded;
  // batch.modelSnapshot already holds the full snapshot, and plaques preserve modelId + lightweight snapshot.
  const lightweightBatchSnapshot =
    normalized.modelSnapshot &&
    normalized.modelSnapshot.imageUrl?.startsWith('data:') &&
    normalized.modelSnapshot.imageUrl.length > 150000
      ? {
          ...normalized.modelSnapshot,
          imageUrl: `/models/model${normalized.modelId.replace('model-0', '')}_new.png?v=12`,
        }
      : normalized.modelSnapshot;

  const cleanBatchPayload = sanitizeForFirestore<PlaqueBatch>({
    ...normalized,
    ...(lightweightBatchSnapshot ? { modelSnapshot: lightweightBatchSnapshot } : {}),
    plaques: (normalized.plaques || []).map((p) => {
      const { modelSnapshot: _omitDupSnapshot, ...rest } = p;
      return rest;
    }),
  });

  // Update local cache immediately with full payload
  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    const batches: PlaqueBatch[] = raw ? JSON.parse(raw) : [];
    const index = batches.findIndex((b) => b.id === normalized.id);
    if (index >= 0) {
      batches[index] = normalized;
    } else {
      batches.unshift(normalized);
    }
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(batches));
  } catch {}

  try {
    const fsBatch = writeBatch(db);
    const batchRef = doc(db, 'batches', normalized.id);
    fsBatch.set(batchRef, cleanBatchPayload, { merge: true });

    if (cleanBatchPayload.plaques && cleanBatchPayload.plaques.length > 0) {
      for (const plaque of cleanBatchPayload.plaques) {
        const plaqueRef = doc(db, 'plaques', plaque.id);
        fsBatch.set(
          plaqueRef,
          sanitizeForFirestore({
            ...plaque,
            permanentId: plaque.permanentId || plaque.number,
            qrId: plaque.qrId || `QR-${plaque.permanentId || plaque.number}`,
            createdAt: plaque.createdAt || now,
            updatedAt: plaque.updatedAt || now,
          }),
          { merge: true }
        );
      }
    }

    await fsBatch.commit();
  } catch (err) {
    console.warn('Firestore save batch notice, kept in local cache:', err);
  }
}

export async function fetchUserBatches(userId: string): Promise<PlaqueBatch[]> {
  const deletedIds = getDeletedBatchIds();
  const byId = new Map<string, PlaqueBatch>();

  // 1. Read Firestore (authoritative cloud records)
  let firestoreReachable = false;
  try {
    const q = query(collection(db, 'batches'), where('userId', '==', userId));
    const snap = await getDocs(q);
    firestoreReachable = true;
    snap.docs.forEach((d) => {
      const data = normalizeBatchRecord(d.data() as PlaqueBatch);
      if (!deletedIds.has(data.id)) {
        byId.set(data.id, data);
      }
    });
  } catch (err) {
    console.warn('Firestore fetchUserBatches notice, reading cache:', err);
  }

  // 2. Merge local cache (only include local-only batches if newer or Firestore was unreachable)
  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (raw) {
      const localBatches: PlaqueBatch[] = JSON.parse(raw);
      for (const localRaw of localBatches) {
        if (localRaw.userId !== userId || deletedIds.has(localRaw.id)) continue;
        const local = normalizeBatchRecord(localRaw);
        const existing = byId.get(local.id);
        if (!existing) {
          byId.set(local.id, local);
          // Background retry sync if Firestore is reachable
          if (firestoreReachable) {
            savePlaqueBatch(local).catch(() => {});
          }
        } else if ((local.updatedAt || '') > (existing.updatedAt || '')) {
          byId.set(local.id, local);
        }
      }
    }
  } catch {}

  const merged = Array.from(byId.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  // Keep localStorage synced with merged state for this user
  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    const others: PlaqueBatch[] = raw
      ? (JSON.parse(raw) as PlaqueBatch[]).filter((b) => b.userId !== userId)
      : [];
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify([...merged, ...others]));
  } catch {}

  return merged;
}

export async function deletePlaqueBatch(batchId: string): Promise<void> {
  markBatchDeletedLocally(batchId);
  try {
    await deleteDoc(doc(db, 'batches', batchId));
  } catch (err) {
    console.warn('Firestore deleteDoc notice:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (raw) {
      const batches: PlaqueBatch[] = JSON.parse(raw);
      const filtered = batches.filter((b) => b.id !== batchId);
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

/**
 * Biosites Persistence
 */
export async function saveBiosite(biosite: BiositeItem): Promise<void> {
  const bioRef = doc(db, 'biosites', biosite.id);
  const now = new Date().toISOString();
  const payload: BiositeItem = {
    ...biosite,
    createdAt: biosite.createdAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(
      bioRef,
      {
        ...payload,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore saveBiosite notice, saving to cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BIOSITES_KEY);
    const biosites: BiositeItem[] = raw ? JSON.parse(raw) : [];
    const index = biosites.findIndex((b) => b.id === biosite.id);
    if (index >= 0) {
      biosites[index] = payload;
    } else {
      biosites.unshift(payload);
    }
    localStorage.setItem(LOCAL_BIOSITES_KEY, JSON.stringify(biosites));
  } catch {}
}

export async function fetchPublicBiosite(biositeId: string): Promise<BiositeItem | null> {
  if (!biositeId) return null;

  try {
    const snap = await getDoc(doc(db, 'biosites', biositeId));
    if (snap.exists()) {
      return snap.data() as BiositeItem;
    }
  } catch (err) {
    console.warn('Firestore fetchPublicBiosite notice:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BIOSITES_KEY);
    if (raw) {
      const biosites: BiositeItem[] = JSON.parse(raw);
      return biosites.find((b) => b.id === biositeId) || null;
    }
  } catch {}

  return null;
}

export async function fetchUserBiosites(userId: string): Promise<BiositeItem[]> {
  try {
    const q = query(collection(db, 'biosites'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as BiositeItem);
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
  } catch (err) {
    console.warn('Firestore fetchUserBiosites notice, reading cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BIOSITES_KEY);
    if (raw) {
      const biosites: BiositeItem[] = JSON.parse(raw);
      return biosites.filter((b) => b.userId === userId);
    }
  } catch {}

  return [];
}

export async function deleteBiosite(biositeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'biosites', biositeId));
  } catch (err) {
    console.warn('Firestore deleteDoc notice:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BIOSITES_KEY);
    if (raw) {
      const biosites: BiositeItem[] = JSON.parse(raw);
      const filtered = biosites.filter((b) => b.id !== biositeId);
      localStorage.setItem(LOCAL_BIOSITES_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

/**
 * Activity Logs
 */
export async function logActivity(action: string, details: string, user: { uid: string; name: string }): Promise<void> {
  const log: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user.uid,
    userName: user.name,
    action,
    details,
    createdAt: new Date().toISOString(),
  };

  try {
    const ref = doc(db, 'activity', log.id);
    await setDoc(ref, {
      ...log,
      createdAt: serverTimestamp(),
    });
  } catch {
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
      const logs: ActivityLog[] = raw ? JSON.parse(raw) : [];
      logs.unshift(log);
      if (logs.length > 50) logs.pop();
      localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(logs));
    } catch {}
  }
}

export async function fetchRecentActivities(): Promise<ActivityLog[]> {
  try {
    const ref = collection(db, 'activity');
    const snap = await getDocs(ref);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as ActivityLog);
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 30);
    }
  } catch {}

  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

/**
 * Monotonic strictly incremental batch serial counter
 * Formats: PIX-0001, PIX-0002, PIX-0003...
 * Deleting a batch NEVER decrements or reuses serials.
 */
const BATCH_SERIAL_STORAGE_KEY = 'gerapix_batch_serial_counter_v3';

export function peekNextBatchSerial(): string {
  try {
    const rawVal = localStorage.getItem(BATCH_SERIAL_STORAGE_KEY);
    const currentNum = rawVal ? parseInt(rawVal, 10) : 0;
    const nextNum = (isNaN(currentNum) ? 0 : currentNum) + 1;
    return `PIX-${nextNum.toString().padStart(4, '0')}`;
  } catch {
    return 'PIX-0001';
  }
}

export async function getNextBatchSerial(): Promise<string> {
  let currentNum = 0;

  // 1. Check local cache
  try {
    const rawVal = localStorage.getItem(BATCH_SERIAL_STORAGE_KEY);
    if (rawVal) {
      const parsed = parseInt(rawVal, 10);
      if (!isNaN(parsed) && parsed > currentNum) {
        currentNum = parsed;
      }
    }
  } catch {}

  // 2. Scan existing cached batches to ensure currentNum is >= highest existing
  try {
    const rawBatches = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (rawBatches) {
      const batches: PlaqueBatch[] = JSON.parse(rawBatches);
      for (const b of batches) {
        const match = b.name.match(/PIX-(\d{4})/i) || b.id.match(/PIX-(\d{4})/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > currentNum) currentNum = num;
        }
      }
    }
  } catch {}

  // 3. Try Firestore system counter doc
  try {
    const counterRef = doc(db, 'system_counters', 'batch_serial');
    const snap = await getDoc(counterRef);
    if (snap.exists()) {
      const data = snap.data();
      const fsNum = typeof data.lastNumber === 'number' ? data.lastNumber : 0;
      if (fsNum > currentNum) currentNum = fsNum;
    }
  } catch {}

  const nextNum = currentNum + 1;
  const serial = `PIX-${nextNum.toString().padStart(4, '0')}`;

  // Persist incremented value
  try {
    localStorage.setItem(BATCH_SERIAL_STORAGE_KEY, nextNum.toString());
  } catch {}

  try {
    const counterRef = doc(db, 'system_counters', 'batch_serial');
    await setDoc(counterRef, {
      lastNumber: nextNum,
      lastSerial: serial,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  } catch {}

  return serial;
}

/**
 * Migrates and permanently saves all batches and biosites created in guest mode
 * to the authenticated user's account in Firestore and local cache.
 */
export async function syncGuestDataToUser(userId: string): Promise<void> {
  if (!userId || userId === 'guest') return;

  try {
    // 1. Migrate batches
    const rawBatches = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (rawBatches) {
      const batches: PlaqueBatch[] = JSON.parse(rawBatches);
      let batchChanged = false;
      for (const b of batches) {
        if (!b.userId || b.userId === 'guest') {
          b.userId = userId;
          batchChanged = true;
          if (b.plaques) {
            b.plaques.forEach((p) => {
              p.userId = userId;
            });
          }
          await savePlaqueBatch(b).catch(() => {});
        }
      }
      if (batchChanged) {
        localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(batches));
      }
    }

    // 2. Migrate biosites
    const rawBiosites = localStorage.getItem(LOCAL_BIOSITES_KEY);
    if (rawBiosites) {
      const biosites: BiositeItem[] = JSON.parse(rawBiosites);
      let bioChanged = false;
      for (const bio of biosites) {
        if (!bio.userId || bio.userId === 'guest') {
          bio.userId = userId;
          bioChanged = true;
          await saveBiosite(bio).catch(() => {});
        }
      }
      if (bioChanged) {
        localStorage.setItem(LOCAL_BIOSITES_KEY, JSON.stringify(biosites));
      }
    }
  } catch (err) {
    console.warn('Notice syncing guest data to user:', err);
  }
}


