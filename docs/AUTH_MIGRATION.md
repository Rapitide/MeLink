# 認証移行計画

目的: 既存Web版の独自ログインを、Firebase Authentication + Sign in with Apple を中心とした共通認証基盤へ移行する。Web版とSwiftUI版は同じ Firebase Auth `uid` を使い、Firestore `users/{uid}` を共有する。

重要な範囲制限:

- この段階ではコードを変更しない。
- 投稿、返信、いいね、リアクション、リポスト、ブックマーク等の既存データ構造は変更しない。
- 移行対象は認証方式、`users/{uid}`、`legacyUserLinks/{legacyUserId}` に限定する。
- Firestore `users/{uid}` にはメールアドレスを保存しない。
- Appleの実メールアドレスをアプリ側で要求しない。
- Email/Password認証は原則採用しない。
- Google認証は将来の補助候補に留める。
- 既存ユーザーは旧ID + 旧パスワード確認後、Appleアカウントを連携して移行する。
- 旧パスワード確認とアカウント連携は Cloud Functions 側で安全に行う。
- iOS版に旧パスワード照合処理を実装しない。
- 本番Firebaseへ直接変更しない。必ずテスト用Firebaseプロジェクトで検証する。
- 失敗時は旧ログインへ戻せるようにする。

## 1. Apple認証のiOS実装方針

iOS版の主認証は Sign in with Apple とする。Firebase Authentication の Apple provider を共通認証基盤として使い、iOSアプリは Firebase Auth `uid` をアプリ内の内部ユーザーIDとして扱う。

実装方針:

1. SwiftUIで `AuthenticationServices` を使い、`ASAuthorizationAppleIDProvider` による Appleログインを開始する。
2. リプレイ攻撃対策として nonce を生成し、SHA-256化したnonceを Apple認証リクエストへ渡す。
3. Appleから返る `identityToken` と元nonceを使い、Firebase Auth の `OAuthProvider.appleCredential` でログインする。
4. Firebaseログイン成功後、`Auth.auth().currentUser?.uid` を取得する。
5. `users/{uid}` を読み込む。
6. `users/{uid}` が存在しなければ、初回セットアップ状態として作成する。
7. 初回ログイン後にユーザーへ `displayName` と `handle` の設定を求める。

Firestore作成時の最小フィールド:

```text
users/{uid}
  uid: string
  handle: string | null
  displayName: string | null
  authProviders: ["apple.com"]
  appleLinked: true
  profileSetupCompleted: false
  legacyUserId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
```

注意:

- iOS版は旧 `rooms/{roomId}/users/{legacyUserId}.password` を読まない。
- iOS版は旧パスワード照合処理を持たない。
- 既存ユーザーの移行は、Appleログイン済みFirebase ID tokenをCloud Functionsへ渡して行う。
- 投稿等の既存データは現行構造のまま読み取り互換で扱う。

## 2. Apple認証のWeb実装方針

Web版にも Sign in with Apple を実装し、Firebase Authentication の Apple provider でログインする。

実装方針:

1. Firebase Consoleで Apple provider を有効化する。
2. Apple Developer側で Service ID、Return URL、Domain設定を行う。
3. Web版では Firebase JS SDK の `OAuthProvider('apple.com')` を使う。
4. 基本は `signInWithPopup` を使い、モバイルSafariやポップアップ制限が問題になる場合は `signInWithRedirect` を併用する。
5. ログイン成功後、Firebase Auth `uid` を取得する。
6. `users/{uid}` を読み込み、未作成なら初回セットアップとして作成する。
7. 旧Web版互換のため、移行済みユーザーでは `users/{uid}.legacyUserId` または `legacyUserLinks` から旧IDを復元する。

Web版で残すもの:

- 未移行ユーザー用の旧ID + 旧パスワード入力UI。
- 旧ログイン単体での利用。
- Apple連携開始ボタン。

Web版で避けるもの:

- Appleのメールアドレスを必須入力にすること。
- Firestoreの平文 `password` を新しい通常ログインに使い続けること。
- Apple連携処理をクライアントだけで完結させること。

## 3. Firebase uidの共有方法

Web版とiOS版は Firebase Authentication が発行する同一 `uid` を内部ユーザーIDとして使う。

共有するID:

