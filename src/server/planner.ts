import type { Plan } from "../types/agent";

/** Function signature for the AI "think" callback used by the planner. */
export type PlanThinkFunction = (prompt: string) => Promise<string>;

interface RawTask {
  description: string;
  dependencies?: number[];
}

/**
 * Creates a task plan by asking the AI to break down a goal into concrete tasks.
 * Falls back to a single-task plan if AI parsing fails.
 * @param goal - The high-level goal to plan
 * @param thinkFn - AI callback that takes a prompt and returns a JSON response
 * @returns A Plan object with ordered, dependency-linked tasks
 */
export async function createPlan(goal: string, thinkFn: PlanThinkFunction): Promise<Plan> {
  const prompt = `Break down this goal into a sequence of concrete tasks:
Goal: ${goal}

Respond with a JSON array of tasks in this format:
[
  {"description": "task 1", "dependencies": []},
  {"description": "task 2", "dependencies": [1]}
]

Tasks:`;

  try {
    const result = await thinkFn(prompt);
    const tasks = JSON.parse(result) as RawTask[];
    return {
      goal,
      tasks: tasks.map((t, i) => ({
        id: i + 1,
        description: t.description,
        dependencies: t.dependencies || [],
        status: "pending" as const,
      })),
    };
  } catch {
    return { goal, tasks: [{ id: 1, description: goal, dependencies: [], status: "pending" }] };
  }
}
