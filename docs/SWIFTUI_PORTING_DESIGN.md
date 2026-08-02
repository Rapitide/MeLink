# SwiftUI移植設計書

目的: 現在のReact/Vite版MeLinkを解析し、SwiftUI製iOSアプリへ段階的に移植できるように、画面、Firestore、Cloud Functions、Auth、状態管理、API、共通コンポーネントを整理する。

注意:

- 本書はコード調査に基づく設計資料であり、このPRではアプリ挙動を変更しない。
- Firestoreは現行Web互換データと、SwiftUIで将来扱いやすい推奨モデルを分けて記載する。
- 旧ログイン由来の `rooms/{roomId}/users/{legacyUserId}.password` は互換維持のため現行構造として記録するが、SwiftUIでは直接照合しない。

## 根拠ファイル

| 領域 | 主な根拠 |
| --- | --- |
| ルーティング | `src/App.jsx` |
| メインアプリ/状態管理 | `src/MainApp.jsx` |
| ログイン/Apple/プロフィール設定 | `src/AuthScreen.jsx`, `src/services/appleAuth.js`, `src/services/userProfileService.js` |
| 旧アカウント連携 | `src/services/legacyMigrationService.js`, `functions/src/linkLegacyAccount.js` |
| 管理者判定 | `src/services/adminAuthService.js`, `firestore.rules` |
| 掲示板 | `src/Community.jsx` |
| モーダル/共通UI | `src/Modals.jsx`, `src/utils.jsx` |
| 時間割 | `src/Timetable.jsx` |
| ToDo/カレンダー | `src/ToDoCalendar.jsx`, `src/TodoDesktopViews.jsx`, `src/TodoMobileViews.jsx`, `src/TodoSidebar.jsx` |
| Wiki | `src/Wiki.jsx`, `src/WikiPage.jsx` |
| キャンパス地図 | `src/CampusMap.jsx` |
| ニュース/外部API | `src/UniversityNotice.jsx`, `src/MainApp.jsx` |
| Firebase初期化 | `src/config/firebaseClient.js`, `src/config/firebaseConfig.js`, `src/config/featureFlags.js` |
| Functions一覧 | `functions/index.js`, `functions/src/*.js` |

## 1. 画面一覧

### Webルート画面

| Web path | React component | 役割 | SwiftUI移植先 |
| --- | --- | --- | --- |
| `/` | `IntroPage` | 導入ページ | iOSでは原則不要。必要ならオンボーディングへ統合 |
| `/lp` | `LandingPage` | LP | iOS対象外 |
| `/lp/melink` | `MelinkProductDetail` | プロダクト紹介 | iOS対象外 |
| `/app` | `MainApp` | 実アプリ本体 | `RootTabView` |
| `/wiki` | `WikiPage` | 独立Wikiページ | `WikiView` または後続Phase |
| `/terms` | `TermsPage` | 利用規約 | `TermsView` |
| `/privacy` | `PrivacyPage` | プライバシーポリシー | `PrivacyView` |
| `/dev/apple-auth` | `AppleAuthDebugPage` | test環境Apple認証確認 | iOSではDebug build限定のDeveloper screen |
| `/dev/legacy-migration` | `LegacyMigrationDebugPage` | test環境旧アカウント連携確認 | iOSではDebug build限定のDeveloper screen |

根拠: `src/App.jsx` の `Route` 定義。

### MainApp内タブ/主要画面

| Web状態 | React component/関数 | 役割 | SwiftUI View案 |
| --- | --- | --- | --- |
| `!currentUserProfile` | `AuthScreen` | 旧ログイン、Appleログイン、初回プロフィール設定、旧アカウント連携案内 | `AuthFlowView` |
| `ホーム` | `MainApp`内 JSX | 天気、バス、ニュース、クイックリンク、混雑投票 | `HomeView` |
| `キャンパス地図` | `CampusMapComponent` | 3Dキャンパスマップ | `CampusMapView` |
| `MY時間割` | `TimetableComponent` | 時間割、授業メモ、CSV取込、授業トーク | `TimetableView` |
| `ToDo` | `ToDoCalendarComponent` | カレンダー、固定予定、カスタム予定 | `CalendarTodoView` |
| `コミュニティ` | `CommunityComponent` | 掲示板、投稿、返信、投票、いいね等 | `CommunityView` |
| `プロフィール` | `MainApp`内プロフィール領域 | 自分のプロフィール、投稿一覧、設定 | `ProfileView` |
| モーダル群 | `Modals.jsx` | バッジ、フォロー一覧、ルーム、プロフィール編集、規約 | SwiftUI `sheet` / `fullScreenCover` |
| カメラ | `CameraApp` | ブラウザカメラ撮影 | iOSでは `PhotosPicker` / `UIImagePickerController` / `AVFoundation` |

