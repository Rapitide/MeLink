## 実装優先度

本書は最終的な推奨データモデルを示す。

ただし、初期実装では既存Web版との互換性を優先し、
すべてのコレクションを一度に移行しない。

### Phase 1

- Firebase Authenticationへの移行
- users/{uid} の作成
- 既存投稿の読み取り互換
- SwiftUI投稿一覧

### Phase 2

- 投稿作成
- 返信
- いいね
- ブックマーク

### Phase 3

- likes/reactions/repostsのサブコレクション化
- Replyのサブコレクション化
- Timestamp統一
- Firebase Storage移行
- Cloud Functionsによる通知・集計

既存データの破壊的変更は禁止する。
移行期間中は旧形式と新形式の両方を読み取れるようにする。


# Firestore共有データモデル設計

目的: 既存Web版と将来のSwiftUI版で共有する掲示板データモデルを定義する。

前提:

- 内部ユーザーIDは Firebase Authentication の `uid` を使う。
- 変更可能なユーザーIDは `handle` として分離する。
- 時刻は Firestore `Timestamp` に統一する。
- 既存Web版の `Date.now()` ミリ秒数値、`authorId`、`replyTo`、投稿内 `likes/reactions/reposts` Map、旧 `replies` Map は移行・互換対象とする。
- `roomId` はWeb版の `sanitizeRoomId` 相当で Firestore パスに使える文字列に正規化する。

## 共通方針

### 推奨コレクション構造

```text
users/{uid}
handles/{handle}
rooms/{roomId}
rooms/{roomId}/members/{uid}
rooms/{roomId}/posts/{postId}
rooms/{roomId}/posts/{postId}/replies/{replyId}
rooms/{roomId}/posts/{postId}/likes/{uid}
rooms/{roomId}/posts/{postId}/reactions/{reactionId}
rooms/{roomId}/posts/{postId}/reposts/{uid}
rooms/{roomId}/users/{uid}/bookmarks/{postId}
rooms/{roomId}/users/{uid}/following/{targetUid}
rooms/{roomId}/users/{uid}/followers/{sourceUid}
rooms/{roomId}/users/{uid}/notifications/{notificationId}
rooms/{roomId}/congestionReports/{reportId}
```

### Swift共通型

```swift
typealias UserID = String
typealias RoomID = String
typealias PostID = String
typealias ReplyID = String
```

Firestore `Timestamp` は Swift では `FirebaseFirestore.Timestamp`、アプリ内部では必要に応じて `Date` へ変換する。

## User

### 1. Firestoreパス

- 推奨: `users/{uid}`
- 互換: `rooms/{roomId}/users/{legacyUserId}`
- handle一意性予約: `handles/{handle}`

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | Firebase Auth uid。ドキュメントIDと一致。 |
| `handle` | string | 必須 | 変更可能な表示ID。先頭`@`なしで保存。 |
| `displayName` | string | 必須 | 表示名。 |
| `bio` | string | 任意 | プロフィール文。 |
| `avatarUrl` | string | 任意 | Firebase Storage等の公開/署名URL。 |
| `avatarStoragePath` | string | 任意 | Storage内パス。 |
| `headerUrl` | string | 任意 | ヘッダー画像URL。 |
| `headerStoragePath` | string | 任意 | Storage内パス。 |
| `avatarColor` | string | 任意 | 画像なし時の色。Web互換。 |
| `createdAt` | Timestamp | 必須 | 作成時刻。 |
| `updatedAt` | Timestamp | 必須 | 更新時刻。 |
| `disabledAt` | Timestamp | 任意 | 退会/停止時刻。 |

`handles/{handle}`:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | 所有者uid。 |
| `createdAt` | Timestamp | 必須 | 予約作成時刻。 |

### 5. Web版の現在のフィールドとの対応

