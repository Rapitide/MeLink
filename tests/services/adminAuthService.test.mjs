import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  ADMIN_COLLECTION,
  getFirestoreEmulatorDebugStatus,
  isEligibleAdminAuthUser,
  isValidAdminDocument
} from '../../src/services/adminAuthService.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test('admin collection is admins', () => {
  assert.equal(ADMIN_COLLECTION, 'admins');
});

test('unauthenticated user is not eligible for admin', () => {
  assert.equal(isEligibleAdminAuthUser(null), false);
});

test('anonymous user is not eligible for admin', () => {
  assert.equal(isEligibleAdminAuthUser({ uid: 'anon', isAnonymous: true }), false);
});

test('authenticated non-anonymous user is eligible for admin lookup', () => {
  assert.equal(isEligibleAdminAuthUser({ uid: 'alice', isAnonymous: false }), true);
});

test('missing uid is not eligible for admin lookup', () => {
  assert.equal(isEligibleAdminAuthUser({ isAnonymous: false }), false);
});

test('valid admin document requires role admin and enabled true', () => {
  assert.equal(isValidAdminDocument({ role: 'admin', enabled: true }), true);
});

test('enabled false is not admin', () => {
  assert.equal(isValidAdminDocument({ role: 'admin', enabled: false }), false);
});

test('non-admin role is not admin', () => {
  assert.equal(isValidAdminDocument({ role: 'moderator', enabled: true }), false);
});

test('source does not use localStorage, passwords, custom claims, or token handling', async () => {
  const source = await readFile('src/services/adminAuthService.js', 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|VITE_ADMIN_PASSWORD|password/i);
  assert.doesNotMatch(source, /getIdToken|customClaims|claims|token/i);
});

test('admin debug status exposes only emulator connection metadata', () => {
  const status = getFirestoreEmulatorDebugStatus();
  assert.equal(typeof status.connected, 'boolean');
  assert.equal(status.host, '127.0.0.1');
  assert.equal(status.port, 48080);
  assert.equal(typeof status.projectId, 'string');
  assert.deepEqual(Object.keys(status).sort(), ['connected', 'host', 'port', 'projectId']);
});

test('admin status debug source masks uid and exposes only safe flags', async () => {
  const source = await readFile('src/services/adminAuthService.js', 'utf8');
  assert.match(source, /uid\.slice\(0, 6\)/);
  assert.match(source, /documentFound/);
  assert.match(source, /roleValid/);
  assert.match(source, /enabled/);
  assert.doesNotMatch(source, /email|credential|identityToken|authorizationCode|nonce|getIdToken/);
});

test('MainApp no longer reads VITE_ADMIN_PASSWORD', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.doesNotMatch(source, /VITE_ADMIN_PASSWORD/);
  assert.match(source, /subscribeToAdminStatus/);
});

test('MainApp admin debug panel is test environment only and avoids secrets', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /renderAdminDebugPanel/);
  assert.match(source, /isTestFirebaseEnvironment/);
  assert.match(source, /admin document found/);
  assert.match(source, /role valid/);
  assert.match(source, /Firestore emulator connected/);
  assert.doesNotMatch(source, /getIdToken|identityToken|authorizationCode|nonce|credential/);
});

test('.env no longer defines VITE_ADMIN_PASSWORD', async () => {
  const source = await readFile('.env', 'utf8');
  assert.doesNotMatch(source, /VITE_ADMIN_PASSWORD/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