根拠: `src/MainApp.jsx` の `currentBottomTab` 分岐、`src/AuthScreen.jsx`、`src/Community.jsx`、`src/Modals.jsx`。

## 2. Firestore構造

### 現行Web互換の実パス

| パス | 用途 | 主なフィールド/形式 | 根拠 |
| --- | --- | --- | --- |
| `rooms/{roomId}/users/{legacyUserId}` | 旧ユーザープロフィール/旧ログイン | `id`, `name`, `password`, `handle`, `avatarColor`, `bio`, `avatarUrl`, `headerUrl` | `src/MainApp.jsx` の旧サインアップ/ログイン |
| `users/{uid}` | Firebase Auth移行後の共通ユーザー | `uid`, `handle`, `displayName`, `authProviders`, `appleLinked`, `profileSetupCompleted`, `legacyUserId`, `createdAt`, `updatedAt` | `src/services/userProfileService.js` |
| `handles/{handle}` | handle一意性 | `uid`, `createdAt` | `src/services/userProfileService.js` |
| `legacyUserLinks/{legacyUserId}` | 旧IDとFirebase uidの対応 | `legacyUserId`, `uid`, `handle`, `linkedProvider`, `linkedAt`, `migrationVersion` | `functions/src/linkLegacyAccount.js` |
| `admins/{uid}` | 管理者判定 | `role: "admin"`, `enabled: true`, `createdAt` | `src/services/adminAuthService.js`, `firestore.rules` |
| `rooms/{roomId}/posts/{postId}` | 投稿/返信/引用投稿 | `authorId`, `authorName`, `authorHandle`, `content`, `timestamp`, `replyTo`, `quoteTo`, `likes`, `reactions`, `reposts`, `poll`, `isGlobalPinned` | `src/Community.jsx` |
| `rooms/{roomId}/follows/{userId}` | フォロー中Map | `targets.{targetId}: true` | `src/MainApp.jsx` |
| `rooms/{roomId}/followers/{userId}` | フォロワーMap | `sources.{sourceId}: true` | `src/MainApp.jsx` |
| `rooms/{roomId}/bookmarks/{userId}` | ブックマークMap | `posts.{postId}: true` | `src/Community.jsx` |
| `rooms/{roomId}/notifications/{userId}/items/{notificationId}` | 通知 | `type`, `from`, `postId`, `timestamp`等 | `src/MainApp.jsx` |
| `rooms/{roomId}/lessonTalks/{lessonName}/messages/{messageId}` | 授業トーク | `text`, `authorId`, `authorName`, `timestamp`等 | `src/Timetable.jsx` |
| `users/{uid}/timetable/data` | 時間割同期 | `timetables`, `colors` | `src/MainApp.jsx`, `src/Timetable.jsx` |
| `users/{uid}/todoEvents/{eventId}` | ToDo予定 | イベント日時、タイトル、色等 | `src/ToDoCalendar.jsx` |
| `users/{uid}/fixedSchedules/{scheduleId}` | 固定予定 | 曜日、開始/終了、タイトル等 | `src/ToDoCalendar.jsx` |
| `users/{uid}/scheduleCategories/{categoryId}` | 予定カテゴリ | 色、名前等 | `src/ToDoCalendar.jsx` |
| `globalData/boardRooms` | ルーム一覧 | `rooms.{roomId}.createdAt`, `createdBy` | `src/MainApp.jsx` |
| `globalData/badges` | バッジ/認証済みユーザー | `admin`, `veteran`, `naming`系Map | `src/MainApp.jsx` |
| `globalData/featurePoll` | 機能投票 | `multiVotes.{optionId}.{userId}: true` | `src/MainApp.jsx` |
| `globalData/congestion` | 混雑投票 | `{spotId}.{encodedUserId}: { level, timestamp }` | `src/MainApp.jsx`, `src/utils.jsx` |
| `globalData/wiki/pages/{pageId}` | Wikiページ | `title`, `content`, `updatedAt`, `updatedBy`等 | `src/Wiki.jsx`, `src/WikiPage.jsx` |

### SwiftUI推奨モデル

