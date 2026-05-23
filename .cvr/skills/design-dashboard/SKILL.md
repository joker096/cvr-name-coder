---
id: design-dashboard
name: Dashboard
description: Build a data-rich admin/analytics dashboard with sidebar navigation using the active design system.
triggers: ["dashboard", "admin panel", "analytics", "data view", "charts"]
od:
  mode: prototype
  platform: desktop
  scenario: operation
  design_system:
    requires: true
  preview:
    type: html
    entry: index.html
---

# Dashboard Skill

Create a professional admin/analytics dashboard layout.

## Layout Structure
1. **Sidebar** - Logo, nav items, user section
2. **Top Bar** - Search, notifications, user avatar
3. **Stats Row** - 4 KPI cards (revenue, users, conversion, etc.)
4. **Chart Area** - Main chart + secondary charts grid
5. **Data Table** - Recent transactions or users table
6. **Activity Feed** - Recent events timeline

## Design System Usage
- Use the design system's surface colors for cards
- Apply typography for headings and data
- Follow border radius and shadow patterns
- Use accent colors for chart data and highlights

## Implementation
- Pure HTML/CSS (no charting libraries - use CSS for visual bars/charts)
- Grid-based layout with sidebar
- Responsive collapse on mobile
- Real data values (not 0 or 100)