- `id` / ドキュメントID / `authorId` -> `uid` へ移行。既存値は `legacyUserId` として一時保持可。
- `handle` は現行 `@${userId}` 形式。新形式では `@` を除いた文字列を保存し、表示時に付与する。
- `name` -> `displayName`
- `avatarUrl`, `headerUrl`, `avatarColor`, `bio` は継続。
- `password` は廃止。

### 6. iOS版Swiftモデルとの対応

```swift
struct AppUser: Identifiable, Codable {
    @DocumentID var id: String?
    var uid: String
    var handle: String
    var displayName: String
    var bio: String?
    var avatarUrl: String?
    var avatarStoragePath: String?
    var headerUrl: String?
    var headerStoragePath: String?
    var avatarColor: String?
    var createdAt: Timestamp
    var updatedAt: Timestamp
}
```

### 7. 移行が必要な項目

- Firestore平文 `password` を削除し、Firebase Authへ移行。
- `rooms/{roomId}/users/{legacyUserId}` から `users/{uid}` と `rooms/{roomId}/members/{uid}` へ移行。
- Data URL画像を Firebase Storage へ移し、URL/Storage pathに置換。
- 投稿内の `authorId` を `uid` へ変換し、旧IDは必要なら `legacyAuthorId` に残す。

### 8. Security Rulesで必要な制約

- `users/{uid}` の作成・更新は `request.auth.uid == uid`。
- `handle` 変更時は `handles/{handle}` の一意性を保証。
- `password` フィールドの作成・更新は禁止。
- `avatarStoragePath` / `headerStoragePath` は `users/{uid}/...` 配下など本人領域に限定。

## Room

### 1. Firestoreパス

- 推奨: `rooms/{roomId}`
- 互換: `globalData/boardRooms` の `rooms` Map

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `roomId` | string | 必須 | ドキュメントIDと一致。 |
| `name` | string | 必須 | 表示名。 |
| `createdByUid` | string | 必須 | 作成者uid。 |
| `createdAt` | Timestamp | 必須 | 作成時刻。 |
| `updatedAt` | Timestamp | 必須 | 更新時刻。 |
| `isDefault` | bool | 任意 | デフォルト掲示板か。 |
| `isArchived` | bool | 任意 | 非表示/終了フラグ。 |
| `postCount` | number | 任意 | 集計値。Cloud Functions等で更新推奨。 |

### 5. Web版の現在のフィールドとの対応

- `globalData/boardRooms.rooms.{roomSafe}.createdAt` -> `createdAt`
- `globalData/boardRooms.rooms.{roomSafe}.createdBy` -> `createdByUid` または `legacyCreatedBy`
- `currentRoomId` / `twitter_clone_room_id` -> `roomId`

### 6. iOS版Swiftモデルとの対応

```swift
struct Room: Identifiable, Codable {
    @DocumentID var id: String?
    var roomId: String
    var name: String
    var createdByUid: String
    var createdAt: Timestamp
    var updatedAt: Timestamp
    var isDefault: Bool?
    var isArchived: Bool?
    var postCount: Int?
}
```

### 7. 移行が必要な項目

- `globalData/boardRooms` のMapを `rooms/{roomId}` ドキュメントへ展開。
- 既存 `createdAt` 数値を Timestamp へ変換。
- `createdBy` が旧ユーザーIDの場合は uid に解決。

### 8. Security Rulesで必要な制約

- 読み取りは公開または認証済みに限定。
- 作成は認証済みユーザーのみ。
- `roomId` は正規化済みで、禁止文字を含まないこと。
- 削除/アーカイブ/デフォルト変更は管理者のみ。

## Post

### 1. Firestoreパス

