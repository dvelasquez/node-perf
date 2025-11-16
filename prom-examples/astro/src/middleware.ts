import { defineMiddleware, sequence } from "astro:middleware";
import { prometheusMiddleware } from "./prometheus/middleware-implementation";
import { startRequestObserver, startResourceObserver } from "./prometheus/observer-implementation";

startRequestObserver();
startResourceObserver();

export const onRequest = sequence(defineMiddleware(prometheusMiddleware));