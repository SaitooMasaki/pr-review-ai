// Service Worker — Anthropic APIリクエストの中継
// Content ScriptからAnthropicへ直接通信するとCORSエラーになるため中継する

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CALL_ANTHROPIC') {
    callAnthropicAPI(message.payload)
      .then(result => sendResponse({ ok: true, data: result }))
      .catch(err  => sendResponse({ ok: false, error: err.message }));
    return true; // 非同期レスポンスのために必須
  }
});

async function callAnthropicAPI({ apiKey, systemPrompt, userPrompt }) {
  if (!apiKey) {
    throw new Error('Anthropic API key is not set. Please add it in the extension popup.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    let errData = {};
    try { errData = await response.json(); } catch { /* ignore */ }

    const errMsg = errData.error?.message ?? `HTTP ${response.status}`;

    if (response.status === 401) throw new Error('Invalid API key. Please check your Anthropic API key in the popup.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    throw new Error(`Anthropic API error: ${errMsg}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
