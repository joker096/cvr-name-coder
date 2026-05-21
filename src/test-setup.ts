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

vi.mock("motion/react", () => {
  const React = require("react");
  return {
    motion: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          if (prop === "div" || prop === "span" || prop === "button" || prop === "section" || prop === "p") {
            return ({ children, className, onClick, onKeyDown, style, ...rest }: any) =>
              React.createElement(prop, { className, onClick, onKeyDown, style, ...rest }, children);
          }
          return ({ children, ...rest }: any) => React.createElement("div", rest, children);
        },
      }
    ),
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({ start: () => Promise.resolve(), set: () => {}, stop: () => {} }),
    useMotionValue: (val: any) => val,
    useTransform: () => () => {},
  };
});