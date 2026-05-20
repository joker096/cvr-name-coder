import React, { useState, useEffect, useCallback } from "react";
import { Activity, Server, Cpu, Zap, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";

interface DashboardStats {
  uptime: number;
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  activeLoops: number;
  memorySize: number;
  toolCalls: number;
  errors: number;
}

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  pid: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
  startTime: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const StatBox = ({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string;
}) => (
  <div className="bg-dash-bg-secondary rounded-lg p-4 border border-dash-border">
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-dash-text-muted text-xs">{label}</p>
        <p className="text-dash-text-primary text-lg font-semibold">{value}</p>
      </div>
    </div>
  </div>
);

export default function WebDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    uptime: 0, requests: 0, cacheHits: 0, cacheMisses: 0,
    activeLoops: 0, memorySize: 0, toolCalls: 0, errors: 0,
  });
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();

      if (data.stats) setStats(data.stats);
      if (data.system) setSysInfo(data.system);
    } catch {
      // Server may be down
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 text-dash-accent animate-spin" />
      </div>
    );
  }

  const cacheRate = stats.cacheHits + stats.cacheMisses > 0
    ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dash-text-primary flex items-center gap-2">
            <Activity className="w-6 h-6 text-dash-accent" />
            System Dashboard
          </h2>
          <p className="text-dash-text-muted text-sm mt-1">
            Uptime: {formatUptime(stats.uptime)} | PID: {sysInfo?.pid || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
            stats.errors === 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          )}>
            {stats.errors === 0 ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {stats.errors === 0 ? "Healthy" : `${stats.errors} errors`}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          label="Total Requests"
          value={String(stats.requests)}
          icon={Server}
          color="bg-blue-500/20"
        />
        <StatBox
          label="Active Agent Loops"
          value={String(stats.activeLoops)}
          icon={Cpu}
          color="bg-purple-500/20"
        />
        <StatBox
          label="Tool Calls"
          value={String(stats.toolCalls)}
          icon={Zap}
          color="bg-amber-500/20"
        />
        <StatBox
          label="Uptime"
          value={formatUptime(stats.uptime)}
          icon={Clock}
          color="bg-emerald-500/20"
        />
      </div>

      {/* Cache & Memory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-dash-bg-secondary rounded-lg p-4 border border-dash-border">
          <h3 className="text-sm font-semibold text-dash-text-primary mb-3">Cache Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dash-text-muted">Hit Rate</span>
              <span className="text-dash-text-primary font-medium">{cacheRate}%</span>
            </div>
            <div className="w-full bg-dash-bg rounded-full h-2">
              <div
                className="bg-dash-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${cacheRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-dash-text-muted">
              <span>{stats.cacheHits} hits</span>
              <span>{stats.cacheMisses} misses</span>
            </div>
          </div>
        </div>

        <div className="bg-dash-bg-secondary rounded-lg p-4 border border-dash-border">
          <h3 className="text-sm font-semibold text-dash-text-primary mb-3">System Resources</h3>
          {sysInfo && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dash-text-muted">Heap Used</span>
                <span className="text-dash-text-primary">{formatBytes(sysInfo.memory.heapUsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dash-text-muted">Heap Total</span>
                <span className="text-dash-text-primary">{formatBytes(sysInfo.memory.heapTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dash-text-muted">RSS</span>
                <span className="text-dash-text-primary">{formatBytes(sysInfo.memory.rss)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dash-text-muted">Platform</span>
                <span className="text-dash-text-primary">{sysInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dash-text-muted">Node.js</span>
                <span className="text-dash-text-primary">{sysInfo.nodeVersion}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-dash-bg-secondary rounded-lg p-4 border border-dash-border">
        <h3 className="text-sm font-semibold text-dash-text-primary mb-3">Memory Usage</h3>
        {sysInfo && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-dash-text-muted">
              <span>Heap: {formatBytes(sysInfo.memory.heapUsed)} / {formatBytes(sysInfo.memory.heapTotal)}</span>
              <span>{Math.round((sysInfo.memory.heapUsed / sysInfo.memory.heapTotal) * 100)}%</span>
            </div>
            <div className="w-full bg-dash-bg rounded-full h-3">
              <div className="bg-gradient-to-r from-emerald-500 to-amber-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, (sysInfo.memory.heapUsed / sysInfo.memory.heapTotal) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-dash-text-muted">RSS: {formatBytes(sysInfo.memory.rss)}</span>
              <span className="text-dash-text-muted">Started: {new Date(sysInfo.startTime).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
