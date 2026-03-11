const { execSync, spawnSync } = require('child_process');
const https = require('https');

// ─── Claude CLI ──────────────────────────────────────────────────────────────
function generateViaClaude(systemPrompt, userPrompt) {
  try { execSync('which claude', { stdio: 'ignore' }); } catch (e) { return null; }
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const result = spawnSync('claude', ['-p', fullPrompt, '--no-conversation'], {
    encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0 || !result.stdout?.trim()) return null;
  return result.stdout.trim();
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function httpPost(hostname, path, headers, body) {
  return new Promise((resolve) => {
    const req = https.request({ hostname, path, method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ─── Anthropic API ───────────────────────────────────────────────────────────
async function generateViaAnthropic(apiKey, model, systemPrompt, userPrompt) {
  if (!apiKey) return null;
  const body = {
    model: model || 'claude-haiku-4-5',
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };
  const res = await httpPost('api.anthropic.com', '/v1/messages', {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }, body);
  return res?.content?.[0]?.text?.trim() || null;
}

// ─── OpenAI API ──────────────────────────────────────────────────────────────
async function generateViaOpenAI(apiKey, model, baseUrl, systemPrompt, userPrompt) {
  if (!apiKey) return null;
  const hostname = baseUrl ? new URL(baseUrl).hostname : 'api.openai.com';
  const path = baseUrl ? new URL(baseUrl).pathname + '/chat/completions' : '/v1/chat/completions';
  const body = {
    model: model || 'gpt-4o-mini',
    max_tokens: 256,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  const res = await httpPost(hostname, path, {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }, body);
  return res?.choices?.[0]?.message?.content?.trim() || null;
}

// ─── Google Gemini API ───────────────────────────────────────────────────────
async function generateViaGemini(apiKey, model, systemPrompt, userPrompt) {
  if (!apiKey) return null;
  const m = model || 'gemini-2.0-flash';
  const path = `/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 256 },
  };
  const res = await httpPost('generativelanguage.googleapis.com', path, {
    'Content-Type': 'application/json',
  }, body);
  return res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

// ─── Ollama (local) ──────────────────────────────────────────────────────────
async function generateViaOllama(model, baseUrl, systemPrompt, userPrompt) {
  const url = new URL(baseUrl || 'http://localhost:11434');
  const http = require(url.protocol === 'https:' ? 'https' : 'http');
  const body = JSON.stringify({
    model: model || 'llama3',
    prompt: `${systemPrompt}\n\n${userPrompt}`,
    stream: false,
  });

  return new Promise((resolve) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 11434),
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)?.response?.trim() || null); }
        catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────
async function generate(systemPrompt, userPrompt, config = {}) {
  const provider = config.provider || 'claude-cli';

  // Get API keys: config file → env vars
  const anthropicKey = config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
  const openaiKey    = config.openai?.apiKey    || process.env.OPENAI_API_KEY;
  const geminiKey    = config.gemini?.apiKey    || process.env.GEMINI_API_KEY;

  switch (provider) {
    case 'claude-cli': {
      const result = generateViaClaude(systemPrompt, userPrompt);
      if (result) return result;
      // Fallback to Anthropic API
      if (anthropicKey) return generateViaAnthropic(anthropicKey, config.anthropic?.model, systemPrompt, userPrompt);
      break;
    }
    case 'anthropic':
      return generateViaAnthropic(anthropicKey, config.anthropic?.model, systemPrompt, userPrompt);

    case 'openai':
      return generateViaOpenAI(openaiKey, config.openai?.model, config.openai?.baseUrl, systemPrompt, userPrompt);

    case 'gemini':
      return generateViaGemini(geminiKey, config.gemini?.model, systemPrompt, userPrompt);

    case 'ollama':
      return generateViaOllama(config.ollama?.model, config.ollama?.baseUrl, systemPrompt, userPrompt);

    default:
      // Try everything in order
      const claudeResult = generateViaClaude(systemPrompt, userPrompt);
      if (claudeResult) return claudeResult;
      if (anthropicKey) return generateViaAnthropic(anthropicKey, null, systemPrompt, userPrompt);
      if (openaiKey)    return generateViaOpenAI(openaiKey, null, null, systemPrompt, userPrompt);
      if (geminiKey)    return generateViaGemini(geminiKey, null, systemPrompt, userPrompt);
  }

  return null;
}

module.exports = { generate };
