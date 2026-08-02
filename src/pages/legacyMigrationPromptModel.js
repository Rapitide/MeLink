import { featureFlags } from '../config/featureFlags.js';

const errorMessages = Object.freeze({
  not_authenticated: 'Appleアカウントでログインしてください。',
  permission_denied: 'Appleアカウントでログインしてください。',
  verification_failed: '旧IDまたは旧パスワードを確認してください。',
  invalid_input: '入力内容を確認してください。',
  legacy_account_already_linked: 'この旧アカウントはすでに連携されています。',
  account_state_invalid: '現在のアカウント状態では連携できません。',
  temporary_failure: '一時的なエラーが発生しました。',
  disabled: '旧アカウント連携は現在利用できません。',
  request_in_progress: '連携処理を実行中です。'
});

export const shouldShowLegacyMigrationPrompt = ({
  profileResult,
  flags = featureFlags
}) => (
  flags?.legacyLinkEnabled === true
    && profileResult?.status === 'success'
    && profileResult.profileSetupCompleted === true
    && profileResult.hasLegacyUserId !== true
);

export const getLegacyMigrationPromptErrorMessage = (code) => (
  errorMessages[code] || errorMessages.temporary_failure
);

export const runLegacyMigrationPromptSubmit = async ({
  legacyUserId,
  legacyPassword,
  linkLegacyAccountFn
}) => {
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
    message: getLegacyMigrationPromptErrorMessage(code),
    clearPassword: false
  };
};
