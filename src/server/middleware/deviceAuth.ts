import { Request, Response, NextFunction } from 'express';

export interface DeviceAuthContext {
  token: string;
  boundRoverId?: string; // Optional: If the token is restricted to a specific rover
}

// Extend Express Request to include deviceAuth context
declare global {
  namespace Express {
    interface Request {
      deviceAuth?: DeviceAuthContext;
    }
  }
}

/**
 * Parses authorized tokens from environment variables:
 * - AEGIS_DEVICE_AUTH_TOKENS: Comma-separated list of tokens or rover-scoped tokens (e.g. "token123,rover-01:token456")
 * - AEGIS_ROVER_API_KEY: Single global rover API key
 *
 * NOTE: Fails securely by returning an empty map if no tokens are configured.
 * No default or hardcoded secrets are embedded in source code.
 */
export function getAuthorizedDeviceTokenMap(): Map<string, string | undefined> {
  const tokenMap = new Map<string, string | undefined>();

  // 1. Check comma-separated tokens
  const envTokens = process.env.AEGIS_DEVICE_AUTH_TOKENS;
  if (envTokens) {
    envTokens.split(',').forEach((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return;

      if (trimmed.includes(':')) {
        // Scoped token format: "roverId:secretToken"
        const [roverId, ...tokenParts] = trimmed.split(':');
        const tokenVal = tokenParts.join(':').trim();
        if (roverId && tokenVal) {
          tokenMap.set(tokenVal, roverId.trim());
        }
      } else {
        // Unscoped / global token
        tokenMap.set(trimmed, undefined);
      }
    });
  }

  // 2. Check single API key
  const singleKey = process.env.AEGIS_ROVER_API_KEY;
  if (singleKey && singleKey.trim()) {
    tokenMap.set(singleKey.trim(), undefined);
  }

  return tokenMap;
}

/**
 * Express middleware to authenticate physical hardware devices.
 * Rejects requests if credentials are missing, invalid, or if the server
 * has no authorized tokens configured (fails securely in production).
 */
export function deviceAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract token from Bearer Authorization header or X-Device-Token
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof req.headers['x-device-token'] === 'string') {
    token = req.headers['x-device-token'].trim();
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Missing device authentication token',
      code: 'UNAUTHORIZED',
      expectedHeader: 'Authorization: Bearer <device-token> or X-Device-Token: <token>',
    });
    return;
  }

  const authorizedMap = getAuthorizedDeviceTokenMap();

  // Fail securely if no tokens are configured on the server
  if (authorizedMap.size === 0) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[SECURITY WARNING] Telemetry authentication attempted but no AEGIS_DEVICE_AUTH_TOKENS configured.');
    }
    res.status(401).json({
      error: 'Unauthorized: Hardware authentication unavailable (no authorized keys configured on server)',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  if (!authorizedMap.has(token)) {
    res.status(401).json({
      error: 'Unauthorized: Invalid device authentication token',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // Attach verified context
  const boundRoverId = authorizedMap.get(token);
  req.deviceAuth = {
    token,
    boundRoverId,
  };

  next();
}
