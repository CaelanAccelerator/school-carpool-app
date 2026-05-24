import Redis from 'ioredis';

const isTest = process.env.NODE_ENV === 'test';

export const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD ?? undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  // In test environments Redis isn't available — fail fast, no background reconnect flood
  retryStrategy: isTest ? () => null : (times) => Math.min(times * 500, 10_000)
});

redis.on('error', (err: Error) => {
  console.error('[redis] connection error:', err.message);
});
