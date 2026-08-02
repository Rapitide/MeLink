const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const {
  APPLE_PROVIDER_ID,
  assertAppleAuthenticatedRequest
} = require('./checkLegacyMigrationEligibility');
const {
  getLegacyUserRef
} = require('./checkLegacyAccountExists');
const {
  LEGACY_PASSWORD_FIELD,
  compareLegacyPassword
} = require('./verifyLegacyAccountPassword');
const {
  validateLegacyPassword,
  validateLegacyUserId
} = require('./validateLegacyMigrationInput');

const MIGRATION_VERSION = 1;
const ALLOWED_KEYS = ['legacyPassword', 'legacyUserId'];
const RESERVED_HANDLES = new Set([
  'admin',
  'administrator',
  'system',
  'support',
  'official',
  'null',
  'undefined',
  'apple',
  'firebase',
  'saitama',
  'saidai'
]);

const assertExpectedPayload = (data) => {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }

  const keys = Object.keys(data);
  if (
    keys.length !== ALLOWED_KEYS.length
    || !keys.every((key) => ALLOWED_KEYS.includes(key))
  ) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
};

const isValidHandle = (handle) => (
  typeof handle === 'string'
    && handle.length >= 3
    && handle.length <= 20
    && /^[a-z0-9_]+$/.test(handle)
    && !handle.startsWith('_')
    && !handle.endsWith('_')
    && !handle.includes('__')
    && !handle.includes('@')
    && !RESERVED_HANDLES.has(handle)
);

const assertLinkableUser = ({ uid, userData, normalizedLegacyUserId }) => {
  if (!userData) {
    throw new HttpsError('failed-precondition', 'User profile is required.');
  }

  if (userData.uid !== uid) {
    throw new HttpsError('failed-precondition', 'User profile is not linkable.');
  }

  if (userData.legacyUserId != null && userData.legacyUserId !== normalizedLegacyUserId) {
    throw new HttpsError('failed-precondition', 'User profile is already linked.');
  }

  if (userData.appleLinked !== true) {
    throw new HttpsError('failed-precondition', 'Apple linked profile is required.');
  }

  if (!Array.isArray(userData.authProviders) || !userData.authProviders.includes(APPLE_PROVIDER_ID)) {
    throw new HttpsError('failed-precondition', 'Apple provider profile is required.');
  }

  if (!isValidHandle(userData.handle)) {
    throw new HttpsError('failed-precondition', 'Valid handle is required.');
  }
};

const getUserRef = (uid) => admin.firestore().collection('users').doc(uid);

const getLegacyUserLinkRef = (legacyUserId) => (
  admin.firestore().collection('legacyUserLinks').doc(legacyUserId)
);

const buildSuccessResponse = (legacyUserId) => ({
  linked: true,
  legacyUserId
});

const linkLegacyAccountAfterVerification = async ({ uid, normalizedLegacyUserId }) => {
  const db = admin.firestore();
  const userRef = getUserRef(uid);
  const linkRef = getLegacyUserLinkRef(normalizedLegacyUserId);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const linkSnapshot = await transaction.get(linkRef);

    const userData = userSnapshot.exists ? userSnapshot.data() : null;
    const linkData = linkSnapshot.exists ? linkSnapshot.data() : null;

    if (linkSnapshot.exists) {
      if (
        linkData.uid === uid
        && linkData.legacyUserId === normalizedLegacyUserId
        && userData
        && userData.uid === uid
        && userData.legacyUserId === normalizedLegacyUserId
      ) {
        return buildSuccessResponse(normalizedLegacyUserId);
      }

      if (linkData.uid !== uid) {
        throw new HttpsError('already-exists', 'Legacy account is already linked.');
      }

      throw new HttpsError('failed-precondition', 'Legacy account link is inconsistent.');
    }

    if (!userSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'User profile is required.');
    }

    assertLinkableUser({ uid, userData, normalizedLegacyUserId });

    if (userData.legacyUserId === normalizedLegacyUserId) {
      throw new HttpsError('failed-precondition', 'Legacy account link is inconsistent.');
    }

    const now = FieldValue.serverTimestamp();

    transaction.create(linkRef, {
      legacyUserId: normalizedLegacyUserId,
      uid,
      handle: userData.handle,
      linkedProvider: APPLE_PROVIDER_ID,
      linkedAt: now,
      migrationVersion: MIGRATION_VERSION
    });

    transaction.update(userRef, {
      legacyUserId: normalizedLegacyUserId,
      updatedAt: now
    });

    return buildSuccessResponse(normalizedLegacyUserId);
  });
};

const buildLinkLegacyAccountResponse = async (request) => {
  const { uid } = assertAppleAuthenticatedRequest(request);
  assertExpectedPayload(request.data);

  const normalizedLegacyUserId = validateLegacyUserId(request.data.legacyUserId);
  validateLegacyPassword(request.data.legacyPassword);

  const legacySnapshot = await getLegacyUserRef(normalizedLegacyUserId).get();
  const storedLegacyPassword = legacySnapshot.exists ? legacySnapshot.get(LEGACY_PASSWORD_FIELD) : undefined;
  if (!compareLegacyPassword(storedLegacyPassword, request.data.legacyPassword)) {
    throw new HttpsError('permission-denied', 'Legacy account verification failed.');
  }

  return linkLegacyAccountAfterVerification({ uid, normalizedLegacyUserId });
};

const linkLegacyAccount = onCall(
  {
    region: 'asia-northeast1',
    enforceAppCheck: false
  },
  async (request) => {
    try {
      return await buildLinkLegacyAccountResponse(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal error.');
    }
  }
);

module.exports = {
  MIGRATION_VERSION,
  buildLinkLegacyAccountResponse,
  getLegacyUserLinkRef,
  getUserRef,
  isValidHandle,
  linkLegacyAccount,
  linkLegacyAccountAfterVerification
};
