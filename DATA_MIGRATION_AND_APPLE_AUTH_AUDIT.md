# Data Migration and Apple Auth Audit

作成日: 2026-08-02

この文書は、React/Firebase 版 MeLink に Apple 認証を導入した後も、既存の掲示板履歴、チャット履歴、ユーザー情報、フォロー関係、通知などを保持・参照できるかを監査した結果です。

今回は調査と文書作成のみを行いました。Web フロントエンド、Functions、Firestore Rules、Firebase 設定、Firestore データ、Emulator、本番 Firebase には変更・接続・書き込みを行っていません。

## 調査対象

主に確認したファイル:

- `src/MainApp.jsx`
- `src/AuthScreen.jsx`
- `src/Community.jsx`
- `src/Timetable.jsx`
- `src/ToDoCalendar.jsx`
- `src/TodoDesktopViews.jsx`
- `src/Wiki.jsx`
- `src/WikiPage.jsx`
- `src/config/firebaseClient.js`
- `src/config/firebaseConfig.js`
- `src/config/featureFlags.js`
- `src/services/appleAuth.js`
- `src/services/userProfileService.js`
- `src/services/legacyMigrationService.js`
- `src/services/adminAuthService.js`
- `src/pages/legacyMigrationPromptModel.js`
- `src/pages/legacyMigrationDebugPageModel.js`
- `functions/index.js`
- `functions/src/checkLegacyMigrationEligibility.js`
- `functions/src/validateLegacyMigrationInput.js`
- `functions/src/checkLegacyAccountExists.js`
- `functions/src/verifyLegacyAccountPassword.js`
- `functions/src/linkLegacyAccount.js`
- `firestore.rules`
- `docs/AUTH_MIGRATION.md`
- `docs/DATA_MODEL.md`
- `docs/FUNCTIONS_EMULATOR.md`
- `docs/SWIFTUI_PORTING_DESIGN.md`
- `docs/WEB_APP_ANALYSIS.md`
- `tests/functions/checkLegacyMigrationEligibility.test.mjs`
- `tests/pages/appleAuthCompletionFlow.test.mjs`
- `tests/pages/legacyMigrationPromptModel.test.mjs`
- `tests/services/legacyMigrationService.test.mjs`
- `tests/services/userProfileService.test.mjs`
- `tests/services/adminAuthService.test.mjs`

## 現在のユーザーID体系

現行 Web には、少なくとも次の ID が混在しています。

| ID種別 | 役割 | 主な保存・参照箇所 |
| --- | --- | --- |
| `legacyUserId` | 旧Web独自ログインのユーザーID。`currentAccountId` として広く使われる。 | `rooms/{roomId}/users/{legacyUserId}`, 投稿 `authorId`, likes/reactions/reposts map key, follows/followers doc ID/key, bookmarks doc ID, notifications doc ID |
| Firebase Auth `uid` | Firebase Authentication の内部ユーザーID。Apple認証後の共通ID。 | `users/{uid}`, `admins/{uid}`, Apple認証後の `currentAccountId` |
| `handle` | 表示用ID。変更可能なID。 | 旧プロフィール `handle: "@{legacyUserId}"`, 新プロフィール `users/{uid}.handle`, `handles/{handle}` |
| `currentAccountId` | Webアプリ内の現在ユーザーID。旧ログインでは `legacyUserId`、Appleログイン後は `uid` が入る。 | `src/MainApp.jsx` 全体 |
| `firebaseUid` | Appleログイン後の一時的なプロフィール object 内の Firebase uid。 | `src/MainApp.jsx` の `handleAppleAuthComplete` |

重要な実装事実:

- 旧ログイン時の `currentAccountId` は旧ユーザーIDです。
- Appleログイン完了時の `currentAccountId` は Firebase Auth `uid` です。
- 現行 `MainApp` の多くの Firestore パスは `currentAccountId` をそのまま doc ID や map key に使います。
- `users/{uid}.legacyUserId` は Functions で設定されますが、現行 `MainApp` の掲示板・チャット・フォロー等の読み書き Adapter としてはまだ使われていません。

## 旧アカウントとFirebase uidの対応関係

設計上の対応関係:

- `users/{uid}.legacyUserId`
- `legacyUserLinks/{legacyUserId}.uid`

実装済みの作成処理:

