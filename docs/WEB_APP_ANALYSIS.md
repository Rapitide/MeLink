# Webアプリ調査メモ

目的: 既存Webアプリの掲示板を、将来的にSwiftUI製iOSアプリと同期させるための現状整理。

注意: この文書は、現時点のリポジトリ内コードから確認できる内容だけを根拠にしています。Firestore Security RulesやFirebaseコンソール設定はリポジトリ内に見当たらないため、未確認事項として扱います。

## 1. 使用しているフレームワーク

- フロントエンドは React + Vite。
  - 根拠: `package.json:7-11` に `dev`, `build`, `preview` が `vite` 系スクリプトとして定義されている。
  - 根拠: `package.json:17-24` に `react`, `react-dom`, `react-router-dom`, `vite`, `@vitejs/plugin-react` がある。
  - 根拠: `src/main.jsx:1-9` で `createRoot` により React アプリを起動している。
- ルーティングは React Router。
  - 根拠: `src/App.jsx:3` で `BrowserRouter`, `Routes`, `Route` を import。
  - 根拠: `src/App.jsx:14-37` で `/`, `/lp`, `/app`, `/wiki`, `/terms`, `/privacy` を定義。
- UI/スタイルは Tailwind CSS と CSS ファイル併用。
  - 根拠: `package.json:21-23` に `tailwindcss`, `postcss`, `autoprefixer`。
  - 根拠: `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `src/App.css` が存在。
- アイコンは `lucide-react`。
  - 根拠: `package.json:20`、`src/MainApp.jsx:2-5`、`src/Community.jsx:3`。
- 3Dマップは Three.js / React Three Fiber / Drei。
  - 根拠: `package.json:13-15`。
  - 根拠: `src/CampusMap.jsx:2-4` で `@react-three/fiber`, `@react-three/drei`, `three` を import。
- デプロイ先は Firebase Hosting。
  - 根拠: `firebase.json:1-28` で `hosting.public` が `dist`、SPA rewrite が `/index.html`。

## 2. 使用しているデータベース

- 掲示板・プロフィール・フォロー・ブックマーク・通知・混雑情報・時間割などは Cloud Firestore。
  - 根拠: `src/MainApp.jsx:6-8` で Firebase App/Auth/Firestore を import。
  - 根拠: `src/MainApp.jsx:37-39` で `initializeApp`, `getAuth`, `getFirestore`。
  - 根拠: `src/MainApp.jsx:505-513` で `rooms/{roomId}/posts` を購読。
  - 根拠: `src/Community.jsx:2` で Firestore の `doc`, `setDoc`, `updateDoc`, `deleteDoc`, `collection`, `addDoc` を使用。
- Realtime Database は、設定値として `databaseURL` があるだけで、コード上の利用は確認できない。
  - 根拠: `src/MainApp.jsx:26-35` の Firebase config に `databaseURL`。
  - 根拠: `package.json:17` の `firebase` SDK利用はあるが、`getDatabase` 等の import は `rg` では見当たらなかった。

## 3. 認証方法

- Firebase Authentication は匿名サインインを使っている。
  - 根拠: `src/MainApp.jsx:7` で `signInAnonymously`, `onAuthStateChanged` を import。
  - 根拠: `src/MainApp.jsx:355-368` で未ログイン時に `signInAnonymously(auth)` を実行。
- アプリ上のログインは Firebase Auth のメール/パスワードではなく、Firestore上のユーザードキュメントに保存した `userId` と `password` を照合する独自方式。
  - 根拠: `src/MainApp.jsx:632-655` の新規登録で `rooms/{defaultRoom}/users/{userId}` に `password` を含めて `setDoc`。
  - 根拠: `src/MainApp.jsx:657-676` のログインで同ドキュメントを `getDoc` し、`snap.data().password` と入力値を比較。
  - 根拠: `src/AuthScreen.jsx:73-99` がログインフォームを表示し、親から渡された `handleSignIn` を submit。
- `rememberMe` 有効時はユーザーIDとパスワードを `localStorage` に保存する。
  - 根拠: `src/MainApp.jsx:647-648`, `src/MainApp.jsx:671-672`。

## 4. 投稿データの保存形式

- 投稿は Firestore の `rooms/{sanitizeRoomId(currentRoomId)}/posts` コレクション配下のドキュメント。
  - 根拠: `src/MainApp.jsx:505-513` で `rooms/{rs}/posts` を `orderBy('timestamp', 'desc')` で購読。
  - 根拠: `src/Community.jsx:1042-1044` で通常投稿を `addDoc(collection(firestore, 'rooms/.../posts'), {...})`。
- 通常投稿の主なフィールド:
  - `authorId`, `authorName`, `authorHandle`, `authorColor`, `authorAvatarUrl`, `content`, `poll`, `timestamp`
  - 根拠: `src/Community.jsx:1042-1044`。
- 引用リポスト投稿の主なフィールド:
  - `authorId`, `authorName`, `authorHandle`, `authorColor`, `authorAvatarUrl`, `content`, `timestamp`, `quoteTo`, `likes`, `reposts`, `poll`
  - 根拠: `src/Community.jsx:410-422`。
- リアクション・いいね・リポスト・投票は投稿ドキュメント内の Map フィールドとして更新される。
  - `likes.{accountId} = userName`: `src/Community.jsx:489-491`
  - `reactions.{emoji}.{accountId} = userName`: `src/Community.jsx:377-386`
  - `reposts.{accountId} = { name, timestamp }`: `src/Community.jsx:391-400`
  - `poll = { choices, expiresAt, votedUsers }`: `src/Community.jsx:1034-1040`
  - `poll.votedUsers.{accountId} = choiceIndex`: `src/Community.jsx:437-439`
- グローバル固定は `isGlobalPinned` フィールド。
  - 根拠: `src/Community.jsx:503-505`。

## 5. コメントデータの保存形式

- 現行の返信は、投稿と同じ `rooms/{roomId}/posts` コレクションに別ドキュメントとして保存し、親投稿IDを `replyTo` に入れる形式。
  - 根拠: `src/Community.jsx:441-460` で返信を `addDoc` し、`replyTo`, `replyToAuthor`, `replyToAuthorId` を保存。
  - 根拠: `src/Community.jsx:313-319` で `allPosts.filter(post => post.replyTo === p.id)` を返信として扱う。
- 旧形式の返信も残っており、親投稿ドキュメント内の `replies` Map を読む。
  - 根拠: `src/Community.jsx:290-311` で `p.replies` を `legacyRepliesList` に変換。
  - 旧形式の主なフィールドは `authorId`, `authorName`, `authorColor`, `authorAvatarUrl`, `content`, `timestamp`, `likes`, `reactions`。
  - 根拠: `src/Community.jsx:296-308`。
- 旧形式返信のいいね・リアクション・削除は親投稿ドキュメントのネストフィールドを更新する。
  - 根拠: `src/Community.jsx:362-375`, `src/Community.jsx:473-485`, `src/Community.jsx:508-515`。

## 6. マップ地点情報の保存形式

- キャンパス3Dマップの建物地点はコード内の静的配列 `BUILDING_LABELS`。
  - 根拠: `src/CampusMap.jsx:54-109` に `{ id, name, position: [x, y, z] }` 形式。
- 3Dモデルは `public/saitama_v3.glb` を読み込む。
  - 根拠: `src/CampusMap.jsx:192-193` で `useGLTF('/saitama_v3.glb')`。
  - 根拠: `public/saitama_v3.glb` が存在。
- 混雑報告対象のスポットは `SPOTS` 静的配列。
  - 根拠: `src/utils.jsx:107-112` に `{ id, name, desc }` 形式。
- 混雑投票は Firestore の `globalData/congestion` ドキュメントに、スポットIDをフィールド名、ユーザーID由来のキーを子フィールドとして保存。
  - 根拠: `src/MainApp.jsx:395-397` で `globalData/congestion` を購読。
  - 根拠: `src/MainApp.jsx:1147-1156` で `{ [spotId]: { ...currentSpotVotes, [voterKey]: { level, timestamp } } }` を保存。
  - 根拠: `src/utils.jsx:129-136` で Firestore フィールド名に使うキーをエンコード。

## 7. 画像の保存先

- Firebase Storage へのアップロード処理は確認できない。プロフィール画像・ヘッダー画像はブラウザ上で圧縮した Data URL を Firestore のユーザードキュメントに保存している。
  - 根拠: `src/utils.jsx:59-76` の `compressImage` が `canvas.toDataURL('image/jpeg', quality)` を返す。
  - 根拠: `src/AuthScreen.jsx:33-42` で登録時のアバター画像を Data URL に変換し `loginForm.avatarUrl` に設定。
  - 根拠: `src/MainApp.jsx:646` で `avatarUrl`, `headerUrl` をユーザードキュメントに保存。
  - 根拠: `src/MainApp.jsx:1081-1088` でプロフィール編集時も Data URL を `editForm.avatarUrl/headerUrl` に設定。
  - 根拠: `src/MainApp.jsx:721-726` で `avatarUrl`, `headerUrl` を更新データとして保存。
- 投稿本文への画像添付保存は、掲示板コードでは確認できない。
  - 根拠: `src/Community.jsx:1042-1044` の通常投稿フィールドに画像URL/画像IDがない。
- 静的画像・3Dモデルは `public/` 配下。
  - 根拠: `public/圧縮メリン.jpg`, `public/ラコスケ.jpg`, `public/わかめ圧縮.jpg`, `public/ogp-melink.png`, `public/saitama_v3.glb` 等。
- `storageBucket` は設定に含まれるが、Storage SDK利用は確認できない。
  - 根拠: `src/MainApp.jsx:31`、`src/WikiPage.jsx:44`。
  - 根拠: `rg 'getStorage|uploadBytes|getDownloadURL' src` では該当なし。

## 8. localStorageの使用箇所

掲示板同期に直接関係するもの:

- `twitter_clone_current_id`: 現在のアプリ内ユーザーID。
  - 根拠: `src/MainApp.jsx:131-139`, `src/MainApp.jsx:620-626`, `src/WikiPage.jsx:128`。
- `twitter_clone_room_id`: 現在の掲示板ルームID。
  - 根拠: `src/MainApp.jsx:138-140`, `src/MainApp.jsx:628-630`。
- `twitter_clone_available_rooms`: 掲示板ルーム一覧キャッシュ。
  - 根拠: `src/MainApp.jsx:140-147`, `src/MainApp.jsx:400-422`, `src/MainApp.jsx:424-435`。
- `saved_user_id`, `saved_password`: ログイン情報保存。
  - 根拠: `src/MainApp.jsx:647-648`, `src/MainApp.jsx:671-672`, `src/MainApp.jsx:1006-1008`。
- `last_seen_notif_time`: 通知既読時刻。
  - 根拠: `src/MainApp.jsx:227-229`, `src/MainApp.jsx:1593`, `src/MainApp.jsx:2315`。

アプリ全体で使われるもの:

- `twitter_clone_theme`: ダーク/ライトテーマ。
  - 根拠: `src/MainApp.jsx:267-269`, `src/MainApp.jsx:608-618`。
- `sidebar_collapsed`: サイドバー折りたたみ。
  - 根拠: `src/MainApp.jsx:162-168`, `src/MainApp.jsx:1550`, `src/MainApp.jsx:1566`。
- `hide_pwa_prompt`: PWA案内非表示。
  - 根拠: `src/MainApp.jsx:271-277`, `src/MainApp.jsx:301-305`。
- `twitter_clone_timetables`, `twitter_clone_lesson_colors`, `twitter_clone_lesson_notes`: 時間割関連。
  - 根拠: `src/MainApp.jsx:170-214`, `src/Timetable.jsx:13-15`, `src/Timetable.jsx:66-73`, `src/todoCalendarUtils.js:95-98`。
- `twitter_clone_schedule_categories`, `twitter_clone_custom_events`, `twitter_clone_fixed_schedules`, `twitter_clone_mobile_banner_shown`: ToDo/カレンダー関連。
  - 根拠: `src/ToDoCalendar.jsx:30-98`, `src/ToDoCalendar.jsx:112-173`。
- `su_news_cache_v3`: 大学ニュース取得結果キャッシュ。
  - 根拠: `src/UniversityNotice.jsx:4`, `src/UniversityNotice.jsx:159-201`。

## 9. 外部API

- Firebase Authentication / Cloud Firestore。
  - 根拠: `src/MainApp.jsx:6-8`, `src/MainApp.jsx:26-39`。
- Open-Meteo 天気API。
  - 根拠: `src/MainApp.jsx:586-606` で `https://api.open-meteo.com/v1/forecast...` を fetch。
