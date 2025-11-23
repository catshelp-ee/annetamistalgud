import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  adminId?: string;
}

export const authenticateAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.log('Auth failed: No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    console.log('Verifying token with JWT_SECRET:', JWT_SECRET?.substring(0, 10) + '...');
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
    req.adminId = decoded.adminId;
    console.log('Token verified successfully for admin:', decoded.adminId);
    next();
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
