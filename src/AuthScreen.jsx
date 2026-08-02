import React, { useState, useRef } from 'react';
import { AlertCircle, User as UserIcon, AtSign, Lock, Eye, EyeOff, Loader2, X, Camera, ArrowLeft } from 'lucide-react';
import { compressImage } from './utils';
import { TermsModal } from './Modals';
import { featureFlags } from './config/featureFlags';
import { signInWithApplePopup } from './services/appleAuth';
import { linkLegacyAccount } from './services/legacyMigrationService';
import {
  completeInitialAppleUserProfile,
  ensureAppleUserProfile,
  validateInitialProfileInput
} from './services/userProfileService';
import {
  runLegacyMigrationPromptSubmit,
  shouldShowLegacyMigrationPrompt
} from './pages/legacyMigrationPromptModel';

export default function AuthScreen({
  isDark,
  renderStyle,
  errorMessage,
  setErrorMessage,
  isSignUp,
  setIsSignUp,
  handleSignUp,
  handleSignIn,
  loginForm,
  setLoginForm,
  showPassword,
  setShowPassword,
  user,
  isSubmitting,
  isTermsModalOpen,
  setIsTermsModalOpen,
  onAppleAuthComplete
}) {
  const [authStep, setAuthStep] = useState('start'); // start, login, signup_name, signup_id, signup_password, signup_avatar
  const [termsTab, setTermsTab] = useState('terms');
  const [appleSignInMessage, setAppleSignInMessage] = useState('');
  const [appleSignInResult, setAppleSignInResult] = useState(null);
  const [appleProfileResult, setAppleProfileResult] = useState(null);
  const [appleSetupForm, setAppleSetupForm] = useState({ displayName: '', handle: '' });
  const [appleSetupError, setAppleSetupError] = useState('');
  const [appleLegacyForm, setAppleLegacyForm] = useState({ legacyUserId: '', legacyPassword: '' });
  const [appleLegacyMessage, setAppleLegacyMessage] = useState('');
  const [appleLegacyError, setAppleLegacyError] = useState('');
  const [isAppleSignInLoading, setIsAppleSignInLoading] = useState(false);
  const [isAppleProfileSaving, setIsAppleProfileSaving] = useState(false);
  const [isAppleLegacyLinking, setIsAppleLegacyLinking] = useState(false);
  const avatarInputRef = useRef(null);
  const appleSignInInFlightRef = useRef(false);
  const appleProfileSaveInFlightRef = useRef(false);
  const appleLegacyLinkInFlightRef = useRef(false);
  const appleAuthCompleteInFlightRef = useRef(false);
  const showAppleSignIn = featureFlags.appleAuthEnabled;
  const showLegacyMigrationPrompt = (profileResult) => shouldShowLegacyMigrationPrompt({ profileResult });

  const nextStep = (step) => {
    setErrorMessage('');
    setAuthStep(step);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("画像サイズが大きすぎます(10MB以下)");
        return;
      }
      const compressedDataUrl = await compressImage(file, 200, 0.5);
      setLoginForm({ ...loginForm, avatarUrl: compressedDataUrl });
    }
  };

  const completeAppleAuth = (profileResult) => {
    if (appleAuthCompleteInFlightRef.current) return;
    if (profileResult?.status !== 'success' || profileResult.profileSetupCompleted !== true) return;
    if (typeof onAppleAuthComplete !== 'function') {
      setAuthStep('apple_profile_done');
      return;
    }

    appleAuthCompleteInFlightRef.current = true;
    onAppleAuthComplete({
      uid: profileResult.uid,
      displayName: profileResult.displayName,
      handle: profileResult.handle,
      legacyUserId: profileResult.legacyUserId || null,
      hasLegacyUserId: profileResult.hasLegacyUserId === true,
      profileSetupCompleted: true
    });
  };

  const handleAppleSignInClick = async () => {
    if (appleSignInInFlightRef.current) return;

    appleSignInInFlightRef.current = true;
    setErrorMessage('');
    setAppleSignInMessage('');
    setAppleSignInResult(null);
    setAppleProfileResult(null);
    setAppleSetupError('');
    setAppleLegacyForm({ legacyUserId: '', legacyPassword: '' });
    setAppleLegacyMessage('');
    setAppleLegacyError('');
    setIsAppleSignInLoading(true);

    try {
      const result = await signInWithApplePopup();

      if (result.status === 'success') {
        setAppleSignInResult(result);
        const profileResult = await ensureAppleUserProfile({
          uid: result.uid,
          providerId: result.providerId
        });

        setAppleProfileResult(profileResult);

        if (profileResult.status === 'success') {
          if (showLegacyMigrationPrompt(profileResult)) {
            setAppleSignInMessage('Appleログインとプロフィール設定が完了しています。旧アカウントを連携できます。');
            setAuthStep('apple_legacy_prompt');
          } else if (profileResult.profileSetupCompleted) {
            completeAppleAuth(profileResult);
          } else {
            setAppleSignInMessage('Appleログイン成功・プロフィール初期化成功。初回プロフィールを設定してください。');
            setAuthStep('apple_profile_setup');
          }
        } else {
          setAppleSignInMessage('Appleログイン成功・プロフィール初期化失敗。Firebase Authログイン自体は成功済みです。');
        }
      } else if (result.status === 'cancelled') {
        setAppleSignInMessage('Appleでサインインをキャンセルしました。');
      } else if (result.status === 'popup_unavailable') {
        setAppleSignInMessage('ポップアップを開けませんでした。リダイレクト方式へ切り替えられる構造で実装済みです。');
      } else if (result.status === 'disabled') {
        setAppleSignInMessage('AppleログインはテストFirebase環境でのみ有効です。');
      } else {
        setErrorMessage('Appleでサインインに失敗しました。時間をおいて再度お試しください。');
      }
    } catch (error) {
      setErrorMessage('Appleでサインインに失敗しました。時間をおいて再度お試しください。');
    } finally {
      appleSignInInFlightRef.current = false;
      setIsAppleSignInLoading(false);
    }
  };

  const handleAppleProfileSubmit = async (e) => {
    e.preventDefault();
    if (appleProfileSaveInFlightRef.current || !appleSignInResult?.uid) return;

    const validation = validateInitialProfileInput(appleSetupForm);
    if (!validation.isValid) {
      setAppleSetupError(validation.message);
      return;
    }

    appleProfileSaveInFlightRef.current = true;
    setIsAppleProfileSaving(true);
    setAppleSetupError('');

    try {
      const result = await completeInitialAppleUserProfile({
        uid: appleSignInResult.uid,
        providerId: appleSignInResult.providerId,
        displayName: appleSetupForm.displayName,
        handle: appleSetupForm.handle
      });

      if (result.status === 'success') {
        setAppleProfileResult(result);
        if (showLegacyMigrationPrompt(result)) {
          setAppleSignInMessage('プロフィール設定が完了しました。旧アカウントを連携できます。');
          setAuthStep('apple_legacy_prompt');
        } else {
          completeAppleAuth(result);
        }
      } else if (result.status === 'handle_taken') {
        setAppleSetupError('このIDはすでに使われています。');
      } else if (result.status === 'validation_error') {
        setAppleSetupError(result.message);
      } else if (result.status === 'disabled') {
        setAppleSetupError('プロフィール設定はテストFirebase環境でのみ有効です。');
      } else if (result.status === 'missing_profile') {
        setAppleSetupError('プロフィールの初期化が完了していません。もう一度Appleログインからお試しください。');
      } else {
        setAppleSetupError('プロフィール設定の保存に失敗しました。時間をおいて再度お試しください。');
      }
    } catch (error) {
      setAppleSetupError('プロフィール設定の保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      appleProfileSaveInFlightRef.current = false;
      setIsAppleProfileSaving(false);
    }
  };

  const handleAppleLegacySubmit = async (e) => {
    e.preventDefault();
    if (appleLegacyLinkInFlightRef.current) return;

    appleLegacyLinkInFlightRef.current = true;
    setIsAppleLegacyLinking(true);
    setAppleLegacyMessage('');
    setAppleLegacyError('');

    try {
      const result = await runLegacyMigrationPromptSubmit({
        legacyUserId: appleLegacyForm.legacyUserId,
        legacyPassword: appleLegacyForm.legacyPassword,
        linkLegacyAccountFn: linkLegacyAccount
      });

      if (result.status === 'success') {
        setAppleLegacyForm({ legacyUserId: result.legacyUserId || '', legacyPassword: '' });
        setAppleLegacyMessage(result.message);
        setAppleProfileResult((current) => current?.status === 'success'
          ? { ...current, hasLegacyUserId: true }
          : current);
        completeAppleAuth({
          ...appleProfileResult,
          status: 'success',
          legacyUserId: result.legacyUserId || appleProfileResult?.legacyUserId || null,
          hasLegacyUserId: true
        });
      } else {
        if (result.clearPassword) {
          setAppleLegacyForm((current) => ({ ...current, legacyPassword: '' }));
        }
        setAppleLegacyError(result.message);
      }
    } catch (error) {
      setAppleLegacyError('一時的なエラーが発生しました。');
    } finally {
      appleLegacyLinkInFlightRef.current = false;
      setIsAppleLegacyLinking(false);
    }
  };

  const renderAppleSignInEntry = () => {
    if (!showAppleSignIn) return null;

    return (
      <div className="space-y-2">
        <button
          type="button"
          aria-label="Appleでサインイン"
          aria-busy={isAppleSignInLoading}
          disabled={isAppleSignInLoading}
          onClick={handleAppleSignInClick}
          className="w-full bg-gray-950 border border-gray-700 text-white font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isAppleSignInLoading ? <Loader2 size={20} className="animate-spin" /> : <span>Appleでサインイン</span>}
        </button>
        {appleSignInMessage && (
          <p role="status" className="text-center text-xs text-gray-400 leading-relaxed">
            {appleSignInMessage}
          </p>
        )}
        {renderAppleProfileResult()}
      </div>
    );
  };

  const renderStart = () => (
    <div className="space-y-6">
      <button
        onClick={() => {
          setIsSignUp(true);
          nextStep('signup_name');
        }}
        className="w-full bg-white text-black font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-200"
      >
        新しいアカウントを作成
      </button>
      <div className="flex items-center justify-center space-x-4">
        <div className="h-[1px] bg-gray-800 flex-grow"></div>
        <span className="text-gray-500 text-sm">または</span>
        <div className="h-[1px] bg-gray-800 flex-grow"></div>
      </div>
      {renderAppleSignInEntry()}
      <button
        onClick={() => {
          setIsSignUp(false);
          nextStep('login');
        }}
        className="w-full bg-transparent border border-gray-700 text-white font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-900"
      >
        既存のアカウントでログイン
      </button>
    </div>
  );

  const renderAppleProfileResult = () => {
    if (!appleSignInResult) return null;

    return (
      <dl className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs text-gray-300 space-y-1">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500">uid</dt>
          <dd className="font-mono text-right break-all">{appleSignInResult.uid}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500">providerId</dt>
          <dd className="font-mono">{appleSignInResult.providerId}</dd>
        </div>
        {appleSignInResult.displayName && (
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">displayName</dt>
            <dd className="text-right break-all">{appleSignInResult.displayName}</dd>
          </div>
        )}
        {typeof appleSignInResult.isNewUser === 'boolean' && (
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">isNewUser</dt>
            <dd className="font-mono">{String(appleSignInResult.isNewUser)}</dd>
          </div>
        )}
        {appleProfileResult?.status === 'success' && (
          <>
            {appleProfileResult.displayName && (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">profileDisplayName</dt>
                <dd className="text-right break-all">{appleProfileResult.displayName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">handle</dt>
              <dd className="font-mono">@{appleProfileResult.handle || '未設定'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">isNewProfile</dt>
              <dd className="font-mono">{String(appleProfileResult.isNewProfile)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">profileSetupCompleted</dt>
              <dd className="font-mono">{String(appleProfileResult.profileSetupCompleted)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">hasLegacyUserId</dt>
              <dd className="font-mono">{String(appleProfileResult.hasLegacyUserId)}</dd>
            </div>
          </>
        )}
        {appleProfileResult && appleProfileResult.status !== 'success' && (
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">profileStatus</dt>
            <dd className="font-mono">{appleProfileResult.status}</dd>
          </div>
        )}
      </dl>
    );
  };

  const renderAppleProfileSetup = () => (
    <form onSubmit={handleAppleProfileSubmit} className="space-y-5">
      <div className="flex items-center">
        <button type="button" onClick={() => nextStep('start')} className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold ml-2">プロフィール設定</h2>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-300" htmlFor="apple-display-name">表示名</label>
        <input
          id="apple-display-name"
          type="text"
          className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl outline-none text-base placeholder-gray-500 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="表示名"
          value={appleSetupForm.displayName}
          onChange={e => setAppleSetupForm({ ...appleSetupForm, displayName: e.target.value })}
          maxLength={30}
          disabled={isAppleProfileSaving}
        />
        <p className="text-xs text-gray-500">1〜30文字。前後の空白は保存時に除去します。</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-300" htmlFor="apple-handle">ユーザーID</label>
        <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
          <span className="pl-4 text-gray-500">@</span>
          <input
            id="apple-handle"
            type="text"
            className="w-full p-4 pl-1 bg-transparent outline-none text-base placeholder-gray-500 text-white"
            placeholder="melink_user"
            value={appleSetupForm.handle}
            onChange={e => setAppleSetupForm({ ...appleSetupForm, handle: e.target.value.replace(/^@+/, '').toLowerCase() })}
            minLength={3}
            maxLength={20}
            disabled={isAppleProfileSaving}
          />
        </div>
        <p className="text-xs text-gray-500">3〜20文字。英小文字・数字・_のみ。先頭/末尾/_の連続は不可。</p>
      </div>
      {appleSetupError && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
          {appleSetupError}
        </p>
      )}
      <button
        type="submit"
        disabled={isAppleProfileSaving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold py-3.5 rounded-full text-base transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAppleProfileSaving ? <Loader2 size={20} className="animate-spin" /> : <span>保存する</span>}
      </button>
    </form>
  );

  const renderAppleLegacyPrompt = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">旧アカウントを連携しますか？</h2>
        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
          以前のIDとパスワードを確認して、旧アカウントをAppleログインに連携できます。あとで行うこともできます。
        </p>
      </div>
      {appleSignInMessage && (
        <p role="status" className="rounded-xl border border-green-800 bg-green-900/20 p-3 text-sm text-green-300">
          {appleSignInMessage}
        </p>
      )}
      {renderAppleProfileResult()}
      <button
        type="button"
        onClick={() => {
          setAppleLegacyError('');
          setAppleLegacyMessage('');
          setAuthStep('apple_legacy_form');
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold py-3.5 rounded-full text-base transition-colors"
      >
        旧アカウントを連携する
      </button>
      <button
        type="button"
        onClick={() => {
          setAppleLegacyForm({ legacyUserId: '', legacyPassword: '' });
          setAppleLegacyError('');
          setAppleLegacyMessage('');
          setAppleSignInMessage('旧アカウント連携はあとで行えます。');
          completeAppleAuth(appleProfileResult);
        }}
        className="w-full bg-transparent border border-gray-700 text-white font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-900"
      >
        あとで行う
      </button>
    </div>
  );

  const renderAppleLegacyForm = () => (
    <form onSubmit={handleAppleLegacySubmit} className="space-y-5">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => {
            if (isAppleLegacyLinking) return;
            setAppleLegacyError('');
            setAuthStep('apple_legacy_prompt');
          }}
          className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400"
          disabled={isAppleLegacyLinking}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold ml-2">旧アカウント連携</h2>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-300" htmlFor="legacy-user-id">旧ID</label>
        <input
          id="legacy-user-id"
          type="text"
          autoComplete="username"
          className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl outline-none text-base placeholder-gray-500 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="testuser"
          value={appleLegacyForm.legacyUserId}
          onChange={e => setAppleLegacyForm({ ...appleLegacyForm, legacyUserId: e.target.value })}
          disabled={isAppleLegacyLinking}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-300" htmlFor="legacy-password">旧パスワード</label>
        <input
          id="legacy-password"
          type="password"
          autoComplete="current-password"
          className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl outline-none text-base placeholder-gray-500 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={appleLegacyForm.legacyPassword}
          onChange={e => setAppleLegacyForm({ ...appleLegacyForm, legacyPassword: e.target.value })}
          disabled={isAppleLegacyLinking}
        />
        <p className="text-xs text-gray-500">パスワードは保存されず、連携確認のためだけに送信されます。</p>
      </div>
      {appleLegacyError && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
          {appleLegacyError}
        </p>
      )}
      <button
        type="submit"
        disabled={isAppleLegacyLinking || !appleLegacyForm.legacyUserId || !appleLegacyForm.legacyPassword}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold py-3.5 rounded-full text-base transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAppleLegacyLinking ? <Loader2 size={20} className="animate-spin" /> : <span>連携する</span>}
      </button>
      <button
        type="button"
        onClick={() => {
          if (isAppleLegacyLinking) return;
          setAppleLegacyForm({ legacyUserId: '', legacyPassword: '' });
          setAppleLegacyError('');
          setAppleSignInMessage('旧アカウント連携はあとで行えます。');
          completeAppleAuth(appleProfileResult);
        }}
        disabled={isAppleLegacyLinking}
        className="w-full bg-transparent border border-gray-700 text-white font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-900 disabled:opacity-50"
      >
        あとで行う
      </button>
    </form>
  );

  const renderAppleProfileDone = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">プロフィール設定完了</h2>
        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
          保存成功後の開発用確認表示です。既存アカウントや投稿データにはまだ接続していません。
        </p>
      </div>
      {appleSignInMessage && (
        <p role="status" className="rounded-xl border border-green-800 bg-green-900/20 p-3 text-sm text-green-300">
          {appleSignInMessage}
        </p>
      )}
      {appleLegacyMessage && (
        <p role="status" className="rounded-xl border border-green-800 bg-green-900/20 p-3 text-sm text-green-300">
          {appleLegacyMessage}
        </p>
      )}
      {renderAppleProfileResult()}
      <button
        type="button"
        onClick={() => nextStep('start')}
        className="w-full bg-transparent border border-gray-700 text-white font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-900"
      >
        ログイン画面へ戻る
      </button>
    </div>
  );

  const renderLogin = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="flex items-center mb-6">
        <button type="button" onClick={() => nextStep('start')} className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold ml-2">ログイン</h2>
      </div>
      <div className="relative border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-colors bg-gray-900">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><AtSign size={20} /></div>
        <input type="text" placeholder="ユーザーID（半角英数字）" className="w-full p-4 pl-12 bg-transparent outline-none text-base placeholder-gray-500 text-white" required value={loginForm.userId} onChange={e => setLoginForm({ ...loginForm, userId: e.target.value.toLowerCase().replace(/\s/g, '') })} />
      </div>
      <div className="relative border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-colors bg-gray-900">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Lock size={20} /></div>
        <input type={showPassword ? "text" : "password"} placeholder="パスワード（半角英数字）" className="w-full p-4 pl-12 pr-12 bg-transparent outline-none text-base placeholder-gray-500 text-white" required value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
      </div>
      <div className="flex items-center py-2">
        <label className="flex items-center cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-blue-500 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 focus:ring-2 mr-2" checked={loginForm.rememberMe} onChange={e => setLoginForm({ ...loginForm, rememberMe: e.target.checked })} />
          <span className="text-sm text-gray-400">ログイン情報を保存する</span>
        </label>
      </div>
      <button disabled={!user || isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold py-3.5 rounded-full text-base transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mt-4">
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <span>ログイン</span>}
      </button>
    </form>
  );

  const renderSignupName = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <button type="button" onClick={() => nextStep('start')} className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold ml-2">ニックネームを決めよう！</h2>
      </div>
      <div className="relative border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-colors bg-gray-900">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><UserIcon size={20} /></div>
        <input type="text" placeholder="ニックネーム（例：めりんく）" className="w-full p-4 pl-12 bg-transparent outline-none text-base placeholder-gray-500 text-white" required value={loginForm.name} onChange={e => setLoginForm({ ...loginForm, name: e.target.value })} />
      </div>
      <button
        disabled={!loginForm.name}
        onClick={() => nextStep('signup_id')}
        className="w-full bg-white text-black font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-200 disabled:opacity-50"
      >
        続ける
      </button>
    </div>
  );

  const renderSignupId = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <button type="button" onClick={() => nextStep('signup_name')} className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold ml-2">ユーザー名を決めよう！</h2>
      </div>
      <div className="relative border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-colors bg-gray-900">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><AtSign size={20} /></div>
        <input type="text" placeholder="ユーザーID（半角英数字）" className="w-full p-4 pl-12 bg-transparent outline-none text-base placeholder-gray-500 text-white" required value={loginForm.userId} onChange={e => setLoginForm({ ...loginForm, userId: e.target.value.toLowerCase().replace(/\s/g, '') })} />
      </div>
      <button
        disabled={!loginForm.userId}
        onClick={() => nextStep('signup_password')}
        className="w-full bg-white text-black font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-200 disabled:opacity-50"
      >
        続ける
      </button>
    </div>
  );

  const renderSignupPassword = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <button type="button" onClick={() => nextStep('signup_id')} className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <div className="ml-2">
          <h2 className="text-xl font-bold">パスワードを決めよう！</h2>
          <p className="text-xs text-gray-400">再ログインするときに必要！</p>
        </div>
      </div>
      <div className="relative border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden transition-colors bg-gray-900">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Lock size={20} /></div>
        <input type={showPassword ? "text" : "password"} placeholder="パスワード（半角英数字）" className="w-full p-4 pl-12 pr-12 bg-transparent outline-none text-base placeholder-gray-500 text-white" required value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
      </div>
      <div className="text-xs text-gray-400 mt-2 bg-gray-900 p-3 rounded-lg border border-gray-800">
        お試し版のため、普段使っているパスワードは入力しないでください。
      </div>
      <div className="flex items-center py-2">
        <label className="flex items-center cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-blue-500 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 focus:ring-2 mr-2" checked={loginForm.rememberMe} onChange={e => setLoginForm({ ...loginForm, rememberMe: e.target.checked })} />
          <span className="text-sm text-gray-400">ログイン情報を保存する</span>
        </label>
      </div>
      <button
        disabled={!loginForm.password}
        onClick={() => nextStep('signup_avatar')}
        className="w-full bg-white text-black font-bold py-3.5 rounded-full text-base transition-colors hover:bg-gray-200 disabled:opacity-50"
      >
        続ける
      </button>
    </div>
  );

  const renderSignupAvatar = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <button type="button" onClick={() => nextStep('signup_password')} className="p-2 -ml-2 hover:bg-gray-900 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold ml-2">プロフィール画像を決めよう！</h2>
      </div>
      <div className="flex flex-col items-center py-4">
        <div 
          onClick={() => avatarInputRef.current.click()}
          className="w-32 h-32 rounded-xl bg-gray-800 flex items-center justify-center cursor-pointer overflow-hidden relative group"
        >
          {loginForm.avatarUrl ? (
            <img src={loginForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
              <Camera size={40} />
              <span className="text-xs mt-2">画像をアップ</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={24} className="text-white" />
          </div>
        </div>
        <input 
          type="file" 
          ref={avatarInputRef} 
          onChange={handleAvatarChange} 
          className="hidden" 
          accept="image/*" 
        />
        <p className="text-xs text-gray-500 mt-4">あとから変更することもできます</p>
      </div>
      <button
        onClick={handleSignUp}
        disabled={!user || isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold py-3.5 rounded-full text-base transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mt-4 active:scale-95 shadow-md hover:shadow-lg"
      >
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <span>同意してアカウントを作成</span>}
      </button>
      <p className="text-center text-xs text-gray-500 mt-4 select-none leading-normal font-medium">
        アカウントを作成することで、
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 font-bold hover:underline mx-0.5"
        >
          利用規約
        </a>
        および
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 font-bold hover:underline mx-0.5"
        >
          プライバシーポリシー
        </a>
        に同意したものとみなされます。
      </p>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${!isDark ? 'theme-light' : ''}`}>
      {renderStyle()}
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-white">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight mt-8">MeLink</h1>
          <h2 className="text-sm text-center text-gray-400 mb-8">埼大生の「今」がわかる、つながる。</h2>

          {errorMessage && (
            <div className="bg-red-900/30 text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-800">
              <div className="flex items-center space-x-2 font-semibold mb-1"><AlertCircle size={18} /><span>エラー</span></div>
              <p>{errorMessage}</p>
            </div>
          )}

          {authStep === 'start' && renderStart()}
          {authStep === 'login' && renderLogin()}
          {authStep === 'signup_name' && renderSignupName()}
          {authStep === 'signup_id' && renderSignupId()}
          {authStep === 'signup_password' && renderSignupPassword()}
          {authStep === 'signup_avatar' && renderSignupAvatar()}
          {authStep === 'apple_profile_setup' && renderAppleProfileSetup()}
          {authStep === 'apple_legacy_prompt' && renderAppleLegacyPrompt()}
          {authStep === 'apple_legacy_form' && renderAppleLegacyForm()}
          {authStep === 'apple_profile_done' && renderAppleProfileDone()}
        </div>

        {/* Terms Modal */}
        <TermsModal 
          isOpen={isTermsModalOpen} 
          onClose={() => setIsTermsModalOpen(false)} 
          initialTab={termsTab} 
        />
      </div>
    </div>
  );
}
