import React from 'react';

export default function TermsPage() {
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
      <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', fontSize: '24px', fontWeight: 'bold', color: '#111', marginTop: '0' }}>MeLink 利用規約</h1>
      <p style={{ color: '#666', fontSize: '14px' }}>最終更新日: 2026年5月29日</p>
      
      <div style={{ padding: '15px', background: '#f5f7fa', border: '1px solid #e1e8ed', borderRadius: '8px', margin: '20px 0' }}>
        <strong style={{ color: '#1a202c' }}>本規約は、埼大生向けSNSアプリ「MeLink」における利用条件を定めるものです。すべてのユーザーは本規約に従って本サービスをご利用いただくものとします。</strong>
      </div>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第1条（目的と運営）</h2>
        <p style={{ margin: '8px 0' }}>1. 本サービス「MeLink」は、埼玉大学の学生間の情報共有、空き時間や講義の確認、および相互の交流を円滑に促進することを目的とした、埼大生向けSNSアプリケーションです。</p>
        <p style={{ margin: '8px 0' }}>2. ユーザーは、本サービスが提供する機能（時間割管理、カレンダー同期、コミュニティ掲示板等）を、本規約の定めに従って自らの責任で利用するものとします。</p>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第2条（アカウントおよびパスワードの自己管理）</h2>
        <p style={{ margin: '8px 0' }}>1. ユーザーは、登録するユーザー名（ID）およびパスワードを自己の責任において厳重に管理するものとします。</p>
        <p style={{ margin: '8px 0' }}>2. <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>【注意】</span>セキュリティ保護およびアカウントの乗っ取り防止のため、<strong>他の金融機関や大手SNS等で利用している重要なパスワードと同一のパスワードの登録（使い回し）は避けることを強く推奨します。</strong></p>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第3条（禁止事項）</h2>
        <p style={{ margin: '8px 0' }}>ユーザーは、本サービスの利用にあたり、以下の各行為を行ってはなりません。</p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li style={{ margin: '8px 0' }}>埼玉大学の関係者（在学生・教職員等）以外の者になりすまして登録・発言する行為。</li>
          <li style={{ margin: '8px 0' }}>他のユーザーや特定の個人、団体に対する誹謗中傷、嫌がらせ、脅迫、または名誉を毀損する行為。</li>
          <li style={{ margin: '8px 0' }}>法令または公序良俗に著しく違反する内容のテキスト、画像の投稿行為。</li>
          <li style={{ margin: '8px 0' }}>スパム、商用目的の過度な宣伝勧誘、およびシステムに過度な負荷をかける自動操作。</li>
        </ul>
      </section>

      <section style={{ margin: '30px 0' }}>
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#111' }}>第4条（免責事項）</h2>
        <p style={{ margin: '8px 0' }}>1. 本サービスに起因してユーザー間、または第三者との間で生じたあらゆる紛争について、運営チームは合理的な範囲で解決をサポートしますが、発生した直接的・間接的な損害について一切の責任を負いません。</p>
        <p style={{ margin: '8px 0' }}>2. ユーザーは自己の責任と負担において本サービスを利用するものとします。</p>
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
