import React, { useState, useEffect, useRef, useMemo, Suspense, Component } from 'react';
import {
  Home, Bell, Mail, User as UserIcon, MoreHorizontal,
  MessageCircle, Heart, Feather, Trash2, X, CheckCircle, LogIn, UserPlus, Edit2, Image as ImageIcon, ArrowLeft, Camera, Hash, Plus, Loader2, AlertCircle, Bookmark, BadgeCheck, BookOpen, MessageSquare, Lock, Eye, EyeOff, AtSign, Star, Search as LucideSearchIcon, UploadCloud, ShieldCheck, BarChart2, Activity, MapPin, Clock, FileText, ExternalLink, Bus, Pin, Cloud, Music, Book, Gamepad2, AlertTriangle, Calendar, Megaphone, CalendarDays, Map, Lightbulb, Sun, CloudRain, CloudSnow, CloudLightning, Send, Moon, Coffee, Utensils, Zap, GraduationCap, MonitorPlay, Globe, Library, CheckSquare, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, deleteField, getCountFromServer, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

import CampusMapComponent from './CampusMap';
import AuthScreen from './AuthScreen';
import CommunityComponent, { PostItem } from './Community';
import { BadgeModal, FollowListModal, RoomModal, ProfileEditModal, TermsModal, ProfileSettingsModal } from './Modals';
import TimetableComponent from './Timetable';
import ToDoCalendarComponent from './ToDoCalendar';
import { VERIFIED_USERS, VETERAN_USERS, NAMING_USERS, LESSON_COLORS, DEFAULT_LESSON_COLOR, getLessonColor, getWeatherInfo, formatTimeAgo, sanitizeRoomId, isValidId, compressImage, parseCSV, Avatar, SPOTS, LEVELS, FEATURE_POLL_OPTIONS, encodeFirestoreFieldKey } from './utils';

const DEFAULT_BOARD_ROOM = sanitizeRoomId('埼玉大学全体');

// --- Firebase設定 ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

const getNextBuses = (route, now, holidays = []) => {
  const day = now.getDay();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const isHoliday = day === 0 || holidays.includes(dateStr);

  let scheduleType = 'weekday';
  if (isHoliday) scheduleType = 'holiday';
  else if (day === 6) scheduleType = 'saturday';
  const schedule = route[scheduleType] || [];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const upcomingBuses = [];

  for (const timeStr of schedule) {
    const match = timeStr.match(/^(\d{2}):(\d{2})(.*)$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const suffix = match[3];
      const totalMinutes = hour * 60 + minute;

      if (totalMinutes >= currentTotalMinutes) {
        upcomingBuses.push({
          hour,
          minute,
          suffix,
          timeStr: `${match[1]}:${match[2]}`,
          diffMinutes: totalMinutes - currentTotalMinutes,
          isSeibu: suffix.includes('●')
        });
        if (upcomingBuses.length === 2) break;
      }
    }
  }
  return upcomingBuses;
};

// --- ToDoタブのエラー境界 (白画面クラッシュ防止) ---
class ToDoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ToDoCalendar render error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`p-6 sm:p-8 text-center min-h-[60vh] flex flex-col items-center justify-center transition-colors duration-300 ${this.props.isDark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
          <div className={`p-6 sm:p-8 rounded-3xl border max-w-md w-full shadow-2xl transition-colors duration-300 ${this.props.isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-base sm:text-lg font-black mb-3">ToDoの読み込みに失敗しました</h2>
            <p className="text-[11px] sm:text-xs font-bold mb-4 opacity-70 leading-relaxed text-left">
              読み込み中に予期せぬエラーが発生しました。お手数ですが、ブラウザのキャッシュ消去やページの再読み込みをお試しいただくか、以下のエラー内容をお知らせください：
            </p>
            <pre className="bg-black/40 p-4 rounded-2xl text-[10px] font-mono text-red-400 overflow-x-auto text-left max-h-36 whitespace-pre-wrap select-all border border-red-500/10">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white keep-white font-bold rounded-2xl transition-all text-xs active:scale-95 shadow-md shadow-blue-500/20"
            >
              再読み込みを試みる
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function MainApp() {
  const navigate = useNavigate();
  const [activeTimetableLesson, setActiveTimetableLesson] = useState(null);
  const [user, setUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    try {
      return !!localStorage.getItem('twitter_clone_current_id');
    } catch (e) {
      return false;
    }
  });
  const [currentAccountId, setCurrentAccountId] = useState(localStorage.getItem('twitter_clone_current_id') || '');
  const [currentRoomId, setCurrentRoomId] = useState(localStorage.getItem('twitter_clone_room_id') || sanitizeRoomId("埼玉大学全体"));
  const [availableRooms, setAvailableRooms] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('twitter_clone_available_rooms'));
      return Array.isArray(cached) && cached.length > 0 ? cached : [DEFAULT_BOARD_ROOM];
    } catch (e) {
      return [DEFAULT_BOARD_ROOM];
    }
  });
  const localRoomsMigratedRef = useRef(false);

  const [loginForm, setLoginForm] = useState({ name: '', userId: '', password: '', rememberMe: true, avatarUrl: '' });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState('terms');

  const [toastMessage, setToastMessage] = useState("");
  const [currentBottomTab, setCurrentBottomTab] = useState('ホーム');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState('おすすめ');
  const [timetableData, setTimetableData] = useState(() => { try { return JSON.parse(localStorage.getItem('twitter_clone_timetables')) || {}; } catch (e) { return {}; } });

  // timetableData が変更されたら自動的に Firestore および localStorage に保存する
  useEffect(() => {
    try {
      localStorage.setItem('twitter_clone_timetables', JSON.stringify(timetableData));
    } catch (e) {}

    if (currentAccountId && firestore && Object.keys(timetableData).length > 0) {
      const docRef = doc(firestore, `users/${currentAccountId}/timetable/data`);
      const savedColors = (() => {
        try {
          return JSON.parse(localStorage.getItem('twitter_clone_lesson_colors')) || {};
        } catch (e) {
          return {};
        }
      })();
      setDoc(docRef, { 
        timetables: timetableData,
        colors: savedColors
      }, { merge: true }).catch(err => console.error("Failed to sync timetableData to Firestore:", err));
    }
  }, [timetableData, currentAccountId]);

  // ログイン時に Firestore から時間割データ（および授業カラー）をロードして自動同期する
  useEffect(() => {
    if (currentAccountId && firestore) {
      const docRef = doc(firestore, `users/${currentAccountId}/timetable/data`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.timetables && JSON.stringify(data.timetables) !== JSON.stringify(timetableData)) {
            setTimetableData(data.timetables);
            try {
              localStorage.setItem('twitter_clone_timetables', JSON.stringify(data.timetables));
            } catch (e) {}
          }
          if (data.colors) {
            try {
              localStorage.setItem('twitter_clone_lesson_colors', JSON.stringify(data.colors));
            } catch (e) {}
          }
        }
      });
      return () => unsubscribe();
    }
  }, [currentAccountId]);

  const [following, setFollowing] = useState({});
  const [followers, setFollowers] = useState({});
  const [userBookmarks, setUserBookmarks] = useState({});

  const [posts, setPosts] = useState([]);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [viewingFollowers, setViewingFollowers] = useState({});
  const [viewingFollowing, setViewingFollowing] = useState({});

  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [lastSeenNotifTime, setLastSeenNotifTime] = useState(Number(localStorage.getItem('last_seen_notif_time')) || 0);

  const [profileTab, setProfileTab] = useState('posts');
  const [isLoading, setIsLoading] = useState(false);
  const [postLimit, setPostLimit] = useState(200);

  const [featurePollVotes, setFeaturePollVotes] = useState({});
  const [congestionData, setCongestionData] = useState({});
  const [totalUserCount, setTotalUserCount] = useState(0);

  const [badgeModal, setBadgeModal] = useState({ isOpen: false, type: null });
  const [followModal, setFollowModal] = useState({ isOpen: false, title: '' });
  const [followListUsers, setFollowListUsers] = useState([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState('');

  const [editForm, setEditForm] = useState({ name: '', bio: '', avatarUrl: '', headerUrl: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ userId: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [verifiedUsers, setVerifiedUsers] = useState(VERIFIED_USERS);
  const [veteranUsers, setVeteranUsers] = useState(VETERAN_USERS);
  const [namingUsers, setNamingUsers] = useState(NAMING_USERS);

  const [weatherData, setWeatherData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCongestion, setShowCongestion] = useState(false);
  const [busData, setBusData] = useState(null);
  const [activeBusRouteIndex, setActiveBusRouteIndex] = useState(0);
  const busCarouselRef = useRef(null);
  const [cafeteriaTab, setCafeteriaTab] = useState(null);

  const [isDark, setIsDark] = useState(() => {
    try { const saved = localStorage.getItem('twitter_clone_theme'); return saved !== null ? JSON.parse(saved) : true; } catch (e) { return true; }
  });

  // 🌟 ホーム画面に追加プロンプトの表示状態
  const [showPwaPrompt, setShowPwaPrompt] = useState(() => {
    try {
      return localStorage.getItem('hide_pwa_prompt') !== 'true';
    } catch (e) {
      return true;
    }
  });

  const headerInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const isAdmin = currentAccountId === '管理者';

  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(""), 3000); };

  async function registerPublicRoom(roomName, createdBy) {
    const roomSafe = sanitizeRoomId(roomName);
    if (!roomSafe) return;
    try {
      const boardRef = doc(firestore, 'globalData/boardRooms');
      const snap = await getDoc(boardRef);
      if (snap.exists() && snap.data().rooms?.[roomSafe]) return;
      await setDoc(boardRef, {
        rooms: { [roomSafe]: { createdAt: Date.now(), createdBy: createdBy || 'unknown' } },
      }, { merge: true });
    } catch (err) {
      console.error('掲示板の登録に失敗しました:', err);
    }
  }

  const handleClosePwaPrompt = () => {
    setShowPwaPrompt(false);
    try {
      localStorage.setItem('hide_pwa_prompt', 'true');
    } catch (e) { }
  };

  const sortedPosts = useMemo(() => [...posts].sort((a, b) => (b.isGlobalPinned ? 1 : 0) - (a.isGlobalPinned ? 1 : 0) || b.timestamp - a.timestamp), [posts]);

  const filteredPosts = useMemo(() => {
    if (activeTab === 'フォロー中') {
      return sortedPosts.filter(p => following[p.authorId]);
    }
    if (activeTab === 'ブックマーク') {
      return sortedPosts.filter(p => userBookmarks[p.id]);
    }
    return sortedPosts;
  }, [sortedPosts, activeTab, following, userBookmarks, currentAccountId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch(err => console.error("匿名サインインに失敗:", err));
        setUser(null);
        setCurrentUserProfile(null);
        setCurrentAccountId('');
        setIsAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentAccountId || !currentRoomId) {
      setIsAuthLoading(false);
      return;
    }
    const rs = sanitizeRoomId(currentRoomId);
    const unsub = onSnapshot(doc(firestore, `rooms/${rs}/users/${currentAccountId}`), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentUserProfile({ id: snap.id, ...data });
        setEditForm({ name: data.name || '', bio: data.bio || '', avatarUrl: data.avatarUrl || '', headerUrl: data.headerUrl || '' });
      }
      setIsAuthLoading(false);
    }, (err) => {
      console.error("プロフィールの取得に失敗しました:", err);
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, [currentAccountId, currentRoomId]);

  useEffect(() => {
    const unsub = onSnapshot(doc(firestore, `globalData/featurePoll`), (snap) => { if (snap.exists()) setFeaturePollVotes(snap.data().multiVotes || {}); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(firestore, `globalData/congestion`), (snap) => { if (snap.exists()) setCongestionData(snap.data() || {}); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const boardRoomsRef = doc(firestore, 'globalData/boardRooms');
    setDoc(boardRoomsRef, {
      rooms: { [DEFAULT_BOARD_ROOM]: { createdAt: 0, createdBy: 'system' } },
    }, { merge: true }).catch(console.error);

    const unsub = onSnapshot(boardRoomsRef, (snap) => {
      const roomsMap = snap.exists() ? (snap.data().rooms || {}) : {};
      const roomIds = Object.keys(roomsMap).sort((a, b) => {
        if (a === DEFAULT_BOARD_ROOM) return -1;
        if (b === DEFAULT_BOARD_ROOM) return 1;
        return (roomsMap[b]?.createdAt || 0) - (roomsMap[a]?.createdAt || 0);
      });
      if (!roomIds.includes(DEFAULT_BOARD_ROOM)) roomIds.unshift(DEFAULT_BOARD_ROOM);
      setAvailableRooms(roomIds);
      try {
        localStorage.setItem('twitter_clone_available_rooms', JSON.stringify(roomIds));
      } catch (e) {
        console.error('Failed to cache board rooms:', e);
      }
    }, (err) => console.error('掲示板一覧の取得に失敗しました:', err));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || localRoomsMigratedRef.current) return;
    localRoomsMigratedRef.current = true;
    try {
      const local = JSON.parse(localStorage.getItem('twitter_clone_available_rooms') || '[]');
      if (Array.isArray(local)) {
        local.forEach((room) => registerPublicRoom(room, currentAccountId || 'legacy'));
      }
    } catch (e) {
      console.error('Failed to migrate local board rooms:', e);
    }
  }, [user, currentAccountId]);

  useEffect(() => {
    getCountFromServer(collection(firestore, `rooms/${sanitizeRoomId('埼玉大学全体')}/users`))
      .then(s => setTotalUserCount(s.data().count))
      .catch(() => setTotalUserCount(0));
  }, [user]);

  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "globalData/badges"), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.admin) setVerifiedUsers(Object.keys(data.admin).filter(k => data.admin[k]));
        if (data.veteran) setVeteranUsers(Object.keys(data.veteran).filter(k => data.veteran[k]));
        if (data.naming) setNamingUsers(Object.keys(data.naming).filter(k => data.naming[k]));
      } else {
        const adminMap = {};
        VERIFIED_USERS.forEach(u => { adminMap[u] = true; });
        const veteranMap = {};
        VETERAN_USERS.forEach(u => { veteranMap[u] = true; });
        const namingMap = {};
        NAMING_USERS.forEach(u => { namingMap[u] = true; });
        await setDoc(doc(firestore, "globalData/badges"), {
          admin: adminMap,
          veteran: veteranMap,
          naming: namingMap
        }).catch(console.error);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentAccountId || !currentRoomId) return;
    const rs = sanitizeRoomId(currentRoomId);
    const unsubFollows = onSnapshot(doc(firestore, `rooms/${rs}/follows/${currentAccountId}`), (snap) => { setFollowing(snap.exists() ? snap.data().targets || {} : {}); });
    const unsubFollowers = onSnapshot(doc(firestore, `rooms/${rs}/followers/${currentAccountId}`), (snap) => { setFollowers(snap.exists() ? snap.data().sources || {} : {}); });
    const unsubBookmarks = onSnapshot(doc(firestore, `rooms/${rs}/bookmarks/${currentAccountId}`), (snap) => { setUserBookmarks(snap.exists() ? snap.data().posts || {} : {}); });
    return () => { unsubFollows(); unsubFollowers(); unsubBookmarks(); };
  }, [currentAccountId, currentRoomId]);

  useEffect(() => {
    if (!currentAccountId || !currentRoomId) return;
    const rs = sanitizeRoomId(currentRoomId);
    const q = query(collection(firestore, `rooms/${rs}/notifications/${currentAccountId}/items`), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(items);
      const unread = items.filter(n => n.timestamp > lastSeenNotifTime).length;
      setUnreadNotifsCount(unread);
    });
    return () => unsub();
  }, [currentAccountId, currentRoomId, lastSeenNotifTime]);

  useEffect(() => {
    if (!currentRoomId) return;
    const rs = sanitizeRoomId(currentRoomId);
    const q = query(collection(firestore, `rooms/${rs}/posts`), orderBy('timestamp', 'desc'), limit(postLimit));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentRoomId, postLimit]);

  useEffect(() => {
    if (viewingProfileId && currentRoomId) {
      const rs = sanitizeRoomId(currentRoomId);
      const unsubProfile = onSnapshot(doc(firestore, `rooms/${rs}/users/${viewingProfileId}`), (snap) => { if (snap.exists()) setViewingUserProfile({ id: snap.id, ...snap.data() }); });
      const unsubFollows = onSnapshot(doc(firestore, `rooms/${rs}/follows/${viewingProfileId}`), (snap) => { setViewingFollowing(snap.exists() ? snap.data().targets || {} : {}); });
      const unsubFollowers = onSnapshot(doc(firestore, `rooms/${rs}/followers/${viewingProfileId}`), (snap) => { setViewingFollowers(snap.exists() ? snap.data().sources || {} : {}); });
      return () => { unsubProfile(); unsubFollows(); unsubFollowers(); };
    }
  }, [viewingProfileId, currentRoomId]);

  // プロフィール用：対象ユーザーの全投稿をlimitなしで取得
  const [profilePosts, setProfilePosts] = useState([]);
  const profilePostsTargetId = useMemo(() => {
    if (currentBottomTab === 'プロフィール' && currentAccountId) return currentAccountId;
    if (currentBottomTab === 'コミュニティ' && activeTab === 'プロフィール' && viewingProfileId) return viewingProfileId;
    return null;
  }, [currentBottomTab, currentAccountId, activeTab, viewingProfileId]);

  useEffect(() => {
    if (!profilePostsTargetId || !currentRoomId) { setProfilePosts([]); return; }
    setProfilePosts([]);
    const rs = sanitizeRoomId(currentRoomId);
    const q = query(collection(firestore, `rooms/${rs}/posts`), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setProfilePosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.authorId === profilePostsTargetId));
    });
    return () => unsub();
  }, [profilePostsTargetId, currentRoomId]);

  useEffect(() => {
    const fetchWeather = () => {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=35.8643&longitude=139.6068&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo')
        .then(res => res.json()).then(data => {
          if (data?.current_weather) setWeatherData({
            temp: data.current_weather.temperature, maxTemp: Math.round(data.daily.temperature_2m_max[0]), minTemp: Math.round(data.daily.temperature_2m_min[0]),
            precipProb: data.daily.precipitation_probability_max[0], weathercode: data.current_weather.weathercode
          });
        }).catch(console.error);
    };
    fetchWeather();

    fetch('/data/bus_timetable.json')
      .then(res => res.json())
      .then(data => setBusData(data))
      .catch(console.error);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    const weatherInterval = setInterval(fetchWeather, 600000);
    return () => { clearInterval(timer); clearInterval(weatherInterval); };
  }, []);

  // ダークモード状態をlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem('twitter_clone_theme', JSON.stringify(isDark));
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('twitter_clone_theme', JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    if (currentAccountId) {
      localStorage.setItem('twitter_clone_current_id', currentAccountId);
    } else {
      localStorage.removeItem('twitter_clone_current_id');
    }
  }, [currentAccountId]);

  useEffect(() => {
    if (currentRoomId) localStorage.setItem('twitter_clone_room_id', currentRoomId);
  }, [currentRoomId]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!user) { setErrorMessage("サーバーに接続されていません。"); return; }
    const { name, userId, password, rememberMe, avatarUrl } = loginForm;
    if (!name || !userId || !password) return;
    if (userId === '管理者' && password !== import.meta.env.VITE_ADMIN_PASSWORD) { setErrorMessage("パスワードが間違っています。"); return; }
    if (userId !== '管理者' && !isValidId(userId)) { setErrorMessage("ユーザーIDは半角英数字のみ。"); return; }
    if (!isValidId(password)) { setErrorMessage("パスワードは半角英数字のみ。"); return; }
    setIsSubmitting(true); setErrorMessage("");
    try {
      const userRef = doc(firestore, `rooms/${sanitizeRoomId("埼玉大学全体")}/users/${userId}`);
      const snap = await getDoc(userRef);
      if (snap.exists()) { setErrorMessage('このユーザーIDは既に使われています。'); setIsSubmitting(false); return; }
      const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500'];
      await setDoc(userRef, { id: userId, name, password, handle: `@${userId}`, avatarColor: colors[Math.floor(Math.random() * colors.length)], bio: '', avatarUrl: avatarUrl || '', headerUrl: '' });
      if (rememberMe) { localStorage.setItem('saved_user_id', userId); localStorage.setItem('saved_password', password); }
      else { localStorage.removeItem('saved_user_id'); localStorage.removeItem('saved_password'); }
      addRoomToHistory(sanitizeRoomId("埼玉大学全体"));
      setCurrentAccountId(userId); setViewingProfileId(userId); setCurrentRoomId(sanitizeRoomId("埼玉大学全体"));
    } catch (err) {
      console.error("登録エラー:", err);
      setErrorMessage(`登録に失敗しました: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!user) { setErrorMessage("サーバーに接続されていません。"); return; }
    const { userId, password, rememberMe } = loginForm;
    if (!userId || !password) return;
    if (userId === '管理者' && password !== import.meta.env.VITE_ADMIN_PASSWORD) { setErrorMessage("パスワードが間違っています。"); return; }
    if (userId !== '管理者' && !isValidId(userId)) { setErrorMessage("ユーザーIDは半角英数字のみ。"); return; }
    if (!isValidId(password)) { setErrorMessage("パスワードは半角英数字のみ。"); return; }
    setIsSubmitting(true); setErrorMessage("");
    try {
      const userRef = doc(firestore, `rooms/${sanitizeRoomId("埼玉大学全体")}/users/${userId}`);
      const snap = await getDoc(userRef);
      if (!snap.exists()) { setErrorMessage('ユーザーが見つかりません。'); setIsSubmitting(false); return; }
      if (userId !== '管理者' && snap.data().password !== undefined && snap.data().password !== password) { setErrorMessage('パスワードが間違っています。'); setIsSubmitting(false); return; }
      if (rememberMe) { localStorage.setItem('saved_user_id', userId); localStorage.setItem('saved_password', password); }
      else { localStorage.removeItem('saved_user_id'); localStorage.removeItem('saved_password'); }
      addRoomToHistory(sanitizeRoomId("埼玉大学全体"));
      setCurrentAccountId(userId); setViewingProfileId(userId); setCurrentRoomId(sanitizeRoomId("埼玉大学全体"));
    } catch (err) { setErrorMessage(`ログインに失敗しました。`); } finally { setIsSubmitting(false); }
  };

  const switchRoom = async (roomName) => {
    if (!currentAccountId) return;
    const roomSafe = sanitizeRoomId(roomName);
    try {
      const userRef = doc(firestore, `rooms/${roomSafe}/users/${currentAccountId}`);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        let profileData = currentUserProfile;
        if (!profileData) {
          const mainRef = doc(firestore, `rooms/${sanitizeRoomId("埼玉大学全体")}/users/${currentAccountId}`);
          const mainSnap = await getDoc(mainRef);
          if (!mainSnap.exists()) {
            alert('プロフィールの取得に失敗しました。再ログインしてください。');
            return;
          }
          profileData = { id: mainSnap.id, ...mainSnap.data() };
        }
        const { id: _id, ...profileFields } = profileData;
        await setDoc(userRef, { id: currentAccountId, ...profileFields });
      }
    } catch (error) {
      console.error('掲示板の切り替えに失敗しました:', error);
      alert('掲示板の切り替えに失敗しました。');
      return;
    }
    addRoomToHistory(roomSafe);
    setCurrentRoomId(roomSafe);
    setIsRoomModalOpen(false);
    setNewRoomForm('');
    setCurrentBottomTab('コミュニティ');
    setActiveTab('おすすめ');
    window.scrollTo(0, 0);
  };

  const handleCreateNewRoom = async (e) => { e.preventDefault(); if (newRoomForm.trim()) await switchRoom(sanitizeRoomId(newRoomForm.trim())); };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentAccountId || !currentRoomId || isUpdatingProfile) return;
    if (!editForm.name.trim()) {
      alert("ユーザーネームを入力してください。");
      return;
    }
    const updateData = {
      name: editForm.name,
      bio: editForm.bio,
      avatarUrl: editForm.avatarUrl,
      headerUrl: editForm.headerUrl
    };

    setIsUpdatingProfile(true);
    try {
      const roomsToUpdate = Array.from(new Set([sanitizeRoomId("埼玉大学全体"), ...availableRooms.map(sanitizeRoomId)]));
      
      await Promise.all(roomsToUpdate.map(async (room) => {
        const uRef = doc(firestore, `rooms/${room}/users/${currentAccountId}`);
        const snap = await getDoc(uRef);
        if (snap.exists()) {
          await updateDoc(uRef, updateData);
        }
      }));

      setIsProfileModalOpen(false);
      alert("プロフィールを更新しました。");
    } catch (err) {
      console.error(err);
      alert("更新に失敗しました");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateSettings = async (e, type = 'all') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentAccountId || isUpdatingSettings) return;

    const newUserId = type === 'password' ? currentAccountId : settingsForm.userId.trim();
    const newPassword = type === 'username' ? '' : settingsForm.newPassword;

    if (type !== 'password' && !newUserId) {
      alert("ユーザーネームを入力してください。");
      return;
    }
    if (type !== 'password' && !isValidId(newUserId)) {
      alert("ユーザーネームは半角英数字のみにしてください。");
      return;
    }

    if (type === 'password') {
      const currentDbPassword = currentUserProfile?.password || '';
      if (settingsForm.currentPassword !== currentDbPassword) {
        alert("現在のパスワードが間違っています。");
        return;
      }
      if (!newPassword) {
        alert("新しいパスワードを入力してください。");
        return;
      }
      if (newPassword !== settingsForm.confirmPassword) {
        alert("新しいパスワードと確認用パスワードが一致しません。");
        return;
      }
    }

    if (type !== 'username' && newPassword && !isValidId(newPassword)) {
      alert("パスワードは半角英数字のみにしてください。");
      return;
    }

    setIsUpdatingSettings(true);

    try {
      const isIdChanged = newUserId !== currentAccountId;

      const rooms = Array.from(new Set([sanitizeRoomId("埼玉大学全体"), ...availableRooms.map(sanitizeRoomId)]));

      // 1. 新しいIDが他の部屋も含めて重複していないかチェック
      if (isIdChanged) {
        const checkResults = await Promise.all(rooms.map(async (room) => {
          const checkRef = doc(firestore, `rooms/${room}/users/${newUserId}`);
          const checkSnap = await getDoc(checkRef);
          return checkSnap.exists();
        }));
        
        if (checkResults.some(exists => exists)) {
          alert("このユーザーネームは既に使われています。");
          setIsUpdatingSettings(false);
          return;
        }
      }

      if (isIdChanged) {
        // --- IDが変更される場合の移行処理 ---
        // (1) 各部屋のユーザー情報を移行
        await Promise.all(rooms.map(async (room) => {
          const oldRef = doc(firestore, `rooms/${room}/users/${currentAccountId}`);
          const newRef = doc(firestore, `rooms/${room}/users/${newUserId}`);
          
          const snap = await getDoc(oldRef);
          if (snap.exists()) {
            const data = snap.data();
            if (newPassword) {
              data.password = newPassword;
            }
            data.id = newUserId;
            data.handle = `@${newUserId}`;
            await setDoc(newRef, data);
            await deleteDoc(oldRef);
          }
        }));

        // (2) 時間割データの移行
        const oldTimetableRef = doc(firestore, `users/${currentAccountId}/timetable/data`);
        const newTimetableRef = doc(firestore, `users/${newUserId}/timetable/data`);
        const timetableSnap = await getDoc(oldTimetableRef);
        if (timetableSnap.exists()) {
          await setDoc(newTimetableRef, timetableSnap.data());
          await deleteDoc(oldTimetableRef);
        }

        // (3) カレンダーカテゴリーの移行
        const oldCatsSnap = await getDocs(collection(firestore, `users/${currentAccountId}/scheduleCategories`));
        await Promise.all(oldCatsSnap.docs.map(async (d) => {
          const newCatRef = doc(firestore, `users/${newUserId}/scheduleCategories/${d.id}`);
          await setDoc(newCatRef, d.data());
          await deleteDoc(d.ref);
        }));

        // (4) 固定スケジュールの移行
        const oldFixedSnap = await getDocs(collection(firestore, `users/${currentAccountId}/fixedSchedules`));
        await Promise.all(oldFixedSnap.docs.map(async (d) => {
          const newFixedRef = doc(firestore, `users/${newUserId}/fixedSchedules/${d.id}`);
          await setDoc(newFixedRef, d.data());
          await deleteDoc(d.ref);
        }));

        // (5) カレンダー予定の移行
        const oldTodoSnap = await getDocs(collection(firestore, `users/${currentAccountId}/todoEvents`));
        await Promise.all(oldTodoSnap.docs.map(async (d) => {
          const newTodoRef = doc(firestore, `users/${newUserId}/todoEvents/${d.id}`);
          await setDoc(newTodoRef, d.data());
          await deleteDoc(d.ref);
        }));

        // (5.5) SNS関連データ（ブックマーク、フォロー・フォロワー、投稿、いいね、返信、投票）の移行
        await Promise.all(rooms.map(async (room) => {
          // (a) ブックマークの移行
          const oldBookmarkRef = doc(firestore, `rooms/${room}/bookmarks/${currentAccountId}`);
          const newBookmarkRef = doc(firestore, `rooms/${room}/bookmarks/${newUserId}`);
          const bookmarkSnap = await getDoc(oldBookmarkRef);
          if (bookmarkSnap.exists()) {
            await setDoc(newBookmarkRef, bookmarkSnap.data());
            await deleteDoc(oldBookmarkRef);
          }

          // (b) フォロー・フォロワーデータの移行
          const oldFollowRef = doc(firestore, `rooms/${room}/follows/${currentAccountId}`);
          const newFollowRef = doc(firestore, `rooms/${room}/follows/${newUserId}`);
          const followSnap = await getDoc(oldFollowRef);
          let myFollowings = [];
          if (followSnap.exists()) {
            const data = followSnap.data();
            myFollowings = Object.keys(data.targets || {});
            await setDoc(newFollowRef, data);
            await deleteDoc(oldFollowRef);
          }

          const oldFollowerRef = doc(firestore, `rooms/${room}/followers/${currentAccountId}`);
          const newFollowerRef = doc(firestore, `rooms/${room}/followers/${newUserId}`);
          const followerSnap = await getDoc(oldFollowerRef);
          let myFollowers = [];
          if (followerSnap.exists()) {
            const data = followerSnap.data();
            myFollowers = Object.keys(data.sources || {});
            await setDoc(newFollowerRef, data);
            await deleteDoc(oldFollowerRef);
          }

          // 自分がフォローしていた各相手先の followers にある自分のIDを置換
          await Promise.all(myFollowings.map(async (targetId) => {
            const tarFollowerRef = doc(firestore, `rooms/${room}/followers/${targetId}`);
            await setDoc(tarFollowerRef, {
              sources: {
                [currentAccountId]: deleteField(),
                [newUserId]: true
              }
            }, { merge: true }).catch(console.error);
          }));

          // 自分をフォローしていた各相手先の follows にある自分のIDを置換
          await Promise.all(myFollowers.map(async (sourceId) => {
            const srcFollowRef = doc(firestore, `rooms/${room}/follows/${sourceId}`);
            await setDoc(srcFollowRef, {
              targets: {
                [currentAccountId]: deleteField(),
                [newUserId]: true
              }
            }, { merge: true }).catch(console.error);
          }));

          // (c) 投稿（ポスト）、いいね、返信、投票の置換
          const postsColRef = collection(firestore, `rooms/${room}/posts`);
          const postsSnap = await getDocs(postsColRef);
          await Promise.all(postsSnap.docs.map(async (postDoc) => {
            const postData = postDoc.data();
            let needsUpdate = false;
            const updateFields = {};

            // 自分が投稿したポストの著作者ID変更
            if (postData.authorId === currentAccountId) {
              updateFields.authorId = newUserId;
              updateFields.authorHandle = `@${newUserId}`;
              needsUpdate = true;
            }

            // 自分がいいねしたポストのIDキー置換
            if (postData.likes && postData.likes[currentAccountId]) {
              updateFields[`likes.${currentAccountId}`] = deleteField();
              updateFields[`likes.${newUserId}`] = editForm.name || postData.likes[currentAccountId];
              needsUpdate = true;
            }

            // 自分が返信した返信の作成者ID置換
            if (postData.replies) {
              const replies = postData.replies;
              let repliesUpdated = false;
              Object.entries(replies).forEach(([replyId, r]) => {
                if (r && r.authorId === currentAccountId) {
                  updateFields[`replies.${replyId}.authorId`] = newUserId;
                  repliesUpdated = true;
                }
              });
              if (repliesUpdated) {
                needsUpdate = true;
              }
            }

            // 自分が投票した投票の投票者ID置換
            if (postData.poll && postData.poll.votedUsers && postData.poll.votedUsers[currentAccountId] !== undefined) {
              const voteIndex = postData.poll.votedUsers[currentAccountId];
              updateFields[`poll.votedUsers.${currentAccountId}`] = deleteField();
              updateFields[`poll.votedUsers.${newUserId}`] = voteIndex;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await updateDoc(postDoc.ref, updateFields).catch(console.error);
            }
          }));
        }));

        // (5.6) バッジ定数（Firestore globalData/badges）の移行
        const badgesRef = doc(firestore, "globalData/badges");
        const badgesSnap = await getDoc(badgesRef);
        if (badgesSnap.exists()) {
          const bData = badgesSnap.data();
          const badgeUpdateFields = {};
          let needsBadgeUpdate = false;

          if (bData.admin && bData.admin[currentAccountId]) {
            badgeUpdateFields[`admin.${currentAccountId}`] = deleteField();
            badgeUpdateFields[`admin.${newUserId}`] = true;
            needsBadgeUpdate = true;
          }
          if (bData.veteran && bData.veteran[currentAccountId]) {
            badgeUpdateFields[`veteran.${currentAccountId}`] = deleteField();
            badgeUpdateFields[`veteran.${newUserId}`] = true;
            needsBadgeUpdate = true;
          }
          if (bData.naming && bData.naming[currentAccountId]) {
            badgeUpdateFields[`naming.${currentAccountId}`] = deleteField();
            badgeUpdateFields[`naming.${newUserId}`] = true;
            needsBadgeUpdate = true;
          }

          if (needsBadgeUpdate) {
            await updateDoc(badgesRef, badgeUpdateFields).catch(console.error);
          }
        }

        // (6) ローカル情報の更新
        localStorage.setItem('twitter_clone_current_id', newUserId);
        if (localStorage.getItem('saved_user_id')) {
          localStorage.setItem('saved_user_id', newUserId);
        }
        if (newPassword && localStorage.getItem('saved_password')) {
          localStorage.setItem('saved_password', newPassword);
        }

        setCurrentAccountId(newUserId);
        setViewingProfileId(newUserId);

      } else {
        // --- IDは変わらず、パスワードのみが変更される場合 ---
        if (newPassword) {
          await Promise.all(rooms.map(async (room) => {
            const uRef = doc(firestore, `rooms/${room}/users/${currentAccountId}`);
            const snap = await getDoc(uRef);
            if (snap.exists()) {
              await updateDoc(uRef, { password: newPassword });
            }
          }));

          if (localStorage.getItem('saved_password')) {
            localStorage.setItem('saved_password', newPassword);
          }
        }
      }

      setIsSettingsModalOpen(false);
      alert("設定を保存しました。");
    } catch (err) {
      console.error(err);
      alert("設定の保存に失敗しました。");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentAccountId) return;
    
    const confirm1 = window.confirm("本当にアカウントを消去しますか？\n時間割やスケジュールなどの全てのデータが完全に消去され、復旧することはできません。");
    if (!confirm1) return;
    
    const confirm2 = window.confirm("本当に退会してもよろしいですか？\nこの操作は取り消せません。");
    if (!confirm2) return;

    setIsUpdatingProfile(true);

    try {
      const targetAccountId = currentAccountId;
      
      // 1. 各所属部屋からユーザードキュメントを物理削除
      const roomsToDelete = Array.from(new Set([sanitizeRoomId("埼玉大学全体"), ...availableRooms.map(sanitizeRoomId)]));
      await Promise.all(roomsToDelete.map(async (room) => {
        const uRef = doc(firestore, `rooms/${room}/users/${targetAccountId}`);
        await deleteDoc(uRef).catch(e => console.error(`Failed to delete user doc in room ${room}:`, e));
      }));

      // 2. 時間割データの削除
      const timetableRef = doc(firestore, `users/${targetAccountId}/timetable/data`);
      await deleteDoc(timetableRef).catch(e => console.error("Failed to delete timetable:", e));

      // 3. カレンダー関連データの削除
      const categoriesSnap = await getDocs(collection(firestore, `users/${targetAccountId}/scheduleCategories`));
      await Promise.all(categoriesSnap.docs.map(d => deleteDoc(d.ref)));

      const fixedSnap = await getDocs(collection(firestore, `users/${targetAccountId}/fixedSchedules`));
      await Promise.all(fixedSnap.docs.map(d => deleteDoc(d.ref)));

      const todoSnap = await getDocs(collection(firestore, `users/${targetAccountId}/todoEvents`));
      await Promise.all(todoSnap.docs.map(d => deleteDoc(d.ref)));

      // 4. ローカルストレージおよびステートの完全クリア
      localStorage.removeItem('twitter_clone_current_id');
      localStorage.removeItem('twitter_clone_room_id');
      localStorage.removeItem('twitter_clone_available_rooms');
      localStorage.removeItem('twitter_clone_timetables');
      localStorage.removeItem('twitter_clone_fixed_schedules');
      localStorage.removeItem('saved_user_id');
      localStorage.removeItem('saved_password');

      setIsSettingsModalOpen(false);
      setCurrentAccountId('');
      setCurrentRoomId(sanitizeRoomId("埼玉大学全体"));
      setAvailableRooms([DEFAULT_BOARD_ROOM]);
      setTimetableData({});
      
      alert("アカウントが完全に消去されました。ご利用ありがとうございました。");
    } catch (err) {
      console.error("退会処理エラー:", err);
      alert("退会処理中にエラーが発生しました。");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleImageChange = async (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { alert("画像サイズが大きすぎます(10MB以下)"); return; }
      const compressedDataUrl = await compressImage(file, type === 'avatar' ? 200 : 800, 0.5);
      if (type === 'avatar') setEditForm(prev => ({ ...prev, avatarUrl: compressedDataUrl }));
      if (type === 'header') setEditForm(prev => ({ ...prev, headerUrl: compressedDataUrl }));
    }
  };

  const handleFeatureVote = async (optionId) => {
    if (!currentAccountId) return;
    const voteRef = doc(firestore, `globalData/featurePoll`);
    if (featurePollVotes[optionId]?.[currentAccountId]) setDoc(voteRef, { multiVotes: { [optionId]: { [currentAccountId]: deleteField() } } }, { merge: true }).catch(console.error);
    else setDoc(voteRef, { multiVotes: { [optionId]: { [currentAccountId]: true } } }, { merge: true }).catch(console.error);
  };

  const toggleFollow = async (targetId, e) => {
    if (e) e.stopPropagation();
    if (!currentUserProfile || targetId === currentAccountId) return;
    const rs = sanitizeRoomId(currentRoomId);
    if (following[targetId]) {
      setDoc(doc(firestore, `rooms/${rs}/follows/${currentAccountId}`), { targets: { [targetId]: deleteField() } }, { merge: true });
      setDoc(doc(firestore, `rooms/${rs}/followers/${targetId}`), { sources: { [currentAccountId]: deleteField() } }, { merge: true });
    } else {
      setDoc(doc(firestore, `rooms/${rs}/follows/${currentAccountId}`), { targets: { [targetId]: true } }, { merge: true });
      setDoc(doc(firestore, `rooms/${rs}/followers/${targetId}`), { sources: { [currentAccountId]: true } }, { merge: true });
    }
  };

  const openUserProfile = (userId) => {
    if (userId === currentAccountId) setCurrentBottomTab('プロフィール');
    else { setCurrentBottomTab('コミュニティ'); setViewingProfileId(userId); setActiveTab('プロフィール'); }
    window.scrollTo(0, 0);
  };

  const openFollowList = async (title, idMap) => {
    setIsLoadingFollowList(true); setFollowModal({ isOpen: true, title }); setFollowListUsers([]);
    const userIds = Object.keys(idMap || {});
    if (userIds.length === 0) { setIsLoadingFollowList(false); return; }
    try {
      const usersData = await Promise.all(userIds.map(async (uid) => {
        const d = await getDoc(doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/users/${uid}`));
        return d.exists() ? { id: d.id, ...d.data() } : null;
      }));
      setFollowListUsers(usersData.filter(u => u !== null));
    } catch (err) { } finally { setIsLoadingFollowList(false); }
  };

  const handleReportCongestion = async (spotId, level) => {
    if (!currentAccountId) return;
    const voterKey = encodeFirestoreFieldKey(currentAccountId);
    const currentSpotVotes = congestionData[spotId] || {};
    try {
      await setDoc(
        doc(firestore, `globalData/congestion`),
        { [spotId]: { ...currentSpotVotes, [voterKey]: { level, timestamp: Date.now() } } },
        { merge: true }
      );
      showToast('状況を共有しました');
    }
    catch (error) { console.error("報告に失敗しました", error); }
  };

  const handleQuickActionClick = (itemId) => {
    if (itemId !== 'congestion') return;
    setCafeteriaTab('congestion');
  };

  const addRoomToHistory = (roomName, createdBy) => {
    registerPublicRoom(roomName, createdBy || currentAccountId);
  };

  const removeRoomFromHistory = async (roomSafe) => {
    const roomId = sanitizeRoomId(roomSafe);
    if (roomId === DEFAULT_BOARD_ROOM) return;
    try {
      await setDoc(doc(firestore, 'globalData/boardRooms'), {
        rooms: { [roomId]: deleteField() },
      }, { merge: true });
    } catch (err) {
      console.error('掲示板の削除に失敗しました:', err);
      showToast('掲示板の削除に失敗しました');
      return;
    }
    if (sanitizeRoomId(currentRoomId) === roomId) switchRoom(DEFAULT_BOARD_ROOM);
  };

  const handleRenameRoom = async (oldId, newName) => {
    if (!isAdmin || !newName.trim()) return;
    showToast("ルーム名を変更しました（表示のみ）");
  };

  const renderCongestionMeter = (spot) => {
    const spotData = congestionData[spot.id] || {};
    const now = Date.now();
    const validVotes = Object.values(spotData).filter(
      (v) => v && typeof v.timestamp === 'number' && now - v.timestamp < 30 * 60 * 1000
    );
    let averageLevel = validVotes.length > 0 ? Math.round(validVotes.reduce((acc, curr) => acc + curr.level, 0) / validVotes.length) : 0;
    const currentLevelInfo = averageLevel > 0 ? LEVELS.find(l => l.value === averageLevel) : { label: 'データなし', color: 'bg-gray-400', text: isDark ? 'text-gray-400' : 'text-gray-500', bg: isDark ? 'bg-gray-800' : 'bg-gray-200' };
    const myVoteKey = encodeFirestoreFieldKey(currentAccountId);
    let myRecentVote = spotData[myVoteKey] && (now - spotData[myVoteKey].timestamp < 30 * 60 * 1000) ? spotData[myVoteKey].level : null;

    return (
      <div key={spot.id} className={`rounded-xl p-5 border mb-4 shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-start mb-4">
          <div><h3 className={`font-bold text-base flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}><MapPin size={18} className="mr-1.5 text-blue-500" /> {spot.name}</h3><p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{spot.desc}</p></div>
          <div className={`px-2.5 py-1 rounded-md flex items-center space-x-1 ${currentLevelInfo.bg} ${currentLevelInfo.text} pill`}><Activity size={14} /><span className="font-semibold text-xs">{currentLevelInfo.label}</span></div>
        </div>
        <div className={`h-2.5 rounded-full overflow-hidden mb-1.5 relative ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>{averageLevel > 0 && <div className={`h-full transition-all duration-500 ${currentLevelInfo.color}`} style={{ width: `${(averageLevel / 4) * 100}%` }} />}</div>
        <div className={`flex justify-between text-[11px] mb-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><span>空いてる</span><span>絶望的</span></div>
        <div className={`border-t pt-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center mb-3"><p className={`text-xs flex items-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Clock size={14} className="mr-1.5" /> 今の状況を報告 (30分で消えます)</p><span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{validVotes.length}人が報告</span></div>
          <div className="grid grid-cols-4 gap-2">
            {LEVELS.map(l => (
              <button key={l.value} onClick={() => handleReportCongestion(spot.id, l.value)} className={`py-2 rounded-lg text-xs font-semibold transition-colors border ${l.text} ${myRecentVote === l.value ? `${l.border} ${l.bg}` : isDark ? 'border-gray-800 bg-transparent hover:bg-gray-800' : 'border-gray-200 bg-transparent hover:bg-gray-100'}`}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFeaturePoll = () => {
    return (
      <div className="bg-[#7B113A] rounded-2xl p-4 sm:p-5 border border-[#5A0A28] mb-8 shadow-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2"><Lightbulb size={24} className="text-yellow-400" /></div>
          <h2 className="text-sm sm:text-base font-black text-white keep-white tracking-wide border-b-2 border-white/30 pb-2 inline-block px-2 sm:px-4">【投票】追加して欲しい機能はなんですか！？</h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-y-6 gap-x-2">
          {FEATURE_POLL_OPTIONS.map(opt => {
            const count = Object.keys(featurePollVotes[opt.id] || {}).length;
            const isMyVote = featurePollVotes[opt.id]?.[currentAccountId];
            return (
              <div key={opt.id} onClick={() => handleFeatureVote(opt.id)} className="flex flex-col items-center cursor-pointer group">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center transition-transform active:scale-90 shadow-lg mx-auto ${isMyVote ? 'bg-yellow-300 ring-2 ring-yellow-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  <opt.icon size={20} className={isMyVote ? 'text-[#7B113A]' : 'text-gray-400'} strokeWidth={isMyVote ? 2.5 : 2} />
                  <span className={`text-sm sm:text-base font-black leading-none mt-0.5 ${isMyVote ? 'text-[#7B113A]' : 'text-white keep-white'}`}>{count}</span>
                </div>
                <span className={`text-[10px] sm:text-xs font-bold mt-2 text-center break-words leading-tight w-full ${isMyVote ? 'text-yellow-300' : 'text-white keep-white'}`}>{opt.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 pt-4 border-t border-white/20 text-center">
          <p className="text-xs sm:text-sm font-bold text-white/90 keep-white">これ以外にも欲しい機能があったら、<br />ぜひ<span className="text-yellow-300 font-black mx-1 cursor-pointer hover:underline" onClick={() => setCurrentBottomTab('コミュニティ')}>コミュニティ（チャット）</span>で教えてね！</p>
        </div>
      </div>
    );
  };

  const renderBusTimetable = () => {
    if (!busData) return null;

    const now = currentTime;
    const day = now.getDay();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const holidays = busData._meta?.holidays || [];
    const isHoliday = day === 0 || holidays.includes(dateStr);

    let dayTypeStr = '平日';
    if (isHoliday) { dayTypeStr = '日・祝'; }
    else if (day === 6) { dayTypeStr = '土曜'; }

    return (
      <div id="bus-timetable-section" className="px-4 sm:px-6 lg:px-8 mb-8 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#111827]'}`}>埼大発バス時刻表</h2>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-[#ffffff] border-[#e5e7eb]'} rounded-3xl p-4 sm:p-5 lg:p-6 border shadow-xl relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          <div className={`flex justify-between items-center mb-5 border-b pb-4 relative z-10 ${isDark ? 'border-gray-800' : 'border-[#e5e7eb]'}`}>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold mb-0.5 ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>現在時刻</span>
              <span className={`text-2xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-[#111827]'}`}>{now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}</span>
            </div>
            <div className={`px-4 py-2 rounded-xl border flex items-center shadow-inner ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>
              <span className={`text-xs font-bold mr-1 ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>今日は</span>
              <span className={`text-sm font-black mx-1 ${isHoliday ? (isDark ? 'text-red-400' : 'text-red-500') : day === 6 ? (isDark ? 'text-blue-400' : 'text-blue-600') : (isDark ? 'text-green-400' : 'text-green-600')}`}>{dayTypeStr}</span>
              <span className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>ダイヤです</span>
            </div>
          </div>

          <div
            ref={busCarouselRef}
            className="flex overflow-x-auto snap-x snap-mandatory relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-1"
            onScroll={(e) => {
              const scrollLeft = e.target.scrollLeft;
              const width = e.target.offsetWidth;
              const index = Math.round(scrollLeft / width);
              if (index !== activeBusRouteIndex) setActiveBusRouteIndex(index);
            }}
          >
            {busData.routes.map(route => {
              const buses = getNextBuses(route, now, holidays);
              if (buses.length === 0) return (
                <div key={route.id} className="min-w-full snap-center shrink-0 px-1 box-border">
                  <div className="flex items-center justify-between bg-gray-800/30 p-3.5 rounded-2xl border border-gray-700/30 h-full">
                    <div className="w-[40%] flex flex-col justify-center">
                      <div>
                        <span className="font-bold text-gray-500 text-[14px] sm:text-[15px] tracking-tight truncate">{route.name}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 ml-0.5">行</span>
                      </div>
                      {route.boardingStop && (
                        <div className="flex items-center space-x-1 mt-0.5 opacity-60">
                          <MapPin size={10} className="text-gray-500 flex-shrink-0" />
                          <span className="text-[9px] sm:text-[10px] font-medium text-gray-500 truncate">乗場: {route.boardingStop}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-[60%] text-right">
                      <span className="text-xs font-bold text-gray-500">本日の運行終了</span>
                    </div>
                  </div>
                </div>
              );

              const nextBus = buses[0];
              const nextNextBus = buses[1];

              return (
                <div key={route.id} className="min-w-full snap-center shrink-0 px-1 box-border">
                  <div className={`flex items-center justify-between transition-colors p-3.5 rounded-2xl border h-full ${isDark ? 'bg-gray-800/50 hover:bg-gray-800/80 border-gray-700/50' : 'bg-[#f9fafb] hover:bg-[#f3f4f6] border-[#e5e7eb]'}`}>
                    <div className="w-[35%] flex flex-col justify-center">
                      <div>
                        <span className={`font-extrabold text-[14px] sm:text-[15px] tracking-tight truncate ${isDark ? 'text-white' : 'text-[#111827]'}`}>{route.name}</span>
                        <span className={`text-[9px] sm:text-[10px] font-bold ml-0.5 ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>行</span>
                      </div>
                      {route.boardingStop && (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <MapPin size={10} className={`flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-[#9ca3af]'}`} />
                          <span className={`text-[9px] sm:text-[10px] font-medium truncate ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>乗場: {route.boardingStop}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-[20%] flex flex-col items-center justify-center">
                      <div className="flex items-baseline space-x-0.5 sm:space-x-1">
                        <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>あと</span>
                        <span className={`text-xl sm:text-2xl font-black tabular-nums tracking-tighter ${nextBus.diffMinutes <= 5 ? 'text-red-500 animate-pulse' : 'text-pink-500'}`}>{nextBus.diffMinutes}</span>
                        <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>分</span>
                      </div>
                    </div>

                    <div className="w-[45%] flex flex-col items-end space-y-1.5">
                      <div className="flex items-center space-x-1.5">
                        {nextBus.isSeibu ? (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold whitespace-nowrap ${isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>西武バス</span>
                        ) : (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold whitespace-nowrap ${isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200'}`}>国際興業</span>
                        )}
                        <span className={`font-black text-sm sm:text-base tabular-nums ${isDark ? 'text-white' : 'text-[#111827]'}`}>{nextBus.timeStr}</span>
                      </div>
                      {nextNextBus && (
                        <div className="flex items-center space-x-1.5 opacity-70">
                          <span className={`text-[8px] sm:text-[9px] font-bold ${isDark ? 'text-gray-500' : 'text-[#9ca3af]'}`}>次発</span>
                          {nextNextBus.isSeibu ? (
                            <span className={`text-[8px] px-1 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-500 border-blue-200'}`}>西武</span>
                          ) : (
                            <span className={`text-[8px] px-1 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-green-100 text-green-600 border-green-200'}`}>国際</span>
                          )}
                          <span className={`text-[11px] sm:text-[13px] font-bold tabular-nums ${isDark ? 'text-gray-300' : 'text-[#4b5563]'}`}>{nextNextBus.timeStr}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {busData.routes.length > 1 && (
            <div className="flex flex-col items-center mt-4 relative z-10">
              <div className="flex space-x-2 mb-2">
                {busData.routes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveBusRouteIndex(i);
                      if (busCarouselRef.current) {
                        busCarouselRef.current.scrollTo({
                          left: busCarouselRef.current.offsetWidth * i,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${activeBusRouteIndex === i ? 'bg-blue-400 w-5' : (isDark ? 'bg-gray-600 hover:bg-gray-500 w-2' : 'bg-[#d1d5db] hover:bg-[#9ca3af] w-2')}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>タップまたはスワイプで切り替え</span>
            </div>
          )}

          {/* わかめナビリンクバナー */}
          <div className="mt-4 space-y-2 relative z-10">
            <div onClick={() => window.open('https://gokaku-studymap.com/bus/', '_blank')} className={`block rounded-xl p-4 cursor-pointer transition-colors ${isDark ? 'bg-blue-900/20 border border-blue-900/40 hover:bg-blue-900/40' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'}`}>
              <h3 className={`font-bold text-sm flex items-center mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                <Bus size={16} className="mr-1" /> 南与野バス、今はどっちに乗るべき？ <ExternalLink size={14} className="ml-1 opacity-50" />
              </h3>
              <p className={`text-[11px] sm:text-xs mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>直近3便や運賃が一目で比較できる神サイト！</p>
              <div className={`text-[11px] flex items-center justify-end border-t pt-2 mt-1 ${isDark ? 'text-blue-600 border-blue-900/30' : 'text-blue-800 border-blue-200'}`}>
                <span>開発:</span>
                <span
                  onClick={(e) => { e.stopPropagation(); window.open('https://x.com/wosaitama', '_blank'); }}
                  className={`ml-1 cursor-pointer hover:underline flex items-center font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  おさいたま さん <ExternalLink size={10} className="ml-0.5" />
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderCafeteriaInfo = () => {
    return (
      <div id="cafeteria-section" className="px-4 sm:px-6 lg:px-8 mb-8 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#111827]'}`}>学食情報</h2>
          </div>
          <a
            href="https://www.univcoop.jp/saitama-u/info/info_81.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-900/30 active:scale-95"
          >
            <ExternalLink size={12} className="mr-1" />
            公式サイト
          </a>
        </div>

        <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-[#ffffff] border-[#e5e7eb]'} rounded-3xl p-4 sm:p-5 lg:p-6 border shadow-xl relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className={`text-sm font-black tracking-widest flex items-center ${isDark ? 'text-orange-400' : 'text-[#ea580c]'}`}>
              今週(5/18-22)の100円朝食メニュー
            </span>
          </div>

          <div className={`relative z-10 w-full rounded-2xl overflow-hidden border shadow-sm mb-4 ${isDark ? 'border-gray-700' : 'border-[#e5e7eb]'}`}>
            <img src="/20260518-22.jpg" alt="今週の100円朝食メニュー" className="w-full h-auto object-cover" />
          </div>

          <div className="flex space-x-3 relative z-10">
            <button
              onClick={() => setCafeteriaTab('review')}
              className={`flex-1 py-3.5 rounded-xl text-sm font-extrabold tracking-tight flex items-center justify-center border shadow-sm transition-colors active:scale-95 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' : 'bg-[#f9fafb] hover:bg-[#f3f4f6] text-[#111827] border-[#e5e7eb]'}`}
            >
              <MessageSquare size={18} className="mr-2 text-blue-500" />
              学食レビュー
            </button>
            <button
              onClick={() => setCafeteriaTab('congestion')}
              className={`flex-1 py-3.5 rounded-xl text-sm font-extrabold tracking-tight flex items-center justify-center border shadow-sm transition-colors active:scale-95 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' : 'bg-[#f9fafb] hover:bg-[#f3f4f6] text-[#111827] border-[#e5e7eb]'}`}
            >
              <Activity size={18} className="mr-2 text-red-500" />
              混雑状況
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStyle = () => {
    if (isDark) return null;
    return (
      <style>{`
        .theme-light { background-color: #f9fafb !important; color: #111827 !important; }
        .theme-light .bg-black { background-color: #ffffff !important; }
        .theme-light .bg-gray-900 { background-color: #f3f4f6 !important; }
        .theme-light .bg-gray-800 { background-color: #e5e7eb !important; }
        .theme-light .border-gray-800 { border-color: #e5e7eb !important; }
        .theme-light .border-gray-700 { border-color: #d1d5db !important; }
        .theme-light .text-white:not(.keep-white) { color: #111827 !important; }
        .theme-light .text-gray-100 { color: #374151 !important; }
        .theme-light .text-gray-200 { color: #4b5563 !important; }
        .theme-light .text-gray-300 { color: #4b5563 !important; }
        .theme-light .text-gray-400 { color: #6b7280 !important; }
        .theme-light .text-gray-500 { color: #9ca3af !important; }
        .theme-light .hover\\:bg-gray-900:hover { background-color: #f3f4f6 !important; }
        .theme-light .hover\\:bg-gray-800:hover { background-color: #e5e7eb !important; }
        .theme-light .hover\:bg-gray-700:hover { background-color: #d1d5db !important; }
        .theme-light .bg-black\/90 { background-color: rgba(255, 255, 255, 0.95) !important; }
        .theme-light .bg-black\/80 { background-color: rgba(255, 255, 255, 0.85) !important; }
        .theme-light .bg-black\/70 { background-color: rgba(255, 255, 255, 0.7) !important; }
        .theme-light .bg-gray-900\/60 { background-color: rgba(243, 244, 246, 0.8) !important; }
        .theme-light .bg-gray-900\/50 { background-color: rgba(243, 244, 246, 0.6) !important; }
        .theme-light .bg-gray-800\/50 { background-color: rgba(229, 231, 235, 0.6) !important; }
        .theme-light .text-blue-400 { color: #2563eb !important; }
        .theme-light .text-blue-300 { color: #3b82f6 !important; }
        .theme-light .text-blue-500 { color: #1d4ed8 !important; }
        .theme-light .bg-blue-900\\/10 { background-color: #eff6ff !important; }
        .theme-light .bg-blue-900\\/20 { background-color: #dbeafe !important; }
        .theme-light .bg-blue-900\\/30 { background-color: #bfdbfe !important; }
        .theme-light .bg-blue-900\\/40 { background-color: #93c5fd !important; }
        .theme-light .border-blue-900\\/30 { border-color: #93c5fd !important; }
        .theme-light .border-blue-900\\/40 { border-color: #60a5fa !important; }
        .theme-light .text-green-400 { color: #16a34a !important; }
        .theme-light .text-red-400 { color: #dc2626 !important; }
        .theme-light .text-yellow-400 { color: #d97706 !important; }
        .theme-light .text-yellow-500 { color: #b45309 !important; }
        .theme-light .text-pink-400 { color: #db2777 !important; }
        .theme-light .text-purple-400 { color: #9333ea !important; }
        .theme-light .bg-green-900\\/30 { background-color: #dcfce7 !important; }
        .theme-light .bg-red-900\\/30 { background-color: #fee2e2 !important; }
        .theme-light .bg-yellow-900\\/20 { background-color: #fef3c7 !important; }
        .theme-light .bg-yellow-900\\/30 { background-color: #fde68a !important; }
        .theme-light .bg-pink-900\\/30 { background-color: #fce7f3 !important; }
        .theme-light input::placeholder, .theme-light textarea::placeholder { color: #9ca3af !important; }
        .theme-light .bg-white { background-color: #ffffff !important; }
        .theme-light .text-black { color: #111827 !important; }
        .theme-light .border-white { border-color: #e5e7eb !important; }
        .theme-light .keep-white { color: #111827 !important; }
      `}</style>
    );
  };

  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  const dateString = `${currentTime.getMonth() + 1}/${currentTime.getDate()} (${daysOfWeek[currentTime.getDay()]})`;


  if (isAuthLoading) {
    return (
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-white text-gray-900'
      }`}>
        {renderStyle()}
        <div className="flex flex-col items-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/25 rounded-[24px] blur-xl animate-pulse" />
            <img 
              src="/apple-touch-icon.png" 
              alt="MeLink" 
              className="w-20 h-20 relative z-10 rounded-[22px] shadow-2xl border border-white/10 transition-transform duration-500 hover:scale-105" 
            />
          </div>
          
          <div className="flex flex-col items-center space-y-3">
            <h1 className="text-xl font-extrabold tracking-tight">MeLink</h1>
            <div className="flex items-center space-x-2.5">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              <span className={`text-xs font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                データを読み込み中...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUserProfile) {
    return (
      <AuthScreen
        isDark={isDark}
        renderStyle={renderStyle}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        handleSignUp={handleSignUp}
        handleSignIn={handleSignIn}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        user={user}
        isSubmitting={isSubmitting}
        isTermsModalOpen={isTermsModalOpen}
        setIsTermsModalOpen={setIsTermsModalOpen}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${!isDark ? 'theme-light' : ''}`}>
      {renderStyle()}
      <div className={`min-h-screen transition-colors duration-300 lg:flex font-sans ${isDark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        {/* サイドバー (lg以上で表示) */}
        <div className={`hidden lg:flex lg:flex-col ${isSidebarCollapsed ? 'lg:w-20 lg:p-3' : 'lg:w-64 lg:p-4'} lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:border-r lg:z-40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDark ? 'lg:bg-black lg:border-gray-800' : 'lg:bg-gray-50 lg:border-gray-200'}`}>
          <div className="flex flex-col items-center mb-8 relative w-full select-none">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'justify-between w-full'} min-w-0`}>
              <div className="flex items-center min-w-0">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="MeLink" 
                  className="w-10 h-10 flex-shrink-0 rounded-lg object-contain" 
                  style={{ marginRight: isSidebarCollapsed ? '0' : '12px' }} 
                />
                {!isSidebarCollapsed && (
                  <span className={`font-extrabold text-xl tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>MeLink</span>
                )}
              </div>
              
              {!isSidebarCollapsed && (
                <button
                  onClick={() => {
                    const next = !isSidebarCollapsed;
                    setIsSidebarCollapsed(next);
                    try { localStorage.setItem('sidebar_collapsed', next.toString()); } catch (e) {}
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-500/10 active:scale-95 transition-all text-gray-400 hover:text-gray-200"
                  title="サイドバーを折りたたむ"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>

            {/* 折りたたみ時専用のトグルボタン：右境界線の上に浮かせて配置 */}
            {isSidebarCollapsed && (
              <button
                onClick={() => {
                  const next = !isSidebarCollapsed;
                  setIsSidebarCollapsed(next);
                  try { localStorage.setItem('sidebar_collapsed', next.toString()); } catch (e) {}
                }}
                className={`absolute -right-4 top-1/2 -translate-y-1/2 z-50 p-1 rounded-full border transition-all active:scale-95 shadow-md flex items-center justify-center ${
                  isDark 
                    ? 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800' 
                    : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'
                }`}
                title="サイドバーを展開"
              >
                <ChevronRight size={12} />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'ホーム', label: 'ホーム', icon: Home },
              { id: 'MY時間割', label: 'MY時間割', icon: Calendar },
              { id: 'ToDo', label: 'ToDo', icon: CheckSquare },
              { id: 'コミュニティ', label: 'コミュニティ', icon: MessageCircle },
              { id: 'プロフィール', label: 'プロフィール', icon: UserIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentBottomTab(tab.id);
                  if (tab.id === 'プロフィール') {
                    setLastSeenNotifTime(Date.now());
                    localStorage.setItem('last_seen_notif_time', Date.now().toString());
                    setUnreadNotifsCount(0);
                  }
                }}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'space-x-4 px-4'} py-3 rounded-2xl transition-all ${
                  currentBottomTab === tab.id
                    ? isDark ? 'bg-blue-900/30 text-blue-500' : 'bg-blue-100 text-blue-600'
                    : isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={isSidebarCollapsed ? tab.label : undefined}
              >
                <div className="relative flex items-center justify-center">
                  <tab.icon
                    size={24}
                    strokeWidth={currentBottomTab === tab.id ? 2.5 : 2}
                  />
                  {isSidebarCollapsed && tab.id === 'プロフィール' && unreadNotifsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4.5 h-4.5 text-[9px] font-black rounded-full flex items-center justify-center border border-black animate-pulse">
                      {unreadNotifsCount}
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && <span className="font-bold text-lg">{tab.label}</span>}
                {!isSidebarCollapsed && tab.id === 'プロフィール' && unreadNotifsCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white keep-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className={`mt-auto border-t pt-4 transition-colors duration-300 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'px-0 py-3.5' : 'space-x-3 px-4 py-3'} rounded-2xl transition-all ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
              title={isSidebarCollapsed ? (isDark ? 'ライトモード' : 'ダークモード') : undefined}
            >
              {isDark ? <Sun size={22} className="text-yellow-400" /> : <Moon size={22} className="text-indigo-400" />}
              {!isSidebarCollapsed && (
                <span className="font-bold">
                  {isDark ? 'ライトモード' : 'ダークモード'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* メインコンテナ */}
        <div className={`flex-1 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} min-h-screen max-w-2xl mx-auto lg:max-w-full border-x relative pb-20 lg:pb-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
          {/* 共通モジュール・トースト */}
          {toastMessage && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 lg:left-[calc(50%+8rem)] z-50 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg flex items-center space-x-2 border border-gray-700">
              {toastMessage.includes('❌') ? <AlertCircle size={16} className="text-red-400" /> : <CheckCircle size={16} className="text-green-400" />}
              <span>{toastMessage}</span>
            </div>
          )}
          <BadgeModal isOpen={badgeModal.isOpen} type={badgeModal.type} onClose={() => setBadgeModal({ isOpen: false, type: null })} />
          <FollowListModal
            isOpen={followModal.isOpen}
            title={followModal.title}
            users={followListUsers}
            isLoading={isLoadingFollowList}
            onClose={() => setFollowModal({ isOpen: false, title: '' })}
            onUserClick={openUserProfile}
            currentAccountId={currentAccountId}
            following={following}
            onToggleFollow={toggleFollow}
            Avatar={Avatar}
          />
          <RoomModal
            isOpen={isRoomModalOpen}
            availableRooms={availableRooms}
            currentRoomId={currentRoomId}
            isAdmin={isAdmin}
            onSwitchRoom={switchRoom}
            onRenameRoom={handleRenameRoom}
            onRemoveRoom={removeRoomFromHistory}
            onClose={() => setIsRoomModalOpen(false)}
            newRoomForm={newRoomForm}
            setNewRoomForm={setNewRoomForm}
            onCreateRoom={handleCreateNewRoom}
          />
          <ProfileEditModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onUpdate={handleUpdateProfile}
            isUpdating={isUpdatingProfile}
            editForm={editForm}
            setEditForm={setEditForm}
            currentUserProfile={currentUserProfile}
            headerInputRef={headerInputRef}
            avatarInputRef={avatarInputRef}
            onImageChange={handleImageChange}
            Avatar={Avatar}
            isDark={isDark}
          />
          <ProfileSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onUpdateSettings={handleUpdateSettings}
            isUpdating={isUpdatingSettings}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            onDeleteAccount={handleDeleteAccount}
            isDark={isDark}
          />

          {/* 学食モーダル */}
          {cafeteriaTab && (
            <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm p-0 sm:p-4 transition-opacity ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setCafeteriaTab(null)}>
              <div
                className={`w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl border shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-[slideUp_0.3s_ease-out] ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                      {cafeteriaTab === 'review' ? <MessageSquare size={16} className="text-blue-500" /> : <Activity size={16} className="text-red-500" />}
                    </div>
                    <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {cafeteriaTab === 'review' ? '学食レビュー' : 'リアルタイム混雑状況'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setCafeteriaTab(null)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? 'bg-gray-800 text-gray-500 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={`flex p-1 mx-4 mt-4 rounded-xl shrink-0 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                  <button
                    onClick={() => setCafeteriaTab('review')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${cafeteriaTab === 'review' ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}
                  >
                    学食レビュー
                  </button>
                  <button
                    onClick={() => setCafeteriaTab('congestion')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${cafeteriaTab === 'congestion' ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}
                  >
                    混雑状況
                  </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1 overscroll-contain">
                  {cafeteriaTab === 'review' && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <MessageSquare size={32} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                      </div>
                      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>学食レビュー機能</h3>
                      <p className={`text-sm font-medium leading-relaxed max-w-[250px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        只今、一生懸命準備中です！<br />実装までもうしばらくお待ちください。
                      </p>
                    </div>
                  )}
                  {cafeteriaTab === 'congestion' && (
                    <div className="space-y-4 pb-4">
                      {SPOTS.filter(s => s.id === 'dining_hall_1' || s.id === 'dining_hall_2').map(spot => (
                        <React.Fragment key={spot.id}>
                          {renderCongestionMeter(spot)}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ⚠️ ホームタブ */}
          {currentBottomTab === 'ホーム' && (
            <div className={`pb-24 lg:pb-0 min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-white'}`}>
              <div className={`/90 backdrop-blur sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center shadow-sm border-b transition-colors duration-300 ${isDark ? 'bg-black/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
                <div className="w-10 lg:hidden"></div>
                <span className={`font-extrabold text-white text-[17px] sm:text-lg lg:text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>MeLink-埼大生の総合情報アプリ</span>
                <div className="w-10 flex justify-end">
                  <button onClick={() => setIsDark(!isDark)} className={`lg:hidden p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </div>
              </div>

              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="px-4 sm:px-6 mt-6 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full border ${isDark ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-green-100 text-green-600 border-green-200'}`}>
                      <UserIcon size={24} />
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold mb-0.5 ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>MeLink 総登録者数</p>
                      <p className={`text-2xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-[#111827]'}`}>{totalUserCount} <span className={`text-sm font-bold ${isDark ? 'text-gray-500' : 'text-[#9ca3af]'}`}>人</span></p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 mb-8 mt-4">
                <div className="flex flex-col">
                  <div className={`py-3.5 border-b flex items-center ${isDark ? 'border-gray-800' : 'border-[#e5e7eb]'}`}>
                    <span className={`text-[16px] font-black tracking-tight ${isDark ? 'text-white' : 'text-[#111827]'}`}>{dateString}</span>
                  </div>

                  <div className={`py-3 border-b flex items-center ${isDark ? 'border-gray-800' : 'border-[#e5e7eb]'}`}>
                    <div className={`pr-3 border-r ${isDark ? 'border-gray-800' : 'border-[#e5e7eb]'}`}>
                      <span className={`text-[11px] font-bold block leading-tight ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>埼玉大学<br />大久保キャンパス</span>
                    </div>
                    <div className="px-4 flex items-center space-x-3">
                      {weatherData ? (() => {
                        const info = getWeatherInfo(weatherData.weathercode);
                        const WeatherIcon = info.icon;
                        return (
                          <>
                            <WeatherIcon size={24} className={isDark ? info.color : info.color.replace('-400', '-500')} />
                            <div>
                              <p className={`text-[13px] font-bold flex items-baseline space-x-1 ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                                <span className={isDark ? 'text-red-400' : 'text-red-600'}>{weatherData.maxTemp}℃</span>
                                <span className="text-xs text-gray-500">/</span>
                                <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{weatherData.minTemp}℃</span>
                                <span className={`text-[10px] ml-1 ${isDark ? 'text-gray-500' : 'text-[#9ca3af]'}`}>降水 {weatherData.precipProb}%</span>
                              </p>
                              <p className={`text-[10px] flex items-center mt-0.5 ${isDark ? 'text-gray-400' : 'text-[#6b7280]'}`}>
                                現在 {weatherData.temp}℃ ({info.text})
                              </p>
                            </div>
                          </>
                        );
                      })() : (
                        <div className={`text-xs flex items-center ${isDark ? 'text-gray-500' : 'text-[#9ca3af]'}`}><Loader2 size={14} className="animate-spin mr-2" /> 天気情報を取得中...</div>
                      )}
                    </div>
                  </div>



                  <div className="py-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-y-5 gap-x-2 w-full place-items-start">
                    {[
                      { id: 'bus-timetable-section', label: 'バス時刻表', icon: Bus, color: isDark ? 'text-blue-400' : 'text-blue-600', type: 'jump' },
                      { id: 'cafeteria-section', label: '学食情報', icon: Utensils, color: isDark ? 'text-orange-400' : 'text-orange-600', type: 'jump' },
                      { id: 'campus-map-section', label: 'キャンパス地図', icon: Map, color: isDark ? 'text-indigo-400' : 'text-indigo-600', type: 'map' },
                      { id: 'wiki-section', label: 'Wiki', icon: BookOpen, color: isDark ? 'text-teal-400' : 'text-teal-600', type: 'wiki' },

                      { id: 'power', label: '電源スポット', icon: Zap, color: isDark ? 'text-yellow-400' : 'text-yellow-600', type: 'future' },
                      { id: 'notice', label: '大学からのお知らせ', icon: Megaphone, color: isDark ? 'text-red-400' : 'text-red-600', type: 'future' },
                      { id: 'timetable', label: '友達の時間割', icon: UserPlus, color: isDark ? 'text-pink-400' : 'text-pink-600', type: 'future' },

                      { id: 'campus_square', label: 'ｷｬﾝﾊﾟｽｽｸｴｱ', url: 'https://web.risyu.saitama-u.ac.jp/campusweb/', icon: GraduationCap, color: isDark ? 'text-indigo-400' : 'text-indigo-600', type: 'ext' },
                      { id: 'webclass', label: 'WebClass', url: 'https://webclass.gks.saitama-u.ac.jp', icon: BookOpen, color: isDark ? 'text-teal-400' : 'text-teal-600', type: 'ext' },
                      { id: 'websyllabus', label: 'Webシラバス', url: 'https://syllabus.risyu.saitama-u.ac.jp/syllabus/', icon: Book, color: isDark ? 'text-emerald-400' : 'text-emerald-600', type: 'ext' },
                      { id: 'elearning', label: 'eラーニング', url: 'https://saitama-u.supereigo.com/student/main/login', icon: MonitorPlay, color: isDark ? 'text-cyan-400' : 'text-cyan-600', type: 'ext' },
                      { id: 'homepage', label: '埼大HP', url: 'https://www.saitama-u.ac.jp/student/', icon: Globe, color: isDark ? 'text-sky-400' : 'text-sky-600', type: 'ext' },
                      { id: 'library', label: '図書館', url: 'https://www.lib.saitama-u.ac.jp/', icon: Library, color: isDark ? 'text-rose-400' : 'text-rose-600', type: 'ext' }
                    ].map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === 'jump') {
                            const el = document.getElementById(item.id);
                            if (el) {
                              const yOffset = -80;
                              const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          } else if (item.type === 'map') {
                            setCurrentBottomTab('キャンパス地図');
                          } else if (item.type === 'wiki') {
                            navigate('/wiki');
                          } else if (item.type === 'ext') {
                            window.open(item.url, '_blank');
                          } else if (item.type === 'future') {
                            setToastMessage('🚧 現在開発中！');
                            setTimeout(() => setToastMessage(''), 3000);
                          }
                        }}
                        className={`flex flex-col items-center justify-start w-full group transition-transform ${item.type !== 'future' ? 'active:scale-95' : 'opacity-60'}`}
                      >
                        <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-2 transition-colors border ${isDark ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700' : 'bg-[#ffffff] hover:bg-[#f9fafb] border-[#e5e7eb] shadow-sm'} ${item.type === 'future' ? 'cursor-not-allowed' : ''}`}>
                           <item.icon size={26} className={item.color} strokeWidth={1.5} />
                        </div>
                        <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight whitespace-normal break-words max-w-[64px] ${isDark ? 'text-gray-300' : 'text-[#4b5563]'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>


              {renderBusTimetable()}

              {renderCafeteriaInfo()}

              <div className="px-4 sm:px-6 mb-8 mt-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-grow h-px bg-gray-800"></div>
                  <h2 className="px-4 text-base font-extrabold text-gray-400 tracking-widest">最新ニュース</h2>
                  <div className="flex-grow h-px bg-gray-800"></div>
                </div>
                <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-xl border border-gray-800">
                  <div className="h-40 bg-gradient-to-br from-pink-600 to-rose-900 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex space-x-4 items-end mt-12 opacity-90">
                      <div className="w-24 h-32 bg-gray-900 rounded-t-xl shadow-xl overflow-hidden border border-gray-700">
                        <div className="bg-rose-900 h-4 w-full"></div>
                        <div className="p-2 space-y-1.5">
                          <div className="w-full h-8 bg-gray-800 rounded"></div>
                          <div className="w-2/3 h-2 bg-gray-800 rounded"></div>
                          <div className="w-full h-2 bg-gray-800 rounded"></div>
                        </div>
                      </div>
                      <div className="w-28 h-36 bg-gray-900 rounded-t-xl shadow-2xl overflow-hidden border border-gray-700 relative">
                        <div className="bg-pink-600 h-5 w-full"></div>
                        <div className="p-3 text-center">
                          <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                            <Activity size={20} className="text-gray-400" />
                          </div>
                          <div className="w-20 h-2 bg-gray-800 rounded mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-gray-800">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col space-y-2 pr-2">
                        <p className="text-[13px] font-bold text-white leading-relaxed">
                          埼大マスコット「メリンちゃん」×「Link」。<br />
                          学生同士や情報を繋ぐアプリ「MeLink」誕生！
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 flex items-center mt-1">
                          <ShieldCheck size={12} className="mr-1 text-green-500" />
                          本名・メアド等、個人情報の登録は一切不要。
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.share) {
                            navigator.share({
                              title: 'MeLink - 埼大生のアプリ',
                              text: '埼大生のための最強アプリ「MeLink」を使ってみよう！',
                              url: window.location.href,
                            }).catch(console.error);
                          } else {
                            navigator.clipboard.writeText("埼大生専用アプリ「MeLink」を使ってみよう！\n" + window.location.href);
                            showToast("リンクをコピーしました！");
                          }
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white keep-white p-3 rounded-full transition-colors shadow-md active:scale-95 flex-shrink-0"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-grow h-px bg-gray-800"></div>
                  <h2 className="px-4 text-base font-extrabold text-gray-400 tracking-widest">その他</h2>
                  <div className="flex-grow h-px bg-gray-800"></div>
                </div>

                {renderFeaturePoll()}

                {/* 🌟 PWA追加プロンプト */}
                {showPwaPrompt && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start shadow-lg mb-6 relative">
                    <button
                      onClick={handleClosePwaPrompt}
                      className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <X size={18} />
                    </button>
                    <div className="flex items-center justify-center w-12 h-12 mr-3 flex-shrink-0">
                      <div className="w-7 h-11 border-[2.5px] border-green-500 rounded-lg relative flex items-center justify-center">
                        <div className="w-3 h-[2.5px] bg-green-500 absolute bottom-1.5 rounded-full"></div>
                      </div>
                    </div>
                    <div className="pr-6">
                      <p className="text-white font-bold text-base mb-1">ホーム画面に追加できます</p>
                      <p className="text-gray-400 text-[13px] leading-relaxed">
                        画面下の <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mx-0.5 -mt-0.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> をタップ→「ホーム画面に追加」
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-center pb-6">
                  <div
                    onClick={() => window.open('https://twitter.com/MeLink_PR', '_blank')}
                    className="bg-gray-900 border border-gray-800 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg mb-6 active:scale-95 transition-transform cursor-pointer w-full"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current text-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.007 3.94H5.078z"></path></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 mb-0.5">公式X (旧Twitter)</p>
                        <p className="text-sm font-extrabold tracking-tight">@MeLink_PR をフォローして<br />最新情報をゲット！</p>
                      </div>
                    </div>
                    <ExternalLink size={20} className="text-gray-500" />
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ⚠️ キャンパス地図タブ */}
        {currentBottomTab === 'キャンパス地図' && (
          <CampusMapComponent isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
        )}

        {/* ⚠️ MY時間割タブ */}
        {currentBottomTab === 'MY時間割' && (
          <TimetableComponent
            firestore={firestore}
            currentAccountId={currentAccountId}
            currentUserProfile={currentUserProfile}
            currentRoomId={currentRoomId}
            formatTimeAgo={formatTimeAgo}
            showToast={showToast}
            openUserProfile={openUserProfile}
            Avatar={Avatar}
            isDark={isDark}
            activeTimetableLesson={activeTimetableLesson}
            clearActiveTimetableLesson={() => setActiveTimetableLesson(null)}
            timetableData={timetableData}
            setTimetableData={setTimetableData}
          />
        )}

        {/* ⚠️ ToDoタブ */}
        {currentBottomTab === 'ToDo' && (
          <ToDoErrorBoundary isDark={isDark}>
            <ToDoCalendarComponent 
              isDark={isDark} 
              timetableData={timetableData} 
              firestore={firestore}
              currentAccountId={currentAccountId}
              onLessonSelect={(lesson) => {
                setActiveTimetableLesson(lesson);
              }}
            />
          </ToDoErrorBoundary>
        )}

        {/* ⚠️ MY時間割以外のタブで、時間割詳細モーダルのみを浮かび上がらせるポータルレンダリング */}
        {currentBottomTab !== 'MY時間割' && activeTimetableLesson && (
          <TimetableComponent
            firestore={firestore}
            currentAccountId={currentAccountId}
            currentUserProfile={currentUserProfile}
            currentRoomId={currentRoomId}
            formatTimeAgo={formatTimeAgo}
            showToast={showToast}
            openUserProfile={openUserProfile}
            Avatar={Avatar}
            isDark={isDark}
            activeTimetableLesson={activeTimetableLesson}
            clearActiveTimetableLesson={() => setActiveTimetableLesson(null)}
            timetableData={timetableData}
            setTimetableData={setTimetableData}
            onlyModal={true}
          />
        )}

        {/* ⚠️ コミュニティ（掲示板）タブ */}
        {currentBottomTab === 'コミュニティ' && (
          <CommunityComponent
            firestore={firestore}
            currentRoomId={currentRoomId}
            currentAccountId={currentAccountId}
            currentUserProfile={currentUserProfile}
            isAdmin={isAdmin}
            following={following}
            followers={followers}
            userBookmarks={userBookmarks}
            expandedPostId={expandedPostId}
            setExpandedPostId={setExpandedPostId}
            toggleFollow={toggleFollow}
            openUserProfile={openUserProfile}
            formatTimeAgo={formatTimeAgo}
            sanitizeRoomId={sanitizeRoomId}
            VERIFIED_USERS={verifiedUsers}
            VETERAN_USERS={veteranUsers}
            NAMING_USERS={namingUsers}
            setBadgeModal={setBadgeModal}
            openFollowList={openFollowList}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            viewingUserProfile={viewingUserProfile}
            viewingProfileId={viewingProfileId}
            viewingFollowers={viewingFollowers}
            viewingFollowing={viewingFollowing}
            visiblePosts={filteredPosts}
            isLoading={isLoading}
            postLimit={postLimit}
            setPostLimit={setPostLimit}
            displayedPosts={filteredPosts}
            profilePosts={profilePosts}
            setIsRoomModalOpen={setIsRoomModalOpen}
            ensureRoomListed={() => addRoomToHistory(currentRoomId, currentAccountId)}
            Avatar={Avatar}
            isDark={isDark}
          />
        )}

        {/* ⚠️ プロフィールタブ */}
        {currentBottomTab === 'プロフィール' && currentUserProfile && (
          <div className={`pb-24 min-h-screen ${isDark ? 'bg-black' : 'bg-[#fafaf9]'}`}>
            <div className="relative">
              <div className="h-32 sm:h-48 bg-gray-800 w-full overflow-hidden">{currentUserProfile.headerUrl ? <img src={currentUserProfile.headerUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900" />}</div>
              <div className="px-4 pb-4">
                <div className="flex justify-between items-end -mt-12 mb-4 relative">
                  <Avatar src={currentUserProfile.avatarUrl} name={currentUserProfile.name} color={currentUserProfile.avatarColor} size="xl" />
                  <button onClick={() => setIsProfileModalOpen(true)} className={`px-4 py-1.5 border rounded-full text-sm font-bold transition-colors mb-2 ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>プロフィールを編集</button>
                </div>
                <div>
                  <h2 className={`text-xl font-black flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {currentUserProfile.name}
                    {verifiedUsers.some(u => u.toLowerCase() === (currentUserProfile.id || currentAccountId).toLowerCase()) && <BadgeCheck onClick={() => setBadgeModal({ isOpen: true, type: 'admin' })} size={20} className="text-black fill-yellow-500 ml-1 cursor-pointer" />}
                    {veteranUsers.some(u => u.toLowerCase() === (currentUserProfile.id || currentAccountId).toLowerCase()) && <BadgeCheck onClick={() => setBadgeModal({ isOpen: true, type: 'veteran' })} size={20} className="text-black fill-blue-500 ml-1 cursor-pointer" />}
                    {namingUsers.some(u => u.toLowerCase() === (currentUserProfile.id || currentAccountId).toLowerCase()) && <BadgeCheck onClick={() => setBadgeModal({ isOpen: true, type: 'naming' })} size={20} className="text-black fill-pink-500 ml-1 cursor-pointer" />}
                  </h2>
                  <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm font-bold mb-3`}>{currentUserProfile.handle}</p>
                  <p className={`text-[15px] whitespace-pre-wrap leading-relaxed mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{currentUserProfile.bio || '自己紹介が未設定です。'}</p>
                  <div className={`flex items-center space-x-4 text-sm mb-4 pb-2 border-b ${isDark ? 'border-b-gray-800' : 'border-b-gray-150'}`}>
                    <div className="flex items-center"><span className={`font-extrabold mr-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{profilePosts.length}</span><span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} font-bold`}>ポスト</span></div>
                    <button onClick={() => openFollowList('フォロー中', following)} className="hover:underline flex items-center"><span className={`font-extrabold mr-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{Object.keys(following || {}).length}</span><span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} font-bold`}>フォロー中</span></button>
                    <button onClick={() => openFollowList('フォロワー', followers)} className="hover:underline flex items-center"><span className={`font-extrabold mr-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{Object.keys(followers || {}).length}</span><span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} font-bold`}>フォロワー</span></button>
                  </div>
                </div>
              </div>
              <div className={`flex border-b sticky top-[53px] z-10 px-2 py-1 space-x-1 ${isDark ? 'border-b-gray-800 bg-black/80 backdrop-blur' : 'border-b-gray-150 bg-white/80 backdrop-blur'}`}>
                <button onClick={() => setProfileTab('posts')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${profileTab === 'posts'
                    ? (isDark ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm border border-gray-200')
                    : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                    }`}>
                  ポスト
                </button>
                <button onClick={() => setProfileTab('settings')}
                  className={`relative flex-1 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 flex items-center justify-center space-x-1.5 ${profileTab === 'settings'
                    ? (isDark ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm border border-gray-200')
                    : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                    }`}>
                  <Settings size={15} />
                  <span>設定</span>
                </button>
              </div>
            </div>
            <div>
              {profileTab === 'posts' && (() => {
                const myPosts = profilePosts;
                if (myPosts.length === 0 && !isLoading) return <div className={`p-10 text-center font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ポストがありません。</div>;
                return myPosts.map(p => <PostItem key={p.id} p={p} firestore={firestore} currentRoomId={currentRoomId} currentAccountId={currentAccountId} currentUserProfile={currentUserProfile} isAdmin={isAdmin} following={following} userBookmarks={userBookmarks} expandedPostId={expandedPostId} setExpandedPostId={setExpandedPostId} toggleFollow={toggleFollow} openUserProfile={openUserProfile} formatTimeAgo={formatTimeAgo} sanitizeRoomId={sanitizeRoomId} VERIFIED_USERS={verifiedUsers} VETERAN_USERS={veteranUsers} NAMING_USERS={namingUsers} setBadgeModal={setBadgeModal} Avatar={Avatar} isDark={isDark} />);
              })()}
              {profileTab === 'settings' && (
                <div className="p-4 space-y-3.5 select-none animate-[fadeIn_0.2s_ease-out]">
                  {/* プロフィール設定 */}
                  <button
                    onClick={() => { setSettingsForm({ userId: currentAccountId, currentPassword: '', newPassword: '', confirmPassword: '' }); setIsSettingsModalOpen(true); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-950 border-gray-900 hover:bg-gray-900/50 text-white' 
                        : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <UserIcon size={18} />
                      </div>
                      <span className="text-sm font-extrabold">プロフィール設定</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>

                  {/* 利用規約 */}
                  <button
                    onClick={() => {
                      setTermsModalTab('terms');
                      setIsTermsModalOpen(true);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-950 border-gray-900 hover:bg-gray-900/50 text-white' 
                        : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <FileText size={18} />
                      </div>
                      <span className="text-sm font-extrabold">利用規約</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>

                  {/* 個人情報の取り扱いについて */}
                  <button
                    onClick={() => {
                      setTermsModalTab('privacy');
                      setIsTermsModalOpen(true);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-950 border-gray-900 hover:bg-gray-900/50 text-white' 
                        : 'bg-white border-gray-150 hover:bg-gray-50 text-gray-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        <Lock size={18} />
                      </div>
                      <span className="text-sm font-extrabold">プライバシーポリシー</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms Modal (ログイン後用) */}
        <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} initialTab={termsModalTab} isDark={isDark} />

        {/* ⚠️ フッターナビゲーション (lg以下で表示) */}
        {/* ⚠️ フッターナビゲーション (lg以下で表示) */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 mx-auto w-full max-w-2xl backdrop-blur flex justify-around items-center h-[60px] pb-safe z-50 ${
          isDark 
            ? 'bg-black/90 border-t border-gray-800 text-white' 
            : 'bg-white/95 border-t border-gray-200 text-black shadow-[0_-2px_10px_rgba(0,0,0,0.03)]'
        }`}>
          {[
            { id: 'ホーム', label: 'ホーム', icon: Home },
            { id: 'MY時間割', label: '時間割', icon: Calendar },
            { id: 'ToDo', label: 'ToDo', icon: CheckSquare },
            { id: 'コミュニティ', label: '掲示板', icon: MessageCircle },
            { id: 'プロフィール', label: 'マイページ', icon: UserIcon }
          ].map(tab => (
            <button key={tab.id} onClick={() => {
              setCurrentBottomTab(tab.id);
              if (tab.id === 'プロフィール') {
                setLastSeenNotifTime(Date.now());
                localStorage.setItem('last_seen_notif_time', Date.now().toString());
                setUnreadNotifsCount(0);
              }
            }}
              className="flex flex-col items-center justify-center w-full h-full gap-0.5 relative">
              <div className={`p-1.5 rounded-xl transition-all ${
                currentBottomTab === tab.id 
                  ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') 
                  : ''
              }`}>
                <tab.icon size={22}
                  className={currentBottomTab === tab.id ? 'text-blue-500' : 'text-gray-500'}
                  strokeWidth={currentBottomTab === tab.id ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${currentBottomTab === tab.id ? 'text-blue-500' : 'text-gray-500'}`}>{tab.label}</span>
              {tab.id === 'プロフィール' && unreadNotifsCount > 0 &&
                <span className={`absolute top-2 right-[calc(50%-18px)] w-2.5 h-2.5 bg-red-500 border-2 rounded-full ${
                  isDark ? 'border-black' : 'border-white'
                }`} />}
            </button>
          ))}
        </div>

        </div>
      </div>
    </div>
  );
}