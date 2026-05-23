import { afterEach, describe, expect, it, vi } from "vitest";
import { cronScheduler, parseSchedule } from "../cronScheduler";

describe("cronScheduler", () => {
  afterEach(() => {
    cronScheduler.dispose();
    vi.useRealTimers();
  });

  it("parses supported schedules and rejects invalid ones", () => {
    expect(parseSchedule("every 5 minutes")).toBe(5 * 60 * 1000);
    expect(parseSchedule("*/10 * * * *")).toBe(10 * 60 * 1000);
    expect(parseSchedule("0 0 * * *")).toBeNull();
  });

  it("throws when adding an invalid schedule", () => {
    expect(() =>
      cronScheduler.addTask({
        name: "bad",
        schedule: "invalid",
        command: "noop",
        enabled: true,
      })
    ).toThrow(/Invalid schedule/);
  });

  it("does not create duplicate timers when enabling the same task repeatedly", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const task = cronScheduler.addTask({
      name: "dup",
      schedule: "every 1 minute",
      command: "noop",
      enabled: true,
    });

    cronScheduler.onTaskRun(task.id, callback);
    cronScheduler.enableTask(task.id);
    cronScheduler.enableTask(task.id);

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("skips overlapping runs while a previous invocation is still executing", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const callback = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const task = cronScheduler.addTask({
      name: "overlap",
      schedule: "every 1 minute",
      command: "noop",
      enabled: true,
    });

    cronScheduler.onTaskRun(task.id, callback);
    await vi.advanceTimersByTimeAsync(60 * 1000);
    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(callback).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
