import { initializeApp, getApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import {
  firebaseConfig,
  isTestFirebaseEnvironment
} from './firebaseConfig.js';

export const AUTH_EMULATOR_HOST = '127.0.0.1';
export const AUTH_EMULATOR_PORT = 9099;
export const AUTH_EMULATOR_URL = `http://${AUTH_EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;
export const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
export const FIRESTORE_EMULATOR_PORT = 48080;

const AUTH_EMULATOR_CONNECTION_KEY = '__melinkAuthEmulatorConnected';
const FIRESTORE_EMULATOR_CONNECTION_KEY = '__melinkFirestoreEmulatorConnected';
const PRODUCTION_FIREBASE_PROJECT_IDS = new Set(['twitter-112c1']);

export const isSafeTestFirebaseProject = (projectId) => (
  typeof projectId === 'string'
    && projectId.length > 0
    && !PRODUCTION_FIREBASE_PROJECT_IDS.has(projectId)
);

export const shouldConnectAuthEmulator = ({
  isTestEnv = isTestFirebaseEnvironment,
  projectId = firebaseConfig.projectId
} = {}) => (
  isTestEnv === true && isSafeTestFirebaseProject(projectId)
);

export const shouldConnectFirestoreEmulator = ({
  isTestEnv = isTestFirebaseEnvironment,
  projectId = firebaseConfig.projectId
} = {}) => (
  isTestEnv === true && isSafeTestFirebaseProject(projectId)
);

export const getFirebaseApp = () => (
  getApps().length ? getApp() : initializeApp(firebaseConfig)
);

export const connectAuthEmulatorIfNeeded = (
  auth,
  {
    connector = connectAuthEmulator,
    isTestEnv = isTestFirebaseEnvironment,
    projectId = firebaseConfig.projectId
  } = {}
) => {
  if (!shouldConnectAuthEmulator({ isTestEnv, projectId })) {
    return false;
  }

  const connected = globalThis[AUTH_EMULATOR_CONNECTION_KEY] || new Set();
  const key = `${projectId}:${AUTH_EMULATOR_URL}`;

  if (connected.has(key)) {
    return false;
  }

  connector(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connected.add(key);
  globalThis[AUTH_EMULATOR_CONNECTION_KEY] = connected;
  return true;
};

export const connectFirestoreEmulatorIfNeeded = (
  firestore,
  {
    connector = connectFirestoreEmulator,
    isTestEnv = isTestFirebaseEnvironment,
    projectId = firebaseConfig.projectId
  } = {}
) => {
  if (!shouldConnectFirestoreEmulator({ isTestEnv, projectId })) {
    return false;
  }

  const connected = globalThis[FIRESTORE_EMULATOR_CONNECTION_KEY] || new Set();
  const key = `${projectId}:${FIRESTORE_EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`;

  if (connected.has(key)) {
    return false;
  }

  connector(firestore, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  connected.add(key);
  globalThis[FIRESTORE_EMULATOR_CONNECTION_KEY] = connected;
  return true;
};

export const getFirebaseAuth = () => {
  const auth = getAuth(getFirebaseApp());
  connectAuthEmulatorIfNeeded(auth);
  return auth;
};

export const getFirebaseFirestore = () => {
  const firestore = getFirestore(getFirebaseApp());
  connectFirestoreEmulatorIfNeeded(firestore);
  return firestore;
};

export const __firebaseClientTestInternals = {
  AUTH_EMULATOR_CONNECTION_KEY,
  FIRESTORE_EMULATOR_CONNECTION_KEY,
  PRODUCTION_FIREBASE_PROJECT_IDS
};
