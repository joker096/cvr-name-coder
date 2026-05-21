import React, { useState, useEffect } from "react";
import { Scale, Eye, Edit2, Trash2, Plus, Save, X } from "lucide-react";
import { cn } from "../../utils/cn";

export interface Rule {
  name: string;
  priority: number;
  content?: string;
}

interface RulesPanelProps {
  t: any;
  className?: string;
}

export const RulesPanel: React.FC<RulesPanelProps> = ({ t, className }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      console.error("Failed to fetch rules:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleViewRule = async (name: string) => {
    try {
      const res = await fetch(`/api/rules/${name}`);
      const data = await res.json();
      if (data.name) setSelectedRule(data as Rule);
    } catch (e) {
      console.error("Failed to load rule:", e);
    }
  };

  const startEdit = (rule: Rule) => {
    setEditingRule(rule.name);
    setEditContent(rule.content || "");
    setEditPriority(rule.priority);
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingRule) return;
    setSaving(true);
    try {
      await fetch(`/api/rules/${editingRule}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, priority: editPriority }),
      });
      setEditingRule(null);
      await fetchRules();
    } catch (e) {
      console.error("Failed to save rule:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(t.deleteRuleConfirm?.replace("{name}", name) || `Delete rule "${name}"?`)) return;
    try {
      await fetch(`/api/rules/${name}`, { method: "DELETE" });
      setSelectedRule(null);
      await fetchRules();
    } catch (e) {
      console.error("Failed to delete rule:", e);
    }
  };

  const saveNew = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/rules/${newName.trim()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, priority: 0 }),
      });
      setShowNew(false);
      setNewName("");
      setNewContent("");
      await fetchRules();
    } catch (e) {
      console.error("Failed to create rule:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.rules || "Rules"}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNew(!showNew)}
            className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
            title={t.addRule || "Add Rule"}
          >
            <Plus className="w-3 h-3" />
          </button>
          <Scale className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>

      {showNew && (
        <div className="border border-dash-accent rounded bg-neutral-900/60 p-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.ruleName || "Rule name (e.g. typescript-style)"}
            className="w-full bg-neutral-900 border border-dash-border rounded p-1.5 text-[10px] font-bold text-dash-text-primary mb-1.5 focus:outline-none focus:border-dash-accent"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full h-20 bg-neutral-900 border border-dash-border rounded p-1.5 text-[10px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
            placeholder={t.ruleContent || "Rule content (markdown)..."}
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={saveNew}
              disabled={saving || !newName.trim()}
              className="flex-1 py-1 bg-dash-accent/20 text-dash-accent text-[10px] font-bold uppercase rounded hover:bg-dash-accent/30 transition-colors disabled:opacity-50"
            >
              {saving ? t.saving || "..." : t.save || "Save"}
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="flex-1 py-1 bg-neutral-800 text-dash-text-muted text-[10px] font-bold uppercase rounded hover:bg-neutral-700 transition-colors"
            >
              {t.cancel || "Cancel"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-[10px] text-dash-text-muted italic">{t.loading || "Loading..."}</div>
        ) : rules.length === 0 ? (
          <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {t.noRules || "No rules configured. Click + to add one."}
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.name}>
              <div className="p-2 bg-neutral-900 border border-dash-border rounded flex items-center justify-between group">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-dash-text-primary">{rule.name}</div>
                  <div className="text-[9px] text-dash-text-muted">
                    {t.priority || "Priority"}: {rule.priority}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleViewRule(rule.name)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-800 text-dash-accent rounded transition-all"
                    title={t.view || "View"}
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => startEdit(rule)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-800 text-dash-text-muted hover:text-white rounded transition-all"
                    title={t.edit || "Edit"}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.name)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-800 text-dash-text-muted hover:text-red-400 rounded transition-all"
                    title={t.delete || "Delete"}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {editingRule === rule.name && (
                <div className="mt-1 p-2 bg-neutral-900 border border-dash-accent rounded space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] text-dash-text-muted uppercase tracking-wider">
                      {t.priority || "Priority"}
                    </label>
                    <input
                      type="number"
                      value={editPriority}
                      onChange={(e) => setEditPriority(parseInt(e.target.value, 10) || 0)}
                      className="w-16 bg-neutral-800 border border-dash-border rounded px-1.5 py-0.5 text-[10px] text-dash-text-primary focus:outline-none focus:border-dash-accent"
                    />
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-32 bg-neutral-800 border border-dash-border rounded p-1.5 text-[10px] font-mono text-dash-text-primary resize-none focus:outline-none focus:border-dash-accent"
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
              )}
            </div>
          ))
        )}
      </div>

      {selectedRule && selectedRule.content && !editingRule && (
        <div className="p-2 bg-neutral-900 border border-dash-border rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-dash-accent">{selectedRule.name}</div>
            <button
              onClick={() => setSelectedRule(null)}
              className="text-[9px] text-dash-text-muted hover:text-dash-text-primary"
            >
              {t.close || "Close"}
            </button>
          </div>
          <pre className="text-[10px] font-mono text-dash-text-primary whitespace-pre-wrap max-h-48 overflow-y-auto">
            {selectedRule.content}
          </pre>
        </div>
      )}
    </div>
  );
};
