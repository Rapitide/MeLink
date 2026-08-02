import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  getLegacyMigrationPromptErrorMessage,
  runLegacyMigrationPromptSubmit,
  shouldShowLegacyMigrationPrompt
} from '../../src/pages/legacyMigrationPromptModel.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const completeUnlinkedProfile = {
  status: 'success',
  profileSetupCompleted: true,
  hasLegacyUserId: false
};

test('completed Apple profile without legacyUserId shows the prompt', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: completeUnlinkedProfile,
    flags: { legacyLinkEnabled: true }
  }), true);
});

test('legacyLink flag false hides the prompt', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: completeUnlinkedProfile,
    flags: { legacyLinkEnabled: false }
  }), false);
});

test('incomplete profile hides the prompt', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: {
      status: 'success',
      profileSetupCompleted: false,
      hasLegacyUserId: false
    },
    flags: { legacyLinkEnabled: true }
  }), false);
});

test('existing legacyUserId hides the prompt', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: {
      status: 'success',
      profileSetupCompleted: true,
      hasLegacyUserId: true
    },
    flags: { legacyLinkEnabled: true }
  }), false);
});

test('profile errors hide the prompt', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: { status: 'error' },
    flags: { legacyLinkEnabled: true }
  }), false);
});

test('successful submit returns safe success and clears password', async () => {
  let calls = 0;
  const result = await runLegacyMigrationPromptSubmit({
    legacyUserId: 'testuser',
    legacyPassword: 'password123',
    linkLegacyAccountFn: async (payload) => {
      calls += 1;
      assert.deepEqual(payload, {
        legacyUserId: 'testuser',
        legacyPassword: 'password123'
      });
      return { linked: true, legacyUserId: 'testuser' };
    }
  });

  assert.equal(calls, 1);
  assert.equal(result.status, 'success');
  assert.equal(result.legacyUserId, 'testuser');
  assert.equal(result.clearPassword, true);
});

test('legacy password is passed without trimming', async () => {
  let receivedPassword = '';
  await runLegacyMigrationPromptSubmit({
    legacyUserId: 'testuser',
    legacyPassword: ' password123 ',
    linkLegacyAccountFn: async ({ legacyPassword }) => {
      receivedPassword = legacyPassword;
      return { linked: true, legacyUserId: 'testuser' };
    }
  });

  assert.equal(receivedPassword, ' password123 ');
});

test('known errors are mapped to fixed messages', async () => {
  const result = await runLegacyMigrationPromptSubmit({
    legacyUserId: 'testuser',
    legacyPassword: 'wrongpassword',
    linkLegacyAccountFn: async () => ({ status: 'error', code: 'verification_failed' })
  });

  assert.equal(result.status, 'error');
  assert.equal(result.message, '旧IDまたは旧パスワードを確認してください。');
  assert.equal(result.clearPassword, false);
});

test('unknown errors use temporary failure copy', () => {
  assert.equal(getLegacyMigrationPromptErrorMessage('unexpected'), '一時的なエラーが発生しました。');
});

test('AuthScreen uses legacyMigrationService but not debug page internals', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.match(source, /linkLegacyAccount/);
  assert.match(source, /runLegacyMigrationPromptSubmit/);
  assert.doesNotMatch(source, /LegacyMigrationDebugPage|\/dev\/legacy-migration|runLegacyMigrationDebugSubmit/);
});

test('AuthScreen does not import Firestore or Functions SDK for legacy linking', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.doesNotMatch(source, /firebase\/firestore|firebase\/functions|httpsCallable|getFunctions/);
});

test('AuthScreen does not use storage, console, token, email, or URL payloads for legacy linking', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage|URLSearchParams|location\.search/);
  assert.doesNotMatch(source, /getIdToken|identityToken|authorizationCode|nonce|accessToken|refreshToken|email/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
