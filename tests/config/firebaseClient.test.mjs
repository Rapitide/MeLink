import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

import {
  AUTH_EMULATOR_PORT,
  AUTH_EMULATOR_URL,
  FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  __firebaseClientTestInternals,
  connectAuthEmulatorIfNeeded,
  connectFirestoreEmulatorIfNeeded,
  shouldConnectAuthEmulator,
  shouldConnectFirestoreEmulator
} from '../../src/config/firebaseClient.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const resetAuthEmulatorConnectionState = () => {
  delete globalThis[__firebaseClientTestInternals.AUTH_EMULATOR_CONNECTION_KEY];
};

const resetFirestoreEmulatorConnectionState = () => {
  delete globalThis[__firebaseClientTestInternals.FIRESTORE_EMULATOR_CONNECTION_KEY];
};

test('test Firebase project connects to Auth Emulator', () => {
  assert.equal(shouldConnectAuthEmulator({
    isTestEnv: true,
    projectId: 'melink-functions-test'
  }), true);
});

test('Auth Emulator URL includes http and port 9099', () => {
  assert.equal(AUTH_EMULATOR_PORT, 9099);
  assert.equal(AUTH_EMULATOR_URL, 'http://127.0.0.1:9099');
});

test('test Firebase project connects to Firestore Emulator', () => {
  assert.equal(shouldConnectFirestoreEmulator({
    isTestEnv: true,
    projectId: 'melink-functions-test'
  }), true);
});

test('Firestore Emulator host and port match functions test config', () => {
  assert.equal(FIRESTORE_EMULATOR_HOST, '127.0.0.1');
  assert.equal(FIRESTORE_EMULATOR_PORT, 48080);
});

test('non-test environment does not connect to Auth Emulator', () => {
  assert.equal(shouldConnectAuthEmulator({
    isTestEnv: false,
    projectId: 'melink-functions-test'
  }), false);
});

test('known production Firebase project does not connect to Auth Emulator', () => {
  assert.equal(shouldConnectAuthEmulator({
    isTestEnv: true,
    projectId: 'twitter-112c1'
  }), false);
});

test('known production Firebase project does not connect to Firestore Emulator', () => {
  assert.equal(shouldConnectFirestoreEmulator({
    isTestEnv: true,
    projectId: 'twitter-112c1'
  }), false);
});

test('missing projectId does not connect to Auth Emulator', () => {
  assert.equal(shouldConnectAuthEmulator({
    isTestEnv: true,
    projectId: ''
  }), false);
});

test('connectAuthEmulatorIfNeeded calls connector with safe URL and disabled warnings', () => {
  resetAuthEmulatorConnectionState();
  const calls = [];

  const connected = connectAuthEmulatorIfNeeded(
    { name: 'auth' },
    {
      connector: (...args) => calls.push(args),
      isTestEnv: true,
      projectId: 'melink-functions-test'
    }
  );

  assert.equal(connected, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'http://127.0.0.1:9099');
  assert.deepEqual(calls[0][2], { disableWarnings: true });
});

test('connectFirestoreEmulatorIfNeeded calls connector with safe host and port', () => {
  resetFirestoreEmulatorConnectionState();
  const calls = [];

  const connected = connectFirestoreEmulatorIfNeeded(
    { name: 'firestore' },
    {
      connector: (...args) => calls.push(args),
      isTestEnv: true,
      projectId: 'melink-functions-test'
    }
  );

  assert.equal(connected, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], '127.0.0.1');
  assert.equal(calls[0][2], 48080);
});

test('connectFirestoreEmulatorIfNeeded prevents duplicate connection for hot reload', () => {
  resetFirestoreEmulatorConnectionState();
  const calls = [];
  const options = {
    connector: (...args) => calls.push(args),
    isTestEnv: true,
    projectId: 'melink-functions-test'
  };

  assert.equal(connectFirestoreEmulatorIfNeeded({ name: 'firestore' }, options), true);
  assert.equal(connectFirestoreEmulatorIfNeeded({ name: 'firestore' }, options), false);
  assert.equal(calls.length, 1);
});

test('connectAuthEmulatorIfNeeded prevents duplicate connection for hot reload', () => {
  resetAuthEmulatorConnectionState();
  const calls = [];
  const options = {
    connector: (...args) => calls.push(args),
    isTestEnv: true,
    projectId: 'melink-functions-test'
  };

  assert.equal(connectAuthEmulatorIfNeeded({ name: 'auth' }, options), true);
  assert.equal(connectAuthEmulatorIfNeeded({ name: 'auth' }, options), false);
  assert.equal(calls.length, 1);
});

test('connectAuthEmulatorIfNeeded does not swallow duplicate connection exceptions', () => {
  resetAuthEmulatorConnectionState();
  assert.throws(() => connectAuthEmulatorIfNeeded(
    { name: 'auth' },
    {
      connector: () => {
        throw new Error('duplicate connection');
      },
      isTestEnv: true,
      projectId: 'melink-functions-test'
    }
  ), /duplicate connection/);
});

