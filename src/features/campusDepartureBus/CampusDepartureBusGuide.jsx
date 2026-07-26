import { MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';

const toMinutes = (time) => {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
};

const getDayKey = (now, holidays = []) => {
  const day = now.getDay();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (day === 0 || holidays.includes(dateStr)) return 'holiday';
  if (day === 6) return 'saturday';
  return 'weekday';
};

const labelForDay = (dayKey) => ({ weekday: '平日', saturday: '土曜', holiday: '日祝' }[dayKey]);

const getRouteTimes = (route, dayKey) => route[dayKey] || [];

const getOperator = (time) => (time.includes('●') ? '西' : '国');

const getDisplayTime = (time) => time.slice(0, 5);

const getUpcoming = (times, now) => {
  const current = now.getHours() * 60 + now.getMinutes();
  return times.filter((time) => toMinutes(time) >= current).slice(0, 3);
};

export default function CampusDepartureBusGuide({ busData, now, isDark }) {
  const holidays = busData?._meta?.holidays || [];
  const initialDayKey = getDayKey(now, holidays);
  const [dayKey, setDayKey] = useState(initialDayKey);
  const [showPast, setShowPast] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const routes = useMemo(() => (busData?.routes || []).map((route) => {
    const times = getRouteTimes(route, dayKey);
    return { ...route, times, upcoming: getUpcoming(times, now) };
  }), [busData, dayKey, now]);
  const earliest = routes.map((route) => route.upcoming[0]).filter(Boolean).sort((a, b) => toMinutes(a) - toMinutes(b))[0];
  const defaultRoute = routes.find((route) => route.upcoming[0] === earliest) || routes[0];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || defaultRoute;
  const visibleTimes = (selectedRoute?.times || [])
    .filter((time) => showPast || toMinutes(time) >= nowMinutes)
    .sort((a, b) => toMinutes(a) - toMinutes(b));
  const timesByHour = visibleTimes.reduce((hours, time) => {
    const hour = time.slice(0, 2);
    if (!hours.has(hour)) hours.set(hour, []);
    hours.get(hour).push(time);
    return hours;
  }, new Map());

  if (!busData || !selectedRoute) return null;

  const cardBg = isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200';

  return (
    <section className={`rounded-3xl border p-4 sm:p-5 lg:p-6 shadow-xl ${cardBg}`}>
      <h3 className={`border-b pb-2 text-center text-sm font-black ${isDark ? 'border-gray-800 text-gray-100' : 'border-gray-200 text-gray-800'}`}>埼大発バス 次発案内</h3>
      <div className="py-3 text-center">
        <p className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>現在時刻</p>
        <time className={`block text-4xl font-black leading-none tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-gray-950'}`}>{String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</time>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {routes.map((route) => <RouteCard key={route.id} route={route} active={route.id === selectedRoute.id} isDark={isDark} onClick={() => { setSelectedRouteId(route.id); setShowPast(false); }} />)}
      </div>

      <div className={`mt-5 overflow-hidden rounded-xl border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`grid grid-cols-3 text-center text-xs font-black ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
          {[['weekday', '平日'], ['saturday', '土曜'], ['holiday', '日祝']].map(([key, label]) => <button key={key} onClick={() => { setDayKey(key); setShowPast(false); }} className={`py-3 transition-colors ${dayKey === key ? 'bg-blue-600 text-white' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200')}`}>{label}</button>)}
        </div>
        <div className={`p-3 text-center text-[10px] font-bold ${isDark ? 'bg-gray-900/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>表示中: {selectedRoute.name}行　　国＝国際興業　西＝西武バス　　{labelForDay(dayKey)}ダイヤ</div>
        {!showPast && <button onClick={() => setShowPast(true)} className={`w-full border-t border-dashed py-3 text-[11px] font-bold text-blue-500 ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}>◷ 過去の時刻を表示</button>}
        <div className="space-y-3 p-3">
          {[...timesByHour.entries()].map(([hour, times]) => <HourRow key={hour} hour={hour} times={times} route={selectedRoute} isDark={isDark} nowMinutes={nowMinutes} />)}
          {timesByHour.size === 0 && <p className="py-5 text-center text-xs font-bold text-gray-500">本日の便は終了しました</p>}
        </div>
      </div>
    </section>
  );
}

function RouteCard({ route, active, isDark, onClick }) {
  const border = active ? 'border-blue-500' : (isDark ? 'border-gray-800' : 'border-gray-200');
  return <button type="button" onClick={onClick} className={`rounded-xl border-2 p-3 text-left transition-colors ${border} ${isDark ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
    <p className="flex items-center gap-1 text-xs font-black text-blue-500"><MapPin size={14} /> {route.name} 行き</p>
    {route.upcoming[0] ? <><p className={`mt-2 flex items-center gap-1 text-2xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-950'}`}>{getDisplayTime(route.upcoming[0])} <OperatorBadge value={getOperator(route.upcoming[0])} /></p><div className={`mt-2 border-t border-dashed pt-2 text-[10px] font-bold ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-600'}`}>次: {route.upcoming[1] ? getDisplayTime(route.upcoming[1]) : '—'} {route.upcoming[1] && <OperatorBadge value={getOperator(route.upcoming[1])} small />}<br />次々: {route.upcoming[2] ? getDisplayTime(route.upcoming[2]) : '—'} {route.upcoming[2] && <OperatorBadge value={getOperator(route.upcoming[2])} small />}</div></> : <p className="mt-4 text-xs font-bold text-gray-500">本日の便は終了</p>}
    <p className={`mt-2 text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{route.lineCode}{route.boardingStop ? ` / ${route.boardingStop}` : ''}</p>
  </button>;
}

function OperatorBadge({ value, small = false }) {
  return <span className={`inline-flex items-center justify-center rounded border font-black leading-none ${value === '国' ? 'operator-kokusai border-gray-950 bg-gray-950 text-white' : 'border-gray-700 bg-white text-gray-950'} ${small ? 'h-3.5 min-w-3.5 text-[8px]' : 'h-5 min-w-5 text-xs'}`}>{value}</span>;
}

function HourRow({ hour, times, route, isDark, nowMinutes }) {
  return <div><h4 className={`border-b pb-1 text-lg font-black ${isDark ? 'border-gray-700 text-white' : 'border-gray-800 text-gray-950'}`}>{Number(hour)}時</h4><div className="flex flex-wrap gap-x-3 gap-y-2 pt-2">{times.map((time) => {
    const operator = getOperator(time);
    const current = toMinutes(time) === nowMinutes;
    const timeColor = operator === '西' ? (isDark ? 'text-blue-300' : 'text-blue-700') : (isDark ? 'text-emerald-300' : 'text-emerald-700');
    return <span key={`${route.id}-${time}`} className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-base font-black tabular-nums ${current ? 'bg-yellow-200 text-gray-950' : timeColor}`}><span>{getDisplayTime(time).slice(3)}</span><OperatorBadge value={operator} small />{time.includes('市') && <span className={`text-[10px] ${current ? 'text-gray-950' : (isDark ? 'text-gray-300' : 'text-gray-600')}`}>市</span>}</span>;
  })}</div></div>;
}
