# Data Flow

作成日: 2026-08-02

## IDセッション

Apple認証後のWebセッションでは、次のIDを分けて扱う。

- `firebaseUid`: Firebase Authenticationのuid。
- `legacyUserId`: `users/{uid}.legacyUserId`。未連携ならnull。
- `primaryAccountId`: 新しい認証・`users/{uid}`・管理者判定で使う主ID。Apple認証ではuid。
- `accountIdAliases`: 現在ユーザーを表すID配列。未連携なら `[uid]`、連携済みなら `[uid, legacyUserId]`。

旧ログインでは既存互換のため、`accountIdAliases` は旧IDのみになる。

## 今回対応したデータフロー

1. Appleログイン完了後、AuthScreenからMainAppへ `uid`, `handle`, `legacyUserId` を渡す。
2. MainAppは `accountIdentityAdapter` で `accountIdAliases` を生成する。
3. 現在ユーザーのプロフィール表示では、Appleプロフィールを主とし、旧 `rooms/{roomId}/users/{legacyUserId}` の `bio`, `avatarUrl`, `headerUrl`, `avatarColor` を補完する。
4. 投稿の自分判定では、`post.authorId` が `accountIdAliases` に含まれるかを見る。
5. 現在ユーザーの投稿一覧では、既存の投稿購読結果をクライアント側でfilterし、uid投稿とlegacyUserId投稿を統合する。

## 今回未対応

フォロー、通知、ブックマーク、チャット、いいね、リアクション、リポスト、時間割、Todoはまだ旧ID Adapterを適用していない。

一括データ移行、旧データ削除、旧データ書き換えは行っていない。
## 2026-08-02 Follow Adapter Update

今回、`accountIdAliases` の適用範囲をフォロー機能にだけ追加した。

- 対応済み: `rooms/{roomId}/follows/{uid}` と `rooms/{roomId}/follows/{legacyUserId}` の統合読み取り。
- 対応済み: `rooms/{roomId}/followers/{uid}` と `rooms/{roomId}/followers/{legacyUserId}` の統合読み取り。
- 対応済み: プロフィール上のフォロー数、フォロワー数、フォロー状態判定。
- 新規フォローの書き込み先は `primaryAccountId`、つまりApple認証ではFirebase uid、旧ログインではlegacyUserId。
- 既存legacy側に残るフォローを解除する場合だけ、現在ユーザーのalias側follow docと相手側followers docから現在ユーザーaliasを削除する。
- 未対応のまま: 通知、チャット、ブックマーク、いいね、リアクション、リポスト、時間割、Todo。
- Firestore Rules、Cloud Functions、Firebase設定、既存データの一括移行は変更していない。
