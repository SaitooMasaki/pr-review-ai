// Lemon Squeezy License Key 検証（AIPrompterから流用・改修）

import { STORAGE_KEYS, OWNER_KEY } from './constants.js';
import { storageGet, storageSet } from './storage.js';

const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const CACHE_HOURS = 24;

// ライセンスキーを検証してステータスを返す
export async function validateLicenseKey(licenseKey) {
  if (!licenseKey || !licenseKey.trim()) return 'invalid';

  // オーナーキーは Lemon Squeezy を呼ばずに即 Pro 付与
  if (licenseKey.trim() === OWNER_KEY) {
    await storageSet({
      [STORAGE_KEYS.LICENSE_KEY]:    licenseKey.trim(),
      [STORAGE_KEYS.LICENSE_STATUS]: 'pro',
      [STORAGE_KEYS.LICENSE_CACHE]:  {
        key:         licenseKey.trim(),
        validatedAt: new Date().toISOString(),
        status:      'pro',
      },
    });
    return 'pro';
  }

  // キャッシュ確認（24時間以内なら再検証しない）
  const cached = await getCachedStatus(licenseKey);
  if (cached) return cached;

  try {
    const res = await fetch(LS_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey }),
    });

    if (!res.ok) return 'invalid';

    const data = await res.json();
    const status = data.valid === true ? 'pro' : 'invalid';

    // キャッシュに保存
    await storageSet({
      [STORAGE_KEYS.LICENSE_KEY]:    licenseKey,
      [STORAGE_KEYS.LICENSE_STATUS]: status,
      [STORAGE_KEYS.LICENSE_CACHE]:  {
        key:         licenseKey,
        validatedAt: new Date().toISOString(),
        status,
      },
    });

    return status;
  } catch {
    // ネットワークエラー時は前回キャッシュを使用
    const data = await storageGet([STORAGE_KEYS.LICENSE_STATUS]);
    return data[STORAGE_KEYS.LICENSE_STATUS] ?? 'free';
  }
}

// キャッシュが有効なら返す
async function getCachedStatus(licenseKey) {
  const data = await storageGet([STORAGE_KEYS.LICENSE_CACHE]);
  const cache = data[STORAGE_KEYS.LICENSE_CACHE];
  if (!cache || cache.key !== licenseKey) return null;

  const hoursSince = (Date.now() - new Date(cache.validatedAt)) / 3_600_000;
  return hoursSince < CACHE_HOURS ? cache.status : null;
}

// 現在のProステータスを取得（キャッシュ優先）
export async function getProStatus() {
  const data = await storageGet([STORAGE_KEYS.LICENSE_STATUS]);
  return data[STORAGE_KEYS.LICENSE_STATUS] === 'pro';
}

// ライセンスを削除（非活性化）
export async function deactivateLicense() {
  await storageSet({
    [STORAGE_KEYS.LICENSE_KEY]:    '',
    [STORAGE_KEYS.LICENSE_STATUS]: 'free',
    [STORAGE_KEYS.LICENSE_CACHE]:  null,
  });
}
