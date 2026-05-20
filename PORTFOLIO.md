# cvr.name.coder — Portfolio & Feature Comparison

> Autonomous AI coding agent: VS Code Extension + Standalone Server  
> **Stack:** TypeScript 5.8, React 19, Express, Tailwind CSS 4, SQLite  
> **Документация:** [DOCUMENTATION.md](DOCUMENTATION.md) — установка, API, FAQ, деплой

---

## 📊 Сравнение с аналогами (Comparison Matrix)

| Возможность | **cvr.name.coder** | Cursor | GitHub Copilot | Aider | Cline (VS Code) | Windsurf | Continue |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **AI-провайдеры** | **12** (Gemini, OpenAI, Anthropic, DeepSeek, Grok, Groq, Baseten, OpenRouter, Together, Mistral, Local, Custom) | 5 (GPT, Claude, Gemini, custom) | 3 (GPT, Claude, Gemini) | ~10 (через litellm) | 4 (Claude, GPT, Gemini, local) | 4 (GPT, Claude, Gemini, custom) | 7 (через API) |
| **Локальные модели (Ollama)** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **MCP Server (Model Context Protocol)** | ✅ Полноценный сервер | ✅ Только клиент | ⚠️ Через агентов | ❌ | ✅ Только клиент | ❌ | ⚠️ Базовая |
| **MCP Client** | ✅ Подключение к внешним MCP | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Агенты (агентная система)** | **6 встроенных** + кастомные | 1 (Composer) | 1 (Agent mode) | ❌ (1 режим) | 1 | 1 (Cascade) | 1 |
| **Под-агенты (subagents)** | ✅ Параллельные (до 3) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Режимы работы** | **Plan / Build / Review** | Ask / Edit / Agent | Ask / Edit / Agent | Code only | Act / Plan | Write / Chat | Chat / Edit |
| **Петля агента (Agent Loop)** | ✅ OODA-loop, до 20 шагов, авто-прерывание | ❌ (ручные шаги) | ❌ (ручные шаги) | ✅ Авто (до N шагов) | ✅ Авто (до N шагов) | ❌ | ❌ |
| **Планировщик (Planner)** | ✅ Декомпозиция задач + статусы | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Инструменты (Tools)** | **31 встроенный** + кастомные | 6 (поиск, чтение, терминал) | 4 (чтение, поиск) | ~8 | ~10 | ~5 | ~5 |
| **Git-интеграция** | ✅ Status, Diff, Commit, Push, Log | ✅ | ✅ | ✅ Авто-коммит | ❌ | ✅ | ❌ |
| **Браузерная автоматизация (Playwright)** | ✅ Навигация, клики, скриншоты, JS-eval | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Code Review (AI)** | ✅ Структурный + severity + undo | ❌ (только inline) | ✅ (PR review) | ❌ | ❌ | ❌ | ❌ |
| **RAG (поиск по проекту)** | ✅ Эмбеддинги + cosine search | ✅ (индексация) | ⚠️ (через workspace) | ✅ (через embeddings) | ❌ | ✅ | ❌ |
| **Бесконечная память** | ✅ MEMORY.md + USER.md + авто-сжатие | ❌ (только правила) | ❌ (только инструкции) | ✅ (conventions) | ❌ | ⚠️ (правила) | ❌ |
| **Dreamer Engine (семантическое сжатие)** | ✅ Каждые 5 сообщений | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **История изменений (Undo/Redo)** | ✅ Полная + diff | ✅ (локально) | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Кэширование AI-ответов** | ✅ SHA-256 + TTL + LRU | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Cost Tracking** | ✅ По провайдерам + rate cards | ✅ | ❌ | ✅ (статистика) | ✅ | ❌ | ❌ |
| **Сессии (SQLite FTS5)** | ✅ CRUD + полнотекстовый поиск | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Skills (навыки)** | ✅ Загрузка + авто-генерация | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Плагины** | ✅ Манифесты + enable/disable | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Cron-задачи** | ✅ Планировщик задач | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Team Sync (AES-256-GCM)** | ✅ Git/File/API | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Хуки (Hook System)** | ✅ 10 точек + priority | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Валидация (Zod)** | ✅ Все endpoints | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Model Swapping** | ✅ Think/Code/Auto routing | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Project Oracle (авто-индексация)** | ✅ Все файлы → RAG | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Persistent Cache (SQLite)** | ✅ L1+L2 кэширование | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sliding Window + Priority** | ✅ Token budget 128K | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **A/B Prompt Testing** | ✅ Сравнение + judge | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PR Agent** | ✅ Auto-title + description | ⚠️ (только suggestions) | ✅ (PR review) | ❌ | ❌ | ❌ | ❌ |
| **Issue Tracker (Jira/Linear/GH)** | ✅ 3 платформы + CRUD | ❌ | ✅ (только GitHub) | ❌ | ❌ | ❌ | ❌ |
| **CI/CD Pipeline Generator** | ✅ 4 типа + templates | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Self-Hosting (Docker)** | ✅ Dockerfile + Compose | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Web Dashboard** | ✅ Real-time мониторинг | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Логирование** | ✅ 4 уровня + контекст | ✅ (базовое) | ✅ (базовое) | ✅ (базовое) | ✅ (базовое) | ✅ (базовое) | ✅ (базовое) |
| **API Key Middleware** | ✅ Helmet + rate-limit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **i18n (интернационализация)** | ✅ 16 языков | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Геймификация** | ✅ Level, XP, Health, Focus, Coins | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **P2P Collaboration Sync** | ✅ WebSocket + AES-256-GCM | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Agent Marketplace** | ✅ Registry + ratings + reviews | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Голосовой ввод** | ✅ Web Speech API | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Загрузка изображений** | ✅ + Sharp-обработка | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **VS Code Extension** | ✅ Sidebar + inline + completion | ✅ (IDE) | ✅ (extension) | ❌ (CLI) | ✅ (extension) | ✅ (IDE) | ✅ (extension) |
| **Standalone Server** | ✅ Express 127.0.0.1:3000 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Open Source** | ❌ (proprietary) | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Цена** | 🔒 Proprietary | $20/мес | $10/мес | Бесплатно | Бесплатно | $15/мес | Бесплатно |

