# App.tsx Refactoring Design Document

**Date:** 2026-05-18  
**Project:** cvr.name.coder  
**Status:** Design Phase  
**Priority:** High

---

## Executive Summary

This document outlines the comprehensive refactoring of App.tsx (currently 2585 lines) into a modular, maintainable architecture. The refactoring addresses three critical issues: maintainability, performance, and preparation for future features (Smart Presets, Onboarding, Model Discovery, Validation).

**Target:** Reduce App.tsx to < 500 lines while improving code organization, testability, and performance.

---

## Problem Statement

### Current Issues

1. **Maintainability**: 2585 lines in a single file makes it extremely difficult to:
   - Add new features
   - Debug issues
   - Understand code flow
   - Test components in isolation

2. **Performance**: Large component tree causes:
   - Unnecessary re-renders
   - Slow initial load
   - Memory inefficiency

3. **Scalability**: Current architecture cannot easily support:
   - Smart Presets system
   - Onboarding Wizard
   - Model Discovery for all providers
   - Validation System

### Root Causes

- Monolithic component structure
- Mixed concerns (UI, state management, API calls, settings)
- No separation between presentation and business logic
- Lack of reusable components
- No clear boundaries between modules

---

## Proposed Solution

### Architecture Overview

```
src/
├── components/
│   ├── chat/              # Chat-related components
│   ├── settings/          # Settings-related components
│   ├── sidebar/           # Sidebar-related components
│   └── shared/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── services/              # Business logic services
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── App.tsx                # Coordination component (< 500 lines)
```

### Key Principles

1. **Single Responsibility**: Each component/hook/service does one thing well
2. **Clear Boundaries**: Modules communicate through well-defined interfaces
3. **Reusability**: Shared components used across the application
4. **Testability**: Each module can be tested independently
5. **Performance**: React.memo, lazy loading, virtual scrolling where appropriate

---

## Component Architecture

### Chat Module

**Purpose**: Handle all chat-related UI and logic

**Components**:
- `ChatContainer.tsx` - Main chat coordinator
- `MessageList.tsx` - Display messages with virtual scrolling
- `MessageItem.tsx` - Individual message display
- `InputArea.tsx` - Message input and send button
- `CommandPalette.tsx` - Ctrl+K command palette
- `QuickActions.tsx` - Quick action buttons (/analyze, /fix, etc.)

**Data Flow**:
```
User Input → InputArea → onSendMessage → useChat hook → aiService → 
Streaming Response → setMessages → MessageList → UI Update
```

### Settings Module

**Purpose**: Handle all settings configuration

**Components**:
- `SettingsModal.tsx` - Main settings modal
- `SettingsTabs.tsx` - Tab navigation (Chat/Kernel/MCP)
- `ProviderSelector.tsx` - AI provider selection
- `ModelConfig.tsx` - Model configuration with validation
- `LocalServerConfig.tsx` - Local server URL configuration
- `PresetManager.tsx` - Smart Presets management
- `ValidationMessage.tsx` - Validation error display

**Data Flow**:
```
User Input → Settings Component → onChange → useSettings hook → 
localStorage → AI Service (when sending message)
```

### Sidebar Module

**Purpose**: Handle sidebar panels (Memory, Skills)

**Components**:
- `Sidebar.tsx` - Main sidebar container
- `MemoryPanel.tsx` - Memory clusters display
- `SkillsPanel.tsx` - Learned/available skills
- `AgentSelector.tsx` - Active agent selection
- `StatusIndicator.tsx` - System status display

**Data Flow**:
```
Chat Messages (every 5) → useMemory hook → aiService.summarizeHistory → 
Memory Cluster → setMemories → MemoryPanel → UI Update
```

### Shared Module

**Purpose**: Reusable UI components

**Components**:
- `Tooltip.tsx` - Hover tooltips
- `MemoryCard.tsx` - Memory cluster card
- `LoadingSpinner.tsx` - Loading indicators
- `Button.tsx` - Reusable button
- `Input.tsx` - Reusable input field

---

## Hook Architecture

### useChat Hook

