# Security Review Report - cvr.name.coder v1.3.0

**Date:** 2026-05-18
**Scope:** Full-stack security review of cvr.name.coder VS Code Extension
**Reviewer:** Security Reviewer Agent
**Status:** ✅ Review Complete

---

## Executive Summary

The security review of cvr.name.coder identified **8 findings** ranging from High to Info severity. The most critical issues involve **missing authentication on API endpoints**, **API key exposure to the client-side**, and **path traversal risks in workspace file operations**.

**Risk Rating:** MEDIUM-HIGH

**Immediate Action Required:**
1. Fix path traversal validation in workspace APIs
2. Move API key storage server-side
3. Add authentication to sensitive endpoints

---

## Findings Summary

| Severity | Count | Categories |
|----------|-------|------------|
| High | 3 | Auth, Path Traversal, Data Exposure |
| Medium | 4 | Network, Rate Limiting, Injection, Command Exec |
| Low | 1 | Transport Security |
| Info | 1 | Dependencies |

---

## Detailed Findings

### FIND-001: Path Traversal in Workspace APIs
**Severity:** High (CVSS 7.5)
**Status:** Open

**Location:**
- `vscode/src/extension.ts:580-607` — `/api/workspace/read` and `/api/workspace/write`

**Description:**
The path traversal check in workspace read/write endpoints uses `startsWith()` comparison after `path.join()`, which is insufficient on Windows. On Windows, `path.join()` with `../` sequences can resolve to paths that bypass the `startsWith()` check due to path normalization differences, symbolic links, or case sensitivity.

**Vulnerable Code:**
```typescript
const fullPath = path.join(folders[0].uri.fsPath, file);
if (!fullPath.startsWith(folders[0].uri.fsPath)) return res.status(403).json({ error: 'Path traversal denied' });
```

**Impact:**
An attacker with access to the webview could read or write files outside the workspace directory, including sensitive system files or other projects.

**Proof of Concept:**
On Windows, a path like `..\..\..\Users\Target\.ssh\id_rsa` could potentially bypass the check after `path.join()` normalization, depending on the resolved path structure.

**Remediation:**
Use `path.resolve()` and a strict path comparison:
```typescript
const workspaceRoot = path.resolve(folders[0].uri.fsPath);
const requestedPath = path.resolve(path.join(workspaceRoot, file));
if (!requestedPath.startsWith(workspaceRoot + path.sep)) {
  return res.status(403).json({ error: 'Path traversal denied' });
}
```

**References:** CWE-22, OWASP A01:2021

---

### FIND-002: Missing Authentication on API Endpoints
**Severity:** High (CVSS 8.2)
**Status:** Open

**Location:**
- `server.ts:227-241` — `/api/history`, `/api/clear`
- `vscode/src/extension.ts:562-607` — All workspace APIs

