// AIに送る前にdiff内の危険パターンを静的スキャン（追加行のみ）
// 検出結果をプロンプトに埋め込むことでモデルの見落としを防ぐ

const RULES = [
  // ===== XSS =====
  {
    id:       'xss-innerhtml',
    pattern:  /\binnerHTML\s*=/,
    severity: 'critical',
    label:    'XSS: innerHTML への代入',
  },
  {
    id:       'xss-outerhtml',
    pattern:  /\bouterHTML\s*=/,
    severity: 'critical',
    label:    'XSS: outerHTML への代入',
  },
  {
    id:       'xss-docwrite',
    pattern:  /document\.write\s*\(/,
    severity: 'critical',
    label:    'XSS: document.write()',
  },
  {
    id:       'xss-insertadj',
    pattern:  /insertAdjacentHTML\s*\(/,
    severity: 'critical',
    label:    'XSS: insertAdjacentHTML()',
  },

  // ===== コード注入 =====
  {
    id:       'eval',
    pattern:  /\beval\s*\(/,
    severity: 'critical',
    label:    'コード注入: eval()',
  },
  {
    id:       'func-ctor',
    pattern:  /new\s+Function\s*\(/,
    severity: 'critical',
    label:    'コード注入: new Function()',
  },
  {
    id:       'settimeout-str',
    pattern:  /setTimeout\s*\(\s*[`'"]/,
    severity: 'high',
    label:    'コード注入: setTimeout(文字列)',
  },
  {
    id:       'setinterval-str',
    pattern:  /setInterval\s*\(\s*[`'"]/,
    severity: 'high',
    label:    'コード注入: setInterval(文字列)',
  },

  // ===== ゼロ除算 =====
  {
    id:       'zero-div-literal',
    pattern:  /\/\s*0(?!\.)(?:\s*[;,)\]}]|$)/,
    severity: 'high',
    label:    'ゼロ除算: リテラル 0 で除算',
  },
  {
    id:       'zero-div-risk',
    // 変数で割っているのに NaN/Infinity チェックがない行（ヒューリスティック）
    pattern:  /return\s+\w+\s*\/\s*\w+(?!\s*\|\|)(?!\s*\?\s)/,
    severity: 'medium',
    label:    'ゼロ除算の可能性: ゼロチェックなしの除算',
  },

  // ===== シークレット =====
  {
    id:       'hardcoded-secret',
    pattern:  /(?:password|secret|api_?key|private_?key|token)\s*[:=]\s*['"`][^'"`\s]{6,}/i,
    severity: 'critical',
    label:    'ハードコードされた秘密情報の可能性',
  },

  // ===== シェル注入 =====
  {
    id:       'shell-exec',
    pattern:  /\b(?:exec|execSync|spawn|spawnSync)\s*\(/,
    severity: 'high',
    label:    'シェル注入リスク: exec/spawn',
  },

  // ===== プロトタイプ汚染 =====
  {
    id:       'proto-pollution',
    pattern:  /__proto__|constructor\s*\[|prototype\s*\[/,
    severity: 'high',
    label:    'プロトタイプ汚染の可能性',
  },

  // ===== パストラバーサル =====
  {
    id:       'path-traversal',
    pattern:  /\.\.\//,
    severity: 'medium',
    label:    'パストラバーサル: ../ を含む',
  },
];

/**
 * diff データ（filePath + diff 文字列）をスキャンして検出結果を返す
 * 追加行（"+ " で始まる行）のみを対象とする
 */
export function preScan(diffData) {
  const findings = [];

  for (const { filePath, diff } of diffData) {
    const lines = diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 追加行（新しいコード）のみスキャン
      if (!line.startsWith('+ ')) continue;
      const code = line.slice(2); // '+ ' を除去

      for (const { id, pattern, severity, label } of RULES) {
        if (pattern.test(code)) {
          // 同じ (filePath, id, code) の重複は除く
          const dup = findings.some(
            f => f.filePath === filePath && f.id === id && f.code === code
          );
          if (!dup) {
            findings.push({ id, filePath, lineIndex: i + 1, code: code.trim(), severity, label });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * 検出結果をプロンプトへ埋め込む文字列に変換する
 * findings が空なら空文字列を返す
 */
export function buildPreScanBlock(findings) {
  if (findings.length === 0) return '';

  const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...findings].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
  );

  const lines = [
    '## ⚠️ MANDATORY PRE-SCAN FINDINGS — YOU MUST INCLUDE EACH IN YOUR ISSUES LIST',
    'The following suspicious patterns were detected by static analysis before this review.',
    'Every item below MUST appear as a separate issue in your JSON output. Do not omit any.',
    '',
  ];

  for (const f of sorted) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.label}`);
    lines.push(`  File: ${f.filePath}`);
    lines.push(`  Code: \`${f.code}\``);
    lines.push('');
  }

  lines.push('END OF PRE-SCAN. Now perform your full review as well.');

  return lines.join('\n');
}
