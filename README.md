## Performance Entry Notes

This project spins up a minimal Express server that forwards a request to the mock API at `https://jsonplaceholder.typicode.com/todos/1`. It emits and logs performance data to help answer a few questions:

- **Incoming requests:** Node's `perf_hooks` module emits `http` performance entries named `HttpRequest`.
- **Outgoing fetches:** Node records `resource` entries with `initiatorType = "fetch"` for outbound requests, plus any custom `measure` entries we create.
- **Available entry types:** Logged on startup from `PerformanceObserver.supportedEntryTypes` (default Node 20+ includes entries such as `dns`, `function`, `gc`, `http`, `http2`, `mark`, `measure`, `net`, and `resource`).

### Observed Performance Entry Shapes

```ts
type SupportedEntryType =
  | "dns"
  | "function"
  | "gc"
  | "http"
  | "http2"
  | "mark"
  | "measure"
  | "net"
  | "resource"
  | (string & {}); // runtime-dependent

interface BaseEntry {
  name: string;
  entryType: SupportedEntryType;
  startTime: number;
  duration: number;
}

interface HttpRequestEntryDetail {
  req: {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  res: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
  };
}

interface HttpRequestPerformanceEntry extends BaseEntry {
  entryType: "http";
  name: "HttpRequest";
  detail: HttpRequestEntryDetail;
}

interface ResourceEntry extends BaseEntry {
  entryType: "resource";
  initiatorType: "fetch" | string;
  nextHopProtocol?: string;
  workerStart: number;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  deliveryType?: string;
  responseStatus?: number;
}

interface MeasureEntry extends BaseEntry {
  entryType: "measure";
  detail: null;
}

type ObservedEntry =
  | HttpRequestPerformanceEntry
  | ResourceEntry
  | MeasureEntry
  | BaseEntry;
```

### What We Saw in Practice

- **Incoming request (`http` entry):**
  - `name` is always `"HttpRequest"`.
  - The `detail` field carries the Express request/response metadata (method, URL, status code, headers, etc.).
- **Outgoing fetch (`resource` entry):**
  - `name` is the full URL (`https://jsonplaceholder.typicode.com/todos/1`).
  - `initiatorType` resolves to `"fetch"`.
  - `transferSize`, `encodedBodySize`, and `decodedBodySize` reflect the payload exchange.
- **Custom measure (`measure` entry):**
  - Created via `performance.measure("fetch …", startMark, endMark)` around the `fetch`.
  - Useful for tracking high-level latency of the outbound call.

The server prints these entries to the console; run `npm start` and hit `http://localhost:3000/data` to reproduce the logs.

### Example Console Output (`npm start`)

```
[startup] Supported performance entry types: [
  'dns',      'function',
  'gc',       'http',
  'http2',    'mark',
  'measure',  'net',
  'resource'
]
[startup] Server listening on http://localhost:3000/data
[perf] type=measure name=fetch https://jsonplaceholder.typicode.com/todos/1 duration=118.06ms
[perf] type=resource name=https://jsonplaceholder.typicode.com/todos/1 duration=109.10ms
  initiatorType=fetch transferSize=370 encodedBodySize=70
[perf] type=http name=HttpRequest duration=122.34ms
  detail: {
  req: {
    method: 'GET',
    url: '/data',
    headers: {
      host: 'localhost:3000',
      'user-agent': 'curl/8.7.1',
      accept: '*/*'
    }
  },
  res: {
    statusCode: 200,
    statusMessage: 'OK',
    headers: [Object: null prototype] {
      'x-powered-by': 'Express',
      'content-type': 'application/json; charset=utf-8',
      'content-length': '408',
      etag: 'W/"198-gITFCNpfgDPPyIr988L/8fPz3bU"'
    }
  }
}
```

### Example `performance` Entries (`toJSON()`)

```
entryType: measure name: fetch https://jsonplaceholder.typicode.com/todos/1
inspect: PerformanceMeasure {
  name: 'fetch https://jsonplaceholder.typicode.com/todos/1',
  entryType: 'measure',
  startTime: 18.4875,
  duration: 124.54200000000002,
  detail: null
}
toJSON: {
  name: 'fetch https://jsonplaceholder.typicode.com/todos/1',
  entryType: 'measure',
  startTime: 18.4875,
  duration: 124.54200000000002,
  detail: null
}
entryType: resource name: https://jsonplaceholder.typicode.com/todos/1
inspect: PerformanceResourceTiming {
  name: 'https://jsonplaceholder.typicode.com/todos/1',
  entryType: 'resource',
  startTime: 30.834292,
  duration: 112.493833,
  initiatorType: 'fetch',
  nextHopProtocol: undefined,
  workerStart: 0,
  redirectStart: 0,
  redirectEnd: 0,
  fetchStart: 30.834292,
  domainLookupStart: 30.834292,
  domainLookupEnd: 30.834292,
  connectStart: 30.834292,
  connectEnd: 30.834292,
  secureConnectionStart: 30.834292,
  requestStart: 114.471,
  responseStart: 138.496125,
  responseEnd: 143.328125,
  transferSize: 370,
  encodedBodySize: 70,
  decodedBodySize: 83,
  deliveryType: '',
  responseStatus: 200
}
toJSON: {
  name: 'https://jsonplaceholder.typicode.com/todos/1',
  entryType: 'resource',
  startTime: 30.834292,
  duration: 112.493833,
  initiatorType: 'fetch',
  nextHopProtocol: undefined,
  workerStart: 0,
  redirectStart: 0,
  redirectEnd: 0,
  fetchStart: 30.834292,
  domainLookupStart: 30.834292,
  domainLookupEnd: 30.834292,
  connectStart: 30.834292,
  connectEnd: 30.834292,
  secureConnectionStart: 30.834292,
  requestStart: 114.471,
  responseStart: 138.496125,
  responseEnd: 143.328125,
  transferSize: 370,
  encodedBodySize: 70,
  decodedBodySize: 83,
  deliveryType: '',
  responseStatus: 200
}
```

