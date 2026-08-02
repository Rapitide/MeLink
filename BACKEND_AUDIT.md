# MeLink Backend Audit

作成日: 2026-08-02

この文書は、現在開いている React/Firebase 版 MeLink リポジトリを対象にしたバックエンド監査結果です。監査ではコード、Firebase 設定、Firestore Rules、Functions、テスト、関連 docs を読み取りました。Emulator へのデータ投入、本番接続、deploy、パッケージ追加、既存コード変更は行っていません。

## 調査対象

確認した主なファイル:

- `firebase.json`
- `.firebaserc`
- `firebase.functions-test.json`
- `firestore.rules`
- `package.json`
- `functions/package.json`
- `functions/index.js`
- `functions/src/checkLegacyMigrationEligibility.js`
- `functions/src/validateLegacyMigrationInput.js`
- `functions/src/checkLegacyAccountExists.js`
- `functions/src/verifyLegacyAccountPassword.js`
- `functions/src/linkLegacyAccount.js`
- `tests/functions/checkLegacyMigrationEligibility.test.mjs`
- `tests/rules/appleAuthRules.test.mjs`
- `tests/config/firebaseClient.test.mjs`
- `tests/services/adminAuthService.test.mjs`
- `tests/services/legacyMigrationService.test.mjs`
- `tests/services/userProfileService.test.mjs`
- `src/config/firebaseConfig.js`
- `src/config/firebaseClient.js`
- `src/config/featureFlags.js`
- `src/services/appleAuth.js`
- `src/services/userProfileService.js`
- `src/services/legacyMigrationService.js`
- `src/services/adminAuthService.js`
- `src/MainApp.jsx`
- `src/AuthScreen.jsx`
- `src/App.jsx`
- `src/Community.jsx`
- `src/Timetable.jsx`
- `src/Wiki.jsx`
- `src/WikiPage.jsx`
- `docs/AUTH_MIGRATION.md`
- `docs/DATA_MODEL.md`
- `docs/FIRESTORE_RULES_TEST_RESULT.md`
- `docs/FUNCTIONS_EMULATOR.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/SWIFTUI_PORTING_DESIGN.md`
- `docs/WEB_APP_ANALYSIS.md`

存在しないもの:

- `firestore.indexes.json`: 現在のリポジトリには存在しません。

## 現在のFirebase構成

### Firebase project

- `.firebaserc` の default project は `twitter-112c1`。
- `firebase.functions-test.json` と `package.json` の `emulators:functions-test` は `melink-functions-test` を使用。
- `.env.test` は `VITE_FIREBASE_PROJECT_ID=melink-functions-test` と Emulator 用のダミー Firebase Web SDK 設定を定義。
- `src/config/firebaseClient.js` は既知の本番 projectId `twitter-112c1` では Auth/Firestore Emulator に接続しない安全判定を持つ。

### Emulator

`firebase.json`:

- Firestore Emulator: `127.0.0.1:8080`
- Functions Emulator: `127.0.0.1:5001`
- Emulator UI: disabled
- Hub: `127.0.0.1:4400`

`firebase.functions-test.json`:

- Auth Emulator: `127.0.0.1:9099`
- Firestore Emulator: `127.0.0.1:48080`
- Functions Emulator: `127.0.0.1:5001`
- Emulator UI: `127.0.0.1:4000`
- Hub: `127.0.0.1:4401`
- Firestore Rules: `firestore.rules`

### Web Firebase 初期化

- `src/config/firebaseConfig.js` は `VITE_FIREBASE_*` から Firebase config を生成。
- `src/config/firebaseClient.js` は `getFirebaseApp()`, `getFirebaseAuth()`, `getFirebaseFirestore()` を提供。
- test 環境では Auth Emulator と Firestore Emulator へ接続する。
- Hot Reload 対策として `globalThis` 上の Set で二重 Emulator 接続を防止している。
- `src/services/legacyMigrationService.js` は test 環境のみ Functions Emulator `127.0.0.1:5001` へ接続する。

注意点:

- `src/WikiPage.jsx` は共有 Firebase 初期化を使わず、`twitter-112c1` の Firebase config をファイル内に直接持ち、`getFirestore(app)` を呼んでいる。test 環境でも意図せず本番 project へ接続する可能性があるため重大な設定リスクです。

## 実装済み機能

### Firebase Authentication

- Web の Apple ログイン入口は実装済み。
- `src/services/appleAuth.js` は `OAuthProvider('apple.com')` と `signInWithPopup` を使う。
- redirect fallback 用に `signInWithRedirect` の関数も存在する。
- 成功時に返す情報は `uid`, `providerId`, 任意の `displayName`, 任意の `isNewUser` に限定。
- email、Firebase ID token、Apple token、authorization code、nonce は保存・返却しない設計。
- Apple 認証とプロフィール初期化は `featureFlags.appleAuthEnabled` と `VITE_FIREBASE_ENV=test` で制限されている。

### users/{uid} 初期化

- `src/services/userProfileService.js` の `ensureAppleUserProfile` が `users/{uid}` を transaction 内で取得し、存在しない場合だけ初期プロフィールを作成する。
- 初期フィールド:
  - `uid`
  - `handle: null`
  - `displayName: null`
  - `authProviders: ['apple.com']`
  - `appleLinked: true`
  - `profileSetupCompleted: false`
  - `legacyUserId: null`
  - `createdAt: serverTimestamp()`
  - `updatedAt: serverTimestamp()`
- 既存ドキュメントがある場合は上書きしない。
- email、token、nonce、authorization code は保存しない。

### handles/{handle} 予約

- `src/services/userProfileService.js` の `completeInitialAppleUserProfile` が `handles/{handle}` の取得、作成、`users/{uid}` 更新を同一 transaction で行う。
- handle は NFKC、trim、小文字化、先頭 `@` 除去を行う。
- 禁止条件:
  - 3 文字未満、20 文字超
  - 半角英小文字・数字・アンダースコア以外
  - 先頭/末尾アンダースコア
  - 連続アンダースコア
  - 予約語
- `profileSetupCompleted === true` の既存プロフィールは初回設定処理で上書きしない。

### 旧ID/旧パスワードログイン

- `src/MainApp.jsx` に旧ログインが残っている。
- 旧ユーザーデータ保存先は `rooms/{roomId}/users/{legacyUserId}`。
- 既定の旧ルームは docs と Functions 実装上 `rooms/埼玉大学全体/users/{legacyUserId}`。
- 旧サインアップでは Firestore に `password` を保存する。
- 旧ログインではクライアントが旧ユーザードキュメントを読み、`snap.data().password` と入力値を比較する。
- `localStorage` に `saved_user_id`, `saved_password`, `twitter_clone_current_id` を使う旧互換処理が残っている。

### 旧アカウント連携 Functions

以下 5 つの Callable Functions が `functions/index.js` から export されている。

- `checkLegacyMigrationEligibility`
- `validateLegacyMigrationInput`
- `checkLegacyAccountExists`
- `verifyLegacyAccountPassword`
- `linkLegacyAccount`

すべて v2 Callable Function、region は `asia-northeast1`、`enforceAppCheck: false`。

### legacyUserLinks

- `functions/src/linkLegacyAccount.js` が `legacyUserLinks/{legacyUserId}` を作成する。
- 作成は Admin SDK の Firestore transaction 内でのみ実行される。
- クライアント側サービス `src/services/legacyMigrationService.js` は `legacyUserLinks` を直接読み書きしない。
- `firestore.rules` に `legacyUserLinks` の明示的な allow はないため、通常クライアントからは default deny になる。

### 管理者認可

- `src/services/adminAuthService.js` は Firebase Auth の `currentUser.uid` に対応する `admins/{uid}` を購読する。
- 管理者条件は `role === 'admin' && enabled === true`。
- 未認証、匿名ユーザー、uid なしユーザーは管理者不可。
- `VITE_ADMIN_PASSWORD` によるクライアント側管理者パスワード判定は現行コードから削除済み。
- `firestore.rules` は `admins/{uid}` の本人 get と、`admins/{uid}` を用いた一部 admin 操作を定義している。

## 未実装機能

コード上で未実装、または docs 上の計画に対して未完了と判断したもの:

