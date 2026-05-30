import React, { useState } from "react";
import { BookOpen, User, Save, RefreshCw, Plus, Trash2, Edit2, X } from "lucide-react";
import { usePersistentMemory } from "../../hooks/usePersistentMemory";
import { cn } from "../../utils/cn";

interface MemoryPanelProps {
  t: any;
  className?: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ t, className }) => {
  const {
    memory, user, loading, saving, error,
    updateMemorySection, updateUserSection,
    deleteMemorySection, deleteUserSection,
    clearMemory, clearUser,
    refresh,
  } = usePersistentMemory();
  const [activeTab, setActiveTab] = useState<"memory" | "user">("memory");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionContent, setNewSectionContent] = useState("");

  const currentData = activeTab === "memory" ? memory : user;
  const updateSection = activeTab === "memory" ? updateMemorySection : updateUserSection;
  const deleteSection = activeTab === "memory" ? deleteMemorySection : deleteUserSection;

  const startEdit = (key: string, value: string) => {
    setEditingSection(key);
    setEditContent(value);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (editingSection === null) return;
    await updateSection(editingSection, editContent);
    setEditingSection(null);
    setEditContent("");
  };

  const startNewSection = () => {
    setShowNewSection(true);
    setNewSectionName("");
    setNewSectionContent("");
  };

  const saveNewSection = async () => {
    if (!newSectionName.trim()) return;
    await updateSection(newSectionName.trim(), newSectionContent);
    setShowNewSection(false);
    setNewSectionName("");
    setNewSectionContent("");
  };

  const handleDelete = async (sectionName: string) => {
    if (!confirm(t.deleteSectionConfirm?.replace("{name}", sectionName) || `Delete section "${sectionName}"?`)) return;
    await deleteSection(sectionName);
  };

  const handleClearProject = async (archive: boolean) => {
    const message = archive
      ? t.archiveClearMemoryConfirm || "Archive and clear all project memory?"
      : t.clearMemoryConfirm || "Clear all project memory without archiving?";
    if (!confirm(message)) return;
    await clearMemory(archive);
    setShowClearMenu(false);
  };

  const handleClearUser = async () => {
    if (!confirm(t.clearUserConfirm || "Clear all user preferences?")) return;
    await clearUser(true);
    setShowClearMenu(false);
  };

  const sections = currentData?.sections ? Object.entries(currentData.sections) : [];

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
          <button
            onClick={startNewSection}
            className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
            title={t.addSection || "Add Section"}
          >
            <Plus className="w-3 h-3" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowClearMenu((value) => !value)}
              disabled={saving}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted hover:text-red-400 disabled:opacity-50"
              title={t.clearMemory || "Clear Memory"}
            >
              <Trash2 className="w-3 h-3" />
            </button>
            {showClearMenu && (
              <div className="absolute right-0 top-6 z-20 w-44 overflow-hidden rounded border border-dash-border bg-neutral-950 shadow-xl">
                <button
                  onClick={() => handleClearProject(true)}
                  className="block w-full px-2 py-1.5 text-left text-[10px] text-dash-text-primary hover:bg-neutral-800"
                >
                  {t.archiveClearProjectMemory || "Archive & clear project"}
                </button>
                <button
                  onClick={() => handleClearProject(false)}
                  className="block w-full px-2 py-1.5 text-left text-[10px] text-red-300 hover:bg-neutral-800"
                >
                  {t.clearProjectMemory || "Clear project only"}
                </button>
                <button
                  onClick={handleClearUser}
                  className="block w-full px-2 py-1.5 text-left text-[10px] text-red-300 hover:bg-neutral-800"
                >
                  {t.clearUserPreferences || "Archive & clear user"}
                </button>
              </div>
            )}
          </div>
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

      {error && (
        <div className="p-2 text-[10px] text-red-400 bg-red-400/10 border border-red-400/30 rounded text-center">
          {t.loadError || "Failed to load:"} {error}
        </div>
      )}

      <div className="space-y-2">
        {showNewSection && (
          <div className="border border-dash-accent rounded bg-neutral-900/60 p-2">
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder={t.sectionName || "Section name..."}
              className="w-full bg-neutral-900 border border-dash-border rounded p-1.5 text-[10px] font-bold text-dash-text-primary mb-1.5 focus:outline-none focus:border-dash-accent uppercase tracking-wider"
            />
            <textarea
              value={newSectionContent}
              onChange={(e) => setNewSectionContent(e.target.value)}
              className="w-full h-20 bg-neutral-900 border border-dash-border rounded p-1.5 text-[10px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
              placeholder={t.newSectionContent || "Section content..."}
            />
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={saveNewSection}
                disabled={saving || !newSectionName.trim()}
                className="flex-1 py-1 bg-dash-accent/20 text-dash-accent text-[10px] font-bold uppercase rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
              >
                {saving ? t.saving || "..." : t.save || "Save"}
              </button>
              <button
                onClick={() => setShowNewSection(false)}
                className="flex-1 py-1 bg-neutral-800 text-dash-text-muted text-[10px] font-bold uppercase rounded hover:bg-neutral-700 transition-colors"
              >
                {t.cancel || "Cancel"}
              </button>
            </div>
          </div>
        )}

        {sections.length > 0 ? (
          sections.map(([key, value]) => (
            <div key={key} className="border border-dash-border rounded bg-neutral-900/50">
              <div className="px-2 py-1 bg-neutral-900/80 border-b border-dash-border flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dash-accent truncate flex-1">
                  {key}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => startEdit(key, value)}
                    className="p-0.5 hover:bg-neutral-800 rounded text-dash-text-muted hover:text-white"
                    title={t.edit || "Edit"}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(key)}
                    className="p-0.5 hover:bg-neutral-800 rounded text-dash-text-muted hover:text-red-400"
                    title={t.delete || "Delete"}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {editingSection === key ? (
                <div className="p-2 flex flex-col gap-1.5">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-24 bg-neutral-900 border border-dash-border rounded p-1.5 text-[10px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 py-1 bg-dash-accent/20 text-dash-accent text-[10px] font-bold uppercase rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-2.5 h-2.5 inline-block mr-1" />
                      {t.save || "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-1 bg-neutral-800 text-dash-text-muted text-[10px] font-bold uppercase rounded hover:bg-neutral-700 transition-colors"
                    >
                      <X className="w-2.5 h-2.5 inline-block mr-1" />
                      {t.cancel || "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => startEdit(key, value)}
                  className="p-2 text-[10px] text-dash-text-primary whitespace-pre-wrap font-mono leading-relaxed cursor-text hover:bg-neutral-900/30 min-h-[1.5em]"
                >
                  {value || (
                    <span className="text-dash-text-muted italic">
                      {t.clickToEdit || "Click to edit..."}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-3 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {activeTab === "memory"
              ? t.noMemory || "No persistent memory yet. Click + to add a section."
              : t.noUserPrefs || "No user preferences yet. Click + to add a section."}
          </div>
        )}
      </div>
    </div>
  );
};
