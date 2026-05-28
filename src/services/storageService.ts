const errMsg = (key: string) => `Failed to ${key} storage:`;

/** Generic localStorage wrapper with JSON serialization and error handling. */
export const storageService = {
  /** Serializes and stores a value under the given key. */
  save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(errMsg("save"), key, error);
    }
  },

  /** Deserializes and returns a value stored under the given key, or null. */
  load<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(errMsg("load"), key, error);
      return null;
    }
  },

  /** Alias for {@link load}. */
  get<T>(key: string): T | null {
    return this.load<T>(key);
  },

  /** Alias for {@link save}. */
  set<T>(key: string, data: T): void {
    this.save(key, data);
  },

  /** Removes the entry stored under the given key. */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(errMsg("remove"), key, error);
    }
  },

  /** Clears all entries from localStorage. */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(errMsg("clear"), error);
    }
  },
};
