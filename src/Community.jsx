import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, collection, addDoc, deleteField } from 'firebase/firestore';
import { Heart, MessageCircle, Bookmark, Pin, Trash2, CheckCircle, BadgeCheck, BarChart2, Loader2, Plus, ArrowLeft } from 'lucide-react';

export const PostItem = ({
  p, firestore, currentRoomId, currentAccountId, currentUserProfile,
  isAdmin, following, userBookmarks, expandedPostId, setExpandedPostId,
  toggleFollow, openUserProfile, formatTimeAgo, sanitizeRoomId,
  VERIFIED_USERS, VETERAN_USERS, NAMING_USERS, setBadgeModal, Avatar,
  isDark
}) => {
  const [replyContent, setReplyContent] = useState('');

  const handleVote = async (postId, choiceIndex, e) => {
    e.stopPropagation();
    if (currentUserProfile) updateDoc(doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts/${postId}`), { [`poll.votedUsers.${currentAccountId}`]: choiceIndex }).catch(() => alert("投票に失敗しました"));
  };
  const handleReply = async (postId, e) => {
    e.preventDefault();
    if (!replyContent.trim() || !currentUserProfile) return;
    try {
      const replyId = Date.now().toString() + Math.floor(Math.random() * 1000);
      await setDoc(doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts/${postId}`), { replies: { [replyId]: { authorId: currentAccountId, authorName: currentUserProfile.name, authorColor: currentUserProfile.avatarColor, authorAvatarUrl: currentUserProfile.avatarUrl || null, content: replyContent, timestamp: Date.now() } } }, { merge: true });
      setReplyContent('');
    } catch (err) { alert("返信に失敗しました"); }
  };
  const toggleLike = async (post, e) => {
    e.stopPropagation();
    if (!currentUserProfile) return;
    const postRef = doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts/${post.id}`);
    if (post.likes && post.likes[currentAccountId]) setDoc(postRef, { likes: { [currentAccountId]: deleteField() } }, { merge: true }).catch(console.error);
    else setDoc(postRef, { likes: { [currentAccountId]: currentUserProfile.name } }, { merge: true }).catch(console.error);
  };
  const toggleBookmark = async (post, e) => {
    e.stopPropagation();
    if (!currentUserProfile) return;
    const bookmarkRef = doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/bookmarks/${currentAccountId}`);
    if (userBookmarks[post.id]) setDoc(bookmarkRef, { posts: { [post.id]: deleteField() } }, { merge: true }).catch(console.error);
    else setDoc(bookmarkRef, { posts: { [post.id]: true } }, { merge: true }).catch(console.error);
  };
  const toggleGlobalPin = async (post, e) => {
    e.stopPropagation();
    if (isAdmin) updateDoc(doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts/${post.id}`), { isGlobalPinned: !post.isGlobalPinned });
  };
  const handleDelete = async (postId, e) => {
    e.stopPropagation();
    if (window.confirm("この投稿を削除しますか？")) deleteDoc(doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts/${postId}`));
  };

  try {
    if (!p) return null;
    const likes = p.likes || {}, likeNames = Object.values(likes), likeCount = likeNames.length, isLiked = likes[currentAccountId];
    const replies = p.replies || {}, replyCount = Object.keys(replies).length;
    const isFollowing = following[p.authorId], isBookmarked = userBookmarks[p.id];
    const authorName = p.authorName || '名無し', authorAvatarUrl = p.authorAvatarUrl || null, authorColor = p.authorColor || 'bg-blue-500';

    let pollTotalVotes = 0, pollResults = [], hasVoted = false, isPollExpired = false, myVoteIndex = null;
    if (p.poll && p.poll.choices) {
      const choicesArray = Array.isArray(p.poll.choices) ? p.poll.choices : Object.values(p.poll.choices);
      isPollExpired = Date.now() > p.poll.expiresAt;
      const votesMap = p.poll.votedUsers || {};
      pollTotalVotes = Object.keys(votesMap).length; hasVoted = votesMap[currentAccountId] !== undefined; myVoteIndex = votesMap[currentAccountId];
      const counts = new Array(choicesArray.length).fill(0);
      Object.values(votesMap).forEach(choiceIdx => { if (counts[choiceIdx] !== undefined) counts[choiceIdx]++; });
      pollResults = choicesArray.map((text, idx) => ({ text, count: counts[idx], percent: pollTotalVotes > 0 ? Math.round((counts[idx] / pollTotalVotes) * 100) : 0 }));
    }

    return (
      <div key={p.id} className={`p-4 flex flex-col transition-colors cursor-pointer border-b ${isDark ? 'border-gray-800' : 'border-gray-150'} ${p.isGlobalPinned ? (isDark ? 'bg-yellow-900/20 hover:bg-yellow-900/30' : 'bg-yellow-50 hover:bg-yellow-100/50') : (isDark ? 'bg-black hover:bg-gray-900' : 'bg-white hover:bg-gray-50')}`} onClick={() => setExpandedPostId(expandedPostId === p.id ? null : p.id)}>
        {p.isGlobalPinned && <div className="flex items-center space-x-2 text-yellow-500 text-xs mb-2 font-semibold ml-12"><Pin size={14} className="fill-current" /><span>公式ピン留め</span></div>}
        <div className="flex space-x-3">
          <div className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); openUserProfile(p.authorId); }}><Avatar src={authorAvatarUrl} name={authorName} color={authorColor} /></div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center space-x-1.5 truncate">
                <div className="flex items-center space-x-1.5 truncate cursor-pointer" onClick={(e) => { e.stopPropagation(); openUserProfile(p.authorId); }}>
                  <span className={`font-bold truncate hover:underline flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{authorName}{(VERIFIED_USERS || []).some(u => u.toLowerCase() === (p.authorId || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'admin' }); }} size={16} className="text-black fill-yellow-500 ml-1 flex-shrink-0 cursor-pointer" />}{(VETERAN_USERS || []).some(u => u.toLowerCase() === (p.authorId || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'veteran' }); }} size={16} className="text-black fill-blue-500 ml-1 flex-shrink-0 cursor-pointer" />}{(NAMING_USERS || []).some(u => u.toLowerCase() === (p.authorId || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'naming' }); }} size={16} className="text-black fill-pink-500 ml-1 flex-shrink-0 cursor-pointer" />}</span>
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm truncate max-w-[80px] sm:max-w-none`}>@{p.authorId}</span><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm whitespace-nowrap`}>· {formatTimeAgo(p.timestamp)}</span>
                </div>
                {p.authorId !== currentAccountId && <button onClick={(e) => toggleFollow(p.authorId, e)} className={`ml-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border transition-colors whitespace-nowrap flex-shrink-0 ${isFollowing ? (isDark ? 'border-gray-600 text-white hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/30 bg-transparent' : 'border-gray-300 text-gray-700 hover:border-red-500/50 hover:text-red-500 hover:bg-red-50 bg-transparent') : (isDark ? 'bg-white text-black border-white hover:bg-gray-200' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800')}`}>{isFollowing ? 'フォロー中' : 'フォロー'}</button>}
              </div>
              <div className="flex items-center text-gray-500 flex-shrink-0">
                {isAdmin && <button onClick={e => toggleGlobalPin(p, e)} className={`p-1.5 rounded-full ${isDark ? 'hover:bg-yellow-900/30 text-gray-500 hover:text-yellow-500' : 'hover:bg-yellow-100 text-gray-400 hover:text-yellow-500'} transition-colors ${p.isGlobalPinned ? 'text-yellow-500' : ''}`} title="公式ピン留め"><Pin size={16} className={p.isGlobalPinned ? 'fill-current' : ''} /></button>}
                {(p.authorId === currentAccountId || isAdmin) && <button onClick={e => handleDelete(p.id, e)} className={`p-1.5 rounded-full ${isDark ? 'hover:bg-red-900/30 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'} transition-colors ml-1`}><Trash2 size={16} /></button>}
              </div>
            </div>
            <p className={`mt-1 whitespace-pre-wrap break-words text-[15px] leading-normal ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{p.content}</p>

            {p.poll && (
              <div className={`mt-3 border rounded-xl p-4 bg-transparent ${isDark ? 'border-gray-800' : 'border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <div className="space-y-2">
                  {pollResults.map((result, idx) => {
                    const showResults = hasVoted || isPollExpired, isWinner = showResults && result.count === Math.max(...pollResults.map(r => r.count)) && result.count > 0;
                    if (!showResults) return <button key={idx} onClick={(e) => handleVote(p.id, idx, e)} className={`w-full text-center py-2 px-4 rounded-full font-semibold border text-blue-500 border-blue-500 ${isDark ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50'} transition-colors block break-words`}>{result.text}</button>;
                    return (
                      <div key={idx} className={`relative w-full overflow-hidden rounded-md h-8 flex items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${isWinner ? (isDark ? 'bg-blue-900/50' : 'bg-blue-100') : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`} style={{ width: `${result.percent}%` }} />
                        <div className="relative z-10 flex justify-between w-full px-3 text-sm"><span className={`truncate mr-2 ${isDark ? 'text-white' : 'text-gray-800'} ${myVoteIndex === idx ? 'font-bold flex items-center' : ''}`}>{result.text}{myVoteIndex === idx && <CheckCircle size={14} className="ml-1.5 inline text-blue-500" />}</span><span className={`${isDark ? 'text-white' : 'text-gray-800'} ${isWinner ? 'font-bold' : ''}`}>{result.percent}%</span></div>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-3 text-xs flex items-center space-x-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><span>{pollTotalVotes} 票</span><span>·</span><span>{isPollExpired ? '最終結果' : (() => { const rem = p.poll.expiresAt - Date.now(); if (rem < 60000) return 'まもなく終了'; if (rem < 3600000) return `残り ${Math.floor(rem / 60000)}分`; if (rem < 86400000) return `残り ${Math.floor(rem / 3600000)}時間`; return `残り ${Math.floor(rem / 86400000)}日`; })()}</span></div>
              </div>
            )}

            <div className={`mt-3 flex items-center justify-between max-w-md ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex items-center space-x-1 hover:text-blue-500 transition-colors group" onClick={(e) => { e.stopPropagation(); setExpandedPostId(expandedPostId === p.id ? null : p.id); }}><div className={`p-2 rounded-full ${isDark ? 'group-hover:bg-blue-900/30' : 'group-hover:bg-blue-50'} transition-colors`}><MessageCircle size={18} /></div><span className="text-xs">{replyCount || ''}</span></div>
              <div className={`flex items-center space-x-1 transition-colors group ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`} onClick={e => toggleLike(p, e)}><div className={`p-2 rounded-full ${isDark ? 'group-hover:bg-pink-900/30' : 'group-hover:bg-pink-50'} transition-colors`}><Heart size={18} className={isLiked ? 'fill-current' : ''} /></div><span className="text-xs">{likeCount || ''}</span></div>
              <div className={`flex items-center space-x-1 transition-colors group ${isBookmarked ? 'text-blue-500' : 'hover:text-blue-500'}`} onClick={e => toggleBookmark(p, e)}><div className={`p-2 rounded-full ${isDark ? 'group-hover:bg-blue-900/30' : 'group-hover:bg-blue-50'} transition-colors`}><Bookmark size={18} className={isBookmarked ? 'fill-current' : ''} /></div></div>
            </div>
            {likeCount > 0 && <div className={`mt-2.5 text-[13px] flex items-start p-2.5 rounded-xl border w-fit max-w-full ${isDark ? 'text-gray-400 bg-gray-900 border-gray-800' : 'text-gray-600 bg-gray-50 border-gray-150'}`}><Heart size={14} className="mr-1.5 mt-0.5 flex-shrink-0 fill-pink-500 text-pink-500" /><span className="font-medium leading-relaxed break-words">{likeNames.join(', ')} がいいねしました</span></div>}

            {expandedPostId === p.id && (
              <div className={`mt-4 border-t pt-4 ${isDark ? 'border-gray-800' : 'border-gray-150'}`} onClick={e => e.stopPropagation()}>
                {Object.entries(replies).sort(([, a], [, b]) => a.timestamp - b.timestamp).map(([replyId, r]) => {
                  if (!r) return null;
                  return (
                    <div key={replyId} className="flex space-x-3 mb-4">
                      <div onClick={() => openUserProfile(r.authorId)} className="cursor-pointer flex-shrink-0"><Avatar src={r.authorAvatarUrl} name={r.authorName} color={r.authorColor} size="sm" /></div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center space-x-1 min-w-0">
                          <div className="flex items-center space-x-1 truncate cursor-pointer" onClick={(e) => { e.stopPropagation(); openUserProfile(r.authorId); }}>
                            <span className={`font-bold text-sm hover:underline flex items-center truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.authorName}{(VERIFIED_USERS || []).some(u => u.toLowerCase() === (r.authorId || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'admin' }); }} size={14} className="text-black fill-yellow-500 ml-1 flex-shrink-0 cursor-pointer" />}{(VETERAN_USERS || []).some(u => u.toLowerCase() === (r.authorId || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'veteran' }); }} size={14} className="text-black fill-blue-500 ml-1 flex-shrink-0 cursor-pointer" />}{(NAMING_USERS || []).some(u => u.toLowerCase() === (r.authorId || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'naming' }); }} size={14} className="text-black fill-pink-500 ml-1 flex-shrink-0 cursor-pointer" />}</span>
                            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs truncate max-w-[60px] sm:max-w-none`}>@{r.authorId}</span><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs whitespace-nowrap`}>· {formatTimeAgo(r.timestamp)}</span>
                          </div>
                          {r.authorId !== currentAccountId && <button onClick={(e) => toggleFollow(r.authorId, e)} className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap flex-shrink-0 ${following[r.authorId] ? (isDark ? 'border-gray-600 text-white hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/30 bg-transparent' : 'border-gray-300 text-gray-700 hover:border-red-500/50 hover:text-red-500 hover:bg-red-50 bg-transparent') : (isDark ? 'bg-white text-black border-white hover:bg-gray-200' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800')}`}>{following[r.authorId] ? 'フォロー中' : 'フォロー'}</button>}
                          {(r.authorId === currentAccountId || isAdmin) && <button onClick={async (e) => { e.stopPropagation(); if (window.confirm("この返信を削除しますか？")) { await updateDoc(doc(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts/${p.id}`), { [`replies.${replyId}`]: deleteField() }); } }} className={`ml-auto p-1 rounded-full flex-shrink-0 transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}><Trash2 size={14} /></button>}
                        </div>
                        <p className={`text-sm break-words whitespace-pre-wrap mt-0.5 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{r.content}</p>
                      </div>
                    </div>
                  );
                })}
                <form onSubmit={e => handleReply(p.id, e)} className="flex space-x-3 mt-2 items-end">
                  <Avatar src={currentUserProfile.avatarUrl} name={currentUserProfile.name} color={currentUserProfile.avatarColor} size="sm" />
                  <textarea
                    placeholder="返信をポスト"
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply(p.id, e);
                      }
                    }}
                    rows={1}
                    className={`flex-grow bg-transparent py-2 text-sm outline-none placeholder-gray-500 resize-none min-h-[38px] max-h-28 overflow-y-auto leading-5 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  />
                  <button type="submit" disabled={!replyContent.trim()} className={`font-bold text-sm px-3 py-1.5 rounded-full text-blue-500 ${isDark ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50'} disabled:opacity-50 transition-colors`}>返信</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (e) { return null; }
};

export default function CommunityComponent({
  firestore, currentRoomId, currentAccountId, currentUserProfile,
  isAdmin, following, followers, userBookmarks, expandedPostId, setExpandedPostId,
  toggleFollow, openUserProfile, formatTimeAgo, sanitizeRoomId,
  VERIFIED_USERS, VETERAN_USERS, NAMING_USERS, setBadgeModal, openFollowList,
  activeTab, setActiveTab, viewingUserProfile, viewingProfileId,
  viewingFollowers, viewingFollowing, visiblePosts, isLoading,
  postLimit, setPostLimit, displayedPosts, profilePosts = [], setIsRoomModalOpen, ensureRoomListed, Avatar,
  isDark
}) {
  const [newPostContent, setNewPostContent] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollChoices, setPollChoices] = useState(['', '']);
  const [pollDays, setPollDays] = useState(1);
  const [pollHours, setPollHours] = useState(0);
  const [pollMinutes, setPollMinutes] = useState(0);
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUserProfile || isPosting) return;
    setIsPosting(true);
    try {
      let pollData = null;
      if (showPoll) {
        const validChoices = pollChoices.map(c => c.trim()).filter(c => c !== '');
        if (validChoices.length < 2) { alert("投票には2つ以上の回答を入力してください。"); setIsPosting(false); return; }
        const durationMins = (pollDays * 24 * 60) + (pollHours * 60) + pollMinutes;
        if (durationMins < 5 || durationMins > 7 * 24 * 60) { alert("投票期間は5分〜7日で設定してください。"); setIsPosting(false); return; }
        pollData = { choices: validChoices, expiresAt: Date.now() + (durationMins * 60 * 1000), votedUsers: {} };
      }
      await addDoc(collection(firestore, `rooms/${sanitizeRoomId(currentRoomId)}/posts`), {
        authorId: currentAccountId, authorName: currentUserProfile.name, authorHandle: currentUserProfile.handle, authorColor: currentUserProfile.avatarColor, authorAvatarUrl: currentUserProfile.avatarUrl || null, content: newPostContent, poll: pollData, timestamp: Date.now()
      });
      ensureRoomListed?.();
      setNewPostContent(''); setShowPoll(false); setPollChoices(['', '']); setPollDays(1); setPollHours(0); setPollMinutes(0);
    } catch (err) { alert("投稿に失敗しました。"); console.error(err); } finally { setIsPosting(false); }
  };

  return (
    <div className="block">
      <div className={`sticky top-0 backdrop-blur z-10 border-b pb-2 ${isDark ? 'bg-black/90 border-gray-800' : 'bg-white/90 border-gray-150'}`}>
        <div className="px-4 py-3 flex justify-between items-center">
          <div className={`flex items-center space-x-1 cursor-pointer p-2 -ml-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-900' : 'hover:bg-gray-50'}`} onClick={() => setIsRoomModalOpen(true)}>
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentRoomId}</span><Plus size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
          </div>
        </div>
        <div className={`relative flex rounded-full p-0.5 mx-4 my-1 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
          {['おすすめ', 'フォロー中', 'ブックマーク'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`relative flex-1 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${activeTab === tab
                ? (isDark ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'プロフィール' && viewingUserProfile && viewingProfileId !== currentAccountId && (
        <>
          <div className={`border-b pb-4 ${isDark ? 'border-gray-800' : 'border-gray-150'}`}>
            <div className="flex items-center space-x-6 px-4 py-2"><button onClick={() => setActiveTab('おすすめ')} className={`p-2 -ml-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><ArrowLeft size={20} /></button><div><h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{viewingUserProfile.name}</h2></div></div>
            <div className={`h-32 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>{viewingUserProfile.headerUrl && <img src={viewingUserProfile.headerUrl} className="w-full h-full object-cover" alt="header" />}</div>
            <div className="px-4 relative -mt-12">
              <div className="flex justify-between items-end mb-3">
                <Avatar src={viewingUserProfile.avatarUrl} color={viewingUserProfile.avatarColor} name={viewingUserProfile.name} size="lg" />
                <button onClick={() => toggleFollow(viewingProfileId)} className={`px-4 py-1.5 rounded-full font-bold border transition-colors ${following[viewingProfileId] ? (isDark ? 'border-gray-600 text-white hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/30 bg-transparent' : 'border-gray-300 text-gray-700 hover:border-red-500/50 hover:text-red-500 hover:bg-red-50 bg-transparent') : (isDark ? 'bg-white text-black border-white hover:bg-gray-200' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800')}`}>{following[viewingProfileId] ? 'フォロー中' : 'フォロー'}</button>
              </div>
              <div>
                <h2 className={`text-xl font-extrabold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {viewingUserProfile.name}
                  {(VERIFIED_USERS || []).some(u => u.toLowerCase() === (viewingUserProfile.id || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'admin' }); }} size={18} className="text-black fill-yellow-500 ml-1 cursor-pointer" />}
                  {(VETERAN_USERS || []).some(u => u.toLowerCase() === (viewingUserProfile.id || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'veteran' }); }} size={18} className="text-black fill-blue-500 ml-1 cursor-pointer" />}
                  {(NAMING_USERS || []).some(u => u.toLowerCase() === (viewingUserProfile.id || '').toLowerCase()) && <BadgeCheck onClick={(e) => { e.stopPropagation(); setBadgeModal({ isOpen: true, type: 'naming' }); }} size={18} className="text-black fill-pink-500 ml-1 cursor-pointer" />}
                </h2>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-3`}>@{viewingUserProfile.id}</p>
              </div>
              <p className={`text-[15px] leading-normal whitespace-pre-wrap mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{viewingUserProfile.bio}</p>
              <div className={`flex space-x-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className={`cursor-pointer hover:underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`} onClick={() => openFollowList('フォロー中', viewingFollowing)}><span className={`font-bold mr-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{Object.keys(viewingFollowing).length}</span>フォロー中</div>
                <div className={`cursor-pointer hover:underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`} onClick={() => openFollowList('フォロワー', viewingFollowers)}><span className={`font-bold mr-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{Object.keys(viewingFollowers).length}</span>フォロワー</div>
              </div>
            </div>
          </div>
          <div className={`border-t mt-2 ${isDark ? 'border-gray-800' : 'border-gray-150'}`}>
            {(() => {
              const userPosts = profilePosts;
              if (userPosts.length === 0) return <div className={`p-10 text-center font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ポストがありません</div>;
              return userPosts.map(p => <PostItem key={p.id} p={p} firestore={firestore} currentRoomId={currentRoomId} currentAccountId={currentAccountId} currentUserProfile={currentUserProfile} isAdmin={isAdmin} following={following} userBookmarks={userBookmarks} expandedPostId={expandedPostId} setExpandedPostId={setExpandedPostId} toggleFollow={toggleFollow} openUserProfile={openUserProfile} formatTimeAgo={formatTimeAgo} sanitizeRoomId={sanitizeRoomId} VERIFIED_USERS={VERIFIED_USERS} VETERAN_USERS={VETERAN_USERS} NAMING_USERS={NAMING_USERS} setBadgeModal={setBadgeModal} Avatar={Avatar} isDark={isDark} />);
            })()}
          </div>
        </>
      )}

      {activeTab === 'おすすめ' && (
        <div className={`p-4 border-b flex space-x-3 ${isDark ? 'border-gray-800 bg-black' : 'border-gray-150 bg-white'}`}>
          <div className="flex-shrink-0 cursor-pointer" onClick={() => openUserProfile(currentAccountId)}><Avatar src={currentUserProfile.avatarUrl} name={currentUserProfile.name} color={currentUserProfile.avatarColor} /></div>
          <div className="flex-grow">
            <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)} placeholder={showPoll ? "質問を聞いてみよう" : "いまどうしてる？"} className={`w-full bg-transparent text-xl outline-none min-h-[60px] resize-none py-1 placeholder-gray-500 ${isDark ? 'text-white' : 'text-gray-900'}`} />

            {showPoll && (
              <div className={`border rounded-xl p-3 mb-3 ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="space-y-2">
                  {pollChoices.map((choice, idx) => (
                    <div key={idx}><input type="text" placeholder={`回答 ${idx + 1} ${idx > 1 ? '(省略可)' : ''}`} value={choice} maxLength={25} onChange={(e) => { const newChoices = [...pollChoices]; newChoices[idx] = e.target.value; setPollChoices(newChoices); }} className={`w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 ${isDark ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`} /></div>
                  ))}
                  {pollChoices.length < 4 && <button onClick={() => setPollChoices([...pollChoices, ''])} className={`w-full text-left py-1 text-sm px-2 rounded-md transition-colors text-blue-500 ${isDark ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50'}`}>+ 追加する</button>}
                </div>
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                  <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>投票期間</p>
                  <div className="flex space-x-2">
                    <div className={`flex-1 border rounded-md px-2 flex items-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}><span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>日</span><select value={pollDays} onChange={e => setPollDays(Number(e.target.value))} className={`w-full bg-transparent text-sm py-1 outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{[...Array(8).keys()].map(d => <option key={d} value={d} className={isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>{d}</option>)}</select></div>
                    <div className={`flex-1 border rounded-md px-2 flex items-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}><span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>時</span><select value={pollHours} onChange={e => setPollHours(Number(e.target.value))} className={`w-full bg-transparent text-sm py-1 outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{[...Array(24).keys()].map(h => <option key={h} value={h} className={isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>{h}</option>)}</select></div>
                    <div className={`flex-1 border rounded-md px-2 flex items-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}><span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>分</span><select value={pollMinutes} onChange={e => setPollMinutes(Number(e.target.value))} className={`w-full bg-transparent text-sm py-1 outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{[...Array(60).keys()].map(m => <option key={m} value={m} className={isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>{m}</option>)}</select></div>
                  </div>
                </div>
                <button onClick={() => { setShowPoll(false); setPollChoices(['', '']); setPollDays(1); setPollHours(0); setPollMinutes(0); }} className={`mt-3 w-full py-2 text-red-500 rounded-md text-sm transition-colors ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}>投票を削除</button>
              </div>
            )}

            <div className={`flex justify-between items-center pt-2 border-t ${isDark ? 'border-gray-800' : 'border-gray-150'}`}>
              <div className="flex items-center text-blue-400">
                <button onClick={() => { setShowPoll(!showPoll); }} className={`p-2 rounded-full disabled:opacity-50 transition-colors ${isDark ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50'}`}><BarChart2 size={20} /></button>
              </div>
              <button onClick={handlePost} disabled={(!newPostContent.trim()) || isPosting} className="bg-blue-600 text-white keep-white px-5 py-1.5 rounded-full font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center">
                {isPosting && <Loader2 size={16} className="animate-spin mr-1.5" />}
                ポストする
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'プロフィール' && (
      <div>
        {visiblePosts.length === 0 && !isLoading && <div className={`p-10 text-center font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>表示できるポストがありません</div>}
        {visiblePosts.map(p => <PostItem key={p.id} p={p} firestore={firestore} currentRoomId={currentRoomId} currentAccountId={currentAccountId} currentUserProfile={currentUserProfile} isAdmin={isAdmin} following={following} userBookmarks={userBookmarks} expandedPostId={expandedPostId} setExpandedPostId={setExpandedPostId} toggleFollow={toggleFollow} openUserProfile={openUserProfile} formatTimeAgo={formatTimeAgo} sanitizeRoomId={sanitizeRoomId} VERIFIED_USERS={VERIFIED_USERS} VETERAN_USERS={VETERAN_USERS} NAMING_USERS={NAMING_USERS} setBadgeModal={setBadgeModal} Avatar={Avatar} isDark={isDark} />)}
        {activeTab === 'おすすめ' && displayedPosts.length > postLimit && (
          <div className={`p-4 text-center border-b ${isDark ? 'border-gray-800' : 'border-gray-150'}`}>
            <button onClick={() => setPostLimit(prev => prev + 15)} className={`font-bold py-2.5 px-6 rounded-full transition-colors text-sm border ${isDark ? 'bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-800' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'}`}>
              さらに読み込む
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}