- `functions/src/linkLegacyAccount.js` が Apple 認証済み uid と旧ID/旧パスワードを検証する。
- 旧ユーザーは `rooms/埼玉大学全体/users/{legacyUserId}` から読む。
- 旧 password は `password` フィールド。
- 照合成功後、Firestore transaction で次を同時に行う。
  - `legacyUserLinks/{legacyUserId}` 作成。
  - `users/{uid}.legacyUserId` 更新。

実装済みの連携ドキュメント:

```text
legacyUserLinks/{legacyUserId}
```

主な field:

- `legacyUserId`
- `uid`
- `handle`
- `linkedProvider: "apple.com"`
- `linkedAt`
- `migrationVersion: 1`

現時点の参照状況:

- `linkLegacyAccount` Function は `legacyUserLinks/{legacyUserId}` を二重連携防止と冪等性確認に使う。
- `src/services/legacyMigrationService.js` は Callable `linkLegacyAccount` を呼ぶだけで、`legacyUserLinks` を直接読まない。
- `src/MainApp.jsx` は `users/{uid}.legacyUserId` を使って旧投稿・旧フォロー・旧通知を参照する Adapter をまだ持っていない。
- docs では「移行期間中 `uid` と `legacyUserId` の両方を持つ」と説明されているが、現行 `MainApp` の実装は Apple完了後 `currentAccountId=uid` に寄っている。

## Firestoreパス別ID利用一覧

| 機能 | Firestoreパス | 所有者/投稿者field | 保存ID種別 | Apple認証移行後も参照可能か | 追加対応 | データ書き換え |
| --- | --- | --- | --- | --- | --- | --- |
| 旧ユーザープロフィール | `rooms/{roomId}/users/{legacyUserId}` | doc ID, `id`, `handle` | legacyUserId | 条件付き。旧IDで読めば可能。Apple後の現行 `MainApp` は uid で読むため、そのままでは旧プロフィールを読まない | `users/{uid}.legacyUserId` から旧IDを解決する Adapter | 不要。Adapterで読める |
| 新しいプロフィール | `users/{uid}` | doc ID, `uid`, `legacyUserId`, `handle` | Firebase uid + legacyUserId + handle | 可能 | Web/iOS共通プロフィールとして利用 | 不要 |
| handle予約 | `handles/{handle}` | doc ID, `uid` | handle + Firebase uid | 可能 | handle変更時の設計は未実装 | 不要 |
| 投稿 | `rooms/{roomId}/posts/{postId}` | `authorId`, `authorName`, `authorHandle` | 主に legacyUserId。Apple後の新規投稿は uid になる | 条件付き。過去投稿は残るが、自分判定は uid だけでは一致しない | `effectiveAccountIds = [uid, legacyUserId]` で表示・自分判定 | 一括書換えは不要。ただし完全uid化するなら必要 |
| 返信 | `rooms/{roomId}/posts/{postId}` または `replies.{replyId}` | `authorId`, `replyTo`, `replyToAuthorId` | legacyUserId中心、形式混在 | 条件付き。投稿一覧には残るが、自分判定は旧ID Adapter が必要 | 同上 | 不要。ただし完全uid化するなら必要 |
| 引用投稿 | `rooms/{roomId}/posts/{postId}` | `authorId`, `quoteTo` | authorIdは currentAccountId。quoteToは postId | 条件付き | authorId 判定に旧ID Adapter | 不要 |
| いいね | 投稿: `likes.{accountId}`、返信: `replies.{replyId}.likes.{accountId}` | map key | legacyUserId中心。Apple後新規操作は uid になる | 条件付き。旧いいねは残るが uid では既存いいね済み判定にならない | map key を uid と legacyUserId の両方で見る | 不要。二重いいね防止には Adapter 必須 |
| リアクション | 投稿: `reactions.{emoji}.{accountId}`、返信: `replies.{replyId}.reactions.{emoji}.{accountId}` | map key | legacyUserId中心 | 条件付き | uid/legacyUserId 両方を見る | 不要 |
| リポスト | `reposts.{accountId}` | map key | legacyUserId中心 | 条件付き | uid/legacyUserId 両方を見る | 不要 |
| ブックマーク | `rooms/{roomId}/bookmarks/{accountId}` | doc ID, `posts.{postId}` | legacyUserId中心 | 条件付き。Apple後は `bookmarks/{uid}` を読むため旧ブックマークは見えない | 旧ID doc も読む Adapter、または移行 | Adapterなら不要 |
| フォロー | `rooms/{roomId}/follows/{accountId}` | doc ID, `targets.{targetId}` | legacyUserId中心 | 条件付き。Apple後は `follows/{uid}` を読むため旧フォローは見えない | 旧ID doc も読む Adapter、相手ID解決 | Adapterなら不要 |
| フォロワー | `rooms/{roomId}/followers/{accountId}` | doc ID, `sources.{sourceId}` | legacyUserId中心 | 条件付き。Apple後は `followers/{uid}` を読むため旧フォロワーは見えない | 旧ID doc も読む Adapter、相手ID解決 | Adapterなら不要 |
| 通知 | `rooms/{roomId}/notifications/{accountId}/items/{notificationId}` | path doc ID | legacyUserId中心 | 条件付き。Apple後は `notifications/{uid}` を読むため旧通知は見えない | 旧ID通知も読む Adapter | Adapterなら不要 |
| チャット/授業メッセージ | `rooms/{roomId}/lessonTalks/{lessonName}/messages/{messageId}` | `authorId`, `authorName` | legacyUserId中心 | 条件付き。履歴は残るが自分表示は uid だけでは一致しない | authorId 判定に旧ID Adapter | 不要 |
| DM | 未確認 | 未確認 | 未確認 | 未確認 | DM関連の実装確認が必要 | 未確認 |
| 管理者判定 | `admins/{uid}` | doc ID | Firebase uid | 可能 | 管理者は Firebase Auth uid ベースに統一済み | 不要 |
| 時間割 | `users/{accountId}/timetable/data` | path doc ID | 旧ログイン時は legacyUserId、Apple後は uid | 条件付き。旧時間割は `users/{legacyUserId}` に残るため uid では読まない | 旧ID fallback Adapter または移行 | Adapterなら不要 |
| Todo/カレンダー | `users/{accountId}/todoEvents`, `fixedSchedules`, `scheduleCategories` | path doc ID | legacyUserId または uid | 条件付き | 旧ID fallback Adapter または移行 | Adapterなら不要 |
| 混雑投票 | `globalData/congestion.{spotId}.{encodedAccountId}` | map key | legacyUserId中心 | 条件付き | uid/legacyUserId 両方の扱いを設計 | 不要 |
| 機能投票 | `globalData/featurePoll.multiVotes.{optionId}.{accountId}` | map key | legacyUserId中心 | 条件付き | uid/legacyUserId 両方を見る | 不要 |
| Wiki | `globalData/wiki/pages/{pageId}` | `creatorId`, `authorId`, `lastEditorId`, `updatedBy` | legacyUserId中心 | 条件付き | 旧ID Adapter | 不要 |

