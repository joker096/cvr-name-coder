import { useState, useEffect, useCallback } from "react";

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  deleted: string[];
  renamed: string[];
  clean: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitDiff {
  file: string;
  status: string;
  diff: string;
}

export interface GitState {
  status: GitStatus | null;
  diffs: GitDiff[];
  commits: GitCommit[];
  loading: boolean;
  committing: boolean;
  pushing: boolean;
  error: string | null;
}

export const useGit = () => {
  const [state, setState] = useState<GitState>({
    status: null,
    diffs: [],
    commits: [],
    loading: true,
    committing: false,
    pushing: false,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/git/status");
    if (!res.ok) throw new Error(await res.text());
    const status = await res.json();
    setState((prev) => ({ ...prev, status }));
    return status;
  }, []);

  const fetchDiff = useCallback(async (stagedOnly = false) => {
    const res = await fetch(`/api/git/diff?staged=${stagedOnly}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setState((prev) => ({ ...prev, diffs: data.diffs || [] }));
    return data;
  }, []);

  const fetchLog = useCallback(async (limit = 10) => {
    const res = await fetch(`/api/git/log?limit=${limit}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setState((prev) => ({ ...prev, commits: data.commits || [] }));
    return data;
  }, []);

  const commit = useCallback(async (message: string) => {
    setState((prev) => ({ ...prev, committing: true, error: null }));
    try {
      const res = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setState((prev) => ({ ...prev, committing: false }));
      await refresh();
      return result;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, committing: false }));
      throw err;
    }
  }, []);

  const push = useCallback(async () => {
    setState((prev) => ({ ...prev, pushing: true, error: null }));
    try {
      const res = await fetch("/api/git/push", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setState((prev) => ({ ...prev, pushing: false }));
      await refresh();
      return result;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, pushing: false }));
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await Promise.all([fetchStatus(), fetchDiff(false), fetchLog(10)]);
    } catch {
      // Errors are handled per-fetch and stored in state
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [fetchStatus, fetchDiff, fetchLog]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    fetchStatus,
    fetchDiff,
    fetchLog,
    commit,
    push,
    refresh,
  };
};
