# AI Context

作成日: 2026-08-02

## 現在の重要コンテキスト

MeLink Web版は旧Web IDとFirebase Auth uidが混在している。

- 旧ログイン: `currentAccountId` は旧ID。
- Appleログイン: `currentAccountId` はFirebase uid。
- 旧データ: 投稿、返信、フォロー、通知、ブックマーク等の多くは旧IDをfieldまたはmap keyに使う。
- 新プロフィール: `users/{uid}`。
- 旧ID対応: `users/{uid}.legacyUserId` と `legacyUserLinks/{legacyUserId}`。

## 今回追加したAdapter

`src/services/accountIdentityAdapter.js`

主なAPI:

- `normalizeAccountId(value)`
- `createAccountIdAliases(...ids)`
- `buildAccountSession({ firebaseUid, legacyUserId, primaryAccountId, legacyLoginId })`
- `isCurrentAccountId(candidateId, accountIdAliases)`
- `isCurrentUserPost(post, accountIdAliases)`
- `mergeCurrentProfileWithLegacyProfile({ currentProfile, legacyProfile, legacyUserId })`
- `collectProfilePostsForAliases(allRoomPosts, accountIdAliases)`

## 今回対応済み

- 現在ユーザーのプロフィール表示で旧プロフィール互換fieldを補完。
- 投稿の自分判定をuid/legacyUserId alias対応。
- 現在ユーザーの投稿一覧にuid投稿とlegacyUserId投稿を含める。

## まだ触ってはいけない範囲

今回の基盤は、フォロー、通知、ブックマーク、チャット、いいね、リアクション、リポスト、時間割、Todoには広げていない。

Firestore Rules、Cloud Functions、Firebase設定、本番データ、Emulatorデータは変更していない。
## 2026-08-02 Follow Compatibility Update

フォロー機能のみ、`accountIdAliases` ベースの互換処理を追加済み。

- 追加API: `mergeAccountIdMaps(...maps)` と `countAccountIdMap(map)`。
- 現在ユーザーの `following` / `followers` は、uid docとlegacyUserId docを購読して統合する。
- フォロー数とフォロワー数は統合後Mapの正規化済みキー数で数える。
- 新規フォローは `primaryAccountId` で書き込む。
- unfollow時は、uid/legacyUserIdのどちらで作られた既存フォローでも解除できるよう、現在ユーザーalias側のfollow/follower参照を削除する。
- 未対応: notifications, chat, bookmarks, likes, reactions, reposts, timetable, Todo。
- Firestore Rules、Cloud Functions、Firebase config、既存データは変更していない。
