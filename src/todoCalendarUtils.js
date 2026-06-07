import { ACADEMIC_EVENTS, COLOR_MAP } from './todoCalendarConstants';

// ==============================================================
// 埼玉大学 ターム・時間割・学年歴 連携ロジック (超頑丈・型安全設計)
// ==============================================================

// その日が第何タームに属しているかを判定
export const getTermForDate = (date) => {
  if (!date || typeof date.getTime !== 'function') return null;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // 2026年度学年歴ベース of ターム期間判定 (補講期間も含めて表示)
  if (dateStr >= "2026-04-09" && dateStr <= "2026-06-05") return 1;
  if (dateStr >= "2026-06-08" && dateStr <= "2026-08-03") return 2;
  if (dateStr >= "2026-10-01" && dateStr <= "2026-12-01") return 3;
  if (dateStr >= "2026-12-02" && dateStr <= "2027-02-09") return 4;
  return null;
};

// その日に対する学年歴（終日予定）のイベントリストを取得
export const getAcademicEventsForDate = (date) => {
  if (!date || typeof date.getTime !== 'function') return [];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return ACADEMIC_EVENTS.filter(ev => {
    const dayOfWeek = date.getDay();
    // 試験期間中の土日は原則授業日ではないため、週末の試験表示を除外
    const isExamOnWeekend = ev.type === 'exam' && (dayOfWeek === 0 || dayOfWeek === 6);
    return dateStr >= ev.start && dateStr <= ev.end && !isExamOnWeekend;
  });
};

// 学年歴の種別に応じた美しいバッジカラーを取得
export const getEventColor = (type, isCustom, isTempPreview, customColor, scheduleCategories) => {
  if (isCustom || isTempPreview) {
    const matchedCat = scheduleCategories.find(cat => cat.id === type);
    const colorKey = matchedCat ? matchedCat.color : (customColor || 'blue');
    const styles = COLOR_MAP[colorKey] || COLOR_MAP.blue;
    return styles.borderL;
  }

  switch (type) {
    case 'vacation': return 'bg-red-500/10 border-l-[3px] border-red-500 text-red-600 dark:text-red-400';
    case 'intensive': return 'bg-purple-500/10 border-l-[3px] border-purple-500 text-purple-600 dark:text-purple-400';
    case 'exam': return 'bg-orange-500/10 border-l-[3px] border-orange-500 text-orange-600 dark:text-orange-400';
    case 'makeup': return 'bg-pink-500/10 border-l-[3px] border-pink-500 text-pink-600 dark:text-pink-400';
    case 'start': return 'bg-emerald-500/10 border-l-[3px] border-emerald-500 text-emerald-600 dark:text-emerald-400';
    case 'grade': return 'bg-blue-500/10 border-l-[3px] border-blue-500 text-blue-600 dark:text-blue-400';
    case 'class': return 'bg-yellow-500/10 border-l-[3px] border-yellow-500 text-yellow-600 dark:text-yellow-400';
    case 'event': return 'bg-indigo-500/10 border-l-[3px] border-indigo-500 text-indigo-600 dark:text-indigo-400';
    case 'holiday': return 'bg-gray-400/10 border-l-[3px] border-gray-400 text-gray-600 dark:text-gray-400';
    
    default:
      // 通常のカテゴリーにマッチするか確認
      const matched = scheduleCategories.find(cat => cat.id === type);
      if (matched) {
        const styles = COLOR_MAP[matched.color] || COLOR_MAP.blue;
        return styles.borderL;
      }
      return 'bg-gray-500/10 border-l-[3px] border-gray-500 text-gray-600';
  }
};

