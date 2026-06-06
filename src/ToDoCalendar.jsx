import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar as LucideCalendar, ChevronLeft, ChevronRight, 
  Search, CheckSquare, Activity, User, BookOpen, Clock, 
  MapPin, HelpCircle, Key, ArrowRight, Menu, X, Check, Eye, ChevronDown
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';

// 埼玉大学 2026年度学年歴データ
const ACADEMIC_EVENTS = [
  // 4月
  { start: '2026-04-03', end: '2026-04-03', title: '新入生ガイダンス(予定)', type: 'event' },
  { start: '2026-04-04', end: '2026-04-04', title: '学部・研究科入学式', type: 'event' },
  { start: '2026-04-09', end: '2026-04-09', title: '第1ターム受講開始', type: 'start' },
  { start: '2026-04-29', end: '2026-04-29', title: '昭和の日(授業日)', type: 'class' },

  // 5月
  { start: '2026-05-03', end: '2026-05-03', title: '憲法記念日', type: 'holiday' },
  { start: '2026-05-04', end: '2026-05-04', title: 'みどりの日', type: 'holiday' },
  { start: '2026-05-05', end: '2026-05-05', title: 'こどもの日', type: 'holiday' },
  { start: '2026-05-06', end: '2026-05-06', title: '振替休日', type: 'holiday' },
  { start: '2026-05-28', end: '2026-06-03', title: '第1ターム試験期間', type: 'exam' },

  // 6月
  { start: '2026-06-04', end: '2026-06-05', title: '補講', type: 'makeup' },
  { start: '2026-06-08', end: '2026-06-08', title: '第2ターム受講開始', type: 'start' },
  { start: '2026-06-22', end: '2026-06-22', title: '第1ターム成績開示', type: 'grade' },

  // 7月
  { start: '2026-07-20', end: '2026-07-20', title: '海の日', type: 'holiday' },
  { start: '2026-07-21', end: '2026-07-27', title: '第2ターム試験期間', type: 'exam' },
  { start: '2026-07-28', end: '2026-07-31', title: '補講', type: 'makeup' },

  // 8月
  { start: '2026-08-03', end: '2026-08-03', title: '補講', type: 'makeup' },
  { start: '2026-08-04', end: '2026-09-30', title: '夏季休業', type: 'vacation' },
  { start: '2026-08-10', end: '2026-08-10', title: '休日変更(振替休日)', type: 'holiday' },
  { start: '2026-08-11', end: '2026-08-11', title: '山の日', type: 'holiday' },
  { start: '2026-08-20', end: '2026-08-20', title: '第2ターム成績開示', type: 'grade' },
  { start: '2026-08-24', end: '2026-08-28', title: '夏期集中講義', type: 'intensive' },
  { start: '2026-08-31', end: '2026-09-04', title: '夏期集中講義', type: 'intensive' },

  // 9月
  { start: '2026-09-07', end: '2026-09-11', title: '夏期集中講義', type: 'intensive' },
  { start: '2026-09-18', end: '2026-09-18', title: '秋季学位授与式', type: 'event' },
  { start: '2026-09-21', end: '2026-09-21', title: '敬老の日', type: 'holiday' },
  { start: '2026-09-22', end: '2026-09-22', title: '国民の休日', type: 'holiday' },
  { start: '2026-09-23', end: '2026-09-23', title: '秋分の日', type: 'holiday' },

  // 10月
  { start: '2026-10-01', end: '2026-10-01', title: '第3ターム受講開始', type: 'start' },
  { start: '2026-10-01', end: '2026-10-01', title: '秋季入学式', type: 'event' },
  { start: '2026-10-12', end: '2026-10-12', title: 'スポーツの日', type: 'holiday' },
  { start: '2026-10-24', end: '2026-10-24', title: '計画停電', type: 'holiday' },

  // 11月
  { start: '2026-11-03', end: '2026-11-03', title: '文化の日', type: 'holiday' },
  { start: '2026-11-18', end: '2026-11-24', title: '第3ターム試験期間', type: 'exam' },
  { start: '2026-11-23', end: '2026-11-23', title: '勤労感謝の日(試験)', type: 'class' },
  { start: '2026-11-25', end: '2026-11-26', title: '補講', type: 'makeup' },
  { start: '2026-11-27', end: '2026-11-27', title: 'むつめ祭準備(休講)', type: 'holiday' },
  { start: '2026-11-28', end: '2026-11-30', title: 'むつめ祭', type: 'event' },
  { start: '2026-11-30', end: '2026-11-30', title: '休日変更(振替)', type: 'holiday' },

  // 12月
  { start: '2026-12-01', end: '2026-12-01', title: 'むつめ祭片付(休講)', type: 'holiday' },
  { start: '2026-12-02', end: '2026-12-02', title: '第4ターム受講開始', type: 'start' },
  { start: '2026-12-07', end: '2026-12-07', title: '第3ターム成績開示', type: 'grade' },
  { start: '2026-12-19', end: '2026-12-19', title: '計画停電(予備日)', type: 'holiday' },
  { start: '2026-12-26', end: '2027-01-03', title: '冬季休業', type: 'vacation' },

  // 1月
  { start: '2027-01-01', end: '2027-01-01', title: '元日', type: 'holiday' },
  { start: '2027-01-11', end: '2027-01-11', title: '成人の日', type: 'holiday' },
  { start: '2027-01-15', end: '2027-01-15', title: '共通テスト設営(休講)', type: 'holiday' },
  { start: '2027-01-26', end: '2027-02-01', title: '第4ターム試験期間', type: 'exam' },

  // 2月
  { start: '2027-02-02', end: '2027-02-02', title: 'TOEFL試験', type: 'event' },
  { start: '2027-02-03', end: '2027-02-05', title: '補講', type: 'makeup' },
  { start: '2027-02-08', end: '2027-02-09', title: '補講', type: 'makeup' },
  { start: '2027-02-10', end: '2027-03-31', title: '春季休業', type: 'vacation' },
  { start: '2027-02-11', end: '2027-02-11', title: '建国記念日', type: 'holiday' },
  { start: '2027-02-18', end: '2027-02-18', title: '第4ターム成績開示', type: 'grade' },
  { start: '2027-02-23', end: '2027-02-23', title: '天皇誕生日', type: 'holiday' },

  // 3月
  { start: '2027-03-20', end: '2027-03-20', title: '春分の日', type: 'holiday' },
  { start: '2027-03-22', end: '2027-03-22', title: '振替休日', type: 'holiday' },
  { start: '2027-03-25', end: '2027-03-25', title: '学部卒業式・研究科修了式', type: 'event' }
];

// 5分刻みの時間オプションリスト生成 (24時間 * 12 = 288スロット)
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 5) {
    TIME_OPTIONS.push({ hour: h, min: m });
  }
}

// システムデフォルトのカテゴリー
const DEFAULT_CATEGORIES = [
  { id: 'parttime', label: 'バイト', color: 'orange' },
  { id: 'circle', label: 'サークル', color: 'green' },
  { id: 'homework', label: '課題', color: 'red' },
  { id: 'other', label: 'その他', color: 'purple' }
];

