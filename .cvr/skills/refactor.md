---
id: refactor
name: Refactor Code
description: Systematic code refactoring workflow
triggers: [refactor, cleanup, simplify]
---

# Refactor Skill

## Steps
1. Identify the code smell or complexity hotspot.
2. Read the target file(s).
3. Write a plan: what will change and why.
4. Apply edits incrementally (one change at a time).
5. Run tests or type-check after each edit.
6. Update MEMORY.md with the pattern learned.

## Rules
- Prefer small, testable changes.
- Preserve public API unless explicitly allowed to break it.
- Document the reason for each significant change.
