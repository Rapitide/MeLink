import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar as LucideCalendar, ChevronLeft, ChevronRight, 
  BookOpen, Clock, MapPin, HelpCircle, ArrowRight, Menu, X, Check, Eye, ChevronDown
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';

// 定数・ユーティリティのインポート
import { 
  ACADEMIC_EVENTS, TIME_OPTIONS, DEFAULT_CATEGORIES, COLOR_MAP 
} from './todoCalendarConstants';
import { 
  getTermForDate, getAcademicEventsForDate, getEventColor, getTimetableEventsForDate, 
  getWeekAcademicSlots, getEventsForDate, getColorClasses, formatHour, 
  formatTimeText, getMiniCalendarDays, getMonthViewDays, getMiniMonthDays, 
  getDaysForSingleMonth, getWeekDaysForDate 
} from './todoCalendarUtils';

// コンポーネントのインポート
import { MobileBannerModal, MobileCalendar } from './TodoMobileViews';
import { CalendarHeader, DayView, WeekView, MonthView } from './TodoDesktopViews';
import { MiniCalendar, FixedSchedulePanel, DetailView, EventForm } from './TodoSidebar';

export default function ToDoCalendarComponent({ isDark, timetableData, onLessonSelect, firestore, currentAccountId }) {
  const [activeLeftSidebar, setActiveLeftSidebar] = useState(false);
  const [activeRightSidebar, setActiveRightSidebar] = useState(false);

  const [scheduleCategories, setScheduleCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('twitter_clone_schedule_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');

  // タッチイベントの定義
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [swipeTriggered, setSwipeTriggered] = useState(false);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeTransition, setSwipeTransition] = useState('none');

  // モバイル「始める前に」モーダルの表示制御
  const [showMobileBanner, setShowMobileBanner] = useState(() => {
    try {
      const shown = localStorage.getItem('twitter_clone_mobile_banner_shown');
      return !shown;
    } catch (e) {
      return true;
    }
  });

  const handleAddCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    if (label.length > 8) {
      alert("カテゴリー名は8文字以内で入力してください。");
      return;
    }

    const isExist = scheduleCategories.some(c => c.label === label);
    if (isExist) {
      alert("すでに同じ名前のカテゴリーが存在します。");
      return;
    }

    const newId = `custom-cat-${Date.now()}`;
    const newCat = { id: newId, label, color: newCatColor };

    setScheduleCategories(prev => [...prev, newCat]);
    setNewCatLabel('');
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (catId) => {
    if (['parttime', 'circle', 'homework'].includes(catId)) return;
    if (confirm("このカテゴリーを削除しますか？登録済みの予定はデフォルト色になります。")) {
      setScheduleCategories(prev => prev.filter(c => c.id !== catId));
    }
  };

  const handleHideMobileBanner = () => {
    try {
      localStorage.setItem('twitter_clone_mobile_banner_shown', 'true');
    } catch (e) {}
    setShowMobileBanner(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem('twitter_clone_schedule_categories', JSON.stringify(scheduleCategories));
    } catch (e) {}
  }, [scheduleCategories]);

  // 現在表示しているカレンダーの日付（デフォルトは今日）
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // スクロール用参照
  const dayScrollRef = useRef(null);
  const weekScrollRef = useRef(null);

  // カスタム予定リストの初期化と取得
  const [customEvents, setCustomEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('twitter_clone_custom_events');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 毎週の固定スケジュールリストの初期化と取得
  const [fixedSchedules, setFixedSchedules] = useState(() => {
    try {
      const saved = localStorage.getItem('twitter_clone_fixed_schedules');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Firebase DBのリアルタイム同期
  useEffect(() => {
    if (!firestore || !currentAccountId) return;

    // 1. 通常（単発）カスタム予定の購読
    const customQuery = query(collection(firestore, `users/${currentAccountId}/todoEvents`));
    const unsubscribeCustom = onSnapshot(customQuery, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      setCustomEvents(events);
      try {
        localStorage.setItem('twitter_clone_custom_events', JSON.stringify(events));
      } catch (e) {}
    }, (err) => console.error("Firestore customEvents sync failed:", err));

    // 2. 固定繰り返しの購読
    const fixedQuery = query(collection(firestore, `users/${currentAccountId}/fixedSchedules`));
    const unsubscribeFixed = onSnapshot(fixedQuery, (snapshot) => {
      const schedules = [];
      snapshot.forEach((doc) => {
        schedules.push({ id: doc.id, ...doc.data() });
      });
      setFixedSchedules(schedules);
      try {
        localStorage.setItem('twitter_clone_fixed_schedules', JSON.stringify(schedules));
      } catch (e) {}
    }, (err) => console.error("Firestore fixedSchedules sync failed:", err));

    return () => {
      unsubscribeCustom();
      unsubscribeFixed();
    };
  }, [firestore, currentAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem('twitter_clone_fixed_schedules', JSON.stringify(fixedSchedules));
    } catch (e) {}
  }, [fixedSchedules]);

  useEffect(() => {
    try {
      localStorage.setItem('twitter_clone_custom_events', JSON.stringify(customEvents));
    } catch (e) {}
  }, [customEvents]);

  // 固定予定登録用の入力ステート
  const [newFixedState, setNewFixedState] = useState({
    title: '',
    location: '',
    type: 'parttime',
    dayOfWeek: 1, // 月曜
    startHour: 9,
    startMin: 0,
    endHour: 10,
    endMin: 30
  });

  const handleAddFixedSchedule = () => {
    const title = newFixedState.title.trim() || '固定予定';
    const { location, type, dayOfWeek, startHour, startMin, endHour, endMin } = newFixedState;

    if ((startHour * 60 + startMin) >= (endHour * 60 + endMin)) {
      alert("終了時間は開始時間より後に設定してください。");
      return;
    }

    const newSchedule = {
      id: `fixed-${Date.now()}`,
      title,
      location,
      type,
      dayOfWeek,
      startHour,
      startMin,
      endHour,
      endMin
    };

    setFixedSchedules(prev => [...prev, newSchedule]);
    setNewFixedState({
      title: '',
      location: '',
      type: 'parttime',
      dayOfWeek: 1,
      startHour: 9,
      startMin: 0,
      endHour: 10,
      endMin: 30
    });

    if (firestore && currentAccountId) {
      setDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${newSchedule.id}`), newSchedule)
        .catch(err => console.error("Failed to add fixed schedule:", err));
    }
  };

  const handleDeleteFixedSchedule = (id) => {
    if (confirm("この固定スケジュールを削除しますか？")) {
      setFixedSchedules(prev => prev.filter(fs => fs.id !== id));
      if (firestore && currentAccountId) {
        deleteDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${id}`))
          .catch(err => console.error("Failed to delete fixed schedule:", err));
      }
    }
  };

  // 予定作成/編集モーダルの入力ステート
  const [addModalState, setAddModalState] = useState({
    isOpen: false,
    dateObj: null,
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
    isPreviewActive: false, // リアルタイム仮表示プレビューフラグ
    isFixedSchedule: false, // 編集対象が毎週の固定スケジュールであるか
    editingFixedScheduleId: null,
    dayOfWeek: 1,
    isDetailView: false, // 予定をクリックしたときの詳細ビュー切り替え用フラグ
    isLesson: false, // クリックした対象が時間割の「授業」であるか
    lessonObj: null
  });

  const [activeTimePicker, setActiveTimePicker] = useState(null);

  const resetFormState = () => {
    setAddModalState({
      isOpen: false,
      dateObj: null,
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
      isPreviewActive: false,
      isFixedSchedule: false,
      editingFixedScheduleId: null,
      dayOfWeek: 1,
      isDetailView: false,
      isLesson: false,
      lessonObj: null
    });
    setActiveTimePicker(null);
  };

  const handleGridClick = (e, dateObj, clickedHour) => {
    if (e.target !== e.currentTarget) return;

    let startHour = 9;
    let startMin = 0;

    if (clickedHour !== undefined) {
      // モバイル版のように、特定の時間セル（clickedHour）が指定されている場合
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top; // 0 ~ 60
      // 30分単位でスナップ
      const startMinCalculated = clickY >= 30 ? 30 : 0;
      startHour = clickedHour;
      startMin = startMinCalculated;
    } else {
      // デスクトップ版のように、24時間全体コンテナの場合
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clickMinTotal = Math.floor(clickY);

      const nearest30Min = Math.round(clickMinTotal / 30) * 30;
      startHour = Math.floor(nearest30Min / 60);
      startMin = nearest30Min % 60;
    }

    let endHour = startHour + 1;
    let endMin = startMin;
    if (endHour >= 24) {
      endHour = 23;
      endMin = 55;
    }

    setAddModalState({
      isOpen: true,
      dateObj: new Date(dateObj),
      startHour,
      startMin,
      endHour,
      endMin,
      title: '',
      type: 'parttime',
      location: '',
      description: '',
      guest: '',
      hasMeet: false,
      isAllDay: false,
      isEdit: false,
      editingEventId: null,
      isPreviewActive: true, // グリッドクリックでプレビュー発火！
      isFixedSchedule: false,
      editingFixedScheduleId: null,
      dayOfWeek: 1,
      isDetailView: false,
      isLesson: false,
      lessonObj: null
    });
    setActiveRightSidebar(true);
  };

  const handleSaveEvent = () => {
    const title = addModalState.title.trim() || '無題の予定';
    const { 
      dateObj, startHour, startMin, endHour, endMin, type, location, description, 
      guest, hasMeet, isAllDay, isEdit, editingEventId, isFixedSchedule, editingFixedScheduleId, dayOfWeek
    } = addModalState;

    if (!isAllDay && !isFixedSchedule && ((startHour * 60 + startMin) >= (endHour * 60 + endMin))) {
      alert("終了時間は開始時間より後に設定してください。");
      return;
    }

    if (isFixedSchedule) {
      const scheduleId = editingFixedScheduleId || `fixed-${Date.now()}`;
      const scheduleData = {
        id: scheduleId,
        title,
        location,
        type,
        dayOfWeek,
        startHour,
        startMin,
        endHour,
        endMin
      };

      setFixedSchedules(prev => {
        const filtered = prev.filter(ev => ev.id !== scheduleId);
        return [...filtered, scheduleData];
      });

      if (firestore && currentAccountId) {
        setDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${scheduleId}`), scheduleData)
          .catch(err => console.error("Failed to save fixed schedule:", err));
      }
    } else {
      const y = dateObj.getFullYear();
      const m = dateObj.getMonth() + 1;
      const d = dateObj.getDate();
      const fullDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const eventId = editingEventId || `event-${Date.now()}`;
      const duration = isAllDay ? 1440 : ((endHour * 60) + endMin) - ((startHour * 60) + startMin);
      const safeDuration = duration > 0 ? duration : 60;

      const eventData = {
        id: eventId,
        title,
        fullDate,
        startHour: isAllDay ? 0 : startHour,
        startMin: isAllDay ? 0 : startMin,
        duration: safeDuration,
        type,
        location,
        description,
        guest,
        hasMeet,
        isAllDay
      };

      setCustomEvents(prev => {
        const filtered = prev.filter(ev => ev.id !== eventId);
        return [...filtered, eventData];
      });

      if (firestore && currentAccountId) {
        setDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${eventId}`), eventData)
          .catch(err => console.error("Failed to save event:", err));
      }
    }

    resetFormState();
    setActiveRightSidebar(false);
  };

  const handleAllDayGridClick = (e, dateObj) => {
    if (e.target !== e.currentTarget) return;

    setAddModalState({
      isOpen: true,
      dateObj: new Date(dateObj),
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
      isAllDay: true,
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
  };

  const handleEventClick = (event) => {
    if (event.isLesson) {
      const idParts = event.id.split('-');
      const period = event.period || idParts[2] || "1";
      const dayKey = idParts[3] || "月";
      const termKey = idParts[1] || "第1ターム";

      const currentTimetables = timetableData || (() => {
        try {
          return JSON.parse(localStorage.getItem('twitter_clone_timetables')) || {};
        } catch (e) {
          return {};
        }
      })();

      const termTimetable = currentTimetables[termKey] || {};
      const lesson = termTimetable[period]?.[dayKey] || {
        name: event.title,
        room: event.room || '教室未設定',
        period: period,
        day: dayKey,
        teacher: '',
        credit: '',
        code: ''
      };

      const dateObj = event.date || new Date();

      setAddModalState({
        isOpen: true,
        dateObj,
        startHour: event.startHour,
        startMin: event.startMin,
        endHour: Math.floor((event.startHour * 60 + event.startMin + event.duration) / 60),
        endMin: (event.startHour * 60 + event.startMin + event.duration) % 60,
        title: event.title,
        type: 'lesson',
        location: event.room || '教室未設定',
        description: lesson.teacher ? `担当教員: ${lesson.teacher}${lesson.credit ? ` (${lesson.credit}単位)` : ''}${lesson.code ? `\n科目コード: ${lesson.code}` : ''}` : '',
        guest: '',
        hasMeet: false,
        isAllDay: false,
        isEdit: false,
        editingEventId: null,
        isPreviewActive: false,
        isFixedSchedule: false,
        editingFixedScheduleId: null,
        dayOfWeek: 1,
        isDetailView: true,
        isLesson: true,
        lessonObj: {
          ...lesson,
          term: termKey
        }
      });
      setActiveRightSidebar(true);
      return;
    }

    if (event.isFixedSchedule) {
      const fs = fixedSchedules.find(e => e.id === event.id);
      if (fs) {
        setAddModalState({
          isOpen: true,
          dateObj: event.date || new Date(),
          startHour: fs.startHour,
          startMin: fs.startMin,
          endHour: fs.endHour,
          endMin: fs.endMin,
          title: fs.title,
          type: fs.type,
          location: fs.location || '',
          description: '',
          guest: '',
          hasMeet: false,
          isAllDay: false,
          isEdit: true,
          editingEventId: null,
          isPreviewActive: false,
          isFixedSchedule: true,
          editingFixedScheduleId: fs.id,
          dayOfWeek: fs.dayOfWeek,
          isDetailView: true,
          isLesson: false,
          lessonObj: null
        });
        setActiveRightSidebar(true);
      }
      return;
    }

    if (event.isCustom || (!event.isLesson && !event.isFixedSchedule)) {
      const ev = customEvents.find(e => e.id === event.id);
      if (ev) {
        const [year, month, day] = ev.fullDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        setAddModalState({
          isOpen: true,
          dateObj,
          startHour: ev.startHour,
          startMin: ev.startMin,
          endHour: Math.floor((ev.startHour * 60 + ev.startMin + ev.duration) / 60),
          endMin: (ev.startHour * 60 + ev.startMin + ev.duration) % 60,
          title: ev.title,
          type: ev.type,
          location: ev.location || '',
          description: ev.description || '',
          guest: ev.guest || '',
          hasMeet: ev.hasMeet || false,
          isAllDay: ev.isAllDay || false,
          isEdit: true,
          editingEventId: ev.id,
          isPreviewActive: true,
          isFixedSchedule: false,
          editingFixedScheduleId: null,
          dayOfWeek: 1,
          isDetailView: true,
          isLesson: false,
          lessonObj: null
        });
        setActiveRightSidebar(true);
      }
    }
  };

  const handleDeleteEvent = (id, isFixed) => {
    const targetId = id || addModalState.editingEventId || addModalState.editingFixedScheduleId;
    const targetIsFixed = isFixed !== undefined ? isFixed : addModalState.isFixedSchedule;
    const title = addModalState.title;

    if (targetIsFixed && targetId) {
      if (confirm(`固定繰り返し予定「${title}」を削除しますか？`)) {
        setFixedSchedules(prev => prev.filter(ev => ev.id !== targetId));
        resetFormState();
        setActiveRightSidebar(false);
        if (firestore && currentAccountId) {
          deleteDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${targetId}`))
            .catch(err => console.error("Failed to delete fixed schedule:", err));
        }
      }
      return;
    }

    if (targetId) {
      if (confirm(`予定「${title}」を削除しますか？`)) {
        setCustomEvents(prev => prev.filter(ev => ev.id !== targetId));
        resetFormState();
        setActiveRightSidebar(false);
        if (firestore && currentAccountId) {
          deleteDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${targetId}`))
            .catch(err => console.error("Failed to delete custom event:", err));
        }
      }
    }
  };

  const handleStartTimeSelect = (hour, min) => {
    setAddModalState(prev => {
      let newEndHour = hour + 1;
      let newEndMin = min;
      if (newEndHour >= 24) {
        newEndHour = 23;
        newEndMin = 55;
      }
      return {
        ...prev,
        startHour: hour,
        startMin: min,
        endHour: newEndHour,
        endMin: newEndMin
      };
    });
    setActiveTimePicker(null);
  };

  const handleEndTimeSelect = (hour, min) => {
    setAddModalState(prev => {
      const startTotal = prev.startHour * 60 + prev.startMin;
      const endTotal = hour * 60 + min;
      if (endTotal <= startTotal) {
        let newStartHour = hour - 1;
        let newStartMin = min;
        if (newStartHour < 0) {
          newStartHour = 0;
          newStartMin = 0;
        }
        return {
          ...prev,
          startHour: newStartHour,
          startMin: newStartMin,
          endHour: hour,
          endMin: min
        };
      }
      return {
        ...prev,
        endHour: hour,
        endMin: min
      };
    });
    setActiveTimePicker(null);
  };
  
  // ミニカレンダー日付ステート
  const [miniCalDate, setMiniCalDate] = useState(() => new Date());

  // ビューモードステート: 'day' | 'week' | 'month'
  const [viewMode, setViewMode] = useState('week');
  
  // モバイル画面判定
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileViewMode, setMobileViewMode] = useState('year'); // 'year' | 'month' | 'day'
  
  const mobileDayScrollRef = useRef(null);
  const mobileMonthScrollRef = useRef(null);
  const mobileDayContainerRef = useRef(null);

  // モバイル用無限スクロール表示月リスト
  const [renderedMonths, setRenderedMonths] = useState([
    { year: 2026, month: 3 }, // 4月
    { year: 2026, month: 4 }, // 5月
    { year: 2026, month: 5 }, // 6月
    { year: 2026, month: 6 }, // 7月
    { year: 2026, month: 7 }  // 8月
  ]);

  const [currentDisplayYear, setCurrentDisplayYear] = useState(() => new Date().getFullYear());
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(() => new Date().getMonth());

  const handleMobileMonthScroll = (e) => {
    const container = e.currentTarget;

    // 1. 下スクロール無限追加
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 300) {
      setRenderedMonths(prev => {
        const lastMonthObj = prev[prev.length - 1];
        if (lastMonthObj.year === 2027 && lastMonthObj.month === 2) {
          return prev;
        }
        
        let nextYear = lastMonthObj.year;
        let nextMonth = lastMonthObj.month + 1;
        if (nextMonth > 11) {
          nextYear += 1;
          nextMonth = 0;
        }
        
        const exists = prev.some(m => m.year === nextYear && m.month === nextMonth);
        if (exists) return prev;
        
        return [...prev, { year: nextYear, month: nextMonth }];
      });
    }

    // 2. 現在最も上部に位置している月の検出
    let activeYear = 2026;
    let activeMonth = 4;
    let minDiff = Infinity;

    renderedMonths.forEach(({ year: y, month: m }) => {
      const el = document.getElementById(`month-${y}-${m}`);
      if (el) {
        const diff = Math.abs(el.offsetTop - container.scrollTop);
        if (diff < minDiff) {
          minDiff = diff;
          activeYear = y;
          activeMonth = m;
        }
      }
    });

    setCurrentDisplayYear(activeYear);
    setCurrentDisplayMonth(activeMonth);
  };

  useEffect(() => {
    if (isMobile && mobileViewMode === 'month') {
      const timer = setTimeout(() => {
        const todayVal = new Date();
        setCurrentDisplayYear(todayVal.getFullYear());
        setCurrentDisplayMonth(todayVal.getMonth());

        const elementId = `month-${todayVal.getFullYear()}-${todayVal.getMonth()}`;
        const element = document.getElementById(elementId);
        if (element && mobileMonthScrollRef.current) {
          const container = mobileMonthScrollRef.current;
          container.scrollTop = element.offsetTop;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mobileViewMode, isMobile]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const jumpToMonthOnMobile = (year, month) => {
    const newMonths = [];
    for (let i = -2; i <= 2; i++) {
      let targetYear = year;
      let targetMonth = month + i;
      if (targetMonth < 0) {
        targetYear -= 1;
        targetMonth += 12;
      } else if (targetMonth > 11) {
        targetYear += 1;
        targetMonth -= 12;
      }
      
      const isWithinAcademicYear = (targetYear === 2026 && targetMonth >= 3) || 
                                   (targetYear === 2027 && targetMonth <= 2);
      
      if (isWithinAcademicYear) {
        newMonths.push({ year: targetYear, month: targetMonth });
      }
    }
    
    newMonths.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
    
    setRenderedMonths(newMonths);
    setCurrentDisplayYear(year);
    setCurrentDisplayMonth(month);
    
    setTimeout(() => {
      const elementId = `month-${year}-${month}`;
      const element = document.getElementById(elementId);
      if (element && mobileMonthScrollRef.current) {
        const container = mobileMonthScrollRef.current;
        container.scrollTop = element.offsetTop;
      }
    }, 100);
  };

  useEffect(() => {
    if (isMobile && mobileViewMode === 'day' && mobileDayScrollRef.current) {
      const timer = setTimeout(() => {
        if (mobileDayScrollRef.current) {
          mobileDayScrollRef.current.scrollTop = 480;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mobileViewMode, isMobile, currentDate]);
  
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  // リアルタイムクロック更新
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // ビュー切替時のスクロール自動位置リセット
  useEffect(() => {
    const targetScrollTop = 480;
    const scrollContainer = () => {
      if (viewMode === 'day' && dayScrollRef.current) {
        dayScrollRef.current.scrollTop = targetScrollTop;
      } else if (viewMode === 'week' && weekScrollRef.current) {
        weekScrollRef.current.scrollTop = targetScrollTop;
      }
    };
    const rafId = requestAnimationFrame(scrollContainer);
    return () => cancelAnimationFrame(rafId);
  }, [viewMode]);

  // タイムピッカーの自動スクロール
  useEffect(() => {
    if (activeTimePicker) {
      const timer = setTimeout(() => {
        const container = document.querySelector('.time-picker-options-container');
        if (container) {
          const activeBtn = container.querySelector('.bg-blue-500');
          if (activeBtn) {
            const containerHeight = container.clientHeight;
            const btnTop = activeBtn.offsetTop;
            const btnHeight = activeBtn.clientHeight;
            container.scrollTop = btnTop - (containerHeight / 2) + (btnHeight / 2);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTimePicker, addModalState.startHour, addModalState.startMin, addModalState.endHour, addModalState.endMin]);

  const today = currentTime || new Date();

  // 表示基準日・週・月カレンダー派生計算
  const currentDayOfWeek = currentDate?.getDay?.() ?? new Date().getDay();
  const offsetToSunday = -currentDayOfWeek;
  const sundayDate = new Date(currentDate || new Date());
  sundayDate.setDate((currentDate?.getDate?.() ?? new Date().getDate()) + offsetToSunday);

  const weekDays = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(sundayDate);
    d.setDate(sundayDate.getDate() + idx);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const isToday = d.getDate() === today.getDate() && 
                    d.getMonth() === today.getMonth() && 
                    d.getFullYear() === today.getFullYear();
    const isSelected = d.getDate() === (currentDate?.getDate?.() ?? new Date().getDate()) && 
                       d.getMonth() === (currentDate?.getMonth?.() ?? new Date().getMonth()) && 
                       d.getFullYear() === (currentDate?.getFullYear?.() ?? new Date().getFullYear());
    
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      name: dayNames[idx],
      num: d.getDate(),
      key: dateStr,
      isToday,
      isSelected,
      fullDate: d
    };
  });

  const dayViewDay = (() => {
    const dayNamesShort = ['日', '月', '火', '水', '木', '金', '土'];
    const safeDate = currentDate && typeof currentDate.getDate === 'function' ? currentDate : new Date();
    const isToday = typeof safeDate.getDate === 'function' && 
                    safeDate.getDate() === today.getDate() && 
                    safeDate.getMonth() === today.getMonth() && 
                    safeDate.getFullYear() === today.getFullYear();
    const nameIndex = typeof safeDate.getDay === 'function' ? safeDate.getDay() : 0;
    const dayNum = typeof safeDate.getDate === 'function' ? safeDate.getDate() : 1;
    const dayMonth = typeof safeDate.getMonth === 'function' ? safeDate.getMonth() : 0;
    return {
      name: dayNamesShort[nameIndex] || 'Sun',
      num: dayNum,
      key: `${dayMonth + 1}/${dayNum}`,
      isToday,
      isSelected: true,
      fullDate: safeDate
    };
  })();

  const weekKeys = weekDays.map(d => d.key) || [];

  // リアルタイム時間軸の安全計算
  const currentHour = today?.getHours?.() ?? new Date().getHours();
  const currentMin = today?.getMinutes?.() ?? new Date().getMinutes();
  const topPx = (currentHour * 60) + currentMin;
  const timeText = formatTimeText(today);

  const miniCalendarDays = getMiniCalendarDays(miniCalDate || new Date(), currentDate);

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月", 
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];
  
  const safeCurrentDate = currentDate || new Date();
  const currentMonthName = monthNames[safeCurrentDate.getMonth?.() ?? 0];
  const currentYear = safeCurrentDate.getFullYear?.() ?? new Date().getFullYear();
  const headerLabel = `${currentYear}年 ${currentMonthName}`;

  const safeMiniCalDate = miniCalDate || new Date();
  const miniCalLabel = `${safeMiniCalDate.getFullYear?.() ?? new Date().getFullYear()}年 ${monthNames[safeMiniCalDate.getMonth?.() ?? 0]}`;

  // カレンダーナビゲーション
  const handleNavigatePeriod = (direction) => {
    const amount = direction === 'next' ? 1 : -1;
    const safeDateObj = currentDate || new Date();
    const newDate = new Date(safeDateObj);
    
    if (viewMode === 'day') {
      newDate.setDate(safeDateObj.getDate() + amount);
    } else if (viewMode === 'week') {
      newDate.setDate(safeDateObj.getDate() + (amount * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(safeDateObj.getMonth() + amount);
    }
    
    setCurrentDate(newDate);
    setMiniCalDate(newDate);
  };

  // タッチスワイプ
  const onTouchStart = (e) => {
    if (e.targetTouches.length === 1) {
      setTouchStartX(e.targetTouches[0].clientX);
      setTouchStartY(e.targetTouches[0].clientY);
      setSwipeOffsetX(0);
      setIsSwiping(true);
      setSwipeTriggered(false);
      setSwipeDirection(null);
      setSwipeTransition('none');
    }
  };

  const onTouchMove = (e) => {
    if (!isSwiping || e.targetTouches.length !== 1 || touchStartX === null || touchStartY === null) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    let currentDir = swipeDirection;

    if (!currentDir) {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      if (absX > 5 || absY > 5) {
        if (absX > absY) {
          currentDir = 'horizontal';
          setSwipeDirection('horizontal');
        } else {
          currentDir = 'vertical';
          setSwipeDirection('vertical');
        }
      }
    }

    if (currentDir === 'horizontal') {
      if (e.cancelable) {
        e.preventDefault();
      }
      setSwipeOffsetX(diffX * 0.95);
    }
  };

  const onTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    setSwipeDirection(null);

    const threshold = 70;
    const safeDateObj = currentDate || new Date();
    const width = window.innerWidth;

    if (swipeOffsetX < -threshold) {
      if (isMobile && mobileViewMode === 'day') {
        setSwipeTransition('transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)');
        setSwipeOffsetX(-width);

        setTimeout(() => {
          const newDate = new Date(safeDateObj);
          newDate.setDate(safeDateObj.getDate() + 1);
          
          setSwipeTransition('none');
          setSwipeOffsetX(width);
          setCurrentDate(newDate);
          setMiniCalDate(newDate);

          setTimeout(() => {
            setSwipeTransition('transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)');
            setSwipeOffsetX(0);
          }, 30);
        }, 250);
      } else if (viewMode !== 'week') {
        handleNavigatePeriod('next');
        setSwipeOffsetX(0);
      } else {
        setSwipeOffsetX(0);
      }
    } else if (swipeOffsetX > threshold) {
      if (isMobile && mobileViewMode === 'day') {
        setSwipeTransition('transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)');
        setSwipeOffsetX(width);

        setTimeout(() => {
          const newDate = new Date(safeDateObj);
          newDate.setDate(safeDateObj.getDate() - 1);
          
          setSwipeTransition('none');
          setSwipeOffsetX(-width);
          setCurrentDate(newDate);
          setMiniCalDate(newDate);

          setTimeout(() => {
            setSwipeTransition('transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)');
            setSwipeOffsetX(0);
          }, 30);
        }, 250);
      } else if (viewMode !== 'week') {
        handleNavigatePeriod('prev');
        setSwipeOffsetX(0);
      } else {
        setSwipeOffsetX(0);
      }
    } else {
      setSwipeTransition('transform 0.2s ease-out');
      setSwipeOffsetX(0);
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  const onTouchMoveRef = useRef(null);
  onTouchMoveRef.current = onTouchMove;

  useEffect(() => {
    const container = mobileDayContainerRef.current;
    if (!container) return;

    const handleTouchMove = (e) => {
      if (onTouchMoveRef.current) {
        onTouchMoveRef.current(e);
      }
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [mobileViewMode, isMobile]);

  const handleNavigateMiniCalendar = (direction) => {
    const amount = direction === 'next' ? 1 : -1;
    const safeMiniDate = miniCalDate || new Date();
    const newMiniDate = new Date(safeMiniDate);
    newMiniDate.setMonth(safeMiniDate.getMonth() + amount);
    setMiniCalDate(newMiniDate);
  };

  const handleJumpToToday = () => {
    const realToday = new Date();
    setCurrentDate(realToday);
    setMiniCalDate(realToday);
  };

  const handleSelectDateFromMiniCalendar = (dateObj) => {
    if (!dateObj || typeof dateObj.getTime !== 'function') return;
    setCurrentDate(dateObj);
    setMiniCalDate(dateObj);
  };

  const monthViewDays = getMonthViewDays(currentDate || new Date());

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // モバイル画面（isMobile）時のリターン分岐
  if (isMobile) {
    return (
      <div className={`flex flex-col h-[calc(100vh-60px)] lg:h-screen w-full overflow-hidden ${
        isDark ? 'bg-black text-gray-100 border-gray-800' : 'bg-white text-gray-800 border-gray-200'
      }`}>
        {/* モバイル版カレンダー */}
        <MobileCalendar 
          isDark={isDark}
          mobileViewMode={mobileViewMode}
          setShowMobileBanner={setShowMobileBanner}
          setCurrentDate={setCurrentDate}
          jumpToMonthOnMobile={jumpToMonthOnMobile}
          setMobileViewMode={setMobileViewMode}
          setActiveLeftSidebar={setActiveLeftSidebar}
          currentDisplayMonth={currentDisplayMonth}
          currentDisplayYear={currentDisplayYear}
          mobileMonthScrollRef={mobileMonthScrollRef}
          handleMobileMonthScroll={handleMobileMonthScroll}
          renderedMonths={renderedMonths}
          currentDate={currentDate}
          setMiniCalDate={setMiniCalDate}
          timetableData={timetableData}
          customEvents={customEvents}
          fixedSchedules={fixedSchedules}
          addModalState={addModalState}
          scheduleCategories={scheduleCategories}
          setAddModalState={setAddModalState}
          setActiveRightSidebar={setActiveRightSidebar}
          swipeOffsetX={swipeOffsetX}
          swipeTransition={swipeTransition}
          mobileDayContainerRef={mobileDayContainerRef}
          mobileDayScrollRef={mobileDayScrollRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          handleGridClick={handleGridClick}
          handleEventClick={handleEventClick}
        />

        {/* 右サイドバー (モバイル用ボトムシート) */}
        {activeRightSidebar && (
          <>
            <div 
              onClick={() => {
                setActiveRightSidebar(false);
                resetFormState();
              }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            />
            <aside className={`
              fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md max-h-[80vh] border rounded-[28px] shadow-2xl p-6 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] animate-[scaleUp_0.2s_ease-out]
              ${isDark ? 'bg-black/95 backdrop-blur-xl border-gray-800' : 'bg-white/95 backdrop-blur-xl border-gray-200'}
            `}>
              <div className="flex justify-between items-center mb-4 shrink-0">
                <span className="text-xs font-bold text-gray-500">
                  {addModalState.isDetailView 
                    ? (addModalState.isLesson ? '授業の詳細' : '予定の詳細')
                    : (addModalState.isEdit ? '予定の編集' : '予定の追加')}
                </span>
                <button onClick={() => { setActiveRightSidebar(false); resetFormState(); }} className="p-1 rounded hover:bg-gray-500/10">
                  <X size={18} />
                </button>
              </div>

              {addModalState.isDetailView ? (
                <DetailView 
                  isDark={isDark}
                  addModalState={addModalState}
                  setAddModalState={setAddModalState}
                  scheduleCategories={scheduleCategories}
                  currentDate={currentDate}
                  onLessonSelect={onLessonSelect}
                  handleDeleteEvent={handleDeleteEvent}
                  setActiveRightSidebar={setActiveRightSidebar}
                />
              ) : (
                <EventForm 
                  isDark={isDark}
                  addModalState={addModalState}
                  setAddModalState={setAddModalState}
                  scheduleCategories={scheduleCategories}
                  isAddingCategory={isAddingCategory}
                  setIsAddingCategory={setIsAddingCategory}
                  newCatLabel={newCatLabel}
                  setNewCatLabel={setNewCatLabel}
                  newCatColor={newCatColor}
                  setNewCatColor={setNewCatColor}
                  handleAddCategory={handleAddCategory}
                  handleDeleteCategory={handleDeleteCategory}
                  activeTimePicker={activeTimePicker}
                  setActiveTimePicker={setActiveTimePicker}
                  handleStartTimeSelect={handleStartTimeSelect}
                  handleEndTimeSelect={handleEndTimeSelect}
                  handleSaveEvent={handleSaveEvent}
                  handleDeleteEvent={handleDeleteEvent}
                  resetFormState={resetFormState}
                />
              )}
            </aside>
          </>
        )}

        {/* 左サイドバー (モバイル用固定予定管理パネル) */}
        {activeLeftSidebar && (
          <>
            <div 
              onClick={() => setActiveLeftSidebar(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            />
            <aside className={`
              fixed top-0 bottom-0 left-0 z-50 w-64 border-r p-4 flex flex-col overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              ${isDark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-950'}
            `}>
              <div className="flex justify-end mb-2">
                <button onClick={() => setActiveLeftSidebar(false)} className="p-1 rounded hover:bg-gray-500/10">
                  <X size={18} />
                </button>
              </div>
              
              <FixedSchedulePanel 
                isDark={isDark}
                scheduleCategories={scheduleCategories}
                newFixedState={newFixedState}
                setNewFixedState={setNewFixedState}
                handleAddFixedSchedule={handleAddFixedSchedule}
                fixedSchedules={fixedSchedules}
                handleEventClick={handleEventClick}
                handleDeleteFixedSchedule={handleDeleteFixedSchedule}
              />
            </aside>
          </>
        )}

        {/* モバイル使い方ガイド */}
        <MobileBannerModal 
          showMobileBanner={showMobileBanner}
          handleHideMobileBanner={handleHideMobileBanner}
          isDark={isDark}
          isMobile={isMobile}
        />
      </div>
    );
  }

  // デスクトップ画面時のリターン
  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden ${
      isDark ? 'bg-black text-gray-100 border-gray-800' : 'bg-white text-gray-800 border-gray-200'
    }`}>
      
      {/* デスクトップヘッダー */}
      <CalendarHeader 
        isDark={isDark}
        handleJumpToToday={handleJumpToToday}
        handleNavigatePeriod={handleNavigatePeriod}
        headerLabel={headerLabel}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isViewDropdownOpen={isViewDropdownOpen}
        setIsViewDropdownOpen={setIsViewDropdownOpen}
        setAddModalState={setAddModalState}
        setActiveRightSidebar={setActiveRightSidebar}
      />

      <MobileBannerModal 
        showMobileBanner={showMobileBanner}
        handleHideMobileBanner={handleHideMobileBanner}
        isDark={isDark}
        isMobile={isMobile}
      />

      <div className="flex-1 flex flex-row w-full overflow-hidden relative">
        
        {/* 1. 左カラム (Aside) */}
        <aside className={`
          absolute lg:relative z-40 lg:z-0 top-0 bottom-0 left-0 w-64 border-r p-4 shrink-0 flex flex-col overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${activeLeftSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}
        `}>
          <div className="lg:hidden flex justify-end mb-2">
            <button onClick={() => setActiveLeftSidebar(false)} className="p-1 rounded hover:bg-gray-500/10">
              <X size={18} />
            </button>
          </div>

          <MiniCalendar 
            isDark={isDark}
            miniCalLabel={miniCalLabel}
            handleNavigateMiniCalendar={handleNavigateMiniCalendar}
            miniCalendarDays={miniCalendarDays}
            handleSelectDateFromMiniCalendar={handleSelectDateFromMiniCalendar}
          />

          <FixedSchedulePanel 
            isDark={isDark}
            scheduleCategories={scheduleCategories}
            newFixedState={newFixedState}
            setNewFixedState={setNewFixedState}
            handleAddFixedSchedule={handleAddFixedSchedule}
            fixedSchedules={fixedSchedules}
            handleEventClick={handleEventClick}
            handleDeleteFixedSchedule={handleDeleteFixedSchedule}
          />
        </aside>

        {/* 左サイドバーオーバーレイ (タブレット・モバイル時) */}
        {activeLeftSidebar && (
          <div 
            onClick={() => setActiveLeftSidebar(false)}
            className="absolute inset-0 z-30 lg:hidden bg-black/50 backdrop-blur-sm"
          />
        )}

        {/* 2. 中央カラム (Main Calendar) */}
        <main 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex-1 flex flex-col h-full overflow-hidden"
        >
          {viewMode === 'day' && (
            <DayView 
              isDark={isDark}
              dayViewDay={dayViewDay}
              dayScrollRef={dayScrollRef}
              hours={hours}
              topPx={topPx}
              timeText={timeText}
              currentTime={currentTime}
              timetableData={timetableData}
              customEvents={customEvents}
              fixedSchedules={fixedSchedules}
              addModalState={addModalState}
              scheduleCategories={scheduleCategories}
              handleGridClick={handleGridClick}
              handleAllDayGridClick={handleAllDayGridClick}
              handleEventClick={handleEventClick}
              setCustomEvents={setCustomEvents}
              setFixedSchedules={setFixedSchedules}
              resetFormState={resetFormState}
              setActiveRightSidebar={setActiveRightSidebar}
              firestore={firestore}
              currentAccountId={currentAccountId}
              deleteDoc={deleteDoc}
              doc={doc}
            />
          )}

          {viewMode === 'week' && (
            <WeekView 
              isDark={isDark}
              weekScrollRef={weekScrollRef}
              weekDays={weekDays}
              setCurrentDate={setCurrentDate}
              setViewMode={setViewMode}
              topPx={topPx}
              timeText={timeText}
              currentTime={currentTime}
              weekKeys={weekKeys}
              hours={hours}
              timetableData={timetableData}
              customEvents={customEvents}
              fixedSchedules={fixedSchedules}
              addModalState={addModalState}
              scheduleCategories={scheduleCategories}
              handleGridClick={handleGridClick}
              handleAllDayGridClick={handleAllDayGridClick}
              handleEventClick={handleEventClick}
              setCustomEvents={setCustomEvents}
              setFixedSchedules={setFixedSchedules}
              resetFormState={resetFormState}
              setActiveRightSidebar={setActiveRightSidebar}
              firestore={firestore}
              currentAccountId={currentAccountId}
              deleteDoc={deleteDoc}
              doc={doc}
            />
          )}

          {viewMode === 'month' && (
            <MonthView 
              isDark={isDark}
              monthViewDays={monthViewDays}
              setCurrentDate={setCurrentDate}
              setViewMode={setViewMode}
              timetableData={timetableData}
              customEvents={customEvents}
              fixedSchedules={fixedSchedules}
              addModalState={addModalState}
              scheduleCategories={scheduleCategories}
            />
          )}
        </main>

        {/* 右サイドバーオーバーレイ */}
        {activeRightSidebar && (
          <div 
            onClick={() => setActiveRightSidebar(false)}
            className="fixed inset-0 z-30 xl:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
        )}

        {/* 3. 右カラム (Aside Sidebar Details/Form) */}
        <aside className={`
          fixed xl:relative z-40 xl:z-0
          top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md h-auto max-h-[80vh] border rounded-[28px] shadow-2xl p-6 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${activeRightSidebar 
            ? 'opacity-100 scale-100 pointer-events-auto' 
            : 'opacity-0 scale-95 pointer-events-none'
          }
          xl:top-0 xl:bottom-0 xl:left-auto xl:right-0 xl:h-full xl:w-64 xl:border-l xl:border-t-0 xl:rounded-none xl:shadow-none xl:translate-y-0 xl:translate-x-0 xl:opacity-100 xl:scale-100 xl:pointer-events-auto xl:p-6
          ${isDark ? 'bg-black/95 backdrop-blur-xl border-gray-800' : 'bg-white/95 backdrop-blur-xl border-gray-200'}
        `}>
          <div className="xl:hidden flex justify-between items-center mb-4 shrink-0">
            <span className="text-xs font-bold text-gray-500">
              {addModalState.isDetailView 
                ? (addModalState.isLesson ? '授業の詳細' : '予定の詳細')
                : (addModalState.isEdit ? '予定の編集' : '予定の追加')}
            </span>
            <button onClick={() => setActiveRightSidebar(false)} className="p-1 rounded hover:bg-gray-500/10">
              <X size={18} />
            </button>
          </div>

          {addModalState.isDetailView ? (
            <DetailView 
              isDark={isDark}
              addModalState={addModalState}
              setAddModalState={setAddModalState}
              scheduleCategories={scheduleCategories}
              currentDate={currentDate}
              onLessonSelect={onLessonSelect}
              handleDeleteEvent={handleDeleteEvent}
              setActiveRightSidebar={setActiveRightSidebar}
            />
          ) : (
            <EventForm 
              isDark={isDark}
              addModalState={addModalState}
              setAddModalState={setAddModalState}
              scheduleCategories={scheduleCategories}
              isAddingCategory={isAddingCategory}
              setIsAddingCategory={setIsAddingCategory}
              newCatLabel={newCatLabel}
              setNewCatLabel={setNewCatLabel}
              newCatColor={newCatColor}
              setNewCatColor={setNewCatColor}
              handleAddCategory={handleAddCategory}
              handleDeleteCategory={handleDeleteCategory}
              activeTimePicker={activeTimePicker}
              setActiveTimePicker={setActiveTimePicker}
              handleStartTimeSelect={handleStartTimeSelect}
              handleEndTimeSelect={handleEndTimeSelect}
              handleSaveEvent={handleSaveEvent}
              handleDeleteEvent={handleDeleteEvent}
              resetFormState={resetFormState}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
