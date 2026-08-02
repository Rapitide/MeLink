# Apple認証移行 Phase 1 実装計画

目的: 既存Web版を壊さず、テスト用Firebase環境で Sign in with Apple + Firebase Authentication + `users/{uid}` + `legacyUserLinks/{legacyUserId}` を段階的に導入する。

前提:

- 投稿、返信、いいね、リアクション、リポスト等の構造は変更しない。
- 本番Firebaseには接続しない。
- 既存の旧ログインを壊さない。
- 1つのPRで大規模変更しない。
- iOS版に旧パスワード照合処理を入れない。
- Firestoreにメールアドレスを保存しない。
- Apple token、nonce、authorization codeを保存しない。
- `legacyUserLinks` の作成はクライアントから直接行わない。
- Cloud Functionsで旧パスワード検証とApple連携を行う。
- 各PRは単独でロールバック可能にする。

注意: `AUTH_MIGRATION(1).md` というファイルはリポジトリ内に存在しないため、Apple認証方針が書かれた `docs/AUTH_MIGRATION.md` を前提にする。

## 1. PR分割

| PR | 目的 | 主な変更ファイル | 依存 | ロールバック |
| --- | --- | --- | --- | --- |
| PR-0 | ドキュメント・設定確認のみ | `docs/*`, `.env.example` | なし | ファイル差し戻しのみ |
| PR-1 | テストFirebase切替とFeature Flag基盤 | `.env.example`, `src/MainApp.jsx` または新規 `src/config/authFlags.js` | PR-0 | Flagをfalseへ戻す |
| PR-2 | Web版AppleログインのUIを非表示Flag付きで追加 | `src/AuthScreen.jsx`, `src/MainApp.jsx` | PR-1 | Flag falseで無効化 |
| PR-3 | `users/{uid}` 作成・初回プロフィール設定 | `src/MainApp.jsx`, `src/AuthScreen.jsx`, 必要なら `src/Modals.jsx` | PR-2 | Flag false、追加docは残置可 |
| PR-4 | Cloud Functions土台 | 新規 `functions/*`, `firebase.json`, `.firebaserc`確認 | PR-1 | Functionsを未deploy/disable |
| PR-5 | 旧アカウント連携Function | `functions/src/*`, `functions/test/*` | PR-4 | Functionを停止 |
| PR-6 | Webから旧アカウント連携Functionを呼ぶ | `src/MainApp.jsx`, `src/AuthScreen.jsx` | PR-5 | `VITE_LEGACY_LINK_ENABLED=false` |
| PR-7 | Security Rulesをテスト環境に追加 | 新規 `firestore.rules`, `firebase.json` | PR-3, PR-5 | Rulesを前版へ戻す |
| PR-8 | iOS版Appleログイン最小実装 | iOS別リポジトリ/プロジェクト | PR-3 | iOSビルドから機能を外す |
| PR-9 | 統合テストと段階公開準備 | `docs/`, テスト手順、必要ならCI | PR-2からPR-8 | 個別PR単位で戻す |

## 2. 各PR詳細

### PR-0: 調査文書と設定棚卸し

変更するファイル:

- `docs/WEB_APP_ANALYSIS.md`
- `docs/DATA_MODEL.md`
- `docs/AUTH_MIGRATION.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `.env.example`

目的:

- 現行構造、移行対象、禁止事項を明文化する。
- テストFirebaseと本番Firebaseを誤接続しないために必要な環境変数を整理する。

完了条件:

- Apple認証Phase 1の範囲が明記されている。
- 本番Firebaseへ接続しない方針が明記されている。
- 投稿系データ構造を変更しない方針が明記されている。

テスト方法:

- ドキュメントレビュー。
- `.env.example` に本番値が入っていないことを確認。

### PR-1: テストFirebase切替とFeature Flag基盤

変更するファイル:

- `.env.example`
- `src/MainApp.jsx`
- 可能なら新規 `src/config/firebaseConfig.js`
- 可能なら新規 `src/config/featureFlags.js`

目的:

- Firebase接続先を環境変数で明確に切り替える。
- Apple認証関連のUI・処理をFeature Flagで完全に無効化できるようにする。
- 既存旧ログインには一切影響させない。

完了条件:

- `VITE_FIREBASE_PROJECT_ID` 等がテスト用値へ切り替え可能。
- `VITE_APPLE_AUTH_ENABLED=false` のとき、既存画面と旧ログイン挙動が変わらない。
- `VITE_LEGACY_LINK_ENABLED=false` のとき、旧アカウント連携UI/処理が出ない。
- 本番Firebase識別子を含む `.env` をコミットしない。

テスト方法:

- `npm run build`
- 旧ログインでログインできる。
- 投稿一覧が表示される。
- Apple認証ボタンが表示されない。

### PR-2: Web版AppleログインUIをFlag付きで追加

変更するファイル:

- `src/AuthScreen.jsx`
- `src/MainApp.jsx`
- 必要なら `src/utils.jsx`

目的:

- `VITE_APPLE_AUTH_ENABLED=true` のときだけAppleログインボタンを表示する。
- Appleログイン開始処理の入口を作る。
- 旧ログインUIを残す。

完了条件:

- Flag falseではUIが完全に非表示。
- Flag trueでAppleログインボタンが出る。
- 旧ID + 旧パスワードログインは従来通り動く。
- メールアドレス入力欄を追加しない。

テスト方法:

- Flag false/trueの表示確認。
- 旧ログイン成功/失敗確認。
- Apple未設定テスト環境では、押下時に安全なエラー表示になり、既存状態が壊れない。

### PR-3: Web版 `users/{uid}` 作成と初回プロフィール設定

変更するファイル:

- `src/MainApp.jsx`
- `src/AuthScreen.jsx`
- 必要なら `src/Modals.jsx`
- 可能なら新規 `src/services/authProfile.js`

目的:

- Appleログイン成功後に `users/{uid}` を作成/読み取りする。
- 初回ログイン後、`displayName` と `handle` を設定させる。
- Firestoreへメールアドレスを保存しない。

完了条件:

- `users/{uid}` に `uid`, `authProviders`, `appleLinked`, `profileSetupCompleted`, `createdAt`, `updatedAt` が保存される。
- `displayName` と `handle` 未設定時はセットアップ画面へ進む。
- `email`, `password`, Apple token、nonce、authorization codeをFirestoreへ保存しない。
- 旧ログイン利用者の挙動は変わらない。

テスト方法:

- Appleログイン後に `users/{uid}` が作成される。
- Firestoreドキュメントにメール/token類がない。
- handle重複時のエラー表示。
- 旧ログインで従来通り入れる。

### PR-4: Cloud Functionsプロジェクト土台

変更するファイル:

- 新規 `functions/package.json`
- 新規 `functions/src/index.ts` または `functions/index.js`
- 新規 `functions/tsconfig.json` 使う場合のみ
- `firebase.json`
- `.firebaserc` はテストproject alias確認のみ

目的:

- Cloud FunctionsをテストFirebaseへdeployできる土台を作る。
- まだ旧パスワード検証は実装しない。

完了条件:

- Functionsローカルビルドが通る。
- テストprojectへだけdeployできる設定になっている。
- 本番project aliasへのdeploy手順を含めない、または明示的に禁止する。

テスト方法:

- Functions lint/build。
- Emulatorまたはテスト環境でヘルスチェック関数が動く。
- 本番project IDが設定に混入していない。

### PR-5: 旧アカウント連携Function

変更するファイル:

- `functions/src/index.ts` または `functions/index.js`
- `functions/src/linkLegacyAccountToApple.*`
- `functions/test/*`

目的:

- `linkLegacyAccountToApple` を実装する。
- Firebase ID token検証、Apple provider確認、旧パスワード検証、`users/{uid}` 更新、`legacyUserLinks/{legacyUserId}` 作成をサーバー側で行う。

完了条件:

- 匿名ユーザー、Apple以外providerは拒否。
- 旧パスワード不一致は拒否。
- 同じ `legacyUserId` の二重連携はtransactionで拒否。
- `legacyUserLinks` はFunctionだけが作成する。
- 投稿、返信、いいね等は一切書き換えない。
- token、nonce、authorization code、メール、旧パスワードをFirestore/ログに保存しない。

テスト方法:

- Unit test: tokenなし拒否。
- Unit test: provider不一致拒否。
- Unit test: 旧パスワード不一致拒否。
- Unit test: 二重連携拒否。
- Integration test: 成功時に `users/{uid}`, `legacyUserLinks/{legacyUserId}`, `handles/{handle}`, `migrationClaims/{claimId}` が作成される。

### PR-6: Web版から旧アカウント連携Functionを呼ぶ

変更するファイル:

- `src/MainApp.jsx`
- `src/AuthScreen.jsx`
- 可能なら新規 `src/services/legacyLink.js`

目的:

- Appleログイン済みユーザーが旧ID + 旧パスワードを入力し、Cloud Functionsで連携できるUIを追加する。
- クライアントは旧パスワードをFirestoreから読まない。

完了条件:

- `VITE_LEGACY_LINK_ENABLED=false` でUI/処理が無効。
- 連携成功後、`users/{uid}.legacyUserId` が取得できる。
- `currentUid` と `legacyUserId` をアプリ状態で分離して扱える。
- 旧ログインのみのユーザーは従来通り利用可能。

テスト方法:

- Flag falseで表示されない。
- 連携成功。
- パスワード不一致時に安全なエラー。
- 連携済み旧IDで再連携できない。
- 投稿一覧・プロフィール表示が壊れない。

### PR-7: Firestore Security Rules追加

変更するファイル:

- 新規 `firestore.rules`
- `firebase.json`
- 必要なら `docs/AUTH_MIGRATION.md`

目的:

- Phase 1対象の `users/{uid}`, `handles/{handle}`, `legacyUserLinks/{legacyUserId}`, `migrationClaims/{claimId}` だけRulesを追加する。
- 既存掲示板データのRulesは大きく変えない。

完了条件:

- `users/{uid}` は本人だけ作成/更新。
- `users/{uid}` に `email`, `password`, Apple token、authorization codeを保存できない。
- 匿名ユーザーは `users/{uid}` 作成不可。
- `legacyUserLinks` はクライアントから直接作成不可。
- 既存 `rooms/{roomId}/posts` の読み取り互換は維持。

テスト方法:

- Rules emulator test。
- 匿名作成拒否。
- 本人以外更新拒否。
- 禁止フィールド保存拒否。
- 既存投稿読み取り確認。

### PR-8: iOS版Appleログイン最小実装

変更するファイル:

- iOSプロジェクト側 `App` entry。
- `AuthView.swift`
- `AppleSignInService.swift`
- `FirebaseUserService.swift`
- `GoogleService-Info.plist` はテストFirebase用のみ。

目的:

- iOS版で Sign in with Apple + Firebase Authログインを行う。
- `users/{uid}` を作成/読み取りする。
- 旧パスワード照合処理をiOSへ入れない。

完了条件:

- Appleログインできる。
- Firebase Auth `uid` を取得できる。
- `users/{uid}` を作成/読み取りできる。
- メールアドレスをFirestoreへ保存しない。
- 未移行ユーザーにはWeb連携案内またはFunctions連携画面へ進む。

テスト方法:

- 実機またはAppleログイン対応環境でログイン。
- nonce検証。
- Firestore保存フィールド確認。
- iOSコード内に旧パスワード照合ロジックがないことをレビュー。

### PR-9: 統合テスト・段階公開準備

変更するファイル:

- `docs/IMPLEMENTATION_PLAN.md`
- `docs/AUTH_MIGRATION.md`
- 必要ならテスト手順書
- 必要ならCI設定

目的:

- PR-1からPR-8までをテストFirebaseで通し検証する。
- 本番投入前のFeature Flag、復旧手順、監視項目を固定する。

完了条件:

- テストFirebaseでWeb Appleログイン、iOS Appleログイン、旧アカウント連携が通る。
- 旧ログインが壊れていない。
- 投稿系構造に差分がない。
- 本番Firebaseへ接続しない運用が確認済み。

テスト方法:

- Web手動E2E。
- iOS手動E2E。
- Functions integration test。
- Rules emulator test。
- Firestore差分確認。

## 3. PR間の依存関係

```text
PR-0
  -> PR-1
      -> PR-2 -> PR-3
      -> PR-4 -> PR-5 -> PR-6
      -> PR-7
      -> PR-8
  -> PR-9
```

依存関係の考え方:

- PR-1はすべての実装PRの土台。
- PR-2とPR-3はWeb Appleログインの導線。
- PR-4とPR-5は安全な旧アカウント連携の土台。
- PR-6はPR-5が完成するまで着手しない。
- PR-7はPR-3/PR-5の保存先が固まってから適用する。
- PR-8はWebとは独立に進められるが、Firestore保存形式はPR-3に合わせる。
- PR-9は全体確認のみ。

## 4. テスト用Firebaseと本番Firebaseの切り替え方法

方針:

- Phase 1実装中はテストFirebaseだけを使う。
- 本番Firebaseの `.env` はローカルやCIに置かない。
- `.env.example` にはキー名だけを置き、値は空にする。
- `.env.test-firebase.local` などローカル専用ファイルを `.gitignore` 対象にする。

環境変数案:

```env
VITE_FIREBASE_ENV=test
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_APPLE_AUTH_ENABLED=false
VITE_LEGACY_LINK_ENABLED=false
VITE_AUTH_PROFILE_SETUP_ENABLED=false
VITE_FIREBASE_FUNCTIONS_REGION=asia-northeast1
VITE_LEGACY_LINK_FUNCTION_URL=
```

切り替えルール:

- `VITE_FIREBASE_ENV` が `test` でない場合、Apple移行Feature Flagを強制的にfalseにする。
- ビルド時に `VITE_FIREBASE_PROJECT_ID` がテストproject IDであることを確認するチェックを入れる。
- 本番接続はPhase 1完了後の別計画で扱う。

## 5. Feature Flag設計

| Flag | 初期値 | 目的 |
| --- | --- | --- |
| `VITE_APPLE_AUTH_ENABLED` | `false` | Web版Appleログインボタンと処理を有効化 |
| `VITE_AUTH_PROFILE_SETUP_ENABLED` | `false` | `users/{uid}` 作成後の初回プロフィール設定 |
| `VITE_LEGACY_LINK_ENABLED` | `false` | 旧ID + 旧パスワード連携UIを有効化 |
| `VITE_FORCE_TEST_FIREBASE_ONLY` | `true` | テストFirebase以外で移行機能を無効化 |
| `VITE_DISABLE_ANONYMOUS_WRITES` | `false` | 匿名ユーザーの書き込み制限検証用 |

設計原則:

- Flag falseで既存旧ログインの挙動が完全に維持される。
- 途中PRはFlag falseのままmergeできる。
- UI表示、Firebase Auth呼び出し、Functions呼び出しを別Flagで切る。
- ロールバックは原則Flag falseで行う。

## 6. Apple Developer側で必要な設定

必要な設定:

- Apple Developer Program加入。
- iOS App IDに Sign in with Apple capability を追加。
- Web用 Service ID を作成。
- Webドメインを登録。
- Return URLを登録。
- Firebase Auth Apple provider用の Team ID、Key ID、Private Keyを準備。
- テストFirebase HostingまたはテストWebドメインをApple側に登録。

注意:

- 本番ドメインではなく、テスト用ドメイン/Hosting URLで先に検証する。
- Return URLはFirebase AuthのApple providerが要求するcallback URLに合わせる。
- Apple private keyはリポジトリへコミットしない。
- iOS Bundle IDはテストアプリ用と本番アプリ用を分けるのが望ましい。

## 7. Firebase Console側で必要な設定

テストFirebaseプロジェクトで行う:

- Authenticationを有効化。
- Sign-in providerで Apple を有効化。
- Apple Developerの Team ID、Key ID、Private Key、Service IDを設定。
- Authorized domainsにテストWebドメインを追加。
- Firestore Databaseを作成。
- Cloud Functionsを有効化。
- 必要に応じて App Check は後続Phaseで検証。
- iOSアプリを追加し、テスト用 `GoogleService-Info.plist` を取得。
- Webアプリを追加し、テスト用Firebase configを `.env.test-firebase.local` に設定。

行わないこと:

- 本番FirebaseのApple provider設定を変更しない。
- 本番Firestore Rulesを変更しない。
- 本番ユーザーを作成しない。

## 8. Cloud Functionsの構成

推奨構成:

```text
functions/
  package.json
  src/
    index.ts
    auth/
      linkLegacyAccountToApple.ts
      verifyAppleProvider.ts
      validateLegacyCredentials.ts
    firestore/
      createUserProfile.ts
      reserveHandle.ts
      createLegacyUserLink.ts
    audit/
      writeMigrationClaim.ts
  test/
    linkLegacyAccountToApple.test.ts
```

関数:

- `linkLegacyAccountToApple`
  - callable function または HTTPS function。
  - Firebase ID tokenを検証。
  - `firebase.sign_in_provider == apple.com` を確認。
  - 旧IDと旧パスワードを検証。
  - transactionで `users/{uid}`, `legacyUserLinks/{legacyUserId}`, `handles/{handle}`, `migrationClaims/{claimId}` を作成/更新。

保存禁止:

- 旧パスワード。
- Apple identity token。
- authorization code。
- nonce。
- Firebase ID token。
- メールアドレス。

## 9. Firestore Security Rulesの追加範囲

Phase 1で追加する範囲:

- `users/{uid}`
- `handles/{handle}`
- `legacyUserLinks/{legacyUserId}`
- `migrationClaims/{claimId}`

Phase 1で変更しない範囲:

- `rooms/{roomId}/posts`
- 投稿内 `likes`, `reactions`, `reposts`
- 返信構造
- `rooms/{roomId}/bookmarks`
- `rooms/{roomId}/follows`
- `rooms/{roomId}/followers`
- `rooms/{roomId}/notifications`

Rules方針:

- `users/{uid}` は本人のみ作成/更新。
- `email`, `password`, Apple token、authorization code、nonceは保存禁止。
- `legacyUserLinks` はクライアントからcreate/update/delete禁止。Cloud FunctionsのAdmin SDKだけが作成。
- `handles` は一意予約。変更・削除は後続Phase。
- `migrationClaims` はクライアント読み取り禁止、管理/監査用途のみ。

## 10. Web版Appleログインの実装順序

1. Firebase provider設定を追加する。
2. `OAuthProvider('apple.com')` を使うログイン関数を作る。
3. `VITE_APPLE_AUTH_ENABLED` がtrueのときだけAppleログインボタンを表示する。
4. `signInWithPopup` を実装する。
5. popup不可時に `signInWithRedirect` へ切り替える。
6. ログイン成功後に `uid` を取得する。
7. `users/{uid}` を作成/読み取りする。
8. `displayName` と `handle` 未設定時にセットアップUIへ進める。
9. 旧ログインUIを維持する。
10. 旧アカウント連携UIは `VITE_LEGACY_LINK_ENABLED` がtrueになるまで出さない。

## 11. iOS版Appleログインの実装順序

1. テストFirebase用iOSアプリをFirebase Consoleへ登録する。
2. iOS App IDに Sign in with Apple capability を付ける。
3. Firebase iOS SDKを導入する。
4. `AuthenticationServices` でAppleログインボタンを実装する。
5. nonce生成とSHA-256化を実装する。
6. Apple `identityToken` とnonceでFirebase Authへログインする。
7. Firebase Auth `uid` を取得する。
8. `users/{uid}` を作成/読み取りする。
9. 初回 `displayName` と `handle` 設定UIへ進む。
10. 未移行ユーザーにはWeb連携案内、またはCloud Functions連携画面を出す。
11. 旧パスワード照合処理はiOSに実装しない。

## 12. 旧アカウント連携処理の実装順序

1. Cloud Functionsに空の `linkLegacyAccountToApple` を作る。
2. Firebase ID token検証を入れる。
3. Apple provider確認を入れる。
4. `legacyUserId` 入力バリデーションを入れる。
5. 旧ユーザードキュメントをAdmin SDKで読む。
6. 旧パスワード照合をFunctions内だけで行う。
7. `legacyUserLinks/{legacyUserId}` の存在確認を入れる。
8. transactionで `users/{uid}` 作成/更新、`legacyUserLinks` 作成、`handles` 予約を行う。
9. `migrationClaims` に監査ログを書く。
10. Web版からFunctionsを呼ぶ。
11. iOS版から必要な場合だけFunctionsを呼ぶ。
12. 連携成功後に旧ログイン互換状態へ戻れることを確認する。

## 13. 失敗時の復旧方法

Feature Flagでの即時復旧:

- `VITE_APPLE_AUTH_ENABLED=false`
- `VITE_AUTH_PROFILE_SETUP_ENABLED=false`
- `VITE_LEGACY_LINK_ENABLED=false`

Web復旧:

- 旧ログインUIを表示し続ける。
- Appleログイン導線を隠す。
- Functions呼び出しを止める。
- 既存 `rooms/{roomId}/users/{legacyUserId}` は削除していないため旧ログインを継続する。

Functions復旧:

- `linkLegacyAccountToApple` を無効化または常にメンテナンスレスポンスにする。
- 失敗したmigrationを `migrationClaims` から確認する。
- 部分作成された `users/{uid}` は原則残置し、二重作成防止に使う。必要ならテスト環境では削除。

Rules復旧:

- テストRulesを前版に戻す。
- 旧ログインが必要な読み取りを塞がない。
- 本番RulesはPhase 1では触らない。

禁止:

- 投稿系データを復旧のために書き換えない。
- `legacyUserLinks` をクライアントから手作業作成しない。
- 旧パスワードをログやFirestoreに残さない。

## 14. 最初に実装する最小単位

最初の最小単位は PR-1「テストFirebase切替とFeature Flag基盤」。

理由:

- 既存旧ログインを変えない。
- Apple DeveloperやCloud Functionsが未完成でもmergeできる。
- 本番Firebaseへ接続しない安全策を先に置ける。
- 以降のPRをすべてFlag falseで安全に積める。

最小実装内容:

- `.env.example` にテストFirebase用環境変数とFeature Flagを追加。
- Firebase設定読み込みを整理。
- `VITE_FIREBASE_ENV=test` 以外ではApple移行Flagを強制無効化する設計を入れる。
- 旧ログイン、投稿一覧、プロフィール表示が変わらないことを確認する。

完了条件:

- `npm run build` が通る。
- 旧ログインが通る。
- Apple関連UIが出ない。
- Firestoreへの書き込み先がテストFirebaseであることを確認できる。
- 本番Firebaseの設定値をコミットしていない。