// ユーザーがインポートした時間割データをカレンダーイベントに変換
export const getTimetableEventsForDate = (date, timetableData) => {
  if (!date || typeof date.getTime !== 'function') return [];
  
  // 補講（補修）の日はデフォルトで授業を表示しないように対応
  const academicEvents = getAcademicEventsForDate(date);
  const isMakeupDay = academicEvents.some(ev => ev.type === 'makeup' || ev.title.includes('補講') || ev.title.includes('補修'));
  if (isMakeupDay) return [];

  // 祝日（holiday）の日は授業を表示しない。ただし授業日（class）として指定されている日は除く。
  const isHoliday = academicEvents.some(ev => ev.type === 'holiday');
  const isClassDay = academicEvents.some(ev => ev.type === 'class');
  if (isHoliday && !isClassDay) return [];

  // 1. その日のタームを判定
  const termNum = getTermForDate(date);
  if (!termNum) return [];
  const termKey = `第${termNum}ターム`;
  
  // 2. その日の曜日（日本語キー）を取得
  const dayOfWeek = date.getDay(); // 0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土
  if (dayOfWeek === 0 || dayOfWeek === 6) return []; // 土日は授業なし
  const daysMap = ["日", "月", "火", "水", "木", "金", "土"];
  const dayKey = daysMap[dayOfWeek];
  
  // 3. props または localStorage から時間割を取得
  const currentTimetables = timetableData || (() => {
    try {
      return JSON.parse(localStorage.getItem('twitter_clone_timetables')) || {};
    } catch (e) {
      return {};
    }
  })();
  
  const termTimetable = currentTimetables[termKey] || {};
  const events = [];
  
  // 埼玉大学の時限ごとの標準時間割 (1時限 = 90分)
  const lessonTimes = {
    "1": { startHour: 9, startMin: 0, endHour: 10, endMin: 30, timeStr: "09:00 AM - 10:30 AM" },
    "2": { startHour: 10, startMin: 40, endHour: 12, endMin: 10, timeStr: "10:40 AM - 12:10 PM" },
    "3": { startHour: 13, startMin: 0, endHour: 14, endMin: 30, timeStr: "01:00 PM - 02:30 PM" },
    "4": { startHour: 14, startMin: 40, endHour: 16, endMin: 10, timeStr: "02:40 PM - 04:10 PM" },
    "5": { startHour: 16, startMin: 20, endHour: 17, endMin: 50, timeStr: "04:20 PM - 05:50 PM" },
    "6": { startHour: 18, startMin: 0, endHour: 19, endMin: 30, timeStr: "06:00 PM - 07:30 PM" }
  };
  
  // 各限（1〜6限）をスキャンして授業をマッピング
  Object.keys(termTimetable).forEach(period => {
    const dayData = termTimetable[period] || {};
    const lesson = dayData[dayKey];
    
    if (lesson && lesson.name && lesson.name.trim() !== '') {
      const timeInfo = lessonTimes[period] || { startHour: 9, startMin: 0, endHour: 10, endMin: 30, timeStr: "09:00 AM - 10:30 AM" };
      
      // 授業に設定された色は無視し、カレンダー内ではすべての授業セルを同じ色（blue）に統一します
      const colorName = 'blue';
      
      events.push({
        id: `lesson-${termKey}-${period}-${dayKey}-${lesson.name}`,
        title: lesson.name,
        room: lesson.room || '教室未設定',
        time: timeInfo.timeStr,
        startHour: timeInfo.startHour,
        startMin: timeInfo.startMin,
        duration: 90,
        color: colorName,
        isLesson: true,
        period: period
      });
    }
  });
  
  return events;
};

