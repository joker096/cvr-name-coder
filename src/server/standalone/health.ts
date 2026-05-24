import express from "express";

let _requestCount = 0;
let _cacheHits = 0;
let _cacheMisses = 0;
let _toolCalls = 0;
let _errors = 0;
let _activeLoops = 0;

/** Increments the global request counter by 1. */
export function incrementRequestCount() { _requestCount++; }

/** Increments the global cache hit counter by 1. */
export function incrementCacheHit() { _cacheHits++; }

/** Increments the global cache miss counter by 1. */
export function incrementCacheMiss() { _cacheMisses++; }

/** Increments the global tool call counter by 1. */
export function incrementToolCall() { _toolCalls++; }

/** Increments the global error counter by 1. */
export function incrementError() { _errors++; }

/**
 * Sets the current count of active agent loops.
 *
 * @param count - The number of currently running agent loops.
 */
export function setActiveLoops(count: number) { _activeLoops = count; }

/**
 * Registers the GET /api/health endpoint on the Express app.
 * Returns server health metrics including uptime, request counts, cache stats,
 * tool calls, errors, active loops, and memory usage.
 *
 * @param app - The Express application instance.
 */
export function setupHealthRoute(app: express.Application): void {
  app.get("/api/health", (_req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      stats: {
        uptime: Math.round(process.uptime()),
        requests: _requestCount,
        cacheHits: _cacheHits,
        cacheMisses: _cacheMisses,
        activeLoops: _activeLoops,
        toolCalls: _toolCalls,
        errors: _errors,
        memorySize: mem.heapUsed,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        memory: {
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          rss: mem.rss,
        },
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
    });
  });
}
