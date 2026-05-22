// レビュー結果をHTMLに変換してサイドパネルに表示する

const SEVERITY_CONFIG = {
  critical: { icon: '🔴', label: 'Critical', cls: 'sev-critical' },
  high:     { icon: '🟠', label: 'High',     cls: 'sev-high'     },
  medium:   { icon: '🟡', label: 'Medium',   cls: 'sev-medium'   },
  low:      { icon: '🔵', label: 'Low',      cls: 'sev-low'      },
  info:     { icon: '⚪', label: 'Info',     cls: 'sev-info'     },
};

const RECOMMENDATION_CONFIG = {
  approve:         { icon: '✅', label: 'Approve',         cls: 'rec-approve'  },
  request_changes: { icon: '🔁', label: 'Request Changes', cls: 'rec-changes'  },
  comment:         { icon: '💬', label: 'Comment',         cls: 'rec-comment'  },
};

// APIのレスポンステキストをパースしてHTMLにレンダリング
export function renderReview(rawText, panelBodyEl) {
  let parsed = null;

  try {
    // 最初の { から最後の } を取り出してパース（ネストしたコードブロックに対応）
    const start = rawText.indexOf('{');
    const end   = rawText.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found');
    parsed = JSON.parse(rawText.slice(start, end + 1));
  } catch {
    // パース失敗時はプレーンテキストで表示
    panelBodyEl.innerHTML = `
      <div class="ai-raw-text">
        <p class="ai-parse-warning">⚠️ Could not parse structured response. Raw output:</p>
        <pre>${escapeHtml(rawText)}</pre>
      </div>`;
    return;
  }

  const rec = RECOMMENDATION_CONFIG[parsed.overall_recommendation] ?? RECOMMENDATION_CONFIG.comment;
  const issuesBySeverity = sortIssuesBySeverity(parsed.issues ?? []);

  panelBodyEl.innerHTML = `
    <!-- 総合判定 -->
    <div class="ai-recommendation ${rec.cls}">
      ${rec.icon} <strong>${rec.label}</strong>
    </div>

    <!-- 概要 -->
    <div class="ai-summary">
      <p>${escapeHtml(parsed.summary ?? '')}</p>
    </div>

    <!-- 問題点一覧 -->
    ${issuesBySeverity.length > 0 ? `
      <div class="ai-section">
        <h3>Issues (${issuesBySeverity.length})</h3>
        ${issuesBySeverity.map(issue => renderIssue(issue)).join('')}
      </div>
    ` : '<div class="ai-no-issues">✅ No significant issues found.</div>'}

    <!-- 良い点 -->
    ${(parsed.positives?.length > 0) ? `
      <div class="ai-section">
        <h3>👍 Positives</h3>
        <ul class="ai-positives">
          ${parsed.positives.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
  `;
}

function renderIssue(issue) {
  const cfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.info;
  return `
    <div class="ai-issue ${cfg.cls}">
      <div class="ai-issue-header">
        <span class="ai-issue-sev">${cfg.icon} ${cfg.label}</span>
        <span class="ai-issue-file">${escapeHtml(issue.file ?? '')}</span>
        ${issue.line_hint ? `<span class="ai-issue-line">${escapeHtml(issue.line_hint)}</span>` : ''}
      </div>
      <div class="ai-issue-title">${escapeHtml(issue.title ?? '')}</div>
      <div class="ai-issue-desc">${escapeHtml(issue.description ?? '')}</div>
      ${issue.suggestion ? `
        <div class="ai-issue-suggestion">
          <span class="ai-suggestion-label">💡 Suggestion:</span>
          ${escapeHtml(issue.suggestion)}
        </div>` : ''}
    </div>`;
}

// 重大度順にソート
function sortIssuesBySeverity(issues) {
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return [...issues].sort((a, b) =>
    (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
  );
}

// ローディング表示
export function renderLoading(panelBodyEl) {
  panelBodyEl.innerHTML = `
    <div class="ai-loading">
      <div class="ai-spinner"></div>
      <p>Analyzing your PR...</p>
      <p class="ai-loading-sub">Powered by Claude (your API key)</p>
    </div>`;
}

// エラー表示
export function renderError(panelBodyEl, message) {
  panelBodyEl.innerHTML = `
    <div class="ai-error">
      <p>❌ ${escapeHtml(message)}</p>
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
