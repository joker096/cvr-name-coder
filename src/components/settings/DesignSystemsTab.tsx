import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../../utils/cn";

interface DesignSystemInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface DesignPreviewData {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: string[];
  fontFamily: string;
  visualTheme: string;
  dos: string[];
  donts: string[];
}

const DESIGN_SYSTEMS: DesignSystemInfo[] = [
  { id: "default", name: "Neutral Modern", category: "Starter", description: "Clean, product-oriented default" },
  { id: "stripe", name: "Stripe", category: "Fintech", description: "Developer-first, gradient-rich" },
  { id: "vercel", name: "Vercel", category: "Developer Tools", description: "Dark-first, geometric, futuristic" },
  { id: "apple", name: "Apple", category: "Consumer", description: "Clean, human-centered, premium" },
  { id: "linear", name: "Linear", category: "Productivity", description: "Dark, focused, keyboard-first" },
];

const CARD_GRADIENTS: Record<string, string> = {
  stripe: "linear-gradient(135deg, #635BFF, #00D4FF)",
  vercel: "#000000",
  apple: "linear-gradient(135deg, #0071E3, #F5F5F7)",
  linear: "linear-gradient(135deg, #5E6AD2, #9B51E0)",
  default: "linear-gradient(135deg, #3B82F6, #10B981)",
};