| 用途 | 値 | 説明 |
| --- | --- | --- |
| 内部ユーザーID | `uid` | Firebase Auth uid。変更不可。 |
| 表示ID | `handle` | ユーザーが設定・変更できるID。 |
| 旧ID | `legacyUserId` | 現行Web版の旧ユーザーID。移行互換用。 |
| Apple識別子 | Firebase Auth provider data | アプリFirestoreには保存しない。必要な確認はFirebase Auth側で行う。 |

推奨Firestoreパス:

```text
users/{uid}
legacyUserLinks/{legacyUserId}
handles/{handle}
migrationClaims/{claimId}
```

`legacyUserLinks/{legacyUserId}` は旧IDからuidを引く対応表として使う。

```text
legacyUserLinks/{legacyUserId}
  legacyUserId: string
  uid: string
  handle: string
  linkedProvider: "apple.com"
  linkedAt: Timestamp
  migrationVersion: number
```

重要:

- 投稿内 `authorId` はこのPhaseでは書き換えない。
- `currentAccountId` 相当の旧IDが必要な既存Web処理では、移行期間中 `legacyUserId` を併用する。
- 新しい本人判定は `uid` を使い、旧データ互換表示では `legacyUserId` を参照する。

## 4. Appleのメール非公開機能への対応

Apple認証では、ユーザーが実メールを非公開にできる。また、Appleからメールアドレスが返るのは初回認可時だけの場合がある。

方針:

- Firestore `users/{uid}` にメールアドレスを保存しない。
- 実メールアドレスをアプリ側で要求しない。
- AppleのPrivate RelayメールもFirestoreには保存しない。
- 表示名や連絡先としてメールを使わない。
- アカウント識別はFirebase Auth `uid` だけで行う。

ユーザー体験:

- 初回ログイン後に `displayName` と `handle` を設定してもらう。
- Appleから `fullName` が返った場合も、自動採用せず、入力欄の候補として扱う。
- Appleからメールが返らない、または非公開メールでもログイン・利用できる。

運用上の注意:

- パスワードリセットはEmail/Passwordを使わないため不要。
- ユーザー問い合わせ時は `handle`, `legacyUserId`, `uid` で確認する。
- メール通知を将来実装する場合は、別途明示同意のうえ通知用メールを保存する。ただし認証移行Phaseでは扱わない。

## 5. Firestoreに保存する情報・保存しない情報

### 保存する情報

`users/{uid}`:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | Firebase Auth uid。ドキュメントIDと一致。 |
| `legacyUserId` | string | 任意 | 既存ユーザー移行時のみ。 |
| `handle` | string | 任意 | 初回設定後は必須扱い。先頭`@`なし。 |
| `displayName` | string | 任意 | 初回設定後は必須扱い。 |
| `bio` | string | 任意 | 旧プロフィールからコピー可。 |
| `avatarUrl` | string | 任意 | Phase 1では既存Data URLも互換維持。 |
| `headerUrl` | string | 任意 | Phase 1では既存Data URLも互換維持。 |
| `avatarColor` | string | 任意 | Web互換。 |
| `authProviders` | array<string> | 必須 | 例: `["apple.com"]`。 |
| `appleLinked` | bool | 必須 | Apple連携済みか。 |
| `profileSetupCompleted` | bool | 必須 | `displayName` と `handle` 設定済みか。 |
| `createdAt` | Timestamp | 必須 | 作成時刻。 |
| `updatedAt` | Timestamp | 必須 | 更新時刻。 |

`legacyUserLinks/{legacyUserId}`:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `legacyUserId` | string | 必須 | 旧WebユーザーID。 |
| `uid` | string | 必須 | Firebase Auth uid。 |
| `handle` | string | 必須 | 初期handle。通常は旧ID。 |
| `linkedProvider` | string | 必須 | `apple.com`。 |
| `linkedAt` | Timestamp | 必須 | 連携時刻。 |
| `migrationVersion` | number | 必須 | 初期値は `1`。 |

`handles/{handle}`:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | 所有者uid。 |
| `createdAt` | Timestamp | 必須 | 予約時刻。 |

### 保存しない情報

- メールアドレス。
- Appleの実メールアドレス。
- Apple Private Relayメールアドレス。
- Apple identity token。
- Apple authorization code。
- nonce。
- 旧パスワード。
- 新しいパスワード。
- Firebase ID token。

これらはFirestoreに永続保存しない。認証トークンや認可コードはFirebase AuthまたはCloud Functionsの一時処理だけで扱う。

