import React, { useState, useEffect } from 'react';
import { X, Megaphone, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

const CACHE_KEY = 'su_news_cache_v2';
const CACHE_DURATION = 10 * 60 * 1000; // キャッシュ有効期間: 10分 (ミリ秒)

const UniversityNotice = ({ onClose, isDark }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('すべて');

  const tabs = ['すべて', 'ニュース', '研究トピックス', '入試情報', 'メディア掲載'];

  // フォールバック用ニュースデータ (2026年6月時点の本物のデータ)
  const fallbackNewsData = [
    {
      id: "fallback-1",
      title: "「第17回ダイバーシティ推進センター講演会」を開催しました",
      date: "2026.06.26",
      category: "ニュース",
      imgUrl: "https://www.saitama-u.ac.jp/media/kh2026062604.JPG",
      url: "https://www.saitama-u.ac.jp/news_archives/202606261130.html"
    },
    {
      id: "fallback-2",
      title: "Christian Ebere Enyoh 外国人特別研究員の研究成果がEurekAlert!に掲載されました",
      date: "2026.06.26",
      category: "研究トピックス",
      imgUrl: "https://www.saitama-u.ac.jp/media/kh2026062603.jpeg",
      url: "https://www.saitama-u.ac.jp/topics_archives/202606261100.html"
    },
    {
      id: "fallback-3",
      title: "＊新着情報＊受験生向けオンラインマガジン「SAIDAI CONCIERGE」",
      date: "2026.06.25",
      category: "入試情報",
      imgUrl: "https://www.saitama-u.ac.jp/media/20260624sc.png",
      url: "https://www.saitama-u.ac.jp/exam_archives/20260240900.html"
    },
    {
      id: "fallback-4",
      title: "アントレコモンズ オープニングイベントおよびアントレプレナーシップ・ワークショップを開催しました",
      date: "2026.06.25",
      category: "ニュース",
      imgUrl: "https://www.saitama-u.ac.jp/media/kh2026062402.jpg",
      url: "https://www.saitama-u.ac.jp/news_archives/202606241600.html"
    },
    {
      id: "fallback-5",
      title: "起業家Casey Wahl氏をお招きした講義を開催-国際共修科目「Introduction to International Relations」より",
      date: "2026.06.24",
      category: "ニュース",
      imgUrl: "",
      url: "https://www.saitama-u.ac.jp/news_archives/202606231130.html"
    },
    {
      id: "fallback-6",
      title: "【新聞掲載】大学院理工学研究科 蔭山健介教授の研究について掲載されました",
      date: "2026.06.23",
      category: "メディア掲載",
      imgUrl: "https://www.saitama-u.ac.jp/media/kh2026062301.jpg",
      url: "https://www.saitama-u.ac.jp/media_archives/202606231000.html"
    },
    {
      id: "fallback-7",
      title: "「次代を拓く 埼玉ものづくりフォーラム#1」を開催しました",
      date: "2026.06.24",
      category: "ニュース",
      imgUrl: "",
      url: "https://www.saitama-u.ac.jp/news_archives/202606231500.html"
    }
  ];

  // ニュースデータのフェッチ処理 (プロキシ並列/キャッシュ連動)
  const fetchNews = async (forceRefresh = false) => {
    // ローカルキャッシュを確認
    const cachedData = localStorage.getItem(CACHE_KEY);
    let cacheParsed = null;
    
    if (cachedData) {
      try {
        cacheParsed = JSON.parse(cachedData);
      } catch (e) {
        console.warn("Failed to parse cache:", e);
      }
    }

    const now = Date.now();

    // キャッシュが存在し、かつ強制更新ではなく、有効期間内（10分以内）であれば、キャッシュをそのまま使用して終了
    if (cacheParsed && !forceRefresh && (now - cacheParsed.timestamp < CACHE_DURATION)) {
      setNews(cacheParsed.items);
      setLoading(false);
      return;
    }

    // キャッシュはあるが有効期間が切れている、あるいは強制更新の場合：
    // ロード中の画面を見せないために、まずは古いキャッシュを画面に表示した状態で、バックグラウンドで静かにフェッチを行う
    if (cacheParsed) {
      setNews(cacheParsed.items);
      setLoading(false);
      setIsBackgroundFetching(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    let htmlText = '';
    let success = false;

    // 1. 高速な corsproxy.io をまず試す (タイムアウト3秒)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('https://corsproxy.io/?https://www.saitama-u.ac.jp/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        htmlText = await res.text();
        success = true;
      }
    } catch (e) {
      console.warn("corsproxy.io failed, trying allorigins:", e);
    }

    // 2. 失敗した場合は、実績のある api.allorigins.win にフォールバックする
    if (!success) {
      try {
        const targetUrl = 'https://www.saitama-u.ac.jp/';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          htmlText = data.contents;
          success = true;
        }
      } catch (e) {
        console.error("All proxies failed:", e);
      }
    }

    // パース処理
    if (success && htmlText) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const cards = doc.querySelectorAll('.news_card');
        const newsItems = [];

        cards.forEach((card, idx) => {
          const a = card.querySelector('a');
          if (!a) return;

          const href = a.getAttribute('href') || '';
          const url = href.startsWith('http') ? href : `https://www.saitama-u.ac.jp${href}`;

          const img = card.querySelector('img');
          let imgUrl = '';
          if (img) {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            imgUrl = src.startsWith('http') ? src : `https://www.saitama-u.ac.jp${src}`;
          }

          const time = card.querySelector('.news_time');
          const date = time ? time.textContent.trim().replace('[', '').replace(']', '') : '';

          const catSpan = card.querySelector('.news_cat');
          const category = catSpan ? catSpan.textContent.trim() : 'ニュース';

          const titleEl = card.querySelector('.news_card--title');
          const title = titleEl ? titleEl.textContent.trim() : '';

          newsItems.push({
            id: `fetched-${idx}-${url}`,
            title,
            date,
            category,
            imgUrl,
            url
          });
        });

        if (newsItems.length > 0) {
          setNews(newsItems);
          // 新しいデータを localStorage にキャッシュ保存 (タイムスタンプ付き)
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            items: newsItems
          }));
        } else {
          throw new Error("No news items parsed");
        }
      } catch (err) {
        console.error("Parsing HTML failed:", err);
        if (!cacheParsed) {
          setError("データの解析に失敗しました。一時的なデータを表示します。");
          setNews(fallbackNewsData);
        }
      }
    } else {
      // ネットワークエラーの場合、キャッシュが無ければフォールバックデータを使用
      if (!cacheParsed) {
        setError("ニュースの取得に失敗しました。一時的なデータを表示します。");
        setNews(fallbackNewsData);
      } else {
        // キャッシュがあればそれを表示し続け、警告を表示
        setError("最新データの取得に失敗したため、前回のキャッシュを表示しています。");
      }
    }

    setLoading(false);
    setIsBackgroundFetching(false);
  };

  useEffect(() => {
    fetchNews(false); // コンポーネント読み込み時はキャッシュ優先で起動
  }, []);

  const filteredNews = news.filter(item => {
    if (activeTab === 'すべて') return true;
    return item.category === activeTab;
  });

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col justify-between select-none ${
      isDark ? 'bg-black text-white' : 'bg-white text-gray-900'
    }`}>
      
      {/* 1. 上部ヘッダー */}
      <div className={`h-16 px-4 flex items-center justify-between z-10 border-b backdrop-blur-md ${
        isDark ? 'bg-black/80 border-zinc-800/80' : 'bg-white/80 border-gray-200'
      }`}>
        <button 
          onClick={onClose} 
          className={`p-2.5 rounded-full transition-colors active:scale-95 ${
            isDark ? 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
          title="閉じる"
        >
          <X size={20} />
        </button>
        <div className="flex items-center space-x-2">
          <Megaphone className={isDark ? 'text-red-400' : 'text-red-600'} size={18} />
          <span className="font-extrabold text-sm tracking-wider">大学からのお知らせ</span>
        </div>
        <button 
          onClick={() => fetchNews(true)} // 手動更新ボタンは強制再フェッチ
          disabled={loading || isBackgroundFetching}
          className={`p-2.5 rounded-full transition-colors active:scale-95 disabled:opacity-50 ${
            isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-200 text-gray-600'
          }`}
          title="手動更新"
        >
          <RefreshCw size={18} className={(loading || isBackgroundFetching) ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. カテゴリ切り替えタブ */}
      <div className={`h-12 border-b flex items-center overflow-x-auto scrollbar-none px-4 space-x-6 z-10 ${
        isDark ? 'bg-zinc-950/50 border-zinc-900/80' : 'bg-gray-50/50 border-gray-100'
      }`}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-full text-xs font-bold whitespace-nowrap border-b-2 flex items-center px-1 transition-all relative ${
              activeTab === tab
                ? (isDark ? 'text-white border-white font-black' : 'text-[#111827] border-[#111827] font-black')
                : (isDark ? 'text-zinc-500 border-transparent hover:text-zinc-300' : 'text-gray-400 border-transparent hover:text-gray-600')
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. お知らせリストエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        
        {/* 初回ロード中のスピナー表示 (キャッシュが無い場合のみ表示される) */}
        {loading && !news.length && (
          <div className="w-full h-64 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>新着情報を取得中...</p>
          </div>
        )}

        {/* バックグラウンドでの同期中またはエラーなどのステータスバー */}
        {!loading && (isBackgroundFetching || error) && (
          <div className={`my-2 p-2 px-3 rounded-2xl text-[10px] font-bold text-center border flex items-center justify-center space-x-2 ${
            error 
              ? (isDark ? 'bg-amber-950/20 border-amber-900/30 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600')
              : (isDark ? 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500')
          }`}>
            {isBackgroundFetching ? (
              <>
                <Loader2 className="animate-spin text-emerald-500" size={12} />
                <span>最新データにバックグラウンドで更新中...</span>
              </>
            ) : (
              <span>⚠️ {error}</span>
            )}
          </div>
        )}

        {!loading && filteredNews.length === 0 && (
          <div className="w-full h-48 flex items-center justify-center">
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>該当するお知らせはありません</p>
          </div>
        )}

        {filteredNews.length > 0 && (
          <div className="divide-y divide-zinc-800/40 dark:divide-zinc-800/40 border-zinc-800/40">
            {filteredNews.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex py-4 items-start space-x-3.5 group active:opacity-75 transition-opacity ${
                  isDark ? 'border-zinc-900/60' : 'border-gray-100'
                }`}
              >
                {/* 左：写真サムネイル */}
                <div className={`w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 border ${
                  isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-gray-50 shadow-sm'
                }`}>
                  {item.imgUrl ? (
                    <img 
                      src={item.imgUrl} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-[#123e20] to-[#041a0d] flex items-center justify-center text-white/90 font-black text-[9px] tracking-tight">埼大ニュース</div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#123e20] to-[#041a0d] flex items-center justify-center text-white/90 font-black text-[9px] tracking-tight">
                      埼大ニュース
                    </div>
                  )}
                </div>

                {/* 右：日付、カテゴリ、タイトル */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-16 py-0.5">
                  <h4 className={`text-[12px] sm:text-[13px] font-bold leading-snug line-clamp-2 ${
                    isDark ? 'text-zinc-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'
                  }`}>
                    {item.title}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-[10px] font-black ${
                      isDark ? 'text-pink-400' : 'text-pink-600'
                    }`}>
                      {item.date}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${
                      isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* 外部リンクマーク */}
                <div className={`pt-1 ${isDark ? 'text-zinc-600' : 'text-gray-300'}`}>
                  <ExternalLink size={12} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 4. 下部セーフエリア余白 (iOS対策) */}
      <div className={`h-4 ${isDark ? 'bg-black' : 'bg-white'} pb-safe`} />

    </div>
  );
};

export default UniversityNotice;