SwiftUI版の新規実装では、以下をRepository単位に分割する。

```text
users/{uid}
handles/{handle}
legacyUserLinks/{legacyUserId}
admins/{uid}
rooms/{roomId}
rooms/{roomId}/posts/{postId}
rooms/{roomId}/posts/{postId}/replies/{replyId}          // 将来移行
rooms/{roomId}/posts/{postId}/likes/{uid}                // 将来移行
rooms/{roomId}/posts/{postId}/reactions/{reactionId}     // 将来移行
rooms/{roomId}/posts/{postId}/reposts/{uid}              // 将来移行
rooms/{roomId}/users/{uid}/bookmarks/{postId}            // 将来移行
rooms/{roomId}/users/{uid}/following/{targetUid}         // 将来移行
rooms/{roomId}/users/{uid}/notifications/{notificationId}// 将来移行
```

初期SwiftUI版では、Web互換を壊さないため `rooms/{roomId}/posts` のMap形式を読み書きできるAdapterを置く。完全移行後にサブコレクション形式へ寄せる。

## 3. Cloud Functions一覧

| Callable Function | 入力 | 成功レスポンス | 用途 | SwiftUI Repository |
| --- | --- | --- | --- | --- |
| `checkLegacyMigrationEligibility` | なし、または空object | `{ eligible: true, uid, provider: "apple.com" }` | Apple認証済みか確認 | `LegacyMigrationRepository.checkEligibility()` |
| `validateLegacyMigrationInput` | `{ legacyUserId, legacyPassword }` | `{ valid: true }` | 旧ID/旧パスワード形式検証 | `LegacyMigrationRepository.validateInput()` |
| `checkLegacyAccountExists` | `{ legacyUserId }` | `{ exists: boolean }` | 旧アカウント存在確認 | `LegacyMigrationRepository.checkLegacyExists()` |
| `verifyLegacyAccountPassword` | `{ legacyUserId, legacyPassword }` | `{ verified: boolean }` | 旧パスワード照合のみ | `LegacyMigrationRepository.verifyPassword()` |
| `linkLegacyAccount` | `{ legacyUserId, legacyPassword }` | `{ linked: true, legacyUserId }` | 旧アカウント連携本処理 | `LegacyMigrationRepository.linkLegacyAccount()` |

共通制約:

- `request.auth.uid` 必須。
- `request.auth.token.firebase.sign_in_provider == "apple.com"` 必須。
- `anonymous`、`password`、claim不足は拒否。
- email、token、authorization code、nonce、password、旧プロフィール全体は返さない。
- `linkLegacyAccount` のみFirestore transactionで `legacyUserLinks/{legacyUserId}` 作成と `users/{uid}.legacyUserId` 更新を行う。

根拠: `functions/index.js`, `functions/src/checkLegacyMigrationEligibility.js`, `functions/src/validateLegacyMigrationInput.js`, `functions/src/checkLegacyAccountExists.js`, `functions/src/verifyLegacyAccountPassword.js`, `functions/src/linkLegacyAccount.js`。

## 4. Authフロー

### 現行Webフロー

1. `MainApp` 起動時に `onAuthStateChanged` を購読。
2. Firebase Auth userがない場合は `signInAnonymously` を実行。
3. 旧ログインは `rooms/埼玉大学全体/users/{legacyUserId}` を読み、`password` をクライアントで比較。
4. AppleログインはFeature Flag + test環境限定で `OAuthProvider("apple.com")` と `signInWithPopup` を利用。
5. Apple成功後、`ensureAppleUserProfile` が `users/{uid}` を存在しなければ作成。
6. `profileSetupCompleted == false` の場合は `displayName` と `handle` を設定し、transactionで `handles/{handle}` を予約。
7. `legacyUserId` 未設定なら旧アカウント連携案内を表示。
8. 旧アカウント連携は `legacyMigrationService.linkLegacyAccount` 経由でCallableを呼ぶ。
9. 連携しない場合でもMainApp利用可能。

根拠: `src/MainApp.jsx`, `src/AuthScreen.jsx`, `src/services/appleAuth.js`, `src/services/userProfileService.js`, `src/services/legacyMigrationService.js`。

### SwiftUI推奨フロー