---

## 🔧 Полный список функций (Feature Inventory)

### 1. AI-провайдеры (12)

| # | Провайдер | Протокол | Стриминг | Изображения | Эмбеддинги |
|---|-----------|----------|----------|-------------|------------|
| 1 | **Google Gemini** | Native SDK | ✅ | ✅ inlineData | ✅ text-embedding-004 |
| 2 | **OpenAI** | REST API | ✅ | ✅ | ❌ |
| 3 | **Anthropic Claude** | Native Messages API | ✅ | ✅ | ❌ |
| 4 | **DeepSeek** | OpenAI-compat | ✅ | ❌ | ❌ |
| 5 | **xAI Grok** | OpenAI-compat | ✅ | ❌ | ❌ |
| 6 | **Groq** | OpenAI-compat | ✅ | ❌ | ❌ |
| 7 | **Baseten** | OpenAI-compat | ✅ | ❌ | ❌ |
| 8 | **OpenRouter** | OpenAI-compat | ✅ | ❌ | ❌ |
| 9 | **Together AI** | OpenAI-compat | ✅ | ❌ | ❌ |
| 10 | **Mistral AI** | OpenAI-compat | ✅ | ❌ | ❌ |
| 11 | **Local (Ollama)** | OpenAI-compat | ✅ | ❌ | ❌ |
| 12 | **Custom** | OpenAI-compat | ✅ | ❌ | ❌ |

### 2. Инструменты (31 встроенный + кастомные)

#### Файловые операции (5)
| Инструмент | Описание |
|------------|----------|
| `read_file` | Чтение содержимого файла |
| `list_directory` | Список файлов и папок |
| `search_files` | Рекурсивный поиск по имени/содержимому |
| `write_file` | Запись/перезапись файла |
| `edit_file` | Точная замена строки в файле |

