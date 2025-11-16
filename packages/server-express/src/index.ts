import express, { type NextFunction, type Request, type Response } from 'express';
import {
  PerformanceObserver,
  performance,
  type PerformanceEntry,
} from 'node:perf_hooks';
import {
  type HttpPerformanceEntry,
  type MeasureEntry,
  type ObservedEntry,
  type ResourceEntry,
  type ResourceEntrySnapshot,
} from '@perf/shared';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const EXTERNAL_URL =
  process.env.EXTERNAL_URL ?? 'https://jsonplaceholder.typicode.com/todos/1';

type EntryType = PerformanceEntry['entryType'];

const supportedEntryTypes =
  (PerformanceObserver as unknown as { supportedEntryTypes?: EntryType[] }).supportedEntryTypes ?? [];

const desiredEntryTypes = ['http', 'resource', 'measure'] as const;
type DesiredEntryType = (typeof desiredEntryTypes)[number];

const observedEntryTypes: DesiredEntryType[] = desiredEntryTypes.filter(
  (entryType): entryType is DesiredEntryType =>
    supportedEntryTypes.includes(entryType)
);

console.log('[startup] Supported performance entry types:', supportedEntryTypes);

if (observedEntryTypes.length > 0) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      logPerformanceEntry(entry);
    }
  });

  observer.observe({ entryTypes: observedEntryTypes });
} else {
  console.warn(
    '[startup] None of the requested entry types (http, resource, measure) are supported by this Node.js runtime.'
  );
}

const logPerformanceEntry = (entry: ObservedEntry): void => {
  const parts = [
    `type=${entry.entryType}`,
    entry.name ? `name=${entry.name}` : null,
    Number.isFinite(entry.duration) ? `duration=${entry.duration.toFixed(2)}ms` : null,
  ].filter(Boolean);

  console.log(`[perf] ${parts.join(' ')}`);

  switch (entry.entryType) {
    case 'resource': {
      const resourceEntry = entry as ResourceEntry;
      console.log(
        `  initiatorType=${resourceEntry.initiatorType} transferSize=${resourceEntry.transferSize} encodedBodySize=${resourceEntry.encodedBodySize}`
      );
      break;
    }
    case 'http': {
      const httpEntry = entry as HttpPerformanceEntry;
      console.log('  detail:', httpEntry.detail);
      break;
    }
    case 'measure': {
      const measureEntry = entry as MeasureEntry;
      console.log('  detail:', measureEntry.detail);
      break;
    }
    default:
      break;
  }
};

interface DataResponse {
  source: string;
  fetchedAt: string;
  data: unknown;
  resourceEntry: ResourceEntrySnapshot | null;
}

const toResourceEntrySnapshot = (
  entry: ResourceEntry | undefined
): ResourceEntrySnapshot | null => {
  if (!entry) {
    return null;
  }

  return {
    name: entry.name,
    entryType: entry.entryType,
    initiatorType: entry.initiatorType,
    duration: entry.duration,
    startTime: entry.startTime,
    workerStart: entry.workerStart,
    redirectStart: entry.redirectStart,
    redirectEnd: entry.redirectEnd,
    fetchStart: entry.fetchStart,
    domainLookupStart: entry.domainLookupStart,
    domainLookupEnd: entry.domainLookupEnd,
    connectStart: entry.connectStart,
    connectEnd: entry.connectEnd,
    secureConnectionStart: entry.secureConnectionStart,
    requestStart: entry.requestStart,
    responseStart: entry.responseStart,
    responseEnd: entry.responseEnd,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
    deliveryType: entry.deliveryType,
    responseStatus: entry.responseStatus,
  };
};

const app = express();

app.get('/data', async (req: Request, res: Response<DataResponse>, next: NextFunction) => {
  const startMark = `fetch-start-${performance.now()}`;
  const endMark = `${startMark}-end`;

  try {
    performance.mark(startMark);

    const response = await fetch(EXTERNAL_URL);
    const payload = (await response.json()) as unknown;

    performance.mark(endMark);
    performance.measure(`fetch ${EXTERNAL_URL}`, startMark, endMark);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    const resourceEntries = performance
      .getEntriesByType('resource')
      .filter((entry): entry is ResourceEntry => entry.entryType === 'resource')
      .filter((entry) => entry.name === EXTERNAL_URL);

    res.json({
      source: EXTERNAL_URL,
      fetchedAt: new Date().toISOString(),
      data: payload,
      resourceEntry: toResourceEntrySnapshot(resourceEntries.at(-1)),
    });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error('Unknown fetch error');
    next(failure);
  } finally {
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  }
});

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const failure = error instanceof Error ? error : new Error('Unexpected server error');
  console.error('[error]', failure);
  res.status(500).json({ error: failure.message });
});

app.listen(PORT, () => {
  console.log(`[startup] Server listening on http://localhost:${PORT}/data`);
});

