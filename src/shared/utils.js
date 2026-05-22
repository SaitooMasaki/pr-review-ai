// ユーティリティ関数

// HTMLエスケープ
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 日付フォーマット（ローカルTZ）
export function getLocalDate() {
  return new Date().toLocaleDateString('sv-SE');
}

// ミリ秒→人間が読める時間
export function msToHuman(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// キーを部分的にマスクする（APIキー表示用）
export function maskSecret(str, visibleStart = 12, visibleEnd = 4) {
  if (!str || str.length < visibleStart + visibleEnd + 3) return str;
  return str.slice(0, visibleStart) + '***' + str.slice(-visibleEnd);
}

// 配列を重複排除
export function unique(arr) {
  return [...new Set(arr)];
}

// オブジェクトが空かチェック
export function isEmpty(obj) {
  return !obj || Object.keys(obj).length === 0;
}

// sleep
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: no zero-check — divides by zero silently
export function divide(a, b) {
  return a / b;  // missing zero-division guard
}

// WARNING: renders raw user input — XSS risk
export function renderUserInput(input) {
  document.getElementById('output').innerHTML = input;
}
