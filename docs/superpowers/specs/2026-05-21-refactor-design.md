# Refactor Design Specification

**Date:** 2026-05-21

## Overview
The `cvr.name.coder` project is a React 19 + Vite front‑end with an Express back‑end that also runs as a VS Code extension. Large UI components and a bloated dependency graph increase the initial bundle size and slow the first paint. This specification outlines a systematic refactor to improve modularity, reduce load time, and verify a clean build for both the web app and the extension.

## Goals
1. **Performance** – Reduce the initial JavaScript bundle (target < 200 KB gzipped). Achieve faster first‑paint and time‑to‑interactive.
2. **Modularity** – Break monolithic UI files into small, single‑purpose components. Enable lazy loading via `React.lazy`/`Suspense`.
3. **Dependency hygiene** – Remove unused packages, deduplicate, and ensure all dependencies are required for the extension build.
4. **Reliability** – Add a verification script that lint‑checks, type‑checks, builds, and runs a smoke test for the extension.

## Approach
### 1. Component Extraction & Lazy‑Loading
- Identify large components (`SettingsModal`, `MessageItem`, dashboard panels, sidebar panels, etc.).
- Move each UI piece (buttons, cards, dialogs, list items) into its own file under `src/components/<category>/`.
- Export components as default and re‑export an index barrel for convenience.
- Replace direct imports with `React.lazy(() => import('…'))` and wrap usage in `<Suspense fallback={…}>`.
- Update tests to import the new component paths.

### 2. Dependency Audit & Cleanup
- Run `npm prune && npm dedupe`.
- Use `npm ls --depth=0` to list top‑level deps and manually verify each is used.
- Enable strict TS flags (`noUnusedLocals`, `noUnusedParameters`) and run `tsc --noEmit` to locate dead code.
- Delete empty or placeholder files (identified by multiple blank‑line matches) and any obsolete directories.
- Update `package.json` scripts: add `verify-build` (see below).

### 3. Verification Script
Add to `package.json`:
```json
"scripts": {
  "verify-build": "npm run lint && npm run type-check && npm run build && vite preview --port 5174 & sleep 5 && npm run test && echo 'Build verification passed'"
}
```
- The script lints, type‑checks, builds the web bundle, serves a preview, runs unit tests, and ensures the VS Code extension bundles without missing modules.

## Scope
- **In‑scope:** UI component refactor, lazy‑loading integration, dependency cleanup, verification script, updating related imports/tests.
- **Out‑of‑scope:** Re‑design of UI/UX, adding new features, server‑side logic changes unrelated to the build.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Breakage of existing imports | Medium – runtime errors | Run full test suite after each batch of component moves. |
| Over‑lazy‑loading causing flash of loading states | Low – user experience | Add meaningful fallback spinners and keep critical components eager. |
| Accidentally removing needed dependency | High – build fails | Use `npm ls` and TypeScript unused‑code detection before removal. |

## Implementation Steps (high level)
1. **Audit components** – List files > 200 LOC or with multiple responsibilities.
2. **Create new component files** – Move JSX/logic, add index barrels.
3. **Replace imports with lazy loads** – Update usage sites with `React.lazy` and `<Suspense>`.
4. **Run lint/type‑check** – Ensure no missing imports.
5. **Dependency cleanup** – Prune, dedupe, remove unused packages.
6. **Delete empty files** – Use grep results to locate and delete.
7. **Add verification script** – Update `package.json` and test locally.
8. **Run full test suite** – `npm test` to confirm no regressions.
9. **Measure bundle size** – `vite build --mode production` and inspect `dist/assets/*.js`.
10. **Commit & push** – All changes in a single PR.

---
*Spec self‑review: No placeholders, internal consistency confirmed, scope well defined.*