- 埼玉大学Webサイトのニュース取得。CORSプロキシを複数使用。
  - 根拠: `src/UniversityNotice.jsx:6-21` に `https://www.saitama-u.ac.jp/`, `https://proxy.cors.sh/`, `https://api.allorigins.win/get`, `https://corsproxy.io/`。
  - 根拠: `src/UniversityNotice.jsx:23-42` でプロキシ経由 fetch。
- ローカル静的JSON。
  - 根拠: `src/MainApp.jsx:598-601` で `/data/bus_timetable.json`。
  - 根拠: `src/Timetable.jsx:76` で `/data/syllabus_dict.json`。
- 外部リンクとして大学/関連サイトを開く処理がある。
  - 根拠: `src/MainApp.jsx:1311-1329`, `src/MainApp.jsx:1836-1849`, `src/MainApp.jsx:1898`。
- NAVITIMEの時刻表URLは定数として保持。
  - 根拠: `src/features/minamiyonoBus/timetable.js:5`。

## 10. iOS版と共有可能な部分

- Firestoreデータモデルとコレクション構造。
  - `rooms/{roomId}/posts`
  - `rooms/{roomId}/users/{userId}`
  - `rooms/{roomId}/follows/{userId}`
  - `rooms/{roomId}/followers/{userId}`
  - `rooms/{roomId}/bookmarks/{userId}`
  - `rooms/{roomId}/notifications/{userId}/items`
  - `globalData/boardRooms`
  - `globalData/congestion`
  - 根拠: `src/MainApp.jsx:376-421`, `src/MainApp.jsx:483-513`, `src/Community.jsx:362-500`。