const DesignPreviewTooltip: React.FC<{
  data: DesignPreviewData;
  style: React.CSSProperties;
}> = ({ data, style }) => (
  <div
    className="absolute z-50 w-64 bg-dash-elevated border border-dash-border rounded-xl shadow-2xl p-4 pointer-events-none"
    style={style}
  >
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold text-dash-text-primary">{data.name}</span>
      <span className="text-[10px] text-dash-text-muted px-1.5 py-0.5 rounded bg-dash-accent/5">
        {data.category}
      </span>
    </div>

    {data.colors.length > 0 && (
      <div className="mb-3">
        <span className="text-[10px] font-semibold text-dash-text-muted uppercase tracking-wider">
          Palette
        </span>
        <div className="flex flex-wrap gap-1 mt-1">
          {data.colors.slice(0, 10).map((c) => (
            <div key={c} className="flex items-center gap-1 group/swatch">
              <div
                className="w-4 h-4 rounded-sm border border-white/10"
                style={{ backgroundColor: c }}
              />
              <span className="text-[9px] text-dash-text-muted font-mono">{c}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {data.fontFamily && (
      <div className="mb-3">
        <span className="text-[10px] font-semibold text-dash-text-muted uppercase tracking-wider">
          Font
        </span>
        <p className="text-[11px] text-dash-text-secondary mt-0.5">{data.fontFamily}</p>
      </div>
    )}

    {data.visualTheme && (
      <div className="mb-3">
        <span className="text-[10px] font-semibold text-dash-text-muted uppercase tracking-wider">
          Theme
        </span>
        <p className="text-[11px] text-dash-text-secondary mt-0.5 leading-relaxed line-clamp-3">
          {data.visualTheme}
        </p>
      </div>
    )}

    {(data.dos.length > 0 || data.donts.length > 0) && (
      <div>
        <span className="text-[10px] font-semibold text-dash-text-muted uppercase tracking-wider">
          Rules
        </span>
        <ul className="mt-1 space-y-0.5">
          {data.dos.slice(0, 2).map((d, i) => (
            <li key={`do-${i}`} className="text-[10px] text-green-400 flex gap-1">
              <span className="flex-shrink-0">✅</span>
              <span className="truncate">{d}</span>
            </li>
          ))}
          {data.donts.slice(0, 2).map((d, i) => (
            <li key={`dont-${i}`} className="text-[10px] text-red-400 flex gap-1">
              <span className="flex-shrink-0">❌</span>
              <span className="truncate">{d}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export const DesignSystemsTab: React.FC = () => {
  const [activeSystem, setActiveSystem] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<DesignPreviewData | null>(null);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hoverTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolCall: { name: "design_list", params: {} }, mode: "build" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.output) {
          try {
            const parsed = JSON.parse(data.output);
            if (parsed.systems?.length > 0) {
              setActiveSystem(parsed.systems[0]?.id || "");
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => {});

    fetch("/api/design-active")
      .then((r) => r.json())
      .then((data) => {
        if (data?.active) setActiveSystem(data.active);
      })
      .catch(() => {});
  }, []);

  const applyDesign = async (id: string) => {
    setApplying(true);
    setStatus("");
    try {
      const r = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolCall: { name: "design_apply", params: { id } }, mode: "build" }),
      });
      const data = await r.json();
      if (data?.success) {
        setActiveSystem(id);
        setStatus(`Active: ${DESIGN_SYSTEMS.find((d) => d.id === id)?.name || id}`);
      } else {
        setStatus(data?.error || "Failed to apply");
      }
    } catch {
      setStatus("Error applying design system");
    }
    setApplying(false);
  };

  const handleMouseEnter = useCallback((id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    clearTimeout(hoverTimers.current[id]);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setPreviewPos({
      top: rect.top - (containerRect?.top || 0),
      left: rect.width + 12,
    });

    hoverTimers.current[id] = setTimeout(() => {
      setHoveredId(id);
      fetch(`/api/design-preview/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.id) setPreviewData(data);
        })
        .catch(() => {});
    }, 300);
  }, []);

  const handleMouseLeave = useCallback((id: string) => {
    clearTimeout(hoverTimers.current[id]);
    hoverTimers.current[id] = setTimeout(() => {
      if (hoveredId === id) {
        setHoveredId(null);
        setPreviewData(null);
      }
    }, 150);
  }, [hoveredId]);

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="relative">
        <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest mb-2">
          Design Systems
        </h3>
        <p className="text-xs text-dash-text-muted mb-3 leading-relaxed">
          Select a design system. Hover to preview colors, fonts, and rules. The AI will use these for all generated code.
        </p>

        {status && (
          <div className={cn(
            "mb-3 p-2 rounded-md text-xs",
            status.startsWith("Active") ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {DESIGN_SYSTEMS.map((ds) => (
            <button
              key={ds.id}
              onClick={() => applyDesign(ds.id)}
              onMouseEnter={(e) => handleMouseEnter(ds.id, e)}
              onMouseLeave={() => handleMouseLeave(ds.id)}
              disabled={applying}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                "hover:border-dash-accent/40",
                activeSystem === ds.id
                  ? "border-dash-accent bg-dash-accent/10"
                  : "border-dash-border bg-dash-bg"
              )}
            >
              <div
                className="w-10 h-10 rounded-md flex-shrink-0"
                style={{
                  background: CARD_GRADIENTS[ds.id] || "linear-gradient(135deg, #3B82F6, #10B981)",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-dash-text-primary">{ds.name}</span>
                  <span className="text-[10px] text-dash-text-muted px-1.5 py-0.5 rounded bg-dash-accent/5">{ds.category}</span>
                </div>
                <p className="text-[10px] text-dash-text-muted mt-0.5 truncate">{ds.description}</p>
              </div>
              {activeSystem === ds.id && (
                <span className="text-[10px] text-dash-accent font-bold px-2 py-0.5 rounded bg-dash-accent/10 border border-dash-accent/20">
                  ACTIVE
                </span>
              )}
            </button>
          ))}
        </div>

        {hoveredId && previewData && (
          <DesignPreviewTooltip
            data={previewData}
            style={{ top: previewPos.top, left: previewPos.left }}
          />
        )}
      </div>

      <div className="p-3 bg-dash-accent/5 border border-dash-accent/20 rounded-md">
        <h4 className="text-xs font-medium text-dash-text-primary mb-2">Add Custom Design Systems</h4>
        <p className="text-[11px] text-dash-text-muted leading-relaxed mb-2">
          Create <code className="text-[10px] bg-dash-bg px-1 rounded">.cvr/design-systems/&lt;id&gt;/DESIGN.md</code> with a 9-section format:
        </p>
        <ol className="text-[10px] text-dash-text-muted space-y-0.5 list-decimal list-inside">
          <li>Visual Theme &amp; Atmosphere</li>
          <li>Color Palette &amp; Roles</li>
          <li>Typography Rules</li>
          <li>Component Stylings</li>
          <li>Layout Principles</li>
          <li>Depth &amp; Elevation</li>
          <li>Do's and Don'ts</li>
          <li>Responsive Behavior</li>
          <li>Agent Prompt Guide</li>
        </ol>
      </div>

      <div className="p-3 border border-dash-border rounded-md">
        <h4 className="text-xs font-medium text-dash-text-primary mb-1.5">How Design Systems Work</h4>
        <p className="text-[11px] text-dash-text-muted leading-relaxed">
          When a design system is active, it's injected into the AI's system prompt. All generated HTML/CSS will automatically follow the design system's rules. Use <code className="text-[10px] bg-dash-bg px-1 rounded">design_list</code>, <code className="text-[10px] bg-dash-bg px-1 rounded">design_apply</code>, and <code className="text-[10px] bg-dash-bg px-1 rounded">design_preview</code> tools during chat.
        </p>
      </div>
    </div>
  );
};
