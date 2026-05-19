# Kilo-Style UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full visual redesign of cvr.name.coder webview to Kilo Code style — new color system, split layout (Dashboard 30% + Chat 70%), card-based UI, tool-call visualization, accordion dashboard.

**Architecture:** Replace chat-centric layout with permanent left Dashboard (collapsible accordion sections for Status/Skills/Sessions/Git/Memory/Cron/Plugins/Rules/Sync) and right Chat area. New design tokens with Kilo blue accent `#3B82F6`, dark bg `#0F0F11`, neon green `#00FF94`. Every element in bordered cards.

**Tech Stack:** React 18, Tailwind CSS 4, framer-motion, lucide-react, TypeScript

---

### Task 1: Update CSS Design Tokens

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace color tokens in @theme block**

Replace the entire `@theme { ... }` block in `src/index.css` lines 3-20 with:

```css
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  --color-dash-bg: #0f0f11;
  --color-dash-surface: #1a1a1f;
  --color-dash-elevated: #1f1f26;
  --color-dash-border: #2a2a33;
  --color-dash-border-hover: #3a3a44;
  --color-dash-accent: #3b82f6;
  --color-dash-accent-soft: #1e3a5f;
  --color-dash-accent-hover: #2563eb;
  --color-dash-success: #00ff94;
  --color-dash-warning: #f59e0b;
  --color-dash-error: #ef4444;
  --color-dash-text-primary: #e8e8f0;
  --color-dash-text-secondary: #a0a0b0;
  --color-dash-text-muted: #8888a0;
  --color-dash-text-label: #666680;
}
```

- [ ] **Step 2: Update selection and focus colors**

Replace `::selection` rule (lines 76-80) with:

```css
::selection {
  background: rgba(59, 130, 246, 0.25);
  color: #e8e8f0;
}
```

Replace focus outline colors (lines 83-99) — change all `#5b6b8a` to `#3b82f6`:

```css
*:focus-visible {
  outline-color: #3b82f6;
  outline-width: 2px;
  outline-offset: 2px;
}
```

Replace the dark select styling (lines 71-74) with:

```css
select option {
  background: #1a1a1f;
  color: #e8e8f0;
}
```

- [ ] **Step 3: Add card utility class**

Add after the `.no-scrollbar` styles (after line 61):

```css
.card {
  @apply bg-dash-surface border border-dash-border rounded-lg;
}

.card-interactive {
  @apply card hover:border-dash-border-hover transition-colors;
}
```

- [ ] **Step 4: Verify CSS compiles**

Run: `npx tailwindcss -i src/index.css -o /dev/null --dry-run 2>&1 || echo "check manually"`

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: update design tokens to Kilo-style palette"
```

---

### Task 2: Add Tool-Call Type to Messages

**Files:**
- Modify: `src/types/chat.ts`

- [ ] **Step 1: Add ToolCall interface and update Message type**

Find the file `src/types/chat.ts`. Add a `ToolCall` interface and extend the `Message` type. If the file exports `Message`, add:

```typescript
export interface ToolCall {
  id: string;
  toolName: string;
  params: Record<string, any>;
  status: "running" | "complete" | "error";
  result?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "review" | "tool_call";
  content: string;
  timestamp: number;
  reviewData?: {
    summary: string;
    comments: any[];
  };
  toolCall?: ToolCall;
}
```

(Note: only add `"tool_call"` to the `role` union and the optional `toolCall` field if they don't already exist. Read the file first to see the current type.)

- [ ] **Step 2: Commit**

```bash
git add src/types/chat.ts
git commit -m "feat: add ToolCall type and tool_call role to Message"
```

---

### Task 3: Create DashboardPanel with Accordion Sections

**Files:**
- Create: `src/components/dashboard/DashboardPanel.tsx`
- Create: `src/components/dashboard/DashboardSection.tsx`
- Create: `src/components/dashboard/StatusSection.tsx`
- Create: `src/components/dashboard/StatCard.tsx`

- [ ] **Step 1: Create StatCard component**

Create `src/components/dashboard/StatCard.tsx`:

```tsx
import React from "react";
import { cn } from "../../utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, variant = "default", className }) => (
  <div className={cn("card p-3 flex flex-col gap-0.5", className)}>
    <span className="text-[10px] font-mono uppercase tracking-wider text-dash-text-label">
      {label}
    </span>
    <span className={cn(
      "text-lg font-bold font-mono",
      variant === "success" && "text-dash-success",
      variant === "warning" && "text-dash-warning",
      variant === "default" && "text-dash-text-primary",
    )}>
      {value}
    </span>
  </div>
);
```

- [ ] **Step 2: Create DashboardSection collapsible wrapper**

Create `src/components/dashboard/DashboardSection.tsx`:

```tsx
import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";

