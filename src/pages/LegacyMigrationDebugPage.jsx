import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

import { getFirebaseAuth } from '../config/firebaseClient.js';
import { isTestFirebaseEnvironment } from '../config/firebaseConfig.js';
import { featureFlags } from '../config/featureFlags.js';
import { linkLegacyAccount } from '../services/legacyMigrationService.js';
import {
  canUseLegacyMigrationDebugPage,
  getDebugAuthState,
  runLegacyMigrationDebugSubmit
} from './legacyMigrationDebugPageModel.js';

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

export default function LegacyMigrationDebugPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [legacyUserId, setLegacyUserId] = useState('');
  const [legacyPassword, setLegacyPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultStatus, setResultStatus] = useState('idle');
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!canUseLegacyMigrationDebugPage) return undefined;

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  if (!canUseLegacyMigrationDebugPage) {
    return <Navigate to="/" replace />;
  }

  const authState = getDebugAuthState(currentUser);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setIsSubmitting(true);
    setResultMessage('');
    setResultStatus('idle');

    try {
      const result = await runLegacyMigrationDebugSubmit({
        legacyUserId,
        legacyPassword,
        currentUser,
        linkLegacyAccountFn: linkLegacyAccount
      });

      setResultStatus(result.status);
      setResultMessage(result.message);

      if (result.clearPassword) {
        setLegacyPassword('');
      }
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const buttonDisabled = isSubmitting || !authReady || !legacyUserId || !legacyPassword;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800">
            <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Legacy Migration Debug</h1>
            <p className="mt-1 text-sm text-zinc-400">test Firebase + Functions Emulator</p>
          </div>
        </div>

        <section className="mb-6 border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill label="DEV" active={import.meta.env.DEV === true} />
            <StatusPill label="test Firebase" active={isTestFirebaseEnvironment} />
            <StatusPill label="Apple flag" active={featureFlags.appleAuthEnabled} />
            <StatusPill label="Legacy link flag" active={featureFlags.legacyLinkEnabled} />
            <StatusPill label="Authenticated" active={authState.isAuthenticated} />
            <StatusPill label="Apple provider" active={authState.hasAppleProvider} />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="border border-zinc-800 bg-zinc-900 p-5">
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-zinc-200">
              旧ID
              <input
                type="text"
                value={legacyUserId}
                onChange={(event) => setLegacyUserId(event.target.value)}
                autoComplete="username"
                className="h-11 border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100 outline-none focus:border-emerald-400"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-200">
              旧パスワード
              <input
                type="password"
                value={legacyPassword}
                onChange={(event) => setLegacyPassword(event.target.value)}
                autoComplete="current-password"
                className="h-11 border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100 outline-none focus:border-emerald-400"
              />
            </label>

            {!authState.canSubmit && authReady && (
              <div className="flex items-start gap-2 bg-zinc-950 p-3 text-sm text-amber-200" role="status">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                <span>Appleアカウントでログインしてから実行してください。</span>
              </div>
            )}

            {resultMessage && (
              <div
                className={`flex items-start gap-2 p-3 text-sm ${
                  resultStatus === 'success'
                    ? 'bg-emerald-950 text-emerald-100'
                    : 'bg-rose-950 text-rose-100'
                }`}
                role="status"
              >
                {resultStatus === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                )}
                <span>{resultMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={buttonDisabled}
              className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? '連携中' : '旧アカウントを連携'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
