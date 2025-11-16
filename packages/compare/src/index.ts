#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Comparison {
  counts: Record<string, number>;
  total: number;
}

function parseArgs(argv: string[]): { a: string; b: string } {
  const [a, b] = argv.slice(2);
  if (!a || !b) {
    console.error('Usage: perf-compare <dirA> <dirB>');
    process.exit(1);
  }
  return { a, b };
}

async function readSummary(dir: string): Promise<Comparison> {
  const text = await readFile(join(dir, 'summary.json'), 'utf8');
  return JSON.parse(text) as Comparison;
}

function diffCounts(a: Record<string, number>, b: Record<string, number>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const table: Array<{ type: string; a: number; b: number; delta: number }> = [];
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    table.push({ type: k, a: va, b: vb, delta: vb - va });
  }
  return table.sort((x, y) => x.type.localeCompare(y.type));
}

async function main() {
  const { a, b } = parseArgs(process.argv);
  const A = await readSummary(a);
  const B = await readSummary(b);

  const table = diffCounts(A.counts, B.counts);
  console.log('Entry count diff (B - A):');
  for (const row of table) {
    console.log(`${row.type.padEnd(10)}  A=${row.a.toString().padStart(4)}  B=${row.b.toString().padStart(4)}  Δ=${row.delta >= 0 ? '+' : ''}${row.delta}`);
  }
  console.log(`Totals: A=${A.total} B=${B.total} Δ=${B.total - A.total >= 0 ? '+' : ''}${B.total - A.total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

