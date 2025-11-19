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
  const durationMs = (endTimestamp - startTimestamp);
  const durationSeconds = durationMs / 1000;

  requestMiddlewareDuration?.observe({ 
    method: context.request.method, 
    path: context.url.pathname, 
    status: response.status 
  }, durationSeconds);
  requestMiddlewareCount?.inc({ 
    method: context.request.method, 
    path: context.url.pathname, 
    status: response.status 
  });

  console.log(`Middleware recorded request start ${context.request.method} ${context.url.pathname} took ${durationMs}ms`);

  const logCompletion = () => {
    const finalEnd = performance.now();
    const totalMs = finalEnd - startTimestamp;
    console.log(`Middleware recorded response streaming end ${context.request.method} ${context.url.pathname} took ${totalMs}ms`);
  };

  if (!response.body) {
    logCompletion();
    return response;
  }

  const [clientStream, metricsStream] = response.body.tee();
  const instrumentedResponse = new Response(clientStream, {
    headers: new Headers(response.headers),
    status: response.status,
    statusText: response.statusText,
  });

  metricsStream
    .pipeTo(
      new WritableStream({
        close() {
          logCompletion();
        },
      }),
    )
    .catch((err) => {
      console.error('Error measuring response stream', err);
      logCompletion();
    });

  return instrumentedResponse;
}