- 本番向けの完全な Firestore Rules。現在の `firestore.rules` は `users`, `handles`, `admins`, `globalData` の一部、`rooms/{roomId}/posts/{postId}` の admin update/delete に限定されている。
- `rooms/{roomId}/posts` の一般ユーザー作成・読み取り・いいね・返信・ブックマーク・通知・フォロー等に対する Rules。
- `legacyUserLinks` の読み取り API。Functions では作成するが、クライアントから直接読む設計はない。
- App Check 強制。全 Callable で `enforceAppCheck: false`。
- 旧パスワード照合・連携に対するレート制限、試行回数制限、監査ログ。
- 旧 `rooms/{roomId}/users/{legacyUserId}.password` の削除・ハッシュ化・無効化。
- `migrationClaims`。
- 旧投稿、返信、いいね等の `authorId` を Firebase Auth `uid` へ移行する処理。
- `handles` の変更機能。
- iOS クライアント実装。
- 本番 Firebase への安全な deploy 手順の自動ガード。
- `firestore.indexes.json`。
- Firebase Storage 連携。画像は主に Firestore 文字列/Data URL 系として扱われていると見られるが、Storage ルールは未確認。
- `featureFlags.disableAnonymousWrites` の実効的な適用。定義はあるが、監査範囲内で明確な利用は確認できない。

## Callable Functions一覧

| Function | 実装ファイル | 役割 | Firestore |
| --- | --- | --- | --- |
| `checkLegacyMigrationEligibility` | `functions/src/checkLegacyMigrationEligibility.js` | Apple 認証済みユーザーか確認 | なし |
| `validateLegacyMigrationInput` | `functions/src/validateLegacyMigrationInput.js` | `legacyUserId` と `legacyPassword` の形式検証 | なし |
| `checkLegacyAccountExists` | `functions/src/checkLegacyAccountExists.js` | 旧ユーザー存在有無だけ確認 | read のみ |
| `verifyLegacyAccountPassword` | `functions/src/verifyLegacyAccountPassword.js` | 旧パスワード照合結果だけ返す | read のみ |
| `linkLegacyAccount` | `functions/src/linkLegacyAccount.js` | 旧パスワード照合後、旧IDと Firebase uid を transaction で連携 | read/write |

## 各Functionの入力・出力・認証条件

### 共通認証条件

`functions/src/checkLegacyMigrationEligibility.js` の `assertAppleAuthenticatedRequest` が共通条件として使われている。

- `request.auth` が存在すること。
- `request.auth.uid` が存在すること。
- `request.auth.token.firebase.sign_in_provider === 'apple.com'`。
- anonymous、password provider、claim 不足は拒否。

エラー:

- 未認証: `unauthenticated`
- Apple 以外: `permission-denied`

### checkLegacyMigrationEligibility

入力:

- 空 payload または不要 payload。

成功出力:

```json
{
  "eligible": true,
  "uid": "Firebase Auth uid",
  "provider": "apple.com"
}
```

注意:

- `uid` を返す。email、token、password は返さない。
- Firestore にはアクセスしない。

### validateLegacyMigrationInput

入力:

```json
{
  "legacyUserId": "string",
  "legacyPassword": "string"
}
```

検証:

- `legacyUserId`: string, trim, NFKC, 3-32 文字, 英数字とアンダースコアのみ。
- `legacyPassword`: string, 8-128 文字。
- payload の key は `legacyUserId`, `legacyPassword` のみ。

成功出力:

```json
{
  "valid": true
}
```

Firestore:

- アクセスしない。

### checkLegacyAccountExists

入力:

```json
{
  "legacyUserId": "string"
}
```

処理:

- `legacyUserId` を検証・正規化。
- Admin SDK で `rooms/埼玉大学全体/users/{legacyUserId}` を読む。

成功出力:

```json
{
  "exists": true
}
```

または:

```json
{
  "exists": false
}
```

返さない情報:

- password
- saved_password
- displayName
- 旧プロフィール
- uid
- email

リスク:

- Apple 認証済みユーザーには旧IDの存在有無が分かるため、列挙耐性は弱い。レート制限や UI 制限が必要。