## 掲示板履歴の保持可否

判定: 条件付きで保持される。

根拠:

- 投稿は `rooms/{roomId}/posts` に保存される。
- 通常投稿作成時、`authorId: currentAccountId` が保存される。
- 旧ログイン時の `currentAccountId` は旧ユーザーID。
- Appleログイン後の `currentAccountId` は Firebase uid。
- `src/MainApp.jsx` は `rooms/{roomId}/posts` を room 単位で購読しているため、投稿ドキュメント自体は削除されない限りタイムラインに残る。

注意:

- 過去投稿の `authorId` は旧IDのままなので、Apple後の uid だけでは「自分の投稿」と判定できない。
- プロフィールタブの投稿抽出は `p.authorId === profilePostsTargetId` を使う。Apple後に `profilePostsTargetId=uid` になると、旧IDで投稿された過去投稿は自分のプロフィール一覧に出ない。
- 解決には `users/{uid}.legacyUserId` を読み、`authorId === uid || authorId === legacyUserId` とする Adapter が必要。

## 返信履歴の保持可否

判定: 条件付きで保持される。

根拠:

- 新しめの返信は `rooms/{roomId}/posts` に `replyTo` を持つ投稿ドキュメントとして作成される。
- 旧形式の返信は親投稿内 `replies.{replyId}` map として扱う処理が残っている。
- 返信の `authorId` には `currentAccountId` が入る。
- 旧返信もデータ自体は削除されない限り残る。

注意:

