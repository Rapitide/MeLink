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
import AppleAuthDebugPage from './pages/AppleAuthDebugPage';
import LegacyMigrationDebugPage from './pages/LegacyMigrationDebugPage';
import {
    APPLE_AUTH_DEBUG_PATH,
    canUseAppleAuthDebugPage
} from './pages/appleAuthDebugPageModel';
import {
    canUseLegacyMigrationDebugPage,
    LEGACY_MIGRATION_DEBUG_PATH
} from './pages/legacyMigrationDebugPageModel';

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

                {canUseAppleAuthDebugPage && (
                    <Route
                        path={APPLE_AUTH_DEBUG_PATH}
                        element={<AppleAuthDebugPage />}
                    />
                )}

                {canUseLegacyMigrationDebugPage && (
                    <Route
                        path={LEGACY_MIGRATION_DEBUG_PATH}
                        element={<LegacyMigrationDebugPage />}
                    />
                )}
            </Routes>
        </BrowserRouter>
    );
}
