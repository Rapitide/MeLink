// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import IntroPage from './IntroPage';
import MainApp from './MainApp'; // リネームした元々のアプリ
import WikiPage from './WikiPage';
import MelinkProductDetail from './MelinkProductDetail';
import TermsPage from './TermsPage';
import PrivacyPage from './PrivacyPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* イントロページ（ melink.info/ ）の時は IntroPage を表示 */}
                <Route path="/" element={<IntroPage />} />

                {/* ランディングページ（ melink.info/lp ）の時は LandingPage を表示 */}
                <Route path="/lp" element={<LandingPage />} />

                {/* MeLinkアプリ詳細ページ（ melink.info/lp/melink ）の表示 */}
                <Route path="/lp/melink" element={<MelinkProductDetail />} />

                {/* /app （ melink.info/app ）の時は メインアプリ を表示 */}
                <Route path="/app" element={<MainApp />} />

                {/* /wiki （ melink.info/wiki ）の時は WikiPage を表示 */}
                <Route path="/wiki" element={<WikiPage />} />

                {/* 利用規約（ melink.info/terms ） */}
                <Route path="/terms" element={<TermsPage />} />

                {/* プライバシーポリシー（ melink.info/privacy ） */}
                <Route path="/privacy" element={<PrivacyPage />} />
            </Routes>
        </BrowserRouter>
    );
}
