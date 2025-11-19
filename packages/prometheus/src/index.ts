import type { HttpPerformanceEntry, ResourceEntry } from "@d13z-node-perf/shared";
import { Registry, Histogram } from "prom-client";
import { PerformanceObserver } from "node:perf_hooks";

const register = new Registry();

const httpResponseDuration = new Histogram({
  name: 'http_response_duration_seconds',
  help: 'The duration of HTTP responses in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const resourceDuration = new Histogram({
  name: 'resource_duration_seconds',
  help: 'The duration of resources in seconds',
  labelNames: ['host', 'path', 'status', 'initiator'],
  registers: [register],
});

let observersStarted: boolean = false;
function startObservers() {
  if (observersStarted) return;
  observersStarted = true;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'http') {
        const httpEntry = entry as HttpPerformanceEntry;
        httpResponseDuration.observe({
          method: httpEntry.detail.req.method,
          path: httpEntry.detail.req.url,
          status: httpEntry.detail.res.statusCode
        }, httpEntry.duration / 1000);
      }
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as ResourceEntry;
        const url = new URL(resourceEntry.name);
        resourceDuration.observe({
          host: url.host,
          path: url.pathname,
          status: resourceEntry.responseStatus ?? 'unknown',
          initiator: resourceEntry.initiatorType
        }, resourceEntry.duration / 1000);
      }
    }
  });
  observer.observe({ entryTypes: ['http', 'resource'] });
}

startObservers();

export { register };

/*
Very simple way to implement Prometheus metrics in a Node.js application.
It works pretty well (tested in Astro). The main difference with the middleware implementation is
that you get visibility of **all** requests, this include static assets, like javascript files, css files, images, etc.
*/