// 週の学年歴イベントの行（スロット）重複回避割り当てアルゴリズム
export const getWeekAcademicSlots = (days, customEvents, fixedSchedules, addModalState, scheduleCategories) => {
  if (!days || days.length === 0) return [];
  
  // 週全体のユニークな学年歴イベントを収集
  const allEvents = [];
  const seen = new Set();
  
  days.forEach(day => {
    const dayEvents = getAcademicEventsForDate(day.fullDate);
    dayEvents.forEach(ev => {
      const key = `${ev.title}-${ev.start}-${ev.end}`;
      if (!seen.has(key)) {
        seen.add(key);
        allEvents.push(ev);
      }
    });
  });

  // ユーザーのカスタム終日予定および仮プレビュー終日予定を学年歴スロットへマージ
  customEvents.forEach(ev => {
    if (ev.isAllDay) {
      // この予定が週の日付範囲に入っているか確認
      const isInWeek = days.some(day => {
        const dateStr = day.fullDate ? `${day.fullDate.getFullYear()}-${String(day.fullDate.getMonth() + 1).padStart(2, '0')}-${String(day.fullDate.getDate()).padStart(2, '0')}` : '';
        return dateStr === ev.fullDate;
      });

      if (isInWeek) {
        const key = `custom-${ev.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push({
            start: ev.fullDate,
            end: ev.fullDate,
            title: ev.title,
            type: ev.type,
            isCustom: true,
            id: ev.id,
            color: ev.color
          });
        }
      }
    }
  });

  // プレビュー中の終日予定をマージ
  if (addModalState.isOpen && addModalState.isPreviewActive && addModalState.isAllDay && addModalState.dateObj) {
    const py = addModalState.dateObj.getFullYear();
    const pm = addModalState.dateObj.getMonth() + 1;
    const pd = addModalState.dateObj.getDate();
    const pDateStr = `${py}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}`;

    const isInWeek = days.some(day => {
      const dateStr = day.fullDate ? `${day.fullDate.getFullYear()}-${String(day.fullDate.getMonth() + 1).padStart(2, '0')}-${String(day.fullDate.getDate()).padStart(2, '0')}` : '';
      return dateStr === pDateStr;
    });

    if (isInWeek) {
      const key = `temp-preview-all-day`;
      if (!seen.has(key)) {
        seen.add(key);
        allEvents.push({
          start: pDateStr,
          end: pDateStr,
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
  
  // 期間が長い順 ➔ 開始日が早い順にソート (カレンダーの標準配置ルール)
  allEvents.sort((a, b) => {
    const lenA = new Date(a.end) - new Date(a.start);
    const lenB = new Date(b.end) - new Date(b.start);
    return lenB - lenA || a.start.localeCompare(b.start) || a.title.localeCompare(b.title);
  });
  
  // 各行（スロット）にイベントを非衝突でアサイン
  const slots = [];
  
  allEvents.forEach(ev => {
    // 各曜日のうち、このイベントがアクティブ（期間中かつ土日試験バー除外）な日
    const activeDays = days.map(day => {
      const dateStr = day.fullDate ? `${day.fullDate.getFullYear()}-${String(day.fullDate.getMonth() + 1).padStart(2, '0')}-${String(day.fullDate.getDate()).padStart(2, '0')}` : '';
      const dayOfWeek = day.fullDate?.getDay();
      const isExamOnWeekend = ev.type === 'exam' && (dayOfWeek === 0 || dayOfWeek === 6);
      return dateStr >= ev.start && dateStr <= ev.end && !isExamOnWeekend;
    });
    
    // 非衝突スロット探索
    let assignedRow = -1;
    for (let r = 0; r < slots.length; r++) {
      let conflict = false;
      for (let d = 0; d < 7; d++) {
        if (activeDays[d] && slots[r].daysActive[d]) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        assignedRow = r;
        break;
      }
    }
    
    if (assignedRow === -1) {
      slots.push({
        rowEvents: Array(7).fill(null),
        daysActive: Array(7).fill(false)
      });
      assignedRow = slots.length - 1;
    }
    
    for (let d = 0; d < 7; d++) {
      if (activeDays[d]) {
        slots[assignedRow].rowEvents[d] = ev;
        slots[assignedRow].daysActive[d] = true;
      }
    }
  });
  
  return slots;
};

// 予定ゲッター
export const getEventsForDate = (dateStr, dateObj, timetableData, customEvents, fixedSchedules, addModalState, scheduleCategories) => {
  // 1. ユーザーの時間割から授業を動的にマッピング
  const timetableEvents = getTimetableEventsForDate(dateObj, timetableData);
  
  // 2. ユーザーが手動追加したカスタム予定をマージ
  let matchedCustomEvents = [];
  if (dateObj && typeof dateObj.getTime === 'function') {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const fullDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    matchedCustomEvents = (customEvents || []).filter(ev => ev.fullDate === fullDateStr && !ev.isAllDay);

    // モーダル表示中のリアルタイム同期仮プレビューをマージ (終日予定ではない場合のみ時間枠カレンダーへプロット)
    if (addModalState.isOpen && addModalState.isPreviewActive && addModalState.dateObj && !addModalState.isAllDay) {
      const modalY = addModalState.dateObj.getFullYear();
      const modalM = addModalState.dateObj.getMonth() + 1;
      const modalD = addModalState.dateObj.getDate();
      const modalDateStr = `${modalY}-${String(modalM).padStart(2, '0')}-${String(modalD).padStart(2, '0')}`;

      if (fullDateStr === modalDateStr) {
        const { startHour, startMin, endHour, endMin, title, type, location } = addModalState;
        
        // 時刻フォーマット（24時間表記）
        const formatAMPM = (h, min) => {
          return `${h}:${String(min).padStart(2, '0')}`;
        };

        const timeStr = `${formatAMPM(startHour, startMin)} - ${formatAMPM(endHour, endMin)}`;
        const duration = ((endHour * 60) + endMin) - ((startHour * 60) + startMin);
        const safeDuration = duration > 0 ? duration : 60; // 最小60分

        const previewEvent = {
          id: `temp-preview-event`,
          title: title.trim() || '(タイトルなし)',
          room: location || '',
          time: timeStr,
          startHour,
          startMin,
          duration: safeDuration,
          color: type === 'task' ? 'green' : type === 'schedule' ? 'cyan' : 'blue',
          stripe: true, // 斜めのストライプ柄！
          isCustom: false,
          isTempPreview: true
        };

        matchedCustomEvents.push(previewEvent);
      }
    }
  }
  
  // 3. 毎週の固定繰り返しスケジュールをマージ
  let fixedEvents = [];
  if (dateObj && typeof dateObj.getDay === 'function') {
    const dayOfWeek = dateObj.getDay();
    const matchedFixed = (fixedSchedules || []).filter(fs => fs.dayOfWeek === dayOfWeek);
    
    fixedEvents = matchedFixed.map(fs => {
      const formatTime = (h, m) => {
        return `${h}:${String(m).padStart(2, '0')}`;
      };

      const timeStr = `${formatTime(fs.startHour, fs.startMin)} - ${formatTime(fs.endHour, fs.endMin)}`;
      const duration = ((fs.endHour * 60) + fs.endMin) - ((fs.startHour * 60) + fs.startMin);
      const safeDuration = duration > 0 ? duration : 60;

      return {
        id: fs.id,
        title: fs.title,
        room: fs.location || '',
        time: timeStr,
        startHour: fs.startHour,
        startMin: fs.startMin,
        duration: safeDuration,
        color: (() => {
          const cat = scheduleCategories.find(c => c.id === fs.type);
          return cat ? cat.color : 'blue';
        })(),
        isCustom: false, // カスタム（単発）ではなく固定
        isFixedSchedule: true // 固定繰り返し予定フラグ
      };
    });
  }
  
  return [...timetableEvents, ...matchedCustomEvents, ...fixedEvents];
};

// カラークラス生成ヘルパー
export const getColorClasses = (color, dashed, stripe, isDark) => {
  let base = '';
  let border = '';
  let text = '';
  let style = {};

  switch(color) {
    case 'blue':
      base = isDark ? 'bg-blue-500/20 hover:bg-blue-500/25' : 'bg-blue-50 hover:bg-blue-100/70';
      border = dashed ? 'border-dashed border-2 border-blue-400' : 'border border-blue-500/20';
      text = isDark ? 'text-blue-200' : 'text-blue-700';
      break;
    case 'cyan':
      base = isDark ? 'bg-cyan-500/20 hover:bg-cyan-500/25' : 'bg-cyan-50 hover:bg-cyan-100/70';
      border = dashed ? 'border-dashed border-2 border-cyan-400' : 'border border-cyan-500/20';
      text = isDark ? 'text-cyan-200' : 'text-cyan-700';
      break;
    case 'green':
      base = isDark ? 'bg-emerald-500/20 hover:bg-emerald-500/25' : 'bg-emerald-50 hover:bg-emerald-100/70';
      border = dashed ? 'border-dashed border-2 border-emerald-400' : 'border border-emerald-500/20';
      text = isDark ? 'text-emerald-200' : 'text-emerald-700';
      break;
    case 'yellow':
      base = isDark ? 'bg-amber-400/20 hover:bg-amber-400/25' : 'bg-amber-50 hover:bg-amber-100/70';
      border = dashed ? 'border-dashed border-2 border-amber-400' : 'border border-amber-500/20';
      text = isDark ? 'text-amber-200' : 'text-amber-800';
      break;
    case 'orange':
      base = isDark ? 'bg-orange-500/20 hover:bg-orange-500/25' : 'bg-orange-50 hover:bg-orange-100/70';
      border = dashed ? 'border-dashed border-2 border-orange-400' : 'border border-orange-500/20';
      text = isDark ? 'text-orange-200' : 'text-orange-700';
      break;
    case 'purple':
      base = isDark ? 'bg-purple-500/20 hover:bg-purple-500/25' : 'bg-purple-50 hover:bg-purple-100/70';
      border = dashed ? 'border-dashed border-2 border-purple-400' : 'border border-purple-500/20';
      text = isDark ? 'text-purple-200' : 'text-purple-700';
      break;
    case 'red':
      base = isDark ? 'bg-rose-500/25 hover:bg-rose-500/30' : 'bg-rose-50 hover:bg-rose-100/70';
      border = dashed ? 'border-dashed border-2 border-rose-400' : 'border border-rose-500/20';
      text = isDark ? 'text-rose-200' : 'text-rose-700';
      break;
    case 'gray':
      base = isDark ? 'bg-gray-500/20 hover:bg-gray-500/25' : 'bg-gray-50 hover:bg-gray-100/70';
      border = dashed ? 'border-dashed border-2 border-gray-400' : 'border border-gray-500/20';
      text = isDark ? 'text-gray-200' : 'text-gray-700';
      break;
    default:
      base = isDark ? 'bg-gray-500/20' : 'bg-gray-50';
      border = 'border border-gray-500/20';
      text = isDark ? 'text-gray-200' : 'text-gray-700';
  }

  if (stripe) {
    style = {
      backgroundImage: isDark
        ? 'repeating-linear-gradient(45deg, rgba(59,130,246,0.1), rgba(59,130,246,0.1) 10px, rgba(59,130,246,0.18) 10px, rgba(59,130,246,0.18) 20px)'
        : 'repeating-linear-gradient(45deg, rgba(59,130,246,0.03), rgba(59,130,246,0.03) 10px, rgba(59,130,246,0.08) 10px, rgba(59,130,246,0.08) 20px)'
    };
  }

  return { classes: `${base} ${border} ${text}`, style };
};

export const formatHour = (hour) => {
  return `${hour}:00`;
};

export const formatTimeText = (date) => {
  if (!date || !date.getHours) date = new Date();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

// ==============================================================
// 左カラムミニカレンダー日付生成
// ==============================================================
export const getMiniCalendarDays = (dateObj, currentDate) => {
  const safeDate = dateObj || new Date();
  const year = safeDate.getFullYear?.() ?? new Date().getFullYear();
  const month = safeDate.getMonth?.() ?? new Date().getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const numDaysInMonth = lastDayOfMonth.getDate();
  
  const lastDayOfPrevMonth = new Date(year, month, 0);
  const numDaysInPrevMonth = lastDayOfPrevMonth.getDate();
  
  const days = [];
  
  // 前月余白
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dVal = numDaysInPrevMonth - i;
    const d = new Date(year, month - 1, dVal);
    days.push({
      val: dVal,
      currentMonth: false,
      fullDate: d
    });
  }
  
  // 当月日付
  const nowReal = new Date();
  const safeCurrentDate = currentDate || new Date();
  for (let i = 1; i <= numDaysInMonth; i++) {
    const d = new Date(year, month, i);
    const isToday = i === nowReal.getDate() && 
                    month === nowReal.getMonth() && 
                    year === nowReal.getFullYear();
    const isSelected = typeof safeCurrentDate.getDate === 'function' &&
                       typeof safeCurrentDate.getMonth === 'function' &&
                       typeof safeCurrentDate.getFullYear === 'function' &&
                       i === safeCurrentDate.getDate() && 
                       month === safeCurrentDate.getMonth() && 
                       year === safeCurrentDate.getFullYear();
    days.push({
      val: i,
      currentMonth: true,
      isToday,
      isSelected,
      fullDate: d
    });
  }
  
  // 翌月余白
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      val: i,
      currentMonth: false,
      fullDate: d
    });
  }
  
  return days;
};

// ==============================================================
// 月ビュー日付生成
// ==============================================================
export const getMonthViewDays = (dateObj) => {
  const safeDate = dateObj || new Date();
  const year = safeDate.getFullYear?.() ?? new Date().getFullYear();
  const month = safeDate.getMonth?.() ?? new Date().getMonth();
  
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  
  const lastDay = new Date(year, month + 1, 0);
  const textNumDays = lastDay.getDate();
  
  const prevLastDay = new Date(year, month, 0);
  const numDaysPrev = prevLastDay.getDate();
  
  const days = [];
  
  // 前月余白
  for (let i = startDay - 1; i >= 0; i--) {
    const dVal = numDaysPrev - i;
    const d = new Date(year, month - 1, dVal);
    days.push({
      val: dVal,
      currentMonth: false,
      fullDate: d
    });
  }
  
  // 当月
  const nowReal = new Date();
  for (let i = 1; i <= textNumDays; i++) {
    const d = new Date(year, month, i);
    const isToday = i === nowReal.getDate() && 
                    month === nowReal.getMonth() && 
                    year === nowReal.getFullYear();
    days.push({
      val: i,
      currentMonth: true,
      isToday,
      fullDate: d
    });
  }
  
  // 翌月余白
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      val: i,
      currentMonth: false,
      fullDate: d
    });
  }
  
  return days;
};

// 年ビュー用ミニ月日付生成
export const getMiniMonthDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
};

// モバイル月ビュー用日付生成
export const getDaysForSingleMonth = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  
  // 先頭の空マス
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // 当月の日付オブジェクト
  const nowReal = new Date();
  for (let d = 1; d <= totalDays; d++) {
    const fullDate = new Date(year, month, d);
    const isToday = d === nowReal.getDate() && 
                    month === nowReal.getMonth() && 
                    year === nowReal.getFullYear();
    days.push({
      val: d,
      currentMonth: true,
      isToday,
      fullDate
    });
  }
  return days;
};

// 日付→週日配列
export const getWeekDaysForDate = (date) => {
  const currentDay = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - currentDay);
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    week.push(day);
  }
  return week;
};
