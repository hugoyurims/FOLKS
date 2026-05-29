// Re-export specific configuration structures
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Types
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
  }
}

// Ensure the module waits for config
let app: any = null;
let db: any = null;
let auth: any = null;
let initPromise: Promise<{ app: any, db: any, auth: any }> | null = null;

export const initFirebase = async () => {
  if (app) return { app, db, auth };
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    // Dynamic import so it catches the newly created json
    const configSource = await import('../../firebase-applet-config.json');
    const firebaseConfig = configSource.default;
    
    try {
      const { getApp } = await import('firebase/app');
      app = getApp();
    } catch (e) {
      app = initializeApp(firebaseConfig);
    }
    
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
    
    try {
      await enableIndexedDbPersistence(db);
    } catch (err: any) {
      if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
      }
    }
    
    auth = getAuth(app);
    
    return { app, db, auth };
  })();
  
  return initPromise;
};

export const getDb = () => db;
export const getFirebaseAuth = () => auth;

export const getSecondaryAuth = async () => {
  const configSource = await import('../../firebase-applet-config.json');
  const firebaseConfig = configSource.default;
  let secondaryApp;
  try {
    secondaryApp = initializeApp(firebaseConfig, "Secondary");
  } catch (e: any) {
    if (e.code === 'app/duplicate-app') {
      const { getApp } = await import('firebase/app');
      secondaryApp = getApp("Secondary");
    } else {
      throw e;
    }
  }
  return getAuth(secondaryApp);
};


export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