- 返信のいいね・リアクションは `replies.{replyId}.likes.{currentAccountId}` や `replies.{replyId}.reactions.{emoji}.{currentAccountId}` を使う。
- Apple後に uid だけで操作すると、旧IDで付けたいいね・リアクションとは別キーになる。
- 自分判定・重複操作防止には uid と legacyUserId の両方を見る必要がある。

## チャット履歴の保持可否

判定: 条件付きで保持される。

確認できたチャット/メッセージ系:

- `rooms/{roomId}/lessonTalks/{lessonName}/messages/{messageId}`

根拠:

- `src/Timetable.jsx` は `rooms/{roomId}/lessonTalks/{lessonName}/messages` を購読する。
- メッセージ送信時は `authorId: currentAccountId`, `authorName`, `authorAvatarUrl`, `authorColor`, `content`, `timestamp` を保存する。
- 旧ログインのメッセージは `authorId=legacyUserId`、Apple後の新規メッセージは `authorId=uid` になる。

注意:

- 履歴自体は room/lesson 単位で読むため残る。
- 自分のメッセージ表示やプロフィール遷移で `authorId` を uid だけで見る場合、旧メッセージと同一人物判定できない。
- DM 専用コレクションは監査範囲の検索では確認できませんでした。DM が別名で実装されている場合は未確認です。

## プロフィール情報の保持可否

判定: 旧プロフィールは残るが、Apple後の現行導線では自動的には参照されない可能性が高い。

根拠:

- 旧プロフィールは `rooms/{roomId}/users/{legacyUserId}` に保存。
- `MainApp` の現在ユーザー購読は `rooms/{currentRoomId}/users/{currentAccountId}`。
- Appleログイン完了時、`currentAccountId` に uid を設定する。
- そのため Apple後は `rooms/{roomId}/users/{uid}` を購読し、旧 `rooms/{roomId}/users/{legacyUserId}` は直接読まない。
- `switchRoom` は部屋切替時、`rooms/{room}/users/{currentAccountId}` がない場合に現在 profile をコピーして作成する。Apple後は uid doc を作る方向になる。

注意:

- 旧プロフィール doc は削除されない限り残る。
- ただし、旧プロフィールの `bio`, `avatarUrl`, `headerUrl`, `avatarColor`, `name` を Apple uid 側へ引き継ぐ処理は現行コード上確認できない。
- `linkLegacyAccount` は旧プロフィールを読んで password 照合するが、旧プロフィール内容を `users/{uid}` や `rooms/{room}/users/{uid}` へコピーしない。

## フォロー／通知等の保持可否

判定: データは残るが、Apple後の現行 `MainApp` ではそのままでは見えないものが多い。

根拠:

- フォロー: `rooms/{roomId}/follows/{currentAccountId}`。
- フォロワー: `rooms/{roomId}/followers/{currentAccountId}`。
- ブックマーク: `rooms/{roomId}/bookmarks/{currentAccountId}`。
- 通知: `rooms/{roomId}/notifications/{currentAccountId}/items`。
- Apple後の `currentAccountId` は uid になる。

必要な追加対応:

- `legacyUserId` がある場合は、`follows/{uid}` と `follows/{legacyUserId}` の両方を読むか、旧ID側を優先して読む Adapter が必要。
- `followers`, `bookmarks`, `notifications` も同様。
- 新規操作を書き込む先を uid に寄せるか、移行期間中は legacyUserId に寄せるかを決定する必要がある。

## Apple認証フローの現在の実装状況

