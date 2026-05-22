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
      renderError(panelBody, 'No diff found. Make sure the "Files changed" tab is visible and files are expanded.');
      return;
    }

    // プロンプト構築
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
  const systemPrompt = `You are an expert code reviewer with deep knowledge of software engineering best practices, security vulnerabilities, and performance optimization.

Review the GitHub Pull Request diff and return ONLY a JSON object (no markdown, no explanation outside the JSON):
{
  "summary": "1-2 sentence overview of what this PR does",
  "severity": "low|medium|high|critical",
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "file": "path/to/file",
      "line_hint": "approximate line or function name",
      "title": "Short issue title",
      "description": "Detailed explanation",
      "suggestion": "Specific fix or improvement"
    }
  ],
  "positives": ["Good aspect 1", "Good aspect 2"],
  "overall_recommendation": "approve|request_changes|comment"
}

Review priorities (in order):
1. Security vulnerabilities (SQL injection, XSS, auth bypass, secrets in code)
2. Logic bugs and edge cases
3. Performance issues
4. Code quality and maintainability
5. Missing error handling

Respond in Japanese.`;

  const diffText = diffData
    .map(({ filePath, diff }) =>
      `### File: ${filePath}\n\`\`\`diff\n${diff}\n\`\`\``
    )
    .join('\n\n');

  const userPrompt = `## Pull Request: ${meta.title}

## Description:
${meta.description || '(No description provided)'}

## Changed Files:
${diffText}

Please review the above diff and return your JSON analysis.`;

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
