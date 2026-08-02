import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildAccountSession,
  collectProfilePostsForAliases,
  countAccountIdMap,
  createAccountIdAliases,
  isCurrentAccountId,
  isCurrentUserPost,
  mergeAccountIdMaps,
  mergeCurrentProfileWithLegacyProfile
} from '../../src/services/accountIdentityAdapter.js';

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test('uid only creates a single alias', () => {
  assert.deepEqual(buildAccountSession({
    firebaseUid: 'uid_123',
    primaryAccountId: 'uid_123'
  }), {
    firebaseUid: 'uid_123',
    legacyUserId: null,
    primaryAccountId: 'uid_123',
    accountIdAliases: ['uid_123']
  });
});

test('uid and legacyUserId create deduped aliases', () => {
  assert.deepEqual(buildAccountSession({
    firebaseUid: 'uid_123',
    legacyUserId: 'legacy_123',
    primaryAccountId: 'uid_123'
  }).accountIdAliases, ['uid_123', 'legacy_123']);
});

test('null and empty aliases are excluded', () => {
  assert.deepEqual(createAccountIdAliases(null, '', '  ', 'uid_123'), ['uid_123']);
});

test('duplicate aliases are removed', () => {
  assert.deepEqual(createAccountIdAliases('uid_123', 'uid_123', ['uid_123', 'legacy_123']), ['uid_123', 'legacy_123']);
});

test('authorId uid matches current user', () => {
  assert.equal(isCurrentUserPost({ authorId: 'uid_123' }, ['uid_123', 'legacy_123']), true);
});

test('authorId legacyUserId matches current user', () => {
  assert.equal(isCurrentUserPost({ authorId: 'legacy_123' }, ['uid_123', 'legacy_123']), true);
});

test('other authorId does not match current user', () => {
  assert.equal(isCurrentUserPost({ authorId: 'other_123' }, ['uid_123', 'legacy_123']), false);
});

test('legacy login stays compatible with legacy id alias', () => {
  const session = buildAccountSession({ legacyLoginId: 'legacy_123' });
  assert.deepEqual(session.accountIdAliases, ['legacy_123']);
  assert.equal(session.primaryAccountId, 'legacy_123');
  assert.equal(isCurrentAccountId('legacy_123', session.accountIdAliases), true);
});

test('uid follow map is preserved', () => {
  assert.deepEqual(mergeAccountIdMaps({ target_uid: true }), { target_uid: true });
});

test('legacy follow map is preserved', () => {
  assert.deepEqual(mergeAccountIdMaps({ target_legacy: true }), { target_legacy: true });
});

test('alias follow maps are merged', () => {
  assert.deepEqual(
    mergeAccountIdMaps({ target_uid: true }, { target_legacy: true }),
    { target_uid: true, target_legacy: true }
  );
});

test('follow map merge excludes null, empty and invalid map inputs', () => {
  assert.deepEqual(
    mergeAccountIdMaps(null, undefined, [], { '  ': true }, { target_uid: true }),
    { target_uid: true }
  );
});

test('follow map merge removes duplicate target ids', () => {
  assert.deepEqual(
    mergeAccountIdMaps({ target_a: true, target_b: true }, { target_a: true }),
    { target_a: true, target_b: true }
  );
});

test('follow count uses merged account ids', () => {
  assert.equal(countAccountIdMap(mergeAccountIdMaps(
    { target_a: true, target_b: true },
    { target_a: true, target_c: true }
  )), 3);
});

test('follower count uses merged account ids', () => {
  assert.equal(countAccountIdMap(mergeAccountIdMaps(
    { follower_uid: true },
    { follower_legacy: true, follower_uid: true }
  )), 2);
});

test('old login follow compatibility keeps the legacy document identity', () => {
  const session = buildAccountSession({ legacyLoginId: 'legacy_123' });
  assert.deepEqual(session.accountIdAliases, ['legacy_123']);
  assert.deepEqual(mergeAccountIdMaps({ target_a: true }), { target_a: true });
});

test('profile posts include uid and legacy authored posts', () => {
  const posts = [
    { id: 'p1', authorId: 'uid_123', timestamp: 30 },
    { id: 'p2', authorId: 'legacy_123', timestamp: 20 },
    { id: 'p3', authorId: 'other_123', timestamp: 10 }
  ];
  assert.deepEqual(
    collectProfilePostsForAliases(posts, ['uid_123', 'legacy_123']).map((post) => post.id),
    ['p1', 'p2']
  );
});

test('profile posts do not duplicate the same authored post', () => {
  const post = { id: 'p1', authorId: 'uid_123', timestamp: 30 };
  assert.deepEqual(
    collectProfilePostsForAliases([post, post], ['uid_123', 'legacy_123']).map((item) => item.id),
    ['p1']
  );
});

test('profile posts merge duplicate repost aliases once', () => {
  const posts = [{
    id: 'p1',
    authorId: 'other_123',
    timestamp: 10,
    reposts: {
      uid_123: { name: 'Current User', timestamp: 30 },
      legacy_123: { name: 'Legacy User', timestamp: 20 }
    }
  }];
  const result = collectProfilePostsForAliases(posts, ['uid_123', 'legacy_123']);
  assert.equal(result.length, 1);
  assert.equal(result[0]._isRepostEntry, true);
  assert.equal(result[0]._displayKey, 'p1_profile_repost_uid_123');
});

test('legacy profile supplement never carries password fields', () => {
  const merged = mergeCurrentProfileWithLegacyProfile({
    currentProfile: {
      id: 'uid_123',
      name: 'Apple Name',
      handle: '@apple',
      avatarColor: 'bg-gray-700',
      authProvider: 'apple.com'
    },
    legacyUserId: 'legacy_123',
    legacyProfile: {
      id: 'legacy_123',
      name: 'Legacy Name',
      bio: 'legacy bio',
      avatarUrl: 'data:image/png;base64,legacy',
      avatarColor: 'bg-blue-500',
      password: 'password123',
      saved_password: 'password123'
    }
  });

  assert.equal(merged.name, 'Apple Name');
  assert.equal(merged.bio, 'legacy bio');
  assert.equal(merged.avatarColor, 'bg-blue-500');
  assert.equal(Object.hasOwn(merged, 'password'), false);
  assert.equal(Object.hasOwn(merged, 'saved_password'), false);
});

test('MainApp clears profile state on account deletion reset', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /setCurrentAccountId\(''\)/);
  assert.match(source, /setCurrentUserProfile\(null\)/);
});

test('MainApp reads follows and followers through account aliases', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /const aliases = createAccountIdAliases\(accountIdAliases\)/);
  assert.match(source, /rooms\/\$\{rs\}\/follows\/\$\{alias\}/);
  assert.match(source, /rooms\/\$\{rs\}\/followers\/\$\{alias\}/);
  assert.match(source, /mergeAccountIdMaps\(Array\.from\(followMapsByAlias\.values\(\)\)\)/);
});

test('MainApp keeps bookmarks on currentAccountId instead of alias expansion', async () => {
  const source = await readFile('src/MainApp.jsx', 'utf8');
  assert.match(source, /rooms\/\$\{rs\}\/bookmarks\/\$\{currentAccountId\}/);
});

for (const { name, fn } of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`1..${tests.length}`);