interface DashboardSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title, icon: Icon, count, defaultOpen = false, children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card-interactive overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-dash-text-muted" />
        ) : (
          <ChevronRight className="w-3 h-3 text-dash-text-muted" />
        )}
        <Icon className="w-3.5 h-3.5 text-dash-text-secondary" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-dash-text-secondary flex-1 text-left">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-dash-text-muted bg-dash-bg px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-dash-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

- [ ] **Step 3: Create StatusSection**

Create `src/components/dashboard/StatusSection.tsx`:

```tsx
import React from "react";
import { Activity, Brain, Wrench, HardDrive } from "lucide-react";
import { StatCard } from "./StatCard";

interface StatusSectionProps {
  serverRunning: boolean;
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  serverRunning, skillsCount, toolsCount, memoryCount,
}) => (
  <div className="p-3">
    <div className="flex items-center gap-2 mb-3">
      <Activity className="w-4 h-4 text-dash-accent" />
      <span className="text-[11px] font-mono uppercase tracking-wider text-dash-text-label">
        System Status
      </span>
      <span className={serverRunning
        ? "text-[9px] font-mono text-dash-success bg-dash-success/10 px-1.5 py-0.5 rounded uppercase"
        : "text-[9px] font-mono text-dash-error bg-dash-error/10 px-1.5 py-0.5 rounded uppercase"
      }>
        {serverRunning ? "Online" : "Offline"}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <StatCard icon={Brain} label="Skills" value={skillsCount} />
      <StatCard icon={Wrench} label="Tools" value={toolsCount} />
      <StatCard icon={HardDrive} label="Memory" value={`${memoryCount} items`} />
    </div>
  </div>
);
```

- [ ] **Step 4: Create DashboardPanel**

Create `src/components/dashboard/DashboardPanel.tsx`:

```tsx
import React from "react";
import { Activity, Rocket, MessageSquare, GitBranch, BookOpen, Clock, Puzzle, Scale, RefreshCw } from "lucide-react";
import { DashboardSection } from "./DashboardSection";
import { StatusSection } from "./StatusSection";
import type { Skill } from "../sidebar/SkillsPanel";

interface DashboardPanelProps {
  skills: Skill[];
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
  serverRunning: boolean;
  sessionsCount?: number;
  onTabSelect?: (tab: string) => void;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  skills, skillsCount, toolsCount, memoryCount,
  serverRunning, sessionsCount = 0,
}) => {
  return (
    <div className="w-72 bg-dash-bg border-r border-dash-border flex flex-col shrink-0 overflow-y-auto no-scrollbar">
      {/* Status section — always visible */}
      <StatusSection
        serverRunning={serverRunning}
        skillsCount={skillsCount}
        toolsCount={toolsCount}
        memoryCount={memoryCount}
      />

      {/* Accordion sections */}
      <div className="flex flex-col gap-0.5 px-2 pb-2">
        <DashboardSection title="Skills" icon={Rocket} count={skillsCount} defaultOpen>
          <div className="flex flex-col gap-1">
            {skills.slice(0, 10).map((skill) => (
              <div key={skill.id} className="flex items-center gap-2 text-[11px] text-dash-text-secondary py-1">
                <span className="w-1 h-1 rounded-full bg-dash-accent shrink-0" />
                <span className="truncate">{skill.name}</span>
              </div>
            ))}
            {skills.length > 10 && (
              <span className="text-[10px] text-dash-text-muted">+{skills.length - 10} more</span>
            )}
          </div>
        </DashboardSection>

        <DashboardSection title="Sessions" icon={MessageSquare} count={sessionsCount}>
          <p className="text-[11px] text-dash-text-muted py-1">Active sessions list</p>
        </DashboardSection>

        <DashboardSection title="Git" icon={GitBranch}>
          <p className="text-[11px] text-dash-text-muted py-1">Git status and quick actions</p>
        </DashboardSection>

        <DashboardSection title="Memory" icon={BookOpen} count={memoryCount}>
          <p className="text-[11px] text-dash-text-muted py-1">Memory items</p>
        </DashboardSection>

        <DashboardSection title="Cron" icon={Clock}>
          <p className="text-[11px] text-dash-text-muted py-1">Scheduled tasks</p>
        </DashboardSection>

        <DashboardSection title="Plugins" icon={Puzzle}>
          <p className="text-[11px] text-dash-text-muted py-1">Installed plugins</p>
        </DashboardSection>

        <DashboardSection title="Rules" icon={Scale}>
          <p className="text-[11px] text-dash-text-muted py-1">Project rules</p>
        </DashboardSection>

        <DashboardSection title="Sync" icon={RefreshCw}>
          <p className="text-[11px] text-dash-text-muted py-1">Sync status</p>
        </DashboardSection>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: add DashboardPanel with accordion sections"
```