### verifyLegacyAccountPassword

入力:

```json
{
  "legacyUserId": "string",
  "legacyPassword": "string"
}
```

処理:

- 入力検証。
- Admin SDK で `rooms/埼玉大学全体/users/{legacyUserId}` を読む。
- 旧パスワードフィールド `password` と入力値を Functions 内だけで比較。
- 比較は `crypto.timingSafeEqual` と sha256 digest を使う。
- 旧ユーザー不存在、旧 password 欠損、非 string、空文字は `verified: false`。

成功/失敗出力:

```json
{
  "verified": true
}
```

または:

```json
{
  "verified": false
}
```

返さない情報:

- password
- saved_password
- displayName
- 旧プロフィール
- uid
- email
- token

### linkLegacyAccount

入力:

```json
{
  "legacyUserId": "string",
  "legacyPassword": "string"
}
```

処理:

1. Apple 認証確認。
2. payload key を `legacyUserId`, `legacyPassword` のみに制限。
3. `legacyUserId` と `legacyPassword` を検証。
4. `rooms/埼玉大学全体/users/{legacyUserId}` を読む。
5. 旧 `password` と入力 `legacyPassword` を比較。
6. 不存在または不一致は `permission-denied`。
7. 照合成功後、Firestore transaction を開始。
8. `users/{uid}` と `legacyUserLinks/{legacyUserId}` を読む。
9. `legacyUserLinks/{legacyUserId}` 未作成、`users/{uid}` が link 可能であることを確認。
10. `legacyUserLinks/{legacyUserId}` を create。
11. `users/{uid}.legacyUserId` と `updatedAt` を update。

成功出力:

```json
{
  "linked": true,
  "legacyUserId": "normalizedLegacyUserId"
}
```

主なエラー:

- 未認証: `unauthenticated`
- Apple 以外: `permission-denied`
- 入力不正: `invalid-argument`
- 旧アカウント不存在またはパスワード不一致: `permission-denied`
- 旧IDが別 uid に連携済み: `already-exists`
- `users/{uid}` 不存在、別旧ID連携済み、handle 不正等: `failed-precondition`
- 想定外: `internal`

transaction 内の確認:

- `legacyUserLinks/{legacyUserId}` が存在しない、または同一 uid/legacyUserId の冪等状態。
- `users/{uid}` が存在する。
- `users/{uid}.uid === request.auth.uid`。
- `users/{uid}.legacyUserId === null` または同一 legacyUserId。
- `users/{uid}.appleLinked === true`。
- `users/{uid}.authProviders` に `apple.com` を含む。
- `users/{uid}.handle` が有効な handle。

transaction 内の書き込み:

- `legacyUserLinks/{legacyUserId}`:
  - `legacyUserId`
  - `uid`
  - `handle`
  - `linkedProvider: 'apple.com'`
  - `linkedAt: serverTimestamp`
  - `migrationVersion: 1`
- `users/{uid}`:
  - `legacyUserId`
  - `updatedAt: serverTimestamp`

返さない情報:

- password
- saved_password
- email
- Firebase ID token
- Apple token
- authorization code
- nonce
- 旧プロフィール
- users ドキュメント全体
- legacyUserLinks の既存 uid

## Firestoreパス一覧

### Auth移行・共通ユーザー

- `users/{uid}`
- `handles/{handle}`
- `legacyUserLinks/{legacyUserId}`
- `admins/{uid}`

### 旧Web互換

- `rooms/{roomId}/users/{legacyUserId}`
- `rooms/埼玉大学全体/users/{legacyUserId}`
- `rooms/{roomId}/posts/{postId}`
- `rooms/{roomId}/follows/{userId}`
- `rooms/{roomId}/followers/{userId}`
- `rooms/{roomId}/bookmarks/{userId}`
- `rooms/{roomId}/notifications/{userId}/items/{notificationId}`
- `rooms/{roomId}/lessonTalks/{lessonName}/messages/{messageId}`

### ユーザー別機能

- `users/{uid}/timetable/data`
- `users/{uid}/todoEvents/{eventId}`
- `users/{uid}/fixedSchedules/{scheduleId}`
- `users/{uid}/scheduleCategories/{categoryId}`

