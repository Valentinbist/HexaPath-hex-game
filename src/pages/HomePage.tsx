import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '@/hooks/useGameStore';
import { Player, BOARD_SIZE } from '@/lib/hex-logic';
import { Hexagon } from '@/components/Hexagon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
const GameStatus = () => {
  const gameState = useGameStore((s) => s.gameState);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const winner = useGameStore((s) => s.winner);
  const playerText = currentPlayer === Player.BLUE ? 'Blue' : 'Red';
  const playerColor =
    currentPlayer === Player.BLUE ? 'text-player-blue' : 'text-player-red';
  const winnerText = winner === Player.BLUE ? 'Blue' : 'Red';
  const winnerColor =
    winner === Player.BLUE ? 'text-player-blue' : 'text-player-red';
  return (
    <div className="h-16 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {gameState === 'playing' ? (
          <motion.h2
            key="playing"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="text-2xl md:text-3xl font-semibold"
          >
            <span className={cn(playerColor, 'font-bold')}>{playerText}'s</span>{' '}
            Turn
          </motion.h2>
        ) : (
          <motion.h2
            key="won"
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            className="text-4xl md:text-5xl font-bold"
          >
            <span className={winnerColor}>{winnerText}</span> Wins!
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
  const resetGame = useGameStore((s) => s.resetGame);
  const gameState = useGameStore((s) => s.gameState);
  const winner = useGameStore((s) => s.winner);
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
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', delay: 0.2 }}
        >
          <Button
            onClick={resetGame}
            size="lg"
            className="font-semibold text-lg px-8 py-6 bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg"
          >
            New Game
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
