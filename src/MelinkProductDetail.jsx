import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import './LandingPage.css'; // スタイルとカラー定義を再利用
import './MelinkProductDetail.css';

const FadeInSection = ({ children, delay = 0, className = '' }) => {
    const [isVisible, setVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        if (domRef.current) observer.observe(domRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const featureDetails = [
    {
        title: 'CSV自動時間割',
        description: '埼玉大学の学務システムからエクスポートした時間割CSVを読み込むだけで、講義名、教室場所、単位数、教員情報を自動で美しくパースし、あなたの専用時間割を1秒で生成します。',
        meta: 'Smart Parse',
    },
    {
        title: '3Dキャンパスマップ',
        description: 'シラバスや時間割上の教室名と1対1で連動する、埼玉大学キャンパス全体の高精度3Dマップ。現在の授業がある教室の場所へカメラが自動誘導し、迷子を100%防ぎます。',
        meta: '3D Campus Map',
    },
    {
        title: 'リアルタイムバス時刻表',
        description: '埼玉大学発着（北浦和駅・南与野駅・志木駅等）の各系統路線バスの時刻表を、現在の時間とリアルタイムに同期。次の発車予定時刻を最短距離でカウントダウン表示します。',
        meta: 'Transit Terminal',
    },
    {
        title: '混雑状況共有ライブ',
        description: '第一食堂や第二食堂、バス停周辺のリアルタイムな混み具合を、学生同士で「空いている」「普通」「大混雑」などダイナミックに共有・確認できるソーシャルグラフ機能。',
        meta: 'Live Crowd Status',
    },
    {
        title: '匿名の学内コミュニティ',
        description: '学部や学年を明かさずに日常のちょっとした疑問やイベント情報、サークル新歓などを安全に共有・質問しあえる、埼大生限定のプライベート匿名SNS。',
        meta: 'Community Room',
    },
    {
        title: '埼大Wikiノウハウ共有',
        description: '講義の難易度や対策、学内での裏ワザ情報などを Wikipedia スタイルの美しいマークダウン・脚注記述でみんなで編集・蓄積していけるローカル知恵袋。',
        meta: 'Saitama Wiki',
    },
];

const techSpecs = [
    {
        title: 'Canvas高速画像圧縮',
        description: 'コミュニティでの投稿画像は、送信前にブラウザのCanvas APIを駆使して超高速・高画質で自動圧縮。通信制限時でも驚くほど快適でギガに優しい超軽量データ転送を実現します。',
    },
    {
        title: '3D WebGLモデル超軽量化',
        description: '3Dモデリングデータを埼玉大学のエリア構成に合わせてギリギリまでポリゴン削減・テクスチャ最適化。非力なスマホのSafariやChromeでも60FPSで滑らかにマップが動きます。',
    },
    {
        title: 'マルチShift_JISパーサー',
        description: 'ブラウザごとに異なるテキストデコード処理を独自エンジンで制御。Windows/Macどちらからエクスポートした時間割CSVであっても文字化けゼロで完璧にパースします。',
    },
];

export default function MelinkProductDetail() {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="lp-root pd-root">
            <header className="lp-nav pd-nav">
                <div className="pd-nav-left">
                    <Link to="/lp" className="pd-back-btn">
                        <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                        戻る
                    </Link>
                    <span className="pd-nav-divider">|</span>
                    <span className="lp-nav-brand pd-nav-brand">MeLinkアプリ</span>
                </div>

                <Link to="/app" className="lp-nav-cta">
                    アプリを開く
                </Link>
            </header>

            <main>
                {/* HERO */}
                <section className="pd-hero">
                    <FadeInSection>
                        <p className="lp-hero-brand pd-hero-meta">PRODUCT DETAIL — MELINK APP</p>
                    </FadeInSection>
                    <FadeInSection delay={150}>
                        <h1 className="lp-hero-statement-main pd-hero-title">
                            埼大生の日常を、<br className="mobile-only" />ひとつに繋ぐ支援ツール。
                        </h1>
                    </FadeInSection>
                    <FadeInSection delay={250}>
                        <p className="lp-hero-sub pd-hero-desc">
                            MeLink（ミーリンク）は、授業・移動・食事・情報共有をつなぐ埼玉大学専用ライフサポートアプリです。
                            散らばった学内生活の情報を極めて静かで洗練されたUIへと集約し、日々の大学生活をスマートに最適化します。
                        </p>
                    </FadeInSection>
                    <FadeInSection delay={350}>
                        <div className="lp-hero-actions">
                            <Link to="/app" className="lp-btn-top">
                                今すぐアプリを使ってみる
                                <ChevronRight size={14} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }} />
                            </Link>
                        </div>
                    </FadeInSection>
                </section>

                <hr className="lp-section-divider" />

                {/* FEATURE GRID */}
                <section className="lp-section">
                    <FadeInSection>
                        <div className="lp-section-label">01 / Functions</div>
                        <h2 className="lp-section-title">全機能の詳細紹介</h2>
                        <p className="lp-section-desc">
                            MeLinkアプリは、日々のキャンパスライフで感じる小さな「不便」や「迷い」を徹底的に解消するために、細部までこだわり抜いて設計されています。
                        </p>
                    </FadeInSection>

                    <div className="pd-feature-grid">
                        {featureDetails.map((card, index) => (
                            <FadeInSection key={card.title} delay={80 + index * 50}>
                                <div className="pd-feature-card">
                                    <div className="pd-feature-meta">{card.meta}</div>
                                    <h3 className="pd-feature-title">{card.title}</h3>
                                    <p className="pd-feature-desc">{card.description}</p>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </section>

                <hr className="lp-section-divider" />

                {/* VISUAL & INTERFACE DETAIL */}
                <section className="lp-section">
                    <div className="lp-feature-detail" style={{ margin: '0', padding: '0', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
                        <FadeInSection>
                            <div className="lp-feature-detail-text">
                                <div className="lp-section-label">02 / Interface</div>
                                <h2 className="lp-section-title">“わからない”を、少しずつ減らす。</h2>
                                <p className="lp-section-desc">
                                    迷いがちな学期初めや新しい日々の行動を、美しい視覚表現と精細なデータの両方で強力に支援します。
                                    その日の授業スケジュール、次のバス、どこで友達と会うべきか、すべてをひとつのスマートな見た目で直感的に把握できます。
                                </p>
                            </div>
                        </FadeInSection>
                        <FadeInSection delay={120}>
                            <div className="lp-feature-visual" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', minHeight: '280px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.08em' }}>
                                <span>MeLink Live Interface Preview</span>
                            </div>
                        </FadeInSection>
                    </div>
                </section>

                <hr className="lp-section-divider" />

                {/* TECHNOLOGY */}
                <section className="lp-section-gray pd-tech-section">
                    <div className="lp-section-inner">
                        <FadeInSection>
                            <div className="lp-section-label">03 / Technical specs</div>
                            <h2 className="lp-section-title">裏側を支える先端の技術力</h2>
                            <p className="lp-section-desc">
                                目に見えない処理速度やローディングの軽さこそが、最高の使い心地を生み出します。妥協のない最適化技術。
                            </p>
                        </FadeInSection>

                        <div className="lp-tech-grid">
                            {techSpecs.map((card, index) => (
                                <FadeInSection key={card.title} delay={100 + index * 80}>
                                    <article className="lp-tech-card pd-tech-card">
                                        <h3 className="lp-tech-title pd-tech-title">{card.title}</h3>
                                        <p className="lp-tech-desc pd-tech-desc">{card.description}</p>
                                    </article>
                                </FadeInSection>
                            ))}
                        </div>
                    </div>
                </section>

                <hr className="lp-section-divider" />

                {/* CTA */}
                <section className="lp-section" style={{ paddingBottom: 'var(--space-xxl)', paddingTop: 'var(--space-xxl)' }}>
                    <FadeInSection>
                        <div className="lp-section-label">04 / Launch App</div>
                        <h2 className="lp-section-title">MeLinkで、明日からの埼大ライフを快適に。</h2>
                        <p className="lp-section-desc">
                            サインアップは不要です。ログインIDを設定し、時間割CSVを読み込むだけで、あなたの生活は即座にアップグレードされます。
                        </p>
                        <div className="lp-hero-actions" style={{ justifyContent: 'flex-start' }}>
                            <Link to="/app" className="lp-btn-top">
                                MeLinkアプリを開く
                                <ChevronRight size={14} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }} />
                            </Link>
                            <Link to="/lp" className="lp-btn-outline-dark">
                                ランディングページへ戻る
                            </Link>
                        </div>
                    </FadeInSection>
                </section>
            </main>

            <footer className="lp-footer">
                <div className="lp-footer-follow">FOLLOW US</div>
                <div className="lp-footer-social">
                    <a href="#">Instagram</a>
                    <a href="#">X</a>
                    <a href="#">GitHub</a>
                </div>
                <div className="lp-footer-copy">
                    Copyright © {new Date().getFullYear()} MeLink Project. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