### globalData

- `globalData/boardRooms`
- `globalData/badges`
- `globalData/featurePoll`
- `globalData/congestion`
- `globalData/wiki/pages/{pageId}`

### docs 上の将来推奨

`docs/DATA_MODEL.md` と `docs/SWIFTUI_PORTING_DESIGN.md` では、SwiftUI/共通モデル向けに以下のようなサブコレクション構造が提案されている。

- `rooms/{roomId}/members/{uid}`
- `rooms/{roomId}/posts/{postId}/replies/{replyId}`
- `rooms/{roomId}/posts/{postId}/likes/{uid}`
- `rooms/{roomId}/posts/{postId}/reactions/{reactionId}`
- `rooms/{roomId}/posts/{postId}/reposts/{uid}`
- `rooms/{roomId}/users/{uid}/bookmarks/{postId}`
- `rooms/{roomId}/users/{uid}/following/{targetUid}`
- `rooms/{roomId}/users/{uid}/notifications/{notificationId}`
- `rooms/{roomId}/congestionReports/{reportId}`

ただし、これらは現行 Web 実装の全てで採用済みではない。

## Rulesの現在の許可範囲

`firestore.rules` の現在の allow 範囲:

### users/{uid}

- `get`: 本人のみ。
- `list`: 不許可。
- `create`: 本人、非匿名 Apple provider、初期プロフィール shape 一致時のみ。
- `update`: 本人、非匿名 Apple provider、初回プロフィール設定 shape 一致時のみ。
- `delete`: 不許可。

禁止される users フィールド:

- `email`
- `password`
- `saved_password`
- `appleIdentityToken`
- `appleAuthorizationCode`
- `identityToken`
- `authorizationCode`
- `firebaseIdToken`
- `token`
- `nonce`
- `refreshToken`
- `accessToken`

### handles/{handle}

- `get`: 認証済みユーザー。
- `list`: 不許可。
- `create`: 非匿名 Apple provider、未使用ドキュメント、valid handle、`uid == request.auth.uid` の場合のみ。
- `update/delete`: 不許可。

### admins/{uid}

- `get`: 本人かつ非匿名 sign-in provider のみ。
- `list`: 不許可。
- `create/update/delete`: 不許可。

### globalData/{docId}

- `get`: 認証済みユーザー。
- `list`: 不許可。
- `create/update`: `admins/{request.auth.uid}` が `role == 'admin'` かつ `enabled == true` で、`docId` が `boardRooms` または `badges` の場合のみ。
- `delete`: 不許可。

### rooms/{roomId}/posts/{postId}

- `update/delete`: admin のみ。
- `get/list/create`: 明示 allow なし。

### 明示 Rules がないパス

以下は現行 `firestore.rules` では明示 allow がなく、default deny と解釈される。

- `legacyUserLinks/{legacyUserId}`
- `rooms/{roomId}/users/{legacyUserId}`
- `rooms/{roomId}/posts` の通常 read/create
- `rooms/{roomId}/follows`
- `rooms/{roomId}/followers`
- `rooms/{roomId}/bookmarks`
- `rooms/{roomId}/notifications`
- `users/{uid}/timetable`
- `users/{uid}/todoEvents`
- `globalData/wiki/pages`
- `globalData/featurePoll`
- `globalData/congestion`

重要:

- この `firestore.rules` を既存 Web 版の本番 Rules としてそのまま deploy すると、現行掲示板や旧ログインの多くが止まる可能性が高い。
- docs でも本番 Rules へは既存 Rules とマージが必要という注意がある。

## 旧アカウント連携の現在地

