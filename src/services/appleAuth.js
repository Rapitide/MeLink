import {
  getAdditionalUserInfo,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';

import { getFirebaseAuth } from '../config/firebaseClient';
import { isTestFirebaseEnvironment } from '../config/firebaseConfig';
import { featureFlags } from '../config/featureFlags';

const APPLE_PROVIDER_ID = 'apple.com';

const createAppleProvider = () => {
  const provider = new OAuthProvider(APPLE_PROVIDER_ID);
  provider.addScope('name');
  return provider;
};

const isAppleAuthAvailable = () => (
  featureFlags.appleAuthEnabled && isTestFirebaseEnvironment
);

const toSafeSuccessResult = (authResult) => {
  const additionalUserInfo = getAdditionalUserInfo(authResult);
  const safeResult = {
    status: 'success',
    uid: authResult.user.uid,
    providerId: additionalUserInfo?.providerId || APPLE_PROVIDER_ID
  };

  if (authResult.user.displayName) {
    safeResult.displayName = authResult.user.displayName;
  }

  if (typeof additionalUserInfo?.isNewUser === 'boolean') {
    safeResult.isNewUser = additionalUserInfo.isNewUser;
  }

  return safeResult;
};

const toSafeErrorResult = (error) => {
  const code = error?.code || 'auth/unknown';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return { status: 'cancelled', code };
  }

  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported'
  ) {
    return { status: 'popup_unavailable', code };
  }

  return { status: 'error', code };
};

export const signInWithApplePopup = async () => {
  if (!isAppleAuthAvailable()) {
    return { status: 'disabled', code: 'auth/apple-sign-in-disabled' };
  }

  try {
    const result = await signInWithPopup(getFirebaseAuth(), createAppleProvider());
    return toSafeSuccessResult(result);
  } catch (error) {
    return toSafeErrorResult(error);
  }
};

export const startAppleSignInRedirect = async () => {
  if (!isAppleAuthAvailable()) {
    return { status: 'disabled', code: 'auth/apple-sign-in-disabled' };
  }

  try {
    await signInWithRedirect(getFirebaseAuth(), createAppleProvider());
    return { status: 'redirect_started' };
  } catch (error) {
    return toSafeErrorResult(error);
  }
};
