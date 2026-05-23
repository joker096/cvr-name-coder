# Linear
> Category: Productivity

Linear's dark, focused, keyboard-first design system.

## 1. Visual Theme & Atmosphere
- Dark, focused, zero-distraction
- Keyboard-driven, command-palette centric
- Precision typography, tight information density
- Subtle gradients, glowing accents

## 2. Color Palette & Roles
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#1A1A1A` | Main bg |
| Surface | `#242424` | Panels, cards |
| Elevated | `#2E2E2E` | Hover, popovers |
| Text Primary | `#EDEDED` | Content |
| Text Secondary | `#838383` | Metadata |
| Brand Blue | `#5E6AD2` | Primary accent |
| Brand Purple | `#9B51E0` | Secondary |
| Success | `#4CB782` | Done |
| Warning | `#F2C94C` | In progress |
| Error | `#F04747` | Critical |
| Border | `#333333` | Lines |

## 3. Typography Rules
- **Primary:** Inter (or SF Pro on macOS)
- **Headings:** 500-600 weight, -0.02em
- **Body:** 400 weight, 1.5 line-height, 13-14px
- **UI labels:** 11-12px, 500 weight, uppercase tracking
- **Code:** JetBrains Mono, 12px

## 4. Component Stylings
- **Buttons:** 6px radius, subtle gradient, dark bg
- **Cards:** 8px radius, dark surface, 1px border
- **Inputs:** 6px radius, dark bg, glowing focus ring
- **Command palette:** Overlay with backdrop blur

## 5. Layout Principles
- **Spacing:** Tight (4/6/8/10/12/16/20/24)
- **Density:** Information-dense, minimal whitespace
- **Sidebar:** Fixed narrow left rail
- **Keyboard:** Everything accessible via cmd+k

## 6. Depth & Elevation
- Subtle layered dark surfaces
- Tooltip: small shadow + 1px border
- Modal: backdrop blur + larger shadow
- Popover: `0 0 0 1px #333, 0 4px 12px rgba(0,0,0,0.4)`

## 7. Do's and Don'ts
- ✅ Dark theme is the only theme
- ✅ Subtle glowing effects for interactive elements
- ❌ No white/light backgrounds
- ❌ Avoid large padding (keep it tight)

## 8. Responsive Behavior
- Desktop-first, single-column on mobile
- Collapsible sidebar on small screens
- Keyboard shortcuts always work

## 9. Agent Prompt Guide
- Colors: `bg-[#1A1A1A]`, surface `#242424`, accent `#5E6AD2`
- Typography: Inter, 13px body, tight spacing
- Cards: `bg-[#242424] border border-[#333] rounded-lg`
- Buttons: `bg-[#5E6AD2] hover:bg-[#4E5AC2] text-white rounded-md`