- 推奨: `rooms/{roomId}/posts/{postId}`
- 互換: 同パス。ただし現行は投稿・返信が同一コレクション内に混在。

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `postId` | string | 必須 | ドキュメントIDと一致。 |
| `roomId` | string | 必須 | 親ルームID。 |
| `authorUid` | string | 必須 | 投稿者uid。 |
| `authorSnapshot` | map | 必須 | 表示用スナップショット。 |
| `content` | string | 必須 | 本文。 |
| `createdAt` | Timestamp | 必須 | 作成時刻。 |
| `updatedAt` | Timestamp | 任意 | 編集時刻。 |
| `deletedAt` | Timestamp | 任意 | 論理削除時刻。 |
| `quotePostId` | string | 任意 | 引用元postId。 |
| `poll` | map | 任意 | Pollモデル。 |
| `likeCount` | number | 必須 | いいね数。 |
| `replyCount` | number | 必須 | 返信数。 |
| `reactionCount` | number | 必須 | リアクション総数。 |
| `repostCount` | number | 必須 | リポスト数。 |
| `isGlobalPinned` | bool | 任意 | 全体固定。 |
| `schemaVersion` | number | 必須 | 例: `2`。 |
| `legacyAuthorId` | string | 任意 | 旧WebユーザーID。移行期間のみ。 |
| `legacyTimestampMs` | number | 任意 | 旧 `Date.now()` 値。移行期間のみ。 |

`authorSnapshot`:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `handle` | string | 必須 | 投稿時点のhandle。 |
| `displayName` | string | 必須 | 投稿時点の表示名。 |
| `avatarUrl` | string | 任意 | 投稿時点の画像URL。 |
| `avatarColor` | string | 任意 | Web互換色。 |

### 5. Web版の現在のフィールドとの対応

- `authorId` -> `authorUid`、移行中は `legacyAuthorId` に保存。
- `authorName` -> `authorSnapshot.displayName`
- `authorHandle` -> `authorSnapshot.handle`
- `authorAvatarUrl` -> `authorSnapshot.avatarUrl`
- `authorColor` -> `authorSnapshot.avatarColor`
- `timestamp` number -> `createdAt` Timestamp、移行中は `legacyTimestampMs`
- `quoteTo` -> `quotePostId`
- `likes`, `reactions`, `reposts` Map -> 各サブコレクション + 集計カウントへ移行。
- `replyTo` がある現行ドキュメントは Reply へ移行。

### 6. iOS版Swiftモデルとの対応

```swift
struct Post: Identifiable, Codable {
    @DocumentID var id: String?
    var postId: String
    var roomId: String
    var authorUid: String
    var authorSnapshot: AuthorSnapshot
    var content: String
    var createdAt: Timestamp
    var updatedAt: Timestamp?
    var deletedAt: Timestamp?
    var quotePostId: String?
    var poll: Poll?
    var likeCount: Int
    var replyCount: Int
    var reactionCount: Int
    var repostCount: Int
    var isGlobalPinned: Bool?
    var schemaVersion: Int
}
```

### 7. 移行が必要な項目

- `timestamp` を Timestamp 化。
- `authorId` を uid 化。
- 返信ドキュメントを `posts/{postId}/replies/{replyId}` に移動、または互換読み取り期間を設ける。
- 投稿内Mapの `likes/reactions/reposts` をサブコレクションへ展開。
- 既存 `poll.expiresAt` と `poll.votedUsers` を Poll新形式へ移行。

### 8. Security Rulesで必要な制約

- 作成時 `authorUid == request.auth.uid`。
- `createdAt` は `request.time` 近傍、または `serverTimestamp()` 前提。
- 本文は空不可、最大文字数を設定。
- 更新/削除は投稿者または管理者のみ。
- `likeCount` 等の集計値はクライアント直接更新を禁止し、Cloud Functionsまたは検証可能な差分に限定。
- `isGlobalPinned` は管理者のみ。

## Reply

### 1. Firestoreパス