#### Git (5)
| Инструмент | Описание |
|------------|----------|
| `git_status` | Статус репозитория |
| `git_diff` | Просмотр изменений |
| `git_commit` | Коммит (stage all) |
| `git_push` | Push в remote |
| `git_log` | История коммитов |
| `git_branch` | Создание и переключение ветки |
| `git_branches` | Список всех веток |
| `git_switch_branch` | Переключение на существующую ветку |
| `git_pr_context` | Контекст для создания PR |
| `git_create_pr` | Создание Pull Request (AI-title + desc) |
| `git_list_prs` | Список открытых PR |

#### Issue Tracker (4)
| Инструмент | Описание |
|------------|----------|
| `issue_create` | Создать задачу (Jira/Linear/GitHub) |
| `issue_list` | Список задач с фильтрами |
| `issue_view` | Просмотр задачи по ключу |
| `issue_comment` | Добавить комментарий |

#### Браузер / Playwright (7)
| Инструмент | Описание |
|------------|----------|
| `browser_navigate` | Навигация (HTTP/HTTPS, блокировка localhost) |
| `browser_click` | Клик по CSS-селектору |
| `browser_type` | Ввод текста в поле |
| `browser_screenshot` | Скриншот (base64 PNG) |
| `browser_evaluate` | JavaScript в контексте страницы |
| `browser_get_html` | Полный HTML страницы |
| `browser_close` | Закрытие сессии |

#### Память (2)
| Инструмент | Описание |
|------------|----------|
| `memory_read` | Чтение MEMORY.md / USER.md |
| `memory_write` | Запись в память (с секциями) |

#### Навыки (3)
| Инструмент | Описание |
|------------|----------|
| `skill_list` | Список навыков |
| `skill_read` | Чтение навыка |
| `skill_run` | Запуск навыка |

#### Прочие (3)
| Инструмент | Описание |
|------------|----------|
| `execute_command` | Команда в терминале |
| `rag_search` | Семантический поиск (эмбеддинги) |
| **Custom Tools** | Пользовательские из `.cvr/tools/*.json` |

### 3. Агенты

| ID | Имя | Роль | Права |
|----|-----|------|-------|
| `build` | BUILD | Разработчик (по умолчанию) | Полный доступ |
| `general` | GENERAL | Универсальный ассистент | Полный доступ |
| `explore` | EXPLORE | Исследователь кодовой базы | Только чтение |
| `scout` | SCOUT | Аналитик (документация, зависимости) | Только чтение |
| `prometheus` | PROMETHEUS | Стратегический планировщик | Plan-only |
| `hephaestus` | HEPHAESTUS | Автономный исполнитель | Полный доступ |
| **Custom** | — | Пользовательские из `.cvr/agents/*.md` | Конфигурируемые |

### 4. Режимы работы

| Режим | Описание |
|--------|----------|
| `plan` | Только чтение: `read_file`, `list_directory`, `search_files`. Генерация планов. |
| `build` | Полный доступ: все инструменты. Реализация. |
| `review` | Code Review: анализ diff, структурированные комментарии. Без записи. |

### 5. Серверная архитектура

- **Dual Entry Points**: `server.ts` — standalone Express; `vscode/src/extension.ts` — VS Code встраивание
- **Agent Loop**: OODA-цикл (plan → execute → observe → complete), до 20 шагов, авто-прерывание, авто-генерация навыков
- **Planner**: AI-декомпозиция задачи с зависимостями и статусами (pending/in_progress/completed/failed)
- **Subagent Manager**: Параллельное выполнение под-задач (до 3 одновременных)
- **MCP Server**: Model Context Protocol (stdio/HTTP/SSE), 25 инструментов как MCP tools, файлы как ресурсы
- **MCP Client**: Подключение к внешним MCP-серверам (в VS Code)
- **Plugin System**: Манифесты `.cvr/plugins/*/manifest.json`, enable/disable на лету
- **Multi-Model Swapping**: Dual model routing (think/code/auto), разные модели для разных задач
- **Project Oracle**: Авто-индексация всех файлов проекта в RAG при старте
- **PR Agent**: Auto-generate PR title/description из git diff, создание через `gh cli`
- **Issue Tracker**: Jira / Linear / GitHub Issues — unified API для CRUD задач
- **CI/CD Generator**: Генерация GitHub Actions workflow (4 типа: CI, Docker, CVR Agent, Static Deploy)
- **Prompt Tester**: A/B сравнение промптов с AI-judge, сравнение по quality/efficiency/creativity
- **Context Window**: Token budget (128K) + priority-based trimming (CRITICAL→HIGH→NORMAL→LOW)
- **Gamer State Engine**: Level/XP система, Health/Focus метрики, Coins экономика, localStorage persistence

