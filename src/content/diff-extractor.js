import { SELECTORS, querySelector, querySelectorAll } from '../shared/constants.js';

// PRのdiff情報を全ファイル分取得する
export function extractDiff() {
  const diffData = [];
  const fileContainers = querySelectorAll(SELECTORS.DIFF_FILE_CONTAINER);

  fileContainers.forEach((container) => {
    // ファイルパスを取得
    const filePath =
      container.getAttribute('data-tagsearch-path') ||
      container.getAttribute('data-path') ||
      container.querySelector('[data-path]')?.getAttribute('data-path') ||
      'unknown';

    // diffテーブルを取得（折りたたまれているファイルはスキップ）
    const diffTable = querySelector(SELECTORS.DIFF_TABLE, container);
    if (!diffTable) return;

    const lines = [];
    diffTable.querySelectorAll('tr').forEach((row) => {
      const addition = row.querySelector('.blob-code-addition .blob-code-inner');
      const deletion = row.querySelector('.blob-code-deletion .blob-code-inner');
      const context  = row.querySelector('.blob-code-context  .blob-code-inner');

      if (addition) lines.push(`+ ${addition.innerText}`);
      else if (deletion) lines.push(`- ${deletion.innerText}`);
      else if (context)  lines.push(`  ${context.innerText}`);
    });

    if (lines.length > 0) {
      diffData.push({ filePath, diff: lines.join('\n') });
    }
  });

  return diffData;
}

// PRのタイトルと本文を取得する
export function extractPRMeta() {
  const titleEl       = querySelector(SELECTORS.PR_TITLE);
  const descriptionEl = querySelector(SELECTORS.PR_DESCRIPTION);

  return {
    title:       titleEl?.innerText?.trim()       ?? '(No title)',
    description: descriptionEl?.innerText?.trim() ?? '',
  };
}

// diffが大きすぎる場合にトークン数を制限する
// claude-3-5-haikuの入力上限は200kトークンだが
// 実用上は1ファイル200行・全体1000行までに制限する
export function truncateDiff(diffData, maxLinesPerFile = 200, maxTotalLines = 1000) {
  let totalLines = 0;
  const result = [];

  for (const { filePath, diff } of diffData) {
    const lines = diff.split('\n');
    const truncated = lines.length > maxLinesPerFile;
    const sliced = lines.slice(0, maxLinesPerFile);

    totalLines += sliced.length;
    if (totalLines > maxTotalLines) {
      const allowedLines = maxTotalLines - (totalLines - sliced.length);
      result.push({
        filePath,
        diff: sliced.slice(0, allowedLines).join('\n') +
              '\n... (truncated due to size limit)',
      });
      break;
    }

    result.push({
      filePath,
      diff: truncated
        ? sliced.join('\n') + '\n... (truncated)'
        : diff,
    });
  }

  return result;
}
