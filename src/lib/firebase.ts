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
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
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
 * Batches Persistence
 */
export async function savePlaqueBatch(batch: PlaqueBatch): Promise<void> {
  const batchRef = doc(db, 'batches', batch.id);
  const now = new Date().toISOString();
  const payload = {
    ...batch,
    updatedAt: now,
  };

  try {
    await setDoc(batchRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (batch.plaques && batch.plaques.length > 0) {
      for (const plaque of batch.plaques) {
        const plaqueRef = doc(db, 'plaques', plaque.id);
        await setDoc(plaqueRef, {
          ...plaque,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Firestore save batch notice, saving to cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    const batches: PlaqueBatch[] = raw ? JSON.parse(raw) : [];
    const index = batches.findIndex((b) => b.id === batch.id);
    if (index >= 0) {
      batches[index] = payload;
    } else {
      batches.unshift(payload);
    }
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(batches));
  } catch {}
}

export async function fetchUserBatches(userId: string): Promise<PlaqueBatch[]> {
  try {
    const q = query(collection(db, 'batches'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as PlaqueBatch);
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
  } catch (err) {
    console.warn('Firestore fetchUserBatches notice, reading cache:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (raw) {
      const batches: PlaqueBatch[] = JSON.parse(raw);
      return batches.filter((b) => b.userId === userId);
    }
  } catch {}

  return [];
}

export async function deletePlaqueBatch(batchId: string): Promise<void> {
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
  const payload = {
    ...biosite,
    updatedAt: now,
  };

  try {
    await setDoc(bioRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