**Purpose**: Manage chat state and AI communication

**Interface**:
```typescript
interface UseChatReturn {
  messages: Message[];
  isLooming: boolean;
  sendMessage: (text: string) => Promise<void>;
  cancelRequest: () => void;
  clearHistory: () => Promise<void>;
}
```

**Responsibilities**:
- Manage message state
- Handle AI streaming responses
- Manage request cancellation
- Auto-save to localStorage
- Trigger memory compression

### useSettings Hook

**Purpose**: Manage settings state and persistence

**Interface**:
```typescript
interface UseSettingsReturn {
  config: ChatConfig;
  kernelConfig: ChatConfig;
  updateConfig: (updates: Partial<ChatConfig>) => void;
  updateKernelConfig: (updates: Partial<ChatConfig>) => void;
  resetToDefaults: () => void;
}
```

**Responsibilities**:
- Load settings from localStorage
- Save settings to localStorage
- Update configuration
- Reset to defaults

### useAIProviders Hook

**Purpose**: Manage AI provider detection and configuration

**Interface**:
```typescript
interface UseAIProvidersReturn {
  providers: AIProvider[];
  detectedProvider: string | null;
  availableModels: string[];
  detectProviders: () => Promise<void>;
  testConnection: (config: ChatConfig) => Promise<boolean>;
}
```

**Responsibilities**:
- Auto-detect local AI servers
- Fetch available models
- Test provider connections
- Manage provider state

### useMemory Hook

**Purpose**: Manage memory clusters and compression

**Interface**:
```typescript
interface UseMemoryReturn {
  memories: Memory[];
  compressHistory: (messages: Message[]) => Promise<void>;
  clearMemory: () => Promise<void>;
  searchMemory: (query: string) => Memory[];
}
```

**Responsibilities**:
- Load memory from localStorage
- Compress chat history
- Search memory clusters
- Clear memory

### useValidation Hook

**Purpose**: Validate settings configuration

**Interface**:
```typescript
interface UseValidationReturn {
  validateConfig: (config: ChatConfig) => ValidationResult;
  validateField: (field: string, value: any) => FieldValidation;
  clearErrors: () => void;
}
```

**Responsibilities**:
- Validate complete configuration
- Validate individual fields
- Provide actionable error messages
- Clear validation errors

### usePresets Hook

**Purpose**: Manage Smart Presets

**Interface**:
```typescript
interface UsePresetsReturn {
  presets: Preset[];
  currentPreset: string | null;
  savePreset: (preset: Preset) => Promise<void>;
  loadPreset: (presetId: string) => Promise<Preset>;
  deletePreset: (presetId: string) => Promise<void>;
  applyPreset: (preset: Preset) => void;
}
```

**Responsibilities**:
- Load presets from localStorage
- Save new presets
- Load existing presets
- Delete presets
- Apply preset to current configuration

---

## Service Architecture

### aiService

**Purpose**: Handle all AI API communication

**Key Functions**:
- `generateContent()` - Generate AI response with streaming
- `summarizeHistory()` - Compress chat history
- `testConnection()` - Test provider connection
- `fetchModels()` - Fetch available models

**Error Handling**:
- `AIConfigError` - Invalid configuration
- `APIError` - API request failures
- `UserFacingError` - Errors with actionable guidance
- `CancelledError` - User cancelled request
- `UnexpectedError` - Unexpected errors

### storageService

**Purpose**: Handle localStorage operations

**Key Functions**:
- `load()` - Load data from localStorage
- `save()` - Save data to localStorage
- `remove()` - Remove data from localStorage
- `clear()` - Clear all data

### validationService

**Purpose**: Validate configuration

**Key Functions**:
- `validateAIConfig()` - Validate complete AI configuration
- `validateAPIKey()` - Validate API key format
- `validateURL()` - Validate URL format
- `validateModelName()` - Validate model name

### presetService

**Purpose**: Manage preset persistence

**Key Functions**:
- `getAll()` - Get all presets
- `getById()` - Get preset by ID
- `save()` - Save preset
- `delete()` - Delete preset
- `validate()` - Validate preset structure

