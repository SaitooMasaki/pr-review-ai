// メインのcontent script
// GitHub PRページ（/*/pull/*）に注入される

import { extractDiff, extractPRMeta, truncateDiff } from './diff-extractor.js';
import {
  injectReviewButton,
  injectSidePanel,
  setButtonLoading,
  getPanelBody,
  updateBadge,
  showUpgradePrompt,
} from './ui-injector.js';
import { renderLoading, renderReview, renderError } from './panel-renderer.js';
import { canUseReview, incrementCount } from '../shared/counter.js';
import { storageGet } from '../shared/storage.js';
import { STORAGE_KEYS } from '../shared/constants.js';

// ===== エントリーポイント =====

init();

function init() {
  // ページ読み込み完了後にボタンを挿入
  if (document.readyState === 'complete') {
    tryInjectButton();
  } else {
    window.addEventListener('load', tryInjectButton);
  }

  // GitHub はSPAなのでURLが変わったときも再注入
  observeUrlChange();
}

function tryInjectButton() {
  injectReviewButton(onReviewClick);

  // ボタンが見つからなかった場合はリトライ（GitHubのレンダリング遅延対策）
  if (!document.getElementById('ai-review-btn')) {
    let retries = 0;
    const timer = setInterval(() => {
      injectReviewButton(onReviewClick);
      retries++;
      if (document.getElementById('ai-review-btn') || retries > 10) {
        clearInterval(timer);
      }
    }, 800);
  }
}

// ===== レビュー実行 =====

async function onReviewClick() {
  // 利用制限チェック
  const { allowed, remaining, isPro } = await canUseReview();
  if (!allowed) {
    showUpgradePrompt(remaining);
    return;
  }

  // APIキー確認
  const data = await storageGet([STORAGE_KEYS.API_KEY]);
  const apiKey = data[STORAGE_KEYS.API_KEY];
  if (!apiKey) {
    alert('Please set your Anthropic API key in the extension popup first.');
    return;
  }

  // UI: ローディング開始
  setButtonLoading(true);
  injectSidePanel();
  const panelBody = getPanelBody();
  renderLoading(panelBody);

  try {
    // diff取得
    const rawDiff  = extractDiff();
    const diffData = truncateDiff(rawDiff);
    const meta     = extractPRMeta();

    if (diffData.length === 0) {
      const hint = location.href.includes('/files')
        ? 'Files are collapsed — click "Load diff" or expand each file, then try again.'
        : 'Please click the "Files changed" tab first, then click AI Review.';
      renderError(panelBody, `No diff found. ${hint}`);
      return;
    }

    // プロンプト構築（ファイルリストを明示して見落とし防止）
    const { systemPrompt, userPrompt } = buildPrompts(meta, diffData);

    // Anthropic API呼び出し（service worker経由）
    const result = await chrome.runtime.sendMessage({
      type: 'CALL_ANTHROPIC',
      payload: { apiKey, systemPrompt, userPrompt },
    });

    if (!result.ok) throw new Error(result.error);

    // カウントアップ（Proは不要だがカウントしても問題ない）
    if (!isPro) await incrementCount();

    // 結果表示
    renderReview(result.data, panelBody);
    updateBadge();

  } catch (err) {
    renderError(panelBody, err.message);
  } finally {
    setButtonLoading(false);
  }
}

// ===== プロンプト構築 =====

function buildPrompts(meta, diffData) {
  const systemPrompt = `You are a security-focused code reviewer. Your PRIMARY job is to find bugs and security vulnerabilities. Do not get distracted by style or architecture.

IMPORTANT CONTEXT — Read before reviewing:
- This may be a Chrome Extension using BYOK (Bring Your Own Key) architecture. In BYOK extensions, users provide their own API keys stored locally (e.g., chrome.storage.local). Direct browser API calls with user-provided keys are INTENTIONAL and expected — do NOT flag these as security issues.
- The Anthropic header 'anthropic-dangerous-direct-browser-access' is an official header required for legitimate BYOK browser extensions — do NOT flag it.
- Focus on bugs that affect real users, not architectural patterns that are intentional design choices.

STEP 1 — SECURITY SCAN (mandatory, check every function):
Go through every added/modified line and check for:
- XSS: innerHTML, document.write, eval, setTimeout(string)
- Injection: SQL/shell/template string injection
- Secrets: API keys, passwords, tokens hardcoded
- Auth bypass: missing auth checks, insecure direct object refs
- Prototype pollution, ReDoS, path traversal
- Zero-division, null dereference, off-by-one

STEP 2 — LOGIC BUGS:
- Missing error handling
- Incorrect conditionals, edge cases (empty array, 0, null)
- Race conditions, async issues

STEP 3 — ONLY IF no critical/high issues remain:
- Code quality, performance, maintainability

Return ONLY this JSON (no markdown, no text outside JSON):
{
  "summary": "1-2 sentence overview of what this PR does",
  "severity": "low|medium|high|critical",
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "file": "path/to/file",
      "line_hint": "function name or line content",
      "title": "Short issue title",
      "description": "Exact explanation of the vulnerability or bug",
      "suggestion": "Concrete fix with example code if possible"
    }
  ],
  "positives": ["Good aspect 1"],
  "overall_recommendation": "approve|request_changes|comment"
}

Respond in Japanese. If you find a security vulnerability, always mark it critical or high — never downgrade security issues.`;

  const diffText = diffData
    .map(({ filePath, diff }) =>
      `### File: ${filePath}\n\`\`\`diff\n${diff}\n\`\`\``
    )
    .join('\n\n');

  const fileList = diffData.map(d => `- ${d.filePath}`).join('\n');

  const userPrompt = `## Pull Request: ${meta.title}

## Description:
${meta.description || '(No description provided)'}

## Files changed in this PR (review ALL of them):
${fileList}

## Diffs:
${diffText}

IMPORTANT: You must check every file listed above. Do not skip any file. Start with a security scan of each function before anything else.

Return your JSON analysis.`;

  return { systemPrompt, userPrompt };
}

// ===== SPA対応: URLの変化を監視 =====

function observeUrlChange() {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      // PR ページに来たらボタンを再注入
      if (/\/pull\/\d+/.test(location.href)) {
        setTimeout(tryInjectButton, 1000);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
