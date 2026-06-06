import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Calendar, Plus, CheckCircle, UploadCloud, MapPin, X, MessageSquare, Send } from 'lucide-react';
import { LESSON_COLORS, getLessonColor, parseCSV, sanitizeRoomId } from './utils';

export default function TimetableComponent({
  firestore, currentAccountId, currentUserProfile, currentRoomId,
  formatTimeAgo, showToast, openUserProfile, Avatar, isDark,
  activeTimetableLesson, clearActiveTimetableLesson,
  timetableData, setTimetableData,
  onlyModal = false
}) {
  const [lessonColors, setLessonColors] = useState(() => { try { return JSON.parse(localStorage.getItem('twitter_clone_lesson_colors')) || {}; } catch (e) { return {}; } });
  const [lessonNotes, setLessonNotes] = useState(() => { try { return JSON.parse(localStorage.getItem('twitter_clone_lesson_notes')) || {}; } catch (e) { return {}; } });
  const [timetables, setTimetables] = useState(() => { try { return JSON.parse(localStorage.getItem('twitter_clone_timetables')) || {}; } catch (e) { return {}; } });
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lessonModalTab, setLessonModalTab] = useState('talk');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedTermTab, setSelectedTermTab] = useState('第1ターム');
  
  const [lessonMessages, setLessonMessages] = useState([]);
  const [newLessonMessage, setNewLessonMessage] = useState('');
  const lessonTalkEndRef = useRef(null);
  const csvInputRef = useRef(null);
  const [syllabusDict, setSyllabusDict] = useState({});

  // 外部（カレンダー等）から講義選択されてジャンプしてきた場合の処理
  useEffect(() => {
    if (activeTimetableLesson) {
      if (activeTimetableLesson.term) {
        setSelectedTermTab(activeTimetableLesson.term);
      }
      setSelectedLesson(activeTimetableLesson);
      setLessonModalTab('talk');
      if (!onlyModal) {
        clearActiveTimetableLesson();
      }
    }
  }, [activeTimetableLesson, clearActiveTimetableLesson, onlyModal]);

  useEffect(() => { 
    localStorage.setItem('twitter_clone_lesson_colors', JSON.stringify(lessonColors)); 
    if (currentAccountId && firestore) {
      const docRef = collection(firestore, `users`);
      setDoc(doc(firestore, `users/${currentAccountId}/timetable/data`), { colors: lessonColors }, { merge: true })
        .catch(err => console.error("Failed to sync lessonColors to Firestore:", err));
    }
  }, [lessonColors, currentAccountId, firestore]);
  useEffect(() => { localStorage.setItem('twitter_clone_lesson_notes', JSON.stringify(lessonNotes)); }, [lessonNotes]);

  useEffect(() => {
    fetch('/data/syllabus_dict.json')
      .then(res => res.ok && res.json())
      .then(setSyllabusDict)
      .catch(console.error);
  }, []);

  // syllabusDict がロードされた時に、既存の timetables の授業コード (code) から教室 (room) を自動補完する
  useEffect(() => {
    if (Object.keys(syllabusDict).length === 0 || Object.keys(timetables).length === 0) return;
    
    let changed = false;
    const updatedTimetables = JSON.parse(JSON.stringify(timetables));
    
    Object.keys(updatedTimetables).forEach(term => {
      const termTimetable = updatedTimetables[term];
      Object.keys(termTimetable).forEach(period => {
        if (period === 'intensive') return;
        Object.keys(termTimetable[period]).forEach(day => {
          const lesson = termTimetable[period][day];
          if (lesson && lesson.code) {
            // 全角英数字を半角大文字に正規化
            let code = lesson.code.toUpperCase().trim();
            code = code.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            
            const syllabusRoom = syllabusDict[code]?.room;
            const needsUpdate = !lesson.room || 
                                lesson.room === '教室未設定' || 
                                lesson.room === '未設定' || 
                                lesson.room === lesson.code;
            
            if (syllabusRoom && needsUpdate && lesson.room !== syllabusRoom) {
              lesson.room = syllabusRoom;
              changed = true;
            }
          }
        });
      });

      // 集中講義
      if (termTimetable.intensive && Array.isArray(termTimetable.intensive)) {
        termTimetable.intensive.forEach(lesson => {
          if (lesson && lesson.code) {
            let code = lesson.code.toUpperCase().trim();
            code = code.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            
            const syllabusRoom = syllabusDict[code]?.room;
            const needsUpdate = !lesson.room || 
                                lesson.room === '教室未設定' || 
                                lesson.room === '未設定' || 
                                lesson.room === 'オンデマンド授業' ||
                                lesson.room === lesson.code;
            
            if (syllabusRoom && needsUpdate && lesson.room !== syllabusRoom) {
              lesson.room = syllabusRoom;
              changed = true;
            }
          }
        });
      }
    });

    if (changed) {
      setTimetables(updatedTimetables);
      localStorage.setItem('twitter_clone_timetables', JSON.stringify(updatedTimetables));
      if (setTimetableData) {
        setTimetableData(updatedTimetables);
      }
    }
  }, [syllabusDict, timetables]);

  useEffect(() => {
    if (!selectedLesson || lessonModalTab !== 'talk' || !currentRoomId) return;
    const unsub = onSnapshot(collection(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/lessonTalks/${sanitizeRoomId(selectedLesson.name)}/messages`), (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.timestamp - b.timestamp);
      setLessonMessages(msgs);
    });
    return () => unsub();
  }, [selectedLesson, lessonModalTab, currentRoomId, firestore]);

  useEffect(() => { if (lessonModalTab === 'talk') lessonTalkEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lessonMessages, lessonModalTab]);

  const handleNoteChange = (lessonName, field, value) => {
    setLessonNotes(prev => ({ ...prev, [lessonName]: { ...(prev[lessonName] || { todo: '', memo: '' }), [field]: value } }));
  };

  const handleSendLessonMessage = async (e) => {
    e.preventDefault();
    if (!newLessonMessage.trim() || !currentUserProfile || !selectedLesson) return;
    try {
      await addDoc(collection(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/lessonTalks/${sanitizeRoomId(selectedLesson.name)}/messages`), {
        authorId: currentAccountId, authorName: currentUserProfile.name, authorAvatarUrl: currentUserProfile.avatarUrl || null, authorColor: currentUserProfile.avatarColor, content: newLessonMessage, timestamp: Date.now()
      });
      setNewLessonMessage('');
    } catch (err) { showToast('❌ メッセージの送信に失敗しました'); }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Shift_JIS と UTF-8 の両対応のための読み込みヘルパー
    const tryParse = (encoding) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target.result;
            const data = parseCSV(text);

            // 文字化けチェック（UTF-8でShift_JISを読んだ場合、またはその逆で文字化け「\uFFFD」が入るのを検出）
            const hasTrash = text.includes('\uFFFD');
            
            // 日本語の曜日ヘッダー（部分一致も含む）が最低限存在するかチェック
            const hasJapaneseDays = text.includes('月') && text.includes('火');
            const hasPeriodLabel = text.includes('限');

            if (hasTrash || !hasJapaneseDays || !hasPeriodLabel) {
              throw new Error("エンコーディング不一致またはヘッダー未検出");
            }
            resolve({ text, data });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("ファイル読み込みエラー"));
        reader.readAsText(file, encoding);
      });
    };

    // まず UTF-8 でパースを試み、文字化けやフォーマット不一致があれば Shift_JIS で再試行
    tryParse('utf-8')
      .catch(() => tryParse('Shift_JIS'))
      // どちらも厳密判定で失敗した場合は、エラーメッセージを表示するために最終フォールバックとしてもう一度試す
      .catch(() => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const text = event.target.result;
              const data = parseCSV(text);
              resolve({ text, data });
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsText(file, 'utf-8');
        });
      })
      .then(({ text, data }) => {
        let detectedTerm = null;
        if (text.includes('第1ターム')) detectedTerm = '第1ターム';
        else if (text.includes('第2ターム')) detectedTerm = '第2ターム';
        else if (text.includes('第3ターム')) detectedTerm = '第3ターム';
        else if (text.includes('第4ターム')) detectedTerm = '第4ターム';

        if (!detectedTerm) {
          if (data[0] && data[0][0] && data[0][0].includes('ターム')) {
            const match = data[0][0].match(/第[1-4]ターム/);
            if (match) detectedTerm = match[0];
          }
        }
        if (!detectedTerm) detectedTerm = selectedTermTab;

        let days = [], timetable = {}, currentPeriod = null, periodRowIndex = 0;
        let parsingIntensive = false;
        const intensiveLessons = [];

        data.forEach((row) => {
          const rowStr = row.join(',');
          if (rowStr.includes('集中講義など')) {
            parsingIntensive = true;
            return;
          }

          if (parsingIntensive) {
            // ヘッダー行はスキップ
            if (row.some(c => c && (c.includes('曜日') || c.includes('コード') || c.includes('科目')))) {
              return;
            }
            if (row.length >= 4 && row[2] && row[2].trim() !== '') {
              const day = row[0]?.trim() || '他';
              const period = row[1]?.trim() || 'その他';
              const code = row[2]?.trim().toUpperCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
              
              let name = row[3]?.trim() || '';
              const halfLen = name.length / 2;
              if (name.length % 2 === 0 && name.substring(0, halfLen) === name.substring(halfLen)) {
                name = name.substring(0, halfLen);
              }

              const teacher = row[4]?.trim() || '';
              const room = row[5]?.trim() || '';
              const credit = row[6]?.trim() || '';

              // syllabusDict から room を引き当てる
              let finalRoom = room;
              if (syllabusDict[code]) {
                finalRoom = syllabusDict[code].room || room;
              }

              intensiveLessons.push({
                day,
                period,
                code,
                name,
                teacher,
                credit,
                room: finalRoom,
                isIntensive: true
              });
            }
            return;
          }

          // 「月」「火」または「月曜」「火曜」などの曜日ヘッダー部分一致対応（学務システムの仕様揺れをカバー）
          const hasMon = row.some(c => c && (c.trim() === '月' || c.trim().startsWith('Mon') || c.trim().startsWith('月曜')));
          const hasTue = row.some(c => c && (c.trim() === '火' || c.trim().startsWith('Tue') || c.trim().startsWith('火曜')));

          if (row.length > 5 && hasMon && hasTue) {
            days = row
              .map(c => c ? c.trim() : '')
              .filter(c => c === '月' || c.startsWith('月曜') || c === '火' || c.startsWith('火曜') || c === '水' || c.startsWith('水曜') || c === '木' || c.startsWith('木曜') || c === '金' || c.startsWith('金曜'))
              .map(c => c.charAt(0)); // 「月曜日」->「月」に標準化
          } else if (days.length > 0 && row[0] && row[0].includes('限')) {
            let periodStr = row[0].replace('限', '').trim();
            // 全角数字を半角数字に自動変換
            periodStr = periodStr.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            currentPeriod = periodStr;
            if (!timetable[currentPeriod]) timetable[currentPeriod] = {};

            // 1. 時限の行から授業コードを取得して初期化
            days.forEach((day, i) => {
              const cellValue = row[i + 1]?.trim();
              if (cellValue && cellValue !== '未登録' && cellValue !== '未選択' && cellValue !== '未設定') {
                if (!timetable[currentPeriod][day]) {
                  timetable[currentPeriod][day] = { day, period: currentPeriod };
                }
                
                // 全角英数字を半角大文字に正規化
                let code = cellValue.toUpperCase();
                code = code.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                
                timetable[currentPeriod][day].code = code;
                
                // syllabusDict から room を引き当てる
                if (syllabusDict[code]) {
                  timetable[currentPeriod][day].room = syllabusDict[code].room;
                } else {
                  timetable[currentPeriod][day].room = '';
                }
              }
            });

            periodRowIndex = 0;
          } else if (currentPeriod && days.length > 0) {
            days.forEach((day, i) => {
              const cellValue = row[i + 1]?.trim();
              // セルが空でなく、無効な値でない場合のみ処理
              if (cellValue && cellValue !== '未登録' && cellValue !== '未選択' && cellValue !== '未設定') {
                if (!timetable[currentPeriod][day]) {
                  timetable[currentPeriod][day] = { day, period: currentPeriod };
                }

                if (periodRowIndex === 0) {
                  // 1行目: 講義名
                  let name = cellValue;
                  const halfLen = name.length / 2;
                  if (name.length % 2 === 0 && name.substring(0, halfLen) === name.substring(halfLen)) {
                    name = name.substring(0, halfLen);
                  }
                  timetable[currentPeriod][day].name = name;
                } else if (periodRowIndex === 1) {
                  // 2行目: 担当教員名
                  timetable[currentPeriod][day].teacher = cellValue;
                } else if (periodRowIndex === 2) {
                  // 3行目: 単位数
                  timetable[currentPeriod][day].credit = cellValue;
                }
              }
            });
            periodRowIndex++;
          }
        });

        if (intensiveLessons.length > 0) {
          timetable.intensive = intensiveLessons;
        }

        if (Object.keys(timetable).length === 0) {
          throw new Error("フォーマットが違います（時間割データまたは曜日・時限ヘッダーが検出されませんでした）");
        }
        const newTimetables = { ...timetables, [detectedTerm]: timetable };
        setTimetables(newTimetables);
        localStorage.setItem('twitter_clone_timetables', JSON.stringify(newTimetables));
        if (setTimetableData) {
          setTimetableData(newTimetables);
        }
        showToast(`✅ ${detectedTerm} の時間割を読み込みました`);
      })
      .catch((err) => {
        alert("CSVの読み込みに失敗しました。" + err.message);
      })
      .finally(() => {
        if (csvInputRef.current) csvInputRef.current.value = '';
      });
  };

  const PERIOD_TIMES = {
    1: "9:00\n10:30",
    2: "10:40\n12:10",
    3: "13:00\n14:30",
    4: "14:40\n16:10",
    5: "16:20\n17:50"
  };

  if (onlyModal) {
    if (!selectedLesson) return null;
    const color = getLessonColor(selectedLesson.name, lessonColors);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { setSelectedLesson(null); setShowColorPicker(false); if (clearActiveTimetableLesson) clearActiveTimetableLesson(); }}>
        <div className={`w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col ${color.modalBg} text-white relative transition-colors duration-300 border border-gray-700`} onClick={e => e.stopPropagation()}>
          <div className="relative pt-4 flex justify-center items-center">
            <h2 className="text-lg font-bold">{selectedLesson.isIntensive ? '集中講義・その他' : `${selectedLesson.day}曜${selectedLesson.period}限`}</h2>
            <button onClick={() => { setSelectedLesson(null); setShowColorPicker(false); if (clearActiveTimetableLesson) clearActiveTimetableLesson(); }} className="absolute right-4 text-white/80 hover:text-white transition-colors">
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="flex items-end border-b border-white/40 pb-2">
              <span className="w-16 text-sm font-semibold opacity-90 shrink-0 tracking-widest">講義</span>
              <span className="text-lg font-bold truncate">{selectedLesson.name}</span>
            </div>
            <div className="flex items-end border-b border-white/40 pb-2">
              <span className="w-16 text-sm font-semibold opacity-90 shrink-0 tracking-widest">教室</span>
              <span className="text-lg font-bold truncate">{selectedLesson.room || '未設定'}</span>
            </div>
            <div className="flex items-end border-b border-white/40 pb-2">
              <span className="w-16 text-sm font-semibold opacity-90 shrink-0 tracking-widest">担当教員</span>
              <span className="text-lg font-bold truncate">{selectedLesson.teacher || '未設定'}</span>
            </div>
            <div className="flex items-end border-b border-white/40 pb-2 space-x-8 relative">
              <div className="flex items-end">
                <span className="w-12 text-sm font-semibold opacity-90 shrink-0 tracking-widest">単位</span>
                <span className="text-lg font-bold">{selectedLesson.credit ? selectedLesson.credit.replace(/単位/g, '') : '-'}</span>
              </div>
              <div className="flex items-center pb-0.5 relative">
                <span className="text-sm font-semibold opacity-90 mr-3 tracking-widest">色</span>
                <button onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }} className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors border border-white/50 hover:bg-white/20`}><CheckCircle size={16} className="text-white keep-white" /></button>
                {showColorPicker && (
                  <div className="absolute top-8 left-0 bg-gray-900 rounded-xl shadow-2xl p-3 z-10 flex flex-wrap w-52 gap-2.5 border border-gray-700" onClick={e => e.stopPropagation()}>
                    {LESSON_COLORS.map((lc, idx) => (
                      <button key={idx} onClick={(e) => { e.stopPropagation(); setLessonColors(prev => ({ ...prev, [selectedLesson.name]: idx })); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full ${lc.modalBg} hover:scale-110 transition-transform shadow-sm ${lessonColors[selectedLesson.name] === idx ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} />
                    ))}
                    <button onClick={(e) => { e.stopPropagation(); setLessonColors(prev => { const next = { ...prev }; delete next[selectedLesson.name]; return next; }); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 hover:scale-110 transition-all flex items-center justify-center border border-gray-600 shadow-sm`} title="デフォルトに戻す"><X size={14} className="text-gray-400" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 text-white mt-2 flex flex-col">
            <div className="flex px-1 border-b border-gray-800 overflow-x-auto no-scrollbar">
              <button onClick={() => setLessonModalTab('talk')} className={`flex-1 py-3 text-[13px] font-bold px-2 whitespace-nowrap border-b-2 transition-colors ${lessonModalTab === 'talk' ? `border-current ${color.text === 'text-white keep-white' ? color.text.replace('text-white keep-white', 'text-' + color.modalBg.split('-')[1] + '-400') : color.text}` : 'border-transparent text-gray-400 hover:text-gray-200'}`}>授業トーク</button>
              <button onClick={() => setLessonModalTab('todo')} className={`flex-1 py-3 text-[13px] font-bold px-2 whitespace-nowrap border-b-2 transition-colors ${lessonModalTab === 'todo' ? `border-current ${color.text === 'text-white keep-white' ? color.text.replace('text-white keep-white', 'text-' + color.modalBg.split('-')[1] + '-400') : color.text}` : 'border-transparent text-gray-400 hover:text-gray-200'}`}>ToDo</button>
              <button onClick={() => setLessonModalTab('memo')} className={`flex-1 py-3 text-[13px] font-bold px-2 whitespace-nowrap border-b-2 transition-colors ${lessonModalTab === 'memo' ? `border-current ${color.text === 'text-white keep-white' ? color.text.replace('text-white keep-white', 'text-' + color.modalBg.split('-')[1] + '-400') : color.text}` : 'border-transparent text-gray-400 hover:text-gray-200'}`}>メモ</button>
            </div>
            <div className="p-6 pb-8 min-h-[220px]">
              {lessonModalTab === 'talk' && (
                <div className="h-full flex flex-col">
                  <div className="flex-grow overflow-y-auto mb-3 space-y-3 pr-1 max-h-[30vh] no-scrollbar">
                    {lessonMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8"><MessageSquare size={32} className="mb-2 opacity-50" /><p className="text-sm font-bold text-gray-400">まだメッセージがありません</p><p className="text-xs mt-1">一番乗りで挨拶や質問をしてみよう！</p></div>
                    ) : (
                      lessonMessages.map(msg => (
                        <div key={msg.id} className="flex space-x-2">
                          <div className="flex-shrink-0 cursor-pointer" onClick={() => { setSelectedLesson(null); if (clearActiveTimetableLesson) clearActiveTimetableLesson(); openUserProfile(msg.authorId); }}><Avatar src={msg.authorAvatarUrl} name={msg.authorName} color={msg.authorColor} size="sm" /></div>
                          <div className="flex flex-col">
                            <div className="flex items-baseline space-x-1.5"><span className="text-[11px] font-bold text-gray-300 cursor-pointer hover:underline" onClick={() => { setSelectedLesson(null); if (clearActiveTimetableLesson) clearActiveTimetableLesson(); openUserProfile(msg.authorId); }}>{msg.authorName}</span><span className="text-[9px] text-gray-500">{formatTimeAgo(msg.timestamp)}</span></div>
                            <div className="bg-gray-800 text-sm text-gray-100 p-2.5 rounded-xl rounded-tl-none inline-block border border-gray-700 mt-0.5 break-words shadow-sm">{msg.content}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={lessonTalkEndRef} />
                  </div>
                  <form onSubmit={handleSendLessonMessage} className="flex items-center space-x-2 flex-shrink-0 mt-auto pt-2 border-t border-gray-800">
                    <input type="text" value={newLessonMessage} onChange={e => setNewLessonMessage(e.target.value)} placeholder={`${selectedLesson.name}の情報を共有しよう`} className="flex-grow bg-gray-800 text-white text-sm rounded-full px-4 py-2 outline-none border border-gray-700 focus:border-blue-500 placeholder-gray-500" />
                    <button type="submit" disabled={!newLessonMessage.trim()} className="bg-blue-600 text-white keep-white p-2.5 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center flex-shrink-0"><Send size={16} className="ml-[-1px] mb-[-1px]" /></button>
                  </form>
                </div>
              )}
              {lessonModalTab === 'todo' && (<textarea value={lessonNotes[selectedLesson.name]?.todo || ''} onChange={(e) => handleNoteChange(selectedLesson.name, 'todo', e.target.value)} placeholder="この授業の課題やタスクを入力..." className="w-full flex-grow bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[150px] text-white placeholder-gray-500" />)}
              {lessonModalTab === 'memo' && (<textarea value={lessonNotes[selectedLesson.name]?.memo || ''} onChange={(e) => handleNoteChange(selectedLesson.name, 'memo', e.target.value)} placeholder="授業のメモを入力..." className="w-full flex-grow bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[150px] text-white placeholder-gray-500" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pb-4 max-w-6xl mx-auto w-full flex flex-col lg:ml-0" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="flex justify-between items-center mb-4 px-4 sm:px-6 lg:px-8 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-white flex items-center">
            <Calendar size={24} className="mr-2 text-blue-500" /> MY時間割
          </h2>
          <button onClick={() => csvInputRef.current.click()} className="text-xs bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm flex items-center">
            <Plus size={14} className="mr-1" /> 追加・更新
          </button>
          <input type="file" accept=".csv" className="hidden" ref={csvInputRef} onChange={handleCsvUpload} />
        </div>



        <div className={`flex ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-1 rounded-xl mb-4 shadow-inner overflow-x-auto whitespace-nowrap mx-4 sm:mx-6 lg:mx-8 flex-shrink-0 border`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {['第1ターム', '第2ターム', '第3ターム', '第4ターム'].map(term => (
            <button
              key={term}
              onClick={() => setSelectedTermTab(term)}
              className={`flex-1 min-w-[80px] py-2 px-1 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${selectedTermTab === term ? `${isDark ? 'bg-gray-800 text-blue-400 shadow-sm' : 'bg-blue-50 text-blue-700 shadow-sm'}` : `${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}`}
            >
              {term}
              {timetables[term] && <CheckCircle size={12} className={`ml-1 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />}
            </button>
          ))}
        </div>

        {!timetables[selectedTermTab] ? (
          <div className="bg-blue-900/10 border border-blue-900/30 rounded-2xl p-8 text-center shadow-sm mt-8 mx-4 sm:mx-6 lg:mx-8">
            <div className="bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UploadCloud size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{selectedTermTab} のデータを読み込む</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              大学の履修登録状況照会からダウンロードした<br />「{selectedTermTab}のテキストファイル」を選択してください。<br />
              <span className="text-xs text-blue-400 font-semibold mt-2 inline-block bg-blue-900/30 px-2 py-1 rounded">※データはアカウントに安全に同期されます。</span>
            </p>
            <button onClick={() => csvInputRef.current.click()} className="bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold py-3 px-6 rounded-full transition-colors shadow-md active:scale-95 w-full max-w-xs">
              ファイルを選択する
            </button>
          </div>
        ) : (() => {
          const currentTimetable = timetables[selectedTermTab];
          const periods = [1, 2, 3, 4, 5];
          const activeDays = ['月', '火', '水', '木', '金'];

          return (
            <div className={`${isDark ? 'bg-gray-900 text-white' : 'bg-white text-slate-900'} sm:rounded-2xl shadow-md border-y sm:border overflow-hidden w-full flex flex-col flex-grow ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div style={{ gridTemplateColumns: `48px repeat(5, minmax(0, 1fr))` }} className={`grid border-b ${isDark ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex-shrink-0`}>
                <div className={`p-2 border-r ${isDark ? 'border-gray-800' : 'border-gray-200'}`}></div>
                {activeDays.map(day => (
                  <div key={day} className={`py-2 text-center text-[11px] sm:text-xs font-extrabold ${isDark ? 'text-gray-300 border-r border-gray-800' : 'text-slate-600 border-r border-gray-200'} last:border-r-0`}>{day}</div>
                ))}
              </div>
              <div className={`flex flex-col ${isDark ? 'bg-gray-900/80' : 'bg-white'} flex-grow`}>
                {periods.map((period, index) => (
                  <div key={period} style={{ gridTemplateColumns: `48px repeat(5, minmax(0, 1fr))` }} className={`grid flex-grow min-h-[95px] sm:min-h-[125px] ${index !== periods.length - 1 ? `border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}` : ''}`}>
                    <div className={`p-1 flex flex-col items-center justify-center border-r ${isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'} ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                      <span className={`text-base sm:text-lg font-black ${isDark ? 'text-gray-200' : 'text-slate-900'}`}>{period}</span>
                      <span className={`text-[8px] sm:text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-pre text-center mt-1 leading-tight`}>{PERIOD_TIMES[period]}</span>
                    </div>
                    {activeDays.map(day => {
                      const lesson = currentTimetable[period]?.[day];
                      return (
                        <div key={day}
                          onClick={() => {
                            if (lesson) {
                              setSelectedLesson(lesson);
                              setLessonModalTab('talk');
                            }
                          }}
                          className={`p-1 sm:p-1.5 border-r ${isDark ? 'border-gray-800' : 'border-gray-200'} last:border-r-0 transition-all flex flex-col ${lesson ? `cursor-pointer ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}` : `${isDark ? 'bg-gray-950' : 'bg-white'}`}`}>
                          {lesson && (() => {
                            const color = getLessonColor(lesson.name, lessonColors);
                            return (
                              <div className={`flex-grow w-full ${color.bg} rounded-lg sm:rounded-xl shadow-sm border ${color.border} p-1.5 sm:p-2.5 flex flex-col justify-start hover:shadow-md ${color.hoverBorder} transition-all overflow-hidden relative group`}>
                                <span className={`text-[11px] sm:text-[14px] font-extrabold ${color.text} leading-snug line-clamp-4 break-words`}>{lesson.name}</span>
                                <div className="mt-auto pt-1.5">
                                  <div className={`text-[9px] sm:text-[11.5px] ${color.text} opacity-90 flex items-start font-bold leading-tight`}>
                                    <MapPin size={10} className={`mr-0.5 sm:mr-1 sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-[2px] ${color.text === 'text-white keep-white' ? 'text-white keep-white' : 'text-gray-400'}`} />
                                    <span className="line-clamp-2 break-words">{lesson.room || '教室未設定'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {timetables[selectedTermTab] && timetables[selectedTermTab].intensive && timetables[selectedTermTab].intensive.length > 0 && (
          <div className="mt-6 mx-4 sm:mx-6 lg:mx-8">
            <h3 className="text-lg font-extrabold text-white mb-3 flex items-center">
              <Plus size={18} className="mr-1.5 text-blue-400" /> 集中講義・その他
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {timetables[selectedTermTab].intensive.map((lesson, idx) => {
                const color = getLessonColor(lesson.name, lessonColors);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setLessonModalTab('talk');
                    }}
                    className={`p-3.5 rounded-xl cursor-pointer shadow-sm border transition-all hover:scale-[1.01] active:scale-98 flex flex-col justify-between ${color.bg} ${color.border} ${color.hoverBorder} ${isDark ? 'text-white' : 'text-slate-900'}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isDark ? 'bg-black/30 text-gray-300' : 'bg-white/50 text-slate-700'}`}>
                          {lesson.period}
                        </span>
                        <span className={`text-[9px] font-bold ${color.text} opacity-80`}>
                          {lesson.credit}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold leading-snug line-clamp-2 break-all">{lesson.name}</h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-1">
                      <div className={`text-[10px] ${color.text} opacity-90 flex items-center font-bold`}>
                        <MapPin size={10} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{lesson.room || '教室未設定'}</span>
                      </div>
                      <div className={`text-[10px] ${color.text} opacity-75 flex items-center`}>
                        <span className="truncate">担当: {lesson.teacher || '未設定'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedLesson && (() => {
        const color = getLessonColor(selectedLesson.name, lessonColors);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { setSelectedLesson(null); setShowColorPicker(false); if (clearActiveTimetableLesson) clearActiveTimetableLesson(); }}>
            <div className={`w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col ${color.modalBg} text-white relative transition-colors duration-300 border border-gray-700`} onClick={e => e.stopPropagation()}>
              <div className="relative pt-4 flex justify-center items-center">
                <h2 className="text-lg font-bold">{selectedLesson.isIntensive ? '集中講義・その他' : `${selectedLesson.day}曜${selectedLesson.period}限`}</h2>
                <button onClick={() => { setSelectedLesson(null); setShowColorPicker(false); if (clearActiveTimetableLesson) clearActiveTimetableLesson(); }} className="absolute right-4 text-white/80 hover:text-white transition-colors">
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div className="flex items-end border-b border-white/40 pb-2">
                  <span className="w-16 text-sm font-semibold opacity-90 shrink-0 tracking-widest">講義</span>
                  <span className="text-lg font-bold truncate">{selectedLesson.name}</span>
                </div>
                <div className="flex items-end border-b border-white/40 pb-2">
                  <span className="w-16 text-sm font-semibold opacity-90 shrink-0 tracking-widest">教室</span>
                  <span className="text-lg font-bold truncate">{selectedLesson.room || '未設定'}</span>
                </div>
                <div className="flex items-end border-b border-white/40 pb-2">
                  <span className="w-16 text-sm font-semibold opacity-90 shrink-0 tracking-widest">担当教員</span>
                  <span className="text-lg font-bold truncate">{selectedLesson.teacher || '未設定'}</span>
                </div>
                <div className="flex items-end border-b border-white/40 pb-2 space-x-8 relative">
                  <div className="flex items-end">
                    <span className="w-12 text-sm font-semibold opacity-90 shrink-0 tracking-widest">単位</span>
                    <span className="text-lg font-bold">{selectedLesson.credit ? selectedLesson.credit.replace(/単位/g, '') : '-'}</span>
                  </div>
                  <div className="flex items-center pb-0.5 relative">
                    <span className="text-sm font-semibold opacity-90 mr-3 tracking-widest">色</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }} className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors border border-white/50 hover:bg-white/20`}><CheckCircle size={16} className="text-white keep-white" /></button>
                    {showColorPicker && (
                      <div className="absolute top-8 left-0 sm:left-auto sm:right-0 bg-gray-900 rounded-xl shadow-2xl p-3 z-10 flex flex-wrap w-52 gap-2.5 border border-gray-700" onClick={e => e.stopPropagation()}>
                        {LESSON_COLORS.map((lc, idx) => (
                          <button key={idx} onClick={(e) => { e.stopPropagation(); setLessonColors(prev => ({ ...prev, [selectedLesson.name]: idx })); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full ${lc.modalBg} hover:scale-110 transition-transform shadow-sm ${lessonColors[selectedLesson.name] === idx ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} />
                        ))}
                        <button onClick={(e) => { e.stopPropagation(); setLessonColors(prev => { const next = { ...prev }; delete next[selectedLesson.name]; return next; }); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 hover:scale-110 transition-all flex items-center justify-center border border-gray-600 shadow-sm`} title="デフォルトに戻す"><X size={14} className="text-gray-400" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 text-white mt-2 flex flex-col">
                <div className="flex px-1 border-b border-gray-800 overflow-x-auto no-scrollbar">
                  <button onClick={() => setLessonModalTab('talk')} className={`flex-1 py-3 text-[13px] font-bold px-2 whitespace-nowrap border-b-2 transition-colors ${lessonModalTab === 'talk' ? `border-current ${color.text === 'text-white keep-white' ? color.text.replace('text-white keep-white', 'text-' + color.modalBg.split('-')[1] + '-400') : color.text}` : 'border-transparent text-gray-400 hover:text-gray-200'}`}>授業トーク</button>
                  <button onClick={() => setLessonModalTab('todo')} className={`flex-1 py-3 text-[13px] font-bold px-2 whitespace-nowrap border-b-2 transition-colors ${lessonModalTab === 'todo' ? `border-current ${color.text === 'text-white keep-white' ? color.text.replace('text-white keep-white', 'text-' + color.modalBg.split('-')[1] + '-400') : color.text}` : 'border-transparent text-gray-400 hover:text-gray-200'}`}>ToDo</button>
                  <button onClick={() => setLessonModalTab('memo')} className={`flex-1 py-3 text-[13px] font-bold px-2 whitespace-nowrap border-b-2 transition-colors ${lessonModalTab === 'memo' ? `border-current ${color.text === 'text-white keep-white' ? color.text.replace('text-white keep-white', 'text-' + color.modalBg.split('-')[1] + '-400') : color.text}` : 'border-transparent text-gray-400 hover:text-gray-200'}`}>メモ</button>
                </div>
                <div className="p-6 pb-8 min-h-[220px]">
                  {lessonModalTab === 'talk' && (
                    <div className="h-full flex flex-col">
                      <div className="flex-grow overflow-y-auto mb-3 space-y-3 pr-1 max-h-[30vh] no-scrollbar">
                        {lessonMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8"><MessageSquare size={32} className="mb-2 opacity-50" /><p className="text-sm font-bold text-gray-400">まだメッセージがありません</p><p className="text-xs mt-1">一番乗りで挨拶や質問をしてみよう！</p></div>
                        ) : (
                          lessonMessages.map(msg => (
                            <div key={msg.id} className="flex space-x-2">
                              <div className="flex-shrink-0 cursor-pointer" onClick={() => { setSelectedLesson(null); openUserProfile(msg.authorId); }}><Avatar src={msg.authorAvatarUrl} name={msg.authorName} color={msg.authorColor} size="sm" /></div>
                              <div className="flex flex-col">
                                <div className="flex items-baseline space-x-1.5"><span className="text-[11px] font-bold text-gray-300 cursor-pointer hover:underline" onClick={() => { setSelectedLesson(null); openUserProfile(msg.authorId); }}>{msg.authorName}</span><span className="text-[9px] text-gray-500">{formatTimeAgo(msg.timestamp)}</span></div>
                                <div className="bg-gray-800 text-sm text-gray-100 p-2.5 rounded-xl rounded-tl-none inline-block border border-gray-700 mt-0.5 break-words shadow-sm">{msg.content}</div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={lessonTalkEndRef} />
                      </div>
                      <form onSubmit={handleSendLessonMessage} className="flex items-center space-x-2 flex-shrink-0 mt-auto pt-2 border-t border-gray-800">
                        <input type="text" value={newLessonMessage} onChange={e => setNewLessonMessage(e.target.value)} placeholder={`${selectedLesson.name}の情報を共有しよう`} className="flex-grow bg-gray-800 text-white text-sm rounded-full px-4 py-2 outline-none border border-gray-700 focus:border-blue-500 placeholder-gray-500" />
                        <button type="submit" disabled={!newLessonMessage.trim()} className="bg-blue-600 text-white keep-white p-2.5 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center flex-shrink-0"><Send size={16} className="ml-[-1px] mb-[-1px]" /></button>
                      </form>
                    </div>
                  )}
                  {lessonModalTab === 'todo' && (<textarea value={lessonNotes[selectedLesson.name]?.todo || ''} onChange={(e) => handleNoteChange(selectedLesson.name, 'todo', e.target.value)} placeholder="この授業の課題やタスクを入力..." className="w-full flex-grow bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[150px] text-white placeholder-gray-500" />)}
                  {lessonModalTab === 'memo' && (<textarea value={lessonNotes[selectedLesson.name]?.memo || ''} onChange={(e) => handleNoteChange(selectedLesson.name, 'memo', e.target.value)} placeholder="授業のメモを入力..." className="w-full flex-grow bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[150px] text-white placeholder-gray-500" />)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
