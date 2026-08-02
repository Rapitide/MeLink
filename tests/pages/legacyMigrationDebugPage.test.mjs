import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

import {
  getDebugAuthState,
  getLegacyMigrationDebugErrorMessage,
  isLegacyMigrationDebugPageAvailable,
  runLegacyMigrationDebugSubmit
} from '../../src/pages/legacyMigrationDebugPageModel.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const appleUser = {
  isAnonymous: false,
  providerData: [{ providerId: 'apple.com' }]
};

test('DEV + test + flags enabled makes the debug page available', () => {
  assert.equal(isLegacyMigrationDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags: { appleAuthEnabled: true, legacyLinkEnabled: true }
  }), true);
});

test('non-DEV build makes the debug page unavailable', () => {
  assert.equal(isLegacyMigrationDebugPageAvailable({
    isDev: false,
    isTestEnv: true,
    flags: { appleAuthEnabled: true, legacyLinkEnabled: true }
  }), false);
});

test('non-test Firebase env makes the debug page unavailable', () => {
  assert.equal(isLegacyMigrationDebugPageAvailable({
    isDev: true,
    isTestEnv: false,
    flags: { appleAuthEnabled: true, legacyLinkEnabled: true }
  }), false);
});

test('disabled Apple flag makes the debug page unavailable', () => {
  assert.equal(isLegacyMigrationDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags: { appleAuthEnabled: false, legacyLinkEnabled: true }
  }), false);
});

test('disabled legacy link flag makes the debug page unavailable', () => {
  assert.equal(isLegacyMigrationDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags: { appleAuthEnabled: true, legacyLinkEnabled: false }
  }), false);
});

test('missing currentUser cannot submit', () => {
  assert.equal(getDebugAuthState(null).canSubmit, false);
});

test('anonymous currentUser cannot submit', () => {
  assert.equal(getDebugAuthState({
    isAnonymous: true,
    providerData: [{ providerId: 'apple.com' }]
  }).canSubmit, false);
});

test('currentUser without Apple provider cannot submit', () => {
  assert.equal(getDebugAuthState({
    isAnonymous: false,
    providerData: [{ providerId: 'password' }]
  }).canSubmit, false);
});

test('Apple provider currentUser can submit', () => {
  assert.equal(getDebugAuthState(appleUser).canSubmit, true);
});

test('valid submit calls linkLegacyAccount once', async () => {
  let calls = 0;
  await runLegacyMigrationDebugSubmit({
    legacyUserId: 'legacy_user',
    legacyPassword: 'password123',
    currentUser: appleUser,
    linkLegacyAccountFn: async () => {
      calls += 1;
      return { linked: true, legacyUserId: 'legacy_user' };
    }
  });

  assert.equal(calls, 1);
});

test('legacyPassword is passed without trimming', async () => {
  let receivedPassword = '';
  await runLegacyMigrationDebugSubmit({
    legacyUserId: 'legacy_user',
    legacyPassword: '  password123  ',
    currentUser: appleUser,
    linkLegacyAccountFn: async ({ legacyPassword }) => {
      receivedPassword = legacyPassword;
      return { linked: true, legacyUserId: 'legacy_user' };
    }
  });

  assert.equal(receivedPassword, '  password123  ');
});

test('successful submit requests password clearing', async () => {
  const result = await runLegacyMigrationDebugSubmit({
    legacyUserId: 'legacy_user',
    legacyPassword: 'password123',
    currentUser: appleUser,
    linkLegacyAccountFn: async () => ({ linked: true, legacyUserId: 'legacy_user' })
  });

  assert.equal(result.status, 'success');
  assert.equal(result.clearPassword, true);
});

test('not_authenticated maps to a fixed message', () => {
  assert.equal(getLegacyMigrationDebugErrorMessage('not_authenticated'), 'Appleアカウントでログインしてください。');
});

test('verification_failed maps to a fixed message', () => {
  assert.equal(getLegacyMigrationDebugErrorMessage('verification_failed'), '旧IDまたは旧パスワードを確認してください。');
});

test('invalid_input maps to a fixed message', () => {
  assert.equal(getLegacyMigrationDebugErrorMessage('invalid_input'), '入力内容を確認してください。');
});

test('legacy_account_already_linked maps to a fixed message', () => {
  assert.equal(getLegacyMigrationDebugErrorMessage('legacy_account_already_linked'), 'この旧アカウントはすでに連携されています。');
});

test('account_state_invalid maps to a fixed message', () => {
  assert.equal(getLegacyMigrationDebugErrorMessage('account_state_invalid'), '現在のアカウント状態では連携できません。');
});

test('internal and unknown errors map to temporary failure copy', () => {
  assert.equal(getLegacyMigrationDebugErrorMessage('temporary_failure'), '一時的なエラーが発生しました。');
  assert.equal(getLegacyMigrationDebugErrorMessage('unexpected'), '一時的なエラーが発生しました。');
});

test('unauthorized submit does not call linkLegacyAccount', async () => {
  let calls = 0;
  const result = await runLegacyMigrationDebugSubmit({
    legacyUserId: 'legacy_user',
    legacyPassword: 'password123',
    currentUser: null,
    linkLegacyAccountFn: async () => {
      calls += 1;
      return { linked: true, legacyUserId: 'legacy_user' };
    }
  });

  assert.equal(calls, 0);
  assert.equal(result.code, 'not_authenticated');
});

test('debug page source does not use storage, console, Firestore, Functions, or link documents directly', async () => {
  const source = await readFile('src/pages/LegacyMigrationDebugPage.jsx', 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\./);
  assert.doesNotMatch(source, /firebase\/firestore|firebase\/functions/);
  assert.doesNotMatch(source, /legacyUserLinks|httpsCallable|getFunctions|connectFunctionsEmulator/);
});

test('debug page does not read tokens or sensitive OAuth fields', async () => {
  const source = await readFile('src/pages/LegacyMigrationDebugPage.jsx', 'utf8');
  assert.doesNotMatch(source, /getIdToken|identityToken|authorizationCode|nonce|accessToken|refreshToken|email/);
});

test('route is conditionally registered only through the debug availability flag', async () => {
  const source = await readFile('src/App.jsx', 'utf8');
  assert.match(source, /canUseLegacyMigrationDebugPage/);
  assert.match(source, /LEGACY_MIGRATION_DEBUG_PATH/);
  assert.match(source, /<Route\s+path=\{LEGACY_MIGRATION_DEBUG_PATH\}/);
});

test('AuthScreen is not connected to the debug route', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.doesNotMatch(source, /LegacyMigrationDebugPage|\/dev\/legacy-migration|runLegacyMigrationDebugSubmit/);
});

test('debug page does not put inputs in the URL', async () => {
  const source = await readFile('src/pages/LegacyMigrationDebugPage.jsx', 'utf8');
  assert.doesNotMatch(source, /URLSearchParams|useSearchParams|location\.search|navigate\(/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