// Tailwindパージ防止用のプレミアムカラーマッピング
const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    borderL: 'border-l-[3px] border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400',
    solidBg: 'bg-blue-600 hover:bg-blue-700',
    dotBg: 'bg-blue-500',
    borderF: 'border-blue-500/50 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    borderL: 'border-l-[3px] border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400',
    solidBg: 'bg-emerald-600 hover:bg-emerald-700',
    dotBg: 'bg-emerald-500',
    borderF: 'border-emerald-500/50 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
  },
  red: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500',
    borderL: 'border-l-[3px] border-l-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400',
    solidBg: 'bg-rose-600 hover:bg-rose-700',
    dotBg: 'bg-rose-500',
    borderF: 'border-rose-500/50 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
  },
  gray: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500',
    borderL: 'border-l-[3px] border-l-gray-500',
    text: 'text-gray-600 dark:text-gray-400',
    badge: 'bg-gray-500/10 border-gray-500 text-gray-600 dark:text-gray-400',
    solidBg: 'bg-gray-600 hover:bg-gray-700',
    dotBg: 'bg-gray-500',
    borderF: 'border-gray-500/50 dark:border-gray-500/30 text-gray-700 dark:text-gray-400'
  },
  yellow: {
    bg: 'bg-amber-400/10',
    border: 'border-amber-500',
    borderL: 'border-l-[3px] border-l-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-550/10 border-amber-550 text-amber-600 dark:text-amber-400',
    solidBg: 'bg-amber-500 hover:bg-amber-600',
    dotBg: 'bg-amber-500',
    borderF: 'border-amber-500/50 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    borderL: 'border-l-[3px] border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400',
    solidBg: 'bg-orange-600 hover:bg-orange-700',
    dotBg: 'bg-orange-500',
    borderF: 'border-orange-500/50 dark:border-orange-500/30 text-orange-700 dark:text-orange-400'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500',
    borderL: 'border-l-[3px] border-l-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400',
    solidBg: 'bg-purple-600 hover:bg-purple-700',
    dotBg: 'bg-purple-500',
    borderF: 'border-purple-500/50 dark:border-purple-500/30 text-purple-700 dark:text-purple-400'
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500',
    borderL: 'border-l-[3px] border-l-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400',
    solidBg: 'bg-cyan-600 hover:bg-cyan-700',
    dotBg: 'bg-cyan-500',
    borderF: 'border-cyan-500/50 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400'
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500',
    borderL: 'border-l-[3px] border-l-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400',
    solidBg: 'bg-pink-600 hover:bg-pink-700',
    dotBg: 'bg-pink-500',
    borderF: 'border-pink-500/50 dark:border-pink-500/30 text-pink-700 dark:text-pink-400'
  }
};

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

  useEffect(() => {
    localStorage.setItem('twitter_clone_schedule_categories', JSON.stringify(scheduleCategories));
  }, [scheduleCategories]);

  // 新規カテゴリ追加用のステート
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');

  // カテゴリ追加関数
  const handleAddCategory = () => {
    const label = newCatLabel.trim();
    if (!label) {
      alert('カテゴリー名を入力してください');
      return;
    }
    if (label.length > 8) {
      alert('カテゴリー名は8文字以内で入力してください');
      return;
    }
    if (scheduleCategories.some(cat => cat.label === label)) {
      alert('すでに同じ名前のカテゴリーが存在します');
      return;
    }

    const newCat = {
      id: `custom-cat-${Date.now()}`,
      label,
      color: newCatColor
    };

    setScheduleCategories(prev => [...prev, newCat]);
    setNewCatLabel('');
    setIsAddingCategory(false);

    // Firestore 同期
    if (firestore && currentAccountId) {
      setDoc(doc(firestore, `users/${currentAccountId}/scheduleCategories/${newCat.id}`), newCat)
        .catch(err => console.error("Failed to sync new category to Firestore:", err));
    }
  };

  // カテゴリ削除関数
  const handleDeleteCategory = (catId) => {
    if (['parttime', 'circle', 'homework'].includes(catId)) return; // デフォルトは削除不可

    const matched = scheduleCategories.find(cat => cat.id === catId);
    if (!matched) return;

    if (confirm(`カテゴリー「${matched.label}」を削除しますか？\n（このカテゴリーが割り当てられている予定の表示カラーはデフォルトに戻ります）`)) {
      setScheduleCategories(prev => prev.filter(cat => cat.id !== catId));

      // フォームの選択がこれだった場合はリセット
      if (addModalState.type === catId) {
        setAddModalState(prev => ({ ...prev, type: 'parttime' }));
      }
      if (newFixedState.type === catId) {
        setNewFixedState(prev => ({ ...prev, type: 'parttime' }));
      }

      // Firestore 同期
      if (firestore && currentAccountId) {
        deleteDoc(doc(firestore, `users/${currentAccountId}/scheduleCategories/${catId}`))
          .catch(err => console.error("Failed to delete category from Firestore:", err));
      }
    }
  };

  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [swipeTriggered, setSwipeTriggered] = useState(false);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeTransition, setSwipeTransition] = useState('none');


  const [showMobileBanner, setShowMobileBanner] = useState(() => {
    try {
      return localStorage.getItem('hide_mobile_calendar_banner') !== 'true';
    } catch (e) {
      return true;
    }
  });

  const handleHideMobileBanner = () => {
    setShowMobileBanner(false);
    try {
      localStorage.setItem('hide_mobile_calendar_banner', 'true');
    } catch (e) {}
  };

  // リアルタイム現在時刻のステート
  const [currentTime, setCurrentTime] = useState(() => new Date());
  
  // カレンダーの中心となる表示基準日 (デフォルトは今日)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const dayScrollRef = useRef(null);
  const weekScrollRef = useRef(null);

  // ユーザー自身が追加したカスタムイベントの管理
  const [customEvents, setCustomEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('twitter_clone_todo_events')) || [];
    } catch (e) {
      return [];
    }
  });

  // 毎週の固定繰り返しスケジュール（バイト/サークル/その他タスク）の管理
  const [fixedSchedules, setFixedSchedules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('twitter_clone_fixed_schedules')) || [];
    } catch (e) {
      return [];
    }
  });

  // Firebase Firestore から予定データ（カスタム予定・固定予定・カテゴリー）をリアルタイム購読・自動同期
  useEffect(() => {
    if (!firestore || !currentAccountId) return;

    // 1. カスタム予定 (todoEvents) のリアルタイム同期
    const qEvents = query(collection(firestore, `users/${currentAccountId}/todoEvents`));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomEvents(events);
    }, (err) => {
      console.error("Failed to subscribe to custom todoEvents:", err);
    });

    // 2. 毎週の固定予定 (fixedSchedules) のリアルタイム同期
    const qFixed = query(collection(firestore, `users/${currentAccountId}/fixedSchedules`));
    const unsubFixed = onSnapshot(qFixed, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFixedSchedules(schedules);
    }, (err) => {
      console.error("Failed to subscribe to fixedSchedules:", err);
    });

    // 3. スケジュールカテゴリーのリアルタイム同期
    const qCategories = query(collection(firestore, `users/${currentAccountId}/scheduleCategories`));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      if (!snapshot.empty) {
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // デフォルトを維持しつつカスタムを統合
        const merged = [...DEFAULT_CATEGORIES];
        cats.forEach(cat => {
          if (!merged.some(m => m.id === cat.id)) {
            merged.push(cat);
          }
        });
        setScheduleCategories(merged);
      } else {
        setScheduleCategories(DEFAULT_CATEGORIES);
      }
    }, (err) => {
      console.error("Failed to subscribe to scheduleCategories:", err);
    });

    return () => {
      unsubEvents();
      unsubFixed();
      unsubCategories();
    };
  }, [firestore, currentAccountId]);

  // 固定スケジュール変更時に localStorage に自動保存
  useEffect(() => {
    localStorage.setItem('twitter_clone_fixed_schedules', JSON.stringify(fixedSchedules));
  }, [fixedSchedules]);

  // 左カラムの固定スケジュール登録フォームの状態
  const [newFixedState, setNewFixedState] = useState({
    title: '',
    type: 'parttime', // 'parttime' | 'circle' | 'homework' (その他タスク / 旧課題)
    dayOfWeek: 1, // デフォルト月曜日 (0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土)
    startHour: 18,
    startMin: 0,
    endHour: 22,
    endMin: 0,
    location: '' // 固定予定の場所を追加
  });

  // 固定繰り返しスケジュールを登録するハンドラ
  const handleAddFixedSchedule = () => {
    const { title, type, dayOfWeek, startHour, startMin, endHour, endMin, location } = newFixedState;
    
    // 開始時間と終了時間の検証
    if (endHour * 60 + endMin <= startHour * 60 + startMin) {
      alert('終了時間は開始時間よりも後に設定してください。');
      return;
    }

    const defaultTitles = {
      parttime: 'バイト',
      circle: 'サークル',
      homework: '課題',
      other: '教習'
    };
    
    const finalTitle = title.trim() || defaultTitles[type] || '固定予定';

    const newFixed = {
      id: `fixed-event-${Date.now()}`,
      title: finalTitle,
      type,
      dayOfWeek: Number(dayOfWeek),
      startHour: Number(startHour),
      startMin: Number(startMin),
      endHour: Number(endHour),
      endMin: Number(endMin),
      location: location.trim() // 場所をマージ
    };

    setFixedSchedules(prev => [...prev, newFixed]);
    setNewFixedState(prev => ({ ...prev, title: '', location: '' })); // タイトルと場所をクリア

    // Firestore同期
    if (firestore && currentAccountId) {
      setDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${newFixed.id}`), newFixed)
        .catch(err => console.error("Failed to sync new fixed schedule to Firestore:", err));
    }
  };

  // 固定スケジュールを削除するハンドラ
  const handleDeleteFixedSchedule = (id) => {
    if (confirm('この毎週の固定繰り返しスケジュールを削除しますか？\n（削除するとカレンダーの表示からも消去されます）')) {
      setFixedSchedules(prev => prev.filter(ev => ev.id !== id));

      // Firestore同期
      if (firestore && currentAccountId) {
        deleteDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${id}`))
          .catch(err => console.error("Failed to delete fixed schedule from Firestore:", err));
      }
    }
  };

  // 予定追加フォーム（旧モーダル）の状態（初期表示時に現在の日付をセット）
  const [addModalState, setAddModalState] = useState(() => {
    const now = new Date();
    return {
      isOpen: true, // 互換性のためのフラグ
      dateObj: now,
      startHour: 9,
      startMin: 0,
      endHour: 10,
      endMin: 0,
      title: '',
      type: 'parttime', // 'parttime' (バイト), 'circle' (サークル), 'homework' (課題)
      location: '',
      description: '',
      guest: '',
      hasMeet: false,
      isAllDay: false,
      isEdit: false,
      editingEventId: null,
      isPreviewActive: false, // 初期表示時はカレンダーへの仮プレビュー表示をオフ（非表示）にする
      isFixedSchedule: false, // 固定予定編集フラグ
      editingFixedScheduleId: null, // 固定予定ID
      dayOfWeek: 1, // 固定予定用曜日
      isDetailView: false, // 詳細閲覧モードかどうか
      isLesson: false, // 授業かどうか
      lessonObj: null // 授業オブジェクト格納用
    };
  });

  // どのタイムピッカーが開いているか ('start' | 'end' | null)
  const [activeTimePicker, setActiveTimePicker] = useState(null);

  // 予定フォームを初期（新規追加）状態にクリーンアップする関数
  const resetFormState = () => {
    const now = new Date();
    setAddModalState({
      isOpen: true,
      dateObj: now,
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
      isPreviewActive: false, // クリア時は仮プレビュー表示をオフにする
      isFixedSchedule: false,
      editingFixedScheduleId: null,
      dayOfWeek: 1,
      isDetailView: false,
      isLesson: false,
      lessonObj: null
    });
    setActiveTimePicker(null);
  };

  // カスタム予定が変更されたら localStorage に永続化
  useEffect(() => {
    localStorage.setItem('twitter_clone_todo_events', JSON.stringify(customEvents));
  }, [customEvents]);

  // カレンダーグリッドクリック時の処理 (クリック位置から時間を30分単位で逆算し、サイドバーフォームに埋め込む)
  const handleGridClick = (e, dateObj) => {
    // 予定カードやバッジの上をクリックした場合は処理しない
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top; // スクリューコンテナ内のY座標
    const clickMin = Math.min(1439, Math.max(0, clickY));
    
    // 最も近い30分単位に切り捨てて綺麗にスナップ (30分 = 30px)
    const roundedMin = Math.floor(clickMin / 30) * 30;
    const totalMinutes = Math.min(1410, Math.max(0, roundedMin)); // 23:30が最大開始時刻
    const startHour = Math.floor(totalMinutes / 60);
    const startMin = totalMinutes % 60;
    
    let endHour = startHour + 1;
    let endMin = startMin;
    if (endHour >= 24) {
      endHour = 23;
      endMin = 59;
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
      isPreviewActive: true, // クリックされて入力開始されたのでプレビューをオンにする
      isFixedSchedule: false,
      editingFixedScheduleId: null,
      dayOfWeek: 1,
      isDetailView: false, // 詳細表示はOFF
      isLesson: false,
      lessonObj: null
    });
    setActiveRightSidebar(true); // スマホ等でサイドバーを「にゅるっと」自動で引き出す
  };

  const handleSaveEvent = () => {
    if (!addModalState.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    const { dateObj, startHour, startMin, endHour, endMin, title, type, location, description, guest, hasMeet, isAllDay, isEdit, editingEventId, isFixedSchedule, editingFixedScheduleId, dayOfWeek } = addModalState;
    
    // 固定予定の編集保存処理
    if (isFixedSchedule && editingFixedScheduleId) {
      if (endHour * 60 + endMin <= startHour * 60 + startMin) {
        alert('終了時間は開始時間よりも後に設定してください。');
        return;
      }

      setFixedSchedules(prev => prev.map(fs => {
        if (fs.id === editingFixedScheduleId) {
          const updatedFixed = {
            ...fs,
            title: title.trim(),
            type,
            dayOfWeek: Number(dayOfWeek),
            startHour: Number(startHour),
            startMin: Number(startMin),
            endHour: Number(endHour),
            endMin: Number(endMin),
            location: location.trim()
          };

          // Firestore同期
          if (firestore && currentAccountId) {
            setDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${editingFixedScheduleId}`), updatedFixed)
              .catch(err => console.error("Failed to sync updated fixed schedule to Firestore:", err));
          }

          return updatedFixed;
        }
        return fs;
      }));

      resetFormState();
      setActiveRightSidebar(false); // 更新したらサイドバーを閉じる
      return;
    }

    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const fullDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const duration = ((endHour * 60) + endMin) - ((startHour * 60) + startMin);
    const safeDuration = duration > 0 ? duration : 60; // 最小60分

    // 時刻フォーマット（24時間表記）
    const formatAMPM = (h, min) => {
      return `${h}:${String(min).padStart(2, '0')}`;
    };

    const timeStr = `${formatAMPM(startHour, startMin)} - ${formatAMPM(endHour, endMin)}`;

    if (isEdit && editingEventId) {
      setCustomEvents(prev => prev.map(ev => {
        if (ev.id === editingEventId) {
          const updatedEv = {
            ...ev,
            title,
            room: location || '',
            time: isAllDay ? '終日' : timeStr,
            startHour,
            startMin,
            duration: safeDuration,
            color: (() => {
              const cat = scheduleCategories.find(c => c.id === type);
              return cat ? cat.color : 'blue';
            })(),
            fullDate: fullDateStr,
            type,
            location,
            description,
            guest,
            hasMeet,
            isAllDay
          };

          // Firestore同期
          if (firestore && currentAccountId) {
            setDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${editingEventId}`), updatedEv)
              .catch(err => console.error("Failed to sync updated custom event to Firestore:", err));
          }

          return updatedEv;
        }
        return ev;
      }));
    } else {
      const newEv = {
        id: `custom-event-${Date.now()}`,
        title,
        room: location || '',
        time: isAllDay ? '終日' : timeStr,
        startHour,
        startMin,
        duration: safeDuration,
        color: (() => {
          const cat = scheduleCategories.find(c => c.id === type);
          return cat ? cat.color : 'blue';
        })(),
        isCustom: true,
        fullDate: fullDateStr,
        type,
        location,
        description,
        guest,
        hasMeet,
        isAllDay
      };
      setCustomEvents(prev => [...prev, newEv]);

      // Firestore同期
      if (firestore && currentAccountId) {
        setDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${newEv.id}`), newEv)
          .catch(err => console.error("Failed to sync new custom event to Firestore:", err));
      }
    }

    resetFormState();
    setActiveRightSidebar(false); // 保存・更新したらサイドバーを閉じる
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
      isPreviewActive: true, // クリックされて入力開始されたのでプレビューをオンにする
      isFixedSchedule: false,
      editingFixedScheduleId: null,
      dayOfWeek: 1,
      isDetailView: false, // 詳細表示はOFF
      isLesson: false,
      lessonObj: null
    });
    setActiveRightSidebar(true); // スマホ等でサイドバーを「にゅるっと」自動で引き出す
  };

  const handleEventClick = (event) => {
    // 1. 授業（講義）の場合
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
        isDetailView: true, // 詳細表示をON
        isLesson: true,
        lessonObj: {
          ...lesson,
          term: termKey
        }
      });
      setActiveRightSidebar(true); // 右サイドバーをにゅるっと開く
      return;
    }

    // 2. 毎週の固定予定の場合
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
          isDetailView: true, // 詳細表示をON
          isLesson: false,
          lessonObj: null
        });
        setActiveRightSidebar(true);
      }
      return;
    }

    // 3. 通常のカスタム予定の場合
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
          isDetailView: true, // 詳細表示をON
          isLesson: false,
          lessonObj: null
        });
        setActiveRightSidebar(true);
      }
    }
  };

  const handleDeleteEvent = () => {
    const { editingEventId, editingFixedScheduleId, isFixedSchedule, title } = addModalState;
    if (isFixedSchedule && editingFixedScheduleId) {
      if (confirm(`固定繰り返し予定「${title}」を削除しますか？`)) {
        setFixedSchedules(prev => prev.filter(ev => ev.id !== editingFixedScheduleId));
        resetFormState();
        setActiveRightSidebar(false); // 削除したらサイドバーを閉じる

        // Firestore同期
        if (firestore && currentAccountId) {
          deleteDoc(doc(firestore, `users/${currentAccountId}/fixedSchedules/${editingFixedScheduleId}`))
            .catch(err => console.error("Failed to delete fixed schedule from Firestore:", err));
        }
      }
      return;
    }

    if (editingEventId) {
      if (confirm(`予定「${title}」を削除しますか？`)) {
        setCustomEvents(prev => prev.filter(ev => ev.id !== editingEventId));
        resetFormState();
        setActiveRightSidebar(false); // 削除したらサイドバーを閉じる

        // Firestore同期
        if (firestore && currentAccountId) {
          deleteDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${editingEventId}`))
            .catch(err => console.error("Failed to delete custom event from Firestore:", err));
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
  
  // 左カラムミニカレンダーの表示基準日 (デフォルトは今日)
  const [miniCalDate, setMiniCalDate] = useState(() => new Date());

  // ビューモードステート: 'day' (日), 'week' (週), 'month' (月)
  const [viewMode, setViewMode] = useState('week');
  
  // モバイル画面幅の判定（ Tailwind の md = 768px）
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileViewMode, setMobileViewMode] = useState('year'); // 'year' | 'month' | 'day'
  const mobileDayScrollRef = useRef(null);
  const mobileMonthScrollRef = useRef(null);
  const mobileDayContainerRef = useRef(null);


  // モバイル無限スクロール用の表示月リスト（初期ロード: 2026年4月〜8月）
  const [renderedMonths, setRenderedMonths] = useState([
    { year: 2026, month: 3 }, // 4月
    { year: 2026, month: 4 }, // 5月
    { year: 2026, month: 5 }, // 6月
    { year: 2026, month: 6 }, // 7月
    { year: 2026, month: 7 }  // 8月
  ]);

  // 現在上部に固定表示する年・月
  const [currentDisplayYear, setCurrentDisplayYear] = useState(() => new Date().getFullYear());
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(() => new Date().getMonth());

  // 下スクロール無限読み込み ＆ 現在表示月追従ハンドラ
  const handleMobileMonthScroll = (e) => {
    const container = e.currentTarget;

    // 1. 下スクロール無限追加
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 300) {
      setRenderedMonths(prev => {
        const lastMonthObj = prev[prev.length - 1];
        // 2027年3月（JSのMonth = 2）が上限
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

    // 2. 現在最も上部に位置している（見えている）月の検出
    let activeYear = 2026;
    let activeMonth = 4; // 5月
    let minDiff = Infinity;

    renderedMonths.forEach(({ year: y, month: m }) => {
      const el = document.getElementById(`month-${y}-${m}`);
      if (el) {
        // コンテナのスクロールトップと、要素の offsetTop の差が最も小さい月を特定
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

  // モバイル版月ビューが切り替わったときに今日の月コンテナへ自動スクロール
  useEffect(() => {
    if (isMobile && mobileViewMode === 'month') {
      const timer = setTimeout(() => {
        const today = new Date();
        // 表示月も今日の月に同期
        setCurrentDisplayYear(today.getFullYear());
        setCurrentDisplayMonth(today.getMonth());

        const elementId = `month-${today.getFullYear()}-${today.getMonth()}`;
        const element = document.getElementById(elementId);
        if (element && mobileMonthScrollRef.current) {
          const container = mobileMonthScrollRef.current;
          const elementOffsetTop = element.offsetTop;
          container.scrollTop = elementOffsetTop;
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

  // 指定された年・月にジャンプし、その月をプレロードリストの中心に据えるモバイル専用ヘルパー
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

  // モバイル版日ビューが切り替わったときにスクロール位置を8:00（480px）に自動スクロール
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
  
  // ビュー切り替えドロップダウンの開閉状態
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // ビューが切り替わったときにスクロール位置を8:00（480px）に自動スクロール
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

  // タイムピッカーが開いたときに選択中の時間オプションへ自動スクロールする
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

  // カレンダーカテゴリのモックデータ
  const categories = [
    { id: 'work', label: '仕事', color: '#3b82f6', active: true },
    { id: 'ds-team', label: 'データサイエンスチーム', color: '#06b6d4', active: true },
    { id: 'ds-core', label: 'DSコア', color: '#10b981', active: true },
    { id: 'personal', label: '個人', color: '#f97316', active: true },
    { id: 'kids', label: '家族・子ども', color: '#ef4444', active: true },
    { id: 'holidays', label: '祝日', color: '#9ca3af', active: false },
  ];

  // ==============================================================
  // 埼玉大学 ターム・時間割・学年歴 連携ロジック (超頑丈・型安全設計)
  // ==============================================================

  // その日が第何タームに属しているかを判定
  const getTermForDate = (date) => {
    if (!date || typeof date.getTime !== 'function') return null;
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // 2026年度学年歴ベースのターム期間判定 (補講期間も含めて表示)
    if (dateStr >= "2026-04-09" && dateStr <= "2026-06-05") return 1;
    if (dateStr >= "2026-06-08" && dateStr <= "2026-08-03") return 2;
    if (dateStr >= "2026-10-01" && dateStr <= "2026-12-01") return 3;
    if (dateStr >= "2026-12-02" && dateStr <= "2027-02-09") return 4;
    return null;
  };

  // その日に対する学年歴（終日予定）のイベントリストを取得
  const getAcademicEventsForDate = (date) => {
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
  const getEventColor = (type, isCustom, isTempPreview, customColor) => {
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
  const getTimetableEventsForDate = (date) => {
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

    const lessonColors = (() => {
      try {
        return JSON.parse(localStorage.getItem('twitter_clone_lesson_colors')) || {};
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
  const getWeekAcademicSlots = (days) => {
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

  // ==============================================================
  // 表示日付・週・月の計算ロジック (鉄壁の安全ガード)
  // ==============================================================

  // 今週の日曜日〜土曜日の日付を計算
  const currentDayOfWeek = currentDate?.getDay?.() ?? new Date().getDay();
  
  // 日曜日を基準点とする
  const offsetToSunday = -currentDayOfWeek;
  const sundayDate = new Date(currentDate || new Date());
  sundayDate.setDate((currentDate?.getDate?.() ?? new Date().getDate()) + offsetToSunday);

  // 週ビュー用 (Sun〜Sat)
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

  // 日ビュー用 (選択されているその日)
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

  // 曜日インデックス（0〜6、Sun〜Sat）に合わせたイベントデータ (モック予定は完全にクリア)
  const baseWeekEvents = [[], [], [], [], [], [], []];

  // 予定ゲッター
  const getEventsForDate = (dateStr, dateObj) => {
    // 1. ユーザーの時間割から授業を動的にマッピング
    const timetableEvents = getTimetableEventsForDate(dateObj);
    
    // 2. ユーザーが手動追加したカスタム予定をマージ
    let matchedCustomEvents = [];
    if (dateObj && typeof dateObj.getTime === 'function') {
      const y = dateObj.getFullYear();
      const m = dateObj.getMonth() + 1;
      const d = dateObj.getDate();
      const fullDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      matchedCustomEvents = customEvents.filter(ev => ev.fullDate === fullDateStr && !ev.isAllDay);

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
      const matchedFixed = fixedSchedules.filter(fs => fs.dayOfWeek === dayOfWeek);
      
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
  const getColorClasses = (color, dashed, stripe) => {
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

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour) => {
    return `${hour}:00`;
  };

  // リアルタイム時間軸の安全計算
  const currentHour = today?.getHours?.() ?? new Date().getHours();
  const currentMin = today?.getMinutes?.() ?? new Date().getMinutes();
  const topPx = (currentHour * 60) + currentMin;

  const formatTimeText = (date) => {
    if (!date || !date.getHours) date = new Date();
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const timeText = formatTimeText(today);

  // ==============================================================
  // 左カラムミニカレンダー日付生成
  // ==============================================================
  const getMiniCalendarDays = (dateObj) => {
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

  const miniCalendarDays = getMiniCalendarDays(miniCalDate || new Date());

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月", 
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];
  
  // カレンダーの中心月表示
  const safeCurrentDate = currentDate || new Date();
  const currentMonthName = monthNames[safeCurrentDate.getMonth?.() ?? 0];
  const currentYear = safeCurrentDate.getFullYear?.() ?? new Date().getFullYear();
  const headerLabel = `${currentYear}年 ${currentMonthName}`;

  // 左カラムミニカレンダーの月表示名
  const safeMiniCalDate = miniCalDate || new Date();
  const miniCalLabel = `${safeMiniCalDate.getFullYear?.() ?? new Date().getFullYear()}年 ${monthNames[safeMiniCalDate.getMonth?.() ?? 0]}`;

  // ==============================================================
  // カレンダーボタン操作ハンドラ
  // ==============================================================

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
    const diffY = e.targetTouches[0].clientY - touchStartY;

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

  // ==============================================================
  // 月ビュー
  // ==============================================================
  const getMonthViewDays = (dateObj) => {
    const safeDate = dateObj || new Date();
    const year = safeDate.getFullYear?.() ?? new Date().getFullYear();
    const month = safeDate.getMonth?.() ?? new Date().getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();
    
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
    for (let i = 1; i <= numDays; i++) {
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

  const monthViewDays = getMonthViewDays(currentDate || new Date());

  // ==============================================================
  // モバイル版 (iOS カレンダー風 3階層遷移: 年 -> 月 -> 日)
  // ==============================================================

  // 各月の曜日と日付リストを返す (年ビュー用)
  const getMiniMonthDays = (year, month) => {
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

  // 各月の曜日と日付オブジェクトリストを返す (可変高モバイルシームレス月ビュー用)
  const getDaysForSingleMonth = (year, month) => {
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

  // その日が含まれる週の7日間（日〜土）を返す (日ビューの週ヘッダー用)
  const getWeekDaysForDate = (date) => {
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

  const renderMobileBannerModal = () => {
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

  // 1. モバイル版 年ビュー ('year') - 2026年および2027年12月（ToDoカレンダー）表示対応
  const renderMobileYearView = () => {
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

  // 2. モバイル版 月ビュー ('month') - 縦方向シームレス無限スクロール
  const renderMobileMonthView = () => {
    const today = new Date();
    const displayMonthName = `${currentDisplayMonth + 1}月`;
    const displayYearName = `${currentDisplayYear}年`;

    return (
      <div className="flex flex-col h-full bg-black text-white select-none">
        {/* 固定ヘッダーブロック (透過しない・完全に上部に固定) */}
        {/* 固定ヘッダーブロック (透過しない・完全に上部に固定) */}
        <div className="flex flex-col bg-black z-30 shrink-0 border-b border-gray-900">
          {/* 1行目: 年ヘッダー */}
          <div className="flex justify-between items-center px-4 py-3 bg-black">
            <button onClick={() => setMobileViewMode('year')} className="text-rose-500 flex items-center space-x-1 text-sm font-bold active:scale-95">
              <ChevronLeft size={16} />
              <span>{displayYearName}</span>
            </button>
            <div className="flex items-center">
            </div>
          </div>

          {/* 2行目: 月ヘッダー (大きく表示・不透過) */}
          <div className="text-3xl font-black text-white px-4 py-2 shrink-0 bg-black">
            {displayMonthName}
          </div>

          {/* 3行目: 曜日ヘッダー (不透過) */}
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
                {/* 月ヘッダーは上部固定化されたため、ここからは完全消去 */}

                {/* 7列日付グリッド */}
                <div className="grid grid-cols-7 bg-black pb-2">
                  {(() => {
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

                    return monthDays.map((d, idx) => {
                      // null (前月の曜日余白) セルのレンダリング
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

                      // その日の全イベントを取得
                      const dayEvents = getEventsForDate(dateStr, d.fullDate) || [];

                      const isSelectedDate = currentDate && 
                                             d.fullDate.getDate() === currentDate.getDate() &&
                                             d.fullDate.getMonth() === currentDate.getMonth() &&
                                             d.fullDate.getFullYear() === currentDate.getFullYear();

                      return (
                        <div 
                          key={idx} 
                          className={`h-[84px] border-b border-r border-gray-900/60 flex flex-col justify-start items-stretch py-1 cursor-pointer hover:bg-gray-900/20 relative transition-all ${
                            isSelectedDate ? (isDark ? 'ring-2 ring-rose-500 ring-inset bg-rose-500/5' : 'ring-2 ring-rose-500 ring-inset bg-rose-50/35') : ''
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
                            {/* 1. 学年歴テキストバッジ of 連続バー表示 */}
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
                              
                              // ネガティブマージンで左右のパディングを相殺し、隣のセルと隙間なく結合する（ボーダー線を完全に覆い隠す）
                              const marginL = isMultiDay ? (isStartOfBar ? 'ml-[2px]' : '-ml-[1.5px]') : 'mx-0.5';
                              const marginR = isMultiDay ? (isEndOfBar ? 'mr-[2px]' : '-mr-[1.5px]') : 'mx-0.5';
                              
                              const rounded = isMultiDay 
                                ? `${isStartOfBar ? 'rounded-l-[3px]' : ''} ${isEndOfBar ? 'rounded-r-[3px]' : ''}`
                                : 'rounded-[3px]';
                                
                              const showTitle = !isMultiDay || isActualStart || (isSunday && ae.start < dateStr);
                              let colorClass = '';

                              // ホームタブ（AcademicCalendar）の配色定義を移植
                              if (ae.type === 'vacation') {
                                colorClass = 'bg-[#ef5350] text-white'; // 赤
                              } else if (ae.type === 'intensive') {
                                colorClass = 'bg-[#9c27b0] text-white'; // 紫
                              } else if (ae.type === 'exam') {
                                colorClass = 'bg-[#ff9800] text-white'; // オレンジ
                              } else if (ae.type === 'makeup') {
                                colorClass = 'bg-[#ec407a] text-white'; // ピンク
                              } else if (ae.type === 'start') {
                                colorClass = 'bg-[#4caf50] text-white'; // 緑
                              } else if (ae.type === 'grade') {
                                colorClass = 'bg-[#2196f3] text-white'; // 青
                              } else if (ae.type === 'class') {
                                colorClass = 'bg-[#ffeb3b] text-gray-900 border border-yellow-500/50'; // 授業（黄色）
                              } else if (ae.type === 'event') {
                                colorClass = 'bg-[#5c6bc0] text-white'; // インディゴ
                              } else if (ae.type === 'holiday') {
                                colorClass = 'bg-gray-400 dark:bg-gray-600 text-white'; // グレー
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

                            {/* 2. 通常予定のドット表示 (講義４つあれば４つドットが並ぶ) */}
                            {dayEvents.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 justify-center items-center select-none w-full pt-1">
                                {dayEvents.slice(0, 5).map((ev, evIdx) => {
                                  let dotColor = '#ef4444'; // デフォルト赤
                                  if (ev.isLesson) dotColor = '#3b82f6'; // 授業は青
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
                    });
                  })()}
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

  // 3. モバイル版 日ビュー ('day')
  const renderMobileDayView = () => {
    const today = new Date();
    const weekDays = getWeekDaysForDate(currentDate);
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const dailyEvents = getEventsForDate(dateStr, currentDate) || [];

    // 現在時刻インジケーターの計算
    const nowReal = new Date();
    const isTodaySelected = currentDate.getFullYear() === nowReal.getFullYear() &&
                            currentDate.getMonth() === nowReal.getMonth() &&
                            currentDate.getDate() === nowReal.getDate();
    const currentMin = nowReal.getHours() * 60 + nowReal.getMinutes();
    const timeText = `${nowReal.getHours()}:${String(nowReal.getMinutes()).padStart(2, '0')}`;

    // 日本語日付タイトル
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
                onClick={() => setCurrentDate(d)}
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

        {/* 本日日付タイトル ＆ タイムライン スライドコンテナ */}
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
              {/* 1時間ごとの罫線とグリッド */}
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
                    onClick={(e) => handleGridClick(e, currentDate)}
                  />
                </div>
              ))}

              {/* 予定カードを絶対配置でマッピング */}
              {dailyEvents.map((ev, idx) => {
                const top = ev.startHour * 60 + ev.startMin;
                const height = ev.duration;

                // 動的なカテゴリー別カラーを取得
                let colorKey = ev.color || 'blue';
                if (!ev.isLesson) {
                  const cat = scheduleCategories.find(c => c.id === ev.type);
                  if (cat) {
                    colorKey = cat.color;
                  }
                }
                const { classes, style: colorStyle } = getColorClasses(colorKey, ev.dashed, ev.stripe);
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleEventClick({ ...ev, date: currentDate })}
                    className={`absolute right-2 left-14 rounded-xl px-2.5 py-1.5 shadow-sm cursor-pointer flex flex-col justify-start overflow-hidden transition-all hover:scale-[1.01] active:scale-95 border border-transparent ${classes}`}
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

  // 4. モバイル版 総合レンダラー
  const renderMobileCalendar = () => {
    if (mobileViewMode === 'year') {
      return renderMobileYearView();
    } else if (mobileViewMode === 'month') {
      return renderMobileMonthView();
    } else if (mobileViewMode === 'day') {
      return renderMobileDayView();
    }
    return null;
  };

  // モバイル画面（isMobile）時のリターン分岐
  if (isMobile) {
    return (
      <div className={`flex flex-col h-[calc(100vh-60px)] lg:h-screen w-full overflow-hidden ${
        isDark ? 'bg-black text-gray-100 border-gray-800' : 'bg-white text-gray-800 border-gray-200'
      }`}>
        {/* モバイル版カレンダー */}
        {renderMobileCalendar()}

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
              {/* モバイル表示時の閉じるヘッダー */}
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
                /* ==================== 詳細確認ビュー (Detail View) ==================== */
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
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border shrink-0`}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ff3b30',
                        borderColor: 'rgba(239, 68, 68, 0.3)'
                      }}>
                        {addModalState.isLesson ? '授業' : (addModalState.type === 'parttime' ? 'バイト' : addModalState.type === 'circle' ? 'サークル' : '予定')}
                      </span>
                    </div>
                    <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {addModalState.title}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pt-4 pb-10 text-sm scrollbar-thin">
                    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
                      isDark ? 'bg-gray-800/25 border-gray-800' : 'bg-gray-50 border-gray-150'
                    }`}>
                      <Clock size={16} className="text-gray-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className={`font-black ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                          {`${addModalState.startHour}:${String(addModalState.startMin).padStart(2, '0')} - ${addModalState.endHour}:${String(addModalState.endMin).padStart(2, '0')}`}
                        </span>
                        <span className="text-[10px] text-gray-500 font-extrabold">
                          {`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`}
                        </span>
                      </div>
                    </div>

                    {addModalState.location && (
                      <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
                        isDark ? 'bg-gray-800/25 border-gray-800' : 'bg-gray-50 border-gray-150'
                      }`}>
                        <MapPin size={16} className="text-gray-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                            {addModalState.location}
                          </span>
                        </div>
                      </div>
                    )}

                    {addModalState.description && (
                      <div className={`flex flex-col gap-1.5 p-3 rounded-2xl border ${
                        isDark ? 'bg-gray-800/25 border-gray-800' : 'bg-gray-50 border-gray-150'
                      }`}>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">メモ / 詳細</span>
                        <p className={`whitespace-pre-wrap leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {addModalState.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {addModalState.isLesson && addModalState.lessonObj && (
                    <div className="shrink-0 pt-2 border-t border-gray-800 flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          setActiveRightSidebar(false);
                          if (onLessonSelect) {
                            onLessonSelect(addModalState.lessonObj);
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow active:scale-95 text-center flex items-center justify-center gap-2"
                      >
                        <BookOpen size={16} />
                        <span>授業詳細・トークを開く</span>
                      </button>
                    </div>
                  )}

                  {!addModalState.isLesson && (
                    <div className="shrink-0 pt-2 border-t border-gray-800 flex gap-2">
                      <button 
                        onClick={() => {
                          if (confirm('この予定を削除しますか？')) {
                            if (addModalState.isFixedSchedule && addModalState.editingFixedScheduleId) {
                              handleDeleteFixedSchedule(addModalState.editingFixedScheduleId);
                            } else if (addModalState.editingEventId) {
                              setCustomEvents(prev => prev.filter(ev => ev.id !== addModalState.editingEventId));
                              if (firestore && currentAccountId) {
                                deleteDoc(doc(firestore, `users/${currentAccountId}/todoEvents/${addModalState.editingEventId}`))
                                  .catch(err => console.error("Failed to delete event:", err));
                              }
                            }
                            resetFormState();
                            setActiveRightSidebar(false);
                          }
                        }}
                        className="flex-1 bg-red-650/10 hover:bg-red-650/20 text-red-500 border border-red-500/20 font-bold py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        削除する
                      </button>
                      <button 
                        onClick={() => setAddModalState(prev => ({ ...prev, isDetailView: false }))}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        編集する
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ==================== 予定の編集 / 追加フォーム ==================== */
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-4 pt-2 pb-10 pr-1 scrollbar-thin select-none">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">タイトル</label>
                      <input 
                        type="text" 
                        value={addModalState.title}
                        onChange={e => setAddModalState(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="予定のタイトルを追加"
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          isDark ? 'bg-gray-800/40 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">開始時間</label>
                        <button 
                          onClick={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                          className={`w-full px-3 py-2 border rounded-xl text-left text-xs font-bold transition-all ${
                            isDark ? 'bg-gray-800/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          {`${addModalState.startHour}:${String(addModalState.startMin).padStart(2, '0')}`}
                        </button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">終了時間</label>
                        <button 
                          onClick={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                          className={`w-full px-3 py-2 border rounded-xl text-left text-xs font-bold transition-all ${
                            isDark ? 'bg-gray-800/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          {`${addModalState.endHour}:${String(addModalState.endMin).padStart(2, '0')}`}
                        </button>
                      </div>
                    </div>

                    {activeTimePicker && (
                      <div className={`p-1 border rounded-xl max-h-40 overflow-y-auto time-picker-options-container flex flex-col gap-0.5 ${
                        isDark ? 'bg-gray-950 border-gray-850 text-white' : 'bg-gray-50 border-gray-150 text-gray-850'
                      }`}>
                        {TIME_OPTIONS
                          .filter(opt => {
                            if (activeTimePicker === 'end') {
                              return (opt.hour * 60 + opt.min) > (addModalState.startHour * 60 + addModalState.startMin);
                            }
                            return true;
                          })
                          .map((opt, idx) => {
                            const isSelected = activeTimePicker === 'start' 
                              ? (opt.hour === addModalState.startHour && opt.min === addModalState.startMin)
                              : (opt.hour === addModalState.endHour && opt.min === addModalState.endMin);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (activeTimePicker === 'start') {
                                    handleStartTimeSelect(opt.hour, opt.min);
                                  } else {
                                    handleEndTimeSelect(opt.hour, opt.min);
                                  }
                                  setActiveTimePicker(null);
                                }}
                                className={`w-full text-left px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                {opt.hour}:{String(opt.min).padStart(2, '0')}
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">カテゴリー</label>
                      <div className="flex flex-wrap gap-1.5">
                        {scheduleCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setAddModalState(prev => ({ ...prev, type: cat.id }))}
                            className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all ${
                              addModalState.type === cat.id
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-gray-500/10 border-transparent text-gray-400 hover:bg-gray-500/20'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">場所</label>
                      <input 
                        type="text" 
                        value={addModalState.location}
                        onChange={e => setAddModalState(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="教室や場所を追加"
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          isDark ? 'bg-gray-800/40 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">メモ</label>
                      <textarea 
                        value={addModalState.description}
                        onChange={e => setAddModalState(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="予定のメモを追加"
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-extrabold h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          isDark ? 'bg-gray-800/40 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="shrink-0 pt-2 border-t border-gray-800 flex gap-2">
                    <button 
                      onClick={() => {
                        resetFormState();
                        setActiveRightSidebar(false);
                      }}
                      className="flex-1 bg-gray-500/10 hover:bg-gray-500/20 font-bold py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      クリア
                    </button>
                    <button 
                      onClick={handleSaveEvent}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      {addModalState.isEdit ? '更新する' : '保存する'}
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </>
        )}

        {/* 左サイドバー (モバイル用) */}
        {activeLeftSidebar && (
          <>
            <div 
              onClick={() => setActiveLeftSidebar(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            />
            <div className={`fixed top-0 bottom-0 left-0 z-50 w-72 p-4 flex flex-col overflow-hidden transition-transform duration-300 ${
              activeLeftSidebar ? 'translate-x-0' : '-translate-x-full'
            } ${isDark ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4 shrink-0">
                <span className="text-sm font-black text-rose-500">毎週の繰り返し予定</span>
                <button onClick={() => setActiveLeftSidebar(false)} className="p-1 rounded hover:bg-gray-500/10">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-none text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">登録済みの固定予定</span>
                  {fixedSchedules.length === 0 ? (
                    <div className="text-gray-500 italic py-2">固定予定がありません。以下から追加してください。</div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {fixedSchedules.map((fs, idx) => {
                        const days = ['日', '月', '火', '水', '木', '金', '土'];
                        return (
                          <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-gray-800/30 border border-gray-800">
                            <div>
                              <div className="font-extrabold text-[11px]">{fs.title}</div>
                              <div className="text-[9px] text-gray-500">
                                {`${days[fs.dayOfWeek]}曜日 ${fs.startHour}:${String(fs.startMin).padStart(2, '0')} - ${fs.endHour}:${String(fs.endMin).padStart(2, '0')}`}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteFixedSchedule(fs.id)}
                              className="text-red-500 hover:text-red-650 transition-colors p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-800 pt-4 space-y-3">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">新しく固定予定を追加</span>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500">タイトル</label>
                    <input 
                      type="text" 
                      value={newFixedState.title}
                      onChange={e => setNewFixedState(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="バイト、サークルなど"
                      className={`w-full px-3 py-1.5 border rounded-xl font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                        isDark ? 'bg-gray-800/40 border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500">曜日</label>
                    <select 
                      value={newFixedState.dayOfWeek}
                      onChange={e => setNewFixedState(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                      className={`w-full px-3 py-1.5 border rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                        isDark ? 'bg-gray-800/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                    >
                      {['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500">開始時間</label>
                      <select 
                        value={newFixedState.startHour}
                        onChange={e => setNewFixedState(prev => ({ ...prev, startHour: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 border rounded-xl font-bold focus:outline-none ${
                          isDark ? 'bg-gray-800/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{`${i}:00`}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500">終了時間</label>
                      <select 
                        value={newFixedState.endHour}
                        onChange={e => setNewFixedState(prev => ({ ...prev, endHour: Number(e.target.value) }))}
                        className={`w-full px-2 py-1.5 border rounded-xl font-bold focus:outline-none ${
                          isDark ? 'bg-gray-800/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{`${i}:00`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddFixedSchedule}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition-all shadow active:scale-95 text-center mt-2"
                  >
                    固定予定を登録する
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {renderMobileBannerModal()}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-60px)] lg:h-screen w-full overflow-hidden ${
      isDark ? 'bg-black text-gray-100 border-gray-800' : 'bg-white text-gray-800 border-gray-200'
    }`}>
      
      {/* ヘッダーセクション */}
      <div className={`flex items-center justify-between p-3 border-b shrink-0 select-none ${
        isDark ? 'bg-black/90 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setActiveLeftSidebar(!activeLeftSidebar)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-500/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-1 lg:space-x-3">
            <span className={`text-lg lg:text-2xl font-black tracking-tight shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {headerLabel}
            </span>
          </div>
        </div>

        {/* アカウント同期中の旨のメッセージ (ヘッダー中央) */}
        <div className="hidden md:flex items-center justify-center flex-1 mx-4 animate-fade-in">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center space-x-1.5 shadow-sm transition-all duration-300 ${
            isDark 
              ? 'bg-black-500/5 border-black-500/30 text-black-400' 
              : 'bg-black-50 border-black-100 text-black-600'
          }`}>
            <span>MY時間割でインポートした時間割が自動で反映されます。曜日が固定された予定は左サイドバーから、任意の予定は任意のセルを選択し右サイドバーから入力できます。PCで入力しスマホで確認することを推奨します。データはアカウントと同期されており本人以外は情報を取得できません。ソースコードはまとめ次第、公開します。</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          
          <div className="relative">
            <button 
              onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
              className={`px-3 py-1.5 text-xs font-extrabold border rounded-lg shadow-sm flex items-center space-x-1 transition-all active:scale-95 ${
                isDark ? 'border-gray-700 text-white bg-gray-900 hover:bg-gray-800' : 'border-gray-200 text-gray-800 bg-[#f9fafb] hover:bg-gray-50'
              }`}
            >
              <span>{viewMode === 'day' ? '日' : viewMode === 'week' ? '週' : '月'}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            
            {isViewDropdownOpen && (
              <>
                <div onClick={() => setIsViewDropdownOpen(false)} className="fixed inset-0 z-50"></div>
                <div className={`absolute right-0 mt-1.5 w-36 rounded-xl border p-1 shadow-2xl z-50 animate-fade-in ${
                  isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  {[
                    { mode: 'day', label: '日', shortcut: '1 or D' },
                    { mode: 'week', label: '週', shortcut: '0 or W' },
                    { mode: 'month', label: '月', shortcut: 'M' }
                  ].map(opt => (
                    <button
                      key={opt.mode}
                      onClick={() => {
                        setViewMode(opt.mode);
                        setIsViewDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        viewMode === opt.mode
                          ? isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
                          : isDark ? 'text-gray-300 hover:bg-gray-850 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {viewMode === opt.mode ? <Check size={12} /> : <div className="w-3"></div>}
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal">{opt.shortcut}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <button 
            onClick={() => setActiveRightSidebar(!activeRightSidebar)}
            className="xl:hidden p-1.5 rounded-lg hover:bg-gray-500/10 transition-colors"
          >
            <Eye size={20} />
          </button>
        </div>
      </div>

      {/* スマホ用「始める前に」特大ポップアップモーダル (広告風、初回のみ) */}
      {renderMobileBannerModal()}

      <div className="flex-1 flex flex-row w-full overflow-hidden relative">
        
        {/* 1. 左カラム */}
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

          {/* ミニカレンダー */}
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

          {/* 📅 毎週の固定スケジュール管理 */}
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
                  {/* 曜日セレクト */}
                  <select
                    value={newFixedState.dayOfWeek}
                    onChange={e => setNewFixedState(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                    className={`flex-1 px-1 py-1 font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] ${
                      isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-800'
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

                  {/* 開始時間 */}
                  <select
                    value={`${newFixedState.startHour}:${newFixedState.startMin}`}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      setNewFixedState(prev => ({ ...prev, startHour: h, startMin: m }));
                    }}
                    className={`px-1 py-1 font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] ${
                      isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-800'
                    }`}
                  >
                    {TIME_OPTIONS.map((opt, oIdx) => (
                      <option key={oIdx} value={`${opt.hour}:${opt.min}`}>
                        {opt.hour}:{String(opt.min).padStart(2, '0')}
                      </option>
                    ))}
                  </select>

                  <span className="text-gray-400">-</span>

                  {/* 終了時間 */}
                  <select
                    value={`${newFixedState.endHour}:${newFixedState.endMin}`}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      setNewFixedState(prev => ({ ...prev, endHour: h, endMin: m }));
                    }}
                    className={`px-1 py-1 font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] ${
                      isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-800'
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

            {/* 登録済みリストブロック */}
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
                  {/* 曜日順にソートしてレンダリング */}
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
        </aside>

        {/* オーバーレイ */}
        {activeLeftSidebar && (
          <div 
            onClick={() => setActiveLeftSidebar(false)}
            className="absolute inset-0 z-30 lg:hidden bg-black/50 backdrop-blur-sm"
          />
        )}

        {/* 2. 中央カラム */}
        <main 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex-1 flex flex-col h-full overflow-hidden"
        >
          
          {/* 🔍 A: 日ビュー */}
          {viewMode === 'day' && (
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
                    
                    // カスタム終日予定およびプレビュー終日予定を収集
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
                      const evColorClass = getEventColor(ev.type, ev.isCustom || ev.isAcademic === undefined, ev.isTempPreview, ev.color);
                      
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
                      {(dayViewDay?.key ? getEventsForDate(dayViewDay.key, dayViewDay.fullDate) : []).map(event => {
                        const top = (event.startHour * 60) + event.startMin;
                        const height = event.duration;
                        const { classes, style } = getColorClasses(event.color, event.dashed, event.stripe);
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
          )}

          {/* 📅 B: 週ビュー */}
          {viewMode === 'week' && (
            <div ref={weekScrollRef} className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain relative select-none animate-[fadeIn_0.2s_ease-out]">
              
              {/* スクロール時に画面上部に一体化して固定されるヘッダーコンテナ */}
              <div className="sticky top-0 z-30 flex flex-col shrink-0 min-w-[700px] md:min-w-0">
                
                {/* 曜日ヘッダー - 背景色を強制 */}
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
   
                {/* 終日予定エリア - 背景色を強制 */}
                <div className={`grid grid-cols-[55px_1fr] border-b shrink-0 bg-gray-500/5 relative ${
                  isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  {/* 終日エリア of 背景を確実に不透明にするため、背景レイヤーを配置 */}
                  <div className={`absolute inset-0 z-0 ${isDark ? 'bg-black' : 'bg-white'}`}></div>
                  <div className={`absolute inset-0 z-0 bg-gray-500/5`}></div>
                  
                  {/* 左端に「学年歴」と表示 */}
                  <div className={`border-r z-10 flex items-center justify-center text-[10px] font-black text-gray-400 tracking-wider select-none ${
                    isDark ? 'border-gray-800' : 'border-gray-200'
                  }`}>
                    学年歴
                  </div>
                  <div className="grid grid-cols-7 gap-0 min-h-[44px] py-1.5 relative z-10">
                    {/* 背景クリックで終日予定を登録するための透明グリッド */}
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
                    const weekAcademicSlots = getWeekAcademicSlots(weekDays);
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
                          // このスロット（行）における連続するイベントセグメントを検出する
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
                                const evColorClass = getEventColor(ev.type, ev.isCustom, ev.isTempPreview, ev.color);
                                
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
 
              {/* タイムラインコンテンツ本体 */}
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
                        {(day.key ? getEventsForDate(day.key, day.fullDate) : []).map(event => {
                          const top = (event.startHour * 60) + event.startMin;
                          const height = event.duration;
                          const { classes, style } = getColorClasses(event.color, event.dashed, event.stripe);
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
          )}

          {/* 📅 C: 月ビュー */}
          {viewMode === 'month' && (
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
                  const dayEvents = dateKey ? getEventsForDate(dateKey, day.fullDate).slice(0, 3) : [];

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
                          const { classes } = getColorClasses(event.color, false, false);
                          return (
                            <div 
                              key={event.id}
                              className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded truncate border border-transparent leading-tight ${classes}`}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dateKey && getEventsForDate(dateKey, day.fullDate).length > 3 && (
                          <div className="text-[7.5px] text-gray-500 font-bold pl-1 text-center bg-gray-500/5 rounded">
                            他 {getEventsForDate(dateKey, day.fullDate).length - 3} 件
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>

        {/* 3. 右カラム */}
        {activeRightSidebar && (
          <div 
            onClick={() => setActiveRightSidebar(false)}
            className="fixed inset-0 z-30 xl:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
        )}

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
          {/* モバイル表示時の閉じるヘッダー */}
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
            /* ==================== 詳細確認ビュー (Detail View) ==================== */
            <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-[fadeIn_0.2s_ease-out]">
              {/* ヘッダー/メタ情報 */}
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

              {/* 種類バッジ＆タイトル */}
              <div className="space-y-2 shrink-0 pt-2">
                {/* 種類バッジ */}
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

                {/* タイトル */}
                <h2 className={`text-lg lg:text-xl font-black leading-tight tracking-tight break-words ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {addModalState.title || '(タイトルなし)'}
                </h2>
              </div>

              {/* 詳細情報リスト */}
              <div className="flex-1 overflow-y-auto pr-1 pt-1 pb-10 xl:pb-1 space-y-4 no-scrollbar">
                
                {/* 日時 */}
                <div className="flex items-start space-x-3">
                  <span className="p-1 rounded-xl bg-gray-500/5 text-gray-400 shrink-0"><Clock size={15} /></span>
                  <div className="space-y-0.5 select-text">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">日時</div>
                    <div className={`text-xs font-black leading-normal ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                      {(() => {
                        const date = addModalState.dateObj || new Date();
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

                {/* 場所 */}
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

                {/* 説明 */}
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

                {/* 時間割（講義）の時限や担当教員情報などの追加 */}
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

              {/* 下部アクションボタン群 */}
              <div className={`flex flex-col gap-2 pt-3 border-t shrink-0 select-none pb-1 ${
                isDark ? 'border-gray-800 bg-black' : 'border-gray-150 bg-white'
              }`}>
                {addModalState.isLesson ? (
                  /* 授業（講義）の場合は「授業トーク・ToDoを開く」 */
                  <button
                    type="button"
                    onClick={() => {
                      if (onLessonSelect && addModalState.lessonObj) {
                        onLessonSelect(addModalState.lessonObj);
                        setActiveRightSidebar(false);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] text-white font-black py-2.5 px-4 rounded-full transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-xs animate-[scaleUp_0.15s_ease-out]"
                  >
                    <BookOpen size={13} />
                    <span>授業トーク・ToDoを開く</span>
                  </button>
                ) : (
                  /* 通常予定の場合は「予定を編集する」と「削除」の二段設計 */
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
                      onClick={handleDeleteEvent}
                      className="w-full text-xs font-black text-red-500 hover:text-red-600 transition-colors py-1.5 rounded-xl hover:bg-red-500/5 active:scale-95 transition-all text-center"
                    >
                      この予定を削除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ==================== 従来の編集/登録フォーム (Form View) ==================== */
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
                  className={`w-full text-base font-bold border-b-2 py-1 focus:outline-none focus:border-blue-500 transition-all ${
                    isDark ? 'bg-transparent border-gray-800 text-white placeholder-gray-500' : 'bg-transparent border-gray-200 text-gray-900 placeholder-gray-400'
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
                  
                  {/* カテゴリ追加用ボタン */}
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

                {/* カテゴリ追加インラインフォーム */}
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

                    {/* カラーパレット */}
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
                      {/* 日付変更用カレンダーピッカー */}
                      <div className="relative">
                        {addModalState.isFixedSchedule ? (
                          <select
                            value={addModalState.dayOfWeek}
                            onChange={e => setAddModalState(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                            className={`px-2 py-1 rounded font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] cursor-pointer transition-all ${
                              isDark 
                                ? 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-750' 
                                : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-205'
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
                                ? 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-750' 
                                : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200/80'
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
                              : isDark ? 'bg-gray-800 text-white hover:bg-gray-750' : 'bg-gray-100 text-gray-800 hover:bg-gray-200/80'
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
                              : isDark ? 'bg-gray-800 text-white hover:bg-gray-750' : 'bg-gray-100 text-gray-800 hover:bg-gray-200/80'
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

                {/* 場所を追加 */}
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

                {/* 説明を追加 */}
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
                    onClick={handleDeleteEvent}
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
          )}
        </aside>

      </div>



    </div>
  );
}
