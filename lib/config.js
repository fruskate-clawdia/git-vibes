const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CONFIG_PATH = path.join(os.homedir(), '.git-vibes.json');

const DEFAULTS = {
  provider: 'claude-cli',
  mode: 'default',
  language: 'ru',
  autoConfirm: false,
  gitmoji: false,
};

function load() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; }
  catch (e) { return { ...DEFAULTS }; }
}

function save(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function ask(rl, question, defaultVal) {
  return new Promise(resolve => {
    const hint = defaultVal ? ` (${defaultVal})` : '';
    rl.question(`${question}${hint}: `, answer => resolve(answer.trim() || defaultVal || ''));
  });
}

function choose(rl, question, options, defaultIdx = 0) {
  return new Promise(resolve => {
    console.log(`\n${question}`);
    options.forEach((opt, i) => {
      const marker = i === defaultIdx ? '▶' : ' ';
      console.log(`  ${marker} ${i + 1}. ${opt}`);
    });
    rl.question(`Выбор (${defaultIdx + 1}): `, answer => {
      const idx = parseInt(answer) - 1;
      resolve(isNaN(idx) || idx < 0 || idx >= options.length ? defaultIdx : idx);
    });
  });
}

async function runSetup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const current = load();

  console.log('\n👻 git-vibes setup\n');
  console.log('Настроим провайдера, режим и предпочтения.\n');

  // Provider
  const providerOptions = [
    'claude-cli    — через claude CLI (бесплатно с Claude Code / Max) ⭐',
    'anthropic     — Anthropic API (ANTHROPIC_API_KEY)',
    'openai        — OpenAI API (OPENAI_API_KEY)',
    'gemini        — Google Gemini (GEMINI_API_KEY)',
    'ollama        — Локально через Ollama (бесплатно, нужен ollama)',
  ];
  const providerNames = ['claude-cli', 'anthropic', 'openai', 'gemini', 'ollama'];
  const providerDefault = providerNames.indexOf(current.provider) ?? 0;
  const providerIdx = await choose(rl, 'Провайдер AI:', providerOptions, providerDefault);
  const provider = providerNames[providerIdx];

  const config = { ...current, provider };

  // Provider-specific settings
  if (provider === 'anthropic') {
    const currentKey = current.anthropic?.apiKey ? '***' + current.anthropic.apiKey.slice(-4) : '';
    const apiKey = await ask(rl, '  ANTHROPIC_API_KEY', currentKey);
    if (apiKey && !apiKey.startsWith('***')) {
      config.anthropic = { ...config.anthropic, apiKey };
    }
    const models = ['claude-haiku-4-5 (быстрый, дешёвый)', 'claude-sonnet-4-5 (умнее)', 'claude-opus-4-5 (самый умный)'];
    const modelNames = ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'];
    const modelIdx = await choose(rl, '  Модель:', models, 0);
    config.anthropic = { ...config.anthropic, model: modelNames[modelIdx] };
  }

  if (provider === 'openai') {
    const currentKey = current.openai?.apiKey ? '***' + current.openai.apiKey.slice(-4) : '';
    const apiKey = await ask(rl, '  OPENAI_API_KEY', currentKey);
    if (apiKey && !apiKey.startsWith('***')) {
      config.openai = { ...config.openai, apiKey };
    }
    const models = ['gpt-4o-mini (быстрый, дешёвый)', 'gpt-4o (умнее)', 'o1-mini (рассуждения)'];
    const modelNames = ['gpt-4o-mini', 'gpt-4o', 'o1-mini'];
    const modelIdx = await choose(rl, '  Модель:', models, 0);
    config.openai = { ...config.openai, model: modelNames[modelIdx] };
    const baseUrl = await ask(rl, '  Base URL (оставь пустым для OpenAI)', current.openai?.baseUrl || '');
    if (baseUrl) config.openai = { ...config.openai, baseUrl };
  }

  if (provider === 'gemini') {
    const currentKey = current.gemini?.apiKey ? '***' + current.gemini.apiKey.slice(-4) : '';
    const apiKey = await ask(rl, '  GEMINI_API_KEY', currentKey);
    if (apiKey && !apiKey.startsWith('***')) {
      config.gemini = { ...config.gemini, apiKey };
    }
    const models = ['gemini-2.0-flash (быстрый)', 'gemini-1.5-pro (умнее)'];
    const modelNames = ['gemini-2.0-flash', 'gemini-1.5-pro'];
    const modelIdx = await choose(rl, '  Модель:', models, 0);
    config.gemini = { ...config.gemini, model: modelNames[modelIdx] };
  }

  if (provider === 'ollama') {
    const model = await ask(rl, '  Модель Ollama', current.ollama?.model || 'llama3');
    const baseUrl = await ask(rl, '  Ollama URL', current.ollama?.baseUrl || 'http://localhost:11434');
    config.ollama = { model, baseUrl };
  }

  // Mode
  const modeOptions = [
    'default    — умный, конкретный ⭐',
    'honest     — честный и саркастичный 😤',
    'corporate  — корпоратные buzzwords 🏢',
    'poetic     — поэтический 🌸',
    'chaos      — полный хаос 🌀',
    'roast      — зароастит код 🔥',
  ];
  const modeNames = ['default', 'honest', 'corporate', 'poetic', 'chaos', 'roast'];
  const modeIdx = await choose(rl, 'Дефолтный режим:', modeOptions, modeNames.indexOf(current.mode) || 0);
  config.mode = modeNames[modeIdx];

  // Language
  const langIdx = await choose(rl, 'Язык:', ['ru — Русский ⭐', 'en — English (Conventional Commits)'], current.language === 'en' ? 1 : 0);
  config.language = langIdx === 1 ? 'en' : 'ru';

  // Gitmoji
  const gitmojiIdx = await choose(rl, 'Gitmoji (эмодзи в сообщениях):', ['Нет', 'Да ✨'], current.gitmoji ? 1 : 0);
  config.gitmoji = gitmojiIdx === 1;

  // Auto-confirm
  const autoIdx = await choose(rl, 'Авто-подтверждение:', ['Нет — всегда спрашивать', 'Да — коммитить сразу'], current.autoConfirm ? 1 : 0);
  config.autoConfirm = autoIdx === 1;

  rl.close();
  save(config);

  console.log(`\n✅ Настройки сохранены: ${CONFIG_PATH}`);
  console.log(`   Провайдер: ${config.provider} | Режим: ${config.mode} | Язык: ${config.language}\n`);
}

module.exports = { load, save, runSetup, CONFIG_PATH };
