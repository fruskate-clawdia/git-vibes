#!/usr/bin/env node

const readline = require('readline');
const { getStagedDiff, getStagedFiles, isGitRepo, commit } = require('../lib/git');
const { MODES } = require('../lib/prompts');
const { generate } = require('../lib/ai');
const { installHook, uninstallHook } = require('../lib/hook');

const CHANNEL = 'https://t.me/ghostinthemachine_ai';
const VERSION = '1.0.0';

function printHelp() {
  console.log(`
👻 vibe-commit v${VERSION} — git commits с характером

Использование:
  npx vibe-commit              Умный режим (дефолт, русский)
  npx vibe-commit --honest     Честный и саркастичный 😤
  npx vibe-commit --corporate  Корпоратный с buzzwords 🏢
  npx vibe-commit --poetic     Поэтический 🌸
  npx vibe-commit --chaos      Полный хаос 🌀
  npx vibe-commit --roast      Зароастит код перед коммитом 🔥
  npx vibe-commit --lang en    На английском (Conventional Commits)

  npx vibe-commit --install-hook   Автозапуск при каждом git commit
  npx vibe-commit --uninstall-hook Удалить автозапуск

Требования:
  - claude CLI (бесплатно если есть Claude Code / Max)
  - или ANTHROPIC_API_KEY в переменных окружения

Сделано Clawdia 👻 — ${CHANNEL}
`);
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  // Special commands
  if (args.includes('--help') || args.includes('-h')) { printHelp(); return; }
  if (args.includes('--version') || args.includes('-v')) { console.log(VERSION); return; }
  if (args.includes('--install-hook')) { installHook(); return; }
  if (args.includes('--uninstall-hook')) { uninstallHook(); return; }

  // Hook mode — write directly to commit msg file
  const hookIdx = args.indexOf('--hook');
  const hookFile = hookIdx !== -1 ? args[hookIdx + 1] : null;

  // Detect mode
  let modeName = 'default';
  if (args.includes('--honest'))    modeName = 'honest';
  if (args.includes('--corporate')) modeName = 'corporate';
  if (args.includes('--poetic'))    modeName = 'poetic';
  if (args.includes('--chaos'))     modeName = 'chaos';
  if (args.includes('--roast'))     modeName = 'roast';
  if (args.includes('--lang') && args[args.indexOf('--lang') + 1] === 'en') modeName = 'english';

  const mode = MODES[modeName];

  // Check git repo
  if (!isGitRepo()) {
    console.error('❌ Не в git репозитории');
    process.exit(1);
  }

  // Get staged changes
  const diff = getStagedDiff();
  const files = getStagedFiles();

  if (!diff || files.length === 0) {
    console.error('❌ Нет staged изменений. Сначала: git add <files>');
    process.exit(1);
  }

  // Trim diff if too large
  const trimmedDiff = diff.length > 4000 ? diff.slice(0, 4000) + '\n... (обрезано)' : diff;

  console.log(`\n${mode.emoji} vibe-commit [${mode.label}] — генерирую...\n`);

  // Generate
  const result = await generate(mode.system, mode.user(trimmedDiff, files));

  if (!result) {
    console.error('❌ Не удалось сгенерировать сообщение.');
    console.error('   Нужен: claude CLI (npx claude) или ANTHROPIC_API_KEY');
    process.exit(1);
  }

  // Handle roast mode specially
  if (modeName === 'roast') {
    const roastLine = result.match(/РОАСТ:\s*(.+)/)?.[1] || '';
    const commitLine = result.match(/КОММИТ:\s*(.+)/)?.[1] || result;

    if (roastLine) {
      console.log(`🔥 ${roastLine}\n`);
    }

    if (hookFile) {
      require('fs').writeFileSync(hookFile, commitLine);
      return;
    }

    console.log(`📝 Сообщение: ${commitLine}\n`);
    const answer = await ask('Использовать? [Y/n/e(редактировать)] ');
    await handleAnswer(answer, commitLine, args);
    return;
  }

  if (hookFile) {
    require('fs').writeFileSync(hookFile, result);
    return;
  }

  console.log(`📝 ${result}\n`);
  const answer = await ask('Использовать? [Y/n/e(редактировать)] ');
  await handleAnswer(answer, result, args);
}

async function handleAnswer(answer, message, args) {
  const lower = answer.toLowerCase();

  if (lower === 'n' || lower === 'no' || lower === 'н') {
    console.log('Отменено.');
    process.exit(0);
  }

  if (lower === 'e' || lower === 'edit' || lower === 'р') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const edited = await new Promise(resolve => {
      rl.question(`✏️  Редактировать: `, answer => { rl.close(); resolve(answer.trim() || message); });
    });
    commit(edited);
    console.log(`\n✅ Закоммичено: ${edited}\n`);
    return;
  }

  // Default: yes
  commit(message, args.filter(a => a.startsWith('-') && !['--honest','--corporate','--poetic','--chaos','--roast'].includes(a)));
  console.log(`\n✅ Закоммичено!\n`);
  console.log(`👻 Сделано Clawdia — ${CHANNEL}`);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
