import React from 'react';
import { 
  X, ChevronLeft, ChevronRight, BookOpen, Plus, MapPin, Clock, ArrowRight, Menu, Check, Eye 
} from 'lucide-react';
import { COLOR_MAP, TIME_OPTIONS } from './todoCalendarConstants';
import { getColorClasses, getEventColor } from './todoCalendarUtils';

// ==============================================================
// 1. 左カラムミニカレンダー
// ==============================================================
export const MiniCalendar = ({
  isDark,
  miniCalLabel,
  handleNavigateMiniCalendar,
  miniCalendarDays,
  handleSelectDateFromMiniCalendar
}) => {
  return (
    <div className="mb-8 select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-extrabold tracking-tight hidden lg:inline">{miniCalLabel}</span>
        <span className="text-sm font-extrabold tracking-tight lg:hidden">日付を選択</span>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => handleNavigateMiniCalendar('prev')}
            className="p-0.5 rounded hover:bg-gray-500/10 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            onClick={() => handleNavigateMiniCalendar('next')}
            className="p-0.5 rounded hover:bg-gray-500/10 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-[10px] font-bold text-gray-500 mb-2">
        <span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
      </div>
      
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-0.5 text-center text-xs font-semibold">
        {miniCalendarDays.map((day, idx) => (
          <div key={idx} className="flex items-center justify-center aspect-square">
            <span 
              onClick={() => handleSelectDateFromMiniCalendar(day.fullDate)}
              className={`
                w-6 h-6 flex items-center justify-center rounded-full leading-none text-[11px] select-none transition-all duration-150 active:scale-95 cursor-pointer
                ${!day.currentMonth ? 'text-gray-400 font-normal opacity-40' : ''}
                ${day.isToday ? 'bg-red-500 text-white font-black shadow-md' : ''}
                ${day.isSelected && !day.isToday ? (isDark ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'bg-blue-100 text-blue-600 border border-blue-200') : 'hover:bg-gray-500/10'}
              `}
            >
              {day.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 2. 固定スケジュール管理パネル
// ==============================================================
export const FixedSchedulePanel = ({
  isDark,
  scheduleCategories,
  newFixedState,
  setNewFixedState,
  handleAddFixedSchedule,
  fixedSchedules,
  handleEventClick,
  handleDeleteFixedSchedule
}) => {
  return (
    <div className="space-y-6 select-none border-t border-gray-500/10 pt-6 mt-4">
      {/* 新規登録ブロック */}
      <div className="space-y-3">
        <span className={`text-[10px] font-black tracking-widest uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          📌 固定予定を追加
        </span>
        
        <div className="space-y-2 p-3 rounded-xl border bg-gray-500/5 border-gray-500/10">
          {/* タイプ選択 */}
          <div className="flex flex-wrap gap-1 p-0.5 rounded-lg bg-gray-500/5 border border-gray-500/10">
            {scheduleCategories.map(tab => {
              const matchedColor = COLOR_MAP[tab.color] || COLOR_MAP.blue;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setNewFixedState(prev => ({ ...prev, type: tab.id }))}
                  className={`flex-1 min-w-[45px] py-1 text-[10px] font-bold rounded transition-all ${
                    newFixedState.type === tab.id
                      ? `${matchedColor.solidBg} text-white shadow-sm`
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* タイトル入力 */}
          <input
            type="text"
            value={newFixedState.title}
            onChange={e => setNewFixedState(prev => ({ ...prev, title: e.target.value }))}
            placeholder="タイトルを追加 (任意)"
            className={`w-full px-2 py-1 text-[11px] font-semibold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
              isDark 
                ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500' 
                : 'bg-white border-gray-250 text-gray-900 placeholder-gray-400'
            }`}
          />

          {/* 場所入力 */}
          <input
            type="text"
            value={newFixedState.location}
            onChange={e => setNewFixedState(prev => ({ ...prev, location: e.target.value }))}
            placeholder="場所を追加 (任意)"
            className={`w-full px-2 py-1 text-[11px] font-semibold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
              isDark 
                ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500' 
                : 'bg-white border-gray-250 text-gray-900 placeholder-gray-400'
            }`}
          />

          {/* 曜日・時間設定 */}
          <div className="flex items-center space-x-1 text-xs">
            <select
              value={newFixedState.dayOfWeek}
              onChange={e => setNewFixedState(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
              className={`flex-1 px-1 py-1 font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] ${
                isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-850'
              }`}
            >
              {[
                { val: 1, label: '月曜' },
                { val: 2, label: '火曜' },
                { val: 3, label: '水曜' },
                { val: 4, label: '木曜' },
                { val: 5, label: '金曜' },
                { val: 6, label: '土曜' },
                { val: 0, label: '日曜' }
              ].map(d => (
                <option key={d.val} value={d.val}>{d.label}</option>
              ))}
            </select>

            <select
              value={`${newFixedState.startHour}:${newFixedState.startMin}`}
              onChange={e => {
                const [h, m] = e.target.value.split(':').map(Number);
                setNewFixedState(prev => ({ ...prev, startHour: h, startMin: m }));
              }}
              className={`px-1 py-1 font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] ${
                isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-850'
              }`}
            >
              {TIME_OPTIONS.map((opt, oIdx) => (
                <option key={oIdx} value={`${opt.hour}:${opt.min}`}>
                  {opt.hour}:{String(opt.min).padStart(2, '0')}
                </option>
              ))}
            </select>

            <span className="text-gray-400">-</span>

            <select
              value={`${newFixedState.endHour}:${newFixedState.endMin}`}
              onChange={e => {
                const [h, m] = e.target.value.split(':').map(Number);
                setNewFixedState(prev => ({ ...prev, endHour: h, endMin: m }));
              }}
              className={`px-1 py-1 font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] ${
                isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-850'
              }`}
            >
              {TIME_OPTIONS.map((opt, oIdx) => (
                <option key={oIdx} value={`${opt.hour}:${opt.min}`}>
                  {opt.hour}:{String(opt.min).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddFixedSchedule}
            className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-all active:scale-95 shadow-sm"
          >
            固定予定を追加
          </button>
        </div>
      </div>

      {/* 登録済みリスト */}
      <div className="space-y-2">
        <span className={`text-[10px] font-black tracking-widest uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          📋 登録済みの固定予定
        </span>
        
        {fixedSchedules.length === 0 ? (
          <div className={`p-4 text-center rounded-xl border border-dashed ${
            isDark ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'
          }`}>
            <span className="text-[10px] font-bold">登録された固定予定はありません</span>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
            {[1, 2, 3, 4, 5, 6, 0].map(dayNum => {
              const schedulesOnDay = fixedSchedules.filter(fs => fs.dayOfWeek === dayNum);
              if (schedulesOnDay.length === 0) return null;

              const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
              const dayName = dayLabels[dayNum];

              return (
                <div key={dayNum} className="space-y-1">
                  <div className="text-[9px] font-black text-gray-500 dark:text-gray-400 pl-1">{dayName}曜日</div>
                  {schedulesOnDay.map(fs => {
                    const matchedCat = scheduleCategories.find(c => c.id === fs.type);
                    const colorKey = matchedCat ? matchedCat.color : 'blue';
                    const matchedColor = COLOR_MAP[colorKey] || COLOR_MAP.blue;
                    const badgeColor = matchedColor.borderF;
                    const label = matchedCat ? matchedCat.label : 'その他';

                    return (
                      <div 
                        key={fs.id}
                        onClick={() => handleEventClick({ id: fs.id, isFixedSchedule: true })}
                        className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer hover:bg-gray-500/10 transition-colors ${
                          isDark ? 'bg-gray-900/60 border-gray-850' : 'bg-gray-50 border-gray-150'
                        }`}
                      >
                        <div className="flex items-center space-x-1 min-w-0 flex-1">
                          <span className={`px-1 py-0.5 rounded text-[7px] font-black border uppercase ${badgeColor}`}>
                            {label}
                          </span>
                          <span className="truncate min-w-0" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>{fs.title}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] font-medium" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>
                            {fs.startHour}:{String(fs.startMin).padStart(2, '0')}-{fs.endHour}:{String(fs.endMin).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteFixedSchedule(fs.id)}
                            className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-0.5 rounded"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================
// 3. 予定詳細確認ビュー
// ==============================================================
export const DetailView = ({
  isDark,
  addModalState,
  setAddModalState,
  scheduleCategories,
  currentDate,
  onLessonSelect,
  handleDeleteEvent,
  setActiveRightSidebar
}) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center shrink-0">
        <span className={`text-[10px] font-black tracking-wider uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {addModalState.isLesson ? '授業詳細' : '予定詳細'}
        </span>
        {!addModalState.isLesson && (
          <button
            onClick={() => setAddModalState(prev => ({ ...prev, isDetailView: false }))}
            className="text-[10px] font-black text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 active:scale-95"
          >
            <span>編集フォームを開く</span>
            <ArrowRight size={10} />
          </button>
        )}
      </div>

      <div className="space-y-2 shrink-0 pt-2">
        <div className="flex">
          {(() => {
            const type = addModalState.isLesson ? 'lesson' : addModalState.type;
            let label = 'その他';
            let badgeClass = 'bg-gray-500/10 border-gray-500 text-gray-600 dark:text-gray-400';

            if (type === 'lesson') {
              label = '講義';
              badgeClass = 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400';
            } else {
              const matchedCat = scheduleCategories.find(cat => cat.id === type);
              if (matchedCat) {
                label = matchedCat.label;
                const styles = COLOR_MAP[matchedCat.color] || COLOR_MAP.blue;
                badgeClass = styles.badge;
              }
            }
            
            return (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border tracking-wider ${badgeClass}`}>
                {label}
              </span>
            );
          })()}
        </div>

        <h2 className={`text-lg lg:text-xl font-black leading-tight tracking-tight break-words ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {addModalState.title || '(タイトルなし)'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pt-1 pb-10 xl:pb-1 space-y-4 no-scrollbar">
        <div className="flex items-start space-x-3">
          <span className="p-1 rounded-xl bg-gray-500/5 text-gray-400 shrink-0"><Clock size={15} /></span>
          <div className="space-y-0.5 select-text">
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">日時</div>
            <div className={`text-xs font-black leading-normal ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              {(() => {
                const date = addModalState.dateObj || currentDate || new Date();
                const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                const dayName = dayNames[date.getDay()];
                
                const dateStr = addModalState.isFixedSchedule 
                  ? `毎週${dayName}曜日` 
                  : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${dayName})`;
                
                const timeStr = addModalState.isAllDay 
                  ? '終日' 
                  : `${addModalState.startHour}:${String(addModalState.startMin).padStart(2, '0')} ~ ${addModalState.endHour}:${String(addModalState.endMin).padStart(2, '0')}`;
                
                return (
                  <div className="flex flex-col gap-0.5">
                    <span>{dateStr}</span>
                    <span className="text-gray-400 dark:text-gray-500 font-extrabold text-[11px]">{timeStr}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {addModalState.location && addModalState.location.trim() !== '' && (
          <div className="flex items-start space-x-3">
            <span className="p-1 rounded-xl bg-gray-500/5 text-gray-400 shrink-0"><MapPin size={15} /></span>
            <div className="space-y-0.5 select-text">
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">場所 / 教室</div>
              <div className={`text-xs font-black ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                {addModalState.location}
              </div>
            </div>
          </div>
        )}

        {addModalState.description && addModalState.description.trim() !== '' && (
          <div className="flex items-start space-x-3">
            <span className="p-1 rounded-xl bg-gray-500/5 text-gray-400 shrink-0"><Menu size={15} /></span>
            <div className="space-y-0.5 flex-1 min-w-0 select-text">
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">説明 / メモ</div>
              <div className={`text-xs font-bold leading-relaxed whitespace-pre-wrap break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {addModalState.description}
              </div>
            </div>
          </div>
        )}

        {addModalState.isLesson && addModalState.lessonObj && (
          <div className="p-3.5 rounded-2xl border bg-purple-500/5 border-purple-500/10 space-y-2 select-text">
            <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest block">
              授業データベース情報
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <div>
                <div className="text-gray-400 dark:text-gray-500">時限</div>
                <div className={`mt-0.5 font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {addModalState.lessonObj.period}限 ({addModalState.lessonObj.day}曜)
                </div>
              </div>
              <div>
                <div className="text-gray-400 dark:text-gray-500">ターム</div>
                <div className={`mt-0.5 font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {addModalState.lessonObj.term}
                </div>
              </div>
              {addModalState.lessonObj.teacher && (
                <div className="col-span-2">
                  <div className="text-gray-400 dark:text-gray-500">担当教員</div>
                  <div className={`mt-0.5 font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {addModalState.lessonObj.teacher}
                  </div>
                </div>
              )}
              {addModalState.lessonObj.code && (
                <div className="col-span-2">
                  <div className="text-gray-400 dark:text-gray-500">科目コード</div>
                  <div className={`mt-0.5 font-black font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {addModalState.lessonObj.code}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-2 pt-3 border-t shrink-0 select-none pb-1 bg-transparent`}>
        {addModalState.isLesson ? (
          <button
            onClick={() => {
              setActiveRightSidebar(false);
              if (onLessonSelect) {
                onLessonSelect(addModalState.lessonObj);
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95 text-xs hover:brightness-105 flex items-center justify-center gap-1.5"
          >
            <BookOpen size={13} />
            <span>授業トーク・ToDoを開く</span>
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setAddModalState(prev => ({ ...prev, isDetailView: false }))}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95 text-xs hover:brightness-105 flex items-center justify-center gap-1.5"
            >
              <Plus size={13} strokeWidth={3} />
              <span>予定を編集する</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                handleDeleteEvent(addModalState.isFixedSchedule && addModalState.editingFixedScheduleId ? addModalState.editingFixedScheduleId : addModalState.editingEventId, addModalState.isFixedSchedule);
                setActiveRightSidebar(false);
              }}
              className="w-full text-xs font-black text-red-500 hover:text-red-600 transition-colors py-1.5 rounded-xl hover:bg-red-500/5 active:scale-95 transition-all text-center"
            >
              この予定を削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================
// 4. 予定編集 / 追加フォーム
// ==============================================================
export const EventForm = ({
  isDark,
  addModalState,
  setAddModalState,
  scheduleCategories,
  isAddingCategory,
  setIsAddingCategory,
  newCatLabel,
  setNewCatLabel,
  newCatColor,
  setNewCatColor,
  handleAddCategory,
  handleDeleteCategory,
  activeTimePicker,
  setActiveTimePicker,
  handleStartTimeSelect,
  handleEndTimeSelect,
  handleSaveEvent,
  handleDeleteEvent,
  resetFormState
}) => {
  return (
    <div className="flex-1 flex flex-col space-y-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center select-none shrink-0">
        <span className={`text-xs font-black tracking-wider uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {addModalState.isEdit ? '予定の編集' : '予定の追加'}
        </span>
        {addModalState.isEdit && (
          <button
            onClick={resetFormState}
            className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
          >
            新規作成に戻る
          </button>
        )}
      </div>

      {/* タイトル入力 */}
      <div className="relative shrink-0">
        <input 
          type="text" 
          value={addModalState.title} 
          onChange={e => setAddModalState(prev => ({ ...prev, title: e.target.value }))}
          placeholder="タイトルを追加"
          className={`w-full text-base font-bold border-b-2 py-1 focus:outline-none focus:border-blue-500 transition-all bg-transparent ${
            isDark ? 'border-gray-800 text-white placeholder-gray-500' : 'border-gray-200 text-gray-900 placeholder-gray-400'
          }`}
        />
      </div>

      {/* タイプ選択トグル ＆ カテゴリー管理 */}
      <div className="space-y-2 shrink-0 select-none">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-gray-500/5 w-full border border-gray-500/10 items-center">
          {scheduleCategories.map(tab => {
            const matchedColor = COLOR_MAP[tab.color] || COLOR_MAP.blue;
            const isSelected = addModalState.type === tab.id;
            const isSystem = ['parttime', 'circle', 'homework'].includes(tab.id);

            return (
              <div
                key={tab.id}
                className={`flex items-center rounded-xl transition-all ${
                  isSelected
                    ? `${matchedColor.solidBg} text-white shadow-sm`
                    : isDark 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-500/5' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-500/5'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAddModalState(prev => ({ ...prev, type: tab.id }))}
                  className="px-2.5 py-1 text-[11px] font-black"
                >
                  {tab.label}
                </button>
                {!isSystem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(tab.id);
                    }}
                    className={`p-1 rounded-full hover:bg-black/10 text-[9px] mr-1 active:scale-95 transition-all shrink-0 ${
                      isSelected ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
          
          <button
            type="button"
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            className={`p-1 rounded-xl transition-all active:scale-95 border flex items-center justify-center shrink-0 ${
              isAddingCategory
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                : isDark
                  ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            style={{ width: '22px', height: '22px' }}
          >
            {isAddingCategory ? <X size={11} strokeWidth={3} /> : <Plus size={11} strokeWidth={3} />}
          </button>
        </div>

        {/* カテゴリ追加フォーム */}
        {isAddingCategory && (
          <div className={`p-3 rounded-2xl border space-y-2.5 select-none animate-[fadeIn_0.15s_ease-out] ${
            isDark ? 'bg-gray-900/40 border-gray-800' : 'bg-gray-50/50 border-gray-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                新規カテゴリーを追加
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCatLabel}
                onChange={e => setNewCatLabel(e.target.value)}
                placeholder="カテゴリ名（8文字以内）"
                className={`flex-1 text-xs font-bold border-b py-0.5 focus:outline-none focus:border-blue-500 transition-all bg-transparent ${
                  isDark ? 'border-gray-800 text-white placeholder-gray-600' : 'border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1 rounded-xl text-[10px] active:scale-95 transition-all shadow-sm shrink-0"
              >
                作成
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {Object.keys(COLOR_MAP).map(colorKey => {
                const isColorSelected = newCatColor === colorKey;
                const col = COLOR_MAP[colorKey];
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setNewCatColor(colorKey)}
                    className={`w-4 h-4 rounded-full transition-all active:scale-90 flex items-center justify-center border ${col.dotBg} ${
                      isColorSelected 
                        ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 border-white' 
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 各種入力フォームリスト */}
      <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 pt-1 pb-10 xl:pb-1 select-none no-scrollbar">
        {/* 日時表示 */}
        <div className="flex items-start space-x-2.5 relative">
          <span className="p-0.5 mt-0.5 text-gray-400"><Clock size={14} /></span>
          <div className="flex-1 text-[11px] space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 select-none">
              <div className="relative">
                {addModalState.isFixedSchedule ? (
                  <select
                    value={addModalState.dayOfWeek}
                    onChange={e => setAddModalState(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                    className={`px-2 py-1 rounded font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] cursor-pointer transition-all ${
                      isDark 
                        ? 'bg-gray-850 text-white border border-gray-700 hover:bg-gray-800' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200/80'
                    }`}
                  >
                    {[
                      { val: 1, label: '月曜日' },
                      { val: 2, label: '火曜日' },
                      { val: 3, label: '水曜日' },
                      { val: 4, label: '木曜日' },
                      { val: 5, label: '金曜日' },
                      { val: 6, label: '土曜日' },
                      { val: 0, label: '日曜日' }
                    ].map(d => (
                      <option key={d.val} value={d.val}>{d.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={addModalState.dateObj ? `${addModalState.dateObj.getFullYear()}-${String(addModalState.dateObj.getMonth() + 1).padStart(2, '0')}-${String(addModalState.dateObj.getDate()).padStart(2, '0')}` : ''}
                    onChange={e => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        setAddModalState(prev => ({
                          ...prev,
                          dateObj: new Date(y, m - 1, d)
                        }));
                      }
                    }}
                    className={`px-2 py-1 rounded font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] cursor-pointer transition-all ${
                      isDark 
                        ? 'bg-gray-850 text-white border border-gray-700 hover:bg-gray-800' 
                        : 'bg-gray-100 text-gray-850 border border-gray-200 hover:bg-gray-200/80'
                    }`}
                  />
                )}
              </div>
              
              {/* 開始時間ボタン */}
              <div className="relative">
                <button
                  type="button"
                  disabled={addModalState.isAllDay}
                  onClick={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    addModalState.isAllDay ? 'opacity-40 cursor-not-allowed bg-gray-500/10' : ''
                  } ${
                    activeTimePicker === 'start'
                      ? 'bg-blue-500 text-white border border-blue-500 shadow-md scale-95'
                      : isDark ? 'bg-gray-850 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-800 hover:bg-gray-200/80'
                  }`}
                >
                  {addModalState.dateObj ? `${addModalState.startHour}:${String(addModalState.startMin).padStart(2, '0')}` : ''}
                </button>
                
                {activeTimePicker === 'start' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveTimePicker(null)}></div>
                    <div className={`time-picker-options-container absolute left-0 mt-1 w-28 max-h-48 overflow-y-auto rounded-lg border p-0.5 shadow-xl z-50 animate-fade-in ${
                      isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-850'
                    }`}>
                      {TIME_OPTIONS.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleStartTimeSelect(opt.hour, opt.min)}
                          className={`w-full text-left px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                            addModalState.startHour === opt.hour && addModalState.startMin === opt.min
                              ? 'bg-blue-500 text-white'
                              : isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {opt.hour}:{String(opt.min).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <span className="text-gray-400 font-bold">-</span>

              {/* 終了時間ボタン */}
              <div className="relative">
                <button
                  type="button"
                  disabled={addModalState.isAllDay}
                  onClick={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    addModalState.isAllDay ? 'opacity-40 cursor-not-allowed bg-gray-500/10' : ''
                  } ${
                    activeTimePicker === 'end'
                      ? 'bg-blue-500 text-white border border-blue-500 shadow-md scale-95'
                      : isDark ? 'bg-gray-850 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-800 hover:bg-gray-200/80'
                  }`}
                >
                  {addModalState.dateObj ? `${addModalState.endHour}:${String(addModalState.endMin).padStart(2, '0')}` : ''}
                </button>
                
                {activeTimePicker === 'end' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveTimePicker(null)}></div>
                    <div className={`time-picker-options-container absolute left-0 mt-1 w-28 max-h-48 overflow-y-auto rounded-lg border p-0.5 shadow-xl z-50 animate-fade-in ${
                      isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-850'
                    }`}>
                      {TIME_OPTIONS
                        .filter(opt => (opt.hour * 60 + opt.min) > (addModalState.startHour * 60 + addModalState.startMin))
                        .map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleEndTimeSelect(opt.hour, opt.min)}
                            className={`w-full text-left px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                              addModalState.endHour === opt.hour && addModalState.endMin === opt.min
                                ? 'bg-blue-500 text-white'
                                : isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {opt.hour}:{String(opt.min).padStart(2, '0')}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 終日チェックボックス */}
            {!addModalState.isFixedSchedule && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 select-none pt-0.5">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addModalState.isAllDay || false} 
                    onChange={(e) => setAddModalState(prev => ({ ...prev, isAllDay: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 scale-75" 
                  />
                  <span className="text-[10px] text-gray-500 font-bold">終日</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 場所入力 */}
        <div className="flex items-center space-x-2.5">
          <span className="p-0.5 text-gray-400"><MapPin size={14} /></span>
          <input 
            type="text" 
            value={addModalState.location || ''}
            onChange={e => setAddModalState(prev => ({ ...prev, location: e.target.value }))}
            placeholder="場所を追加"
            className={`flex-1 text-[11px] py-0.5 bg-transparent border-b border-transparent focus:outline-none focus:border-blue-500 transition-all ${
              isDark ? 'text-white placeholder-gray-500' : 'text-gray-950 placeholder-gray-400'
            }`}
          />
        </div>

        {/* 説明入力 */}
        <div className="flex items-start space-x-2.5">
          <span className="p-0.5 mt-0.5 text-gray-400"><Menu size={14} /></span>
          <textarea 
            value={addModalState.description || ''}
            onChange={e => setAddModalState(prev => ({ ...prev, description: e.target.value }))}
            placeholder="説明を追加"
            rows={2}
            className={`flex-1 text-[11px] py-0.5 bg-transparent border-b border-transparent focus:outline-none focus:border-blue-500 resize-none transition-all ${
              isDark ? 'text-white placeholder-gray-500' : 'text-gray-950 placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      {/* アクションボタン */}
      <div className={`flex items-center justify-between pt-3.5 border-t shrink-0 z-10 select-none pb-1 ${
        isDark ? 'border-gray-800 bg-black' : 'border-gray-150 bg-white'
      }`}>
        {addModalState.isEdit ? (
          <button 
            type="button" 
            onClick={() => handleDeleteEvent(addModalState.isFixedSchedule && addModalState.editingFixedScheduleId ? addModalState.editingFixedScheduleId : addModalState.editingEventId, addModalState.isFixedSchedule)}
            className="text-xs font-extrabold text-red-500 hover:text-red-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-red-500/5 active:scale-95 transition-all"
          >
            予定を削除
          </button>
        ) : (
          <button 
            type="button" 
            onClick={resetFormState}
            className="text-xs font-extrabold text-gray-400 hover:text-gray-500 transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-500/5 active:scale-95 transition-all"
          >
            予定の削除
          </button>
        )}
        <button 
          type="button"
          onClick={handleSaveEvent}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95 text-xs hover:brightness-105"
        >
          {addModalState.isEdit ? '更新する' : '保存する'}
        </button>
      </div>
    </div>
  );
};