監査対象の 12 項目に対する判定:

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| Apple認証済みユーザーだけが呼べる | 実装済み | `assertAppleAuthenticatedRequest` が provider claim を確認 |
| legacyUserId/passwordを検証 | 実装済み | `validateLegacyMigrationInput.js` |
| 旧ユーザー存在確認 | 実装済み | `checkLegacyAccountExists`、`linkLegacyAccount` 内 read |
| 旧パスワードをサーバー側だけで照合 | 実装済み | `verifyLegacyAccountPassword.js`, `linkLegacyAccount.js` |
| 他UIDへ連携済みでないことを確認 | 実装済み | transaction 内で `legacyUserLinks` を確認 |
| legacyUserLinks作成 | 実装済み | `transaction.create(linkRef, ...)` |
| users/{uid}.legacyUserId更新 | 実装済み | `transaction.update(userRef, ...)` |
| 片方だけ更新を防ぐ | 実装済み | Admin SDK transaction |
| 同一ユーザー再実行の冪等成功 | 実装済み | 同一 uid/legacyUserId 両側一致時に success |
| 別ユーザー二重連携拒否 | 実装済み | `already-exists` |
| クライアントへ秘密情報を返さない | 実装済み | 出力 shape が限定され、テストあり |
| ログへ秘密情報を出さない | コード上は実装済み | Functions ソースに `console.log/info/error` なし。ただし本番ランタイムログは未確認 |

不足している処理:

- App Check 強制。
- レート制限。
- 連携試行の監査ログ。
- 旧 password の削除・無効化・ハッシュ移行。
- 移行後に旧ログインを段階的に止める制御。
- 本番 Rules とのマージ。
- 本番 Firebase での安全な fixture/移行手順。

## セキュリティ監査

### 重大

1. `src/WikiPage.jsx` が `twitter-112c1` の Firebase config を直書きし、共有 Emulator 接続を使っていない。
   - test 環境やローカル検証中でも本番 project へ接続する可能性がある。
   - バックエンド監査上、最優先で修正対象。

2. 旧ログインが Firestore の平文 `password` とクライアント側比較に依存している。
   - `rooms/{roomId}/users/{legacyUserId}.password` を読み、クライアントで比較している。
   - 旧パスワードが漏えいしやすい構造。

3. `localStorage` に `saved_password` を保存する旧互換処理が残っている。
   - ブラウザ上の XSS や端末共有でリスクが高い。

4. `checkLegacyAccountExists` は Apple 認証済みユーザーに旧IDの存在有無を返す。
   - レート制限がないため、旧ID列挙の足がかりになる。

5. Callable Functions の App Check が無効。
   - `enforceAppCheck: false`。
   - 認証済み Apple ユーザーからの乱用を抑える仕組みが不足。

### 高

1. 現行 `firestore.rules` は既存 Web 版の全機能を保護する完全版ではない。
   - 本番へそのまま deploy すると既存機能停止リスクがある。

2. `.firebaserc` の default project が `twitter-112c1`。
   - 誤って `firebase deploy` を実行すると本番相当 project へ影響する可能性がある。

3. `linkLegacyAccount` は旧 password 照合後に `legacyUserLinks` を見るため、パスワードを知る攻撃者は連携済み状態の一部エラー差を観測できる。
   - ただし旧アカウント不存在とパスワード不一致は区別しない。

4. 管理者 Rules は `globalData/boardRooms`, `globalData/badges`, `rooms/{roomId}/posts/{postId}` update/delete に限定され、他の管理者 UI 操作との整合は未確認。

### 中

1. `authProfileSetupEnabled` flag は定義されているが、`userProfileService` の可用性判定は `appleAuthEnabled` と test env を見ている。flag 設計と実装に差がある。

2. `disableAnonymousWrites` flag は定義されているが、監査範囲内で有効な制御として使われている箇所は確認できない。

3. Functions テストは unsigned token を使って Emulator で認証を再現している。本番の Firebase Auth token 検証とは環境が異なるため、本番 deploy 前に実トークンでの検証が必要。

4. Functions の payload 制限は厳しいが、`checkLegacyMigrationEligibility` は uid を返す。必要最小限かは iOS/API 契約時に再確認が必要。

## テスト状況

この監査では、ユーザー指定の「監査のみ」「Emulator または本番へのデータ書き込み禁止」に従い、テスト実行は行っていません。

確認できたテストコード:

- `tests/functions/checkLegacyMigrationEligibility.test.mjs`
  - 5 つの Callable Functions を Emulator 経由で検証。
  - Apple 認証、未認証、anonymous、password provider、claim 不足を検証。
  - 入力検証、旧アカウント存在確認、パスワード照合、link transaction、冪等性、二重連携拒否、部分書き込み防止を検証。
  - Functions が秘密情報を返さないこと、ログ出力しないことをソース検査で確認。