- 推奨: `rooms/{roomId}/posts/{postId}/replies/{replyId}`
- 互換1: `rooms/{roomId}/posts/{replyDocId}` に `replyTo` フィールド。
- 互換2: `rooms/{roomId}/posts/{postId}.replies.{replyId}` Map。

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `replyId` | string | 必須 | ドキュメントIDと一致。 |
| `postId` | string | 必須 | 親投稿ID。 |
| `roomId` | string | 必須 | ルームID。 |
| `authorUid` | string | 必須 | 返信者uid。 |
| `authorSnapshot` | map | 必須 | 表示用スナップショット。 |
| `content` | string | 必須 | 本文。 |
| `createdAt` | Timestamp | 必須 | 作成時刻。 |
| `updatedAt` | Timestamp | 任意 | 編集時刻。 |
| `deletedAt` | Timestamp | 任意 | 論理削除時刻。 |
| `likeCount` | number | 必須 | いいね数。 |
| `reactionCount` | number | 必須 | リアクション総数。 |
| `schemaVersion` | number | 必須 | 例: `2`。 |
| `legacyReplyDocId` | string | 任意 | 旧同一コレクション返信ID。 |
| `legacyReplyKey` | string | 任意 | 旧 `replies` Mapキー。 |

### 5. Web版の現在のフィールドとの対応

- 現行新形式: `replyTo` -> `postId`
- `replyToAuthor`, `replyToAuthorId` は表示補助なので基本廃止。必要なら親投稿から取得。
- 旧Map形式の `replies.{replyId}.authorId` -> `authorUid` / `legacyAuthorId`
- 旧Map形式の `replies.{replyId}.timestamp` -> `createdAt`

### 6. iOS版Swiftモデルとの対応

```swift
struct Reply: Identifiable, Codable {
    @DocumentID var id: String?
    var replyId: String
    var postId: String
    var roomId: String
    var authorUid: String
    var authorSnapshot: AuthorSnapshot
    var content: String
    var createdAt: Timestamp
    var updatedAt: Timestamp?
    var deletedAt: Timestamp?
    var likeCount: Int
    var reactionCount: Int
    var schemaVersion: Int
}
```

### 7. 移行が必要な項目

- `replyTo` 付き投稿を Reply サブコレクションへ移行。
- 親投稿内 `replies` Mapを Reply ドキュメントへ展開。
- 旧返信内 `likes/reactions` も Reply配下のサブコレクションへ展開する。

### 8. Security Rulesで必要な制約

- 作成時 `authorUid == request.auth.uid`。
- 親 `rooms/{roomId}/posts/{postId}` が存在すること。
- 本文は空不可、最大文字数を設定。
- 更新/削除は返信者または管理者のみ。

## Like

### 1. Firestoreパス

- 投稿: `rooms/{roomId}/posts/{postId}/likes/{uid}`
- 返信: `rooms/{roomId}/posts/{postId}/replies/{replyId}/likes/{uid}`

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | ドキュメントIDと一致。 |
| `createdAt` | Timestamp | 必須 | いいね時刻。 |
| `userSnapshot` | map | 任意 | 表示最適化用。 |

### 5. Web版の現在のフィールドとの対応

- 投稿 `likes.{accountId} = userName` -> `likes/{uid}`。
- 旧返信 `replies.{replyId}.likes.{accountId}` -> `replies/{replyId}/likes/{uid}`。

### 6. iOS版Swiftモデルとの対応

```swift
struct Like: Identifiable, Codable {
    @DocumentID var id: String?
    var uid: String
    var createdAt: Timestamp
    var userSnapshot: UserSnapshot?
}
```

### 7. 移行が必要な項目

- Mapキーの旧IDを uid に解決。
- Map値のユーザー名は `userSnapshot.displayName` へ移すか破棄。
- 投稿/返信の `likeCount` を再集計。

### 8. Security Rulesで必要な制約

- `likes/{uid}` の作成/削除は `request.auth.uid == uid`。
- `uid` フィールドはドキュメントIDと一致。
- 他人のLike作成は禁止。

## Reaction

### 1. Firestoreパス

- 投稿: `rooms/{roomId}/posts/{postId}/reactions/{reactionId}`
- 返信: `rooms/{roomId}/posts/{postId}/replies/{replyId}/reactions/{reactionId}`

