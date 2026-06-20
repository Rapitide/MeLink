import React from 'react';
import { 
  X, HelpCircle, Calendar as LucideCalendar, BookOpen, ChevronLeft, Plus, MapPin, Clock 
} from 'lucide-react';
import { 
  getMiniMonthDays, getAcademicEventsForDate, getEventsForDate, getDaysForSingleMonth, getWeekDaysForDate, getColorClasses 
} from './todoCalendarUtils';

// ==============================================================
// 1. モバイル使い方バナーモーダル
// ==============================================================
export const MobileBannerModal = ({ showMobileBanner, handleHideMobileBanner, isDark, isMobile }) => {
  if (!showMobileBanner) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in select-none">
      {/* 背景のブラーオーバーレイ */}
      <div 
        onClick={handleHideMobileBanner} 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      ></div>
      
      {/* モーダルカード本体 */}
      <div className={`relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl overflow-hidden transform scale-100 transition-all duration-300 animate-scale-up ${
        isDark 
          ? 'bg-gray-950 border-gray-800 text-gray-100' 
          : 'bg-white border-gray-100 text-gray-800'
      }`}>
        
        {/* 閉じるボタン */}
        <button 
          onClick={handleHideMobileBanner} 
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
          }`}
          title="閉じる"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        {/* コンテンツ */}
        <div className="flex flex-col items-center text-center mt-3">
          
          <h3 className={`text-lg font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            始める前に 🚀
          </h3>
          <p className={`text-xs mb-5 font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            ToDoカレンダーの使い方ガイド
          </p>
          
          <div className="w-full space-y-4 text-left mb-6">
            <div className="flex items-start space-x-3 py-0.5">
              <span className="text-base mt-0.5 shrink-0">🗓️</span>
              <div>
                <h4 className={`text-xs font-extrabold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>時間割が自動連携！</h4>
                <p className={`text-[10px] leading-relaxed mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  「MY時間割」でインポートした時間割データが自動で本カレンダーに反映されます。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 py-0.5">
              <span className="text-base mt-0.5 shrink-0">✍️</span>
              <div>
                <h4 className={`text-xs font-extrabold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>予定の入力方法</h4>
                <p className={`text-[10px] leading-relaxed mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isMobile 
                    ? '日ビューから時間セルをタップするか、右上の「＋」から入力できます。'
                    : '曜日が固定の予定は左サイドバーから、単発の予定は空きマスをタップして右サイドバーから入力できます。'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 py-0.5">
              <span className="text-base mt-0.5 shrink-0">💻</span>
              <div>
                <h4 className={`text-xs font-extrabold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>PC入力・スマホ確認を推奨</h4>
                <p className={`text-[10px] leading-relaxed mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  スマホでも予定は入力できますが、広い画面 of PCで一気に予定を登録し、スマホで確認するのがオススメです。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 py-0.5">
              <span className="text-base mt-0.5 shrink-0">🔒</span>
              <div>
                <h4 className={`text-xs font-extrabold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>クラウド同期＆セキュリティ</h4>
                <p className={`text-[10px] leading-relaxed mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  データはログインアカウントに同期され、第三者がアクセスすることはできません。ソースコードもまとめ次第GitHubで公開します。
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleHideMobileBanner}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white text-xs font-extrabold shadow-lg shadow-indigo-500/20 active:scale-98 transition-all hover:brightness-110 flex items-center justify-center space-x-1.5"
          >
            <span>OK、カレンダーを開く</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 2. モバイル版 年ビュー ('year')
// ==============================================================
export const MobileYearView = ({
  isDark,
  setShowMobileBanner,
  setCurrentDate,
  jumpToMonthOnMobile,
  setMobileViewMode,
  setActiveLeftSidebar
}) => {
  const today = new Date();

  const yearsToRender = [
    {
      year: 2026,
      months: Array.from({ length: 12 }, (_, i) => i) // 1月〜12月
    },
    {
      year: 2027,
      months: Array.from({ length: 12 }, (_, i) => i) // 1月〜12月 (2027年12月まで表示)
    }
  ];

  return (
    <div className={`flex flex-col h-full select-none ${isDark ? 'bg-black text-white' : 'bg-[#fafaf9] text-gray-900'}`}>
      {/* ヘッダー */}
      <div className={`flex justify-between items-center px-4 py-3 border-b shrink-0 ${isDark ? 'border-gray-900 bg-black' : 'border-gray-200 bg-white'}`}>
        <div className="text-2xl font-black text-rose-500 tracking-tight">ToDoカレンダー</div>
        <button 
          onClick={() => {
            console.log("Help button clicked, setting showMobileBanner to true");
            setShowMobileBanner(true);
          }} 
          className="text-gray-400 hover:text-rose-500 active:scale-95 transition-all p-2 flex items-center justify-center shrink-0"
          title="使い方を見る"
        >
          <HelpCircle size={22} strokeWidth={2.5} className="pointer-events-none" />
        </button>
      </div>

      {/* 2026年・2027年のスクロールカレンダーリスト */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-8">
        {yearsToRender.map(({ year, months }) => (
          <div key={year} className="flex flex-col">
            {/* 年ヘッダー */}
            <div className="text-3xl font-black text-rose-500 mb-4 tracking-tight px-1">
              {year}年
            </div>

            {/* その年の各月ミニカレンダーリスト */}
            <div className="grid grid-cols-3 gap-x-2 gap-y-6">
              {months.map(m => {
                const monthDays = getMiniMonthDays(year, m);
                const monthName = `${m + 1}月`;
                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;

                // 学年歴の範囲（2026/4〜2027/3）内であるか判定（2026/1〜3月、および2027/4月以降は範囲外）
                const isClickable = (year === 2026 && m >= 3) || (year === 2027 && m <= 2);

                return (
                  <div 
                    key={m} 
                    className={`flex flex-col ${isClickable ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                    onClick={() => {
                      if (!isClickable) {
                        alert(year === 2027 && m >= 3 ? "2027年4月以降の月はご利用いただけません。" : "2026年3月以前の月はご利用いただけません。");
                        return;
                      }
                      const newDate = new Date(year, m, 1);
                      setCurrentDate(newDate);
                      jumpToMonthOnMobile(year, m);
                      setMobileViewMode('month');
                    }}
                  >
                    <div className={`text-[12px] font-extrabold mb-1 ${isCurrentMonth ? 'text-red-500 font-black' : 'text-rose-500/80'}`}>{monthName}</div>
                    <div className="grid grid-cols-7 text-center text-[7px] text-gray-500 font-bold mb-1">
                      {['日', '月', '火', '水', '木', '金', '土'].map(d => <span key={d}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center text-[8px] font-bold">
                      {monthDays.map((d, idx) => {
                        if (!d) return <span key={idx}></span>;
                        
                        const isRealToday = d.getFullYear() === today.getFullYear() && 
                                            d.getMonth() === today.getMonth() && 
                                            d.getDate() === today.getDate();

                        const academicEvents = getAcademicEventsForDate(d) || [];
                        const isHoliday = academicEvents.some(ev => ev.type === 'holiday');

                        let dayColor = isDark ? 'text-white' : 'text-gray-800';
                        if (isHoliday) dayColor = 'text-red-500';

                        return (
                          <div key={idx} className="h-4 w-full flex items-center justify-center relative select-none">
                            {isRealToday ? (
                              <span className="bg-[#ff3b30] text-white rounded-full flex items-center justify-center w-4 h-4 text-[8px] font-black shadow-sm leading-none">
                                {d.getDate()}
                              </span>
                            ) : (
                              <span className={`${dayColor} text-[8px] font-bold leading-none`}>
                                {d.getDate()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 下部ツールバー */}
      <div className={`fixed bottom-0 left-0 right-0 h-14 border-t px-6 py-2 flex justify-between items-center z-30 ${isDark ? 'bg-[#0d0d0d] border-gray-900' : 'bg-white border-gray-200'}`}>
        <button 
          onClick={() => {
            const now = new Date();
            setCurrentDate(now);
            jumpToMonthOnMobile(now.getFullYear(), now.getMonth());
            setMobileViewMode('month');
          }}
          className={`text-[11px] px-3.5 py-1 rounded-full font-extrabold transition-all active:scale-95 ${
            isDark 
              ? 'bg-gray-800 hover:bg-gray-700 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-750 border border-gray-200 shadow-sm'
          }`}
        >
          今日
        </button>
        <div className="flex items-center space-x-6">
          <button className="text-rose-500 transition-colors p-1" onClick={() => setMobileViewMode('month')}>
            <LucideCalendar size={20} />
          </button>
          <button className={`${isDark ? 'text-gray-500 hover:text-rose-500' : 'text-gray-400 hover:text-rose-500'} transition-colors p-1`} onClick={() => setActiveLeftSidebar(true)}>
            <BookOpen size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 3. モバイル版 月ビュー ('month')
// ==============================================================
export const MobileMonthView = ({
  isDark,
  currentDisplayMonth,
  currentDisplayYear,
  setMobileViewMode,
  mobileMonthScrollRef,
  handleMobileMonthScroll,
  renderedMonths,
  currentDate,
  setCurrentDate,
  setMiniCalDate,
  jumpToMonthOnMobile,
  timetableData,
  customEvents,
  fixedSchedules,
  addModalState,
  scheduleCategories,
  setActiveLeftSidebar
}) => {
  const today = new Date();
  const displayMonthName = `${currentDisplayMonth + 1}月`;
  const displayYearName = `${currentDisplayYear}年`;

  const typePriority = {
    exam: 1,       // 試験期間
    class: 2,      // 授業日
    vacation: 3,   // 長期休業
    intensive: 4,  // 集中講義
    makeup: 5,     // 補講
    start: 6,      // 受講開始
    grade: 7,      // 成績開示
    event: 8,      // その他行事
    holiday: 9     // 祝日
  };

  return (
    <div className="flex flex-col h-full bg-black text-white select-none">
      {/* 固定ヘッダーブロック */}
      <div className="flex flex-col bg-black z-30 shrink-0 border-b border-gray-900">
        {/* 1行目: 年ヘッダー */}
        <div className="flex justify-between items-center px-4 py-3 bg-black">
          <button onClick={() => setMobileViewMode('year')} className="text-rose-500 flex items-center space-x-1 text-sm font-bold active:scale-95">
            <ChevronLeft size={16} />
            <span>{displayYearName}</span>
          </button>
        </div>

        {/* 2行目: 月ヘッダー */}
        <div className="text-3xl font-black text-white px-4 py-2 shrink-0 bg-black">
          {displayMonthName}
        </div>

        {/* 3行目: 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center text-xs text-gray-400 font-bold py-1.5 bg-black">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      {/* 縦方向連続スクロールコンテナ */}
      <div 
        ref={mobileMonthScrollRef}
        onScroll={handleMobileMonthScroll}
        className="flex-1 overflow-y-auto bg-black pb-20 select-none relative"
      >
        {renderedMonths.map(({ year: y, month: m }) => {
          const monthDays = getDaysForSingleMonth(y, m);
          const elementId = `month-${y}-${m}`;

          return (
            <div 
              key={`${y}-${m}`} 
              id={elementId}
              className="w-full flex flex-col scroll-mt-0 pt-2"
            >
              {/* 7列日付グリッド */}
              <div className="grid grid-cols-7 bg-black pb-2">
                {monthDays.map((d, idx) => {
                  // null セルのレンダリング
                  if (!d) {
                    return (
                      <div 
                        key={`null-${idx}`} 
                        className="h-[84px] border-b border-r border-gray-900/30 flex flex-col justify-start items-stretch py-1 relative"
                        style={{ zIndex: 42 - idx }}
                      />
                    );
                  }

                  const dateStr = `${d.fullDate.getFullYear()}-${String(d.fullDate.getMonth() + 1).padStart(2, '0')}-${String(d.fullDate.getDate()).padStart(2, '0')}`;
                  const isRealToday = d.fullDate.getFullYear() === today.getFullYear() && 
                                      d.fullDate.getMonth() === today.getMonth() && 
                                      d.fullDate.getDate() === today.getDate();
                  
                  const rawAcademicEvents = getAcademicEventsForDate(d.fullDate) || [];
                  const academicEvents = [...rawAcademicEvents].sort((a, b) => {
                    const priorityA = typePriority[a.type] || 99;
                    const priorityB = typePriority[b.type] || 99;
                    return priorityA - priorityB || a.start.localeCompare(b.start);
                  });

                  const isHoliday = academicEvents.some(ev => ev.type === 'holiday');
                  const dayEvents = getEventsForDate(dateStr, d.fullDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories) || [];

                  const isSelectedDate = currentDate && 
                                         d.fullDate.getDate() === currentDate.getDate() &&
                                         d.fullDate.getMonth() === currentDate.getMonth() &&
                                         d.fullDate.getFullYear() === currentDate.getFullYear();

                  return (
                    <div 
                      key={idx} 
                      className={`h-[84px] border-b border-r border-gray-900/60 flex flex-col justify-start items-stretch py-1 cursor-pointer hover:bg-gray-900/20 relative transition-all ${
                        isSelectedDate ? 'ring-2 ring-rose-500 ring-inset bg-rose-500/5' : ''
                      }`}
                      style={{ zIndex: 42 - idx }}
                      onClick={() => {
                        if (isSelectedDate) {
                          setMobileViewMode('day');
                        } else {
                          setCurrentDate(d.fullDate);
                          setMiniCalDate(d.fullDate);
                        }
                      }}
                    >
                      {/* 日付数字 */}
                      <div className="flex items-center justify-center w-6 h-6 self-center select-none">
                        {isRealToday ? (
                          <span className="bg-[#ff3b30] text-white rounded-full flex items-center justify-center w-6 h-6 text-xs font-black shadow-sm leading-none animate-[pulse_1.5s_infinite_alternate]">
                            {d.val}
                          </span>
                        ) : (
                          <span className={`text-xs font-black leading-none ${
                            isHoliday ? 'text-red-500' : 'text-white'
                          }`}>
                            {d.val}
                          </span>
                        )}
                      </div>

                      {/* 学年歴の表示（テキストバッジ）＆通常予定のドット表示 */}
                      <div className="w-full flex-1 flex flex-col overflow-visible space-y-0.5 mt-0.5 select-none">
                        {academicEvents.map((ae, aeIdx) => {
                          const isMultiDay = ae.start !== ae.end;
                          const dayOfWeek = d.fullDate.getDay();
                          
                          const isActualStart = dateStr === ae.start;
                          const isActualEnd = dateStr === ae.end;
                          const isExamResuming = ae.type === 'exam' && dayOfWeek === 1 && ae.start < dateStr;
                          const isExamPausing = ae.type === 'exam' && dayOfWeek === 5 && ae.end > dateStr;
                          
                          const isSunday = dayOfWeek === 0;
                          const isSaturday = dayOfWeek === 6;
                          
                          const isStartOfBar = isActualStart || isExamResuming || isSunday;
                          const isEndOfBar = isActualEnd || isExamPausing || isSaturday;
                          
                          const marginL = isMultiDay ? (isStartOfBar ? 'ml-[2px]' : '-ml-[1.5px]') : 'mx-0.5';
                          const marginR = isMultiDay ? (isEndOfBar ? 'mr-[2px]' : '-mr-[1.5px]') : 'mx-0.5';
                          
                          const rounded = isMultiDay 
                            ? `${isStartOfBar ? 'rounded-l-[3px]' : ''} ${isEndOfBar ? 'rounded-r-[3px]' : ''}`
                            : 'rounded-[3px]';
                            
                          const showTitle = !isMultiDay || isActualStart || (isSunday && ae.start < dateStr);
                          let colorClass = '';

                          if (ae.type === 'vacation') {
                            colorClass = 'bg-[#ef5350] text-white';
                          } else if (ae.type === 'intensive') {
                            colorClass = 'bg-[#9c27b0] text-white';
                          } else if (ae.type === 'exam') {
                            colorClass = 'bg-[#ff9800] text-white';
                          } else if (ae.type === 'makeup') {
                            colorClass = 'bg-[#ec407a] text-white';
                          } else if (ae.type === 'start') {
                            colorClass = 'bg-[#4caf50] text-white';
                          } else if (ae.type === 'grade') {
                            colorClass = 'bg-[#2196f3] text-white';
                          } else if (ae.type === 'class') {
                            colorClass = 'bg-[#ffeb3b] text-gray-900 border border-yellow-500/50';
                          } else if (ae.type === 'event') {
                            colorClass = 'bg-[#5c6bc0] text-white';
                          } else if (ae.type === 'holiday') {
                            colorClass = 'bg-gray-400 dark:bg-gray-600 text-white';
                          } else {
                            colorClass = 'bg-gray-500 text-white';
                          }

                          return (
                            <div 
                              key={aeIdx}
                              className={`text-[8px] font-black px-1 py-[2px] leading-none w-auto text-center ${marginL} ${marginR} ${rounded} ${colorClass} ${
                                isMultiDay ? 'h-[16px] flex items-center justify-center' : 'min-h-[16px]'
                              } relative z-10`}
                            >
                              <div className={`w-full ${isMultiDay ? 'whitespace-nowrap overflow-visible' : 'break-all'} ${showTitle ? '' : 'opacity-0 select-none'}`}>
                                {ae.title}
                              </div>
                            </div>
                          );
                        })}

                        {/* 通常予定のドット表示 */}
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center items-center select-none w-full pt-1">
                            {dayEvents.slice(0, 5).map((ev, evIdx) => {
                              let dotColor = '#ef4444';
                              if (ev.isLesson) dotColor = '#3b82f6';
                              else {
                                const cat = scheduleCategories.find(c => c.id === ev.type);
                                if (cat) {
                                  if (cat.color === 'blue') dotColor = '#3b82f6';
                                  else if (cat.color === 'green') dotColor = '#10b981';
                                  else if (cat.color === 'red') dotColor = '#ef4444';
                                  else if (cat.color === 'yellow') dotColor = '#f59e0b';
                                  else if (cat.color === 'purple') dotColor = '#a855f7';
                                }
                              }

                              return (
                                <span 
                                  key={evIdx}
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dotColor }}
                                />
                              );
                            })}
                            {dayEvents.length > 5 && (
                              <span className="text-[7px] text-gray-500 font-extrabold leading-none">+</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 下部ツールバー */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#0d0d0d] border-t border-gray-900 px-6 py-2 flex justify-between items-center z-30">
        <button 
          onClick={() => {
            const now = new Date();
            setCurrentDate(now);
            jumpToMonthOnMobile(now.getFullYear(), now.getMonth());
          }}
          className="bg-gray-800 hover:bg-gray-700 text-[11px] px-3.5 py-1 rounded-full font-extrabold text-white transition-all active:scale-95"
        >
          今日
        </button>
        <div className="flex items-center space-x-6">
          <button className="text-rose-500 transition-colors p-1" onClick={() => setMobileViewMode('month')}>
            <LucideCalendar size={20} />
          </button>
          <button className="text-gray-500 hover:text-rose-500 transition-colors p-1" onClick={() => setActiveLeftSidebar(true)}>
            <BookOpen size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 4. モバイル版 日ビュー ('day')
// ==============================================================
export const MobileDayView = ({
  isDark,
  currentDate,
  setCurrentDate,
  setMiniCalDate,
  setMobileViewMode,
  setAddModalState,
  setActiveRightSidebar,
  setActiveLeftSidebar,
  swipeOffsetX,
  swipeTransition,
  mobileDayContainerRef,
  mobileDayScrollRef,
  onTouchStart,
  onTouchEnd,
  timetableData,
  customEvents,
  fixedSchedules,
  addModalState,
  scheduleCategories,
  handleGridClick,
  handleEventClick,
  handleTempPreviewDragStart,
  handleTempPreviewTouchStart
}) => {
  const today = new Date();
  const weekDays = getWeekDaysForDate(currentDate);
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const dailyEvents = getEventsForDate(dateStr, currentDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories) || [];

  const nowReal = new Date();
  const isTodaySelected = currentDate.getFullYear() === nowReal.getFullYear() &&
                          currentDate.getMonth() === nowReal.getMonth() &&
                          currentDate.getDate() === nowReal.getDate();
  const currentMin = nowReal.getHours() * 60 + nowReal.getMinutes();
  const timeText = `${nowReal.getHours()}:${String(nowReal.getMinutes()).padStart(2, '0')}`;

  const dStr = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
  const wDay = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][currentDate.getDay()];
  const headerTitle = `${dStr}・${wDay}`;
  const academicEvents = getAcademicEventsForDate(currentDate) || [];

  return (
    <div 
      ref={mobileDayContainerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`flex flex-col h-full select-none ${isDark ? 'bg-black text-white' : 'bg-[#fafaf9] text-gray-900'}`}
    >
      {/* ヘッダー */}
      <div className={`flex justify-between items-center px-4 py-3 border-b shrink-0 ${isDark ? 'border-gray-900 bg-black' : 'border-gray-200 bg-white'}`}>
        <button onClick={() => setMobileViewMode('month')} className="text-rose-500 flex items-center space-x-1 text-sm font-bold active:scale-95">
          <ChevronLeft size={16} />
          <span>{currentDate.getMonth() + 1}月</span>
        </button>
        <div className="flex items-center space-x-4">
          <button 
            className="text-rose-500 active:scale-95 transition-transform p-1" 
            onClick={() => {
              setAddModalState({
                isOpen: true,
                dateObj: new Date(currentDate),
                startHour: 9,
                startMin: 0,
                endHour: 10,
                endMin: 0,
                title: '',
                type: 'parttime',
                location: '',
                description: '',
                guest: '',
                hasMeet: false,
                isAllDay: false,
                isEdit: false,
                editingEventId: null,
                isPreviewActive: true,
                isFixedSchedule: false,
                editingFixedScheduleId: null,
                dayOfWeek: 1,
                isDetailView: false,
                isLesson: false,
                lessonObj: null
              });
              setActiveRightSidebar(true);
            }}
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 週ヘッダー (7日間並び) */}
      <div className={`grid grid-cols-7 text-center py-2 border-b shrink-0 select-none ${isDark ? 'bg-black border-gray-900' : 'bg-white border-gray-200'}`}>
        {weekDays.map((d, idx) => {
          const isSelected = d.getDate() === currentDate.getDate() && 
                             d.getMonth() === currentDate.getMonth() &&
                             d.getFullYear() === currentDate.getFullYear();
          const isRealToday = d.getDate() === today.getDate() && 
                              d.getMonth() === today.getMonth() &&
                              d.getFullYear() === today.getFullYear();
          
          let badgeClass = '';
          if (isRealToday) {
            badgeClass = 'bg-[#ff3b30] text-white font-black shadow-md';
          } else if (isSelected) {
            badgeClass = isDark ? 'bg-white text-black font-black shadow-md' : 'bg-gray-800 text-white font-black shadow-md';
          } else {
            badgeClass = isDark ? 'text-white hover:bg-gray-800/20' : 'text-gray-800 hover:bg-gray-100';
          }

          return (
            <div 
              key={idx} 
              className="flex flex-col items-center cursor-pointer relative"
              onClick={() => {
                setCurrentDate(d);
                setMiniCalDate(d);
              }}
            >
              <span className="text-[10px] text-gray-500 font-bold mb-0.5">
                {['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}
              </span>
              <span className={`w-7 h-7 flex items-center justify-center text-xs rounded-full transition-all active:scale-90 ${badgeClass}`}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* タイムライン スライドコンテナ */}
      <div 
        style={{
          transform: `translateX(${swipeOffsetX}px)`,
          transition: swipeTransition,
          willChange: 'transform'
        }}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        {/* 本日日付タイトル ＆ 学年歴 */}
        <div className={`px-4 py-2 border-b text-sm font-extrabold shrink-0 flex flex-wrap items-center gap-1.5 ${isDark ? 'border-gray-900 bg-black text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
          <span>{headerTitle}</span>
          {academicEvents.map((ae, aeIdx) => {
            let colorClass = '';
            if (ae.type === 'vacation') colorClass = 'bg-red-500/10 text-red-500 border-red-500/20';
            else if (ae.type === 'intensive') colorClass = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            else if (ae.type === 'exam') colorClass = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            else if (ae.type === 'makeup') colorClass = 'bg-pink-500/10 text-pink-500 border-pink-500/20';
            else if (ae.type === 'start') colorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            else if (ae.type === 'grade') colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            else if (ae.type === 'class') colorClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            else if (ae.type === 'event') colorClass = 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            else if (ae.type === 'holiday') colorClass = 'bg-gray-400/10 text-gray-400 border-gray-400/20';
            else colorClass = 'bg-gray-500/10 text-gray-500 border-gray-500/20';

            return (
              <span key={aeIdx} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${colorClass}`}>
                {ae.title}
              </span>
            );
          })}
        </div>

        {/* タイムラインエリア (24時間) */}
        <div 
          ref={mobileDayScrollRef}
          className={`flex-1 overflow-y-auto relative pb-24 ${isDark ? 'bg-[#090909]' : 'bg-[#f5f5f4]'}`}
        >
          <div className="relative w-full h-[1440px]">
            {Array.from({ length: 24 }).map((_, h) => (
              <div 
                key={h} 
                className={`absolute left-0 right-0 border-b flex items-center ${isDark ? 'border-gray-900/30' : 'border-gray-200/50'}`}
                style={{ top: `${h * 60}px`, height: '60px' }}
              >
                <span className={`w-12 text-[10px] font-black pl-2 select-none ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {`${h}:00`}
                </span>
                <div 
                  className="flex-1 h-full cursor-pointer hover:bg-gray-500/5 transition-colors"
                  onClick={(e) => handleGridClick(e, currentDate, h)}
                />
              </div>
            ))}

            {dailyEvents.map((ev, idx) => {
              const top = ev.startHour * 60 + ev.startMin;
              const height = ev.duration;

              let colorKey = ev.color || 'blue';
              if (!ev.isLesson) {
                const cat = scheduleCategories.find(c => c.id === ev.type);
                if (cat) {
                  colorKey = cat.color;
                }
              }
              const { classes, style: colorStyle } = getColorClasses(colorKey, ev.dashed, ev.stripe, isDark);
              
              return (
                <div
                  key={idx}
                  onClick={() => handleEventClick({ ...ev, date: currentDate })}
                  onMouseDown={(e) => {
                    if (ev.isTempPreview) {
                      handleTempPreviewDragStart(e, ev);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (ev.isTempPreview) {
                      handleTempPreviewTouchStart(e, ev);
                    }
                  }}
                  className={`absolute right-2 left-14 rounded-xl px-2.5 py-1.5 shadow-sm z-10 flex flex-col justify-start overflow-hidden transition-all hover:scale-[1.01] active:scale-95 border border-transparent ${classes} ${
                    ev.isTempPreview ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  }`}
                  style={{ 
                    top: `${top}px`, 
                    height: `${height}px`,
                    ...colorStyle
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black truncate">{ev.title}</span>
                    <span className="text-[9px] font-extrabold opacity-80 shrink-0">
                      {`${ev.startHour}:${String(ev.startMin).padStart(2, '0')} - ${Math.floor((ev.startHour * 60 + ev.startMin + ev.duration) / 60)}:${String((ev.startHour * 60 + ev.startMin + ev.duration) % 60).padStart(2, '0')}`}
                    </span>
                  </div>
                  {ev.room && (
                    <span className="text-[10px] opacity-90 truncate mt-0.5 flex items-center font-bold">
                      <MapPin size={10} className="mr-0.5 shrink-0" />
                      {ev.room}
                    </span>
                  )}
                </div>
              );
            })}

            {/* 現在時刻の赤いラインインジケーター */}
            {isTodaySelected && (
              <div 
                className="absolute left-12 right-0 flex items-center z-10 pointer-events-none"
                style={{ top: `${currentMin}px` }}
              >
                <div className="text-[9px] font-black text-red-500 text-center pr-1 -ml-12 w-12 shrink-0">
                  {timeText}
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500 absolute left-0 -ml-1 shadow-sm" />
                <div className="w-full h-[1px] bg-red-500/80" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 下部ツールバー */}
      <div className={`fixed bottom-0 left-0 right-0 h-14 border-t px-6 py-2 flex justify-between items-center z-30 ${isDark ? 'bg-[#0d0d0d] border-gray-900' : 'bg-white border-gray-200'}`}>
        <button 
          onClick={() => {
            const now = new Date();
            setCurrentDate(now);
            setMiniCalDate(now);
            if (mobileDayScrollRef.current) {
              const target = isTodaySelected ? Math.max(0, currentMin - 150) : 480;
              mobileDayScrollRef.current.scrollTop = target;
            }
          }}
          className={`text-[11px] px-3.5 py-1 rounded-full font-extrabold transition-all active:scale-95 ${
            isDark 
              ? 'bg-gray-800 hover:bg-gray-700 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-750 border border-gray-200 shadow-sm'
          }`}
        >
          今日
        </button>
        <div className="flex items-center space-x-6">
          <button className="text-rose-500 transition-colors p-1" onClick={() => setMobileViewMode('month')}>
            <LucideCalendar size={20} />
          </button>
          <button className={`${isDark ? 'text-gray-500 hover:text-rose-500' : 'text-gray-400 hover:text-rose-500'} transition-colors p-1`} onClick={() => setActiveLeftSidebar(true)}>
            <BookOpen size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 5. モバイル版 総合レンダラー
// ==============================================================
export const MobileCalendar = (props) => {
  const { mobileViewMode } = props;
  if (mobileViewMode === 'year') {
    return <MobileYearView {...props} />;
  } else if (mobileViewMode === 'month') {
    return <MobileMonthView {...props} />;
  } else if (mobileViewMode === 'day') {
    return <MobileDayView {...props} />;
  }
  return null;
};
