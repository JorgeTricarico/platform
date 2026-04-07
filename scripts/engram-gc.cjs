#!/usr/bin/env node
'use strict';

// engram-gc.cjs — Analyzes Engram memory health and suggests archival candidates.
// NEVER deletes or modifies any files — only reports.
//
// Usage:
//   node scripts/engram-gc.cjs          # full report
//   node scripts/engram-gc.cjs --brief  # one-line summary for session:briefing

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const AUTO_MEM_DIR = path.join(
  process.env.HOME || require('os').homedir(),
  '.claude', 'projects',
  '-home-jorge-Documentos-Github-Agent-Automation-TS',
  'memory'
);
const ENGRAM_CHUNKS = path.join(ROOT, '.engram', 'chunks');
const STALE_DAYS = 60;
const VERY_STALE_DAYS = 90;

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

const brief = process.argv.includes('--brief');

function daysSince(date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return {};
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return {};

  const result = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^(\w+)\s*:\s*(.+)/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

function analyzeAutoMemory() {
  const files = [];
  const candidates = [];
  const byType = {};

  if (!fs.existsSync(AUTO_MEM_DIR)) return { files, candidates, byType, error: 'directory not found' };

  const entries = fs.readdirSync(AUTO_MEM_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  for (const fname of entries) {
    const fpath = path.join(AUTO_MEM_DIR, fname);
    const stat = fs.statSync(fpath);
    const age = daysSince(stat.mtime);
    const content = fs.readFileSync(fpath, 'utf8');
    const fm = parseFrontmatter(content);
    const type = fm.type || 'unknown';

    byType[type] = (byType[type] || 0) + 1;
    files.push({ file: fname, type, age_days: age, description: fm.description || '' });

    // Check for stale files
    if (age > VERY_STALE_DAYS && type === 'project') {
      candidates.push({ file: fname, age_days: age, reason: `project memory >90 days old`, action: 'review' });
    } else if (age > STALE_DAYS && type !== 'user') {
      candidates.push({ file: fname, age_days: age, reason: `${type} memory >60 days old`, action: 'review' });
    }

    // Check if description references files that don't exist
    const fileRefs = (fm.description || '').match(/[\w\-./]+\.(ts|js|cjs|md|json)/g);
    if (fileRefs) {
      for (const ref of fileRefs) {
        const fullPath = path.join(ROOT, ref);
        if (!fs.existsSync(fullPath)) {
          candidates.push({ file: fname, age_days: age, reason: `references missing file: ${ref}`, action: 'update' });
          break;
        }
      }
    }
  }

  return { files, candidates, byType };
}

function analyzeChunks() {
  if (!fs.existsSync(ENGRAM_CHUNKS)) return { count: 0, note: '.engram/chunks/ not found' };

  const files = fs.readdirSync(ENGRAM_CHUNKS).filter(f => !f.startsWith('.'));
  let oldestAge = 0;
  let newestAge = Infinity;

  for (const f of files) {
    const stat = fs.statSync(path.join(ENGRAM_CHUNKS, f));
    const age = daysSince(stat.mtime);
    if (age > oldestAge) oldestAge = age;
    if (age < newestAge) newestAge = age;
  }

  return {
    count: files.length,
    oldest_days: files.length > 0 ? oldestAge : 0,
    newest_days: files.length > 0 ? newestAge : 0,
  };
}

function main() {
  const autoMem = analyzeAutoMemory();
  const chunks = analyzeChunks();

  const totalFiles = autoMem.files.length;
  const avgAge = totalFiles > 0 ? Math.round(autoMem.files.reduce((s, f) => s + f.age_days, 0) / totalFiles) : 0;
  const candidateCount = autoMem.candidates.length;

  // ── Brief mode ──
  if (brief) {
    const health = candidateCount === 0 ? '✅ healthy' : `⚠️ ${candidateCount} candidates for review`;
    console.log(`🧠 Memory: ${totalFiles} files | avg ${avgAge}d old | chunks: ${chunks.count} | ${health}`);
    return;
  }

  // ── Full report ──
  console.log(`\n${C.cyan}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bold} Engram Memory Health Report${C.reset}`);
  console.log(`${C.cyan}${'═'.repeat(60)}${C.reset}\n`);

  console.log(`${C.bold}Auto-Memory Files${C.reset}`);
  console.log(`  Total: ${totalFiles}`);
  console.log(`  Average age: ${avgAge} days`);
  console.log(`  By type:`);
  for (const [type, count] of Object.entries(autoMem.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  console.log(`\n${C.bold}Engram Chunks${C.reset}`);
  if (chunks.note) {
    console.log(`  ${C.gray}${chunks.note}${C.reset}`);
  } else {
    console.log(`  Total: ${chunks.count}`);
    console.log(`  Oldest: ${chunks.oldest_days}d | Newest: ${chunks.newest_days}d`);
  }

  console.log(`\n${C.bold}Candidates for Review${C.reset}`);
  if (candidateCount === 0) {
    console.log(`  ${C.green}✓ No candidates — memory is healthy${C.reset}`);
  } else {
    for (const c of autoMem.candidates) {
      const color = c.action === 'update' ? C.yellow : C.gray;
      console.log(`  ${color}${c.action.toUpperCase()}${C.reset} ${c.file} (${c.age_days}d) — ${c.reason}`);
    }
  }

  console.log(`\n${C.cyan}${'─'.repeat(60)}${C.reset}\n`);

  // ── Write JSON ──
  const report = {
    generated_at: new Date().toISOString(),
    stats: { total_files: totalFiles, avg_age_days: avgAge, by_type: autoMem.byType, chunks: chunks },
    candidates: autoMem.candidates,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, 'engram-gc.json'), JSON.stringify(report, null, 2));
  console.log(`${C.green}✓${C.reset} Report → reports/engram-gc.json`);
}

main();
