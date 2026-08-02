# Auth Architecture

作成日: 2026-08-02

## 現在の方針

Firebase Authenticationのuidを内部IDの正とし、旧Web IDは `legacyUserId` として互換用途に分離する。

## IDの責務

- `firebaseUid`: Firebase Authで発行されるuid。Apple認証後の主ID。
- `legacyUserId`: 旧Webログインで使っていたID。旧データ参照の互換キー。
- `primaryAccountId`: 現在セッションの主ID。Apple認証ではuid、旧ログインでは旧ID。
- `accountIdAliases`: 自分判定や旧データ参照に使うID候補。

## Apple認証後の流れ

1. `src/services/appleAuth.js` が `OAuthProvider('apple.com')` でログインする。
2. `ensureAppleUserProfile` が `users/{uid}` を作成または取得する。
3. 初回は `completeInitialAppleUserProfile` が `displayName` と `handle` を保存し、`handles/{handle}` を予約する。
4. 旧連携成功時、Cloud Functionsの `linkLegacyAccount` が `legacyUserLinks/{legacyUserId}` と `users/{uid}.legacyUserId` をtransactionで更新する。
5. MainAppは `accountIdAliases` でuidとlegacyUserIdを分離したまま扱う。

## 今回の実装範囲

- 現在ユーザーのプロフィール表示。
- 投稿に対する自分判定。
- 現在ユーザーの投稿一覧。

## 未対応

フォロー、通知、ブックマーク、チャット、いいね、リアクション、リポスト、時間割、Todoはまだuid/legacyUserId併用へ移行していない。

Firestore Rules、Cloud Functions、Firebase設定、既存データは変更していない。
## 2026-08-02 Follow Scope

`accountIdAliases` は、今回フォロー機能にも限定適用した。

- `firebaseUid` と `legacyUserId` は引き続き分離して扱う。
- `primaryAccountId` は新規フォロー書き込み元として使う。
- `accountIdAliases` は現在ユーザーの `follows` / `followers` 互換読み取りと、自分自身へのフォロー防止判定に使う。
- 管理者判定は `admins/{uid}` のFirebase uidベースのまま変更していない。
- Cloud Functions、Firestore Rules、Firebase設定、旧ログイン方式は変更していない。
