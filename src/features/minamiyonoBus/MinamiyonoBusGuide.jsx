import { ExternalLink, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CAMPUS_BOUND_STOPS, OFFICIAL_TIMETABLE_URL, TIMETABLE_REVISION } from './timetable';

const toMinutes = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const getUpcoming = (times, now) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return times.filter((time) => toMinutes(time) >= nowMinutes).slice(0, 3);
};

const getTimesForDay = (stop, dayType) => {
  if (dayType === 'weekday') return stop.weekday;
  if (dayType === 'saturday') return stop.saturday || stop.weekend;
  return stop.holiday || stop.weekend;
};

const getSeibuTimesForDay = (stop, dayType) => {
  if (dayType === 'weekday') return stop.seibuWeekday || [];
  if (dayType === 'saturday') return stop.seibuSaturday || stop.seibuWeekend || [];
  return stop.seibuHoliday || stop.seibuWeekend || [];
};

const getKokusaiTimesForDay = (stop, dayType, times, seibuTimes) => {
  const explicitTimes = dayType === 'weekday'
    ? stop.kokusaiWeekday
    : (dayType === 'saturday' ? stop.kokusaiSaturday || stop.kokusaiWeekend : stop.kokusaiHoliday || stop.kokusaiWeekend);
  return explicitTimes || times.filter((time) => !seibuTimes.includes(time));
};

export default function MinamiyonoBusGuide({ now, isDark }) {
  const [showPast, setShowPast] = useState(false);
  const initialDayType = now.getDay() === 6 ? 'saturday' : now.getDay() === 0 ? 'holiday' : 'weekday';
  const [dayType, setDayType] = useState(initialDayType);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const stopRows = useMemo(() => CAMPUS_BOUND_STOPS.map((stop) => {
    const times = getTimesForDay(stop, dayType);
    const rawSeibuTimes = getSeibuTimesForDay(stop, dayType);
    const kokusaiTimes = getKokusaiTimesForDay(stop, dayType, times, rawSeibuTimes);
    const seibuTimes = rawSeibuTimes.filter((time) => !kokusaiTimes.includes(time));
    const operatorFor = (time) => {
      const operators = [];
      if (kokusaiTimes.includes(time)) operators.push('国');
      if (seibuTimes.includes(time)) operators.push('西');
      return operators.join('・') || '—';
    };
    const platformFor = (operator) => stop.platformByOperator?.[operator] || '';
    return { ...stop, times, operatorFor, platformFor, upcoming: getUpcoming(times, now) };
  }), [dayType, now]);
  const fastestTime = stopRows
    .map((stop) => stop.upcoming[0])
    .filter(Boolean)
    .sort((a, b) => toMinutes(a) - toMinutes(b))[0];
  const fastestStop = stopRows.find((stop) => stop.upcoming[0] === fastestTime) || stopRows[0];
  const selectedStop = stopRows.find((stop) => stop.id === selectedStopId) || fastestStop;
  const visibleTimes = selectedStop.times
    .sort((a, b) => toMinutes(a) - toMinutes(b))
    .filter((time) => showPast || toMinutes(time) >= nowMinutes);
  const entriesByTime = visibleTimes.map((time) => ({
    time,
    entries: [{ stop: selectedStop, operator: selectedStop.operatorFor(time) }],
  }));
  const timesByHour = entriesByTime.reduce((hours, item) => {
    const hour = item.time.slice(0, 2);
    if (!hours.has(hour)) hours.set(hour, []);
    hours.get(hour).push(item);
    return hours;
  }, new Map());
  const cardBg = isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200';

  return (
    <section className={`mt-4 rounded-2xl border p-4 sm:p-5 shadow-sm ${cardBg}`} aria-label="埼玉大学方面のバス時刻表">
      <h3 className={`border-b pb-2 text-center text-sm font-black ${isDark ? 'border-gray-800 text-gray-100' : 'border-gray-200 text-gray-800'}`}>埼玉大学方面バス 次発案内</h3>
      <div className="py-3 text-center">
        <p className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>現在時刻</p>
        <time className={`block text-4xl font-black leading-none tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-gray-950'}`}>{String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</time>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stopRows.map((stop) => <NextCard key={stop.id} title={stop.title} detail={stop.detail} upcoming={stop.upcoming} operatorFor={stop.operatorFor} active={stop.id === selectedStop.id} isDark={isDark} color={stop.color} onClick={() => { setSelectedStopId(stop.id); setShowPast(false); }} />)}
      </div>

      <div className={`mt-5 overflow-hidden rounded-xl border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`grid grid-cols-3 text-center text-xs font-black ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
          {[['weekday', '平日'], ['saturday', '土曜'], ['holiday', '日祝']].map(([key, label]) => <button key={key} onClick={() => { setDayType(key); setShowPast(false); }} className={`py-3 transition-colors ${dayType === key ? 'bg-blue-600 text-white' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200')}`}>{label}</button>)}
        </div>
        <div className={`p-3 text-center text-[10px] font-bold ${isDark ? 'bg-gray-900/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>表示中: {selectedStop.title}　　国＝国際興業　西＝西武バス　　{TIMETABLE_REVISION} / 北浦和: 2024年12月1日改正 / 志木: 2026年6月1日改正</div>
        {!showPast && <button onClick={() => setShowPast(true)} className={`w-full border-t border-dashed py-3 text-[11px] font-bold text-blue-500 ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}>◷ 過去の時刻を表示</button>}
        <div className="space-y-3 p-3">
          {[...timesByHour.entries()].map(([hour, items]) => <HourRow key={hour} hour={hour} items={items} nowMinutes={nowMinutes} isDark={isDark} />)}
          {timesByHour.size === 0 && <p className="py-5 text-center text-xs font-bold text-gray-500">本日の便は終了しました</p>}
        </div>
      </div>
    </section>
  );
}

