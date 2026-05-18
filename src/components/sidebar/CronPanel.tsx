import React, { useState } from "react";
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useCron } from "../../hooks/useCron";
import { cn } from "../../utils/cn";

interface CronPanelProps {
  t: any;
  className?: string;
}

export const CronPanel: React.FC<CronPanelProps> = ({ t, className }) => {
  const { tasks, addTask, removeTask, toggleTask } = useCron();
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", schedule: "", command: "" });

  const handleAdd = async () => {
    if (!newTask.name || !newTask.schedule || !newTask.command) return;
    await addTask({
      name: newTask.name,
      schedule: newTask.schedule,
      command: newTask.command,
      enabled: true,
    });
    setNewTask({ name: "", schedule: "", command: "" });
    setShowAdd(false);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.scheduledTasks || "Scheduled Tasks"}
        <Clock className="w-4 h-4" aria-hidden="true" />
      </div>

      <button
        onClick={() => setShowAdd(!showAdd)}
        className="flex items-center gap-1 px-2 py-1 bg-dash-accent/20 text-dash-accent text-[10px] font-bold uppercase tracking-wider rounded hover:bg-dash-accent/30 transition-colors w-fit"
      >
        <Plus className="w-3 h-3" />
        {t.addTask || "Add Task"}
      </button>

      {showAdd && (
        <div className="p-2 bg-neutral-900 border border-dash-border rounded space-y-2">
          <input
            type="text"
            placeholder={t.taskName || "Task name"}
            value={newTask.name}
            onChange={(e) => setNewTask((p) => ({ ...p, name: e.target.value }))}
            className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1 text-[11px] text-dash-text-primary placeholder:text-dash-text-muted focus:outline-none focus:border-dash-accent"
          />
          <input
            type="text"
            placeholder={t.schedule || "every 5 minutes"}
            value={newTask.schedule}
            onChange={(e) => setNewTask((p) => ({ ...p, schedule: e.target.value }))}
            className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1 text-[11px] text-dash-text-primary placeholder:text-dash-text-muted focus:outline-none focus:border-dash-accent"
          />
          <input
            type="text"
            placeholder={t.command || "agent:check-status"}
            value={newTask.command}
            onChange={(e) => setNewTask((p) => ({ ...p, command: e.target.value }))}
            className="w-full bg-neutral-800 border border-dash-border rounded px-2 py-1 text-[11px] text-dash-text-primary placeholder:text-dash-text-muted focus:outline-none focus:border-dash-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-1 bg-dash-accent/20 text-dash-accent text-[10px] font-bold uppercase rounded hover:bg-dash-accent/30 transition-colors"
            >
              {t.save || "Save"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-1 bg-neutral-800 text-dash-text-muted text-[10px] font-bold uppercase rounded hover:bg-neutral-700 transition-colors"
            >
              {t.cancel || "Cancel"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {t.noTasks || "No scheduled tasks"}
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "p-2 bg-neutral-900 border rounded flex items-center justify-between",
                task.enabled ? "border-dash-accent/20" : "border-dash-border opacity-60"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-dash-text-primary">{task.name}</div>
                <div className="text-[9px] text-dash-text-muted font-mono">{task.schedule}</div>
                <div className="text-[9px] text-dash-accent/70">{task.command}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleTask(task.id, !task.enabled)}
                  className="p-1 hover:bg-neutral-800 rounded transition-colors"
                  title={task.enabled ? t.disable || "Disable" : t.enable || "Enable"}
                >
                  {task.enabled ? (
                    <ToggleRight className="w-4 h-4 text-dash-success" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-dash-text-muted" />
                  )}
                </button>
                <button
                  onClick={() => removeTask(task.id)}
                  className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  title={t.delete || "Delete"}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
