import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';

export default function IntroPage() {
    const [phase, setPhase] = useState('intro_init'); // intro_init, intro_greeting, intro_done, transition, active
    const [typedText, setTypedText] = useState('');
    const fullText = 'はじめまして、MeLinkです。';

    useEffect(() => {
        // マウント直後(50ms後)にすぐさまアイコンの拡大アニメーションを開始
        if (phase === 'intro_init') {
            const timer = setTimeout(() => {
                setPhase('intro_icon_animate');
            }, 50);
            return () => clearTimeout(timer);
        }
        // アイコンが十分に拡大しきった頃合い(マウントから約700ms後)にタイピングを開始
        if (phase === 'intro_icon_animate') {
            const timer = setTimeout(() => {
                setPhase('intro_greeting');
            }, 650);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'intro_greeting') {
            let i = 0;
            const typingInterval = setInterval(() => {
                setTypedText(fullText.slice(0, i + 1));
                i++;
                if (i >= fullText.length) {
                    clearInterval(typingInterval);
                    // タイピング完了後、0.1秒の僅かな余韻で即座にスライドアウトを開始
                    setTimeout(() => {
                        setPhase('transition');
                        // スライドアウトアニメーションの終了後に完全にLPアクティブへ
                        setTimeout(() => {
                            setPhase('active');
                        }, 900);
                    }, 100);
                }
            }, 130); // 丁寧に語りかけるような、少しゆったりとしたタイピング速度
            return () => clearInterval(typingInterval);
        }
    }, [phase, fullText]);

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden bg-[#fafaf9]">
            {/* 背後のLPコンテンツ（最初から背後に描画してスムーズな操作性を確保） */}
            <div className="w-full min-h-screen">
                <LandingPage />
            </div>

            {/* Netflix風のプレミアムオープニングアニメーションオーバーレイ */}
            {phase !== 'active' && (
                <div 
                    className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fafaf9] transition-transform duration-[900ms] ease-[cubic-bezier(0.85,0,0.15,1)] ${
                        phase === 'transition' ? '-translate-y-full' : 'translate-y-0'
                    }`}
                >
                    <div className="flex items-center">
                        {/* MeLink アイコンがにゅるっとスケールポップアップ */}
                        <div 
                            className={`flex-shrink-0 w-14 h-14 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                phase === 'intro_init' ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                            }`}
                        >
                            <img src="/apple-touch-icon.png" alt="MeLink" className="w-full h-full rounded-2xl shadow-lg object-cover" />
                        </div>
                        
                        {/* タイピングテキスト */}
                        <div className="ml-4 md:ml-5 h-10 flex items-center w-[250px] md:w-[280px] text-left">
                            <span className="text-xl md:text-2xl font-bold tracking-wide text-gray-700 whitespace-nowrap font-sans">
                                {typedText}
                                {phase === 'intro_greeting' && typedText.length < fullText.length && (
                                    <span className="inline-block w-[2px] h-6 ml-1 bg-green-500 animate-pulse align-middle" />
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
