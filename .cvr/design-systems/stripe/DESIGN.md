# Stripe
> Category: Fintech

Stripe's iconic developer-first design language.

## 1. Visual Theme & Atmosphere
- Technical precision meets approachable warmth
- Gradient-rich, dark-capable
- Confident and premium
- Developer-oriented with polish

## 2. Color Palette & Roles
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#FFFFFF` | Main background |
| Surface | `#F6F9FC` | Cards, sections |
| Text Primary | `#0A2540` | Headings |
| Text Secondary | `#425466` | Body text |
| Brand Primary | `#635BFF` | CTAs, links |
| Brand Gradient | `#635BFF` → `#00D4FF` | Hero gradients |
| Border | `#E6E9ED` | Dividers |
| Success | `#00BA88` | Confirmation |
| Warning | `#FFA800` | Attention |
| Error | `#E63946` | Critical |

## 3. Typography Rules
- **Headings:** Soehne (or Inter fallback), 500-600 weight
- **Body:** Soehne Buch (or Inter), 400 weight, 1.65 line-height
- **Code:** IBM Plex Mono, 0.875em
- **Scale:** 13/15/17/19/22/26/32/40/52px

## 4. Component Stylings
- **Buttons:** 6px radius, subtle gradient, 1px inner highlight
- **Cards:** 16px radius, soft shadow, hover-scale 1.02
- **Inputs:** 6px radius, 1.5px focus ring in brand color
- **Badges:** 99px radius (pill), 6px 10px, uppercase 11px

## 5. Layout Principles
- **Spacing:** 6px base, multiples of 6
- **Max width:** 1080px content
- **Grid:** Flexible, 20px gap
- **Glass morphism:** Subtle frosted-glass panels

## 6. Depth & Elevation
- Flat default, shadows on hover
- Cards: `0 2px 5px rgba(99,91,255,0.1)`
- Hover: `0 2px 5px rgba(99,91,255,0.1)` → `0 10px 30px rgba(99,91,255,0.15)`

## 7. Do's and Don'ts
- ✅ Use Stripe blue-purple gradients for hero
- ✅ Dark backgrounds with light text for contrast
- ❌ Avoid pure black text
- ❌ No boxy, sharp-cornered containers

## 8. Responsive Behavior
- Fluid typography with clamp()
- Mobile: Stack vertically, 20px padding
- Desktop: Max-width 1080px centered

## 9. Agent Prompt Guide
- Primary: `#635BFF`, gradient to `#00D4FF`
- Background: `#0A2540` for hero, `#FFFFFF` for content
- Use CSS gradients extensively
- Font: 'Inter' or system sans-serif
