import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

interface SecurityMiddlewareOptions {
  contentSecurityPolicy?: boolean;
  frameguard?: boolean;
}

export function setupSecurityMiddleware(
  app: express.Application,
  options: SecurityMiddlewareOptions = {}
): void {
  app.disable("x-powered-by");
  app.use(helmet({
    ...(options.frameguard === false ? { frameguard: false } : {}),
    ...(options.contentSecurityPolicy === false
      ? { contentSecurityPolicy: false }
      : {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "blob:"],
              connectSrc: ["'self'", "ws:", "wss:"],
            },
          },
        }),
  }));

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 120 : 10000,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

export function createTrustedLocalOriginMiddleware(
  allowedHosts: string[] = ["127.0.0.1", "localhost"]
): express.RequestHandler {
  const trustedHosts = new Set(allowedHosts.map((host) => host.toLowerCase()));
  const trustedProtocols = new Set(["vscode-webview:", "vscode-file:", "file:"]);

  return (req, res, next) => {
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;
    const candidate = typeof originHeader === "string" && originHeader.length > 0
      ? originHeader
      : typeof refererHeader === "string" && refererHeader.length > 0
        ? refererHeader
        : null;

    if (!candidate) {
      next();
      return;
    }

    try {
      const parsed = new URL(candidate);
      if (
        trustedHosts.has(parsed.hostname.toLowerCase()) ||
        trustedProtocols.has(parsed.protocol.toLowerCase())
      ) {
        next();
        return;
      }
    } catch {
      // Reject malformed origin/referer values.
    }

    res.status(403).json({ error: "Forbidden origin" });
  };
}

export function createApiKeyMiddleware(): express.RequestHandler {
  const API_KEY = process.env.CVR_API_KEY;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!API_KEY) {
      if (process.env.NODE_ENV !== "production") {
        return next();
      }
      return res.status(500).json({ error: "CVR_API_KEY not configured" });
    }
    const headerKey = req.headers["x-api-key"];
    if (headerKey !== API_KEY) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing x-api-key header" });
    }
    next();
  };
}
