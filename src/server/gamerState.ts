export interface GamerState {
  level: number;
  xp: number;
  xpToNext: number;
  health: number;
  focus: number;
  coins: number;
  streak: number;
  tasksCompleted: number;
  commits: number;
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

export function getGamerState(): Readonly<GamerState> {
  return state;
}

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

export function addCoins(amount: number): void {
  state.coins += amount;
  if (state.coins < 0) state.coins = 0;
  saveState();
}

export function adjustHealth(delta: number): void {
  state.health = Math.min(100, Math.max(0, state.health + delta));
  saveState();
}

export function adjustFocus(delta: number): void {
  state.focus = Math.min(100, Math.max(0, state.focus + delta));
  saveState();
}

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

export function commitCode(): void {
  state.commits++;
  addXp(5 + Math.floor(Math.random() * 5));
  state.focus = Math.min(100, state.focus + 2);
  state.optimal = state.health >= 80 && state.focus >= 80;
  saveState();
}

export function resetGamerState(): void {
  state = { ...DEFAULT_STATE };
  saveState();
}
