import { isTestFirebaseEnvironment } from '../config/firebaseConfig.js';
import { featureFlags } from '../config/featureFlags.js';

const viteEnv = import.meta.env || {};

export const LEGACY_MIGRATION_DEBUG_PATH = '/dev/legacy-migration';

const errorMessages = Object.freeze({
  not_authenticated: 'Appleアカウントでログインしてください。',
  permission_denied: 'Appleアカウントでログインしてください。',
  verification_failed: '旧IDまたは旧パスワードを確認してください。',
  invalid_input: '入力内容を確認してください。',
  legacy_account_already_linked: 'この旧アカウントはすでに連携されています。',
  account_state_invalid: '現在のアカウント状態では連携できません。',
  temporary_failure: '一時的なエラーが発生しました。',
  disabled: 'この開発確認機能は現在無効です。',
  request_in_progress: '連携処理を実行中です。'
});

export const isLegacyMigrationDebugPageAvailable = ({
  isDev,
  isTestEnv,
  flags
}) => (
  isDev === true
    && isTestEnv === true
    && flags?.appleAuthEnabled === true
    && flags?.legacyLinkEnabled === true
);

export const canUseLegacyMigrationDebugPage = isLegacyMigrationDebugPageAvailable({
  isDev: viteEnv.DEV === true,
  isTestEnv: isTestFirebaseEnvironment,
  flags: featureFlags
});

export const getLegacyMigrationDebugErrorMessage = (code) => (
  errorMessages[code] || errorMessages.temporary_failure
);

export const getDebugAuthState = (currentUser) => {
  const isAuthenticated = !!currentUser;
  const isAnonymous = currentUser?.isAnonymous === true;
  const hasAppleProvider = Array.isArray(currentUser?.providerData)
    && currentUser.providerData.some((provider) => provider?.providerId === 'apple.com');

  return {
    isAuthenticated,
    isAnonymous,
    hasAppleProvider,
    canSubmit: isAuthenticated && !isAnonymous && hasAppleProvider
  };
};

export const runLegacyMigrationDebugSubmit = async ({
  legacyUserId,
  legacyPassword,
  currentUser,
  linkLegacyAccountFn
}) => {
  if (!getDebugAuthState(currentUser).canSubmit) {
    return {
      status: 'error',
      code: 'not_authenticated',
      message: getLegacyMigrationDebugErrorMessage('not_authenticated'),
      clearPassword: false
    };
  }

  const result = await linkLegacyAccountFn({ legacyUserId, legacyPassword });

  if (result?.linked === true) {
    return {
      status: 'success',
      message: '旧アカウントの連携が完了しました。',
      legacyUserId: result.legacyUserId,
      clearPassword: true
    };
  }

  const code = result?.code || 'temporary_failure';

  return {
    status: 'error',
    code,
    message: getLegacyMigrationDebugErrorMessage(code),
    clearPassword: false
  };
};
