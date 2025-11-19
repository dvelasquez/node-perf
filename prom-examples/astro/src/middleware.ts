import { defineMiddleware, sequence } from "astro:middleware";
import { prometheusMiddleware } from "./prometheus/middleware-implementation";
import { startObservers } from "./prometheus/observer-implementation";
import { requestObserverDuration, requestObserverCount, resourceObserverDuration, resourceObserverCount } from "./prometheus/metrics";

startObservers({
  requestObserverDuration,
  requestObserverCount,
  resourceObserverDuration,
  resourceObserverCount,
});

export const onRequest = sequence(defineMiddleware(prometheusMiddleware));