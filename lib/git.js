const { execSync } = require('child_process');

function getStagedDiff() {
  try {
    const diff = execSync('git diff --staged', { encoding: 'utf8' });
    return diff.trim();
  } catch (e) {
    return null;
  }
}

function getStagedFiles() {
  try {
    const files = execSync('git diff --staged --name-only', { encoding: 'utf8' });
    return files.trim().split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function getGitDir() {
  try {
    return execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (e) { return null; }
}

function getDefaultBranch() {
  try {
    return execSync('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null', { encoding: 'utf8' })
      .trim().replace('refs/remotes/origin/', '') || 'main';
  } catch (e) { return 'main'; }
}

function getDiffFromBase(base) {
  try {
    return execSync(`git diff ${base}...HEAD`, { encoding: 'utf8' }).trim();
  } catch (e) {
    try {
      return execSync(`git diff ${base}`, { encoding: 'utf8' }).trim();
    } catch (e2) { return null; }
  }
}

function getChangedFilesFromBase(base) {
  try {
    return execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
  } catch (e) { return []; }
}

function stageAll() {
  execSync('git add -A', { stdio: 'inherit' });
}

function commit(message, flags = []) {
  const escaped = message.replace(/"/g, '\\"');
  execSync(`git commit -m "${escaped}" ${flags.join(' ')}`, { stdio: 'inherit' });
}

function copyToClipboard(text) {
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'darwin') {
      execSync(`echo ${JSON.stringify(text)} | pbcopy`);
    } else {
      execSync(`echo ${JSON.stringify(text)} | xclip -selection clipboard 2>/dev/null || echo ${JSON.stringify(text)} | xsel --clipboard --input 2>/dev/null`);
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { getStagedDiff, getStagedFiles, isGitRepo, getGitDir, stageAll, commit, copyToClipboard, getCurrentBranch, getDefaultBranch, getDiffFromBase, getChangedFilesFromBase };
