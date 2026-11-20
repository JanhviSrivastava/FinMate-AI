import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

export interface AuthPayload {
  userId: number;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

// Keep a stable server-only signing secret per process if JWT_SECRET is not set in env
const runtimeFallbackSecret = crypto
  .createHash('sha256')
  .update(`finmate-ai-${process.env.SQL_DB_NAME ?? 'local'}-${process.env.SQL_HOST ?? 'host'}`)
  .digest('hex');

function getJwtSecret(): string {
  return process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16
    ? process.env.JWT_SECRET.trim()
    : runtimeFallbackSecret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as AuthPayload).userId !== 'number' ||
    typeof (decoded as AuthPayload).email !== 'string'
  ) {
    throw new Error('Invalid token payload');
  }
  return {
    userId: (decoded as AuthPayload).userId,
    email: (decoded as AuthPayload).email,
    name: typeof (decoded as AuthPayload).name === 'string' ? (decoded as AuthPayload).name : '',
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}
