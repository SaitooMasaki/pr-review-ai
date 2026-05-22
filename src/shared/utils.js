// ãƒ¦ãƒ¼ãƒ†ã‚£ãƒªãƒ†ã‚£é–¢æ•°

// HTMLã‚¨ã‚¹ã‚±ãƒ¼ãƒ—
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// æ—¥ä»˜ãƒ•ã‚©ãƒ¼ãƒãƒƒãƒˆï¼ˆãƒ­ãƒ¼ã‚«ãƒ«TZï¼‰
export function getLocalDate() {
  return new Date().toLocaleDateString('sv-SE');
}

// ãƒŸãƒªç§’â†’äººé–“ãŒèª­ã‚ã‚‹æ™‚é–“
export function msToHuman(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// ã‚­ãƒ¼ã‚’éƒ¨åˆ†çš„ã«ãƒã‚¹ã‚¯ã™ã‚‹ï¼ˆAPIã‚­ãƒ¼è¡¨ç¤ºç”¨ï¼‰
export function maskSecret(str, visibleStart = 12, visibleEnd = 4) {
  if (!str || str.length < visibleStart + visibleEnd + 3) return str;
  return str.slice(0, visibleStart) + '***' + str.slice(-visibleEnd);
}

// é…åˆ—ã‚’é‡è¤‡æ’é™¤
export function unique(arr) {
  return [...new Set(arr)];
}

// ã‚ªãƒ–ã‚¸ã‚§ã‚¯ãƒˆãŒç©ºã‹ãƒã‚§ãƒƒã‚¯
export function isEmpty(obj) {
  return !obj || Object.keys(obj).length === 0;
}

// sleep
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: ƒoƒO‚ ‚è - n=0‚Ì‚Æ‚«–³ŒÀƒ‹[ƒv
export function divide(a, b) {
  return a / b;  // ƒ[ƒœZƒ`ƒFƒbƒN‚È‚µ
}

// ƒ†[ƒU[“ü—Í‚ğ‚»‚Ì‚Ü‚ÜHTML‚É–„‚ß‚ŞiXSSƒŠƒXƒN‚ ‚èj
export function renderUserInput(input) {
  document.getElementById('output').innerHTML = input;
}
