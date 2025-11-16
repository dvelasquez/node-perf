import { promRegistry } from "../prometheus/metrics";

export async function GET() {
  const metrics = await promRegistry.metrics();
  return new Response(metrics, {
    headers: {
      'Content-Type': promRegistry.contentType,
    },
  });
}