**Description:**
All backend API endpoints are completely unauthenticated. Anyone with network access to the server (or any process that can make HTTP requests to the VS Code extension's internal server) can:
- Read full chat history and memory clusters (`/api/history`)
- Clear all history and memories (`/api/clear`)
- Read and write workspace files (`/api/workspace/*`)

**Impact:**
Complete data confidentiality and integrity compromise. An attacker can exfiltrate all conversation history, delete data, or modify workspace files.

**Remediation:**
Implement one of:
1. **Token-based auth:** Generate a random token at server startup and require it in all requests
2. **VS Code SecretStorage:** Use VS Code's built-in secret storage for API authentication
3. **Origin validation:** At minimum, validate the `Origin` header to ensure requests come from the extension's webview

```typescript
// Minimal mitigation - origin validation
const allowedOrigin = `http://127.0.0.1:${serverPort}`;
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  if (origin && !origin.startsWith(allowedOrigin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }
  next();
});
```

**References:** CWE-306, OWASP A01:2021

---

### FIND-003: API Keys Exposed to Client-Side
**Severity:** High (CVSS 7.5)
**Status:** Open

**Location:**
- `src/hooks/useSettings.ts` — Settings storage
- `src/components/settings/ModelConfig.tsx` — API key input
- `src/hooks/useChat.ts` — API key sent to backend
- `server.ts:145-225` — API key passed through to AI providers

**Description:**
AI provider API keys (Gemini, OpenAI, Anthropic, etc.) are stored in browser localStorage as part of `ChatConfig`, sent from frontend to backend in every request, and potentially logged in browser console or network inspector.

**Impact:**
- API keys are accessible to any XSS attack
- API keys are stored in browser localStorage (persistent, unencrypted)
- API keys transit through the application layer and could be logged
- Keys could be accidentally committed if localStorage is exported

**Remediation:**
Store API keys server-side only:
1. Move API key storage to server environment variables or secure key store
2. Have the server proxy all AI provider requests
3. Frontend should never see or store API keys
4. Use VS Code's `SecretStorage` API for the extension version

```typescript
// Server-side only
const providerKeys = {
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  // etc.
};
```

**References:** CWE-798, OWASP A07:2021

---

### FIND-004: Server Binding to All Network Interfaces
**Severity:** Medium (CVSS 5.3)
**Status:** Open

**Location:**
- `server.ts:260` — `app.listen(PORT, "0.0.0.0", ...)`

**Description:**
The development server binds to `0.0.0.0` (all network interfaces), making it accessible from any device on the network. In the VS Code extension, the server binds to `127.0.0.1` which is safe, but the standalone server mode is exposed.

**Impact:**
Anyone on the same network can access the application APIs without authentication.

**Remediation:**
Bind to localhost only unless explicitly configured otherwise:
```typescript
const host = process.env.BIND_HOST || '127.0.0.1';
app.listen(PORT, host, () => {
  console.log(`Server running on http://${host}:${PORT}`);
});
```

**References:** CWE-1327

---

### FIND-005: No Rate Limiting on Chat API
**Severity:** Medium (CVSS 5.3)
**Status:** Open

**Location:**
- `server.ts:145` — `/api/chat`
- `vscode/src/extension.ts:467` — `/api/chat`

**Description:**
No rate limiting is implemented on the chat endpoint. An attacker could:
- Cause excessive API costs by sending unlimited messages
- Exhaust AI provider quota
- Potentially trigger Denial of Service

**Impact:**
Financial impact (API costs) and potential service degradation.

**Remediation:**
Implement rate limiting using `express-rate-limit`:
```typescript
import rateLimit from 'express-rate-limit';

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/chat', chatLimiter);
```

**References:** CWE-770, OWASP A07:2021

---

### FIND-006: System Prompt Injection via Custom Prompt
**Severity:** Medium (CVSS 6.5)
**Status:** Open

**Location:**
- `server.ts:192-195` — Custom system prompt concatenation
- `vscode/src/extension.ts` — Similar logic

**Description:**
User-supplied `customSystemPrompt` is directly concatenated into the system prompt sent to AI providers without sanitization. An attacker (or malicious user) could inject prompt instructions that override the agent's behavior, leak system instructions, or manipulate the AI's responses.

**Impact:**
- Agent behavior manipulation
- Potential instruction leaking through prompt injection
- Bypass of safety controls

**Remediation:**
1. Sanitize custom prompts by stripping or escaping known prompt injection patterns
2. Isolate custom prompt from system instructions with clear delimiters
3. Add a warning in UI about prompt injection risks

```typescript
function sanitizePrompt(prompt: string): string {
  // Remove known injection patterns
  return prompt
    .replace(/ignore previous instructions/gi, '[REDACTED]')
    .replace(/system prompt/gi, '[REDACTED]')
    .substring(0, 2000); // Limit length
}

