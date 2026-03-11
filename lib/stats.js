const fs = require('fs');
const path = require('path');
const os = require('os');

const STATS_PATH = path.join(os.homedir(), '.git-vibes-stats.json');

function load() {
  if (!fs.existsSync(STATS_PATH)) return { commits: [], totalCommits: 0 };
  try { return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8')); }
  catch (e) { return { commits: [], totalCommits: 0 }; }
}

function record(mode, language) {
  const stats = load();
  stats.totalCommits = (stats.totalCommits || 0) + 1;
  if (!stats.commits) stats.commits = [];
  stats.commits.push({ mode, language, date: new Date().toISOString() });
  // Keep only last 500
  if (stats.commits.length > 500) stats.commits = stats.commits.slice(-500);
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
}

function printStats() {
  const stats = load();
  if (!stats.totalCommits || stats.totalCommits === 0) {
    console.log('\n📊 Статистика пуста — делай коммиты!\n');
    return;
  }

  const commits = stats.commits || [];

  // Mode frequency
  const modes = {};
  commits.forEach(c => { modes[c.mode] = (modes[c.mode] || 0) + 1; });
  const topMode = Object.entries(modes).sort((a, b) => b[1] - a[1])[0];

  // Last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = commits.filter(c => new Date(c.date) > thirtyDaysAgo).length;

  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = commits.filter(c => new Date(c.date) > sevenDaysAgo).length;

  const modeEmojis = { default: '🧠', honest: '😤', corporate: '🏢', poetic: '🌸', chaos: '🌀', roast: '🔥', english: '🇬🇧' };

  console.log(`
📊 git-vibes статистика

  Всего коммитов через git-vibes: ${stats.totalCommits}
  За последние 7 дней: ${thisWeek}
  За последние 30 дней: ${recent}

  Любимый режим: ${modeEmojis[topMode?.[0]] || '🧠'} ${topMode?.[0] || '—'} (${topMode?.[1] || 0} коммитов)

  По режимам:`);

  Object.entries(modes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([mode, count]) => {
      const bar = '█'.repeat(Math.round(count / stats.totalCommits * 20));
      console.log(`    ${modeEmojis[mode] || '  '} ${mode.padEnd(12)} ${bar} ${count}`);
    });

  console.log();
}

module.exports = { record, printStats };