`reactionId` は `uid_emojiKey` など、1ユーザーが同じ絵文字を二重登録しない形式。

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `reactionId` | string | 必須 | ドキュメントIDと一致。 |
| `uid` | string | 必須 | リアクションしたユーザー。 |
| `emoji` | string | 必須 | 表示する絵文字。 |
| `emojiKey` | string | 必須 | Firestore安全なキー。 |
| `createdAt` | Timestamp | 必須 | 作成時刻。 |
| `userSnapshot` | map | 任意 | 表示最適化用。 |

### 5. Web版の現在のフィールドとの対応

- 投稿 `reactions.{emoji}.{accountId} = userName` -> `reactions/{uid_emojiKey}`。
- 旧返信 `replies.{replyId}.reactions.{emoji}.{accountId}` -> 返信配下 reactions。

### 6. iOS版Swiftモデルとの対応

```swift
struct Reaction: Identifiable, Codable {
    @DocumentID var id: String?
    var reactionId: String
    var uid: String
    var emoji: String
    var emojiKey: String
    var createdAt: Timestamp
    var userSnapshot: UserSnapshot?
}
```

### 7. 移行が必要な項目

- 絵文字を `emojiKey` にエンコードする共通関数をWeb/Swiftで統一。
- 旧Mapをサブコレクションへ展開。
- 投稿/返信の `reactionCount` と絵文字別集計が必要なら別途 `reactionSummary` Map を生成。

### 8. Security Rulesで必要な制約

- 作成/削除は `request.auth.uid == uid`。
- `emoji` は許可リスト、または最大長を制限。
- 同一 `uid + emojiKey` の重複をドキュメントIDで防ぐ。

## Repost

### 1. Firestoreパス

- 推奨: `rooms/{roomId}/posts/{postId}/reposts/{uid}`
- 引用投稿は Post の `quotePostId` で表す。

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | リポストしたユーザー。ドキュメントIDと一致。 |
| `createdAt` | Timestamp | 必須 | リポスト時刻。 |
| `userSnapshot` | map | 任意 | 表示最適化用。 |

### 5. Web版の現在のフィールドとの対応

- `reposts.{accountId} = { name, timestamp }` -> `reposts/{uid}`。
- タイムライン展開用の `_isRepostEntry`, `_repostedBy` 等は保存せず、クライアント表示用の派生値として扱う。
- 引用リポスト `quoteTo` -> Post の `quotePostId`。

### 6. iOS版Swiftモデルとの対応

```swift
struct Repost: Identifiable, Codable {
    @DocumentID var id: String?
    var uid: String
    var createdAt: Timestamp
    var userSnapshot: UserSnapshot?
}
```

### 7. 移行が必要な項目

- 投稿内 `reposts` Mapをサブコレクションへ展開。
- `timestamp` number を Timestamp へ変換。
- Mapキーの旧IDを uid に解決。

### 8. Security Rulesで必要な制約

- `reposts/{uid}` の作成/削除は `request.auth.uid == uid`。
- 自分の投稿のリポストを許可するか禁止するかを仕様で固定。
- `repostCount` は直接更新禁止または厳格検証。

## Bookmark

### 1. Firestoreパス

- 推奨: `rooms/{roomId}/users/{uid}/bookmarks/{postId}`
- 互換: `rooms/{roomId}/bookmarks/{legacyUserId}` の `posts` Map

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `postId` | string | 必須 | ドキュメントIDと一致。 |
| `roomId` | string | 必須 | ルームID。 |
| `createdAt` | Timestamp | 必須 | 保存時刻。 |

### 5. Web版の現在のフィールドとの対応

- `rooms/{room}/bookmarks/{accountId}.posts.{postId} = true` -> `rooms/{room}/users/{uid}/bookmarks/{postId}`。

### 6. iOS版Swiftモデルとの対応

```swift
struct Bookmark: Identifiable, Codable {
    @DocumentID var id: String?
    var postId: String
    var roomId: String
    var createdAt: Timestamp
}
```

### 7. 移行が必要な項目