### 6. Безопасность

- **Permission Engine**: Rule-based (allow/ask/deny), glob-паттерны, last-match-wins, таймаут 5 мин
- **Path Traversal Protection**: `resolveProjectPath()` — блокировка `..` и абсолютных путей
- **Browser Security**: Блокировка localhost/внутренних IP, лимит скриптов 100KB
- **Custom Tool Security**: `node` handler запрещён, фильтр shell-метасимволов
- **API Security**: Helmet + Rate Limiting (120 req/min), optional API key
- **Server Binding**: Только `127.0.0.1`

### 7. Данные и хранение

| Компонент | Хранилище | Возможности |
|-----------|-----------|-------------|
| **Memory Store** | `.opencode-infinite/MEMORY.md` + `USER.md` | Секции, временные метки, атомарная запись |
| **Session Store** | SQLite (WAL) + JSON fallback | CRUD, FTS5 полнотекстовый поиск |
| **RAG Database** | SQLite / JSON | Чанки, эмбеддинги, cosine similarity (score > 0.5) |
| **Project Oracle** | RAG DB (авто) | Фоновая индексация workspace при старте, 30+ расширений |
| **Change History** | `.opencode-infinite/changes.json` | Undo/Redo, до 50 записей, диффы |
| **AI Cache (Persistent)** | SQLite L2 + In-Memory L1 | SHA-256, TTL 60s, LRU eviction, прогрев из БД |
| **Cost Tracker** | `.opencode-infinite/costs.json` | Rate cards по провайдерам, агрегация |
| **Team Sync** | Git / File / API | AES-256-GCM шифрование, авто-синхронизация |
| **Gamer State** | localStorage | Level, XP, Health, Focus, Coins, Streak |

### 8. Дополнительные сервисы

| Сервис | Описание |
|--------|----------|
| **Hook System** | 10 точек (`tool.before/after`, `message.before/after`, `file.write.before/after`, `loop.*`), priority-based |
| **Logger** | 4 уровня (debug/info/warn/error), контекст, тайминги |
| **Image Processor** | Sharp: ресайз (max 1024px), конвертация, валидация (max 5MB) |
| **Cron Scheduler** | Задачи по расписанию: "every N minutes/hours/days" или cron-формат |
| **Validation** | Zod-схемы для всех endpoints |
| **SSE Streaming** | Парсинг буферов, извлечение tool calls |

### 9. React UI (28 компонентов)

#### Chat
`ChatContainer`, `MessageList`, `MessageItem`, `InputArea`, `ImagePreview`, `ImageUploadButton`, `PermissionDialog`, `ReviewMessage`, `SubagentTree`

#### Settings
`SettingsModal`, `SettingsTabs`, `ProviderSelector`, `ModelConfig`, `PresetManager`, `ValidationMessage`, `LanguageSelector`

#### Dashboard
`DashboardPanel`, `DashboardSection`, `StatCard`, `StatusSection`, `GamerStatusBar`, `WebDashboard`

#### Sidebar
`Sidebar`, `CostPanel`, `CronPanel`, `GitPanel`, `MemoryPanel`, `PluginsPanel`, `RulesPanel`, `SessionsPanel`, `SkillsPanel`, `SyncPanel`

#### Shared
`Button`, `Input`, `LoadingSpinner`, `MemoryCard`, `Tooltip`

### 10. React Hooks (22)

`useChat`, `useSettings`, `useMemory`, `useChanges`, `usePermissions`, `useAgentLoop`, `useAIProviders`, `useAutoDetect`, `useBrowserStatus`, `useCosts`, `useCron`, `useGit`, `useHooks`, `usePersistentMemory`, `usePresets`, `useRAG`, `useSessionSearch`, `useSubagents`, `useTeamSync`, `useTools`, `useValidation`, `useVoiceInput`

