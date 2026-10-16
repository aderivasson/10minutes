import legacy from './chat-legacy.cjs';

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
  path: '/.netlify/functions/chat',
  method: 'POST',
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
