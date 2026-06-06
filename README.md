# MeLink 🌐

埼玉大学の学生生活を快適にサポートする、学生向けポータル＆コミュニティプラットフォームです。

---

## 🚀 主な機能

MeLinkは、埼大生が必要とするあらゆる情報を一元化し、学生間のコミュニケーションを活発にすることを目指しています。

1. **コミュニティ（掲示板）**  
   サークル、講義、雑談など、テーマに応じたルームで匿名・実名でのコミュニケーションが可能です。
2. **MY時間割**  
   大学の学務システムからダウンロードした時間割CSVファイルをそのままインポート可能。集中講義の表示や、友達の時間割共有機能も備えています。
3. **ToDo ＆ カレンダー**  
   授業、バイト、サークル、課題など、カテゴリ別に自動で色分け表示。学年歴の自動インポートや、タップした時間への直感的な予定追加（30分単位スナップ）、直接削除機能などを搭載しています。
4. **キャンパス地図（マップ）**  
   広大なキャンパス内の建物や教室の位置を直感的に確認できるインタラクティブマップです。
5. **バス時刻表**  
   北浦和駅・南与野駅・志木駅行きの直近のバス発着予定とカウントダウンを表示します。
6. **学食情報**  
   生協食堂などのメニュー確認やレビュー投稿が可能です。
7. **埼大Wiki**  
   講義情報、サークル、学生生活のノウハウをまとめるナレッジベースです。

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
