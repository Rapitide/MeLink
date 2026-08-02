import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';

const PROJECT_ID = 'melink-rules-test';
const rules = fs.readFileSync('firestore.rules', 'utf8');

const initialUser = (uid, overrides = {}) => ({
  uid,
  handle: null,
  displayName: null,
  authProviders: ['apple.com'],
  appleLinked: true,
  profileSetupCompleted: false,
  legacyUserId: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides
});

const seededUser = (uid, overrides = {}) => ({
  uid,
  handle: null,
  displayName: null,
  authProviders: ['apple.com'],
  appleLinked: true,
  profileSetupCompleted: false,
  legacyUserId: null,
  createdAt: Timestamp.fromMillis(1000),
  updatedAt: Timestamp.fromMillis(1000),
  ...overrides
});

const appleAuth = () => ({
  firebase: {
    sign_in_provider: 'apple.com'
  }
});

const anonymousAuth = () => ({
  firebase: {
    sign_in_provider: 'anonymous'
  }
});

const passwordAuth = () => ({
  firebase: {
    sign_in_provider: 'password'
  }
});

let testEnv;

const appleDb = (uid = 'alice') => testEnv.authenticatedContext(uid, appleAuth()).firestore();
const anonymousDb = (uid = 'anon') => testEnv.authenticatedContext(uid, anonymousAuth()).firestore();
const passwordDb = (uid = 'password-user') => testEnv.authenticatedContext(uid, passwordAuth()).firestore();
const unauthenticatedDb = () => testEnv.unauthenticatedContext().firestore();

const seed = async (path, data) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
};

const reset = async () => {
  await testEnv.clearFirestore();
};

const runTest = async (name, fn) => {
  await reset();
  await fn();
  console.log(`ok - ${name}`);
};

testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules }
});

