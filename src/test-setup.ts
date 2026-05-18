import "@testing-library/jest-dom";
import { vi } from "vitest";

// Auto-mock hooks
vi.mock("./hooks/usePersistentMemory", async () => {
  const actual = await vi.importActual("./hooks/__mocks__/usePersistentMemory");
  return actual;
});

vi.mock("./hooks/useSessionSearch", () => ({
  useSessionSearch: () => ({ results: [], loading: false, search: vi.fn(), clear: vi.fn() }),
  useSessions: () => ({ sessions: [], loading: false, fetchSessions: vi.fn(), createSession: vi.fn(), deleteSessionById: vi.fn() }),
}));

vi.mock("./hooks/useCron", () => ({
  useCron: () => ({ tasks: [], addTask: vi.fn(), removeTask: vi.fn(), toggleTask: vi.fn() }),
}));