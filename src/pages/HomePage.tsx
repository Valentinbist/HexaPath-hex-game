import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import { useGameStore } from '@/hooks/useGameStore';
import { Player, BOARD_SIZE } from '@/lib/hex-logic';
import { Hexagon } from '@/components/Hexagon';
import { Button } from '@/components/ui/button';
import { GameModeSelector } from '@/components/GameModeSelector';
import { ShareLink } from '@/components/ShareLink';
import { cn } from '@/lib/utils';
import { getOrCreateLocalPlayerId } from '@/lib/playerIdentity';
import { useShallow } from 'zustand/react/shallow';

const GameStatus = () => {
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const winner = useGameStore((s) => s.winner);
  const playerColor = useGameStore((s) => s.playerColor);
  const isYourTurn = useGameStore((s) => s.isYourTurn);
  const opponentJoined = useGameStore((s) => s.opponentJoined);

  const playerText = currentPlayer === Player.BLUE ? 'Blue' : 'Red';
  const playerColorClass =
    currentPlayer === Player.BLUE ? 'text-player-blue' : 'text-player-red';
  const winnerText = winner === Player.BLUE ? 'Blue' : 'Red';
  const winnerColorClass =
    winner === Player.BLUE ? 'text-player-blue' : 'text-player-red';

  const yourColorText = playerColor === Player.BLUE ? 'Blue' : 'Red';
  const yourColorClass = playerColor === Player.BLUE ? 'text-player-blue' : 'text-player-red';

  return (
    <div className="h-16 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {gameState === 'waiting' ? (
          <motion.h2
            key="waiting"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="text-2xl md:text-3xl font-semibold"
          >
            Waiting for opponent...
          </motion.h2>
        ) : gameState === 'playing' ? (
          <motion.h2
            key="playing"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="text-2xl md:text-3xl font-semibold"
          >
            {gameMode === 'online' ? (
              <>
                <span className={cn(yourColorClass, 'font-bold')}>You are {yourColorText}</span>
                {' • '}
                {isYourTurn ? (
                  <span className="text-green-600 dark:text-green-400">Your Turn</span>
                ) : (
                  <span className="text-gray-500">Opponent's Turn</span>
                )}
              </>
            ) : (
              <>
                <span className={cn(playerColorClass, 'font-bold')}>{playerText}'s</span> Turn
              </>
            )}
          </motion.h2>
        ) : (
          <motion.h2
            key="won"
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            className="text-4xl md:text-5xl font-bold"
          >
            <span className={winnerColorClass}>{winnerText}</span> Wins!
          </motion.h2>
        )}
      </AnimatePresence>
    </div>
  );
};

const GameBoard = () => {
  const { board, currentPlayer, gameState, winningPath, makeMove } = useGameStore(
    useShallow((s) => ({
      board: s.board,
      currentPlayer: s.currentPlayer,
      gameState: s.gameState,
      winningPath: s.winningPath,
      makeMove: s.makeMove,
    }))
  );

  const winningPathSet = new Set(
    winningPath.map((p) => `${p.row},${p.col}`)
  );

  const hexSize = 36;
  const scale = hexSize / 50; // Hexagon component is 100x86.6
  const scaledHexWidth = 100 * scale;
  const scaledHexHeight = 86.6 * scale;

  // Calculate the precise bounding box for the rhombus layout
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // Correct geometric positioning for a non-overlapping rhombus grid
      const x = (c - r) * (scaledHexWidth * 0.75);
      const y = (c + r) * (scaledHexHeight * 0.5);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const boardContentWidth = maxX - minX + scaledHexWidth;
  const boardContentHeight = maxY - minY + scaledHexHeight;
  const padding = 20; // Padding for shadow and hover effects
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = boardContentWidth + padding * 2;
  const viewBoxHeight = boardContentHeight + padding * 2;

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full drop-shadow-lg"
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.2" />
          </filter>
        </defs>
        <g filter="url(#shadow)">
          {board.map((row, r) =>
            row.map((player, c) => {
              // Correct geometric positioning for a non-overlapping rhombus grid
              const x = (c - r) * (scaledHexWidth * 0.75);
              const y = (c + r) * (scaledHexHeight * 0.5);
              return (
                <g key={`${r}-${c}`} transform={`translate(${x}, ${y}) scale(${scale})`}>
                  <Hexagon
                    row={r}
                    col={c}
                    player={player}
                    currentPlayer={currentPlayer}
                    isWinning={winningPathSet.has(`${r},${c}`)}
                    isGameOver={gameState === 'won'}
                    onClick={makeMove}
                  />
                </g>
              );
            })
          )}
        </g>
      </svg>
    </div>
  );
};

