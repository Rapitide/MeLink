import { isTestFirebaseEnvironment } from '../config/firebaseConfig.js';
import { featureFlags } from '../config/featureFlags.js';

const viteEnv = import.meta.env || {};

export const APPLE_AUTH_DEBUG_PATH = '/dev/apple-auth';

const appleAuthErrorMessages = Object.freeze({
  'auth/popup-closed-by-user': 'Appleログインがキャンセルされました。',
  'auth/cancelled-popup-request': 'Appleログインがキャンセルされました。',
  'auth/popup-blocked': 'ポップアップがブロックされました。',
  'auth/unauthorized-domain': '現在のURLはAppleログインで許可されていません。',
  'auth/operation-not-supported-in-this-environment': '現在の環境ではAppleログインを利用できません。',
  'auth/web-storage-unsupported': '現在の環境ではAppleログインを利用できません。',
  'auth/network-request-failed': 'ネットワークエラーが発生しました。',
  'auth/apple-sign-in-disabled': 'この開発確認機能は現在無効です。'
});

export const isAppleAuthDebugPageAvailable = ({
  isDev,
  isTestEnv,
  flags
}) => (
  isDev === true
    && isTestEnv === true
    && flags?.appleAuthEnabled === true
);

export const canUseAppleAuthDebugPage = isAppleAuthDebugPageAvailable({
  isDev: viteEnv.DEV === true,
  isTestEnv: isTestFirebaseEnvironment,
  flags: featureFlags
});

export const getAppleAuthDebugState = (currentUser) => {
  const isAuthenticated = !!currentUser;
  const isAnonymous = currentUser?.isAnonymous === true;
  const hasAppleProvider = Array.isArray(currentUser?.providerData)
    && currentUser.providerData.some((provider) => provider?.providerId === 'apple.com');

  return {
    isAuthenticated,
    isAnonymous,
    hasAppleProvider,
    canOpenLegacyMigration: isAuthenticated && !isAnonymous && hasAppleProvider
  };
};

export const maskUid = (uid) => {
  if (typeof uid !== 'string' || uid.length === 0) {
    return '';
  }

  const visiblePrefix = uid.slice(0, 6);
  return `${visiblePrefix}${uid.length > visiblePrefix.length ? '...' : ''}`;
};

export const getAppleAuthDebugErrorMessage = (code) => (
  appleAuthErrorMessages[code] || 'Appleログインに失敗しました。'
);

export const toAppleAuthDebugResult = (result) => {
  if (result?.status === 'success') {
    return {
      status: 'success',
      message: 'Appleログインが完了しました。'
    };
  }

  if (result?.status === 'cancelled') {
    return {
      status: 'info',
      message: getAppleAuthDebugErrorMessage(result.code)
    };
  }

  return {
    status: 'error',
    message: getAppleAuthDebugErrorMessage(result?.code)
  };
};
