const { execSync, spawnSync } = require('child_process');

// Try to generate via claude CLI (Claude Code / Max subscription — no API key needed!)
function generateViaClaude(systemPrompt, userPrompt) {
  try {
    execSync('which claude', { stdio: 'ignore' });
  } catch (e) {
    return null; // claude CLI not found
  }

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const result = spawnSync('claude', ['-p', fullPrompt, '--no-conversation'], {
    encoding: 'utf8',
    timeout: 30000,
  });

  if (result.status !== 0 || !result.stdout?.trim()) return null;
  return result.stdout.trim();
}

// Try to generate via Anthropic API key
function generateViaAPI(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const https = require('https');
  const body = JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content?.[0]?.text?.trim() || null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function generate(systemPrompt, userPrompt) {
  // 1. Try claude CLI first (works with Claude Max, no extra cost!)
  const claudeResult = generateViaClaude(systemPrompt, userPrompt);
  if (claudeResult) return claudeResult;

  // 2. Try API key
  const apiResult = await generateViaAPI(systemPrompt, userPrompt);
  if (apiResult) return apiResult;

  return null;
}

module.exports = { generate };
