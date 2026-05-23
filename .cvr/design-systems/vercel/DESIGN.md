# Vercel
> Category: Developer Tools

Vercel's minimalist, performance-focused design system.

## 1. Visual Theme & Atmosphere
- Dark-first, technical aesthetic
- Ultra-minimalist, geometric
- High contrast with subtle depth
- Futuristic but functional

## 2. Color Palette & Roles
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#000000` | Main dark bg |
| Surface | `#111111` | Cards, elevated |
| Text Primary | `#EEEEEE` | Headings |
| Text Secondary | `#888888` | Body |
| Brand Primary | `#FFFFFF` | Accents (white on dark) |
| Accent | `#0070F3` | Links, active states |
| Border | `#333333` | Subtle dividers |
| Success | `#00C853` | Deployed |
| Warning | `#FFB300` | Building |
| Error | `#FF1744` | Failed |

## 3. Typography Rules
- **Primary:** Geist (Vercel's own), or Inter fallback
- **Headings:** 500-600 weight, tight tracking (-0.03em)
- **Body:** 400 weight, 1.6 line-height
- **Code:** Geist Mono, 0.85em
- **Scale:** 12/14/16/18/20/24/32/40/56px

## 4. Component Stylings
- **Buttons:** 8px radius, minimal borders, dark bg
- **Cards:** 12px radius, 1px subtle border, dark surface
- **Inputs:** 6px radius, dark bg, white border on focus
- **Tabs:** Minimal underline indicator

## 5. Layout Principles
- **Spacing:** 8px base grid
- **Max width:** 1200px
- **Asymmetric:** Content-aligned left, whitespace right
- **Geometric:** Precise alignment, no overflow

## 6. Depth & Elevation
- Minimal shadows, more border-based separation
- Cards: subtle 1px border, no shadow
- Elevated: 1px lighter border + subtle glow

## 7. Do's and Don'ts
- ✅ Dark backgrounds are the default
- ✅ Use exact geometric spacing
- ❌ Avoid colored backgrounds on cards
- ❌ No heavy shadows or skeuomorphism

## 8. Responsive Behavior
- Fluid with strict breakpoints
- Mobile-first, progressive enhancement
- 16px side padding on mobile

## 9. Agent Prompt Guide
- Theme: dark, `background: #000000`, `surface: #111111`
- Accent: `#0070F3` for CTAs
- Font: 'Geist' or 'Inter'
- Cards: `bg-[#111] border border-[#333] rounded-xl`