### 11. API Endpoints (80+)

| Группа | Endpoints |
|--------|-----------|
| **Chat** | `/api/chat`, `/api/history`, `/api/clear` |
| **Memory** | `/api/memory`, `/api/user` |
| **Sessions** | `/api/sessions` (CRUD), `/api/sessions/search` (FTS5) |
| **Skills** | `/api/skills`, `/api/skills/:id` |
| **RAG** | `/api/rag/ingest`, `/api/rag/search`, `/api/rag/sources` |
| **Rules** | `/api/rules`, `/api/rules/:name`, `/api/rules/context` |
| **Tools** | `/api/tools/execute`, `/api/undo`, `/api/redo`, `/api/changes` |
| **Permissions** | `/api/permissions/check`, `/api/permissions/ask`, `/api/permissions/pending`, `/api/permissions/resolve/:id` |
| **Agent Loop** | `/api/agent/loop`, `/api/agent/loop/:id`, `/api/agent/loop/:id/abort`, `/api/agent/plan` |
| **Subagents** | `/api/subagents/spawn`, `/api/subagents`, `/api/subagents/:id/abort` |
| **Review** | `/api/review`, `/api/review/pending`, `/api/review/:id/accept`, `/api/review/:id/reject` |
| **Git** | `/api/git/status`, `/api/git/diff`, `/api/git/commit`, `/api/git/push`, `/api/git/log` |
| **PR Agent** | `/api/git/pr`, `/api/git/pr/context`, `/api/git/pr/list`, `/api/git/branch`, `/api/git/branches` |
| **Browser** | `/api/browser/*` (8 endpoints) |
| **Costs** | `/api/costs`, `/api/costs/reset` |
| **Hooks** | `/api/hooks`, `/api/hooks/register`, `/api/hooks/unregister` |
| **Cron** | `/api/cron`, `/api/cron/:id`, `/api/cron/:id/enable`, `/api/cron/:id/disable` |
| **Plugins** | `/api/plugins`, `/api/plugins/:id/enable`, `/api/plugins/:id/disable` |
| **Sync** | `/api/sync/status`, `/api/sync/export`, `/api/sync/import`, `/api/sync/config`, `/api/sync/resolve` |
| **Health** | `/api/health` (stats + system info) |
| **Issue Tracker** | `/api/tracker/config`, `/api/tracker/issues` (CRUD + comments) |
| **CI/CD** | `/api/ci/generate`, `/api/ci/templates` |
| **Prompt Testing** | `/api/prompt-test` (A/B comparison with judge) |
| **P2P Sync** | `/api/p2p/status`, `/api/p2p/peers`, `/api/p2p/shares`, `/api/p2p/share` |
| **Marketplace** | `/api/marketplace` (list + search + stats), `/api/marketplace/:id` (download/delete), `/api/marketplace/publish`, `/api/marketplace/:id/review`, `/api/marketplace/:id/reviews` |
| **VS Code** | `/api/workspace`, `/api/workspace/read`, `/api/workspace/write`, `/api/diff`, `/api/changes/:id/diff`, `/api/sessions/save`, `/api/sessions/load`, `/api/mcp-config`, `/api/mcp-call`, `/api/mcp-refresh`, `/api/edit/inline`, `/api/completions` |

### 12. VS Code Extension

| Команда | Описание | Горячие клавиши |
|---------|----------|-----------------|
| `cvr.launch` | Запуск Dashboard | — |
| `cvr.openSidebar` | Открыть боковую панель | `Ctrl+Shift+C` |
| `cvr.clearHistory` | Очистить историю и память | — |
| `cvr.inlineEdit` | Inline-редактирование | `Ctrl+K Ctrl+K` |
| `cvr.startMcpServer` | Запуск MCP-сервера | — |

**VS Code Providers:** `CvrInlineCompletionProvider`, `DiffViewProvider`, `DiagnosticsProvider`, `InlineEditProvider`

