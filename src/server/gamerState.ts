/**
 * @interface GamerState
 * @description Represents the gamified developer state tracking progress, health, and rewards.
 */
export interface GamerState {
  /** Current level of the developer */
  level: number;
  /** Current XP accumulated */
  xp: number;
  /** XP required to reach the next level */
  xpToNext: number;
  /** Health points (0-100) representing code quality / wellbeing */
  health: number;
  /** Focus points (0-100) representing concentration level */
  focus: number;
  /** In-game currency earned */
  coins: number;
  /** Consecutive tasks completed without breaking streak */
  streak: number;
  /** Total number of tasks completed */
  tasksCompleted: number;
  /** Total number of git commits made */
  commits: number;
  /** Whether the developer is in optimal state (health >= 80 && focus >= 80) */
  optimal: boolean;
}

const STORAGE_KEY = "cvr_gamer_state";

const BASE_XP = 100;
const XP_MULTIPLIER = 1.5;

function xpForLevel(level: number): number {
  return Math.round(BASE_XP * Math.pow(XP_MULTIPLIER, level - 1));
}

const DEFAULT_STATE: GamerState = {
  level: 1,
  xp: 0,
  xpToNext: xpForLevel(1),
  health: 100,
  focus: 100,
  coins: 0,
  streak: 0,
  tasksCompleted: 0,
  commits: 0,
  optimal: false,
};

let state = loadState();

function loadState(): GamerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<GamerState>;
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATE };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/**
 * Returns a read-only copy of the current gamer state.
 * @returns {Readonly<GamerState>} The current gamer state snapshot.
 */
export function getGamerState(): Readonly<GamerState> {
  return state;
}

/**
 * Adds XP to the gamer state and handles level-ups.
 * @param {number} amount - The amount of XP to add.
 * @returns {boolean} `true` if a level-up occurred, `false` otherwise.
 */
export function addXp(amount: number): boolean {
  state.xp += amount;
  let leveled = false;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level++;
    state.xpToNext = xpForLevel(state.level);
    leveled = true;
  }
  saveState();
  return leveled;
}

/**
 * Adds coins to the gamer state. Clamped to a minimum of 0.
 * @param {number} amount - The amount of coins to add (can be negative).
 */
export function addCoins(amount: number): void {
  state.coins += amount;
  if (state.coins < 0) state.coins = 0;
  saveState();
}

/**
 * Adjusts the health value within the range [0, 100].
 * @param {number} delta - The amount to change health by (positive or negative).
 */
export function adjustHealth(delta: number): void {
  state.health = Math.min(100, Math.max(0, state.health + delta));
  saveState();
}

/**
 * Adjusts the focus value within the range [0, 100].
 * @param {number} delta - The amount to change focus by (positive or negative).
 */
export function adjustFocus(delta: number): void {
  state.focus = Math.min(100, Math.max(0, state.focus + delta));
  saveState();
}

/**
 * Records a completed task, awards XP/coins, updates streak, and adjusts stats.
 * @param {number} [commits] - Optional number of commits associated with the task.
 */
export function completeTask(commits?: number): void {
  state.tasksCompleted++;
  if (commits) state.commits += commits;
  addXp(20 + Math.floor(Math.random() * 15));
  addCoins(1 + Math.floor(Math.random() * 3));
  state.streak++;
  state.optimal = state.health >= 80 && state.focus >= 80;
  adjustHealth(-2 + Math.floor(Math.random() * 5));
  adjustFocus(3 + Math.floor(Math.random() * 5));
  saveState();
}

/**
 * Records a code commit, awards XP, and boosts focus slightly.
 */
export function commitCode(): void {
  state.commits++;
  addXp(5 + Math.floor(Math.random() * 5));
  state.focus = Math.min(100, state.focus + 2);
  state.optimal = state.health >= 80 && state.focus >= 80;
  saveState();
}

/**
 * Resets the gamer state to default values.
 */
export function resetGamerState(): void {
  state = { ...DEFAULT_STATE };
  saveState();
}
