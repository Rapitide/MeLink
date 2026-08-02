import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

import {
  APPLE_AUTH_DEBUG_PATH,
  getAppleAuthDebugErrorMessage,
  getAppleAuthDebugState,
  isAppleAuthDebugPageAvailable,
  maskUid,
  toAppleAuthDebugResult
} from '../../src/pages/appleAuthDebugPageModel.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const appleUser = {
  uid: 'abcdef1234567890',
  isAnonymous: false,
  providerData: [{ providerId: 'apple.com' }]
};

test('DEV + test + Apple flag enabled makes route available', () => {
  assert.equal(isAppleAuthDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags: { appleAuthEnabled: true }
  }), true);
});

test('production build makes route unavailable', () => {
  assert.equal(isAppleAuthDebugPageAvailable({
    isDev: false,
    isTestEnv: true,
    flags: { appleAuthEnabled: true }
  }), false);
});

test('non-test environment makes route unavailable', () => {
  assert.equal(isAppleAuthDebugPageAvailable({
    isDev: true,
    isTestEnv: false,
    flags: { appleAuthEnabled: true }
  }), false);
});

test('Apple flag false makes route unavailable', () => {
  assert.equal(isAppleAuthDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags: { appleAuthEnabled: false }
  }), false);
});

test('missing currentUser is unauthenticated', () => {
  assert.deepEqual(getAppleAuthDebugState(null), {
    isAuthenticated: false,
    isAnonymous: false,
    hasAppleProvider: false,
    canOpenLegacyMigration: false
  });
});

test('authenticated Apple user can open legacy migration', () => {
  assert.deepEqual(getAppleAuthDebugState(appleUser), {
    isAuthenticated: true,
    isAnonymous: false,
    hasAppleProvider: true,
    canOpenLegacyMigration: true
  });
});

test('anonymous user cannot open legacy migration', () => {
  assert.equal(getAppleAuthDebugState({
    isAnonymous: true,
    providerData: [{ providerId: 'apple.com' }]
  }).canOpenLegacyMigration, false);
});

test('non-Apple provider user cannot open legacy migration', () => {
  assert.equal(getAppleAuthDebugState({
    isAnonymous: false,
    providerData: [{ providerId: 'password' }]
  }).canOpenLegacyMigration, false);
});

test('uid is masked to a prefix only', () => {
  assert.equal(maskUid('abcdef1234567890'), 'abcdef...');
  assert.equal(maskUid('abc'), 'abc');
  assert.equal(maskUid(null), '');
});

test('successful apple service result maps to safe success copy', () => {
  assert.deepEqual(toAppleAuthDebugResult({ status: 'success', uid: 'abcdef1234567890' }), {
    status: 'success',
    message: 'Appleログインが完了しました。'
  });
});

test('cancelled apple service result maps to info copy', () => {
  assert.deepEqual(toAppleAuthDebugResult({
    status: 'cancelled',
    code: 'auth/popup-closed-by-user'
  }), {
    status: 'info',
    message: 'Appleログインがキャンセルされました。'
  });
});

test('popup closed maps to fixed message', () => {
  assert.equal(getAppleAuthDebugErrorMessage('auth/popup-closed-by-user'), 'Appleログインがキャンセルされました。');
});

test('popup blocked maps to fixed message', () => {
  assert.equal(getAppleAuthDebugErrorMessage('auth/popup-blocked'), 'ポップアップがブロックされました。');
});

test('unauthorized domain maps to fixed message', () => {
  assert.equal(getAppleAuthDebugErrorMessage('auth/unauthorized-domain'), '現在のURLはAppleログインで許可されていません。');
});

test('unsupported environment maps to fixed message', () => {
  assert.equal(getAppleAuthDebugErrorMessage('auth/operation-not-supported-in-this-environment'), '現在の環境ではAppleログインを利用できません。');
});

test('network failure maps to fixed message', () => {
  assert.equal(getAppleAuthDebugErrorMessage('auth/network-request-failed'), 'ネットワークエラーが発生しました。');
});

test('unknown error maps to generic fixed message', () => {
  assert.equal(getAppleAuthDebugErrorMessage('auth/unknown'), 'Appleログインに失敗しました。');
});

test('App route is conditionally registered through Apple debug availability flag', async () => {
  const source = await readFile('src/App.jsx', 'utf8');
  assert.match(source, /canUseAppleAuthDebugPage/);
  assert.match(source, /APPLE_AUTH_DEBUG_PATH/);
  assert.match(source, /<Route\s+path=\{APPLE_AUTH_DEBUG_PATH\}/);
  assert.equal(APPLE_AUTH_DEBUG_PATH, '/dev/apple-auth');
});

test('page calls existing appleAuth service and not Firebase popup directly', async () => {
  const source = await readFile('src/pages/AppleAuthDebugPage.jsx', 'utf8');
  assert.match(source, /signInWithApplePopup/);
  assert.doesNotMatch(source, /new OAuthProvider|signInWithPopup|signInWithRedirect/);
});

test('page uses existing Firebase Auth instance and onAuthStateChanged', async () => {
  const source = await readFile('src/pages/AppleAuthDebugPage.jsx', 'utf8');
  assert.match(source, /getFirebaseAuth/);
  assert.match(source, /onAuthStateChanged/);
  assert.match(source, /signOut/);
  assert.doesNotMatch(source, /getAuth\(/);
});

test('page prevents duplicate login while loading', async () => {
  const source = await readFile('src/pages/AppleAuthDebugPage.jsx', 'utf8');
  assert.match(source, /signInInFlightRef/);
  assert.match(source, /if \(signInInFlightRef\.current\) return/);
  assert.match(source, /disabled=\{signInDisabled\}/);
});

test('page does not display raw user, providerData, email, token, or raw error', async () => {
  const source = await readFile('src/pages/AppleAuthDebugPage.jsx', 'utf8');
  assert.doesNotMatch(source, /JSON\.stringify|currentUser\}|user\.toJSON|providerData\}|email|getIdToken|identityToken|authorizationCode|nonce|accessToken|refreshToken|credential|error\.message/);
});

test('page does not use storage, console, custom token, or email password login', async () => {
  const source = await readFile('src/pages/AppleAuthDebugPage.jsx', 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\.|signInWithCustomToken|customToken|signInWithEmailAndPassword|createUserWithEmailAndPassword/);
});

test('AuthScreen is not connected to the Apple auth debug route', async () => {
  const source = await readFile('src/AuthScreen.jsx', 'utf8');
  assert.doesNotMatch(source, /AppleAuthDebugPage|\/dev\/apple-auth|APPLE_AUTH_DEBUG_PATH/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
