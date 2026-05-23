import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpToolInfo {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpMessage {
  jsonrpc: string;
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  id?: number;
  result?: {
    tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
    content?: Array<{ type: string; text?: string }>;
  };
  error?: { message?: string };
}

export class McpManager {
  private processes: Map<string, ChildProcess> = new Map();
  private tools: McpToolInfo[] = [];
  private storagePath: string;
  private nextId = 1;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
  }

  getConfigPath(): string {
    return path.join(this.storagePath, 'mcp-servers.json');
  }

  async loadConfig(): Promise<McpServerConfig[]> {
    try {
      const data = await fs.promises.readFile(this.getConfigPath(), 'utf-8');
      return JSON.parse(data);
    } catch { return []; }
  }

  async saveConfig(servers: McpServerConfig[]): Promise<void> {
    await fs.promises.writeFile(this.getConfigPath(), JSON.stringify(servers, null, 2));
  }

  async startServers(): Promise<void> {
    const configs = await this.loadConfig();
    for (const cfg of configs) {
      await this.startServer(cfg);
    }
  }

  private async startServer(cfg: McpServerConfig): Promise<void> {
    try {
      const proc = spawn(cfg.command, cfg.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...cfg.env },
      });

      this.processes.set(cfg.name, proc);

      const decoder = new TextDecoder();
      let buffer = '';

      proc.stdout?.on('data', (data: Buffer) => {
        buffer += decoder.decode(data, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) this.handleMessage(cfg.name, line.trim());
        }
      });

      proc.on('exit', (code) => {
        console.log(`MCP server ${cfg.name} exited with code ${code}`);
        this.processes.delete(cfg.name);
      });

      this.sendMessage(cfg.name, {
        jsonrpc: '2.0',
        id: this.nextId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'cvr-name', version: '1.0.0' },
        },
      });

      this.sendMessage(cfg.name, {
        jsonrpc: '2.0',
        id: this.nextId++,
        method: 'tools/list',
      });
    } catch (e) {
      console.error(`Failed to start MCP server ${cfg.name}:`, e);
    }
  }

  private sendMessage(serverName: string, msg: McpMessage): void {
    const proc = this.processes.get(serverName);
    if (!proc?.stdin?.writable) return;
    const data = JSON.stringify(msg) + '\n';
    proc.stdin.write(data);
  }

  private handleMessage(serverName: string, line: string): void {
    try {
      const msg = JSON.parse(line);
      if (msg.id && msg.result) {
        if (msg.result.tools) {
          for (const tool of msg.result.tools) {
            this.tools.push({
              serverName,
              name: tool.name,
              description: tool.description || '',
              inputSchema: tool.inputSchema || {},
            });
          }
          console.log(`MCP: ${msg.result.tools.length} tools loaded from ${serverName}`);
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  getTools(): McpToolInfo[] {
    return this.tools;
  }

  getToolsContext(): string {
    if (this.tools.length === 0) return '';
    let ctx = '\n\nAVAILABLE MCP TOOLS:\n';
    for (const t of this.tools) {
      ctx += `- ${t.serverName}/${t.name}: ${t.description}\n`;
      if (t.inputSchema && t.inputSchema.properties) {
        ctx += `  Args: ${Object.keys(t.inputSchema.properties).join(', ')}\n`;
      }
    }
    ctx += '\nTo use an MCP tool, respond with:\n';
    ctx += '```tool_call\n{"server":"serverName","tool":"toolName","arguments":{...}}\n```\n';
    ctx += 'The tool will be executed and the result will be returned.\n';
    return ctx;
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<McpResponse['result']> {
    return new Promise((resolve, reject) => {
      const proc = this.processes.get(serverName);
      if (!proc) return reject(new Error(`MCP server "${serverName}" not running`));

      const id = this.nextId++;
      let buffer = '';
      let resolved = false;

      const handler = (data: Buffer) => {
        if (resolved) return;
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === id && msg.result) {
              resolved = true;
              proc.stdout?.removeListener('data', handler);
              resolve(msg.result);
            } else if (msg.id === id && msg.error) {
              resolved = true;
              proc.stdout?.removeListener('data', handler);
              reject(new Error(msg.error.message || 'MCP error'));
            }
          } catch {}
        }
      };

      proc.stdout?.on('data', handler);

      this.sendMessage(serverName, {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          proc.stdout?.removeListener('data', handler);
          reject(new Error('MCP tool call timed out'));
        }
      }, 30000);
    });
  }

  stopAll(): void {
    for (const [name, proc] of this.processes) {
      proc.kill();
      console.log(`MCP server ${name} stopped`);
    }
    this.processes.clear();
    this.tools = [];
  }
}
