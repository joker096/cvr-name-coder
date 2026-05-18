import React, { useState } from "react";
import { BookOpen, User, Save, RefreshCw } from "lucide-react";
import { usePersistentMemory } from "../../hooks/usePersistentMemory";
import { cn } from "../../utils/cn";

interface MemoryPanelProps {
  t: any;
  className?: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ t, className }) => {
  const { memory, user, loading, saving, saveMemory, saveUser, refresh } = usePersistentMemory();
  const [activeTab, setActiveTab] = useState<"memory" | "user">("memory");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const currentData = activeTab === "memory" ? memory : user;

  const handleEdit = () => {
    setEditContent(currentData?.raw || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (activeTab === "memory") {
      await saveMemory(editContent);
    } else {
      await saveUser(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent("");
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center gap-2">
          {activeTab === "memory" ? (
            <>
              <BookOpen className="w-4 h-4" />
              {t.persistentMemory || "Persistent Memory"}
            </>
          ) : (
            <>
              <User className="w-4 h-4" />
              {t.userPreferences || "User Preferences"}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
            title={t.refresh || "Refresh"}
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
              title={t.edit || "Edit"}
            >
              <BookOpen className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-success"
              title={t.save || "Save"}
            >
              <Save className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-neutral-900/80 border border-dash-border rounded p-0.5">
        <button
          onClick={() => setActiveTab("memory")}
          className={cn(
            "flex-1 py-1 text-[10px] uppercase font-bold tracking-wider transition-all rounded",
            activeTab === "memory"
              ? "bg-dash-accent/10 text-dash-accent"
              : "text-dash-text-muted hover:text-white"
          )}
        >
          {t.memory || "Memory"}
        </button>
        <button
          onClick={() => setActiveTab("user")}
          className={cn(
            "flex-1 py-1 text-[10px] uppercase font-bold tracking-wider transition-all rounded",
            activeTab === "user"
              ? "bg-dash-accent/10 text-dash-accent"
              : "text-dash-text-muted hover:text-white"
          )}
        >
          {t.user || "User"}
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 bg-neutral-900 border border-dash-border rounded p-2 text-[11px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
              placeholder={t.memoryPlaceholder || "# Memory sections..."}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-1.5 bg-dash-accent/20 text-dash-accent text-[11px] font-bold uppercase tracking-wider rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
              >
                {saving ? t.saving || "Saving..." : t.save || "Save"}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-1.5 bg-neutral-800 text-dash-text-muted text-[11px] font-bold uppercase tracking-wider rounded hover:bg-neutral-700 transition-colors"
              >
                {t.cancel || "Cancel"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {currentData?.sections && Object.entries(currentData.sections).length > 0 ? (
              Object.entries(currentData.sections).map(([key, value]) => (
                <div key={key} className="border border-dash-border rounded bg-neutral-900/50">
                  <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border text-[10px] font-bold uppercase tracking-wider text-dash-accent">
                    {key}
                  </div>
                  <div className="p-2 text-[10px] text-dash-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                    {value}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
                {activeTab === "memory"
                  ? t.noMemory || "No persistent memory yet. The agent will write here as it learns."
                  : t.noUserPrefs || "No user preferences yet."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
