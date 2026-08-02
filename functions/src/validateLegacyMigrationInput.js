const { HttpsError, onCall } = require('firebase-functions/v2/https');

const {
  assertAppleAuthenticatedRequest
} = require('./checkLegacyMigrationEligibility');

const LEGACY_USER_ID_PATTERN = /^[A-Za-z0-9_]{3,32}$/;
const ALLOWED_KEYS = ['legacyPassword', 'legacyUserId'];

const hasOnlyAllowedKeys = (data) => {
  const keys = Object.keys(data);
  return keys.length === ALLOWED_KEYS.length
    && keys.every((key) => ALLOWED_KEYS.includes(key));
};

const normalizeLegacyUserId = (legacyUserId) => (
  legacyUserId.trim().normalize('NFKC').trim()
);

const validateLegacyUserId = (legacyUserId) => {
  if (typeof legacyUserId !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }

  const normalized = normalizeLegacyUserId(legacyUserId);
  if (!LEGACY_USER_ID_PATTERN.test(normalized)) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }

  return normalized;
};

const validateLegacyPassword = (legacyPassword) => {
  if (typeof legacyPassword !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }

  if (legacyPassword.length < 8 || legacyPassword.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
};

const buildValidationResponse = (request) => {
  assertAppleAuthenticatedRequest(request);

  const data = request.data;
  if (data == null || typeof data !== 'object' || Array.isArray(data) || !hasOnlyAllowedKeys(data)) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }

  validateLegacyUserId(data.legacyUserId);
  validateLegacyPassword(data.legacyPassword);

  return { valid: true };
};

const validateLegacyMigrationInput = onCall(
  {
    region: 'asia-northeast1',
    enforceAppCheck: false
  },
  (request) => {
    try {
      return buildValidationResponse(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal error.');
    }
  }
);

module.exports = {
  buildValidationResponse,
  normalizeLegacyUserId,
  validateLegacyPassword,
  validateLegacyUserId,
  validateLegacyMigrationInput
};