- `tests/rules/appleAuthRules.test.mjs`
  - `users/{uid}` 初期作成、本人 read、初回プロフィール更新、`handles/{handle}` 作成を検証。
  - 未認証、anonymous、他人 read/update、uid/createdAt/legacyUserId 変更、禁止フィールド、handle 不正、予約語、handle update/delete を拒否。
  - `admins/{uid}` と admin による `globalData/boardRooms`、公式ピン更新、投稿削除を検証。

- `tests/config/firebaseClient.test.mjs`
  - Auth Emulator/Firestore Emulator の接続条件、port、二重接続防止、本番 projectId 拒否を検証。
  - Apple Auth service が OAuthProvider と popup/redirect を維持し、custom token 等を使わないことを検証。

- `tests/services/userProfileService.test.mjs`
  - `ensureAppleUserProfile` の初期フィールド、既存 profile 上書き回避、token/email 非保存をソース検査。
  - `completeInitialAppleUserProfile` が transaction で handle 予約と user 更新を行うことを検証。

- `tests/services/legacyMigrationService.test.mjs`
  - クライアントサービスが `linkLegacyAccount` Callable を呼ぶこと、flag/test env/認証/provider 条件、入力正規化、password 非 trim、エラー正規化、二重リクエスト拒否、Storage/Firestore/token/log 非使用を検証。

- `tests/services/adminAuthService.test.mjs`
  - `admins/{uid}` 判定、未認証/匿名拒否、`VITE_ADMIN_PASSWORD` 非使用、秘密情報非表示を検証。

未実行:

- `npm run test:functions`
- `npm run test:rules`
- `npm run test:firebase-client`
- `npm run test:legacy-service`
- `npm run test:user-profile-service`
- `npm run test:admin-auth`
- `npm run build`

## Emulator構成

通常 Rules テスト:

```powershell
npm run test:rules
```

- `firebase.json` を使用。
- Firestore Emulator: `127.0.0.1:8080`
- Project は script 上明示されていない。

Functions/統合テスト:

```powershell
npm run emulators:functions-test
```

