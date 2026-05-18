import { vi } from "vitest";

export const usePersistentMemory = vi.fn(() => ({
  memory: { raw: "", sections: {} },
  user: { raw: "", sections: {} },
  loading: false,
  saving: false,
  saveMemory: vi.fn(),
  saveUser: vi.fn(),
  refresh: vi.fn(),
}));
