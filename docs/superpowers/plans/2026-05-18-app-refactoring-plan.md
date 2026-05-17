# App.tsx Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor App.tsx from 2585 lines to <500 lines by extracting components, hooks, and services into a modular architecture.

**Architecture:** Modular component-based architecture with clear separation of concerns - components for UI, hooks for state management, services for business logic.

**Tech Stack:** React 19, TypeScript, React Testing Library, Vitest, localStorage

---

## Phase 1: Foundation (Tasks 1-5)

### Task 1: Create Type Definitions

**Files:** Create `src/types/chat.ts`, `src/types/settings.ts`, `src/types/ai.ts`

- [ ] Create chat types (Message, Memory, Skill, Agent interfaces)
- [ ] Create settings types (ChatConfig, Preset, ValidationResult)
- [ ] Create AI types (AIProvider, AIResponse, ModelInfo)
- [ ] Commit: `git add src/types/ && git commit -m "feat: add type definitions"`

### Task 2: Create Utilities

**Files:** Create `src/utils/constants.ts`, `src/utils/formatters.ts`, `src/utils/apiHelpers.ts`

- [ ] Create constants (DEFAULT_CHAT_CONFIG, STORAGE_KEYS, AI_PROVIDERS)
- [ ] Create formatters (formatTimestamp, formatFileSize, truncate)
- [ ] Create API helpers (buildUrl, isValidUrl, generateId)
- [ ] Commit: `git add src/utils/ && git commit -m "feat: add utility functions"`

### Task 3: Create Storage Service

**Files:** Create `src/services/storageService.ts`, test file

- [ ] Write tests for storageService (save, load, remove, clear)
- [ ] Implement storageService with localStorage wrapper
- [ ] Run tests: `npm test storageService`
- [ ] Commit: `git add src/services/ && git commit -m "feat: add storage service with tests"`

### Task 4: Create Validation Service

**Files:** Create `src/services/validationService.ts`, test file

- [ ] Write tests for validationService (validateAIConfig, validateAPIKey, etc.)
- [ ] Implement validationService with comprehensive validation
- [ ] Run tests: `npm test validationService`
- [ ] Commit: `git add src/services/ && git commit -m "feat: add validation service with tests"`

### Task 5: Create Preset Service

**Files:** Create `src/services/presetService.ts`, test file

- [ ] Write tests for presetService (getAll, getById, save, delete, validate)
- [ ] Implement presetService with localStorage integration
- [ ] Run tests: `npm test presetService`
- [ ] Commit: `git add src/services/ && git commit -m "feat: add preset service with tests"`

---

## Phase 2: Shared Components (Tasks 6-10)

### Task 6: Create Button Component

**Files:** Create `src/components/shared/Button.tsx`, test file

- [ ] Write tests for Button (render, onClick, disabled)
- [ ] Implement Button with variants (primary, secondary, danger)
- [ ] Run tests: `npm test Button`
- [ ] Commit: `git add src/components/shared/ && git commit -m "feat: add Button component"`

### Task 7: Create Input Component

**Files:** Create `src/components/shared/Input.tsx`, test file

- [ ] Write tests for Input (render, onChange, error display)
- [ ] Implement Input with label and error support
- [ ] Run tests: `npm test Input`
- [ ] Commit: `git add src/components/shared/ && git commit -m "feat: add Input component"`

### Task 8: Create LoadingSpinner Component

**Files:** Create `src/components/shared/LoadingSpinner.tsx`, test file

- [ ] Write tests for LoadingSpinner (render, size variants)
- [ ] Implement LoadingSpinner with size prop
- [ ] Run tests: `npm test LoadingSpinner`
- [ ] Commit: `git add src/components/shared/ && git commit -m "feat: add LoadingSpinner component"`

### Task 9: Extract Tooltip Component

**Files:** Modify `src/App.tsx:53-123`, create `src/components/shared/Tooltip.tsx`

- [ ] Extract Tooltip component from App.tsx to separate file
- [ ] Update App.tsx imports
- [ ] Remove Tooltip definition from App.tsx
- [ ] Commit: `git add src/components/shared/Tooltip.tsx src/App.tsx && git commit -m "refactor: extract Tooltip component"`

### Task 10: Extract MemoryCard Component

**Files:** Modify `src/App.tsx:146-290`, create `src/components/shared/MemoryCard.tsx`

- [ ] Extract MemoryCard component from App.tsx to separate file
- [ ] Update App.tsx imports
- [ ] Remove MemoryCard definition from App.tsx
- [ ] Commit: `git add src/components/shared/MemoryCard.tsx src/App.tsx && git commit -m "refactor: extract MemoryCard component"`

---

## Phase 3: Hooks (Tasks 11-17)

### Task 11: Create useSettings Hook

**Files:** Create `src/hooks/useSettings.ts`, test file

- [ ] Write tests for useSettings (load, update, reset)
- [ ] Implement useSettings with localStorage integration
- [ ] Run tests: `npm test useSettings`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add useSettings hook"`

### Task 12: Create useValidation Hook

**Files:** Create `src/hooks/useValidation.ts`, test file

