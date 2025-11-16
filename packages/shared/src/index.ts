import type {
  PerformanceEntry,
  PerformanceMeasure,
  PerformanceResourceTiming,
} from 'node:perf_hooks';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface HttpRequestDetail {
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

export type HttpPerformanceEntry = PerformanceEntry & {
  entryType: 'http';
  name: 'HttpRequest';
  detail: HttpRequestDetail;
};

export type ResourceEntry = PerformanceResourceTiming & {
  initiatorType: string;
  deliveryType?: string | undefined;
  responseStatus?: number | undefined;
  responseStart: number;
};

export type MeasureEntry = PerformanceMeasure & {
  entryType: 'measure';
  detail: null;
};

export type ObservedEntry =
  | HttpPerformanceEntry
  | ResourceEntry
  | MeasureEntry
  | PerformanceEntry;

export interface ResourceEntrySnapshot {
  name: string;
  entryType: 'resource';
  initiatorType: string;
  duration: number;
  startTime: number;
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
  deliveryType?: string | undefined;
  responseStatus?: number | undefined;
}

export interface HttpEntrySnapshot {
  entryType: 'http';
  name: 'HttpRequest';
  duration: number;
  startTime: number;
  detail: HttpRequestDetail;
}

export interface MeasureEntrySnapshot {
  entryType: 'measure';
  name: string;
  duration: number;
  startTime: number;
  detail: null;
}

export type ObservedEntrySnapshot =
  | ResourceEntrySnapshot
  | HttpEntrySnapshot
  | MeasureEntrySnapshot;

export type EntryTypeName = PerformanceEntry['entryType'];

export interface PerfCollector {
  getAndClearSnapshots(): ObservedEntrySnapshot[];
}

export function setupObserver(entryTypes: EntryTypeName[]): PerfCollector {
  const buffered: ObservedEntrySnapshot[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as unknown as PerformanceEntry[]) {
      const snap = serializeEntry(entry as any);
      if (snap) buffered.push(snap);
    }
  });

  observer.observe({ entryTypes, buffered: false });

  return {
    getAndClearSnapshots(): ObservedEntrySnapshot[] {
      const extraResources = performance
        .getEntriesByType('resource')
        .map((e) => serializeEntry(e as any))
        .filter((e): e is ResourceEntrySnapshot => !!e && e.entryType === 'resource');
      const all = buffered.splice(0, buffered.length);
      return [...all, ...extraResources];
    },
  };
}

export function serializeEntry(entry: ObservedEntry): ObservedEntrySnapshot | null {
  switch (entry.entryType) {
    case 'resource': {
      const e = entry as ResourceEntry;
      return {
        name: e.name,
        entryType: e.entryType,
        initiatorType: e.initiatorType,
        duration: e.duration,
        startTime: e.startTime,
        workerStart: e.workerStart,
        redirectStart: e.redirectStart,
        redirectEnd: e.redirectEnd,
        fetchStart: e.fetchStart,
        domainLookupStart: e.domainLookupStart,
        domainLookupEnd: e.domainLookupEnd,
        connectStart: e.connectStart,
        connectEnd: e.connectEnd,
        secureConnectionStart: e.secureConnectionStart,
        requestStart: e.requestStart,
        responseStart: e.responseStart,
        responseEnd: e.responseEnd,
        transferSize: e.transferSize,
        encodedBodySize: e.encodedBodySize,
        decodedBodySize: e.decodedBodySize,
        deliveryType: e.deliveryType,
        responseStatus: e.responseStatus,
      };
    }
    case 'http': {
      const e = entry as HttpPerformanceEntry;
      return {
        entryType: 'http',
        name: 'HttpRequest',
        duration: e.duration,
        startTime: e.startTime,
        detail: e.detail,
      };
    }
    case 'measure': {
      const e = entry as MeasureEntry;
      return {
        entryType: 'measure',
        name: e.name,
        duration: e.duration,
        startTime: e.startTime,
        detail: null,
      };
    }
    default:
      return null;
  }
}

export async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function writeNdjson<T>(filePath: string, records: T[]): Promise<void> {
  if (records.length === 0) return;
  await ensureDir(filePath);
  const lines = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await appendFile(filePath, lines, 'utf8');
}
