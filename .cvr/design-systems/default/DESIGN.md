# Neutral Modern
> Category: Starter

A clean, product-oriented default design system.

## 1. Visual Theme & Atmosphere
- Clean, modern, and approachable
- Professional but not corporate
- Light and airy with high readability
- Minimalist with purposeful accents

## 2. Color Palette & Roles
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#FAFAFA` | Page background |
| Surface | `#FFFFFF` | Cards, modals |
| Text Primary | `#111111` | Headings, body |
| Text Secondary | `#555555` | Subtitles, metadata |
| Brand Primary | `#3B82F6` | Buttons, links, accents |
| Brand Hover | `#2563EB` | Hover states |
| Border | `#E5E7EB` | Dividers, inputs |
| Success | `#10B981` | Positive status |
| Warning | `#F59E0B` | Alerts |
| Error | `#EF4444` | Errors |

## 3. Typography Rules
- **Headings:** Inter, 600-700 weight, -0.02em letter-spacing
- **Body:** Inter, 400 weight, 1.6 line-height
- **Code:** JetBrains Mono, 0.85em size
- **Scale:** 12/14/16/18/20/24/30/36/48px

## 4. Component Stylings
- **Buttons:** 8px border-radius, 12px 24px padding, 14px font
- **Cards:** 12px radius, 1px border, subtle shadow
- **Inputs:** 8px radius, 10px 14px padding, 1px border
- **Badges:** Full rounded, 8px 12px, 11px font

## 5. Layout Principles
- **Spacing:** 4px base unit (4/8/12/16/24/32/48/64)
- **Max width:** 1280px centered for content
- **Grid:** 12-column, 24px gap

## 6. Depth & Elevation
- Level 0: No shadow
- Level 1: 0 1px 3px rgba(0,0,0,0.08)
- Level 2: 0 4px 12px rgba(0,0,0,0.1)
- Level 3: 0 8px 24px rgba(0,0,0,0.12)

## 7. Do's and Don'ts
- ✅ Use consistent spacing scale
- ✅ Keep layouts centered and readable
- ❌ Don't use more than 2 accent colors per page
- ❌ Don't nest cards inside cards

## 8. Responsive Behavior
- Mobile: Single column, 16px padding
- Tablet: 2 columns, 24px padding
- Desktop: 12-column grid, 48px padding

## 9. Agent Prompt Guide
- Color ref: `--primary: #3B82F6; --bg: #FAFAFA; --text: #111111`
- Use Inter from Google Fonts
- Default button: `bg-[#3B82F6] text-white rounded-lg px-6 py-3`
