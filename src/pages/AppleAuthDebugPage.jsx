import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, CheckCircle2, Loader2, LogOut, ShieldCheck } from 'lucide-react';

import { getFirebaseAuth } from '../config/firebaseClient.js';
import { isTestFirebaseEnvironment } from '../config/firebaseConfig.js';
import { featureFlags } from '../config/featureFlags.js';
import { signInWithApplePopup } from '../services/appleAuth.js';
import { LEGACY_MIGRATION_DEBUG_PATH } from './legacyMigrationDebugPageModel.js';
import {
  canUseAppleAuthDebugPage,
  getAppleAuthDebugState,
  maskUid,
  toAppleAuthDebugResult
} from './appleAuthDebugPageModel.js';

const StatusPill = ({ label, active }) => (
  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
    active
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-zinc-200 text-zinc-700'
  }`}
  >
    <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
    {label}
  </span>
);

export default function AppleAuthDebugPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('idle');
  const signInInFlightRef = useRef(false);

  useEffect(() => {
    if (!canUseAppleAuthDebugPage) return undefined;

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  if (!canUseAppleAuthDebugPage) {
    return <Navigate to="/" replace />;
  }

  const authState = getAppleAuthDebugState(currentUser);
  const maskedUid = maskUid(currentUser?.uid);

  const handleAppleSignIn = async () => {
    if (signInInFlightRef.current) return;

    signInInFlightRef.current = true;
    setIsSigningIn(true);
    setStatusMessage('');
    setStatusType('idle');

    try {
      const result = toAppleAuthDebugResult(await signInWithApplePopup());
      setStatusType(result.status);
      setStatusMessage(result.message);
    } finally {
      signInInFlightRef.current = false;
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setStatusMessage('');
    setStatusType('idle');

    try {
      await signOut(getFirebaseAuth());
      setStatusType('info');
      setStatusMessage('ログアウトしました。');
    } catch {
      setStatusType('error');
      setStatusMessage('ログアウトに失敗しました。');
    } finally {
      setIsSigningOut(false);
    }
  };

  const signInDisabled = !authReady || isSigningIn;
  const signOutDisabled = !authReady || isSigningOut || !authState.isAuthenticated;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800">
            <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Apple Auth Debug</h1>
            <p className="mt-1 text-sm text-zinc-400">test Firebase + Authentication Emulator</p>
          </div>
        </div>

        <section className="mb-6 border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill label="DEV" active={import.meta.env.DEV === true} />
            <StatusPill label="test Firebase" active={isTestFirebaseEnvironment} />
            <StatusPill label="Apple flag" active={featureFlags.appleAuthEnabled} />
            <StatusPill label="Authenticated" active={authState.isAuthenticated} />
            <StatusPill label="Anonymous" active={authState.isAnonymous} />
            <StatusPill label="Apple provider" active={authState.hasAppleProvider} />
          </div>

          <dl className="mt-5 grid gap-3 text-sm text-zinc-300">
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <dt>認証状態</dt>
              <dd>{authState.isAuthenticated ? '認証済み' : '未認証'}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <dt>anonymous</dt>
              <dd>{authState.isAnonymous ? 'true' : 'false'}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <dt>apple.com provider</dt>
              <dd>{authState.hasAppleProvider ? 'あり' : 'なし'}</dd>
            </div>
            {maskedUid && (
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <dt>uid</dt>
                <dd>{maskedUid}</dd>
              </div>
            )}
          </dl>
        </section>

        {statusMessage && (
          <div
            className={`mb-5 flex items-start gap-2 p-3 text-sm ${
              statusType === 'success'
                ? 'bg-emerald-950 text-emerald-100'
                : statusType === 'info'
                  ? 'bg-zinc-900 text-zinc-200'
                  : 'bg-rose-950 text-rose-100'
            }`}
            role="status"
          >
            {statusType === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={signInDisabled}
            className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isSigningIn && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSigningIn ? 'サインイン中' : 'Appleでサインイン'}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOutDisabled}
            className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}
            ログアウト
          </button>
        </div>

        <div className="mt-5 border border-zinc-800 bg-zinc-900 p-4 text-sm">
          {authState.canOpenLegacyMigration ? (
            <Link
              to={LEGACY_MIGRATION_DEBUG_PATH}
              className="inline-flex h-10 items-center justify-center bg-zinc-100 px-4 font-semibold text-zinc-950 transition hover:bg-white"
            >
              旧アカウント連携画面へ進む
            </Link>
          ) : (
            <p className="text-zinc-400">Appleログイン後に旧アカウント連携画面へ進めます。</p>
          )}
        </div>
      </div>
    </main>
  );
}