- `firebase.functions-test.json` を使用。
- Project: `melink-functions-test`
- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:48080`
- Functions: `127.0.0.1:5001`
- UI: `127.0.0.1:4000`

Web test mode:

```powershell
npm run dev:test
```

- Vite mode: `test`
- Host: `127.0.0.1`
- Port: `5173`
- `.env.test` により `VITE_FIREBASE_ENV=test` と test project `melink-functions-test` を使う。

## 本番デプロイ状況

監査で確認できたこと:

- `.firebaserc` の default project は `twitter-112c1`。
- `firebase.json` には Firestore Rules、Functions、Hosting の deploy 対象設定が存在する。
- Hosting site は `melink-sains`。
- docs には本番 deploy 禁止・未実施の注意が複数ある。

未確認:

- 現在の Functions が本番へ deploy 済みか。
- 現在の `firestore.rules` が本番へ deploy 済みか。
- Hosting の現在デプロイ済みバージョン。
- 本番 Firestore の実データ構造と Rules。

理由:

- この監査では本番 Firebase へ接続せず、`firebase deploy` や `firebase functions:list` 等も実行していないため。

## iOSから利用するAPIの候補

### 直接利用候補

- Firebase Authentication: Sign in with Apple。
- Firestore:
  - `users/{uid}` 初期 profile。
  - `handles/{handle}` 予約。
  - `admins/{uid}` の本人 read。
- Callable Functions:
  - `validateLegacyMigrationInput`
  - `checkLegacyAccountExists`
  - `verifyLegacyAccountPassword`
  - `linkLegacyAccount`

### 推奨 API 契約

iOS から旧パスワードを直接 Firestore で読まない。

旧連携は原則 `linkLegacyAccount` のみを正式 UI から呼ぶ:

入力:

```json
{
  "legacyUserId": "string",
  "legacyPassword": "string"
}
```

成功:

```json
{
  "linked": true,
  "legacyUserId": "normalizedLegacyUserId"
}
```

失敗の扱い:

- `unauthenticated`: Apple/Firebase Auth ログインへ誘導。
- `permission-denied`: 旧IDまたは旧パスワード不一致として同一表示。
- `invalid-argument`: 入力形式エラー。
- `already-exists`: 旧アカウントは連携済み。
- `failed-precondition`: 現在の Firebase user profile 状態が不正。
- `internal`: 一時的エラー。

### iOS側で再実装が必要なもの

- `users/{uid}` 初期化。
- `displayName` / `handle` 入力画面。
- `handles/{handle}` 予約 transaction。
- `legacyUserId` 未設定時の連携案内。
- Firestore 旧 Web 互換データの adapter。
- 投稿・返信・いいね・ブックマーク・フォロー・通知の現行 Web 互換読み書き。

## バックエンド完成までの実装順

最小単位の推奨順:

1. `src/WikiPage.jsx` の直書き Firebase config を共有 Firebase client へ移行し、本番誤接続リスクを除去する。
2. 本番用 Firestore Rules の現状を取得し、現行 `firestore.rules` と統合する計画を作る。
3. `legacyUserLinks` を含む migration 用 Rules/Functions の本番 deploy plan を作成する。
4. `linkLegacyAccount` に App Check とレート制限を追加する。
5. `checkLegacyAccountExists` と `verifyLegacyAccountPassword` を本番 UI/API に公開する必要があるか再評価し、不要なら正式導線では使わない。
6. 旧 `saved_password` の新規保存停止。
7. 旧 Firestore 平文 password の段階的無効化またはハッシュ化移行。
8. `rooms/{roomId}/posts` 等の Web/iOS 共通 Rules を設計・テスト。
9. SwiftUI から利用する投稿・返信・いいね等の API/Rules 契約を固定。
10. 本番 deploy 前の Emulator E2E と staging Firebase E2E。

## 変更時のリスク

- `firestore.rules` をそのまま本番 deploy すると既存 Web 機能が止まる可能性が高い。
- `.firebaserc` default が `twitter-112c1` のため、誤 deploy が本番相当へ向く可能性がある。
- 旧ログインを急に止めると未移行ユーザーがログイン不能になる。
- 旧 password 削除を先に行うと `linkLegacyAccount` が照合できなくなる。
- `legacyUserLinks` の二重連携防止ロジックを変更すると、旧IDの所有権衝突が起きる可能性がある。
- `users/{uid}.handle` が未設定・不正な場合、`linkLegacyAccount` は `failed-precondition` で拒否する。プロフィール設定フローとの整合が必要。
- `src/WikiPage.jsx` の Firebase app 初期化は `getApps().length` に依存しており、他画面の初期化順によって project が変わる可能性がある。

## 未確認事項

- 本番 Firebase に現在 deploy されている Functions 一覧。
- 本番 Firestore Rules の実際の内容。
- 本番 Firestore indexes。
- 本番 Firestore の `admins/{uid}` 運用状況。
- 本番 Firestore に `legacyUserLinks` が存在するか。
- 本番の旧ユーザーデータ件数。
- 本番で `rooms/埼玉大学全体/users/{legacyUserId}.password` が全ユーザーに存在するか。
- 旧 password の文字種、空白、NFKC 差異の実データ分布。
- Firebase Storage の利用有無と本番 Rules。
- Cloud Functions の本番 secrets / env。
- App Check の本番有効化状況。
- `src/WikiPage.jsx` が実際の本番画面で公開されているか。

## 人間による承認が必要な事項

- 本番 Firebase project への接続確認。
- 本番 Functions/Roles/Rules の取得。
- 本番 deploy の実施可否。
- 旧 password をいつ、どの条件で削除または無効化するか。
- `checkLegacyAccountExists` を本番 API として残すか。
- `verifyLegacyAccountPassword` を本番 API として残すか。
- App Check とレート制限の方式。
- 旧ログイン終了時期とユーザー告知。
- iOS 初期版で読み書きする Firestore パスの正式確定。
- `firestore.rules` を本番 Rules としてどうマージするか。