function NextCard({ title, detail, upcoming, operatorFor, active, isDark, color = 'blue', onClick }) {
  const orange = color === 'orange';
  const border = active ? (orange ? 'border-orange-500' : 'border-blue-500') : (isDark ? 'border-gray-800' : 'border-gray-200');
  const accent = orange ? 'text-orange-500' : 'text-blue-500';
  return <button type="button" onClick={onClick} className={`rounded-xl border-2 p-3 text-left transition-colors ${border} ${isDark ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
    <p className={`flex items-center gap-1 text-xs font-black ${accent}`}><MapPin size={14} /> {title} 発</p>
    {upcoming[0] ? <><p className={`mt-2 flex items-center gap-1 text-2xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-950'}`}>{upcoming[0]} <OperatorBadge value={operatorFor(upcoming[0])} /></p><div className={`mt-2 border-t border-dashed pt-2 text-[10px] font-bold ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-600'}`}>次: {upcoming[1] || '—'} {upcoming[1] && <OperatorBadge value={operatorFor(upcoming[1])} small />}<br />次々: {upcoming[2] || '—'} {upcoming[2] && <OperatorBadge value={operatorFor(upcoming[2])} small />}</div></> : <p className="mt-4 text-xs font-bold text-gray-500">本日の便は終了</p>}
    <p className={`mt-2 text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{detail}</p>
  </button>;
}

function OperatorBadge({ value, small = false }) {
  return <span className="inline-flex items-center gap-0.5">{value.split('・').map((operator) => <span key={operator} className={`inline-flex items-center justify-center rounded border font-black leading-none ${operator === '国' ? 'operator-kokusai border-gray-950 bg-gray-950 text-white' : 'border-gray-700 bg-white text-gray-950'} ${small ? 'h-3.5 min-w-3.5 text-[8px]' : 'h-5 min-w-5 text-xs'}`}>{operator}</span>)}</span>;
}

function HourRow({ hour, items, nowMinutes, isDark }) {
  return <div><h4 className={`border-b pb-1 text-lg font-black ${isDark ? 'border-gray-700 text-white' : 'border-gray-800 text-gray-950'}`}>{Number(hour)}時</h4><div className="flex flex-wrap gap-x-3 gap-y-2 pt-2">{items.flatMap(({ time, entries }) => {
    const current = toMinutes(time) === nowMinutes;
    return entries.map(({ stop, operator }) => {
      const timeColor = operator.includes('西') ? (isDark ? 'text-blue-300' : 'text-blue-700') : (isDark ? 'text-emerald-300' : 'text-emerald-700');
      const platform = stop.platformFor(operator);
      return <span key={`${time}-${stop.id}`} title={`${stop.title}・${stop.detail}`} className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-base font-black tabular-nums ${current ? 'bg-yellow-200 text-gray-950' : timeColor}`}><span>{time.slice(3)}</span><OperatorBadge value={operator} small />{platform && <span className={`text-[10px] font-black ${current ? 'text-gray-950' : (isDark ? 'text-gray-300' : 'text-gray-600')}`}>{platform}</span>}</span>;
    });
  })}</div></div>;
}