```text
App launch
  -> AuthStore observes Auth.auth().addStateDidChangeListener
  -> if signed out: show AuthFlowView
  -> Sign in with Apple
  -> Firebase Auth signIn(with: OAuthProvider.appleCredential)
  -> UserRepository.ensureAppleUserProfile(uid)
  -> if profileSetupCompleted == false: ProfileSetupView
  -> if legacyUserId == nil: LegacyMigrationPromptView
      -> "連携する": LegacyMigrationFormView -> linkLegacyAccount callable
      -> "あとで": enter app
  -> RootTabView
```

SwiftUIでは匿名Authを主ログインに使わない。未認証状態でも閲覧可能にする場合は、Firestore RulesとUIを読み取り専用に分離する。

## 5. 共通コンポーネント

| React | 役割 | SwiftUI相当 |
| --- | --- | --- |
| `Avatar` (`src/utils.jsx`) | 画像または初期文字の丸アイコン | `AvatarView` |
| `PostItem` (`src/Community.jsx`) | 投稿カード、返信、引用、操作群 | `PostRowView` |
| `MentionTextarea` | 投稿入力、メンション候補 | `PostComposerView` + `TextEditor` |
| `BadgeModal` | バッジ説明 | `BadgeSheet` |
| `FollowListModal` | フォロー/フォロワー一覧 | `FollowListSheet` |
| `RoomModal` | ルーム一覧/作成/管理 | `RoomPickerSheet` |
| `ProfileEditModal` | プロフィール編集 | `ProfileEditSheet` |
| `ProfileSettingsModal` | ID/パスワード設定、退会 | Apple移行後は `AccountSettingsView` として再設計 |
| `TermsModal` | 規約/プライバシー | `TermsPrivacySheet` |
| ToDo各View | カレンダーUI | `CalendarMonthView`, `CalendarWeekView`, `EventEditorSheet` |
| Bus guide components | バス時刻表表示 | `BusGuideView`, `BusRouteCard` |
| `CampusMapComponent` | 3D地図 | `CampusMapView` with SceneKit/RealityKit |

## 6. 状態管理

### 現行React状態

`MainApp.jsx` は多くの状態を1コンポーネント内に保持している。

| 状態 | Web state例 | 保存先 |
| --- | --- | --- |
| Auth user | `user` | Firebase Auth |
| アプリ内ユーザー | `currentAccountId`, `currentUserProfile` | Firestore + localStorage |
| 管理者 | `isAdmin` | `admins/{uid}` onSnapshot |
| ルーム | `currentRoomId`, `availableRooms` | `globalData/boardRooms` + localStorage |
| 投稿 | `posts`, `filteredPosts`, `activeTab` | `rooms/{roomId}/posts` |
| フォロー | `following`, `followers` | `rooms/{roomId}/follows`, `followers` |
| 通知 | `notifications`, `lastSeenNotifTime` | Firestore + localStorage |
| 時間割 | `timetableData` | `users/{uid}/timetable/data` + localStorage |
| ToDo | `customEvents`, `fixedSchedules`, `scheduleCategories` | Firestore + localStorage |
| UI設定 | theme, sidebar, PWA prompt | localStorage |

### SwiftUI状態設計

SwiftUIでは以下のStoreへ分割する。

| Store | 責務 | 主な依存 |
| --- | --- | --- |
| `AuthStore` | Firebase Auth状態、Appleログイン、サインアウト | FirebaseAuth |
| `UserProfileStore` | `users/{uid}` 取得、初回作成、プロフィール設定 | Firestore |
| `LegacyMigrationStore` | 旧アカウント連携案内、Callable呼び出し | Functions |
| `AdminStore` | `admins/{uid}` 監視、管理者UI解放 | Firestore |
| `RoomStore` | ルーム一覧、現在ルーム | Firestore + UserDefaults |
| `PostFeedStore` | 投稿一覧購読、投稿/返信/削除/ピン | Firestore |
| `SocialStore` | Like, Reaction, Repost, Bookmark, Follow | Firestore |
| `NotificationStore` | 通知購読、既読状態 | Firestore + UserDefaults |
| `TimetableStore` | 時間割、授業メモ、CSV/シラバス辞書 | Firestore + local JSON |
| `TodoStore` | カレンダー予定、固定予定、カテゴリ | Firestore |
| `HomeStore` | 天気、バス、ニュース、混雑 | URLSession + Firestore |
| `SettingsStore` | theme等端末設定 | UserDefaults |

Swift実装例:

```swift
@MainActor
final class SessionStore: ObservableObject {
    @Published var authUser: FirebaseAuth.User?
    @Published var profile: AppUser?
    @Published var isAdmin = false
    @Published var authPhase: AuthPhase = .loading
}
```