- 旧 `bookmarks/{legacyUserId}` を uid配下へ移す。
- `createdAt` がない既存Bookmarkには移行時刻または投稿時刻を補完。

### 8. Security Rulesで必要な制約

- 読み書きは `request.auth.uid == uid` のみ。
- `postId` は存在する投稿に限定するのが望ましい。

## Follow

### 1. Firestoreパス

- フォロー中: `rooms/{roomId}/users/{uid}/following/{targetUid}`
- フォロワー: `rooms/{roomId}/users/{uid}/followers/{sourceUid}`
- 互換: `rooms/{roomId}/follows/{legacyUserId}` と `rooms/{roomId}/followers/{legacyUserId}`

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | 主体ユーザー。 |
| `targetUid` | string | 条件付き | following側で必須。 |
| `sourceUid` | string | 条件付き | followers側で必須。 |
| `createdAt` | Timestamp | 必須 | フォロー時刻。 |
| `userSnapshot` | map | 任意 | 一覧表示最適化用。 |

### 5. Web版の現在のフィールドとの対応

- `rooms/{room}/follows/{accountId}.targets.{targetId} = true` -> `users/{uid}/following/{targetUid}`。
- `rooms/{room}/followers/{targetId}.sources.{accountId} = true` -> `users/{targetUid}/followers/{uid}`。

### 6. iOS版Swiftモデルとの対応

```swift
struct Follow: Identifiable, Codable {
    @DocumentID var id: String?
    var uid: String
    var targetUid: String?
    var sourceUid: String?
    var createdAt: Timestamp
    var userSnapshot: UserSnapshot?
}
```

### 7. 移行が必要な項目

- 旧ID Mapキーを uid に解決。
- `following` と `followers` の両方向ドキュメントを整合させる。
- `createdAt` 欠損を補完。

### 8. Security Rulesで必要な制約

- フォロー作成/削除は `request.auth.uid == uid`。
- 自分自身へのフォローを禁止するか仕様化。
- followers側はクライアント直接書き込み禁止にして Cloud Functions で同期するのが安全。

## Notification

### 1. Firestoreパス

- 推奨: `rooms/{roomId}/users/{uid}/notifications/{notificationId}`
- 互換: `rooms/{roomId}/notifications/{legacyUserId}/items/{notificationId}`

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `notificationId` | string | 必須 | ドキュメントIDと一致。 |
| `recipientUid` | string | 必須 | 通知先uid。 |
| `actorUid` | string | 任意 | 操作者uid。 |
| `type` | string | 必須 | `like`, `reply`, `reaction`, `repost`, `follow`, `mention`, `system` 等。 |
| `roomId` | string | 必須 | ルームID。 |
| `postId` | string | 任意 | 関連投稿。 |
| `replyId` | string | 任意 | 関連返信。 |
| `message` | string | 任意 | システム通知などの本文。 |
| `createdAt` | Timestamp | 必須 | 通知作成時刻。 |
| `readAt` | Timestamp | 任意 | 既読時刻。 |
| `actorSnapshot` | map | 任意 | 表示最適化用。 |

### 5. Web版の現在のフィールドとの対応

- 現行購読先 `rooms/{room}/notifications/{accountId}/items` -> `rooms/{room}/users/{uid}/notifications`。
- `timestamp` number -> `createdAt` Timestamp。
- `last_seen_notif_time` localStorage -> 各通知の `readAt`、またはユーザー設定 `lastReadNotificationAt` へ移行。

### 6. iOS版Swiftモデルとの対応

```swift
enum NotificationType: String, Codable {
    case like, reply, reaction, repost, follow, mention, system
}

struct AppNotification: Identifiable, Codable {
    @DocumentID var id: String?
    var notificationId: String
    var recipientUid: String
    var actorUid: String?
    var type: NotificationType
    var roomId: String
    var postId: String?
    var replyId: String?
    var message: String?
    var createdAt: Timestamp
    var readAt: Timestamp?
    var actorSnapshot: UserSnapshot?
}
```

### 7. 移行が必要な項目

