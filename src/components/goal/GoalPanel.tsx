import React from "react";
import type { GoalState, GoalEvent } from "../../types/goal";

interface GoalPanelProps {
  goalState: GoalState;
  events: GoalEvent[];
  onAbort: () => void;
}

export const GoalPanel: React.FC<GoalPanelProps> = ({ goalState, onAbort }) => {
  const isRunning = goalState.status === "running";
  const progress = goalState.maxIterations > 0 ? (goalState.currentIteration / goalState.maxIterations) * 100 : 0;

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Goal: {goalState.goal}</h2>
          <p className="text-sm text-gray-500">{goalState.successCriteria}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            goalState.status === "completed" ? "bg-green-100 text-green-800" :
            goalState.status === "error" ? "bg-red-100 text-red-800" :
            goalState.status === "aborted" ? "bg-gray-100 text-gray-800" :
            "bg-blue-100 text-blue-800"
          }`}>
            {goalState.status.toUpperCase()}
          </span>
          {isRunning && (
            <button
              onClick={onAbort}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Abort
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="text-xs text-gray-500">
        Iteration {goalState.currentIteration} / {goalState.maxIterations} | Tokens: {goalState.totalTokensUsed}
      </div>

      <div className="space-y-2">
        {goalState.steps.map((step) => (
          <div key={step.iteration} className="border rounded p-3 bg-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Step {step.iteration}</span>
              {step.action && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                  {step.action.tool}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-800 line-clamp-3">{step.thought}</p>
            {step.observation && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{step.observation}</p>
            )}
          </div>
        ))}
      </div>

      {goalState.judgeHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Judge Verdicts</h3>
          {goalState.judgeHistory.map((v) => (
            <div key={v.iteration} className={`border rounded p-2 text-sm ${
              v.verdict === "COMPLETE" ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${v.verdict === "COMPLETE" ? "text-green-700" : "text-yellow-700"}`}>
                  {v.verdict}
                </span>
                <span className="text-xs text-gray-500">Iter {v.iteration}</span>
              </div>
              <p className="text-gray-700 mt-1">{v.reason}</p>
              {v.nextHint && <p className="text-gray-500 mt-1 text-xs">Hint: {v.nextHint}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
