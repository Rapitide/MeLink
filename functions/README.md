# Firebase Functions Emulator

This directory contains the Cloud Functions foundation for Apple-authenticated legacy account migration.

## Current Scope

- Exposes `checkLegacyMigrationEligibility`.
- Verifies that the callable request is authenticated.
- Verifies `request.auth.token.firebase.sign_in_provider === "apple.com"`.
- Returns only `{ eligible, uid, provider }`.

## Not Implemented Yet

- Legacy password verification.
- `legacyUserLinks` creation.
- Firestore reads or writes.
- Cloud Functions secrets.
- Production deployment.

## Safety Notes

- Do not deploy this phase to production.
- Do not return email, Firebase ID tokens, Apple tokens, authorization codes, nonce values, passwords, or provider-specific identifiers.
- Use the local Functions Emulator for validation.
