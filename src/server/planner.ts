import type { Plan } from "../types/agent";

export type PlanThinkFunction = (prompt: string) => Promise<string>;

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
    const tasks = JSON.parse(result);
    return {
      goal,
      tasks: tasks.map((t: any, i: number) => ({
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