## 7. API一覧

### Firebase SDK

| API | Web利用 | SwiftUI相当 |
| --- | --- | --- |
| Firebase Auth | anonymous, Apple OAuth, signOut | `FirebaseAuth`, `AuthenticationServices` |
| Cloud Firestore | `onSnapshot`, `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`, transaction | `addSnapshotListener`, `getDocument`, `setData`, `updateData`, `runTransaction` |
| Cloud Functions | `httpsCallable` | `Functions.functions(region:).httpsCallable(...)` |
| Emulator | Auth 9099, Firestore 48080, Functions 5001 | Debug schemeのみ `useEmulator` |

### 外部/ローカルAPI

| API | Web利用箇所 | SwiftUI方針 |
| --- | --- | --- |
| Open-Meteo | `src/MainApp.jsx` | `WeatherRepository` with `URLSession` |
| 埼玉大学公式サイトHTML | `src/UniversityNotice.jsx` | 初期PhaseではWebViewまたは省略。実装するならサーバー側取得推奨 |
| CORSプロキシ | `src/UniversityNotice.jsx` | iOSでは使用しない。直接取得かFunctions経由 |
| `/data/bus_timetable.json` | `src/MainApp.jsx` | Bundle JSON |
| `/data/syllabus_dict.json` | `src/Timetable.jsx` | Bundle JSON |
| `public/saitama_v3.glb` | `src/CampusMap.jsx` | App bundle asset + SceneKit/RealityKit |
| 外部リンク | `MainApp`, `LandingPage`, `WikiPage` | `SFSafariViewController` |

## 8. SwiftUIで再利用できる設計

### レイヤ構成

```text
MeLinkApp
  App
    AppDelegate/FirebaseApp.configure
    RootView

  Presentation
    AuthFlowView
    RootTabView
    HomeView
    CommunityView
    PostDetailView
    ProfileView
    TimetableView
    CalendarTodoView
    CampusMapView
    WikiView
    SettingsView

  State
    AuthStore
    SessionStore
    UserProfileStore
    RoomStore
    PostFeedStore
    SocialStore
    LegacyMigrationStore
    AdminStore

  Domain
    Models
    Validators
    Formatters
    Mappers

  Data
    FirebaseClient
    AuthRepository
    UserRepository
    RoomRepository
    PostRepository
    SocialRepository
    LegacyMigrationRepository
    AdminRepository
    ExternalAPIRepository
```

### Model方針

- Firestore `Timestamp` はData層では `Timestamp`、Domain層では必要に応じて `Date` に変換。
- 現行Webの `timestamp: number` は `LegacyTimestampAdapter` で吸収。
- 現行Webの `authorId` は移行完了まで `legacyAuthorId` として扱い、Firebase uidと混同しない。
- `handle` は先頭 `@` なしで保存し、表示時だけ `@` を付ける。
- `sanitizeRoomId` と `encodeFirestoreFieldKey` はSwiftにも同等実装を置く。

### Repository分割

| Repository | 主要メソッド |
| --- | --- |
| `AuthRepository` | `signInWithApple()`, `signOut()`, `observeAuthState()` |
| `UserRepository` | `ensureAppleUserProfile(uid)`, `completeInitialProfile(...)`, `observeUser(uid)` |
| `LegacyMigrationRepository` | `linkLegacyAccount(legacyUserId, legacyPassword)` |
| `AdminRepository` | `observeAdminStatus(uid)` |
| `RoomRepository` | `observeRooms()`, `createRoom()`, `renameRoom()` |
| `PostRepository` | `observePosts(roomId)`, `createPost()`, `createReply()`, `deletePost()`, `togglePin()` |
| `SocialRepository` | `toggleLike()`, `toggleReaction()`, `toggleRepost()`, `toggleBookmark()`, `toggleFollow()` |
| `NotificationRepository` | `observeNotifications()`, `markRead()` |
| `TimetableRepository` | `loadTimetable()`, `saveTimetable()`, `loadSyllabusDictionary()` |
| `TodoRepository` | `observeEvents()`, `saveEvent()`, `deleteEvent()` |
| `HomeRepository` | `fetchWeather()`, `loadBusTimetable()`, `observeCongestion()` |

## 9. 移植優先順位

### Phase 0: iOS基盤

