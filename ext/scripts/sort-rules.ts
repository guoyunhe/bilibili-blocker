import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

const RULES_DIR = new URL('../rules/', import.meta.url).pathname;

async function sortRules(file: string) {
  const path = isAbsolute(file) ? file : join(RULES_DIR, file);
  const content = await readFile(path, 'utf-8');
  const lines = content.split('\n');

  const comments: string[] = [];
  const ids: Set<string> = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      comments.push(trimmed);
    } else {
      ids.add(trimmed);
    }
  }

  const sortedIds = Array.from(ids).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  const sorted = [...comments, ...sortedIds, ''].join('\n');
  await writeFile(path, sorted, 'utf-8');
  console.log(`Sorted ${file}: ${sortedIds.length} IDs`);
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: npx tsx scripts/sort-rules.ts <file...>');
    console.error('Example: npx tsx scripts/sort-rules.ts clickbait.txt aislop.txt catfish.txt');
    process.exit(1);
  }
  for (const file of files) {
    await sortRules(file);
  }
}

main();
