import React, { useState, useEffect } from 'react';
import { X, BadgeCheck, Loader2, Hash, CheckCircle, Edit2, Camera, ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';

// ==============================================================
// 1. バッジ詳細モーダル
// ==============================================================
export const BadgeModal = ({ isOpen, type, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-6 text-center relative border border-gray-800" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-gray-400 hover:bg-gray-800 rounded-full"><X size={20} /></button>
        {type === 'admin' ? (
          <><BadgeCheck size={48} className="mx-auto text-black fill-yellow-500 mb-3" /><h2 className="text-lg font-bold mb-2 text-white">公式運営チーム</h2><p className="text-sm text-gray-400 mb-4">MeLinkの開発・運営メンバーです。</p></>
        ) : type === 'veteran' ? (
          <><BadgeCheck size={48} className="mx-auto text-black fill-blue-500 mb-3" /><h2 className="text-lg font-bold mb-2 text-white">Pioneer</h2><p className="text-sm text-gray-400 mb-4">初期メンバーの証です。</p></>
        ) : (
          <><BadgeCheck size={48} className="mx-auto text-black fill-pink-500 mb-3" /><h2 className="text-lg font-bold mb-2 text-white">名付け親</h2><p className="text-sm text-gray-400 mb-4">MeLinkの名称考案者です。</p></>
        )}
        <button onClick={onClose} className="w-full py-2 bg-gray-800 text-white hover:bg-gray-700 rounded-full font-bold transition-colors">閉じる</button>
      </div>
    </div>
  );
};

// ==============================================================
// 2. フォロー・フォロワー一覧モーダル
// ==============================================================
export const FollowListModal = ({ isOpen, title, users, isLoading, onClose, onUserClick, currentAccountId, following, onToggleFollow, Avatar }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-md rounded-2xl flex flex-col max-h-[70vh] border border-gray-800 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <button onClick={onClose} className="p-2 -ml-2 mr-2 hover:bg-gray-800 rounded-full text-gray-400"><X size={20} /></button>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <div className="flex-grow overflow-y-auto p-2">
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div> : users.length === 0 ? <div className="text-center text-gray-500 p-8">ユーザーがいません</div> : (
            <div>
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-800 transition-colors cursor-pointer rounded-lg" onClick={() => { onClose(); onUserClick(u.id); }}>
                  <div className="flex items-center space-x-3"><Avatar src={u.avatarUrl} color={u.avatarColor} name={u.name} /><div><p className="font-bold text-sm text-white hover:underline">{u.name}</p><p className="text-gray-400 text-sm">@{u.id}</p></div></div>
                  {u.id !== currentAccountId && <button onClick={(e) => { onToggleFollow(u.id, e); }} className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${following[u.id] ? 'border-gray-600 text-white hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/30' : 'bg-white text-black hover:bg-gray-200'}`}>{following[u.id] ? 'フォロー中' : 'フォロー'}</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 3. 掲示板（トークルーム）切り替えモーダル
// ==============================================================
export const RoomModal = ({ isOpen, availableRooms, currentRoomId, isAdmin, onSwitchRoom, onRenameRoom, onRemoveRoom, onClose, newRoomForm, setNewRoomForm, onCreateRoom }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-md rounded-2xl flex flex-col max-h-[80vh] border border-gray-800 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <button onClick={onClose} className="p-2 -ml-2 mr-2 hover:bg-gray-800 rounded-full text-gray-400"><X size={20} /></button>
          <h2 className="text-lg font-bold">掲示板の切り替え</h2>
        </div>
        <div className="flex-grow overflow-y-auto p-4">
          <div className="space-y-1 mb-6">
            {availableRooms.map(room => (
              <div key={room} onClick={() => onSwitchRoom(room)} className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${currentRoomId === room ? 'bg-blue-900/30 text-blue-400' : 'hover:bg-gray-800 text-gray-200'}`}>
                <span className="font-semibold flex items-center"><Hash size={18} className="mr-2 opacity-50" />{room}</span>
                <div className="flex items-center">
                  {currentRoomId === room && <CheckCircle size={18} className="mr-2" />}
                  {isAdmin && <><button onClick={(e) => { e.stopPropagation(); onRenameRoom(room); }} className="p-1.5 text-gray-400 hover:text-blue-400 rounded-full"><Edit2 size={16} /></button>{room !== '埼玉大学全体' && <button onClick={(e) => { e.stopPropagation(); onRemoveRoom(room); }} className="p-1.5 text-gray-400 hover:text-red-400 rounded-full"><X size={16} /></button>}</>}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-3">一覧にない掲示板は、名前（合言葉）を入力して作成できます。</p>
            <form onSubmit={onCreateRoom} className="space-y-3">
              <div className="relative border border-gray-700 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden bg-gray-900"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Hash size={18} /></div><input type="text" placeholder="新しい掲示板名（合言葉）" className="w-full p-3 pl-10 bg-transparent outline-none text-white placeholder-gray-500" value={newRoomForm} onChange={e => setNewRoomForm(e.target.value)} /></div>
              <button type="submit" disabled={!newRoomForm.trim()} className="w-full bg-blue-600 disabled:opacity-50 text-white keep-white font-bold py-3 rounded-full transition-colors hover:bg-blue-700">作成して移動</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 4. プロフィール編集モーダル
// ==============================================================
export const ProfileEditModal = ({ isOpen, onClose, onUpdate, isUpdating, editForm, setEditForm, currentUserProfile, headerInputRef, avatarInputRef, onImageChange, Avatar, isDark = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-xl border transition-colors ${
        isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          isDark ? 'border-gray-800' : 'border-gray-150'
        }`}>
          <div className="flex items-center">
            <button onClick={onClose} className={`p-2 -ml-2 mr-4 rounded-full transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}><X size={20} /></button>
            <h2 className="text-lg font-bold">プロフィールを編集</h2>
          </div>
          <button onClick={onUpdate} disabled={isUpdating} className={`px-4 py-1.5 font-bold rounded-full text-sm flex items-center disabled:opacity-50 transition-all ${
            isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}>
            {isUpdating && <Loader2 size={16} className={`animate-spin mr-1.5 ${isDark ? 'text-black' : 'text-white'}`} />}
            保存
          </button>
        </div>
        <div className={`relative h-32 group ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          {(editForm.headerUrl || currentUserProfile.headerUrl) && <img src={editForm.headerUrl || currentUserProfile.headerUrl} className="w-full h-full object-cover" alt="header" />}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer" onClick={() => headerInputRef.current.click()}><div className="bg-black/60 p-3 rounded-full hover:bg-black/80 transition-colors"><Camera className="text-white keep-white" size={20} /></div></div>
          <input type="file" ref={headerInputRef} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" onChange={e => onImageChange(e, 'header')} />
        </div>
        <div className="px-4 pb-6 relative">
          <div className="absolute -top-12 left-4 group cursor-pointer z-10" onClick={() => avatarInputRef.current.click()}>
            <Avatar src={editForm.avatarUrl || currentUserProfile.avatarUrl} color={currentUserProfile.avatarColor} name={currentUserProfile.name} size="lg" />
            <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center"><div className="bg-black/60 p-2 rounded-full hover:bg-black/80 transition-colors"><Camera className="text-white keep-white" size={20} /></div></div>
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" onChange={e => onImageChange(e, 'avatar')} />
          </div>
          <div className="pt-16 space-y-4">
            <div className={`border rounded-md p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 mt-2 ${
              isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <label className={`block text-xs px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ニックネーム</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={`w-full bg-transparent outline-none px-1 py-1 ${isDark ? 'text-white' : 'text-gray-900'}`} required />
            </div>
            <div className={`border rounded-md p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
              isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <label className={`block text-xs px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>自己紹介</label>
              <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} className={`w-full bg-transparent outline-none px-1 py-1 h-24 resize-none placeholder-gray-500 ${isDark ? 'text-white' : 'text-gray-900'}`} placeholder="自己紹介を追加" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 4.5. プロフィール設定モーダル
// ==============================================================
export const ProfileSettingsModal = ({ isOpen, onClose, onUpdateSettings, isUpdating, settingsForm, setSettingsForm, onDeleteAccount, isDark = true }) => {
  const [activeView, setActiveView] = useState('menu');

  useEffect(() => {
    if (!isOpen) {
      setActiveView('menu');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBack = () => {
    setActiveView('menu');
  };

  const handleSaveUsername = (e) => {
    onUpdateSettings(e, 'username');
  };

  const handleSavePassword = (e) => {
    onUpdateSettings(e, 'password');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-xl border animate-[fadeIn_0.18s_ease-out] transition-colors ${
        isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`} onClick={e => e.stopPropagation()}>
        
        {/* --- 1. メインメニュービュー --- */}
        {activeView === 'menu' && (
          <>
            <div className={`flex items-center justify-between px-4 py-3.5 border-b ${
              isDark ? 'border-gray-800' : 'border-gray-150'
            }`}>
              <h2 className="text-base font-extrabold">プロフィール設定</h2>
              <button onClick={onClose} className={`p-1.5 rounded-full transition-colors active:scale-95 ${
                isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {/* ユーザーネームの変更 */}
              <button
                onClick={() => setActiveView('username')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border font-bold text-sm transition-all active:scale-[0.98] ${
                  isDark 
                    ? 'bg-gray-950 border-gray-900 hover:bg-gray-800/40 text-white' 
                    : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-800 shadow-sm'
                }`}
              >
                <span>ユーザーネームの変更</span>
                <ChevronRight size={16} className="text-gray-500" />
              </button>

              {/* パスワードの変更 */}
              <button
                onClick={() => setActiveView('password')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border font-bold text-sm transition-all active:scale-[0.98] ${
                  isDark 
                    ? 'bg-gray-950 border-gray-900 hover:bg-gray-800/40 text-white' 
                    : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-800 shadow-sm'
                }`}
              >
                <span>パスワードの変更</span>
                <ChevronRight size={16} className="text-gray-500" />
              </button>

              {/* アカウント消去 */}
              <button
                onClick={() => setActiveView('delete')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border font-bold text-sm transition-all active:scale-[0.98] ${
                  isDark 
                    ? 'bg-gray-950 border-gray-900 hover:bg-red-950/20 hover:border-red-900/30 text-white' 
                    : 'bg-white border-gray-150 hover:bg-red-50/30 hover:border-red-200 text-gray-800 shadow-sm'
                }`}
              >
                <span className={isDark ? 'text-red-400' : 'text-red-600'}>アカウント消去</span>
                <ChevronRight size={16} className={isDark ? 'text-red-500/70' : 'text-red-500'} />
              </button>
            </div>
          </>
        )}

        {/* --- 2. ユーザーネーム変更ビュー --- */}
        {activeView === 'username' && (
          <form onSubmit={handleSaveUsername}>
            <div className={`flex items-center justify-between px-4 py-3.5 border-b ${
              isDark ? 'border-gray-800' : 'border-gray-150'
            }`}>
              <div className="flex items-center">
                <button type="button" onClick={handleBack} className={`p-1.5 -ml-1 mr-3 rounded-full transition-colors active:scale-95 ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}><ArrowLeft size={18} /></button>
                <h2 className="text-base font-extrabold">ユーザーネームの変更</h2>
              </div>
              <button type="submit" disabled={isUpdating} className={`px-4.5 py-1.5 font-bold rounded-full text-xs flex items-center disabled:opacity-50 transition-all active:scale-95 ${
                isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}>
                {isUpdating && <Loader2 size={12} className={`animate-spin mr-1.5 ${isDark ? 'text-black' : 'text-white'}`} />}
                保存
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`border rounded-lg p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
                isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <label className={`block text-xxs font-bold mb-0.5 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>新しいユーザーID (@ユーザーID)</label>
                <input type="text" value={settingsForm.userId} onChange={e => setSettingsForm({ ...settingsForm, userId: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="英数字のみ" className={`w-full bg-transparent outline-none px-1 py-0.5 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`} required />
              </div>
            </div>
          </form>
        )}

        {/* --- 3. パスワードの変更ビュー --- */}
        {activeView === 'password' && (
          <form onSubmit={handleSavePassword}>
            <div className={`flex items-center justify-between px-4 py-3.5 border-b ${
              isDark ? 'border-gray-800' : 'border-gray-150'
            }`}>
              <div className="flex items-center">
                <button type="button" onClick={handleBack} className={`p-1.5 -ml-1 mr-3 rounded-full transition-colors active:scale-95 ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}><ArrowLeft size={18} /></button>
                <h2 className="text-base font-extrabold">パスワードの変更</h2>
              </div>
              <button type="submit" disabled={isUpdating} className={`px-4.5 py-1.5 font-bold rounded-full text-xs flex items-center disabled:opacity-50 transition-all active:scale-95 ${
                isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}>
                {isUpdating && <Loader2 size={12} className={`animate-spin mr-1.5 ${isDark ? 'text-black' : 'text-white'}`} />}
                保存
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`border rounded-lg p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
                isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <label className={`block text-xxs font-bold mb-0.5 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>現在のパスワード</label>
                <input type="password" value={settingsForm.currentPassword || ''} onChange={e => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })} placeholder="現在のパスワードを入力" className={`w-full bg-transparent outline-none px-1 py-0.5 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`} required />
              </div>
              <div className={`border rounded-lg p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
                isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <label className={`block text-xxs font-bold mb-0.5 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>新しいパスワード (半角英数字のみ)</label>
                <input type="password" value={settingsForm.newPassword || ''} onChange={e => setSettingsForm({ ...settingsForm, newPassword: e.target.value })} placeholder="新しいパスワードを入力" className={`w-full bg-transparent outline-none px-1 py-0.5 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`} required />
              </div>
              <div className={`border rounded-lg p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
                isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <label className={`block text-xxs font-bold mb-0.5 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>新しいパスワード (確認)</label>
                <input type="password" value={settingsForm.confirmPassword || ''} onChange={e => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })} placeholder="確認のためもう一度入力" className={`w-full bg-transparent outline-none px-1 py-0.5 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`} required />
              </div>
            </div>
          </form>
        )}

        {/* --- 4. アカウント消去ビュー --- */}
        {activeView === 'delete' && (
          <>
            <div className={`flex items-center px-4 py-3.5 border-b ${
              isDark ? 'border-gray-800' : 'border-gray-150'
            }`}>
              <button onClick={handleBack} className={`p-1.5 -ml-1 mr-3 rounded-full transition-colors active:scale-95 ${
                isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}><ArrowLeft size={18} /></button>
              <h2 className="text-base font-extrabold text-red-500">アカウント消去</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className={`p-4 rounded-xl border flex items-start space-x-3 text-left ${
                isDark ? 'bg-red-950/20 border-red-900/40 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm mb-1">危険な操作：この操作は取り消せません</h3>
                  <p className="text-xs leading-relaxed opacity-90">
                    アカウントを消去すると、あなたのプロフィール情報、登録した時間割、ToDoリスト、固定スケジュール、およびすべての掲示板における投稿・関連データがデータベースから物理的に永久に完全削除されます。この操作を取り消すことはできません。
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-full text-xs transition-all active:scale-95 shadow-lg shadow-red-500/20"
                >
                  アカウントを完全に消去する
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

// ==============================================================
// 5. 利用規約コンテンツコンポーネント (エクスポート対象)
// ==============================================================
export const TermsOfServiceContent = ({ isDark = true }) => {
  const headingColor = isDark ? 'text-white' : 'text-gray-900';
  const bodyColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const subColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const bannerBg = isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-200';
  return (
    <div className={`text-xs space-y-4 select-text ${bodyColor}`}>
      <div className={`p-3 rounded-xl border mb-4 ${bannerBg}`}>
        <strong className={headingColor}>MeLink利用規約</strong>
        <p className={`mt-1 font-bold ${subColor}`}>本規約は、埼大生向けSNSアプリ「MeLink」における利用条件を定めるものです。</p>
      </div>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第1条（目的と運営）</h3>
        <p>1. 本サービス「MeLink」は、埼玉大学の学生間の情報共有、空き時間や講義の確認、および相互の交流を円滑に促進することを目的とした、埼大生向けSNSアプリケーションです。</p>
        <p className="mt-1">2. ユーザーは、本サービスが提供する機能を、本規約の定めに従って自らの責任で利用するものとします。</p>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第2条（アカウントおよびパスワードの自己管理）</h3>
        <p>1. ユーザーは、登録するユーザー名（ID）およびパスワードを自己の責任において厳重に管理するものとします。</p>
        <p className="mt-1">2. <span className="text-red-400 font-bold">【注意】</span>セキュリティ保護およびアカウントの乗っ取り防止のため、**他の金融機関や大手SNS等で利用している重要なパスワードと同一のパスワードの登録（使い回し）は避けることを強く推奨します。**</p>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第3条（禁止事項）</h3>
        <p>ユーザーは、本サービスの利用にあたり、以下の各行為を行ってはなりません。</p>
        <ul className={`list-disc pl-4 mt-1 space-y-0.5 font-bold ${subColor}`}>
          <li>埼玉大学の関係者（在学生・教職員等）以外の者になりすまして登録・発言する行為。</li>
          <li>他のユーザーや特定の個人、団体に対する誹謗中傷、嫌がらせ、脅迫、または名誉を毀損する行為。</li>
          <li>法令または公序良俗に著しく違反する内容のテキスト、画像の投稿行為。</li>
          <li>スパム、商用目的の過度な宣伝勧誘、およびシステムに過度な負荷をかける自動操作。</li>
        </ul>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第4条（免責事項）</h3>
        <p>1. 本サービスに起因してユーザー間、または第三者との間で生じたあらゆる紛争について、運営チームは合理的な範囲で解決をサポートしますが、発生した直接的・間接的な損害について一切の責任を負いません。</p>
        <p className="mt-1">2. ユーザーは自己の責任と負担において本サービス利用するものとします。</p>
      </section>
    </div>
  );
};

// ==============================================================
// 6. プライバシーポリシーコンテンツコンポーネント (エクスポート対象)
// ==============================================================
export const PrivacyPolicyContent = ({ isDark = true }) => {
  const headingColor = isDark ? 'text-white' : 'text-gray-900';
  const bodyColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const subColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const bannerBg = isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-200';
  return (
    <div className={`text-xs space-y-4 select-text ${bodyColor}`}>
      <div className={`p-3 rounded-xl border mb-4 ${bannerBg}`}>
        <strong className={headingColor}>プライバシーポリシー</strong>
        <p className={`mt-1 font-bold ${subColor}`}>当サービスは、提供する各種サービスの運営において、ユーザーの個人データ保護に細心の注意を払います。</p>
      </div>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第1条（個人情報の取得と収集範囲）</h3>
        <p>当サービスは、ユーザーから適正かつ公正な手段によって以下の情報を取得・保存します。</p>
        <ul className={`list-disc pl-4 mt-1 space-y-0.5 font-bold ${subColor}`}>
          <li>**アカウント基本情報**: アカウント名（ニックネーム）、ユーザーID、パスワード（暗号化）</li>
          <li>**プロフィール情報**: プロフィール画像（アバター）、自己紹介テキスト</li>
          <li>**スケジュールデータ**: 登録された予定（タイトル、時間、場所）、毎週の固定スケジュールデータ</li>
          <li>**時間割データ**: インポートされた講義情報およびカラーの割り当て</li>
          <li>**コミュニティ利用データ**: 掲示板への投稿内容、画像データ、およびブックマーク情報</li>
        </ul>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第2条（個人情報の利用目的）</h3>
        <p>収集した情報は、以下の目的のためにのみ利用し、目的外の利用は行いません。</p>
        <p className="mt-1">1. サービス内におけるプロフィールの表示、掲示板への投稿反映、および安全なユーザー認証のため。</p>
        <p className="mt-1">2. Firestore データベースを利用した、マルチデバイス間での予定データや時間割データのクラウドリアルタイム同期およびデータ保持のため。</p>
        <p className="mt-1">3. 不具合の検出や安全運用、お問い合わせ対応および本人確認のため。</p>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第3条（個人情報の安全管理措置）</h3>
        <p>1. **堅牢なクラウド保護**: 業界標準のクラウドシステムである Firebase Firestore を採用し、強固なアクセス制御（セキュリティルール）を定義して、外部からの不正アクセスやデータの改ざん・漏洩を防止しています。</p>
        <p className="mt-1">2. **通信の暗号化**: アプリケーションとサーバー間のすべてのデータ通信は、SSL/TLS 暗号化通信を適用してデータを強固に保護しています。</p>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第4条（情報の第三者提供の制限）</h3>
        <p>当サービスが収集したユーザーの個人情報を、本人の同意を得ることなく第三者へ開示・提供することはありません。ただし、法令に基づく正式な捜査権限等による開示請求等の正当な法的手続きがある場合はこの限りではありません。</p>
      </section>

      <section>
        <h3 className={`text-xs font-bold mb-1 ${headingColor}`}>第5条（個人情報の開示・訂正・削除・退会）</h3>
        <p>1. ユーザーは、アプリ内の設定画面やカレンダー、時間割編集画面から、自身のプロフィール、予定、授業データ等をいつでも自由に変更・削除できます。</p>
        <p className="mt-1">2. **アカウント削除（退会）**: ユーザーがアカウント削除（退会）手続きを行った場合、そのユーザーの登録情報、カレンダーデータ、時間割、およびマイデータは Firestore データベース上から安全かつ速やかに物理的に完全削除されます。</p>
      </section>
    </div>
  );
};

// ==============================================================
// 7. 切り替えモーダルラッパー (共通コンポーネント)
// ==============================================================
export const TermsModal = ({ isOpen, onClose, initialTab = 'terms', isDark = true }) => {
  if (!isOpen) return null;

  const isTerms = initialTab === 'terms';
  const title = isTerms ? '利用規約' : 'プライバシーポリシー';
  const emoji = isTerms ? '📋' : '🛡️';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md rounded-3xl p-6 relative flex flex-col max-h-[80vh] border shadow-2xl animate-[fadeIn_0.18s_ease-out] transition-colors ${
        isDark ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`} onClick={e => e.stopPropagation()}>
        
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className={`text-base font-black tracking-tight flex items-center gap-1.5 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            <span>{emoji}</span>
            <span>{title}</span>
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-full transition-colors active:scale-95 ${
            isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}>
            <X size={18} />
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-grow overflow-y-auto pr-1 pb-4 leading-relaxed no-scrollbar select-text">
          <div className="animate-[fadeIn_0.12s_ease-out]">
            {isTerms ? (
              <TermsOfServiceContent isDark={isDark} />
            ) : (
              <PrivacyPolicyContent isDark={isDark} />
            )}
          </div>
        </div>
        
        {/* フッター */}
        <div className={`pt-3 border-t shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <button onClick={onClose} className={`w-full py-2 active:scale-[0.98] transition-all rounded-full font-black text-xs ${
            isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}>
            内容を確認しました
          </button>
        </div>
      </div>
    </div>
  );
};
