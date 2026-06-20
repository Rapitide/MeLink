import React from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Music, Book, Gamepad2, AlertTriangle, Bus, Calendar, Megaphone, CalendarDays, Map } from 'lucide-react';

// --- 定数定義 ---
export const VERIFIED_USERS = ['管理者', 'admin'];
export const VETERAN_USERS = ['rptied', 'bird7tarou', 'esther', 'ururu', 'yukia060307', 'milksour', 'merin', 'cocos', 'tanakan', 'wolfjp'];
export const NAMING_USERS = ['merinmania'];

export const LESSON_COLORS = [
  { bg: 'bg-red-500', border: 'border-red-600', hoverBorder: 'hover:border-red-700', text: 'text-white keep-white', modalBg: 'bg-red-500' },
  { bg: 'bg-orange-500', border: 'border-orange-600', hoverBorder: 'hover:border-orange-700', text: 'text-white keep-white', modalBg: 'bg-orange-500' },
  { bg: 'bg-amber-500', border: 'border-amber-600', hoverBorder: 'hover:border-amber-700', text: 'text-white keep-white', modalBg: 'bg-amber-500' },
  { bg: 'bg-green-500', border: 'border-green-600', hoverBorder: 'hover:border-green-700', text: 'text-white keep-white', modalBg: 'bg-green-500' },
  { bg: 'bg-emerald-500', border: 'border-emerald-600', hoverBorder: 'hover:border-emerald-700', text: 'text-white keep-white', modalBg: 'bg-emerald-500' },
  { bg: 'bg-cyan-500', border: 'border-cyan-600', hoverBorder: 'hover:border-cyan-700', text: 'text-white keep-white', modalBg: 'bg-cyan-500' },
  { bg: 'bg-blue-500', border: 'border-blue-600', hoverBorder: 'hover:border-blue-700', text: 'text-white keep-white', modalBg: 'bg-blue-500' },
  { bg: 'bg-indigo-500', border: 'border-indigo-600', hoverBorder: 'hover:border-indigo-700', text: 'text-white keep-white', modalBg: 'bg-indigo-500' },
  { bg: 'bg-violet-500', border: 'border-violet-600', hoverBorder: 'hover:border-violet-700', text: 'text-white keep-white', modalBg: 'bg-violet-500' },
  { bg: 'bg-pink-500', border: 'border-pink-600', hoverBorder: 'hover:border-pink-700', text: 'text-white keep-white', modalBg: 'bg-pink-500' },
  { bg: 'bg-rose-500', border: 'border-rose-600', hoverBorder: 'hover:border-rose-700', text: 'text-white keep-white', modalBg: 'bg-rose-500' }
];

export const DEFAULT_LESSON_COLOR = {
  bg: 'bg-gray-800', border: 'border-gray-700', hoverBorder: 'hover:border-gray-600', text: 'text-gray-300', modalBg: 'bg-gray-800'
};

export const getLessonColor = (lessonName, customColors = {}) => {
  if (!lessonName) return DEFAULT_LESSON_COLOR;
  return customColors[lessonName] !== undefined ? LESSON_COLORS[customColors[lessonName]] : DEFAULT_LESSON_COLOR;
};

export const getWeatherInfo = (code) => {
  if (code === 0) return { text: '快晴', icon: Sun, color: 'text-orange-400' };
  if (code <= 2) return { text: '晴れ/曇り', icon: Sun, color: 'text-orange-300' };
  if (code === 3) return { text: '曇り', icon: Cloud, color: 'text-gray-400' };
  if (code >= 45 && code <= 48) return { text: '霧', icon: Cloud, color: 'text-gray-500' };
  if (code >= 51 && code <= 67) return { text: '雨', icon: CloudRain, color: 'text-blue-400' };
  if (code >= 71 && code <= 77) return { text: '雪', icon: CloudSnow, color: 'text-blue-200' };
  if (code >= 80 && code <= 82) return { text: 'にわか雨', icon: CloudRain, color: 'text-blue-400' };
  if (code >= 95) return { text: '雷雨', icon: CloudLightning, color: 'text-yellow-500' };
  return { text: '晴れ', icon: Sun, color: 'text-orange-400' };
};