---

### Task 4: Add Tool-Call Block to MessageItem

**Files:**
- Modify: `src/components/chat/MessageItem.tsx`

- [ ] **Step 1: Read current MessageItem to understand structure**

Read `src/components/chat/MessageItem.tsx` to see how it renders `role`-based content.

- [ ] **Step 2: Add tool_call rendering**

Find where message roles are rendered. Add a `case "tool_call"` or conditional block before the existing role checks. Add this JSX block:

```tsx
{message.role === "tool_call" && message.toolCall && (
  <div className="my-1 mx-3">
    <div className="card border-dash-accent/30 bg-dash-accent-soft/30">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-dash-accent/20">
        <svg className="w-3 h-3 text-dash-accent" /* Wrench icon SVG */ viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <span className="text-[10px] font-mono uppercase tracking-wider text-dash-accent">
          TOOL CALL
        </span>
        <span className="text-[10px] font-mono text-dash-text-secondary ml-2">
          {message.toolCall.toolName}
        </span>
        <span className={cn(
          "ml-auto text-[9px] font-mono uppercase px-1.5 py-0.5 rounded",
          message.toolCall.status === "complete" && "text-dash-success bg-dash-success/10",
          message.toolCall.status === "running" && "text-dash-accent bg-dash-accent/10 animate-pulse",
          message.toolCall.status === "error" && "text-dash-error bg-dash-error/10",
        )}>
          {message.toolCall.status}
        </span>
      </div>
      <div className="px-3 py-2">
        <pre className="text-[11px] font-mono text-dash-text-secondary whitespace-pre-wrap break-all">
          {JSON.stringify(message.toolCall.params, null, 2)}
        </pre>
        {message.toolCall.result && (
          <div className="mt-2 pt-2 border-t border-dash-accent/20">
            <span className="text-[9px] font-mono uppercase text-dash-text-label">Result</span>
            <pre className="text-[11px] font-mono text-dash-text-primary mt-1 whitespace-pre-wrap break-all">
              {message.toolCall.result}
            </pre>
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

Note: The actual implementation should integrate into the existing MessageItem component structure. Read the file first to find the exact insertion point.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/MessageItem.tsx
git commit -m "feat: add tool-call visualization block to MessageItem"
```

---

### Task 5: Restructure App.tsx to Split Layout

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add DashboardPanel import**

Add import at top of `src/App.tsx`:

```tsx
import { DashboardPanel } from "./components/dashboard/DashboardPanel";
```

- [ ] **Step 2: Update main layout section**

Replace the `<main>` section (lines 374-405) with the new split layout:

```tsx
{/* Main Content — split layout */}
<main className="flex-1 flex overflow-hidden relative">
  {/* Dashboard — permanent left panel */}
  <DashboardPanel
    skills={skills}
    skillsCount={skills.length}
    toolsCount={3}
    memoryCount={memories.length}
    serverRunning={true}
  />

  {/* Chat Area */}
  <div className="flex-1 flex flex-col min-w-0">
    <ChatContainer
      messages={messages}
      input={input}
      onInputChange={handleInputChange}
      onSendMessage={handleSendMessage}
      onCancelMessage={handleCancelMessage}
      isLooming={isLoading}
      agentLabel={AGENT_CONFIG[activeAgent]?.label}
      t={t}
      lang={lang}
      loadingText={t.processing}
      placeholder={t.promptPlaceholder}
      voiceEnabled={settings.voiceEnabled}
      voiceLanguage={settings.voiceLanguage}
      voiceAutoSend={settings.voiceAutoSend}
      visionEnabled={settings.chat.visionEnabled ?? true}
    />
  </div>
</main>
```

- [ ] **Step 3: Remove old Sidebar imports and state**

Remove the `Sidebar` import line (line 6) and the `showSidebar`/`sidebarTab` state lines (lines 31-32). Remove the hamburger menu button and X button from the header (lines 237-248). Remove the `<Sidebar>` JSX (lines 376-383).

- [ ] **Step 4: Update top bar style for Kilo look**

Update the header className (line 235):

```tsx
<header className="flex items-center justify-between px-3 py-1 bg-dash-elevated border-b border-dash-border shrink-0">
```

Update the logo section (lines 253-257):

```tsx
<span className="text-[12px] font-mono text-dash-text-primary font-bold tracking-wide">
  cvr.name<span className="text-dash-accent">.coder</span>
</span>
```

