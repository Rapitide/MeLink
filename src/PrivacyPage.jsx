import React from 'react';

export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#333',
      lineHeight: '1.6',
      backgroundColor: '#fff',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', fontSize: '24px', fontWeight: 'bold', color: '#111', marginTop: '0' }}>MeLink プライバシーポリシー</h1>
      <p style={{ color: '#666', fontSize: '14px' }}>最終更新日: 2026年5月29日</p>

      <div style={{ padding: '15px', background: '#f5f7fa', border: '1px solid #e1e8ed', borderRadius: '8px', margin: '20px 0' }}>
        <strong style={{ color: '#1a202c' }}>当サービスは、提供する各種サービスの運営において、ユーザーの個人データおよびプライバシーの保護に細心の注意を払い、以下の通り個人情報の取り扱いに関する方針を定めます。</strong>
      </div>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第1条（個人情報の取得と収集範囲）</h2>
        <p style={{ margin: '8px 0' }}>当サービスは、ユーザーから適正かつ公正な手段によって以下の情報を取得・保存します。</p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li style={{ margin: '8px 0' }}><strong>アカウント基本情報</strong>: アカウント名（ニックネーム）、ユーザーID、パスワード（暗号化の上保存）</li>
          <li style={{ margin: '8px 0' }}><strong>プロフィール情報</strong>: プロフィール画像（アバター）、自己紹介テキスト</li>
          <li style={{ margin: '8px 0' }}><strong>カレンダーおよびスケジュールデータ</strong>: カレンダーに登録された予定（タイトル、時間、場所）、毎週の固定スケジュールデータ</li>
          <li style={{ margin: '8px 0' }}><strong>時間割データ</strong>: 時間割テーブルに登録・インポートされた講義情報およびカラーの割り当て情報</li>
          <li style={{ margin: '8px 0' }}><strong>コミュニティ利用データ</strong>: 掲示板（コミュニティ）への投稿内容、画像データ、および投稿へのブックマーク情報</li>
        </ul>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第2条（個人情報の利用目的）</h2>
        <p style={{ margin: '8px 0' }}>収集した情報は、以下の目的のためにのみ利用し、目的外の利用は一切行いません。</p>
        <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li style={{ margin: '8px 0' }}>サービス内におけるプロフィールの表示、掲示板への投稿反映、および安全なユーザー認証のため。</li>
          <li style={{ margin: '8px 0' }}>Firestore データベースを利用した、マルチデバイス間（スマホ・PCなど）での予定データや時間割データのクラウドリアルタイム同期およびデータ保持のため。</li>
          <li style={{ margin: '8px 0' }}>不具合の検出や修正、悪質なユーザーによる利用規約違反行為への対処など、システムの安定運用および安全管理のため。</li>
          <li style={{ margin: '8px 0' }}>ユーザーからのお問い合わせに対する調査・回答および本人確認のため。</li>
        </ol>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第3条（個人情報の安全管理措置）</h2>
        <p style={{ margin: '8px 0' }}>当サービスは、取得した個人情報のセキュリティと安全性を確保するため、以下の安全措置を徹底しています。</p>
        <p style={{ margin: '8px 0' }}>1. <strong>堅牢なクラウド保護</strong>: 業界標準のクラウドシステムである Firebase Firestore を採用し、強固なアクセス制御（セキュリティルール）を定義して、外部からの不正アクセスやデータの改ざん・漏洩を防止しています。</p>
        <p style={{ margin: '8px 0' }}>2. <strong>通信の暗号化</strong>: アプリケーションとサーバー間のすべてのデータ通信は、SSL/TLS 暗号化通信を適用して盗聴や傍受からデータを強固に保護しています。</p>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第4条（情報の第三者提供の制限）</h2>
        <p style={{ margin: '8px 0' }}>当サービスは、次のいずれかに該当する場合を除き、収集した個人情報を第三者へ提供・開示することは決してありません。</p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li style={{ margin: '8px 0' }}>ユーザー本人の事前同意が明確に得られている場合。</li>
          <li style={{ margin: '8px 0' }}>法令に基づく正式な捜査権限または開示請求等の正当な法的手続きがある場合。</li>
          <li style={{ margin: '8px 0' }}>人の生命、身体または財産の保護のために緊急の必要があり、かつ本人の同意を得ることが困難である場合。</li>
        </ul>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第5条（個人情報の開示・訂正・削除・退会）</h2>
        <p style={{ margin: '8px 0' }}>当サービスは、ユーザー自身が自分の個人データを柔軟にコントロールできるよう配慮しています。</p>
        <p style={{ margin: '8px 0' }}>1. ユーザーは、アプリ内の設定画面やカレンダー、時間割編集画面から、自身のプロフィール、予定、授業データ等をいつでも自由に変更・削除できます。</p>
        <p style={{ margin: '8px 0' }}>2. <strong>アカウント削除（退会）について</strong>: ユーザーが退会を希望しアカウント削除手続きを行った場合、そのユーザーの登録情報、カレンダーデータ、時間割、およびマイデータは Firestore データベース上から安全かつ速やかに物理的に完全削除されます。</p>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第6条（プライバシーポリシーの改定）</h2>
        <p style={{ margin: '8px 0' }}>当サービスは、個人情報保護に関する法令の遵守や本サービスの機能拡張等に伴い、本ポリシーを必要に応じて改定することがあります。改定された最新のポリシーはアプリ内に掲載された時点で効力を生じるものとします。</p>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第7条（お問い合わせ窓口）</h2>
        <p style={{ margin: '8px 0' }}>個人情報の取り扱いに関するご質問、削除のご請求、その他のお問い合わせにつきましては、アプリ内の公式窓口、またはMeLink運営チームまでお問い合わせください。</p>
      </section>
      
      <div style={{ textAlign: 'center', marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <button onClick={() => window.close()} style={{
          padding: '10px 24px',
          backgroundColor: '#4a5568',
          color: '#fff',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          このタブを閉じる
        </button>
      </div>
    </div>
  );
}
