import legacy from './report-legacy.cjs';

export default async function handler(request) {
  const body = await request.text();
  const event = {
    httpMethod: request.method,
    body,
    headers: Object.fromEntries(request.headers.entries()),
    path: new URL(request.url).pathname,
  };
  const result = await legacy.handler(event);
  return new Response(result.body ?? '', {
    status: result.statusCode ?? 200,
    headers: result.headers ?? {},
  });
}

export const config = {
  path: '/.netlify/functions/report',
  method: 'POST',
  rateLimit: {
    windowLimit: 6,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
