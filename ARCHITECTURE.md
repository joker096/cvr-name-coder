# Architecture Documentation

## Overview

This document provides a comprehensive overview of the cvr.name.coder application architecture, including component structure, data flow, and design patterns.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Architecture](#component-architecture)
3. [Hook Architecture](#hook-architecture)
4. [Service Architecture](#service-architecture)
5. [Data Flow](#data-flow)
6. [Design Patterns](#design-patterns)
7. [Performance Considerations](#performance-considerations)

## High-Level Architecture

### Application Structure

```
cvr.name.coder/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── App.tsx         # Main application (176 lines)
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

### Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **State Management**: React hooks, localStorage
- **Animations**: Framer Motion
- **Code Highlighting**: react-syntax-highlighter
- **Build Tool**: Vite
- **Package Manager**: npm

## Component Architecture

### Component Hierarchy

```
App
├── ChatContainer
│   ├── MessageList
│   │   └── MessageItem
│   └── InputArea
├── SettingsModal
│   ├── SettingsTabs
│   ├── ProviderSelector
│   ├── ModelConfig
│   ├── PresetManager
│   └── ValidationMessage
└── Sidebar
    ├── MemoryPanel
    │   └── MemoryCard
    └── SkillsPanel
```

### Component Categories

#### 1. Chat Components (`src/components/chat/`)

**ChatContainer**
- Purpose: Main chat interface container
- Props: `messages`, `input`, `onInputChange`, `onSendMessage`, `onCancelMessage`, `isLooming`, `agentLabel`, `t`, `lang`, `loadingText`, `placeholder`, `disabled`
- State: None (controlled component)
- Dependencies: `MessageList`, `InputArea`

**MessageList**
- Purpose: Display chat messages
- Props: `messages`, `agentLabel`, `t`, `isLooming`, `loadingText`
- State: None
- Dependencies: `MessageItem`

**MessageItem**
- Purpose: Display individual message with markdown and syntax highlighting
- Props: `message`, `index`, `agentLabel`, `t`
- State: `copied` (local state for copy button)
- Dependencies: `ReactMarkdown`, `SyntaxHighlighter`

**InputArea**
- Purpose: Chat input with send/cancel buttons
- Props: `value`, `onChange`, `onSend`, `onCancel`, `isLooming`, `placeholder`, `lang`, `disabled`, `className`
- State: None (controlled component)
- Dependencies: `CornerDownLeft`, `X` icons

#### 2. Settings Components (`src/components/settings/`)

**SettingsModal**
- Purpose: Main settings modal with tabs
- Props: `isOpen`, `onClose`, `config`, `kernelConfig`, `presets`, `onSave`, `onPresetSave`, `onPresetApply`, `onPresetDelete`, `t`, `lang`, `className`
- State: `activeTab`, `localConfig`, `localKernelConfig`, `validationErrors`
- Dependencies: `SettingsTabs`, `ProviderSelector`, `ModelConfig`, `PresetManager`, `ValidationMessage`

**SettingsTabs**
- Purpose: Tab navigation for settings
- Props: `tabs`, `activeTab`, `onTabChange`, `className`
- State: None
- Dependencies: None

**ProviderSelector**
- Purpose: AI provider selection grid
- Props: `providers`, `selectedProvider`, `onSelectProvider`, `className`
- State: None
- Dependencies: None

**ModelConfig**
- Purpose: Model configuration form
- Props: `provider`, `config`, `onChange`, `t`, `className`
- State: None
- Dependencies: None

**PresetManager**
- Purpose: Preset CRUD operations
- Props: `presets`, `currentConfig`, `onSavePreset`, `onApplyPreset`, `onDeletePreset`, `t`, `className`
- State: `showCreateForm`, `presetName`, `presetDescription`
- Dependencies: `Save`, `Trash2`, `Check` icons

**ValidationMessage**
- Purpose: Display validation errors/warnings
- Props: `type`, `message`, `onDismiss`, `className`
- State: None
- Dependencies: `AlertCircle`, `AlertTriangle`, `CheckCircle`, `X` icons

#### 3. Sidebar Components (`src/components/sidebar/`)

**Sidebar**
- Purpose: Main sidebar with tabs
- Props: `isOpen`, `activeTab`, `onTabChange`, `memories`, `skills`, `onLearnSkill`, `lang`, `t`, `className`
- State: None
- Dependencies: `MemoryPanel`, `SkillsPanel`

**MemoryPanel**
- Purpose: Display memory clusters
- Props: `memories`, `lang`, `t`, `className`
- State: None
- Dependencies: `MemoryCard`

**SkillsPanel**
- Purpose: Display learned and available skills
- Props: `skills`, `onLearnSkill`, `t`, `className`
- State: None
- Dependencies: None

#### 4. Shared Components (`src/components/shared/`)

**Button**
- Purpose: Reusable button component
- Props: `children`, `onClick`, `disabled`, `variant`, `size`, `className`
- State: None
- Dependencies: None

**Input**
- Purpose: Reusable input component
- Props: `value`, `onChange`, `placeholder`, `error`, `disabled`, `className`
- State: None
- Dependencies: None

**LoadingSpinner**
- Purpose: Loading indicator
- Props: `size`, `className`
- State: None
- Dependencies: None

**Tooltip**
- Purpose: Tooltip component
- Props: `content`, `position`, `delay`, `children`
- State: `isVisible`, `timeoutId`
- Dependencies: None

**MemoryCard**
- Purpose: Display individual memory cluster
- Props: `memory`, `lang`, `t`
- State: `copied`, `isExpanded`
- Dependencies: `Tooltip`

## Hook Architecture

### Custom Hooks

#### useSettings
- **Purpose**: Manage application settings
- **State**: `settings`, `isLoading`
- **Methods**: `updateChatConfig`, `updateAutoLoopDelay`, `toggleAutonomous`, `setLanguage`, `addPreset`, `updatePreset`, `deletePreset`, `loadPreset`, `resetSettings`
- **Persistence**: localStorage
- **Dependencies**: `storageService`

#### useChat
- **Purpose**: Manage chat state and AI interactions
- **State**: `messages`, `isLoading`, `error`, `isStreaming`
- **Methods**: `sendMessage`, `cancelMessage`, `clearHistory`, `deleteMessage`, `updateMessage`, `retryMessage`
- **API**: `/api/chat` (SSE streaming)
- **Dependencies**: None

#### useMemory
- **Purpose**: Manage persistent memory clusters
- **State**: `memories`, `isLoading`, `error`
- **Methods**: `loadMemories`, `addMemory`, `compressMemories`, `clearMemories`, `searchMemories`, `deleteMemory`, `updateMemory`
- **Persistence**: localStorage
- **Dependencies**: `storageService`

#### useAIProviders
- **Purpose**: Manage AI provider configurations
- **State**: `isDetecting`, `detectedModels`, `error`
- **Methods**: `getProviders`, `getProviderById`, `getModelsForProvider`, `detectLocalModels`, `testConnection`
- **API**: Local LLM APIs
- **Dependencies**: None

#### useAutoDetect
- **Purpose**: Auto-detect local AI servers
- **State**: `isScanning`, `detectedServers`, `error`
- **Methods**: `scanServers`, `scanSingleServer`, `getOnlineServers`, `getServerByUrl`, `clearResults`
- **API**: Local server endpoints
- **Dependencies**: None

#### useValidation
- **Purpose**: Validate form inputs
- **State**: `errors`, `warnings`, `isValidating`
- **Methods**: `validateField`, `validateConfig`, `clearErrors`, `clearFieldError`
- **Dependencies**: `validationService`

#### usePresets
- **Purpose**: Manage preset configurations
- **State**: `presets`, `isLoading`, `error`
- **Methods**: `loadPresets`, `savePreset`, `updatePreset`, `deletePreset`, `applyPreset`, `getPresetById`
- **Persistence**: localStorage
- **Dependencies**: `presetService`

## Service Architecture

### Storage Service

**Purpose**: localStorage wrapper with error handling

**Methods**:
- `save<T>(key: string, data: T): void`
- `load<T>(key: string): T | null`
- `get<T>(key: string): T | null` (alias for load)
- `set<T>(key: string, data: T): void` (alias for save)
- `remove(key: string): void`
- `clear(): void`

**Usage**:
```typescript
import { storageService } from './services/storageService';

// Save data
storageService.save('cvr_settings', { theme: 'dark' });

// Load data
const settings = storageService.load('cvr_settings');

// Remove data
storageService.remove('cvr_settings');
```

### Validation Service

**Purpose**: Validate configuration and form inputs

**Methods**:
- `validateConfig(config: ChatConfig): ValidationResult`
- `validateField(field: string, value: any): FieldValidation`
- `validateAPIKey(apiKey: string): FieldValidation`
- `validateURL(url: string): FieldValidation`
- `validateModelName(modelName: string): FieldValidation`

**Usage**:
```typescript
import { validationService } from './services/validationService';

// Validate configuration
const result = validationService.validateConfig({
  aiProvider: 'openai',
  aiModel: 'gpt-4',
  apiKey: 'sk-...'
});

if (!result.isValid) {
  console.error(result.errors);
}
```

### Preset Service

**Purpose**: Manage preset configurations

**Methods**:
- `loadPresets(): Preset[]`
- `savePreset(preset: Omit<Preset, "id" | "createdAt">): Preset`
- `updatePreset(id: string, updates: Partial<Preset>): Preset`
- `deletePreset(id: string): void`
- `getById(id: string): Preset | null`
- `getAll(): Preset[]`
- `validate(preset: Preset): ValidationResult`

**Usage**:
```typescript
import { presetService } from './services/presetService';

// Create preset
const preset = presetService.savePreset({
  name: 'Development',
  description: 'For coding tasks',
  config: {
    aiProvider: 'openai',
    aiModel: 'gpt-4'
  }
});

// Load presets
const presets = presetService.loadPresets();
```

## Data Flow

### Chat Flow

```
User Input
    ↓
InputArea (onChange)
    ↓
App State (input)
    ↓
User clicks Send
    ↓
ChatContainer (onSendMessage)
    ↓
useChat (sendMessage)
    ↓
API Call (/api/chat)
    ↓
SSE Stream Response
    ↓
useChat (update messages)
    ↓
ChatContainer (messages prop)
    ↓
MessageList (render messages)
    ↓
MessageItem (display message)
```

### Settings Flow

```
User opens Settings
    ↓
SettingsModal (isOpen=true)
    ↓
User changes provider
    ↓
ProviderSelector (onSelectProvider)
    ↓
SettingsModal (localConfig)
    ↓
User clicks Save
    ↓
SettingsModal (onSave)
    ↓
useSettings (updateChatConfig)
    ↓
storageService (save to localStorage)
    ↓
SettingsModal (onClose)
```

### Memory Flow

```
AI generates memory
    ↓
useMemory (addMemory)
    ↓
storageService (save to localStorage)
    ↓
Sidebar (memories prop)
    ↓
MemoryPanel (render memories)
    ↓
MemoryCard (display memory)
```

## Design Patterns

### 1. Component Composition

Components are composed from smaller, reusable components:

```typescript
<ChatContainer>
  <MessageList>
    <MessageItem />
  </MessageList>
  <InputArea />
</ChatContainer>
```

### 2. Custom Hooks

Business logic is encapsulated in custom hooks:

```typescript
const { messages, sendMessage } = useChat(config);
const { settings, updateChatConfig } = useSettings();
```

### 3. Service Layer

Data access and business logic are separated into services:

```typescript
const result = validationService.validateConfig(config);
const presets = presetService.loadPresets();
```

### 4. Controlled Components

Form inputs use controlled component pattern:

```typescript
<InputArea
  value={input}
  onChange={handleInputChange}
  onSend={handleSendMessage}
/>
```

### 5. Prop Drilling vs Context

For simplicity, props are passed down the component tree. For larger applications, consider using React Context.

## Performance Considerations

### 1. Code Splitting

Components are lazy-loaded where appropriate:

```typescript
const SettingsModal = React.lazy(() => import('./components/settings/SettingsModal'));
```

### 2. Memoization

Expensive computations are memoized:

```typescript
const category = useMemo(() => {
  // Expensive computation
}, [memory.content]);
```

### 3. Debouncing

User input is debounced where appropriate:

```typescript
const debouncedSearch = useMemo(
  () => debounce(searchMemories, 300),
  [searchMemories]
);
```

### 4. Virtual Scrolling

For large lists, consider using virtual scrolling libraries.

### 5. localStorage Optimization

- Batch writes to minimize storage operations
- Use JSON serialization for complex objects
- Implement compression for large datasets

## Security Considerations

### 1. API Key Storage

API keys are stored in localStorage with encryption consideration:

```typescript
// Consider encrypting sensitive data
const encryptedKey = encrypt(apiKey);
localStorage.setItem('cvr_apiKey', encryptedKey);
```

### 2. Input Validation

All user inputs are validated:

```typescript
const result = validationService.validateField('apiKey', value);
if (!result.isValid) {
  showError(result.error);
}
```

### 3. XSS Prevention

- Use React's built-in XSS protection
- Sanitize markdown content
- Validate all user inputs

## Testing Strategy

### Unit Tests

- Components: Test rendering, props, user interactions
- Hooks: Test state management, side effects
- Services: Test business logic, error handling

### Integration Tests

- Test component interactions
- Test data flow between components and hooks
- Test service integration

### E2E Tests

- Test complete user workflows
- Test critical paths (chat, settings, memory)

## Future Improvements

### 1. State Management

Consider using a state management library for complex state:
- Zustand
- Redux Toolkit
- Jotai

### 2. Data Fetching

Consider using a data fetching library:
- React Query
- SWR
- Apollo Client

### 3. Form Handling

Consider using a form library:
- React Hook Form
- Formik
- TanStack Form

### 4. Testing

Add comprehensive test coverage:
- Unit tests for all components and hooks
- Integration tests for user flows
- E2E tests with Playwright

## Conclusion

This architecture provides a solid foundation for the cvr.name.coder application with:

- Clear separation of concerns
- Reusable components
- Testable code
- Type safety
- Performance optimization

The modular design makes it easy to add new features and maintain existing functionality.