- [ ] Write tests for useValidation (validateConfig, validateField, clearErrors)
- [ ] Implement useValidation with error state management
- [ ] Run tests: `npm test useValidation`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add useValidation hook"`

### Task 13: Create usePresets Hook

**Files:** Create `src/hooks/usePresets.ts`, test file

- [ ] Write tests for usePresets (load, save, delete, apply)
- [ ] Implement usePresets with presetService integration
- [ ] Run tests: `npm test usePresets`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add usePresets hook"`

### Task 14: Create useMemory Hook

**Files:** Create `src/hooks/useMemory.ts`, test file

- [ ] Write tests for useMemory (load, compress, clear, search)
- [ ] Implement useMemory with compression logic
- [ ] Run tests: `npm test useMemory`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add useMemory hook"`

### Task 15: Create useAIProviders Hook

**Files:** Create `src/hooks/useAIProviders.ts`, test file

- [ ] Write tests for useAIProviders (load providers, detect, testConnection)
- [ ] Implement useAIProviders with auto-detection
- [ ] Run tests: `npm test useAIProviders`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add useAIProviders hook"`

### Task 16: Create useAutoDetect Hook

**Files:** Create `src/hooks/useAutoDetect.ts`, test file

- [ ] Write tests for useAutoDetect (detect servers, fetch models)
- [ ] Implement useAutoDetect with server detection
- [ ] Run tests: `npm test useAutoDetect`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add useAutoDetect hook"`

### Task 17: Create useChat Hook

**Files:** Create `src/hooks/useChat.ts`, test file

- [ ] Write tests for useChat (sendMessage, cancel, clearHistory)
- [ ] Implement useChat with AI service integration
- [ ] Run tests: `npm test useChat`
- [ ] Commit: `git add src/hooks/ && git commit -m "feat: add useChat hook"`

---

## Phase 4: Chat Components (Tasks 18-21)

### Task 18: Create MessageItem Component

**Files:** Create `src/components/chat/MessageItem.tsx`, test file

- [ ] Write tests for MessageItem (render user/model, copy button)
- [ ] Implement MessageItem with markdown and syntax highlighting
- [ ] Run tests: `npm test MessageItem`
- [ ] Commit: `git add src/components/chat/ && git commit -m "feat: add MessageItem component"`

### Task 19: Create MessageList Component

**Files:** Create `src/components/chat/MessageList.tsx`, test file

- [ ] Write tests for MessageList (empty state, render messages, onCopy)
- [ ] Implement MessageList with MessageItem integration
- [ ] Run tests: `npm test MessageList`
- [ ] Commit: `git add src/components/chat/ && git commit -m "feat: add MessageList component"`

### Task 20: Create InputArea Component

**Files:** Create `src/components/chat/InputArea.tsx`, test file

- [ ] Write tests for InputArea (render, send, cancel, keyboard)
- [ ] Implement InputArea with textarea and buttons
- [ ] Run tests: `npm test InputArea`
- [ ] Commit: `git add src/components/chat/ && git commit -m "feat: add InputArea component"`

### Task 21: Create ChatContainer Component

**Files:** Create `src/components/chat/ChatContainer.tsx`, test file

- [ ] Write tests for ChatContainer (render, sendMessage, onCancel)
- [ ] Implement ChatContainer with MessageList and InputArea
- [ ] Run tests: `npm test ChatContainer`
- [ ] Commit: `git add src/components/chat/ && git commit -m "feat: add ChatContainer component"`

---

## Phase 5: Settings Components (Tasks 22-27)

### Task 22: Create ProviderSelector Component

**Files:** Create `src/components/settings/ProviderSelector.tsx`, test file

- [ ] Write tests for ProviderSelector (render, select, highlight)
- [ ] Implement ProviderSelector with provider grid
- [ ] Run tests: `npm test ProviderSelector`
- [ ] Commit: `git add src/components/settings/ && git commit -m "feat: add ProviderSelector component"`

### Task 23: Create ModelConfig Component

**Files:** Create `src/components/settings/ModelConfig.tsx`, test file

- [ ] Write tests for ModelConfig (render, onChange, validation)
- [ ] Implement ModelConfig with conditional fields (API key, URL)
- [ ] Run tests: `npm test ModelConfig`
- [ ] Commit: `git add src/components/settings/ && git commit -m "feat: add ModelConfig component"`

### Task 24: Create SettingsTabs Component

**Files:** Create `src/components/settings/SettingsTabs.tsx`, test file

- [ ] Write tests for SettingsTabs (render, switch tabs, highlight)
- [ ] Implement SettingsTabs with tab navigation
- [ ] Run tests: `npm test SettingsTabs`
- [ ] Commit: `git add src/components/settings/ && git commit -m "feat: add SettingsTabs component"`

### Task 25: Create PresetManager Component

**Files:** Create `src/components/settings/PresetManager.tsx`, test file

- [ ] Write tests for PresetManager (render, create, apply, delete)
- [ ] Implement PresetManager with preset CRUD operations
- [ ] Run tests: `npm test PresetManager`
- [ ] Commit: `git add src/components/settings/ && git commit -m "feat: add PresetManager component"`

### Task 26: Create ValidationMessage Component

