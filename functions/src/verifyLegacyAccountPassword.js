const crypto = require('node:crypto');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const {
  assertAppleAuthenticatedRequest
} = require('./checkLegacyMigrationEligibility');
const {
  getLegacyUserRef
} = require('./checkLegacyAccountExists');
const {
  validateLegacyPassword,
  validateLegacyUserId
} = require('./validateLegacyMigrationInput');

const LEGACY_PASSWORD_FIELD = 'password';
const MISSING_PASSWORD_SENTINEL = '__missing_legacy_password__';
const ALLOWED_KEYS = ['legacyPassword', 'legacyUserId'];

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

const hashPasswordValue = (value) => (
  crypto.createHash('sha256').update(value, 'utf8').digest()
);

// Temporary migration-only compatibility check for existing plaintext legacy passwords.
// Do not write new plaintext passwords or persist the submitted legacyPassword.
const compareLegacyPassword = (storedLegacyPassword, submittedLegacyPassword) => {
  if (typeof submittedLegacyPassword !== 'string') {
    return false;
  }

  const comparableStoredPassword = (
    typeof storedLegacyPassword === 'string' && storedLegacyPassword.length > 0
      ? storedLegacyPassword
      : MISSING_PASSWORD_SENTINEL
  );

  return crypto.timingSafeEqual(
    hashPasswordValue(comparableStoredPassword),
    hashPasswordValue(submittedLegacyPassword)
  );
};

const buildVerifyLegacyAccountPasswordResponse = async (request) => {
  assertAppleAuthenticatedRequest(request);
  assertExpectedPayload(request.data);

  const legacyUserId = validateLegacyUserId(request.data.legacyUserId);
  validateLegacyPassword(request.data.legacyPassword);

  const snapshot = await getLegacyUserRef(legacyUserId).get();
  const storedLegacyPassword = snapshot.exists ? snapshot.get(LEGACY_PASSWORD_FIELD) : undefined;

  return {
    verified: compareLegacyPassword(storedLegacyPassword, request.data.legacyPassword)
  };
};

const verifyLegacyAccountPassword = onCall(
  {
    region: 'asia-northeast1',
    enforceAppCheck: false
  },
  async (request) => {
    try {
      return await buildVerifyLegacyAccountPasswordResponse(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal error.');
    }
  }
);

module.exports = {
  LEGACY_PASSWORD_FIELD,
  buildVerifyLegacyAccountPasswordResponse,
  compareLegacyPassword,
  verifyLegacyAccountPassword
};