## 6. 既存ユーザーとAppleアカウントの連携手順

既存ユーザーは、旧ID + 旧パスワードの確認後にAppleアカウントを連携する。確認と連携はCloud Functionsで行い、クライアントがFirestoreの平文パスワードを直接読まない設計へ寄せる。

推奨フロー:

1. ユーザーがWeb版またはiOS版で Sign in with Apple を行う。
2. Firebase AuthでAppleログインが完了し、クライアントがFirebase ID tokenを取得する。
3. ユーザーが既存アカウント移行を選ぶ。
4. ユーザーが `legacyUserId` と旧パスワードを入力する。
5. クライアントはFirebase ID token、`legacyUserId`、旧パスワードをCloud Functionsの移行関数へ送る。
6. Cloud FunctionsがFirebase ID tokenを検証し、`uid` を確定する。
7. Cloud Functionsが `rooms/{defaultRoom}/users/{legacyUserId}` をサーバー権限で読み、旧パスワードを確認する。
8. 既に `legacyUserLinks/{legacyUserId}` が存在しないことを確認する。
9. `users/{uid}` を作成または更新する。
10. `legacyUserLinks/{legacyUserId}` を作成する。
11. `handles/{legacyUserId}` を予約する。ただし衝突時はユーザーに別handle設定を求める。
12. 旧 `rooms/{roomId}/users/{legacyUserId}` は削除しない。
13. 投稿、返信、いいね等の既存データは書き換えない。

連携後の扱い:

- 既存Web互換のため `users/{uid}.legacyUserId` を保持する。
- 既存投稿の自分判定が必要な画面では、移行期間中 `uid` と `legacyUserId` の両方をアプリ状態に持つ。
- 初回連携後、`displayName` と `handle` を確認・編集させる。

## 7. Cloud Functionsで行う移行処理

Cloud Functionsは旧パスワード確認とアカウント連携の唯一の実行場所にする。

関数例:

```text
linkLegacyAccountToApple(firebaseIdToken, legacyUserId, legacyPassword)
```

処理内容:

1. Firebase Admin SDKで `firebaseIdToken` を検証する。
2. `uid` と provider情報を取得し、Appleログイン済みユーザーであることを確認する。
3. `legacyUserId` の形式を検証する。
4. `legacyUserLinks/{legacyUserId}` が未作成であることを確認する。
5. `rooms/{defaultRoom}/users/{legacyUserId}` を取得する。
6. 旧 `password` と入力値を照合する。
7. 照合成功時だけFirestore batch/transactionで以下を行う。
   - `users/{uid}` を作成または更新。
   - `legacyUserLinks/{legacyUserId}` を作成。
   - `handles/{handle}` を作成可能なら作成。
   - `migrationClaims/{claimId}` に監査ログを保存。
8. 旧パスワードは保存しない。
9. 関数レスポンスには `uid`, `legacyUserId`, `profileSetupCompleted` など最小限だけ返す。

セキュリティ要件:

- 旧パスワード比較はCloud Functions内だけで行う。
- 旧パスワードをログ出力しない。
- Firebase ID token、Apple token、authorization codeをFirestoreに保存しない。
- 連続失敗にはレート制限を入れる。
- 同一 `legacyUserId` の二重連携をtransactionで防ぐ。
- 監査ログには成功/失敗種別、uid、legacyUserId、時刻のみを保存し、秘密情報は含めない。

## 8. 未移行ユーザーへの対応

未移行ユーザーがログイン不能にならないよう、旧ログインは移行期間中維持する。

Web版:

- 旧ID + 旧パスワードログインを残す。
- 旧ログイン成功後、「Appleアカウントを連携してiOS版でも使えるようにする」導線を出す。
- 旧ログインのみでも既存Web機能は使える状態を維持する。
- `saved_password` の新規保存は段階的に停止するが、停止前に既存ユーザーへの告知を行う。

iOS版:

- 主ログインはAppleのみ。
- 未移行の既存ユーザーには、Web版でApple連携する案内を出す。
- iOS版に旧パスワード照合処理は実装しない。
- iOSから直接移行したい場合も、Appleログイン後にCloud Functionsへ旧ID + 旧パスワードを送るだけにし、Firestoreから旧パスワードを読まない。

運用:

