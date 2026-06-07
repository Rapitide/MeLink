import React from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Plus, MapPin, Clock, X 
} from 'lucide-react';
import { 
  formatHour, getEventsForDate, getColorClasses, getAcademicEventsForDate, getEventColor, getWeekAcademicSlots 
} from './todoCalendarUtils';

// ==============================================================
// 1. カレンダーヘッダー
// ==============================================================
export const CalendarHeader = ({
  isDark,
  handleJumpToToday,
  handleNavigatePeriod,
  headerLabel,
  viewMode,
  setViewMode,
  isViewDropdownOpen,
  setIsViewDropdownOpen,
  setAddModalState,
  setActiveRightSidebar
}) => {
  return (
    <header className={`flex justify-between items-center px-6 py-4 border-b shrink-0 select-none ${
      isDark ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center space-x-6">
        <h1 className="text-xl font-black text-rose-500 tracking-tight">ToDoカレンダー</h1>
        <div className="flex items-center space-x-1">
          <button 
            onClick={handleJumpToToday}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 border ${
              isDark 
                ? 'bg-gray-950 border-gray-800 hover:bg-gray-850 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-750 border-gray-200 shadow-sm'
            }`}
          >
            今日
          </button>
          
          <div className="flex items-center">
            <button 
              onClick={() => handleNavigatePeriod('prev')}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-850 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              title="前へ"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => handleNavigatePeriod('next')}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-850 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              title="次へ"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        <div className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {headerLabel}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* ビュー切替ドロップダウン */}
        <div className="relative">
          <button 
            onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
            className={`flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-full border transition-all active:scale-98 select-none ${
              isDark 
                ? 'bg-gray-950 border-gray-800 text-white hover:bg-gray-850' 
                : 'bg-white border-gray-200 text-gray-750 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <span>{viewMode === 'day' ? '日ビュー' : viewMode === 'week' ? '週ビュー' : '月ビュー'}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isViewDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isViewDropdownOpen && (
            <>
              <div onClick={() => setIsViewDropdownOpen(false)} className="fixed inset-0 z-30" />
              <div className={`absolute right-0 mt-2 w-32 rounded-2xl border p-1.5 shadow-xl z-40 transition-all ${
                isDark ? 'bg-gray-950 border-gray-850' : 'bg-white border-gray-150'
              }`}>
                {[
                  { id: 'day', label: '日ビュー' },
                  { id: 'week', label: '週ビュー' },
                  { id: 'month', label: '月ビュー' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setViewMode(item.id);
                      setIsViewDropdownOpen(false);
                    }}
                    className={`w-full text-left text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
                      viewMode === item.id 
                        ? 'bg-rose-500 text-white' 
                        : isDark ? 'text-gray-300 hover:bg-gray-850' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button 
          onClick={() => {
            setAddModalState(prev => ({
              ...prev,
              isOpen: true,
              dateObj: new Date(),
              isEdit: false,
              isDetailView: false,
              title: '',
              type: 'parttime',
              location: '',
              description: '',
              isAllDay: false,
              isPreviewActive: true,
              isFixedSchedule: false,
              dayOfWeek: new Date().getDay() || 1
            }));
            setActiveRightSidebar(true);
          }}
          className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all flex items-center space-x-1.5"
        >
          <Plus size={14} strokeWidth={3} />
          <span>追加</span>
        </button>
      </div>
    </header>
  );
};