---

## Data Flow

### Settings Flow

```
User Input (SettingsModal)
    ↓
onChange handlers
    ↓
useSettings hook (updateConfig)
    ↓
localStorage (storageService)
    ↓
AI Service (when sending message)
```

### Chat Flow

```
User Input (InputArea)
    ↓
onSendMessage
    ↓
useChat hook (sendMessage)
    ↓
aiService.generateContent()
    ↓
Streaming response
    ↓
setMessages (update UI)
    ↓
Memory compression (every 5 messages)
```

### Memory Flow

```
Chat messages (every 5)
    ↓
useMemory hook (compressHistory)
    ↓
aiService.summarizeHistory()
    ↓
Memory cluster
    ↓
setMemories (update UI)
    ↓
localStorage (storageService)
```

### Presets Flow

```
User Action (PresetManager)
    ↓
usePresets hook (savePreset)
    ↓
presetService.save()
    ↓
localStorage
    ↓
Update presets list
```

---

## Error Handling Strategy

### Validation Levels

1. **Component Level**: Real-time validation as user types
2. **Service Level**: Validation before API calls
3. **API Level**: Handle API errors with actionable guidance

### Error Types

- `AIConfigError` - Invalid configuration with field-specific errors
- `APIError` - API request failures with status codes
- `UserFacingError` - Errors with user-friendly messages and suggestions
- `CancelledError` - User cancelled requests
- `UnexpectedError` - Unexpected errors

### Error Display

- Inline validation errors in forms
- Toast notifications for API errors
- Error banners for critical errors
- Error boundaries for component errors

---

## Performance Optimizations

### React.memo

Apply to heavy components:
- `MessageList` - Only re-render when messages change
- `MemoryCard` - Only re-render when memory changes
- `ProviderSelector` - Only re-render when providers change

### Lazy Loading

Lazy load modals and heavy components:
- `SettingsModal` - Load only when opened
- `CommandPalette` - Load only when opened
- `PresetManager` - Load only when needed

### Virtual Scrolling

Apply to long lists:
- `MessageList` - Virtual scroll for message history
- `PresetList` - Virtual scroll for preset list

### Debounce

Apply to search and input:
- Command palette search - 300ms debounce
- Model name input - 500ms debounce

### Memoization

Memoize expensive computations:
- Filtered commands
- Sorted memories
- Agent list

---

## Migration Plan

### Phase 1: Preparation (1-2 days)
- Create folder structure
- Setup TypeScript paths
- Create base types
- Setup test environment

### Phase 2: Shared Components (1 day)
- Extract Tooltip, MemoryCard, LoadingSpinner
- Create Button, Input components
- Update imports in App.tsx
- Run tests

### Phase 3: Hooks (2-3 days)
- Create useSettings hook
- Create useChat hook
- Create useMemory hook
- Create useAIProviders hook
- Create useValidation hook
- Create usePresets hook
- Migrate state from App.tsx

### Phase 4: Chat Components (2-3 days)
- Create ChatContainer
- Create MessageList
- Create MessageItem
- Create InputArea
- Create CommandPalette
- Create QuickActions
- Replace in App.tsx

### Phase 5: Settings Components (2-3 days)
- Create SettingsModal
- Create SettingsTabs
- Create ProviderSelector
- Create ModelConfig
- Create LocalServerConfig
- Create PresetManager
- Create ValidationMessage
- Replace in App.tsx

### Phase 6: Sidebar Components (1-2 days)
- Create Sidebar
- Create MemoryPanel
- Create SkillsPanel
- Create AgentSelector
- Create StatusIndicator
- Replace in App.tsx

### Phase 7: Services (1-2 days)
- Create aiService
- Create storageService
- Create validationService
- Create presetService
- Migrate logic from App.tsx

### Phase 8: App.tsx Refactoring (1 day)
- Remove duplicated code
- Simplify App.tsx to coordination component
- Add Error Boundaries
- Optimize rendering

### Phase 9: Testing (2-3 days)
- Write unit tests for hooks
- Write unit tests for services
- Write component tests
- Write integration tests
- Run E2E tests