| 項目 | 状況 | 根拠 |
| --- | --- | --- |
| Sign in with Apple開始 | 実装済み | `src/AuthScreen.jsx` が `signInWithApplePopup` を呼ぶ |
| Firebase Auth `apple.com` provider | 実装済み | `src/services/appleAuth.js` が `new OAuthProvider('apple.com')` |
| popup login | 実装済み | `signInWithPopup` |
| redirect fallback | 関数はあるが正式UIでは未使用 | `startAppleSignInRedirect` は存在 |
| Apple後 `users/{uid}` 作成 | 実装済み | `ensureAppleUserProfile` |
| 初回プロフィール設定 | 実装済み | `completeInitialAppleUserProfile` |
| handle予約 | 実装済み | `handles/{handle}` を transaction 内作成 |
| 旧アカウント連携案内 | 実装済み | `AuthScreen` の `apple_legacy_prompt` |
| 「あとで行う」 | 実装済み | `completeAppleAuth(appleProfileResult)` を呼ぶ |
| `linkLegacyAccount` 呼び出し | 実装済み | `runLegacyMigrationPromptSubmit` 経由 |
| 連携後のユーザー再読込 | 部分実装 | AuthScreen state は更新するが、`users/{uid}` を再取得して `legacyUserId` を MainApp に渡す処理は確認できない |
| 旧IDとuidのセッション併用 | 未実装/不十分 | `MainApp` は Apple後 `currentAccountId=uid` にするが `legacyUserId` を別 state として保持しない |
| サインアウト後の状態リセット | デバッグ画面では実装。正式MainAppでは未確認 | `AppleAuthDebugPage` は `signOut`。MainApp正式導線の signOut は検索範囲で明確に確認できない |
| feature flag | 実装済み | `featureFlags.appleAuthEnabled`, `legacyLinkEnabled` |
| Apple Developer設定 | 未確認 | リポジトリから実設定は確認不能 |
| Firebase Console Apple provider設定 | 未確認 | リポジトリから実設定は確認不能 |

## Apple認証導入に必要な実作業

コード上不足している実作業:

1. Appleログイン完了後に `users/{uid}.legacyUserId` を MainApp セッションへ渡す。
2. `currentAccountId` とは別に `firebaseUid` と `legacyUserId` を保持する。
3. 既存データ参照用の `effectiveLegacyUserId` または `accountIdAliases` を作る。
4. 投稿・返信・likes・reactions・reposts の自分判定を uid/legacyUserId 両対応にする。
5. ブックマーク・フォロー・フォロワー・通知・時間割/Todo の読み込み先を legacyUserId fallback 付きにする。
6. 新規 Apple ユーザーと旧連携済み Apple ユーザーで書き込み先を分ける方針を決める。
7. `rooms/{room}/users/{uid}` を作るべきか、旧 `rooms/{room}/users/{legacyUserId}` を読み続けるべきか決める。
8. `src/WikiPage.jsx` の hardcoded Firebase config を共有 Firebase client に統一する。
9. 本番 Firestore Rules と現行 Web の旧データ構造を整合させる。

外部設定で必要だが未確認のもの:

- Apple Developer Portal の Service ID / App ID / return URL / domain 設定。
- Firebase Console の Sign in with Apple provider 設定。
- 本番 Firebase Auth で Apple provider が有効か。
- 本番 Functions deploy 状況。

## Web版で必要な変更

必要な最小設計:

```js
sessionUser = {
  uid,
  legacyUserId,
  handle,
  displayName
}

accountIdAliases = legacyUserId
  ? [uid, legacyUserId]
  : [uid]
```

Web で必要な主な変更:

- `handleAppleAuthComplete` が `legacyUserId` を受け取れるようにする。
- `ensureAppleUserProfile` または連携後の profile 再読込結果から `legacyUserId` を取得する。
- `currentAccountId` に uid だけを入れて旧互換判定まで兼ねさせない。
- プロフィール表示では `rooms/{room}/users/{legacyUserId}` を優先/併用する。
- 投稿一覧の自分判定では `authorId in accountIdAliases` を使う。
- likes/reactions/reposts/poll votes では uid と legacyUserId の両方の map key を見る。
- bookmarks/follows/followers/notifications は legacyUserId doc も読む。
- 新規書き込み先を uid にするか legacyUserId にするか、機能ごとに明確にする。

## iOS版で必要な変更

iOS版では次の設計が必要:

- Firebase Auth `uid` を内部ユーザーIDの正とする。
- `users/{uid}` を必ず読む。
- `users/{uid}.legacyUserId` がある場合、旧Web互換 Adapter を有効にする。
- 旧Webの `rooms/{room}/posts` は `authorId` が legacyUserId の可能性を前提に読む。
- `legacyUserLinks/{legacyUserId}` をクライアントから直接読ませるかは Rules/API 設計後に決める。現状は Functions 管理用途で直接 read は未整備。
- iOS は旧 `password` を直接読まない。
- 旧アカウント連携は `linkLegacyAccount` Callable だけを使う。
- 過去データの表示には `uid` と `legacyUserId` の alias 判定を使う。

## バックエンドで必要な変更

必要:

- 本番 Firestore Rules に旧Web互換パスと新 `users/{uid}` パスの両方を安全に反映する。
- `legacyUserLinks` のクライアント read を許可するか、Callable 経由だけにするか決定する。
- `users/{uid}.legacyUserId` を Functions 以外から更新できない制約を維持する。
- 旧 password 照合 Functions に App Check とレート制限を追加する。
- 本番 deploy 前に staging Firebase で E2E。

不要または慎重に扱うべき:

- 既存投稿・返信・likes 等の一括書き換えは、初期段階では不要。Adapter で吸収できる。
- 旧ユーザードキュメント削除は、旧ログイン停止前に行ってはいけない。
- 旧 password 削除は、連携完了率と rollback 方針が決まるまで行ってはいけない。

## 一括データ移行が必要か

最終判定: 初期 Apple 認証導入では、一括データ移行は必須ではありません。ただし、Adapter 実装は必須です。

理由:

- 投稿、返信、チャット、フォロー、通知などは旧IDをキーにして残っている。
- `users/{uid}.legacyUserId` で旧IDを解決できれば、旧データを読み続けられる。
- 既存データを書き換えない方が rollback しやすい。

一括移行が必要になる条件:

- すべての自分判定を Firebase uid のみに統一したい場合。
- Firestore Rules を uid ベースだけで厳格化したい場合。
- 旧ログインと旧IDキーの完全廃止を行う場合。
- 検索・集計・通知配信などの backend 処理を uid 前提に統一する場合。

## Adapter／Mapperで吸収できる範囲

Adapter で吸収できるもの:

- 過去投稿の表示。
- 過去返信の表示。
- 過去授業チャットの表示。
- 自分の過去投稿判定。
- 自分の過去いいね・リアクション・リポスト判定。
- 旧ブックマーク doc の読み取り。
- 旧フォロー/フォロワー doc の読み取り。
- 旧通知 doc の読み取り。
- 旧時間割/Todo の読み取り。
- 旧プロフィール表示。

Adapter だけでは慎重な設計が必要なもの:

- 新規いいねを uid で書くか legacyUserId で書くか。
- 新規フォローを uid で書くか legacyUserId で書くか。
- uid と legacyUserId の両方が map key に存在した場合の重複表示。
- 旧ID変更機能との衝突。
- `rooms/{room}/users/{uid}` と `rooms/{room}/users/{legacyUserId}` の二重プロフィール。

## データ消失・二重アカウント化のリスク

### データ消失リスク

存在する処理:

- `handleDeleteAccount` は `rooms/{room}/users/{currentAccountId}`、`users/{currentAccountId}/timetable/data`、`users/{currentAccountId}/scheduleCategories`、`fixedSchedules`、`todoEvents` を物理削除する。
- ユーザーID変更処理は旧ID doc を新ID doc へコピーし、旧 doc を `deleteDoc` する。
- ユーザーID変更処理は bookmarks/follows/followers/timetable/todo/posts のキー置換と旧 doc 削除を行う。
- 投稿削除、返信削除、Wiki削除、Todo削除などの個別削除処理が存在する。

Apple移行での注意:

- Apple後 `currentAccountId=uid` の状態で削除操作を実行すると、uid 側のデータを削除対象にする。旧ID側のデータは残る可能性があるが、Adapter がなければ表示不能になる。
- 旧ID変更機能を Apple uid 状態で使うと、uid を旧Web ID変更ロジックに入れてしまう可能性がある。

### 二重アカウント化リスク

発生経路:

- Appleログイン時に新規 `users/{uid}` が作成される。
- 旧アカウント連携を「あとで行う」と、`legacyUserId` は未設定のまま MainApp に進める。
- この状態で投稿すると `authorId=uid` の新規投稿が作成される。
- 後で旧ID連携すると、過去の旧ID投稿と uid 投稿が同一人物の別IDとして混在する。

対策:

- 未連携でも利用可能にする方針は維持しつつ、連携後は `accountIdAliases=[uid, legacyUserId]` を使う。
- UIで「旧アカウント連携前に投稿すると新しいIDの投稿として保存される」ことを説明するか、連携案内を強める。
- 新規投稿の `authorId` を uid にする方針なら、表示 Adapter は必須。

## 重要判定