try {
  await runTest('Apple認証済み本人がusers/{uid}を初期作成できる', async () => {
    await assertSucceeds(setDoc(doc(appleDb('alice'), 'users/alice'), initialUser('alice')));
  });

  await runTest('Apple認証済み本人が自分のusers/{uid}を読める', async () => {
    await seed('users/alice', seededUser('alice'));
    await assertSucceeds(getDoc(doc(appleDb('alice'), 'users/alice')));
  });

  await runTest('初回プロフィール設定更新が成功する', async () => {
    await seed('users/alice', seededUser('alice'));
    const db = appleDb('alice');
    const batch = writeBatch(db);
    batch.set(doc(db, 'handles/alice_01'), {
      uid: 'alice',
      createdAt: serverTimestamp()
    });
    batch.update(doc(db, 'users/alice'), {
      displayName: 'Alice',
      handle: 'alice_01',
      profileSetupCompleted: true,
      updatedAt: serverTimestamp()
    });
    await assertSucceeds(batch.commit());
  });

  await runTest('未使用handleを本人が作成できる', async () => {
    await assertSucceeds(setDoc(doc(appleDb('alice'), 'handles/alice_01'), {
      uid: 'alice',
      createdAt: serverTimestamp()
    }));
  });

  await runTest('未認証ユーザーがusersを作成できない', async () => {
    await assertFails(setDoc(doc(unauthenticatedDb(), 'users/alice'), initialUser('alice')));
  });

  await runTest('匿名ユーザーがusersを作成できない', async () => {
    await assertFails(setDoc(doc(anonymousDb('alice'), 'users/alice'), initialUser('alice')));
  });

  await runTest('他人のusersを読めない', async () => {
    await seed('users/bob', seededUser('bob'));
    await assertFails(getDoc(doc(appleDb('alice'), 'users/bob')));
  });

  await runTest('他人のusersを更新できない', async () => {
    await seed('users/bob', seededUser('bob'));
    await assertFails(updateDoc(doc(appleDb('alice'), 'users/bob'), {
      displayName: 'Alice',
      handle: 'alice_01',
      profileSetupCompleted: true,
      updatedAt: serverTimestamp()
    }));
  });

  await runTest('uidを書き換えられない', async () => {
    await seed('users/alice', seededUser('alice'));
    await seed('handles/alice_01', { uid: 'alice', createdAt: Timestamp.fromMillis(1000) });
    await assertFails(updateDoc(doc(appleDb('alice'), 'users/alice'), {
      uid: 'mallory',
      displayName: 'Alice',
      handle: 'alice_01',
      profileSetupCompleted: true,
      updatedAt: serverTimestamp()
    }));
  });

  await runTest('createdAtを書き換えられない', async () => {
    await seed('users/alice', seededUser('alice'));
    await seed('handles/alice_01', { uid: 'alice', createdAt: Timestamp.fromMillis(1000) });
    await assertFails(updateDoc(doc(appleDb('alice'), 'users/alice'), {
      displayName: 'Alice',
      handle: 'alice_01',
      profileSetupCompleted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
  });

  await runTest('emailを追加できない', async () => {
    await assertFails(setDoc(doc(appleDb('alice'), 'users/alice'), initialUser('alice', {
      email: 'hidden@example.com'
    })));
  });

  await runTest('passwordを追加できない', async () => {
    await assertFails(setDoc(doc(appleDb('alice'), 'users/alice'), initialUser('alice', {
      password: 'secret'
    })));
  });

  await runTest('tokenやnonceを追加できない', async () => {
    await assertFails(setDoc(doc(appleDb('alice'), 'users/alice'), initialUser('alice', {
      token: 'secret',
      nonce: 'secret'
    })));
  });

  await runTest('不正handleを保存できない', async () => {
    await assertFails(setDoc(doc(appleDb('alice'), 'handles/_bad'), {
      uid: 'alice',
      createdAt: serverTimestamp()
    }));
  });

  await runTest('予約語handleを保存できない', async () => {
    await assertFails(setDoc(doc(appleDb('alice'), 'handles/admin'), {
      uid: 'alice',
      createdAt: serverTimestamp()
    }));
  });

  await runTest('既存handleを上書きできない', async () => {
    await seed('handles/alice_01', { uid: 'bob', createdAt: Timestamp.fromMillis(1000) });
    await assertFails(setDoc(doc(appleDb('alice'), 'handles/alice_01'), {
      uid: 'alice',
      createdAt: serverTimestamp()
    }));
  });

  await runTest('handlesを更新できない', async () => {
    await seed('handles/alice_01', { uid: 'alice', createdAt: Timestamp.fromMillis(1000) });
    await assertFails(updateDoc(doc(appleDb('alice'), 'handles/alice_01'), {
      uid: 'bob'
    }));
  });

  await runTest('handlesを削除できない', async () => {
    await seed('handles/alice_01', { uid: 'alice', createdAt: Timestamp.fromMillis(1000) });
    await assertFails(deleteDoc(doc(appleDb('alice'), 'handles/alice_01')));
  });

  await runTest('profileSetupCompletedをtrueからfalseへ戻せない', async () => {
    await seed('users/alice', seededUser('alice', {
      displayName: 'Alice',
      handle: 'alice_01',
      profileSetupCompleted: true
    }));
    await assertFails(updateDoc(doc(appleDb('alice'), 'users/alice'), {
      profileSetupCompleted: false,
      updatedAt: serverTimestamp()
    }));
  });

  await runTest('legacyUserIdをクライアントから変更できない', async () => {
    await seed('users/alice', seededUser('alice'));
    await seed('handles/alice_01', { uid: 'alice', createdAt: Timestamp.fromMillis(1000) });
    await assertFails(updateDoc(doc(appleDb('alice'), 'users/alice'), {
      displayName: 'Alice',
      handle: 'alice_01',
      profileSetupCompleted: true,
      legacyUserId: 'legacy_alice',
      updatedAt: serverTimestamp()
    }));
  });
  await runTest('未認証はadmins/{uid}を読めない', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await assertFails(getDoc(doc(unauthenticatedDb(), 'admins/admin_uid')));
  });

  await runTest('匿名ユーザーはadmins/{uid}を読めない', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await assertFails(getDoc(doc(anonymousDb('admin_uid'), 'admins/admin_uid')));
  });

  await runTest('本人は自分のadmins/{uid}を読める', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await assertSucceeds(getDoc(doc(passwordDb('admin_uid'), 'admins/admin_uid')));
  });

  await runTest('adminsはクライアントから作成できない', async () => {
    await assertFails(setDoc(doc(passwordDb('admin_uid'), 'admins/admin_uid'), {
      role: 'admin',
      enabled: true,
      createdAt: serverTimestamp()
    }));
  });

  await runTest('adminsなしユーザーは管理者操作できない', async () => {
    await assertFails(setDoc(doc(passwordDb('plain_uid'), 'globalData/boardRooms'), {
      rooms: {
        test: { createdAt: 1, createdBy: 'plain_uid' }
      }
    }));
  });

  await runTest('enabled falseは管理者操作できない', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: false,
      createdAt: Timestamp.fromMillis(1000)
    });
    await assertFails(setDoc(doc(passwordDb('admin_uid'), 'globalData/boardRooms'), {
      rooms: {
        test: { createdAt: 1, createdBy: 'admin_uid' }
      }
    }));
  });

  await runTest('roleがadmin以外なら管理者操作できない', async () => {
    await seed('admins/admin_uid', {
      role: 'moderator',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await assertFails(setDoc(doc(passwordDb('admin_uid'), 'globalData/boardRooms'), {
      rooms: {
        test: { createdAt: 1, createdBy: 'admin_uid' }
      }
    }));
  });

  await runTest('正常なadmins/{uid}だけglobalDataを書ける', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await assertSucceeds(setDoc(doc(passwordDb('admin_uid'), 'globalData/boardRooms'), {
      rooms: {
        test: { createdAt: 1, createdBy: 'admin_uid' }
      }
    }));
  });

  await runTest('一般ユーザーは公式ピン更新できない', async () => {
    await seed('rooms/default/posts/post1', {
      authorId: 'alice',
      content: 'hello',
      isGlobalPinned: false
    });
    await assertFails(updateDoc(doc(passwordDb('plain_uid'), 'rooms/default/posts/post1'), {
      isGlobalPinned: true
    }));
  });

  await runTest('管理者は公式ピン更新できる', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await seed('rooms/default/posts/post1', {
      authorId: 'alice',
      content: 'hello',
      isGlobalPinned: false
    });
    await assertSucceeds(updateDoc(doc(passwordDb('admin_uid'), 'rooms/default/posts/post1'), {
      isGlobalPinned: true
    }));
  });

  await runTest('一般ユーザーは他人投稿を削除できない', async () => {
    await seed('rooms/default/posts/post1', {
      authorId: 'alice',
      content: 'hello'
    });
    await assertFails(deleteDoc(doc(passwordDb('plain_uid'), 'rooms/default/posts/post1')));
  });

  await runTest('管理者は投稿を削除できる', async () => {
    await seed('admins/admin_uid', {
      role: 'admin',
      enabled: true,
      createdAt: Timestamp.fromMillis(1000)
    });
    await seed('rooms/default/posts/post1', {
      authorId: 'alice',
      content: 'hello'
    });
    await assertSucceeds(deleteDoc(doc(passwordDb('admin_uid'), 'rooms/default/posts/post1')));
  });
} finally {
  await testEnv.cleanup();
}

assert.ok(true);
