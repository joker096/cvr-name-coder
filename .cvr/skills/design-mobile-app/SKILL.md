---
id: design-mobile-app
name: Mobile App Prototype
description: Create pixel-accurate mobile app screen prototypes in an iPhone 15 Pro frame.
triggers: ["mobile app", "phone screen", "app prototype", "iOS", "mobile UI"]
od:
  mode: prototype
  platform: mobile
  scenario: design
  design_system:
    requires: true
  preview:
    type: html
    entry: index.html
---

# Mobile App Prototype Skill

Generate mobile app screen prototypes in device frames.

## Screen Types
- **Splash Screen** - Logo, tagline, loading
- **Onboarding** - Multi-step intro flow
- **Home Screen** - Content feed, navigation
- **Detail Screen** - Item details, actions
- **Settings** - Preferences, toggles
- **Profile** - User info, stats

## iPhone 15 Pro Frame
- Width: 393px (CSS)
- Dynamic Island at top
- Status bar: time (left), icons (right)
- Home indicator at bottom
- Device frame: rounded corners, bezels

## Design System Usage
- Apply the active design system's colors
- Use typography scale for mobile-appropriate sizes
- Follow component patterns (smaller touch targets: 44px min)
- Adapt spacing for mobile (tighter)

## Output
- Single HTML with embedded CSS
- One or multiple screens presented in device frame
- Dark status bar area
- Smooth transitions between screens if multiple
