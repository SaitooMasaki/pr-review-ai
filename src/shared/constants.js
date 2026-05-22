// ============================================================
// 定数・DOMセレクタ集中管理
// GitHubのDOM変更があった場合はここだけ修正する
// ============================================================

export const STORAGE_KEYS = {
  API_KEY:        'anthropic_api_key',
  LICENSE_KEY:    'license_key',
  LICENSE_STATUS: 'license_status',   // 'free' | 'pro' | 'invalid'
  LICENSE_CACHE:  'license_cache',    // { key, validatedAt, status }
  DAILY_COUNT:    'daily_count',
  DAILY_DATE:     'daily_date',       // "2026-05-22"
  SETTINGS:       'settings',         // { language: 'ja' | 'en', model: 'haiku' | 'sonnet' }
};

export const FREE_LIMIT = 3;

export const LS_PRODUCT_ID = null; // TODO: Lemon Squeezy product ID を設定

// 開発者・オーナー専用キー（Lemon Squeezy 未設定でも Pro として動作）
export const OWNER_KEY = 'OWNER-PR-REVIEW-AI-2026-MASAKI';

export const LEMON_SQUEEZY_CHECKOUT_URL =
  'https://saitoomasaki.lemonsqueezy.com/checkout/buy/YOUR_PRODUCT_ID'; // TODO: 更新

// モデル選択肢
export const MODELS = {
  haiku:  { id: 'claude-haiku-4-5',  label: '⚡ Haiku — Fast & cheap',    description: 'Good for small PRs. May miss subtle bugs.' },
  sonnet: { id: 'claude-sonnet-4-5', label: '🎯 Sonnet — Precise',         description: 'Best for security reviews. ~5× more tokens.' },
};
export const DEFAULT_MODEL = 'haiku';

export const ANTHROPIC_MODEL = MODELS.haiku.id; // 後方互換（未使用になるが残す）
export const ANTHROPIC_MAX_TOKENS = 4096;

// GitHub DOM セレクタ（変更リスクが高いので複数フォールバック定義）
export const SELECTORS = {
  // ファイルコンテナ（diff単位）
  DIFF_FILE_CONTAINER: [
    '[data-tagsearch-path]',
    '.file[data-path]',
    '.js-file-content',
  ],

  // diffテーブル本体
  DIFF_TABLE: [
    '.diff-table',
    'table[data-hunk-id]',
    '.data.tab-size',
  ],

  // PRのFiles changedタブ内ツールバー（ボタン挿入先）
  PR_TOOLBAR: [
    '.pr-review-tools',
    '.diffbar',
    '[data-target="diff-layout.mainContainer"] .d-flex.flex-items-center',
  ],

  // PRタイトル
  PR_TITLE: [
    '.js-issue-title',
    '[data-testid="issue-title"]',
    'h1 bdi',
  ],

  // PR本文（最初のコメント）
  PR_DESCRIPTION: [
    '.comment-body[itemprop="text"]',
    '.js-comment-body',
    '[data-testid="pull-request-body"]',
  ],
};

// DOMセレクタを順番に試してマッチした要素を返す
export function querySelector(selectorList, parent = document) {
  for (const sel of selectorList) {
    try {
      const el = parent.querySelector(sel);
      if (el) return el;
    } catch {
      // 無効なセレクタはスキップ
    }
  }
  return null;
}

export function querySelectorAll(selectorList, parent = document) {
  for (const sel of selectorList) {
    try {
      const els = parent.querySelectorAll(sel);
      if (els.length > 0) return els;
    } catch {
      // 無効なセレクタはスキップ
    }
  }
  return [];
}
