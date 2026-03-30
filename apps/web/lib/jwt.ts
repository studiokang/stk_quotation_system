import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '@/lib/env';

export interface SurveyTokenPayload {
  userId: string;
  surveyId: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify and decode a survey JWT token.
 * Returns the payload if valid and not expired, or null otherwise.
 * Uses JWT_SECRET from validated environment variables.
 */
export function verifyToken(token: string): SurveyTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: '7d',
    }) as SurveyTokenPayload;

    if (!decoded.userId || !decoded.surveyId) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Create a survey access token with expiry.
 * Only for server-side use (token generation endpoints).
 */
export function signToken(payload: { userId: string; surveyId: string }, expiresIn = '7d'): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn,
  } as SignOptions);
}
