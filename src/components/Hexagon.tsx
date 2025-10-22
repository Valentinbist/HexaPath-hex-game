import React from 'react';
import { motion } from 'framer-motion';
import { Player, BOARD_SIZE } from '@/lib/hex-logic';
import { cn } from '@/lib/utils';
interface HexagonProps {
  row: number;
  col: number;
  player: Player;
  currentPlayer: Player;
  isWinning: boolean;
  isGameOver: boolean;
  onClick: (row: number, col: number) => void;
}
const HEX_WIDTH = 100;
const HEX_HEIGHT = 86.6; // sqrt(3)/2 * 100
const points = `
  ${HEX_WIDTH * 0.25},${HEX_HEIGHT * 0}
  ${HEX_WIDTH * 0.75},${HEX_HEIGHT * 0}
  ${HEX_WIDTH * 1},${HEX_HEIGHT * 0.5}
  ${HEX_WIDTH * 0.75},${HEX_HEIGHT * 1}
  ${HEX_WIDTH * 0.25},${HEX_HEIGHT * 1}
  ${HEX_WIDTH * 0},${HEX_HEIGHT * 0.5}
`;
const playerColors = {
  [Player.EMPTY]: 'fill-gray-200 dark:fill-gray-700',
  [Player.BLUE]: 'fill-player-blue',
  [Player.RED]: 'fill-player-red',
};
const hoverPlayerColors = {
  [Player.BLUE]: 'hover:fill-player-blue/50',
  [Player.RED]: 'hover:fill-player-red/50',
};
const edges = {
  topLeft: `M ${HEX_WIDTH * 0} ${HEX_HEIGHT * 0.5} L ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 0}`,
  top: `M ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 0} L ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 0}`,
  topRight: `M ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 0} L ${HEX_WIDTH * 1} ${HEX_HEIGHT * 0.5}`,
  bottomRight: `M ${HEX_WIDTH * 1} ${HEX_HEIGHT * 0.5} L ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 1}`,
  bottom: `M ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 1} L ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 1}`,
  bottomLeft: `M ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 1} L ${HEX_WIDTH * 0} ${HEX_HEIGHT * 0.5}`,
};
type BorderPlayer = 'blue' | 'red';
type BorderSegment = { edge: keyof typeof edges; player: BorderPlayer };
const BorderPath = ({ d, player }: { d: string; player: 'blue' | 'red' }) => (
  <path
    d={d}
    className={cn(player === 'blue' ? 'stroke-player-blue' : 'stroke-player-red')}
    strokeWidth="8"
    strokeLinecap="round"
  />
);
export const Hexagon = React.memo(
  ({
    row,
    col,
    player,
    currentPlayer,
    isWinning,
    isGameOver,
    onClick,
  }: HexagonProps) => {
    const handleClick = () => {
      if (player === Player.EMPTY && !isGameOver) {
        onClick(row, col);
      }
    };
    const isClickable = player === Player.EMPTY && !isGameOver;
    const borderSegments: BorderSegment[] = [];
    const segmentSet = new Set<string>();
    const addSegment = (edge: keyof typeof edges, player: BorderPlayer) => {
      const key = `${edge}-${player}`;
      if (!segmentSet.has(key)) {
        segmentSet.add(key);
        borderSegments.push({ edge, player });
      }
    };
    const isTopRow = row === 0;
    const isBottomRow = row === BOARD_SIZE - 1;
    const isLeftCol = col === 0;
    const isRightCol = col === BOARD_SIZE - 1;
    if (isTopRow) {
      addSegment('top', isLeftCol ? 'red' : 'blue');
      addSegment('topRight', 'blue');
    }
    if (isRightCol) {
      addSegment('bottomRight', 'red');
      if (!isBottomRow) {
        addSegment('bottom', 'red');
      }
    }
    if (isBottomRow) {
      addSegment('bottom', isRightCol ? 'red' : 'blue');
      addSegment('bottomLeft', 'blue');
    }
    if (isLeftCol) {
      addSegment('topLeft', 'red');
      if (!isTopRow) {
        addSegment('top', 'red');
      }
    }
    return (
      <motion.g
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: (row + col) * 0.02 }}
        whileHover={isClickable ? { scale: 1.1, zIndex: 10 } : {}}
        className={cn(
          'transition-transform duration-200',
          isClickable && 'cursor-pointer'
        )}
        onClick={handleClick}
      >
        <polygon
          points={points}
          className={cn(
            'stroke-black/20 dark:stroke-white/30 stroke-2 transition-colors duration-200',
            playerColors[player],
            isClickable && hoverPlayerColors[currentPlayer],
            isWinning && 'animate-win-pulse'
          )}
        />
        {borderSegments.map(({ edge, player: borderPlayer }) => (
          <BorderPath key={edge} d={edges[edge]} player={borderPlayer} />
        ))}
      </motion.g>
    );
  }
);
Hexagon.displayName = 'Hexagon';
