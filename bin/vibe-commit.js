#!/usr/bin/env node

const readline = require('readline');
const { getStagedDiff, getStagedFiles, isGitRepo, getGitDir, stageAll, commit, copyToClipboard, getCurrentBranch, getDefaultBranch, getDiffFromBase, getChangedFilesFromBase } = require('../lib/git');
const { MODES, BODY_MODES, PR_MODES } = require('../lib/prompts');
const { generate } = require('../lib/ai');
const { installHook, uninstallHook } = require('../lib/hook');
const { load: loadConfig, runSetup } = require('../lib/config');
const { record: recordStat, printStats } = require('../lib/stats');

const CHANNEL = 'https://t.me/ghostinthemachine_ai';
const VERSION = '1.3.0';

const GITMOJI = {
  default:    '✨',
  honest:     '🐛',
  corporate:  '📊',
  poetic:     '🌸',
  chaos:      '🌀',
  roast:      '🔥',
  english:    '✨',
};

function printHelp() {
  console.log(`
👻 git-vibes v${VERSION} — git commits с характером

Использование:
  npx git-vibes              Умный режим (из настроек)
  npx git-vibes --honest     Честный и саркастичный 😤
  npx git-vibes --corporate  Корпоратный с buzzwords 🏢
  npx git-vibes --poetic     Поэтический 🌸
  npx git-vibes --chaos      Полный хаос 🌀
  npx git-vibes --roast      Зароастит код перед коммитом 🔥
  npx git-vibes --lang en    На английском (Conventional Commits)

Опции:
  -g, --generate <N>   Сгенерировать N вариантов на выбор (макс. 5)
  -a, --all            Автоматически git add . перед генерацией
  -c, --clipboard      Скопировать в буфер (без коммита)
  -y, --yes            Авто-подтверждение без вопросов
  -x, --exclude <file> Исключить файл из анализа
  --gitmoji            Добавить gitmoji к сообщению
  --provider <name>    Провайдер: claude-cli, anthropic, openai, gemini, ollama
  -p, --prompt <text>  Кастомный промпт вместо стандартного режима

Команды:
  setup                Интерактивная настройка
  stats                Статистика твоих коммитов
  body                 Генерировать заголовок + тело коммита
  pr                   Генерировать описание Pull Request
  --install-hook       Автозапуск при каждом git commit
  --uninstall-hook     Удалить автозапуск

Сделано Clawdia 👻 — ${CHANNEL}
`);
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

function pickFromList(items) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    rl.question(`\nВыбор (1-${items.length}): `, answer => {
      rl.close();
      const idx = parseInt(answer) - 1;
      resolve(items[isNaN(idx) || idx < 0 || idx >= items.length ? 0 : idx]);
    });
  });
}