- 旧通知パスを uid配下へ移動。
- 旧 `timestamp` を Timestamp化。
- localStorage既読時刻をサーバー側に持つか、端末ローカル既読のままにするか決める。

### 8. Security Rulesで必要な制約

- 読み取りは `request.auth.uid == uid`。
- クライアント作成は原則禁止し、Cloud Functionsで生成。
- `readAt` 更新のみ本人に許可。

## Poll

### 1. Firestoreパス

- Post内Map: `rooms/{roomId}/posts/{postId}.poll`
- 投票者を独立させる場合: `rooms/{roomId}/posts/{postId}/pollVotes/{uid}`

### 2-4. フィールド

`poll` Map:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `choices` | array&lt;map&gt; | 必須 | 選択肢。 |
| `expiresAt` | Timestamp | 必須 | 終了時刻。 |
| `allowMultiple` | bool | 任意 | 複数選択可。初期はfalse。 |
| `totalVoteCount` | number | 必須 | 総投票数。 |

`choices` 要素:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | string | 必須 | 選択肢ID。 |
| `text` | string | 必須 | 表示文字列。 |
| `voteCount` | number | 必須 | 集計値。 |

`pollVotes/{uid}`:

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | 投票者uid。 |
| `choiceIds` | array&lt;string&gt; | 必須 | 選択した選択肢ID。 |
| `createdAt` | Timestamp | 必須 | 初回投票時刻。 |
| `updatedAt` | Timestamp | 任意 | 変更時刻。 |

### 5. Web版の現在のフィールドとの対応

- `poll.choices` array&lt;string&gt; -> `poll.choices` array&lt;map&gt;。
- `poll.expiresAt` number -> Timestamp。
- `poll.votedUsers.{accountId} = choiceIndex` -> `pollVotes/{uid}.choiceIds = [choiceId]`。

### 6. iOS版Swiftモデルとの対応

```swift
struct Poll: Codable {
    var choices: [PollChoice]
    var expiresAt: Timestamp
    var allowMultiple: Bool?
    var totalVoteCount: Int
}

struct PollChoice: Identifiable, Codable {
    var id: String
    var text: String
    var voteCount: Int
}

struct PollVote: Identifiable, Codable {
    @DocumentID var id: String?
    var uid: String
    var choiceIds: [String]
    var createdAt: Timestamp
    var updatedAt: Timestamp?
}
```

### 7. 移行が必要な項目

- 既存選択肢文字列に安定IDを付与。例: `choice_0`, `choice_1`。
- `expiresAt` を Timestamp化。
- `votedUsers` Mapを `pollVotes` サブコレクションへ展開。
- 集計値を再計算。

### 8. Security Rulesで必要な制約

- 投票は認証済みユーザーのみ。
- `pollVotes/{uid}` は `request.auth.uid == uid`。
- `expiresAt > request.time` の時だけ作成/更新許可。
- `choiceIds` は存在する選択肢IDのみ。
- 集計値はクライアント直接更新禁止が望ましい。

## CongestionReport

### 1. Firestoreパス

- 推奨: `rooms/{roomId}/congestionReports/{reportId}`
- ルーム非依存にする場合: `congestionReports/{reportId}`
- 互換: `globalData/congestion.{spotId}.{encodedUserId}`

`reportId` は `spotId_uid` など、1ユーザー1スポットの最新報告にする場合は固定IDにする。

### 2-4. フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `reportId` | string | 必須 | ドキュメントIDと一致。 |
| `roomId` | string | 任意 | ルームに紐づける場合。 |
| `spotId` | string | 必須 | 混雑スポットID。 |
| `uid` | string | 必須 | 報告者uid。 |
| `level` | number | 必須 | 混雑レベル。例: 1-4。 |
| `createdAt` | Timestamp | 必須 | 初回報告時刻。 |
| `updatedAt` | Timestamp | 必須 | 最新報告時刻。 |
| `expiresAt` | Timestamp | 必須 | 有効期限。現Web互換では30分後。 |

