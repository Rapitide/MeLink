import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  __legacyMigrationServiceTestInternals,
  isAppleProviderCurrentUser,
  linkLegacyAccount,
  normalizeFunctionsErrorCode,
  normalizeLegacyUserIdForLink
} from '../../src/services/legacyMigrationService.js';

const enabledFlags = {
  appleAuthEnabled: true,
  legacyLinkEnabled: true
};

const disabledFlags = {
  appleAuthEnabled: true,
  legacyLinkEnabled: false
};

const appleUser = {
  isAnonymous: false,
  providerData: [{ providerId: 'apple.com' }]
};

const passwordUser = {
  isAnonymous: false,
  providerData: [{ providerId: 'password' }]
};

const anonymousUser = {
  isAnonymous: true,
  providerData: [{ providerId: 'anonymous' }]
};

const createDependencies = ({
  callable = async () => ({ data: { linked: true, legacyUserId: 'legacy_user_01' } }),
  currentUser = appleUser,
  flags = enabledFlags,
  isTestEnv = true,
  calls = []
} = {}) => ({
  callableFactory: (functions, functionName) => {
    calls.push({ type: 'factory', functions, functionName });
    return async (payload) => {
      calls.push({ type: 'call', payload });
      return callable(payload);
    };
  },
  flags,
  getAuthInstance: () => ({ currentUser }),
  getFunctionsInstance: () => ({ marker: 'functions' }),
  isTestEnv
});

const runTest = async (name, fn) => {
  await fn();
  console.log(`ok - ${name}`);
};

await runTest('correct input calls httpsCallable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({ calls })
  );

  assert.deepEqual(result, { linked: true, legacyUserId: 'legacy_user_01' });
  assert.equal(calls[0].functionName, 'linkLegacyAccount');
  assert.deepEqual(calls[1].payload, {
    legacyUserId: 'legacy_user_01',
    legacyPassword: 'password123'
  });
});

await runTest('legacyUserId is trimmed and NFKC normalized', async () => {
  const calls = [];
  await linkLegacyAccount(
    { legacyUserId: ' ｌｅｇａｃｙ＿ｕｓｅｒ＿０１ ', legacyPassword: 'password123' },
    createDependencies({ calls })
  );

  assert.equal(calls[1].payload.legacyUserId, 'legacy_user_01');
});

await runTest('legacyPassword is not trimmed', async () => {
  const calls = [];
  await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: ' password123 ' },
    createDependencies({ calls })
  );

  assert.equal(calls[1].payload.legacyPassword, ' password123 ');
});

await runTest('flag false rejects before callable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({ calls, flags: disabledFlags })
  );

  assert.deepEqual(result, { status: 'error', code: 'disabled' });
  assert.equal(calls.length, 0);
});

await runTest('non-test environment rejects before callable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({ calls, isTestEnv: false })
  );

  assert.deepEqual(result, { status: 'error', code: 'disabled' });
  assert.equal(calls.length, 0);
});

await runTest('missing currentUser rejects before callable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({ calls, currentUser: null })
  );

  assert.deepEqual(result, { status: 'error', code: 'not_authenticated' });
  assert.equal(calls.length, 0);
});

await runTest('anonymous currentUser rejects before callable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({ calls, currentUser: anonymousUser })
  );

  assert.deepEqual(result, { status: 'error', code: 'not_authenticated' });
  assert.equal(calls.length, 0);
});

await runTest('non-Apple provider rejects before callable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({ calls, currentUser: passwordUser })
  );

  assert.deepEqual(result, { status: 'error', code: 'permission_denied' });
  assert.equal(calls.length, 0);
});

await runTest('input type errors reject before callable', async () => {
  const calls = [];
  const result = await linkLegacyAccount(
    { legacyUserId: 123, legacyPassword: 'password123' },
    createDependencies({ calls })
  );

  assert.deepEqual(result, { status: 'error', code: 'invalid_input' });
  assert.equal(calls.length, 0);
});

await runTest('functions unauthenticated is normalized', async () => {
  assert.equal(normalizeFunctionsErrorCode({ code: 'functions/unauthenticated' }), 'not_authenticated');
});

await runTest('functions permission-denied is normalized', async () => {
  assert.equal(normalizeFunctionsErrorCode({ code: 'functions/permission-denied' }), 'verification_failed');
});

await runTest('functions invalid-argument is normalized', async () => {
  assert.equal(normalizeFunctionsErrorCode({ code: 'functions/invalid-argument' }), 'invalid_input');
});

await runTest('functions already-exists is normalized', async () => {
  assert.equal(normalizeFunctionsErrorCode({ code: 'functions/already-exists' }), 'legacy_account_already_linked');
});

await runTest('functions failed-precondition is normalized', async () => {
  assert.equal(normalizeFunctionsErrorCode({ code: 'functions/failed-precondition' }), 'account_state_invalid');
});

await runTest('functions internal is normalized', async () => {
  assert.equal(normalizeFunctionsErrorCode({ code: 'functions/internal' }), 'temporary_failure');
});

await runTest('callable errors return normalized safe code', async () => {
  const result = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({
      callable: async () => {
        throw { code: 'functions/already-exists', message: 'raw firebase message' };
      }
    })
  );

  assert.deepEqual(result, { status: 'error', code: 'legacy_account_already_linked' });
});

await runTest('duplicate request is rejected while in flight', async () => {
  let resolveCall;
  const first = linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies({
      callable: () => new Promise((resolve) => {
        resolveCall = () => resolve({ data: { linked: true, legacyUserId: 'legacy_user_01' } });
      })
    })
  );
  const second = await linkLegacyAccount(
    { legacyUserId: 'legacy_user_01', legacyPassword: 'password123' },
    createDependencies()
  );

  resolveCall();
  assert.deepEqual(second, { status: 'error', code: 'request_in_progress' });
  assert.deepEqual(await first, { linked: true, legacyUserId: 'legacy_user_01' });
});

await runTest('Apple provider detection requires apple.com providerData', async () => {
  assert.equal(isAppleProviderCurrentUser(appleUser), true);
  assert.equal(isAppleProviderCurrentUser(passwordUser), false);
  assert.equal(isAppleProviderCurrentUser({ isAnonymous: false, providerData: [] }), false);
});

await runTest('source does not use storage or Firestore SDK', async () => {
  const source = await readFile(
    new URL('../../src/services/legacyMigrationService.js', import.meta.url),
    'utf8'
  );

  assert.equal(source.includes('localStorage'), false);
  assert.equal(source.includes('sessionStorage'), false);
  assert.equal(source.includes('firebase/firestore'), false);
  assert.equal(source.includes('legacyUserLinks'), false);
});

await runTest('source does not manually handle tokens or log payloads', async () => {
  const source = await readFile(
    new URL('../../src/services/legacyMigrationService.js', import.meta.url),
    'utf8'
  );

  assert.equal(source.includes('getIdToken'), false);
  assert.equal(source.includes('idToken'), false);
  assert.equal(source.includes('authorizationCode'), false);
  assert.equal(source.includes('nonce'), false);
  assert.equal(source.includes('console.'), false);
});

await runTest('emulator constants match firebase functions test config', async () => {
  assert.equal(__legacyMigrationServiceTestInternals.FUNCTIONS_EMULATOR_HOST, '127.0.0.1');
  assert.equal(__legacyMigrationServiceTestInternals.FUNCTIONS_EMULATOR_PORT, 5001);
  assert.equal(normalizeLegacyUserIdForLink(' ｌｅｇａｃｙ '), 'legacy');
});
