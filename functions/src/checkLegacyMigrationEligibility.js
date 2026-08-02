const { HttpsError, onCall } = require('firebase-functions/v2/https');

const APPLE_PROVIDER_ID = 'apple.com';

const safeProviderFromRequest = (request) => {
  const provider = request?.auth?.token?.firebase?.sign_in_provider;
  return typeof provider === 'string' ? provider : null;
};

const assertNoUnexpectedPayload = (data) => {
  if (data == null) return;
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
};

const assertAppleAuthenticatedRequest = (request) => {
  const uid = request?.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const provider = safeProviderFromRequest(request);
  if (provider !== APPLE_PROVIDER_ID) {
    throw new HttpsError('permission-denied', 'Apple authentication is required.');
  }

  return { uid, provider };
};

const buildEligibilityResponse = (request) => {
  assertNoUnexpectedPayload(request.data);

  const { uid } = assertAppleAuthenticatedRequest(request);

  return {
    eligible: true,
    uid,
    provider: APPLE_PROVIDER_ID
  };
};

const checkLegacyMigrationEligibility = onCall(
  {
    region: 'asia-northeast1',
    enforceAppCheck: false
  },
  (request) => {
    try {
      return buildEligibilityResponse(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal error.');
    }
  }
);

module.exports = {
  APPLE_PROVIDER_ID,
  assertAppleAuthenticatedRequest,
  buildEligibilityResponse,
  checkLegacyMigrationEligibility,
  safeProviderFromRequest
};
