import React, { useState, useRef } from 'react';
import { AlertCircle, User as UserIcon, AtSign, Lock, Eye, EyeOff, Loader2, X, Camera, ArrowLeft } from 'lucide-react';
import { compressImage } from './utils';
import { TermsModal } from './Modals';

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
  setIsTermsModalOpen
}) {
  const [authStep, setAuthStep] = useState('start'); // start, login, signup_name, signup_id, signup_password, signup_avatar
  const [termsTab, setTermsTab] = useState('terms');
  const avatarInputRef = useRef(null);

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
