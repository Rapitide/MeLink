import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable
} from 'firebase/functions';

import { getFirebaseApp, getFirebaseAuth } from '../config/firebaseClient.js';
import { isTestFirebaseEnvironment } from '../config/firebaseConfig.js';
import { featureFlags, firebaseFunctionsRegion } from '../config/featureFlags.js';

const APPLE_PROVIDER_ID = 'apple.com';
const LINK_LEGACY_ACCOUNT_FUNCTION = 'linkLegacyAccount';
const FUNCTIONS_EMULATOR_HOST = '127.0.0.1';
const FUNCTIONS_EMULATOR_PORT = 5001;
const EMULATOR_CONNECTION_KEY = '__melinkFunctionsEmulatorConnected';

const errorCodeMap = Object.freeze({
  unauthenticated: 'not_authenticated',
  'permission-denied': 'verification_failed',
  'invalid-argument': 'invalid_input',
  'already-exists': 'legacy_account_already_linked',
  'failed-precondition': 'account_state_invalid',
  internal: 'temporary_failure'
});

let activeLinkRequest = null;

const defaultGetAuth = () => getFirebaseAuth();

const defaultGetFunctions = () => {
  const functions = getFunctions(getFirebaseApp(), firebaseFunctionsRegion);
  connectToFunctionsEmulatorIfNeeded(functions);
  return functions;
};

export const normalizeLegacyUserIdForLink = (legacyUserId) => (
  legacyUserId.trim().normalize('NFKC').trim()
);

export const normalizeFunctionsErrorCode = (error) => {
  const rawCode = String(error?.code || 'internal');
  const code = rawCode.startsWith('functions/')
    ? rawCode.slice('functions/'.length)
    : rawCode;

  return errorCodeMap[code] || 'temporary_failure';
};

export const isAppleProviderCurrentUser = (currentUser) => (
  !!currentUser
    && currentUser.isAnonymous !== true
    && Array.isArray(currentUser.providerData)
    && currentUser.providerData.some((provider) => provider?.providerId === APPLE_PROVIDER_ID)
);

export const connectToFunctionsEmulatorIfNeeded = (functions) => {
  if (!isTestFirebaseEnvironment) return;

  const connected = globalThis[EMULATOR_CONNECTION_KEY] || new Set();
  const key = `${firebaseFunctionsRegion}:${FUNCTIONS_EMULATOR_HOST}:${FUNCTIONS_EMULATOR_PORT}`;

  if (!connected.has(key)) {
    connectFunctionsEmulator(functions, FUNCTIONS_EMULATOR_HOST, FUNCTIONS_EMULATOR_PORT);
    connected.add(key);
    globalThis[EMULATOR_CONNECTION_KEY] = connected;
  }
};

const isLegacyLinkAvailable = ({ flags = featureFlags, isTestEnv = isTestFirebaseEnvironment } = {}) => (
  flags.appleAuthEnabled === true
    && flags.legacyLinkEnabled === true
    && isTestEnv === true
);

const validateClientInput = ({ legacyUserId, legacyPassword }) => {
  if (typeof legacyUserId !== 'string' || typeof legacyPassword !== 'string') {
    return { isValid: false, code: 'invalid_input' };
  }

  return {
    isValid: true,
    normalizedLegacyUserId: normalizeLegacyUserIdForLink(legacyUserId)
  };
};

const toSafeError = (code) => ({
  status: 'error',
  code
});

const normalizeCallableSuccess = (result) => {
  const data = result?.data;
  if (data?.linked === true && typeof data.legacyUserId === 'string') {
    return {
      linked: true,
      legacyUserId: data.legacyUserId
    };
  }

  return toSafeError('temporary_failure');
};

export const linkLegacyAccount = async ({ legacyUserId, legacyPassword }, dependencies = {}) => {
  if (activeLinkRequest) {
    return toSafeError('request_in_progress');
  }

  const request = (async () => {
    const {
      callableFactory = httpsCallable,
      flags = featureFlags,
      getAuthInstance = defaultGetAuth,
      getFunctionsInstance = defaultGetFunctions,
      isTestEnv = isTestFirebaseEnvironment
    } = dependencies;

    if (!isLegacyLinkAvailable({ flags, isTestEnv })) {
      return toSafeError('disabled');
    }

    const currentUser = getAuthInstance()?.currentUser || null;
    if (!currentUser) {
      return toSafeError('not_authenticated');
    }

    if (currentUser.isAnonymous === true) {
      return toSafeError('not_authenticated');
    }

    if (!isAppleProviderCurrentUser(currentUser)) {
      return toSafeError('permission_denied');
    }

    const validation = validateClientInput({ legacyUserId, legacyPassword });
    if (!validation.isValid) {
      return toSafeError(validation.code);
    }

    try {
      const callable = callableFactory(getFunctionsInstance(), LINK_LEGACY_ACCOUNT_FUNCTION);
      const result = await callable({
        legacyUserId: validation.normalizedLegacyUserId,
        legacyPassword
      });

      return normalizeCallableSuccess(result);
    } catch (error) {
      return toSafeError(normalizeFunctionsErrorCode(error));
    }
  })();

  activeLinkRequest = request;

  try {
    return await request;
  } finally {
    activeLinkRequest = null;
  }
};

export const __legacyMigrationServiceTestInternals = {
  FUNCTIONS_EMULATOR_HOST,
  FUNCTIONS_EMULATOR_PORT,
  LINK_LEGACY_ACCOUNT_FUNCTION,
  errorCodeMap,
  isLegacyLinkAvailable,
  validateClientInput
};