- 掲示板の表示ロジックに必要な概念。
  - 投稿、返信、引用、リポスト、いいね、リアクション、投票、固定、ブックマーク、フォロー。
  - 根拠: `src/Community.jsx:290-329`, `src/Community.jsx:362-439`, `src/Community.jsx:473-505`, `src/MainApp.jsx:308-353`。
- `sanitizeRoomId` と `encodeFirestoreFieldKey` のルールは、Swift側にも同等実装が必要。
  - 根拠: `src/utils.jsx:56`, `src/utils.jsx:129-136`。
- 静的データは共有しやすい。
  - マップ建物配列: `src/CampusMap.jsx:54-109`
  - 混雑スポット: `src/utils.jsx:107-112`
  - バス時刻表JSON: `public/data/bus_timetable.json`
  - シラバス辞書JSON: `public/data/syllabus_dict.json`

## 11. Swiftで再実装が必要な部分

- React UI全体、ルーティング、状態管理。
  - 根拠: `src/App.jsx:14-37`, `src/MainApp.jsx`, `src/Community.jsx`。
- Firebase JS SDK依存部分は Swift Firebase SDK へ置き換え。
  - 根拠: `src/MainApp.jsx:6-8`, `src/Community.jsx:2`。
- `localStorage` を前提にした永続化は、iOSでは `UserDefaults` / Keychain / ローカルDB等へ置き換え。
  - 根拠: `src/MainApp.jsx:131-147`, `src/MainApp.jsx:620-648`, `src/ToDoCalendar.jsx:30-173`。
