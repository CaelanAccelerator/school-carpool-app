import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError';
import { redis } from '../lib/redis';

const WINDOW_MS = 60_000;   // 1-minute fixed window
const MAX_REQUESTS = 10;    // requests per window per user

export const matchingRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id ?? (req.params.userId as string);
  if (!userId) return next();

  const windowKey = Math.floor(Date.now() / WINDOW_MS);
  const key = `ratelimit:match:${userId}:${windowKey}`;

  try {
    const count = await redis.incr(key);

    // Set TTL only on the very first increment so the key auto-expires.
    // Race between INCR and EXPIRE is acceptable: worst case the key for
    // this minute window leaks, but it carries the minute stamp so it
    // won't block subsequent windows.
    if (count === 1) {
      await redis.expire(key, Math.ceil(WINDOW_MS / 1000));
    }

    if (count > MAX_REQUESTS) {
      return next(new AppError(429, 'Too many matching requests — please wait a minute'));
    }

    // Expose remaining quota in response headers (good practice)
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - count));
  } catch (err) {
    // Redis is down — log and let the request through (degrade gracefully)
    console.error('[rateLimit] Redis error, skipping rate limit:', (err as Error).message);
  }

  next();
};
