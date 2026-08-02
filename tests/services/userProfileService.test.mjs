import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test('ensureAppleUserProfile uses shared Firestore helper', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  assert.match(source, /getFirebaseFirestore/);
  assert.doesNotMatch(source, /getFirestore\(/);
});

test('ensureAppleUserProfile requires apple provider result', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  assert.match(source, /providerId !== APPLE_PROVIDER_ID/);
  assert.match(source, /profile\/apple-auth-result-required/);
});

test('ensureAppleUserProfile creates the Rules-compatible initial fields', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  for (const field of [
    'uid',
    'handle: null',
    'displayName: null',
    'authProviders: [APPLE_PROVIDER_ID]',
    'appleLinked: true',
    'profileSetupCompleted: false',
    'legacyUserId: null',
    'createdAt: serverTimestamp()',
    'updatedAt: serverTimestamp()'
  ]) {
    assert.match(source, new RegExp(field.replace(/[()[\]]/g, '\\$&')));
  }
});

test('profile result exposes legacyUserId without exposing password fields', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  assert.match(source, /legacyUserId: hasLegacyUserId\(data\.legacyUserId\) \? data\.legacyUserId : null/);
  assert.doesNotMatch(source, /saved_password/);
});

test('ensureAppleUserProfile does not persist email, tokens, or nonce', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  assert.doesNotMatch(source, /email|identityToken|authorizationCode|firebaseIdToken|accessToken|refreshToken|nonce/);
});

test('ensureAppleUserProfile reads before writing and skips set when profile exists', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  const getIndex = source.indexOf('const snapshot = await transaction.get(userRef)');
  const existsIndex = source.indexOf('if (snapshot.exists())');
  const setIndex = source.indexOf('transaction.set(userRef, initialProfile)');

  assert.ok(getIndex >= 0);
  assert.ok(existsIndex > getIndex);
  assert.ok(setIndex > existsIndex);
});

test('completeInitialAppleUserProfile reserves handle and updates user in one transaction', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  assert.match(source, /runTransaction\(db/);
  assert.match(source, /transaction\.set\(handleRef/);
  assert.match(source, /transaction\.update\(userRef/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
