import express from "express";

let _requestCount = 0;
let _cacheHits = 0;
let _cacheMisses = 0;
let _toolCalls = 0;
let _errors = 0;
let _activeLoops = 0;

export function incrementRequestCount() { _requestCount++; }
export function incrementCacheHit() { _cacheHits++; }
export function incrementCacheMiss() { _cacheMisses++; }
export function incrementToolCall() { _toolCalls++; }
export function incrementError() { _errors++; }
export function setActiveLoops(count: number) { _activeLoops = count; }

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