**Настройки:** completion.enabled, completion.provider, completion.model, completion.debounceMs, diff.enabled, diagnostics.enabled

### 14. Новые модули (Phase 2+3, 2026-05-20)

| Модуль | Файл | Назначение |
|--------|------|------------|
| **Persistent Cache** | `src/server/cache.ts` | L1 in-memory + L2 SQLite (WAL), SHA-256 + TTL, прогрев из БД |
| **Multi-Model Swapping** | `src/server/providers.ts` | Dual model routing: think/code/auto, разные модели для задач |
| **Project Oracle** | `src/server/projectOracle.ts` | Фоновое авто-индексирование workspace (30+ типов) в RAG |
| **Context Window** | `src/server/contextWindow.ts` | Token budget 128K, priority-based trimming (5 priority levels) |
| **A/B Prompt Tester** | `src/server/promptTester.ts` | Запуск N вариантов промпта + AI-judge сравнение |
| **PR Agent** | `src/server/prAgent.ts` | gatherPRContext → generatePRDescription → createPR (gh CLI) |
| **Issue Tracker** | `src/server/issueTracker.ts` | Unified API: GitHub Issues / Jira REST API v3 / Linear GraphQL |
| **CI/CD Generator** | `src/server/ciPipeline.ts` | 4 типа: node-ci / docker-deploy / cvr-agent / static-deploy |
| **Web Dashboard** | `src/components/dashboard/WebDashboard.tsx` | Real-time: heap, cache hit rate, requests, active loops, errors |
| **Gamer Engine** | `src/server/gamerState.ts` | Level/XP, Health/Focus, Coins, localStorage persistence |
| **Gamer Status Bar** | `src/components/dashboard/GamerStatusBar.tsx` | Optimal badge, Health/Focus bars, Coins, LVL в header |
| **Deployment** | `Dockerfile`, `docker-compose.yml`, `deploy.sh` | Self-hosting: Docker Compose, Nginx proxy, healthcheck |
| **P2P Collaboration** | `src/server/p2pSync.ts` | WebSocket peer-to-peer, encrypted share (AES-256-GCM), room-based |
| **Agent Marketplace** | `src/server/agentMarketplace.ts` | Registry: publish/download/rate/review agents, skills, plugins, rules |

### 15. Интернационализация

16 языков: 🇬🇧 English, 🇷🇺 Русский, 🇪🇸 Español, 🇨🇳 中文, 🇩🇪 Deutsch, 🇫🇷 Français, 🇵🇹 Português, 🇮🇹 Italiano, 🇯🇵 日本語, 🇰🇷 한국어, 🇸🇦 العربية, 🇹🇷 Türkçe, 🇵🇱 Polski, 🇺🇦 Українська, 🇻🇳 Tiếng Việt, 🇮🇳 हिन्दी

---

## 🗺️ Дорожная карта (Roadmap)

> **Общий прогресс: 35/37 пунктов (95%)**  
> Phase 1: ✅ 18/18  ·  Phase 2: ✅ 10/10  ·  Phase 3: 🔄 7/9

---

### ✅ Phase 1: Фундамент — 18/18 (100%)

<details><summary>Все пункты выполнены</summary>

- [x] Локальное хранение (JSON + SQLite)
- [x] Автономная рекурсивная петля (Agent Loop OODA)
- [x] Мультиязычный интерфейс (16 языков)
- [x] 12 AI-провайдеров
- [x] 25+ инструментов
- [x] MCP Server + Клиент
- [x] Система агентов + под-агентов
- [x] Plan / Build / Review режимы
- [x] Permission Engine (allow/ask/deny)
- [x] Dreamer Engine (семантическое сжатие каждые 5 сообщений)
- [x] VS Code Extension (sidebar + inline + completion)
- [x] Code Review System (structured + severity + undo)
- [x] RAG поиск (эмбеддинги + cosine similarity)
- [x] Браузерная автоматизация (Playwright)
- [x] Git-интеграция (status/diff/commit/push/log)
- [x] Плагины + Хуки (10 точек, priority-based)
- [x] Team Sync (AES-256-GCM, git/file/api)
- [x] Cost Tracking (rate cards по провайдерам)

