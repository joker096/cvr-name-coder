import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export function setupSecurityMiddleware(app: express.Application): void {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
  }));

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

export function createApiKeyMiddleware(): express.RequestHandler {
  const API_KEY = process.env.CVR_API_KEY || (process.env.NODE_ENV === "production" ? null : "dev");
  
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!API_KEY || API_KEY === "dev") {
      return next();
    }
    const headerKey = req.headers["x-api-key"];
    if (headerKey !== API_KEY) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing x-api-key header" });
    }
    next();
  };
}