- [ ] **Step 5: Add online status pill in header**

After the logo span, add:

```tsx
<span className="flex items-center gap-1 text-[9px] font-mono text-dash-success bg-dash-success/10 px-1.5 py-0.5 rounded uppercase ml-2">
  <span className="w-1.5 h-1.5 rounded-full bg-dash-success animate-pulse" />
  Online
</span>
```

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: restructure to split layout with permanent Dashboard panel"
```

---

### Task 6: Card-Style Messages and Input

**Files:**
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/chat/InputArea.tsx`

- [ ] **Step 1: Update MessageList to use card classes**

Read `src/components/chat/MessageList.tsx`. Update the outer wrapper and empty state to use card styling. The message list container should use:

```tsx
className="flex-1 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar"
```

And the empty state:

```tsx
<div className="card p-8 text-center">
  <p className="text-dash-text-muted text-sm">Start a conversation</p>
</div>
```

- [ ] **Step 2: Update InputArea to use Kilo-style**

Read `src/components/chat/InputArea.tsx`. Update the input wrapper:

```tsx
<div className="card p-1.5 flex items-end gap-2">
  <textarea
    className="flex-1 bg-transparent text-[13px] font-mono text-dash-text-primary placeholder-dash-text-label resize-none outline-none min-h-[24px] max-h-[120px] py-1 px-2"
    rows={1}
    placeholder="Type a message or command..."
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={handleKeyDown}
    disabled={disabled}
  />
  {/* existing buttons */}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/MessageList.tsx src/components/chat/InputArea.tsx
git commit -m "feat: apply card styling to messages and input area"
```

---

### Task 7: Kilo-Style Settings Modal

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx`
- Modify: `src/components/settings/ProviderSelector.tsx`

- [ ] **Step 1: Update SettingsModal backdrop and container**

Read `src/components/settings/SettingsModal.tsx`. Update the modal overlay and container:

```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

{/* Modal */}
<div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-3xl md:w-full md:max-h-[85vh] z-50 card p-0 overflow-hidden">
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-dash-border bg-dash-elevated">
    <h2 className="text-sm font-semibold text-dash-text-primary">Settings</h2>
    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded text-dash-text-muted">
      <X className="w-4 h-4" />
    </button>
  </div>
  {/* Body */}
  <div className="overflow-y-auto p-4 max-h-[70vh]">
    {/* existing content */}
  </div>
</div>
```

- [ ] **Step 2: Update ProviderSelector to card grid**

Read `src/components/settings/ProviderSelector.tsx`. Update provider buttons to use card style:

```tsx
<button
  onClick={() => onSelect(provider.id)}
  className={cn(
    "card-interactive p-3 text-center transition-all",
    isSelected && "border-dash-accent bg-dash-accent-soft/20 ring-1 ring-dash-accent",
  )}
>
  <span className="text-dash-text-primary text-sm font-medium">{provider.name}</span>
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/
git commit -m "feat: Kilo-style settings modal with card-grid providers"
```

---

### Task 8: Update Remaining Panels to Card Style

**Files:**
- Modify: `src/components/sidebar/SkillsPanel.tsx`
- Modify: `src/components/sidebar/SessionsPanel.tsx`
- Modify: `src/components/sidebar/MemoryPanel.tsx`
- Modify: `src/components/sidebar/GitPanel.tsx`
- Modify: `src/components/chat/PermissionDialog.tsx`

- [ ] **Step 1: PermissionDialog card styling**

Read `src/components/chat/PermissionDialog.tsx`. Update dialog wrapper:

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="card p-6 max-w-md w-full">
    <h3 className="text-sm font-semibold text-dash-text-primary mb-2">Permission Required</h3>
    <div className="text-[11px] font-mono text-dash-text-secondary bg-dash-bg rounded p-3 mb-4">
      <div className="text-dash-accent mb-1">{pending?.tool}</div>
      <pre className="whitespace-pre-wrap">{pending?.paramsStr}</pre>
    </div>
    <div className="flex justify-end gap-2">
      <button onClick={onDeny} className="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-dash-text-muted card-interactive rounded-md">
        Deny
      </button>
      <button onClick={onApprove} className="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-white bg-dash-accent hover:bg-dash-accent-hover rounded-md transition-colors">
        Allow
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/PermissionDialog.tsx
git commit -m "feat: card-style PermissionDialog"
```

---

### Task 9: Build and Verify

**Files:**
- None (build verification)

- [ ] **Step 1: Build the VS Code extension**

```bash
cd vscode
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: No new errors introduced by our changes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete Kilo-style UI redesign"
```
