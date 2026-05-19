# Kilo-Style UI Redesign

**Date:** 2026-05-19
**Status:** Approved
**Reference:** https://kilo.ai/docs/kiloclaw/overview, https://kilo.ai/code-reviewer

## Goal

Full visual redesign of the cvr.name.coder VS Code extension webview to match Kilo Code design language while preserving the project's own character (dark background, neon green, monospace identity).

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Full redesign — all panels, colors, components |
| Layout | Split 30/70: permanent Dashboard (left) + Chat (right) |
| Palette | Kilo blue accent `#3B82F6` + our dark bg `#0F0F11` + our green `#00FF94` |
| Dashboard | All 9 management panels merged into collapsible accordion sections |
| Cards | Every element in a bordered card (Kilo style) |
| Tool-call | New visual block in chat for each tool invocation |

## Layout Architecture

```
┌──────────────────────────────────────────────────────┐
│ TOP BAR: logo · status ● Online · model · agent · mode│
├────────────────────┬─────────────────────────────────┤
│   DASHBOARD (30%)  │        CHAT (70%)               │
│                    │                                 │
│  Collapsible       │  Messages (card per message)    │
│  sections:         │  - User messages (gray border)  │
│  - Status          │  - Agent messages (blue border) │
│  - Skills          │  - Tool-call blocks (accent bg) │
│  - Sessions        │  - Code blocks (syntax hl)      │
│  - Git             │                                 │
│  - Memory          │  Input area:                    │
│  - Cron            │  command palette (/)            │
│  - Plugins         │  image upload, voice, send      │
│  - Rules           │                                 │
│  - Sync            │                                 │
└────────────────────┴─────────────────────────────────┘
```

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0F0F11` | Main background |
| `--bg-surface` | `#1A1A1F` | Cards, panels |
| `--bg-elevated` | `#1F1F26` | Header, modals, hover |
| `--border-subtle` | `#2A2A33` | Card borders |
| `--border-hover` | `#3A3A44` | Card borders on hover |
| `--accent` | `#3B82F6` | Primary accent (blue) |
| `--accent-soft` | `#1E3A5F` | Accent background (tool calls) |
| `--accent-hover` | `#2563EB` | Button hover |
| `--success` | `#00FF94` | Success/online indicator |
| `--warning` | `#F59E0B` | Warnings |
| `--error` | `#EF4444` | Errors |
| `--text-primary` | `#E8E8F0` | Main text |
| `--text-secondary` | `#A0A0B0` | Secondary text |
| `--text-muted` | `#8888A0` | Labels, placeholders |

### Cards

All panels and messages use the card pattern:
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px;
}
.card:hover {
  border-color: var(--border-hover);
}
```

### Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Labels (uppercase) | JetBrains Mono | 10px | 500 |
| Body text | Inter | 13px | 400 |
| Code | JetBrains Mono | 12px | 400 |
| Headings | Inter | 14px | 600 |
| Status values | Inter | 18px | 700 |

### Components

**Buttons:**
- Primary: `bg-accent`, white text, rounded-6px
- Secondary: `bg-elevated`, border, muted text
- Toggle: pill switch (green when on, gray when off)

**Stat cards** (dashboard):
- Large value (18px bold) + tiny label (10px uppercase, tracking)
- Green for success metrics, blue for info metrics

**Tool-call blocks** (chat):
- `bg-accent-soft` background
- Left border in `--accent`
- Header: ⚙ icon + tool name
- Body: parameters in monospace

**Accordion sections** (dashboard):
- Collapsible with chevron icon
- Header: icon + title + count badge
- Content: cards inside

### Icons

lucide-react icons throughout. Color-matched to context.

## Component Catalog

### Top Bar
- Logo "cvr.name.coder" with colored dot
- Online/Offline indicator pill
- Agent selector dropdown
- Mode selector pills (Build/Plan/Review)
- Auto-mode badge
- Settings gear button → opens SettingsModal

### Dashboard (left 30%)
Collapsible accordion sections (default: Status + Skills expanded, rest collapsed):

1. **Status** — Server: Running/Stopped, Skills count, Tools count, Memory items, Uptime
2. **Skills** — List with toggle on/off per skill, search input, "Store" button
3. **Sessions** — Active sessions list, search, delete
4. **Git** — Current branch, uncommitted count, quick Commit/Push/Pull buttons
5. **Memory** — Memory items with inline edit
6. **Cron** — Scheduled tasks with enable/disable toggles
7. **Plugins** — Plugin list with enable/disable toggles
8. **Rules** — Rules with priority, expandable detail view
9. **Sync** — Sync status, Export/Import buttons

### Chat (right 70%)

**Message Cards:**
- User: gray left border, muted label `[INPUT]`
- Agent: blue left border, agent label `[BUILD]`, markdown body
- Tool-call: accent background, ⚙ header, monospace parameters

**Input Area:**
- Slash-command palette (overlay on `/` press)
- Textarea with monospace font, dark background
- Image upload button
- Voice input button (mic/mic-off)
- Send/Cancel button (changes during streaming)

**Code blocks:**
- react-syntax-highlighter with custom dark theme
- Copy button, language label
- Line numbers

### Modals

**Settings:**
- Provider selector grid (12 providers in 3x4 or 4x3 grid)
- Model config (dropdown + custom input)
- Agent selection
- Temperature slider, max tokens input
- Vision toggle + image size slider
- System prompt textarea
- Autonomous mode toggle
- Auto-commit toggle
- Voice input settings

**Permission Dialog:**
- Centered card
- Tool name + formatted parameters
- Deny / Allow buttons

## Migration Strategy

### Phase 1: Foundation (colors + cards)
- Update CSS custom properties in `index.css`
- Add card border class
- Update all backgrounds, text colors, borders

### Phase 2: Split Layout
- Restructure `App.tsx` from chat-centric to split layout
- Create `DashboardPanel` component with accordion
- Move 8 sidebar panels into accordion sections

### Phase 3: New Components
- Tool-call visualization in chat
- Status bar in top bar
- Stat cards
- Updated Settings modal styling

### Phase 4: Polish
- Animations (framer-motion transitions)
- Hover states
- Responsive adjustments

## Files Affected

| File | Change |
|------|--------|
| `src/index.css` | New color tokens, card styles, typography |
| `src/App.tsx` | Split layout restructure |
| `src/components/DashboardPanel.tsx` | NEW — accordion dashboard |
| `src/components/ChatContainer.tsx` | Tool-call blocks, new message card style |
| `src/components/MessageItem.tsx` | Card-border styling |
| `src/components/InputArea.tsx` | Kilo-style input |
| `src/components/SettingsModal.tsx` | Card style, provider grid |
| `src/components/TopBar.tsx` | Status indicator, new layout |
| All panel components | Card styling, accordion wrappers |

## Non-Goals

- Server-side changes (only webview UI)
- VS Code native theme integration (separate task)
- KiloClaw dashboard backend (just UI simulation)
- Code review panel (separate feature)
