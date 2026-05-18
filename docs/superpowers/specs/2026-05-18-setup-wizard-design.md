# Setup Wizard Design Document

**Date:** 2026-05-18
**Status:** Approved
**Version:** 1.0

## Overview

Design for a streamlined setup wizard that simplifies first-time configuration for new users of cvr.name.coder AI coding assistant.

## Problem Statement

New users face complexity when first configuring the AI assistant:
- Too many options presented at once
- No step-by-step guidance
- Unclear what inputs are required
- Difficult to choose between providers and models

## Solution

Smart Auto-Detection Setup Wizard with 3-4 steps:
1. Auto-scan for local AI servers
2. Configure provider (local or cloud)
3. Select model
4. Complete and start

## Architecture

### Component Hierarchy

```
SetupWizard
├── ProviderDetectionStep
├── LocalProviderSetup (conditional)
├── CloudProviderSetup (conditional)
├── ModelSelectionStep
└── CompletionStep
```

### Data Flow

```
SetupWizard
  ↓ (background scan)
ProviderDetectionStep
  ↓ (if local found)
LocalProviderSetup → ModelSelectionStep → CompletionStep
  ↓ (if local not found)
CloudProviderSetup → ModelSelectionStep → CompletionStep
```

### State Management

```typescript
interface SetupWizardState {
  currentStep: number;
  provider: AIProvider | null;
  model: AIModel | null;
  detectedServers: DetectedServer[];
  isScanning: boolean;
  error: string | null;
}
```

## Step Details

### Step 1: ProviderDetectionStep

**Purpose:** Auto-scan for local AI servers

**UI:**
- Title: "Настройка AI"
- Subtitle: "Сканирование доступных провайдеров..."
- Loading spinner
- Text: "Проверяем Ollama, llama.cpp..."
- Button: "Пропустить и выбрать вручную"

**Logic:**
- Run `useAutoDetect.scanServers()` in background
- Wait 2-3 seconds max
- If local found → LocalProviderSetup
- If not found → CloudProviderSetup

**Error Handling:**
- Scan failed → Show error + "Выбрать облачный провайдер" button

---

### Step 2A: LocalProviderSetup

**Purpose:** Configure detected local AI server

**UI:**
- Title: "Найден локальный AI"
- Card with detected server (URL, status)
- Button: "Далее"

**Logic:**
- Show results from `useAutoDetect.getOnlineServers()`
- Auto-select first working server
- Save to `setupState.provider`

---

### Step 2B: CloudProviderSetup

**Purpose:** Select cloud AI provider

**UI:**
- Title: "Выберите облачный провайдер"
- Grid of 4 cards: Gemini, OpenAI, DeepSeek, Groq
- Each card: icon + name + brief description
- Button: "Далее" (enabled after selection)

**Logic:**
- User clicks card
- Save to `setupState.provider`
- Button → ModelSelectionStep

---

### Step 3: ModelSelectionStep

**Purpose:** Select AI model

**UI:**
- Title: "Выберите модель"
- List of models (for selected provider)
- Each model: name + size + description
- Search/filter (if many models)
- Button: "Начать работу" (enabled after selection)

**Logic:**
- For local: `useAIProviders.getModelsForProvider('ollama')`
- For cloud: `useAIProviders.getModelsForProvider(provider)`
- User selects model
- Save to `setupState.model`
- Button → CompletionStep

---

### Step 4: CompletionStep

**Purpose:** Confirm and start

**UI:**
- Title: "Готово!"
- Summary: selected provider + model
- Button: "Начать чат"
- Button: "Изменить настройки" (optional)

**Logic:**
- Save all settings via `useSettings`
- Close wizard
- Open chat

## Component Interfaces

