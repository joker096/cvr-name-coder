# cvr.name.coder — Documentation

> Autonomous AI coding agent: VS Code Extension + Standalone Server  
> **v1.4.0** · TypeScript 5.8 · React 19 · Express · Tailwind CSS 4 · SQLite

---

## 📑 Содержание

1. [Установка](#1-установка)
2. [Настройка БД](#2-настройка-бд)
3. [API Документация](#3-api-документация)
4. [FAQ](#4-faq)
5. [Развёртывание](#5-развёртывание)

---

## 1. Установка

### Системные требования

| Требование | Минимум |
|-----------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 9 |
| Git | ≥ 2.30 |
| OS | Windows 10+, macOS 12+, Linux (x64/arm64) |

### Быстрый старт

```bash
# 1. Клонируем репозиторий
git clone https://github.com/cvr-name/cvr.name.coder.git
cd cvr.name.coder

# 2. Устанавливаем зависимости
npm install

# 3. Настраиваем API-ключи
cp .env.example .env
# Отредактируйте .env: добавьте хотя бы один ключ

# 4. Запускаем dev-сервер
npm run dev
# → http://127.0.0.1:3000
```

### Файл `.env`

```env
# Минимум один провайдер
GEMINI_API_KEY=AIza...            # Google Gemini (рекомендуется)
# OPENAI_API_KEY=sk-...           # OpenAI
# ANTHROPIC_API_KEY=sk-ant-...    # Anthropic Claude
# DEEPSEEK_API_KEY=sk-...         # DeepSeek

# Опционально
CVR_ORACLE_ENABLED=true           # Авто-индекс проекта в RAG
CVR_P2P_ENABLED=false             # P2P синхронизация
CVR_P2P_SECRET=your-secret        # Ключ P2P комнаты
PORT=3000                         # Порт сервера
```

### Установка VS Code расширения

```bash
# Из исходников
cd vscode
npm install
npm run build
npm run package
# → cvr-name-coder-1.5.0.vsix

# Установка в VS Code:
# Ctrl+Shift+P → "Extensions: Install from VSIX..." → выберите файл
```

Или из VS Code Marketplace (скоро):

```
Extensions (Ctrl+Shift+X) → поиск "cvr.name.coder" → Install
```

---

## 2. Настройка БД

cvr.name.coder использует SQLite с WAL-режимом для всех хранилищ. Никакой настройки не требуется — базы создаются автоматически.

### Структура хранения

```
.opencode-infinite/
├── cache.db          # Кэш AI-ответов (L2 SQLite)
├── sessions.db       # Сессии чата (FTS5 полнотекстовый поиск)
├── rag.db            # RAG: чанки + эмбеддинги
├── changes.json      # История изменений (undo/redo)
├── costs.json        # Cost tracking
├── history.json      # История сообщений
├── MEMORY.md         # Память проекта (авто-сжатие Dreamer Engine)
└── USER.md           # Пользовательские настройки

.cvr/
├── agents/           # Кастомные агенты (*.md)
├── skills/           # Навыки (авто-генерируемые)
├── tools/            # Кастомные инструменты (*.json)
├── plugins/          # Плагины (manifest.json)
├── rules/            # Правила инструкций
├── marketplace/      # Локальный маркетплейс
│   ├── index.json    # Реестр агентов/навыков
│   ├── reviews.json  # Отзывы и рейтинг
│   └── packages/     # Пакеты
├── permissions.json  # Настройки разрешений
└── sync.json         # Конфигурация синхронизации
```

### Кэш AI-ответов

Двухуровневое кэширование: L1 in-memory + L2 SQLite.

```bash
# Просмотр статистики кэша
curl http://127.0.0.1:3000/api/health
# → "stats": { "cacheHits": 42, "cacheMisses": 8, ... }
```

Параметры кэша (в `src/server/cache.ts`):
- TTL: 60 секунд
- Алгоритм: SHA-256 хеш от prompt + contents
- Eviction: LRU (least recently used)
- In-memory: до 1000 записей
- SQLite: безлимитно, с прогревом при старте

### Сессии

```bash
# Создать сессию
curl -X POST http://127.0.0.1:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project"}'

# Поиск по сессиям (полнотекстовый)
curl "http://127.0.0.1:3000/api/sessions/search?q=react"
```

### RAG база

```bash
# Загрузить документ
curl -X POST http://127.0.0.1:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{"source": "docs/api.md", "content": "## API Reference\n..."}'

# Поиск
curl -X POST http://127.0.0.1:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to configure cache"}'
```

### Project Oracle (авто-индексация)

При старте сервера все текстовые файлы проекта автоматически индексируются в RAG:

```bash
# Включено по умолчанию. Отключить:
CVR_ORACLE_ENABLED=false npm run dev

# Индексируемые расширения (30+):
# .ts .tsx .js .jsx .json .md .css .html .yml .yaml
# .py .rs .go .java .kt .swift .rb .php .sh .sql
# .env .cfg .ini .toml .graphql .proto .prisma
# и другие...
```

---

## 3. API Документация

Базовый URL: `http://127.0.0.1:3000/api`

### Health Check

```bash
GET /api/health
```

```json
{
  "status": "ok",
  "uptime": 3600.5,
  "timestamp": "2026-05-20T12:00:00Z",
  "version": "1.4.0",
  "stats": {
    "uptime": 3600,
    "requests": 142,
    "cacheHits": 89,
    "cacheMisses": 12,
    "activeLoops": 0,
    "toolCalls": 47,
    "errors": 0,
    "memorySize": 47185920
  },
  "system": {
    "nodeVersion": "v20.11.0",
    "platform": "win32",
    "pid": 12345,
    "memory": {
      "heapUsed": 47185920,
      "heapTotal": 65011712,
      "rss": 104857600
    },
    "startTime": "2026-05-20T08:00:00Z"
  }
}
```

### Chat — Отправка сообщения

```bash
POST /api/chat
Content-Type: application/json
```

```json
{
  "message": "Create a React button component",
  "config": {
    "aiProvider": "gemini",
    "aiModel": "gemini-2.0-flash",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "agent": "build",
  "images": []
}
```

```json
// Response (SSE Streaming)
{"content": "I'll create a..."}
{"content": "Button component..."}
{"content": "```tsx\nimport..."}
```

### Chat — История

```bash
GET /api/history
# → [{ "role": "user", "content": "...", "createdAt": "..." }, ...]

POST /api/clear
# → {"cleared": true}
```

### Agent Loop — Запуск автономного агента

```bash
POST /api/agent/loop
Content-Type: application/json
```

```json
{
  "goal": "Add dark mode toggle to settings",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

```json
// Response
{
  "id": "loop-abc123",
  "state": {
    "goal": "Add dark mode toggle to settings",
    "steps": [],
    "status": "running",
    "currentStep": 0,
    "maxSteps": 20
  }
}
```

```bash
# Проверить состояние
GET /api/agent/loop/loop-abc123

# Прервать
POST /api/agent/loop/loop-abc123/abort
```

### Subagents — Параллельные задачи

```bash
POST /api/subagents/spawn
Content-Type: application/json
```

```json
{
  "goal": "Write unit tests for Button component",
  "agentConfig": {
    "id": "test-writer",
    "name": "Test Writer",
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "tools": ["read_file", "write_file", "execute_command"],
    "mode": "subagent"
  }
}
```

### Code Review

```bash
POST /api/review
Content-Type: application/json
```

```json
{
  "diff": "--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -1,4 +1,4 @@\n-const x = 1;\n+const x = eval(userInput);",
  "config": {
    "aiProvider": "gemini",
    "aiModel": "gemini-2.0-flash"
  }
}
```

```json
// Response
{
  "comments": [
    {
      "id": "rev-1",
      "category": "security",
      "severity": "critical",
      "file": "src/App.tsx",
      "line": 1,
      "message": "eval() with user input is a security vulnerability.",
      "suggestion": "Use JSON.parse() or a proper parser instead."
    }
  ],
  "summary": "1 critical issue found"
}
```

### Git — Управление репозиторием

```bash
# Статус
GET /api/git/status
# → {"branch": "master", "ahead": 2, "behind": 0, "modified": [...], ...}

# Diff
GET /api/git/diff
GET /api/git/diff?staged=true

# Коммит
POST /api/git/commit
{"message": "feat: add dark mode"}

# Push
POST /api/git/push

# Лог
GET /api/git/log?limit=5

# Ветки
POST /api/git/branch
{"name": "feature/dark-mode"}

GET /api/git/branches
```

### PR Agent — Автоматический Pull Request

```bash
# Получить контекст для PR (diff, commits, файлы)
GET /api/git/pr/context

# Создать PR с AI-сгенерированным заголовком и описанием
POST /api/git/pr
{"draft": false}

# Ответ:
{
  "context": {
    "branch": "feature/dark-mode",
    "baseBranch": "main",
    "diff": "...",
    "commits": "- abc123: feat: add dark mode toggle\n- ...",
    "changedFiles": ["src/App.tsx", "src/index.css"],
    "ahead": 2,
    "behind": 0
  },
  "pr": {
    "title": "feat: add dark mode toggle to application",
    "description": "## Summary\n\nAdded dark mode support...",
    "prUrl": "https://github.com/user/repo/pull/42"
  }
}
```

Требуется `gh` CLI: `gh auth login`

### Issue Tracker (Jira / Linear / GitHub Issues)

```bash
# Настроить трекер
POST /api/tracker/config
{
  "type": "github",
  "token": "ghp_...",
  "repo": "owner/repo",
  "project": "PROJ"
}

# Или Jira:
{
  "type": "jira",
  "token": "your-jira-api-token",
  "baseUrl": "https://company.atlassian.net",
  "project": "PROJ"
}

# Или Linear:
{
  "type": "linear",
  "token": "lin_api_...",
  "project": "team-id"
}

# Создать задачу
POST /api/tracker/issues
{
  "title": "Fix login page redirect",
  "description": "After login, user should go to dashboard",
  "priority": "high",
  "labels": ["bug", "frontend"]
}

# Список задач
GET /api/tracker/issues?status=open&limit=10

# Просмотр
GET /api/tracker/issues/PROJ-123

# Комментарий
POST /api/tracker/issues/PROJ-123/comment
{"body": "Fixed in PR #42"}
```

### CI/CD — Генерация пайплайнов

```bash
# Шаблоны
GET /api/ci/templates

# Сгенерировать CI
POST /api/ci/generate
{
  "pipelineType": "node-ci",
  "projectName": "my-app",
  "nodeVersion": "20",
  "buildCommand": "npm run build",
  "testCommand": "npm test",
  "lintCommand": "npm run lint",
  "typeCheckCommand": "npm run type-check"
}
# → Создаст .github/workflows/ci.yml

# Типы пайплайнов:
# "node-ci"       — type-check, lint, test, build
# "docker-deploy" — Docker build + push
# "cvr-agent"     — CVR агент в CI (реагирует на issues/PRs)
# "static-deploy" — Deploy на GitHub Pages/Vercel/Cloudflare
```

### P2P Collaboration Sync

```bash
# Запуск с P2P (env var)
CVR_P2P_ENABLED=true CVR_P2P_SECRET=room-secret npm run dev

# Статус P2P сети
GET /api/p2p/status
# → {"active": true, "peers": [{"id": "peer-abc", "name": "Alice"}], "shares": 3}

# Список пиров
GET /api/p2p/peers

# Поделиться фрагментом
POST /api/p2p/share
{
  "type": "skill",
  "name": "React Component Generator",
  "content": "# Skill: React Component Generator\n..."
}

# Получить все shares
GET /api/p2p/shares?type=skill
```

### Agent Marketplace

```bash
# Все элементы (с фильтрацией)
GET /api/marketplace
GET /api/marketplace?type=agent
GET /api/marketplace?tag=react
GET /api/marketplace?search=testing

# Опубликовать
POST /api/marketplace/publish
{
  "type": "skill",
  "name": "API Client Generator",
  "description": "Generates typed API clients from OpenAPI specs",
  "content": "# Skill: API Client Generator\n...",
  "author": "cvr-team",
  "version": "1.0.0",
  "tags": ["api", "openapi", "typescript"]
}

# Скачать
GET /api/marketplace/skill-api-client-generator-abc123

# Оценить
POST /api/marketplace/:id/review
{"rating": 5, "text": "Works perfectly!", "author": "dev123"}

# Отзывы
GET /api/marketplace/:id/reviews

# Статистика
GET /api/marketplace/stats
# → {"total": 15, "byType": {"skill": 8, "agent": 4, "plugin": 3}, "totalDownloads": 120}
```

### A/B Prompt Testing

```bash
POST /api/prompt-test
Content-Type: application/json
```

```json
{
  "task": "Write a function that validates email addresses in TypeScript",
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "variants": [
    {
      "name": "Concise",
      "systemPrompt": "You are a senior TypeScript developer. Write clean, concise code."
    },
    {
      "name": "Detailed",
      "systemPrompt": "You are a senior TypeScript developer. Write code with detailed JSDoc comments and edge case handling."
    },
    {
      "name": "Tests-First",
      "systemPrompt": "You are a senior TypeScript developer. Always include unit tests with your code."
    }
  ]
}
```

```json
// Response
{
  "task": "Write a function that validates...",
  "timestamp": "2026-05-20T12:00:00.000Z",
  "variants": [
    {
      "variantName": "Concise",
      "output": "function validateEmail(email: string): boolean { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }",
      "inputTokens": 45,
      "outputTokens": 25,
      "timeMs": 320
    },
    {
      "variantName": "Detailed",
      "output": "/**\n * Validates an email address...\n */\nfunction validateEmail(email: string): boolean {\n  if (!email) return false;\n  // ...\n}",
      "inputTokens": 52,
      "outputTokens": 120,
      "timeMs": 580
    },
    {
      "variantName": "Tests-First",
      "output": "import { describe, it, expect } from 'vitest';\n// tests...\nfunction validateEmail...",
      "inputTokens": 55,
      "outputTokens": 210,
      "timeMs": 720
    }
  ],
  "comparison": {
    "winner": "Detailed",
    "reasoning": "Best balance of code quality and documentation.",
    "scores": {
      "Concise": { "quality": 6, "efficiency": 9, "creativity": 5 },
      "Detailed": { "quality": 9, "efficiency": 7, "creativity": 7 },
      "Tests-First": { "quality": 8, "efficiency": 6, "creativity": 8 }
    }
  }
}
```

### Memory

```bash
# Чтение памяти
GET /api/memory
# → {"content": "...", "sections": {...}}

# Запись
POST /api/memory
{"content": "New memory entry", "section": "architecture"}

# Пользовательские настройки
GET /api/user
POST /api/user
{"content": "I prefer functional components with hooks"}
```

### Tools — Выполнение

```bash
POST /api/tools/execute
{
  "toolCall": {
    "name": "read_file",
    "params": { "path": "src/App.tsx" }
  },
  "mode": "build"
}

# Инструменты (31):
# read_file, write_file, edit_file, list_directory, search_files
# execute_command, memory_read, memory_write
# skill_list, skill_read, skill_run
# rag_search
# git_status, git_diff, git_commit, git_push, git_log
# git_branch, git_branches, git_switch_branch
# git_pr_context, git_create_pr, git_list_prs
# issue_create, issue_list, issue_view, issue_comment
# browser_navigate, browser_click, browser_type
# browser_screenshot, browser_evaluate, browser_get_html, browser_close
```

### Undo / Redo

```bash
GET /api/changes
# → [{ "id": "ch-1", "type": "write_file", "file": "src/App.tsx", ... }]

POST /api/undo
# → {"undone": "ch-1"}

POST /api/redo
# → {"redone": "ch-1"}
```

---

## 4. FAQ

### Общие

**Q: Какие AI-провайдеры поддерживаются?**  
12 провайдеров: Gemini, OpenAI, Anthropic, DeepSeek, xAI Grok, Groq, Baseten, OpenRouter, Together AI, Mistral AI, Local (Ollama), Custom (OpenAI-compat). Полный список — в `PORTFOLIO.md`.

**Q: Можно использовать офлайн?**  
Да. Подключите Ollama с любой локальной моделью:
```bash
ollama pull codellama:7b
# В настройках: Provider → Local, Model → codellama:7b
```

**Q: Какая модель рекомендуется?**  
Gemini 2.0 Flash — лучший баланс скорости/качества/цены (бесплатный тир). Для сложных задач — Gemini 2.0 Pro или Claude 3.5 Sonnet.

**Q: Как добавить свой инструмент?**  
Создайте `.cvr/tools/my-tool.json`:
```json
{
  "id": "my_tool",
  "description": "My custom tool",
  "parameters": [
    { "name": "input", "description": "Input text", "required": true }
  ],
  "handler": "bash",
  "command": "echo 'Processing: ${input}'",
  "readOnly": true
}
```

### Безопасность

**Q: Сервер доступен извне?**  
Нет. Сервер слушает только `127.0.0.1`. Внешний доступ невозможен без reverse proxy.

**Q: Как работают разрешения инструментов?**  
Файл `.cvr/permissions.json` с правилами allow/ask/deny. Glob-паттерны для путей и названий инструментов. По умолчанию — ask (запрос подтверждения).

```json
{
  "rules": [
    {
      "action": "deny",
      "tool": "execute_command",
      "pattern": "rm -rf"
    },
    {
      "action": "allow",
      "tool": "read_file",
      "path": "src/**"
    }
  ]
}
```

**Q: Куда сохраняются API-ключи?**  
Только в `.env` (файл в `.gitignore`). Никогда не коммитятся. При использовании VS Code расширения — в `localStorage` браузера.

### Агенты

**Q: Чем отличаются агенты?**
| Агент | Роль | Права |
|-------|------|-------|
| `build` | Разработчик (по умолчанию) | Полный доступ |
| `general` | Универсальный ассистент | Полный доступ |
| `explore` | Исследователь кодовой базы | Только чтение |
| `scout` | Аналитик (документация, зависимости) | Только чтение |
| `prometheus` | Стратегический планировщик | Только чтение (plan) |
| `hephaestus` | Автономный исполнитель | Полный доступ |

**Q: Как создать кастомного агента?**  
Создайте `.cvr/agents/my-agent.md`:
```markdown
---
id: my-agent
name: My Agent
description: Custom agent for React components
model: gemini-2.0-flash
provider: gemini
tools:
  - read_file
  - write_file
  - edit_file
  - execute_command
---

You are a React component specialist. Always use:
- Functional components with TypeScript
- Tailwind CSS for styling
- Vitest for testing
```

### Производительность

**Q: Сколько сообщений в контексте?**  
128K токенов через sliding window с приоритетами. CRITICAL-сообщения (системные промпты) не вытесняются. Обычные — сортируются по приоритету и времени.

**Q: Как работает кэширование?**  
Два уровня: L1 in-memory (до 1000 записей) + L2 SQLite (безлимитно). Ключ — SHA-256 от промпта и содержимого. При старте — прогрев L1 из SQLite. TTL — 60 секунд.

**Q: Как мониторить нагрузку?**  
GET `/api/health` возвращает stats: requests, cacheHits, cacheMisses, activeLoops, toolCalls, errors, heapUsed. Web Dashboard показывает real-time графики.

### Self-Hosting

**Q: Как развернуть на своём сервере?**
```bash
git clone https://github.com/cvr-name/cvr.name.coder.git
cd cvr.name.coder
cp .env.example .env
# Добавить ключи в .env
bash deploy.sh up
# → http://localhost:3000
```

**Q: Как с веб-панелью мониторинга?**
```bash
bash deploy.sh dashboard
# → http://localhost:8080 (Nginx proxy)
```

**Q: Какие порты нужны?**
- `3000` — основной сервер
- `8080` — Web Dashboard (опционально, только с профилем `dashboard`)

### Troubleshooting

**Q: Ошибка `EACCES: permission denied` при записи файлов?**  
Агент работает в песочнице текущей директории. Проверьте права на запись в `.opencode-infinite/`.

**Q: `gh` CLI не установлен?**  
PR Agent требует GitHub CLI:
```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
sudo apt install gh

# Аутентификация
gh auth login
```

**Q: Не работают эмбеддинги / RAG?**  
Gemini — единственный провайдер с поддержкой эмбеддингов. Для RAG нужен Gemini API ключ.

---

## 5. Развёртывание

### Docker Compose (1 команда)

```bash
bash deploy.sh up
```

### Ручной Docker

```bash
docker build -t cvr-name-coder:1.4.0 .
docker run -d \
  --name cvr \
  -p 3000:3000 \
  -v cvr-data:/app/.opencode-infinite \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  cvr-name-coder:1.4.0
```

### CI/CD (GitHub Actions)

Сгенерировать workflow через API:

```bash
curl -X POST http://127.0.0.1:3000/api/ci/generate \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineType": "node-ci",
    "projectName": "cvr-name-coder",
    "nodeVersion": "20",
    "buildCommand": "npm run build",
    "testCommand": "npm test",
    "lintCommand": "npm run type-check"
  }'
```

Результат — `.github/workflows/ci.yml`:
```yaml
name: CI - cvr-name-coder
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run type-check
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
```

### VS Code Extension

```bash
cd vscode
npm run build
npm run package
# → cvr-name-coder-1.5.0.vsix (3.12 MB)
```

Горячие клавиши расширения:
| Команда | Клавиши |
|---------|---------|
| Открыть боковую панель | `Ctrl+Shift+C` |
| Inline редактирование | `Ctrl+K Ctrl+K` |
| Запуск Dashboard | Command Palette → `cvr.launch` |

---

> **Документация v2.0** · Обновлено 2026-05-20  
> Полный список функций: [PORTFOLIO.md](../PORTFOLIO.md)  
> Архитектура: [ARCHITECTURE.md](../ARCHITECTURE.md)
