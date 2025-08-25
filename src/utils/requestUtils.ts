import { Request } from 'express';

/**
 * Extract client information from request for security tracking
 */
export function getClientInfo(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  // Get real IP address, considering proxy headers
  const ipAddress = 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // Get user agent
  const userAgent = req.headers['user-agent'] || 'unknown';

  return {
    ipAddress,
    userAgent
  };
}

/**
 * Extract additional security headers for enhanced tracking
 */
export function getSecurityHeaders(req: Request): {
  origin?: string;
  referer?: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
} {
  return {
    origin: req.headers.origin as string,
    referer: req.headers.referer as string,
    acceptLanguage: req.headers['accept-language'] as string,
    acceptEncoding: req.headers['accept-encoding'] as string
  };
}

/**
 * Generate a request fingerprint for security analysis
 */
export function generateRequestFingerprint(req: Request): string {
  const { ipAddress, userAgent } = getClientInfo(req);
  const { origin, acceptLanguage } = getSecurityHeaders(req);
  
  const fingerprint = Buffer.from(
    `${ipAddress}:${userAgent}:${origin || ''}:${acceptLanguage || ''}`
  ).toString('base64');
  
  return fingerprint;
}