- 移行期間を十分に設ける。
- 未移行ユーザー数を `legacyUserLinks` と旧ユーザー一覧から集計する。
- 旧ログイン廃止は別計画とし、このPhaseでは実施しない。

## 9. 匿名ユーザーの権限制限

現行Web版は匿名サインインを使っているが、Apple移行後は匿名ユーザーの権限を強く制限する。

方針:

- 匿名ユーザーは公開データの読み取りだけに限定する。
- 匿名ユーザーによる投稿、返信、いいね、プロフィール更新、移行処理は禁止する。
- `users/{uid}` の作成はAppleログインなど正式providerで認証済みのユーザーのみ許可する。
- 旧ログイン互換のため匿名Authを残す場合でも、旧パスワード確認はCloud Functionsで行う。

Rules/Functionsで見るべき条件:

- Firebase Auth tokenの `firebase.sign_in_provider` が `apple.com` であること。
- 匿名provider `anonymous` の場合は `users/{uid}` 作成や移行関数を拒否する。
- 管理者権限は `admins/{uid}` などサーバー側データで判定し、匿名ユーザーには付与しない。

## 10. Google認証を将来追加する場合の設計

Google認証は将来の補助候補とする。Phase 1では採用しない。

追加時の方針:

- Firebase Authentication の `google.com` provider を追加する。
- 内部IDは引き続きFirebase Auth `uid`。
- `users/{uid}.authProviders` に `google.com` を追加する。
- AppleとGoogleを同一ユーザーへリンクする場合は Firebase Auth の provider linking を使う。
- メールアドレスはGoogle認証でもFirestoreに保存しない。
- 既存ユーザー移行の主導線はAppleのまま維持する。

Google追加時に必要な検討:

- Appleで作成済みの `uid` とGoogleログインの `uid` が分かれる場合のアカウントリンク手順。
- handle一意性の維持。
- Googleログインだけで新規登録を許可するか。
- iOS版でAppleログインが使えない特殊環境への代替にするか。

## 11. テスト項目

テスト用Firebaseプロジェクトで実施する。本番Firebaseへ直接適用しない。

### iOS Appleログイン

- Sign in with AppleでFirebase Authログインできる。
- nonce検証が通る。
- Appleがメール非公開でもログインできる。
- Appleからメールが返らなくても `users/{uid}` を作成できる。
- 初回ログイン後に `displayName` と `handle` 設定画面へ進む。
- iOS版が旧パスワードをFirestoreから読まない。

### Web Appleログイン

- `signInWithPopup` でAppleログインできる。
- ポップアップ不可環境で `signInWithRedirect` に切り替えられる。
- Firebase Auth `uid` を取得できる。
- `users/{uid}` を作成/読み取りできる。
- メールアドレスをFirestoreに保存していない。

### 既存ユーザー連携

- Appleログイン済みユーザーが旧ID + 旧パスワードで連携できる。
- 旧パスワード不一致時は連携されない。
- `legacyUserLinks/{legacyUserId}` が作成される。
- `users/{uid}.legacyUserId` が設定される。
- `handles/{handle}` が作成される、または衝突時に再設定へ進む。
- 同じ旧IDを二重連携できない。
- 別Appleアカウントから同じ旧IDを奪えない。
- 投稿、返信、いいね等の既存データが変更されていない。

### Cloud Functions

- Firebase ID token検証が必須になっている。
- Apple provider以外、匿名ユーザーでは移行関数を実行できない。
- 旧パスワードやtokenがログに出力されない。
- レート制限が効く。
- transactionで二重連携を防げる。
- 失敗時に部分的な `users/{uid}` や `legacyUserLinks` が残らない。

### Security Rules

- `users/{uid}` は本人だけ更新できる。
- `users/{uid}` に `email`, `password`, `appleIdentityToken`, `appleAuthorizationCode` を保存できない。
- 匿名ユーザーは `users/{uid}` を作成できない。
- `legacyUserLinks` は本人またはCloud Functions経由以外で作成できない。
- 既存掲示板の読み取り互換が維持される。

### 既存Web互換

- 未移行ユーザーが旧ログインでWeb版を使える。
- 移行済みユーザーがAppleログイン後も既存プロフィールを参照できる。
- `legacyUserId` を使う既存の自分判定が壊れない。
- 投稿一覧、返信、いいね、リポスト等の表示が移行前と同じ。

## 12. ロールバック手順

