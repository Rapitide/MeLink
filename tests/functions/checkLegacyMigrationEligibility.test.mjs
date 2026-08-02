import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const PROJECT_ID = 'melink-functions-test';
const REGION = 'asia-northeast1';
const FUNCTIONS_BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`;
const LEGACY_ROOM_ID = '埼玉大学全体';
const EXISTING_LEGACY_USER_ID = 'legacy_user_01';
const MISSING_PASSWORD_LEGACY_USER_ID = 'legacy_no_password';
const NON_STRING_PASSWORD_LEGACY_USER_ID = 'legacy_bad_password';
const LINK_SUCCESS_LEGACY_USER_ID = 'link_success_01';
const LINK_WRONG_PASSWORD_LEGACY_USER_ID = 'link_wrong_01';
const LINK_MISSING_LEGACY_USER_ID = 'link_missing_01';
const LINK_MISSING_USER_PROFILE_LEGACY_USER_ID = 'link_no_profile_01';
const LINK_USER_ALREADY_LINKED_LEGACY_USER_ID = 'link_user_busy_01';
const LINK_LEGACY_ALREADY_LINKED_USER_ID = 'link_legacy_busy_01';
const LINK_USER_SIDE_ONLY_LEGACY_USER_ID = 'link_user_side_01';
const LINK_LINK_SIDE_ONLY_LEGACY_USER_ID = 'link_link_side_01';
const LINK_NULL_HANDLE_LEGACY_USER_ID = 'link_null_handle_01';
const LINK_BAD_HANDLE_LEGACY_USER_ID = 'link_bad_handle_01';
const LINK_ATOMIC_FAILURE_LEGACY_USER_ID = 'link_atomic_01';

const require = createRequire(import.meta.url);
const admin = require('../../functions/node_modules/firebase-admin');
const {
  compareLegacyPassword
} = require('../../functions/src/verifyLegacyAccountPassword');
const {
  isValidHandle
} = require('../../functions/src/linkLegacyAccount');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const encodeBase64Url = (value) => (
  Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
);

const unsignedToken = ({ uid, provider }) => {
  const now = Math.floor(Date.now() / 1000);
  return [
    encodeBase64Url({ alg: 'none', typ: 'JWT' }),
    encodeBase64Url({
      aud: PROJECT_ID,
      auth_time: now,
      exp: now + 3600,
      firebase: provider ? { sign_in_provider: provider } : {},
      iat: now,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: uid,
      user_id: uid
    }),
    ''
  ].join('.');
};

const appleToken = unsignedToken({ uid: 'apple-user', provider: 'apple.com' });
const appleTokenFor = (uid) => unsignedToken({ uid, provider: 'apple.com' });

const callFunction = async ({ functionName, token, data = {} } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data })
  });

  const body = await response.json();
  return { response, body };
};

const callEligibility = (options = {}) => (
  callFunction({ functionName: 'checkLegacyMigrationEligibility', ...options })
);

const callValidation = (options = {}) => (
  callFunction({ functionName: 'validateLegacyMigrationInput', ...options })
);

const callLegacyAccountExists = (options = {}) => (
  callFunction({ functionName: 'checkLegacyAccountExists', ...options })
);

const callVerifyLegacyPassword = (options = {}) => (
  callFunction({ functionName: 'verifyLegacyAccountPassword', ...options })
);

const callLinkLegacyAccount = (options = {}) => (
  callFunction({ functionName: 'linkLegacyAccount', ...options })
);

const validInput = {
  legacyUserId: ` ${EXISTING_LEGACY_USER_ID} `,
  legacyPassword: 'password123'
};

const db = admin.firestore();
const legacyUsersRef = () => (
  db.collection('rooms').doc(LEGACY_ROOM_ID).collection('users')
);
const modernUserRef = (uid) => db.collection('users').doc(uid);
const legacyUserLinkRef = (legacyUserId) => db.collection('legacyUserLinks').doc(legacyUserId);

const validModernUser = ({ uid, handle = `${uid}_handle`, legacyUserId = null } = {}) => ({
  uid,
  handle,
  displayName: `Display ${uid}`,
  authProviders: ['apple.com'],
  appleLinked: true,
  profileSetupCompleted: true,
  legacyUserId,
  createdAt: admin.firestore.Timestamp.fromMillis(1000),
  updatedAt: admin.firestore.Timestamp.fromMillis(1000)
});

const deleteDocIfExists = async (ref) => {
  await ref.delete();
};

const seedLegacyUserFixture = async () => {
  const usersRef = legacyUsersRef();

  await usersRef.doc(EXISTING_LEGACY_USER_ID).set({
      id: EXISTING_LEGACY_USER_ID,
      name: 'Legacy User Name',
      displayName: 'Legacy Display Name',
      password: 'legacy-password-secret',
      saved_password: 'saved-password-secret',
      bio: 'legacy profile text'
    });

  await usersRef.doc(MISSING_PASSWORD_LEGACY_USER_ID).set({
    id: MISSING_PASSWORD_LEGACY_USER_ID,
    name: 'Missing Password User',
    displayName: 'Missing Password Display Name',
    bio: 'legacy profile text'
  });

  await usersRef.doc(NON_STRING_PASSWORD_LEGACY_USER_ID).set({
    id: NON_STRING_PASSWORD_LEGACY_USER_ID,
    name: 'Bad Password User',
    displayName: 'Bad Password Display Name',
    password: 12345,
    bio: 'legacy profile text'
  });

  const linkLegacyIds = [
    LINK_SUCCESS_LEGACY_USER_ID,
    LINK_WRONG_PASSWORD_LEGACY_USER_ID,
    LINK_MISSING_USER_PROFILE_LEGACY_USER_ID,
    LINK_USER_ALREADY_LINKED_LEGACY_USER_ID,
    LINK_LEGACY_ALREADY_LINKED_USER_ID,
    LINK_USER_SIDE_ONLY_LEGACY_USER_ID,
    LINK_LINK_SIDE_ONLY_LEGACY_USER_ID,
    LINK_NULL_HANDLE_LEGACY_USER_ID,
    LINK_BAD_HANDLE_LEGACY_USER_ID,
    LINK_ATOMIC_FAILURE_LEGACY_USER_ID
  ];

  await Promise.all(linkLegacyIds.map((legacyUserId) => (
    usersRef.doc(legacyUserId).set({
      id: legacyUserId,
      name: `Legacy ${legacyUserId}`,
      displayName: `Legacy Display ${legacyUserId}`,
      password: 'legacy-password-secret',
      saved_password: 'saved-password-secret',
      bio: 'legacy profile text'
    })
  )));

  await deleteDocIfExists(usersRef.doc(LINK_MISSING_LEGACY_USER_ID));

  await Promise.all([
    modernUserRef('apple-user').set(validModernUser({ uid: 'apple-user', handle: 'apple_user' })),
    modernUserRef('wrong-pass-user').set(validModernUser({ uid: 'wrong-pass-user', handle: 'wrong_pass_user' })),
    modernUserRef('missing-legacy-user').set(validModernUser({ uid: 'missing-legacy-user', handle: 'missing_legacy_user' })),
    modernUserRef('busy-user').set(validModernUser({ uid: 'busy-user', handle: 'busy_user', legacyUserId: 'other_legacy_01' })),
    modernUserRef('legacy-busy-user').set(validModernUser({ uid: 'legacy-busy-user', handle: 'legacy_busy_user' })),
    modernUserRef('user-side-only').set(validModernUser({ uid: 'user-side-only', handle: 'user_side_only', legacyUserId: LINK_USER_SIDE_ONLY_LEGACY_USER_ID })),
    modernUserRef('link-side-only').set(validModernUser({ uid: 'link-side-only', handle: 'link_side_only' })),
    modernUserRef('null-handle-user').set(validModernUser({ uid: 'null-handle-user', handle: null })),
    modernUserRef('bad-handle-user').set(validModernUser({ uid: 'bad-handle-user', handle: 'Bad-Handle' })),
    modernUserRef('atomic-user').set(validModernUser({ uid: 'atomic-user', handle: 'Bad-Handle' })),
    deleteDocIfExists(modernUserRef('missing-profile-user')),
    legacyUserLinkRef(LINK_LEGACY_ALREADY_LINKED_USER_ID).set({
      legacyUserId: LINK_LEGACY_ALREADY_LINKED_USER_ID,
      uid: 'other-uid',
      handle: 'other_handle',
      linkedProvider: 'apple.com',
      linkedAt: admin.firestore.Timestamp.fromMillis(1000),
      migrationVersion: 1
    }),
    legacyUserLinkRef(LINK_LINK_SIDE_ONLY_LEGACY_USER_ID).set({
      legacyUserId: LINK_LINK_SIDE_ONLY_LEGACY_USER_ID,
      uid: 'link-side-only',
      handle: 'link_side_only',
      linkedProvider: 'apple.com',
      linkedAt: admin.firestore.Timestamp.fromMillis(1000),
      migrationVersion: 1
    })
  ]);

  await Promise.all([
    legacyUserLinkRef(LINK_SUCCESS_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_WRONG_PASSWORD_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_MISSING_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_MISSING_USER_PROFILE_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_USER_ALREADY_LINKED_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_USER_SIDE_ONLY_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_NULL_HANDLE_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_BAD_HANDLE_LEGACY_USER_ID).delete(),
    legacyUserLinkRef(LINK_ATOMIC_FAILURE_LEGACY_USER_ID).delete()
  ]);
};

const assertCallableError = async ({ call, expectedStatus }) => {
  const { body } = await call();
  assert.equal(body?.error?.status, expectedStatus);
};

const runTest = async (name, fn) => {
  await fn();
  console.log(`ok - ${name}`);
};

await seedLegacyUserFixture();

await runTest('eligibility succeeds for apple authenticated user', async () => {
  const { body } = await callEligibility({ token: appleToken });

  assert.deepEqual(body.result, {
    eligible: true,
    uid: 'apple-user',
    provider: 'apple.com'
  });
});

await runTest('eligibility rejects unauthenticated user', async () => {
  await assertCallableError({
    call: () => callEligibility(),
    expectedStatus: 'UNAUTHENTICATED'
  });
});

await runTest('eligibility rejects anonymous provider', async () => {
  const token = unsignedToken({ uid: 'anon-user', provider: 'anonymous' });
  await assertCallableError({
    call: () => callEligibility({ token }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('eligibility rejects password provider', async () => {
  const token = unsignedToken({ uid: 'password-user', provider: 'password' });
  await assertCallableError({
    call: () => callEligibility({ token }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('eligibility rejects missing provider claim', async () => {
  const token = unsignedToken({ uid: 'missing-provider' });
  await assertCallableError({
    call: () => callEligibility({ token }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('eligibility response excludes sensitive fields', async () => {
  const { body } = await callEligibility({ token: appleToken });
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('token'), false);
  assert.equal(serialized.includes('authorization'), false);
  assert.equal(serialized.includes('nonce'), false);
  assert.equal(serialized.includes('password'), false);
});

await runTest('validation succeeds for apple authenticated user', async () => {
  const { body } = await callValidation({ token: appleToken, data: validInput });

  assert.deepEqual(body.result, { valid: true });
});

await runTest('validation rejects unauthenticated user', async () => {
  await assertCallableError({
    call: () => callValidation({ data: validInput }),
    expectedStatus: 'UNAUTHENTICATED'
  });
});

await runTest('validation rejects anonymous provider', async () => {
  const token = unsignedToken({ uid: 'anon-user', provider: 'anonymous' });
  await assertCallableError({
    call: () => callValidation({ token, data: validInput }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('validation rejects password provider', async () => {
  const token = unsignedToken({ uid: 'password-user', provider: 'password' });
  await assertCallableError({
    call: () => callValidation({ token, data: validInput }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('validation rejects legacyUserId type error', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyUserId: 123 }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation rejects legacyPassword type error', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyPassword: 123 }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation rejects too short legacyUserId', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyUserId: 'ab' }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation rejects too long legacyUserId', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyUserId: 'a'.repeat(33) }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation rejects invalid legacyUserId characters', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyUserId: 'bad-id' }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation rejects too short legacyPassword', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyPassword: '1234567' }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation rejects empty legacyPassword', async () => {
  await assertCallableError({
    call: () => callValidation({
      token: appleToken,
      data: { ...validInput, legacyPassword: '' }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('validation response excludes sensitive fields', async () => {
  const { body } = await callValidation({ token: appleToken, data: validInput });
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('token'), false);
  assert.equal(serialized.includes('authorization'), false);
  assert.equal(serialized.includes('nonce'), false);
  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('provider'), false);
});

await runTest('legacy account existence returns true for existing legacyUserId', async () => {
  const { body } = await callLegacyAccountExists({
    token: appleToken,
    data: { legacyUserId: ` ${EXISTING_LEGACY_USER_ID} ` }
  });

  assert.deepEqual(body.result, { exists: true });
});

await runTest('legacy account existence returns false for missing legacyUserId', async () => {
  const { body } = await callLegacyAccountExists({
    token: appleToken,
    data: { legacyUserId: 'missing_user_01' }
  });

  assert.deepEqual(body.result, { exists: false });
});

await runTest('legacy account existence rejects unauthenticated user', async () => {
  await assertCallableError({
    call: () => callLegacyAccountExists({ data: { legacyUserId: EXISTING_LEGACY_USER_ID } }),
    expectedStatus: 'UNAUTHENTICATED'
  });
});

await runTest('legacy account existence rejects anonymous provider', async () => {
  const token = unsignedToken({ uid: 'anon-user', provider: 'anonymous' });
  await assertCallableError({
    call: () => callLegacyAccountExists({ token, data: { legacyUserId: EXISTING_LEGACY_USER_ID } }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('legacy account existence rejects password provider', async () => {
  const token = unsignedToken({ uid: 'password-user', provider: 'password' });
  await assertCallableError({
    call: () => callLegacyAccountExists({ token, data: { legacyUserId: EXISTING_LEGACY_USER_ID } }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('legacy account existence rejects missing provider claim', async () => {
  const token = unsignedToken({ uid: 'missing-provider' });
  await assertCallableError({
    call: () => callLegacyAccountExists({ token, data: { legacyUserId: EXISTING_LEGACY_USER_ID } }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('legacy account existence rejects legacyUserId type error', async () => {
  await assertCallableError({
    call: () => callLegacyAccountExists({ token: appleToken, data: { legacyUserId: 123 } }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('legacy account existence rejects invalid legacyUserId format', async () => {
  await assertCallableError({
    call: () => callLegacyAccountExists({ token: appleToken, data: { legacyUserId: 'bad-id' } }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('legacy account existence response excludes legacy secrets and profile fields', async () => {
  const { body } = await callLegacyAccountExists({
    token: appleToken,
    data: { legacyUserId: EXISTING_LEGACY_USER_ID }
  });
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('saved_password'), false);
  assert.equal(serialized.includes('displayName'), false);
  assert.equal(serialized.includes('Legacy'), false);
  assert.equal(serialized.includes('bio'), false);
  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('uid'), false);
});

await runTest('password verification returns true for correct legacy password', async () => {
  const { body } = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: ` ${EXISTING_LEGACY_USER_ID} `,
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(body.result, { verified: true });
});

await runTest('password verification returns false for wrong legacy password', async () => {
  const { body } = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: EXISTING_LEGACY_USER_ID,
      legacyPassword: 'wrong-password-secret'
    }
  });

  assert.deepEqual(body.result, { verified: false });
});

await runTest('password verification returns false for missing legacy user', async () => {
  const { body } = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: 'missing_user_01',
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(body.result, { verified: false });
});

await runTest('password mismatch and missing legacy user use identical response shape', async () => {
  const wrongPassword = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: EXISTING_LEGACY_USER_ID,
      legacyPassword: 'wrong-password-secret'
    }
  });
  const missingUser = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: 'missing_user_01',
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(Object.keys(wrongPassword.body.result), ['verified']);
  assert.deepEqual(wrongPassword.body.result, missingUser.body.result);
});

await runTest('password verification rejects unauthenticated user', async () => {
  await assertCallableError({
    call: () => callVerifyLegacyPassword({ data: validInput }),
    expectedStatus: 'UNAUTHENTICATED'
  });
});

await runTest('password verification rejects anonymous provider', async () => {
  const token = unsignedToken({ uid: 'anon-user', provider: 'anonymous' });
  await assertCallableError({
    call: () => callVerifyLegacyPassword({ token, data: validInput }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('password verification rejects password provider', async () => {
  const token = unsignedToken({ uid: 'password-user', provider: 'password' });
  await assertCallableError({
    call: () => callVerifyLegacyPassword({ token, data: validInput }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('password verification rejects missing provider claim', async () => {
  const token = unsignedToken({ uid: 'missing-provider' });
  await assertCallableError({
    call: () => callVerifyLegacyPassword({ token, data: validInput }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('password verification rejects legacyUserId type error', async () => {
  await assertCallableError({
    call: () => callVerifyLegacyPassword({
      token: appleToken,
      data: { ...validInput, legacyUserId: 123 }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('password verification rejects legacyPassword type error', async () => {
  await assertCallableError({
    call: () => callVerifyLegacyPassword({
      token: appleToken,
      data: { ...validInput, legacyPassword: 123 }
    }),
    expectedStatus: 'INVALID_ARGUMENT'
  });
});

await runTest('password verification returns false when stored password is missing', async () => {
  const { body } = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: MISSING_PASSWORD_LEGACY_USER_ID,
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(body.result, { verified: false });
});

await runTest('password verification returns false when stored password is not string', async () => {
  const { body } = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: NON_STRING_PASSWORD_LEGACY_USER_ID,
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(body.result, { verified: false });
});

await runTest('password verification response excludes legacy secrets and profile fields', async () => {
  const { body } = await callVerifyLegacyPassword({
    token: appleToken,
    data: {
      legacyUserId: EXISTING_LEGACY_USER_ID,
      legacyPassword: 'legacy-password-secret'
    }
  });
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('saved_password'), false);
  assert.equal(serialized.includes('displayName'), false);
  assert.equal(serialized.includes('Legacy'), false);
  assert.equal(serialized.includes('bio'), false);
  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('uid'), false);
});

await runTest('compareLegacyPassword unit test covers match and mismatch', async () => {
  assert.equal(compareLegacyPassword('legacy-password-secret', 'legacy-password-secret'), true);
  assert.equal(compareLegacyPassword('legacy-password-secret', 'wrong-password-secret'), false);
});

await runTest('compareLegacyPassword unit test rejects missing or invalid stored password', async () => {
  assert.equal(compareLegacyPassword(undefined, 'legacy-password-secret'), false);
  assert.equal(compareLegacyPassword('', 'legacy-password-secret'), false);
  assert.equal(compareLegacyPassword(12345, 'legacy-password-secret'), false);
});

await runTest('isValidHandle unit test matches profile handle requirements', async () => {
  assert.equal(isValidHandle('apple_user'), true);
  assert.equal(isValidHandle(null), false);
  assert.equal(isValidHandle('Bad-Handle'), false);
  assert.equal(isValidHandle('_bad'), false);
  assert.equal(isValidHandle('bad_'), false);
  assert.equal(isValidHandle('bad__handle'), false);
  assert.equal(isValidHandle('admin'), false);
});

await runTest('linkLegacyAccount succeeds with correct apple auth and legacy password', async () => {
  const beforeLegacy = (await legacyUsersRef().doc(LINK_SUCCESS_LEGACY_USER_ID).get()).data();
  const { body } = await callLinkLegacyAccount({
    token: appleTokenFor('apple-user'),
    data: {
      legacyUserId: ` ${LINK_SUCCESS_LEGACY_USER_ID} `,
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(body, {
    result: {
      linked: true,
      legacyUserId: LINK_SUCCESS_LEGACY_USER_ID
    }
  });

  const [linkSnapshot, userSnapshot, legacySnapshot] = await Promise.all([
    legacyUserLinkRef(LINK_SUCCESS_LEGACY_USER_ID).get(),
    modernUserRef('apple-user').get(),
    legacyUsersRef().doc(LINK_SUCCESS_LEGACY_USER_ID).get()
  ]);
  const linkData = linkSnapshot.data();
  const userData = userSnapshot.data();
  const legacyData = legacySnapshot.data();

  assert.equal(linkSnapshot.exists, true);
  assert.equal(linkData.legacyUserId, LINK_SUCCESS_LEGACY_USER_ID);
  assert.equal(linkData.uid, 'apple-user');
  assert.equal(linkData.handle, 'apple_user');
  assert.equal(linkData.linkedProvider, 'apple.com');
  assert.equal(linkData.migrationVersion, 1);
  assert.equal(typeof linkData.linkedAt?.toMillis, 'function');
  assert.equal(userData.legacyUserId, LINK_SUCCESS_LEGACY_USER_ID);
  assert.equal(userData.profileSetupCompleted, true);
  assert.equal(typeof userData.updatedAt?.toMillis, 'function');
  assert.equal(legacyData.password, beforeLegacy.password);
  assert.equal(legacyData.saved_password, beforeLegacy.saved_password);
  assert.equal(legacyData.displayName, beforeLegacy.displayName);
});

await runTest('linkLegacyAccount is idempotent for same uid and legacyUserId', async () => {
  const { body } = await callLinkLegacyAccount({
    token: appleTokenFor('apple-user'),
    data: {
      legacyUserId: LINK_SUCCESS_LEGACY_USER_ID,
      legacyPassword: 'legacy-password-secret'
    }
  });

  assert.deepEqual(body.result, {
    linked: true,
    legacyUserId: LINK_SUCCESS_LEGACY_USER_ID
  });
});

await runTest('linkLegacyAccount rejects wrong password without writes', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('wrong-pass-user'),
      data: {
        legacyUserId: LINK_WRONG_PASSWORD_LEGACY_USER_ID,
        legacyPassword: 'wrong-password-secret'
      }
    }),
    expectedStatus: 'PERMISSION_DENIED'
  });

  assert.equal((await legacyUserLinkRef(LINK_WRONG_PASSWORD_LEGACY_USER_ID).get()).exists, false);
  assert.equal((await modernUserRef('wrong-pass-user').get()).data().legacyUserId, null);
});

await runTest('linkLegacyAccount rejects missing legacy account without writes', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('missing-legacy-user'),
      data: {
        legacyUserId: LINK_MISSING_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'PERMISSION_DENIED'
  });

  assert.equal((await legacyUserLinkRef(LINK_MISSING_LEGACY_USER_ID).get()).exists, false);
  assert.equal((await modernUserRef('missing-legacy-user').get()).data().legacyUserId, null);
});

await runTest('linkLegacyAccount rejects unauthenticated user', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      data: {
        legacyUserId: LINK_SUCCESS_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'UNAUTHENTICATED'
  });
});

await runTest('linkLegacyAccount rejects anonymous provider', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: unsignedToken({ uid: 'anon-user', provider: 'anonymous' }),
      data: {
        legacyUserId: LINK_SUCCESS_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('linkLegacyAccount rejects password provider', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: unsignedToken({ uid: 'password-user', provider: 'password' }),
      data: {
        legacyUserId: LINK_SUCCESS_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('linkLegacyAccount rejects missing provider claim', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: unsignedToken({ uid: 'missing-provider' }),
      data: {
        legacyUserId: LINK_SUCCESS_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'PERMISSION_DENIED'
  });
});

await runTest('linkLegacyAccount rejects missing users uid document', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('missing-profile-user'),
      data: {
        legacyUserId: LINK_MISSING_USER_PROFILE_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await legacyUserLinkRef(LINK_MISSING_USER_PROFILE_LEGACY_USER_ID).get()).exists, false);
});

await runTest('linkLegacyAccount rejects user already linked to another legacyUserId', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('busy-user'),
      data: {
        legacyUserId: LINK_USER_ALREADY_LINKED_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await legacyUserLinkRef(LINK_USER_ALREADY_LINKED_LEGACY_USER_ID).get()).exists, false);
  assert.equal((await modernUserRef('busy-user').get()).data().legacyUserId, 'other_legacy_01');
});

await runTest('linkLegacyAccount rejects legacyUserId linked to another uid', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('legacy-busy-user'),
      data: {
        legacyUserId: LINK_LEGACY_ALREADY_LINKED_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'ALREADY_EXISTS'
  });

  assert.equal((await modernUserRef('legacy-busy-user').get()).data().legacyUserId, null);
});

await runTest('linkLegacyAccount rejects user-side-only inconsistent state', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('user-side-only'),
      data: {
        legacyUserId: LINK_USER_SIDE_ONLY_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await legacyUserLinkRef(LINK_USER_SIDE_ONLY_LEGACY_USER_ID).get()).exists, false);
});

await runTest('linkLegacyAccount rejects link-side-only inconsistent state', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('link-side-only'),
      data: {
        legacyUserId: LINK_LINK_SIDE_ONLY_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await modernUserRef('link-side-only').get()).data().legacyUserId, null);
});

await runTest('linkLegacyAccount rejects null handle', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('null-handle-user'),
      data: {
        legacyUserId: LINK_NULL_HANDLE_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await legacyUserLinkRef(LINK_NULL_HANDLE_LEGACY_USER_ID).get()).exists, false);
});

await runTest('linkLegacyAccount rejects invalid handle', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('bad-handle-user'),
      data: {
        legacyUserId: LINK_BAD_HANDLE_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await legacyUserLinkRef(LINK_BAD_HANDLE_LEGACY_USER_ID).get()).exists, false);
});

await runTest('linkLegacyAccount leaves no partial write on transaction failure', async () => {
  await assertCallableError({
    call: () => callLinkLegacyAccount({
      token: appleTokenFor('atomic-user'),
      data: {
        legacyUserId: LINK_ATOMIC_FAILURE_LEGACY_USER_ID,
        legacyPassword: 'legacy-password-secret'
      }
    }),
    expectedStatus: 'FAILED_PRECONDITION'
  });

  assert.equal((await legacyUserLinkRef(LINK_ATOMIC_FAILURE_LEGACY_USER_ID).get()).exists, false);
  assert.equal((await modernUserRef('atomic-user').get()).data().legacyUserId, null);
});

await runTest('linkLegacyAccount response excludes secrets and profile fields', async () => {
  const { body } = await callLinkLegacyAccount({
    token: appleTokenFor('apple-user'),
    data: {
      legacyUserId: LINK_SUCCESS_LEGACY_USER_ID,
      legacyPassword: 'legacy-password-secret'
    }
  });
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('saved_password'), false);
  assert.equal(serialized.includes('displayName'), false);
  assert.equal(serialized.includes('Legacy'), false);
  assert.equal(serialized.includes('bio'), false);
  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('token'), false);
  assert.equal(serialized.includes('uid'), false);
});

await runTest('non-link functions avoid Firestore writes', async () => {
  const sources = await Promise.all([
    readFile(
      new URL('../../functions/src/checkLegacyMigrationEligibility.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/validateLegacyMigrationInput.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/checkLegacyAccountExists.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/verifyLegacyAccountPassword.js', import.meta.url),
      'utf8'
    )
  ]);

  for (const source of sources) {
    assert.equal(source.includes('setDoc'), false);
    assert.equal(source.includes('updateDoc'), false);
    assert.equal(source.includes('addDoc'), false);
    assert.equal(source.includes('.set('), false);
    assert.equal(source.includes('.update({'), false);
    assert.equal(source.includes('.create('), false);
    assert.equal(source.includes('.delete('), false);
  }
});

await runTest('linkLegacyAccount writes only through transaction create and update', async () => {
  const source = await readFile(
    new URL('../../functions/src/linkLegacyAccount.js', import.meta.url),
    'utf8'
  );

  assert.equal(source.includes('runTransaction'), true);
  assert.equal(source.includes('transaction.create'), true);
  assert.equal(source.includes('transaction.update'), true);
  assert.equal(source.includes('.set('), false);
  assert.equal(source.includes('.delete('), false);
});

await runTest('legacy account document contents are not logged by functions', async () => {
  const sources = await Promise.all([
    readFile(
      new URL('../../functions/src/checkLegacyMigrationEligibility.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/validateLegacyMigrationInput.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/checkLegacyAccountExists.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/verifyLegacyAccountPassword.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../../functions/src/linkLegacyAccount.js', import.meta.url),
      'utf8'
    )
  ]);

  for (const source of sources) {
    assert.equal(source.includes('console.log'), false);
    assert.equal(source.includes('console.info'), false);
    assert.equal(source.includes('console.error'), false);
    assert.equal(source.includes('snapshot.data'), false);
  }
});
