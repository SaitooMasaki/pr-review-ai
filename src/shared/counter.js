import { STORAGE_KEYS, FREE_LIMIT } from './constants.js';
import { storageGet, storageSet } from './storage.js';

// 今日の日付をローカルタイムゾーンで取得（"2026-05-22"）
function getToday() {
  return new Date().toLocaleDateString('sv-SE');
}

// レビュー実行が可能か確認する
export async function canUseReview() {
  const data = await storageGet([
    STORAGE_KEYS.LICENSE_STATUS,
    STORAGE_KEYS.DAILY_COUNT,
    STORAGE_KEYS.DAILY_DATE,
  ]);

  // Proユーザーは無制限
  if (data[STORAGE_KEYS.LICENSE_STATUS] === 'pro') {
    return { allowed: true, remaining: Infinity, isPro: true };
  }

  const today = getToday();

  // 日付が変わっていたらリセット
  if (data[STORAGE_KEYS.DAILY_DATE] !== today) {
    await storageSet({
      [STORAGE_KEYS.DAILY_COUNT]: 0,
      [STORAGE_KEYS.DAILY_DATE]: today,
    });
    return { allowed: true, remaining: FREE_LIMIT, isPro: false };
  }

  const count = data[STORAGE_KEYS.DAILY_COUNT] ?? 0;
  const remaining = FREE_LIMIT - count;
  return { allowed: remaining > 0, remaining, isPro: false };
}

// レビュー1回分をカウントアップ
export async function incrementCount() {
  const data = await storageGet([STORAGE_KEYS.DAILY_COUNT, STORAGE_KEYS.DAILY_DATE]);
  const today = getToday();

  // 日付が変わっていたらリセットしてから1にする
  if (data[STORAGE_KEYS.DAILY_DATE] !== today) {
    await storageSet({
      [STORAGE_KEYS.DAILY_COUNT]: 1,
      [STORAGE_KEYS.DAILY_DATE]: today,
    });
    return;
  }

  const current = data[STORAGE_KEYS.DAILY_COUNT] ?? 0;
  await storageSet({ [STORAGE_KEYS.DAILY_COUNT]: current + 1 });
}

// 残り回数を取得（バッジ表示用）
export async function getRemaining() {
  const result = await canUseReview();
  return result;
}
