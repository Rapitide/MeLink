const DEFAULT_APPLE_AVATAR_COLOR = 'bg-gray-700';

export const normalizeAccountId = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const createAccountIdAliases = (...ids) => {
  const aliases = [];
  const seen = new Set();

  ids.flat().forEach((id) => {
    const normalized = normalizeAccountId(id);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    aliases.push(normalized);
  });

  return aliases;
};

export const buildAccountSession = ({
  firebaseUid = null,
  legacyUserId = null,
  primaryAccountId = null,
  legacyLoginId = null
} = {}) => {
  const normalizedFirebaseUid = normalizeAccountId(firebaseUid);
  const normalizedLegacyUserId = normalizeAccountId(legacyUserId || legacyLoginId);
  const normalizedPrimaryAccountId = normalizeAccountId(
    primaryAccountId || normalizedFirebaseUid || normalizedLegacyUserId
  );

  return {
    firebaseUid: normalizedFirebaseUid,
    legacyUserId: normalizedLegacyUserId,
    primaryAccountId: normalizedPrimaryAccountId,
    accountIdAliases: createAccountIdAliases(
      normalizedPrimaryAccountId,
      normalizedFirebaseUid,
      normalizedLegacyUserId
    )
  };
};

export const isCurrentAccountId = (candidateId, accountIdAliases = []) => {
  const normalized = normalizeAccountId(candidateId);
  if (!normalized) return false;
  return createAccountIdAliases(accountIdAliases).includes(normalized);
};

export const isCurrentUserPost = (post, accountIdAliases = []) => (
  isCurrentAccountId(post?.authorId, accountIdAliases)
);

export const mergeAccountIdMaps = (...maps) => {
  const merged = {};

  maps.flat().forEach((map) => {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return;

    for (const [id, value] of Object.entries(map)) {
      const normalized = normalizeAccountId(id);
      if (!normalized || value === undefined) continue;
      merged[normalized] = value;
    }
  });

  return merged;
};

export const countAccountIdMap = (map = {}) => (
  Object.keys(mergeAccountIdMaps(map)).length
);

const shouldUseLegacyValue = (currentValue) => (
  currentValue == null
    || currentValue === ''
    || currentValue === DEFAULT_APPLE_AVATAR_COLOR
);

export const mergeCurrentProfileWithLegacyProfile = ({
  currentProfile,
  legacyProfile,
  legacyUserId
}) => {
  if (!currentProfile || !legacyProfile) return currentProfile || null;

  const sanitizedLegacyProfile = { ...legacyProfile };
  delete sanitizedLegacyProfile.password;
  delete sanitizedLegacyProfile.saved_password;

  const merged = {
    ...currentProfile,
    legacyUserId: normalizeAccountId(legacyUserId || currentProfile.legacyUserId)
  };

  for (const field of ['bio', 'avatarUrl', 'headerUrl', 'avatarColor']) {
    if (shouldUseLegacyValue(merged[field]) && sanitizedLegacyProfile[field]) {
      merged[field] = sanitizedLegacyProfile[field];
    }
  }

  if (shouldUseLegacyValue(merged.name) && sanitizedLegacyProfile.name) {
    merged.name = sanitizedLegacyProfile.name;
  }

  return merged;
};

export const collectProfilePostsForAliases = (allRoomPosts = [], accountIdAliases = []) => {
  const aliases = createAccountIdAliases(accountIdAliases);
  if (aliases.length === 0) return [];

  const userTimeline = [];
  const insertedPostIds = new Set();
  const insertedRepostIds = new Set();

  for (const post of allRoomPosts) {
    if (!post || post.replyTo) continue;

    if (isCurrentUserPost(post, aliases) && !insertedPostIds.has(post.id)) {
      insertedPostIds.add(post.id);
      userTimeline.push(post);
    }

    const reposts = (
      post.reposts && typeof post.reposts === 'object' && !Array.isArray(post.reposts)
    ) ? post.reposts : {};
    const repostAlias = aliases.find((alias) => reposts[alias]);

    if (repostAlias && !isCurrentUserPost(post, aliases) && !insertedRepostIds.has(post.id)) {
      const repostData = reposts[repostAlias];
      const repostTimestamp = (
        repostData && typeof repostData === 'object'
      ) ? repostData.timestamp : Date.now();
      const repostByName = (
        repostData && typeof repostData === 'object'
      ) ? repostData.name : repostAlias;

      insertedRepostIds.add(post.id);
      userTimeline.push({
        ...post,
        _displayKey: `${post.id}_profile_repost_${repostAlias}`,
        _repostedBy: repostByName,
        _repostTimestamp: repostTimestamp,
        _postTimestamp: post.timestamp,
        timestamp: repostTimestamp,
        _isRepostEntry: true
      });
    }
  }

  return userTimeline.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};
