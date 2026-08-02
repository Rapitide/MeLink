import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { shouldShowLegacyMigrationPrompt } from '../../src/pages/legacyMigrationPromptModel.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test('legacyUserId missing does not block completed Apple profile from continuing', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: {
      status: 'success',
      profileSetupCompleted: true,
      hasLegacyUserId: false
    },
    flags: { legacyLinkEnabled: false }
  }), false);
});

test('legacyUserId existing also allows completed Apple profile to continue without prompt', () => {
  assert.equal(shouldShowLegacyMigrationPrompt({
    profileResult: {
      status: 'success',
      profileSetupCompleted: true,
      hasLegacyUserId: true
    },
    flags: { legacyLinkEnabled: true }
  }), false);
});

test('profile setup incomplete cannot continue to MainApp', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.match(source, /profileResult\?\.status !== 'success'/);
  assert.match(source, /profileResult\.profileSetupCompleted !== true/);
});

test('AuthScreen exposes onAppleAuthComplete callback', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.match(source, /onAppleAuthComplete/);
  assert.match(source, /completeAppleAuth/);
});

test('あとで行う routes through completeAppleAuth instead of profile done stop screen', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  const afterLaterMessageIndex = source.indexOf('旧アカウント連携はあとで行えます。');
  const completionCallIndex = source.indexOf('completeAppleAuth(appleProfileResult)', afterLaterMessageIndex);
  assert.notEqual(afterLaterMessageIndex, -1);
  assert.notEqual(completionCallIndex, -1);
});

test('legacy linking success routes through completeAppleAuth', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  const successIndex = source.indexOf("if (result.status === 'success')", source.indexOf('handleAppleLegacySubmit'));
  const completionCallIndex = source.indexOf('completeAppleAuth({', successIndex);
  assert.notEqual(successIndex, -1);
  assert.notEqual(completionCallIndex, -1);
});

test('completion callback is guarded against duplicate calls', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.match(source, /appleAuthCompleteInFlightRef/);
});

test('completion does not use storage, tokens, or manual user mutation in AuthScreen', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|getIdToken|identityToken|authorizationCode|nonce|accessToken|refreshToken/);
  assert.doesNotMatch(source, /currentUser\s*=/);
});

test('MainApp wires onAppleAuthComplete into AuthScreen', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /handleAppleAuthComplete/);
  assert.match(source, /onAppleAuthComplete=\{handleAppleAuthComplete\}/);
});

test('MainApp uses Firebase uid as the Apple account id', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /setCurrentAccountId\(profile\.uid\)/);
  assert.match(source, /firebaseUid: profile\.uid/);
});

test('Apple completion does not require legacyUserId', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  const handlerStart = source.indexOf('const handleAppleAuthComplete');
  const handlerEnd = source.indexOf('const switchRoom', handlerStart);
  const handlerSource = source.slice(handlerStart, handlerEnd);
  const guardEnd = handlerSource.indexOf('const displayName');
  const guardSource = handlerSource.slice(0, guardEnd);
  assert.match(handlerSource, /legacyUserId: profile\.legacyUserId \|\| null/);
  assert.doesNotMatch(guardSource, /legacyUserId/);
  assert.match(handlerSource, /hasLegacyUserId/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
