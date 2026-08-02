const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const {
  assertAppleAuthenticatedRequest
} = require('./checkLegacyMigrationEligibility');
const {
  validateLegacyUserId
} = require('./validateLegacyMigrationInput');

const LEGACY_DEFAULT_ROOM_ID = '\u57fc\u7389\u5927\u5b66\u5168\u4f53';

const assertExpectedPayload = (data) => {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }

  const keys = Object.keys(data);
  if (keys.length !== 1 || keys[0] !== 'legacyUserId') {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
};

const getLegacyUserRef = (legacyUserId) => (
  admin
    .firestore()
    .collection('rooms')
    .doc(LEGACY_DEFAULT_ROOM_ID)
    .collection('users')
    .doc(legacyUserId)
);

const buildLegacyAccountExistsResponse = async (request) => {
  assertAppleAuthenticatedRequest(request);
  assertExpectedPayload(request.data);

  const legacyUserId = validateLegacyUserId(request.data.legacyUserId);
  const snapshot = await getLegacyUserRef(legacyUserId).get();

  return { exists: snapshot.exists };
};

const checkLegacyAccountExists = onCall(
  {
    region: 'asia-northeast1',
    enforceAppCheck: false
  },
  async (request) => {
    try {
      return await buildLegacyAccountExistsResponse(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal error.');
    }
  }
);

module.exports = {
  LEGACY_DEFAULT_ROOM_ID,
  buildLegacyAccountExistsResponse,
  checkLegacyAccountExists,
  getLegacyUserRef
};
