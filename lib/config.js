const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CONFIG_PATH = path.join(os.homedir(), '.git-vibes.json');

const DEFAULTS = {
  mode: 'default',
  language: 'ru',
  provider: 'claude-cli',
  autoConfirm: false,
  gitmoji: false,
};

function load() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function save(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function ask(rl, question, defaultVal) {
  return new Promise(resolve => {
    const hint = defaultVal ? ` (${defaultVal})` : '';
    rl.question(`${question}${hint}: `, answer => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

function choose(rl, question, options, defaultIdx = 0) {
  return new Promise(resolve => {
    console.log(`\n${question}`);
    options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
    rl.question(`Выбор (${defaultIdx + 1}): `, answer => {
      const idx = parseInt(answer) - 1;
      resolve(options[isNaN(idx) || idx < 0 || idx >= options.length ? defaultIdx : idx]);
    });
  });
}

async function runSetup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const current = load();

  console.log('\n👻 git-vibes setup\n');

  const modeOptions = [
    'default — умный, конкретный (рекомендуется)',
    'honest — честный и саркастичный',
    'corporate — корпоратные buzzwords',
    'poetic — поэтический стиль',
    'chaos — полный хаос',
    'roast — зароастит код',
  ];
  const modeNames = ['default', 'honest', 'corporate', 'poetic', 'chaos', 'roast'];
  const modeChoice = await choose(rl, 'Дефолтный режим:', modeOptions, modeNames.indexOf(current.mode));
  const mode = modeNames[modeOptions.indexOf(modeChoice)];

  const langOptions = ['ru — Русский', 'en — English (Conventional Commits)'];
  const langChoice = await choose(rl, 'Язык по умолчанию:', langOptions, current.language === 'ru' ? 0 : 1);
  const language = langChoice.startsWith('ru') ? 'ru' : 'en';

  const providerOptions = [
    'claude-cli — через claude CLI (бесплатно с Claude Max)',
    'anthropic-api — через ANTHROPIC_API_KEY',
  ];
  const providerChoice = await choose(rl, 'Провайдер:', providerOptions, current.provider === 'claude-cli' ? 0 : 1);
  const provider = providerChoice.startsWith('claude-cli') ? 'claude-cli' : 'anthropic-api';

  const autoConfirmOpts = ['Нет — всегда спрашивать подтверждение', 'Да — коммитить сразу'];
  const autoConfirmChoice = await choose(rl, 'Авто-подтверждение:', autoConfirmOpts, current.autoConfirm ? 1 : 0);
  const autoConfirm = autoConfirmChoice.startsWith('Да');

  const gitmojiOpts = ['Нет — без эмодзи', 'Да — добавлять gitmoji к сообщениям'];
  const gitmojiChoice = await choose(rl, 'Gitmoji:', gitmojiOpts, current.gitmoji ? 1 : 0);
  const gitmoji = gitmojiChoice.startsWith('Да');

  rl.close();

  const config = { mode, language, provider, autoConfirm, gitmoji };
  save(config);

  console.log('\n✅ Настройки сохранены в ~/.git-vibes.json');
  console.log(`   Режим: ${mode} | Язык: ${language} | Провайдер: ${provider}`);
  console.log(`   Авто-подтверждение: ${autoConfirm ? 'да' : 'нет'} | Gitmoji: ${gitmoji ? 'да' : 'нет'}\n`);
}

module.exports = { load, save, runSetup, CONFIG_PATH };
