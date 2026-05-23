---
id: design-saas-landing
name: SaaS Landing Page
description: Create a complete SaaS landing page with hero, features, pricing, and CTA sections using the active design system.
triggers: ["saas", "landing", "pricing", "hero section", "features section"]
od:
  mode: prototype
  platform: desktop
  scenario: marketing
  design_system:
    requires: true
  preview:
    type: html
    entry: index.html
---

# SaaS Landing Page Skill

Build a conversion-focused SaaS landing page with standard sections.

## Sections to Include
1. **Navbar** - Logo, navigation links, CTA button
2. **Hero** - Headline, subheadline, primary CTA, hero visual
3. **Social Proof** - Logo cloud or testimonials
4. **Features Grid** - 3-6 feature cards with icons
5. **How It Works** - 3-4 step flow
6. **Pricing** - 3-tier pricing table
7. **Testimonials** - 2-3 customer quotes
8. **FAQ** - Accordion FAQ section
9. **Footer** - Links, copyright, social

## Design System Usage
- Use the active design system's colors for backgrounds, text, accents
- Apply the design system's typography scale
- Follow component patterns (buttons, cards, inputs) from DESIGN.md
- Use the spacing system consistently

## Output
- Single `index.html` with all sections
- Inline CSS using design system CSS custom properties
- Responsive design following the system's breakpoints
- Real product name/content (not lorem ipsum)
