---
id: design-web-prototype
name: Web Prototype
description: Generate single-page HTML prototypes for landing pages, marketing pages, and hero pages using design systems.
triggers: ["design", "prototype", "landing page", "web page", "hero page", "marketing page"]
od:
  mode: prototype
  platform: desktop
  scenario: design
  design_system:
    requires: true
  preview:
    type: html
    entry: index.html
---

# Web Prototype Skill

Generate a complete, production-quality single-page HTML prototype.

## When to Use
- Building landing pages
- Creating marketing pages
- Designing hero sections
- Prototyping web page layouts

## Workflow
1. Check which design system is active (use `design_apply` or read `.cvr/design-systems/`)
2. Read the active DESIGN.md for colors, typography, spacing, and components
3. Create `index.html` with inline CSS using the design system tokens
4. Use semantic HTML5 structure
5. Include responsive breakpoints from the design system
6. Add subtle animations/transitions where appropriate

## Output Constraints
- Single self-contained HTML file with inline CSS
- No external dependencies (inline Google Fonts CDN is OK)
- Must follow the active design system exactly
- Realistic content, no lorem ipsum
- Include proper meta tags and viewport settings

## Template Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <link href="https://fonts.googleapis.com/css2?family=[FONT]&display=swap" rel="stylesheet">
  <style>
    /* Design system tokens */
    :root {
      --bg: #...;
      --surface: #...;
      --text-primary: #...;
      --text-secondary: #...;
      --brand: #...;
      --border: #...;
      --radius: ...px;
      --font: '...', sans-serif;
    }
    /* ... styles following design system ... */
  </style>
</head>
<body>
  <!-- Content -->
</body>
</html>
```