test('getFirebaseAuth connects after getAuth and before returning auth', async () => {
  const source = await readFile('src/config/firebaseClient.js', 'utf8');
  const getAuthIndex = source.indexOf('const auth = getAuth(getFirebaseApp())');
  const connectIndex = source.indexOf('connectAuthEmulatorIfNeeded(auth)');
  const returnIndex = source.indexOf('return auth');

  assert.ok(getAuthIndex >= 0);
  assert.ok(connectIndex > getAuthIndex);
  assert.ok(returnIndex > connectIndex);
});

test('getFirebaseFirestore connects after getFirestore and before returning firestore', async () => {
  const source = await readFile('src/config/firebaseClient.js', 'utf8');
  const getFirestoreIndex = source.indexOf('const firestore = getFirestore(getFirebaseApp())');
  const connectIndex = source.indexOf('connectFirestoreEmulatorIfNeeded(firestore)');
  const returnIndex = source.indexOf('return firestore');

  assert.ok(getFirestoreIndex >= 0);
  assert.ok(connectIndex > getFirestoreIndex);
  assert.ok(returnIndex > connectIndex);
});

test('functions test config includes Auth, Firestore, Functions, and Hub ports', async () => {
  const config = JSON.parse(await readFile('firebase.functions-test.json', 'utf8'));

  assert.deepEqual(config.emulators.auth, { host: '127.0.0.1', port: 9099 });
  assert.deepEqual(config.emulators.firestore, { host: '127.0.0.1', port: 48080 });
  assert.deepEqual(config.emulators.functions, { host: '127.0.0.1', port: 5001 });
  assert.deepEqual(config.emulators.hub, { host: '127.0.0.1', port: 4401 });
});

test('functions test config loads firestore.rules', async () => {
  const config = JSON.parse(await readFile('firebase.functions-test.json', 'utf8'));
  assert.equal(config.firestore.rules, 'firestore.rules');
});

test('Apple auth service keeps OAuthProvider apple.com', async () => {
  const source = await readFile('src/services/appleAuth.js', 'utf8');
  assert.match(source, /new OAuthProvider\(APPLE_PROVIDER_ID\)/);
  assert.match(source, /APPLE_PROVIDER_ID = 'apple\.com'/);
});

test('Apple auth service keeps signInWithPopup and redirect fallback', async () => {
  const source = await readFile('src/services/appleAuth.js', 'utf8');
  assert.match(source, /signInWithPopup/);
  assert.match(source, /signInWithRedirect/);
});

test('Apple auth service does not use custom token or email password login', async () => {
  const source = await readFile('src/services/appleAuth.js', 'utf8');
  assert.doesNotMatch(source, /signInWithCustomToken|customToken|createCustomToken/);
  assert.doesNotMatch(source, /signInWithEmailAndPassword|createUserWithEmailAndPassword/);
});

test('Apple auth service does not manually handle tokens or providerData', async () => {
  const source = await readFile('src/services/appleAuth.js', 'utf8');
  assert.doesNotMatch(source, /getIdToken|identityToken|authorizationCode|nonce|accessToken|refreshToken/);
  assert.doesNotMatch(source, /providerData\s*=|providerData\.push|providerData\.splice/);
});

test('Auth Emulator helper does not use signInAnonymously or fake provider injection', async () => {
  const source = await readFile('src/config/firebaseClient.js', 'utf8');
  assert.doesNotMatch(source, /signInAnonymously|providerData|customToken|signInWithCustomToken/);
});

test('debug page uses shared Firebase Auth helper', async () => {
  const source = await readFile('src/pages/LegacyMigrationDebugPage.jsx', 'utf8');
  assert.match(source, /getFirebaseAuth/);
  assert.doesNotMatch(source, /getAuth\(|connectAuthEmulator/);
});

test('legacy migration service uses shared Firebase Auth helper', async () => {
  const source = await readFile('src/services/legacyMigrationService.js', 'utf8');
  assert.match(source, /getFirebaseAuth/);
  assert.doesNotMatch(source, /getAuth\(/);
});

test('MainApp uses shared Firebase Auth helper', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /getFirebaseAuth/);
  assert.doesNotMatch(source, /getAuth\(app\)/);
});

test('MainApp uses shared Firebase Firestore helper', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /getFirebaseFirestore/);
  assert.doesNotMatch(source, /getFirestore\(app\)/);
});

test('user profile service uses shared Firebase Firestore helper', async () => {
  const source = await readFile('src/services/userProfileService.js', 'utf8');
  assert.match(source, /getFirebaseFirestore/);
  assert.doesNotMatch(source, /getFirestore\(/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
