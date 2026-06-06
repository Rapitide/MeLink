import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const XIcon = ({ size = 24, ...props }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const GithubIcon = ({ size = 24, ...props }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
);

const newsItems = [
    {
        date: '2026/3/30',
        title: 'Webアプリ「MeLink」 リリース',
    },
];

export default function LandingPage() {
    return (
        <div className="simple-lp">
            <header className="simple-header">
                <h1>MeLink Project</h1>
            </header>

            <main>
                {/* 1. 最新情報 */}
                <section className="simple-section">
                    <h2>最新情報</h2>
                    <ul className="news-list">
                        {newsItems.map((item, index) => (
                            <li key={index} className="news-item">
                                <span className="news-date">{item.date}</span>
                                <span className="news-title">{item.title}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 2. 制作物 */}
                <section className="simple-section">
                    <h2>制作物</h2>
                    <div className="product-card" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 16px' }}>
                        <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                            <img 
                                src="/apple-touch-icon.png" 
                                alt="MeLink Icon" 
                                style={{ width: '48px', height: '48px', borderRadius: '10px', border: '1px solid #e5e7eb' }} 
                            />
                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#111111' }}>MeLink</span>
                        </Link>
                    </div>
                </section>

                {/* 3. お問い合わせ */}
                <section className="simple-section">
                    <h2>お問い合わせ</h2>
                    <p className="contact-desc">
                        MeLink Projectへのご意見・ご要望、バグ報告、コラボのご提案などは、公式XのDMにて受け付けております。
                    </p>
                    <div className="sns-icons">
                        <a href="https://x.com/MeLink_PR" target="_blank" rel="noopener noreferrer" aria-label="X">
                            <XIcon size={24} />
                        </a>
                        <a href="https://github.com/Rapitide" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                            <GithubIcon size={24} />
                        </a>
                    </div>
                </section>
            </main>

            <footer className="simple-footer">
                <p>Copyright &copy; {new Date().getFullYear()} MeLink Project. All rights reserved.</p>
            </footer>
        </div>
    );
}