</details>

---

### ✅ Phase 2: Интеллект — 10/10 (100%)

<details><summary>Все пункты выполнены</summary>

- [x] Subagent Manager (параллельное выполнение, до 3)
- [x] Code Review с structured feedback
- [x] Skills авто-генерация (из успешных агент-циклов)
- [x] Inline Completions в VS Code
- [x] Multi-Model Swapping (think/code/auto routing)
- [x] Project Oracle (авто-индексация workspace → RAG)
- [x] Кэширование AI-ответов с персистентностью (SQLite L1+L2)
- [x] Sliding Window + Priority (token budget 128K)
- [x] A/B тестирование промптов (AI-judge сравнение)
- [x] Геймификация (Level/XP, Health/Focus, Coins, Streak)

</details>

---

### 🔄 Phase 3: Экосистема — 7/9 (78%)

| # | Статус | Пункт | Модуль |
|---|--------|-------|--------|
| 1 | ✅ | PR Agent (авто-PR с AI-title + description) | `prAgent.ts` |
| 2 | ✅ | Issue Tracker (Jira + Linear + GitHub Issues) | `issueTracker.ts` |
| 3 | ✅ | CI/CD Pipeline Generator (4 типа workflows) | `ciPipeline.ts` |
| 4 | ✅ | Self-Hosting Gateway (Docker + deploy.sh) | `Dockerfile`, `docker-compose.yml` |
| 5 | ✅ | Web Dashboard (real-time мониторинг) | `WebDashboard.tsx` |
| 6 | ✅ | P2P Collaboration Sync (WebSocket + AES-256-GCM) | `p2pSync.ts` |
| 7 | ✅ | Agent Marketplace (registry + ratings + reviews) | `agentMarketplace.ts` |
| 8 | ⚪ | Fine-tuning custom models | _отдельный проект_ |
| 9 | ⚪ | Мобильное приложение (React Native) | _отдельный проект_ |

---

### 🔮 Phase 4: Будущее (Beyond Scope)

| # | Пункт | Почему за пределами |
|---|-------|---------------------|
| 1 | **Fine-tuning custom models** | Требует ML-инфраструктуру (GPU, датасеты, training pipeline). Не влезает в IDE-расширение. Выносится в отдельный сервис `cvr-trainer`. |
| 2 | **Мобильное приложение** | Отдельный React Native проект `cvr-mobile`. Использует API текущего сервера. |
| 3 | **VS Code Marketplace публикация** | Готово технически — нужен процесс ревью и публикации в Microsoft Marketplace. |
| 4 | **Web Dashboard (публичный хост)** | Готово — нужен домен и хостинг для dashboard.cvr.name. |
| 5 | **OpenTelemetry трассировка** | Расширение Logger → OTLP exporter для Jaeger/Grafana. |
| 6 | **Голосовой вывод (TTS)** | Расширение Web Speech API → ответы голосом. |
| 7 | **Локальный векторный store (ChromaDB/Qdrant)** | Замена SQLite RAG → высокопроизводительный vector store. |

### 📈 Метрики успеха

| Метрика | Было (Phase 1) | Стало (Phase 3) |
|---------|:---:|:---:|
| Инструментов | 25 | **31** |
| AI-провайдеров | 12 | **12** |
| API endpoints | 60 | **100+** |
| Агентов | 6 | **6 + кастомные** |
| React компонентов | 26 | **28** |
| Языков UI | 16 | **16** |
| Контекстное окно | ~10 сообщений | **128K токенов (priority)** |
| Кэш AI-ответов | in-memory | **L1+L2 SQLite** |
| Интеграций | Git, MCP | **Git, PR, Jira, Linear, GH Issues, CI/CD, Docker, P2P** |
| Завершённость roadmap | 18/37 (49%) | **35/37 (95%)** |

---

## 📐 Архитектурная схема

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                         │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────┐ │
│  │ VS Code  │  │  Browser  │  │  API Clients (MCP)    │ │
│  │ Extension │  │  (React)  │  │                       │ │
│  └────┬─────┘  └─────┬─────┘  └───────────┬───────────┘ │
└───────┼──────────────┼────────────────────┼──────────────┘
        │              │                    │
