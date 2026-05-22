import { FREE_LIMIT } from '../shared/constants.js';
import { canUseReview } from '../shared/counter.js';

const BUTTON_ID = 'ai-review-btn';
const PANEL_ID  = 'ai-review-panel';
const BODY_ID   = 'ai-review-panel-body';

// ===== フローティングボタン（DOM依存なし・確実に表示） =====

export function injectReviewButton(onClickCallback) {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.className = 'ai-review-fab';
  btn.title = 'AI Code Review';
  btn.innerHTML = `
    <span class="ai-fab-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    </span>
    <span class="ai-fab-label">AI Review</span>
    <span id="ai-review-badge" class="ai-review-badge"></span>
  `;
  btn.addEventListener('click', onClickCallback);
  document.body.appendChild(btn);

  updateBadge();
}

export function removeReviewButton() {
  document.getElementById(BUTTON_ID)?.remove();
}

export function setButtonLoading(isLoading) {
  const btn = document.getElementById(BUTTON_ID);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('ai-fab-loading', isLoading);

  const label = btn.querySelector('.ai-fab-label');
  if (label) label.textContent = isLoading ? 'Analyzing…' : 'AI Review';
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
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
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

// ===== 制限到達トースト =====

export function showUpgradePrompt() {
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
