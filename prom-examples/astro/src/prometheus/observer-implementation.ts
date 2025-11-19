import { PerformanceObserver} from "node:perf_hooks";
import type { HttpPerformanceEntry, ResourceEntry } from "@d13z-node-perf/shared";
import type { Counter, Histogram } from "prom-client";

const globalKey = Symbol.for('d13zNodePerf.promObservers');

type Globals = { requestObserverStarted?: boolean; resourceObserverStarted?: boolean };

const globals = globalThis as typeof globalThis & Record<symbol, Globals>;
export function startObservers({ requestObserverDuration, requestObserverCount, resourceObserverDuration, resourceObserverCount }: { requestObserverDuration: Histogram; requestObserverCount: Counter; resourceObserverDuration: Histogram; resourceObserverCount: Counter }) {


if (!globals[globalKey]?.requestObserverStarted) {
  startRequestObserver({ requestObserverDuration, requestObserverCount});
  globals[globalKey] = {
    ...globals[globalKey],
    requestObserverStarted: true,
  };
}

if (!globals[globalKey]?.resourceObserverStarted) {
  startResourceObserver({ resourceObserverCount, resourceObserverDuration});
  globals[globalKey] = {
    ...globals[globalKey],
    resourceObserverStarted: true,
  };
}
}

/**
 * Use a performance observer instead of a middleware.
 * Observers are instrumented automatically by the Node.js runtime, so we don't need need to measure.
 */
export function startRequestObserver({ requestObserverDuration, requestObserverCount }: { requestObserverDuration: Histogram; requestObserverCount: Counter }) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'http') {
        const httpEntry = entry as HttpPerformanceEntry;
        // we are filtering for the metrics-test page for now
        if (httpEntry.detail.req.url === '/metrics-test'){
          // record the duration of the request
          requestObserverDuration.observe({ 
            method: httpEntry.detail.req.method, 
            path: httpEntry.detail.req.url,
            status: httpEntry.detail.res.statusCode
          }, 
          httpEntry.duration / 1000);
          // record the number of requests
          requestObserverCount.inc({ 
            method: httpEntry.detail.req.method, 
            path: httpEntry.detail.req.url, 
            status: httpEntry.detail.res.statusCode 
          });
          console.log(`Observer recorded request ${httpEntry.detail.req.method} ${httpEntry.detail.req.url} took ${httpEntry.duration}ms`);
          } 
        }
    }
  });
  observer.observe({ entryTypes: ['http'] });
}

/**
 * BONUS: We can also observe resource entries.
 * Resource entries are emitted by the Node.js runtime for outbound requests.
 * For example, fetch calls.
 */
export function startResourceObserver({ resourceObserverDuration, resourceObserverCount }: { resourceObserverDuration: Histogram; resourceObserverCount: Counter }) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as ResourceEntry;
        const url = new URL(resourceEntry.name);
        // record the duration of the resource
        resourceObserverDuration.observe({ 
          host: url.host, 
          path: url.pathname,
          status: resourceEntry.responseStatus,
          initiator: resourceEntry.initiatorType
        }, 
        resourceEntry.duration / 1000);
        // record the number of resources
        resourceObserverCount.inc({ 
          host: url.host, 
          path: url.pathname, 
          status: resourceEntry.responseStatus, 
          initiator: resourceEntry.initiatorType 
        });
      }
    }
  });
  observer.observe({ entryTypes: ['resource'] });
}

/**
 * Some learnings about using observers:
 * Because of their asynchronous nature, they don't update "instantaneously" as the middleware does.
 * A better implementation using observers could be made with Prometheus.
 * Or we can listen to the observers events that are already emitted by the Node.js runtime.
 * 
 * Example output:
 * Middleware recorded request start GET /metrics-test took 270.9183750000084ms
 * 10:34:01 [200] /metrics-test 272ms
 * Middleware recorded response streaming end GET /metrics-test took 817.6101659999986ms
 * Observer recorded request GET /metrics-test took 826.6824170000036ms
 * 
 * From what we can gather, Astro output the start of the streaming response in their "[200] /metrics-test 272ms" line.
 * This number is very similar, and in fact we can see that the middleware record that start earlier than the logger.
 * Then we get middleware recording the end of the streaming at 817ms
 * While the observer records the end of the request at 826ms
 * So this is the order:
 * 1. Middleware records the start of the request
 * 2. Logger records the start of the streaming response
 * 3. Middleware records the end of the streaming response
 * 4. Observer records the end of the request
 * 
 * We can safely assume that the observer is recording the end of the request, which is a good number to use for our metrics.
 */