┌───────┴──────────────┴────────────────────┴──────────────┐
│                     SERVER LAYER                           │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────┐ │
│  │ Express  │  │  MCP      │  │  Agent Loop            │ │
│  │ (80+ API)│  │  Server   │  │  (OODA)                │ │
│  └────┬─────┘  └─────┬─────┘  └───────────┬───────────┘ │
│       │              │                    │               │
│  ┌────┴──────────────┴────────────────────┴───────────┐  │
│  │              SERVICE LAYER                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Tools    │ │ Planner  │ │ Permissions│          │  │
│  │  │ (31)     │ │          │ │ Engine    │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Memory   │ │ RAG +    │ │ Cache    │           │  │
│  │  │ Store    │ │ Oracle   │ │ (L1+L2)  │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ PR Agent │ │ Issue    │ │ CI/CD    │           │  │
│  │  │          │ │ Tracker  │ │ Generator│           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Prompt   │ │ Context  │ │ Gamer    │           │  │
│  │  │ Tester   │ │ Window   │ │ Engine   │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Hooks    │ │ Cron     │ │ Plugins  │           │  │
│  │  │ (10 pts) │ │ Scheduler│ │ System   │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  ┌──────────┐ ┌──────────┐                         │  │
│  │  │ P2P Sync │ │ Agent    │                         │  │
│  │  │ (WS+AES) │ │ Market   │                         │  │
│  │  └──────────┘ └──────────┘                         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
        │              │                    │
┌───────┴──────────────┴────────────────────┴──────────────┐
│                    PROVIDER LAYER                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐ │
│  │ Gemini  │ │ OpenAI  │ │ Claude  │ │ 9x OpenAI-    │ │
│  │ (native)│ │ (REST)  │ │(native) │ │ Compatible    │ │
│  └─────────┘ └─────────┘ └─────────┘ └───────────────┘ │
└──────────────────────────────────────────────────────────┘
        │
┌───────┴──────────────────────────────────────────────────┐
│                    DATA LAYER                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ SQLite   │ │ JSON     │ │ MEMORY.md│ │ .opencode-   ││
│  │ (WAL)    │ │ (fallback)│ │ /USER.md │ │ infinite/    ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## 🏆 Ключевые преимущества перед аналогами

1. **Максимальное количество AI-провайдеров (12)** — больше, чем у любого конкурента
2. **Полноценный MCP-сервер + клиент** — уникальная комбинация, не имеющая аналогов
3. **Система под-агентов** — параллельное выполнение задач (до 3 одновременно)
4. **Dreamer Engine** — единственное решение с семантическим сжатием контекста каждые 5 сообщений
5. **3 режима работы** — Plan / Build / Review с разными правами
6. **Multi-Model Swapping** — разные модели для мышления и кодинга (think/code/auto)
7. **PR Agent** — автоматическое создание PR с AI-сгенерированным заголовком и описанием
8. **Issue Tracker** — единый интерфейс для Jira, Linear и GitHub Issues (CRUD + комментарии)
9. **CI/CD Generator** — 4 типа GitHub Actions workflow из коробки
10. **Persistent Cache** — двухуровневое кэширование AI-ответов (in-memory + SQLite)
11. **Project Oracle** — авто-индексация проекта в RAG при старте (30+ типов файлов)
12. **Sliding Window** — умное контекстное окно 128K с приоритетами (CRITICAL→LOW)
13. **A/B Prompt Testing** — сравнение промптов с AI-judge (quality/efficiency/creativity)
14. **Self-Hosting** — Docker Compose + deploy.sh (развёртывание в 1 команду)
15. **Web Dashboard** — real-time мониторинг сервера (heap, cache hit rate, requests)
16. **Геймификация** — Level/XP система, Health/Focus метрики, Coins экономика
17. **16 языков интерфейса** — максимальный охват аудитории

---

*Документ сгенерирован: 2026-05-20 | Версия: 2.0 | Phase 1+2 завершены, Phase 3 — 7/9*