// Wrap with delimiters
systemPrompt = `[SYSTEM INSTRUCTIONS - DO NOT OVERRIDE]\n${basePrompt}\n\n[USER CUSTOMIZATION]\n${sanitizePrompt(customSystemPrompt)}\n\n[END CUSTOMIZATION]`;
```

**References:** CWE-94, OWASP LLM01

---

### FIND-007: MCP Server Arbitrary Command Execution
**Severity:** Medium (CVSS 6.0)
**Status:** Open

**Location:**
- `vscode/src/extension.ts:57-62` — `spawn(cfg.command, cfg.args, ...)`

**Description:**
The MCP server configuration allows spawning arbitrary processes via `spawn()`. The command and args come from a JSON config file (`mcp-servers.json`) without validation. An attacker who can modify this config file could execute arbitrary system commands.

**Impact:**
Arbitrary code execution on the developer's machine if the MCP config is compromised.

**Remediation:**
1. Validate commands against an allowlist
2. Sanitize and validate all arguments
3. Restrict which commands can be spawned
4. Require user confirmation before starting new MCP servers

```typescript
const ALLOWED_COMMANDS = ['node', 'python', 'docker'];

if (!ALLOWED_COMMANDS.includes(path.basename(cfg.command))) {
  throw new Error(`MCP command not in allowlist: ${cfg.command}`);
}
```

**References:** CWE-78, OWASP A03:2021

---

### FIND-008: No HTTPS/TLS Encryption
**Severity:** Low (CVSS 3.7)
**Status:** Open

**Location:**
- `server.ts:260` — HTTP server

**Description:**
The application runs over plain HTTP without TLS/SSL encryption. While this is acceptable for localhost development, any network-accessible deployment would transmit sensitive data (API keys, chat history) unencrypted.

**Remediation:**
1. For production deployments, use HTTPS with proper certificates
2. Consider using VS Code's built-in webview communication which is already isolated
3. Add a warning in documentation about HTTP-only mode

**References:** CWE-319

---

### FIND-009: No Secrets Found in Codebase
**Severity:** Info
**Status:** ✅ Pass

**Description:**
Automated scanning found no hardcoded secrets, API keys, or credentials in the source code. The `.env.example` file contains placeholder values only. No `.env` files with real values are present in the repository.

**Verification:**
- `npm audit` returned 0 vulnerabilities
- Regex scan for `apikey|token|secret|password` patterns returned no matches in source files
- `.env.example` contains only placeholder values (`MY_GEMINI_API_KEY`)

---

## Recommendations

### Immediate (Fix within 1 week)
1. **FIND-001:** Fix path traversal validation using `path.resolve()`
2. **FIND-002:** Add origin validation middleware to all API endpoints
3. **FIND-003:** Move API key storage server-side, remove from localStorage

### Short-term (Fix within 1 month)
4. **FIND-005:** Implement rate limiting on `/api/chat`
5. **FIND-006:** Add prompt injection sanitization
6. **FIND-007:** Add MCP command allowlist

### Long-term (Enhancement)
7. **FIND-004:** Bind server to localhost by default
8. **FIND-008:** Add HTTPS support for non-localhost deployments
9. Implement comprehensive request logging and monitoring
10. Add Content Security Policy (CSP) headers

---

## Appendix: Security Checklist

| Control | Status | Notes |
|---------|--------|-------|
| Authentication | ❌ Missing | No auth on any endpoint |
| Authorization | ❌ Missing | No role-based access |
| Input Validation | ⚠️ Partial | Path traversal check insufficient |
| Rate Limiting | ❌ Missing | No limits on chat API |
| Secrets Management | ⚠️ Partial | Keys in localStorage |
| HTTPS/TLS | ❌ Missing | HTTP only |
| CORS | ❌ Missing | No CORS configured |
| CSP | ❌ Missing | No CSP headers |
| Dependency Scan | ✅ Pass | npm audit = 0 vulnerabilities |
| Secret Scanning | ✅ Pass | No hardcoded secrets found |

---

**Report Generated:** 2026-05-18
**Next Review:** After remediation of High-severity findings
