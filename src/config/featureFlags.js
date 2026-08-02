import { isTestFirebaseEnvironment } from './firebaseConfig.js';

const env = import.meta.env || {};

const isEnabled = (value) => String(value || '').toLowerCase() === 'true';
const forceTestFirebaseOnly = env.VITE_FORCE_TEST_FIREBASE_ONLY !== 'false';
const canEnableAuthMigration = !forceTestFirebaseOnly || isTestFirebaseEnvironment;

export const featureFlags = Object.freeze({
  appleAuthEnabled: canEnableAuthMigration && isEnabled(env.VITE_APPLE_AUTH_ENABLED),
  authProfileSetupEnabled: canEnableAuthMigration && isEnabled(env.VITE_AUTH_PROFILE_SETUP_ENABLED),
  legacyLinkEnabled: canEnableAuthMigration && isEnabled(env.VITE_LEGACY_LINK_ENABLED),
  disableAnonymousWrites: canEnableAuthMigration && isEnabled(env.VITE_DISABLE_ANONYMOUS_WRITES),
  forceTestFirebaseOnly
});

export const firebaseFunctionsRegion = env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-northeast1';
export const legacyLinkFunctionUrl = env.VITE_LEGACY_LINK_FUNCTION_URL || '';
