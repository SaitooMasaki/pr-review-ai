import { SELECTORS, querySelector, FREE_LIMIT } from '../shared/constants.js';
import { canUseReview } from '../shared/counter.js';

const BUTTON_ID = 'ai-review-btn';
const PANEL_ID  = 'ai-review-panel';
const BODY_ID   = 'ai-review-panel-body';

// ===== ボタン =====

export function injectReviewButton(onClickCallback) {
  if (document.getElementById(BUTTON_ID)) return;

  const toolbar = querySelector(SELECTORS.PR_TOOLBAR);
  if (!toolbar) {
    console.warn('[PR Review AI] Toolbar not found. Will retry on next mutation.');
    return;
  }

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.className = 'ai-review-trigger-btn';
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4l3 3"/>
    </svg>
    AI Review
    <span id="ai-review-badge" class="ai-review-badge"></span>
  `;
  btn.addEventListener('click', onClickCallback);
  toolbar.appendChild(btn);

  updateBadge();
}

export function removeReviewButton() {
  document.getElementById(BUTTON_ID)?.remove();
}

export function setButtonLoading(isLoading) {
  const btn = document.getElementById(BUTTON_ID);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('ai-btn-loading', isLoading);

  const svg = btn.querySelector('svg');
  if (svg) svg.style.display = isLoading ? 'none' : '';

  // テキストノードを更新（バッジは残す）
  const badge = document.getElementById('ai-review-badge');
  const text  = isLoading ? ' Analyzing…' : ' AI Review';
  btn.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) node.textContent = text;
  });
  if (badge) btn.appendChild(badge);
}

export async function updateBadge() {
  const badge = document.getElementById('ai-review-badge');
  if (!badge) return;

  const { isPro, remaining } = await canUseReview();
  if (isPro) {
    badge.textContent = 'PRO';
    badge.className = 'ai-review-badge ai-badge-pro';
  } else {
    badge.textContent = `${remaining}/${FREE_LIMIT}`;
    badge.className = `ai-review-badge ${remaining === 0 ? 'ai-badge-empty' : ''}`;
  }
}

// ===== サイドパネル =====

export function injectSidePanel() {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'ai-review-panel';
  panel.innerHTML = `
    <div class="ai-panel-header">
      <div class="ai-panel-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
        AI Code Review
      </div>
      <div class="ai-panel-actions">
        <button id="ai-panel-copy" class="ai-panel-btn" title="Copy review">📋</button>
        <button id="ai-panel-close" class="ai-panel-btn" title="Close">✕</button>
      </div>
    </div>
    <div id="${BODY_ID}" class="ai-panel-body"></div>
  `;

  document.body.appendChild(panel);

  // GitHubのdiffエリアを左に寄せる
  document.querySelector('#files')?.classList.add('ai-review-active');

  document.getElementById('ai-panel-close').addEventListener('click', closeSidePanel);
  document.getElementById('ai-panel-copy').addEventListener('click', copyReviewText);
}

export function closeSidePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) {
    panel.classList.add('ai-panel-closing');
    setTimeout(() => {
      panel.remove();
      document.querySelector('#files')?.classList.remove('ai-review-active');
    }, 200);
  }
  setButtonLoading(false);
}

export function getPanelBody() {
  return document.getElementById(BODY_ID);
}

function copyReviewText() {
  const body = document.getElementById(BODY_ID);
  if (!body) return;
  navigator.clipboard.writeText(body.innerText).then(() => {
    const btn = document.getElementById('ai-panel-copy');
    if (btn) {
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📋'; }, 1500);
    }
  });
}

// ===== 制限到達ダイアログ =====

export function showUpgradePrompt(remaining) {
  const existing = document.getElementById('ai-upgrade-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'ai-upgrade-toast';
  toast.className = 'ai-upgrade-toast';
  toast.innerHTML = `
    <div class="ai-toast-content">
      <strong>Free limit reached (${FREE_LIMIT}/day)</strong>
      <p>Upgrade to Pro for unlimited reviews.</p>
      <div class="ai-toast-actions">
        <a href="https://saitoomasaki.lemonsqueezy.com" target="_blank" class="ai-btn-upgrade">
          Upgrade to Pro →
        </a>
        <button id="ai-toast-close" class="ai-btn-dismiss">Maybe later</button>
      </div>
    </div>
  `;

  document.body.appendChild(toast);
  document.getElementById('ai-toast-close').addEventListener('click', () => toast.remove());
  setTimeout(() => toast?.remove(), 8000);
}
