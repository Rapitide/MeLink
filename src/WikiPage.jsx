import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Menu, User, Users, BookOpen, Edit, Clock, MessageSquare, ChevronDown, ChevronRight, Settings, Plus, ArrowLeft, Save, Trash2, ExternalLink, Star, AlertCircle,
  Heading2, Heading3, Bold, Italic, Strikethrough, List, Link as LinkIcon, Link2, Globe, Square, Table, HelpCircle, Quote, Download, Code
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Firebase imports ---
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, onSnapshot, serverTimestamp, deleteDoc, getCountFromServer } from 'firebase/firestore';

// 外部ファイルからのインポートを削除し、ここで直接定義します
const sanitizeRoomId = (roomId) => {
  if (!roomId) return '';
  return roomId.replace(/[\/\.#\$\[\]]/g, '_');
};

const Avatar = ({ src, color, name, size = 'md' }) => {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl'
  };
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (src) {
    return <img src={src} alt="avatar" className={`${sizeClass} rounded-lg object-cover`} />;
  }
  return (
    <div className={`${sizeClass} ${color || 'bg-blue-500'} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
};

// --- Firebase設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyDuOVGIej7e1AYfyvH6usDcNqgF3N96lvg",
  authDomain: "twitter-112c1.firebaseapp.com",
  databaseURL: "https://twitter-112c1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "twitter-112c1",
  storageBucket: "twitter-112c1.firebasestorage.app",
  messagingSenderId: "1064497466431",
  appId: "1:1064497466431:web:1c843edd6d2511e8567c8a",
  measurementId: "G-VM6WJL92LC"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const firestore = getFirestore(app);

// アンサイクロペディア風のフォントファミリー
const wikiBodyFont = '"Helvetica Neue", "Helvetica", "Nimbus Sans L", "Arial", "Liberation Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';

export default function WikiPage({ currentUserProfile }) {
  // 注意: useNavigateはRouterコンテキスト内でのみ動作します
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(true);

  // 状態管理
  const [activeTab, setActiveTab] = useState('page'); // 'page' | 'edit'
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 編集用ステート
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userCount, setUserCount] = useState(0);

  // ハイライト用のカーソル行インデックス
  const [activeLineIndex, setActiveLineIndex] = useState(null);

  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  // --- カーソル位置の行番号を取得 ---
  const updateActiveLine = () => {
    if (textareaRef.current && activeTab === 'edit') {
      const start = textareaRef.current.selectionStart;
      const textBeforeCursor = editContent.substring(0, start);

      // カーソルがある行のインデックス（全体の行数から算出）
      const lineIndex = textBeforeCursor.split('\n').length - 1;
      setActiveLineIndex(lineIndex);
    } else {
      setActiveLineIndex(null);
    }
  };

  // --- 編集中の行（ハイライト要素）にプレビューを追従スクロール ---
  useEffect(() => {
    if (activeTab === 'edit' && previewRef.current && activeLineIndex !== null) {
      // DOMの更新を待つために少し遅延させる
      const timer = setTimeout(() => {
        const targetElement = previewRef.current.querySelector('#active-preview-element');
        if (targetElement) {
          const container = previewRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();

          // ターゲットのプレビューコンテナ上端からの相対位置
          const relativeTop = targetRect.top - containerRect.top;

          // 🌟 常にプレビュー画面の上部 10% ～ 40% の見やすい位置に収まるようにスクロールを調整
          const topThreshold = containerRect.height * 0.1;
          const bottomThreshold = containerRect.height * 0.4;

          if (relativeTop < topThreshold || relativeTop > bottomThreshold) {
            // 画面の上から約20%の位置にターゲットが来るようにスクロール
            const scrollPosition = container.scrollTop + relativeTop - (containerRect.height * 0.2);

            container.scrollTo({
              top: scrollPosition,
              behavior: 'smooth'
            });
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeLineIndex, activeTab]);

  const currentAccountId = localStorage.getItem('twitter_clone_current_id') || 'ゲスト';

  // --- ユーザープロフィールの取得 ---
  const [localUserProfile, setLocalUserProfile] = useState(null);
  useEffect(() => {
    if (!currentAccountId || currentAccountId === 'ゲスト') return;
    const unsub = onSnapshot(doc(firestore, `rooms/${sanitizeRoomId('埼玉大学全体')}/users/${currentAccountId}`), (snap) => {
      if (snap.exists()) {
        setLocalUserProfile({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [currentAccountId]);

  const activeUserProfile = currentUserProfile || localUserProfile;

  // --- データの取得 (Firestore) ---
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'globalData/wiki/pages'), (snap) => {
      const fetchedPages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 更新日時の降順にソート
      fetchedPages.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      setPages(fetchedPages);

      // 初回ロード時はメインページを表示する
      if (isInitialLoad) {
        const mainPage = fetchedPages.find(p => p.title === 'メインページ');
        setSelectedPageId(mainPage ? mainPage.id : 'main_placeholder');
        setIsInitialLoad(false);
      }
    });
    return () => unsub();
  }, [isInitialLoad]);

  // --- 登録利用者数の取得 ---
  useEffect(() => {
    getCountFromServer(collection(firestore, `rooms/${sanitizeRoomId('埼玉大学全体')}/users`))
      .then(s => setUserCount(s.data().count))
      .catch((error) => {
        console.error("ユーザー数の取得に失敗", error);
        setUserCount(0);
      });
  }, []);

  // 選択中のページデータ
  const selectedPage = useMemo(() => {
    if (selectedPageId === 'main_placeholder') {
      return {
        id: 'main_placeholder',
        title: 'メインページ',
        content: '{{トップ枠|[[埼大Wiki]]へようこそ|埼大Wikiは、知識の共有と自由な交流を目的として生まれた百科事典です。}}\n\nまだ記事がありません。「編集」タブから内容を追加してください。'
      };
    }
    return pages.find(p => p.id === selectedPageId) || null;
  }, [pages, selectedPageId]);

  // 検索フィルタリング
  const filteredPages = useMemo(() => {
    if (!searchQuery) return pages;
    return pages.filter(p =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pages, searchQuery]);

  // --- 自動リンク用の正規表現生成 ---
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 現在表示または編集しているページのタイトル
  const currentTitle = activeTab === 'edit' ? editTitle : selectedPage?.title;

  // --- カスタムエイリアスマップ ---
  const customAliases = {
    '埼大': '埼玉大学'
  };

  // 🌟 自動リンクの対象外とする単語リスト（部分一致による意図しないリンク化を防ぐ）
  // 例：「埼大Wiki」の中に「埼大」が含まれていても、ここで「埼大Wiki」を定義しておけば全体がリンク化を免れます
  const ignoreAutoLinkTerms = useMemo(() => [
    '埼大Wiki',
    'MeLink Project',
    'MeLink'
  ], []);

  const autoLinkTerms = useMemo(() => {
    const terms = [];

    // 通常のページタイトル
    pages.forEach(p => {
      if (p.title && p.title.trim().length > 0 && p.title !== currentTitle) {
        terms.push({ text: p.title, target: p.title });
      }
    });

    // カスタムエイリアス
    Object.entries(customAliases).forEach(([alias, target]) => {
      if (target !== currentTitle) { // リンク先が現在のページでない場合のみ
        terms.push({ text: alias, target: target });
      }
    });

    // テキスト長の降順でソート（長いマッチを優先）
    return terms.sort((a, b) => b.text.length - a.text.length);
  }, [pages, currentTitle]);

  const autoLinkRegex = useMemo(() => {
    if (autoLinkTerms.length === 0 && ignoreAutoLinkTerms.length === 0) return null;
    const uniqueTexts = [...new Set(autoLinkTerms.map(t => t.text))];

    // 🌟 除外リストの単語も含めて、文字数の長い順にソートする
    const allTerms = [...new Set([...ignoreAutoLinkTerms, ...uniqueTexts])].sort((a, b) => b.length - a.length);

    if (allTerms.length === 0) return null;
    return new RegExp(`(${allTerms.map(escapeRegExp).join('|')})`, 'g');
  }, [autoLinkTerms, ignoreAutoLinkTerms]);

  // タブ切り替え時に編集内容をセット
  useEffect(() => {
    if (activeTab === 'edit' && selectedPage) {
      setEditTitle(selectedPage.title || '');
      setEditContent(selectedPage.content || '');
      setActiveLineIndex(null); // タブ切り替え時にハイライトをリセット
    }
  }, [activeTab, selectedPage]);

  // --- 自動目次（TOC）生成 ---
  const tocItems = useMemo(() => {
    // 編集中のプレビュー用にも動作するよう、editContent または selectedPage?.content を使用
    const contentToParse = activeTab === 'edit' ? editContent : selectedPage?.content;
    if (!contentToParse) return [];

    const lines = contentToParse.split('\n');
    const items = [];
    let h2Count = 0;
    let h3Count = 0;

    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        h2Count++;
        h3Count = 0;
        items.push({ id: `h2-${h2Count}`, title: `${h2Count} ${line.slice(3).trim()}`, level: 1 });
      } else if (line.startsWith('### ')) {
        h3Count++;
        items.push({ id: `h3-${h2Count}-${h3Count}`, title: `${h2Count}.${h3Count} ${line.slice(4).trim()}`, level: 2 });
      }
    });

    // 脚注が存在する場合は目次に追加
    if (contentToParse.match(/<ref>[\s\S]*?<\/ref>/)) {
      h2Count++;
      items.push({ id: 'h2-references', title: `${h2Count} 脚注`, level: 1 });
    }

    return items;
  }, [selectedPage, editContent, activeTab]);

  // --- ツールバー用ヘルパー関数 ---
  const insertText = (prefix, suffix = '', defaultText = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    let selectedText = text.substring(start, end);
    if (!selectedText && defaultText) {
      selectedText = defaultText;
    }

    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);

    // スクロール位置を保存
    const scrollTop = textarea.scrollTop;

    setEditContent(newText);

    // フォーカスとカーソル位置、スクロール位置を復元
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      textarea.scrollTop = scrollTop;
      updateActiveLine(); // 更新後にアクティブ行を再計算
    }, 0);
  };

  const insertLinePrefix = (prefix) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // 現在の行の先頭を見つける
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }

    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);

    // スクロール位置を保存
    const scrollTop = textarea.scrollTop;

    setEditContent(newText);

    setTimeout(() => {
      textarea.focus();
      const diff = prefix.length;
      textarea.setSelectionRange(start + diff, end + diff);
      textarea.scrollTop = scrollTop;
      updateActiveLine(); // 更新後にアクティブ行を再計算
    }, 0);
  };

  // 🌟 見出しの「編集」をクリックした際、該当行へスクロールする処理
  const handleEditSection = (lineIndex) => {
    setActiveTab('edit');

    // タブ切り替え後のレンダリングを確実に待つため少し長めに設定
    setTimeout(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const lines = editContent.split('\n');

        // 対象行の文字インデックスを計算
        let charIndex = 0;
        for (let i = 0; i < lineIndex; i++) {
          charIndex += (lines[i] ? lines[i].length : 0) + 1;
        }

        // カーソルをセット
        textarea.focus();
        textarea.setSelectionRange(charIndex, charIndex);

        // 🌟 テキストエリア全体の高さと文字数の割合から、スクロール位置を計算 (折り返しにも強い)
        if (editContent.length > 0) {
          const scrollRatio = charIndex / editContent.length;
          // 画面の上から約20%の位置にカーソルが来るようにスクロール
          const targetScrollTop = (textarea.scrollHeight * scrollRatio) - (textarea.clientHeight * 0.2);
          textarea.scrollTop = targetScrollTop > 0 ? targetScrollTop : 0;
        }

        // 一部のブラウザ向けにカーソル位置へ強制フォーカススクロールを促す
        textarea.blur();
        textarea.focus();

        // 手動でハイライト・プレビュー追従を更新
        updateActiveLine();
      }
    }, 100); // 100ms待って確実なDOM更新を待つ
  };

  // 🌟 PDFダウンロード機能 (ブラウザの印刷機能を使用)
  const handleDownloadPDF = () => {
    // 編集モードの場合は閲覧モードに戻してから印刷を実行する
    if (activeTab === 'edit') {
      setActiveTab('page');
      // タブ切り替えのレンダリングを待つ
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  // 🌟 権限の判定: 新規ページでない ＆ (自分がcreatorId または creatorIdがない古いデータで自分がauthorId)
  const isCreator = selectedPage && (
    selectedPage.creatorId === currentAccountId ||
    (!selectedPage.creatorId && selectedPage.authorId === currentAccountId)
  );

  // --- 保存処理 ---
  const handleSave = async () => {
    if (!editTitle.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    // 🌟 白紙化荒らし対策：既存の文字数より極端に減らせるのは作成者のみに制限
    if (selectedPageId !== 'new' && selectedPageId !== 'main_placeholder' && selectedPage) {
      const oldLength = selectedPage.content?.length || 0;
      const newLength = editContent.length;
      if (oldLength > 100 && newLength < oldLength * 0.5) { // 既存が100文字以上で、半分以上削られた場合
        if (!isCreator) {
          alert("【エラー】文章が大幅に削除されています。\n荒らし対策のため、記事の文字数を半分以下にするような大幅な削除は、この記事を作成したユーザーのみに制限されています。");
          return; // 保存処理を中止してブロック
        }
      }
    }

    setIsSaving(true);
    try {
      const isNewPage = selectedPageId === 'new' || selectedPageId === 'main_placeholder';
      const pageId = isNewPage ? `page_${Date.now()}` : selectedPageId;
      const pageRef = doc(firestore, `globalData/wiki/pages/${pageId}`);

      const editorInfo = {
        lastEditorId: currentAccountId,
        lastEditorName: activeUserProfile?.name || currentAccountId,
        lastEditorAvatarUrl: activeUserProfile?.avatarUrl || null,
        lastEditorColor: activeUserProfile?.avatarColor || 'bg-blue-500'
      };

      const pageData = {
        title: editTitle.trim(),
        content: editContent,
        updatedAt: serverTimestamp(),
        ...editorInfo
      };

      // 🌟 新規作成時のみ、作成者情報を記録する (既存ページの下位互換のため古い authorId も残しておく)
      if (isNewPage) {
        pageData.creatorId = currentAccountId;
        pageData.createdAt = serverTimestamp();
        // 古いデータとの互換性のため
        pageData.authorId = currentAccountId;
        pageData.authorName = editorInfo.lastEditorName;
        pageData.authorAvatarUrl = editorInfo.lastEditorAvatarUrl;
        pageData.authorColor = editorInfo.lastEditorColor;
      }

      await setDoc(pageRef, pageData, { merge: true });

      setSelectedPageId(pageId);
      setActiveTab('page');
    } catch (err) {
      console.error("保存に失敗しました", err);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedPageId('new');
    setActiveTab('edit');
    setEditTitle('');
    setEditContent('');
    setIsSidebarOpen(false);
  };

  const handleDelete = async () => {
    if (selectedPageId === 'new' || selectedPageId === 'main_placeholder') {
      setActiveTab('page');
      setSelectedPageId(pages[0]?.id || null);
      return;
    }
    if (window.confirm("このページを削除してもよろしいですか？（※この操作は取り消せません）")) {
      try {
        await deleteDoc(doc(firestore, `globalData/wiki/pages/${selectedPageId}`));
        const mainPage = pages.find(p => p.title === 'メインページ');
        setSelectedPageId(mainPage ? mainPage.id : 'main_placeholder');
        setActiveTab('page');
      } catch (e) {
        alert("削除に失敗しました");
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '不明';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- Wiki内部リンククリック処理 ---
  const handleWikiLink = (pageName) => {
    const targetPage = pages.find(p => p.title === pageName);
    if (targetPage) {
      setSelectedPageId(targetPage.id);
      setActiveTab('page');
      window.scrollTo(0, 0);
    } else {
      if (window.confirm(`「${pageName}」というページはまだありません。新しく作成しますか？`)) {
        setSelectedPageId('new');
        setEditTitle(pageName);
        setEditContent('');
        setActiveTab('edit');
        window.scrollTo(0, 0);
      }
    }
  };

  // --- 簡易Markdown & 装飾パーサー ---
  const parseInline = (text, keyPrefix = '0', nowikiBlocks = []) => {
    if (typeof text !== 'string') return text;

    // 太文字斜体、太文字、斜体、取り消し線、内部リンク、外部リンク、注釈、[要出典]、脚注リンク、nowikiブロックを抽出して変換
    const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|~~.*?~~|\[\[.*?\]\]|\[.*?\]\(.*?\)|\[\d+\]|\[要出典\]|\[REF_LINK:\d+\]|\[NOWIKI_BLOCK:\d+\])/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const currentKey = `${keyPrefix}-${i}`;

      // 1. 太文字 + 斜体 (セリフ体) (***太文字斜体***)
      if (part.startsWith('***') && part.endsWith('***')) {
        return <b key={currentKey} className="italic font-serif">{parseInline(part.slice(3, -3), currentKey, nowikiBlocks)}</b>;
      }
      // 2. 太文字 (**太文字**)
      if (part.startsWith('**') && part.endsWith('**')) {
        return <b key={currentKey}>{parseInline(part.slice(2, -2), currentKey, nowikiBlocks)}</b>;
      }
      // 3. 斜体 (セリフ体) (*斜体*)
      if (part.startsWith('*') && part.endsWith('*')) {
        return <i key={currentKey} className="font-serif">{parseInline(part.slice(1, -1), currentKey, nowikiBlocks)}</i>;
      }
      // 4. 取り消し線 (~~取り消し線~~)
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return <del key={currentKey} className="text-gray-500">{parseInline(part.slice(2, -2), currentKey, nowikiBlocks)}</del>;
      }
      // 5. 内部リンク ([[リンク先|表示テキスト]] または [[ページ名]])
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const innerContent = part.slice(2, -2);
        let linkTarget = innerContent;
        let displayText = innerContent;

        // エイリアス（リダイレクト）のパース: [[リンク先|表示名]]
        if (innerContent.includes('|')) {
          const splitParts = innerContent.split('|');
          linkTarget = splitParts[0];
          displayText = splitParts.slice(1).join('|'); // 2つ目以降の要素があれば結合
        }

        // リンク先ページ名からは装飾文字を取り除く
        const pageName = linkTarget.replace(/(\*\*\*|\*\*|\*|~~)/g, '');
        const exists = pages.some(p => p.title === pageName);
        return (
          <span
            key={currentKey}
            onClick={() => handleWikiLink(pageName)}
            className={`cursor-pointer hover:underline ${exists ? 'text-[#3366cc]' : 'text-[#ba0000]'}`}
            title={exists ? pageName : `${pageName} (存在しないページ)`}
          >
            {parseInline(displayText, currentKey, nowikiBlocks)}
          </span>
        );
      }
      // 6. 外部リンク ([テキスト](URL))
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <a
              key={currentKey}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3366cc] hover:underline break-all"
            >
              {parseInline(match[1], currentKey, nowikiBlocks)}
              <ExternalLink size={12} className="inline ml-0.5 mb-0.5 text-[#3366cc]" />
            </a>
          );
        }
      }
      // 7. 注釈風ラベル ([1] みたいなやつ)
      if (part.match(/^\[\d+\]$/)) {
        return (
          <sup
            key={currentKey}
            className={`text-[#3366cc] text-[11px] ml-0.5 cursor-pointer hover:underline`}
            title={"注釈"}
          >
            {part}
          </sup>
        );
      }
      // 8. 要出典 (斜体を外して通常フォントに)
      if (part === '[要出典]') {
        return (
          <sup
            key={currentKey}
            className={`text-[#3366cc] text-[11px] ml-0.5 cursor-pointer hover:underline`}
            title={"出典が求められています"}
          >
            {part}
          </sup>
        );
      }
      // 9. 脚注リンク (自動生成された [REF_LINK:1] など)
      if (part.startsWith('[REF_LINK:') && part.endsWith(']')) {
        const num = part.match(/\d+/)[0];
        return (
          <sup key={currentKey} className="text-[#3366cc] text-[11px] ml-0.5 cursor-pointer hover:underline" id={`cite_ref-${num}`}>
            <a href={`#cite_note-${num}`}>[{num}]</a>
          </sup>
        );
      }

      // 🌟 10. nowikiブロック（Wiki記法をそのまま表示）
      if (part.startsWith('[NOWIKI_BLOCK:') && part.endsWith(']')) {
        const num = parseInt(part.match(/\d+/)[0], 10);
        return (
          <code key={currentKey} className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono text-[13px] whitespace-pre-wrap text-[#202122] break-all inline-block align-middle my-0.5 print:border-black print:bg-white">
            {nowikiBlocks[num]}
          </code>
        );
      }

      // 11. 通常のテキスト（自動リンク処理）
      if (autoLinkRegex && part) {
        const autoParts = part.split(autoLinkRegex);
        return autoParts.map((aPart, aIndex) => {
          const aKey = `${currentKey}-auto-${aIndex}`;

          // 🌟 除外リストに含まれる単語の場合はリンク化しない
          if (ignoreAutoLinkTerms.includes(aPart)) {
            return <React.Fragment key={aKey}>{aPart}</React.Fragment>;
          }

          // 存在するページ名またはエイリアスと完全に一致した場合は自動リンク化
          const matchedTerm = autoLinkTerms.find(t => t.text === aPart);
          if (matchedTerm) {
            return (
              <span
                key={aKey}
                onClick={() => handleWikiLink(matchedTerm.target)}
                className="cursor-pointer text-[#3366cc] hover:underline"
                title={matchedTerm.target}
              >
                {aPart}
              </span>
            );
          }
          return <React.Fragment key={aKey}>{aPart}</React.Fragment>;
        });
      }

      // 通常のテキスト (フォールバック)
      return <React.Fragment key={currentKey}>{part}</React.Fragment>;
    });
  };

  const renderContent = (text, isEditMode = false) => {
    if (!text) {
      return [<p key="empty" className="text-gray-500 italic text-[14px]">まだ記事がありません。「編集」タブから内容を追加してください。</p>];
    }

    // --- 脚注・nowikiの抽出と置き換え ---
    const refs = [];
    const nowikiBlocks = [];
    let processedText = text;
    if (processedText) {
      // 先にnowikiを抽出し、内部の記法がパースされないようにプレースホルダーに置き換える
      // 🌟 行番号のズレを防ぐため、内部の改行数分だけ [NOWIKI_EMPTY] 行を挿入する
      processedText = processedText.replace(/<nowiki>([\s\S]*?)<\/nowiki>/g, (match, content) => {
        nowikiBlocks.push(content);
        const newlines = match.match(/\n/g) || [];
        const emptyBlocks = '\n[NOWIKI_EMPTY]'.repeat(newlines.length);
        return `[NOWIKI_BLOCK:${nowikiBlocks.length - 1}]${emptyBlocks}`;
      });
      processedText = processedText.replace(/<ref>([\s\S]*?)<\/ref>/g, (match, content) => {
        refs.push(content);
        const newlines = match.match(/\n/g) || [];
        const emptyBlocks = '\n[NOWIKI_EMPTY]'.repeat(newlines.length);
        return `[REF_LINK:${refs.length}]${emptyBlocks}`;
      });
    }

    let h2Count = 0;
    let h3Count = 0;
    const lines = processedText.split('\n');
    const elements = [];
    let hasInsertedToc = false;

    const tocJsx = tocItems.length > 0 ? (
      <div key="toc-auto" className="bg-[#f8f9fa] border border-[#a2a9b1] p-3 md:p-4 inline-block min-w-[250px] mb-6 mt-2 clear-both md:clear-none print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-2 justify-center">
          <h2 className="font-bold text-center text-[14px]">目次</h2>
          <button onClick={() => setIsTocOpen(!isTocOpen)} className="text-[#3366cc] text-xs print:hidden">
            [{isTocOpen ? '非表示' : '表示'}]
          </button>
        </div>
        {/* 印刷時は常に目次を表示 */}
        <div className="print:block" style={{ display: isTocOpen ? 'block' : undefined }}>
          <ul className="text-[13px] md:text-[14px] space-y-1">
            {tocItems.map(item => (
              <li key={item.id} className={`${item.level === 2 ? 'ml-4' : ''}`}>
                <a href={`#${item.id}`} className="text-[#3366cc] hover:underline flex items-start gap-1 print:text-black print:no-underline">
                  <span className="text-gray-500 shrink-0">{item.title.split(' ')[0]}</span>
                  <span>{item.title.split(' ')[1]}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ) : null;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const startIndex = i;
      let pushedElement = null;

      // 🌟 NOWIKI等の改行合わせのための空行は無視して進める
      if (trimmedLine === '[NOWIKI_EMPTY]') {
        i++;
        continue;
      }

      // 🌟 トップページ専用枠
      const topBoxMatch = trimmedLine.match(/^{{トップ枠\|(.+)}}$/);
      if (topBoxMatch) {
        const content = topBoxMatch[1];
        const parts = content.split('|');
        const title = parts[0];
        const textContent = parts.length > 1 ? parts.slice(1).join('|') : '';

        pushedElement = (
          <div key={`line-${i}`} className="mb-8 p-6 md:p-8 bg-white border-2 border-[#a5d6a7] rounded-xl shadow-sm relative overflow-hidden flex flex-col print:border print:border-black print:shadow-none">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              <div className="flex w-24 h-24 md:w-32 md:h-32 flex-shrink-0 items-center justify-center overflow-hidden">
                <img
                  src="/わかめ圧縮.jpg"
                  alt="トップ画像"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://placehold.jp/ffffff/000000/128x128.png?text=🌳";
                  }}
                />
              </div>
              <div className="flex-1 mt-2 md:mt-4 text-center md:text-left">
                <h2 className="text-2xl md:text-4xl mb-2 md:mb-3 font-normal text-[#202122]" style={{ fontFamily: wikiBodyFont }}>
                  {parseInline(title, `top-title-${i}`, nowikiBlocks)}
                </h2>
                <p className="text-sm md:text-base text-[#202122] mb-4 md:mb-8">{parseInline(textContent, `top-text-${i}`, nowikiBlocks)}</p>
              </div>
            </div>
            <div className="text-right text-gray-600 text-[13px] md:text-[14px] mt-4 print:hidden">
              現在<span className="font-bold text-[#3366cc] hover:underline cursor-pointer">{pages.length.toLocaleString()}</span>本の記事、<span className="font-bold text-[#3366cc] hover:underline cursor-pointer">{userCount.toLocaleString()}</span>人の登録利用者が存在します。
            </div>
          </div>
        );
        i++;
      }
      // 基礎情報 (Infobox) 表記法
      else if (trimmedLine.startsWith('{{基礎情報')) {
        const infoData = [];
        const titleMatch = trimmedLine.match(/^{{基礎情報\s*(.*)$/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('}}')) {
          const infoLine = lines[i].trim();
          if (infoLine.startsWith('|')) {
            const eqIndex = infoLine.indexOf('=');
            if (eqIndex !== -1) {
              const key = infoLine.slice(1, eqIndex).trim();
              const value = infoLine.slice(eqIndex + 1).trim();
              infoData.push({ key, value });
            }
          }
          i++;
        }
        pushedElement = (
          <div key={`line-${startIndex}`} className="float-right clear-right w-[260px] md:w-[300px] ml-4 mb-4 bg-[#f8f9fa] border border-[#a2a9b1] text-[13px] shadow-sm relative z-10 print:break-inside-avoid print:shadow-none print:border-black">
            {title && (
              <div className="text-center font-bold bg-[#eaecf0] p-2 border-b border-[#a2a9b1] text-[14px] text-[#202122] print:bg-gray-100 print:border-black">
                {parseInline(title, `info-maintitle-${startIndex}`, nowikiBlocks)}
              </div>
            )}
            <table className="w-full text-left border-collapse print:border-black">
              <tbody>
                {infoData.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#eaecf0] last:border-none print:border-gray-300">
                    <th className="w-[35%] p-2 bg-[#eaecf0] border-r border-[#a2a9b1] font-bold align-top text-[#202122] print:bg-gray-100 print:border-gray-300">
                      {parseInline(item.key, `info-key-${startIndex}-${idx}`, nowikiBlocks)}
                    </th>
                    <td className="p-2 align-top break-words text-[#202122]">
                      {parseInline(item.value, `info-val-${startIndex}-${idx}`, nowikiBlocks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i++;
      }
      // アンサイクロペディア風メッセージボックス (秀逸のみ)
      else if (trimmedLine.match(/^{{(秀逸)\|(.+)}}$/)) {
        const msgMatch = trimmedLine.match(/^{{(秀逸)\|(.+)}}$/);
        const content = msgMatch[2];
        const parts = content.split('|');
        const title = parts[0];
        const textContent = parts.length > 1 ? parts.slice(1).join('|') : '';
        const iconContent = (
          <img
            src="/圧縮メリン.jpg"
            alt="秀逸"
            className="w-[80px] h-[80px] object-contain rounded-md print:grayscale"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.jp/ffffff/000000/60x60.png?text=%F0%9F%90%A4"; }}
          />
        );
        pushedElement = (
          <div key={`line-${startIndex}`} className={`mx-auto w-[95%] md:w-[85%] bg-[#fbfbfb] border-[2px] border-[#d4af37] mb-6 mt-4 flex items-center p-3 md:p-4 shadow-sm rounded-sm print:break-inside-avoid print:border-black print:bg-white print:shadow-none`}>
            <div className="w-[80px] md:w-[100px] flex-shrink-0 flex justify-center items-center">
              {iconContent}
            </div>
            <div className="flex-1 px-3 md:px-5 text-center text-[#202122]">
              {textContent ? (
                <>
                  <div className="text-[18px] md:text-[20px] mb-2 font-bold">{parseInline(title, `msg-title-${startIndex}`, nowikiBlocks)}</div>
                  <div className="text-[14px] leading-[1.5] text-[#202122]">{parseInline(textContent, `msg-text-${startIndex}`, nowikiBlocks)}</div>
                </>
              ) : (
                <div className="text-[18px] md:text-[20px] leading-[1.5] font-bold">{parseInline(title, `msg-title-${startIndex}`, nowikiBlocks)}</div>
              )}
            </div>
          </div>
        );
        i++;
      }
      // シンプルな灰色の枠 (1行対応)
      else if (trimmedLine.match(/^{{枠\|(.+)}}$/)) {
        const singleBoxMatch = trimmedLine.match(/^{{枠\|(.+)}}$/);
        pushedElement = (
          <div key={`line-${startIndex}`} className="bg-[#f8f9fa] border border-[#a2a9b1] p-3 md:p-4 mb-4 text-[14px] leading-[1.6] text-[#202122] print:break-inside-avoid print:border-black print:bg-white">
            {parseInline(singleBoxMatch[1], `box1-${startIndex}`, nowikiBlocks)}
          </div>
        );
        i++;
      }
      // シンプルな灰色の枠 (複数行対応)
      else if (trimmedLine === '{{枠') {
        const boxLines = [];
        i++;
        while (i < lines.length && lines[i].trim() !== '}}') {
          boxLines.push(lines[i]);
          i++;
        }
        pushedElement = (
          <div key={`line-${startIndex}`} className="bg-[#f8f9fa] border border-[#a2a9b1] p-3 md:p-4 mb-4 text-[14px] leading-[1.6] text-[#202122] print:break-inside-avoid print:border-black print:bg-white">
            {boxLines.map((bLine, bIdx) => (
              <p key={bIdx} className="mb-1 last:mb-0">{parseInline(bLine, `boxm-${startIndex}-${bIdx}`, nowikiBlocks)}</p>
            ))}
          </div>
        );
        i++;
      }
      // 見出し H2
      else if (line.startsWith('## ')) {
        if (!hasInsertedToc && tocJsx) {
          elements.push(tocJsx);
          hasInsertedToc = true;
        }
        h2Count++;
        h3Count = 0;
        pushedElement = (
          <h2 key={`line-${startIndex}`} id={`h2-${h2Count}`} className="text-2xl font-normal border-b border-[#a2a9b1] pb-1 mt-8 mb-4 flex items-baseline gap-3 print:break-after-avoid print:border-black">
            <span>{parseInline(line.slice(3).trim(), `h2-${startIndex}`, nowikiBlocks)}</span>
            <span onClick={() => handleEditSection(startIndex)} className="text-[13px] text-[#3366cc] cursor-pointer hover:underline select-none font-sans print:hidden">
              [編集]
            </span>
          </h2>
        );
        i++;
      }
      // 見出し H3
      else if (line.startsWith('### ')) {
        if (!hasInsertedToc && tocJsx) {
          elements.push(tocJsx);
          hasInsertedToc = true;
        }
        h3Count++;
        pushedElement = (
          <h3 key={`line-${startIndex}`} id={`h3-${h2Count}-${h3Count}`} className="text-[1.15em] font-bold mt-6 mb-2 flex items-baseline gap-3 print:break-after-avoid">
            <span>{parseInline(line.slice(4).trim(), `h3-${startIndex}`, nowikiBlocks)}</span>
            <span onClick={() => handleEditSection(startIndex)} className="text-[12px] text-[#3366cc] font-normal cursor-pointer hover:underline select-none font-sans print:hidden">
              [編集]
            </span>
          </h3>
        );
        i++;
      }
      // リスト (箇条書き)
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const listItems = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
          listItems.push(lines[i].slice(2).trim());
          i++;
        }
        pushedElement = (
          <ul key={`ul-${startIndex}`} className="list-disc list-outside ml-6 mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-[1.5] text-[14px]">{parseInline(item, `li-${startIndex}-${idx}`, nowikiBlocks)}</li>
            ))}
          </ul>
        );
      }
      // 空行
      else if (trimmedLine === '') {
        pushedElement = <div key={`line-${startIndex}`} className="h-4"></div>;
        i++;
      }
      // 通常の段落
      else {
        pushedElement = <p key={`line-${startIndex}`} className="mb-2 leading-[1.5] text-[14px] px-1 -mx-1 print:px-0 print:mx-0">{parseInline(line, `p-${startIndex}`, nowikiBlocks)}</p>;
        i++;
      }

      // --- 編集モード時のハイライト処理 ---
      if (pushedElement) {
        const endIndex = i - 1;
        const isActive = isEditMode && activeLineIndex !== null && activeLineIndex >= Math.min(startIndex, endIndex) && activeLineIndex <= Math.max(startIndex, endIndex);

        if (isActive) {
          const existingClassName = pushedElement.props.className || '';
          const highlightClass = " relative z-10 rounded-[2px] bg-[#fff8c4] shadow-[0_0_0_2px_#f0c14b] transition-all duration-200 print:bg-transparent print:shadow-none ";
          elements.push(React.cloneElement(pushedElement, {
            className: `${existingClassName} ${highlightClass}`,
            id: 'active-preview-element' // 🌟 プレビュー追従スクロールの目印
          }));
        } else {
          elements.push(pushedElement);
        }
      }
    }

    // 🌟 記事の最後まで見出しがなかった場合は、最後に目次を置く
    if (!hasInsertedToc && tocJsx) {
      elements.push(tocJsx);
    }

    // 🌟 最後に脚注セクションを追加
    if (refs.length > 0) {
      elements.push(
        <h2 key="h2-references" id="h2-references" className="text-2xl font-normal border-b border-[#a2a9b1] pb-1 mt-8 mb-4 flex items-baseline gap-3 print:break-before-auto print:border-black">
          <span>脚注</span>
        </h2>
      );
      elements.push(
        <div key="refs-container" className="text-[13px] mt-2 print:break-inside-avoid">
          {refs.map((refContent, idx) => (
            <div key={idx} id={`cite_note-${idx + 1}`} className="flex items-start mb-1">
              <div className="w-4 text-right mr-1 shrink-0">{idx + 1}.</div>
              <a href={`#cite_ref-${idx + 1}`} className="text-[#3366cc] hover:underline mr-1 font-bold print:text-black print:no-underline">^</a>
              <div className="break-words flex-1">{parseInline(refContent.trim(), `ref-${idx}`, nowikiBlocks)}</div>
            </div>
          ))}
        </div>
      );
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-[#202122] font-sans print:bg-white" style={{ zoom: 1.1 }}>

      {/* 🌟 印刷用のグローバルスタイル設定 */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            zoom: 1 !important; /* 印刷時は1.1倍ズームを解除して綺麗に収める */
          }
          @page {
            margin: 15mm; /* PDF出力時の余白 */
          }
        }
      `}</style>

      {/* トップナビゲーション (モバイル用) */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#a7d7f9] p-3 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
            <Menu size={24} />
          </button>
          <span className="text-xl font-bold tracking-tight">埼大Wiki</span>
        </div>
        <div className="flex items-center gap-3 text-[#3366cc]">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Avatar src={activeUserProfile?.avatarUrl} name={activeUserProfile?.name || currentAccountId} color={activeUserProfile?.avatarColor} size="xs" />
          </span>
          <button onClick={() => navigate('/app')} className="p-1 text-gray-500 hover:text-black">
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto flex print:max-w-none print:w-full print:block">

        {/* 左サイドバー */}
        <div className={`
          fixed md:sticky top-0 left-0 h-screen w-[13rem] md:w-[13rem] flex-shrink-0 
          pt-4 md:pt-6 px-4 bg-[#f6f6f6] md:bg-transparent z-40
          transition-transform duration-300 ease-in-out border-r border-[#a7d7f9] md:border-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          print:hidden /* 🌟 印刷時非表示 */
        `}>
          <div className="hidden md:flex justify-center mb-6">
            <div className="text-center cursor-pointer" onClick={() => navigate('/app')}>
              <Users size={42} className="mx-auto text-[#3366cc] mb-2" />
              <div className="text-2xl font-bold tracking-tighter">埼大Wiki</div>
              <div className="text-[11px] text-gray-500 mt-1 hover:underline">← MeLinkに戻る</div>
            </div>
          </div>

          <div className="space-y-6">

            {/* 🌟 ナビゲーション (固定) */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">ナビゲーション</h3>
              <ul className="text-[13px] space-y-1 text-[#3366cc]">
                <li
                  onClick={() => {
                    const mainPage = pages.find(p => p.title === 'メインページ');
                    setSelectedPageId(mainPage ? mainPage.id : 'main_placeholder');
                    setActiveTab('page');
                    setIsSidebarOpen(false);
                  }}
                  className={`cursor-pointer px-2 py-1 rounded-sm ${selectedPage?.title === 'メインページ' && activeTab !== 'edit' ? 'font-bold bg-[#eaecf0] text-[#202122]' : 'hover:underline'}`}
                >
                  メインページ
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">ページ一覧</h3>
              <div className="mb-3">
                <button onClick={handleCreateNew} className="text-[13px] flex items-center gap-1 text-[#3366cc] hover:bg-[#eaecf0] transition-colors bg-white border border-[#a7d7f9] px-2 py-1.5 rounded-sm w-full justify-center font-bold shadow-sm">
                  <Plus size={14} /> 新規ページ作成
                </button>
              </div>
              <ul className="text-[13px] space-y-1 text-[#3366cc] max-h-[50vh] overflow-y-auto">
                {filteredPages.map(p => (
                  <li key={p.id}
                    onClick={() => { setSelectedPageId(p.id); setActiveTab('page'); setIsSidebarOpen(false); }}
                    className={`cursor-pointer px-2 py-1 rounded-sm ${selectedPageId === p.id && activeTab !== 'edit' ? 'font-bold bg-[#eaecf0] text-[#202122]' : 'hover:underline'}`}
                  >
                    {p.title || '無題のページ'}
                  </li>
                ))}
                {filteredPages.length === 0 && <li className="text-gray-500 px-2">ページがありません</li>}
              </ul>
            </div>

            <div className="border-t border-[#c8ccd1] pt-4 md:hidden">
              <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black font-bold">
                <ArrowLeft size={16} /> MeLinkに戻る
              </button>
            </div>
          </div>
        </div>

        {/* モバイル用オーバーレイ */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 md:hidden print:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* メインコンテンツエリア */}
        <div className="flex-1 min-w-0 pb-12 print:pb-0 print:w-full">

          <div className="hidden md:flex justify-end items-center gap-4 py-4 pr-6 print:hidden">
            <div className="flex items-center text-sm text-[#3366cc] gap-4">
              <span className="flex items-center gap-1.5 font-bold cursor-pointer hover:underline" onClick={() => navigate('/app')} title="マイページへ">
                <Avatar src={activeUserProfile?.avatarUrl} name={activeUserProfile?.name || currentAccountId} color={activeUserProfile?.avatarColor} size="sm" />
                {activeUserProfile?.name || currentAccountId}
              </span>
            </div>
          </div>

          <div className="bg-white md:border border-[#a7d7f9] md:rounded-sm shadow-[0_1px_1px_rgba(0,0,0,0.05)] pt-6 pb-12 px-5 md:px-10 md:mr-6 min-h-screen print:border-none print:shadow-none print:m-0 print:p-0 print:min-h-0 print:block">

            {/* 上部タブと検索 */}
            <div className="flex items-end border-b border-[#a7d7f9] mb-6 select-none overflow-x-auto no-scrollbar print:hidden">
              <div className="flex flex-1">
                <button
                  onClick={() => setActiveTab('page')}
                  className={`px-3 py-1.5 text-sm font-bold border border-b-0 rounded-t-sm transition-colors whitespace-nowrap
                    ${activeTab === 'page' ? 'bg-white border-[#a7d7f9] text-[#202122] relative top-[1px] z-10' : 'bg-[#f8f9fa] border-transparent text-[#3366cc] hover:bg-white'}
                  `}
                >
                  ページ
                </button>
                <button
                  onClick={() => alert('ノート機能は現在準備中です。')}
                  className={`px-3 py-1.5 text-sm border border-b-0 rounded-t-sm transition-colors whitespace-nowrap bg-[#f8f9fa] border-transparent text-[#3366cc] hover:bg-white`}
                >
                  ノート
                </button>
              </div>

              {/* 検索バー */}
              <div className="hidden md:flex items-center mb-1 mr-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="埼大Wiki内を検索"
                    className="border border-[#a2a9b1] rounded-sm pl-2 pr-8 py-1 text-sm w-48 focus:border-[#3366cc] focus:outline-none focus:ring-1 focus:ring-[#3366cc]"
                  />
                  <Search size={16} className="absolute right-2 top-1.5 text-gray-500" />
                </div>
              </div>

              <div className="flex border-l border-transparent ml-2 gap-1">
                <button onClick={() => setActiveTab('page')} className={`px-3 py-1.5 text-sm border border-b-0 rounded-t-sm font-bold whitespace-nowrap ${activeTab === 'page' ? 'bg-white border-[#a7d7f9] text-[#202122] relative top-[1px] z-10' : 'bg-[#f8f9fa] border-transparent text-[#3366cc] hover:bg-white'}`}>
                  閲覧
                </button>
                <button onClick={() => setActiveTab('edit')} className={`px-3 py-1.5 text-sm border border-b-0 rounded-t-sm font-bold whitespace-nowrap ${activeTab === 'edit' ? 'bg-white border-[#a7d7f9] text-[#202122] relative top-[1px] z-10' : 'bg-[#f8f9fa] border-transparent text-[#3366cc] hover:bg-white'}`}>
                  編集
                </button>
                {/* 🌟 PDFダウンロードボタン */}
                <button
                  onClick={handleDownloadPDF}
                  className={`px-3 py-1.5 text-sm border border-b-0 rounded-t-sm font-bold whitespace-nowrap bg-[#f8f9fa] border-transparent text-gray-600 hover:bg-white flex items-center gap-1.5 transition-colors`}
                  title="PDFとして保存 (ブラウザの印刷機能を使用します)"
                >
                  <Download size={14} /> PDFをダウンロード
                </button>
              </div>
            </div>

            {/* 記事ヘッダー */}
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl border-b border-[#a2a9b1] pb-2 text-[#000000] font-normal print:border-black">
                {activeTab === 'edit' && (selectedPageId === 'new' || selectedPageId === 'main_placeholder') ? (selectedPageId === 'main_placeholder' ? 'メインページ' : '新規ページ作成') : (selectedPage?.title || '無題のページ')}
              </h1>
            </div>

            {/* モード分岐: 閲覧 or 編集 */}
            {activeTab === 'page' && (() => {
              const elements = renderContent(selectedPage?.content, false);

              return (
                <div
                  className="text-[14px] leading-[1.5] text-[#202122] after:content-[''] after:table after:clear-both print:text-black"
                  style={{ fontFamily: wikiBodyFont }}
                >
                  <div className="wiki-content">
                    {elements}
                  </div>
                </div>
              );
            })()}

            {activeTab === 'edit' && (
              <div className="space-y-4 mt-4 bg-[#f8f9fa] p-4 border border-[#c8ccd1] rounded-sm shadow-inner font-sans print:hidden">
                {/* 🌟 PC推奨メッセージ */}
                <div className="flex items-start gap-2 bg-[#eaf3ff] border border-[#a7d7f9] p-3 rounded-sm text-[#202122] text-[13px] md:text-[14px]">
                  <AlertCircle size={18} className="text-[#3366cc] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>【注意】</strong><strong>記事の加筆・編集はPCでのみ行えます。</strong>スマホでもやろうと思えばできますが、めっちゃやりにくいです。
                  </p>
                </div>

                {/* 🌟 編集用アクションバー (上部) */}
                <div className="flex gap-3 pb-3 border-b border-[#c8ccd1] mb-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#3366cc] text-white px-5 py-2.5 rounded-sm font-bold flex items-center gap-2 hover:bg-[#2a4b8d] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save size={18} />
                    {isSaving ? '保存中...' : 'ページを保存'}
                  </button>
                  {/* 🌟 削除ボタンの表示条件を変更 */}
                  {selectedPageId !== 'new' && selectedPageId !== 'main_placeholder' && isCreator && (
                    <button
                      onClick={handleDelete}
                      className="border border-red-500 text-red-600 px-4 py-2.5 rounded-sm font-bold flex items-center gap-2 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={18} />
                      削除
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ページタイトル</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    disabled={selectedPageId === 'main_placeholder'}
                    className={`w-full border border-[#a2a9b1] rounded-sm p-2 focus:border-[#3366cc] focus:outline-none focus:ring-1 focus:ring-[#3366cc] ${selectedPageId === 'main_placeholder' ? 'bg-gray-100' : ''}`}
                    placeholder="例: 埼玉大学"
                  />
                </div>

                {/* 🌟 エディタレイアウトの高さ固定化 */}
                <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-320px)] min-h-[500px]">

                  {/* プレビュー部分 */}
                  <div className="flex-1 w-full lg:w-1/2 flex flex-col min-h-0">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex-shrink-0">
                      リアルタイムプレビュー
                    </label>
                    <div
                      ref={previewRef}
                      className="w-full border border-[#a2a9b1] rounded-sm p-5 bg-white flex-1 overflow-y-auto shadow-inner min-h-0 relative"
                    >
                      <div
                        className="text-[14px] leading-[1.5] text-[#202122] after:content-[''] after:table after:clear-both"
                        style={{ fontFamily: wikiBodyFont }}
                      >
                        <h1 className="text-3xl md:text-4xl border-b border-[#a2a9b1] pb-2 mb-4 text-[#000000] font-normal">
                          {editTitle || '無題のページ'}
                        </h1>
                        {(() => {
                          const elements = renderContent(editContent, true);
                          return (
                            <>
                              <div className="wiki-content">
                                {elements}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* エディタ部分 */}
                  <div className="flex-1 w-full lg:w-1/2 flex flex-col min-h-0">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between items-center flex-shrink-0">
                      <span>本文内容</span>
                    </label>

                    {/* 🌟 エディタツールバー */}
                    <div className="flex flex-wrap gap-1 bg-[#eaecf0] border border-[#a2a9b1] border-b-0 rounded-t-sm p-1 flex-shrink-0">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertLinePrefix('## ')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="大見出し (H2)">
                        <Heading2 size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertLinePrefix('### ')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="中見出し (H3)">
                        <Heading3 size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('**', '**', '太字テキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="太字">
                        <Bold size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('*', '*', '斜体テキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="斜体 (セリフ体)">
                        <Italic size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('***', '***', '太字斜体テキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="太字＋斜体 (セリフ体)">
                        <span className="font-serif italic font-bold text-[14px] leading-none px-0.5">A</span>
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('~~', '~~', '取り消しテキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="取り消し線">
                        <Strikethrough size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertLinePrefix('* ')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="箇条書き">
                        <List size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('[[', ']]', 'ページ名')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="内部リンク">
                        <LinkIcon size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('[[リンク先ページ名|', ']]', '表示テキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="エイリアスリンク (表示テキストを変更)">
                        <Link2 size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('[', '](https://...)', 'リンクテキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="外部リンク">
                        <Globe size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('{{秀逸|秀逸な記事|この記事は[[秀逸な記事]]だよ。書いた本人と[[メリンちゃん|メリン陛下]]が言うんだから間違いない。より素晴らしい記事にできるってんなら、してみやがってください。お願いしましたよ。}}\n', '', '')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="秀逸">
                        <Star size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('{{枠|この記事は書きかけです。狂った[[執筆者]]の参加を求めます。}}\n', '', '')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="要請1 (1行枠)">
                        <Square size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText(`{{枠\nこの項目「${editTitle || 'その項目名'}」は、[[執筆者]]がクラックをキメていた可能性もありますが、今はまだクソの山です。より愉快にしてくださる協力者を求めています。\n}}\n`, '', '')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="要請2 (複数行枠)">
                        <MessageSquare size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText(`{{枠\nこの項目「${editTitle || 'その項目名'}」は、現在進行中の取り組みに関する記事です。執筆者が奮起するたびに内容が増えるため、記事の追従が困難な場合があります。ですが、なにより愉快にしてくださる協力者を求めています。\n}}\n`, '', '')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="進行中 (複数行枠)">
                        <Clock size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('{{基礎情報 タイトル\n|項目=', '\n}}', '内容')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="基礎情報">
                        <Table size={16} />
                      </button>
                      {/* 🌟 脚注と要出典のボタン */}
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('<ref>', '</ref>', '脚注の内容')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="脚注 (自動連番とリスト生成)">
                        <Quote size={16} />
                      </button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('[要出典]', '', '')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="要出典">
                        <HelpCircle size={16} />
                      </button>
                      {/* 🌟 コード/Wiki記法そのまま表示ボタン */}
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertText('<nowiki>', '</nowiki>', 'そのまま表示したいWiki記法やテキスト')} className="p-1.5 hover:bg-white hover:shadow-sm text-gray-700 rounded transition-colors" title="Wiki記法を無効化 (そのまま表示)">
                        <Code size={16} />
                      </button>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={(e) => {
                        setEditContent(e.target.value);
                        updateActiveLine();
                      }}
                      onClick={updateActiveLine}
                      onKeyUp={updateActiveLine}
                      onSelect={updateActiveLine}
                      className="w-full border border-[#a2a9b1] rounded-b-sm p-3 flex-1 font-mono text-sm focus:border-[#3366cc] focus:outline-none focus:ring-1 focus:ring-[#3366cc] leading-relaxed resize-none overflow-y-auto min-h-0"
                      placeholder="ここに記事の内容を書きます..."
                    />
                  </div>

                </div>

                {/* 下部の保存ボタンも残しておく */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#3366cc] text-white px-5 py-2.5 rounded-sm font-bold flex items-center gap-2 hover:bg-[#2a4b8d] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save size={18} />
                    {isSaving ? '保存中...' : 'ページを保存'}
                  </button>
                </div>
              </div>
            )}

            {/* 🌟 フッター情報 (更新者と作成者を分けて表示) */}
            <div className="mt-16 pt-6 border-t border-[#a2a9b1] text-xs text-gray-600 pb-8 font-sans print:border-black">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <p>最終更新: {formatDate(selectedPage?.updatedAt)}</p>
                  {selectedPage && (() => {
                    const editorId = selectedPage.lastEditorId || selectedPage.authorId;
                    if (!editorId || selectedPage.id === 'main_placeholder') return null;
                    const isMe = editorId === currentAccountId;
                    const displayAvatarUrl = isMe ? (activeUserProfile?.avatarUrl || selectedPage.lastEditorAvatarUrl || selectedPage.authorAvatarUrl) : (selectedPage.lastEditorAvatarUrl || selectedPage.authorAvatarUrl);
                    const displayName = isMe ? (activeUserProfile?.name || selectedPage.lastEditorName || selectedPage.authorName || editorId) : (selectedPage.lastEditorName || selectedPage.authorName || editorId);
                    const displayColor = isMe ? (activeUserProfile?.avatarColor || selectedPage.lastEditorColor || selectedPage.authorColor) : (selectedPage.lastEditorColor || selectedPage.authorColor);

                    return (
                      <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3 print:border-black">
                        <div className="flex-shrink-0 print:hidden">
                          <Avatar
                            src={displayAvatarUrl}
                            name={displayName}
                            color={displayColor}
                            size="xs"
                          />
                        </div>
                        <span className="text-gray-500 print:text-black">更新者: </span>
                        <span className="font-bold text-[#3366cc] hover:underline cursor-pointer print:text-black print:no-underline">
                          {displayName}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* 🌟 作成日時の表示 (データがない場合はIDや更新日時から推測) */}
                {selectedPage && selectedPage.id !== 'main_placeholder' && (() => {
                  let createdDate = selectedPage.createdAt;

                  // DB上に作成日が存在しない場合、記事IDから作成日時を復元する
                  if (!createdDate && selectedPage.id && selectedPage.id.startsWith('page_')) {
                    const ts = parseInt(selectedPage.id.replace('page_', ''), 10);
                    if (!isNaN(ts)) createdDate = new Date(ts);
                  }

                  // IDからも復元できなかった場合、更新のたびに日付が変わらないように
                  // 記事IDを元にした計算で固定の「みなし作成日」を算出する
                  if (!createdDate) {
                    let hash = 0;
                    for (let i = 0; i < selectedPage.id.length; i++) {
                      hash = selectedPage.id.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    // 初期データの基準日を最近（2026年4月下旬頃）に設定
                    const baseDate = new Date('2026-04-20T00:00:00+09:00').getTime();
                    // 0〜14日間のランダム（固定）なミリ秒オフセットを追加
                    const offsetMs = Math.abs(hash) % (14 * 24 * 60 * 60 * 1000);
                    createdDate = new Date(baseDate + offsetMs);
                  }

                  return (
                    <div className="flex items-center gap-3 text-gray-400 print:text-gray-600">
                      <p>ページ作成: {formatDate(createdDate)}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}