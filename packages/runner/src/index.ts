import { writeJson, writeNdjson } from '@d13z-node-perf/shared';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

interface RunnerOptions {
  target: string;
  warmup: number;
  samples: number;
  delayMs: number;
  outDir: string;
}

function parseArgs(argv: string[]): RunnerOptions {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a.startsWith('--')) {
      if (a.includes('=')) {
        const eq = a.indexOf('=');
        const key = a.slice(2, eq);
        const val = a.slice(eq + 1);
        args.set(key, val);
      } else {
        const key = a.slice(2);
        const val = argv[i + 1] ?? '';
        args.set(key, val);
        i++;
      }
    }
  }
  const target = args.get('target') ?? 'http://localhost:3000';
  const warmup = Number.parseInt(args.get('warmup') ?? '3', 10);
  const samples = Number.parseInt(args.get('samples') ?? '10', 10);
  const delayMs = Number.parseInt(args.get('delayMs') ?? '200', 10);
  const outDir = args.get('out') ?? 'out';
  return { target, warmup, samples, delayMs, outDir };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`GET ${url} -> ${r.status}`);
  }
  return (await r.json()) as T;
}

async function run(): Promise<void> {
  const opts = parseArgs(process.argv);
  const pkg = '@d13z-node-perf/server-express';

  const nowIso = new Date().toISOString().replace(/[:]/g, '-');
  const base = join(opts.outDir, pkg, nowIso);
  await mkdir(base, { recursive: true });

  // Warmup
  for (let i = 0; i < opts.warmup; i++) {
    await getJson(`${opts.target}/data`);
    await sleep(opts.delayMs);
  }

  const allEntries: any[] = [];
  for (let i = 0; i < opts.samples; i++) {
    await getJson(`${opts.target}/data`);
    const { runInfo, entries } = await getJson<{ runInfo: unknown; entries: any[] }>(
      `${opts.target}/perf-entries`
    );
    for (const e of entries) {
      allEntries.push({ runInfo, entry: e });
    }
    await sleep(opts.delayMs);
  }

  // Summary
  const counts: Record<string, number> = {};
  for (const r of allEntries) {
    const t = r.entry.entryType;
    counts[t] = (counts[t] ?? 0) + 1;
  }

  await writeNdjson(join(base, 'entries.ndjson'), allEntries);
  await writeJson(join(base, 'summary.json'), { counts, total: allEntries.length });
  await writeJson(join(base, 'runInfo.json'), {
    nodeVersion: process.version,
    collectedAt: new Date().toISOString(),
    target: opts.target,
    warmup: opts.warmup,
    samples: opts.samples,
    delayMs: opts.delayMs,
  });

  console.log(`Saved to ${base}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

