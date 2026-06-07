# MeLink 🌐

埼玉大学の学生生活を快適にサポートする、学生向けポータル＆コミュニティプラットフォームです。

---

## 🚀 主な機能

執筆中...

---

## 🛡️ セキュリティ＆データプライバシー

ユーザーの皆様に安心してご利用いただくため、データ管理とセキュリティにおいて以下の取り組みを行っています。

* **強固なアクセス制御**: 
  カレンダーの予定データや時間割データなどは、Firebase のセキュリティルール（Firestore Security Rules）によって保護されています。ログインした本人以外（第三者や他のユーザー）がデータにアクセス・編集することはできません。
* **プライバシーの保護（管理者・開発者もアクセス不可）**: 
  本システムでは、開発者およびシステム管理者であっても、ユーザーの個人のスケジュールや時間割データを閲覧・操作することは物理的・技術的に不可能な設計となっています。管理者を含め、ログインした本人以外はデータに一切立ち入ることができません。
* **セキュアなデータ通信・保管**: 
  すべてのデータ通信は SSL/TLS (HTTPS) により暗号化され、データは Google Cloud (Firebase) のインフラ上に安全に保管されます。

### 🔒 実際のセキュリティルール（Firestore Rules）

本アプリでは、以下のセキュリティポリシーを Firebase Cloud Firestore に適用し、アクセスを厳しく制限しています。これにより、管理者を含む第三者からの無断アクセスや、自身のログイン認証情報と一致しないアカウントからのデータ読み書き要求は、すべてサーバー側で物理的に遮断されます。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 各ユーザーのデータ（予定・個人データ）はその本人しかアクセスできません
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🛠️ 技術スタック

* **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
* **Backend**: Firebase (Authentication, Cloud Firestore)
* **Build Tool**: Vite

---

## 💻 セットアップ手順

ローカル環境でプロジェクトを実行する手順です。

### 1. 依存関係のインストール

プロジェクトのルートディレクトリで以下を実行します：

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の Firebase 接続情報を設定してください（詳細は `.env.example` を参照）。

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL=YOUR_DATABASE_URL
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

### 3. 開発サーバーの起動

ローカルでの開発用サーバーを立ち上げます：

```bash
npm run dev
```

ブラウザで `http://localhost:5173` （またはターミナルに表示されたURL）にアクセスします。

### 4. 本番用ビルド

本番環境向けにコンパイル・ビルドを行います：

```bash
npm run build
```

---

## 📄 ライセンス

このプロジェクトは **MITライセンス** のもとで公開されています。詳細については [LICENSE](./LICENSE) を参照してください。