// ─── Body generator ──────────────────────────────────────────────────────────
async function generateBody(args, config) {
  if (!isGitRepo()) { console.error('❌ Не в git репозитории'); process.exit(1); }

  const doClipboard = args.includes('-c') || args.includes('--clipboard');
  const lang = (args.includes('--lang') && args[args.indexOf('--lang') + 1] === 'en') ? 'en' : (config.language || 'ru');
  const modeName = args.includes('--honest') ? 'honest' : 'default';

  const diff = getStagedDiff();
  const files = getStagedFiles();

  if (!diff) { console.error('❌ Нет staged изменений'); process.exit(1); }

  const bodyMode = BODY_MODES[modeName] || BODY_MODES.default;
  const trimmedDiff = diff.length > 4000 ? diff.slice(0, 4000) + '\n...' : diff;

  console.log('\n📝 git-vibes body — генерирую полное сообщение...\n');

  const result = await generate(bodyMode.system, bodyMode.user(trimmedDiff, files), config);
  if (!result) { console.error('❌ Не удалось сгенерировать'); process.exit(1); }

  // Parse
  const titleMatch = result.match(/ЗАГОЛОВОК:\s*(.+)/);
  const bodyMatch  = result.match(/ТЕЛО:\s*([\s\S]+)/);
  const title = titleMatch?.[1]?.trim() || result.split('\n')[0];
  const body  = bodyMatch?.[1]?.trim()  || result.split('\n').slice(1).join('\n').trim();

  console.log(`📌 Заголовок: ${title}`);
  console.log(`\n📄 Тело:\n${body}\n`);

  if (doClipboard) {
    copyToClipboard(`${title}\n\n${body}`);
    console.log('✅ Скопировано в буфер!\n');
    return;
  }

  const answer = await ask('Закоммитить? [Y/n/c(clipboard)] ');
  if (answer.toLowerCase() === 'n') return;
  if (answer.toLowerCase() === 'c') { copyToClipboard(`${title}\n\n${body}`); console.log('✅ Скопировано!'); return; }

  const { execSync } = require('child_process');
  const escaped = `${title}\n\n${body}`.replace(/"/g, '\\"');
  execSync(`git commit -m "${escaped}"`, { stdio: 'inherit' });
  recordStat('body', lang);
  console.log(`\n✅ Закоммичено!\n`);
}

// ─── PR description generator ────────────────────────────────────────────────
async function generatePR(args, config) {
  if (!isGitRepo()) { console.error('❌ Не в git репозитории'); process.exit(1); }

  const doClipboard = args.includes('-c') || args.includes('--clipboard');
  const lang = (args.includes('--lang') && args[args.indexOf('--lang') + 1] === 'en') ? 'en' : (config.language || 'ru');

  // Base branch
  const baseIdx = args.indexOf('--base');
  const base = baseIdx !== -1 ? args[baseIdx + 1] : getDefaultBranch();
  const branch = getCurrentBranch();

  console.log(`\n🎨 git-vibes pr — генерирую описание PR...\n`);
  console.log(`   Ветка: ${branch} → ${base}\n`);

  const diff  = getDiffFromBase(base);
  const files = getChangedFilesFromBase(base);

  if (!diff) {
    console.error(`❌ Нет изменений относительно ветки "${base}"`);
    console.error(`   Попробуй: git-vibes pr --base main`);
    process.exit(1);
  }

  const prMode = lang === 'en' ? PR_MODES.english : PR_MODES.default;
  const trimmedDiff = diff.length > 5000 ? diff.slice(0, 5000) + '\n...' : diff;

  const result = await generate(prMode.system, prMode.user(trimmedDiff, files, branch), config);
  if (!result) { console.error('❌ Не удалось сгенерировать'); process.exit(1); }

  console.log('─'.repeat(60));
  console.log(result);
  console.log('─'.repeat(60) + '\n');

  if (doClipboard) {
    copyToClipboard(result);
    console.log('✅ Скопировано в буфер! Вставляй в GitHub PR.\n');
    return;
  }

  const answer = await ask('Скопировать в буфер? [Y/n] ');
  if (answer.toLowerCase() !== 'n') {
    copyToClipboard(result);
    console.log('✅ Скопировано! Вставляй в GitHub PR.\n');
  }

  console.log(`👻 git-vibes — ${CHANNEL}`);
}

async function main() {
  const args = process.argv.slice(2);

  // Commands
  if (args.includes('--help') || args.includes('-h')) { printHelp(); return; }
  if (args.includes('--version') || args.includes('-v')) { console.log(VERSION); return; }
  if (args.includes('--install-hook')) { installHook(); return; }
  if (args.includes('--uninstall-hook')) { uninstallHook(); return; }
  if (args[0] === 'setup') { await runSetup(); return; }
  if (args[0] === 'stats') { printStats(); return; }
  if (args[0] === 'body')  { await generateBody(args.slice(1), config); return; }
  if (args[0] === 'pr')    { await generatePR(args.slice(1), config); return; }

  // Hook mode
  const hookIdx = args.indexOf('--hook');
  const hookFile = hookIdx !== -1 ? args[hookIdx + 1] : null;

  // Load config
  const config = loadConfig();

  // Parse flags
  const genIdx = args.findIndex(a => a === '--generate' || a === '-g');
  const generateN = genIdx !== -1 ? Math.min(parseInt(args[genIdx + 1]) || 3, 5) : 1;

  const excludeIdx = args.findIndex(a => a === '--exclude' || a === '-x');
  const excludeFiles = excludeIdx !== -1 ? args.slice(excludeIdx + 1).filter(a => !a.startsWith('-')) : [];

  // Custom prompt
  const promptIdx = args.findIndex(a => a === '--prompt' || a === '-p');
  const customPrompt = promptIdx !== -1 ? args[promptIdx + 1] : null;

  // Provider override
  const providerIdx2 = args.findIndex(a => a === '--provider');
  const providerOverride = providerIdx2 !== -1 ? args[providerIdx2 + 1] : null;

  const doAll       = args.includes('--all') || args.includes('-a');
  const doClipboard = args.includes('--clipboard') || args.includes('-c');
  const doYes       = args.includes('--yes') || args.includes('-y') || config.autoConfirm;
  const doGitmoji   = args.includes('--gitmoji') || config.gitmoji;

  // Detect mode
  let modeName = config.mode || 'default';
  if (args.includes('--honest'))    modeName = 'honest';
  if (args.includes('--corporate')) modeName = 'corporate';
  if (args.includes('--poetic'))    modeName = 'poetic';
  if (args.includes('--chaos'))     modeName = 'chaos';
  if (args.includes('--roast'))     modeName = 'roast';
  if (args.includes('--lang') && args[args.indexOf('--lang') + 1] === 'en') modeName = 'english';
  if (config.language === 'en' && modeName === 'default') modeName = 'english';

  const mode = MODES[modeName];

  // Check git repo
  if (!isGitRepo()) { console.error('❌ Не в git репозитории'); process.exit(1); }

  // Stage all if requested
  if (doAll) {
    console.log('📦 Стейджу все изменения...');
    stageAll();
  }

  // Get staged changes
  let diff = getStagedDiff();
  let files = getStagedFiles();

  if (!diff || files.length === 0) {
    console.error('❌ Нет staged изменений. Сначала: git add <files> или используй -a');
    process.exit(1);
  }

  // Exclude files
  if (excludeFiles.length > 0) {
    files = files.filter(f => !excludeFiles.some(ex => f.includes(ex)));
    if (files.length === 0) { console.error('❌ После исключения файлов ничего не осталось'); process.exit(1); }
  }

  // Trim diff
  const trimmedDiff = diff.length > 4000 ? diff.slice(0, 4000) + '\n... (обрезано)' : diff;

  console.log(`\n${mode.emoji} git-vibes [${mode.label}]${generateN > 1 ? ` × ${generateN}` : ''} — генерирую...\n`);

  // Build effective config (with provider override)
  const effectiveConfig = { ...config };
  if (providerOverride) effectiveConfig.provider = providerOverride;

  // Custom prompt overrides mode
  const systemPrompt = customPrompt
    ? `Ты помощник который пишет git commit сообщения. ${customPrompt}. Одна строка, максимум 72 символа. Без кавычек.`
    : mode.system;
  const userPrompt = mode.user(trimmedDiff, files);

  // Generate N variants
  const promises = Array.from({ length: generateN }, () =>
    generate(systemPrompt, userPrompt, effectiveConfig)
  );
  let results = await Promise.all(promises);
  results = results.filter(Boolean);

  if (results.length === 0) {
    console.error('❌ Не удалось сгенерировать. Нужен claude CLI или ANTHROPIC_API_KEY');
    process.exit(1);
  }

  // Add gitmoji if requested
  if (doGitmoji) {
    const emoji = GITMOJI[modeName] || '✨';
    results = results.map(r => r.startsWith(emoji) ? r : `${emoji} ${r}`);
  }

  // Handle roast mode
  let roastLine = null;
  if (modeName === 'roast') {
    roastLine = results[0].match(/РОАСТ:\s*(.+)/)?.[1] || '';
    results = results.map(r => r.match(/КОММИТ:\s*(.+)/)?.[1] || r);
    if (roastLine) console.log(`🔥 ${roastLine}\n`);
  }

  // Pick result
  let chosen;
  if (hookFile) {
    require('fs').writeFileSync(hookFile, results[0]);
    return;
  }

  if (results.length === 1) {
    console.log(`📝 ${results[0]}\n`);
    chosen = results[0];
  } else {
    console.log('📝 Выбери вариант:\n');
    chosen = await pickFromList(results);
    console.log();
  }

  // Clipboard mode
  if (doClipboard) {
    const ok = copyToClipboard(chosen);
    console.log(ok ? `✅ Скопировано в буфер: ${chosen}` : `📝 ${chosen}`);
    console.log(`\n👻 git-vibes — ${CHANNEL}\n`);
    return;
  }

  // Auto-confirm or ask
  if (doYes) {
    commit(chosen);
    recordStat(modeName, config.language || 'ru');
    console.log(`✅ Закоммичено: ${chosen}\n`);
    console.log(`👻 git-vibes — ${CHANNEL}`);
    return;
  }

  const answer = await ask('Использовать? [Y/n/e(редактировать)/c(clipboard)] ');
  await handleAnswer(answer, chosen, modeName, config);
}

async function handleAnswer(answer, message, modeName, config) {
  const lower = answer.toLowerCase();

  if (lower === 'n' || lower === 'no' || lower === 'н') {
    console.log('Отменено.'); return;
  }

  if (lower === 'c') {
    const ok = copyToClipboard(message);
    console.log(ok ? `✅ Скопировано в буфер!` : `📝 ${message}`);
    return;
  }

  if (lower === 'e' || lower === 'edit' || lower === 'р') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const edited = await new Promise(resolve => {
      rl.question(`✏️  Редактировать (Enter = оставить): `, a => { rl.close(); resolve(a.trim() || message); });
    });
    commit(edited);
    recordStat(modeName, config.language || 'ru');
    console.log(`\n✅ Закоммичено: ${edited}\n`);
    return;
  }

  // Default yes
  commit(message);
  recordStat(modeName, config.language || 'ru');
  console.log(`\n✅ Закоммичено!\n`);
  console.log(`👻 Сделано Clawdia — ${CHANNEL}`);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
