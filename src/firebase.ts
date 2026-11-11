import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/* CRITICAL: Must pass firebaseConfig.firestoreDatabaseId and persistent multi-tab cache */
const customDbId = (firebaseConfig as any).firestoreDatabaseId;
let firestoreDb: Firestore;
try {
  firestoreDb = customDbId
    ? initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        },
        customDbId
      )
    : initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
} catch {
  firestoreDb = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);

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
  const errMsg = error instanceof Error ? error.message : String(error);

  // If this is a transient offline state, do not format as a security rule violation
  if (
    errMsg.includes('the client is offline') ||
    errMsg.includes('client is offline') ||
    (error as any)?.code === 'unavailable'
  ) {
    console.warn(`Firestore offline notice [${operationType}] for ${path}:`, errMsg);
    throw error;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore
export async function testConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'config', 'main'));
    return snap.exists();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('offline') || (error as any)?.code === 'unavailable') {
      console.warn('Firestore offline notice during connection test.');
      return true;
    }
    return false;
  }
}
