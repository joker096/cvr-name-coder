# Apple
> Category: Consumer

Apple's refined, accessible human interface design.

## 1. Visual Theme & Atmosphere
- Clean, minimal, human-centered
- Generous whitespace, confident typography
- Smooth motion, tactile interactions
- Premium restraint

## 2. Color Palette & Roles
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#FFFFFF` | Light mode bg |
| Background Dark | `#000000` | Dark mode bg |
| Surface | `#F5F5F7` | Cards, sections |
| Text Primary | `#1D1D1F` | Headings |
| Text Secondary | `#86868B` | Body |
| Brand Blue | `#0071E3` | Links, CTAs |
| Brand Red | `#E63946` | Alerts |
| Border | `#D2D2D7` | Dividers |
| Success | `#34C759` | Green |
| Warning | `#FF9500` | Orange |

## 3. Typography Rules
- **Primary:** SF Pro Display (system-ui fallback)
- **Headings:** 500-600 weight, -0.02em tracking
- **Body:** 400 weight, 1.47 line-height
- **Caption:** 12px, 400 weight, uppercase tracking 0.08em
- **Scale:** 11/12/13/15/17/20/22/28/34/41/48px

## 4. Component Stylings
- **Buttons:** Full rounded (999px), 12px 24px, SF Pro
- **Cards:** 18px large radius, soft shadow, frosted bg
- **Inputs:** 10px radius, light gray bg
- **Navigation:** Minimal, frosted glass backdrop

## 5. Layout Principles
- **Spacing:** Asymmetric, generous (20/24/32/48/64/96px)
- **Max width:** 980px for text, full-width for hero
- **Grid:** 12-column, margins vary by device
- **Glass effect:** backdrop-filter blur for overlays

## 6. Depth & Elevation
- Soft, realistic shadows
- Level 1: `0 2px 8px rgba(0,0,0,0.08)`
- Level 2: `0 8px 30px rgba(0,0,0,0.12)`
- Level 3: `0 20px 60px rgba(0,0,0,0.15)`

## 7. Do's and Don'ts
- ✅ Generous whitespace always
- ✅ Subtle animations (200-400ms ease)
- ❌ No harsh corners (min 10px radius)
- ❌ Don't use more than 3 type sizes per screen

## 8. Responsive Behavior
- Mobile: 16px margins, stacked
- Tablet: 24px margins
- Desktop: Variable margins, max-width content

## 9. Agent Prompt Guide
- Use `system-ui, -apple-system` font stack
- Large border-radius: `rounded-2xl` or `rounded-full`
- Spacing: `p-8 md:p-12 lg:p-20`
- Glass: `backdrop-blur-xl bg-white/80`
