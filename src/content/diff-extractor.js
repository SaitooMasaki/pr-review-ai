// GitHub PRのdiffをDOMから取得する
// 2025年以降のGitHub新UIに対応（CSS Modules + stable classes）

export function extractDiff() {
  const diffData = [];

  // ---- ファイル単位のコンテナを取得 ----
  // GitHubが CSS Modules に移行したため [class*="..."] でランダムサフィックスを無視
  const fileEntries = [
    ...document.querySelectorAll('[class*="PullRequestDiffsList-module_diffEntry_"]'),
  ];

  console.log('[PR Review AI] File entries found:', fileEntries.length);

  if (fileEntries.length > 0) {
    for (const entry of fileEntries) {
      const filePath = getFilePath(entry);
      const rows     = entry.querySelectorAll('.diff-line-row');
      const lines    = extractLines(rows);
      if (lines.length > 0) {
        diffData.push({ filePath, diff: lines.join('\n') });
      }
    }
  } else {
    // フォールバック: ページ全体の diff-line-row を取得（ファイル区別なし）
    const allRows = document.querySelectorAll('.diff-line-row');
    console.log('[PR Review AI] Fallback – diff-line-row count:', allRows.length);
    const lines = extractLines(allRows);
    if (lines.length > 0) {
      diffData.push({ filePath: '(all files)', diff: lines.join('\n') });
    }
  }

  console.log('[PR Review AI] Diff files extracted:', diffData.length);
  return diffData;
}

// ---- ファイルパスを取得 ----
function getFilePath(container) {
  // CSS Modules のファイル名クラス（ランダムサフィックスをワイルドカードで無視）
  const candidates = [
    '[class*="file-name_"]',
    '[class*="file-path-section_"]',
    '[class*="DiffFileHeader-module_file-name_"]',
    '[class*="DiffFileHeader-module_file-path"]',
  ];

  for (const sel of candidates) {
    const el = container.querySelector(sel);
    const text = el?.innerText?.trim();
    if (text) return text;
  }

  // /blob/ を含むリンクからパスを抽出
  const link = container.querySelector('a[href*="/blob/"]');
  if (link) {
    const match = link.href.match(/\/blob\/[^/]+\/(.+)/);
    if (match) return match[1];
  }

  return 'unknown';
}

// ---- diff-line-row からコード行を抽出 ----
function extractLines(rows) {
  const lines = [];

  for (const row of rows) {
    // empty-diff-line（左右splitビューの埋め草行）はスキップ
    if (row.classList.contains('empty-diff-line')) continue;

    const marker  = row.querySelector('.diff-text-marker')?.innerText?.trim() ?? '';
    const content = row.querySelector('.diff-text-inner')?.innerText ?? '';

    // マーカーで追加/削除/コンテキストを判定
    if (marker === '+')      lines.push(`+ ${content}`);
    else if (marker === '-') lines.push(`- ${content}`);
    else if (content.trim()) lines.push(`  ${content}`);
  }

  return lines;
}

// ---- PRのタイトルと説明文を取得 ----
export function extractPRMeta() {
  const titleSelectors = [
    'h1 bdi',
    '.js-issue-title',
    '[data-testid="issue-title"]',
    'h1.gh-header-title span',
    'h1',
  ];

  const descSelectors = [
    '.comment-body[itemprop="text"]',
    '.js-comment-body',
    '[data-testid="pull-request-body"]',
    '.markdown-body',
  ];

  let title = '';
  for (const sel of titleSelectors) {
    const text = document.querySelector(sel)?.innerText?.trim();
    if (text) { title = text; break; }
  }

  let description = '';
  for (const sel of descSelectors) {
    const text = document.querySelector(sel)?.innerText?.trim();
    if (text) { description = text; break; }
  }

  return { title: title || '(No title)', description };
}

// ---- サイズ制限（トークン超過防止） ----
export function truncateDiff(diffData, maxLinesPerFile = 200, maxTotalLines = 1000) {
  let totalLines = 0;
  const result   = [];

  for (const { filePath, diff } of diffData) {
    const lines     = diff.split('\n');
    const truncated = lines.length > maxLinesPerFile;
    const sliced    = lines.slice(0, maxLinesPerFile);
    const allowed   = Math.min(sliced.length, maxTotalLines - totalLines);

    if (allowed <= 0) break;
    totalLines += allowed;

    result.push({
      filePath,
      diff: (truncated || allowed < sliced.length)
        ? sliced.slice(0, allowed).join('\n') + '\n... (truncated)'
        : diff,
    });
  }

  return result;
}
