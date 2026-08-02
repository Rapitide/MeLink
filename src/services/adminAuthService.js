import { doc, onSnapshot } from 'firebase/firestore';

import {
  FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  getFirebaseFirestore,
  shouldConnectFirestoreEmulator
} from '../config/firebaseClient.js';
import { firebaseConfig, isTestFirebaseEnvironment } from '../config/firebaseConfig.js';

export const ADMIN_COLLECTION = 'admins';

export const isEligibleAdminAuthUser = (currentUser) => (
  !!currentUser
    && typeof currentUser.uid === 'string'
    && currentUser.uid.length > 0
    && currentUser.isAnonymous !== true
);

export const isValidAdminDocument = (data) => (
  data?.role === 'admin' && data.enabled === true
);

const maskUid = (uid) => (
  typeof uid === 'string' && uid.length >= 6 ? `${uid.slice(0, 6)}...` : ''
);

export const getFirestoreEmulatorDebugStatus = () => ({
  connected: shouldConnectFirestoreEmulator({
    isTestEnv: isTestFirebaseEnvironment,
    projectId: firebaseConfig.projectId
  }),
  host: FIRESTORE_EMULATOR_HOST,
  port: FIRESTORE_EMULATOR_PORT,
  projectId: firebaseConfig.projectId || ''
});

export const subscribeToAdminStatus = ({
  currentUser,
  onChange,
  onError = () => {},
  onDebug = () => {},
  firestore = getFirebaseFirestore()
}) => {
  const baseDebug = {
    uidPrefix: maskUid(currentUser?.uid),
    isAnonymous: currentUser?.isAnonymous === true,
    firestoreEmulator: getFirestoreEmulatorDebugStatus()
  };

  if (!isEligibleAdminAuthUser(currentUser)) {
    onChange(false);
    onDebug({
      ...baseDebug,
      status: 'not_eligible',
      documentFound: false,
      roleValid: false,
      enabled: false,
      isAdmin: false
    });
    return () => {};
  }

  const adminRef = doc(firestore, ADMIN_COLLECTION, currentUser.uid);
  onDebug({
    ...baseDebug,
    status: 'loading',
    documentFound: false,
    roleValid: false,
    enabled: false,
    isAdmin: false
  });

  return onSnapshot(adminRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : null;
    const roleValid = data?.role === 'admin';
    const enabled = data?.enabled === true;
    const isAdmin = snapshot.exists() && isValidAdminDocument(data);
    onChange(isAdmin);
    onDebug({
      ...baseDebug,
      status: 'ready',
      documentFound: snapshot.exists(),
      roleValid,
      enabled,
      isAdmin
    });
  }, (error) => {
    onChange(false);
    onDebug({
      ...baseDebug,
      status: 'error',
      documentFound: false,
      roleValid: false,
      enabled: false,
      isAdmin: false,
      errorCode: error?.code || 'unknown'
    });
    onError(error);
  });
};
