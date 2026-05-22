import { EventEmitter } from "events";
import type { GoalEvent, GoalEventType } from "../types/goal";

export class GoalEventBroadcaster extends EventEmitter {
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
