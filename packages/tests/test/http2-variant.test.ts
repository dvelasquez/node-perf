import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { PerformanceObserver } from 'node:perf_hooks';

// HTTP/2 variant placeholder test:
// - Node exposes an 'http2' entryType for HTTP/2 server/client activity.
// - Outbound fetches still surface as 'resource' entries; ALPN 'h2' is visible via nextHopProtocol.
// - This placeholder verifies support is advertised by the runtime; integration with a true h2 server can be added later.

describe('HTTP/2 variant (placeholder)', () => {
  it('confirms "http2" is a supported entryType on Node', () => {
    const supported = (PerformanceObserver as any).supportedEntryTypes ?? [];
    assert.ok(
      supported.includes('http2'),
      'Node perf_hooks should include "http2" in supportedEntryTypes'
    );
  });

  it('documents how HTTP/2 appears today (no runtime assertion)', () => {
    // Inbound HTTP/2: observe 'http2' entries from Node when an h2 server handles requests.
    // Outbound h2 (fetch/undici): observe 'resource' entries and check nextHopProtocol === 'h2'.
    assert.ok(true);
  });
});