- 画像圧縮・Data URL化は Swift の画像処理と保存方式へ置き換え。
  - 根拠: `src/utils.jsx:59-76`, `src/AuthScreen.jsx:33-42`, `src/MainApp.jsx:1081-1088`。
- 3Dキャンパスマップは SwiftUIだけではなく SceneKit / RealityKit / Metal 等で再実装検討が必要。
  - 根拠: `src/CampusMap.jsx:2-4`, `src/CampusMap.jsx:192-193`。
- DOMParserを使った大学ニュースHTML解析は Swift側で `URLSession` + HTML parser相当が必要。
  - 根拠: `src/UniversityNotice.jsx:44-88`。

## 12. セキュリティ上の問題

- パスワードがFirestoreに平文保存されている。
  - 根拠: `src/MainApp.jsx:646` で `password` をそのまま保存。
  - 根拠: `src/MainApp.jsx:670` で `snap.data().password` と入力パスワードを比較。
  - 根拠: `src/MainApp.jsx:1002` で新パスワードも平文更新。
- `saved_password` としてパスワードを `localStorage` に保存している。
  - 根拠: `src/MainApp.jsx:647-648`, `src/MainApp.jsx:671-672`, `src/MainApp.jsx:1006-1008`。
- Firebase Auth のユーザーIDとアプリ内 `currentAccountId` が結びついていない。匿名認証後、Firestore上の任意 `userId/password` でアプリ内ログインしている。
  - 根拠: `src/MainApp.jsx:355-368` で匿名サインイン。
  - 根拠: `src/MainApp.jsx:657-676` でFirestoreドキュメントのパスワードを独自照合。
  - リスク: Firestore Security Rulesが適切に制限されていない場合、別ユーザーのデータ読み書きが可能になりうる。Rulesファイルはリポジトリ内に見当たらないため、実際の制限は未確認。
- 管理者判定がクライアント側の `currentAccountId` と環境変数パスワードに依存している。
  - 根拠: `src/MainApp.jsx:282` の `isAdmin = currentAccountId === ...`。
  - 根拠: `src/MainApp.jsx:637`, `src/MainApp.jsx:662` で `VITE_ADMIN_PASSWORD` と比較。Viteの `VITE_` 環境変数はクライアントに埋め込まれる。