export function HomePage() {
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [debugData, setDebugData] = useState<string | null>(null);
  const [debugNote, setDebugNote] = useState('');
  const hasJoinedRef = useRef(false);
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const winner = useGameStore((s) => s.winner);
  const gameId = useGameStore((s) => s.gameId);
  const shareLink = useGameStore((s) => s.shareLink);
  const isYourTurn = useGameStore((s) => s.isYourTurn);
  const opponentJoined = useGameStore((s) => s.opponentJoined);

  const setLocalMode = useGameStore((s) => s.setLocalMode);
  const createOnlineGame = useGameStore((s) => s.createOnlineGame);
  const joinOnlineGame = useGameStore((s) => s.joinOnlineGame);
  const loadOnlineGame = useGameStore((s) => s.loadOnlineGame);
  const disconnectWebSocket = useGameStore((s) => s.disconnectWebSocket);
  const resetGame = useGameStore((s) => s.resetGame);

  // Handle URL parameter for joining games
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get('game');

    if (urlGameId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      const localPlayerId = getOrCreateLocalPlayerId();

      // First try loading as the same local player, then fallback to joining.
      loadOnlineGame(urlGameId, localPlayerId).catch((loadErr) => {
        const message = loadErr instanceof Error ? loadErr.message : '';
        if (!message.toLowerCase().includes('not a player')) {
          console.error('Failed to load game:', loadErr);
          hasJoinedRef.current = false;
          return;
        }

        joinOnlineGame(urlGameId).catch((joinErr) => {
          console.error('Failed to join game:', joinErr);
          const joinMessage =
            joinErr instanceof Error ? joinErr.message.toLowerCase() : '';
          if (joinMessage.includes('already has 2 players')) {
            alert('This game already has two players and is currently in progress.');
          } else if (joinMessage.includes('game not found')) {
            alert('This game link is invalid or the game no longer exists.');
          } else {
            alert('Failed to join game. The game may be full or not exist.');
          }
          hasJoinedRef.current = false;
        });
      });
    }
  }, [joinOnlineGame, loadOnlineGame]);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => disconnectWebSocket();
  }, [disconnectWebSocket]);

  // Confetti on win
  useEffect(() => {
    if (gameState === 'won') {
      const colors =
        winner === Player.BLUE
          ? ['#3B82F6', '#60A5FA']
          : ['#F97316', '#FB923C'];
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: colors,
      });
    }
  }, [gameState, winner]);

  const handleNewGame = () => {
    setShowModeSelector(true);
  };

  const handleLocalGame = () => {
    setLocalMode();
    // Clear URL param if present
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleCreateOnline = async () => {
    try {
      const { gameId, shareLink } = await createOnlineGame();
      // Update URL with game ID
      window.history.replaceState({}, '', `?game=${gameId}`);
    } catch (err) {
      console.error('Failed to create game:', err);
      alert('Failed to create online game. Please try again.');
    }
  };

  const handleJoinOnline = async (gameId: string) => {
    try {
      await joinOnlineGame(gameId);
      // Update URL with game ID
      window.history.replaceState({}, '', `?game=${gameId}`);
    } catch (err) {
      console.error('Failed to join game:', err);
      alert('Failed to join game. The game may be full or not exist.');
    }
  };

  const handleDumpGameState = async () => {
    const state = useGameStore.getState();
    const debugPayload = {
      gameMode: state.gameMode,
      gameState: state.gameState,
      board: state.board,
      currentPlayer: state.currentPlayer,
      winner: state.winner,
      winningPath: state.winningPath,
      gameId: state.gameId,
      playerId: state.playerId,
      playerColor: state.playerColor,
      isYourTurn: state.isYourTurn,
      opponentJoined: state.opponentJoined,
      shareLink: state.shareLink,
    };
    const formatted = JSON.stringify(debugPayload, null, 2);
    console.group('Hex Debug State');
    console.log(formatted);
    console.groupEnd();
    let note = 'State logged to console.';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(formatted);
        note = 'State copied to clipboard and logged to console.';
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      note = 'Clipboard write failed; state logged to console.';
    }
    setDebugData(formatted);
    setDebugNote(note);
  };

  const handleClearDebug = () => {
    setDebugData(null);
    setDebugNote('');
  };

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center space-y-6 md:space-y-8">
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight">
            HexaPath
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect your sides to win!
          </p>
        </motion.header>

        <GameStatus />
        <GameBoard />

        {gameMode === 'online' && gameState === 'waiting' && gameId && shareLink && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <ShareLink gameId={gameId} shareLink={shareLink} />
          </motion.div>
        )}

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', delay: 0.2 }}
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleNewGame}
              size="lg"
              className="font-semibold text-lg px-8 py-6 bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg"
            >
              New Game
            </Button>
            <Button asChild variant="outline" className="px-6 py-6 font-semibold">
              <Link to="/games">My Games</Link>
            </Button>
            <Button
              variant={debugData ? 'secondary' : 'outline'}
              onClick={debugData ? handleClearDebug : handleDumpGameState}
              className="px-6 py-6 font-semibold"
            >
              {debugData ? 'Hide Debug State' : 'Debug Game State'}
            </Button>
          </div>
        </motion.div>

        {debugData && (
          <div className="w-full max-w-3xl mx-auto bg-gray-900 text-gray-100 rounded-lg p-4 shadow-inner border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Current Game State</span>
              {debugNote && <span className="text-xs text-gray-400">{debugNote}</span>}
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">
              {debugData}
            </pre>
          </div>
        )}
      </div>

      <GameModeSelector
        open={showModeSelector}
        onClose={() => setShowModeSelector(false)}
        onLocalGame={handleLocalGame}
        onCreateOnline={handleCreateOnline}
        onJoinOnline={handleJoinOnline}
      />
    </main>
  );
}
