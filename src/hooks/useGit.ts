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
    loading: false,
    committing: false,
    pushing: false,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/git/status");
      if (!res.ok) throw new Error(await res.text());
      const status = await res.json();
      setState((prev) => ({ ...prev, status, loading: false }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, loading: false }));
    }
  }, []);

  const fetchDiff = useCallback(async (stagedOnly = false) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/git/diff?staged=${stagedOnly}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setState((prev) => ({ ...prev, diffs: data.diffs || [], loading: false }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, loading: false }));
    }
  }, []);

  const fetchLog = useCallback(async (limit = 10) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/git/log?limit=${limit}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setState((prev) => ({ ...prev, commits: data.commits || [], loading: false }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, loading: false }));
    }
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
      await fetchStatus();
      return result;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, committing: false }));
      throw err;
    }
  }, [fetchStatus]);

  const push = useCallback(async () => {
    setState((prev) => ({ ...prev, pushing: true, error: null }));
    try {
      const res = await fetch("/api/git/push", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setState((prev) => ({ ...prev, pushing: false }));
      await fetchStatus();
      return result;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, pushing: false }));
      throw err;
    }
  }, [fetchStatus]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchDiff(false), fetchLog(10)]);
  }, [fetchStatus, fetchDiff, fetchLog]);

  useEffect(() => {
    fetchStatus();
    fetchDiff(false);
    fetchLog(10);
  }, [fetchStatus, fetchDiff, fetchLog]);

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
