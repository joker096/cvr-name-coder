import "@testing-library/jest-dom";
import { vi } from "vitest";

Element.prototype.scrollIntoView = vi.fn();

if (!globalThis.navigator?.clipboard) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  });
}

if (!globalThis.CSS) {
  (globalThis as any).CSS = { supports: () => false };
}

vi.mock("./components/chat/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "markdown" }, content);
  },
}));

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