- Firebase設定値が `WikiPage.jsx` に直書きされている。
  - 根拠: `src/WikiPage.jsx:39-49`。
  - Firebase Web config自体は秘密情報とは限らないが、環境分離・キー管理の観点で `MainApp.jsx:26-35` のように環境変数へ統一した方がよい。
- 画像をData URLとしてFirestoreに保存しているため、ドキュメントサイズ上限や読み取りコスト、個人情報削除の実効性に注意が必要。
  - 根拠: `src/utils.jsx:59-76`, `src/MainApp.jsx:646`, `src/MainApp.jsx:721-726`。
- 外部CORSプロキシ経由でHTMLを取得している。
  - 根拠: `src/UniversityNotice.jsx:9-21`。
  - リスク: プロキシ事業者へのアクセス情報送信、プロキシ改ざん、可用性低下。掲示板同期そのものには直接関係しないが、iOS版で同機能を持つ場合は避けたい。

## 13. 移行手順の提案

1. Firestore Security Rulesを先に確認・整備する。
   - `rooms/{roomId}/posts` は投稿作成者・管理者・公開読み取りの範囲を明確化。
   - `rooms/{roomId}/users/{userId}` の `password` を廃止する前提で、本人だけが更新できるルールにする。
   - 現リポジトリではRulesファイルが確認できないため、Firebaseコンソール側の現行Rules確認が最初の作業。

2. 認証を Firebase Auth の正式な方式へ移行する。
   - 現行の匿名Auth + Firestore平文パスワード方式は、Web/iOS共有の基盤として不適切。
   - 候補はメール/パスワード、Appleログイン、Googleログイン、またはカスタム認証。
   - 既存の `userId` は表示ID/ハンドルとして残し、Firebase Auth `uid` を永続的な主キーにする。

3. 掲示板スキーマをバージョン付きで定義する。
   - 現行投稿に `schemaVersion` を追加し、Swift側モデルに合わせる。
   - 返信は現行の `replyTo` 方式へ統一し、旧 `replies` Map は読み取り互換だけにするか、移行バッチで通常投稿ドキュメントへ変換する。

4. ID変更に強い構造へ直す。
   - 現状はユーザーID変更時に多数のコレクションと投稿内Mapキーを書き換えている。
   - 根拠: `src/MainApp.jsx:789-980`。
   - iOS同期前に、内部IDは Firebase Auth `uid`、表示IDは変更可能な `handle` と分離するのが望ましい。

5. 画像保存を Firebase Storage へ移行する。
   - プロフィール画像/ヘッダー画像は Storage に置き、Firestoreには `avatarUrl`, `headerUrl`, `storagePath`, `updatedAt` などを保存。
   - 既存Data URLは段階的にStorageへアップロードし、URL/パスへ置換する。

6. Swift側と共有するモデル定義を作る。
   - 投稿、ユーザー、ルーム、フォロー、ブックマーク、通知、混雑スポット、投票の型を Markdown または JSON Schema で固定。
   - 特に `timestamp` は現状 `Date.now()` のミリ秒数値なので、Swift側も `Int64` ミリ秒として扱うか、Firestore `Timestamp` へ移行するかを決める。

7. SwiftUI iOS版は読み取り専用から始める。
   - 最初は `rooms/{roomId}/posts` の購読、投稿一覧、返信表示、プロフィール表示だけを実装。
   - 次に投稿作成、いいね、ブックマーク、リポスト、投票を順に追加。

8. Web側との互換期間を設ける。
   - Webは旧 `replies` Map と新 `replyTo` の両方を読める実装になっている。
   - 根拠: `src/Community.jsx:290-324`。
   - iOS側も初期は両対応にするか、移行完了後に旧形式を廃止する。

9. 外部API機能は掲示板同期と切り離す。
   - 天気、大学ニュース、バス、3Dマップは掲示板同期の必須要件ではない。
   - iOS初期版では掲示板・プロフィール・通知に範囲を絞るとリスクが小さい。

10. 本番移行前にテスト用Firebaseプロジェクトを用意する。
    - WebとiOSを同じテストFirestoreに接続し、投稿・返信・いいね・リポスト・投票・削除・ID変更・画像更新を相互検証する。
    - 現行コードはクライアント中心に直接Firestoreを書いているため、Rulesとテストデータで安全性を確認してから本番データへ接続する。