| 質問 | 判定 | 根拠/条件 |
| --- | --- | --- |
| Apple認証後も過去の掲示板投稿は残るか | Yes | `rooms/{roomId}/posts` は削除されない。ただし自分判定は Adapter 必須 |
| Apple認証後も過去の返信は残るか | Yes | replyTo投稿/legacy replies map は残る。ただし uid だけでは同一人物判定不可 |
| Apple認証後も過去のチャット履歴は残るか | 条件付き | `lessonTalks` は残る。DMは未確認 |
| Apple認証後も旧プロフィールは表示できるか | 条件付き | 旧IDで読めば可能。現行 Apple後 MainApp は uid doc を読む |
| Apple認証後もフォロー関係は残るか | Yes | `follows/{legacyUserId}` と `followers/{legacyUserId}` は残る。ただし uid では読まない |
| Apple認証後も通知履歴は残るか | Yes | `notifications/{legacyUserId}` は残る。ただし uid では読まない |
| 旧IDと新uidを紐付けるだけで十分か | No | 紐付けに加えて各機能の Adapter が必要 |
| 既存データの一括移行が必要か | 条件付き | 初期導入では不要。完全uid化には必要 |
| 既存データを変更せずAdapterで吸収できるか | Yes | 表示・参照は多くが吸収可能。ただし新規書き込み方針が必要 |
| データ消失につながる処理が現在存在するか | Yes | アカウント削除、ID変更、投稿/返信/Wiki/Todo削除処理が存在 |

## 安全な移行手順案

1. 現在の本番 Firestore と Auth のバックアップを取る。
2. 本番相当の複製 Firebase project を作る。
3. 旧データを複製環境へ import する。
4. Apple認証、`users/{uid}`、`handles/{handle}`、`legacyUserLinks/{legacyUserId}` を複製環境で検証する。
5. `linkLegacyAccount` で旧IDと uid を連携する。
6. Web側に `uid`, `legacyUserId`, `handle` を分けた session model を入れる。
7. 投稿・返信・チャット・プロフィール・フォロー・通知・ブックマークに Adapter を入れる。
8. 過去データを一切書き換えずに表示確認する。
9. Web版と iOS版で同じ uid/legacyUserId のユーザーを同一人物として表示できるか確認する。
10. 旧ログインと Appleログインを並行運用する。
11. 連携済みユーザー、新規Appleユーザー、未連携旧ユーザーの3パターンをE2E確認する。
12. rollback条件を決める。
13. 本番移行条件を満たすまで旧 password 削除、旧ID一括移行、旧ログイン停止は行わない。

rollback条件:

- Appleログイン済みユーザーが旧投稿を見られない。
- 旧フォロー/通知/ブックマークが表示できない。
- `legacyUserLinks` と `users/{uid}.legacyUserId` に不整合が出る。
- 既存旧ログインユーザーがログイン不能になる。
- Firestore Rules で既存Web機能が拒否される。

本番移行条件:

- 複製環境で旧データ表示が成功。
- Adapter付きWebで過去投稿/返信/チャット/プロフィール/フォロー/通知の確認が完了。
- iOSで同じ uid/legacyUserId 対応を確認。
- 旧ログイン rollback 手順が残っている。
- App Check、レート制限、Rules の本番設計が承認済み。

## テストすべきシナリオ

- 旧IDのみユーザーで旧投稿・返信・チャット・フォロー・通知が見える。
- Apple新規ユーザーで `users/{uid}` と `handles/{handle}` が作成される。
- Appleユーザーが旧ID連携後、旧投稿が自分の投稿として表示される。
- Appleユーザーが旧ID連携後、旧返信が自分の返信として表示される。
- Appleユーザーが旧ID連携後、旧 lessonTalks メッセージが自分の発言として表示される。
- Appleユーザーが旧ID連携後、旧フォロー/フォロワーが表示される。
- Appleユーザーが旧ID連携後、旧ブックマークが表示される。
- Appleユーザーが旧ID連携後、旧通知が表示される。
- 旧いいね・旧リアクション・旧リポストが二重表示されない。
- uidで新規投稿した後に旧ID連携しても、uid投稿と旧ID投稿を同一人物として扱える。
- 旧ID連携を「あとで行う」場合に、どのデータが新規 uid 側に作られるか確認する。
- 旧ログインユーザーの既存動作が壊れない。
- アカウント削除が uid/legacyUserId 混在時に誤削除しない。
- ユーザーID変更機能を Apple uid 状態でどう扱うか確認する。

