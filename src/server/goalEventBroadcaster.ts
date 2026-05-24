import { EventEmitter } from "events";
import type { GoalEvent, GoalEventType } from "../types/goal";

/**
 * @class GoalEventBroadcaster
 * @description Emits goal-related events using Node.js EventEmitter.
 *   Consumers listen for `"event"` to receive {@link GoalEvent} payloads.
 */
export class GoalEventBroadcaster extends EventEmitter {
  /**
   * Broadcasts a goal event to all listeners.
   * @param {string} goalId - The unique identifier of the goal.
   * @param {GoalEventType} type - The type of goal event.
   * @param {unknown} data - Additional payload data for the event.
   */
  broadcast(goalId: string, type: GoalEventType, data: unknown): void {
    const event: GoalEvent = {
      type,
      goalId,
      timestamp: Date.now(),
      data,
    };
    this.emit("event", event);
  }
}
