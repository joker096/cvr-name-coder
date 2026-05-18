import { useState, useCallback } from "react";
import type { ToolCall, ToolResult } from "../types/tools";

export const useTools = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);

  const executeToolCall = useCallback(
    async (toolCall: ToolCall, mode: "plan" | "build" = "build"): Promise<ToolResult> => {
      setIsExecuting(true);
      try {
        const response = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolCall, mode }),
        });
        const result: ToolResult = await response.json();
        setLastResult(result);
        return result;
      } catch (err: any) {
        const errorResult: ToolResult = {
          success: false,
          output: "",
          error: err.message,
        };
        setLastResult(errorResult);
        return errorResult;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return { executeToolCall, isExecuting, lastResult };
};