### 5. Web版の現在のフィールドとの対応

- `globalData/congestion.{spotId}.{voterKey}.level` -> `level`
- `globalData/congestion.{spotId}.{voterKey}.timestamp` number -> `updatedAt`
- `voterKey` は `encodeFirestoreFieldKey(currentAccountId)` 由来。新形式では `uid` を使うためエンコード不要。
- `SPOTS` の `id/name/desc` は静的スポット定義として継続可能。

### 6. iOS版Swiftモデルとの対応

```swift
struct CongestionReport: Identifiable, Codable {
    @DocumentID var id: String?
    var reportId: String
    var roomId: String?
    var spotId: String
    var uid: String
    var level: Int
    var createdAt: Timestamp
    var updatedAt: Timestamp
    var expiresAt: Timestamp
}
```

### 7. 移行が必要な項目

- `globalData/congestion` のネストMapをドキュメントへ展開。
- 旧ユーザーIDキーを uid に解決。
- `timestamp` number から `updatedAt` / `expiresAt` Timestampを生成。

### 8. Security Rulesで必要な制約

- 作成/更新は `request.auth.uid == uid`。
- `level` は許可範囲内。例: `1 <= level <= 4`。
- `spotId` は許可リストに含まれる値。
- `expiresAt` は `updatedAt` から一定時間以内。例: 30分。

## 補助モデル

### AuthorSnapshot / UserSnapshot

Post、Reply、Like、Reaction、Repost、Notificationで使う表示用スナップショット。

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `uid` | string | 必須 | ユーザーuid。 |
| `handle` | string | 必須 | 表示ID。 |
| `displayName` | string | 必須 | 表示名。 |
| `avatarUrl` | string | 任意 | 画像URL。 |
| `avatarColor` | string | 任意 | Web互換色。 |

スナップショットは過去投稿の表示安定性のために保持する。プロフィール変更を全投稿に反映したい場合は、クライアントが `users/{uid}` を参照して最新表示へ差し替える。

## 既存データ互換ポリシー

1. 読み取り互換期間
   - Web/iOSとも、移行完了までは以下を読めるようにする。
   - `timestamp` number と `createdAt` Timestamp。
   - `authorId` と `authorUid`。
   - `quoteTo` と `quotePostId`。
   - `replyTo` 付きPostと `replies` サブコレクション。
   - 投稿内 `likes/reactions/reposts` Mapと各サブコレクション。

2. 書き込み先
   - 新規Web版・iOS版は新形式だけに書き込む。
   - 旧Web版を併存させる場合は、Cloud Functionsで旧形式を補助的に同期するか、Web版を先に新形式対応する。

3. Timestamp変換
   - 旧 `timestamp` / `expiresAt` が number の場合、ミリ秒として `Timestamp(date: Date(timeIntervalSince1970: value / 1000))` に変換する。
   - 変換済み後も `legacyTimestampMs` を一時保持するとロールバックしやすい。

4. uid解決
   - 旧 `userId` から `uid` への対応表を移行時に作る。
   - 既存ユーザーがFirebase Authへ移行するまでは `legacyUsers/{legacyUserId}` のような対応テーブルを一時利用する。

## Security Rules共通ヘルパー案

```text
isSignedIn() = request.auth != null
isSelf(uid) = isSignedIn() && request.auth.uid == uid
isAdmin() = isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid))
isRoomMember(roomId) = isSignedIn() && exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid))
```

共通制約:

- クライアントから `uid`, `authorUid`, `recipientUid` を偽装できないよう、パスのuidまたは `request.auth.uid` と一致させる。
- `createdAt` は作成時のみ、`updatedAt` は更新時のみ変更。
- 集計値はクライアント直接更新を避け、Cloud Functionsまたはトランザクションで管理。
- 削除は物理削除より `deletedAt` による論理削除を基本にする。
- 管理者権限はクライアント環境変数やhandleではなく、`admins/{uid}` などサーバー側データで判定する。