// ==============================================================
// 2. デスクトップ 日ビュー
// ==============================================================
export const DayView = ({
  isDark,
  dayViewDay,
  dayScrollRef,
  hours,
  topPx,
  timeText,
  currentTime,
  timetableData,
  customEvents,
  fixedSchedules,
  addModalState,
  scheduleCategories,
  handleGridClick,
  handleAllDayGridClick,
  handleEventClick,
  setCustomEvents,
  setFixedSchedules,
  resetFormState,
  setActiveRightSidebar,
  firestore,
  currentAccountId,
  deleteDoc,
  doc
}) => {
  const today = currentTime || new Date();
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-[fadeIn_0.2s_ease-out]">
      <div className={`grid grid-cols-[55px_1fr] border-b shrink-0 [scrollbar-gutter:stable] ${
        isDark ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-end justify-center pb-2 text-[10px] font-black text-gray-400 tracking-wider">JST</div>
        <div className="py-2.5 flex justify-start px-6">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-black text-gray-500">{dayViewDay?.name}</span>
            <span className={`w-8 h-8 flex items-center justify-center rounded-full text-base font-black leading-none ${
              dayViewDay?.isToday ? 'bg-red-500 text-white shadow-md' : 'border border-blue-500 text-blue-500'
            }`}>
              {dayViewDay?.num}
            </span>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-[55px_1fr] border-b shrink-0 bg-gray-500/5 [scrollbar-gutter:stable] ${
        isDark ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className={`border-r ${isDark ? 'border-gray-800' : 'border-gray-200'}`}></div>
        <div 
          onClick={(e) => handleAllDayGridClick(e, dayViewDay?.fullDate)}
          className="p-1 px-6 min-h-[36px] flex flex-wrap gap-1.5 items-center cursor-cell hover:bg-gray-500/5 transition-colors select-none"
        >
          {(() => {
            const academicEvents = getAcademicEventsForDate(dayViewDay?.fullDate);
            const customAllDay = [];
            if (dayViewDay?.fullDate) {
              const y = dayViewDay.fullDate.getFullYear();
              const m = dayViewDay.fullDate.getMonth() + 1;
              const d = dayViewDay.fullDate.getDate();
              const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

              customEvents.forEach(ev => {
                if (ev.isAllDay && ev.fullDate === dateStr) {
                  customAllDay.push({
                    title: ev.title,
                    type: ev.type,
                    isCustom: true,
                    id: ev.id,
                    color: ev.color
                  });
                }
              });

              if (addModalState.isOpen && addModalState.isAllDay && addModalState.dateObj) {
                const py = addModalState.dateObj.getFullYear();
                const pm = addModalState.dateObj.getMonth() + 1;
                const pd = addModalState.dateObj.getDate();
                const pDateStr = `${py}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}`;

                if (pDateStr === dateStr) {
                  customAllDay.push({
                    title: addModalState.title.trim() || '(タイトルなし)',
                    type: addModalState.type,
                    isTempPreview: true,
                    stripe: true,
                    id: 'temp-preview-all-day',
                    color: (() => {
                      const cat = scheduleCategories.find(c => c.id === addModalState.type);
                      return cat ? cat.color : 'blue';
                    })()
                  });
                }
              }
            }

            const allEvents = [
              ...academicEvents.map(ev => ({ ...ev, isAcademic: true })),
              ...customAllDay
            ];

            if (allEvents.length === 0) {
              return <div className="text-[10px] text-gray-400 font-bold opacity-55">終日予定なし</div>;
            }

            return allEvents.map((ev, idx) => {
              const evColorClass = getEventColor(ev.type, ev.isCustom || ev.isAcademic === undefined, ev.isTempPreview, ev.color, scheduleCategories);
              
              const stripeStyle = ev.stripe ? {
                backgroundImage: isDark
                  ? 'repeating-linear-gradient(45deg, rgba(59,130,246,0.12), rgba(59,130,246,0.12) 10px, rgba(59,130,246,0.22) 10px, rgba(59,130,246,0.22) 20px)'
                  : 'repeating-linear-gradient(45deg, rgba(59,130,246,0.04), rgba(59,130,246,0.04) 10px, rgba(59,130,246,0.1) 10px, rgba(59,130,246,0.1) 20px)'
              } : {};
              
              if (ev.stripe && ev.color === 'green') {
                stripeStyle.backgroundImage = isDark
                  ? 'repeating-linear-gradient(45deg, rgba(16,185,129,0.12), rgba(16,185,129,0.12) 10px, rgba(16,185,129,0.22) 10px, rgba(16,185,129,0.22) 20px)'
                  : 'repeating-linear-gradient(45deg, rgba(16,185,129,0.04), rgba(16,185,129,0.04) 10px, rgba(16,185,129,0.1) 10px, rgba(16,185,129,0.1) 20px)';
              } else if (ev.stripe && ev.color === 'red') {
                stripeStyle.backgroundImage = isDark
                  ? 'repeating-linear-gradient(45deg, rgba(244,63,94,0.12), rgba(244,63,94,0.12) 10px, rgba(244,63,94,0.22) 10px, rgba(244,63,94,0.22) 20px)'
                  : 'repeating-linear-gradient(45deg, rgba(244,63,94,0.04), rgba(244,63,94,0.04) 10px, rgba(244,63,94,0.1) 10px, rgba(244,63,94,0.1) 20px)';
              }

              return (
                <div 
                  key={idx} 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ev.isCustom) {
                      handleEventClick({ id: ev.id, title: ev.title, isCustom: true });
                    }
                  }}
                  className={`px-2.5 py-0.5 text-[9px] font-black rounded-lg shadow-sm leading-tight border-l-[3px] cursor-pointer hover:brightness-105 ${evColorClass}`}
                  style={stripeStyle}
                >
                  {ev.title}
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div ref={dayScrollRef} className="flex-1 overflow-y-auto overscroll-contain relative [scrollbar-gutter:stable]">
        {dayViewDay?.isToday && (
          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topPx}px` }}>
            <div className="flex items-center grid grid-cols-[55px_1fr]">
              <div className="text-[10px] font-black text-red-500 text-center pr-1">{timeText}</div>
              <div className="relative flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5 shadow-sm" />
                <div className="w-full h-[1.5px] bg-red-500/90" />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-row w-full h-[1440px] relative">
          <div className={`w-[55px] shrink-0 border-r text-right pr-2 text-[10px] font-extrabold text-gray-400 select-none ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}>
            {hours.map(hour => (
              <div key={hour} className="h-[60px] pt-1 leading-none">
                {hour !== 0 && formatHour(hour)}
              </div>
            ))}
          </div>

          <div onClick={(e) => handleGridClick(e, dayViewDay.fullDate)} className="flex-1 h-full relative px-6 cursor-cell">
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {hours.map(hour => (
                <div key={hour} className={`h-[60px] w-full border-b ${isDark ? 'border-white/[0.08]' : 'border-black/[0.07]'}`} />
              ))}
            </div>

            <div className="relative h-full w-full">
              {(dayViewDay?.key ? getEventsForDate(dayViewDay.key, dayViewDay.fullDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories) : []).map(event => {
                const top = (event.startHour * 60) + event.startMin;
                const height = event.duration;
                const { classes, style } = getColorClasses(event.color, event.dashed, event.stripe, isDark);
                return (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); handleEventClick({ ...event, date: dayViewDay.fullDate }); }}
                    className={`absolute left-0 right-0 rounded-xl p-2.5 flex flex-col justify-start overflow-hidden border border-transparent shadow-sm transition-all hover:scale-[1.002] hover:shadow-md active:scale-[0.99] cursor-pointer z-10 group ${classes}`}
                    style={{ top: `${top}px`, height: `${height}px`, minHeight: '28px', ...style }}
                  >
                    {event.isTempPreview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFormState();
                          setActiveRightSidebar(false);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all z-20"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                    {(event.isCustom || event.isFixedSchedule) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isFixed = event.isFixedSchedule;
                          const msg = isFixed 
                            ? `繰り返し予定「${event.title}」を削除しますか？`
                            : `予定「${event.title}」を削除しますか？`;
                          if (confirm(msg)) {
                            if (isFixed) {
                              setFixedSchedules(prev => prev.filter(ev => ev.id !== event.id));
                              if (firestore && currentAccountId) {
                                deleteDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${event.id}`))
                                  .catch(err => console.error("Failed to delete fixed schedule:", err));
                              }
                            } else {
                              setCustomEvents(prev => prev.filter(ev => ev.id !== event.id));
                              if (firestore && currentAccountId) {
                                deleteDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${event.id}`))
                                  .catch(err => console.error("Failed to delete custom event:", err));
                              }
                            }
                          }
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all z-20"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                    <div className="flex items-start justify-between gap-1.5 w-full min-w-0">
                      <span className="text-xs font-black tracking-tight leading-tight truncate flex-1 min-w-0">{event.title}</span>
                      {event.isLesson && (
                        <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'} shrink-0`}>
                          {event.period}限
                        </span>
                      )}
                    </div>
                    {height >= 45 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 shrink-0 opacity-80 text-[10px] font-bold w-full min-w-0">
                        {event.room && event.room !== '教室未設定' && (
                          <span className="flex items-center min-w-0 max-w-full">
                            <MapPin size={11} className="mr-1 text-gray-400 shrink-0" />
                            <span className="truncate flex-1 min-w-0">{event.room}</span>
                          </span>
                        )}
                        <span className="flex items-center min-w-0 max-w-full">
                          <Clock size={11} className="mr-1 text-gray-400 shrink-0" />
                          <span className="truncate flex-1 min-w-0">{event.time}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 3. デスクトップ 週ビュー
// ==============================================================
export const WeekView = ({
  isDark,
  weekScrollRef,
  weekDays,
  setCurrentDate,
  setViewMode,
  topPx,
  timeText,
  currentTime,
  weekKeys,
  hours,
  timetableData,
  customEvents,
  fixedSchedules,
  addModalState,
  scheduleCategories,
  handleGridClick,
  handleAllDayGridClick,
  handleEventClick,
  setCustomEvents,
  setFixedSchedules,
  resetFormState,
  setActiveRightSidebar,
  firestore,
  currentAccountId,
  deleteDoc,
  doc
}) => {
  const today = currentTime || new Date();
  
  return (
    <div ref={weekScrollRef} className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain relative select-none animate-[fadeIn_0.2s_ease-out]">
      <div className="sticky top-0 z-30 flex flex-col shrink-0 min-w-[700px] md:min-w-0">
        {/* 曜日ヘッダー */}
        <div className={`grid grid-cols-[55px_1fr] border-b shrink-0 ${
          isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-end justify-center pb-2 text-[10px] font-black text-gray-400 tracking-wider">JST</div>
          <div className="grid grid-cols-7 text-center py-2">
            {weekDays.map((day, dIdx) => (
              <div key={day.key} className={`flex flex-col items-center relative ${
                dIdx < 6 ? (isDark ? 'border-r border-white/[0.03]' : 'border-r border-black/[0.03]') : ''
              }`}>
                <span className="text-[11px] font-bold text-gray-500 tracking-wider">{day.name}</span>
                <span 
                  onClick={() => {
                    if (day.fullDate) {
                      setCurrentDate(day.fullDate);
                      setViewMode('day');
                    }
                  }}
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-black mt-0.5 leading-none transition-all active:scale-90 cursor-pointer
                    ${day.isToday ? 'bg-red-500 text-white shadow-md' : day.isSelected ? 'border border-blue-500 text-blue-500' : 'hover:bg-gray-500/10'}
                  `}
                >
                  {day.num}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 終日予定エリア */}
        <div className={`grid grid-cols-[55px_1fr] border-b shrink-0 bg-gray-500/5 relative ${
          isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className={`absolute inset-0 z-0 ${isDark ? 'bg-black' : 'bg-white'}`}></div>
          <div className="absolute inset-0 z-0 bg-gray-500/5"></div>
          
          <div className={`border-r z-10 flex items-center justify-center text-[10px] font-black text-gray-400 tracking-wider select-none ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}>
            学年歴
          </div>
          <div className="grid grid-cols-7 gap-0 min-h-[44px] py-1.5 relative z-10">
            <div className="absolute inset-0 grid grid-cols-7 pointer-events-auto z-0">
              {weekDays.map((day, dIdx) => (
                <div 
                  key={`allday-week-cell-${day.key}`}
                  onClick={(e) => handleAllDayGridClick(e, day.fullDate)}
                  className={`h-full w-full cursor-cell hover:bg-gray-500/5 transition-colors ${
                    dIdx < 6 ? (isDark ? 'border-r border-white/[0.03]' : 'border-r border-black/[0.03]') : ''
                  }`}
                />
              ))}
            </div>

            {(() => {
              const weekAcademicSlots = getWeekAcademicSlots(weekDays, customEvents, fixedSchedules, addModalState, scheduleCategories);
              if (weekAcademicSlots.length === 0) {
                return (
                  <div className="col-span-7 py-2.5 text-center text-[10px] text-gray-400 font-bold opacity-30 select-none z-10 pointer-events-none">
                    終日予定なし
                  </div>
                );
              }
              return (
                <div className="col-span-7 flex flex-col gap-1 w-full relative z-10 pointer-events-none">
                  {weekAcademicSlots.map((slot, rIdx) => {
                    const segments = [];
                    let currentEv = null;
                    let startIdx = -1;

                    for (let d = 0; d < 7; d++) {
                      const ev = slot.rowEvents[d];
                      if (ev) {
                        if (!currentEv || currentEv.title !== ev.title || currentEv.start !== ev.start || currentEv.end !== ev.end) {
                          if (currentEv) {
                            segments.push({ event: currentEv, startIdx, endIdx: d - 1 });
                          }
                          currentEv = ev;
                          startIdx = d;
                        }
                      } else {
                        if (currentEv) {
                          segments.push({ event: currentEv, startIdx, endIdx: d - 1 });
                          currentEv = null;
                          startIdx = -1;
                        }
                      }
                    }
                    if (currentEv) {
                      segments.push({ event: currentEv, startIdx, endIdx: 6 });
                    }

                    return (
                      <div key={rIdx} className="w-full h-6 relative">
                        {segments.map((seg, segIdx) => {
                          const { event: ev, startIdx, endIdx } = seg;
                          const dayStart = weekDays[0];
                          const dayEnd = weekDays[6];
                          const weekStartStr = dayStart.fullDate ? `${dayStart.fullDate.getFullYear()}-${String(dayStart.fullDate.getMonth() + 1).padStart(2, '0')}-${String(dayStart.fullDate.getDate()).padStart(2, '0')}` : '';
                          const weekEndStr = dayEnd.fullDate ? `${dayEnd.fullDate.getFullYear()}-${String(dayEnd.fullDate.getMonth() + 1).padStart(2, '0')}-${String(dayEnd.fullDate.getDate()).padStart(2, '0')}` : '';
                          
                          const isStartOfBar = startIdx > 0 || ev.start >= weekStartStr;
                          const isEndOfBar = endIdx < 6 || ev.end <= weekEndStr;
                          
                          const rounded = `${isStartOfBar ? 'rounded-l-lg' : ''} ${isEndOfBar ? 'rounded-r-lg' : ''}`;
                          const evColorClass = getEventColor(ev.type, ev.isCustom, ev.isTempPreview, ev.color, scheduleCategories);
                          
                          const leftPct = (startIdx / 7) * 100;
                          const widthPct = ((endIdx - startIdx + 1) / 7) * 100;
                          
                          const stripeStyle = ev.stripe ? {
                            backgroundImage: isDark
                              ? 'repeating-linear-gradient(45deg, rgba(59,130,246,0.12), rgba(59,130,246,0.12) 10px, rgba(59,130,246,0.22) 10px, rgba(59,130,246,0.22) 20px)'
                              : 'repeating-linear-gradient(45deg, rgba(59,130,246,0.04), rgba(59,130,246,0.04) 10px, rgba(59,130,246,0.1) 10px, rgba(59,130,246,0.1) 20px)'
                          } : {};
                          
                          if (ev.stripe && ev.color === 'green') {
                            stripeStyle.backgroundImage = isDark
                              ? 'repeating-linear-gradient(45deg, rgba(16,185,129,0.12), rgba(16,185,129,0.12) 10px, rgba(16,185,129,0.22) 10px, rgba(16,185,129,0.22) 20px)'
                              : 'repeating-linear-gradient(45deg, rgba(16,185,129,0.04), rgba(16,185,129,0.04) 10px, rgba(16,185,129,0.1) 10px, rgba(16,185,129,0.1) 20px)';
                          } else if (ev.stripe && ev.color === 'red') {
                            stripeStyle.backgroundImage = isDark
                              ? 'repeating-linear-gradient(45deg, rgba(244,63,94,0.12), rgba(244,63,94,0.12) 10px, rgba(244,63,94,0.22) 10px, rgba(244,63,94,0.22) 20px)'
                              : 'repeating-linear-gradient(45deg, rgba(244,63,94,0.04), rgba(244,63,94,0.04) 10px, rgba(244,63,94,0.1) 10px, rgba(244,63,94,0.1) 20px)';
                          }

                          return (
                            <div 
                              key={segIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (ev.isCustom) {
                                  handleEventClick({ id: ev.id, title: ev.title, isCustom: true });
                                }
                              }}
                              className={`absolute top-0 bottom-0 py-0.5 px-2 text-[9px] font-black leading-tight flex items-center shadow-sm select-none transition-all hover:brightness-105 pointer-events-auto cursor-pointer ${rounded} ${evColorClass}`}
                              style={{
                                left: `calc(${leftPct}% + 3px)`,
                                width: `calc(${widthPct}% - 6px)`,
                                ...stripeStyle
                              }}
                              title={ev.title}
                            >
                              <span className="truncate w-full block">
                                {ev.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <div className="relative w-full h-[1440px] min-w-[700px] md:min-w-0">
        {today && typeof today.getMonth === 'function' && typeof today.getDate === 'function' && weekKeys.includes(`${today.getMonth() + 1}/${today.getDate()}`) && (
          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${topPx}px` }}>
            <div className="flex items-center grid grid-cols-[55px_1fr]">
              <div className="text-[10px] font-black text-red-500 text-center pr-1">{timeText}</div>
              <div className="relative flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5 shadow-sm" />
                <div className="w-full h-[1.5px] bg-red-500/90" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[55px_1fr] w-full h-full relative">
          <div className={`border-r text-right pr-2 text-[10px] font-extrabold text-gray-400 select-none ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}>
            {hours.map(hour => (
              <div key={hour} className="h-[60px] pt-1 leading-none">
                {hour !== 0 && formatHour(hour)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 h-full relative">
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {hours.map(hour => (
                <div key={hour} className={`h-[60px] w-full border-b ${isDark ? 'border-white/[0.08]' : 'border-black/[0.07]'}`} />
              ))}
            </div>

            <div className="absolute inset-0 pointer-events-none grid grid-cols-7">
              <div className={`border-r h-full ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}></div>
              <div className={`border-r h-full ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}></div>
              <div className={`border-r h-full ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}></div>
              <div className={`border-r h-full ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}></div>
              <div className={`border-r h-full ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}></div>
              <div className={`border-r h-full ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}></div>
              <div className="h-full"></div>
            </div>

            {weekDays.map(day => (
              <div key={day.key} onClick={(e) => handleGridClick(e, day.fullDate)} className="relative h-full w-full cursor-cell">
                {(day.key ? getEventsForDate(day.key, day.fullDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories) : []).map(event => {
                  const top = (event.startHour * 60) + event.startMin;
                  const height = event.duration;
                  const { classes, style } = getColorClasses(event.color, event.dashed, event.stripe, isDark);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); handleEventClick({ ...event, date: day.fullDate }); }}
                      className={`absolute left-1 right-1 rounded-xl p-1.5 flex flex-col justify-start overflow-hidden border border-transparent transition-all hover:scale-[1.01] hover:shadow-lg active:scale-95 cursor-pointer z-10 group ${classes}`}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px', ...style }}
                    >
                      {event.isTempPreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resetFormState();
                            setActiveRightSidebar(false);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all z-20"
                        >
                          <X size={10} strokeWidth={2.5} />
                        </button>
                      )}
                      {(event.isCustom || event.isFixedSchedule) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const isFixed = event.isFixedSchedule;
                            const msg = isFixed 
                              ? `繰り返し予定「${event.title}」を削除しますか？`
                              : `予定「${event.title}」を削除しますか？`;
                            if (confirm(msg)) {
                              if (isFixed) {
                                setFixedSchedules(prev => prev.filter(ev => ev.id !== event.id));
                                if (firestore && currentAccountId) {
                                  deleteDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${event.id}`))
                                    .catch(err => console.error("Failed to delete fixed schedule:", err));
                                }
                              } else {
                                setCustomEvents(prev => prev.filter(ev => ev.id !== event.id));
                                if (firestore && currentAccountId) {
                                  deleteDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${event.id}`))
                                    .catch(err => console.error("Failed to delete custom event:", err));
                                }
                              }
                            }
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all z-20"
                        >
                          <X size={10} strokeWidth={2.5} />
                        </button>
                      )}
                      <div className="flex items-start justify-between gap-1 w-full min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-tight truncate flex-1 min-w-0">{event.title}</span>
                        {event.isLesson && (
                          <span className={`px-1 py-0.5 rounded text-[8px] font-extrabold ${isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'} scale-90 shrink-0`}>
                            {event.period}限
                          </span>
                        )}
                      </div>
                      {height >= 30 && (
                        <div className="mt-0.5 flex flex-col space-y-0.5 shrink-0 opacity-80 w-full min-w-0">
                          {event.room && event.room !== '教室未設定' && event.room.trim() !== '' && height >= 45 && (
                            <span className="text-[8.5px] font-bold flex items-center min-w-0 w-full">
                              <MapPin size={8} className="mr-0.5 shrink-0 text-gray-400" />
                              <span className="truncate flex-1 min-w-0">{event.room}</span>
                            </span>
                          )}
                          <span className="text-[8.5px] font-bold flex items-start min-w-0 w-full">
                            <Clock size={8} className="mr-0.5 shrink-0 text-gray-400 mt-[2px]" />
                            <span className="flex flex-col flex-1 min-w-0 leading-tight">
                              {event.time && event.time.includes(' - ') ? (
                                <>
                                  <span className="truncate">{event.time.split(' - ')[0]}</span>
                                  <span className="truncate text-gray-400 dark:text-gray-500 font-extrabold flex items-center gap-0.5">
                                    <span className="text-[7.5px] opacity-75">~</span>
                                    {event.time.split(' - ')[1]}
                                  </span>
                                </>
                              ) : event.time && event.time.includes('-') ? (
                                <>
                                  <span className="truncate">{event.time.split('-')[0]}</span>
                                  <span className="truncate text-gray-400 dark:text-gray-500 font-extrabold flex items-center gap-0.5">
                                    <span className="text-[7.5px] opacity-75">~</span>
                                    {event.time.split('-')[1]}
                                  </span>
                                </>
                              ) : (
                                <span className="truncate">{event.time}</span>
                              )}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 4. デスクトップ 月ビュー
// ==============================================================
export const MonthView = ({
  isDark,
  monthViewDays,
  setCurrentDate,
  setViewMode,
  timetableData,
  customEvents,
  fixedSchedules,
  addModalState,
  scheduleCategories
}) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-[fadeIn_0.2s_ease-out]">
      <div className={`grid grid-cols-7 text-center py-2 border-b shrink-0 text-xs font-bold text-gray-500 bg-gray-500/5 ${
        isDark ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
      </div>

      <div className={`flex-1 grid grid-cols-7 grid-rows-6 h-full ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        {monthViewDays.map((day, idx) => {
           const dateKey = (day.fullDate && typeof day.fullDate.getMonth === 'function' && typeof day.fullDate.getDate === 'function') 
             ? `${day.fullDate.getMonth() + 1}/${day.fullDate.getDate()}` 
             : '';
          const dayEvents = dateKey ? getEventsForDate(dateKey, day.fullDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories).slice(0, 3) : [];

          return (
            <div 
              key={idx} 
              onClick={() => {
                if (day.fullDate) {
                  setCurrentDate(day.fullDate);
                  setViewMode('day');
                }
              }}
              className={`
                p-1 border-b border-r flex flex-col items-stretch overflow-hidden transition-all hover:bg-gray-500/5 cursor-pointer min-w-0
                ${isDark ? 'border-gray-850' : 'border-gray-150'}
                ${!day.currentMonth ? 'opacity-30' : ''}
              `}
            >
              <div className="flex justify-between items-center mb-1 shrink-0 px-1">
                <span className={`
                  w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black leading-none
                  ${day.isToday ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'}
                `}>
                  {day.val}
                </span>
              </div>
              
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEvents.map(event => {
                  const { classes } = getColorClasses(event.color, false, false, isDark);
                  return (
                    <div 
                      key={event.id}
                      className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded truncate border border-transparent leading-tight ${classes}`}
                    >
                      {event.title}
                    </div>
                  );
                })}
                {dateKey && getEventsForDate(dateKey, day.fullDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories).length > 3 && (
                  <div className="text-[7.5px] text-gray-500 font-bold pl-1 text-center bg-gray-500/5 rounded">
                    他 {getEventsForDate(dateKey, day.fullDate, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories).length - 3} 件
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
