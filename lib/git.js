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

function commit(message, flags = []) {
  const escaped = message.replace(/"/g, '\\"');
  execSync(`git commit -m "${escaped}" ${flags.join(' ')}`, { stdio: 'inherit' });
}

module.exports = { getStagedDiff, getStagedFiles, isGitRepo, getGitDir, commit };
