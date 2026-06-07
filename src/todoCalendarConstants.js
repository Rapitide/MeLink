// ToDoCalendar 定数・データ定義

// 埼玉大学 2026年度学年歴データ
export const ACADEMIC_EVENTS = [
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
export const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 5) {
    TIME_OPTIONS.push({ hour: h, min: m });
  }
}

// システムデフォルトのカテゴリー
export const DEFAULT_CATEGORIES = [
  { id: 'parttime', label: 'バイト', color: 'orange' },
  { id: 'circle', label: 'サークル', color: 'green' },
  { id: 'homework', label: '課題', color: 'red' },
  { id: 'other', label: 'その他', color: 'purple' }
];

// Tailwindパージ防止用のプレミアムカラーマッピング
export const COLOR_MAP = {
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
