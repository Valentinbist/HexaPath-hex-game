const LOCAL_PLAYER_ID_KEY = 'hex_player_id';
const TRACKED_GAMES_KEY = 'hex_games';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TRACKED_GAMES = 50;

type TrackedGame = {
  gameId: string;
  trackedAt: number;
};

function safeParseTrackedGames(value: string | null): TrackedGame[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.gameId === 'string' &&
        typeof item.trackedAt === 'number'
      );
    });
  } catch {
    return [];
  }
}

function persistTrackedGames(games: TrackedGame[]) {
  localStorage.setItem(TRACKED_GAMES_KEY, JSON.stringify(games));
}

export function getOrCreateLocalPlayerId(): string {
  const existing = localStorage.getItem(LOCAL_PLAYER_ID_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID();
  localStorage.setItem(LOCAL_PLAYER_ID_KEY, nextId);
  return nextId;
}

export function getTrackedGames(): TrackedGame[] {
  return safeParseTrackedGames(localStorage.getItem(TRACKED_GAMES_KEY));
}

export function getTrackedGameIds(): string[] {
  return getTrackedGames().map((game) => game.gameId);
}

export function pruneTrackedGames(now = Date.now()): string[] {
  const games = getTrackedGames();
  const minTrackedAt = now - THIRTY_DAYS_MS;
  const pruned = games.filter((game) => game.trackedAt >= minTrackedAt);

  if (pruned.length !== games.length) {
    persistTrackedGames(pruned);
  }

  return pruned.map((game) => game.gameId);
}

export function trackGameId(gameId: string, now = Date.now()) {
  const games = getTrackedGames().filter((game) => game.gameId !== gameId);
  const next = [{ gameId, trackedAt: now }, ...games].slice(0, MAX_TRACKED_GAMES);
  persistTrackedGames(next);
}

export function untrackGameId(gameId: string) {
  const games = getTrackedGames();
  const next = games.filter((game) => game.gameId !== gameId);
  if (next.length !== games.length) {
    persistTrackedGames(next);
  }
}
