const fs = require('fs');
const path = require('path');
const { getGitDir } = require('./git');

const HOOK_CONTENT = `#!/bin/sh
# vibe-commit hook — https://github.com/fruskate-clawdia/vibe-commit
COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only run for regular commits (not merges, amends etc)
if [ -z "$COMMIT_SOURCE" ]; then
  npx vibe-commit --hook "$COMMIT_MSG_FILE" 2>/dev/null || true
fi
`;

function installHook() {
  const gitDir = getGitDir();
  if (!gitDir) {
    console.error('❌ Не в git репозитории');
    process.exit(1);
  }

  const hookPath = path.join(gitDir, 'hooks', 'prepare-commit-msg');

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('vibe-commit')) {
      console.log('✅ Хук уже установлен!');
      return;
    }
    // Append to existing hook
    fs.appendFileSync(hookPath, '\n' + HOOK_CONTENT);
  } else {
    fs.writeFileSync(hookPath, HOOK_CONTENT);
  }

  fs.chmodSync(hookPath, '755');
  console.log(`\n✅ Git хук установлен!`);
  console.log(`   Теперь vibe-commit запускается автоматически при каждом git commit`);
  console.log(`   Хук: ${hookPath}\n`);
}

function uninstallHook() {
  const gitDir = getGitDir();
  if (!gitDir) return;

  const hookPath = path.join(gitDir, 'hooks', 'prepare-commit-msg');
  if (!fs.existsSync(hookPath)) {
    console.log('Хук не установлен');
    return;
  }

  const content = fs.readFileSync(hookPath, 'utf8');
  if (!content.includes('vibe-commit')) {
    console.log('Хук vibe-commit не найден');
    return;
  }

  // Remove our hook lines
  const lines = content.split('\n');
  const filtered = lines.filter(line => !line.includes('vibe-commit') && !line.includes('COMMIT_MSG_FILE') && !line.includes('COMMIT_SOURCE'));
  fs.writeFileSync(hookPath, filtered.join('\n'));
  console.log('✅ Хук удалён');
}

module.exports = { installHook, uninstallHook };
