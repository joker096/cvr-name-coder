import React, { useState } from "react";
import { Search, Trash2, Clock } from "lucide-react";
import { useSessionSearch, useSessions } from "../../hooks/useSessionSearch";
import { cn } from "../../utils/cn";

interface SessionsPanelProps {
  t: any;
  className?: string;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({ t, className }) => {
  const { sessions, loading: sessionsLoading, fetchSessions, deleteSessionById } = useSessions();
  const { results, loading: searchLoading, search, clear } = useSessionSearch();
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query);
      setShowSearch(true);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    clear();
    setShowSearch(false);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.sessions || "Sessions"}
        <Clock className="w-4 h-4" aria-hidden="true" />
      </div>

      <form onSubmit={handleSearch} className="flex gap-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchSessions || "Search sessions..."}
          className="flex-1 bg-neutral-900 border border-dash-border rounded px-2 py-1 text-[11px] text-dash-text-primary placeholder:text-dash-text-muted focus:outline-none focus:border-dash-accent"
        />
        <button
          type="submit"
          disabled={searchLoading}
          className="p-1.5 bg-dash-accent/20 text-dash-accent rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
        >
          <Search className="w-3 h-3" />
        </button>
        {showSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="p-1.5 bg-neutral-800 text-dash-text-muted rounded hover:bg-neutral-700 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </form>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {showSearch ? (
          <>
            <div className="text-[10px] uppercase tracking-wider text-dash-text-muted font-bold">
              {t.searchResults || "Search Results"} ({results.length})
            </div>
            {searchLoading ? (
              <div className="text-[10px] text-dash-text-muted italic">{t.loading || "Loading..."}</div>
            ) : results.length === 0 ? (
              <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
                {t.noResults || "No results found"}
              </div>
            ) : (
              results.map((r) => (
                <div
                  key={`${r.sessionId}-${r.messageId}`}
                  className="p-2 bg-neutral-900 border border-dash-border rounded text-[10px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-dash-accent truncate">{r.sessionTitle}</span>
                    <span className="text-[9px] text-dash-text-muted shrink-0">{r.role}</span>
                  </div>
                  <div className="text-dash-text-primary line-clamp-3">{r.snippet}</div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-dash-text-muted font-bold">
                {t.allSessions || "All Sessions"} ({sessions.length})
              </div>
              <button
                onClick={fetchSessions}
                className="text-[9px] text-dash-accent hover:underline"
              >
                {t.refresh || "Refresh"}
              </button>
            </div>
            {sessionsLoading ? (
              <div className="text-[10px] text-dash-text-muted italic">{t.loading || "Loading..."}</div>
            ) : sessions.length === 0 ? (
              <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
                {t.noSessions || "No sessions yet"}
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-2 bg-neutral-900 border border-dash-border rounded flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-dash-text-primary truncate">{s.title}</div>
                    <div className="text-[9px] text-dash-text-muted">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSessionById(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                    title={t.delete || "Delete"}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