### テスト環境で失敗した場合

1. Web版/iOS版をApple移行前の認証フローへ戻す。
2. テストFirestoreの `users/{uid}`, `handles/{handle}`, `legacyUserLinks/{legacyUserId}`, `migrationClaims` を削除またはテストデータから再作成する。
3. Firebase Authテストユーザーを削除する。
4. Apple provider設定を無効化、またはテスト設定から外す。
5. Rulesを移行前のテストRulesへ戻す。
6. 旧ログインでログインできることを確認する。

### 本番段階リリース中に失敗した場合

1. Feature FlagでApple連携導線を停止する。
2. Web版は旧ログイン優先へ戻す。
3. Cloud Functionsの移行関数を無効化する、または新規連携を拒否する。
4. 既存の `rooms/{roomId}/users/{legacyUserId}` は削除していないため、旧ログインを継続する。
5. `users/{uid}` と `legacyUserLinks` は原則削除しない。調査用に保持し、二重連携防止にも使う。
6. Rulesを、旧ログインが必要とする読み取りを許可する状態へ戻す。
7. 影響ユーザーを特定し、Apple連携済みユーザーが旧ログインでも利用継続できるか確認する。

### 絶対に行わないこと

- 本番で `rooms/{roomId}/users/{legacyUserId}` を先に削除しない。
- 本番で投稿、返信、いいね等の `authorId` やMapキーをこのPhaseで書き換えない。
- 移行完了前に `password` フィールド読み取りを全面禁止しない。
- iOS版へ旧パスワード照合処理を追加しない。
- FirestoreへApple token、authorization code、メールアドレス、旧パスワードを保存しない。
- バックアップなしでAuthユーザーやFirestore対応表を一括削除しない。

## 段階的リリース方法

### Step 1: テストFirebaseで完全検証

- テストFirebaseプロジェクトに現行構造のデータを用意する。
- Apple providerをテスト設定で有効化する。
- Web版とiOS版をテストFirebaseへ接続する。
- 旧ログイン、Appleログイン、Cloud Functions連携、iOSログインを検証する。
- Security Rulesもテストプロジェクトで検証する。

### Step 2: 本番コードにFeature Flagだけ入れる

- 例: `VITE_APPLE_AUTH_ENABLED=false`, `VITE_LEGACY_LINK_ENABLED=false` を初期値にする。
- 本番では旧ログインのみ動作させる。
- デプロイ後、既存ログインに影響がないことを確認する。

### Step 3: 管理者・テストアカウントだけ有効化

- 少人数だけAppleログインと旧ID連携を有効化する。
- `users/{uid}`, `legacyUserLinks`, `handles`, `migrationClaims` が正しく作られることを確認する。
- 投稿やプロフィール表示の互換を確認する。

### Step 4: 任意移行として公開

- 既存ユーザーに「Appleアカウントを連携するとiOS版でも使える」導線を出す。
- 旧ログインは残す。
- 移行率、ログイン失敗率、Cloud Functions失敗率、問い合わせ内容を監視する。

### Step 5: 新規登録をApple認証へ寄せる

- 新規ユーザーは Sign in with Apple + `users/{uid}` で作成する。
- 初回ログイン後に `displayName` と `handle` を設定する。
- 既存ユーザーは旧ログインとApple連携導線を維持する。
- `saved_password` の新規保存を停止する。

### Step 6: 旧ログイン廃止準備

- 十分な移行期間を設ける。
- 未移行ユーザーに通知する。
- 旧ID連携のサポート窓口を用意する。
- 旧 `password` フィールドを使わないログインが安定してから、Rules強化と旧フィールド削除を別計画で実施する。

## Phase 1完了条件

- iOS版の主認証が Sign in with Apple になっている。
- Web版でも Sign in with Apple でFirebase Authログインできる。
- Firebase Auth `uid` をWeb/iOS共通の内部IDとして使える。
- `users/{uid}` と `legacyUserLinks/{legacyUserId}` が正しく作成される。
- Firestore `users/{uid}` にメールアドレスを保存していない。
- 既存ユーザーが旧ログインで引き続きログインできる。
- 旧ID + 旧パスワード確認とApple連携がCloud Functionsで行われる。
- iOS版に旧パスワード照合処理がない。
- 投稿、返信、いいね等の既存データ構造が変更されていない。
- 失敗時に旧ログインへ戻せる。
