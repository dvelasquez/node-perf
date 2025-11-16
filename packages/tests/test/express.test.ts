import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startExpressServer, stopProcess, waitForServer, sampleServer } from './helpers/harness.js';
import { PerformanceObserver } from 'node:perf_hooks';

describe('server-express perf entries', () => {
  let child: import('node:child_process').ChildProcess;
  const baseUrl = 'http://localhost:3000';

  before(async () => {
    // Ensure we are on a node that supports 'http' and 'resource' entries
    const supported = (PerformanceObserver as any).supportedEntryTypes ?? [];
    assert.ok(supported.includes('resource'), 'resource entries not supported by this Node');
    child = startExpressServer();
    await waitForServer(`${baseUrl}/data`);
  });

  after(async () => {
    await stopProcess(child);
  });

  it('captures http, measure, and resource entries with expected fields', async () => {
    const entries = await sampleServer(baseUrl, 2, 4, 120);
    assert.ok(entries.length > 0, 'no entries captured');

    const counts: Record<string, number> = {};
    for (const r of entries) {
      const t = r.entry.entryType;
      counts[t] = (counts[t] ?? 0) + 1;
    }

    assert.ok(counts['http']! >= 1, 'expected http entries');
    assert.ok(counts['measure']! >= 1, 'expected measure entries');
    assert.ok(counts['resource']! >= 1, 'expected resource entries');

    // spot-check shapes
    const resource = entries.find((e) => e.entry.entryType === 'resource')?.entry;
    assert.ok(resource?.initiatorType === 'fetch', 'resource.initiatorType should be fetch');
    assert.equal(typeof resource?.transferSize, 'number');
    assert.equal(typeof resource?.responseEnd, 'number');

    const http = entries.find((e) => e.entry.entryType === 'http')?.entry;
    assert.equal(http?.name, 'HttpRequest');
    assert.equal(typeof http?.detail?.req?.method, 'string');
    assert.equal(typeof http?.detail?.res?.statusCode, 'number');
  });
});

