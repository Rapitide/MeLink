import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { X, ArrowLeft, Edit2, Plus, BookOpen, Search as LucideSearchIcon, FileText } from 'lucide-react';

// =====================================================================
// 📖 Wiki (埼大Wiki) 関連のコンポーネント
// =====================================================================

export default function WikiComponent({ firestore, currentAccountId, currentUserProfile, isAdmin, formatTimeAgo, showToast }) {
  const [wikiPages, setWikiPages] = useState({});
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiSelectedPage, setWikiSelectedPage] = useState(null);
  const [isWikiEditing, setIsWikiEditing] = useState(false);
  const [wikiEditContent, setWikiEditContent] = useState('');
  const [wikiEditTitle, setWikiEditTitle] = useState('');
  const [wikiEditCategory, setWikiEditCategory] = useState('その他');
  const [wikiCategoryFilter, setWikiCategoryFilter] = useState('すべて');

  // Wiki リアルタイム購読
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(collection(firestore, 'globalData/wiki/pages'), (snap) => {
      const pages = {};
      snap.docs.forEach(d => { pages[d.id] = { id: d.id, ...d.data() }; });
      setWikiPages(pages);
    });
    return () => unsub();
  }, [firestore]);

  // Wiki: マークダウン風テキストをJSXに変換する関数（Wikipedia風）
  const renderWikiContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const headings = lines.filter(l => l.startsWith('## ')).map(l => l.slice(3));
    const inlineParse = (str) => str.split(/\*\*(.*?)\*\*/).map((part, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-gray-100">{part}</strong> : part);
    return (
      <>
        {headings.length >= 2 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded px-4 py-3 mb-5 inline-block">
            <p className="text-xs font-bold text-gray-300 mb-2">目次</p>
            <ol className="list-decimal list-inside space-y-1">
              {headings.map((h, i) => (
                <li key={i} className="text-sm text-blue-400 hover:underline cursor-pointer" onClick={() => { const el = document.getElementById(`wiki-section-${i}`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{h}</li>
              ))}
            </ol>
          </div>
        )}
        {(() => { let sectionIdx = -1; return lines.map((line, i) => {
          if (line.startsWith('## ')) { sectionIdx++; return <h2 key={i} id={`wiki-section-${sectionIdx}`} className="text-[17px] font-bold text-gray-100 mt-5 mb-1.5 pb-1 border-b border-gray-700">{line.slice(3)}</h2>; }
          if (line.startsWith('- ')) return <li key={i} className="text-gray-300 text-[14px] ml-5 list-disc mb-0.5 leading-relaxed">{inlineParse(line.slice(2))}</li>;
          if (line.trim() === '') return <div key={i} className="h-2" />;
          return <p key={i} className="text-gray-300 text-[14px] leading-relaxed mb-0.5">{inlineParse(line)}</p>;
        }); })()}
      </>
    );
  };

  // Wiki: 記事を保存する関数
  const handleWikiSave = async () => {
    if (!wikiEditTitle.trim() || !wikiEditContent.trim() || !currentAccountId) return;
    const pageId = wikiEditTitle.trim().replace(/[\s\/\.#$\[\]]/g, '_');
    try {
      await setDoc(doc(firestore, `globalData/wiki/pages/${pageId}`), {
        title: wikiEditTitle.trim(),
        content: wikiEditContent,
        category: wikiEditCategory,
        updatedAt: Date.now(),
        updatedBy: currentAccountId,
        updatedByName: currentUserProfile?.name || currentAccountId
      });
      setIsWikiEditing(false);
      setWikiEditTitle('');
      setWikiEditContent('');
      setWikiEditCategory('その他');
      showToast('✅ 記事を保存しました');
    } catch (err) {
      console.error(err);
      showToast('❌ 記事の保存に失敗しました');
    }
  };

  // Wiki: 初期データ挿入
  const initWikiData = async () => {
    const pages = [
      {
        id: '第1食堂の使い方',
        title: '第1食堂の使い方',
        category: '学内施設',
        content: '## 場所\n教育学部近くにあります。\n## 営業時間\n- 平日: 11:00〜14:00\n- 定食は300円台から'
      },
      {
        id: '履修登録のやり方',
        title: '履修登録のやり方',
        category: '学部・授業',
        content: '## KOAN（学務情報システム）にログイン\n- ID: 学籍番号\n## 注意点\n- 上限単位数に注意\n**必ず指導教員に確認しよう**'
      },
      {
        id: '北浦和駅からのバス',
        title: '北浦和駅からのバス',
        category: '学生生活',
        content: '## 乗り場\n北浦和駅東口2番のりば\n## 料金\n**210円**（ICカード可）\n- 所要時間: 約15分'
      }
    ];
    try {
      for (const page of pages) {
        await setDoc(doc(firestore, `globalData/wiki/pages/${page.id}`), {
          title: page.title,
          content: page.content,
          category: page.category,
          updatedAt: Date.now(),
          updatedBy: currentAccountId,
          updatedByName: currentUserProfile?.name || currentAccountId
        });
      }
      showToast('✅ Wiki初期データを挿入しました');
    } catch (err) {
      console.error(err);
      showToast('❌ 初期データの挿入に失敗しました');
    }
  };

  // Wiki: フィルタリングされた記事一覧
  const filteredWikiPages = useMemo(() => {
    let pages = Object.values(wikiPages);
    if (wikiCategoryFilter !== 'すべて') {
      pages = pages.filter(p => p.category === wikiCategoryFilter);
    }
    if (wikiSearchQuery.trim()) {
      const q = wikiSearchQuery.toLowerCase();
      pages = pages.filter(p => p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q));
    }
    return pages.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [wikiPages, wikiCategoryFilter, wikiSearchQuery]);

  return (
    <div className="pb-24 bg-black min-h-screen">
          {/* Wiki編集モーダル */}
            {isWikiEditing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsWikiEditing(false)}>
                <div className="bg-gray-900 w-full max-w-lg rounded-2xl flex flex-col max-h-[85vh] border border-gray-800 text-white" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <div className="flex items-center">
                      <button onClick={() => setIsWikiEditing(false)} className="p-2 -ml-2 mr-2 hover:bg-gray-800 rounded-full text-gray-400"><X size={20} /></button>
                      <h2 className="text-lg font-bold">記事を編集</h2>
                    </div>
                    <button onClick={handleWikiSave} disabled={!wikiEditTitle.trim() || !wikiEditContent.trim()} className="px-4 py-1.5 bg-blue-600 text-white keep-white font-bold rounded-full text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors">保存する</button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">タイトル</label>
                      <input type="text" value={wikiEditTitle} onChange={e => setWikiEditTitle(e.target.value)} placeholder="記事のタイトル" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">カテゴリ</label>
                      <select value={wikiEditCategory} onChange={e => setWikiEditCategory(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500">
                        <option value="学部・授業">学部・授業</option>
                        <option value="学内施設">学内施設</option>
                        <option value="学生生活">学生生活</option>
                        <option value="イベント">イベント</option>
                        <option value="その他">その他</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">本文</label>
                      <textarea value={wikiEditContent} onChange={e => setWikiEditContent(e.target.value)} placeholder={`## 見出し\n**太字テキスト**\n- リスト項目\n通常テキスト`} rows={12} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder-gray-500 resize-none font-mono text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wiki詳細ページ（Wikipedia記事風） */}
            {wikiSelectedPage ? (
              <div>
                <div className="bg-black/90 backdrop-blur sticky top-0 z-20 px-4 py-2.5 flex items-center justify-between border-b border-gray-800">
                  <button onClick={() => setWikiSelectedPage(null)} className="p-2 -ml-2 hover:bg-gray-800 rounded-full text-gray-400"><ArrowLeft size={20} /></button>
                  <div className="flex items-center space-x-2">
                    {currentAccountId && (
                      <button onClick={() => { setWikiEditTitle(wikiSelectedPage.title); setWikiEditContent(wikiSelectedPage.content); setWikiEditCategory(wikiSelectedPage.category || 'その他'); setIsWikiEditing(true); }} className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center px-2 py-1 hover:bg-gray-800 rounded transition-colors">
                        <Edit2 size={13} className="mr-1" />編集
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-4 sm:px-6 pt-4 pb-6">
                  {/* Wikipedia風タイトル */}
                  <h1 className="text-[22px] font-normal text-gray-100 pb-1 border-b border-gray-700 mb-1" style={{ fontFamily: 'serif, "Noto Serif JP", Georgia' }}>{wikiSelectedPage.title}</h1>
                  {/* メタ情報行 */}
                  <div className="flex items-center text-[11px] text-gray-500 mb-4 pt-1 space-x-1">
                    <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-semibold">{wikiSelectedPage.category}</span>
                    <span>·</span>
                    <span>最終更新 {wikiSelectedPage.updatedAt ? formatTimeAgo(wikiSelectedPage.updatedAt) : '不明'}</span>
                    <span>·</span>
                    <span>{wikiSelectedPage.updatedByName || '不明'} が編集</span>
                  </div>
                  {/* 記事本文 */}
                  <div>
                    {renderWikiContent(wikiSelectedPage.content)}
                  </div>
                  {/* カテゴリフッター */}
                  <div className="mt-6 pt-3 border-t border-gray-800">
                    <p className="text-[11px] text-gray-500 flex items-center"><FileText size={12} className="mr-1" />カテゴリ: <span className="text-blue-400 ml-1">{wikiSelectedPage.category}</span></p>
                  </div>
                </div>
              </div>
            ) : (
              /* Wikiトップページ（Wikipedia風） */
              <div>
                <div className="bg-black/90 backdrop-blur sticky top-0 z-20 border-b border-gray-800">
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="font-bold text-white text-[17px] tracking-tight" style={{ fontFamily: 'serif, "Noto Serif JP", Georgia' }}>埼大Wiki</span>
                    {currentAccountId && (
                      <button onClick={() => { setWikiEditTitle(''); setWikiEditContent(''); setWikiEditCategory('その他'); setIsWikiEditing(true); }} className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center px-2 py-1 hover:bg-gray-800 rounded transition-colors">
                        <Plus size={14} className="mr-1" />新規作成
                      </button>
                    )}
                  </div>
                  {/* 検索バー */}
                  <div className="px-4 pb-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LucideSearchIcon size={16} /></div>
                      <input type="text" value={wikiSearchQuery} onChange={e => setWikiSearchQuery(e.target.value)} placeholder="埼大Wikiを検索" className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white outline-none focus:border-blue-500 placeholder-gray-500 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="px-4 sm:px-6 pt-4">
                  {/* Wikipedia風ウェルカムヘッダー */}
                  <div className="border border-gray-800 rounded-lg overflow-hidden mb-5">
                    <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/30 px-4 py-4 text-center border-b border-gray-800">
                      <p className="text-[22px] text-gray-100 mb-1" style={{ fontFamily: 'serif, "Noto Serif JP", Georgia' }}>埼大Wikiへようこそ</p>
                      <p className="text-xs text-gray-400">埼大生が作る、埼大生のためのフリー百科事典</p>
                      <p className="text-[11px] text-gray-500 mt-1">{Object.keys(wikiPages).length} 本の記事</p>
                    </div>
                  </div>

                  {/* カテゴリタブ */}
                  <div className="flex space-x-1.5 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: 'none' }}>
                    {['すべて', '学部・授業', '学内施設', '学生生活', 'イベント', 'その他'].map(cat => (
                      <button key={cat} onClick={() => setWikiCategoryFilter(cat)} className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${wikiCategoryFilter === cat ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}>{cat}</button>
                    ))}
                  </div>

                  {/* 記事一覧（Wikipedia風リンクリスト） */}
                  {filteredWikiPages.length === 0 ? (
                    <div className="text-center py-16">
                      <BookOpen size={40} className="mx-auto text-gray-700 mb-3" />
                      <p className="text-gray-500 text-sm">記事が見つかりません</p>
                    </div>
                  ) : (
                    <div className="border border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-800">
                      {filteredWikiPages.map(page => (
                        <div key={page.id} onClick={() => setWikiSelectedPage(page)} className="px-4 py-3 hover:bg-gray-900/80 transition-colors cursor-pointer flex items-center justify-between">
                          <div className="min-w-0 flex-grow">
                            <h3 className="text-[14px] text-blue-400 hover:underline font-medium truncate">{page.title}</h3>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[10px] text-gray-600 bg-gray-800/80 px-1.5 py-0.5 rounded">{page.category}</span>
                              <span className="text-[10px] text-gray-600">{page.updatedAt ? formatTimeAgo(page.updatedAt) : ''}</span>
                            </div>
                          </div>
                          <ArrowLeft size={14} className="text-gray-700 flex-shrink-0 ml-2 rotate-180" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 管理者用: 初期データ挿入ボタン */}
                  {isAdmin && (
                    <div className="mt-6 pt-4 border-t border-gray-800">
                      <button onClick={initWikiData} className="w-full py-2.5 bg-yellow-900/15 hover:bg-yellow-900/25 text-yellow-500 font-semibold rounded-lg border border-yellow-800/40 transition-colors text-xs">
                        初期データ挿入（管理者用）
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
  );
}
