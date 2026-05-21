import React, { useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, Upload, Download, Settings, AlertTriangle, CheckCircle, Loader2, Lock, Unlock, GitBranch, Folder, Globe } from "lucide-react";
import { useTeamSync, type SyncConfig } from "../../hooks/useTeamSync";

interface SyncPanelProps {
  t: any;
}

export const SyncPanel: React.FC<SyncPanelProps> = ({ t }) => {
  const { status, config, isLoading, error, exportSync, importSync, saveConfig, resolveConflicts } = useTeamSync();
  const [showSettings, setShowSettings] = useState(false);
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const [localConfig, setLocalConfig] = useState<Partial<SyncConfig>>({});

  const handleExport = async () => {
    await exportSync();
  };

  const handleImport = async () => {
    const result = await importSync();
    if (result.conflicts && result.conflicts.length > 0) {
      setConflicts(result.conflicts);
    }
  };

  const handleSaveConfig = async () => {
    const merged: SyncConfig = {
      enabled: localConfig.enabled ?? config?.enabled ?? false,
      provider: localConfig.provider ?? config?.provider ?? "git",
      repo: localConfig.repo ?? config?.repo ?? "",
      path: localConfig.path ?? config?.path ?? "",
      apiUrl: localConfig.apiUrl ?? config?.apiUrl ?? "",
      apiKey: localConfig.apiKey ?? config?.apiKey ?? "",
      interval: localConfig.interval ?? config?.interval ?? 300,
      encrypt: localConfig.encrypt ?? config?.encrypt ?? true,
      encryptionKey: localConfig.encryptionKey ?? config?.encryptionKey ?? "",
      conflictResolution: localConfig.conflictResolution ?? config?.conflictResolution ?? "last-write-wins",
    };
    const success = await saveConfig(merged);
    if (success) setShowSettings(false);
  };

  const handleResolveAllRemote = async () => {
    if (!conflicts) return;
    const resolutions = Object.fromEntries(conflicts.map((c) => [c, "remote" as const]));
    await resolveConflicts(resolutions);
    setConflicts(null);
  };

  const statusIcon = () => {
    switch (status.status) {
      case "syncing":
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-dash-accent" />;
      case "error":
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case "conflict":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <CheckCircle className="w-3.5 h-3.5 text-dash-success" />;
    }
  };

  const providerIcon = () => {
    switch (status.provider) {
      case "git":
        return <GitBranch className="w-3 h-3" />;
      case "file":
        return <Folder className="w-3 h-3" />;
      case "api":
        return <Globe className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Status Card */}
      <div className="bg-neutral-900/50 border border-dash-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {statusIcon()}
            <span className="text-[11px] font-mono uppercase tracking-wider text-dash-text-secondary">
              {status.status}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-dash-text-muted">
            {providerIcon()}
            <span>{status.provider}</span>
          </div>
        </div>
        <p className="text-[11px] text-dash-text-muted mb-2">{status.message}</p>
        {status.lastSyncAt && (
          <p className="text-[10px] text-dash-text-muted font-mono">
            {t.lastSync || "Last sync"}: {new Date(status.lastSyncAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={isLoading || !config?.enabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-dash-accent/10 border border-dash-accent/30 rounded text-[11px] font-mono uppercase tracking-wider text-dash-accent hover:bg-dash-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Upload className="w-3.5 h-3.5" />
          {t.syncExport || "Export"}
        </button>
        <button
          onClick={handleImport}
          disabled={isLoading || !config?.enabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800/50 border border-dash-border rounded text-[11px] font-mono uppercase tracking-wider text-dash-text-secondary hover:bg-neutral-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          {t.syncImport || "Import"}
        </button>
      </div>

      <button
        onClick={() => {
          setLocalConfig(config || {});
          setShowSettings(!showSettings);
        }}
        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800/50 border border-dash-border rounded text-[11px] font-mono uppercase tracking-wider text-dash-text-secondary hover:bg-neutral-700/50 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        {t.syncSettings || "Settings"}
      </button>

      {/* Conflict Resolution */}
      {conflicts && conflicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
              {t.syncConflicts || "Conflicts Detected"}
            </span>
          </div>
          <ul className="text-[10px] text-dash-text-muted mb-3 space-y-1">
            {conflicts.map((c) => (
              <li key={c} className="font-mono">{c}</li>
            ))}
          </ul>
          <button
            onClick={handleResolveAllRemote}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded text-[11px] font-mono uppercase tracking-wider text-amber-400 hover:bg-amber-500/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.useRemote || "Use Remote Version"}
          </button>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {/* Settings Form */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-neutral-900/50 border border-dash-border rounded-lg p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-dash-text-secondary">{t.syncEnabled || "Enabled"}</label>
            <input
              type="checkbox"
              checked={localConfig.enabled ?? config?.enabled ?? false}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="accent-dash-accent"
            />
          </div>

          <div>
            <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
              {t.provider || "Provider"}
            </label>
            <select
              value={localConfig.provider ?? config?.provider ?? "git"}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, provider: e.target.value as any }))}
              className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary"
            >
              <option value="git">{t.providerGit || "Git"}</option>
              <option value="file">{t.providerFile || "File"}</option>
              <option value="api">{t.providerApi || "API"}</option>
            </select>
          </div>

          {(localConfig.provider ?? config?.provider) === "git" && (
            <div>
              <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
                {t.repoUrl || "Repo URL"}
              </label>
              <input
                type="text"
                value={localConfig.repo ?? config?.repo ?? ""}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, repo: e.target.value }))}
                placeholder={t.repoUrlPlaceholder || "git@github.com:team/cvr-sync.git"}
                className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary placeholder:text-neutral-600"
              />
            </div>
          )}

          {(localConfig.provider ?? config?.provider) === "file" && (
            <div>
              <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
                {t.syncPath || "Sync Path"}
              </label>
              <input
                type="text"
                value={localConfig.path ?? config?.path ?? ""}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, path: e.target.value }))}
                placeholder={t.syncPathPlaceholder || "/path/to/Dropbox/cvr-sync"}
                className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary placeholder:text-neutral-600"
              />
            </div>
          )}

          {(localConfig.provider ?? config?.provider) === "api" && (
            <>
              <div>
                <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
                  {t.apiUrl || "API URL"}
                </label>
                <input
                  type="text"
                  value={localConfig.apiUrl ?? config?.apiUrl ?? ""}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, apiUrl: e.target.value }))}
                  placeholder={t.apiUrlPlaceholder || "https://api.example.com"}
                  className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary placeholder:text-neutral-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
                  {t.apiKey || "API Key"}
                </label>
                <input
                  type="password"
                  value={localConfig.apiKey ?? config?.apiKey ?? ""}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={t.apiKeyPlaceholder || "sk-..."}
                  className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary placeholder:text-neutral-600"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
              {t.syncInterval || "Interval (seconds)"}
            </label>
            <input
              type="number"
              value={localConfig.interval ?? config?.interval ?? 300}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, interval: parseInt(e.target.value, 10) }))}
              min={60}
              className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[11px] text-dash-text-secondary flex items-center gap-1.5">
              {localConfig.encrypt ?? config?.encrypt ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {t.encrypt || "Encrypt"}
            </label>
            <input
              type="checkbox"
              checked={localConfig.encrypt ?? config?.encrypt ?? true}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, encrypt: e.target.checked }))}
              className="accent-dash-accent"
            />
          </div>

          {(localConfig.encrypt ?? config?.encrypt) && (
            <div>
              <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
                {t.encryptionKey || "Encryption Key"}
              </label>
              <input
                type="password"
                value={localConfig.encryptionKey ?? config?.encryptionKey ?? ""}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, encryptionKey: e.target.value }))}
                placeholder={t.encryptionKeyPlaceholder || "Enter a strong passphrase"}
                className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary placeholder:text-neutral-600"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-dash-text-muted font-mono uppercase tracking-wider mb-1 block">
              {t.conflictResolution || "Conflict Resolution"}
            </label>
            <select
              value={localConfig.conflictResolution ?? config?.conflictResolution ?? "last-write-wins"}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, conflictResolution: e.target.value as any }))}
              className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1.5 text-[11px] text-dash-text-primary"
            >
              <option value="last-write-wins">{t.lastWriteWins || "Last Write Wins"}</option>
              <option value="manual">{t.manual || "Manual"}</option>
            </select>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-dash-accent/10 border border-dash-accent/30 rounded text-[11px] font-mono uppercase tracking-wider text-dash-accent hover:bg-dash-accent/20 transition-colors disabled:opacity-30"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {t.save || "Save"}
          </button>
        </motion.div>
      )}
    </div>
  );
};
