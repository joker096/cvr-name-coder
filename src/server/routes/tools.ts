import type { Application, Request, Response } from "express";
import * as path from "path";
import { readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { executeTool } from "../tools.js";
import { recordChange } from "../changes.js";
import { permissionEngine } from "../serverState.js";
import { incrementToolCall } from "../standalone/health.js";
import { validateBody, ToolExecuteSchema } from "../validation.js";

export function registerRoutes(app: Application) {
  app.post("/api/tools/execute", validateBody(ToolExecuteSchema), async (req: Request, res: Response) => {
    try {
      const { toolCall, mode = "build", sessionId = randomUUID() } = req.body;
      const result = await executeTool(toolCall, mode, permissionEngine, sessionId);
      incrementToolCall();

      if (
        result.success &&
        (toolCall.name === "write_file" || toolCall.name === "edit_file")
      ) {
        const afterContent =
          toolCall.name === "write_file"
            ? (toolCall.params.content as string)
            : await readFile(path.join(process.cwd(), toolCall.params.path as string), "utf-8");
        const change = await recordChange(
          toolCall.params.path as string,
          toolCall.name === "write_file" ? "write" : "edit",
          afterContent,
          `${toolCall.name}: ${toolCall.params.path}`
        );
        result.changeId = change.id;
      }

      res.json(result);
    } catch (error: any) {
      console.error("Tool execution error:", error);
      res.status(500).json({ success: false, output: "", error: error.message });
    }
  });
}
