import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/auth/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
};
