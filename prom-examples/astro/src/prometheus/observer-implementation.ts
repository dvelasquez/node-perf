import { requestObserverDuration, requestObserverCount, resourceObserverDuration, resourceObserverCount } from "./metrics";
import { PerformanceObserver } from "node:perf_hooks";
import type { HttpPerformanceEntry, ResourceEntry } from "@d13z-node-perf/shared";

/**
 * Use a performance observer instead of a middleware.
 * Observers are instrumented automatically by the Node.js runtime, so we don't need need to measure.
 */
export function startRequestObserver() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'http') {
        const httpEntry = entry as HttpPerformanceEntry;
        // record the duration of the request
        requestObserverDuration.observe({ 
          method: httpEntry.detail.req.method, 
          path: httpEntry.detail.req.url,
          status: httpEntry.detail.res.statusCode
        }, 
        httpEntry.duration / 1000);
        // record the number of requests
        requestObserverCount.inc({ method: httpEntry.detail.req.method, path: httpEntry.detail.req.url, status: httpEntry.detail.res.statusCode });
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
export function startResourceObserver() {
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