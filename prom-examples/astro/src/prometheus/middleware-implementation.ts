import type { APIContext, MiddlewareNext } from "astro";
import { requestMiddlewareDuration, requestMiddlewareCount } from "./metrics";

/**
 * Classic implementation of a middleware that records the duration of requests and the number of requests.
 * This eventually have a performance overhead.
 * @param context Context of the request
 * @param next Next function to call
 * @returns Response from the next function
 */
export async function prometheusMiddleware(context: APIContext, next: MiddlewareNext): Promise<Response> {
  const startTimestamp = performance.now();
  const response = await next();
  const endTimestamp = performance.now();
  const duration = (endTimestamp - startTimestamp) / 1000;

  requestMiddlewareDuration?.observe({ 
    method: context.request.method, 
    path: context.url.pathname, 
    status: response.status 
  }, duration);
  requestMiddlewareCount?.inc({ 
    method: context.request.method, 
    path: context.url.pathname, 
    status: response.status 
  });

  return response;
}