### Phase 10: Documentation (1 day)
- Update README
- Create ARCHITECTURE.md
- Create CONTRIBUTING.md
- Add code comments

### Phase 11: Final Testing (1-2 days)
- Full manual testing
- Performance testing
- Accessibility testing
- Bug fixing

**Total: 15-20 days**

---

## Risk Assessment

### High Risk: Regressions

**Description**: New bugs introduced during refactoring

**Mitigation**:
- Comprehensive testing
- Phased migration
- Code review for each phase
- Feature flags for new features

### Medium Risk: Lost Functionality

**Description**: Something forgotten during migration

**Mitigation**:
- Detailed audit of current code
- Checklist for each component
- Comparative testing before/after

### Low Risk: Performance Issues

**Description**: New architecture slower than current

**Mitigation**:
- Profiling before and after
- React.memo and lazy loading
- Virtual scrolling for long lists

### Medium Risk: Maintenance Complexity

**Description**: Too many files to manage

**Mitigation**:
- Clear documentation
- Logical folder structure
- Naming conventions

---

## Success Criteria

### Technical Metrics

- ✅ App.tsx < 500 lines (currently 2585)
- ✅ 80%+ test coverage
- ✅ Render time < 100ms
- ✅ Bundle size increase < 20%

### Functional Metrics

- ✅ All current features working
- ✅ New features (presets) easily added
- ✅ Validation errors clear to users
- ✅ Performance not degraded

### User Metrics

- ✅ New provider setup time < 2 minutes
- ✅ Clear error messages
- ✅ Easy preset save/load

---

## Next Steps

1. **Review and Approve** - Stakeholder review of this design
2. **Setup Environment** - Create folder structure and tooling
3. **Begin Migration** - Start with Phase 1 (Preparation)
4. **Iterative Development** - Follow migration plan phase by phase
5. **Testing and Validation** - Comprehensive testing at each phase
6. **Documentation** - Update documentation throughout
7. **Deployment** - Deploy after successful testing

---

## Appendix

### File Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── InputArea.tsx
│   │   ├── CommandPalette.tsx
│   │   └── QuickActions.tsx
│   ├── settings/
│   │   ├── SettingsModal.tsx
│   │   ├── SettingsTabs.tsx
│   │   ├── ProviderSelector.tsx
│   │   ├── ModelConfig.tsx
│   │   ├── LocalServerConfig.tsx
│   │   ├── PresetManager.tsx
│   │   └── ValidationMessage.tsx
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── MemoryPanel.tsx
│   │   ├── SkillsPanel.tsx
│   │   ├── AgentSelector.tsx
│   │   └── StatusIndicator.tsx
│   └── shared/
│       ├── Tooltip.tsx
│       ├── MemoryCard.tsx
│       ├── LoadingSpinner.tsx
│       ├── Button.tsx
│       └── Input.tsx
├── hooks/
│   ├── useChat.ts
│   ├── useSettings.ts
│   ├── useAIProviders.ts
│   ├── useMemory.ts
│   ├── useAutoDetect.ts
│   ├── useValidation.ts
│   └── usePresets.ts
├── services/
│   ├── aiService.ts
│   ├── storageService.ts
│   ├── validationService.ts
│   └── presetService.ts
├── types/
│   ├── chat.ts
│   ├── settings.ts
│   └── ai.ts
├── utils/
│   ├── apiHelpers.ts
│   ├── formatters.ts
│   └── constants.ts
└── App.tsx
```

### Type Definitions

```typescript
// types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  content: string;
  timestamp: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'learned' | 'available';
  category: 'research' | 'devops' | 'content' | 'knowledge';
}

// types/settings.ts
export interface ChatConfig {
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'grok' | 'groq' | 'local' | 'custom';
  aiModel: string;
  localUrl?: string;
  localModelName?: string;
  customKey?: string;
  customUrl?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: ChatConfig;
  createdAt: number;
}

// types/ai.ts
export interface AIProvider {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  requiresApiKey: boolean;
  requiresUrl: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-18  
**Author**: AI Assistant