export const formatTimeAgo = (t) => {
  if (!t) return '今';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return s + '秒前';
  if (s < 3600) return Math.floor(s / 60) + '分前';
  if (s < 86400) return Math.floor(s / 3600) + '時間前';
  if (s < 7 * 86400) return Math.floor(s / 86400) + '日前';
  const d = new Date(t);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
};

export const sanitizeRoomId = (id) => id ? id.replace(/[.#$[\]/]/g, '_') : '';
export const isValidId = (str) => /^[a-zA-Z0-9]+$/.test(str);

export const compressImage = (file, maxWidth = 400, quality = 0.6) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height = Math.round(height * (maxWidth / width)); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
};

export const parseCSV = (csvText) => {
  const normalizedText = csvText.replace(/\r\n|\r|\n/g, '\n');
  const rows = [];
  let row = [], inQuotes = false, val = '';
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < normalizedText.length && normalizedText[i + 1] === '"') { val += '"'; i++; } else inQuotes = false;
      } else val += char;
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(val); val = ''; }
      else if (char === '\n') { row.push(val); rows.push(row); row = []; val = ''; }
      else val += char;
    }
  }
  if (val !== '' || row.length > 0) { row.push(val); rows.push(row); }
  return rows;
};

export const Avatar = ({ color, name, src, size = 'md' }) => {
  const s = { xs: 'w-5 h-5 text-[10px]', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-4xl' }[size];
  if (src) return <img src={src} alt="avatar" className={`${s} rounded-lg object-cover flex-shrink-0 bg-gray-900 shadow-sm`} />;
  const initial = (typeof name === 'string' && name.length > 0) ? name.charAt(0) : '?';
  return <div className={`${s} rounded-lg ${color || 'bg-blue-500'} flex items-center justify-center text-white keep-white font-bold flex-shrink-0 shadow-sm`}>{initial}</div>;
};

export const SPOTS = [
  { id: 'kitaurawa_bus', name: '北浦和駅 バス列', desc: '埼大行きバスの待ち状況を教えて！' },
  { id: 'minamiyono_bus', name: '南与野駅 バス列', desc: '埼大行きバスの待ち状況を教えて！' },
  { id: 'dining_hall_1', name: '第1食堂', desc: '席の空き具合やレジ列の長さは？' },
  { id: 'dining_hall_2', name: '第2食堂', desc: '席の空き具合やレジ列の長さは？' }
];

export const LEVELS = [
  { value: 1, label: '空いてる', color: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-900/30', hoverBg: 'hover:bg-blue-900/50', border: 'border-blue-500' },
  { value: 2, label: '普通', color: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-900/30', hoverBg: 'hover:bg-green-900/50', border: 'border-green-500' },
  { value: 3, label: '混んでる', color: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-900/30', hoverBg: 'hover:bg-yellow-900/50', border: 'border-yellow-500' },
  { value: 4, label: '絶望的', color: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-900/30', hoverBg: 'hover:bg-red-900/50', border: 'border-red-500' },
];

export const FEATURE_POLL_OPTIONS = [
  { id: 'weather', label: '天気', icon: Cloud }, { id: 'school_song', label: '校歌', icon: Music },
  { id: 'library', label: '図書館', icon: Book }, { id: 'saitama_game', label: '埼大ゲーム', icon: Gamepad2 },
  { id: 'school_closure', label: '休校情報', icon: AlertTriangle }, { id: 'bus_schedule', label: 'バス時刻表', icon: Bus },
  { id: 'timetable', label: 'MY時間割', icon: Calendar }, { id: 'important_notice', label: '大学お知らせ', icon: Megaphone },
  { id: 'academic_calendar', label: '学事歴', icon: CalendarDays }, { id: 'campus_map', label: 'キャンパス地図', icon: Map },
];

export function encodeFirestoreFieldKey(value) {
  return String(value)
    .replaceAll('.', '_dot_')
    .replaceAll('/', '_slash_')
    .replaceAll('[', '_lb_')
    .replaceAll(']', '_rb_')
    .replaceAll('*', '_ast_');
}
