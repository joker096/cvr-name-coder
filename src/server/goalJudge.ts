import type { GoalStep, JudgeVerdict } from "../types/goal";

/**
 * @typedef JudgeThinkFunction
 * @description A function that sends a prompt to an AI model and returns its text response.
 * @param {string} prompt - The prompt to send to the AI model.
 * @returns {Promise<string>} The AI model's text response.
 */
export type JudgeThinkFunction = (prompt: string) => Promise<string>;

/**
 * @interface JudgeOptions
 * @description Configuration options for evaluating a goal's progress.
 */
export interface JudgeOptions {
  /** The goal description to evaluate */
  goal: string;
  /** Success criteria that must all be demonstrably true for completion */
  successCriteria: string;
  /** Steps the agent has taken so far */
  steps: GoalStep[];
  /** The most recent observation from the agent's last action */
  lastObservation?: string;
}

const JUDGE_PROMPT_TEMPLATE = `You are a strict evaluator. A coding agent is working on this goal:

GOAL: {goal}

SUCCESS CRITERIA (ALL must be demonstrably true to mark COMPLETE):
{successCriteria}

AGENT'S PROGRESS SO FAR:
{history}

AGENT'S LAST ACTION RESULT:
{lastObservation}

RULES:
- Verify EVERY success criterion with concrete evidence. Do not trust the agent's claims.
- If a criterion requires files/tests/commands, confirm they exist and pass.
- If ANY criterion is unmet, respond INCOMPLETE.
- Give ONE concrete next step in nextHint.

Respond ONLY in JSON:
{
  "verdict": "INCOMPLETE" | "COMPLETE",
  "reason": "specific evidence-based explanation",
  "nextHint": "one concrete next action for the agent"
}`;

function formatHistory(steps: GoalStep[]): string {
  return steps
    .map(
      (s) =>
        `Iteration ${s.iteration}: ${s.thought.substring(0, 150)}${
          s.thought.length > 150 ? "..." : ""
        }${s.observation ? ` | Observation: ${s.observation.substring(0, 150)}${s.observation.length > 150 ? "..." : ""}` : ""}`
    )
    .join("\n");
}

/**
 * Evaluates a goal's progress by sending a structured prompt to a judge AI.
 * @param {JudgeOptions} options - The evaluation options including goal, criteria, steps, and last observation.
 * @param {JudgeThinkFunction} thinkFn - A function to call the AI model with the evaluation prompt.
 * @returns {Promise<JudgeVerdict>} The judge's verdict indicating COMPLETE or INCOMPLETE with reasoning.
 */
export async function evaluateGoal(
  options: JudgeOptions,
  thinkFn: JudgeThinkFunction
): Promise<JudgeVerdict> {
  const { goal, successCriteria, steps, lastObservation } = options;
  const prompt = JUDGE_PROMPT_TEMPLATE
    .replace("{goal}", goal)
    .replace("{successCriteria}", successCriteria || "No explicit criteria. Verify the goal is fully achieved.")
    .replace("{history}", formatHistory(steps))
    .replace("{lastObservation}", lastObservation || "None");

  const response = await thinkFn(prompt);
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  const cleaned = firstBrace !== -1 && lastBrace > firstBrace ? response.slice(firstBrace, lastBrace + 1) : response.trim();

  try {
    const parsed = JSON.parse(cleaned);
    const verdict: JudgeVerdict = {
      iteration: steps.length + 1,
      verdict: parsed.verdict === "COMPLETE" ? "COMPLETE" : "INCOMPLETE",
      reason: String(parsed.reason || ""),
      timestamp: Date.now(),
    };
    if (parsed.nextHint) {
      verdict.nextHint = String(parsed.nextHint);
    }
    return verdict;
  } catch {
    return {
      iteration: steps.length + 1,
      verdict: "INCOMPLETE",
      reason: "Judge returned invalid JSON. Treating as incomplete.",
      nextHint: "Continue working toward the goal.",
      timestamp: Date.now(),
    };
  }
}