## 未確認事項

- 本番 Firestore の実データ。
- 本番 Rules。
- 本番 Functions deploy 状況。
- Apple Developer Portal 設定。
- Firebase Console の Apple provider 設定。
- DM 専用コレクションの有無。
- Storage に保存された画像の有無。
- 旧ユーザーID変更機能を Appleログイン後に許可するか。
- `rooms/{room}/users/{uid}` と `rooms/{room}/users/{legacyUserId}` の運用方針。
- iOS初期版で新規書き込み先を uid に統一するか、旧Web互換パスに合わせるか。

## 人間による決定が必要な事項

- Apple連携済みユーザーの新規投稿 `authorId` を uid にするか legacyUserId にするか。
- 旧データ Adapter を Web/iOS 両方に入れる範囲。
- 旧ログインをいつまで残すか。
- 旧 password をいつ削除/無効化するか。
- 旧ID変更機能を Apple認証後も残すか。
- `legacyUserLinks` をクライアントから read 可能にするか。
- 一括移行を将来的に行うか、永続 Adapter 方針にするか。
- 本番 deploy の承認タイミング。

## 最終判定

Apple認証導入後も、既存の掲示板投稿、返信、授業チャット、旧プロフィール、フォロー、通知、ブックマークなどのデータ自体は、現在のコードが明示的に移行時削除しない限り残ります。

ただし、現行 Web の Apple完了処理は `currentAccountId` に Firebase Auth `uid` を入れて MainApp に進むため、旧IDで保存された過去データを同一人物として参照するには不十分です。

`legacyUserLinks/{legacyUserId}` と `users/{uid}.legacyUserId` の作成は実装済みですが、それを掲示板・返信・チャット・フォロー・通知・ブックマーク・時間割/Todo の各機能で参照する Adapter はまだ実装されていません。

初期導入では既存データの一括書き換えは避け、`uid` と `legacyUserId` を併用する Adapter/Mapper で吸収する方針が安全です。一括移行は、旧ログイン停止、Rules整理、iOS同期、rollback条件が整ってから検討すべきです。

## 実装メモ: 最小セッション/Adapter基盤

今回、Apple認証後も旧Web版の一部データを参照できるようにする最小基盤として、`src/services/accountIdentityAdapter.js` を追加した。

責務:

- `firebaseUid`, `legacyUserId`, `primaryAccountId` を分離する。
- `accountIdAliases` を生成する。
- `authorId` が現在ユーザー本人かを `uid` と `legacyUserId` の両方で判定する。
- 現在ユーザーのプロフィール投稿一覧に、uid投稿と旧ID投稿を重複なく含める。
- Appleプロフィールに旧プロフィールの互換fieldを補完する。ただし `password` / `saved_password` は取り込まない。

今回対応した機能:

1. 現在ユーザーのプロフィール表示。
2. 投稿に対する「自分の投稿」判定。
3. 現在ユーザーの投稿一覧取得。

まだ未対応の機能:

- フォロー。
- 通知。
- ブックマーク。
- チャット/授業メッセージの自分判定。
- いいね。
- リアクション。
- リポスト。
- 時間割。
- Todo/カレンダー。

今回、一括データ移行は行っていない。Firestore上の旧データ削除・書き換えも行っていない。
## 2026-08-02 Follow Compatibility Implementation Note

監査後の実装で、フォロー機能だけ `accountIdAliases` 対応を追加した。

- 現在ユーザーのフォロー保存場所: `rooms/{roomId}/follows/{accountId}` の `targets` map。
- 現在ユーザーのフォロワー保存場所: `rooms/{roomId}/followers/{accountId}` の `sources` map。
- Apple連携済みユーザーでは、`accountIdAliases = [uid, legacyUserId]` を使って uid側docとlegacy側docを購読し、クライアントで統合する。
- 旧ログインでは `accountIdAliases = [legacyUserId]` のため既存動作を維持する。
- 新規フォローの書き込みは `primaryAccountId` を使用する。
- 既存データの一括移行、削除、Firestore Rules変更、Cloud Functions変更は行っていない。
- 今回も未対応のまま: 通知、チャット、ブックマーク、いいね、リアクション、リポスト、時間割、Todo。
