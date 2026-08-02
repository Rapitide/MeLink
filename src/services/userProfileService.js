import {
  doc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

import { getFirebaseFirestore } from '../config/firebaseClient';
import { isTestFirebaseEnvironment } from '../config/firebaseConfig';
import { featureFlags } from '../config/featureFlags';

const APPLE_PROVIDER_ID = 'apple.com';
const RESERVED_HANDLES = new Set([
  'admin',
  'administrator',
  'system',
  'support',
  'official',
  'null',
  'undefined',
  'apple',
  'firebase',
  'saitama',
  'saidai'
]);

const getDb = () => getFirebaseFirestore();

const isUserProfileInitializationAvailable = () => (
  featureFlags.appleAuthEnabled && isTestFirebaseEnvironment
);

const hasLegacyUserId = (value) => (
  typeof value === 'string' && value.trim().length > 0
);

const normalizeDisplayName = (value) => (
  String(value || '').normalize('NFKC').trim()
);

const normalizeHandle = (value) => (
  String(value || '').normalize('NFKC').trim().replace(/^@+/, '').toLowerCase()
);

export const validateInitialProfileInput = ({ displayName, handle }) => {
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const normalizedHandle = normalizeHandle(handle);

  if (!normalizedDisplayName) {
    return { isValid: false, field: 'displayName', message: '表示名を入力してください。' };
  }

  if (normalizedDisplayName.length > 30) {
    return { isValid: false, field: 'displayName', message: '表示名は30文字以内で入力してください。' };
  }

  if (normalizedHandle.length < 3 || normalizedHandle.length > 20) {
    return { isValid: false, field: 'handle', message: 'IDは3文字以上20文字以下で入力してください。' };
  }

  if (!/^[a-z0-9_]+$/.test(normalizedHandle)) {
    return { isValid: false, field: 'handle', message: 'IDに使える文字は半角英小文字、数字、アンダースコアのみです。' };
  }

  if (normalizedHandle.startsWith('_') || normalizedHandle.endsWith('_')) {
    return { isValid: false, field: 'handle', message: 'IDの先頭と末尾にアンダースコアは使えません。' };
  }

  if (normalizedHandle.includes('__')) {
    return { isValid: false, field: 'handle', message: 'IDに連続するアンダースコアは使えません。' };
  }

  if (RESERVED_HANDLES.has(normalizedHandle)) {
    return { isValid: false, field: 'handle', message: 'このIDは使用できません。' };
  }

  return {
    isValid: true,
    normalizedDisplayName,
    normalizedHandle
  };
};

const toProfileResult = ({ uid, isNewProfile, data }) => ({
  status: 'success',
  uid,
  isNewProfile,
  displayName: data.displayName || null,
  handle: data.handle || null,
  profileSetupCompleted: data.profileSetupCompleted === true,
  legacyUserId: hasLegacyUserId(data.legacyUserId) ? data.legacyUserId : null,
  hasLegacyUserId: hasLegacyUserId(data.legacyUserId)
});

export const ensureAppleUserProfile = async ({ uid, providerId }) => {
  if (!isUserProfileInitializationAvailable()) {
    return { status: 'disabled', code: 'profile/apple-profile-disabled' };
  }

  if (!uid || providerId !== APPLE_PROVIDER_ID) {
    return { status: 'invalid_auth_result', code: 'profile/apple-auth-result-required' };
  }

  try {
    const db = getDb();
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const snapshot = await transaction.get(userRef);

      if (snapshot.exists()) {
        return toProfileResult({
          uid,
          isNewProfile: false,
          data: snapshot.data() || {}
        });
      }

      const initialProfile = {
        uid,
        handle: null,
        displayName: null,
        authProviders: [APPLE_PROVIDER_ID],
        appleLinked: true,
        profileSetupCompleted: false,
        legacyUserId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      transaction.set(userRef, initialProfile);

      return toProfileResult({
        uid,
        isNewProfile: true,
        data: initialProfile
      });
    });
  } catch (error) {
    return {
      status: 'error',
      uid,
      code: error?.code || 'profile/unknown'
    };
  }
};

export const completeInitialAppleUserProfile = async ({ uid, providerId, displayName, handle }) => {
  if (!isUserProfileInitializationAvailable()) {
    return { status: 'disabled', code: 'profile/apple-profile-disabled' };
  }

  if (!uid || providerId !== APPLE_PROVIDER_ID) {
    return { status: 'invalid_auth_result', code: 'profile/apple-auth-result-required' };
  }

  const validation = validateInitialProfileInput({ displayName, handle });
  if (!validation.isValid) {
    return {
      status: 'validation_error',
      field: validation.field,
      message: validation.message
    };
  }

  const { normalizedDisplayName, normalizedHandle } = validation;

  try {
    const db = getDb();
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const handleRef = doc(db, 'handles', normalizedHandle);
      const userSnapshot = await transaction.get(userRef);

      if (!userSnapshot.exists()) {
        return { status: 'missing_profile', code: 'profile/user-not-found' };
      }

      const userData = userSnapshot.data() || {};

      if (userData.uid !== uid) {
        return { status: 'uid_mismatch', code: 'profile/uid-mismatch' };
      }

      if (userData.profileSetupCompleted === true) {
        return toProfileResult({
          uid,
          isNewProfile: false,
          data: userData
        });
      }

      const handleSnapshot = await transaction.get(handleRef);
      if (handleSnapshot.exists()) {
        const handleData = handleSnapshot.data() || {};
        if (handleData.uid !== uid) {
          return { status: 'handle_taken', code: 'profile/handle-taken' };
        }
      } else {
        transaction.set(handleRef, {
          uid,
          createdAt: serverTimestamp()
        });
      }

      const updatedProfile = {
        ...userData,
        displayName: normalizedDisplayName,
        handle: normalizedHandle,
        profileSetupCompleted: true,
        updatedAt: serverTimestamp()
      };

      transaction.update(userRef, {
        displayName: normalizedDisplayName,
        handle: normalizedHandle,
        profileSetupCompleted: true,
        updatedAt: serverTimestamp()
      });

      return toProfileResult({
        uid,
        isNewProfile: false,
        data: updatedProfile
      });
    });
  } catch (error) {
    return {
      status: 'error',
      uid,
      code: error?.code || 'profile/unknown'
    };
  }
};
