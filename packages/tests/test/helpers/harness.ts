import { spawn, type ChildProcess } from 'node:child_process';

export async function waitForServer(url: string, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {}
    if (Date.now() > deadline) throw new Error(`Timeout waiting for ${url}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

export function startExpressServer(): ChildProcess {
  const child = spawn('npm', ['run', 'dev', '-w', '@d13z-node-perf/server-express'], {
    stdio: 'ignore',
    env: process.env,
  });
  return child;
}

export async function stopProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!child.pid) return resolve();
    child.once('exit', () => resolve());
    child.kill();
    setTimeout(() => resolve(), 1500);
  });
}

export async function sampleServer(baseUrl: string, warmup = 2, samples = 5, delayMs = 150) {
  const get = async (path: string) => {
    const r = await fetch(`${baseUrl}${path}`);
    if (!r.ok) throw new Error(`${r.status} for ${path}`);
    return r.json();
  };
  for (let i = 0; i < warmup; i++) {
    await get('/data');
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const all: any[] = [];
  for (let i = 0; i < samples; i++) {
    await get('/data');
    const { runInfo, entries } = await get('/perf-entries');
    for (const e of entries) {
      all.push({ runInfo, entry: e });
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return all;
}