**Files:** Create `src/components/settings/ValidationMessage.tsx`, test file

- [ ] Write tests for ValidationMessage (error, warning, success)
- [ ] Implement ValidationMessage with type-specific styling
- [ ] Run tests: `npm test ValidationMessage`
- [ ] Commit: `git add src/components/settings/ && git commit -m "feat: add ValidationMessage component"`

### Task 27: Create SettingsModal Component

**Files:** Create `src/components/settings/SettingsModal.tsx`, test file

- [ ] Write tests for SettingsModal (render, save, close, tabs)
- [ ] Implement SettingsModal with all settings components
- [ ] Run tests: `npm test SettingsModal`
- [ ] Commit: `git add src/components/settings/ && git commit -m "feat: add SettingsModal component"`

---

## Phase 6: Sidebar Components (Tasks 28-30)

### Task 28: Create MemoryPanel Component

**Files:** Create `src/components/sidebar/MemoryPanel.tsx`, test file

- [ ] Write tests for MemoryPanel (empty state, render memories)
- [ ] Implement MemoryPanel with MemoryCard integration
- [ ] Run tests: `npm test MemoryPanel`
- [ ] Commit: `git add src/components/sidebar/ && git commit -m "feat: add MemoryPanel component"`

### Task 29: Create SkillsPanel Component

**Files:** Create `src/components/sidebar/SkillsPanel.tsx`, test file

- [ ] Write tests for SkillsPanel (render learned/available skills)
- [ ] Implement SkillsPanel with skill display
- [ ] Run tests: `npm test SkillsPanel`
- [ ] Commit:git add src/components/sidebar/ && git commit -m "feat: add SkillsPanel component"`

### Task 30: Create Sidebar Component

**Files:** Create `src/components/sidebar/Sidebar.tsx`, test file

- [ ] Write tests for Sidebar (render, switch tabs, panels)
- [ ] Implement Sidebar with MemoryPanel and SkillsPanel
- [ ] Run tests: `npm test Sidebar`
- [ ] Commit: `git add src/components/sidebar/ && git commit -m "feat: add Sidebar component"`

---

## Phase 7: App.tsx Integration (Tasks 31-32)

### Task 31: Integrate New Components into App.tsx

**Files:** Modify `src/App.tsx`

- [ ] Add imports for new components and hooks
- [ ] Replace state management with hooks (useSettings, useChat, useMemory, useAIProviders)
- [ ] Replace Chat UI with ChatContainer
- [ ] Replace Settings Modal with SettingsModal
- [ ] Replace Sidebar with Sidebar component
- [ ] Remove duplicate component definitions (Tooltip, MemoryCard)
- [ ] Update clearHistory to use new hooks
- [ ] Commit: `git add src/App.tsx && git commit -m "refactor: integrate new components into App.tsx"`

### Task 32: Clean Up App.tsx

**Files:** Modify `src/App.tsx`

- [ ] Remove unused imports
- [ ] Remove unused state variables
- [ ] Remove unused functions
- [ ] Simplify App.tsx to coordination component only
- [ ] Verify line count < 500: `wc -l src/App.tsx`
- [ ] Commit: `git add src/App.tsx && git commit -m "refactor: clean up App.tsx - reduced to <500 lines"`

---

## Phase 8: Testing & Documentation (Tasks 33-36)

### Task 33: Run All Tests

**Files:** Test files

- [ ] Run all tests: `npm test`
- [ ] Check coverage: `npm test -- --coverage`
- [ ] Fix any failing tests
- [ ] Commit: `git add . && git commit -m "test: all tests passing with 80%+ coverage"`

### Task 34: Manual Testing

**Files:** None

- [ ] Start dev server: `npm run dev`
- [ ] Test chat functionality (send, receive, stream, cancel)
- [ ] Test settings functionality (open, change, save, persist)
- [ ] Test sidebar functionality (open, tabs, panels)
- [ ] Test preset functionality (create, apply, delete)
- [ ] Test validation (errors, warnings, fixes)
- [ ] Document results in TEST_RESULTS.md
- [ ] Commit: `git add TEST_RESULTS.md && git commit -m "test: manual testing complete - all features working"`

### Task 35: Update Documentation

**Files:** Modify `README.md`

- [ ] Add architecture section to README
- [ ] Add development section (tests, lint, build)
- [ ] Commit: `git add README.md && git commit -m "docs: update README with architecture and development sections"`

### Task 36: Create Architecture Documentation

**Files:** Create `ARCHITECTURE.md`

- [ ] Write comprehensive architecture documentation
- [ ] Document component architecture
- [ ] Document hook architecture
- [ ] Document service architecture
- [ ] Add diagrams and examples
- [ ] Commit: `git add ARCHITECTURE.md && git commit -m "docs: add comprehensive architecture documentation"`

---

## Success Criteria

- ✅ App.tsx < 500 lines (currently 2585)
- ✅ 80%+ test coverage
- ✅ All current features working
- ✅ New features (presets) easily added
- ✅ Validation errors clear to users
- ✅ Performance not degraded

---

**Total Tasks:** 36  
**Estimated Time:** 15-20 days