1. Firebase iOS SDK導入。
2. Debug schemeでAuth/Firestore/Functions Emulator接続。
3. `AuthStore`, `SessionStore`, `FirebaseClient` 作成。
4. `users/{uid}` / `handles/{handle}` / `admins/{uid}` の読み書き確認。

完了条件: Sign in with AppleでFirebase uidを得て、`users/{uid}` を作成/取得できる。

### Phase 1: 認証とプロフィール

1. Sign in with Apple。
2. `users/{uid}` 初期化。
3. displayName/handle設定。
4. 旧アカウント連携案内。
5. `linkLegacyAccount` Callable接続。

完了条件: Webと同じuid/profile/legacyUserLinksを共有できる。

### Phase 2: 掲示板読み取り

1. ルーム一覧。
2. 投稿一覧。
3. 返信表示。
4. プロフィール表示。
5. Like/Reaction/Repost/Bookmarkの表示のみ。

完了条件: Webで作成した掲示板データをiOSで崩さず読める。

### Phase 3: 掲示板書き込み

1. 新規投稿。
2. 返信。
3. いいね。
4. リアクション。
5. リポスト。
6. ブックマーク。
7. 投票。

完了条件: Web互換構造へiOSから書き込み、Webで即時反映される。

### Phase 4: 通知/フォロー/管理者

1. フォロー/フォロワー。
2. 通知一覧。
3. 管理者判定。
4. 管理者用ピン留め/削除。

完了条件: `admins/{uid}` による権限判定がWeb/iOS共通で動く。

### Phase 5: 時間割/ToDo/Home

1. 時間割読み書き。
2. ToDo予定。
3. バス時刻表。
4. 天気。
5. 混雑投票。

完了条件: 個人データとホーム機能がiOSで利用できる。

### Phase 6: Wiki/Map/高度機能

1. Wiki閲覧。
2. Wiki編集。
3. キャンパス地図。
4. ニュース取得。
5. 画像保存方式のStorage移行。

完了条件: Web固有技術をiOSネイティブ体験に置き換えられる。

## 10. iOS移植時の注意点

- iOSには旧パスワード照合処理を実装しない。必ずCallable Functionを使う。
- Firebase ID token、Apple token、authorization code、nonce、emailはFirestoreへ保存しない。
- 旧 `password` フィールドは移行互換のためFunctions内だけで読む。
- `localStorage` 相当は `UserDefaults` とKeychainに分離する。パスワードは保存しない。
- 画像Data URLはFirestore負荷が高いため、iOS新規実装ではStorage移行を優先検討する。
- 現行Webの投稿/返信/Like/Reaction/RepostはMap中心で競合しやすい。SwiftUIではRepository内にtransaction/FieldValue更新を閉じ込める。
- `Date.now()` ミリ秒と Firestore `Timestamp` が混在するため、Mapperで互換変換する。
- 3D地図はReact Three Fiber依存のため、SceneKit/RealityKitで再設計する。

## 11. 推奨Swiftファイル構成

```text
MeLink/
  App/
    MeLinkApp.swift
    FirebaseBootstrap.swift
    EnvironmentConfig.swift

  Models/
    AppUser.swift
    Room.swift
    Post.swift
    Reply.swift
    SocialModels.swift
    Notification.swift
    TimetableModels.swift
    TodoModels.swift

  Repositories/
    AuthRepository.swift
    UserRepository.swift
    LegacyMigrationRepository.swift
    AdminRepository.swift
    RoomRepository.swift
    PostRepository.swift
    SocialRepository.swift
    NotificationRepository.swift
    TimetableRepository.swift
    TodoRepository.swift
    HomeRepository.swift

  Stores/
    SessionStore.swift
    AuthStore.swift
    CommunityStore.swift
    ProfileStore.swift
    HomeStore.swift

  Views/
    Auth/
    Home/
    Community/
    Profile/
    Timetable/
    Todo/
    CampusMap/
    Wiki/
    Shared/

  Utilities/
    FirestorePath.swift
    LegacyDataMapper.swift
    Validators.swift
    DateFormatters.swift
```

## 12. 最初に作るべき最小単位

最初のSwiftUI実装は以下だけに絞る。

1. Firebase Emulator接続可能なDebug build。
2. Sign in with Apple。
3. `users/{uid}` ensure。
4. displayName/handle設定。
5. 旧アカウント連携Callable呼び出し。
6. `rooms/埼玉大学全体/posts` の読み取り専用タイムライン。

この単位ならWeb版の投稿データ構造を変更せず、iOSとWebの同期成立を最短で確認できる。