```typescript
// SetupWizard.tsx
interface SetupWizardProps {
  onComplete: (config: ChatConfig) => void;
  onCancel?: () => void;
}

// ProviderDetectionStep.tsx
interface ProviderDetectionStepProps {
  onLocalFound: (server: DetectedServer) => void;
  onLocalNotFound: () => void;
  onSkip: () => void;
}

// LocalProviderSetup.tsx
interface LocalProviderSetupProps {
  server: DetectedServer;
  onNext: () => void;
}

// CloudProviderSetup.tsx
interface CloudProviderSetupProps {
  providers: AIProvider[];
  onSelect: (provider: AIProvider) => void;
}

// ModelSelectionStep.tsx
interface ModelSelectionStepProps {
  provider: AIProvider;
  models: AIModel[];
  onSelect: (model: AIModel) => void;
}

// CompletionStep.tsx
interface CompletionStepProps {
  config: ChatConfig;
  onStart: () => void;
  onChangeSettings: () => void;
}
```

## Error Handling

### Scenarios

1. **Scan failed**
   - Show: "Не удалось найти локальные серверы"
   - Button: "Выбрать облачный провайдер"
   - Fallback: CloudProviderSetup

2. **No available models**
   - Show: "Нет доступных моделей для этого провайдера"
   - Button: "Выбрать другой провайдер"
   - Fallback: Back to provider selection

3. **Connection error**
   - Show: "Не удалось подключиться к серверу"
   - Button: "Повторить" or "Выбрать другой провайдер"
   - Retry: Rescan/reconnect

4. **Save error**
   - Show: "Не удалось сохранить настройки"
   - Button: "Повторить"
   - Retry: Resave

### Validation

- All fields validated before next step
- Next buttons disabled until valid
- Inline errors shown under fields

## File Structure

```
src/
├── components/
│   └── setupWizard/
│       ├── SetupWizard.tsx
│       ├── ProviderDetectionStep.tsx
│       ├── LocalProviderSetup.tsx
│       ├── CloudProviderSetup.tsx
│       ├── ModelSelectionStep.tsx
│       ├── CompletionStep.tsx
│       └── index.ts
├── hooks/
│   └── useSetupWizard.ts
├── types/
│   └── setup.ts
└── utils/
    └── setupHelpers.ts
```

## Testing Strategy

### Unit Tests

- `SetupWizard` — rendering, step navigation
- `ProviderDetectionStep` — scanning, transitions
- `LocalProviderSetup` — server display
- `CloudProviderSetup` — provider selection
- `ModelSelectionStep` — model selection, filtering
- `CompletionStep` — completion, saving
- `useSetupWizard` — state management, transitions

### Integration Tests

- Full wizard flow
- Error scenarios (no servers, no models, connection errors)
- Settings persistence

### E2E Tests

- New user launches app
- Completes all wizard steps
- Starts chat with selected settings

## Performance Considerations

1. **Lazy loading** — wizard components loaded on demand
2. **Debouncing** — model search debounced 300ms
3. **Memoization** — provider and model lists memoized
4. **Optimistic UI** — show scan results immediately
5. **Cancellation** — can cancel long-running scans

## Accessibility

1. **Keyboard navigation** — Tab/Shift+Tab between steps
2. **ARIA labels** — all interactive elements labeled
3. **Focus management** — focus on first element of each step
4. **Screen reader** — all changes announced
5. **High contrast** — dark/light theme support

## Implementation Notes

1. **Reuse existing components** — `Button`, `Input`, `LoadingSpinner` from `shared/`
2. **Reuse existing hooks** — `useAutoDetect`, `useAIProviders`, `useSettings`
3. **App.tsx integration** — conditional render if no settings
4. **Persistence** — save wizard progress to localStorage (resumable)
5. **Skip option** — experienced users can skip wizard

## Edge Cases

1. **User already has settings** — don't show wizard
2. **Local server starts during wizard** — auto-refresh list
3. **Invalid API key** — show error + retry option
4. **Model deleted** — show error + select another
5. **No internet** — offer only local options

## Success Criteria

1. **Time to first chat** — < 30 seconds for 80% of users
2. **Setup completion rate** — > 90% of users complete wizard
3. **Error rate** — < 5% of users encounter errors
4. **User satisfaction** — > 4/5 stars in reviews

## Next Steps

1. Create implementation plan via writing-plans skill
2. Implement components
3. Write tests
4. Integrate with App.tsx
5. Test with real users
