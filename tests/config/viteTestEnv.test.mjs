import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

import { isAppleAuthDebugPageAvailable } from '../../src/pages/appleAuthDebugPageModel.js';
import { isLegacyMigrationDebugPageAvailable } from '../../src/pages/legacyMigrationDebugPageModel.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

const parseEnvFile = (source) => {
  const env = {};

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) continue;

    env[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }

  return env;
};

const env = parseEnvFile(await readFile('.env.test', 'utf8'));
const flags = {
  appleAuthEnabled: env.VITE_FIREBASE_ENV === 'test' && env.VITE_APPLE_AUTH_ENABLED === 'true',
  legacyLinkEnabled: env.VITE_FIREBASE_ENV === 'test' && env.VITE_LEGACY_LINK_ENABLED === 'true'
};

test('.env.test enables the test Firebase environment', () => {
  assert.equal(env.VITE_FIREBASE_ENV, 'test');
});

test('.env.test uses the emulator project id', () => {
  assert.equal(env.VITE_FIREBASE_PROJECT_ID, 'melink-functions-test');
});

test('.env.test enables Apple auth and legacy link flags', () => {
  assert.equal(env.VITE_APPLE_AUTH_ENABLED, 'true');
  assert.equal(env.VITE_LEGACY_LINK_ENABLED, 'true');
});

test('.env.test uses safe dummy Firebase Web SDK values', () => {
  assert.equal(env.VITE_FIREBASE_API_KEY, 'fake-api-key');
  assert.equal(env.VITE_FIREBASE_AUTH_DOMAIN, 'melink-functions-test.firebaseapp.com');
  assert.equal(env.VITE_FIREBASE_STORAGE_BUCKET, 'melink-functions-test.appspot.com');
  assert.equal(env.VITE_FIREBASE_MESSAGING_SENDER_ID, '000000000000');
  assert.equal(env.VITE_FIREBASE_APP_ID, '1:000000000000:web:test');
});

test('.env.test does not define an admin password', () => {
  assert.equal(Object.hasOwn(env, 'VITE_ADMIN_PASSWORD'), false);
});

test('dev:test script uses Vite test mode', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(packageJson.scripts['dev:test'], 'vite --mode test --host 127.0.0.1 --port 5173');
});

test('Apple auth debug route is available under dev test flags', () => {
  assert.equal(isAppleAuthDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags
  }), true);
});

test('legacy migration debug route is available under dev test flags', () => {
  assert.equal(isLegacyMigrationDebugPageAvailable({
    isDev: true,
    isTestEnv: true,
    flags
  }), true);
});

test('debug routes are not available outside DEV', () => {
  assert.equal(isAppleAuthDebugPageAvailable({ isDev: false, isTestEnv: true, flags }), false);
  assert.equal(isLegacyMigrationDebugPageAvailable({ isDev: false, isTestEnv: true, flags }), false);
});

test('debug routes are not available outside test environment', () => {
  assert.equal(isAppleAuthDebugPageAvailable({ isDev: true, isTestEnv: false, flags }), false);
  assert.equal(isLegacyMigrationDebugPageAvailable({ isDev: true, isTestEnv: false, flags }), false);
});

test('App registers both debug routes through conditional flags', async () => {
  const source = await readFile('src/App.jsx', 'utf8');
  assert.match(source, /canUseAppleAuthDebugPage/);
  assert.match(source, /APPLE_AUTH_DEBUG_PATH/);
  assert.match(source, /canUseLegacyMigrationDebugPage/);
  assert.match(source, /LEGACY_MIGRATION_DEBUG_PATH/);
});

test('.gitignore keeps local env secrets out of git', async () => {
  const source = await readFile('.gitignore', 'utf8');
  assert.match(source, /^\.env$/m);
  assert.match(source, /^\.env\.local$/m);
  assert.match(source, /^\.env\.\*\.local$/m);
});

test('.env.example does not publish an admin password variable', async () => {
  const source = await readFile('.env.example', 'utf8');
  assert.doesNotMatch(source, /VITE_ADMIN_PASSWORD/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
