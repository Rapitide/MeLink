# Functions Emulator Foundation

## Purpose

This phase adds only the Cloud Functions foundation for future legacy account linking.

## Callable Function

`checkLegacyMigrationEligibility`

Successful response:

```json
{
  "eligible": true,
  "uid": "firebase-auth-uid",
  "provider": "apple.com"
}
```

`verifyLegacyAccountPassword`

Successful verification response:

```json
{
  "verified": true
}
```

`linkLegacyAccount`

Successful link response:

```json
{
  "linked": true,
  "legacyUserId": "normalizedLegacyUserId"
}
```

Mismatch or missing legacy account response:

```json
{
  "verified": false
}
```

## Current Restrictions

- Requires Firebase Auth context.
- Requires `request.auth.token.firebase.sign_in_provider === "apple.com"`.
- Rejects unauthenticated, anonymous, password, and missing-provider callers.
- Does not require App Check yet, but the callable options keep that setting explicit.
- Legacy password comparison is temporary migration-only compatibility for existing plaintext `password` fields. It does not create, rewrite, or persist plaintext passwords.
- Legacy account linking writes only `legacyUserLinks/{legacyUserId}` and `users/{uid}.legacyUserId` inside a Firestore transaction after successful legacy password verification.

## Not Implemented

- UI connection.
- `handles` updates.
- `migrationClaims`.
- Rate limiting.
- Legacy password deletion or rewriting.
- Legacy user document deletion.
- Post or author migration.
- Production secrets.

## Sensitive Data

The function must not return or persist:

- Email addresses.
- Firebase ID tokens.
- Apple tokens.
- Authorization codes.
- Nonces.
- Passwords.
- Provider-specific identifiers.

## Local Test

```powershell
npm run test:functions
```

This starts the Functions and Firestore Emulators with `firebase.functions-test.json` and runs the callable test suite.

## Local Emulator Stack

Manual emulator startup:

```powershell
npm run emulators:functions-test
```

Ports:

| Emulator | Host | Port |
| --- | --- | --- |
| Authentication | `127.0.0.1` | `9099` |
| Firestore | `127.0.0.1` | `48080` |
| Functions | `127.0.0.1` | `5001` |
| Emulator Hub | `127.0.0.1` | `4401` |

For the Web app, use the test mode command:

```powershell
npm run dev:test
```

`npm run dev:test` loads `.env.test`, which contains only emulator-safe dummy Firebase Web SDK values and the `melink-functions-test` project ID.

The Web client connects to the Authentication Emulator only in the test Firebase environment. It uses:

```text
http://127.0.0.1:9099
```

The Web client also connects to the Firestore Emulator only in the test Firebase environment. It uses:

```text
127.0.0.1:48080
```

`firebase.functions-test.json` points Firestore Emulator at `firestore.rules`, so `users/{uid}` profile initialization is validated by the same Apple-provider rules used in the rules test suite.

Use the Emulator UI or browser Network panel to confirm Auth Emulator traffic. `firebase.functions-test.json` currently keeps Emulator UI disabled. For local manual inspection only, enable the UI temporarily and open:

```text
http://127.0.0.1:4000
```

Do not deploy UI-only local inspection settings as production infrastructure.

Apple sign-in remains `OAuthProvider("apple.com")` through Firebase Authentication. This phase does not create custom tokens, does not fake `providerData`, and does not manually modify Firebase ID tokens or Apple tokens. Real Apple sign-in may require Apple Developer and Firebase Console configuration for the local origin, popup/redirect domain, Service ID, and return URL. If Apple sign-in fails locally, record only the Firebase error code and redirect/popup destination; do not log tokens, passwords, or full payloads.

After a successful Apple sign-in, confirm:

- `currentUser` exists.
- `currentUser.isAnonymous === false`.
- `currentUser.providerData` contains `apple.com`.
- The Authentication Emulator shows the user when Emulator UI is available.

Do not print Firebase ID tokens, Apple tokens, authorization codes, nonces, passwords, or provider-specific identifiers to the console.

## Apple Auth Debug Page

The Apple authentication debug page is available only when all of the following are true:

- `import.meta.env.DEV === true`
- `VITE_FIREBASE_ENV=test`
- `VITE_APPLE_AUTH_ENABLED=true`

Path:

```text
/dev/apple-auth
```

Manual Apple sign-in check:

1. Run `npm run emulators:functions-test`.
2. Run `npm run dev:test`.
3. Open `https://127.0.0.1:5173/dev/apple-auth`.
4. Click `Appleでサインイン`.
5. If sign-in succeeds, confirm the page shows authenticated, non-anonymous, and `apple.com` provider present.
6. Continue to `/dev/legacy-migration` only after the Apple provider is present.
7. If sign-in fails, record only the Firebase error code and popup or redirect destination.
8. Do not record tokens, credentials, passwords, nonces, authorization codes, email addresses, or full user objects.

## Quick Manual Start

PowerShell 1:

```powershell
npm run emulators:functions-test
```

PowerShell 2:

```powershell
npm run dev:test
```

Browser:

```text
https://127.0.0.1:5173/dev/apple-auth
```

After Apple sign-in succeeds:

```text
https://127.0.0.1:5173/dev/legacy-migration
```

Do not put production Firebase secrets, admin passwords, Firebase ID tokens, Apple tokens, or provider credentials in `.env.test`.

## Legacy Migration Debug Page

The Web client debug page is available only when all of the following are true:

- `import.meta.env.DEV === true`
- `VITE_FIREBASE_ENV=test`
- `VITE_APPLE_AUTH_ENABLED=true`
- `VITE_LEGACY_LINK_ENABLED=true`

Path:

```text
/dev/legacy-migration
```

Manual E2E check:

1. Start the Firebase Auth Emulator.
2. Start the Firestore Emulator.
3. Start the Functions Emulator.
4. Start the Web app with the test Firebase env file and both feature flags enabled.
5. Prepare an Apple-authenticated test user.
6. Insert the legacy user fixture into `rooms/埼玉大学全体/users/{legacyUserId}`.
7. Open `/dev/legacy-migration`.
8. Submit the correct legacy ID and legacy password.
9. Confirm in Emulator UI that `legacyUserLinks/{legacyUserId}` and `users/{uid}.legacyUserId` were both written.
10. Submit the same values again and confirm idempotent success.
11. Submit a wrong password and confirm no new writes are created.
12. Try another Firebase uid and confirm double linking is rejected.

The debug page must not display or persist passwords, email addresses, Firebase ID tokens, Apple tokens, authorization codes, nonces, or Firestore document payloads.

## Deployment Warning

Do not deploy this phase to production. Production rollout requires a separate PR with reviewed project aliases, secrets, monitoring, and rollback steps.
