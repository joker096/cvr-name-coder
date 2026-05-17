# cvr.name.coder

> Advanced autonomous AI coding agent with persistent memory, streaming responses, and local LLM support. Runs inside VS Code as a fully self-contained extension.

## 🚀 What Is This?

An AI coding assistant that runs **entirely inside VS Code** as a sidebar extension. No external servers, no setup, no cloud dependency — just install the `.vsix` and start coding with AI.

## ✨ Quick Start

1. Install the extension from `.vsix`
2. Click the **cvr.name** icon in the Activity Bar
3. If you have Ollama running, it auto-detects — just start chatting
4. Or configure a cloud provider (Gemini, DeepSeek, Groq) in Settings

## 🎯 Key Features

- **Streaming** — AI output appears in real time, token by token
- **Cancel** — Stop in-flight requests with one click
- **Multi-session** — Switch between saved conversations
- **Workspace files** — Agent reads your project files and structure
- **Local AI** — Works offline with Ollama, llama.cpp, LM Studio
- **Cloud AI** — Gemini, OpenAI, Anthropic, DeepSeek, Groq
- **MCP tools** — Connect external tool servers
- **Persistent memory** — Long-term knowledge with auto-compression
- **Autonomous loop** — Agent triggers itself for multi-step tasks
- **Multi-agent system** — Specialized agents for different tasks
- **Code analysis** — Deep project structure analysis and optimization

## 🏗️ Architecture

### High-Level Architecture

```
VS Code Extension Host
  └─ Express server (internal)
     ├─ /api/chat — SSE streaming
     ├─ /api/workspace — file tree, read, write
     ├─ /api/sessions — save/load conversations
     ├─ /api/mcp-* — MCP tool server
     └─ Static React SPA
```

### Component Architecture

The application follows a modular component-based architecture with clear separation of concerns:

```
src/
├── components/
│   ├── chat/           # Chat-related components
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   └── InputArea.tsx
│   ├── settings/       # Settings-related components
│   │   ├── SettingsModal.tsx
│   │   ├── SettingsTabs.tsx
│   │   ├── ProviderSelector.tsx
│   │   ├── ModelConfig.tsx
│   │   ├── PresetManager.tsx
│   │   └── ValidationMessage.tsx
│   ├── sidebar/        # Sidebar components
│   │   ├── Sidebar.tsx
│   │   ├── MemoryPanel.tsx
│   │   └── SkillsPanel.tsx
│   └── shared/         # Reusable components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── LoadingSpinner.tsx
│       ├── Tooltip.tsx
│       └── MemoryCard.tsx
├── hooks/              # Custom React hooks
│   ├── useSettings.ts
│   ├── useChat.ts
│   ├── useMemory.ts
│   ├── useAIProviders.ts
│   ├── useAutoDetect.ts
│   ├── useValidation.ts
│   └── usePresets.ts
├── services/           # Business logic services
│   ├── storageService.ts
│   ├── validationService.ts
│   └── presetService.ts
├── types/              # TypeScript type definitions
│   ├── chat.ts
│   ├── settings.ts
│   └── ai.ts
├── utils/              # Utility functions
│   ├── constants.ts
│   ├── formatters.ts
│   ├── apiHelpers.ts
│   └── cn.ts
└── App.tsx             # Main application component (176 lines)
```

### Key Design Principles

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusable Components**: Shared components are in the `shared/` directory
3. **Custom Hooks**: Business logic is encapsulated in custom hooks
4. **Type Safety**: Full TypeScript coverage with strict type checking
5. **Testability**: All components and hooks are designed for easy testing

### State Management

State is managed using React hooks and localStorage for persistence:

- **Settings**: `useSettings` hook manages application settings
- **Chat**: `useChat` hook manages chat state and AI interactions
- **Memory**: `useMemory` hook manages persistent memory clusters
- **AI Providers**: `useAIProviders` hook manages AI provider configurations

### Data Flow

```
User Input → Component → Hook → Service → localStorage/API
                ↓
            State Update
                ↓
            Component Re-render
```

## 📦 Installation

See [VSCODE_EXTENSION.md](VSCODE_EXTENSION.md) for detailed installation instructions.

## 💻 Development

### Setup

```bash
# Root project (frontend)
npm install
npm run dev

# VS Code extension
cd vscode
npm install
npm run build
npx @vscode/vsce package
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Clean build artifacts
npm run clean
```

### Code Quality

The project follows strict code quality standards:

- **TypeScript**: Strict type checking with `tsc --noEmit`
- **ESLint**: Code linting for consistency and error detection
- **Prettier**: Code formatting for consistent style
- **Testing**: Comprehensive test coverage for all components and hooks

### Development Workflow

1. Create a new branch for your feature
2. Write tests first (TDD approach)
3. Implement the feature
4. Run tests and ensure they pass
5. Run type checking and fix any errors
6. Format code with Prettier
7. Commit changes with descriptive messages
8. Create a pull request for review

## 🔧 Configuration

### Local AI Setup

**Ollama:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Start server
ollama serve
```

**llama.cpp:**
```bash
# Build llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Start server
./llama-server --port 8080 --model /path/to/model.gguf
```

### Cloud AI Setup

Configure API keys in Settings:
- **Gemini**: Get key from [AI Studio](https://makersuite.google.com/app/apikey)
- **DeepSeek**: Get key from [platform.deepseek.com](https://platform.deepseek.com/)
- **Groq**: Get key from [console.groq.com](https://console.groq.com/)

## 🎨 Features

### Multi-Agent System
- **Build Agent** — Default developer for coding tasks
- **Research Agent** — External documentation research
- **DevOps Agent** — CI/CD and deployment automation
- **Scout Agent** — Codebase exploration and analysis
- **Prometheus Agent** — Strategic planning and architecture

### Memory System
- **Persistent clusters** — Long-term knowledge storage
- **Auto-compression** — Efficient memory management
- **Semantic search** — Quick context retrieval

### Commands
- `/analyze` — Deep project structure analysis
- `/fix` — Scan and repair code anomalies
- `/optimize` — Code complexity optimization
- `/audit` — Security and best practices audit
- `/explain` — Decode logic and architecture
- `/refactor` — Optimize and clean code

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run TypeScript linter
npm run type-check   # Type checking only
npm run format       # Format code with Prettier
npm run clean        # Clean build artifacts
```

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Express.js, Node.js
- **AI Integration**: Google GenAI SDK, OpenAI-compatible APIs
- **State Management**: React hooks, localStorage
- **Code Highlighting**: react-syntax-highlighter
- **Animations**: Framer Motion

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.
