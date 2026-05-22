// popup.js — 設定画面のロジック

import { STORAGE_KEYS, FREE_LIMIT, LEMON_SQUEEZY_CHECKOUT_URL, MODELS, DEFAULT_MODEL } from '../shared/constants.js';
import { storageGet, storageSet } from '../shared/storage.js';
import { validateLicenseKey, deactivateLicense } from '../shared/license.js';
import { canUseReview } from '../shared/counter.js';

// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  bindEvents();
});

async function loadAll() {
  const data = await storageGet([
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.LICENSE_STATUS,
    STORAGE_KEYS.SETTINGS,
  ]);

  // APIキー：保存済みなら入力欄を隠して「保存済み」表示にする
  const apiKey = data[STORAGE_KEYS.API_KEY] ?? '';
  setApiKeyUIMode(apiKey ? 'saved' : 'input');

  // ライセンス
  const licenseKey    = data[STORAGE_KEYS.LICENSE_KEY]    ?? '';
  const licenseStatus = data[STORAGE_KEYS.LICENSE_STATUS] ?? 'free';

  document.getElementById('license-key-input').value = licenseKey;
  updatePlanUI(licenseStatus);

  // 言語設定
  const lang = data[STORAGE_KEYS.SETTINGS]?.language ?? 'Japanese';
  document.getElementById('language-select').value = lang;

  // モデル設定
  const modelKey = data[STORAGE_KEYS.SETTINGS]?.model ?? DEFAULT_MODEL;
  const radio = document.querySelector(`input[name="model"][value="${modelKey}"]`);
  if (radio) radio.checked = true;
  updateModelHint(modelKey);

  // アップグレードリンク
  document.getElementById('upgrade-link').href = LEMON_SQUEEZY_CHECKOUT_URL;

  // 使用回数
  await updateUsageLabel();
}

// ===== イベントバインド =====

function bindEvents() {
  // APIキー保存
  document.getElementById('save-api-key').addEventListener('click', saveApiKey);

  // APIキー表示切り替え
  document.getElementById('toggle-key-visibility').addEventListener('click', () => {
    const input = document.getElementById('api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // APIキー変更ボタン
  document.getElementById('change-api-key').addEventListener('click', () => {
    document.getElementById('api-key-input').value = '';
    setApiKeyUIMode('input');
    document.getElementById('api-key-input').focus();
  });

  // ライセンス認証
  document.getElementById('activate-btn').addEventListener('click', activateLicense);

  // ライセンス無効化
  document.getElementById('deactivate-btn').addEventListener('click', async () => {
    await deactivateLicense();
    document.getElementById('license-key-input').value = '';
    updatePlanUI('free');
    showStatus('license-status', 'Deactivated.', 'neutral');
    await updateUsageLabel();
  });

  // 言語設定保存
  document.getElementById('language-select').addEventListener('change', async (e) => {
    const data = await storageGet([STORAGE_KEYS.SETTINGS]);
    const settings = data[STORAGE_KEYS.SETTINGS] ?? {};
    await storageSet({ [STORAGE_KEYS.SETTINGS]: { ...settings, language: e.target.value } });
  });

  // モデル選択保存
  document.querySelectorAll('input[name="model"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const modelKey = e.target.value;
      const data = await storageGet([STORAGE_KEYS.SETTINGS]);
      const settings = data[STORAGE_KEYS.SETTINGS] ?? {};
      await storageSet({ [STORAGE_KEYS.SETTINGS]: { ...settings, model: modelKey } });
      updateModelHint(modelKey);
    });
  });
}

// ===== APIキー保存 =====

async function saveApiKey() {
  const raw = document.getElementById('api-key-input').value.trim();

  // 空・マスク済み・短すぎるキーをはじく
  if (!raw || raw.includes('***') || raw.length < 20) {
    showStatus('api-key-status', 'Please enter a valid API key.', 'error');
    return;
  }

  await storageSet({ [STORAGE_KEYS.API_KEY]: raw });
  document.getElementById('api-key-input').value = '';
  setApiKeyUIMode('saved');
  showStatus('api-key-status', '✅ Saved!', 'success');
}

// APIキーUIの表示モードを切り替える
function setApiKeyUIMode(mode) {
  const savedRow  = document.getElementById('api-key-saved-row');
  const inputRow  = document.getElementById('api-key-input-row');
  if (mode === 'saved') {
    savedRow.classList.remove('hidden');
    inputRow.classList.add('hidden');
  } else {
    savedRow.classList.add('hidden');
    inputRow.classList.remove('hidden');
  }
}

// ===== ライセンス認証 =====

async function activateLicense() {
  const key = document.getElementById('license-key-input').value.trim();
  if (!key) {
    showStatus('license-status', 'Please enter a license key.', 'error');
    return;
  }

  const btn = document.getElementById('activate-btn');
  btn.textContent = 'Verifying…';
  btn.disabled = true;

  try {
    const status = await validateLicenseKey(key);
    if (status === 'pro') {
      updatePlanUI('pro');
      showStatus('license-status', '✅ Pro activated!', 'success');
    } else {
      showStatus('license-status', '❌ Invalid license key.', 'error');
    }
  } catch {
    showStatus('license-status', '⚠️ Network error. Please try again.', 'error');
  } finally {
    btn.textContent = 'Activate';
    btn.disabled = false;
    await updateUsageLabel();
  }
}

// ===== UI更新 =====

function updatePlanUI(status) {
  const badge          = document.getElementById('plan-badge');
  const activateBtn    = document.getElementById('activate-btn');
  const deactivateBtn  = document.getElementById('deactivate-btn');
  const upgradeBar     = document.getElementById('upgrade-bar');

  if (status === 'pro') {
    badge.textContent = 'PRO';
    badge.className   = 'badge badge-pro';
    activateBtn.classList.add('hidden');
    deactivateBtn.classList.remove('hidden');
    upgradeBar.classList.add('hidden');
  } else {
    badge.textContent = 'Free';
    badge.className   = 'badge badge-free';
    activateBtn.classList.remove('hidden');
    deactivateBtn.classList.add('hidden');
    upgradeBar.classList.remove('hidden');
  }
}

async function updateUsageLabel() {
  const { isPro, remaining } = await canUseReview();
  const label = document.getElementById('usage-label');
  if (isPro) {
    label.textContent = 'Unlimited reviews';
  } else {
    label.textContent = `Today: ${remaining}/${FREE_LIMIT} reviews remaining`;
  }
}

// ===== ユーティリティ =====

function updateModelHint(modelKey) {
  const hint = document.getElementById('model-hint');
  if (!hint) return;
  const m = MODELS[modelKey];
  hint.textContent = m ? m.description : '';
}

function maskKey(key) {
  if (!key || key.length < 12) return key;
  return key.slice(0, 12) + '***' + key.slice(-4);
}

function showStatus(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className   = `status-msg status-${type}`;
  setTimeout(() => { el.textContent = ''; }, 4000);
}
