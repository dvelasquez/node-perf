import { Counter, Histogram, Registry } from "prom-client";


const promRegistry = new Registry();
const requestMiddlewareDuration = new Histogram({
  name: 'astro_middleware_request_duration_seconds',
  help: 'The duration of requests in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [promRegistry],
});

const requestMiddlewareCount = new Counter({
  name: 'astro_middleware_request_count',
  help: 'The number of requests',
  labelNames: ['method', 'path', 'status'],
  registers: [promRegistry],
});

const requestObserverDuration = new Histogram({
  name: 'astro_observer_request_duration_seconds',
  help: 'The duration of requests in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [promRegistry],
});

const requestObserverCount = new Counter({
  name: 'astro_observer_request_count',
  help: 'The number of requests',
  labelNames: ['method', 'path', 'status'],
  registers: [promRegistry],
});

const resourceObserverDuration = new Histogram({
  name: 'astro_observer_resource_duration_seconds',
  help: 'The duration of resources in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [promRegistry],
});
const resourceObserverCount = new Counter({
  name: 'astro_observer_resource_count',
  help: 'The number of resources',
  labelNames: ['method', 'path', 'status'],
  registers: [promRegistry],
});

export { promRegistry, requestMiddlewareDuration, requestMiddlewareCount, requestObserverDuration, requestObserverCount, resourceObserverDuration, resourceObserverCount };