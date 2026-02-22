import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Player } from '@/lib/hex-logic';
import {
  getOrCreateLocalPlayerId,
  pruneTrackedGames,
  untrackGameId,
} from '@/lib/playerIdentity';

type GameListItem = {
  id: string;
  gameState: 'waiting' | 'playing' | 'won';
  currentPlayer: Player.BLUE | Player.RED;
  winner: Player | null;
  lastMoveAt: string;
  createdAt: string;
  yourColor: Player.BLUE | Player.RED;
  isYourTurn: boolean;
};

function playerName(player: Player.BLUE | Player.RED | null): string {
  if (player === Player.BLUE) return 'Blue';
  if (player === Player.RED) return 'Red';
  return '-';
}

export function GamesOverviewPage() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const localPlayerId = getOrCreateLocalPlayerId();
    const trackedGameIds = pruneTrackedGames();

    if (trackedGameIds.length === 0) {
      setGames([]);
      setIsLoading(false);
      return;
    }

    try {
      const responses = await Promise.all(
        trackedGameIds.map(async (gameId): Promise<GameListItem | null> => {
          const response = await fetch(`/api/games/${gameId}?playerId=${localPlayerId}`);
          const result = await response.json().catch(() => null);

          if (!response.ok || !result?.success) {
            if (response.status === 403 || response.status === 404) {
              untrackGameId(gameId);
              return null;
            }

            throw new Error(result?.error || `Failed to load game ${gameId}`);
          }

          const game = result.data.gameState;
          return {
            id: game.id,
            gameState: game.gameState,
            currentPlayer: game.currentPlayer,
            winner: game.winner,
            lastMoveAt: game.lastMoveAt,
            createdAt: game.createdAt,
            yourColor: result.data.yourColor,
            isYourTurn: result.data.isYourTurn,
          };
        })
      );

      const nextGames = responses
        .filter((game): game is GameListItem => game !== null)
        .sort((a, b) => Date.parse(b.lastMoveAt) - Date.parse(a.lastMoveAt));

      setGames(nextGames);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tracked games';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">My Games</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Games tracked for this browser.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadGames}>Refresh</Button>
            <Button asChild>
              <Link to="/">Back to Board</Link>
            </Button>
          </div>
        </header>

        {isLoading && (
          <div className="rounded-lg border bg-background p-6 text-sm text-gray-600 dark:text-gray-300">
            Loading your games...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-6 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && games.length === 0 && (
          <div className="rounded-lg border bg-background p-6 text-sm text-gray-600 dark:text-gray-300">
            No tracked games yet. Create or join a game from the home screen.
          </div>
        )}

        {!isLoading && !error && games.length > 0 && (
          <div className="grid gap-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-lg border bg-background p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="font-semibold">Game {game.id}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status: {game.gameState} | You: {playerName(game.yourColor)}
                    {game.gameState === 'won' && ` | Winner: ${playerName(game.winner)}`}
                    {game.gameState === 'playing' && ` | Turn: ${game.isYourTurn ? 'Yours' : playerName(game.currentPlayer)}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Last move: {new Date(game.lastMoveAt).toLocaleString()}
                  </p>
                </div>
                <Button asChild>
                  <Link to={`/?game=${game.id}`}>Open Game</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
